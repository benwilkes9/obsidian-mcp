import { ObsidianMCPServer } from "../../server.js";
import {
  createVaultTestEnvironment,
  type MockRequestHandlerExtra,
  type MockToolArgs,
} from "../../__tests__/test-utils.js";

describe("hello tool", () => {
  let server: ObsidianMCPServer;
  let helloTool: ReturnType<ObsidianMCPServer["getTool"]>;
  const vaultEnv = createVaultTestEnvironment("hello");

  beforeAll(vaultEnv.setup);
  afterAll(vaultEnv.teardown);
  beforeEach(() => {
    vaultEnv.beforeEach();
    server = new ObsidianMCPServer();
    helloTool = server.getTool("hello");
  });
  afterEach(vaultEnv.afterEach);

  describe("tool registration", () => {
    it("should register the hello tool", () => {
      expect(helloTool).toBeDefined();
      expect(helloTool?.description).toBe("Returns a hello world greeting");
      expect(helloTool?.title).toBe("Hello Tool");
    });

    it("should have correct input and output schemas", () => {
      expect(helloTool?.inputSchema).toBeDefined();
      expect(helloTool?.outputSchema).toBeDefined();
    });

    it("should be enabled by default", () => {
      expect(helloTool?.enabled).toBe(true);
    });
  });

  describe("tool execution", () => {
    it("should greet with default name when no name provided", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = {};
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World!",
      });
    });

    it("should greet with provided name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: "Alice" };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, Alice!",
      });
    });

    it("should include structured content in response", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: "Bob" };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.structuredContent).toEqual({
        greeting: "Hello, Bob!",
      });
    });

    it("should handle empty string name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: "" };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World!",
      });
    });

    it("should handle special characters in name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: "José García" };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, José García!",
      });
    });

    it("should handle very long names", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const longName = "A".repeat(1000);
      const args: MockToolArgs = { name: longName };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: `Hello, ${longName}!`,
      });
    });

    it("should return valid MCP tool result structure", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: "Test" };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      // Verify the result has the required MCP tool result structure
      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type");
      expect(result.content[0]).toHaveProperty("text");

      // Verify optional structured content
      expect(result).toHaveProperty("structuredContent");
      expect(result.structuredContent).toHaveProperty("greeting");
    });
  });

  describe("input validation", () => {
    it("should accept valid string name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: "ValidName" };
      const extra: MockRequestHandlerExtra = {};

      await expect(helloTool.callback(args, extra)).resolves.toBeDefined();
    });

    it("should accept missing name argument", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = {};
      const extra: MockRequestHandlerExtra = {};

      await expect(helloTool.callback(args, extra)).resolves.toBeDefined();
    });

    it("should handle null-ish values gracefully", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const args: MockToolArgs = { name: undefined };
      const extra: MockRequestHandlerExtra = {};
      const result = await helloTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World!",
      });
    });
  });

  describe("output consistency", () => {
    it("should return consistent structure across multiple calls", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const extra: MockRequestHandlerExtra = {};
      const results = await Promise.all([
        helloTool.callback({ name: "User1" }, extra),
        helloTool.callback({ name: "User2" }, extra),
        helloTool.callback({ name: "User3" }, extra),
      ]);

      results.forEach((result) => {
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("structuredContent");
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
        expect(result.structuredContent).toHaveProperty("greeting");
      });
    });

    it("should maintain greeting format consistency", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const names = ["Alice", "Bob", "Charlie"];
      const extra: MockRequestHandlerExtra = {};

      for (const name of names) {
        const args: MockToolArgs = { name };
        const result = await helloTool.callback(args, extra);

        const text = (result.content[0] as any).text;
        expect(text).toMatch(/^Hello, .+!$/);
        expect(text).toBe(`Hello, ${name}!`);
      }
    });
  });
});
