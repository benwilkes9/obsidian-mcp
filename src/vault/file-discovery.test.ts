import { writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { join } from "path";
import { findFile, FileDiscoveryError } from "./file-discovery.js";
import { createVaultTestEnvironment } from "../__tests__/test-utils.js";

describe("file discovery", () => {
  const vaultEnv = createVaultTestEnvironment("file-discovery");

  function cleanVault() {
    const entries = readdirSync(vaultEnv.validVaultPath);
    for (const entry of entries) {
      const fullPath = join(vaultEnv.validVaultPath, entry);
      rmSync(fullPath, { recursive: true, force: true });
    }
  }

  beforeAll(vaultEnv.setup);
  afterAll(vaultEnv.teardown);
  beforeEach(() => {
    vaultEnv.beforeEach();
    cleanVault();
  });
  afterEach(vaultEnv.afterEach);

  describe("BDD Scenario: Find file in root directory", () => {
    it("Given the vault contains a file 'notes.md' in the root, When searching for 'notes', Then the file should be found and the full path should be returned", async () => {
      const fileName = "notes.md";
      const filePath = join(vaultEnv.validVaultPath, fileName);
      writeFileSync(filePath, "# Notes");

      const result = await findFile(vaultEnv.validVaultPath, "notes");

      expect(result).toBe(filePath);
    });
  });

  describe("BDD Scenario: Find file in nested directory", () => {
    it("Given the vault structure /vault/projects/api/architecture.md, When searching for 'architecture', Then the file should be found and the full path should be returned", async () => {
      const nestedDir = join(vaultEnv.validVaultPath, "projects", "api");
      mkdirSync(nestedDir, { recursive: true });
      const filePath = join(nestedDir, "architecture.md");
      writeFileSync(filePath, "# Architecture");

      const result = await findFile(vaultEnv.validVaultPath, "architecture");

      expect(result).toBe(filePath);
    });
  });

  describe("BDD Scenario: Find file with .md extension specified", () => {
    it("Given the vault contains 'readme.md', When searching for 'readme.md', Then the file should be found", async () => {
      const filePath = join(vaultEnv.validVaultPath, "readme.md");
      writeFileSync(filePath, "# README");

      const result = await findFile(vaultEnv.validVaultPath, "readme.md");

      expect(result).toBe(filePath);
    });
  });

  describe("BDD Scenario: Find file without extension", () => {
    it("Given the vault contains 'readme.md', When searching for 'readme', Then the file should be found", async () => {
      const filePath = join(vaultEnv.validVaultPath, "readme.md");
      writeFileSync(filePath, "# README");

      const result = await findFile(vaultEnv.validVaultPath, "readme");

      expect(result).toBe(filePath);
    });
  });

  describe("BDD Scenario: Case-insensitive search", () => {
    it("Given the vault contains 'UserStory.md', When searching for 'userstory', Then the file should be found", async () => {
      const filePath = join(vaultEnv.validVaultPath, "UserStory.md");
      writeFileSync(filePath, "# User Story");

      const result = await findFile(vaultEnv.validVaultPath, "userstory");

      expect(result).toBe(filePath);
    });

    it("Given the vault contains 'userstory.md', When searching for 'UserStory', Then the file should be found", async () => {
      const filePath = join(vaultEnv.validVaultPath, "userstory.md");
      writeFileSync(filePath, "# User Story");

      const result = await findFile(vaultEnv.validVaultPath, "UserStory");

      expect(result).toBe(filePath);
    });

    it("Given the vault contains 'NOTES.md', When searching for 'notes', Then the file should be found", async () => {
      const filePath = join(vaultEnv.validVaultPath, "NOTES.md");
      writeFileSync(filePath, "# NOTES");

      const result = await findFile(vaultEnv.validVaultPath, "notes");

      expect(result).toBe(filePath);
    });
  });

  describe("BDD Scenario: Ignore hidden directories", () => {
    it("Given the vault structure /vault/.obsidian/config.json and /vault/notes.md, When searching for files, Then .obsidian directory should be skipped and only notes.md should be discoverable", async () => {
      const hiddenDir = join(vaultEnv.validVaultPath, ".obsidian");
      mkdirSync(hiddenDir, { recursive: true });
      writeFileSync(join(hiddenDir, "config.md"), "# Hidden Config");

      const visibleFile = join(vaultEnv.validVaultPath, "notes.md");
      writeFileSync(visibleFile, "# Notes");

      const notesResult = await findFile(vaultEnv.validVaultPath, "notes");
      expect(notesResult).toBe(visibleFile);

      const configResult = await findFile(vaultEnv.validVaultPath, "config");
      expect(configResult).toBeNull();
    });

    it("should skip all hidden files and directories starting with .", async () => {
      writeFileSync(join(vaultEnv.validVaultPath, ".hidden.md"), "hidden");
      writeFileSync(join(vaultEnv.validVaultPath, ".DS_Store"), "system");

      const hiddenSubdir = join(vaultEnv.validVaultPath, ".git");
      mkdirSync(hiddenSubdir, { recursive: true });
      writeFileSync(join(hiddenSubdir, "internal.md"), "git internal");

      const hiddenResult = await findFile(vaultEnv.validVaultPath, "hidden");
      const internalResult = await findFile(
        vaultEnv.validVaultPath,
        "internal"
      );

      expect(hiddenResult).toBeNull();
      expect(internalResult).toBeNull();
    });
  });

  describe("BDD Scenario: File not found", () => {
    it("Given the vault does not contain 'missing.md', When searching for 'missing', Then no file should be found and null should be returned", async () => {
      const result = await findFile(vaultEnv.validVaultPath, "missing");

      expect(result).toBeNull();
    });
  });

  describe("BDD Scenario: Multiple files with same name", () => {
    it("Given the vault structure /vault/project-a/notes.md and /vault/project-b/notes.md, When searching for 'notes', Then the first matching file found should be returned", async () => {
      const dirA = join(vaultEnv.validVaultPath, "project-a");
      const dirB = join(vaultEnv.validVaultPath, "project-b");
      mkdirSync(dirA, { recursive: true });
      mkdirSync(dirB, { recursive: true });

      const fileA = join(dirA, "notes.md");
      const fileB = join(dirB, "notes.md");
      writeFileSync(fileA, "# Notes A");
      writeFileSync(fileB, "# Notes B");

      const result = await findFile(vaultEnv.validVaultPath, "notes");

      expect(result).toBeDefined();
      expect([fileA, fileB]).toContain(result);
    });

    // In production, the warning is logged to stderr for debugging
  });

  describe("acceptance criteria: searches all subdirectories recursively", () => {
    it("should find files in deeply nested directories", async () => {
      const deepDir = join(
        vaultEnv.validVaultPath,
        "level1",
        "level2",
        "level3",
        "level4"
      );
      mkdirSync(deepDir, { recursive: true });
      const deepFile = join(deepDir, "deep-note.md");
      writeFileSync(deepFile, "# Deep Note");

      const result = await findFile(vaultEnv.validVaultPath, "deep-note");

      expect(result).toBe(deepFile);
    });

    it("should search across multiple subdirectory branches", async () => {
      const branchA = join(vaultEnv.validVaultPath, "branch-a", "sub-a");
      const branchB = join(vaultEnv.validVaultPath, "branch-b", "sub-b");
      mkdirSync(branchA, { recursive: true });
      mkdirSync(branchB, { recursive: true });

      writeFileSync(join(branchA, "file-a.md"), "# File A");
      writeFileSync(join(branchB, "file-b.md"), "# File B");

      const resultA = await findFile(vaultEnv.validVaultPath, "file-a");
      const resultB = await findFile(vaultEnv.validVaultPath, "file-b");

      expect(resultA).toContain("file-a.md");
      expect(resultB).toContain("file-b.md");
    });
  });

  describe("acceptance criteria: handles both .md and .markdown extensions", () => {
    it("should find .md files", async () => {
      const mdFile = join(vaultEnv.validVaultPath, "standard.md");
      writeFileSync(mdFile, "# Standard");

      const result = await findFile(vaultEnv.validVaultPath, "standard");

      expect(result).toBe(mdFile);
    });

    it("should find .markdown files", async () => {
      const markdownFile = join(vaultEnv.validVaultPath, "long-ext.markdown");
      writeFileSync(markdownFile, "# Long Extension");

      const result = await findFile(vaultEnv.validVaultPath, "long-ext");

      expect(result).toBe(markdownFile);
    });

    it("should find both extensions when mixed in vault", async () => {
      const mdFile = join(vaultEnv.validVaultPath, "note-md.md");
      const markdownFile = join(
        vaultEnv.validVaultPath,
        "note-markdown.markdown"
      );
      writeFileSync(mdFile, "# MD");
      writeFileSync(markdownFile, "# Markdown");

      const mdResult = await findFile(vaultEnv.validVaultPath, "note-md");
      const markdownResult = await findFile(
        vaultEnv.validVaultPath,
        "note-markdown"
      );

      expect(mdResult).toBe(mdFile);
      expect(markdownResult).toBe(markdownFile);
    });

    it("should ignore non-markdown files", async () => {
      writeFileSync(join(vaultEnv.validVaultPath, "text.txt"), "text");
      writeFileSync(join(vaultEnv.validVaultPath, "doc.docx"), "doc");
      writeFileSync(join(vaultEnv.validVaultPath, "image.png"), "image");
      writeFileSync(join(vaultEnv.validVaultPath, "note.md"), "# Note");

      const txtResult = await findFile(vaultEnv.validVaultPath, "text");
      const docResult = await findFile(vaultEnv.validVaultPath, "doc");
      const imgResult = await findFile(vaultEnv.validVaultPath, "image");

      expect(txtResult).toBeNull();
      expect(docResult).toBeNull();
      expect(imgResult).toBeNull();

      const mdResult = await findFile(vaultEnv.validVaultPath, "note");
      expect(mdResult).toContain("note.md");
    });
  });

  describe("acceptance criteria: returns full absolute path to found file", () => {
    it("should return absolute path, not relative path", async () => {
      const fileName = "absolute-test.md";
      const absolutePath = join(vaultEnv.validVaultPath, fileName);
      writeFileSync(absolutePath, "# Test");

      const result = await findFile(vaultEnv.validVaultPath, "absolute-test");

      expect(result).toBe(absolutePath);
      expect(
        result?.startsWith("/") || result?.match(/^[A-Z]:\\/)
      ).toBeTruthy(); // Unix or Windows absolute
    });

    it("should return full path including subdirectories", async () => {
      const subDir = join(vaultEnv.validVaultPath, "projects", "docs");
      mkdirSync(subDir, { recursive: true });
      const fullPath = join(subDir, "spec.md");
      writeFileSync(fullPath, "# Spec");

      const result = await findFile(vaultEnv.validVaultPath, "spec");

      expect(result).toBe(fullPath);
      expect(result).toContain("projects");
      expect(result).toContain("docs");
    });
  });

  describe("error handling", () => {
    it("should throw FileDiscoveryError when vault directory does not exist", async () => {
      const nonExistentPath = join(vaultEnv.testDir, "non-existent-vault");

      // Act & Assert: Error thrown
      await expect(findFile(nonExistentPath, "any-file")).rejects.toThrow(
        FileDiscoveryError
      );
      await expect(findFile(nonExistentPath, "any-file")).rejects.toThrow(
        /Vault directory does not exist:/
      );
    });

    it("should include vault path in error message", async () => {
      const nonExistentPath = join(vaultEnv.testDir, "missing-vault");

      // Act & Assert: Error includes path
      await expect(findFile(nonExistentPath, "test")).rejects.toThrow(
        nonExistentPath
      );
    });

    it("should throw FileDiscoveryError, not generic Error", async () => {
      const invalidPath = join(vaultEnv.testDir, "invalid");

      // Act & Assert: Specific error type
      try {
        await findFile(invalidPath, "test");
        fail("Should have thrown FileDiscoveryError");
      } catch (error) {
        expect(error).toBeInstanceOf(FileDiscoveryError);
        expect(error).toBeInstanceOf(Error);
        expect((error as FileDiscoveryError).name).toBe("FileDiscoveryError");
      }
    });

    it("should wrap generic errors in FileDiscoveryError", async () => {
      const invalidPath = "\x00invalid-path-with-null";

      await expect(findFile(invalidPath, "test")).rejects.toThrow(
        FileDiscoveryError
      );
      await expect(findFile(invalidPath, "test")).rejects.toThrow(
        /Error searching vault:/
      );
    });
  });

  describe("edge cases", () => {
    it("should handle filenames with spaces", async () => {
      const filePath = join(vaultEnv.validVaultPath, "My Notes.md");
      writeFileSync(filePath, "# My Notes");

      const result = await findFile(vaultEnv.validVaultPath, "My Notes");

      expect(result).toBe(filePath);
    });

    it("should handle filenames with special characters", async () => {
      const filePath = join(
        vaultEnv.validVaultPath,
        "note-with-dashes_and_underscores.md"
      );
      writeFileSync(filePath, "# Special");

      const result = await findFile(
        vaultEnv.validVaultPath,
        "note-with-dashes_and_underscores"
      );

      expect(result).toBe(filePath);
    });

    it("should handle Unicode filenames", async () => {
      const filePath = join(vaultEnv.validVaultPath, "日本語ノート.md");
      writeFileSync(filePath, "# Japanese Notes");

      const result = await findFile(vaultEnv.validVaultPath, "日本語ノート");

      expect(result).toBe(filePath);
    });

    it("should handle empty vault gracefully", async () => {
      const result = await findFile(vaultEnv.validVaultPath, "anything");

      expect(result).toBeNull();
    });

    it("should handle search term with extension matching file without exact extension", async () => {
      const filePath = join(vaultEnv.validVaultPath, "test.md");
      writeFileSync(filePath, "# Test");

      const result = await findFile(vaultEnv.validVaultPath, "test.markdown");

      expect(result).toBeNull();
    });

    it("should handle very long filenames", async () => {
      const longName = "a".repeat(200);
      const filePath = join(vaultEnv.validVaultPath, `${longName}.md`);
      writeFileSync(filePath, "# Long Name");

      const result = await findFile(vaultEnv.validVaultPath, longName);

      expect(result).toBe(filePath);
    });

    it("should handle vaults with many files efficiently", async () => {
      for (let i = 0; i < 100; i++) {
        writeFileSync(
          join(vaultEnv.validVaultPath, `file-${i}.md`),
          `# File ${i}`
        );
      }
      const targetFile = join(vaultEnv.validVaultPath, "target.md");
      writeFileSync(targetFile, "# Target");

      const startTime = Date.now();
      const result = await findFile(vaultEnv.validVaultPath, "target");
      const duration = Date.now() - startTime;

      expect(result).toBe(targetFile);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe("matching behavior", () => {
    it("should match exact filename", async () => {
      // Arrange
      const filePath = join(vaultEnv.validVaultPath, "exact-match.md");
      writeFileSync(filePath, "# Exact");

      // Act
      const result = await findFile(vaultEnv.validVaultPath, "exact-match");

      // Assert
      expect(result).toBe(filePath);
    });

    it("should match filename without extension when searching with extension", async () => {
      // Arrange
      const filePath = join(vaultEnv.validVaultPath, "myfile.md");
      writeFileSync(filePath, "# My File");

      const resultWithExt = await findFile(
        vaultEnv.validVaultPath,
        "myfile.md"
      );
      const resultWithoutExt = await findFile(
        vaultEnv.validVaultPath,
        "myfile"
      );

      expect(resultWithExt).toBe(filePath);
      expect(resultWithoutExt).toBe(filePath);
    });

    it("should not match partial filenames", async () => {
      // Arrange
      const filePath = join(vaultEnv.validVaultPath, "architecture-doc.md");
      writeFileSync(filePath, "# Architecture");

      const result = await findFile(vaultEnv.validVaultPath, "architecture");

      expect(result).toBeNull();
    });

    it("should match case-insensitively for extension as well", async () => {
      // Arrange
      const filePath = join(vaultEnv.validVaultPath, "test.MD");
      writeFileSync(filePath, "# Test");

      const result = await findFile(vaultEnv.validVaultPath, "test.md");

      expect(result).toBe(filePath);
    });
  });

  describe("output consistency", () => {
    it("should return consistent results for same input", async () => {
      // Arrange
      const filePath = join(vaultEnv.validVaultPath, "consistent.md");
      writeFileSync(filePath, "# Consistent");

      const result1 = await findFile(vaultEnv.validVaultPath, "consistent");
      const result2 = await findFile(vaultEnv.validVaultPath, "consistent");
      const result3 = await findFile(vaultEnv.validVaultPath, "consistent");

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should return null consistently for non-existent files", async () => {
      const result1 = await findFile(vaultEnv.validVaultPath, "nonexistent");
      const result2 = await findFile(vaultEnv.validVaultPath, "nonexistent");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});
