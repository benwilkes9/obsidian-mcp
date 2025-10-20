import {
  ErrorCategory,
  CategorizedError,
  VaultConfigError,
  FileDiscoveryError,
  FileReadError,
  createFileNotFoundError,
  createPermissionError,
  createFileSizeError,
  isErrnoException,
  getErrorMessageForCode,
  formatErrorForMCP,
  logError,
} from "./index.js";

describe("error handling module", () => {
  describe("error categorization", () => {
    describe("VaultConfigError", () => {
      it("should be categorized as CONFIGURATION", () => {
        const error = new VaultConfigError("Test error");
        expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      });

      it("should be an instance of CategorizedError", () => {
        const error = new VaultConfigError("Test error");
        expect(error).toBeInstanceOf(CategorizedError);
      });

      it("should preserve error message", () => {
        const message = "OBSIDIAN_VAULT_PATH is required";
        const error = new VaultConfigError(message);
        expect(error.message).toBe(message);
      });

      it("should have correct error name", () => {
        const error = new VaultConfigError("Test error");
        expect(error.name).toBe("VaultConfigError");
      });
    });

    describe("FileDiscoveryError", () => {
      it("should be categorized as SYSTEM", () => {
        const error = new FileDiscoveryError("Test error");
        expect(error.category).toBe(ErrorCategory.SYSTEM);
      });

      it("should be an instance of CategorizedError", () => {
        const error = new FileDiscoveryError("Test error");
        expect(error).toBeInstanceOf(CategorizedError);
      });

      it("should preserve error message", () => {
        const message = "Vault directory does not exist";
        const error = new FileDiscoveryError(message);
        expect(error.message).toBe(message);
      });

      it("should have correct error name", () => {
        const error = new FileDiscoveryError("Test error");
        expect(error.name).toBe("FileDiscoveryError");
      });
    });

    describe("FileReadError", () => {
      it("should default to SYSTEM category", () => {
        const error = new FileReadError("Test error");
        expect(error.category).toBe(ErrorCategory.SYSTEM);
      });

      it("should accept custom category", () => {
        const error = new FileReadError("Test error", ErrorCategory.USER);
        expect(error.category).toBe(ErrorCategory.USER);
      });

      it("should support PERMISSION category", () => {
        const error = new FileReadError(
          "Permission denied",
          ErrorCategory.PERMISSION
        );
        expect(error.category).toBe(ErrorCategory.PERMISSION);
      });

      it("should be an instance of CategorizedError", () => {
        const error = new FileReadError("Test error");
        expect(error).toBeInstanceOf(CategorizedError);
      });

      it("should preserve error message", () => {
        const message = "File not found: test.md";
        const error = new FileReadError(message);
        expect(error.message).toBe(message);
      });

      it("should have correct error name", () => {
        const error = new FileReadError("Test error");
        expect(error.name).toBe("FileReadError");
      });
    });
  });

  describe("BDD Scenario: Helpful error for file not found", () => {
    it("should create file not found error with helpful tips", () => {
      // Given a missing file
      const filename = "missing-doc";
      const vaultPath = "/vault/path";

      // When creating a file not found error
      const error = createFileNotFoundError(filename, vaultPath);

      // Then the error should contain all helpful information
      expect(error.message).toContain("File not found: missing-doc.md");
      expect(error.message).toContain("Searched in vault: /vault/path");
      expect(error.message).toContain(
        "Tip: Check filename spelling or use list_files to see available files"
      );
      expect(error.category).toBe(ErrorCategory.USER);
    });

    it("should format error as multi-line message", () => {
      const error = createFileNotFoundError("test", "/vault");
      const lines = error.message.split("\n");
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("File not found");
      expect(lines[1]).toContain("Searched in vault");
      expect(lines[2]).toContain("Tip:");
    });
  });

  describe("BDD Scenario: Permission error clarity", () => {
    it("should create permission error for files with helpful tips", () => {
      // Given a file with no read permissions
      const filePath = "/vault/restricted.md";

      // When creating a permission error
      const error = createPermissionError(filePath, "file");

      // Then the error should contain helpful instructions
      expect(error.message).toContain("Permission denied reading file");
      expect(error.message).toContain(filePath);
      expect(error.message).toContain(
        "Check file permissions in your vault directory"
      );
      expect(error.category).toBe(ErrorCategory.PERMISSION);
    });

    it("should create permission error for directories", () => {
      const dirPath = "/vault/restricted-dir";
      const error = createPermissionError(dirPath, "directory");

      expect(error.message).toContain("Permission denied reading directory");
      expect(error.message).toContain(dirPath);
      expect(error.message).toContain(
        "Check directory permissions in your vault directory"
      );
    });

    it("should format error as multi-line message", () => {
      const error = createPermissionError("/vault/file.md", "file");
      const lines = error.message.split("\n");
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("Permission denied");
      expect(lines[1]).toContain("Check");
    });
  });

  describe("file size error helper", () => {
    it("should create file size error with size details", () => {
      // Given a file that exceeds the limit
      const actualSizeMB = "15.00";
      const limitMB = "10";

      // When creating a file size error
      const error = createFileSizeError(actualSizeMB, limitMB);

      // Then the error should show the comparison
      expect(error.message).toBe("File exceeds size limit (15.00MB > 10MB)");
      expect(error.category).toBe(ErrorCategory.USER);
    });

    it("should format sizes correctly", () => {
      const error = createFileSizeError("5.50", "5");
      expect(error.message).toContain("5.50MB > 5MB");
    });
  });

  describe("error code mapping", () => {
    describe("getErrorMessageForCode", () => {
      it("should map ENOENT for files", () => {
        const message = getErrorMessageForCode(
          "ENOENT",
          "/vault/test.md",
          "file"
        );
        expect(message).toBe("File not found: /vault/test.md");
      });

      it("should map ENOENT for directories", () => {
        const message = getErrorMessageForCode(
          "ENOENT",
          "/vault/dir",
          "directory"
        );
        expect(message).toBe("Directory does not exist: /vault/dir");
      });

      it("should map EACCES for files", () => {
        const message = getErrorMessageForCode(
          "EACCES",
          "/vault/test.md",
          "file"
        );
        expect(message).toBe(
          "Permission denied accessing file: /vault/test.md"
        );
      });

      it("should map EACCES for directories", () => {
        const message = getErrorMessageForCode(
          "EACCES",
          "/vault/dir",
          "directory"
        );
        expect(message).toBe(
          "Permission denied accessing directory: /vault/dir"
        );
      });

      it("should map EISDIR", () => {
        const message = getErrorMessageForCode("EISDIR", "/vault/dir", "file");
        expect(message).toBe("Path is a directory, not a file: /vault/dir");
      });

      it("should handle unknown error codes", () => {
        const message = getErrorMessageForCode(
          "UNKNOWN_CODE",
          "/vault/test.md",
          "file"
        );
        expect(message).toBe(
          "Error accessing file: /vault/test.md (UNKNOWN_CODE)"
        );
      });

      it("should default to file type", () => {
        const message = getErrorMessageForCode("ENOENT", "/path/file.md");
        expect(message).toContain("File not found");
      });

      it("should handle all error codes for both resource types", () => {
        // Test all error codes with both file and directory types
        const codes = ["ENOENT", "EACCES", "EISDIR"];
        const types: Array<"file" | "directory"> = ["file", "directory"];

        codes.forEach((code) => {
          types.forEach((type) => {
            const message = getErrorMessageForCode(code, "/test/path", type);
            expect(message).toBeTruthy();
            expect(message).toContain("/test/path");
          });
        });
      });
    });

    describe("isErrnoException type guard", () => {
      it("should return true for valid ErrnoException", () => {
        const error = { code: "ENOENT", message: "Test" };
        expect(isErrnoException(error)).toBe(true);
      });

      it("should return false for Error without code", () => {
        const error = new Error("Test");
        expect(isErrnoException(error)).toBe(false);
      });

      it("should return false for null", () => {
        expect(isErrnoException(null)).toBe(false);
      });

      it("should return false for undefined", () => {
        expect(isErrnoException(undefined)).toBe(false);
      });

      it("should return false for non-object", () => {
        expect(isErrnoException("error")).toBe(false);
        expect(isErrnoException(123)).toBe(false);
      });

      it("should return false for object with non-string code", () => {
        const error = { code: 123 };
        expect(isErrnoException(error)).toBe(false);
      });
    });
  });

  describe("MCP error formatting", () => {
    describe("formatErrorForMCP", () => {
      it("should format VaultConfigError correctly", () => {
        const error = new VaultConfigError("Config error");
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe("Config error");
        expect(formatted.category).toBe(ErrorCategory.CONFIGURATION);
        expect(formatted.isUserError).toBe(true);
      });

      it("should format FileDiscoveryError correctly", () => {
        const error = new FileDiscoveryError("Discovery error");
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe("Discovery error");
        expect(formatted.category).toBe(ErrorCategory.SYSTEM);
        expect(formatted.isUserError).toBe(false);
      });

      it("should format FileReadError with USER category as user error", () => {
        const error = new FileReadError("Not found", ErrorCategory.USER);
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe("Not found");
        expect(formatted.category).toBe(ErrorCategory.USER);
        expect(formatted.isUserError).toBe(true);
      });

      it("should format FileReadError with PERMISSION category as system error", () => {
        const error = new FileReadError(
          "Permission denied",
          ErrorCategory.PERMISSION
        );
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe("Permission denied");
        expect(formatted.category).toBe(ErrorCategory.PERMISSION);
        expect(formatted.isUserError).toBe(false);
      });

      it("should handle unknown Error instances", () => {
        const error = new Error("Unknown error");
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe("Unexpected error: Unknown error");
        expect(formatted.category).toBe(ErrorCategory.SYSTEM);
        expect(formatted.isUserError).toBe(false);
      });

      it("should handle non-Error objects", () => {
        const error = "String error";
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe("Unexpected error: String error");
        expect(formatted.category).toBe(ErrorCategory.SYSTEM);
        expect(formatted.isUserError).toBe(false);
      });

      it("should preserve original error message", () => {
        const originalMessage = "Detailed error message with context";
        const error = new FileReadError(originalMessage);
        const formatted = formatErrorForMCP(error);

        expect(formatted.message).toBe(originalMessage);
      });
    });
  });

  describe("BDD Scenario: Errors distinguish between user error and system error", () => {
    it("should mark USER category as user error", () => {
      const error = new FileReadError("File not found", ErrorCategory.USER);
      const formatted = formatErrorForMCP(error);
      expect(formatted.isUserError).toBe(true);
    });

    it("should mark CONFIGURATION category as user error", () => {
      const error = new VaultConfigError("Config missing");
      const formatted = formatErrorForMCP(error);
      expect(formatted.isUserError).toBe(true);
    });

    it("should mark SYSTEM category as system error", () => {
      const error = new FileDiscoveryError("System failure");
      const formatted = formatErrorForMCP(error);
      expect(formatted.isUserError).toBe(false);
    });

    it("should mark PERMISSION category as system error", () => {
      const error = new FileReadError(
        "Access denied",
        ErrorCategory.PERMISSION
      );
      const formatted = formatErrorForMCP(error);
      expect(formatted.isUserError).toBe(false);
    });
  });

  describe("error logging", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    describe("BDD Scenario: Errors logged with appropriate severity", () => {
      it("should log USER errors with category prefix", () => {
        const error = new FileReadError("File not found", ErrorCategory.USER);
        logError(error, "test_context");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[test_context]",
          "USER:",
          "File not found"
        );
      });

      it("should log CONFIGURATION errors with category prefix", () => {
        const error = new VaultConfigError("Config missing");
        logError(error, "test_context");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[test_context]",
          "CONFIGURATION:",
          "Config missing"
        );
      });

      it("should log SYSTEM errors with ERROR suffix and stack trace", () => {
        const error = new FileDiscoveryError("System failure");
        logError(error, "test_context");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[test_context]",
          "SYSTEM",
          "ERROR:",
          "System failure"
        );
        // Stack trace should be logged on second call
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      });

      it("should log PERMISSION errors with ERROR suffix and stack trace", () => {
        const error = new FileReadError(
          "Access denied",
          ErrorCategory.PERMISSION
        );
        logError(error, "test_context");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[test_context]",
          "PERMISSION",
          "ERROR:",
          "Access denied"
        );
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      });

      it("should log unknown errors with UNEXPECTED ERROR prefix", () => {
        const error = new Error("Unknown error");
        logError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "",
          "UNEXPECTED ERROR:",
          error
        );
      });

      it("should support logging without context", () => {
        const error = new FileReadError("Test error", ErrorCategory.USER);
        logError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith("", "USER:", "Test error");
      });

      it("should handle non-Error objects", () => {
        logError("String error", "context");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[context]",
          "UNEXPECTED ERROR:",
          "String error"
        );
      });
    });

    describe("BDD Scenario: No stack traces exposed to end users", () => {
      it("should not include stack traces in formatted MCP errors", () => {
        const error = new FileDiscoveryError("System error");
        const formatted = formatErrorForMCP(error);

        // MCP formatted error should only have message, not stack
        expect(formatted).toHaveProperty("message");
        expect(formatted).toHaveProperty("category");
        expect(formatted).toHaveProperty("isUserError");
        expect(formatted).not.toHaveProperty("stack");
      });

      it("should only log stack traces via console.error", () => {
        const error = new FileDiscoveryError("Test error");
        logError(error, "context");

        // Stack trace is logged but not returned
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });

  describe("acceptance criteria validation", () => {
    it("should provide actionable error messages", () => {
      const fileNotFound = createFileNotFoundError("test", "/vault");
      expect(fileNotFound.message).toContain("Tip:");

      const permission = createPermissionError("/vault/file.md", "file");
      expect(permission.message).toContain("Check file permissions");
    });

    it("should distinguish error categories", () => {
      expect(new VaultConfigError("test").category).toBe(
        ErrorCategory.CONFIGURATION
      );
      expect(new FileDiscoveryError("test").category).toBe(
        ErrorCategory.SYSTEM
      );
      expect(new FileReadError("test", ErrorCategory.USER).category).toBe(
        ErrorCategory.USER
      );
      expect(new FileReadError("test", ErrorCategory.PERMISSION).category).toBe(
        ErrorCategory.PERMISSION
      );
    });

    it("should never include stack traces in MCP responses", () => {
      const errors = [
        new VaultConfigError("config error"),
        new FileDiscoveryError("discovery error"),
        new FileReadError("read error", ErrorCategory.USER),
        new FileReadError("permission error", ErrorCategory.PERMISSION),
      ];

      errors.forEach((error) => {
        const formatted = formatErrorForMCP(error);
        expect(formatted).not.toHaveProperty("stack");
        expect(formatted.message).not.toContain("at ");
      });
    });

    it("should include helpful tips where relevant", () => {
      const fileNotFound = createFileNotFoundError("test", "/vault");
      expect(fileNotFound.message).toMatch(/tip|check|verify/i);

      const permission = createPermissionError("/vault/test.md", "file");
      expect(permission.message).toMatch(/check|permissions/i);
    });
  });
});
