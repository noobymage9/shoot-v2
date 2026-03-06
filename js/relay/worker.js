import { RelayError } from './adapter.js';

export class WorkerRelayAdapter {
  #baseUrl;

  /**
   * @param {string} baseUrl  Deployed Cloudflare Worker URL, e.g. https://p2p-relay.your-name.workers.dev
   */
  constructor(baseUrl) {
    this.#baseUrl = baseUrl.replace(/\/$/, '');
  }

  async publish(content) {
    let res;
    try {
      res = await fetch(this.#baseUrl + '/', {
        method: 'POST',
        body: content,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      throw new RelayError('Worker relay unavailable: ' + err.message, false);
    }

    if (!res.ok) {
      throw new RelayError(`Worker relay publish failed: HTTP ${res.status}`, true);
    }

    return res.text();
  }

  async fetch(id) {
    let res;
    try {
      res = await fetch(`${this.#baseUrl}/${id}`);
    } catch (err) {
      throw new RelayError('Worker relay unavailable: ' + err.message, false);
    }

    if (res.status === 404) {
      throw new RelayError('Offer has expired. Please start a new chat.', false);
    }
    if (!res.ok) {
      throw new RelayError(`Worker relay fetch failed: HTTP ${res.status}`, true);
    }

    return res.text();
  }

  idToUrl(id) {
    return `${this.#baseUrl}/${id}`;
  }
}
