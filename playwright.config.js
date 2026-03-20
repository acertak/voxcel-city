import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: false,
    viewport: { width: 1600, height: 900 },
    launchOptions: {
      args: ["--use-angle=metal", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
