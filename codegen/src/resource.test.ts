import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@rstest/core";
import { generateIndex } from "./api";
import type { Document } from "./openapi";
import { generateResource } from "./resource";
import { buildSampleCatalog } from "./samples";

test("nested resources use the annotated method name or operation ID", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sumup-resource-"));
  const readers = { name: "Readers" };
  const checkouts = { name: "ReaderCheckouts", "x-displayName": "Checkouts" };
  const settings = { name: "ReaderSettings", "x-displayName": "Settings" };
  const spec: Document = {
    openapi: "3.1.0",
    info: { title: "Test", version: "1" },
    components: {},
    tags: [readers, checkouts, settings],
    "x-tagGroups": [{ name: "Readers", tags: [checkouts.name, settings.name] }],
    paths: {
      "/readers/settings": {
        put: {
          operationId: "updateReaderSettings",
          "x-codegen": { method_name: "update" },
          tags: [settings.name],
          responses: { "204": { description: "OK" } },
        },
      },
      "/readers/checkouts": {
        post: {
          operationId: "createCheckout",
          tags: [checkouts.name],
          responses: { "204": { description: "OK" } },
        },
      },
    },
  };

  try {
    await generateIndex(spec, dir);
    await generateResource(readers, spec, dir);
    await generateResource(checkouts, spec, dir);
    await generateResource(settings, spec, dir);
    const root = await readFile(join(dir, "index.ts"), "utf8");
    const parent = await readFile(
      join(dir, "resources/readers/index.ts"),
      "utf8",
    );
    const child = await readFile(
      join(dir, "resources/reader-checkouts/index.ts"),
      "utf8",
    );
    expect(root).not.toContain("new ReaderCheckouts(");
    expect(parent).toContain(
      "readonly checkouts = new ReaderCheckouts(this._client)",
    );
    expect(parent).not.toContain("createCheckout");
    expect(child).toContain("createCheckout(options?: RequestOptions)");
    expect(buildSampleCatalog(spec, "1").samples[0].sample).toContain(
      "client.readers.checkouts.createCheckout(",
    );
    expect(parent).not.toContain("this.settings.update");
    const settingsClient = await readFile(
      join(dir, "resources/reader-settings/index.ts"),
      "utf8",
    );
    expect(settingsClient).toContain("update(options?: RequestOptions)");
    expect(buildSampleCatalog(spec, "1").samples[1].sample).toContain(
      "client.readers.settings.update(",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

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
              schema: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                default: 10,
              },
            },
            {
              in: "query",
              name: "strict",
              description: "Filter by kind.",
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
    expect(generated).toContain(
      " * Default: 10\n   *\n   * Min: 0\n   *\n   * Max: 100\n   */\n  count:",
    );
    expect(generated).toContain(" * Filter by kind.\n   */\n  strict?");
    expect(generated).toContain('strict?: "merchant";');
    expect(generated).toContain("default?: Kind;");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
