import { createTheme, alpha } from '@mui/material/styles';
import type { ColorMode } from '../store/themeStore';

declare module '@mui/material/styles' {
  interface Palette {
    xp: { main: string; light: string };
    glass: { low: string; mid: string; highlight: string; border: string };
  }
  interface PaletteOptions {
    xp?: { main: string; light: string };
    glass?: { low: string; mid: string; highlight: string; border: string };
  }
}

function buildGlassTokens(mode: ColorMode) {
  if (mode === 'light') {
    return {
      low: 'rgba(255, 255, 255, 0.72)',
      mid: 'rgba(255, 255, 255, 0.88)',
      highlight: 'rgba(0, 0, 0, 0.04)',
      border: 'rgba(0, 0, 0, 0.09)',
    };
  }
  return {
    low: 'rgba(28, 26, 24, 0.42)',
    mid: 'rgba(32, 30, 27, 0.58)',
    highlight: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.1)',
  };
}

export function createAppTheme(mode: ColorMode) {
  const glass = buildGlassTokens(mode);
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#b8860b',
        light: isDark ? '#d4a84a' : '#c9a227',
        dark: '#8b6914',
        contrastText: isDark ? '#141210' : '#faf8f5',
      },
      secondary: {
        main: isDark ? '#6b9080' : '#5a7d6e',
        light: isDark ? '#8fb3a6' : '#7a9a8a',
        dark: isDark ? '#4a6358' : '#4a6358',
      },
      background: {
        default: isDark ? '#12100e' : '#f5f2ed',
        paper: isDark ? '#1a1816' : '#faf8f5',
      },
      success: { main: isDark ? '#5c7c5f' : '#4a6b4d', light: isDark ? '#7a9a7d' : '#6b8a6e' },
      warning: { main: '#b8860b', light: '#d4a84a' },
      error: { main: isDark ? '#b85c5c' : '#a84848', light: isDark ? '#d08080' : '#c06060' },
      info: { main: isDark ? '#6b8c9e' : '#5a7a8c', light: isDark ? '#8fabbd' : '#7a9aad' },
      xp: { main: '#c9a227', light: isDark ? '#f0d49a' : '#8b6914' },
      text: {
        primary: isDark ? '#e8e4df' : '#2a2620',
        secondary: isDark ? '#9a9590' : '#5c5850',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
      glass,
    },
    shape: { borderRadius: 12 },
    spacing: 8,
    typography: {
      fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
      h1: { fontFamily: '"Literata", Georgia, serif', fontWeight: 600, letterSpacing: '-0.02em' },
      h2: { fontFamily: '"Literata", Georgia, serif', fontWeight: 600, letterSpacing: '-0.015em' },
      h3: { fontFamily: '"Literata", Georgia, serif', fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      body1: { lineHeight: 1.65 },
      body2: { lineHeight: 1.6 },
      button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#12100e' : '#f5f2ed',
            backgroundImage: isDark
              ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 162, 39, 0.07), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(107, 144, 128, 0.05), transparent)'
              : 'radial-gradient(ellipse 70% 45% at 50% -15%, rgba(184, 134, 11, 0.06), transparent), radial-gradient(ellipse 50% 40% at 100% 60%, rgba(90, 125, 110, 0.05), transparent)',
            backgroundAttachment: 'fixed',
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 'max(24px, env(safe-area-inset-left))',
            paddingRight: 'max(24px, env(safe-area-inset-right))',
            '@media (min-width: 600px)': { paddingLeft: 32, paddingRight: 32 },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: glass.low,
            backdropFilter: 'blur(14px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.15)',
            border: `1px solid ${glass.border}`,
            borderRadius: 14,
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
            '&:hover': {
              borderColor: isDark ? 'rgba(201,162,39,0.22)' : alpha('#b8860b', 0.35),
              background: glass.mid,
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)'
                : '0 6px 24px rgba(0,0,0,0.08)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 24, '&:last-child': { paddingBottom: 24 } },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '9px 20px', fontSize: '0.9375rem' },
          contained: {
            backgroundColor: isDark ? '#c9a227' : '#b8860b',
            color: isDark ? '#141210' : '#faf8f5',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: isDark ? '#d4b03d' : '#9a7209',
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
            color: 'text.primary',
            '&:hover': {
              borderColor: isDark ? 'rgba(201,162,39,0.45)' : alpha('#b8860b', 0.5),
              backgroundColor: isDark ? 'rgba(201,162,39,0.06)' : alpha('#b8860b', 0.06),
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(18, 16, 14, 0.45)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              '& fieldset': {
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              },
              '&.Mui-focused fieldset': { borderColor: '#b8860b' },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            height: 6,
          },
          bar: { borderRadius: 4, backgroundColor: isDark ? '#c9a227' : '#b8860b' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: glass.mid,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${glass.border}`,
            borderRadius: 8,
            fontSize: '0.8125rem',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: glass.low,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${glass.border}`,
            boxShadow: isDark
              ? '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 2px 12px rgba(0,0,0,0.06)',
          },
          elevation0: { background: glass.low },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: glass.mid,
            backdropFilter: 'blur(18px) saturate(1.1)',
            border: `1px solid ${glass.border}`,
            boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.45)' : '0 12px 40px rgba(0,0,0,0.12)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            background: glass.mid,
            backdropFilter: 'blur(16px)',
            border: `1px solid ${glass.border}`,
            marginTop: 8,
          },
        },
      },
    },
  });
}
