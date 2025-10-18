# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **MCP (Model Context Protocol) server** for context engineering with local Obsidian vaults. It's built as an npm package that can be used both as a CLI tool and as an importable library.

The codebase uses:

- **TypeScript** with ES modules (`"type": "module"`)
- **MCP TypeScript SDK** (`@modelcontextprotocol/sdk`) version 1.19.1
- **Zod** for schema validation
- **Jest** for testing
- Node.js 18+

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

- Each tool lives in its own folder under `src/tools/<tool-name>/`
- Tool folder contains: `index.ts` (definition + handler) and `<tool-name>.test.ts` (tests)
- All tools export a `ToolDefinition` object with: `name`, `config`, and `handler`
- Tools are registered centrally in `src/tools/index.ts`
- Server automatically registers all tools from the registry in `setupTools()`
- Tools are registered using `McpServer.registerTool()` (high-level API, preferred)
- All tools must return `{ content: [], structuredContent?: {} }`

### MCP Protocol Specifics

**ES Module Compatibility:**

- Do NOT use `require.main === module` (CommonJS pattern)
- For main module detection, use: `process.argv[1] === fileURLToPath(import.meta.url)`
- Import `fileURLToPath` from `url` module

**MCP Server API:**

- Use `McpServer` class (high-level) NOT `Server` class (low-level)
- Connect via `StdioServerTransport` for local process communication
- Server runs over stdio, logging must use `console.error()` not `console.log()`

**Tool Implementation:**

- Tools receive parsed/validated args matching inputSchema
- Return both `content` (array of content items) AND `structuredContent` (typed object)
- Content items: `{ type: "text", text: string }`
- Structured content matches outputSchema for type safety

## Development Commands

### Essential Commands

```bash
npm run build              # Build TypeScript → JavaScript
npm run watch              # Build with auto-rebuild on changes
npm test                   # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test -- hello.test.ts  # Run specific test file
npm run test:coverage      # Run tests with coverage report
npm run lint               # Check linting
npm run typecheck          # TypeScript type checking
npm run format             # Format all code with Prettier
npm run format:check       # Check formatting without changes
```

### Running the Server

```bash
# After building:
node dist/cli.js

# With MCP Inspector (for debugging):
npx @modelcontextprotocol/inspector node dist/cli.js
```

### Quality Checks

All quality checks run in CI (GitHub Actions):

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

### Pre-commit Hooks

Husky pre-commit hook automatically runs:

1. **ggshield secret scan** - Scans for secrets/credentials (requires setup, see below)
2. **lint-staged** - Formats and lints only changed files (fast)
3. **test:coverage** - Runs full test suite with coverage (ensures nothing breaks)

To bypass pre-commit hooks (not recommended): `git commit --no-verify`

### Secret Scanning with GitGuardian

**What it does:**

- **Pre-commit:** Scans staged files for secrets before commit (gracefully skips if not installed)
- **CI:** Scans all changes in PRs and pushes (fails build if secrets detected)
- Detects: API keys, tokens, passwords, private keys, database credentials, etc.

## Testing MCP Tools

### Testing Philosophy

**Test tool handlers directly** - Access registered tools and call their callbacks:

```typescript
const server = new ObsidianMCPServer();
const tool = server.getTool("hello");
const result = await tool.callback({ name: "World" } as any, {} as any);
```

**Do NOT test via MCP protocol layer** - We test the tool implementation, not protocol serialization.

### Test Structure

Every tool must have tests co-located in `src/tools/<tool-name>/<tool-name>.test.ts` with these categories:

1. **Tool Registration Tests**
   - Verify tool exists with correct metadata
   - Check inputSchema/outputSchema are defined
   - Confirm tool is enabled by default

2. **Tool Execution Tests**
   - Test with valid inputs
   - Verify `content` array structure (MCP protocol)
   - Verify `structuredContent` object (typed output)
   - Test edge cases: empty strings, special chars, very long inputs

3. **Input Validation Tests**
   - Optional parameters work (undefined/missing)
   - Invalid inputs handled gracefully

4. **Output Consistency Tests**
   - Same inputs → same outputs
   - All results follow MCP structure

### Test Helpers

Located in `src/__tests__/test-utils.ts`:

- `callToolCallback()` - Call tool with typed results
- `expectValidToolResult()` - Verify MCP protocol compliance
- `isTextContent()` - Type guard for content items
- `getTextFromResult()` - Extract text from result

### Test File Template

```typescript
import { ObsidianMCPServer } from "../../server";

describe("my-tool", () => {
  let server: ObsidianMCPServer;
  let myTool: ReturnType<ObsidianMCPServer["getTool"]>;

  beforeEach(() => {
    server = new ObsidianMCPServer();
    myTool = server.getTool("my-tool");
  });

  describe("tool registration", () => {
    it("should register the tool", () => {
      expect(myTool).toBeDefined();
      expect(myTool?.title).toBe("My Tool");
      expect(myTool?.inputSchema).toBeDefined();
    });
  });

  describe("tool execution", () => {
    it("should process input correctly", async () => {
      if (!myTool) throw new Error("Tool not found");

      const result = await myTool.callback(
        { param: "value" } as any,
        {} as any
      );

      expect(result.content[0]).toEqual({
        type: "text",
        text: "expected output",
      });
      expect(result.structuredContent).toEqual({
        /* ... */
      });
    });
  });
});
```

## Adding New MCP Tools

### Step-by-step Process

1. **Create tool folder:** `src/tools/<tool-name>/`

2. **Create tool definition in `src/tools/<tool-name>/index.ts`:**

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const myTool: ToolDefinition = {
  name: "tool-name",
  config: {
    title: "Display Name",
    description: "What this tool does",
    inputSchema: {
      param1: z.string().describe("Parameter description"),
      param2: z.number().optional(),
    },
    outputSchema: {
      result: z.string(),
      count: z.number(),
    },
  },
  handler: async ({ param1, param2 }) => {
    // Implementation
    const output = { result: "...", count: 42 };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  },
};
```

3. **Register tool in `src/tools/index.ts`:**

```typescript
import { helloTool } from "./hello/index.js";
import { myTool } from "./tool-name/index.js"; // Add import
import type { ToolDefinition } from "./types.js";

export const tools: ToolDefinition[] = [
  helloTool,
  myTool, // Add to registry
];
```

4. **Create test file `src/tools/<tool-name>/<tool-name>.test.ts`** following the test structure above

5. **Run tests:** `npm test -- <tool-name>.test.ts`

6. **Verify in MCP Inspector:**

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/cli.js
```

### Tool Implementation Requirements

- **Always return both `content` and `structuredContent`**
- **Use Zod schemas** for input/output validation
- **Handle optional parameters** with sensible defaults
- **Export a `ToolDefinition` object** with `name`, `config`, and `handler`
- **Handler must be async** and return `Promise<CallToolResult>`
- **Co-locate tests** with tool implementation in same folder
- **Log to stderr** if logging needed (`console.error()`)

## Key Files

- `src/server.ts` - Core server class (iterates tool registry)
- `src/cli.ts` - CLI entry point (minimal, just runs server)
- `src/tools/index.ts` - Tool registry (exports all tools)
- `src/tools/types.ts` - Shared `ToolDefinition` interface
- `src/tools/hello/index.ts` - Example tool implementation
- `src/tools/hello/hello.test.ts` - Example test showing all patterns
- `src/__tests__/test-utils.ts` - Testing utilities
- `src/__tests__/server.test.ts` - Server initialization tests
- `jest.config.js` - Jest configured to exclude `test-utils.ts` from test runs

## Common Patterns

### Accessing Underlying MCP Server

For advanced operations (notifications, custom handlers):

```typescript
const obsidianServer = new ObsidianMCPServer();
const mcpServer = obsidianServer.getServer();
// Access mcpServer.server for low-level Server instance
```

### Tool Callback Signature

```typescript
type ToolCallback = (
  args: z.infer<typeof inputSchema>,
  extra: RequestHandlerExtra
) => CallToolResult | Promise<CallToolResult>;
```

### MCP Content Types

```typescript
// Text content
{ type: "text", text: string }

// Resource link (for referencing files)
{ type: "resource_link", uri: string, name?: string, mimeType?: string }
```

## Important Notes

- **ES Modules:** All **relative** imports must use `.js` extension in TypeScript source files (e.g., `import { ObsidianMCPServer } from "./server.js"`). This is because TypeScript doesn't rewrite import paths, and Node.js requires extensions for ES modules. TypeScript will still find the `.ts` file during compilation. Package imports (e.g., `@modelcontextprotocol/sdk`) don't need extensions.
- **Testing:** Test utils must NOT be picked up by Jest (uses `*.test.ts` pattern)
- **Build:** TypeScript outputs to `dist/` with declaration files
- **Package:** Exports both CLI (`bin`) and library (`main`, `types`, `exports`)
- **MCP Inspector:** Essential tool for debugging MCP protocol interactions
