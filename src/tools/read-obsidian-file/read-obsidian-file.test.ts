import { writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { ObsidianMCPServer } from "../../server.js";
import {
  createVaultTestEnvironment,
  type MockRequestHandlerExtra,
  type MockToolArgs,
} from "../../__tests__/test-utils.js";

describe("read_obsidian_file tool", () => {
  let server: ObsidianMCPServer;
  let readTool: ReturnType<ObsidianMCPServer["getTool"]>;
  const vaultEnv = createVaultTestEnvironment("read-obsidian-file");

  beforeAll(vaultEnv.setup);
  afterAll(vaultEnv.teardown);
  beforeEach(() => {
    vaultEnv.beforeEach();
    server = new ObsidianMCPServer();
    readTool = server.getTool("read_obsidian_file");
  });
  afterEach(vaultEnv.afterEach);

  describe("tool registration", () => {
    it("should register the read_obsidian_file tool", () => {
      expect(readTool).toBeDefined();
      expect(readTool?.description).toContain(
        "Reads and returns the full content of a markdown file"
      );
      expect(readTool?.title).toBe("Read Obsidian File");
    });

    it("should have correct input and output schemas", () => {
      expect(readTool?.inputSchema).toBeDefined();
      expect(readTool?.outputSchema).toBeDefined();
    });

    it("should be enabled by default", () => {
      expect(readTool?.enabled).toBe(true);
    });
  });

  describe("tool execution - successful reads", () => {
    describe("BDD Scenario: Read simple markdown file", () => {
      it("should read and return full content with preserved formatting", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "test.md" with content
        const content = "# Test Document\nThis is a test.";
        const testFile = join(vaultEnv.validVaultPath, "test.md");
        writeFileSync(testFile, content, "utf-8");

        // When Claude calls read_obsidian_file with filename "test"
        const args: MockToolArgs = { filename: "test" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the tool should return the full content
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toEqual({
          type: "text",
          text: content,
        });

        // And preserve all markdown formatting
        expect(result.structuredContent).toEqual({
          content,
          filename: "test",
          path: testFile,
        });
      });

      it("should work with .md extension specified", async () => {
        if (!readTool) throw new Error("Tool not found");

        const content = "# Test with extension";
        const testFile = join(vaultEnv.validVaultPath, "with-ext.md");
        writeFileSync(testFile, content, "utf-8");

        const args: MockToolArgs = { filename: "with-ext.md" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        expect(result.content[0]).toEqual({
          type: "text",
          text: content,
        });
      });
    });

    describe("BDD Scenario: Read file with YAML frontmatter", () => {
      it("should preserve YAML frontmatter structure", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "story.md" with YAML frontmatter
        const content = `---
title: User Story 1
tags: [feature, api]
status: in-progress
---
# User Story
As a user...`;

        const testFile = join(vaultEnv.validVaultPath, "story.md");
        writeFileSync(testFile, content, "utf-8");

        // When Claude calls read_obsidian_file with filename "story"
        const args: MockToolArgs = { filename: "story" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the tool should return the full content including frontmatter
        expect(result.content[0]).toEqual({
          type: "text",
          text: content,
        });

        // And preserve YAML structure
        expect((result.content[0] as any).text).toContain("---");
        expect((result.content[0] as any).text).toContain(
          "title: User Story 1"
        );
        expect((result.content[0] as any).text).toContain(
          "tags: [feature, api]"
        );
      });
    });

    describe("BDD Scenario: Read file with special characters", () => {
      it("should preserve emoji, code blocks, and tables with UTF-8 encoding", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "special.md" with emoji, code blocks, and tables
        const content = `# Special Characters Test 🚀

\`\`\`javascript
console.log("Hello, 世界!");
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

Emoji: 😀 🎉 ✨
Symbols: © ™ ® € £ ¥
Accents: café, naïve, Zürich`;

        const testFile = join(vaultEnv.validVaultPath, "special.md");
        writeFileSync(testFile, content, "utf-8");

        // When Claude calls read_obsidian_file with filename "special"
        const args: MockToolArgs = { filename: "special" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then all special characters should be preserved
        const returnedText = (result.content[0] as any).text;
        expect(returnedText).toContain("🚀");
        expect(returnedText).toContain("世界");
        expect(returnedText).toContain("😀 🎉 ✨");
        expect(returnedText).toContain("café");
        expect(returnedText).toContain("```javascript");
        expect(returnedText).toContain("| Column 1 | Column 2 |");

        // And encoding should remain UTF-8
        expect(returnedText).toBe(content);
      });
    });

    describe("BDD Scenario: Read file in nested directory", () => {
      it("should find and read files in nested folder structures", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault structure: /vault/projects/api/architecture.md
        const nestedDir = join(vaultEnv.validVaultPath, "projects", "api");
        mkdirSync(nestedDir, { recursive: true });

        const content = "# Architecture Document\nNested file content.";
        const testFile = join(nestedDir, "architecture.md");
        writeFileSync(testFile, content, "utf-8");

        // When searching for "architecture"
        const args: MockToolArgs = { filename: "architecture" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the file should be found and content returned
        expect(result.content[0]).toEqual({
          type: "text",
          text: content,
        });
        expect(result.structuredContent).toMatchObject({
          content,
          filename: "architecture",
          path: testFile,
        });
      });
    });

    describe("BDD Scenario: Filename with spaces", () => {
      it("should handle filenames containing spaces", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "My Notes.md"
        const content = "# My Notes\nContent with spaces in filename.";
        const testFile = join(vaultEnv.validVaultPath, "My Notes.md");
        writeFileSync(testFile, content, "utf-8");

        // When Claude calls read_obsidian_file with filename "My Notes"
        const args: MockToolArgs = { filename: "My Notes" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the file should be found and content returned
        expect(result.content[0]).toEqual({
          type: "text",
          text: content,
        });
      });
    });

    describe("BDD Scenario: Case-insensitive search", () => {
      it("should find files regardless of case", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "UserStory.md"
        const content = "# User Story\nCase insensitive test.";
        const testFile = join(vaultEnv.validVaultPath, "UserStory.md");
        writeFileSync(testFile, content, "utf-8");

        // When searching for "userstory"
        const args: MockToolArgs = { filename: "userstory" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the file should be found
        expect(result.content[0]).toEqual({
          type: "text",
          text: content,
        });
      });
    });
  });

  describe("tool execution - error handling", () => {
    describe("BDD Scenario: User requests non-existent file", () => {
      it("should return helpful error message when file not found", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault does not contain "missing.md"
        // When Claude calls read_obsidian_file with filename "missing"
        const args: MockToolArgs = { filename: "missing" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the tool should return error
        expect(result.isError).toBe(true);
        expect(result.content).toHaveLength(1);

        // And error message should be "File not found: missing.md"
        const errorText = (result.content[0] as any).text;
        expect(errorText).toContain("File not found: missing.md");
        expect(errorText).toContain(vaultEnv.validVaultPath);
        expect(errorText).toContain("Tip:");
      });
    });

    describe("BDD Scenario: File exceeds size limit", () => {
      it("should return error when file exceeds 10MB limit", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "huge.md" with 15MB of content
        const fifteenMB = 15 * 1024 * 1024;
        const hugeContent = "A".repeat(fifteenMB);
        const testFile = join(vaultEnv.validVaultPath, "huge.md");
        writeFileSync(testFile, hugeContent, "utf-8");

        // When Claude calls read_obsidian_file with filename "huge"
        const args: MockToolArgs = { filename: "huge" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the tool should return an error
        expect(result.isError).toBe(true);

        // And error message should indicate "File exceeds size limit"
        const errorText = (result.content[0] as any).text;
        expect(errorText).toContain("File exceeds size limit");
        expect(errorText).toMatch(/\d+\.\d+MB > 10MB/);
      });

      it("should successfully read files at or under 10MB", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given the vault contains "large.md" with ~5MB of content
        const fiveMB = 5 * 1024 * 1024;
        const largeContent = "B".repeat(fiveMB);
        const testFile = join(vaultEnv.validVaultPath, "large.md");
        writeFileSync(testFile, largeContent, "utf-8");

        // When Claude calls read_obsidian_file with filename "large"
        const args: MockToolArgs = { filename: "large" };
        const extra: MockRequestHandlerExtra = {};
        const result = await readTool.callback(args, extra);

        // Then the file should be read successfully
        expect(result.isError).toBeUndefined();
        expect(result.content[0]).toEqual({
          type: "text",
          text: largeContent,
        });
      });
    });

    describe("BDD Scenario: File is not readable (permission denied)", () => {
      // Note: This test may not work consistently on all platforms
      // Particularly on CI/CD systems or when running as root
      it("should return error when file lacks read permissions", async () => {
        if (!readTool) throw new Error("Tool not found");
        if (process.platform === "win32") {
          // Skip on Windows - permission handling is different
          return;
        }

        // Given the vault contains "restricted.md" with no read permissions
        const content = "# Restricted Content";
        const testFile = join(vaultEnv.validVaultPath, "restricted.md");
        writeFileSync(testFile, content, "utf-8");

        try {
          // Remove read permissions (mode 000)
          chmodSync(testFile, 0o000);

          // When Claude calls read_obsidian_file with filename "restricted"
          const args: MockToolArgs = { filename: "restricted" };
          const extra: MockRequestHandlerExtra = {};
          const result = await readTool.callback(args, extra);

          // Then the tool should return an error
          expect(result.isError).toBe(true);

          // And error message should indicate permission denied
          const errorText = (result.content[0] as any).text;
          expect(errorText).toMatch(/permission denied|not readable/i);
        } finally {
          // Restore permissions for cleanup
          try {
            chmodSync(testFile, 0o644);
          } catch {
            // Ignore errors during cleanup
          }
        }
      });
    });

    describe("BDD Scenario: Vault configuration error", () => {
      it("should return error when OBSIDIAN_VAULT_PATH is not set", async () => {
        if (!readTool) throw new Error("Tool not found");

        // Given OBSIDIAN_VAULT_PATH is not set
        const originalPath = process.env.OBSIDIAN_VAULT_PATH;
        delete process.env.OBSIDIAN_VAULT_PATH;

        try {
          // When Claude attempts to read a file
          const args: MockToolArgs = { filename: "any-file" };
          const extra: MockRequestHandlerExtra = {};
          const result = await readTool.callback(args, extra);

          // Then return error with configuration message
          expect(result.isError).toBe(true);
          const errorText = (result.content[0] as any).text;
          expect(errorText).toContain(
            "OBSIDIAN_VAULT_PATH environment variable is not configured"
          );
        } finally {
          // Restore original path
          if (originalPath) {
            process.env.OBSIDIAN_VAULT_PATH = originalPath;
          }
        }
      });
    });
  });

  describe("output structure and consistency", () => {
    it("should return valid MCP tool result structure", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "# Test\nContent";
      const testFile = join(vaultEnv.validVaultPath, "test-structure.md");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "test-structure" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      // Verify the result has the required MCP tool result structure
      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type");
      expect(result.content[0]).toHaveProperty("text");

      // Verify structured content
      expect(result).toHaveProperty("structuredContent");
      expect(result.structuredContent).toHaveProperty("content");
      expect(result.structuredContent).toHaveProperty("filename");
      expect(result.structuredContent).toHaveProperty("path");
    });

    it("should return consistent structure across multiple calls", async () => {
      if (!readTool) throw new Error("Tool not found");

      // Create multiple test files
      const files = ["file1", "file2", "file3"];
      files.forEach((name) => {
        const testFile = join(vaultEnv.validVaultPath, `${name}.md`);
        writeFileSync(testFile, `# ${name}\nContent`, "utf-8");
      });

      const extra: MockRequestHandlerExtra = {};
      const results = await Promise.all(
        files.map((name) => readTool!.callback({ filename: name }, extra))
      );

      results.forEach((result) => {
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("structuredContent");
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toHaveProperty("type", "text");
        expect(result.structuredContent).toHaveProperty("content");
        expect(result.structuredContent).toHaveProperty("filename");
        expect(result.structuredContent).toHaveProperty("path");
      });
    });

    it("should have content array text matching structuredContent.content", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "# Consistency Test\nMatching content.";
      const testFile = join(vaultEnv.validVaultPath, "consistent.md");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "consistent" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      const textContent = (result.content[0] as any).text;
      const structuredContent = (result.structuredContent as any).content;

      expect(textContent).toBe(structuredContent);
      expect(textContent).toBe(content);
    });
  });

  describe("input validation", () => {
    it("should require filename parameter", async () => {
      if (!readTool) throw new Error("Tool not found");

      // When calling with missing filename
      const args: MockToolArgs = {};
      const extra: MockRequestHandlerExtra = {};

      // The tool should handle missing filename gracefully
      // Note: Zod validation happens at MCP layer, but we test tool behavior
      await expect(readTool.callback(args, extra)).resolves.toBeDefined();
    });

    it("should accept valid string filename", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "# Valid";
      const testFile = join(vaultEnv.validVaultPath, "valid.md");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "valid" };
      const extra: MockRequestHandlerExtra = {};

      await expect(readTool.callback(args, extra)).resolves.toBeDefined();
    });

    it("should handle empty string filename", async () => {
      if (!readTool) throw new Error("Tool not found");

      const args: MockToolArgs = { filename: "" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      // Should return file not found error
      expect(result.isError).toBe(true);
      const errorText = (result.content[0] as any).text;
      expect(errorText).toContain("File not found");
    });

    it("should handle filenames with special characters", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "# Special filename";
      const filename = "file-with-dashes";
      const testFile = join(vaultEnv.validVaultPath, `${filename}.md`);
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: content,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty file", async () => {
      if (!readTool) throw new Error("Tool not found");

      const testFile = join(vaultEnv.validVaultPath, "empty.md");
      writeFileSync(testFile, "", "utf-8");

      const args: MockToolArgs = { filename: "empty" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: "",
      });
    });

    it("should handle file with only whitespace", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "   \n\n\t\t  \n   ";
      const testFile = join(vaultEnv.validVaultPath, "whitespace.md");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "whitespace" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: content,
      });
    });

    it("should handle .markdown extension files", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "# Markdown extension test";
      const testFile = join(vaultEnv.validVaultPath, "test.markdown");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "test" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: content,
      });
    });

    it("should preserve line endings", async () => {
      if (!readTool) throw new Error("Tool not found");

      const content = "Line 1\nLine 2\rLine 3\r\nLine 4";
      const testFile = join(vaultEnv.validVaultPath, "lineendings.md");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "lineendings" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      expect((result.content[0] as any).text).toBe(content);
    });

    it("should handle files in deeply nested directories", async () => {
      if (!readTool) throw new Error("Tool not found");

      const deepPath = join(
        vaultEnv.validVaultPath,
        "a",
        "b",
        "c",
        "d",
        "e",
        "f"
      );
      mkdirSync(deepPath, { recursive: true });

      const content = "# Deep file";
      const testFile = join(deepPath, "deep.md");
      writeFileSync(testFile, content, "utf-8");

      const args: MockToolArgs = { filename: "deep" };
      const extra: MockRequestHandlerExtra = {};
      const result = await readTool.callback(args, extra);

      expect(result.content[0]).toEqual({
        type: "text",
        text: content,
      });
    });
  });
});
