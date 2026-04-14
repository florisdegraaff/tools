import { createTheme } from "@mui/material/styles";

type ThemeMode = "light" | "dark";

export function createAppTheme(mode: ThemeMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#1976d2",
      },
      secondary: {
        main: "#9c27b0",
      },
      background: {
        default: mode === "dark" ? "#0a0a0a" : "#f7f9fc",
      },
    },
    typography: {
      fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          code: {
            fontFamily: "var(--font-geist-mono), monospace",
          },
          pre: {
            fontFamily: "var(--font-geist-mono), monospace",
          },
        },
      },
    },
  });
}
