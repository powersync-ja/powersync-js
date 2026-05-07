import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export const ThemeProviderContainer: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const theme = React.useMemo(() => {
    return createTheme({
      palette: {
        mode: 'dark',
        primary: {
          main: '#7dd3fc',
          dark: '#0284c7',
          light: '#bae6fd'
        },
        secondary: {
          main: '#a78bfa'
        },
        success: {
          main: '#34d399'
        },
        background: {
          default: '#090d14',
          paper: '#111827'
        },
        text: {
          primary: '#edf4ff',
          secondary: '#9aa8bd'
        },
        divider: 'rgba(148, 163, 184, 0.22)'
      },
      shape: {
        borderRadius: 8
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: '#090d14'
            }
          }
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 8
            }
          }
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.36)'
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            rounded: {
              borderRadius: 8
            }
          }
        },
        MuiTextField: {
          defaultProps: {
            variant: 'outlined'
          }
        }
      },
      typography: {
        fontFamily: 'Inter, Rubik, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        h4: {
          fontWeight: 800
        },
        h5: {
          fontWeight: 800
        },
        h6: {
          fontWeight: 800
        }
      }
    });
  }, []);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
