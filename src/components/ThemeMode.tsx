/* oxlint-disable react/only-export-components -- context module: provider + hook + toggle are one unit */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { IconButton, useSafeLayoutEffect } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from './icons';

/**
 * Light/dark theme mode.
 *
 * Chakra v3 in this build has no ColorModeProvider — dark mode is driven by
 * the `_dark` condition (`.dark &`), so we toggle a `dark` class on <html>.
 * Every semantic token carries both values in src/theme.ts.
 */

type ThemeMode = 'light' | 'dark';

const ThemeModeContext = createContext<{ mode: ThemeMode; toggle: () => void }>({
  mode: 'light',
  toggle: () => {},
});

export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useSafeLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'dark' ? '#0e0e11' : '#f5f5f7');
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  return <ThemeModeContext.Provider value={{ mode, toggle }}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = () => useContext(ThemeModeContext);

export const ThemeToggle = () => {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <IconButton
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      variant="ghost"
      size="sm"
      color="text.secondary"
      _hover={{ color: 'warm.text', bg: 'warm.muted' }}
      onClick={toggle}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
};
