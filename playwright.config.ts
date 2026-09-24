import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.DOCS_PREVIEW_PORT ?? 4174);

export default defineConfig({
  testDir: "./tests",
  outputDir: "./artifacts/docs-site-test-results",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm run preview --port ${port}`,
    url: `http://localhost:${port}`,
    env: {
      ZUDOKU_DISABLE_UPDATE_CHECK: "1",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
