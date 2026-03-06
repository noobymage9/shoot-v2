/**
 * Retry an async function up to maxAttempts times with exponential backoff.
 * Stops immediately if err.retryable === false.
 *
 * @template T
 * @param {function(): Promise<T>} fn
 * @param {number} maxAttempts
 * @param {number} delayMs  Base delay between attempts (doubles each retry)
 * @returns {Promise<T>}
 */
export async function withRetry(fn, maxAttempts = 3, delayMs = 1500) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err.retryable === false) throw err;
      if (attempt < maxAttempts) {
        await sleep(delayMs * (attempt));
      }
    }
  }
  throw lastErr;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Encode an arbitrary string to a URL-safe base64 string.
 * @param {string} str
 * @returns {string}
 */
export function encodeHash(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a URL-safe base64 string back to the original string.
 * @param {string} encoded
 * @returns {string}
 */
export function decodeHash(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(base64)));
}

/**
 * Parse the URL hash to extract role and paste ID.
 * Supports: #offer=<id> and #answer=<id>
 * @returns {{ role: 'peerA'|'peerB'|null, pasteId: string|null }}
 */
export function parseHash() {
  const hash = location.hash.slice(1); // strip leading #
  const params = new URLSearchParams(hash);
  if (params.has('offer')) {
    return { role: 'peerB', pasteId: params.get('offer') };
  }
  if (params.has('answer')) {
    return { role: 'peerA', pasteId: params.get('answer') };
  }
  return { role: null, pasteId: null };
}

/**
 * Build the shareable URL for an offer or answer.
 * @param {'offer'|'answer'} type
 * @param {string} pasteId
 * @returns {string}
 */
export function buildShareUrl(type, pasteId) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#${type}=${pasteId}`;
}
