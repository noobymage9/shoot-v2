import { RelayError } from './adapter.js';

const BASE = 'https://jsonblob.com/api/jsonBlob';

export class JsonBlobAdapter {
  /**
   * POST content to jsonblob.com, return the blob ID.
   * @param {string} content
   * @returns {Promise<string>}
   */
  async publish(content) {
    let res;
    try {
      res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ data: content }),
      });
    } catch (err) {
      throw new RelayError('Relay unavailable: ' + err.message, false);
    }

    if (!res.ok) {
      throw new RelayError(`jsonblob publish failed: HTTP ${res.status}`, true);
    }

    // ID is the last segment of the Location header URL
    const location = res.headers.get('Location') ?? '';
    const id = location.split('/').pop();
    if (!id) throw new RelayError('jsonblob returned no Location header', true);
    return id;
  }

  /**
   * GET blob content by ID.
   * @param {string} id
   * @returns {Promise<string>}
   */
  async fetch(id) {
    let res;
    try {
      res = await fetch(`${BASE}/${id}`, {
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      throw new RelayError('Relay unavailable: ' + err.message, false);
    }

    if (res.status === 404) {
      throw new RelayError('Offer has expired. Please start a new chat.', false);
    }
    if (!res.ok) {
      throw new RelayError(`jsonblob fetch failed: HTTP ${res.status}`, true);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * @param {string} id
   * @returns {string}
   */
  idToUrl(id) {
    return `${BASE}/${id}`;
  }
}
