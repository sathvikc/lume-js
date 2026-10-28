import { defineConfig, devices } from '@playwright/test';

// Real-browser smoke tests over examples/ pages, served by the vite dev
// server (which maps 'lume-js' imports to src/). Chromium only: this proves
// the library works in a real engine, not the Chrome 80 / Firefox 74 /
// Safari 13.1 floor, which stays a matter of discipline and review.
const PORT = 5179;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --open false`,
    url: `http://localhost:${PORT}/examples/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
