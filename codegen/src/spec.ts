import SwaggerParser from "@apidevtools/swagger-parser";
import type { Document } from "./openapi";

export async function loadSpec(specFile: string): Promise<Document> {
  const rawSpec = await SwaggerParser.parse(specFile);
  if (!("openapi" in rawSpec) || !rawSpec.openapi.startsWith("3.1.")) {
    throw new Error("Only OpenAPI 3.1 is currently supported");
  }
  return rawSpec as Document;
}
