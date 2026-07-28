import React from 'react';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6c63ff, #a78bfa)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #60a5fa, #3b82f6)',
  'linear-gradient(135deg, #f87171, #ef4444)',
  'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  'linear-gradient(135deg, #2dd4bf, #14b8a6)',
  'linear-gradient(135deg, #fb923c, #f97316)',
  'linear-gradient(135deg, #818cf8, #6366f1)',
];

function getColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s@.]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

interface AvatarInitialsProps {
  name: string;
  size?: 'small' | 'medium' | 'large';
}

const AvatarInitials: React.FC<AvatarInitialsProps> = ({ name, size = 'medium' }) => {
  const colorIndex = getColorIndex(name);
  const initials = getInitials(name);
  const sizeClass = size !== 'medium' ? size : '';

  return (
    <div
      className={`avatar-initials ${sizeClass}`}
      style={{ background: AVATAR_COLORS[colorIndex] }}
    >
      {initials}
    </div>
  );
};

export default AvatarInitials;
