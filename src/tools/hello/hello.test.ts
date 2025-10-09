import { ObsidianMCPServer } from "../../server.js";

describe("hello tool", () => {
  let server: ObsidianMCPServer;
  let helloTool: ReturnType<ObsidianMCPServer["getTool"]>;

  beforeEach(() => {
    server = new ObsidianMCPServer();
    helloTool = server.getTool("hello");
  });

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

      const result = await helloTool.callback({} as any, {} as any);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World!",
      });
    });

    it("should greet with provided name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const result = await helloTool.callback(
        { name: "Alice" } as any,
        {} as any
      );

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, Alice!",
      });
    });

    it("should include structured content in response", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const result = await helloTool.callback(
        { name: "Bob" } as any,
        {} as any
      );

      expect(result.structuredContent).toEqual({
        greeting: "Hello, Bob!",
      });
    });

    it("should handle empty string name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const result = await helloTool.callback({ name: "" } as any, {} as any);

      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World!",
      });
    });

    it("should handle special characters in name", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const result = await helloTool.callback(
        { name: "José García" } as any,
        {} as any
      );

      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, José García!",
      });
    });

    it("should handle very long names", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const longName = "A".repeat(1000);
      const result = await helloTool.callback(
        { name: longName } as any,
        {} as any
      );

      expect(result.content[0]).toEqual({
        type: "text",
        text: `Hello, ${longName}!`,
      });
    });

    it("should return valid MCP tool result structure", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const result = await helloTool.callback(
        { name: "Test" } as any,
        {} as any
      );

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

      await expect(
        helloTool.callback({ name: "ValidName" } as any, {} as any)
      ).resolves.toBeDefined();
    });

    it("should accept missing name argument", async () => {
      if (!helloTool) throw new Error("Tool not found");

      await expect(
        helloTool.callback({} as any, {} as any)
      ).resolves.toBeDefined();
    });

    it("should handle null-ish values gracefully", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const result = await helloTool.callback(
        { name: undefined } as any,
        {} as any
      );

      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World!",
      });
    });
  });

  describe("output consistency", () => {
    it("should return consistent structure across multiple calls", async () => {
      if (!helloTool) throw new Error("Tool not found");

      const results = await Promise.all([
        helloTool.callback({ name: "User1" } as any, {} as any),
        helloTool.callback({ name: "User2" } as any, {} as any),
        helloTool.callback({ name: "User3" } as any, {} as any),
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

      for (const name of names) {
        const result = await helloTool.callback({ name } as any, {} as any);

        const text = (result.content[0] as any).text;
        expect(text).toMatch(/^Hello, .+!$/);
        expect(text).toBe(`Hello, ${name}!`);
      }
    });
  });
});
