import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["tests/runtime-smoke.browser.ts"],
  browser: {
    enabled: true,
    provider: "playwright",
    browser: "chromium",
    headless: true,
  },
});
