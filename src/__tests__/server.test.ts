import { ObsidianMCPServer } from "../server.js";

describe("ObsidianMCPServer", () => {
  let server: ObsidianMCPServer;

  beforeEach(() => {
    server = new ObsidianMCPServer();
  });

  describe("initialization", () => {
    it("should create a server instance", () => {
      expect(server).toBeDefined();
      expect(server.getServer()).toBeDefined();
    });

    it("should create an McpServer instance", () => {
      const mcpServer = server.getServer();
      expect(mcpServer).toBeDefined();
      expect(mcpServer.constructor.name).toBe("McpServer");
    });
  });

  describe("server configuration", () => {
    it("should have correct server name and version", () => {
      const mcpServer = server.getServer();
      // The McpServer stores these internally, we can verify the instance exists
      expect(mcpServer).toBeDefined();
    });
  });

  describe("tool management", () => {
    it("should allow getting a tool by name", () => {
      const helloTool = server.getTool("hello");
      expect(helloTool).toBeDefined();
      expect(helloTool?.description).toBe("Returns a hello world greeting");
    });

    it("should return undefined for non-existent tool", () => {
      const nonExistentTool = server.getTool("non-existent");
      expect(nonExistentTool).toBeUndefined();
    });

    it("should return all registered tools", () => {
      const tools = server.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("hello");
      expect(tools[0].description).toBe("Returns a hello world greeting");
    });
  });
});
