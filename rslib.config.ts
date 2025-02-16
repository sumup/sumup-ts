import { defineConfig } from "@rslib/core";

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
    },
    {
      format: "cjs",
    },
  ],
  output: {
    cleanDistPath: true,
    sourceMap: true,
    target: "node",
  },
});
