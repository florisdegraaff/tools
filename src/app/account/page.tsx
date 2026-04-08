"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const AUTH_EMAIL_STORAGE_KEY = "auth_user_email";
const AUTH_USERNAME_STORAGE_KEY = "auth_user_username";
const AUTH_EMAIL_EVENT = "auth-user-email-changed";

type EditableField = "username" | "email" | "password" | null;

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [user, setUser] = useState<{
    id: string;
    username: string | null;
    email: string;
    createdAt: string;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/account", { method: "GET" });
        const data = (await response.json()) as {
          error?: string;
          user?: {
            id: string;
            username: string | null;
            email: string;
            createdAt: string;
            updatedAt: string;
          };
        };

        if (!response.ok) {
          setError(data.error ?? "Unable to load account.");
          return;
        }

        if (data.user) {
          setUser(data.user);
        } else {
          setError("Unable to load account.");
        }
      } catch {
        setError("Unexpected error while loading account.");
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
  }, []);

  const beginEdit = (field: Exclude<EditableField, null>) => {
    setError(null);
    setSuccess(null);
    setEditingField(field);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");

    if (field === "username") {
      setFieldValue(user?.username ?? "");
    } else if (field === "email") {
      setFieldValue(user?.email ?? "");
    } else {
      setFieldValue("");
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setFieldValue("");
  };

  const saveField = async () => {
    if (!editingField) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const payload: {
      username?: string;
      email?: string;
      currentPassword: string;
      newPassword?: string;
      confirmNewPassword?: string;
    } = {
      currentPassword,
    };

    if (editingField === "username") {
      payload.username = fieldValue;
    } else if (editingField === "email") {
      payload.email = fieldValue;
    } else {
      payload.newPassword = newPassword;
      payload.confirmNewPassword = confirmNewPassword;
    }

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: { username: string | null; email: string };
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to update account.");
        return;
      }

      if (data.user) {
        setUser((prev) => (prev ? { ...prev, ...data.user } : prev));
        localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, data.user.email);
        if (data.user.username) {
          localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, data.user.username);
        } else {
          localStorage.removeItem(AUTH_USERNAME_STORAGE_KEY);
        }
        window.dispatchEvent(new Event(AUTH_EMAIL_EVENT));
      }

      setSuccess("Account field updated.");
      cancelEdit();
    } catch {
      setError("Unexpected error while updating account.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Account
      </Typography>
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}
        {loading ? <Typography>Loading account...</Typography> : null}
        {user ? (
          <TableContainer>
            <Table size="small" aria-label="account details">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ borderBottom: "none", pl: 0, width: 140 }}>
                    <strong>Username</strong>
                  </TableCell>
                  <TableCell sx={{ borderBottom: "none", pl: 0 }}>{user.username ?? "-"}</TableCell>
                  <TableCell sx={{ borderBottom: "none", width: 56 }}>
                    <IconButton size="small" aria-label="edit username" onClick={() => beginEdit("username")}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {editingField === "username" ? (
                  <TableRow>
                    <TableCell sx={{ borderBottom: "none", pl: 0 }} />
                    <TableCell sx={{ borderBottom: "none", pl: 0 }} colSpan={2}>
                      <Stack spacing={1}>
                        <TextField
                          size="small"
                          label="Username"
                          value={fieldValue}
                          onChange={(event) => setFieldValue(event.target.value)}
                        />
                        <TextField
                          size="small"
                          type="password"
                          label="Current Password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" size="small" onClick={saveField} disabled={isSaving}>
                            Save
                          </Button>
                          <Button variant="text" size="small" onClick={cancelEdit} disabled={isSaving}>
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow>
                  <TableCell sx={{ borderBottom: "none", pl: 0, width: 140 }}>
                    <strong>Email</strong>
                  </TableCell>
                  <TableCell sx={{ borderBottom: "none", pl: 0 }}>{user.email}</TableCell>
                  <TableCell sx={{ borderBottom: "none", width: 56 }}>
                    <IconButton size="small" aria-label="edit email" onClick={() => beginEdit("email")}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {editingField === "email" ? (
                  <TableRow>
                    <TableCell sx={{ borderBottom: "none", pl: 0 }} />
                    <TableCell sx={{ borderBottom: "none", pl: 0 }} colSpan={2}>
                      <Stack spacing={1}>
                        <TextField
                          size="small"
                          label="Email"
                          value={fieldValue}
                          onChange={(event) => setFieldValue(event.target.value)}
                        />
                        <TextField
                          size="small"
                          type="password"
                          label="Current Password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" size="small" onClick={saveField} disabled={isSaving}>
                            Save
                          </Button>
                          <Button variant="text" size="small" onClick={cancelEdit} disabled={isSaving}>
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow>
                  <TableCell sx={{ borderBottom: "none", pl: 0 }}>
                    <strong>Password</strong>
                  </TableCell>
                  <TableCell sx={{ borderBottom: "none", pl: 0 }}>••••••••</TableCell>
                  <TableCell sx={{ borderBottom: "none", width: 56 }}>
                    <IconButton size="small" aria-label="edit password" onClick={() => beginEdit("password")}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {editingField === "password" ? (
                  <TableRow>
                    <TableCell sx={{ borderBottom: "none", pl: 0 }} />
                    <TableCell sx={{ borderBottom: "none", pl: 0 }} colSpan={2}>
                      <Stack spacing={1}>
                        <TextField
                          size="small"
                          type="password"
                          label="Current Password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                        />
                        <TextField
                          size="small"
                          type="password"
                          label="New Password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                        <TextField
                          size="small"
                          type="password"
                          label="Confirm New Password"
                          value={confirmNewPassword}
                          onChange={(event) => setConfirmNewPassword(event.target.value)}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" size="small" onClick={saveField} disabled={isSaving}>
                            Save
                          </Button>
                          <Button variant="text" size="small" onClick={cancelEdit} disabled={isSaving}>
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Stack>
    </Box>
  );
}
