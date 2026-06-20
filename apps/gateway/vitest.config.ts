import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "src/index.ts",
        "src/scripts/**",
        "src/shared/infra/**",
        "src/sockets/**",
      ],
    },
    setupFiles: [],
    // Ensure tests timeout reasonably
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@sockets": path.resolve(__dirname, "./src/sockets"),
    },
  },
});
