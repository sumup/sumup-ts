import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { collectReferencedSchemas } from "./resolver";
import { loadSpec } from "./spec";
import { generateTypes } from "./types";

test("annotated schemas retain references and inherited fields", async () => {
  const spec = await loadSpec("testdata/schema-annotations.json");
  expect([...collectReferencedSchemas(spec, "Merchants")]).toContain(
    "#/components/schemas/CountryCode",
  );
  const output = await mkdtemp(join(tmpdir(), "sumup-annotations-"));
  try {
    await generateTypes(spec, output);
    const address = await readFile(join(output, "types/address.ts"), "utf8");
    const extended = await readFile(
      join(output, "types/extended-address.ts"),
      "utf8",
    );
    expect(address).toContain("unknown & CountryCode;");
    expect(extended).toContain("Address &");
    expect(extended).toContain("label?: string");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
