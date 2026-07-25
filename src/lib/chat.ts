import { env, identifyEndpoint } from "@/config/env";
import { supabase } from "@/lib/supabase";

export const CREDITS_PER_QUESTION = 5;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Set on assistant replies that declined an off-topic question. */
  offTopic?: boolean;
}

export interface ChatResponse {
  reply: string;
  onTopic: boolean;
  creditsLeft: number | null;
}

export class ChatError extends Error {
  constructor(
    message: string,
    readonly code: "no_credits" | "not_configured" | "unauthorized" | "failed",
    readonly creditsLeft?: number | null,
  ) {
    super(message);
    this.name = "ChatError";
  }
}

/** URL of the chat Edge Function (mirrors identifyEndpoint's derivation). */
function chatEndpoint(): string {
  if (!env.supabase.configured) return "";
  // Reuse the same functions host as identify; swap the function name.
  return identifyEndpoint().replace(/\/[^/]+$/, "/chat");
}

/**
 * Ask the gemologist. Sends recent history for context; the server enforces
 * the 5-credit cost (and charges nothing for off-topic questions).
 */
export async function askGemologist(history: ChatMessage[]): Promise<ChatResponse> {
  const endpoint = chatEndpoint();
  if (!endpoint) throw new ChatError("Chat is not configured.", "not_configured");

  const accessToken = (await supabase?.auth.getSession())?.data.session?.access_token;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabase.anonKey,
      Authorization: `Bearer ${accessToken ?? env.supabase.anonKey}`,
    },
    body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    reply?: string;
    onTopic?: boolean;
    creditsLeft?: number | null;
    error?: string;
    message?: string;
  };

  if (response.status === 402) {
    throw new ChatError("You are out of credits.", "no_credits", body.creditsLeft ?? 0);
  }
  if (response.status === 401) {
    throw new ChatError("Please sign in to use the chat.", "unauthorized");
  }
  if (response.status === 503 || body.error === "not_configured") {
    throw new ChatError(
      "The AI assistant is not switched on yet. Deploy the `chat` Edge Function and set the Anthropic key.",
      "not_configured",
    );
  }
  if (!response.ok || !body.reply) {
    throw new ChatError(body.message || "The assistant could not reply. Please try again.", "failed");
  }

  return { reply: body.reply, onTopic: Boolean(body.onTopic), creditsLeft: body.creditsLeft ?? null };
}

/** Adds credits after a (currently simulated) rewarded ad. Returns new balance. */
export async function grantAdCredits(): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("grant_ad_credits", { amount: CREDITS_PER_QUESTION });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? null;
}
