# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **MCP (Model Context Protocol) server** for context engineering with local Obsidian vaults. It's built as an npm package that can be used both as a CLI tool and as an importable library.

**Tech stack:** TypeScript (ES modules), MCP SDK 1.19.1, Zod (validation), Jest (testing), Node.js 18+

## CRITICAL Patterns

**⚠️ These patterns are essential for MCP servers and will cause runtime errors if not followed:**

1. **ES Module imports** - All **relative** imports MUST use `.js` extension in TypeScript:

   ```typescript
   import { ObsidianMCPServer } from "./server.js"; // ✅ Correct
   import { ObsidianMCPServer } from "./server"; // ❌ Will fail at runtime
   ```

   TypeScript finds `.ts` files during compilation, but Node.js requires extensions for ES modules.

2. **Logging in MCP servers** - Server runs over stdio, so:

   ```typescript
   console.error("Debug info"); // ✅ Use stderr for logging
   console.log("Debug info"); // ❌ Corrupts stdio protocol
   ```

3. **Tool return structure** - All tools MUST return both:

   ```typescript
   {
     content: [{ type: "text", text: "..." }],  // MCP protocol format
     structuredContent: { /* typed object */ }   // Type-safe output
   }
   ```

4. **Main module detection** - Use ES module pattern, NOT CommonJS:

   ```typescript
   import { fileURLToPath } from "url";
   if (process.argv[1] === fileURLToPath(import.meta.url)) {
     /* ... */
   } // ✅
   if (require.main === module) {
     /* ... */
   } // ❌ CommonJS pattern
   ```

5. **Commit messages** - Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

   ```
   <type>(<scope>): <description>

   [optional body]

   [optional footer]
   ```

   **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`

   **Examples:**
   - `feat(tools): add vault search tool`
   - `fix(server): prevent memory leak in tool registry`
   - `docs: update CLAUDE.md with testing guidelines`
   - `test(hello): add edge case tests for empty inputs`
   - `chore: update dependencies to latest versions`

6. **Git commits** - When creating commits:
   - Pre-commit hooks run automatically (Husky): secret scan, lint-staged, test:coverage
   - Always check hook results and address failures before retrying
   - If hooks fail: fix issues, stage fixes, then commit again
   - Never use `--no-verify` unless explicitly requested by user

## Architecture

### Code Structure

**Dual-purpose package design:**

- `src/cli.ts` - Executable entry point (becomes `dist/cli.js`)
- `src/server.ts` - `ObsidianMCPServer` class (importable library)
- `src/tools/` - Tool definitions organized by feature
- Separation allows the server to be imported programmatically or run as a standalone CLI

**Directory Layout:**

```
src/
├── cli.ts                    # CLI entry point
├── server.ts                 # ObsidianMCPServer class
├── tools/
│   ├── index.ts             # Tool registry (exports all tools)
│   ├── types.ts             # Shared ToolDefinition interface
│   └── hello/
│       ├── index.ts         # Hello tool definition + handler
│       └── hello.test.ts    # Co-located tests
└── __tests__/
    ├── server.test.ts       # Server-level integration tests
    └── test-utils.ts        # Testing utilities
```

**ObsidianMCPServer class:**

```typescript
class ObsidianMCPServer {
  private server: McpServer; // MCP SDK high-level server
  private tools: Map<string, RegisteredTool>; // Tool registry for testing

  setupTools(); // Iterates tools registry and registers each one
  run(); // Connect to stdio transport and start server
  getServer(); // Access underlying McpServer (for advanced usage)
  getTool(name); // Get registered tool by name (for testing)
}
```

**Tool organization pattern:**

- Each tool lives in its own folder: `src/tools/<tool-name>/`
- Contains: `index.ts` (definition + handler) and `<tool-name>.test.ts` (co-located tests)
- All tools export a `ToolDefinition` object: `{ name, config, handler }`
- Tools registered centrally in `src/tools/index.ts`
- Server auto-registers all tools via `setupTools()` using `McpServer.registerTool()` (high-level API)

**MCP Server API:**

- Use `McpServer` class (high-level), NOT `Server` class (low-level)
- Connect via `StdioServerTransport` for local process communication
- Tools receive parsed/validated args matching `inputSchema`
- Content types: `{ type: "text", text: string }` or `{ type: "resource_link", uri: string, ... }`

## Development

### Essential Commands

```bash
npm run build         # Build TypeScript → JavaScript
npm test              # Run all tests
npm run lint          # Check linting
npm run typecheck     # TypeScript type checking
npm run format        # Format code with Prettier

# Testing variations
npm test -- --watch            # Watch mode
npm test -- hello.test.ts      # Specific test file
npm run test:coverage          # With coverage report

# Debugging
npx @modelcontextprotocol/inspector node dist/cli.js  # MCP Inspector
```

### CI/CD & Quality Tools

**Pre-commit hooks** (via Husky):

- Secret scanning (GitGuardian - gracefully skips if not installed)
- Format/lint staged files (lint-staged)
- Full test suite with coverage

**CI pipeline** runs on all PRs/pushes:

- Format check, lint, typecheck, tests, build
- Secret scanning (GitGuardian - fails if secrets detected)
- Static analysis (Semgrep - custom MCP rules + community rulesets)
- Code quality analysis (SonarCloud - tracks coverage, bugs, security)

**Custom Semgrep rules** prevent common MCP mistakes:

- `mcp-no-console-log` - Enforces `console.error()` not `console.log()`
- `node-path-traversal` - Prevents unsafe file path handling
- `node-command-injection` - Catches shell injection vulnerabilities
- `node-prefer-async-fs` - Suggests async file operations
- `typescript-avoid-any` - Flags overly permissive `any` types

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed documentation on all CI tools, testing guidelines, and PR workflow.

## Testing

### Approach

**Test tool handlers directly** - NOT via MCP protocol layer:

```typescript
const server = new ObsidianMCPServer();
const tool = server.getTool("hello");
const result = await tool.callback({ name: "World" } as any, {} as any);
```

### Required Test Categories

Every tool needs co-located tests in `src/tools/<tool-name>/<tool-name>.test.ts`:

1. **Tool Registration** - Verify tool exists with correct metadata, schemas defined
2. **Tool Execution** - Valid inputs, `content` array + `structuredContent` object, edge cases
3. **Input Validation** - Optional parameters, invalid input handling
4. **Output Consistency** - Same inputs → same outputs, MCP structure compliance

### Test Helpers

In [src/**tests**/test-utils.ts](src/__tests__/test-utils.ts):

- `callToolCallback()` - Call tool with typed results
- `expectValidToolResult()` - Verify MCP protocol compliance
- `isTextContent()` - Type guard for content items
- `getTextFromResult()` - Extract text from result

See [CONTRIBUTING.md](CONTRIBUTING.md#test-file-template) for complete test template.

## Adding New MCP Tools

### Quick Reference

1. Create `src/tools/<tool-name>/index.ts`:

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const myTool: ToolDefinition = {
  name: "tool-name",
  config: {
    title: "Display Name",
    description: "What this tool does",
    inputSchema: { param1: z.string().describe("Description") },
    outputSchema: { result: z.string() },
  },
  handler: async ({ param1 }) => {
    const output = { result: "..." };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  },
};
```

2. Register in [src/tools/index.ts](src/tools/index.ts):

```typescript
import { myTool } from "./tool-name/index.js";
export const tools: ToolDefinition[] = [helloTool, myTool];
```

3. Create tests in `src/tools/<tool-name>/<tool-name>.test.ts`
4. Run `npm test -- <tool-name>.test.ts`
5. Verify with MCP Inspector: `npm run build && npx @modelcontextprotocol/inspector node dist/cli.js`

### Requirements

- ✅ Return both `content` and `structuredContent`
- ✅ Use Zod schemas for input/output validation
- ✅ Export `ToolDefinition` object with `name`, `config`, `handler`
- ✅ Handler must be async, return `Promise<CallToolResult>`
- ✅ Co-locate tests with tool implementation

## Reference

### Key Files

**Core:**

- [src/server.ts](src/server.ts) - `ObsidianMCPServer` class (tool registry iterator)
- [src/cli.ts](src/cli.ts) - CLI entry point
- [src/tools/index.ts](src/tools/index.ts) - Tool registry
- [src/tools/types.ts](src/tools/types.ts) - `ToolDefinition` interface

**Examples:**

- [src/tools/hello/index.ts](src/tools/hello/index.ts) - Example tool implementation
- [src/tools/hello/hello.test.ts](src/tools/hello/hello.test.ts) - Example test showing all patterns

**Testing:**

- [src/**tests**/test-utils.ts](src/__tests__/test-utils.ts) - Testing utilities
- [src/**tests**/server.test.ts](src/__tests__/server.test.ts) - Server initialization tests

### Common Patterns

**Access underlying MCP server** for advanced operations:

```typescript
const obsidianServer = new ObsidianMCPServer();
const mcpServer = obsidianServer.getServer();
```

**Tool callback signature:**

```typescript
type ToolCallback = (
  args: z.infer<typeof inputSchema>,
  extra: RequestHandlerExtra
) => CallToolResult | Promise<CallToolResult>;
```

### Build & Package

- **Build output:** `dist/` with TypeScript declaration files
- **Exports:** Both CLI (`bin` field) and library (`main`, `types`, `exports` fields)
- **Test pattern:** `*.test.ts` (excludes `test-utils.ts` from Jest runs)
