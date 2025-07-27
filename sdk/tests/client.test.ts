import { describe, expect, it } from "vitest";

import { SumUp } from "../src";

describe("instantiate client", () => {
  const client = new SumUp({
    apiKey: "API_KEY",
  });

  it("default headers", () => {
    expect(JSON.stringify(client.baseParams)).toStrictEqual(
      JSON.stringify({
        headers: new Headers({
          "accept": "application/json",
          "authorization": "Bearer API_KEY",
          "content-type": "application/json",
          "user-agent": "sumup-ts/0.0.1",
        }),
      } as SumUp.FetchParams),
    );
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
