"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";

export default function CreateListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a list name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to create list.");
        return;
      }

      setName("");
      router.refresh();
    } catch {
      setError("Unexpected error while creating list.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
      <TextField
        fullWidth
        size="small"
        label="List name"
        placeholder="e.g. Weekly groceries"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" variant="contained" sx={{ whiteSpace: "nowrap" }} disabled={isSubmitting}>
        Add another list
      </Button>
      {error ? <Alert severity="error" sx={{ ml: 1 }}>{error}</Alert> : null}
    </Box>
  );
}
