import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // The smoke suites mount the real app, so they need a DOM and a single
    // fork; the chemistry and orbital suites are pure numerics and stay in
    // node, where jsdom's environment setup alone would cost ~2 minutes.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
