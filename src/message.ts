import consola from "consola";
import { z } from "zod";
import { spin, spinner } from "./spinner.js";

export type Message =
  | {
      type: "final";
      costUsd: number;
      durationMs: number;
    }
  | {
      type: "assistant";
      text: string;
    };

function niceDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export function print(message: Message): void {
  spinner.stop();
  if (message.type === "assistant") {
    consola.info(` 🤖 ${message.text}`);
  } else if (message.type === "final") {
    consola.info(
      ` 💸 ${message.costUsd} in ${niceDuration(message.durationMs)}`
    );
  }

  spin(" 🤖 Thinking...");
}

// Schema for Claude Code final message
const FinalMessageSchema = z.object({
  type: z.literal("result"),
  cost_usd: z.number(),
  duration_ms: z.number(),
  result: z.string(),
});

// Schema for brief version of final message
const BriefFinalMessageSchema = z.object({
  role: z.literal("system"),
  cost_usd: z.number(),
  duration_ms: z.number(),
});

// Schema for Claude Code assistant message content item
const ContentItemSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

// Schema for Claude Code assistant message
const AssistantMessageSchema = z.object({
  type: z.literal("assistant"),
  message: z.object({
    role: z.literal("assistant"),
    content: z.array(ContentItemSchema),
  }),
});

// Schema for direct assistant message (used in tool use)
const DirectAssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
    })
  ),
});

/**
 * Try to parse message from json string, return null if it fails
 */
export function parse(json: unknown): Message | null {
  try {
    const parsed = JSON.parse(json as string) as unknown;

    // Try to parse as a final message
    const finalResult = FinalMessageSchema.safeParse(parsed);
    if (finalResult.success) {
      return {
        type: "final",
        costUsd: finalResult.data.cost_usd,
        durationMs: finalResult.data.duration_ms,
      };
    }
    
    // Try to parse as a brief final message
    const briefFinalResult = BriefFinalMessageSchema.safeParse(parsed);
    if (briefFinalResult.success) {
      return {
        type: "final",
        costUsd: briefFinalResult.data.cost_usd,
        durationMs: briefFinalResult.data.duration_ms,
      };
    }

    // Try to parse as an assistant message
    const assistantResult = AssistantMessageSchema.safeParse(parsed);
    if (assistantResult.success) {
      // Get the first text content
      const textContent = assistantResult.data.message.content[0];
      return {
        type: "assistant",
        text: textContent?.text ?? "",
      };
    }

    // Try to parse as a direct assistant message (tool use case)
    const directAssistantResult =
      DirectAssistantMessageSchema.safeParse(parsed);
    if (directAssistantResult.success) {
      // Find the first text content
      const textContent = directAssistantResult.data.content.find(
        (item) => item.type === "text"
      );
      if (textContent && "text" in textContent) {
        return {
          type: "assistant",
          text: textContent.text ?? "",
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
