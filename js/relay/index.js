/**
 * SWAP POINT — select relay backend via ?relay= query param.
 * Auto-selects based on origin if no flag is set:
 *   localhost / 127.0.0.1  →  localstorage (zero-config, two-tab testing)
 *   everything else        →  jsonblob     (CORS-capable, works on GitHub Pages)
 *
 * Explicit overrides:
 *   ?relay=localstorage
 *   ?relay=jsonblob
 *   ?relay=pasteurs
 */
import { LocalStorageAdapter } from './localstorage.js';
import { JsonBlobAdapter }     from './jsonblob.js';
import { PasteRsAdapter }      from './pasteurs.js';

function resolveAdapter() {
  const flag = new URLSearchParams(location.search).get('relay');
  if (flag === 'localstorage') return LocalStorageAdapter;
  if (flag === 'pasteurs')     return PasteRsAdapter;
  if (flag === 'jsonblob')     return JsonBlobAdapter;

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return isLocal ? LocalStorageAdapter : JsonBlobAdapter;
}

export const RelayAdapter = resolveAdapter();
