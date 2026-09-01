import SumUp from "../dist/index.js";

type Assert = (condition: unknown, message: string) => asserts condition;

const assert: Assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export async function runRuntimeSmoke(expectedRuntime: string): Promise<void> {
  const originalFetch = globalThis.fetch;
  let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;

  globalThis.fetch = async (input, init) => {
    request = { input, init };

    const response = new Response(JSON.stringify({ id: "checkout-id" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
    assert(
      response.headers.get("content-type") === "application/json",
      "The runtime did not construct the mock response correctly",
    );
    return response;
  };

  try {
    const client = new SumUp({
      host: "https://example.test",
    });
    const checkout = await client.checkouts.get("checkout-id", {
      authorization: "Bearer test-api-key",
    });

    assert(checkout.id === "checkout-id", "The response was not parsed");
    assert(request, "The SDK did not call fetch");
    assert(
      request.input.toString() ===
        "https://example.test/v0.1/checkouts/checkout-id",
      "The SDK called an unexpected URL",
    );
    assert(request.init, "The SDK did not pass request options to fetch");
    assert(request.init.method === "GET", "The SDK used an unexpected method");

    const headers = new Headers(request.init.headers);
    assert(
      headers.get("authorization") === "Bearer test-api-key",
      "The SDK did not set the authorization header",
    );
    assert(
      headers.get("x-sumup-runtime") === expectedRuntime,
      `Expected the ${expectedRuntime} runtime header`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

if (import.meta.main) {
  const runtimeGlobals = globalThis as typeof globalThis & {
    Bun?: unknown;
    Deno?: unknown;
  };
  const runtime = runtimeGlobals.Deno
    ? "deno"
    : runtimeGlobals.Bun
      ? "bun"
      : "";

  if (!runtime) {
    throw new Error("This smoke test must run in Deno or Bun");
  }

  await runRuntimeSmoke(runtime);
}
