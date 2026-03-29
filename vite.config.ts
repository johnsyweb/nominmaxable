/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  base: "/nominmaxable/",
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
