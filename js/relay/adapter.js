/**
 * IRelayAdapter — interface all relay modules must implement.
 *
 * @typedef {Object} IRelayAdapter
 * @property {function(string): Promise<string>} publish  POST content, returns paste ID
 * @property {function(string): Promise<string>} fetch    GET content by paste ID
 * @property {function(string): string}          idToUrl  Convert paste ID to display URL
 */

export class RelayError extends Error {
  /**
   * @param {string} message
   * @param {boolean} retryable  If false, withRetry will not retry this error
   */
  constructor(message, retryable = true) {
    super(message);
    this.name = 'RelayError';
    this.retryable = retryable;
  }
}
