import { $, execa, ExecaError, parseCommandString } from "execa";
import consola from "consola";
import { FileComment } from "./comment.js";
import { getCodeAgentCLICommand, getConfig } from "./config.js";
import { spin, spinner } from "./spinner.js";
import { parseMessage } from "./parse-message.js";

function niceDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function printMessage(json: string): boolean {
  try {
    const result = parseMessage(json);

    if (result.error) {
      consola.debug(json);
      consola.debug(result.errorMsg);
      return false;
    }

    if (result.type === "assistant") {
      consola.info(` 🤖 ${result.text}`);
      return false;
    }

    if (result.type === "final") {
      const parsedJson = JSON.parse(json) as { duration_ms: number };

      consola.info(
        ` 💸 ${result.text} in ${niceDuration(parsedJson.duration_ms)}`
      );
      return true;
    }

    return false;
  } catch (e) {
    consola.debug(json);
    consola.debug(e);
    return false;
  }
}

export async function loop({ comment }: { comment: FileComment }) {
  let shouldRun = true;
  let prompt = `
Please address comment around "@${
    getConfig().COMMENT_TAG
  }" by implementing or fixing the code base.

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
  consola.info(` 🫱 Processing comment ${comment.filepath}:${comment.line}`);
  while (shouldRun) {
    shouldRun = false;
    // 1. run agent
    const commandArrayAgent = getCodeAgentCLICommand({ prompt });
    consola.debug(commandArrayAgent);
    consola.debug(`$ ${commandArrayAgent.join(" ")}`);
    spin(" 🤖 Thinking...");
    const { stdout, stderr } = $({
      all: true,
      stdout: "pipe",
      stderr: "pipe",
    })`${commandArrayAgent}`;
    for await (const chunk of stdout) {
      spinner.stop();
      const chunkStr = Buffer.from(chunk).toString();
      const final = printMessage(chunkStr);
      if (!final) spin(" 🤖 Thinking...");
    }
    for await (const chunk of stderr) {
      spinner.stop();
      const chunkStr = Buffer.from(chunk).toString();
      printMessage(chunkStr);
      spin(" 🤖 Thinking...");
    }
    // 2. run lint on edited files
    const fileCheck = getConfig().FILE_CHECK;
    if (fileCheck) {
      const commandArrayLint = parseCommandString(`xargs ${fileCheck}`);
      try {
        spin(` $ ${fileCheck}`);
        await execa`git ls-files --modified`.pipe`${commandArrayLint}`;
        spinner.stop();
      } catch (e) {
        spinner.stop();
        if (e instanceof ExecaError) {
          consola.info(` ✗ $ ${fileCheck}`);
          if (e.stdout) consola.info(e.stdout);
          if (e.stderr) consola.info(e.stderr);
          const commentToAddress = `Running ${fileCheck} failed, please fix the following errors: \n\n${e.stdout} ${e.stderr}`;
          prompt = commentToAddress;
          shouldRun = true;
        } else {
          // this is a bug
          throw e;
        }
      } finally {
        spinner.stop();
      }
      consola.info(` ✓ $ ${fileCheck}`);
    }
    // 3. run full check
    const check = getConfig().CHECK;
    if (check) {
      consola.debug("Running full check");
      try {
        const commandArray = parseCommandString(check);
        spin(` $ ${check}`);
        await execa`${commandArray}`;
        spinner.stop();
        consola.info(` ✓ $ ${getConfig().CHECK}`);
      } catch (e) {
        spinner.stop();
        if (e instanceof ExecaError) {
          consola.info(` ✗ $ ${check}`);
          if (e.stdout) consola.info(e.stdout);
          if (e.stderr) consola.info(e.stderr);
          const commentToAddress = `Running ${check} failed, please fix the following errors: \n\n${e.stdout} ${e.stderr}`;
          prompt = commentToAddress;
          shouldRun = true;
          continue;
        } else {
          // this is a bug
          throw e;
        }
      } finally {
        spinner.stop();
      }
    }
  }
  consola.info(" ✓ All checks passed");
}
