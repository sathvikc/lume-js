import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    // A failing assertion must not leak console/Storage spies into later
    // tests — inline mockRestore() calls only run when the test passes.
    restoreMocks: true,
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'examples', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['examples/**', 'scripts/**', 'vite.config.js'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    }
  },
  resolve: {
    alias: {
      src: srcPath,
    }
  }
});
