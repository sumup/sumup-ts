import { resolve } from "node:path";
import { Case } from "change-case-all";
import type { OpenAPIV3_1 } from "openapi-types";
import {
  getRequestBody,
  getResponse,
  getSortedSchemas,
  iterParams,
  iterPathConfig,
  queryParameterName,
  responseSchema,
} from "./base";
import { fileWriter } from "./io";
import type { Document, ParameterObject, ResourceTag } from "./openapi";
import { schemaNameToTypeName, schemaToTypes } from "./schema";
import {
  childAccessor,
  nestedMethodNames,
  operationMethodName,
  resourceParents,
} from "./tag-hierarchy";
import {
  docComment,
  errorType,
  extractDoc,
  pathToTemplateStr,
  queryParamsType,
  responseType,
} from "./util";

/**
 * Generates a resource file for a given API tag.
 * Creates operation-specific type definitions and a resource class.
 */
export async function generateResource(
  tag: ResourceTag,
  spec: Document<{
    "x-codegen": {
      method_name?: string;
    };
  }>,
  destDir: string,
) {
  const outFile = resolve(
    destDir,
    "resources",
    Case.kebab(tag.name),
    "index.ts",
  );
  const writer = fileWriter(outFile);
  const parents = resourceParents(spec);
  const scopedMethods = nestedMethodNames(spec, tag.name);
  const children = (spec.tags ?? []).filter(
    (child) => parents.get(child.name)?.name === tag.name,
  );

  const schemaTypeNames = new Set(
    getSortedSchemas(spec).map((schemaName) =>
      schemaNameToTypeName(schemaName),
    ),
  );

  const resourceName = Case.pascal(tag.name);
  const resourceClassName = schemaTypeNames.has(resourceName)
    ? `${resourceName}Resource`
    : resourceName;
  const childClasses = children.map((child) => {
    const name = Case.pascal(child.name);
    return {
      tag: child,
      accessor: childAccessor(child),
      className: schemaTypeNames.has(name) ? `${name}Resource` : name,
    };
  });

  const usedSharedTypes = new Set<string>();
  const addSharedType = (name: string) => {
    usedSharedTypes.add(name);
    return name;
  };

  const unique = (types: (string | null)[]) => [
    ...new Set(types.filter(Boolean)),
  ];

  const collectorWriter = {
    w() {},
    w0() {},
  };

  const resolveResponseObject = (
    response: OpenAPIV3_1.ResponseObject | OpenAPIV3_1.ReferenceObject,
  ) => {
    if (!("$ref" in response)) {
      return response;
    }

    const prefix = "#/components/responses/";
    if (!response.$ref.startsWith(prefix)) {
      return null;
    }

    const responseName = response.$ref.slice(prefix.length);
    const resolvedResponse = spec.components?.responses?.[responseName];
    if (!resolvedResponse || "$ref" in resolvedResponse) {
      return null;
    }

    return resolvedResponse;
  };

  // First pass: collect all shared schema types that are actually referenced.
  for (const { methodSpec, queryParams, opId, pathSpec } of iterParams(
    spec.paths,
  )) {
    if (!methodSpec.tags?.includes(tag.name)) {
      continue;
    }

    const body = getRequestBody(opId, methodSpec);
    if (body) {
      if ("$ref" in body.schema) {
        addSharedType(body.typeName);
      } else {
        schemaToTypes(body.schema, collectorWriter, { onRef: addSharedType });
      }
    }

    for (const param of queryParams) {
      schemaToTypes(param.schema, collectorWriter, { onRef: addSharedType });
    }

    const successResponse =
      methodSpec.responses?.["200"] ||
      methodSpec.responses?.["201"] ||
      methodSpec.responses?.["202"] ||
      methodSpec.responses?.["204"];

    const successSchema = responseSchema(
      successResponse
        ? resolveResponseObject(successResponse) || successResponse
        : successResponse,
    );

    if (successSchema && !("$ref" in successSchema)) {
      schemaToTypes(successSchema, collectorWriter, { onRef: addSharedType });
    }

    const inlineErrorSchemas = Object.entries(methodSpec.responses ?? {})
      .filter(([code]) => !code.startsWith("2"))
      .map(([, response]) => resolveResponseObject(response) || response)
      .map((response) => responseSchema(response))
      .filter(
        (candidate): candidate is OpenAPIV3_1.SchemaObject =>
          !!candidate && !("$ref" in candidate),
      );

    for (const inlineErrorSchema of inlineErrorSchemas) {
      schemaToTypes(inlineErrorSchema, collectorWriter, {
        onRef: addSharedType,
      });
    }

    const methodNameType = Case.pascal(opId);
    const params = (pathSpec.parameters || []).concat(
      methodSpec.parameters || [],
    );
    const pathParams = params.filter(
      (p) => "in" in p && p.in === "path",
    ) as ParameterObject[];

    for (const pathParam of pathParams) {
      schemaToTypes(pathParam.schema!, collectorWriter, {
        onRef: addSharedType,
      });
    }

    Object.entries(methodSpec.responses ?? {})
      .filter(([code]) => code.startsWith("2"))
      .map(([, response]) => resolveResponseObject(response) || response)
      .map((response) =>
        getResponse(
          methodNameType,
          response,
          responseType(methodNameType),
          (name) => addSharedType(name),
        ),
      );
  }

  writer.w("// Code generated by @sumup/sumup-ts-codegen. DO NOT EDIT.\n");
  writer.w(
    'import { APIResource, type RequestOptions, type WithResponse } from "../../core";',
  );
  for (const child of childClasses) {
    const module = `../${Case.kebab(child.tag.name)}`;
    writer.w(`import { ${child.className} } from ${JSON.stringify(module)};`);
    writer.w(`export * from ${JSON.stringify(module)};`);
  }

  const sortedSharedTypes = [...usedSharedTypes].sort((a, b) =>
    a > b ? 1 : -1,
  );
  if (sortedSharedTypes.length > 0) {
    writer.w(
      `import type { ${sortedSharedTypes.join(", ")} } from "../../types";`,
    );
  }

  for (const { methodSpec, queryParams, opId } of iterParams(spec.paths)) {
    if (!methodSpec.tags?.includes(tag.name)) {
      continue;
    }

    const opName = Case.pascal(opId);

    const body = getRequestBody(opId, methodSpec);
    if (body && !("$ref" in body.schema)) {
      writer.w0(`export type ${body.typeName} = `);
      schemaToTypes(body.schema, writer);
      writer.w("\n");
    }

    if (queryParams.length > 0) {
      writer.w(`export type ${queryParamsType(opName)} = {`);
      for (const param of queryParams) {
        const comment = docComment(
          extractDoc({
            ...param.schema,
            description: param.description || param.schema.description,
          }),
        );
        if (comment) {
          writer.w(comment);
        }

        writer.w(`  '${queryParameterName(param)}'`);
        if (!param.required) writer.w0("?");
        writer.w0(": ");
        // Empty query values are allowed independently of the value schema.
        schemaToTypes(
          param.allowEmptyValue
            ? { anyOf: [param.schema, { const: "" }] }
            : param.schema,
          writer,
        );
        writer.w(",");
      }
      writer.w("}\n");
    }

    const successResponse =
      methodSpec.responses?.["200"] ||
      methodSpec.responses?.["201"] ||
      methodSpec.responses?.["202"] ||
      methodSpec.responses?.["204"];

    const resp = responseSchema(
      successResponse
        ? resolveResponseObject(successResponse) || successResponse
        : successResponse,
    );
    if (resp && !("$ref" in resp)) {
      writer.w0(`export type ${responseType(opName)} = `);
      schemaToTypes(resp, writer);
      writer.w("\n");
    }

    const inlineErrorSchemas = Object.entries(methodSpec.responses ?? {})
      .filter(([code]) => !code.startsWith("2"))
      .map(([, response]) => resolveResponseObject(response) || response)
      .map((response) => responseSchema(response))
      .filter(
        (candidate): candidate is OpenAPIV3_1.SchemaObject =>
          !!candidate && !("$ref" in candidate),
      );

    if (inlineErrorSchemas.length > 0) {
      writer.w0(`export type ${errorType(opName)} = `);
      for (const [index, inlineErrorSchema] of inlineErrorSchemas.entries()) {
        if (index > 0) {
          writer.w0(" | ");
        }
        schemaToTypes(inlineErrorSchema, writer);
      }
      writer.w("\n");
    }
  }

  const classComment = docComment(
    [`API resource for the ${tag.name} endpoints.`, tag.description]
      .filter(Boolean)
      .join("\n\n"),
  );
  if (classComment) {
    writer.w(`${classComment}
export class ${resourceClassName} extends APIResource {`);
  }
  if (!classComment) {
    writer.w(`
export class ${resourceClassName} extends APIResource {`);
  }
  const usedMembers = new Set<string>();
  for (const { methodSpec, opId } of iterPathConfig(spec.paths)) {
    if (!methodSpec.tags?.includes(tag.name)) continue;
    const original = operationMethodName(methodSpec, opId);
    const name = scopedMethods.get(original) ?? original;
    usedMembers.add(name);
    usedMembers.add(`${name}WithResponse`);
  }
  for (const child of childClasses) {
    if (!child.accessor || usedMembers.has(child.accessor)) {
      throw new Error(
        `Resource ${tag.name} has conflicting accessor ${child.accessor}`,
      );
    }
    usedMembers.add(child.accessor);
    writer.w(
      `readonly ${child.accessor} = new ${child.className}(this._client);`,
    );
  }
  const compatibility = new Map<
    string,
    { accessor: string; target: string }[]
  >();
  for (const child of childClasses) {
    const childMethods = nestedMethodNames(spec, child.tag.name);
    for (const { methodSpec, opId } of iterPathConfig(spec.paths)) {
      if (!methodSpec.tags?.includes(child.tag.name)) continue;
      const name = operationMethodName(methodSpec, opId);
      const target = childMethods.get(name) ?? name;
      for (const variant of ["", "WithResponse"]) {
        const member = name + variant;
        compatibility.set(member, [
          ...(compatibility.get(member) ?? []),
          { accessor: child.accessor, target: target + variant },
        ]);
      }
    }
  }
  for (const [member, accessors] of compatibility) {
    if (usedMembers.has(member) || accessors.length !== 1) continue;
    const { accessor, target } = accessors[0];
    writer.w(`${member} = this.${accessor}.${target}.bind(this.${accessor});`);
  }
  for (const { methodSpec, pathSpec, opId, method, path } of iterPathConfig(
    spec.paths,
  )) {
    if (!methodSpec.tags?.includes(tag.name)) {
      continue;
    }

    const original = operationMethodName(methodSpec, opId);
    const methodName = scopedMethods.get(original) ?? original;
    const methodNameType = Case.pascal(opId);

    const params = (pathSpec.parameters || []).concat(
      methodSpec.parameters || [],
    );
    const pathParams = params.filter(
      (p) => "in" in p && p.in === "path",
    ) as ParameterObject[];
    const queryParams = params.filter(
      (p) => "in" in p && p.in === "query",
    ) as ParameterObject[];
    const renamedQueryParams = queryParams
      .map((param) => [queryParameterName(param), param.name] as const)
      .filter(([name, wireName]) => name !== wireName);

    const successResponses = Object.entries(methodSpec.responses ?? {})
      .filter(([code]) => code.startsWith("2"))
      .map(([, response]) => resolveResponseObject(response) || response)
      .map((response) =>
        getResponse(methodNameType, response, responseType(methodNameType)),
      );
    const successTypes = unique(successResponses);
    const successType = successTypes.join(" | ") || "void";

    const comment = docComment(methodSpec.description || methodSpec.summary);
    if (comment) {
      writer.w(comment);
    }

    const body = getRequestBody(opId, methodSpec);
    writer.w0(`${methodName}(`);

    if (pathParams.length > 0) {
      for (const param of pathParams) {
        writer.w0(Case.camel(param.name));
        writer.w0(": ");
        schemaToTypes(param.schema!, writer);
        writer.w0(", ");
      }
    }

    if (body) {
      writer.w0(`body${body.required ? "" : "?"}: ${body.typeName}, `);
    }

    if (queryParams.length > 0) {
      writer.w0("query");
      if (!queryParams.some((param) => param.required)) writer.w0("?");
      writer.w0(`: ${queryParamsType(methodNameType)}, `);
    }

    writer.w(`options?: RequestOptions): Promise<${successType}> {
         return this._client.${method}<${successType}>({
           path: ${pathToTemplateStr(path)},`);
    if (methodSpec.requestBody) {
      writer.w("  body,");
    }
    if (queryParams.length > 0) {
      if (renamedQueryParams.length > 0) {
        writer.w("  query: this._transformQueryParams(query, {");
        for (const [name, wireName] of renamedQueryParams) {
          writer.w(`    '${name}': '${wireName}',`);
        }
        writer.w("  }),");
      } else {
        writer.w("  query,");
      }
    }
    writer.w(`  ...options,
         })
      }\n`);

    writer.w0(`${methodName}WithResponse(`);

    if (pathParams.length > 0) {
      for (const param of pathParams) {
        writer.w0(Case.camel(param.name));
        writer.w0(": ");
        schemaToTypes(param.schema!, writer);
        writer.w0(", ");
      }
    }

    if (body) {
      writer.w0(`body${body.required ? "" : "?"}: ${body.typeName}, `);
    }

    if (queryParams.length > 0) {
      writer.w0("query");
      if (!queryParams.some((param) => param.required)) writer.w0("?");
      writer.w0(`: ${queryParamsType(methodNameType)}, `);
    }

    writer.w(
      `options?: RequestOptions): Promise<WithResponse<${successType}>> {
         return this._client.${method}WithResponse<${successType}>({
           path: ${pathToTemplateStr(path)},`,
    );
    if (methodSpec.requestBody) {
      writer.w("  body,");
    }
    if (queryParams.length > 0) {
      if (renamedQueryParams.length > 0) {
        writer.w("  query: this._transformQueryParams(query, {");
        for (const [name, wireName] of renamedQueryParams) {
          writer.w(`    '${name}': '${wireName}',`);
        }
        writer.w("  }),");
      } else {
        writer.w("  query,");
      }
    }
    writer.w(`  ...options,
         })
      }\n`);
  }
  writer.w("}");

  await writer.flush();
}
