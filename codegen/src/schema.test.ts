import { expect, test } from "vitest";
import type { FileWriter } from "./io";
import { collectSchemaRefs, type Schema, schemaToTypes } from "./schema";

class TestWriter {
  buf = "";

  w(str: string): void {
    this.buf += `${str}\n`;
  }

  w0(str: string): void {
    this.buf += str;
  }
}

const render = (schema: Schema): string => {
  const writer = new TestWriter();
  schemaToTypes(schema, writer as unknown as FileWriter);
  return writer.buf;
};

test("object with properties and additionalProperties true keeps extra keys", () => {
  expect(
    render({
      type: "object",
      properties: {
        type: { type: "string" },
        title: { type: "string" },
      },
      required: ["type"],
      additionalProperties: true,
    }),
  ).toBe(`{"type": string,
"title"?: string,
} & Omit<Record<string, unknown>, "type" | "title">`);
});

test("object with properties and typed additionalProperties keeps extra value type", () => {
  expect(
    render({
      type: "object",
      properties: {
        status: { type: "integer" },
      },
      required: ["status"],
      additionalProperties: { type: "string" },
    }),
  ).toBe(`{"status": number,
} & Omit<Record<string, string>, "status">`);
});

test("component Error schema reference maps to ErrorBody", () => {
  expect(
    render({
      $ref: "#/components/schemas/Error",
    }),
  ).toBe("ErrorBody");
});

test("collectSchemaRefs includes aliased references", () => {
  const refs = collectSchemaRefs({
    type: "object",
    properties: {
      error: { $ref: "#/components/schemas/Error" },
      profile: { $ref: "#/components/schemas/MerchantProfileLegacy" },
    },
  });

  expect([...refs].sort()).toEqual(["ErrorBody", "MerchantProfileLegacy"]);
});

test("readOnly properties are generated as readonly", () => {
  expect(
    render({
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
      },
      required: ["id", "name"],
    }),
  ).toBe(`{readonly "id": string,
"name": string,
}`);
});

test("3.1 type arrays retain requiredness and object properties", () => {
  expect(
    render({
      type: "object",
      required: ["name"],
      properties: {
        name: { type: ["string", "null"] },
        count: { type: ["integer", "null"] },
      },
    }),
  ).toBe('{"name": (string) | (null),\n"count"?: (number) | (null),\n}');
  expect(
    render({
      type: ["object", "null"],
      properties: { id: { type: "string" } },
    }),
  ).toBe('({"id"?: string,\n}) | (null)');
  expect(render({ type: ["array", "null"], items: { type: "string" } })).toBe(
    "((string)[]) | (null)",
  );
});

test("3.1 enums and constants constrain nullable types", () => {
  expect(render({ type: ["string", "null"], enum: ["credit", "debit"] })).toBe(
    '"credit" | "debit"',
  );
  expect(render({ enum: ["credit", null] })).toBe('"credit" | null');
  expect(render({ type: "null" })).toBe("null");
  expect(render({ const: false })).toBe("false");
  expect(render({ const: null })).toBe("null");
});

test("nullable references are grouped inside intersections", () => {
  const schema: Schema = {
    allOf: [
      { anyOf: [{ $ref: "#/components/schemas/Error" }, { type: "null" }] },
      { type: "object", properties: { id: { type: "string" } } },
    ],
  };
  expect(render(schema)).toBe(
    '\n& ((ErrorBody) | (null))& ({"id"?: string,\n})',
  );
  expect([...collectSchemaRefs(schema)]).toEqual(["ErrorBody"]);
});

test("composition constrains sibling types instead of treating null as nullable", () => {
  expect(
    render({
      type: "null",
      allOf: [{ $ref: "#/components/schemas/ResourceType" }],
    }),
  ).toBe("\n& (null)& (\n& (ResourceType))");
});
