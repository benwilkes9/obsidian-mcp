import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools/index.js";

export class ObsidianMCPServer {
  private server: McpServer;
  private tools: Map<string, ReturnType<McpServer["registerTool"]>> = new Map();

  constructor() {
    this.server = new McpServer({
      name: "obsidian-mcp",
      version: "0.1.0",
    });

    this.setupTools();
  }

  private setupTools(): void {
    // Register all tools from the registry
    for (const tool of tools) {
      const registeredTool = this.server.registerTool(
        tool.name,
        tool.config,
        tool.handler
      );
      this.tools.set(tool.name, registeredTool);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Obsidian MCP server running on stdio");
  }

  getServer(): McpServer {
    return this.server;
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  getTools() {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      ...tool,
    }));
  }
}
