import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getAuthEmailFromRequest } from "@/lib/auth";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatRequestBody = {
  message?: string;
  history?: ChatMessage[];
  model?: string;
};

const SUPPORTED_MODELS = new Set([
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
]);
const DEFAULT_MODEL = "gemini-3-flash-preview";

function extractGeminiErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown Gemini error.";
  }

  const rawMessage = error.message?.trim();
  if (!rawMessage) {
    return "Unknown Gemini error.";
  }

  try {
    const parsed = JSON.parse(rawMessage) as { error?: { message?: string } };
    const parsedMessage = parsed.error?.message?.trim();
    if (parsedMessage) {
      return parsedMessage;
    }
  } catch {
    // Non-JSON messages should fall through to the original error text.
  }

  return rawMessage;
}

export async function POST(request: Request) {
  const authenticatedEmail = getAuthEmailFromRequest(request);
  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const requestedModel = body.model?.trim() || DEFAULT_MODEL;
  if (!SUPPORTED_MODELS.has(requestedModel)) {
    return NextResponse.json({ error: "Unsupported model." }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const sanitizedHistory = history
    .filter((entry) => (entry.role === "user" || entry.role === "assistant") && Boolean(entry.content?.trim()))
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }));

  const ai = new GoogleGenAI({ apiKey });
  const contents = [...sanitizedHistory, { role: "user" as const, content: message }].map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: requestedModel,
      contents,
    });

    const text = response.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ reply: text }, { status: 200 });
  } catch (error) {
    const messageFromError = extractGeminiErrorMessage(error);
    return NextResponse.json({ error: messageFromError }, { status: 502 });
  }
}
