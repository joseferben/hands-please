import { consola } from "consola";
import dotenv from "dotenv";
import { quote } from "shell-quote";
import { z } from "zod";

dotenv.config();

// TODO expose DEBUG=true
consola.level = 3;
consola.options.formatOptions = {
  compact: true,
};

// Hack to suppress deprecation warnings (punycode)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(process as any).noDeprecation = true;

const ConfigSchema = z.object({
  CHECK: z.string(),
  AGENT: z.enum(["claude-code", "codex"]).default("claude-code"),
  FILE_CHECK: z.string().optional(),
  COMMENT_TAG: z.string().optional().default("ai"),
  WATCH: z.coerce.boolean().optional().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

let config: Config | null = null;

function printConfig(config: Config) {
  for (const key in config) {
    consola.info(` ${key}: ${config[key as keyof Config]}`);
  }
}

export function getConfig() {
  if (!config) {
    // TODO use zod 4 pretty print
    config = ConfigSchema.parse(process.env);
    consola.info("Config loaded:");
    printConfig(config);
  }
  return config;
}

//const defaultAppendSystemPrompt = `Dont run any build commands yourself, no tests, no lint, no checks. I will do that once you are done, just focus on adressing the comments.`;

export function getCodeAgentCLICommand({
  prompt,
}: {
  prompt: string;
}): string[] {
  const config = getConfig();
  if (config.AGENT === "claude-code") {
    return [
      "claude",
      "--output-format",
      "stream-json",
      "--verbose",
      "--max-turns",
      "100",
      "--allowedTools",
      "Edit,Write,WebFetch",
      "--print",
      quote([prompt]),
    ];
  } else {
    // TODO test this
    return [
      "codex",
      "-q",
      "--json",
      "--approval-mode",
      "auto-edit",
      quote([prompt]),
    ];
  }
}
