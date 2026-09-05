#!/usr/bin/env node

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { program } from "commander";
import { generateIndex } from "./api";
import { generateApiVersion } from "./api-version";
import { generateCore } from "./core";
import { generateResource } from "./resource";
import {
  buildSampleCatalog,
  readSDKVersion,
  writeSampleCatalog,
} from "./samples";
import { loadSpec } from "./spec";
import { generateTypes } from "./types";

/**
 * Main code generation function.
 * Parses an OpenAPI specification and generates TypeScript client code.
 */
async function generate(specFile: string, destDir: string) {
  // destination directory is resolved relative to CWD
  const destDirAbs = resolve(process.cwd(), destDir);

  if (!existsSync(destDirAbs)) {
    throw new Error(`Error: destination directory does not exist.
  Argument given: ${destDirAbs}
  Resolved path:  ${destDirAbs}
`);
  }

  const spec = await loadSpec(specFile);

  rmSync(resolve(destDirAbs, "resources"), { recursive: true, force: true });
  mkdirSync(resolve(destDirAbs, "resources"), { recursive: true });

  await generateApiVersion(spec, destDirAbs);
  await generateTypes(spec, destDirAbs);
  await generateIndex(spec, destDirAbs);
  await generateCore(spec, destDirAbs);
  for (const t of spec.tags || []) {
    await generateResource(t, spec, destDirAbs);
  }
}

program
  .name("@sumup/sumup-ts-codegen")
  .description("@sumup/sdk code generator")
  .argument("<specs>")
  .argument("<dir>")
  .action(async (specs, dir) => {
    await generate(specs, dir);
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
