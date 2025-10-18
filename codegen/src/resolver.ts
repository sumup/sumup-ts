import type { OpenAPIV3_1 } from "openapi-types";
import { match, P } from "ts-pattern";

/**
 * Collects all schema references used by operations with a specific tag.
 * Recursively traverses schemas to find all dependencies.
 */
export const collectReferencedSchemas = (
  spec: OpenAPIV3_1.Document,
  tag: string,
): Set<string> => {
  const visitedSchemas = new Set<string>();
  const queue: string[] = [];

  const addSchemaRef = (ref: string) => {
    if (!visitedSchemas.has(ref)) {
      visitedSchemas.add(ref);
      queue.push(ref);
    }
  };

  const processSchema = (
    schema?: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
  ) => {
    if (!schema) return;

    match(schema)
      .with({ $ref: P.string }, (s) => addSchemaRef(s.$ref))
      .with({ properties: P.not(P.nullish) }, (s) => {
        Object.values(s.properties!).forEach(processSchema);
      })
      .with({ items: P.not(P.nullish) }, (s) => {
        processSchema(s.items);
      })
      .with({ allOf: P.array() }, (s) => {
        s.allOf!.forEach(processSchema);
      })
      .with({ oneOf: P.array() }, (s) => {
        s.oneOf!.forEach(processSchema);
      })
      .with({ anyOf: P.array() }, (s) => {
        s.anyOf!.forEach(processSchema);
      })
      .with({ not: P.not(P.nullish) }, (s) => {
        processSchema(s.not);
      })
      .otherwise(() => {});
  };

  const processOperation = (operation: OpenAPIV3_1.OperationObject) => {
    // Process parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if ("schema" in param) {
          processSchema(param.schema);
        }
      }
    }

    // Process requestBody
    if (operation.requestBody && "content" in operation.requestBody) {
      const content = operation.requestBody.content;
      for (const mediaType of Object.values(content)) {
        if (mediaType.schema) {
          processSchema(mediaType.schema);
        }
      }
    }

    // Process responses
    if (operation.responses) {
      for (const response of Object.values(operation.responses)) {
        if ("content" in response && response.content) {
          for (const mediaType of Object.values(response.content)) {
            if (mediaType.schema) {
              processSchema(mediaType.schema);
            }
          }
        }
      }
    }
  };

  // Traverse paths and operations
  for (const pathItem of Object.values(spec.paths || {})) {
    if (!pathItem) continue;

    for (const method of [
      "get",
      "put",
      "post",
      "delete",
      "patch",
      "options",
      "head",
      "trace",
    ]) {
      const operation = pathItem[method as keyof typeof pathItem] as
        | OpenAPIV3_1.OperationObject
        | undefined;
      if (operation?.tags?.includes(tag)) {
        processOperation(operation);
      }
    }
  }

  // Resolve all references
  while (queue.length > 0) {
    const ref = queue.pop()!;
    const [s, r] = ref.replace("#/components/", "").split("/") as [
      keyof OpenAPIV3_1.ComponentsObject,
      string,
    ];

    if (s in spec.components!) {
      const current = spec.components![s]![r];
      if (current && typeof current === "object") {
        processSchema(current as OpenAPIV3_1.SchemaObject);
      }
    }
  }

  return visitedSchemas;
};
