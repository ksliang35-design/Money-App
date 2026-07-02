import { GEMINI_MODEL } from '@/constants/config';
import { getLogger } from '@/lib/logger';

const log = getLogger('gemini');

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiBody {
  contents: { role?: string; parts: { text: string }[] }[];
  systemInstruction?: { parts: { text: string }[] };
}

export async function callGemini(body: GeminiBody): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    log.error('EXPO_PUBLIC_GEMINI_API_KEY not set');
    throw new Error('NO_API_KEY');
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const msg = `Gemini error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`;
    log.error('callGemini failed', msg);
    throw new Error(msg);
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
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    log.error('EXPO_PUBLIC_GEMINI_API_KEY not set');
    throw new Error('NO_API_KEY');
  }

  const url = `${GEMINI_URL}?key=${apiKey}`;
  const contents: unknown[] = [{ role: 'user', parts: [{ text: userMessage }] }];

  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        tools: [{ functionDeclarations: tools }],
        contents,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const msg = `Gemini error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`;
      log.error('callGeminiWithTools failed', msg);
      throw new Error(msg);
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
