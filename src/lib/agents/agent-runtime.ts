import { callGeminiAgentLoop, type AgentRunContext } from '@/lib/gemini';
import { getLogger } from '@/lib/logger';
import type { AgentConfig, ChatTurn } from '@/lib/agents/types';

const log = getLogger('agent-runtime');

export interface AgentReply {
  text: string;
}

export async function getAgentReply<TData, TOps>(
  config: AgentConfig<TData, TOps>,
  message: string,
  userName: string,
  data: TData,
  ops: TOps,
  history: ChatTurn[],
  runCtx: AgentRunContext,
): Promise<AgentReply> {
  log.info(`getAgentReply[${config.id}] start`, `history=${history.length} turns`);

  const systemText = config.buildSystemPrompt(data, userName);
  const history_ = history.map((turn) => ({
    role: turn.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: turn.text }],
  }));
  const handlers = config.buildHandlers(data, ops);

  try {
    const text = await callGeminiAgentLoop(
      systemText,
      history_,
      message,
      config.tools,
      handlers,
      config.toolMeta,
      runCtx,
    );
    log.info(`getAgentReply[${config.id}] success`);
    return { text: text.trim() || 'Sorry, I had trouble with that. Please try again.' };
  } catch (e) {
    log.error(`getAgentReply[${config.id}] failed`, e);
    throw e;
  }
}
