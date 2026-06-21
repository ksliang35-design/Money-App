type Level = 'debug' | 'info' | 'warn' | 'error';

const COLORS: Record<Level, string> = {
  debug: '\x1b[36m',
  info:  '\x1b[32m',
  warn:  '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

function log(level: Level, name: string, msg: string, ...args: unknown[]) {
  if (!__DEV__ && (level === 'debug' || level === 'info')) return;
  const prefix = `${COLORS[level]}[${level.toUpperCase()}]${RESET} [${name}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(prefix, msg, ...args);
}

export function getLogger(name: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => log('debug', name, msg, ...args),
    info:  (msg: string, ...args: unknown[]) => log('info',  name, msg, ...args),
    warn:  (msg: string, ...args: unknown[]) => log('warn',  name, msg, ...args),
    error: (msg: string, ...args: unknown[]) => log('error', name, msg, ...args),
  };
}
