import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [
      "./src/test/setup.ts", // Any global test setup can be added here if needed.
    ],
  },
});
