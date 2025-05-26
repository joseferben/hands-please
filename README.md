<!-- hands-please-ignore -->

![hands-please](https://github.com/joseferben/hands-please/blob/main/hands-please.gif)

# hands-please 🫱

`hands-please`

1. Watch codebase for `// @ai fix this code`
2. Run an agent like Claude Code in the background with the prompt from the comment until lint/build passes

## Example

```bash
$ npx hands-please@latest --agent 'claude --print --output-format stream-json --verbose --allowedTools "Edit,Write,WebFetch"' --check 'npm run check' --file-check 'npm run lint'
```

Add a comment:

```typescript
// @ai add a test case to divide by 0
describe("division", () => {
  it("should divide 10 by 2", () => {
    expect(10 / 2).toBe(5);
  });
});
```

```bash
$ npx hands-please@latest --agent 'claude --print --output-format stream-json --verbose --allowedTools "Edit,Write,WebFetch"' --check 'npm run check' --file-check 'npm run lint'
⠏ Watching for comments with "@ai"....
ℹ 🫱 Processing comment src/math.test.ts:194
ℹ  🤖 I'll implement the test case for division by zero as requested in the comment.
ℹ  🤖 Added test case that verifies division by zero returns Infinity in JavaScript.
ℹ  💸 $0.04 in 12.38s
ℹ  ✓ $ npm run lint
ℹ  ✓ $ npm run check
ℹ  ✓ All checks passed
⠙ Watching files for "@ai"....
```

## Configuration

`hands-please` is configured using command line arguments:

```bash
# Basic usage
npx hands-please --agent <agent-command> --check <check-command> --file-check <file-check-command> [options]

# Options:
#   --agent        The command to run the AI agent in non-interactive mode(required)
#   --check        The command to check the codebase (required)
#   --file-check   The command to check specific files (required)
#   --trigger      The tag that triggers comment processing (default: "@ai")
#   --skip-watch   Exit after processing all comments (default: false)
```

Example for Claude Code:

```bash
pnpm dlx hands-please@latest \
  --agent 'claude --print --output-format stream-json --verbose --allowedTools "Edit,Write,WebFetch"' \
  --check 'pnpm check' \
  --file-check 'pnpm lint'
```

## Motivation

I wanted the productivity of vibe coding without the mess: Running local coding agents with surgical precision based on comments.

There is no chat interface, the only way to interact with the code agents is through code comments.

Workflow:

1. Pick up a comment containing `@ai`
2. Run agent with prompt from comment or linting issues
3. Run file-check command on changed files, on error go to 2.
4. Run full codebase check command, on error go to 2.
5. => Done! Process next comment.

For `hands-please` to work well it's important to provide a file-specific check using the `--file-check` option like `eslint` that works with `eslint <file1> <file2>`. This allows `hands-please` to run checks only on changed files and provide feedback to the code agent that is relevant to the changes it made. => Super fast feedback loop!

## Inspiration

- [aider](https://github.com/Aider-AI/aider): For the comment-based code agent
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/): For the DX and the nice auto-mode experience
