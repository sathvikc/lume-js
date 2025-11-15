import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'examples', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['examples/**', 'scripts/**', 'vite.config.js']
    }
  },
  resolve: {
    alias: {
      src: srcPath,
    }
  }
});
