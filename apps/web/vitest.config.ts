import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
