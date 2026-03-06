import { RelayError } from './adapter.js';

const PREFIX = 'p2p-relay-';

/**
 * LocalStorageAdapter — zero-config relay for same-origin testing.
 * Works when both peers share the same origin (e.g. two tabs on localhost).
 * No CORS, no external dependencies.
 */
export class LocalStorageAdapter {
  async publish(content) {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(PREFIX + id, content);
    return id;
  }

  async fetch(id) {
    const content = localStorage.getItem(PREFIX + id);
    if (!content) {
      throw new RelayError('Offer not found or expired. Please start a new chat.', false);
    }
    return content;
  }

  idToUrl(id) {
    return `${location.origin}${location.pathname}#offer=${id}`;
  }
}
