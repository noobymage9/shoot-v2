/**
 * Cloudflare Worker — P2P signaling relay.
 *
 * Deploy steps:
 *   1. npx wrangler login
 *   2. npx wrangler kv:namespace create RELAY
 *   3. Paste the returned id into wrangler.toml
 *   4. npx wrangler deploy
 *
 * API:
 *   POST /          body: raw SDP text  → 200, body: paste ID
 *   GET  /:id                           → 200, body: raw SDP text  |  404
 *   OPTIONS *                           → 204 (CORS preflight)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TTL_SECONDS = 3600; // pastes expire after 1 hour

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const id = new URL(request.url).pathname.replace(/^\//, '');

    if (request.method === 'POST') {
      return handlePublish(request, env);
    }

    if (request.method === 'GET' && id) {
      return handleFetch(id, env);
    }

    return new Response('Bad request', { status: 400, headers: CORS });
  },
};

async function handlePublish(request, env) {
  const body = await request.text();
  const id = generateId();
  await env.RELAY.put(id, body, { expirationTtl: TTL_SECONDS });
  return new Response(id, { status: 200, headers: CORS });
}

async function handleFetch(id, env) {
  const value = await env.RELAY.get(id);
  if (!value) {
    return new Response('Not found', { status: 404, headers: CORS });
  }
  return new Response(value, { status: 200, headers: CORS });
}

function generateId() {
  return [...crypto.getRandomValues(new Uint8Array(5))]
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('');
}
