import { RelayError } from './adapter.js';

const BASE = 'https://paste.rs';

export class PasteRsAdapter {
  /**
   * POST raw text to paste.rs, return the slug as paste ID.
   * @param {string} content
   * @returns {Promise<string>} paste ID (slug)
   */
  async publish(content) {
    let res;
    try {
      res = await fetch(`${BASE}/`, {
        method: 'POST',
        body: content,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      // Network error or CORS block
      throw new RelayError(
        'Relay blocked by browser. Swap to a CORS-capable backend in relay/index.js.',
        false,
      );
    }

    if (!res.ok) {
      throw new RelayError(`paste.rs publish failed: HTTP ${res.status}`, true);
    }

    const url = (await res.text()).trim();
    // Response body is the full URL, e.g. https://paste.rs/abc
    const slug = url.replace(/^https?:\/\/paste\.rs\//, '').replace(/\/$/, '');
    if (!slug) {
      throw new RelayError('paste.rs returned unexpected URL: ' + url, true);
    }
    return slug;
  }

  /**
   * GET paste content by ID.
   * @param {string} id  paste slug
   * @returns {Promise<string>}
   */
  async fetch(id) {
    let res;
    try {
      res = await window.fetch(`${BASE}/${id}`);
    } catch (err) {
      throw new RelayError(
        'Relay blocked by browser. Swap to a CORS-capable backend in relay/index.js.',
        false,
      );
    }

    if (res.status === 404) {
      throw new RelayError('Offer has expired. Please start a new chat.', false);
    }
    if (!res.ok) {
      throw new RelayError(`paste.rs fetch failed: HTTP ${res.status}`, true);
    }

    return res.text();
  }

  /**
   * @param {string} id
   * @returns {string}
   */
  idToUrl(id) {
    return `${BASE}/${id}`;
  }
}
