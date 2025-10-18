import { Case } from "change-case-all";
import type { OpenAPIV3_1 } from "openapi-types";
import { OpenAPIV3 } from "openapi-types";
import { refToSchemaName, type Schema } from "./schema";
import { bodyType, responseType, topologicalSort } from "./util";

const HttpMethods = OpenAPIV3.HttpMethods;

/**
 * Returns a list of schema names sorted by dependency order.
 * Schemas that depend on others come after their dependencies.
 */
export const getSortedSchemas = (spec: OpenAPIV3_1.Document) => {
  return topologicalSort(
    Object.keys(spec.components?.schemas || {}).map((name) => [
      name,
      JSON.stringify(spec.components!.schemas![name])
        .match(/#\/components\/schemas\/[a-zA-Z0-9.\-_]+/g)
        ?.map((s) => s.replace("#/components/schemas/", "")),
    ]),
  );
};

/**
 * Extracts the response schema from a response object (if it exists)
 */
export function responseSchema(
  o: OpenAPIV3_1.ResponseObject | OpenAPIV3_1.ReferenceObject,
) {
  if (!(o && "content" in o && o.content?.["application/json"]?.schema)) {
    return null;
  }

  return o.content["application/json"].schema;
}

/**
 * Extract request body type name and schema (if any).
 */
export function getRequestBody(
  operationId: string,
  o?: OpenAPIV3_1.OperationObject,
): {
  typeName: string;
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
} | null {
  if (
    !o ||
    !o.requestBody ||
    !("content" in o.requestBody) ||
    !o.requestBody?.content["application/json"]?.schema
  ) {
    return null;
  }

  const body = o.requestBody?.content["application/json"]?.schema;
  if ("$ref" in body) {
    return { typeName: refToSchemaName(body.$ref), schema: body };
  }

  return { typeName: bodyType(Case.pascal(operationId)), schema: body };
}

/**
 * Determines the response type name for an operation
 */
export function getResponse(
  opName: string,
  o: Schema | OpenAPIV3_1.RequestBodyObject | undefined,
  prefix = "",
) {
  if (!(o && "content" in o && o.content?.["application/json"]?.schema)) {
    return null;
  }
  const schema = o.content["application/json"].schema;

  if ("$ref" in schema) {
    return prefix + refToSchemaName(schema.$ref);
  }

  if (schema.type === "array") {
    if ("$ref" in schema.items) {
      return `${prefix + refToSchemaName(schema.items.$ref)}[]`;
    }
    return null;
  }

  return responseType(opName);
}

type PathConfig = ReturnType<typeof iterPathConfig>[number];

/**
 * Iterates over all path and method combinations in the OpenAPI spec
 */
export function iterPathConfig(paths: OpenAPIV3_1.Document["paths"]) {
  if (!paths) return [];

  return Object.entries(paths).flatMap(([path, handlers]) => {
    if (!handlers) return [];

    return Object.values(HttpMethods).flatMap((method) => {
      const methodSpec = handlers[method];
      if (!methodSpec || !methodSpec.operationId) return [];
      return {
        path,
        pathSpec: handlers,
        methodSpec,
        method,
        opId: methodSpec.operationId,
      };
    });
  });
}

type Param = Omit<OpenAPIV3_1.ParameterObject, "schema"> &
  Required<Pick<OpenAPIV3_1.ParameterObject, "schema">>;

interface IterParamsResult extends PathConfig {
  pathParams: Param[];
  queryParams: Param[];
}

/**
 * Iterates over all path and method combinations, extracting path and query parameters
 */
export function iterParams(paths: OpenAPIV3_1.Document["paths"]) {
  const collectedParams: IterParamsResult[] = [];
  for (const { methodSpec: conf, ...others } of iterPathConfig(paths)) {
    const params = conf.parameters;
    const pathParams: Param[] = [];
    const queryParams: Param[] = [];
    for (const param of params || []) {
      if ("name" in param && param.schema) {
        if (param.in === "path") {
          pathParams.push(param as Param);
        }
        if (param.in === "query") {
          queryParams.push(param as Param);
        }
      }
    }
    collectedParams.push({
      methodSpec: conf,
      ...others,
      pathParams,
      queryParams,
    });
  }

  return collectedParams;
}
