import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./artifacts/docs-site-test-results",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:4174",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm run preview --port 4174",
    url: "http://localhost:4174",
    env: {
      ZUDOKU_DISABLE_UPDATE_CHECK: "1",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
