import { z } from "zod";
import { readFile, stat } from "fs/promises";
import type { ToolDefinition } from "../types.js";
import { findFile, FileDiscoveryError } from "../../vault/file-discovery.js";

/**
 * Custom error for file reading operations
 */
export class FileReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileReadError";
  }
}

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Type guard to check if an error is a Node.js ErrnoException
 */
function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  );
}

/**
 * Validates that a file doesn't exceed the maximum size limit
 * @throws {FileReadError} If file exceeds size limit
 */
async function validateFileSize(filePath: string): Promise<void> {
  try {
    const stats = await stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const limitMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw new FileReadError(
        `File exceeds size limit (${sizeMB}MB > ${limitMB}MB)`
      );
    }
  } catch (error) {
    if (error instanceof FileReadError) {
      throw error;
    }
    /* c8 ignore next 8 */
    if (isErrnoException(error)) {
      if (error.code === "ENOENT") {
        throw new FileReadError(`File not found: ${filePath}`);
      }
      if (error.code === "EACCES") {
        throw new FileReadError(`Permission denied reading file: ${filePath}`);
      }
    }
    /* c8 ignore next 3 */
    throw new FileReadError(
      `Error checking file size: ${(error as Error).message}`
    );
  }
}

/**
 * Reads the content of a file as UTF-8 text
 * @throws {FileReadError} If file cannot be read
 */
async function readFileContent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error) {
    /* c8 ignore next 12 */
    if (isErrnoException(error)) {
      if (error.code === "ENOENT") {
        throw new FileReadError(`File not found: ${filePath}`);
      }
      if (error.code === "EACCES") {
        throw new FileReadError(`Permission denied reading file: ${filePath}`);
      }
      if (error.code === "EISDIR") {
        throw new FileReadError(`Path is a directory, not a file: ${filePath}`);
      }
    }
    /* c8 ignore next 3 */
    throw new FileReadError(`Error reading file: ${(error as Error).message}`);
  }
}

/**
 * Read Obsidian File Tool - Reads and returns the content of a markdown file from the vault.
 *
 * This tool provides read-only access to markdown files in the configured Obsidian vault.
 * It supports case-insensitive filename matching, handles files with or without extensions,
 * and preserves all formatting including YAML frontmatter.
 */
export const readObsidianFileTool: ToolDefinition = {
  name: "read_obsidian_file",
  config: {
    title: "Read Obsidian File",
    description:
      "Reads and returns the full content of a markdown file from the Obsidian vault. Supports case-insensitive filename matching (with or without .md extension). Preserves all formatting including YAML frontmatter. Maximum file size: 10MB.",
    inputSchema: {
      filename: z
        .string()
        .describe(
          "Name of the markdown file to read (with or without .md extension). Example: 'user-story-1' or 'architecture.md'"
        ),
    },
    outputSchema: {
      content: z.string(),
      filename: z.string(),
      path: z.string(),
    },
  },
  handler: async (args) => {
    const { filename } = args as { filename: string };

    // Get vault path from environment
    // The vault path is validated on server initialization via configureVault()
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    if (!vaultPath) {
      const errorMsg =
        "OBSIDIAN_VAULT_PATH environment variable is not configured";
      return {
        content: [{ type: "text", text: `Error: ${errorMsg}` }],
        isError: true,
        structuredContent: { error: errorMsg },
      };
    }

    try {
      // Find the file in the vault using recursive search
      const filePath = await findFile(vaultPath, filename);

      if (!filePath) {
        const errorMsg = `File not found: ${filename}.md\nSearched in vault: ${vaultPath}\nTip: Check filename spelling or use list_files to see available files`;
        return {
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
          isError: true,
          structuredContent: { error: errorMsg },
        };
      }

      // Validate file size before reading
      await validateFileSize(filePath);

      // Read file content
      const content = await readFileContent(filePath);

      // Return both MCP-compliant content array and structured output
      const output = {
        content,
        filename,
        path: filePath,
      };

      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
        structuredContent: output,
      };
    } catch (error) {
      let errorMsg: string;

      if (error instanceof FileDiscoveryError) {
        errorMsg = `Vault access error: ${error.message}`;
      } else if (error instanceof FileReadError) {
        errorMsg = error.message;
      } else {
        /* c8 ignore next */
        errorMsg = `Unexpected error: ${(error as Error).message}`;
      }

      return {
        content: [{ type: "text", text: `Error: ${errorMsg}` }],
        isError: true,
        structuredContent: { error: errorMsg },
      };
    }
  },
};
