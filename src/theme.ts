import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

/**
 * "Cartoon Duo" — minimalist bones, cartoon skin.
 *
 * Flat neutral surfaces + TWO accents: ink-blue (primary actions, bubbles,
 * links) and warm amber (unread dots, badges, highlights — used sparingly).
 * Cartoon details: chunky 2px borders, hard offset shadows (3px 3px 0), big
 * radii, rounded display type (Fredoka) for headings/buttons, quiet Inter for
 * body. Light is the default; the `dark` class on <html> switches every
 * semantic token via its `_dark` value (Chakra v3 ships the `_dark`
 * condition as `.dark &`). Theme mode is managed by ThemeModeProvider.
 */
const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        // Restraint pass (2026-08-02): Fredoka is a BRAND-MOMENT face only —
        // wordmark + auth-page headings (≥24px). Everything else (headings,
        // dialog titles, buttons) stays on Inter so the product reads calm.
        // Duolingo's rule: display type is reserved for large sizes.
        heading: {
          value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        body: {
          value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        display: {
          value: "'Fredoka', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      },
      colors: {
        // Graphite ink accent (2026-08-02): the blue accent was removed per
        // user direction — this scale is a neutral graphite so warm amber is
        // the ONLY color in the system (amber = attention, graphite = action).
        // Used via colorScheme="brand" and the `accent.*` semantic tokens.
        brand: {
          50: { value: '#ededef' },
          100: { value: '#c6c6cd' },
          200: { value: '#9b9ba5' },
          300: { value: '#70707b' },
          400: { value: '#55555f' },
          500: { value: '#3a3a42' },
          600: { value: '#2f2f36' },
          700: { value: '#26262c' },
          800: { value: '#1e1e23' },
          900: { value: '#17171b' },
        },
        // Warm amber — the second accent, used sparingly (unread dots,
        // badges, highlights). colorScheme="warm" works via this scale.
        warm: {
          50: { value: '#fffbeb' },
          100: { value: '#fef3c7' },
          200: { value: '#fde68a' },
          300: { value: '#fcd34d' },
          400: { value: '#fbbf24' },
          500: { value: '#f59e0b' },
          600: { value: '#d97706' },
          700: { value: '#b45309' },
          800: { value: '#92400e' },
          900: { value: '#78350f' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'bg.canvas': { value: { base: '#f5f5f7', _dark: '#0e0e11' } }, // chat area, page background
        'bg.surface': { value: { base: '#ffffff', _dark: '#16161a' } }, // sidebar, headers, input bars
        'bg.raised': { value: { base: '#ffffff', _dark: '#1f1f27' } }, // bubbles, inputs, cards
        'bg.hover': { value: { base: '#efeff2', _dark: '#24242c' } },
        'bg.active': {
          value: { base: 'rgba(58, 58, 66, 0.10)', _dark: 'rgba(112, 112, 123, 0.25)' },
        },
        'text.primary': { value: { base: '#16161a', _dark: '#f2f2f4' } },
        'text.secondary': { value: { base: '#6e6e76', _dark: '#a2a2ab' } },
        // Both modes tuned to clear WCAG AA (4.5:1) for the 12px meta text
        // (timestamps, message times): 4.57:1 light / 5.64:1 dark.
        'text.muted': { value: { base: '#6f6f78', _dark: '#8a8a94' } },
        // White-on-accent text: graphite accent.solid keeps white readable in
        // both modes (11.4:1 on brand.500 in light, 7.4:1 on brand.400 in
        // dark); hover deepens in light (brand.600) and lightens in dark
        // (brand.300, 4.9:1).
        'text.inverse': { value: { base: '#ffffff', _dark: '#ffffff' } },
        'border.subtle': { value: { base: '#e6e6eb', _dark: '#2f2f37' } },
        'border.strong': { value: { base: '#d4d4dc', _dark: '#4a4a54' } },
        // CRITICAL (Chakra v3.36 quirk): semantic token values that reference
        // other tokens by BARE NAME ("brand.500") are emitted VERBATIM into
        // CSS ("--chakra-colors-accent\.solid: brand.500") — an invalid color,
        // so the browser drops the property (transparent bg, broken fills).
        // References must be written as CSS var() chains, which resolve
        // correctly. Verified via getTokenCss() output.
        'border.accent': {
          value: {
            base: 'var(--chakra-colors-brand-500)',
            _dark: 'var(--chakra-colors-brand-300)',
          },
        },
        // Graphite fills: deep in light (white text 11.4:1), a step lighter in
        // dark so the bubble reads against the near-black canvas (7.4:1).
        'accent.solid': {
          value: {
            base: 'var(--chakra-colors-brand-500)',
            _dark: 'var(--chakra-colors-brand-400)',
          },
        },
        'accent.hover': {
          value: {
            base: 'var(--chakra-colors-brand-600)',
            _dark: 'var(--chakra-colors-brand-300)',
          },
        },
        // TEXT/ICON role of the accent (links, read ticks): bright in dark so
        // it stays distinct from text.muted and never vanishes on canvas.
        'accent.text': {
          value: {
            base: 'var(--chakra-colors-brand-600)',
            _dark: 'var(--chakra-colors-brand-100)',
          },
        },
        'warm.solid': {
          value: {
            base: 'var(--chakra-colors-warm-500)',
            _dark: 'var(--chakra-colors-warm-400)',
          },
        },
        // Readable amber for content/icons ON a surface (hovers, markers):
        // warm.solid is light amber that vanishes on white (2.2:1), so the
        // text/icon role uses a deeper amber in light / bright in dark.
        'warm.text': {
          value: {
            base: 'var(--chakra-colors-warm-700)',
            _dark: 'var(--chakra-colors-warm-300)',
          },
        },
        'warm.hover': {
          value: {
            base: 'var(--chakra-colors-warm-600)',
            _dark: 'var(--chakra-colors-warm-300)',
          },
        },
        'warm.muted': {
          value: { base: 'rgba(245, 158, 11, 0.12)', _dark: 'rgba(251, 191, 36, 0.16)' },
        },
        // Chakra's `subtle` variants (Badge/Button colorScheme="brand|warm")
        // read these tokens; the custom palettes above define no subtle/fg
        // shades, so without these the subtle fills render transparent.
        'brand.subtle': { value: { base: 'rgba(58, 58, 66, 0.08)', _dark: 'rgba(112, 112, 123, 0.16)' } },
        'brand.fg': {
          value: {
            base: 'var(--chakra-colors-brand-700)',
            _dark: 'var(--chakra-colors-brand-200)',
          },
        },
        'warm.subtle': { value: { base: 'rgba(245, 158, 11, 0.12)', _dark: 'rgba(251, 191, 36, 0.16)' } },
        'warm.fg': {
          value: {
            base: 'var(--chakra-colors-warm-700)',
            _dark: 'var(--chakra-colors-warm-200)',
          },
        },
        // Cartoon outline for surfaces that are DARK in dark mode (incoming
        // bubbles, cards, dialogs, art strokes): light mode it equals the ink
        // line; dark mode it is a light line (≈11.7:1 on raised) so the 2px
        // cartoon outline survives on near-black surfaces.
        'border.ink-light': { value: { base: '#16161a', _dark: '#d6d6dc' } },
        // border.ink stays the dark line for LIGHT fills (accent buttons, my
        // bubbles, avatar rings, warm dots): dark ink in light mode, near-black
        // in dark.
        'border.ink': { value: { base: '#16161a', _dark: '#000000' } },
        // Light-mode solids darkened to clear 4.5:1 on the canvas for the
        // 12px "Connected"/"Connecting..." status labels (4.60 / 4.63).
        'success.solid': { value: { base: '#078049', _dark: '#3fcb85' } },
        'danger.solid': { value: { base: '#c93a40', _dark: '#f2555a' } },
        'danger.muted': { value: { base: 'rgba(229, 72, 77, 0.08)', _dark: 'rgba(242, 85, 90, 0.14)' } },
        'danger.border': { value: { base: 'rgba(229, 72, 77, 0.25)', _dark: 'rgba(242, 85, 90, 0.8)' } },
      },
      shadows: {
        // Hard cartoon offset shadows: 3px for buttons/bubbles, 4px for cards.
        // In dark mode the offset is a light hard edge — a "backlight" that
        // restores depth on near-black surfaces; pressing still removes it.
        offset: { value: { base: '3px 3px 0 #16161a', _dark: '3px 3px 0 rgba(255,255,255,0.08)' } },
        'offset-lg': { value: { base: '4px 4px 0 #16161a', _dark: '4px 4px 0 rgba(255,255,255,0.08)' } },
      },
    },
    layerStyles: {
      card: {
        bg: 'bg.raised',
        border: '2px solid',
        borderColor: { base: 'border.ink', _dark: 'border.ink-light' },
        borderRadius: '2xl',
        boxShadow: 'offset-lg',
      },
    },
    recipes: {
      // Cartoon skin for the default Chakra recipes.
      button: {
        base: {
          fontWeight: '600',
        },
        variants: {
          // Solid buttons: chunky outline + hard shadow that "presses down".
          // Opt-in per button: <Button cartoon> — ghost/subtle stay flat.
          cartoon: {
            true: {
              border: '2px solid',
              // Outline follows fill luminance: graphite fills (dark in both
              // modes) get a LIGHT outline — canvas-white in light mode,
              // ink-light in dark. Light fills keep the dark ink line.
              borderColor: { base: 'bg.canvas', _dark: 'border.ink-light' },
              boxShadow: 'offset',
              _active: {
                transform: 'translate(2px, 2px)',
                boxShadow: 'none',
              },
              _disabled: {
                // Explicit gray, NOT an opacity wash: fading a colored button
                // makes its label unreadable in both modes (white on faded
                // graphite). Gray + muted text is unambiguous.
                opacity: '1',
                bg: 'bg.hover',
                color: 'text.secondary',
                borderColor: 'transparent',
                boxShadow: 'none',
                transform: 'none',
              },
            },
          },
        },
      },
      input: {
        base: {
          borderWidth: '2px',
          borderRadius: 'lg',
        },
      },
      textarea: {
        base: {
          borderWidth: '2px',
        },
      },
    },
    keyframes: {
      // Auth card hero moment (the one large entrance).
      'fade-in-up': {
        from: { opacity: '0', transform: 'translateY(4px)' },
        to: { opacity: '1', transform: 'translateY(0)' },
      },
      // Message arrival: a subtle settle — opacity + slight rise + scale from
      // 0.98, NO overshoot above 1. Alive but calm; ≤200ms; transform/opacity
      // only; global reduced-motion override keeps it safe.
      'spring-in': {
        from: { opacity: '0', transform: 'translateY(3px) scale(0.98)' },
        to: { opacity: '1', transform: 'translateY(0) scale(1)' },
      },
      // Soft living pulse for the connected dot.
      pulse: {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0.45' },
      },
    },
  },
  globalCss: {
    html: {
      height: '100%',
      colorScheme: 'light',
    },
    'html.dark': {
      colorScheme: 'dark',
    },
    body: {
      bg: 'bg.canvas',
      color: 'text.primary',
      fontFamily: 'body',
      overflow: 'hidden',
      height: '100dvh',
    },
    '#root': {
      height: '100dvh',
    },
    '::selection': {
      bg: 'brand.500/25',
    },
    '::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: 'rgba(128, 128, 140, 0.25)',
      borderRadius: '3px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: 'rgba(128, 128, 140, 0.4)',
    },
    ':focus-visible': {
      outline: '2px solid',
      outlineColor: 'border.accent',
      outlineOffset: '2px',
    },
    '@media (prefers-reduced-motion: reduce)': {
      '& *': {
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        transitionDuration: '0.01ms !important',
        scrollBehavior: 'auto !important',
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
