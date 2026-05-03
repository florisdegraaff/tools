"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { encryptLoginPassword } from "@/lib/login-encrypt-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = e.currentTarget;
      const password = new FormData(form).get("password");
      if (typeof password !== "string" || password.length === 0) {
        setError("Password is required");
        return;
      }

      const publicKeyPem = process.env.NEXT_PUBLIC_LOGIN_RSA_PUBLIC_KEY;
      if (!publicKeyPem) {
        setError("Login is not configured (missing public key).");
        return;
      }

      let encryptedPassword: string;
      try {
        encryptedPassword = await encryptLoginPassword(password, publicKeyPem);
      } catch {
        setError("Could not encrypt password. Check RSA key configuration.");
        return;
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedPassword }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Something went wrong";
        setError(message);
        return;
      }

      router.replace("/");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 3,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: (theme) => theme.breakpoints.values.sm,
        }}
      >
        <Paper elevation={0} variant="outlined" sx={{ p: 4 }}>
          <Typography component="h1" variant="h5" gutterBottom>
            Log in
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
          >
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              required
              fullWidth
              disabled={submitting}
              onChange={() => setError(null)}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Checking…" : "Continue"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
