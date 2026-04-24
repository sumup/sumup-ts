import { afterEach, describe, expect, it, vi } from "vitest";

import { SumUp } from "../src";
import { API_VERSION } from "../src/api-version";
import { mergeParams } from "../src/client";
import { APIError } from "../src/core";
import { buildRuntimeHeaders } from "../src/runtime";
import { VERSION } from "../src/version";

describe("instantiate client", () => {
  const client = new SumUp({
    apiKey: "API_KEY",
  });

  it("default headers", () => {
    const headers = client.baseParams.headers as Headers;

    expect(headers.get("accept")).toBe(
      "application/problem+json, application/json",
    );
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

describe("merge params", () => {
  it("allows per-request authorization to override the default client header", () => {
    const params = mergeParams(
      {
        headers: {
          Authorization: "Bearer default-token",
        },
      },
      {
        authorization: "Bearer request-token",
      },
    );

    const headers = new Headers(params.headers);
    expect(headers.get("authorization")).toBe("Bearer request-token");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("request options", () => {
  it("retries a request when the per-call override allows it", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "checkout-id" }), {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new SumUp({ maxRetries: 0 });
    const data = await client.checkouts.get("checkout-id", { maxRetries: 1 });

    expect(data).toEqual({ id: "checkout-id" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a request when the per-call timeout is exceeded", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_input: URL | RequestInfo, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener(
          "abort",
          () => {
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new SumUp();
    const request = client.checkouts.get("checkout-id", { timeout: 10 });
    const assertion = expect(request).rejects.toThrow(
      "Request timed out after 10ms.",
    );

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns parsed data and an unread response from companion withResponse methods", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "merchant-id" }), {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        }),
      ),
    );

    const client = new SumUp();
    const { data, response } = await client.merchants.getWithResponse("MC123");

    expect(data).toEqual({ id: "merchant-id" });
    expect(response.bodyUsed).toBe(false);
    await expect(response.json()).resolves.toEqual({ id: "merchant-id" });
  });

  it("still throws APIError from plain Promise-returning methods", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "nope" }), {
          headers: {
            "content-type": "application/json",
          },
          status: 400,
        }),
      ),
    );

    const client = new SumUp();

    await expect(client.merchants.get("MC123")).rejects.toBeInstanceOf(
      APIError,
    );
  });
});

describe("generated signatures", () => {
  it("accepts request options without an undefined query placeholder", () => {
    const client = new SumUp();
    const getSpy = vi
      .spyOn(client, "get")
      .mockReturnValue({} as ReturnType<typeof client.get>);

    client.checkouts.list({ timeout: 25 });

    expect(getSpy).toHaveBeenCalledWith({
      path: "/v0.1/checkouts",
      query: undefined,
      timeout: 25,
    });
  });

  it("still accepts explicit query params plus request options", () => {
    const client = new SumUp();
    const getSpy = vi
      .spyOn(client, "get")
      .mockReturnValue({} as ReturnType<typeof client.get>);

    client.checkouts.list({ checkout_reference: "ref-123" }, { timeout: 25 });

    expect(getSpy).toHaveBeenCalledWith({
      path: "/v0.1/checkouts",
      query: { checkout_reference: "ref-123" },
      timeout: 25,
    });
  });

  it("generates companion response-aware methods", () => {
    const client = new SumUp();
    const getWithResponseSpy = vi
      .spyOn(client, "getWithResponse")
      .mockResolvedValue({ data: [], response: new Response() });

    client.checkouts.listWithResponse({ timeout: 25 });

    expect(getWithResponseSpy).toHaveBeenCalledWith({
      path: "/v0.1/checkouts",
      query: undefined,
      timeout: 25,
    });
  });
});
