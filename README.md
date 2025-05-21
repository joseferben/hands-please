<!-- hands-please-ignore -->

# hands-please

![hands-please](https://github.com/joseferben/hands-please/blob/main/hands-please.gif)

`hands-please` runs Claude Code or OpenAI Codex locally based on your code comments. Comments in the codebase is the only way to communicate with the code agents.

## Example

1. Run `hands-please`

```bash
$ npx hands-please
⠏ Watching for comments with "@ai"....
```

2. Add a comment to your code with `@ai`

```typescript
// @ai add a test case to divide by 0
describe("division", () => {
  it("should divide 10 by 2", () => {
    expect(10 / 2).toBe(5);
  });
});
```

3. `hands-please` picks up the comment and runs the code agents until all check, builds and tests pass.

```bash
$ npx hands-please
⠏ Watching for comments with "@ai"....
ℹ 🤖 Processing comment src/math.test.ts:194
ℹ  🤖 I'll implement the test case for division by zero as requested in the comment.
ℹ  🤖 Added test case that verifies division by zero returns Infinity in JavaScript.
ℹ  💸 $0.04 in 12.38s
ℹ  ✓ $ pnpm lint
ℹ  ✓ $ pnpm check
ℹ  ✓ All checks passed
⠙ Watching files for "@ai"....
```

## Configuration

Example `.env`

```bash
# The code agent that makes the changes, either "claude-code" or "codex"
AGENT="claude-code"
# The command to run to a full build, check and tests
CHECK="pnpm check"
# Per-file check that can be called like `pnpm lint src/math.test.ts`
FILE_CHECK="pnpm lint"
# The tag hands-please will look for in the codebase
COMMENT_TAG="ai"
```

## Motivation

I wanted the productivity of vibe coding without the mess: Running local code agents with surgical precision based on my comments in the codebase.

There is no chat interface, the only way to interact with the code agents is through code comments.

This requires a tight automated feedback loop. It is important to provide commands that check, lint, build and test the code after the agent made changes.

The workflow is simple:

1. Make comment containing `@ai`
2. Code agent runs with comment as prompt
3. Once it is done `FILE_CHECK <file1> <file2>` is executed on changed files, on error go to 2.
4. On success, `CHECK` is executed, on error go to 2.
5. On success, we are done and can review code that passed all checks

Running file-specific checks makes sure that the feedback for the code agent is relevant to the changes it made. This allows us to work in parallel on different parts of the codebase.

For `hands-please` to work well it's important to provide a file-specific `FILE_CHECK` check. This allows `hands-please` to run checks only on changed files and provide feedback to the code agent that is relevant to the changes it made. => Super fast feedback loop!

## Inspiration

- [aider](https://github.com/Aider-AI/aider): For the comment-based code agent
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/): For the DX and the nice auto-mode experience
