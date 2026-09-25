import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import type { Document } from "./openapi";
import { generateResource } from "./resource";

test("allowEmptyValue adds an empty string independently of the query schema", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sumup-resource-"));
  const spec: Document = {
    openapi: "3.1.0",
    info: { title: "Test", version: "1" },
    components: {
      schemas: { Kind: { type: "string", enum: ["merchant"] } },
    },
    paths: {
      "/resources": {
        get: {
          operationId: "listResources",
          tags: ["Resources"],
          parameters: [
            {
              in: "query",
              name: "kind",
              allowEmptyValue: true,
              schema: { $ref: "#/components/schemas/Kind" },
            },
            {
              in: "query",
              name: "count",
              required: true,
              allowEmptyValue: true,
              schema: { type: "integer" },
            },
            {
              in: "query",
              name: "strict",
              allowEmptyValue: false,
              schema: { type: "string", enum: ["merchant"] },
            },
            {
              in: "query",
              name: "default",
              schema: { $ref: "#/components/schemas/Kind" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  try {
    await generateResource({ name: "Resources" }, spec, dir);
    const generated = await readFile(
      join(dir, "resources/resources/index.ts"),
      "utf8",
    );
    expect(generated).toContain('kind?: Kind | "";');
    expect(generated).toContain('count: number | "";');
    expect(generated).toContain('strict?: "merchant";');
    expect(generated).toContain("default?: Kind;");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
