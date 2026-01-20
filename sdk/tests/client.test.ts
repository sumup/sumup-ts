import { describe, expect, it } from "vitest";

import { SumUp } from "../src";
import { API_VERSION } from "../src/api-version";
import { buildRuntimeHeaders } from "../src/runtime";
import { VERSION } from "../src/version";

describe("instantiate client", () => {
  const client = new SumUp({
    apiKey: "API_KEY",
  });

  it("default headers", () => {
    const headers = client.baseParams.headers as Headers;

    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer API_KEY");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("user-agent")).toBe(`sumup-ts/v${VERSION}`);
    expect(headers.get("x-sumup-api-version")).toBe(API_VERSION);

    const runtimeHeaders = buildRuntimeHeaders();
    for (const [key, value] of Object.entries(runtimeHeaders)) {
      expect(headers.get(key)).toBe(value);
    }
  });
});

// biome-ignore lint/suspicious/noExplicitAny: any, but only for tests
const { stringifyQuery } = SumUp.prototype as any;

describe("query string", () => {
  it("works", () => {
    expect(
      stringifyQuery({
        "a": "b",
        "foo": false,
        "x": null,
        "include": ["1", "2"],
      }),
    ).toEqual("a=b&foo=false&x=&include=1&include=2");
  });
});
