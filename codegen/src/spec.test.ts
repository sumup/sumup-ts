import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { loadSpec } from "./spec";

test("loads 3.1 schemas without changing nullable type arrays", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sumup-openapi-"));
  try {
    const file = join(directory, "openapi.json");
    const spec = {
      openapi: "3.1.0",
      paths: {},
      info: { title: "Test", version: "1" },
      components: { schemas: { Name: { type: ["string", "null"] } } },
    };
    await writeFile(file, JSON.stringify(spec));
    expect(await loadSpec(file)).toEqual(spec);
    await writeFile(file, JSON.stringify({ ...spec, openapi: "3.0.3" }));
    await expect(loadSpec(file)).rejects.toThrow("Only OpenAPI 3.1");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
