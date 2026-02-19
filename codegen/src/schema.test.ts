import { expect, test } from "vitest";
import type { FileWriter } from "./io";
import { type Schema, schemaToTypes } from "./schema";

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
