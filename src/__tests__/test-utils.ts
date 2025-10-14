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
