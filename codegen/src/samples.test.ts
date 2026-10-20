import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@rstest/core";
import type { Document } from "./openapi";
import { buildSampleCatalog, readSDKVersion } from "./samples";
import { loadSpec } from "./spec";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function catalog() {
  const spec = await loadSpec(resolve(repositoryRoot, "openapi.json"));
  return buildSampleCatalog(
    spec,
    readSDKVersion(resolve(repositoryRoot, "sdk/package.json")),
  );
}

describe("code sample catalog", () => {
  it("prefers a whole-request example over property examples", () => {
    const spec: Document = {
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

  it("uses 3.1 examples and nullable types in request samples", () => {
    const spec: Document = {
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
                    required: ["count", "empty", "kind"],
                    properties: {
                      count: { type: ["integer", "null"] },
                      empty: { type: ["string", "null"], examples: [null] },
                      kind: { const: "fixed" },
                      details: {
                        type: ["object", "null"],
                        examples: [{ enabled: false }],
                        properties: { enabled: { type: "boolean" } },
                      },
                    },
                  },
                },
              },
            },
            responses: { "204": { description: "Created" } },
          },
        },
      },
    };
    const generated = buildSampleCatalog(spec, "test").samples[0]?.sample;
    expect(generated).toContain('"count": 1');
    expect(generated).toContain('"empty": null');
    expect(generated).toContain('"kind": "fixed"');
    expect(generated).toContain('"enabled": false');
  });

  it("is deterministic and follows the portal contract", () => {
    const spec: Document = {
      openapi: "3.1.0",
      info: { title: "Samples", version: "test-api" },
      paths: {
        "/samples": {
          get: {
            operationId: "ListSamples",
            tags: ["Samples"],
            responses: { "200": { description: "OK" } },
          },
          post: {
            operationId: "CreateSample",
            tags: ["Samples"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: { name: { type: "string" } },
                  },
                  examples: {
                    Second: { value: { name: "second-sample" } },
                    First: { value: { name: "first-sample" } },
                  },
                },
              },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
    };
    const first = buildSampleCatalog(spec, "test-sdk");
    const second = buildSampleCatalog(spec, "test-sdk");

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first).toMatchObject({
      schemaVersion: 1,
      language: "typescript",
      sdk: { module: "@sumup/sdk", version: "test-sdk" },
      openAPIVersion: "test-api",
    });
    expect(first.samples.map((sample) => sample.id)).toEqual([
      "CreateSample.First",
      "CreateSample.Second",
      "ListSamples",
    ]);

    const example = first.samples[0];
    expect(example?.sample).toContain("client.samples.createSample(");
    expect(example?.sample).toContain('"name": "first-sample"');
    expect(JSON.stringify(example)).toContain('"sample"');
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
