/**
 * main.js — Entry point and state machine.
 *
 * Peer A flow: HOME → GENERATING_OFFER → SHARE_OFFER → APPLYING_ANSWER → CONNECTING → CONNECTED
 * Peer B flow: LOADING_OFFER → GENERATING_ANSWER → SHARE_ANSWER → CONNECTING → CONNECTED
 * ERROR reachable from any state → "Start Over" → HOME
 */

import { RelayAdapter } from './relay/index.js';
import {
  createPeerA,
  applyAnswer,
  createPeerB,
  waitForDataChannels,
  waitForChannelsOpen,
  sendMessage,
} from './rtc.js';
import {
  showScreen,
  renderShareOffer,
  renderShareAnswer,
  appendMessage,
  showError,
  getAnswerInput,
  wireCopyButton,
} from './ui.js';
import { withRetry, parseHash } from './util.js';

// ── State ────────────────────────────────────────────────────────────────────

let state = 'HOME';
let peerConnection = null;   // RTCPeerConnection
let reliableChannel = null;  // RTCDataChannel for chat / game events
// unreliableChannel left wired but unused in chat POC

function setState(next) {
  state = next;
  console.debug('[state]', next);
}

// ── Relay ────────────────────────────────────────────────────────────────────

const relay = new RelayAdapter();

// ── Peer A flow ──────────────────────────────────────────────────────────────

async function startPeerA() {
  setState('GENERATING_OFFER');
  showScreen('screen-generating-offer');

  let pc, offerSdp, channels;
  try {
    ({ pc, sdp: offerSdp, channels } = await createPeerA());
  } catch (err) {
    return handleError('Failed to create offer: ' + err.message);
  }

  peerConnection = pc;

  let offerId;
  try {
    offerId = await withRetry(() => relay.publish(offerSdp));
  } catch (err) {
    return handleError(err.message);
  }

  setState('SHARE_OFFER');
  renderShareOffer(offerId);

  // Peer A waits for channels to open (triggered once Peer B connects)
  waitForChannelsOpen(channels)
    .then(() => {
      reliableChannel = channels.reliable;
      wireChannelMessages(reliableChannel);
      setState('CONNECTED');
      showScreen('screen-connected');
    })
    .catch((err) => handleError('Connection failed — both devices may be on restricted networks.'));

  // "Connect" button on share-offer screen: load answer by paste ID
  document.getElementById('connect-btn').addEventListener('click', async () => {
    const answerId = getAnswerInput();
    if (!answerId) return;

    setState('APPLYING_ANSWER');
    showScreen('screen-connecting');

    let answerSdp;
    try {
      answerSdp = await withRetry(() => relay.fetch(answerId));
    } catch (err) {
      return handleError(err.message);
    }

    try {
      await applyAnswer(pc, answerSdp);
    } catch (err) {
      return handleError('Failed to apply answer: ' + err.message);
    }

    setState('CONNECTING');
    // Waiting for channels — handled by the promise above
  });
}

// ── Peer B flow ──────────────────────────────────────────────────────────────

async function startPeerB(offerId) {
  setState('LOADING_OFFER');
  showScreen('screen-generating-offer');

  let offerSdp;
  try {
    offerSdp = await withRetry(() => relay.fetch(offerId));
  } catch (err) {
    return handleError(err.message);
  }

  setState('GENERATING_ANSWER');

  let pc, answerSdp;
  try {
    ({ pc, sdp: answerSdp } = await createPeerB(offerSdp));
  } catch (err) {
    return handleError('Failed to create answer: ' + err.message);
  }

  peerConnection = pc;

  let answerId;
  try {
    answerId = await withRetry(() => relay.publish(answerSdp));
  } catch (err) {
    return handleError(err.message);
  }

  setState('SHARE_ANSWER');
  renderShareAnswer(answerId);

  setState('CONNECTING');

  let channels;
  try {
    channels = await waitForDataChannels(pc);
  } catch (err) {
    return handleError('Connection failed — both devices may be on restricted networks.');
  }

  reliableChannel = channels.reliable;
  wireChannelMessages(reliableChannel);
  setState('CONNECTED');
  showScreen('screen-connected');
}

// ── Shared: receive messages ─────────────────────────────────────────────────

function wireChannelMessages(channel) {
  channel.addEventListener('message', (e) => {
    appendMessage('remote', e.data);
  });
  channel.addEventListener('close', () => {
    handleError('Connection closed by the other peer.');
  });
  channel.addEventListener('error', (e) => {
    handleError('DataChannel error: ' + (e.message || 'unknown'));
  });
}

// ── Error handling ───────────────────────────────────────────────────────────

function handleError(message) {
  setState('ERROR');
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  reliableChannel = null;
  showError(message);
}

// ── Boot ─────────────────────────────────────────────────────────────────────

function boot() {
  // Wire copy buttons
  wireCopyButton('copy-offer-btn', 'offer-link-text');
  wireCopyButton('copy-answer-btn', 'answer-link-text');

  // "Start Over" from error screen
  document.getElementById('start-over-btn').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    setState('HOME');
    showScreen('screen-home');
  });

  // Chat form submit
  document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || !reliableChannel) return;
    try {
      sendMessage(reliableChannel, text);
      appendMessage('local', text);
      input.value = '';
    } catch (err) {
      handleError('Send failed: ' + err.message);
    }
  });

  // "Start New Chat" button
  document.getElementById('start-chat-btn').addEventListener('click', () => {
    startPeerA();
  });

  // Check hash — auto-start Peer B if offer= present
  const { role, pasteId } = parseHash();
  if (role === 'peerB' && pasteId) {
    startPeerB(pasteId);
  } else if (role === 'peerA' && pasteId) {
    // Auto-load answer if hash contains answer=
    showScreen('screen-connecting');
    // Re-use startPeerA path is not applicable here;
    // this case is for deep-linking after Peer A already made an offer.
    // Handled by the connect-btn flow above if user has already started Peer A.
    // Show home as fallback.
    showScreen('screen-home');
  } else {
    showScreen('screen-home');
  }
}

document.addEventListener('DOMContentLoaded', boot);
