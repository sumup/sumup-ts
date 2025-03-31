import { defineConfig } from "@rslib/core";
import { pluginPublint } from "rsbuild-plugin-publint";

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      redirect: {
        dts: {
          extension: true,
        },
      },
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
  plugins: [pluginPublint()],
});
