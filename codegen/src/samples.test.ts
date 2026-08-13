import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3_1 } from "openapi-types";
import { describe, expect, it } from "vitest";
import { buildSampleCatalog, readSDKVersion } from "./samples";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function catalog() {
  const spec = (await SwaggerParser.parse(
    resolve(repositoryRoot, "openapi.json"),
  )) as OpenAPIV3_1.Document;
  return buildSampleCatalog(
    spec,
    readSDKVersion(resolve(repositoryRoot, "sdk/package.json")),
  );
}

describe("code sample catalog", () => {
  it("prefers a whole-request example over property examples", () => {
    const spec: OpenAPIV3_1.Document = {
      openapi: "3.1.0",
      info: { title: "Samples", version: "1.0.0" },
      paths: {
        "/samples": {
          post: {
            operationId: "CreateSample",
            tags: ["Samples"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["selected", "missing"],
                    properties: {
                      selected: {
                        type: "string",
                        example: "property-selected",
                      },
                      missing: { type: "string", example: "property-missing" },
                    },
                  },
                  example: { selected: "request-selected" },
                },
              },
            },
            responses: { "204": { description: "Created" } },
          },
        },
      },
    };

    const generated = buildSampleCatalog(spec, "test").samples[0]?.sample;
    expect(generated).toContain('"selected": "request-selected"');
    expect(generated).toContain('"missing": "example"');
    expect(generated).not.toContain("property-");
  });

  it("is deterministic and follows the portal contract", async () => {
    const first = await catalog();
    const second = await catalog();

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first).toMatchObject({
      schemaVersion: 1,
      language: "typescript",
      sdk: { module: "@sumup/sdk" },
      openAPIVersion: "1.0.0",
    });
    expect(first.sdk.version).toBe(
      readSDKVersion(resolve(repositoryRoot, "sdk/package.json")),
    );
    expect(first.samples).toHaveLength(49);
    expect(
      new Set(first.samples.map((sample) => sample.operationId)),
    ).toHaveProperty("size", 42);
    expect(first.samples.filter((sample) => sample.example)).toHaveLength(9);
    expect(new Set(first.samples.map((sample) => sample.id)).size).toBe(
      first.samples.length,
    );
    expect(first.samples.map((sample) => sample.id)).toEqual(
      [...first.samples.map((sample) => sample.id)].sort(),
    );

    const hosted = first.samples.find(
      (sample) => sample.id === "CreateCheckout.HostedCheckout",
    );
    expect(hosted?.sample).toContain("client.checkouts.create(");
    expect(hosted?.sample).toContain(
      '"checkout_reference": "b50pr914-6k0e-3091-a592-890010285b3d"',
    );
    expect(JSON.stringify(hosted)).toContain('"sample"');
  });

  it("type-checks every program against the local SDK", async () => {
    const generated = await catalog();
    const output = mkdtempSync(join(tmpdir(), "sumup-ts-code-samples-"));

    try {
      generated.samples.forEach((sample, index) => {
        writeFileSync(join(output, `sample-${index}.ts`), sample.sample);
      });
      writeFileSync(
        join(output, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "Bundler",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            paths: {
              "@sumup/sdk": [
                relative(output, resolve(repositoryRoot, "sdk/src/index.ts")),
              ],
            },
            types: ["node"],
            typeRoots: [resolve(repositoryRoot, "codegen/node_modules/@types")],
          },
          include: ["*.ts"],
        }),
      );

      const result = spawnSync(
        process.execPath,
        [
          resolve(repositoryRoot, "codegen/node_modules/typescript/bin/tsc"),
          "-p",
          join(output, "tsconfig.json"),
        ],
        { encoding: "utf8" },
      );
      expect(`${result.stdout}${result.stderr}`).toBe("");
      expect(result.status).toBe(0);
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 120_000);
});
