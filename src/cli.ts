#!/usr/bin/env node

import { ObsidianMCPServer } from "./server.js";

async function main(): Promise<void> {
  const server = new ObsidianMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
