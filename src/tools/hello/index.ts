import { z } from "zod";
import type { ToolDefinition } from "../types.js";

/**
 * Hello tool - A simple greeting tool for demonstration and testing.
 * Returns a personalized greeting message.
 */
export const helloTool: ToolDefinition = {
  name: "hello",
  config: {
    title: "Hello Tool",
    description: "Returns a hello world greeting",
    inputSchema: {
      name: z.string().optional().describe("Name to greet"),
    },
    outputSchema: {
      greeting: z.string(),
    },
  },
  handler: ({ name }) => {
    const greeting = `Hello, ${(name as string | undefined) || "World"}!`;
    const output = { greeting };

    return Promise.resolve({
      content: [
        {
          type: "text",
          text: greeting,
        },
      ],
      structuredContent: output,
    });
  },
};
