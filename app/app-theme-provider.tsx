"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: true,
    dark: true,
  },
  typography: {
    fontFamily:
      'var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", sans-serif',
  },
});

type AppThemeProviderProps = { children: ReactNode };

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="system"
      storageManager={null}
    >
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
