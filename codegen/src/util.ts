import { Case } from "change-case-all";
import type { OpenAPIV3_1 } from "openapi-types";

export const bodyType = (opId: string) => `${opId}Params`;
export const queryParamsType = (opId: string) => `${opId}QueryParams`;
export const responseType = (opId: string) => `${opId}Response`;
export const errorType = (opId: string) => `${opId}Error`;

/**
 * Converts a path segment to template string interpolation.
 * e.g., "{userId}" -> "${userId}"
 */
const segmentToInterpolation = (s: string) =>
  s.startsWith("{") ? `$\{${Case.camel(s.slice(1, -1))}}` : s;

/**
 * Converts an OpenAPI path to a TypeScript template string with interpolated path parameters.
 * e.g., "/users/{user_id}/posts/{post_id}" -> "`/users/${userId}/posts/${postId}`"
 */
export const pathToTemplateStr = (s: string) =>
  `\`${s.split("/").map(segmentToInterpolation).join("/")}\``;

/**
 * Performs topological sort on a directed graph represented as adjacency list.
 * Used to sort schemas by their dependencies.
 */
export const topologicalSort = (
  edges: [vertex: string, adjacents: string[] | undefined][],
) => {
  const result: string[] = [];
  const visited: Record<string, boolean> = {};

  const visit = (vertex: string, adjacents: string[] = []) => {
    visited[vertex] = true;
    for (const adj of adjacents) {
      if (!visited[adj]) {
        visit(adj, edges.find(([v]) => v === adj)?.[1]);
      }
    }
    result.push(vertex);
  };

  for (const [vertex, adjacents] of edges) {
    if (!visited[vertex]) {
      visit(vertex, adjacents);
    }
  }

  return result;
};

/**
 * Annotation-only schemas do not constrain an allOf intersection.
 */
export const isAnnotationOnlySchema = (
  schema: OpenAPIV3_1.SchemaObject,
): boolean =>
  Object.keys(schema).every((key) =>
    [
      "title",
      "description",
      "externalDocs",
      "deprecated",
      "readOnly",
      "writeOnly",
      "example",
      "examples",
      "default",
      "$comment",
    ].includes(key),
  );

/**
 * Extracts documentation from an OpenAPI schema object.
 * Combines descriptions, schema constraints, and deprecation notices.
 */
export const extractDoc = (schema: OpenAPIV3_1.SchemaObject): string =>
  [
    schema.title,
    schema.description,
    [
      schema.writeOnly ? "Write only" : undefined,
      schema.format ? `Format: ${schema.format}` : undefined,
      schema.default !== undefined
        ? `Default: ${JSON.stringify(schema.default)}`
        : undefined,
      schema.minLength !== undefined
        ? `Min length: ${schema.minLength}`
        : undefined,
      schema.maxLength !== undefined
        ? `Max length: ${schema.maxLength}`
        : undefined,
      schema.pattern !== undefined ? `Pattern: ${schema.pattern}` : undefined,
      schema.minimum !== undefined ? `Min: ${schema.minimum}` : undefined,
      schema.exclusiveMinimum !== undefined
        ? `Exclusive min: ${schema.exclusiveMinimum}`
        : undefined,
      schema.maximum !== undefined ? `Max: ${schema.maximum}` : undefined,
      schema.exclusiveMaximum !== undefined
        ? `Exclusive max: ${schema.exclusiveMaximum}`
        : undefined,
      schema.multipleOf !== undefined
        ? `Multiple of: ${schema.multipleOf}`
        : undefined,
      schema.uniqueItems ? "Unique items only" : undefined,
      schema.minItems !== undefined
        ? `Min items: ${schema.minItems}`
        : undefined,
      schema.maxItems !== undefined
        ? `Max items: ${schema.maxItems}`
        : undefined,
      schema.minProperties !== undefined
        ? `Min properties: ${schema.minProperties}`
        : undefined,
      schema.maxProperties !== undefined
        ? `Max properties: ${schema.maxProperties}`
        : undefined,
    ]
      .filter((line) => line !== undefined)
      .join("\n\n"),
    schema.externalDocs
      ? `${schema.externalDocs.description || "See"}: ${schema.externalDocs.url}`
      : undefined,
    schema.deprecated
      ? `@deprecated${"x-deprecation-notice" in schema ? `: ${schema["x-deprecation-notice"]}` : ""}`
      : undefined,
    ...(schema.allOf ?? []).map((member) => extractDoc(member)),
  ]
    .filter(Boolean)
    .join("\n\n");

/**
 * Converts a documentation string to a JSDoc comment block
 */
export function docComment(s: string | undefined): string | undefined {
  if (!s) {
    return "";
  }
  let res = "";
  res += "/**\n";
  for (const line of s.replaceAll("*/", "*\\/").split("\n")) {
    res += ` * ${line}\n`;
  }
  res += " */";
  return res;
}
