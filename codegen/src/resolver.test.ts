import type { OpenAPIV3_1 } from "openapi-types";
import { expect, test } from "vitest";
import { collectReferencedSchemas } from "./resolver";

test("collects refs from additionalProperties alongside properties", () => {
  const spec: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: {
      title: "test",
      version: "1.0.0",
    },
    paths: {
      "/readers": {
        get: {
          operationId: "listReaders",
          tags: ["readers"],
          responses: {
            "200": {
              description: "ok",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Problem" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Problem: {
          type: "object",
          properties: {
            type: { type: "string" },
          },
          additionalProperties: { $ref: "#/components/schemas/ProblemExtra" },
        },
        ProblemExtra: {
          type: "string",
        },
      },
    },
  };

  expect([...collectReferencedSchemas(spec, "readers")].sort()).toEqual([
    "#/components/schemas/Problem",
    "#/components/schemas/ProblemExtra",
  ]);
});
