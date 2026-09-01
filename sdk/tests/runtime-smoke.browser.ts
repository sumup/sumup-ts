import { it } from "@rstest/core";

import { runRuntimeSmoke } from "./runtime-smoke";

it("uses the built SDK in Chromium", async () => {
  await runRuntimeSmoke("browser");
});
