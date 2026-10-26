import { afterEach, describe, expect, it, rs } from "@rstest/core";

import { SumUp } from "../src";
import { API_VERSION } from "../src/api-version";
import { mergeParams } from "../src/client";
import { APIConnectionError, APIError } from "../src/core";
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
        "x": "",
        "omitted": undefined,
        "zero": 0,
        "include": ["1", "2"],
      }),
    ).toEqual("a=b&foo=false&x=&zero=0&include=1&include=2");
  });

  it("rejects null instead of treating it as an empty value", () => {
    expect(() => stringifyQuery({ x: null })).toThrow(
      "Cannot stringify type object; Expected string, number, boolean, or array.",
    );
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
  rs.restoreAllMocks();
  rs.useRealTimers();
});

describe("request options", () => {
  it("retries a request when the per-call override allows it", async () => {
    const fetchMock = rs
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
    rs.stubGlobal("fetch", fetchMock);

    const client = new SumUp({ maxRetries: 0 });
    const data = await client.checkouts.get("checkout-id", { maxRetries: 1 });

    expect(data).toEqual({ id: "checkout-id" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a request when the per-call timeout is exceeded", async () => {
    rs.useFakeTimers();

    const fetchMock = rs.fn((_input: URL | RequestInfo, init?: RequestInit) => {
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
    rs.stubGlobal("fetch", fetchMock);

    const client = new SumUp();
    const request = client.checkouts.get("checkout-id", { timeout: 10 });
    const assertion = expect(request).rejects.toThrow(
      "Request timed out after 10ms.",
    );

    await rs.advanceTimersByTimeAsync(10);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns parsed data and an unread response from companion withResponse methods", async () => {
    rs.stubGlobal(
      "fetch",
      rs.fn().mockResolvedValue(
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
    rs.stubGlobal(
      "fetch",
      rs.fn().mockResolvedValue(
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
  it.each(["list", "listWithResponse"] as const)(
    "%s preserves empty membership parent filters and omits undefined filters",
    async (method) => {
      const fetchMock = rs.fn().mockImplementation((_url: URL | RequestInfo) =>
        Promise.resolve(
          new Response(JSON.stringify({ items: [], total_count: 0 }), {
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      rs.stubGlobal("fetch", fetchMock);
      const client = new SumUp();

      await client.memberships[method]({
        "resource.parent.id": "",
        "resource.parent.type": "",
      });
      await client.memberships[method]({
        "resource.parent.id": undefined,
        "resource.parent.type": undefined,
      });
      await client.memberships[method]({
        "resource.parent.id": "parent & id",
        "resource.parent.type": "merchant",
      });

      const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
      expect(urls[0]?.pathname).toBe("/v0.1/memberships");
      expect(urls.map((url) => url.search)).toEqual([
        "?resource.parent.id=&resource.parent.type=",
        "",
        "?resource.parent.id=parent%20%26%20id&resource.parent.type=merchant",
      ]);
    },
  );

  it("maps ergonomic repeated query parameter names to their wire names", () => {
    const client = new SumUp();
    const getSpy = rs
      .spyOn(client, "get")
      .mockReturnValue({} as ReturnType<typeof client.get>);

    client.transactions.list("MC123", {
      limit: 10,
      statuses: ["SUCCESSFUL", "REFUNDED"],
      users: ["user-1", "user-2"],
    });

    expect(getSpy).toHaveBeenCalledWith({
      path: "/v2.1/merchants/MC123/transactions/history",
      query: {
        limit: 10,
        "statuses[]": ["SUCCESSFUL", "REFUNDED"],
        "users[]": ["user-1", "user-2"],
      },
    });
  });

  it("keeps request options in the final argument position", () => {
    const client = new SumUp();
    const getSpy = rs
      .spyOn(client, "get")
      .mockReturnValue({} as ReturnType<typeof client.get>);

    client.checkouts.list(undefined, { timeout: 25 });

    expect(getSpy).toHaveBeenCalledWith({
      path: "/v0.1/checkouts",
      query: undefined,
      timeout: 25,
    });
  });

  it("generates companion response-aware methods", () => {
    const client = new SumUp();
    const getWithResponseSpy = rs
      .spyOn(client, "getWithResponse")
      .mockResolvedValue({ data: [], response: new Response() });

    client.checkouts.listWithResponse(undefined, { timeout: 25 });

    expect(getWithResponseSpy).toHaveBeenCalledWith({
      path: "/v0.1/checkouts",
      query: undefined,
      timeout: 25,
    });
  });
});

describe("typed API errors", () => {
  it("exposes Problem fields and leaves the original response readable", async () => {
    const body = { type: "about:blank", detail: "Invalid amount" };
    rs.stubGlobal(
      "fetch",
      rs.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
          status: 400,
          headers: { "content-type": "application/problem+json" },
        }),
      ),
    );
    try {
      await new SumUp().merchants.get("MC123");
      throw new Error("Expected API error");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (!(error instanceof APIError)) throw error;
      expect(error.problem?.detail).toBe("Invalid amount");
      expect(error.message).toBe("400: Invalid amount");
      expect(await error.response.json()).toEqual(body);
    }
  });
  it("preserves malformed error JSON as an API error", async () => {
    rs.stubGlobal(
      "fetch",
      rs.fn().mockResolvedValue(
        new Response("{invalid", {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    try {
      await new SumUp().merchants.get("MC123");
      throw new Error("Expected API error");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (!(error instanceof APIError)) throw error;
      expect(error.status).toBe(400);
      expect(error.error).toBe("{invalid");
      expect(error.problem).toBeUndefined();
    }
  });
});

describe("transport errors", () => {
  it.each([new TypeError("Fetch failed"), new Error("Network failure")])(
    "keeps the original connection failure as the cause",
    async (cause) => {
      rs.stubGlobal("fetch", rs.fn().mockRejectedValue(cause));
      try {
        await new SumUp().merchants.get("MC123");
        throw new Error("Expected connection error");
      } catch (error) {
        expect(error).toBeInstanceOf(APIConnectionError);
        if (!(error instanceof APIConnectionError)) throw error;
        expect(error.cause).toBe(cause);
      }
    },
  );
  it("preserves caller cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const cause = new DOMException("Aborted", "AbortError");
    rs.stubGlobal("fetch", rs.fn().mockRejectedValue(cause));
    await expect(
      new SumUp().request({
        method: "GET",
        path: "/test",
        signal: controller.signal,
      }),
    ).rejects.toBe(cause);
  });
});
