import { Case } from "change-case-all";
import type { OpenAPIV3_1 } from "openapi-types";

export const bodyType = (opId: string) => `${opId}Params`;
export const queryParamsType = (opId: string) => `${opId}QueryParams`;
export const responseType = (opId: string) => `${opId}Response`;

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
 * Extracts documentation from an OpenAPI schema object.
 * Combines title, description, external docs, and deprecation notices.
 */
export const extractDoc = (schema: OpenAPIV3_1.SchemaObject): string =>
  [
    schema.title,
    schema.description,
    schema.externalDocs
      ? `${schema.externalDocs.description || "See"}: ${schema.externalDocs.url}`
      : undefined,
    schema.deprecated
      ? `@deprecated${"x-deprecation-notice" in schema ? `: ${schema["x-deprecation-notice"]}` : ""}`
      : undefined,
  ]
    .filter(Boolean)
    .filter((n) => n)
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
  for (const line of s.split("\n")) {
    res += ` * ${line}\n`;
  }
  res += " */";
  return res;
}
