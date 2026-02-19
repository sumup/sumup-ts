#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import { program } from "commander";
import type { OpenAPIV3_1 } from "openapi-types";
import { generateIndex } from "./api";
import { generateApiVersion } from "./api-version";
import { generateCore } from "./core";
import { generateResource } from "./resource";
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

  const rawSpec = await SwaggerParser.parse(specFile);
  if (!("openapi" in rawSpec) || !rawSpec.openapi.startsWith("3.0")) {
    throw new Error("Only OpenAPI 3.0 is currently supported");
  }

  // we're not actually changing anything from rawSpec to spec, we've
  // just ruled out v2 and v3.1
  const spec = rawSpec as OpenAPIV3_1.Document;

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

program.parse();
