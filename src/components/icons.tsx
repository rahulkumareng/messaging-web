/* oxlint-disable react/only-export-components -- every export in this file is an icon component */
import type { ComponentProps } from 'react';
import { chakra } from '@chakra-ui/react';
import type { MessageStatus } from '../hooks/useChatSocket';

/**
 * Icon set — every icon is a hand-authored inline SVG (chakra.svg): no
 * createIcon helper, no emoji, no text glyphs. Uniform 24×24 stroke language
 * (fill none, currentColor, 2px, round caps/joins); color comes from the
 * `color` prop on the consumer (resolves to currentColor). The brand mark and
 * empty-state art below use explicit fill/stroke tokens instead.
 */
type IconProps = ComponentProps<typeof chakra.svg>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const SendIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </chakra.svg>
);

export const UserPlusIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </chakra.svg>
);

/** A group of people — the actual lucide "users" icon (the previous path was a
 *  pencil-in-square / "edit" glyph, wrong for a groups affordance). */
export const UsersIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </chakra.svg>
);

export const SearchIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </chakra.svg>
);

export const GearIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </chakra.svg>
);

export const ChevronLeftIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="m15 18-6-6 6-6" />
  </chakra.svg>
);

export const LogOutIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </chakra.svg>
);

export const AlertCircleIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </chakra.svg>
);

export const ClockIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </chakra.svg>
);

export const CheckIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="M20 6 9 17l-5-5" />
  </chakra.svg>
);

export const DoubleCheckIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="m2 13 4 4 8-8" />
    <path d="m14 19 5-5" />
  </chakra.svg>
);

export const SunIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </chakra.svg>
);

export const MoonIcon = ({ boxSize = '1em', ...rest }: IconProps) => (
  <chakra.svg viewBox="0 0 24 24" {...stroke} {...rest} boxSize={boxSize}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </chakra.svg>
);

/**
 * Brand mark: speech bubble + warm bolt. Used as the app logo (sidebar
 * wordmark, auth pages) and the favicon. Rendered with `chakra.*` elements so
 * the fill/stroke color tokens resolve per theme.
 */
export const BoltIcon = ({ boxSize = '1em' }: { boxSize?: string | number }) => (
  <chakra.svg viewBox="0 0 24 24" boxSize={boxSize} aria-hidden>
    <chakra.path
      d="M21 12a9 9 0 0 1-13.65 7.6L3 21.2l1.6-4.3A9 9 0 1 1 21 12z"
      fill="bg.raised"
      stroke="border.ink-light"
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    <chakra.path
      d="M13.2 6.6 9.2 12.6h2.9l-.9 4.8 4.4-6.4h-2.9z"
      fill="warm.solid"
      stroke="border.ink"
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  </chakra.svg>
);

/**
 * Duotone doodle set for empty states: flat shapes in bg.raised / warm / ink
 * with chunky outlines. Sized via boxSize (Chakra's EmptyState otherwise
 * forces icons to 1em).
 */

/**
 * Restraint-pass redraw (2026-08-02): abstract compositions — no faces, no
 * sparkles (both named "AI-slop" tells). One warm accent element per piece
 * (warm.400 — dark-safe, no glare), ink outlines, bg.raised fills.
 */

/** Empty conversation list: envelope in an inbox tray, warm "reply" tab. */
export const InboxArt = ({ boxSize = '88px' }: { boxSize?: string | number }) => (
  <chakra.svg viewBox="0 0 120 120" boxSize={boxSize} aria-hidden>
    <chakra.path
      d="M18 42h84l-10 40a8 8 0 0 1-8 7H36a8 8 0 0 1-8-7z"
      fill="bg.raised"
      stroke="border.ink-light"
      strokeWidth={4}
      strokeLinejoin="round"
    />
    <chakra.rect
      x="32"
      y="22"
      width="56"
      height="34"
      rx="6"
      fill="bg.raised"
      stroke="border.ink-light"
      strokeWidth={4}
    />
    <chakra.path
      d="M32 22l28 22 28-22"
      fill="none"
      stroke="border.ink-light"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <chakra.rect
      x="78"
      y="38"
      width="22"
      height="14"
      rx="5"
      fill="warm.400"
      stroke="border.ink"
      strokeWidth={3}
    />
  </chakra.svg>
);

/** Empty chat: a stacked pair of speech bubbles — the "reply" register. */
export const ChatArt = ({ boxSize = '88px' }: { boxSize?: string | number }) => (
  <chakra.svg viewBox="0 0 120 120" boxSize={boxSize} aria-hidden>
    <chakra.rect
      x="34"
      y="16"
      width="70"
      height="48"
      rx="14"
      fill="bg.raised"
      stroke="border.ink-light"
      strokeWidth={4}
    />
    <chakra.path
      d="M52 64l-8 14 18-12z"
      fill="bg.raised"
      stroke="border.ink-light"
      strokeWidth={4}
      strokeLinejoin="round"
    />
    <chakra.rect
      x="16"
      y="54"
      width="56"
      height="40"
      rx="14"
      fill="warm.400"
      stroke="border.ink"
      strokeWidth={4}
    />
    <chakra.path
      d="M58 94l8 12-16-10z"
      fill="warm.400"
      stroke="border.ink"
      strokeWidth={4}
      strokeLinejoin="round"
    />
  </chakra.svg>
);

/** Empty search: magnifier over a result card, warm focus dot. */
export const SearchArt = ({ boxSize = '88px' }: { boxSize?: string | number }) => (
  <chakra.svg viewBox="0 0 120 120" boxSize={boxSize} aria-hidden>
    <chakra.circle cx="48" cy="46" r="26" fill="bg.raised" stroke="border.ink-light" strokeWidth={4} />
    <chakra.path d="M67 65l22 22" stroke="border.ink-light" strokeWidth={8} strokeLinecap="round" />
    <chakra.rect
      x="56"
      y="84"
      width="44"
      height="14"
      rx="5"
      fill="bg.raised"
      stroke="border.ink-light"
      strokeWidth={3}
    />
    <chakra.circle cx="44" cy="42" r="4" fill="warm.400" stroke="border.ink" strokeWidth={2} />
  </chakra.svg>
);

/** Read-receipt glyphs rendered per message status. */
export function MessageStatusIcon({ status, size = 14 }: { status: MessageStatus; size?: number }) {
  switch (status) {
    case 'sending':
      return <ClockIcon boxSize={`${size}px`} color="text.muted" />;
    case 'sent':
      return <CheckIcon boxSize={`${size}px`} color="text.muted" />;
    case 'delivered':
      return <DoubleCheckIcon boxSize={`${size}px`} color="text.muted" />;
    case 'read':
      // Read = success register (green): distinct from the muted sent/
      // delivered ticks in both modes, and contrast-safe on the canvas.
      return <DoubleCheckIcon boxSize={`${size}px`} color="success.solid" />;
    case 'failed':
      return <AlertCircleIcon boxSize={`${size}px`} color="danger.solid" />;
    default:
      return null;
  }
}