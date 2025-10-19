import { readdir } from "fs/promises";
import { join, basename, extname } from "path";

export class FileDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileDiscoveryError";
  }
}

const MARKDOWN_EXTENSIONS = [".md", ".markdown"];

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  );
}

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function matchesFilename(filePath: string, searchTerm: string): boolean {
  const fileName = basename(filePath);
  const fileNameLower = fileName.toLowerCase();
  const searchLower = searchTerm.toLowerCase();

  if (fileNameLower === searchLower) {
    return true;
  }

  const fileExt = extname(fileName).toLowerCase();
  const searchExt = extname(searchTerm).toLowerCase();

  if (!MARKDOWN_EXTENSIONS.includes(fileExt)) {
    return false;
  }

  if (!searchExt) {
    const nameWithoutExt = fileName.slice(0, -fileExt.length);
    return nameWithoutExt.toLowerCase() === searchLower;
  }

  return false;
}

async function searchDirectory(
  dirPath: string,
  searchTerm: string,
  matches: string[]
): Promise<void> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (isHidden(entry.name)) {
        continue;
      }

      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await searchDirectory(fullPath, searchTerm, matches);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (
          MARKDOWN_EXTENSIONS.includes(ext) &&
          matchesFilename(fullPath, searchTerm)
        ) {
          matches.push(fullPath);
        }
      }
    }
  } catch (error) {
    /* c8 ignore next 5 */
    if (isErrnoException(error) && error.code === "EACCES") {
      console.error(
        `Warning: Permission denied accessing directory: ${dirPath}`
      );
      return;
    }
    throw error;
  }
}

/**
 * Finds a markdown file in the Obsidian vault by name.
 *
 * @param vaultPath - Absolute path to the Obsidian vault directory
 * @param filename - Name of the file to search for (with or without extension)
 * @returns Absolute path to the first matching file, or null if not found
 * @throws {FileDiscoveryError} If there's an error accessing the vault directory
 */
export async function findFile(
  vaultPath: string,
  filename: string
): Promise<string | null> {
  const matches: string[] = [];

  try {
    await searchDirectory(vaultPath, filename, matches);
  } catch (error) {
    if (isErrnoException(error)) {
      if (error.code === "ENOENT") {
        throw new FileDiscoveryError(
          `Vault directory does not exist: ${vaultPath}`
        );
      }
      /* c8 ignore next 3 */
      if (error.code === "EACCES") {
        throw new FileDiscoveryError(
          `Permission denied accessing vault: ${vaultPath}`
        );
      }
    }
    throw new FileDiscoveryError(
      `Error searching vault: ${(error as Error).message}`
    );
  }

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    console.error(`Warning: Multiple files found matching '${filename}':`);
    matches.forEach((match) => console.error(`  - ${match}`));
    console.error(`Returning first match: ${matches[0]}`);
  }

  return matches[0];
}
