import type { OpenAPIV3_1 } from "openapi-types";
import { match, P } from "ts-pattern";
import type { FileWriter } from "./io";
import { docComment, extractDoc } from "./util";

export type Schema = OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject;

export const refToSchemaName = (s: string) =>
  s.replace("#/components/schemas/", "");

/**
 * Helper to add nullable suffix to a type if the schema is nullable
 */
const withNullable = (schema: Schema, writer: FileWriter) => {
  if ("nullable" in schema) {
    writer.w0(" | null");
  }
};

/**
 * Converts an OpenAPI schema to TypeScript type definitions
 */
export const schemaToTypes = (schema: Schema, writer: FileWriter): void => {
  match(schema)
    .with({ $ref: P.string }, (s) => {
      writer.w0(refToSchemaName(s.$ref));
      withNullable(s, writer);
    })
    .with({ enum: P.array(P.not(P.nullish)) }, (s) => {
      s.enum!.forEach((arm, i) => {
        if (i > 0) writer.w0("| ");
        writer.w(JSON.stringify(arm));
      });
      withNullable(s, writer);
    })
    .with({ type: "boolean" }, (s) => {
      writer.w0("boolean");
      withNullable(s, writer);
    })
    .with({ type: "string", format: "date-time" }, (s) => {
      writer.w0("string");
      withNullable(s, writer);
    })
    .with({ type: "string" }, (s) => {
      writer.w0("string");
      withNullable(s, writer);
    })
    .with({ type: "number" }, (s) => {
      writer.w0("number");
      withNullable(s, writer);
    })
    .with({ type: "integer" }, (s) => {
      writer.w0("number");
      withNullable(s, writer);
    })
    .with({ type: "array" }, (s) => {
      writer.w0("(");
      schemaToTypes(s.items, writer);
      writer.w0(")[]");
      withNullable(s, writer);
    })
    .with({ type: "object" }, (s) => {
      // record type, which only tells us the type of the values
      if (!s.properties || Object.keys(s.properties).length === 0) {
        writer.w0("Record<string,");
        if (typeof s.additionalProperties === "object") {
          schemaToTypes(s.additionalProperties, writer);
        } else {
          writer.w0("unknown");
        }
        writer.w0(">");
        withNullable(s, writer);
        return;
      }

      writer.w0("{");
      for (const [name, subSchema] of Object.entries(s.properties || {})) {
        const comment = docComment(extractDoc(subSchema));
        if (comment) {
          writer.w(comment);
        }
        const optional = s.required?.includes(name) ? "" : "?";
        writer.w0(`${JSON.stringify(name)}${optional}: `);
        schemaToTypes(subSchema, writer);
        writer.w(",");
      }
      writer.w0("}");
      withNullable(s, writer);
    })
    .with({ oneOf: P.not(P.nullish) }, (s) => {
      writer.w("");
      for (const sub of s.oneOf!) {
        const comment = docComment(extractDoc(sub));
        if (comment) {
          writer.w(comment);
        }
        writer.w0("| ");
        schemaToTypes(sub, writer);
      }
      withNullable(s, writer);
    })
    .with({ allOf: P.not(P.nullish) }, (s) => {
      writer.w("");
      for (const sub of s.allOf!) {
        const comment = docComment(extractDoc(sub));
        if (comment) {
          writer.w(comment);
        }
        writer.w0("& ");
        schemaToTypes(sub, writer);
      }
      withNullable(s, writer);
    })
    .with({}, () => {
      writer.w0("Record<string, unknown>");
    })
    .otherwise((s) => {
      throw Error(`UNHANDLED SCHEMA: ${JSON.stringify(s, null, 2)}`);
    });
};
