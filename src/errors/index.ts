/**
 * Error Handling Module
 *
 * Provides centralized error types, categorization, and formatting utilities
 * to ensure consistent, actionable error messages across the MCP server.
 *
 * Design principles:
 * - Clear distinction between user errors and system errors
 * - Actionable error messages with helpful tips
 * - Context-aware error formatting
 * - MCP protocol compliance
 */

/**
 * Error categories for classification and handling
 */
export enum ErrorCategory {
  /** User-facing errors (file not found, invalid input, etc.) */
  USER = "USER",
  /** Configuration errors (missing env vars, invalid paths) */
  CONFIGURATION = "CONFIGURATION",
  /** Permission/access errors */
  PERMISSION = "PERMISSION",
  /** System-level errors (filesystem issues, unexpected errors) */
  SYSTEM = "SYSTEM",
}

/**
 * Base error class with categorization support
 */
export abstract class CategorizedError extends Error {
  abstract readonly category: ErrorCategory;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Configuration-related errors (server initialization, environment setup)
 */
export class VaultConfigError extends CategorizedError {
  readonly category = ErrorCategory.CONFIGURATION;

  constructor(message: string) {
    super(message);
  }
}

/**
 * File discovery and vault access errors
 */
export class FileDiscoveryError extends CategorizedError {
  readonly category = ErrorCategory.SYSTEM;

  constructor(message: string) {
    super(message);
  }
}

/**
 * File reading operation errors
 */
export class FileReadError extends CategorizedError {
  readonly category: ErrorCategory;

  constructor(message: string, category: ErrorCategory = ErrorCategory.SYSTEM) {
    super(message);
    this.category = category;
  }
}

/**
 * Helper function to create a file not found error with helpful tips
 */
export function createFileNotFoundError(
  filename: string,
  vaultPath: string
): FileReadError {
  const message = [
    `File not found: ${filename}.md`,
    `Searched in vault: ${vaultPath}`,
    "Tip: Check filename spelling or use list_files to see available files",
  ].join("\n");

  return new FileReadError(message, ErrorCategory.USER);
}

/**
 * Helper function to create a permission denied error with helpful tips
 */
export function createPermissionError(
  resource: string,
  resourceType: "file" | "directory" = "file"
): FileReadError {
  const message = [
    `Permission denied reading ${resourceType}: ${resource}`,
    `Check ${resourceType} permissions in your vault directory`,
  ].join("\n");

  return new FileReadError(message, ErrorCategory.PERMISSION);
}

/**
 * Helper function to create a file size limit error
 */
export function createFileSizeError(
  actualSizeMB: string,
  limitMB: string
): FileReadError {
  const message = `File exceeds size limit (${actualSizeMB}MB > ${limitMB}MB)`;
  return new FileReadError(message, ErrorCategory.USER);
}

/**
 * Type guard to check if an error is a Node.js ErrnoException
 */
export function isErrnoException(
  error: unknown
): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  );
}

/**
 * Maps Node.js error codes to user-friendly messages
 */
export function getErrorMessageForCode(
  code: string,
  resource: string,
  resourceType: "file" | "directory" = "file"
): string {
  switch (code) {
    case "ENOENT":
      return resourceType === "file"
        ? `File not found: ${resource}`
        : `Directory does not exist: ${resource}`;
    case "EACCES":
      return `Permission denied accessing ${resourceType}: ${resource}`;
    case "EISDIR":
      return `Path is a directory, not a file: ${resource}`;
    default:
      return `Error accessing ${resourceType}: ${resource} (${code})`;
  }
}

/**
 * Formats an error for MCP tool response
 * Returns both the error message and structured error object
 */
export function formatErrorForMCP(error: unknown): {
  message: string;
  category: ErrorCategory;
  isUserError: boolean;
} {
  if (error instanceof CategorizedError) {
    return {
      message: error.message,
      category: error.category,
      isUserError:
        error.category === ErrorCategory.USER ||
        error.category === ErrorCategory.CONFIGURATION,
    };
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : String(error);

  return {
    message: `Unexpected error: ${message}`,
    category: ErrorCategory.SYSTEM,
    isUserError: false,
  };
}

/**
 * Logs an error with appropriate severity based on category
 * Uses console.error (stderr) to avoid corrupting stdio protocol
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : "";

  if (error instanceof CategorizedError) {
    // User and configuration errors are logged as warnings (less severe)
    if (
      error.category === ErrorCategory.USER ||
      error.category === ErrorCategory.CONFIGURATION
    ) {
      console.error(prefix, error.category + ":", error.message);
    } else {
      // System and permission errors are logged with more detail
      console.error(prefix, error.category, "ERROR:", error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  } else {
    // Unknown errors get full stack traces
    console.error(prefix, "UNEXPECTED ERROR:", error);
  }
}
