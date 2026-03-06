/**
 * SWAP POINT — select relay backend via ?relay= query param.
 *
 * Auto-selects based on origin if no flag is set:
 *   localhost / 127.0.0.1  →  localstorage  (zero-config, two-tab testing)
 *   everything else        →  worker        (if WORKER_URL is set, else jsonblob)
 *
 * Explicit overrides via query params:
 *   ?relay=localstorage
 *   ?relay=jsonblob
 *   ?relay=pasteurs
 *   ?relay=worker            (requires WORKER_URL to be set below)
 *   ?relay=worker&workerUrl=https://...   (one-off override without editing code)
 */

import { LocalStorageAdapter } from './localstorage.js';
import { JsonBlobAdapter }     from './jsonblob.js';
import { PasteRsAdapter }      from './pasteurs.js';
import { WorkerRelayAdapter }  from './worker.js';

// Set this after deploying your Cloudflare Worker (worker/relay.js).
// Leave null to fall back to jsonblob.
const WORKER_URL = null;

function resolveAdapter() {
  const params    = new URLSearchParams(location.search);
  const flag      = params.get('relay');
  const workerUrl = params.get('workerUrl') ?? WORKER_URL;

  if (flag === 'localstorage') return new LocalStorageAdapter();
  if (flag === 'pasteurs')     return new PasteRsAdapter();
  if (flag === 'jsonblob')     return new JsonBlobAdapter();
  if (flag === 'worker' || workerUrl) {
    if (!workerUrl) throw new Error('?relay=worker requires a workerUrl param or WORKER_URL set in relay/index.js');
    return new WorkerRelayAdapter(workerUrl);
  }

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isLocal) return new LocalStorageAdapter();
  if (WORKER_URL) return new WorkerRelayAdapter(WORKER_URL);
  return new JsonBlobAdapter();
}

export const relay = resolveAdapter();
