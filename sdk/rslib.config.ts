import { defineConfig } from "@rslib/core";
import { pluginPublint } from "rsbuild-plugin-publint";

export default defineConfig({
  lib: [
    {
      format: "esm",
      syntax: "es2022",
      dts: true,
      output: {
        target: "web",
      },
    },
    {
      format: "cjs",
      syntax: "es2022",
      dts: {
        autoExtension: true,
      },
    },
  ],
  output: {
    cleanDistPath: true,
    sourceMap: true,
    target: "node",
  },
  plugins: [pluginPublint()],
});
