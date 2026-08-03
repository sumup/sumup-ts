import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Case } from "change-case-all";
import type { OpenAPIV3_1 } from "openapi-types";
import { getRequestBody, iterPathConfig } from "./base";

export interface SampleCatalog {
  schemaVersion: 1;
  language: "typescript";
  sdk: {
    module: "@sumup/sdk";
    version: string;
  };
  openAPIVersion: string;
  samples: CodeSample[];
}

export interface CodeSample {
  id: string;
  operationId: string;
  example?: string;
  summary?: string;
  description?: string;
  httpMethod: string;
  path: string;
  sample: string;
}

interface RequestExample {
  name?: string;
  summary?: string;
  description?: string;
  value?: unknown;
  provided: boolean;
}

type Schema = OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
type Parameter = OpenAPIV3_1.ParameterObject;
type Operation = OpenAPIV3_1.OperationObject & {
  "x-codegen"?: { method_name?: string };
};

export function buildSampleCatalog(
  spec: OpenAPIV3_1.Document,
  sdkVersion: string,
): SampleCatalog {
  if (!sdkVersion.trim()) {
    throw new Error("SDK version must not be empty");
  }

  const samples = iterPathConfig(spec.paths).flatMap(
    ({ methodSpec, method, opId, path, pathSpec }) => {
      const operation = methodSpec as Operation;
      return requestExamples(spec, operation).map((example) => ({
        id: example.name ? `${opId}.${example.name}` : opId,
        operationId: opId,
        ...(example.name ? { example: example.name } : {}),
        ...optionalText("summary", example.summary || operation.summary),
        ...optionalText(
          "description",
          example.description || operation.description,
        ),
        httpMethod: method.toUpperCase(),
        path,
        sample: renderProgram(spec, operation, pathSpec, example),
      }));
    },
  );

  samples.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );

  return {
    schemaVersion: 1,
    language: "typescript",
    sdk: {
      module: "@sumup/sdk",
      version: sdkVersion.trim(),
    },
    openAPIVersion: spec.info.version,
    samples,
  };
}

export function readSDKVersion(filename: string): string {
  const parsed = JSON.parse(readFileSync(filename, "utf8")) as {
    version?: unknown;
  };
  if (typeof parsed.version !== "string" || !parsed.version.trim()) {
    throw new Error(`SDK version file ${filename} has no version`);
  }
  return parsed.version.trim();
}

export function writeSampleCatalog(
  catalog: SampleCatalog,
  output?: string,
): void {
  const encoded = `${JSON.stringify(catalog, null, 2)}\n`;
  if (!output) {
    process.stdout.write(encoded);
    return;
  }
  const filename = resolve(process.cwd(), output);
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, encoded);
}

function optionalText(key: "summary" | "description", value?: string) {
  const text = value?.trim();
  return text ? { [key]: text } : {};
}

function renderProgram(
  spec: OpenAPIV3_1.Document,
  operation: Operation,
  pathItem: OpenAPIV3_1.PathItemObject,
  example: RequestExample,
): string {
  const tag = operation.tags?.[0];
  if (!tag) {
    throw new Error(`Operation ${operation.operationId} has no tag`);
  }

  const parameters = [
    ...(pathItem.parameters || []),
    ...(operation.parameters || []),
  ]
    .map((parameter) => resolveParameter(spec, parameter))
    .filter((parameter): parameter is Parameter => parameter !== null);
  const pathParameters = parameters.filter(
    (parameter) => parameter.in === "path",
  );
  const queryParameters = parameters.filter(
    (parameter) => parameter.in === "query",
  );

  const args: unknown[] = pathParameters.map((parameter) =>
    sampleParameter(spec, parameter),
  );

  const body = getRequestBody(operation.operationId || "unknown", operation);
  if (body) {
    args.push(
      example.provided
        ? coerceValue(spec, body.schema, example.value, "body")
        : sampleSchema(spec, body.schema, "body"),
    );
  }

  const selectedQueryParameters = queryArguments(queryParameters);
  if (selectedQueryParameters.length > 0) {
    args.push(
      Object.fromEntries(
        selectedQueryParameters.map((parameter) => [
          parameter.name,
          sampleParameter(spec, parameter),
        ]),
      ),
    );
  }

  const methodName =
    operation["x-codegen"]?.method_name || operation.operationId || "unknown";
  const invocation = renderInvocation(
    `client.${Case.camel(tag)}.${Case.camel(methodName)}`,
    args,
  );

  return [
    'import SumUp from "@sumup/sdk";',
    "",
    "async function main() {",
    '  const client = new SumUp({ apiKey: "sup_sk_your_api_key" });',
    "",
    `  const result = await ${indentContinuation(invocation, 2)};`,
    "  console.log(result);",
    "}",
    "",
    "main().catch(console.error);",
    "",
  ].join("\n");
}

function renderInvocation(target: string, args: unknown[]): string {
  if (args.length === 0) {
    return `${target}()`;
  }
  const renderedArgs = args.map((value) => JSON.stringify(value, null, 2));
  return `${target}(\n${renderedArgs
    .map((value) => indent(value, 2))
    .join(",\n")}\n)`;
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return `${prefix}${value.replaceAll("\n", `\n${prefix}`)}`;
}

function indentContinuation(value: string, spaces: number): string {
  const lines = value.split("\n");
  return [
    lines[0],
    ...lines.slice(1).map((line) => `${" ".repeat(spaces)}${line}`),
  ].join("\n");
}

function queryArguments(parameters: Parameter[]): Parameter[] {
  const required = parameters.filter((parameter) => parameter.required);
  if (required.length > 0) {
    return required;
  }
  return parameters.length > 0 ? [parameters[0]] : [];
}

function sampleParameter(
  spec: OpenAPIV3_1.Document,
  parameter: Parameter,
): unknown {
  if (parameter.example !== undefined) {
    return parameter.example;
  }
  if (parameter.examples) {
    for (const name of Object.keys(parameter.examples).sort()) {
      const value = resolveExample(spec, parameter.examples[name]);
      if (value.provided) {
        return value.value;
      }
    }
  }
  return sampleSchema(spec, parameter.schema, parameter.name);
}

function sampleSchema(
  spec: OpenAPIV3_1.Document,
  schema: Schema | undefined,
  hint: string,
  depth = 0,
): unknown {
  if (!schema || depth > 10) {
    return null;
  }
  if ("$ref" in schema) {
    const resolved = resolveReference<Schema>(spec, schema.$ref);
    return resolved ? sampleSchema(spec, resolved, hint, depth + 1) : null;
  }
  if (schema.example !== undefined) {
    return coerceValue(spec, schema, schema.example, hint, depth + 1);
  }
  if (schema.default !== undefined) {
    return schema.default;
  }
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }
  if (schema.allOf) {
    return Object.assign(
      {},
      ...schema.allOf.map((part) => {
        const value = sampleSchema(spec, part, hint, depth + 1);
        return isObject(value) ? value : {};
      }),
    );
  }
  if (schema.oneOf?.length) {
    return sampleSchema(spec, schema.oneOf[0], hint, depth + 1);
  }
  if (schema.anyOf?.length) {
    return sampleSchema(spec, schema.anyOf[0], hint, depth + 1);
  }

  const type = schema.type || (schema.properties ? "object" : undefined);
  switch (type) {
    case "object": {
      const required = new Set(schema.required || []);
      return Object.fromEntries(
        Object.entries(schema.properties || {})
          .filter(
            ([name, property]) =>
              required.has(name) || schemaHasExample(property),
          )
          .map(([name, property]) => [
            name,
            sampleSchema(spec, property, name, depth + 1),
          ]),
      );
    }
    case "array":
      return [sampleSchema(spec, schema.items, hint, depth + 1)];
    case "boolean":
      return true;
    case "integer":
      return 1;
    case "number":
      return 10.1;
    default:
      return sampleString(schema, hint);
  }
}

function coerceValue(
  spec: OpenAPIV3_1.Document,
  schema: Schema,
  value: unknown,
  hint: string,
  depth = 0,
): unknown {
  if (depth > 10) return null;
  if ("$ref" in schema) {
    const resolved = resolveReference<Schema>(spec, schema.$ref);
    return resolved
      ? coerceValue(spec, resolved, value, hint, depth + 1)
      : value;
  }
  if (schema.allOf?.length) {
    return Object.assign(
      {},
      ...schema.allOf.map((part) => {
        const coerced = coerceValue(spec, part, value, hint, depth + 1);
        return isObject(coerced) ? coerced : {};
      }),
    );
  }
  if (schema.oneOf?.length || schema.anyOf?.length) {
    const candidates = schema.oneOf || schema.anyOf || [];
    const selected =
      candidates.find((candidate) =>
        schemaMatchesValue(spec, candidate, value),
      ) || candidates[0];
    return selected
      ? coerceValue(spec, selected, value, hint, depth + 1)
      : value;
  }

  const type = schema.type || (schema.properties ? "object" : undefined);
  if (type === "object") {
    const raw = isObject(value) ? value : {};
    const properties = Object.entries(schema.properties || {});
    const entries = properties
      .filter(([name]) => Object.hasOwn(raw, name))
      .map(
        ([name, property]) =>
          [
            name,
            coerceValue(spec, property, raw[name], name, depth + 1),
          ] as const,
      );
    for (const required of schema.required || []) {
      if (!entries.some(([name]) => name === required)) {
        const property = schema.properties?.[required];
        if (property) {
          entries.push([
            required,
            sampleSchema(spec, property, required, depth + 1),
          ]);
        }
      }
    }
    if (entries.length === 0 && properties.length > 0) {
      const [name, property] =
        properties.find(([, candidate]) =>
          schemaHasNestedExample(spec, candidate),
        ) || properties[0];
      entries.push([name, sampleSchema(spec, property, name, depth + 1)]);
    }
    return Object.fromEntries(entries);
  }
  if (type === "array") {
    const items = "items" in schema ? schema.items : undefined;
    const values = Array.isArray(value) ? value : [];
    return values.length > 0
      ? values.map((item) =>
          items ? coerceValue(spec, items, item, hint, depth + 1) : item,
        )
      : [sampleSchema(spec, items, hint, depth + 1)];
  }
  if (type === "boolean") return typeof value === "boolean" ? value : true;
  if (type === "integer" || type === "number") {
    return typeof value === "number" ? value : type === "integer" ? 1 : 10.1;
  }
  return typeof value === "string" ? value : sampleString(schema, hint);
}

function schemaMatchesValue(
  spec: OpenAPIV3_1.Document,
  schema: Schema,
  value: unknown,
): boolean {
  const resolved =
    "$ref" in schema ? resolveReference<Schema>(spec, schema.$ref) : schema;
  if (!resolved || "$ref" in resolved) return false;
  if (resolved.properties && isObject(value)) {
    return Object.keys(resolved.properties).some((name) =>
      Object.hasOwn(value, name),
    );
  }
  return true;
}

function schemaHasNestedExample(
  spec: OpenAPIV3_1.Document,
  schema: Schema,
  depth = 0,
): boolean {
  if (depth > 8) return false;
  if ("$ref" in schema) {
    const resolved = resolveReference<Schema>(spec, schema.$ref);
    return !!resolved && schemaHasNestedExample(spec, resolved, depth + 1);
  }
  return (
    schemaHasExample(schema) ||
    Object.values(schema.properties || {}).some((property) =>
      schemaHasNestedExample(spec, property, depth + 1),
    )
  );
}

function schemaHasExample(schema: Schema): boolean {
  return "$ref" in schema
    ? false
    : schema.example !== undefined ||
        schema.default !== undefined ||
        !!schema.enum?.length;
}

function sampleString(schema: OpenAPIV3_1.SchemaObject, hint: string): string {
  if (schema.format === "date") return "2025-01-01";
  if (schema.format === "date-time") return "2025-01-01T12:00:00Z";
  if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
  if (schema.format === "uri" || schema.format === "url") {
    return "https://example.com";
  }
  if (hint.includes("merchant_code")) return "M123456789";
  if (hint.includes("checkout")) return "checkout-id";
  if (hint.includes("email")) return "user@example.com";
  return "example";
}

function requestExamples(
  spec: OpenAPIV3_1.Document,
  operation: Operation,
): RequestExample[] {
  const requestBody = resolveRequestBody(spec, operation.requestBody);
  const media = requestBody?.content?.["application/json"];
  if (!media) {
    return [{ provided: false }];
  }
  if (media.examples && Object.keys(media.examples).length > 0) {
    return Object.keys(media.examples)
      .sort()
      .map((name) => {
        const example = resolveExample(spec, media.examples?.[name]);
        return { name, ...example };
      });
  }
  if (media.example !== undefined) {
    return [{ value: media.example, provided: true }];
  }
  if (media.schema) {
    return [
      {
        value: sampleSchema(spec, media.schema, "body"),
        provided: true,
      },
    ];
  }
  return [{ provided: false }];
}

function resolveExample(
  spec: OpenAPIV3_1.Document,
  example: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.ExampleObject | undefined,
): Omit<RequestExample, "name"> {
  if (!example) {
    return { provided: false };
  }
  const resolved =
    "$ref" in example
      ? resolveReference<OpenAPIV3_1.ExampleObject>(spec, example.$ref)
      : example;
  if (!resolved || resolved.value === undefined) {
    return { provided: false };
  }
  return {
    value: resolved.value,
    provided: true,
    ...optionalText("summary", resolved.summary),
    ...optionalText("description", resolved.description),
  };
}

function resolveRequestBody(
  spec: OpenAPIV3_1.Document,
  body: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.RequestBodyObject | undefined,
): OpenAPIV3_1.RequestBodyObject | null {
  if (!body) return null;
  if (!("$ref" in body)) return body;
  return resolveReference<OpenAPIV3_1.RequestBodyObject>(spec, body.$ref);
}

function resolveParameter(
  spec: OpenAPIV3_1.Document,
  parameter: OpenAPIV3_1.ReferenceObject | Parameter,
): Parameter | null {
  if (!("$ref" in parameter)) return parameter;
  return resolveReference<Parameter>(spec, parameter.$ref);
}

function resolveReference<T>(
  spec: OpenAPIV3_1.Document,
  reference: string,
): T | null {
  if (!reference.startsWith("#/")) return null;
  let value: unknown = spec;
  for (const part of reference.slice(2).split("/")) {
    if (!isObject(value)) return null;
    value = value[part.replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  return (value as T | undefined) || null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
