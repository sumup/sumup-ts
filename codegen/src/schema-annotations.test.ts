import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";
import { collectReferencedSchemas } from "./resolver";
import { loadSpec } from "./spec";
import { generateTypes } from "./types";

test("annotated references retain dependencies and scalar and inherited types", async () => {
  const spec = await loadSpec("testdata/schema-annotations.json");
  expect([...collectReferencedSchemas(spec, "Merchants")]).toContain(
    "#/components/schemas/CountryCode",
  );
  const output = await mkdtemp(join(tmpdir(), "sumup-annotations-"));
  try {
    await generateTypes(spec, output);
    await writeFile(
      join(output, "check.ts"),
      `
      import type { Address, ExtendedAddress, Merchant } from "./types";
      const address: Address = { country: "DE" };
      const extended: ExtendedAddress = { country: "DE", city: "Berlin", label: "Office" };
      const merchant: Merchant = { address, phone_number: "+491234", id: "id", extended_address: extended, country_codes: ["DE"] };
      const country: string = address.country;
      // @ts-expect-error Country codes stay strings.
      const invalid: Address = { country: 42 };
      // @ts-expect-error Inherited required fields stay required.
      const incomplete: ExtendedAddress = { label: "Office" };
      // @ts-expect-error Wrapped array items stay strings.
      const invalidCodes: Merchant = { ...merchant, country_codes: [42] };
    `,
    );
    const result = spawnSync(
      resolve("node_modules/.bin/tsc"),
      [
        "--strict",
        "--noEmit",
        "--skipLibCheck",
        "--moduleResolution",
        "bundler",
        "--module",
        "esnext",
        join(output, "check.ts"),
      ],
      { encoding: "utf8", cwd: output },
    );
    expect(result.stdout + result.stderr).toBe("");
    expect(result.status).toBe(0);
    const address = await readFile(join(output, "types/address.ts"), "utf8");
    expect(address).toContain("CountryCode");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
