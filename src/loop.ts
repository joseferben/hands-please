import consola from "consola";
import { type FileComment } from "./comment.js";
import { spin, spinner } from "./spinner.js";
import { parse, print } from "./message.js";
import { exec } from "child_process";

type CheckResult = { ok: true } | { ok: false; error: string };

type Loop = {
  /** The comment to be addressed in this loop. */
  comment: FileComment;
  trigger: string;
  agentStep: (args: { command: string }) => Promise<CheckResult>;
  checkStep: (args: { command: string }) => Promise<CheckResult>;
  shouldRun: () => boolean;
  lintError?: string;
};

/**
 *  Instantiate main loop that can be driven from the outside.
 */
function createLoop({
  comment,
  trigger,
}: {
  comment: FileComment;
  trigger: string;
}): Loop {
  /* Is used next time calling agentStep */
  const prompt = `
Please address comment around "${trigger}" by implementing or fixing the code base.

<important>
- Don't run any builds, checks, lints, tests or typechecks yourself. I will do that once you are done with the change.
- Remove the comment once you are done.
- Summarize in a single sentence what you did.
</important>

<comment>
${comment.filepath}:${comment.line}:
${comment.context}
</comment>
`;

  let checkError: string | undefined;

  let hasRunInitially = false;

  return {
    trigger,
    shouldRun: () => {
      if (!hasRunInitially) return true;
      if (checkError) return true;
      return false;
    },
    comment,
    agentStep: async ({ command }) => {
      consola.debug(`$ ${command}`);
      return new Promise((resolve, reject) => {
        hasRunInitially = true;
        consola.debug(` $ ${command}`);
        if (checkError) spin(" 🤖 Fixing errors...");
        else spin(" 🤖 Thinking...");
        const child = exec(command);
        child.stdin?.write(prompt);
        child.stdin?.end();
        child.stdout?.on("data", (data) => {
          const parsed = parse(data);
          if (parsed) print(parsed);
        });
        child.stderr?.on("data", (data) => {
          const parsed = parse(data);
          if (parsed) print(parsed);
        });
        child.on("close", (code) => {
          if (code === 0) {
            resolve({ ok: true });
          } else {
            reject(new Error(`Child process exited with code ${code}`));
          }
        });
      });
    },
    checkStep: async ({ command }) => {
      return await new Promise((resolve) => {
        let stderr = "";
        let stdout = "";
        const fileCheckProcess = exec(command);
        fileCheckProcess.stdout?.on("data", (data) => {
          stdout += data;
        });
        fileCheckProcess.stderr?.on("data", (data) => {
          spinner.stop();
          consola.info(data);
          stderr += data;
        });
        fileCheckProcess.on("close", (code) => {
          if (code === 0) {
            spinner.stop();
            checkError = undefined;
            resolve({ ok: true });
          } else {
            spinner.stop();
            checkError = `Running "${command}" failed, please fix the following errors: \n\n\n\n${stdout}\n\n\n\n${stderr}`;
            resolve({ ok: false, error: checkError });
          }
        });
      });
    },
  };
}

/**
 * Create and drive the main loop.
 */
export async function runLoop({
  comment,
  agentCommand,
  checkCommand,
  trigger,
  fileCheckCommand,
}: {
  comment: FileComment;
  agentCommand: string;
  checkCommand: string;
  trigger: string;
  fileCheckCommand?: string | undefined;
}) {
  consola.info(`🫱 Processing comment ${comment.filepath}:${comment.line}`);
  const loop = createLoop({ comment, trigger: trigger });
  while (loop.shouldRun()) {
    await loop.agentStep({ command: agentCommand });
    if (fileCheckCommand) {
      spin(` $ ${fileCheckCommand}`);
      const fileCheckResult = await loop.checkStep({
        command: `git ls-files --modified | xargs ${fileCheckCommand}`,
      });
      // if the check failed, we need to run the agent again to fix it
      if (!fileCheckResult.ok) continue;
      consola.info(` $ ${checkCommand}`);
      const checkResult = await loop.checkStep({ command: checkCommand });
      // if the check passed, we need to run the full check
      if (!checkResult.ok) continue;
    } else {
      consola.info(` $ ${checkCommand}`);
      const checkResult = await loop.checkStep({ command: checkCommand });
      // if the check passed, we need to run the full check
      if (!checkResult.ok) continue;
    }
  }
  consola.info(` ✓ Comment ${comment.filepath}:${comment.line} processed`);
}
