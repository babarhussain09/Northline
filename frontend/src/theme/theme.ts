import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#102433', light: '#3C5568', dark: '#0B1822', contrastText: '#F7F4EE' },
    secondary: { main: '#0F766E', light: '#14B8A6', dark: '#115E59', contrastText: '#F7F4EE' },
    background: { default: '#F6F4EF', paper: '#FFFcf8' },
    text: { primary: '#17212B', secondary: '#5C6B78' },
    divider: '#E6E1D8',
    success: { main: '#1F7A4D' },
    warning: { main: '#A16207' },
    error: { main: '#B42318' },
    info: { main: '#1D4E89' },
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 560, letterSpacing: '-0.03em', fontSize: '3.4rem', lineHeight: 1.05 },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 560, letterSpacing: '-0.03em', fontSize: '2.4rem', lineHeight: 1.15 },
    h3: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 560, letterSpacing: '-0.02em', fontSize: '1.7rem' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 18, boxShadow: 'none' },
        contained: { boxShadow: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #E6E1D8', boxShadow: 'none', backgroundImage: 'none' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, backgroundColor: '#fff' } } },
    MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});
