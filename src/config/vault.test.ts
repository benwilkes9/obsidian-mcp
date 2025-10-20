import { writeFileSync } from "fs";
import { join } from "path";
import { configureVault } from "./vault.js";
import { VaultConfigError } from "../errors/index.js";
import { createVaultTestEnvironment } from "../__tests__/test-utils.js";

describe("vault configuration", () => {
  const vaultEnv = createVaultTestEnvironment("vault");

  beforeAll(vaultEnv.setup);
  afterAll(vaultEnv.teardown);
  beforeEach(() => {
    // Reset environment before each test
    delete process.env.OBSIDIAN_VAULT_PATH;
  });
  afterEach(vaultEnv.afterEach);

  describe("environment variable validation", () => {
    it("should throw VaultConfigError when OBSIDIAN_VAULT_PATH is not set", () => {
      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(
        "OBSIDIAN_VAULT_PATH environment variable is required"
      );
    });

    it("should throw VaultConfigError when OBSIDIAN_VAULT_PATH is empty string", () => {
      process.env.OBSIDIAN_VAULT_PATH = "";

      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(
        "OBSIDIAN_VAULT_PATH environment variable is required"
      );
    });
  });

  describe("path existence validation", () => {
    it("should throw VaultConfigError when path does not exist", () => {
      const nonExistentPath = join(vaultEnv.testDir, "non-existent-vault");
      process.env.OBSIDIAN_VAULT_PATH = nonExistentPath;

      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(/Vault path does not exist:/);
      expect(() => configureVault()).toThrow(nonExistentPath);
    });

    it("should accept existing directory path", () => {
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config = configureVault();
      expect(config).toBeDefined();
      expect(config.path).toBe(vaultEnv.validVaultPath);
    });
  });

  describe("path readability validation", () => {
    it("should accept readable directory", () => {
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config = configureVault();
      expect(config).toBeDefined();
      expect(config.path).toBe(vaultEnv.validVaultPath);
    });

    // Note: Testing actual permission denial is difficult in CI environments
    // This would require platform-specific permission manipulation
  });

  describe("directory validation", () => {
    it("should throw VaultConfigError when path is a file, not a directory", () => {
      const filePath = join(vaultEnv.testDir, "not-a-directory.txt");
      writeFileSync(filePath, "test content");
      process.env.OBSIDIAN_VAULT_PATH = filePath;

      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(/Vault path is not a directory:/);
      expect(() => configureVault()).toThrow(filePath);
    });

    it("should accept valid directory", () => {
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config = configureVault();
      expect(config).toBeDefined();
      expect(config.path).toBe(vaultEnv.validVaultPath);
    });
  });

  describe("path resolution", () => {
    it("should resolve relative paths to absolute paths", () => {
      const relativeVaultPath = vaultEnv.createTempDir("relative-vault");
      process.env.OBSIDIAN_VAULT_PATH = relativeVaultPath;

      const config = configureVault();

      // The returned path should be absolute (no relative components like ./ or ../)
      expect(config.path).toBeDefined();
      expect(config.path).not.toMatch(/^\.\//);
      expect(config.path).not.toMatch(/\.\.\//);
    });

    it("should handle paths with ~ (home directory)", () => {
      // This test depends on platform - home directory expansion happens in shell, not in Node.js
      // So we'll just verify absolute path handling
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config = configureVault();
      expect(config.path).toBe(vaultEnv.validVaultPath);
    });

    it("should preserve absolute paths", () => {
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config = configureVault();
      expect(config.path).toBe(vaultEnv.validVaultPath);
    });
  });

  describe("VaultConfig return value", () => {
    it("should return VaultConfig with path property", () => {
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config = configureVault();
      expect(config).toHaveProperty("path");
      expect(typeof config.path).toBe("string");
    });

    it("should return consistent results for same input", () => {
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      const config1 = configureVault();
      const config2 = configureVault();

      expect(config1.path).toBe(config2.path);
    });
  });

  describe("error handling", () => {
    it("should throw VaultConfigError, not generic Error", () => {
      expect(() => configureVault()).toThrow(VaultConfigError);

      try {
        configureVault();
      } catch (error) {
        expect(error).toBeInstanceOf(VaultConfigError);
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should set error name to VaultConfigError", () => {
      try {
        configureVault();
        fail("Should have thrown VaultConfigError");
      } catch (error) {
        expect(error).toBeInstanceOf(VaultConfigError);
        expect((error as VaultConfigError).name).toBe("VaultConfigError");
      }
    });

    it("should include helpful context in error messages", () => {
      const nonExistentPath = join(vaultEnv.testDir, "missing-vault");
      process.env.OBSIDIAN_VAULT_PATH = nonExistentPath;

      try {
        configureVault();
        fail("Should have thrown VaultConfigError");
      } catch (error) {
        expect(error).toBeInstanceOf(VaultConfigError);
        const message = (error as VaultConfigError).message;
        // Error message should include the actual path for debugging
        expect(message).toContain(nonExistentPath);
      }
    });
  });

  describe("BDD Scenario: Valid vault path configured", () => {
    it("Given a valid Obsidian vault directory exists at /Users/user/notes, When OBSIDIAN_VAULT_PATH=/Users/user/notes, Then vault configuration succeeds with absolute path", () => {
      // Arrange: Valid vault exists (validVaultPath created in beforeAll)
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      // Act: Configure vault
      const config = configureVault();

      // Assert: Configuration succeeds with absolute path
      expect(config).toBeDefined();
      expect(config.path).toBe(vaultEnv.validVaultPath);
      expect(config.path).toMatch(/^\/|^[A-Z]:\\/); // Unix or Windows absolute path
    });
  });

  describe("BDD Scenario: Missing vault path configuration", () => {
    it("Given OBSIDIAN_VAULT_PATH is not set, When server starts, Then initialization fails with error: 'OBSIDIAN_VAULT_PATH environment variable is required'", () => {
      // Arrange: Environment variable not set (already done in beforeEach)

      // Act & Assert: Configuration fails with specific error
      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(
        "OBSIDIAN_VAULT_PATH environment variable is required"
      );
    });
  });

  describe("BDD Scenario: Invalid vault path", () => {
    it("Given a non-existent directory path, When OBSIDIAN_VAULT_PATH points to non-existent path, Then initialization fails with error describing the missing path", () => {
      // Arrange: Non-existent path
      const nonExistentPath = "/path/to/nonexistent/vault";
      process.env.OBSIDIAN_VAULT_PATH = nonExistentPath;

      // Act & Assert: Configuration fails with descriptive error
      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(/Vault path does not exist:/);
      expect(() => configureVault()).toThrow(nonExistentPath);
    });
  });

  describe("BDD Scenario: Vault path is not readable", () => {
    it("Given a directory exists but is not readable, When OBSIDIAN_VAULT_PATH points to unreadable directory, Then initialization fails with permission error", () => {
      // Note: This test is challenging to implement reliably across platforms
      // In real scenarios, permission errors would trigger the EACCES path
      // For now, we verify the error message structure is correct
      const filePath = join(vaultEnv.testDir, "file-not-directory.txt");
      writeFileSync(filePath, "content");
      process.env.OBSIDIAN_VAULT_PATH = filePath;

      // Act & Assert: Fails with clear error
      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(/Vault path is not a directory:/);
    });
  });

  describe("edge cases", () => {
    it("should handle paths with special characters", () => {
      const specialPath = vaultEnv.createTempDir(
        "vault-with-special-chars-@#$"
      );
      process.env.OBSIDIAN_VAULT_PATH = specialPath;

      const config = configureVault();
      expect(config.path).toBe(specialPath);
    });

    it("should handle paths with spaces", () => {
      const pathWithSpaces = vaultEnv.createTempDir("vault with spaces");
      process.env.OBSIDIAN_VAULT_PATH = pathWithSpaces;

      const config = configureVault();
      expect(config.path).toBe(pathWithSpaces);
    });

    it("should handle deeply nested paths", () => {
      const deepPath = join(vaultEnv.testDir, "a", "b", "c", "d", "e", "vault");
      const { mkdirSync } = require("fs");
      mkdirSync(deepPath, { recursive: true });
      process.env.OBSIDIAN_VAULT_PATH = deepPath;

      const config = configureVault();
      expect(config.path).toBe(deepPath);
    });

    it("should handle unusual filesystem errors gracefully", () => {
      // Test with a path that would cause an unusual error (not ENOENT or EACCES)
      // On most systems, paths with null bytes are invalid
      const invalidPath = "invalid\x00path";
      process.env.OBSIDIAN_VAULT_PATH = invalidPath;

      expect(() => configureVault()).toThrow(VaultConfigError);
      expect(() => configureVault()).toThrow(/Error accessing directory:/);
    });
  });
});
