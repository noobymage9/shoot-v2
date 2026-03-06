const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const ICE_GATHERING_TIMEOUT_MS = 15_000;
const CHANNEL_OPEN_TIMEOUT_MS = 30_000;

/**
 * Create a new RTCPeerConnection with the project's ICE config.
 * @returns {RTCPeerConnection}
 */
function makePc() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

/**
 * Wait for ICE gathering to complete (null sentinel) or timeout.
 * @param {RTCPeerConnection} pc
 * @returns {Promise<void>}
 */
function waitForIce(pc) {
  return Promise.race([
    new Promise((resolve) => {
      pc.addEventListener('icegatheringstatechange', function handler() {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      });
      // Also handle the null candidate sentinel
      pc.addEventListener('icecandidate', function handler(e) {
        if (e.candidate === null) {
          pc.removeEventListener('icecandidate', handler);
          resolve();
        }
      });
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('ICE gathering timed out after 15s')),
        ICE_GATHERING_TIMEOUT_MS,
      ),
    ),
  ]);
}

/**
 * Create both DataChannels on Peer A's connection.
 * Returns { reliable, unreliable } channel handles.
 * @param {RTCPeerConnection} pc
 * @returns {{ reliable: RTCDataChannel, unreliable: RTCDataChannel }}
 */
function createChannels(pc) {
  const reliable = pc.createDataChannel('reliable', { ordered: true });
  const unreliable = pc.createDataChannel('unreliable', {
    ordered: false,
    maxRetransmits: 0,
  });
  return { reliable, unreliable };
}

/**
 * Peer A: create offer SDP (with all ICE candidates bundled).
 * @returns {Promise<{ pc: RTCPeerConnection, sdp: string, channels: { reliable: RTCDataChannel, unreliable: RTCDataChannel } }>}
 */
export async function createPeerA() {
  const pc = makePc();
  const channels = createChannels(pc);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);

  return { pc, sdp: pc.localDescription.sdp, channels };
}

/**
 * Peer A: apply Peer B's answer SDP.
 * @param {RTCPeerConnection} pc
 * @param {string} sdp  Raw SDP text from Peer B
 * @returns {Promise<void>}
 */
export async function applyAnswer(pc, sdp) {
  await pc.setRemoteDescription({ type: 'answer', sdp });
}

/**
 * Peer B: consume Peer A's offer and return answer SDP.
 * @param {string} offerSdp
 * @returns {Promise<{ pc: RTCPeerConnection, sdp: string }>}
 */
export async function createPeerB(offerSdp) {
  const pc = makePc();

  await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIce(pc);

  return { pc, sdp: pc.localDescription.sdp };
}

/**
 * Peer B: wait for both DataChannels (reliable + unreliable) to be received.
 * Returns them once both are open.
 * @param {RTCPeerConnection} pc
 * @returns {Promise<{ reliable: RTCDataChannel, unreliable: RTCDataChannel }>}
 */
export function waitForDataChannels(pc) {
  return Promise.race([
    new Promise((resolve) => {
      const received = {};
      pc.addEventListener('datachannel', function handler(e) {
        received[e.channel.label] = e.channel;
        if (received.reliable && received.unreliable) {
          pc.removeEventListener('datachannel', handler);
          // Wait for both to open
          Promise.all(
            [received.reliable, received.unreliable].map(
              (ch) =>
                ch.readyState === 'open'
                  ? Promise.resolve()
                  : new Promise((r) => ch.addEventListener('open', r, { once: true })),
            ),
          ).then(() => resolve({ reliable: received.reliable, unreliable: received.unreliable }));
        }
      });
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('DataChannel setup timed out')),
        CHANNEL_OPEN_TIMEOUT_MS,
      ),
    ),
  ]);
}

/**
 * Wait for Peer A's channels to open (reliable + unreliable).
 * @param {{ reliable: RTCDataChannel, unreliable: RTCDataChannel }} channels
 * @returns {Promise<void>}
 */
export function waitForChannelsOpen(channels) {
  return Promise.race([
    Promise.all(
      Object.values(channels).map((ch) =>
        ch.readyState === 'open'
          ? Promise.resolve()
          : new Promise((resolve) => ch.addEventListener('open', resolve, { once: true })),
      ),
    ),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out')), CHANNEL_OPEN_TIMEOUT_MS),
    ),
  ]);
}

/**
 * Send a text message over the reliable DataChannel.
 * @param {RTCDataChannel} channel
 * @param {string} text
 */
export function sendMessage(channel, text) {
  if (channel.readyState !== 'open') {
    throw new Error('DataChannel is not open');
  }
  channel.send(text);
}
