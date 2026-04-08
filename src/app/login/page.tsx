"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/atoms/link";

const AUTH_EMAIL_STORAGE_KEY = "auth_user_email";
const AUTH_USERNAME_STORAGE_KEY = "auth_user_username";
const AUTH_EMAIL_EVENT = "auth-user-email-changed";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data: {
        error?: string;
        user?: { email: string; username: string | null };
      };
      try {
        data = (await response.json()) as {
          error?: string;
          user?: { email: string; username: string | null };
        };
      } catch {
        data = {};
      }
      if (!response.ok) {
        setError(data.error ?? "Unable to login.");
        return;
      }

      if (data.user?.email) {
        localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, data.user.email);
        if (data.user.username) {
          localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, data.user.username);
        } else {
          localStorage.removeItem(AUTH_USERNAME_STORAGE_KEY);
        }
        window.dispatchEvent(new Event(AUTH_EMAIL_EVENT));
      }
      form.reset();
      setSuccess("Login successful.");
      router.push("/");
    } catch {
      setError("Unexpected error while logging in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Login
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            fullWidth
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            fullWidth
          />
          <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
            Submit
          </Button>
          <Link component={AppLink} href="/signup" underline="hover">
            Create an account
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
