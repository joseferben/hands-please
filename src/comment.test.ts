import { parse } from "./comment.js";
import { it, expect, describe } from "vitest";

const trigger = "@foo";

describe("parse()", () => {
  it("should handle import statements and track line numbers correctly", () => {
    const comments = parse({
      trigger,
      filepath: "imports.js",
      content: `import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

// ${trigger} implement API fetching logic
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
    const comments = parse({
      trigger,
      filepath: "firstline.js",
      content: `// ${trigger}
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
    const comments = parse({
      trigger,
      filepath: "test.js",
      content: `
    function emojis() {
      // ${trigger} emojis: 😀, 🚀, 👍
    }
  `,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toEqual("emojis: 😀, 🚀, 👍");
    expect(comments[0]?.filepath).toEqual("test.js");
    expect(comments[0]?.line).toEqual(2);
  });

  it("should parse comments with code snippets", () => {
    const comments = parse({
      trigger,
      filepath: "code.js",
      content: `
    function example() {
      // ${trigger} code: console.log('Hello world')
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
    const comments = parse({
      trigger,
      filepath: "multiline.js",
      content: `
    function multiLineExample() {
      // ${trigger} first line of a multi-line comment
      // second line that should be captured
      // ${trigger} another tagged comment line
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
    const comments = parse({
      trigger,
      filepath: "indentation.js",
      content: `
function indentationExample() {
  // ${trigger} first line with normal indentation
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
      const comments = parse({
        trigger,
        filepath: "javascript.js",
        content: `// hands-please-ignore
function example() {
  // ${trigger} this should be ignored
  return true;
}`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore JavaScript files with /* hands-please-ignore */", () => {
      const comments = parse({
        trigger,
        filepath: "javascript-multiline.js",
        content: `/* hands-please-ignore */
function example() {
  // ${trigger} this should be ignored
  return true;
}`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore HTML files with <!-- hands-please-ignore -->", () => {
      const comments = parse({
        trigger,
        filepath: "index.html",
        content: `<!-- hands-please-ignore -->
<html>
  <!-- ${trigger} this should be ignored -->
  <body>
    <h1>Hello World</h1>
  </body>
</html>`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore Python files with # hands-please-ignore", () => {
      const comments = parse({
        trigger,
        filepath: "script.py",
        content: `# hands-please-ignore
def example():
    # ${trigger} this should be ignored
    return True`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore Python files with ''' hands-please-ignore", () => {
      const comments = parse({
        trigger,
        filepath: "script-multiline.py",
        content: `''' hands-please-ignore
Some docstring content
'''
def example():
    # ${trigger} this should be ignored
    return True`,
      });
      expect(comments).toHaveLength(0);
    });

    it("should ignore SQL files with -- hands-please-ignore", () => {
      const comments = parse({
        trigger,
        filepath: "query.sql",
        content: `-- hands-please-ignore
SELECT * FROM users
-- ${trigger} this should be ignored
WHERE id = 1;`,
      });
      expect(comments).toHaveLength(0);
    });
  });
});
