import { describe, it, expect } from "vitest";
import { Message, parse } from "./message.js";

describe("parse()", () => {
  it("should parse a claude code final system message correctly", () => {
    const json = `{"type":"result","subtype":"success","cost_usd":0.05136085,"is_error":false,"duration_ms":1746,"duration_api_ms":3265,"num_turns":1,"result":"Hi! How can I help you with your code today?","total_cost":0.05136085,"session_id":"1c7d5d12-a7e2-4b5f-9bfe-33b920c888b9"}`;

    const result = parse(json);

    expect(result).toEqual({
      type: "final",
      costUsd: 0.05136085,
      durationMs: 1746,
    } satisfies Message);
  });

  it("should parse a claude code brief final system message correctly", () => {
    const json = `{
  "role": "system",
  "cost_usd": 0.07173765,
  "duration_ms": 24760,
  "duration_api_ms": 24761
}`;

    const result = parse(json);

    expect(result).toEqual({
      type: "final",
      costUsd: 0.07173765,
      durationMs: 24760,
    } satisfies Message);
  });

  it("should parse claude code assistant message correctly", () => {
    const json = `{"type":"assistant","message":{"id":"msg_01MeTKFfsqBV1aHUFjJd1b75","type":"message","role":"assistant","model":"claude-3-5-sonnet-20241022","content":[{"type":"text","text":"Hi! How can I help you with your code today?"}],"stop_reason":"end_turn","stop_sequence":null,"usage":{"input_tokens":4,"cache_creation_input_tokens":13543,"cache_read_input_tokens":0,"output_tokens":15,"service_tier":"standard"}},"session_id":"1c7d5d12-a7e2-4b5f-9bfe-33b920c888b9"}`;

    const result = parse(json);

    expect(result).toEqual({
      type: "assistant",
      text: "Hi! How can I help you with your code today?",
    } satisfies Message);
  });

  it("should parse claude code assistant message with tool use correctly", () => {
    const json = `{
  "id": "msg_01RLococpHbVS5DNRHCV1jUK",
  "type": "message",
  "role": "assistant",
  "model": "claude-3-7-sonnet-20250219",
  "content": [
    {
      "type": "text",
      "text": "I'll implement the requested change by updating the README.md to reflect the new CLI approach instead of using .env files."
    },
    {
      "type": "tool_use",
      "id": "toolu_01GoYCprDK3iJEvvYTxxpQv4",
      "name": "Read",
      "input": {
        "file_path": "/Users/josef/code/joseferben/hands-please/README.md"
      }
    }
  ],
  "stop_reason": "tool_use",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 3,
    "cache_creation_input_tokens": 3011,
    "cache_read_input_tokens": 12013,
    "output_tokens": 96,
    "service_tier": "standard"
  }
}`;

    const result = parse(json);

    expect(result).toEqual({
      type: "assistant",
      text: "I'll implement the requested change by updating the README.md to reflect the new CLI approach instead of using .env files.",
    } satisfies Message);
  });

  it("should handle unknown message formats", () => {
    const json = JSON.stringify({
      role: "user",
      content: "Some content",
    });

    const result = parse(json);

    expect(result).toBeNull();
  });

  it("should handle invalid JSON", () => {
    const json = "invalid json";

    const result = parse(json);

    expect(result).toBeNull();
  });
});
