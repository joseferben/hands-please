import { consola } from "consola";
import { parse } from "./comment.js";
import { runLoop } from "./loop.js";
import chokidar from "chokidar";
import { readFile } from "fs/promises";
import { createIgnore } from "./ignore.js";
import { spin, spinner } from "./spinner.js";

let lock = false;

// files that could not be processed due to lock
const filesToCheckAndProcess = new Set<string>();

async function checkAndProcessFile({
  filepath,
  agentCommand,
  checkCommand,
  trigger,
  fileCheckCommand,
}: {
  filepath: string;
  agentCommand: string;
  checkCommand: string;
  trigger: string;
  fileCheckCommand?: string | undefined;
}) {
  const content = await readFile(filepath, "utf-8");
  const comments = parse({ filepath, content, trigger });
  if (comments.length === 0) {
    consola.debug(`No comments found in ${filepath}`);
    return;
  }

  spinner.stop();
  consola.debug(`Found ${comments.length} comments`);

  for (const comment of comments) {
    if (lock) {
      consola.debug("Lock is set, adding to queue");
      filesToCheckAndProcess.add(filepath);
      return;
    }
    lock = true;
    await runLoop({
      comment,
      agentCommand,
      checkCommand,
      trigger,
      fileCheckCommand,
    });
    lock = false;
  }
  const nextFilepath = Array.from(filesToCheckAndProcess.values()).shift();
  if (nextFilepath) {
    await checkAndProcessFile({
      filepath: nextFilepath,
      agentCommand,
      checkCommand,
      trigger,
      fileCheckCommand,
    });
  } else {
    spin(`Watching files for "${trigger}"....`);
  }
}

export async function watch({
  agentCommand,
  checkCommand,
  skipWatch,
  trigger,
  fileCheckCommand,
}: {
  agentCommand: string;
  checkCommand: string;
  skipWatch: boolean;
  trigger: string;
  fileCheckCommand?: string;
}) {
  const ignore = await createIgnore();
  spinner.stop();

  consola.debug("Watching for changes");
  const watcher = chokidar.watch(".", {
    ignored: (path) => ignore.shouldIgnore({ path }),
  });

  watcher.on("add", (filepath) => {
    consola.debug(`Watching file: ${filepath}`);
    void checkAndProcessFile({
      filepath,
      agentCommand,
      checkCommand,
      trigger,
      fileCheckCommand,
    }).catch(consola.error);
  });

  if (!skipWatch) {
    watcher.on("change", (filepath) => {
      consola.debug(`Change detected: ${filepath}`);
      void checkAndProcessFile({
        filepath,
        agentCommand,
        checkCommand,
        fileCheckCommand,
        trigger,
      }).catch(consola.error);
    });
    spin(`Watching files for "${trigger}"....`);
  } else {
    consola.info(`No more comments with ${trigger} found, exiting...`);
  }

  process.on("SIGINT", () => {
    consola.info("Received SIGINT signal, shutting down...");
    void watcher.close().then(() => process.exit(0));
  });
}
