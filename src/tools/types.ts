import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Definition for an MCP tool that can be registered with the server.
 * Each tool includes a name, configuration (schemas and metadata), and a handler function.
 */
export interface ToolDefinition {
  /** Unique identifier for the tool */
  name: string;

  /** Tool configuration including schemas and metadata */
  config: {
    /** Display name shown in MCP clients */
    title: string;

    /** Human-readable description of what the tool does */
    description: string;

    /** Zod schema defining the tool's input parameters */
    inputSchema: Record<string, z.ZodType>;

    /** Optional Zod schema defining the tool's output structure */
    outputSchema?: Record<string, z.ZodType>;
  };

  /**
   * Handler function that executes when the tool is called.
   * @param args - Validated input arguments matching inputSchema
   * @param extra - Additional request context from MCP (currently unused)
   * @returns Promise resolving to CallToolResult with content and optional structuredContent
   */
  handler: (
    args: Record<string, unknown>,
    extra: object
  ) => Promise<CallToolResult>;
}
