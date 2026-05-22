import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'dist', 'template/**', 'smoke-output/**', '**/smoke*/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules', 'dist', 'template', 'vitest.config.ts'],
    },
  },
});
