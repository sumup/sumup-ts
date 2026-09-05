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

const hasExplicitAdditionalProperties = (
  schema: OpenAPIV3_1.SchemaObject,
): boolean =>
  schema.additionalProperties === true ||
  typeof schema.additionalProperties === "object";

const writeAdditionalPropertiesRecord = (
  schema: OpenAPIV3_1.SchemaObject,
  writer: Pick<FileWriter, "w" | "w0">,
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
  writer: Pick<FileWriter, "w" | "w0">,
  options: SchemaToTypesOptions = {},
): void => {
  const refName = options.refName || defaultRefName;
  const onRef = options.onRef;

  // Composition keywords constrain sibling types as intersections in JSON Schema.
  if (
    !("$ref" in schema) &&
    schema.type &&
    (schema.allOf || schema.oneOf || schema.anyOf)
  ) {
    const { allOf, oneOf, anyOf, ...base } = schema;
    const parts: Schema[] = [base];
    if (allOf) parts.push({ allOf });
    if (oneOf) parts.push({ oneOf });
    if (anyOf) parts.push({ anyOf });
    schemaToTypes({ allOf: parts }, writer, options);
    return;
  }

  // Enum and const constrain the entire type union, including null.
  if ("const" in schema) {
    writer.w0(JSON.stringify(schema.const));
    return;
  }
  if ("enum" in schema && schema.enum) {
    writer.w0(
      schema.enum.map((value) => JSON.stringify(value)).join(" | ") || "never",
    );
    return;
  }
  if ("type" in schema && Array.isArray(schema.type)) {
    schema.type.forEach((type, index) => {
      if (index > 0) writer.w0(" | ");
      writer.w0("(");
      schemaToTypes({ ...schema, type } as Schema, writer, options);
      writer.w0(")");
    });
    return;
  }

  match(schema)
    .with({ $ref: P.string }, (s) => {
      const typeName = refToSchemaName(s.$ref);
      onRef?.(typeName);
      writer.w0(refName(typeName));
    })
    .with({ type: "null" }, () => {
      writer.w0("null");
    })
    .with({ type: "boolean" }, () => {
      writer.w0("boolean");
    })
    .with({ type: "string" }, () => {
      writer.w0("string");
    })
    .with({ type: "number" }, () => {
      writer.w0("number");
    })
    .with({ type: "integer" }, () => {
      writer.w0("number");
    })
    .with({ type: "array" }, (s) => {
      writer.w0("(");
      schemaToTypes(s.items ?? {}, writer, options);
      writer.w0(")[]");
    })
    .with({ type: "object" }, (s) => {
      // record type, which only tells us the type of the values
      if (!s.properties || Object.keys(s.properties).length === 0) {
        writeAdditionalPropertiesRecord(s, writer, options);
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
    })
    .with({ oneOf: P.not(P.nullish) }, (s) => {
      writer.w("");
      for (const sub of s.oneOf!) {
        const comment = docComment(extractDoc(sub));
        if (comment) {
          writer.w(comment);
        }
        writer.w0("| ");
        writer.w0("(");
        schemaToTypes(sub, writer, options);
        writer.w0(")");
      }
    })
    .with({ anyOf: P.not(P.nullish) }, (s) => {
      s.anyOf!.forEach((sub, index) => {
        if (index > 0) writer.w0(" | ");
        writer.w0("(");
        schemaToTypes(sub, writer, options);
        writer.w0(")");
      });
    })
    .with({ allOf: P.not(P.nullish) }, (s) => {
      writer.w("");
      for (const sub of s.allOf!) {
        const comment = docComment(extractDoc(sub));
        if (comment) {
          writer.w(comment);
        }
        writer.w0("& ");
        writer.w0("(");
        schemaToTypes(sub, writer, options);
        writer.w0(")");
      }
    })
    .with({}, () => {
      writer.w0("unknown");
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

  if ("items" in schema && schema.items) {
    collectSchemaRefsInner(schema.items, refs);
  }

  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      collectSchemaRefsInner(subSchema, refs);
    }
  }

  if (schema.anyOf) {
    for (const subSchema of schema.anyOf)
      collectSchemaRefsInner(subSchema, refs);
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
