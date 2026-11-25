#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { program } from "commander";
import { generateIndex } from "./api";
import { generateApiVersion } from "./api-version";
import { generateCore } from "./core";
import { generateEvents } from "./events";
import { generateResource } from "./resource";
import {
  buildSampleCatalog,
  readSDKVersion,
  writeSampleCatalog,
} from "./samples";
import { loadSpec } from "./spec";
import { resourceDirectory, resourceParents } from "./tag-hierarchy";
import { generateTypes } from "./types";

/**
 * Main code generation function.
 * Parses an OpenAPI specification and generates TypeScript client code.
 */
async function generate(
  specFile: string,
  destDir: string,
  jsrConfigFile?: string,
) {
  // destination directory is resolved relative to CWD
  const destDirAbs = resolve(process.cwd(), destDir);

  if (!existsSync(destDirAbs)) {
    throw new Error(`Error: destination directory does not exist.
  Argument given: ${destDirAbs}
  Resolved path:  ${destDirAbs}
`);
  }

  const spec = await loadSpec(specFile);
  const parents = resourceParents(spec);

  rmSync(resolve(destDirAbs, "resources"), { recursive: true, force: true });
  mkdirSync(resolve(destDirAbs, "resources"), { recursive: true });

  await generateApiVersion(spec, destDirAbs);
  await generateTypes(spec, destDirAbs);
  await generateIndex(spec, destDirAbs, parents);
  await generateEvents(spec, destDirAbs);
  await generateCore(spec, destDirAbs);
  const tags = spec.tags ?? [];
  for (const tag of tags) {
    await generateResource(tag, spec, destDirAbs, parents);
  }

  if (jsrConfigFile) {
    const config: { exports: string | Record<string, string> } = JSON.parse(
      readFileSync(jsrConfigFile, "utf8"),
    );
    const existing =
      typeof config.exports === "string"
        ? { ".": config.exports }
        : config.exports;
    const otherExports = Object.entries(existing).filter(
      ([name]) => !name.startsWith("./resources/"),
    );
    const resourceExports = tags
      .map(({ name }) =>
        ["resources", ...resourceDirectory(parents, name)].join("/"),
      )
      .sort()
      .map((path) => {
        const target = relative(
          dirname(resolve(jsrConfigFile)),
          resolve(destDirAbs, path, "index.ts"),
        )
          .split(sep)
          .join("/");
        return [`./${path}`, `./${target}`];
      });
    config.exports = Object.fromEntries([...otherExports, ...resourceExports]);
    writeFileSync(jsrConfigFile, `${JSON.stringify(config, null, 2)}\n`);
  }
}

program
  .name("@sumup/sumup-ts-codegen")
  .description("@sumup/sdk code generator")
  .argument("<specs>")
  .argument("<dir>")
  .option(
    "--jsr-config <file>",
    "update resource exports in a JSR package manifest",
  )
  .action(async (specs, dir, options: { jsrConfig?: string }) => {
    await generate(specs, dir, options.jsrConfig);
  });

program
  .command("samples")
  .description("generate TypeScript code samples as a JSON catalog")
  .argument("<specs>")
  .option("-o, --out <file>", "output JSON file (defaults to stdout)")
  .option("--sdk-version <version>", "SDK version represented by the samples")
  .option(
    "--sdk-version-file <file>",
    "package.json containing the SDK version",
    "../sdk/package.json",
  )
  .action(
    async (
      specs: string,
      options: {
        out?: string;
        sdkVersion?: string;
        sdkVersionFile: string;
      },
    ) => {
      const spec = await loadSpec(specs);
      const sdkVersion =
        options.sdkVersion || readSDKVersion(options.sdkVersionFile);
      writeSampleCatalog(buildSampleCatalog(spec, sdkVersion), options.out);
    },
  );

program.parse();
