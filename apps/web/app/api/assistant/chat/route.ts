import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@repo/database";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, type GeminiModel } from "../../../../lib/gemini-models";

type ChatSender = "system" | "user" | "bot";

type ChatMessage = {
  sender: ChatSender;
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  model?: string;
  chatId?: string;
};

type AssistantModelPayload = {
  responseText: string;
  chatTitle?: string;
};

const ALLOWED_GEMINI_MODELS = new Set(GEMINI_MODELS.map((model) => model.value));

function isGeminiModel(value: string): value is GeminiModel {
  return ALLOWED_GEMINI_MODELS.has(value as GeminiModel);
}

function toGeminiRole(sender: ChatSender): "user" | "model" {
  return sender === "user" ? "user" : "model";
}

function getResponseFormatInstruction(includeChatTitle: boolean): string {
  const titleRule = includeChatTitle
    ? '"chatTitle": "A concise chat title (max 6 words)"'
    : '"chatTitle": optional and usually omitted';

  return [
    "Respond with valid JSON only.",
    "Do not wrap JSON in markdown or code fences.",
    "Return this exact shape:",
    "{",
    '  "responseText": "assistant response in markdown-friendly text",',
    `  ${titleRule}`,
    "}",
    "Never include any keys other than responseText and chatTitle.",
  ].join("\n");
}

function extractJsonObject(rawText: string): string | null {
  const fenced = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1];
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return rawText.slice(firstBrace, lastBrace + 1);
}

function parseAssistantPayload(rawText: string): AssistantModelPayload | null {
  const candidate = extractJsonObject(rawText) ?? rawText;

  try {
    const parsed = JSON.parse(candidate) as Partial<AssistantModelPayload>;
    if (!parsed.responseText || typeof parsed.responseText !== "string") {
      return null;
    }

    const payload: AssistantModelPayload = {
      responseText: parsed.responseText.trim(),
    };

    if (typeof parsed.chatTitle === "string" && parsed.chatTitle.trim()) {
      payload.chatTitle = parsed.chatTitle.trim();
    }

    if (!payload.responseText) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const messages = body.messages?.filter((message) => message.content.trim().length > 0) ?? [];
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "At least one non-empty message is required." },
      { status: 400 },
    );
  }

  const requestedModel = body.model?.trim();
  const requestedChatId = body.chatId?.trim();
  const model =
    requestedModel && isGeminiModel(requestedModel)
      ? requestedModel
      : DEFAULT_GEMINI_MODEL;

  const userMessagesCount = messages.filter((message) => message.sender === "user").length;
  const includeChatTitle = userMessagesCount <= 1;

  const ai = new GoogleGenAI({ apiKey });

  let payload: AssistantModelPayload | null = null;
  try {
    const geminiResponse = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: getResponseFormatInstruction(includeChatTitle) }],
        },
        ...messages.map((message) => ({
          role: toGeminiRole(message.sender),
          parts: [{ text: message.content }],
        })),
      ],
    });

    payload = parseAssistantPayload(geminiResponse.text?.trim() ?? "");
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown Gemini SDK error";
    return NextResponse.json(
      { error: "Gemini API request failed.", details },
      { status: 502 },
    );
  }

  if (!payload) {
    return NextResponse.json(
      { error: "Gemini returned invalid JSON response format." },
      { status: 502 },
    );
  }

  let chatId = requestedChatId;
  if (chatId) {
    const existingChat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });

    if (!existingChat) {
      chatId = undefined;
    }
  }

  if (!chatId) {
    const createdChat = await prisma.chat.create({
      data: {
        title: payload.chatTitle?.trim() || "Untitled chat",
      },
      select: { id: true },
    });
    chatId = createdChat.id;
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.sender === "user");

  await prisma.$transaction([
    ...(latestUserMessage
      ? [
          prisma.message.create({
            data: {
              chatId,
              sender: "user",
              content: latestUserMessage.content,
            },
          }),
        ]
      : []),
    prisma.message.create({
      data: {
        chatId,
        sender: "bot",
        content: payload.responseText,
      },
    }),
  ]);

  if (!includeChatTitle) {
    return NextResponse.json({ chatId, responseText: payload.responseText });
  }

  return NextResponse.json({
    chatId,
    responseText: payload.responseText,
    chatTitle: payload.chatTitle,
  });
}
