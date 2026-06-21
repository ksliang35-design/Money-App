import { MC } from './money-theme';

export type AvatarColour = 'emerald' | 'gold' | 'indigo' | 'clay' | 'dark';
export type AvatarEmoji  = '🐎' | '🪙' | '💰' | '💳' | '📈' | '💎';

export interface AvatarConfig {
  type: 'initials' | 'emoji';
  colour: AvatarColour;
  emoji?: AvatarEmoji;
}

export const DEFAULT_AVATAR: AvatarConfig = { type: 'initials', colour: 'emerald' };

export const AVATAR_COLOUR_MAP: Record<AvatarColour, { bg: string; bgDark: string; labelKey: string }> = {
  emerald: { bg: MC.emerald,  bgDark: MC.emeraldDark, labelKey: 'profile.colourEmerald' },
  gold:    { bg: MC.gold,     bgDark: '#9E7420',       labelKey: 'profile.colourGold'    },
  indigo:  { bg: MC.indigo,   bgDark: '#3F3FAA',       labelKey: 'profile.colourIndigo'  },
  clay:    { bg: MC.clay,     bgDark: '#8F3C27',       labelKey: 'profile.colourClay'    },
  dark:    { bg: MC.ink,      bgDark: '#0A1710',       labelKey: 'profile.colourDark'    },
};

export const AVATAR_EMOJI_LIST: AvatarEmoji[] = ['🐎', '🪙', '💰', '💳', '📈', '💎'];
