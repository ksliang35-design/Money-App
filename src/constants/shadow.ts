import { Platform, type ViewStyle } from 'react-native';

function hexToRgba(color: string, opacity: number): string {
  const hex = color.replace(/^#/, '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return color;
  return `rgba(${r},${g},${b},${opacity})`;
}

export function shadow(
  color: string,
  dx: number,
  dy: number,
  blur: number,
  opacity: number,
): ViewStyle {
  if (Platform.OS === 'web') {
    const rgba = color.startsWith('#') ? hexToRgba(color, opacity) : color;
    return { boxShadow: `${dx}px ${dy}px ${blur}px ${rgba}` } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: dx, height: dy },
    shadowOpacity: opacity,
    shadowRadius: blur,
  };
}
