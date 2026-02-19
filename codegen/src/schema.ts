import type { OpenAPIV3_1 } from "openapi-types";
import { match, P } from "ts-pattern";
import type { FileWriter } from "./io";
import { docComment, extractDoc } from "./util";

export type Schema = OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject;

const schemaNameAliases: Record<string, string> = {
  Error: "ErrorBody",
};

export const schemaNameToTypeName = (name: string) =>
  schemaNameAliases[name] || name;

export const refToSchemaName = (s: string) =>
  schemaNameToTypeName(s.replace("#/components/schemas/", ""));

export type SchemaToTypesOptions = {
  refName?: (name: string) => string;
  onRef?: (name: string) => void;
};

const defaultRefName = (name: string) => name;

/**
 * Helper to add nullable suffix to a type if the schema is nullable
 */
const withNullable = (schema: Schema, writer: FileWriter) => {
  if ("nullable" in schema) {
    writer.w0(" | null");
  }
};

const hasExplicitAdditionalProperties = (
  schema: OpenAPIV3_1.SchemaObject,
): boolean =>
  schema.additionalProperties === true ||
  typeof schema.additionalProperties === "object";

const writeAdditionalPropertiesRecord = (
  schema: OpenAPIV3_1.SchemaObject,
  writer: FileWriter,
  options: SchemaToTypesOptions,
): void => {
  writer.w0("Record<string, ");
  if (typeof schema.additionalProperties === "object") {
    schemaToTypes(schema.additionalProperties, writer, options);
  } else {
    writer.w0("unknown");
  }
  writer.w0(">");
};

/**
 * Converts an OpenAPI schema to TypeScript type definitions
 */
export const schemaToTypes = (
  schema: Schema,
  writer: FileWriter,
  options: SchemaToTypesOptions = {},
): void => {
  const refName = options.refName || defaultRefName;
  const onRef = options.onRef;

  match(schema)
    .with({ $ref: P.string }, (s) => {
      const typeName = refToSchemaName(s.$ref);
      onRef?.(typeName);
      writer.w0(refName(typeName));
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
      schemaToTypes(s.items, writer, options);
      writer.w0(")[]");
      withNullable(s, writer);
    })
    .with({ type: "object" }, (s) => {
      // record type, which only tells us the type of the values
      if (!s.properties || Object.keys(s.properties).length === 0) {
        writeAdditionalPropertiesRecord(s, writer, options);
        withNullable(s, writer);
        return;
      }

      const propertyNames = Object.keys(s.properties);
      writer.w0("{");
      for (const [name, subSchema] of Object.entries(s.properties || {})) {
        const comment = docComment(extractDoc(subSchema));
        if (comment) {
          writer.w(comment);
        }
        const readonly =
          !("$ref" in subSchema) && subSchema.readOnly ? "readonly " : "";
        const optional = s.required?.includes(name) ? "" : "?";
        writer.w0(`${readonly}${JSON.stringify(name)}${optional}: `);
        schemaToTypes(subSchema, writer, options);
        writer.w(",");
      }
      writer.w0("}");

      if (hasExplicitAdditionalProperties(s)) {
        writer.w0(" & Omit<");
        writeAdditionalPropertiesRecord(s, writer, options);
        writer.w0(", ");
        for (const [i, name] of propertyNames.entries()) {
          if (i > 0) writer.w0(" | ");
          writer.w0(JSON.stringify(name));
        }
        writer.w0(">");
      }
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
        schemaToTypes(sub, writer, options);
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
        schemaToTypes(sub, writer, options);
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

const collectSchemaRefsInner = (schema: Schema, refs: Set<string>): void => {
  if ("$ref" in schema) {
    refs.add(refToSchemaName(schema.$ref));
    return;
  }

  if (schema.properties) {
    for (const value of Object.values(schema.properties)) {
      collectSchemaRefsInner(value, refs);
    }
  }

  if (typeof schema.additionalProperties === "object") {
    collectSchemaRefsInner(schema.additionalProperties, refs);
  }

  if (schema.items) {
    collectSchemaRefsInner(schema.items, refs);
  }

  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      collectSchemaRefsInner(subSchema, refs);
    }
  }

  if (schema.oneOf) {
    for (const subSchema of schema.oneOf) {
      collectSchemaRefsInner(subSchema, refs);
    }
  }
};

export const collectSchemaRefs = (schema: Schema): Set<string> => {
  const refs = new Set<string>();
  collectSchemaRefsInner(schema, refs);
  return refs;
};
