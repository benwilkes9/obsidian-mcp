#!/usr/bin/env node

import { ObsidianMCPServer, VaultConfigError } from "./server.js";

async function main(): Promise<void> {
  const server = new ObsidianMCPServer();
  await server.run();
}

main().catch((error) => {
  // Handle vault configuration errors with clear messages
  if (error instanceof VaultConfigError) {
    console.error("Configuration error:", error.message);
    process.exit(1);
  }

  // Handle all other errors
  console.error("Server error:", error);
  process.exit(1);
});
