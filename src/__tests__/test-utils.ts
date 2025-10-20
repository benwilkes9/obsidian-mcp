/**
 * MCP Testing Utilities
 *
 * Helper functions and types for testing MCP servers and tools.
 * These utilities follow MCP best practices for testing.
 */

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Mock type for MCP request handler extra context.
 * This represents additional metadata passed to tool handlers.
 */
export type MockRequestHandlerExtra = Record<string, never>;

/**
 * Mock type for tool callback arguments.
 */
export type MockToolArgs = Record<string, unknown>;

/**
 * Helper to call a tool callback directly with typed results
 */
export async function callToolCallback<T = unknown>(
  callback: (
    args: MockToolArgs,
    extra: MockRequestHandlerExtra
  ) => CallToolResult | Promise<CallToolResult>,
  args: MockToolArgs = {}
) {
  const result = await callback(args, {});
  return {
    ...result,
    structuredContent: result.structuredContent as T,
  };
}

/**
 * Helper to verify MCP tool result structure
 */
export function expectValidToolResult(result: unknown) {
  expect(result).toBeDefined();
  expect(result).toHaveProperty("content");
  expect(Array.isArray((result as any).content)).toBe(true);
  expect((result as any).content.length).toBeGreaterThan(0);
  expect((result as any).content[0]).toHaveProperty("type");
}

/**
 * Type guard for text content
 */
export function isTextContent(
  content: unknown
): content is { type: "text"; text: string } {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "text" &&
    "text" in content
  );
}

/**
 * Helper to extract text from tool result
 */
export function getTextFromResult(result: { content: unknown[] }): string {
  const firstContent = result.content[0];
  if (isTextContent(firstContent)) {
    return firstContent.text;
  }
  throw new Error("First content item is not text content");
}

/**
 * Helper to verify tool is enabled
 */
export function expectToolEnabled(tool: { enabled: boolean }) {
  expect(tool.enabled).toBe(true);
}

/**
 * Helper to verify tool metadata
 */
export function expectToolMetadata(
  tool: {
    title?: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
  },
  expected: {
    title?: string;
    description?: string;
    hasInputSchema?: boolean;
    hasOutputSchema?: boolean;
  }
) {
  if (expected.title) {
    expect(tool.title).toBe(expected.title);
  }
  if (expected.description) {
    expect(tool.description).toBe(expected.description);
  }
  if (expected.hasInputSchema) {
    expect(tool.inputSchema).toBeDefined();
  }
  if (expected.hasOutputSchema) {
    expect(tool.outputSchema).toBeDefined();
  }
}

/**
 * Vault environment setup helper for tests
 *
 * Sets up and tears down vault path environment variable and test directories.
 * Use this in test suites that need to test vault configuration.
 *
 * @example
 * ```typescript
 * const vaultEnv = createVaultTestEnvironment('my-test-suite');
 *
 * beforeAll(vaultEnv.setup);
 * afterAll(vaultEnv.teardown);
 * beforeEach(vaultEnv.beforeEach);
 * afterEach(vaultEnv.afterEach);
 * ```
 */
export function createVaultTestEnvironment(testSuiteName: string) {
  const { join } = require("path");
  const { mkdirSync, rmSync } = require("fs");

  const testDir = join(process.cwd(), `test-vaults-${testSuiteName}`);
  const validVaultPath = join(testDir, "valid-vault");
  const originalEnv = process.env.OBSIDIAN_VAULT_PATH;

  return {
    testDir,
    validVaultPath,

    /**
     * Call in beforeAll - creates test directories
     */
    setup: () => {
      mkdirSync(testDir, { recursive: true });
      mkdirSync(validVaultPath, { recursive: true });
    },

    /**
     * Call in afterAll - removes test directories and restores environment
     */
    teardown: () => {
      rmSync(testDir, { recursive: true, force: true });

      if (originalEnv) {
        process.env.OBSIDIAN_VAULT_PATH = originalEnv;
      } else {
        delete process.env.OBSIDIAN_VAULT_PATH;
      }
    },

    /**
     * Call in beforeEach - sets valid vault path
     */
    beforeEach: () => {
      process.env.OBSIDIAN_VAULT_PATH = validVaultPath;
    },

    /**
     * Call in afterEach - resets to valid vault path
     */
    afterEach: () => {
      process.env.OBSIDIAN_VAULT_PATH = validVaultPath;
    },

    /**
     * Helper to create a temporary test directory
     */
    createTempDir: (name: string) => {
      const tempPath = join(testDir, name);
      mkdirSync(tempPath, { recursive: true });
      return tempPath;
    },

    /**
     * Helper to remove a temporary test directory
     */
    removeTempDir: (name: string) => {
      const tempPath = join(testDir, name);
      rmSync(tempPath, { recursive: true, force: true });
    },
  };
}
