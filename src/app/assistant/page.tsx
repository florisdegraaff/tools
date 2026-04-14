"use client";

import { useState } from "react";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./page.module.scss";

const MODEL_OPTIONS = [
  { id: "gemini-3.1-pro-preview", label: "Best Reasoning" },
  { id: "gemini-3-flash-preview", label: "Balanced" },
  { id: "gemini-3.1-flash-lite-preview", label: "Fastest" },
] as const;
type GeminiModel = (typeof MODEL_OPTIONS)[number]["id"];

type ApiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  retryPayload?: {
    message: string;
    history: ApiChatMessage[];
    model: GeminiModel;
  };
};

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(MODEL_OPTIONS[0].id);

  const requestAssistantReply = async (nextMessage: string, history: ApiChatMessage[], model: GeminiModel) => {
    const response = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: nextMessage,
        history,
        model,
      }),
    });

    const body = (await response.json()) as { reply?: string; error?: string };
    if (!response.ok) {
      throw new Error(body.error || "Failed to fetch Gemini reply.");
    }

    if (!body.reply) {
      throw new Error("Gemini reply was empty.");
    }

    return body.reply;
  };

  const getHistoryFromMessages = (sourceMessages: ChatMessage[]): ApiChatMessage[] =>
    sourceMessages
      .filter((entry) => !entry.isError)
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    if (isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };

    const history = getHistoryFromMessages(messages);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage("");
    setIsSending(true);

    try {
      const reply = await requestAssistantReply(trimmedMessage, history, selectedModel);
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong.";
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${errorMessage}`,
          isError: true,
          retryPayload: { message: trimmedMessage, history, model: selectedModel },
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (messageId: string) => {
    const targetMessage = messages.find((entry) => entry.id === messageId);
    if (!targetMessage?.isError || !targetMessage.retryPayload || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const reply = await requestAssistantReply(
        targetMessage.retryPayload.message,
        targetMessage.retryPayload.history,
        targetMessage.retryPayload.model,
      );
      setMessages((previousMessages) =>
        previousMessages.map((entry) =>
          entry.id === messageId
            ? {
                id: crypto.randomUUID(),
                role: "assistant",
                content: reply,
              }
            : entry,
        ),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((previousMessages) =>
        previousMessages.map((entry) =>
          entry.id === messageId
            ? {
                ...entry,
                content: `Error: ${errorMessage}`,
              }
            : entry,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    if (!event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
      return;
    }

    const textarea = event.currentTarget.querySelector("textarea");
    if (!textarea) {
      return;
    }
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const beforeCursor = message.slice(0, selectionStart);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const currentLine = message.slice(lineStart, selectionStart);

    const unorderedMatch = currentLine.match(/^(\s*[-*]\s)(.*)$/);
    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);

    if (!unorderedMatch && !orderedMatch) {
      return;
    }

    event.preventDefault();

    let continuationPrefix = "";
    if (unorderedMatch) {
      const [, bulletPrefix, content] = unorderedMatch;
      continuationPrefix = content.trim().length === 0 ? "" : bulletPrefix;
    } else if (orderedMatch) {
      const [, indent, currentNumber, content] = orderedMatch;
      continuationPrefix =
        content.trim().length === 0 ? "" : `${indent}${Number(currentNumber) + 1}. `;
    }

    const nextValue =
      message.slice(0, selectionStart) + `\n${continuationPrefix}` + message.slice(selectionEnd);
    const nextCursor = selectionStart + 1 + continuationPrefix.length;

    setMessage(nextValue);

    requestAnimationFrame(() => {
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <Stack className={styles.page}>
      <Stack className={styles.messagesArea} spacing={1.5}>
        {messages.map((chatMessage) => (
          <Box
            key={chatMessage.id}
            className={styles.messageRow}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: chatMessage.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <Paper
              className={styles.messageBubble}
              variant="outlined"
              sx={{
                backgroundColor: chatMessage.role === "user" ? "#1f2937" : "transparent",
                color: chatMessage.role === "user" ? "#f9fafb" : "#e5e7eb",
                padding: chatMessage.role === "user" ? "0.75rem 1rem" : 0,
                borderColor: chatMessage.role === "user" ? "#374151" : "transparent",
              }}
            >
              <Box className={styles.markdownContent}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatMessage.content}</ReactMarkdown>
              </Box>
            </Paper>
            {chatMessage.isError && chatMessage.retryPayload ? (
              <Button
                size="small"
                variant="text"
                sx={{ mt: 0.5, alignSelf: "flex-start" }}
                onClick={() => handleRetry(chatMessage.id)}
                disabled={isSending}
              >
                Retry
              </Button>
            ) : null}
          </Box>
        ))}
      </Stack>

      <Paper className={styles.chatBar} sx={{ background: "none" }}>
        <Box className={styles.chatBarInner}>
          <Stack className={styles.composerMain} spacing={1}>
            <TextField
              fullWidth
              placeholder="Ask Gemini"
              variant="standard"
              multiline
              minRows={2}
              maxRows={8}
              aria-label="Chat message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={isSending}
              sx={{
                "& .MuiInputBase-root": {
                  padding: 0,
                  color: "#e5e7eb",
                },
                "& .MuiInputBase-inputMultiline": {
                  padding: 0,
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#9ca3af",
                  opacity: 1,
                },
              }}
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: { borderRadius: 1 },
                },
              }}
            />
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <FormControl variant="standard" size="small" sx={{ width: "fit-content" }}>
                <Select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value as GeminiModel)}
                  disabled={isSending}
                  disableUnderline
                  renderValue={(value) => MODEL_OPTIONS.find((model) => model.id === value)?.label ?? value}
                  sx={{
                    color: "#9ca3af",
                    "& .MuiSelect-select": {
                      width: "auto",
                      pr: 3,
                      py: 0.25,
                    },
                  }}
                >
                  {MODEL_OPTIONS.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Stack>
          <IconButton
            color="primary"
            aria-label="Send message"
            onClick={handleSendMessage}
            disabled={isSending}
            sx={{ alignSelf: "flex-start" }}
          >
            <SendOutlinedIcon />
          </IconButton>
        </Box>
      </Paper>
    </Stack>
  );
}
