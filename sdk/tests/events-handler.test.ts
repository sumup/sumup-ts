import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import SumUp, {
  APIError,
  EventCallbackError,
  EventError,
  EventPayloadError,
  EventSignatureError,
  EventSignatureExpiredError,
  EventTimestampError,
  MemberCreatedEvent,
  MemberDeletedEvent,
  MemberUpdatedEvent,
  ReaderCreatedEvent,
  ReaderDeletedEvent,
  UnknownEvent,
  verifyEventSignature,
} from "../src";

const now = 1234567890;
const secret = "test-secret";
const client = new SumUp({
  apiKey: "api-key",
  host: "https://local.test/base",
});
const payload = (
  type = "members.updated",
  objectType = "member",
  url = "https://api.sumup.com/object/a%2Fb?x=1&x=2",
) =>
  JSON.stringify({
    id: "evt_123",
    type,
    created_at: "2026-04-11T10:00:00Z",
    object: { id: "obj_123", type: objectType, url },
  });
// Independent Node HMAC implementation; never use the SDK to sign its own tests.
const signature = (
  body: string | Uint8Array,
  timestamp = String(now),
  key = secret,
) =>
  `t=${timestamp},v1=${createHmac("sha256", key).update(`v1:${timestamp}:`).update(body).digest("hex")}`;

beforeEach(() => {
  rs.spyOn(Date, "now").mockReturnValue(now * 1000);
});
afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
});

describe("verifyEventSignature", () => {
  it("verifies the fixture shared with the Go and Rust SDKs", async () => {
    await expect(
      verifyEventSignature(
        secret,
        '{"id":"evt_123"}',
        "t=1234567890,v1=02e9076b318aadab2e3d14549950465512b32a100ea122b5bcb815f13d4b3153",
      ),
    ).resolves.toBeUndefined();
  });
  it("accepts uppercase hex and preserves leading timestamp zeros", async () => {
    const header = signature("{}", `0${now}`);
    const [timestamp, digest] = header.split(",v1=");
    await expect(
      verifyEventSignature(
        secret,
        "{}",
        `${timestamp},v1=${digest?.toUpperCase()}`,
      ),
    ).resolves.toBeUndefined();
  });
  it("checks expiry before a malformed digest", async () => {
    await expect(
      verifyEventSignature(secret, "{}", `t=${now - 301},v1=invalid`),
    ).rejects.toBeInstanceOf(EventSignatureExpiredError);
  });
  it.each([-301, -300, 0, 300, 301])(
    "enforces the fixed boundary at %s seconds",
    async (skew) => {
      const result = verifyEventSignature(
        secret,
        "{}",
        signature("{}", String(now + skew)),
      );
      if (Math.abs(skew) <= 300) await expect(result).resolves.toBeUndefined();
      else
        await expect(result).rejects.toBeInstanceOf(EventSignatureExpiredError);
    },
  );
  it.each(["", "-1", "+1", "1e9", "1.5", "0x123", "NaN", "9007199254740992"])(
    "rejects malformed timestamp %s",
    async (stamp) => {
      await expect(
        verifyEventSignature(secret, "{}", `t=${stamp},v1=${"0".repeat(64)}`),
      ).rejects.toBeInstanceOf(EventTimestampError);
    },
  );
  it.each([
    "",
    "v1=deadbeef",
    `t=${now},v1=deadbeef`,
    `t=${now},v2=${"0".repeat(64)}`,
    `t=${now},V1=${"0".repeat(64)}`,
    `t=${now},v1=${"z".repeat(64)}`,
    `${signature("{}")},t=${now}`,
    `${signature("{}")},v1=${"0".repeat(64)}`,
    `${signature("{}")}=ignored`,
  ])("rejects malformed header %s", async (header) => {
    await expect(
      verifyEventSignature(secret, "{}", header),
    ).rejects.toBeInstanceOf(EventSignatureError);
  });
  it("rejects changed body, changed timestamp, wrong secret, and empty secret", async () => {
    await expect(
      verifyEventSignature(secret, "{}\n", signature("{}")),
    ).rejects.toBeInstanceOf(EventSignatureError);
    await expect(
      verifyEventSignature(
        secret,
        "{}",
        signature("{}").replace(String(now), String(now + 1)),
      ),
    ).rejects.toBeInstanceOf(EventSignatureError);
    await expect(
      verifyEventSignature("wrong", "{}", signature("{}")),
    ).rejects.toBeInstanceOf(EventSignatureError);
    await expect(
      verifyEventSignature("", "{}", signature("{}")),
    ).rejects.toBeInstanceOf(EventSignatureError);
  });
  it("verifies raw bytes even when they are not UTF-8", async () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0]);
    await expect(
      verifyEventSignature(secret, bytes, signature(bytes)),
    ).resolves.toBeUndefined();
    await expect(
      client.parseEventNotification(secret, bytes, signature(bytes)),
    ).rejects.toBeInstanceOf(EventPayloadError);
  });
  it("honors array view offsets and preserves non-ASCII bytes", async () => {
    const body = payload().replace("evt_123", "evt_é");
    const bytes = new TextEncoder().encode(`padding${body}tail`);
    const view = new DataView(bytes.buffer, 7, bytes.byteLength - 11);
    const event = await client.parseEventNotification(
      secret,
      view,
      signature(body),
    );
    expect(event.id).toBe("evt_é");
    await expect(
      verifyEventSignature(
        secret,
        new TextEncoder().encode(body).buffer,
        signature(body),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("parseEventNotification", () => {
  it.each([
    ["members.created", "member", MemberCreatedEvent],
    ["members.updated", "member", MemberUpdatedEvent],
    ["members.deleted", "member", MemberDeletedEvent],
    ["readers.created", "reader", ReaderCreatedEvent],
    ["readers.deleted", "reader", ReaderDeletedEvent],
  ] as const)(
    "returns the generated class for %s",
    async (type, objectType, eventClass) => {
      const body = payload(type, objectType);
      const event = await client.parseEventNotification(
        secret,
        body,
        signature(body),
      );
      expect(event).toBeInstanceOf(eventClass);
      expect(event.createdAt.toISOString()).toBe("2026-04-11T10:00:00.000Z");
    },
  );
  it("retains unknown notifications", () => {
    expect(
      client.parseEventNotificationWithoutVerification(payload("future.event")),
    ).toBeInstanceOf(UnknownEvent);
    expect(
      client.parseEventNotificationWithoutVerification(payload("constructor")),
    ).toBeInstanceOf(UnknownEvent);
  });
  it("verifies before parsing", async () => {
    await expect(
      client.parseEventNotification(secret, "{", signature("{}")),
    ).rejects.toBeInstanceOf(EventSignatureError);
  });
  it("owns its input across asynchronous verification", async () => {
    const body = payload();
    const bytes = new TextEncoder().encode(body);
    const parsed = client.parseEventNotification(
      secret,
      bytes,
      signature(body),
    );
    bytes.fill(0);
    expect((await parsed).id).toBe("evt_123");
  });
  it.each([
    "{",
    "null",
    "[]",
    "{}",
    `${payload()} {}`,
    payload().replace("2026-04-11T10:00:00Z", "invalid"),
    payload().replace("2026-04-11T10:00:00Z", "1"),
    payload("members.updated", "reader"),
  ])("rejects invalid envelope %s", (body) => {
    expect(() =>
      client.parseEventNotificationWithoutVerification(body),
    ).toThrow(EventPayloadError);
  });
  it.each(["id", "type", "created_at", "object"])("requires %s", (key) => {
    const body = JSON.parse(payload());
    delete body[key];
    expect(() =>
      client.parseEventNotificationWithoutVerification(JSON.stringify(body)),
    ).toThrow(EventPayloadError);
  });
  it.each(["id", "type", "url"])("rejects empty object.%s", (key) => {
    const body = JSON.parse(payload());
    body.object[key] = "";
    expect(() =>
      client.parseEventNotificationWithoutVerification(JSON.stringify(body)),
    ).toThrow(EventPayloadError);
  });
});

describe("fetchObject", () => {
  it.each([
    "https://user:password@local.test/object/a%2Fb?x=1&x=2#fragment",
    "https://local.test/object/a%2Fb?x=1&x=2",
    "https://local.test:443/object/a%2Fb?x=1&x=2",
  ])("normalizes %s and preserves request options", async (url) => {
    const fetch = rs.fn(
      async () =>
        new Response('{"id":"obj_123"}', {
          headers: { "content-type": "application/json" },
        }),
    );
    rs.stubGlobal("fetch", fetch);
    const event = client.parseEventNotificationWithoutVerification(
      payload("members.updated", "member", url),
    );
    const signal = new AbortController().signal;
    await expect(
      event.fetchObject({ signal, headers: { "X-Example": "yes" } }),
    ).resolves.toEqual({ id: "obj_123" });
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://local.test/base/object/a%2Fb?x=1&x=2"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const headers = new Headers(
      (fetch.mock.calls[0] as unknown as [URL, RequestInit])[1].headers,
    );
    expect(headers.get("authorization")).toBe("Bearer api-key");
    expect(headers.get("x-example")).toBe("yes");
  });
  it.each([
    "/object",
    "https://api.sumup.com/object",
    "http://local.test/object",
    "https://local.test:8443/object",
    "https://local.test.evil/object",
    "//api.sumup.com/object",
    "https://api.sumup.com.evil/object",
    "http://api.sumup.com/object",
    "file:///etc/passwd",
    "https://evil.test/object",
  ])("rejects %s before fetch", async (url) => {
    const fetch = rs.fn();
    rs.stubGlobal("fetch", fetch);
    const event = client.parseEventNotificationWithoutVerification(
      payload("future.event", "resource", url),
    );
    await expect(event.fetchObject()).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves structured API errors", async () => {
    rs.stubGlobal(
      "fetch",
      rs.fn(
        async () =>
          new Response('{"type":"about:blank","detail":"deleted"}', {
            status: 404,
            headers: { "content-type": "application/problem+json" },
          }),
      ),
    );
    const event = client.parseEventNotificationWithoutVerification(
      payload("members.updated", "member", "https://local.test/object"),
    );
    await expect(event.fetchObject()).rejects.toMatchObject({
      status: 404,
      error: { type: "about:blank", detail: "deleted" },
    });
    await expect(event.fetchObject()).rejects.toBeInstanceOf(APIError);
  });
  it("fetches unknown objects and propagates cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    rs.stubGlobal(
      "fetch",
      rs.fn(async (_: unknown, init?: RequestInit) => {
        init?.signal?.throwIfAborted();
        return new Response("{}");
      }),
    );
    const event = client.parseEventNotificationWithoutVerification(
      payload("future.event", "resource", "https://local.test/object"),
    );
    await expect(
      event.fetchObject({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("EventsHandler", () => {
  it("routes typed callbacks and falls back for known and unknown events", async () => {
    const seen: string[] = [];
    const handler = client.eventsHandler(secret, (event) => {
      seen.push(`fallback:${event.type}`);
    });
    handler.on("members.updated", (event) => {
      const typed: MemberUpdatedEvent = event;
      seen.push(typed.type);
      handler.on("readers.created", (event) => {
        seen.push(event.type);
      });
    });
    for (const [type, kind] of [
      ["members.updated", "member"],
      ["readers.created", "reader"],
      ["members.deleted", "member"],
      ["future.event", "resource"],
    ]) {
      const body = payload(type, kind);
      await handler.handle(body, signature(body));
    }
    expect(seen).toEqual([
      "members.updated",
      "readers.created",
      "fallback:members.deleted",
      "fallback:future.event",
    ]);
    // Compile-time checks for generated callback inference.
    // biome-ignore lint/correctness/noConstantCondition: compile-time negative API checks.
    if (false) {
      // @ts-expect-error unsupported wire event name
      handler.on("member.updated", () => {});
      // @ts-expect-error reader callbacks cannot accept member events
      handler.on("readers.deleted", (_event: MemberUpdatedEvent) => {});
    }
  });
  it("rejects empty secrets and duplicate registrations", () => {
    expect(() => client.eventsHandler("", () => {})).toThrow(
      EventSignatureError,
    );
    const handler = client
      .eventsHandler(secret, () => {})
      .on("members.updated", () => {});
    expect(() => handler.on("members.updated", () => {})).toThrow(EventError);
  });
  it("verifies before dispatch and awaits callback failures", async () => {
    const cause = new Error("processing failed");
    const callback = rs.fn(async () => {
      throw cause;
    });
    const handler = client.eventsHandler(secret, callback);
    const body = payload();
    await expect(handler.handle(body, signature("{}"))).rejects.toBeInstanceOf(
      EventSignatureError,
    );
    expect(callback).not.toHaveBeenCalled();
    await expect(handler.handle(body, signature(body))).rejects.toMatchObject({
      cause,
    });
    await expect(handler.handle(body, signature(body))).rejects.toBeInstanceOf(
      EventCallbackError,
    );
  });
  it("parses verified bytes without dispatching callbacks", async () => {
    const callback = rs.fn();
    const handler = client.eventsHandler(secret, callback);
    const body = payload();
    expect(await handler.parse(body, signature(body))).toBeInstanceOf(
      MemberUpdatedEvent,
    );
    expect(callback).not.toHaveBeenCalled();
    await handler.handle(body, signature(body));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("EventsHandler.handleRequest", () => {
  const request = (body: string, header?: string) =>
    new Request("https://local.test/events", {
      method: "POST",
      body,
      headers: header ? { "X-SumUp-Webhook-Signature": header } : {},
    });

  it("consumes the raw body and dispatches the typed event", async () => {
    const callback = rs.fn();
    const handler = client
      .eventsHandler(secret, () => {})
      .on("members.updated", callback);
    const body = ` \n${payload()}\n`;
    const incoming = request(body, signature(body));
    await handler.handleRequest(incoming);
    expect(incoming.bodyUsed).toBe(true);
    expect(callback).toHaveBeenCalledWith(expect.any(MemberUpdatedEvent));
  });

  it.each([undefined, "invalid"])(
    "rejects signature %s before dispatch",
    async (header) => {
      const callback = rs.fn();
      await expect(
        client
          .eventsHandler(secret, callback)
          .handleRequest(request(payload(), header)),
      ).rejects.toBeInstanceOf(EventSignatureError);
      expect(callback).not.toHaveBeenCalled();
    },
  );

  it("awaits and propagates callback failures", async () => {
    const cause = new Error("processing failed");
    const handler = client.eventsHandler(secret, async () => {
      throw cause;
    });
    const body = payload();
    await expect(
      handler.handleRequest(request(body, signature(body))),
    ).rejects.toMatchObject({ cause });
  });
});
