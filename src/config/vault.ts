import { accessSync, constants, statSync } from "fs";
import { resolve } from "path";
import {
  VaultConfigError,
  isErrnoException,
  getErrorMessageForCode,
} from "../errors/index.js";

/**
 * Configuration for Obsidian vault access
 */
export interface VaultConfig {
  /** Absolute path to the Obsidian vault directory */
  path: string;
}

/**
 * Validates that the environment variable is set and not empty
 * @throws {VaultConfigError} If OBSIDIAN_VAULT_PATH is not set or empty
 */
function validateEnvironmentVariable(vaultPath: string | undefined): string {
  if (!vaultPath) {
    throw new VaultConfigError(
      [
        "OBSIDIAN_VAULT_PATH environment variable is required",
        "Set this variable to the absolute path of your Obsidian vault directory",
        'Example: export OBSIDIAN_VAULT_PATH="/Users/username/Documents/Vault"',
      ].join("\n")
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
          [
            `Vault path does not exist: ${absolutePath}`,
            "Verify the path exists and OBSIDIAN_VAULT_PATH is set correctly",
          ].join("\n")
        );
      }
      if (error.code === "EACCES") {
        throw new VaultConfigError(
          [
            `Vault path is not readable (permission denied): ${absolutePath}`,
            "Check directory permissions: chmod +r on the vault directory",
          ].join("\n")
        );
      }
      const friendlyMessage = getErrorMessageForCode(
        error.code ?? "UNKNOWN",
        absolutePath,
        "directory"
      );
      throw new VaultConfigError(friendlyMessage);
    }
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
