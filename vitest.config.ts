import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      globals: true,
      include: ["tests/unit/**/*.spec.ts"],
      coverage: {
        reporter: ["text", "html"],
      },
    },
  }),
);
