import { CoreMessage } from "ai";

type FinalSystemMessage = {
  role: "system";
  cost_usd: number;
  duration_ms: number;
  duration_api_ms: number;
};

export type Message =
  | {
      error: false;
      type: "final";
      text: string;
    }
  | {
      error: false;
      type: "assistant";
      text: string;
    }
  | {
      error: true;
      errorMsg: string;
    };

// TODO make sure these can handle also codex outputs

export function parseMessage(json: string): Message {
  try {
    const parsed = JSON.parse(json) as CoreMessage | FinalSystemMessage;

    // Check if it's a final system message with cost info
    if (
      parsed &&
      "role" in parsed &&
      parsed.role === "system" &&
      "cost_usd" in parsed &&
      typeof parsed.cost_usd === "number" &&
      "duration_ms" in parsed &&
      typeof parsed.duration_ms === "number" &&
      "duration_api_ms" in parsed &&
      typeof parsed.duration_api_ms === "number"
    ) {
      return {
        error: false,
        type: "final",
        text: `$${Math.round(parsed.cost_usd * 100) / 100}`,
      };
    }

    // Check if it's an assistant message with text content
    if (
      "role" in parsed &&
      parsed.role === "assistant" &&
      "content" in parsed &&
      Array.isArray(parsed.content) &&
      parsed.content.length > 0 &&
      parsed.content[0]?.type === "text" &&
      "text" in parsed.content[0]
    ) {
      return {
        error: false,
        type: "assistant",
        text: parsed.content[0].text,
      };
    }

    // If we couldn't identify the message type
    return {
      error: true,
      errorMsg: "Unknown message format",
    };
  } catch (e) {
    return {
      error: true,
      errorMsg: e instanceof Error ? e.message : String(e),
    };
  }
}
