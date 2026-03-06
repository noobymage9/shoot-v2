import { relay } from './relay/index.js';
import { RtcPeer } from './rtc.js';
import { UI } from './ui.js';
import { withRetry, parseHash } from './util.js';

const RDV_PREFIX = 'p2p-rdv-';

class App {
  #state = 'HOME';
  #peer = null;
  #relay = relay;

  // ── State ─────────────────────────────────────────────────────────────────

  #setState(next) {
    this.#state = next;
    console.debug('[state]', next);
  }

  // ── Same-origin auto-connect ──────────────────────────────────────────────

  #watchForAnswer(offerId, onAnswer) {
    const key = RDV_PREFIX + offerId;
    const existing = localStorage.getItem(key);
    if (existing) {
      localStorage.removeItem(key);
      onAnswer(existing);
      return;
    }
    const handler = (e) => {
      if (e.key !== key || !e.newValue) return;
      window.removeEventListener('storage', handler);
      localStorage.removeItem(key);
      onAnswer(e.newValue);
    };
    window.addEventListener('storage', handler);
  }

  #signalAnswer(offerId, answerId) {
    localStorage.setItem(RDV_PREFIX + offerId, answerId);
  }

  // ── Peer A ────────────────────────────────────────────────────────────────

  async #connectWithAnswer(peer, answerId) {
    this.#setState('APPLYING_ANSWER');
    UI.showScreen('screen-connecting');

    let answerSdp;
    try {
      answerSdp = await withRetry(() => this.#relay.fetch(answerId));
    } catch (err) {
      return this.#handleError(err.message);
    }

    try {
      await peer.applyAnswer(answerSdp);
    } catch (err) {
      return this.#handleError('Failed to apply answer: ' + err.message);
    }

    this.#setState('CONNECTING');

    try {
      await peer.waitForChannelsOpen();
      this.#wireChannelMessages(peer);
      this.#setState('CONNECTED');
      UI.showScreen('screen-connected');
    } catch (err) {
      this.#handleError('Connection failed — both devices may be on restricted networks.');
    }
  }

  async #startPeerA() {
    this.#setState('GENERATING_OFFER');
    UI.showScreen('screen-generating-offer');

    const peer = new RtcPeer();
    this.#peer = peer;

    let offerSdp;
    try {
      offerSdp = await peer.createOffer();
    } catch (err) {
      return this.#handleError('Failed to create offer: ' + err.message);
    }

    let offerId;
    try {
      offerId = await withRetry(() => this.#relay.publish(offerSdp));
    } catch (err) {
      return this.#handleError(err.message);
    }

    this.#setState('SHARE_OFFER');
    UI.renderShareOffer(offerId);

    this.#watchForAnswer(offerId, (answerId) => {
      if (this.#state !== 'SHARE_OFFER') return;
      this.#connectWithAnswer(peer, answerId);
    });

    document.getElementById('connect-btn').addEventListener('click', () => {
      if (this.#state !== 'SHARE_OFFER') return;
      const answerId = UI.getAnswerInput();
      if (!answerId) return;
      this.#connectWithAnswer(peer, answerId);
    });
  }

  // ── Peer B ────────────────────────────────────────────────────────────────

  async #startPeerB(offerId) {
    this.#setState('LOADING_OFFER');
    UI.showScreen('screen-generating-offer');

    let offerSdp;
    try {
      offerSdp = await withRetry(() => this.#relay.fetch(offerId));
    } catch (err) {
      return this.#handleError(err.message);
    }

    this.#setState('GENERATING_ANSWER');

    const peer = new RtcPeer();
    this.#peer = peer;

    let answerSdp;
    try {
      answerSdp = await peer.createAnswer(offerSdp);
    } catch (err) {
      return this.#handleError('Failed to create answer: ' + err.message);
    }

    let answerId;
    try {
      answerId = await withRetry(() => this.#relay.publish(answerSdp));
    } catch (err) {
      return this.#handleError(err.message);
    }

    this.#signalAnswer(offerId, answerId);
    this.#setState('SHARE_ANSWER');
    UI.renderShareAnswer(answerId);
    this.#setState('CONNECTING');

    try {
      await peer.waitForDataChannels();
      this.#wireChannelMessages(peer);
      this.#setState('CONNECTED');
      UI.showScreen('screen-connected');
    } catch (err) {
      this.#handleError('Connection failed — both devices may be on restricted networks.');
    }
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  #wireChannelMessages(peer) {
    const ch = peer.reliableChannel;
    ch.addEventListener('message', (e) => UI.appendMessage('remote', e.data));
    ch.addEventListener('close', () => this.#handleError('Connection closed by the other peer.'));
    ch.addEventListener('error', (e) => this.#handleError('DataChannel error: ' + (e.message || 'unknown')));
  }

  #handleError(message) {
    this.#setState('ERROR');
    this.#peer?.close();
    this.#peer = null;
    UI.showError(message);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  boot() {
    UI.wireCopyButton('copy-offer-btn', 'offer-link-text');
    UI.wireCopyButton('copy-answer-btn', 'answer-link-text');

    document.getElementById('start-over-btn').addEventListener('click', () => {
      history.replaceState(null, '', location.pathname);
      this.#setState('HOME');
      UI.showScreen('screen-home');
    });

    document.getElementById('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('message-input');
      const text = input.value.trim();
      if (!text || !this.#peer) return;
      try {
        this.#peer.sendMessage(text);
        UI.appendMessage('local', text);
        input.value = '';
      } catch (err) {
        this.#handleError('Send failed: ' + err.message);
      }
    });

    document.getElementById('start-chat-btn').addEventListener('click', () => {
      this.#startPeerA();
    });

    const { role, pasteId } = parseHash();
    if (role === 'peerB' && pasteId) {
      this.#startPeerB(pasteId);
      return;
    }
    UI.showScreen('screen-home');
  }
}

document.addEventListener('DOMContentLoaded', () => new App().boot());
