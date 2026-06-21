import { getLogger } from '@/lib/logger';

const log = getLogger('coach-api');

// Server-side proxy so the web build can call Anthropic without CORS issues.
// Set ANTHROPIC_API_KEY in your environment (no EXPO_PUBLIC_ prefix — server-only).
export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.error('ANTHROPIC_API_KEY not configured');
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured on server' }, { status: 500 });
  }

  log.info('proxying request to Anthropic');
  const body = await request.json();

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    log.warn('Anthropic upstream error', upstream.status);
  } else {
    log.info('Anthropic response', upstream.status);
  }

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
