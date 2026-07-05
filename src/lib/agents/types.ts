export interface AgentToolDecl {
  name: string;
  description: string;
  parameters: { type: string; properties: Record<string, unknown>; required?: string[] };
}

export type ChatTurn = { role: 'user' | 'ai'; text: string };

export interface AgentQuickAction {
  icon: string;
  labelKey: string;
  q: string;
}

// TData = the read-only data slice this agent is scoped to (pulled from AppDataProvider).
// TOps = the subset of AppDataProvider mutators this agent is allowed to call.
export interface AgentConfig<TData, TOps = Record<string, never>> {
  id: 'home' | 'invest' | 'expenses';
  titleKey: string;
  glyph: string;
  subtitleKey: string;
  greetingKey: string;
  placeholderKey: string;
  quickActions: AgentQuickAction[];
  statusLabelKeys: Record<string, string>;
  tools: AgentToolDecl[];
  toolMeta: Record<string, { mutating: boolean; describeAction?: (args: Record<string, unknown>) => { label: string; description: string } }>;
  buildSystemPrompt: (data: TData, userName: string) => string;
  buildHandlers: (data: TData, ops: TOps) => Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>;
}
