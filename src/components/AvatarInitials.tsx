import { Avatar } from '@chakra-ui/react';

/**
 * Identity avatar: hashes the name onto one of ten desaturated tones, renders
 * the initials on a rounded-square "sticker" tile with a chunky ink border and
 * a tiny per-identity rotation. Desaturated moderately (2026-08-02) — enough
 * that they sit quietly beside the graphite+amber system, but each keeps its
 * hue and varies in lightness so tiles stay distinguishable (sat 18–48%, not
 * muddy gray). All clear white text ≥4.5:1 in both themes.
 */

const AVATAR_COLORS = [
  '#4e59a8', // indigo
  '#985f7d', // rose
  '#2f7d76', // teal
  '#8a6f35', // ochre
  '#3f6f9e', // sky
  '#9c6158', // clay
  '#6d5fa8', // plum
  '#2f7d63', // mint
  '#8a6330', // rust
  '#55627a', // slate
];

function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s@.]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

const SIZE_MAP = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
} as const;

interface AvatarInitialsProps {
  name: string;
  size?: 'small' | 'medium' | 'large';
}

const AvatarInitials: React.FC<AvatarInitialsProps> = ({ name, size = 'medium' }) => {
  const hash = getHash(name);
  const colorIndex = hash % AVATAR_COLORS.length;
  // Slight per-identity tilt (−3°..+3°) on SMALL tiles only — a sticker quirk
  // at list size, noise at header size.
  const rotation = size === 'small' ? (hash % 7) - 3 : 0;
  const initials = getInitials(name);

  return (
    <Avatar.Root
      size={SIZE_MAP[size]}
      bg={AVATAR_COLORS[colorIndex]}
      color="white"
      fontWeight="700"
      borderRadius="lg"
      border="2px solid"
      borderColor="border.ink"
      transform={`rotate(${rotation}deg)`}
      flexShrink="0"
    >
      <Avatar.Fallback>{initials}</Avatar.Fallback>
    </Avatar.Root>
  );
};

export default AvatarInitials;
