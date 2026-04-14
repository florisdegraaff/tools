"use client";

import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import styles from "./assistant-layout.module.scss";

type AssistantLayoutProps = Readonly<{
  children: ReactNode;
}>;

type SidebarChat = {
  id: string;
  title: string;
};

export default function AssistantLayout({ children }: AssistantLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<SidebarChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadChats = async () => {
      try {
        const response = await fetch("/api/assistant/chats", {
          method: "GET",
        });
        const data = (await response.json()) as {
          chats?: SidebarChat[];
        };

        if (!response.ok || !data.chats) {
          if (isMounted) {
            setChats([]);
          }
          return;
        }

        if (isMounted) {
          setChats(data.chats);
        }
      } catch {
        if (isMounted) {
          setChats([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingChats(false);
        }
      }
    };

    void loadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleTitleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ chatId: string; title: string }>;
      const updatedChatId = customEvent.detail?.chatId;
      const updatedTitle = customEvent.detail?.title;

      if (!updatedChatId || !updatedTitle) {
        return;
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === updatedChatId
            ? {
                ...chat,
                title: updatedTitle,
              }
            : chat,
        ),
      );
    };

    window.addEventListener("assistant-chat-title-updated", handleTitleUpdated as EventListener);
    return () => {
      window.removeEventListener("assistant-chat-title-updated", handleTitleUpdated as EventListener);
    };
  }, []);

  return (
    <Box className={styles.shell}>
      <Box component="aside" className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`}>
        <Box className={styles.sidebarTopRow}>
          <Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton
              size="small"
              className={styles.foldButton}
              aria-label={isCollapsed ? "Expand assistant sidebar" : "Collapse assistant sidebar"}
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              {isCollapsed ? (
                <KeyboardDoubleArrowRightIcon fontSize="small" />
              ) : (
                <KeyboardDoubleArrowLeftIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Box className={styles.sidebarHeader}>
          <Typography variant="body2" className={styles.sidebarAction}>
            <ChatBubbleOutlineOutlinedIcon fontSize="small" className={styles.actionIcon} />
            {!isCollapsed ? <span className={styles.actionLabel}>New chat</span> : null}
          </Typography>
          <Typography variant="body2" className={styles.sidebarAction}>
            <AccessTimeOutlinedIcon fontSize="small" className={styles.actionIcon} />
            {!isCollapsed ? <span className={styles.actionLabel}>New temporary chat</span> : null}
          </Typography>
        </Box>

        {!isCollapsed ? (
          <>
            <Divider className={styles.divider} />

            <Box className={styles.section}>
              <Typography variant="overline" className={styles.sectionLabel}>
                Projects
              </Typography>
              <Typography variant="body2" className={styles.item}>
                Coding partner
              </Typography>
            </Box>

            <Box className={styles.section}>
              <Typography variant="overline" className={styles.sectionLabel}>
                Chats
              </Typography>
              <Box className={styles.chatList}>
                {isLoadingChats ? (
                  <Typography variant="body2" className={styles.chatStatus}>
                    Loading chats...
                  </Typography>
                ) : null}
                {!isLoadingChats && chats.length === 0 ? (
                  <Typography variant="body2" className={styles.chatStatus}>
                    No chats yet
                  </Typography>
                ) : null}
                {!isLoadingChats
                  ? chats.map((chat) => (
                      <Typography
                        key={chat.id}
                        component={NextLink}
                        href={`/assistant/${chat.id}`}
                        variant="body2"
                        className={styles.chatItem}
                      >
                        {chat.title}
                      </Typography>
                    ))
                  : null}
              </Box>
            </Box>
          </>
        ) : null}
      </Box>

      <Box component="section" className={styles.content}>
        {children}
      </Box>
    </Box>
  );
}
