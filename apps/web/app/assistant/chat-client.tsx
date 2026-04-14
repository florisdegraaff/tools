"use client";

import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import { Box, IconButton, InputBase, MenuItem, Select, type SelectChangeEvent, Typography } from "@mui/material";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, type GeminiModel } from "../../lib/gemini-models";
import styles from "./page.module.scss";

type ChatSender = "system" | "user" | "bot";

type ChatMessage = {
  sender: ChatSender;
  content: string;
};

type AssistantChatClientProps = {
  initialChatId?: string;
};

function emitChatTitleUpdated(chatId: string, title: string) {
  window.dispatchEvent(
    new CustomEvent("assistant-chat-title-updated", {
      detail: { chatId, title },
    }),
  );
}

export default function AssistantChatClient({ initialChatId }: AssistantChatClientProps) {
  const [chatTitle, setChatTitle] = useState("Temporary chat");
  const [draftChatTitle, setDraftChatTitle] = useState("Temporary chat");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(DEFAULT_GEMINI_MODEL);
  const [isSending, setIsSending] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!initialChatId) {
      return;
    }

    let isMounted = true;
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/assistant/chats/${initialChatId}`, {
          method: "GET",
        });
        const data = (await response.json()) as {
          chat?: {
            id: string;
            title: string;
            messages: ChatMessage[];
          };
          error?: string;
        };

        if (!response.ok || !data.chat) {
          if (isMounted) {
            setMessages([
              { sender: "system", content: data.error ?? "Failed to load chat history." },
            ]);
          }
          return;
        }

        if (isMounted) {
          setChatId(data.chat.id);
          setChatTitle(data.chat.title);
          setDraftChatTitle(data.chat.title);
          setMessages(data.chat.messages);
        }
      } catch {
        if (isMounted) {
          setMessages([{ sender: "system", content: "Network error while loading chat history." }]);
        }
      }
    };

    void loadChatHistory();

    return () => {
      isMounted = false;
    };
  }, [initialChatId]);

  useEffect(() => {
    if (!isEditingTitle) {
      return;
    }

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  const saveTitle = async () => {
    const nextTitle = draftChatTitle.trim();
    if (!nextTitle) {
      setDraftChatTitle(chatTitle);
      setIsEditingTitle(false);
      return;
    }

    setChatTitle(nextTitle);
    setDraftChatTitle(nextTitle);
    setIsEditingTitle(false);

    if (!chatId) {
      return;
    }

    emitChatTitleUpdated(chatId, nextTitle);

    try {
      await fetch(`/api/assistant/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: nextTitle }),
      });
    } catch {
      // Keep optimistic title locally; persistence can be retried later.
    }
  };

  const submitMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { sender: "user", content: trimmedMessage }];
    setMessages(nextMessages);
    setMessage("");
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          model: selectedModel,
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as {
        chatId?: string;
        responseText?: string;
        chatTitle?: string;
        error?: string;
      };
      if (!response.ok || !data.responseText || !data.chatId) {
        const errorMessage = data.error ?? "Failed to get response from assistant.";
        setMessages((prev) => [...prev, { sender: "system", content: errorMessage }]);
        return;
      }

      setChatId(data.chatId);
      if (data.chatTitle?.trim()) {
        const nextTitle = data.chatTitle.trim();
        setChatTitle(nextTitle);
        setDraftChatTitle(nextTitle);
        emitChatTitleUpdated(data.chatId, nextTitle);
      }

      setMessages((prev) => [...prev, { sender: "bot", content: data.responseText ?? "" }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "system", content: "Network error while reaching the assistant endpoint." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      // In list context, continue the list item. Otherwise create a paragraph break.
      event.preventDefault();
      const target = event.currentTarget;
      const cursorStart = event.currentTarget.selectionStart ?? message.length;
      const cursorEnd = event.currentTarget.selectionEnd ?? message.length;
      const lineStart = message.lastIndexOf("\n", cursorStart - 1) + 1;
      const currentLinePrefix = message.slice(lineStart, cursorStart);

      const bulletMatch = currentLinePrefix.match(/^(\s*)([-*])\s+/);
      const numberedMatch = currentLinePrefix.match(/^(\s*)(\d+)\.\s+/);

      let insertion = "\n\n";
      if (bulletMatch) {
        insertion = `\n${bulletMatch[1]}${bulletMatch[2]} `;
      } else if (numberedMatch) {
        const nextNumber = Number(numberedMatch[2]) + 1;
        insertion = `\n${numberedMatch[1]}${nextNumber}. `;
      }

      const nextValue = `${message.slice(0, cursorStart)}${insertion}${message.slice(cursorEnd)}`;
      setMessage(nextValue);

      requestAnimationFrame(() => {
        if (target && typeof target.setSelectionRange === "function") {
          const nextCursorPosition = cursorStart + insertion.length;
          target.setSelectionRange(nextCursorPosition, nextCursorPosition);
        }
      });
      return;
    }

    event.preventDefault();
    void submitMessage();
  };

  const handleModelChange = (event: SelectChangeEvent<GeminiModel>) => {
    setSelectedModel(event.target.value as GeminiModel);
  };

  return (
    <Box className={styles.page}>
      <Box className={styles.topMenu}>
        {isEditingTitle ? (
          <InputBase
            inputRef={titleInputRef}
            value={draftChatTitle}
            onChange={(event) => setDraftChatTitle(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveTitle();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftChatTitle(chatTitle);
                setIsEditingTitle(false);
              }
            }}
            className={styles.chatTitleInput}
            inputProps={{ "aria-label": "Edit chat title" }}
          />
        ) : (
          <Typography variant="subtitle1" className={styles.chatTitle}>
            {chatTitle}
          </Typography>
        )}
        <IconButton
          aria-label="Rename chat"
          className={styles.renameButton}
          onClick={() => {
            setDraftChatTitle(chatTitle);
            setIsEditingTitle(true);
          }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box className={styles.messagesArea}>
        {messages.map((chatMessage, index) => (
          <Box
            key={`${chatMessage.sender}-${index}-${chatMessage.content}`}
            className={
              chatMessage.sender === "user"
                ? styles.userMessageBubble
                : chatMessage.sender === "bot"
                  ? styles.botMessageBubble
                  : styles.systemMessageBubble
            }
          >
            <Box className={styles.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatMessage.content}</ReactMarkdown>
            </Box>
          </Box>
        ))}
        {isSending ? (
          <Box className={styles.botMessageBubble}>
            <Typography variant="body1" className={styles.typingIndicator}>
              Thinking...
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Box className={styles.composerArea}>
        <Box className={styles.composer}>
          <IconButton aria-label="Add content" className={styles.leadingButton}>
            <AddIcon />
          </IconButton>

          <InputBase
            multiline
            minRows={1}
            maxRows={8}
            placeholder="Ask anything"
            inputProps={{ "aria-label": "Ask anything" }}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className={styles.inputField}
          />

          <Box className={styles.trailingActions}>
            <IconButton aria-label="Start voice input" className={styles.trailingButton}>
              <MicNoneOutlinedIcon />
            </IconButton>
            <IconButton aria-label="Open advanced voice mode" className={styles.trailingPrimary}>
              <GraphicEqIcon />
            </IconButton>
          </Box>
        </Box>

        <Box className={styles.metaRow}>
          <Select
            size="small"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={isSending}
            aria-label="Select Gemini model"
            className={styles.modelSelect}
          >
            {GEMINI_MODELS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>
    </Box>
  );
}
