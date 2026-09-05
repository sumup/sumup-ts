import { defineConfig } from "@rslib/core";
import { pluginPublint } from "rsbuild-plugin-publint";

export default defineConfig({
  lib: [
    {
      format: "esm",
      syntax: "es2022",
      dts: {
        autoExtension: true,
      },
      redirect: { dts: { path: true, extension: true } },
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
      redirect: { dts: { path: true, extension: true } },
    },
  ],
  output: {
    cleanDistPath: true,
    sourceMap: true,
    target: "node",
  },
  plugins: [pluginPublint()],
});
