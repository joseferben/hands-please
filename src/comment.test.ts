import { parseComments } from "./comment.js";
import { it, expect, describe } from "vitest";
import { getConfig } from "./config.js";

getConfig().COMMENT_TAG = "lug";

describe("parseComments()", () => {
  it("should handle import statements and track line numbers correctly", () => {
    const comments = parseComments({
      filepath: "imports.js",
      content: `import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

// @${getConfig().COMMENT_TAG} implement API fetching logic
function DataFetcher() {
  return null;
}
`,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toEqual("implement API fetching logic");
    expect(comments[0]?.filepath).toEqual("imports.js");
    expect(comments[0]?.line).toEqual(4); // Line number should count from the start, including imports
  });
});

describe("parseComments() additional cases", () => {
  it("should handle when first line is @ai and the next line is a comment", () => {
    const comments = parseComments({
      filepath: "firstline.js",
      content: `// @${getConfig().COMMENT_TAG}
// This is a regular comment
function example() {
  return true;
}`,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toEqual("\nThis is a regular comment");
    expect(comments[0]?.filepath).toEqual("firstline.js");
    expect(comments[0]?.line).toEqual(0);
  });

  it("should parse comments with emojis", () => {
    const comments = parseComments({
      filepath: "test.js",
      content: `
    function emojis() {
      // @${getConfig().COMMENT_TAG} emojis: 😀, 🚀, 👍
    }
  `,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toEqual("emojis: 😀, 🚀, 👍");
    expect(comments[0]?.filepath).toEqual("test.js");
    expect(comments[0]?.line).toEqual(2);
  });

  it("should parse comments with code snippets", () => {
    const comments = parseComments({
      filepath: "code.js",
      content: `
    function example() {
      // @${getConfig().COMMENT_TAG} code: console.log('Hello world')
      return true;
    }
  `,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toEqual("code: console.log('Hello world')");
    expect(comments[0]?.filepath).toEqual("code.js");
    expect(comments[0]?.line).toEqual(2);
  });

  it("should parse multi-line comments", () => {
    const comments = parseComments({
      filepath: "multiline.js",
      content: `
    function multiLineExample() {
      // @${getConfig().COMMENT_TAG} first line of a multi-line comment
      // second line that should be captured
      // @${getConfig().COMMENT_TAG} another tagged comment line
      return true;
    }
  `,
    });
    expect(comments).toHaveLength(2);
    expect(comments[0]?.comment).toEqual(
      "first line of a multi-line comment\nsecond line that should be captured"
    );
    expect(comments[0]?.filepath).toEqual("multiline.js");
    expect(comments[0]?.line).toEqual(2);
    expect(comments[1]?.comment).toEqual("another tagged comment line");
    expect(comments[1]?.filepath).toEqual("multiline.js");
    expect(comments[1]?.line).toEqual(4);
  });

  it("should handle continuation lines with varying indentation", () => {
    const comments = parseComments({
      filepath: "indentation.js",
      content: `
function indentationExample() {
  // @${getConfig().COMMENT_TAG} first line with normal indentation
  //    second line with extra indentation
  //  third line with different indentation
  // fourth line with normal indentation
  return true;
}
`,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toEqual(
      "first line with normal indentation\nsecond line with extra indentation\nthird line with different indentation\nfourth line with normal indentation"
    );
    expect(comments[0]?.filepath).toEqual("indentation.js");
    expect(comments[0]?.line).toEqual(2);
  });

  describe("ignoring files with 'hands-please-ignore' in first line", () => {
    it("should ignore JavaScript files with // hands-please-ignore", () => {
      const comments = parseComments({
        filepath: "javascript.js",
        content: `// hands-please-ignore
function example() {
  // @${getConfig().COMMENT_TAG} this should be ignored
  return true;
}`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore JavaScript files with /* hands-please-ignore */", () => {
      const comments = parseComments({
        filepath: "javascript-multiline.js",
        content: `/* hands-please-ignore */
function example() {
  // @${getConfig().COMMENT_TAG} this should be ignored
  return true;
}`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore HTML files with <!-- hands-please-ignore -->", () => {
      const comments = parseComments({
        filepath: "index.html",
        content: `<!-- hands-please-ignore -->
<html>
  <!-- @${getConfig().COMMENT_TAG} this should be ignored -->
  <body>
    <h1>Hello World</h1>
  </body>
</html>`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore Python files with # hands-please-ignore", () => {
      const comments = parseComments({
        filepath: "script.py",
        content: `# hands-please-ignore
def example():
    # @${getConfig().COMMENT_TAG} this should be ignored
    return True`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore Python files with ''' hands-please-ignore", () => {
      const comments = parseComments({
        filepath: "script-multiline.py",
        content: `''' hands-please-ignore
Some docstring content
'''
def example():
    # @${getConfig().COMMENT_TAG} this should be ignored
    return True`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore SQL files with -- hands-please-ignore", () => {
      const comments = parseComments({
        filepath: "query.sql",
        content: `-- hands-please-ignore
SELECT * FROM users
-- @${getConfig().COMMENT_TAG} this should be ignored
WHERE id = 1;`,
      });
      expect(comments).toHaveLength(0);
    });
  });
});
