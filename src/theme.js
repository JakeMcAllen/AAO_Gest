import { createTheme } from '@mui/material/styles'

// Stessa identità del sito pubblico (rosso/bianco, editoriale, angoli netti),
// tradotta nei token di Material UI.
const RED = '#d51e28'
const RED_DARK = '#ac151d'
const INK = '#141414'

export function buildTheme(mode = 'light') {
  const dark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: { main: RED, dark: RED_DARK, contrastText: '#ffffff' },
      secondary: { main: dark ? '#cfccc6' : INK },
      success: { main: '#2f7d5b' },
      info: { main: '#2f6d8f' },
      warning: { main: '#9a6b16' },
      error: { main: '#b23b3b' },
      background: {
        default: dark ? '#141414' : '#f6f5f3',
        paper: dark ? '#1c1c1c' : '#ffffff',
      },
      text: {
        primary: dark ? '#f2f0ed' : INK,
        secondary: dark ? '#a9a6a1' : '#6f6f6f',
      },
      divider: dark ? '#2e2e2e' : '#e4e2de',
    },
    shape: { borderRadius: 3 },
    typography: {
      fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, 'Segoe UI', system-ui, sans-serif",
      h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em' },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      h4: { fontSize: '1.05rem', fontWeight: 600 },
      h5: { fontSize: '0.95rem', fontWeight: 600 },
      h6: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.02em' },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
      overline: { letterSpacing: '0.12em', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased' },
          '::selection': { background: 'rgba(213,30,40,0.18)' },
        },
      },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({ border: `1px solid ${theme.palette.divider}` }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { paddingInline: 16 } },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 3 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 3 } } },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, whiteSpace: 'nowrap' },
        },
      },
    },
  })
}
