import { useAppData } from '@/store/AppDataProvider';
import { en } from './en';
import { ms } from './ms';
import { zh } from './zh';

export type Language = 'en' | 'ms' | 'zh';
export type Translations = typeof en;

const LANGS: Record<Language, Translations> = { en, ms, zh };

function getNestedValue(obj: any, keys: string[]): string | undefined {
  let cur = obj;
  for (const k of keys) {
    cur = cur?.[k];
    if (cur === undefined) return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function useT() {
  const { data } = useAppData();
  const lang = ((data as any).language as Language) ?? 'en';
  const dict: Translations = LANGS[lang] ?? LANGS.en;

  function t(key: string, vars?: Record<string, string | number>): string {
    const keys = key.split('.');
    const val =
      getNestedValue(dict, keys) ??
      getNestedValue(LANGS.en, keys) ??
      key;
    if (!vars) return val;
    return val.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  }

  return t;
}
