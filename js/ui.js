import { QR } from './qr.js';
import { buildShareUrl } from './util.js';

const SCREENS = [
  'screen-home',
  'screen-generating-offer',
  'screen-share-offer',
  'screen-share-answer',
  'screen-connecting',
  'screen-connected',
  'screen-error',
];

export class UI {
  static showScreen(id) {
    for (const s of SCREENS) {
      document.getElementById(s).hidden = s !== id;
    }
  }

  static renderShareOffer(pasteId) {
    const url = buildShareUrl('offer', pasteId);
    document.getElementById('offer-link-text').value = url;
    QR.render(document.getElementById('offer-qr'), url);
    UI.showScreen('screen-share-offer');
  }

  static renderShareAnswer(pasteId) {
    const url = buildShareUrl('answer', pasteId);
    document.getElementById('answer-link-text').value = url;
    QR.render(document.getElementById('answer-qr'), url);
    UI.showScreen('screen-share-answer');
  }

  static appendMessage(origin, text) {
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

  static showError(message) {
    document.getElementById('error-message').textContent = message;
    UI.showScreen('screen-error');
  }

  static getAnswerInput() {
    return document.getElementById('answer-id-input').value.trim();
  }

  static wireCopyButton(btnId, inputId) {
    document.getElementById(btnId).addEventListener('click', async () => {
      const text = document.getElementById(inputId).value;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const el = document.getElementById(inputId);
        el.select();
        document.execCommand('copy');
      }
    });
  }
}
