import consola from "consola";
import { readFile } from "fs/promises";
import ignore from "ignore";
import { minimatch } from "minimatch";
import { existsSync } from "fs";
import { join, dirname, resolve } from "path";

const builtInIgnores = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".env",
];

let ig: ignore.Ignore;

export function shouldIgnore({ path }: { path: string }) {
  try {
    if (path === ".") return false;
    const shouldIgnore =
      ig?.ignores(path) ||
      builtInIgnores.some((pattern) => minimatch(path, pattern));
    return shouldIgnore;
  } catch {
    return false;
  }
}

function findGitignore(startDir: string): string | null {
  let currentDir = resolve(startDir);

  while (true) {
    const gitignorePath = join(currentDir, ".gitignore");

    if (existsSync(gitignorePath)) {
      return gitignorePath;
    }

    const parentDir = dirname(currentDir);

    // If we've reached the root directory
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export async function createIgnore() {
  if (!ig) {
    const gitignorePath = findGitignore(process.cwd());

    if (gitignorePath) {
      consola.debug(`Reading ${gitignorePath}`);
      const gitignore = await readFile(gitignorePath, "utf-8");
      ig = ignore().add(gitignore);
    } else {
      consola.debug("No .gitignore file found, using built-in ignores only");
      ig = ignore();
    }
  }

  return {
    shouldIgnore: ({ path }: { path: string }) => shouldIgnore({ path }),
  };
}
