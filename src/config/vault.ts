import { accessSync, constants, statSync } from "fs";
import { resolve } from "path";

/**
 * Configuration for Obsidian vault access
 */
export interface VaultConfig {
  /** Absolute path to the Obsidian vault directory */
  path: string;
}

/**
 * Custom error for vault configuration issues
 */
export class VaultConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultConfigError";
  }
}

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
 * Validates that the environment variable is set and not empty
 * @throws {VaultConfigError} If OBSIDIAN_VAULT_PATH is not set or empty
 */
function validateEnvironmentVariable(vaultPath: string | undefined): string {
  if (!vaultPath) {
    throw new VaultConfigError(
      "OBSIDIAN_VAULT_PATH environment variable is required"
    );
  }
  return vaultPath;
}

/**
 * Validates that a path exists and is readable
 * @throws {VaultConfigError} If path doesn't exist or is not readable
 */
function validatePathAccessibility(absolutePath: string): void {
  try {
    accessSync(absolutePath, constants.R_OK);
  } catch (error) {
    if (isErrnoException(error)) {
      if (error.code === "ENOENT") {
        throw new VaultConfigError(
          `Vault path does not exist: ${absolutePath}`
        );
      }
      /* c8 ignore next 3 */
      if (error.code === "EACCES") {
        throw new VaultConfigError(
          `Vault path is not readable (permission denied): ${absolutePath}`
        );
      }
    }
    /* c8 ignore next 3 */
    throw new VaultConfigError(
      `Cannot access vault path: ${absolutePath} - ${(error as Error).message}`
    );
  }
}

/**
 * Validates that a path is a directory
 * @throws {VaultConfigError} If path is not a directory
 */
function validateIsDirectory(absolutePath: string): void {
  try {
    const stats = statSync(absolutePath);
    if (!stats.isDirectory()) {
      throw new VaultConfigError(
        `Vault path is not a directory: ${absolutePath}`
      );
    }
  } catch (error) {
    if (error instanceof VaultConfigError) {
      throw error;
    }
    /* c8 ignore next 3 */
    throw new VaultConfigError(
      `Cannot verify vault path: ${absolutePath} - ${(error as Error).message}`
    );
  }
}

/**
 * Validates and configures access to an Obsidian vault directory.
 *
 * @throws {VaultConfigError} If OBSIDIAN_VAULT_PATH is not set
 * @throws {VaultConfigError} If the vault path does not exist
 * @throws {VaultConfigError} If the vault path is not readable
 * @throws {VaultConfigError} If the vault path is not a directory
 * @returns VaultConfig with validated absolute path
 */
export function configureVault(): VaultConfig {
  const vaultPath = validateEnvironmentVariable(
    process.env.OBSIDIAN_VAULT_PATH
  );
  const absolutePath = resolve(vaultPath);

  validatePathAccessibility(absolutePath);
  validateIsDirectory(absolutePath);

  return {
    path: absolutePath,
  };
}
