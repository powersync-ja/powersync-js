import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        include: [
            "packages/**/lib/esm/__tests__/**/*.test.js",
            "packages/**/lib/esm/__tests__/**/*.spec.js",
            "packages/**/src/__tests__/**/*.test.ts",
            "packages/**/src/__tests__/**/*.spec.ts",
            // Allow running inside an individual package (cwd) where test paths don't get prefixed by packages/**
            "src/__tests__/**/*.test.ts",
            "src/__tests__/**/*.spec.ts",
        ],
        exclude: [
            "node_modules",
            "**/frontend/**",
            "**/*.timestamp-*.mjs", // ignore vite timestamp artifacts that confuse vitest extension
        ],
        environment: "node",
        isolate: false,
        sequence: { concurrent: false, shuffle: false },
        hookTimeout: 120_000,
        testTimeout: 120_000,
        bail: 1,
        passWithNoTests: true,
        setupFiles: ["./vitest.setup.ts"],
        reporters: process.env.CI ? ["basic", "junit"] : ["default"],
        outputFile: process.env.CI
            ? { junit: "reports/vitest-junit.xml" }
            : undefined,
        coverage: { enabled: false },
    },
});
