import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { AVATAR_COLOUR_MAP, DEFAULT_AVATAR, type AvatarConfig } from '@/constants/avatar';
import { MF } from '@/constants/money-theme';
import { shadow } from '@/constants/shadow';

interface Props {
  config: AvatarConfig | null;
  initials: string;
  size: number;
}

export function AvatarDisplay({ config, initials, size }: Props) {
  const cfg = config ?? DEFAULT_AVATAR;
  const { bg, bgDark } = AVATAR_COLOUR_MAP[cfg.colour];
  const radius = size / 2;
  const isEmoji = cfg.type === 'emoji' && !!cfg.emoji;

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadow(bg, 0, Math.round(size * 0.075), Math.round(size * 0.15), 0.4),
    elevation: 4,
  };

  if (isEmoji) {
    return (
      <View style={[circleStyle, { backgroundColor: bg }]}>
        <Text style={{ fontSize: Math.round(size * 0.46), lineHeight: Math.round(size * 0.58) }}>
          {cfg.emoji}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={[bg, bgDark]} style={circleStyle}>
      <Text style={{ fontSize: Math.round(size * 0.34), fontFamily: MF.bold, color: '#fff' }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}
