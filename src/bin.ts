#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { watch } from "./watch.js";

if (
  process.env["DEBUG"] === "true" ||
  process.env["DEBUG"] === "1" ||
  process.env["DEBUG"] === "yes"
)
  consola.level = 5;
else consola.level = 3;
consola.options.formatOptions = {
  compact: true,
};
const main = defineCommand({
  meta: {
    name: "hands-please",
    version: "0.0.5",
    description: "Run CLI code agents based on comments in your codebase.",
  },
  args: {
    agent: {
      type: "string",
      required: true,
      description:
        "The CLI code agent command, needs to accept prompt from stdin",
    },
    check: {
      type: "string",
      required: true,
      description: "The command to check the full codebase",
    },
    trigger: {
      type: "string",
      description: "The tag that hands-please looks for to trigger the agent",
      default: "@ai",
    },
    fileCheck: {
      type: "string",
      description:
        "The command to check specific files, must accept a list of files as arguments",
    },
    skipWatch: {
      type: "boolean",
      description:
        "Whether to skip watching for changes (exit process after all comments are processed)",
      default: false,
    },
  },
  run({ args }) {
    return watch({
      agentCommand: args.agent,
      checkCommand: args.check,
      skipWatch: args.skipWatch,
      trigger: args.trigger,
      fileCheckCommand: args.fileCheck,
    });
  },
});

void runMain(main).catch(consola.error);
