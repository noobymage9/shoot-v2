import { renderQR } from './qr.js';
import { buildShareUrl } from './util.js';

// ── Screen IDs ───────────────────────────────────────────────────────────────
const SCREENS = [
  'screen-home',
  'screen-generating-offer',
  'screen-share-offer',
  'screen-share-answer',
  'screen-connecting',
  'screen-connected',
  'screen-error',
];

/**
 * Show only the named screen, hide all others.
 * @param {string} id  One of the SCREENS values
 */
export function showScreen(id) {
  for (const s of SCREENS) {
    document.getElementById(s).hidden = s !== id;
  }
}

// ── Share-offer screen ───────────────────────────────────────────────────────

/**
 * Populate the share-offer screen with the generated link and QR code.
 * @param {string} pasteId
 */
export function renderShareOffer(pasteId) {
  const url = buildShareUrl('offer', pasteId);
  const linkEl = document.getElementById('offer-link');
  linkEl.href = url;
  linkEl.textContent = url;
  document.getElementById('offer-link-text').value = url;
  renderQR(document.getElementById('offer-qr'), url);
  showScreen('screen-share-offer');
}

/**
 * Get the answer paste ID entered manually by Peer A.
 * @returns {string}
 */
export function getAnswerInput() {
  return document.getElementById('answer-id-input').value.trim();
}

// ── Share-answer screen ──────────────────────────────────────────────────────

/**
 * Populate the share-answer screen with the generated link and QR code.
 * @param {string} pasteId
 */
export function renderShareAnswer(pasteId) {
  const url = buildShareUrl('answer', pasteId);
  const linkEl = document.getElementById('answer-link');
  linkEl.href = url;
  linkEl.textContent = url;
  document.getElementById('answer-link-text').value = url;
  renderQR(document.getElementById('answer-qr'), url);
  showScreen('screen-share-answer');
}

// ── Connected / chat screen ──────────────────────────────────────────────────

/**
 * Append a message bubble to the chat log.
 * @param {'local'|'remote'} origin
 * @param {string} text
 */
export function appendMessage(origin, text) {
  const log = document.getElementById('message-log');
  const item = document.createElement('li');
  item.className = `message message--${origin}`;
  const bubble = document.createElement('span');
  bubble.className = 'message__bubble';
  bubble.textContent = text;
  item.appendChild(bubble);
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

// ── Error screen ─────────────────────────────────────────────────────────────

/**
 * Show the error screen with a message.
 * @param {string} message
 */
export function showError(message) {
  document.getElementById('error-message').textContent = message;
  showScreen('screen-error');
}

// ── Copy-to-clipboard helpers ─────────────────────────────────────────────────

/**
 * Wire up a copy button to copy the value of an adjacent text input.
 * @param {string} btnId
 * @param {string} inputId
 */
export function wireCopyButton(btnId, inputId) {
  document.getElementById(btnId).addEventListener('click', async () => {
    const text = document.getElementById(inputId).value;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: select + execCommand for older browsers
      const el = document.getElementById(inputId);
      el.select();
      document.execCommand('copy');
    }
  });
}
