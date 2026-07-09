import { GEMINI_MODEL } from '@/constants/config';
import { getLogger } from '@/lib/logger';

const log = getLogger('gemini');

// Prefers a server-side proxy (Cloudflare Worker, see worker/src/index.js) so the Gemini
// key never ships in the client bundle, and falls back to a direct call while the proxy isn't
// deployed yet. Once EXPO_PUBLIC_GEMINI_PROXY_URL is set, remove EXPO_PUBLIC_GEMINI_API_KEY.
const DIRECT_GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_PROXY_URL = process.env.EXPO_PUBLIC_GEMINI_PROXY_URL;
const GEMINI_PROXY_SECRET = process.env.EXPO_PUBLIC_GEMINI_PROXY_SECRET;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Sentinel error messages UI callers can match on to show a friendly message
// instead of the raw status/body (see NO_API_KEY thrown in buildGeminiRequest below).
async function throwGeminiError(res: Response, context: string): Promise<never> {
  if (res.status === 429) {
    log.error(`${context} rate limited`);
    throw new Error('RATE_LIMITED');
  }
  if (res.status === 401) {
    log.error(`${context} unauthorized`);
    throw new Error('PROXY_UNAUTHORIZED');
  }
  const errBody = await res.text().catch(() => '');
  const msg = `Gemini error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`;
  log.error(`${context} failed`, msg);
  throw new Error(msg);
}

function buildGeminiRequest(payload: Record<string, unknown>): { url: string; body: string; headers: Record<string, string> } {
  if (GEMINI_PROXY_URL) {
    return {
      url: GEMINI_PROXY_URL,
      body: JSON.stringify({ model: GEMINI_MODEL, ...payload }),
      headers: { 'x-app-secret': GEMINI_PROXY_SECRET ?? '' },
    };
  }
  if (GEMINI_API_KEY) {
    return { url: `${DIRECT_GEMINI_URL}?key=${GEMINI_API_KEY}`, body: JSON.stringify(payload), headers: {} };
  }
  log.error('Neither EXPO_PUBLIC_GEMINI_PROXY_URL nor EXPO_PUBLIC_GEMINI_API_KEY is set');
  throw new Error('NO_GEMINI_ENDPOINT');
}

interface GeminiBody {
  contents: { role?: string; parts: { text: string }[] }[];
  systemInstruction?: { parts: { text: string }[] };
}

export async function callGemini(body: GeminiBody): Promise<string> {
  const { url, body: reqBody, headers } = buildGeminiRequest(body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: reqBody,
  });

  if (!res.ok) {
    await throwGeminiError(res, 'callGemini');
  }

  const json = await res.json();
  const parts: { text?: string; thought?: boolean }[] =
    json.candidates?.[0]?.content?.parts ?? [];
  return (parts.find((p) => !p.thought) ?? parts[0])?.text ?? '';
}

export function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in Gemini response');
  return text.slice(start, end + 1);
}

// ── Agentic / function-calling ────────────────────────────────────────────────

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: { type: string; properties: Record<string, unknown>; required?: string[] };
}

type Part =
  | { text: string; thought?: boolean; functionCall?: never }
  | { functionCall: { name: string; args: Record<string, unknown> }; text?: never; thought?: never };

export async function callGeminiWithTools(
  systemText: string,
  userMessage: string,
  tools: FunctionDeclaration[],
  handlers: Record<string, (args: Record<string, unknown>) => unknown>,
  maxTurns = 6,
): Promise<string> {
  const contents: unknown[] = [{ role: 'user', parts: [{ text: userMessage }] }];

  for (let turn = 0; turn < maxTurns; turn++) {
    const { url, body: reqBody, headers } = buildGeminiRequest({
      systemInstruction: { parts: [{ text: systemText }] },
      tools: [{ functionDeclarations: tools }],
      contents,
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: reqBody,
    });

    if (!res.ok) {
      await throwGeminiError(res, 'callGeminiWithTools');
    }

    const json = await res.json();
    const parts: Part[] = json.candidates?.[0]?.content?.parts ?? [];

    const textPart = parts.find((p): p is { text: string } => !!p.text && !('thought' in p && p.thought));
    if (textPart) {
      log.info('callGeminiWithTools text response after', turn + 1, 'turn(s)');
      return textPart.text;
    }

    const fnCalls = parts.filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => !!p.functionCall);
    if (fnCalls.length === 0) throw new Error('No text or function calls in Gemini response');

    log.info('callGeminiWithTools tool calls', fnCalls.map((p) => p.functionCall.name).join(', '));

    contents.push({ role: 'model', parts });
    contents.push({
      role: 'user',
      parts: fnCalls.map(({ functionCall: { name, args } }) => ({
        functionResponse: {
          name,
          response: { result: handlers[name] ? handlers[name](args) : { error: `Unknown tool: ${name}` } },
        },
      })),
    });
  }

  throw new Error('Agentic loop exceeded max turns without a text response');
}

// ── Stateful, confirm-gated agent loop (for conversational tab agents) ────────
// Distinct from callGeminiWithTools above: this one carries multi-turn chat history
// across calls and supports a per-tool onStatus callback plus an awaitable confirmAction
// gate before mutating tools run. callGeminiWithTools stays untouched for Budget Coach.

export interface AgentToolMeta {
  mutating: boolean;
  describeAction?: (args: Record<string, unknown>) => { label: string; description: string };
}

export interface AgentRunContext {
  onStatus?: (toolName: string) => void;
  confirmAction?: (label: string, description: string) => Promise<boolean>;
}

export async function callGeminiAgentLoop(
  systemText: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userMessage: string,
  tools: FunctionDeclaration[],
  handlers: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>,
  toolMeta: Record<string, AgentToolMeta>,
  ctx: AgentRunContext,
  maxToolRounds = 3,
): Promise<string> {
  const contents: unknown[] = [...history, { role: 'user', parts: [{ text: userMessage }] }];

  for (let round = 0; round <= maxToolRounds; round++) {
    const forcedFinal = round === maxToolRounds;
    const { url, body: reqBody, headers } = buildGeminiRequest({
      systemInstruction: { parts: [{ text: systemText }] },
      ...(forcedFinal ? {} : { tools: [{ functionDeclarations: tools }] }),
      contents,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: reqBody,
    });

    if (!res.ok) {
      await throwGeminiError(res, 'callGeminiAgentLoop');
    }

    const json = await res.json();
    const parts: { text?: string; thought?: boolean; functionCall?: { name: string; args: Record<string, unknown> } }[] =
      json.candidates?.[0]?.content?.parts ?? [];

    const textPart = parts.find((p) => !p.thought && p.text);
    if (textPart?.text) {
      log.info('callGeminiAgentLoop text response after', round + 1, 'round(s)');
      return textPart.text;
    }

    const fnCalls = parts.filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => !!p.functionCall);
    if (fnCalls.length === 0) throw new Error('No text or function call in Gemini response');
    if (forcedFinal) throw new Error('Agent could not produce a final answer');

    log.info('callGeminiAgentLoop tool calls', fnCalls.map((p) => p.functionCall.name).join(', '));

    contents.push({ role: 'model', parts });
    const responseParts: unknown[] = [];
    for (const { functionCall } of fnCalls) {
      const { name, args } = functionCall;
      ctx.onStatus?.(name);
      const meta = toolMeta[name];
      if (meta?.mutating && ctx.confirmAction) {
        const { label, description } = meta.describeAction?.(args) ?? { label: name, description: '' };
        const allowed = await ctx.confirmAction(label, description);
        if (!allowed) {
          responseParts.push({ functionResponse: { name, response: { result: { declined: true } } } });
          continue;
        }
      }
      try {
        const result = handlers[name] ? await handlers[name](args) : { error: `Unknown tool: ${name}` };
        responseParts.push({ functionResponse: { name, response: { result } } });
      } catch (e) {
        responseParts.push({
          functionResponse: { name, response: { result: { error: e instanceof Error ? e.message : String(e) } } },
        });
      }
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  throw new Error('Agentic loop exceeded max turns without a text response');
}
