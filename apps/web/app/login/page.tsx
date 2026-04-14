"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";

const SESSION_KEY = "app:isAuthenticated";

export default function LoginPage() {
  const configuredPassword = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const hasSession = window.sessionStorage.getItem(SESSION_KEY) === "true";

    if (hasSession) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!configuredPassword) {
      setError("Password is not configured. Set NEXT_PUBLIC_APP_PASSWORD.");
      return;
    }

    if (password !== configuredPassword) {
      setError("Invalid password.");
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, "true");
    setError("");
    setPassword("");
    router.replace("/");
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", px: 2, py: 6 }}>
      <Paper sx={{ width: "100%", maxWidth: 420, p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Login
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to continue.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2 }}>
          <TextField
            autoFocus
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Button type="submit" variant="contained">
            Login
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
