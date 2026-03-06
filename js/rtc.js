const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const ICE_GATHERING_TIMEOUT_MS = 15_000;
const CHANNEL_OPEN_TIMEOUT_MS = 30_000;

export class RtcPeer {
  #pc;
  #channels = null;

  constructor() {
    this.#pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  }

  // ── Peer A ────────────────────────────────────────────────────────────────

  async createOffer() {
    this.#channels = {
      reliable:   this.#pc.createDataChannel('reliable',   { ordered: true }),
      unreliable: this.#pc.createDataChannel('unreliable', { ordered: false, maxRetransmits: 0 }),
    };
    const offer = await this.#pc.createOffer();
    await this.#pc.setLocalDescription(offer);
    await this.#waitForIce();
    return this.#pc.localDescription.sdp;
  }

  async applyAnswer(sdp) {
    await this.#pc.setRemoteDescription({ type: 'answer', sdp });
  }

  waitForChannelsOpen() {
    return this.#raceTimeout(
      Promise.all(
        Object.values(this.#channels).map((ch) =>
          ch.readyState === 'open'
            ? Promise.resolve()
            : new Promise((r) => ch.addEventListener('open', r, { once: true })),
        ),
      ),
      CHANNEL_OPEN_TIMEOUT_MS,
      'Connection timed out',
    );
  }

  // ── Peer B ────────────────────────────────────────────────────────────────

  async createAnswer(offerSdp) {
    await this.#pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await this.#pc.createAnswer();
    await this.#pc.setLocalDescription(answer);
    await this.#waitForIce();
    return this.#pc.localDescription.sdp;
  }

  waitForDataChannels() {
    return this.#raceTimeout(
      new Promise((resolve) => {
        const received = {};
        this.#pc.addEventListener('datachannel', (e) => {
          received[e.channel.label] = e.channel;
          if (!received.reliable || !received.unreliable) return;
          this.#channels = received;
          Promise.all(
            Object.values(received).map((ch) =>
              ch.readyState === 'open'
                ? Promise.resolve()
                : new Promise((r) => ch.addEventListener('open', r, { once: true })),
            ),
          ).then(() => resolve());
        });
      }),
      CHANNEL_OPEN_TIMEOUT_MS,
      'DataChannel setup timed out',
    );
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  get reliableChannel() {
    return this.#channels?.reliable ?? null;
  }

  sendMessage(text) {
    const ch = this.reliableChannel;
    if (!ch || ch.readyState !== 'open') throw new Error('DataChannel is not open');
    ch.send(text);
  }

  close() {
    this.#pc.close();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  #waitForIce() {
    return this.#raceTimeout(
      new Promise((resolve) => {
        if (this.#pc.iceGatheringState === 'complete') return resolve();
        this.#pc.addEventListener('icecandidate', (e) => {
          if (e.candidate === null) resolve();
        });
        this.#pc.addEventListener('icegatheringstatechange', () => {
          if (this.#pc.iceGatheringState === 'complete') resolve();
        });
      }),
      ICE_GATHERING_TIMEOUT_MS,
      'ICE gathering timed out after 15s',
    );
  }

  #raceTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]);
  }
}
