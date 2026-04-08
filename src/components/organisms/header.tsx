"use client";

import { useSyncExternalStore } from "react";
import Avatar from "@mui/material/Avatar";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AppBar from "@mui/material/AppBar";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Link from "@/components/atoms/link";
import { useRouter } from "next/navigation";
import Toolbar from "@mui/material/Toolbar";

const AUTH_EMAIL_STORAGE_KEY = "auth_user_email";
const AUTH_USERNAME_STORAGE_KEY = "auth_user_username";
const AUTH_EMAIL_EVENT = "auth-user-email-changed";

function subscribe(callback: () => void) {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(AUTH_EMAIL_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTH_EMAIL_EVENT, handler);
  };
}

function getEmailSnapshot() {
  return localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "";
}

function getUsernameSnapshot() {
  return localStorage.getItem(AUTH_USERNAME_STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function getColorFromSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}

export default function Header() {
  const router = useRouter();
  const userEmail = useSyncExternalStore(subscribe, getEmailSnapshot, getServerSnapshot);
  const username = useSyncExternalStore(subscribe, getUsernameSnapshot, getServerSnapshot);
  const isLoggedIn = Boolean(userEmail);
  const displayName = username || "John Doe";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const avatarBackgroundColor = isLoggedIn ? getColorFromSeed(`${username}|${userEmail}`) : "#ffffff";

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
    localStorage.removeItem(AUTH_USERNAME_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_EMAIL_EVENT));
    router.push("/login");
    router.refresh();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton color="inherit" aria-label="home" component={Link} href="/">
          <HomeOutlinedIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          color="inherit"
          aria-label="profile"
          component={Link}
          href={isLoggedIn ? "/account" : "/login"}
        >
          {isLoggedIn ? (
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
                bgcolor: avatarBackgroundColor,
                color: "#ffffff",
              }}
            >
              {initials || "JD"}
            </Avatar>
          ) : (
            <LoginOutlinedIcon />
          )}
        </IconButton>
        {isLoggedIn ? (
          <IconButton color="inherit" aria-label="logout" onClick={handleLogout}>
            <LogoutOutlinedIcon />
          </IconButton>
        ) : null}
        <IconButton color="inherit" aria-label="module selector">
          <AppsOutlinedIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
