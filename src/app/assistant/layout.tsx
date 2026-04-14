"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import styles from "./layout.module.scss";

type AssistantLayoutProps = Readonly<{
  children: ReactNode;
}>;

const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 220;
const navItems = [
  { label: "Search", icon: <SearchOutlinedIcon /> },
  { label: "Temporary Chat", icon: <HistoryToggleOffOutlinedIcon /> },
  { label: "Chat", icon: <ChatBubbleOutlineOutlinedIcon /> },
  { label: "Folder", icon: <FolderOutlinedIcon /> },
];

export default function AssistantLayout({ children }: AssistantLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarWidth = isSidebarOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  return (
    <Box className={styles.container} style={{ "--assistant-sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: sidebarWidth,
          boxSizing: "content-box",
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: sidebarWidth,
            boxSizing: "border-box",
            top: 64,
            height: "calc(100vh - 64px)",
            borderRight: "1px solid #1f2937",
            background: "#0b0d10",
            color: "#9ca3af",
            overflowX: "hidden",
            transition: "width 300ms ease",
            padding: "8px",
          },
        }}
      >
        <Stack className={styles.sidebarContent}>
          <IconButton color="inherit" aria-label="Menu" onClick={() => setIsSidebarOpen((previous) => !previous)}>
            <MenuOutlinedIcon />
          </IconButton>

          <List disablePadding sx={{ width: "100%" }}>
            {navItems.map((item) => (
              <ListItemButton key={item.label} sx={{ minHeight: 44, px: 1.25, justifyContent: "flex-start" }}>
                <ListItemIcon
                  sx={{
                    minWidth: 28,
                    width: 28,
                    color: "inherit",
                    mr: 1.5,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Stack>
      </Drawer>

      <Box className={styles.content}>{children}</Box>
    </Box>
  );
}
