export { RateLimiter } from './rate-limiter.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-app-secret',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

// Thin proxy so the Gemini key stays server-side. Forwards the request body verbatim
// (minus our own "model" field) to Gemini and pipes the response straight back —
// the Money Hub app clients already parse the raw Gemini response shape.
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Basic app-identification gate. Not cryptographic security — this secret ships in the
    // client bundle just like the Gemini key did, so a determined attacker could still
    // extract it. What it does stop is anonymous scanners/casual abuse hitting the bare
    // Worker URL directly without ever touching the app.
    if (request.headers.get('x-app-secret') !== env.APP_SHARED_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Per-IP rate limit, fixed 1-minute window enforced by a Durable Object (see
    // rate-limiter.js) so concurrent requests from the same IP can't race past the limit
    // the way the previous KV-based counter could.
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const limiter = env.RATE_LIMITER.getByName(ip);
    const { allowed } = await limiter.hit();
    if (!allowed) {
      return json({ error: 'Rate limit exceeded, try again shortly' }, 429);
    }

    const { model, ...body } = await request.json();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    try {
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await geminiRes.text();
      return new Response(text, {
        status: geminiRes.status,
        headers: { 'content-type': 'application/json', ...CORS_HEADERS },
      });
    } catch (err) {
      return json({ error: 'Gemini proxy request failed', detail: String(err) }, 502);
    }
  },
};
