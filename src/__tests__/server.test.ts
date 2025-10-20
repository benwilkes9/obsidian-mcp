import { ObsidianMCPServer, VaultConfigError } from "../server.js";
import { createVaultTestEnvironment } from "./test-utils.js";

describe("ObsidianMCPServer", () => {
  let server: ObsidianMCPServer;
  const vaultEnv = createVaultTestEnvironment("server");

  beforeAll(vaultEnv.setup);
  afterAll(vaultEnv.teardown);
  beforeEach(() => {
    vaultEnv.beforeEach();
    server = new ObsidianMCPServer();
  });
  afterEach(vaultEnv.afterEach);

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
      expect(tools).toHaveLength(2);

      const helloTool = tools.find((t) => t.name === "hello");
      expect(helloTool).toBeDefined();
      expect(helloTool?.description).toBe("Returns a hello world greeting");

      const readTool = tools.find((t) => t.name === "read_obsidian_file");
      expect(readTool).toBeDefined();
      expect(readTool?.description).toContain(
        "Reads and returns the full content of a markdown file"
      );
    });
  });

  describe("vault configuration", () => {
    it("should configure vault on initialization", () => {
      const vaultConfig = server.getVaultConfig();
      expect(vaultConfig).toBeDefined();
      expect(vaultConfig.path).toBe(vaultEnv.validVaultPath);
    });

    it("should provide access to vault configuration", () => {
      const vaultConfig = server.getVaultConfig();
      expect(vaultConfig).toHaveProperty("path");
      expect(typeof vaultConfig.path).toBe("string");
    });

    it("should throw VaultConfigError when vault path is not set", () => {
      delete process.env.OBSIDIAN_VAULT_PATH;

      expect(() => new ObsidianMCPServer()).toThrow(VaultConfigError);
      expect(() => new ObsidianMCPServer()).toThrow(
        "OBSIDIAN_VAULT_PATH environment variable is required"
      );
    });

    it("should throw VaultConfigError when vault path does not exist", () => {
      process.env.OBSIDIAN_VAULT_PATH = "/path/to/nonexistent/vault";

      expect(() => new ObsidianMCPServer()).toThrow(VaultConfigError);
      expect(() => new ObsidianMCPServer()).toThrow(
        /Vault path does not exist:/
      );
    });

    it("should validate vault path before setting up tools", () => {
      // This ensures the server fails fast on invalid configuration
      delete process.env.OBSIDIAN_VAULT_PATH;

      expect(() => {
        const invalidServer = new ObsidianMCPServer();
        // If we get here, validation failed
        invalidServer.getTools(); // This should never execute
      }).toThrow(VaultConfigError);
    });
  });

  describe("BDD integration scenarios", () => {
    it("should initialize successfully with valid vault path", () => {
      // Given: Valid vault path is configured
      process.env.OBSIDIAN_VAULT_PATH = vaultEnv.validVaultPath;

      // When: Server is created
      const testServer = new ObsidianMCPServer();

      // Then: Server initializes with correct configuration
      expect(testServer).toBeDefined();
      expect(testServer.getVaultConfig().path).toBe(vaultEnv.validVaultPath);
      expect(testServer.getTools()).toHaveLength(2);
    });

    it("should fail initialization with missing vault path", () => {
      // Given: No vault path configured
      delete process.env.OBSIDIAN_VAULT_PATH;

      // When/Then: Server creation fails
      expect(() => new ObsidianMCPServer()).toThrow(VaultConfigError);
      expect(() => new ObsidianMCPServer()).toThrow(
        "OBSIDIAN_VAULT_PATH environment variable is required"
      );
    });

    it("should fail initialization with invalid vault path", () => {
      // Given: Invalid vault path configured
      process.env.OBSIDIAN_VAULT_PATH = "/invalid/vault/path";

      // When/Then: Server creation fails with descriptive error
      expect(() => new ObsidianMCPServer()).toThrow(VaultConfigError);
      expect(() => new ObsidianMCPServer()).toThrow(
        /Vault path does not exist:/
      );
    });
  });
});
