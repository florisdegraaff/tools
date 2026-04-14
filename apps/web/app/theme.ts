import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9c27b0",
    },
    background: {
      default: "#f7f9fc",
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

export default theme;
