import { consola } from "consola";
import { parseComments } from "./comment.js";
import { loop } from "./loop.js";
import chokidar from "chokidar";
import { readFile } from "fs/promises";
import { createIgnore } from "./ignore.js";
import { getConfig } from "./config.js";
import { spin, spinner } from "./spinner.js";

let lock = false;

// files that could not be processed due to lock
const filesToCheckAndProcess = new Set<string>();

async function checkAndProcessFile({ filepath }: { filepath: string }) {
  const content = await readFile(filepath, "utf-8");
  const comments = parseComments({ filepath, content });
  if (comments.length > 0) {
    spinner.stop();
    consola.debug(`Found ${comments.length} comments`);

    for (const comment of comments) {
      if (lock) {
        consola.debug("Lock is set, adding to queue");
        filesToCheckAndProcess.add(filepath);
        return;
      }
      lock = true;
      await loop({ comment });
      lock = false;
    }
    const next = Array.from(filesToCheckAndProcess.values()).shift();
    if (next) {
      await checkAndProcessFile({ filepath: next });
    } else {
      spin(`Watching files for "@${getConfig().COMMENT_TAG}"....`);
    }
  }
}

export async function watch() {
  spin("Loading config...");
  const ignore = await createIgnore();
  spinner.stop();

  consola.debug("Watching for changes");
  const watcher = chokidar.watch(".", {
    ignored: (path) => ignore.shouldIgnore({ path }),
  });

  watcher.on("add", (path) => {
    consola.debug(`Watching file: ${path}`);
    void checkAndProcessFile({ filepath: path }).catch(consola.error);
  });

  if (getConfig().WATCH) {
    watcher.on("change", (path) => {
      consola.debug(`Change detected: ${path}`);
      void checkAndProcessFile({ filepath: path }).catch(consola.error);
    });
    spin(`Watching files for "@${getConfig().COMMENT_TAG}"....`);
  } else {
    consola.info(
      `No more comments with @${getConfig().COMMENT_TAG} found, exiting...`
    );
  }

  process.on("SIGINT", () => {
    consola.info("Received SIGINT signal, shutting down...");
    void watcher.close().then(() => process.exit(0));
  });
}
