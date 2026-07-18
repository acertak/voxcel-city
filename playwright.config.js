import { defineConfig } from "playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT || "3000";
const testBaseURL = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: testBaseURL,
    headless: false,
    viewport: { width: 1600, height: 900 },
    launchOptions: {
      args: ["--use-angle=metal", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: `PORT=${testPort} npm run preview`,
    url: testBaseURL,
    reuseExistingServer: true,
  },
});
