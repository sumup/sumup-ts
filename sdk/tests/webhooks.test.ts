import { afterEach, describe, expect, it, vi } from "vitest";

import { SumUp } from "../src";
import {
  CheckoutCreatedEvent,
  DEFAULT_TOLERANCE_MS,
  SIGNATURE_VERSION,
  signPayload,
  WebhookError,
  WebhookEvent,
  WebhookPayloadError,
  WebhookSignatureError,
  WebhookSignatureExpiredError,
  WebhookTimestampError,
} from "../src/webhooks";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("webhooks", () => {
  it("creates a bound webhook handler from the client", () => {
    const client = new SumUp();

    const handler = client.webhookHandler("whsec_test");

    expect(handler).toBeDefined();
  });

  it("verifies a valid webhook signature", async () => {
    const client = new SumUp();
    const handler = client.webhookHandler("whsec_test");
    const body = JSON.stringify({
      id: "evt_123",
      type: "checkout.created",
      created_at: "2026-04-11T10:00:00Z",
      object: {
        id: "chk_123",
        type: "checkout",
        url: "https://api.sumup.com/v0.1/checkouts/chk_123",
      },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = `${SIGNATURE_VERSION}=${await signPayload(
      "whsec_test",
      timestamp,
      body,
    )}`;

    await expect(
      handler.verify(body, signature, String(timestamp)),
    ).resolves.toBeUndefined();
  });

  it("rejects invalid webhook timestamps", async () => {
    const handler = new SumUp().webhookHandler("whsec_test");

    await expect(
      handler.verify("{}", "v1=deadbeef", "not-a-timestamp"),
    ).rejects.toBeInstanceOf(WebhookTimestampError);
  });

  it("rejects expired webhook timestamps", async () => {
    const body = "{}";
    const timestamp = Math.floor(
      (Date.now() - DEFAULT_TOLERANCE_MS - 1000) / 1000,
    );
    const signature = `${SIGNATURE_VERSION}=${await signPayload(
      "whsec_test",
      timestamp,
      body,
    )}`;
    const handler = new SumUp().webhookHandler("whsec_test");

    await expect(
      handler.verify(body, signature, String(timestamp)),
    ).rejects.toBeInstanceOf(WebhookSignatureExpiredError);
  });

  it("parses typed webhook events", () => {
    const event = new SumUp().webhookHandler("whsec_test").parse(
      JSON.stringify({
        id: "evt_123",
        type: "checkout.created",
        created_at: "2026-04-11T10:00:00Z",
        object: {
          id: "chk_123",
          type: "checkout",
          url: "https://api.sumup.com/v0.1/checkouts/chk_123",
        },
      }),
    );

    expect(event).toBeInstanceOf(CheckoutCreatedEvent);
  });

  it("falls back to a generic webhook event for unknown event types", () => {
    const event = new SumUp().webhookHandler("whsec_test").parse(
      JSON.stringify({
        id: "evt_123",
        type: "checkout.unknown",
        created_at: "2026-04-11T10:00:00Z",
        object: {
          id: "chk_123",
          type: "checkout",
          url: "https://api.sumup.com/v0.1/checkouts/chk_123",
        },
      }),
    );

    expect(event).toBeInstanceOf(WebhookEvent);
  });

  it("rejects unexpected object types for known events", () => {
    const handler = new SumUp().webhookHandler("whsec_test");

    expect(() =>
      handler.parse(
        JSON.stringify({
          id: "evt_123",
          type: "checkout.created",
          created_at: "2026-04-11T10:00:00Z",
          object: {
            id: "mem_123",
            type: "member",
            url: "https://api.sumup.com/v0.1/merchants/MC123/members/mem_123",
          },
        }),
      ),
    ).toThrow(WebhookError);
  });

  it("rejects invalid webhook payload JSON", () => {
    const handler = new SumUp().webhookHandler("whsec_test");

    expect(() => handler.parse("{")).toThrow(WebhookPayloadError);
  });

  it("fetches the referenced object from typed events", async () => {
    const client = new SumUp();
    const getSpy = vi.spyOn(client, "get").mockImplementation(
      async () =>
        ({
          id: "chk_123",
          status: "PENDING",
        }) as never,
    );

    const event = client.webhookHandler("whsec_test").parse(
      JSON.stringify({
        id: "evt_123",
        type: "checkout.created",
        created_at: "2026-04-11T10:00:00Z",
        object: {
          id: "chk_123",
          type: "checkout",
          url: "https://api.sumup.com/v0.1/checkouts/chk_123",
        },
      }),
    );

    expect(event).toBeInstanceOf(CheckoutCreatedEvent);
    await expect(
      (event as CheckoutCreatedEvent).fetchObject(),
    ).resolves.toEqual({
      id: "chk_123",
      status: "PENDING",
    });
    expect(getSpy).toHaveBeenCalledWith({
      path: "https://api.sumup.com/v0.1/checkouts/chk_123",
    });
  });

  it("rejects invalid webhook signatures", async () => {
    const handler = new SumUp().webhookHandler("whsec_test");

    await expect(
      handler.verify(
        "{}",
        "v1=deadbeef",
        String(Math.floor(Date.now() / 1000)),
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });
});
