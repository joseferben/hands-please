import { getConfig } from "./config.js";

export type FileComment = {
  filepath: string;
  line: number;
  /** The actual comment line (does not capture multiple lines) */
  comment: string;
  /** File content around the comment */
  context: string;
};

/**
 * Parse comments from comments in a file.
 */
export function parseComments({
  filepath,
  content,
}: {
  filepath: string;
  content: string;
}): FileComment[] {
  // Check if the file should be ignored based on first line
  if (content.startsWith(`// @${getConfig().COMMENT_TAG} ignore`)) return [];
  
  // Check for "hands-please-ignore" in various comment formats in the first line
  const firstLine = content.split('\n')[0]?.trim() || "";
  const ignorePatterns = [
    /\/\/\s*hands-please-ignore/,            // JavaScript/TypeScript single-line: // hands-please-ignore
    /\/\*\s*hands-please-ignore\s*\*\//,     // JavaScript/TypeScript multi-line: /* hands-please-ignore */
    /<!--\s*hands-please-ignore\s*-->/,      // HTML/XML: <!-- hands-please-ignore -->
    /#\s*hands-please-ignore/,               // Python/Ruby/Shell: # hands-please-ignore
    /'''\s*hands-please-ignore/,             // Python multi-line start: ''' hands-please-ignore
    /"""\s*hands-please-ignore/,             // Python multi-line start: """ hands-please-ignore
    /--\s*hands-please-ignore/,              // SQL/Lua: -- hands-please-ignore
    /\*\s*hands-please-ignore/,              // CSS within block: * hands-please-ignore
    /<%--\s*hands-please-ignore\s*--%>/,     // JSP: <%-- hands-please-ignore --%>
    /\(\*\s*hands-please-ignore\s*\*\)/,     // OCaml/Pascal: (* hands-please-ignore *)
  ];
  
  if (ignorePatterns.some(pattern => pattern.test(firstLine))) {
    return [];
  }
  
  const comments: FileComment[] = [];
  const lines = content.split("\n");

  for (const [index, line] of lines.entries()) {
    // Look for '//' followed by optional whitespace, then '@' + the comment prefix + whitespace + content
    // Match comments with content after the tag
    const commentPattern = new RegExp(
      `//\\s*@${getConfig().COMMENT_TAG}(?:\\s+(.+)|$)`
    );
    const match = line.match(commentPattern);

    if (match) {
      let comment = match[1] ? match[1].trim() : "";
      let nextLine = index + 1;
      
      // Check for continuation lines (lines that start with // but don't have the tag)
      while (
        nextLine < lines.length &&
        lines[nextLine]?.trim().startsWith("//") &&
        !lines[nextLine]?.includes(`@${getConfig().COMMENT_TAG}`)
      ) {
        // Extract the comment part after //
        const continuationMatch = lines[nextLine]?.trim().match(/\/\/\s*(.*)/);
        if (continuationMatch?.[1]) {
          comment += "\n" + continuationMatch[1].trim();
        }
        nextLine++;
      }
      
      // If there's a match, add the captured group (the comment content) to our array
      comments.push({
        filepath,
        line: index, 
        comment,
        context: lines
          .slice(Math.max(0, index - 5), Math.min(lines.length, index + 5))
          .join("\n"),
      });
    }
  }

  return comments;
}
