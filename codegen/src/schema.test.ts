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
