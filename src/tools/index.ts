import { helloTool } from "./hello/index.js";
import { readObsidianFileTool } from "./read-obsidian-file/index.js";
import type { ToolDefinition } from "./types.js";

/**
 * Registry of all tools available in the Obsidian MCP server.
 * Add new tools to this array to make them available to clients.
 */
export const tools: ToolDefinition[] = [
  helloTool,
  readObsidianFileTool,
  // Add additional tools here as they are implemented
];

// Re-export types for convenience
export { type ToolDefinition } from "./types.js";
