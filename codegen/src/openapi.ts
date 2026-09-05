import type { OpenAPIV3_1 } from "openapi-types";

// openapi-types 12.x retains 3.0 parameters and intersects 3.0 operations
// into PathItemObject. Replace those fields so nested schemas accept 3.1 types.
export type ParameterObject = Omit<
  OpenAPIV3_1.ParameterObject,
  "schema" | "content"
> & {
  schema?: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
  content?: Record<string, OpenAPIV3_1.MediaTypeObject>;
};
export type OperationObject<T extends object = object> = Omit<
  OpenAPIV3_1.OperationObject<T>,
  "parameters"
> & {
  parameters?: (ParameterObject | OpenAPIV3_1.ReferenceObject)[];
};
export type PathItemObject = Omit<
  OpenAPIV3_1.PathItemObject,
  OpenAPIV3_1.HttpMethods | "parameters"
> & {
  parameters?: (ParameterObject | OpenAPIV3_1.ReferenceObject)[];
} & { [method in OpenAPIV3_1.HttpMethods]?: OperationObject };
export type Document<T extends object = object> = Omit<
  OpenAPIV3_1.Document<T>,
  "paths"
> & {
  paths?: Record<string, PathItemObject | undefined>;
};
