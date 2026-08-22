import type { HTTPClient } from "./client";
import { SumUpError } from "./core";
import type { CheckoutSuccess } from "./types/checkout-success";
import type { Member } from "./types/member";

/** Header carrying the versioned webhook signature. */
export const SIGNATURE_HEADER = "X-SumUp-Webhook-Signature";
/** Header carrying the Unix timestamp used for signing. */
export const TIMESTAMP_HEADER = "X-SumUp-Webhook-Timestamp";
/** Current webhook signature scheme version. */
export const SIGNATURE_VERSION = "v1";
/** Default maximum allowed clock skew in milliseconds. */
export const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

/** Base class for webhook verification and parsing failures. */
export class WebhookError extends SumUpError {}

/** Error thrown when the webhook signature is missing or invalid. */
export class WebhookSignatureError extends WebhookError {}

/** Error thrown when the webhook timestamp header is missing or malformed. */
export class WebhookTimestampError extends WebhookError {}

/** Error thrown when the webhook timestamp falls outside the allowed tolerance. */
export class WebhookSignatureExpiredError extends WebhookSignatureError {}

/** Error thrown when the webhook payload is not valid JSON or has the wrong shape. */
export class WebhookPayloadError extends WebhookError {}

/** Reference to the resource associated with a webhook event. */
export type WebhookObject = {
  id: string;
  type: string;
  url: string;
};

type WebhookPayload = {
  id: string;
  type: string;
  created_at: string;
  object: WebhookObject;
};

export type KnownWebhookEventType =
  | "checkout.created"
  | "checkout.updated"
  | "checkout.paid"
  | "checkout.failed"
  | "checkout.expired"
  | "member.created"
  | "member.updated";

/** Generic SumUp webhook event envelope. */
export class WebhookEvent {
  readonly id: string;
  readonly type: string;
  readonly createdAt: Date;
  readonly object: WebhookObject;

  protected _client?: HTTPClient;

  constructor(payload: WebhookPayload) {
    this.id = payload.id;
    this.type = payload.type;
    this.createdAt = new Date(payload.created_at);
    this.object = payload.object;
  }

  /** Binds an SDK client so fetchable events can resolve their referenced object. */
  bindClient(client?: HTTPClient): this {
    this._client = client;
    return this;
  }
}

class FetchableWebhookEvent<T> extends WebhookEvent {
  /** Fetches the latest representation of the object referenced by this event. */
  async fetchObject(): Promise<T> {
    if (!this._client) {
      throw new SumUpError("Webhook event is not bound to a SumUp client.");
    }
    return this._client.get<T>({ path: this.object.url });
  }
}

/** Event emitted when a checkout is created. */
export class CheckoutCreatedEvent extends FetchableWebhookEvent<CheckoutSuccess> {}

/** Event emitted when a checkout is updated. */
export class CheckoutUpdatedEvent extends FetchableWebhookEvent<CheckoutSuccess> {}

/** Event emitted when a checkout is paid. */
export class CheckoutPaidEvent extends FetchableWebhookEvent<CheckoutSuccess> {}

/** Event emitted when a checkout payment attempt fails. */
export class CheckoutFailedEvent extends FetchableWebhookEvent<CheckoutSuccess> {}

/** Event emitted when a checkout expires. */
export class CheckoutExpiredEvent extends FetchableWebhookEvent<CheckoutSuccess> {}

/** Event emitted when a member is created. */
export class MemberCreatedEvent extends FetchableWebhookEvent<Member> {}

/** Event emitted when a member is updated. */
export class MemberUpdatedEvent extends FetchableWebhookEvent<Member> {}

export type KnownWebhookEvent =
  | CheckoutCreatedEvent
  | CheckoutUpdatedEvent
  | CheckoutPaidEvent
  | CheckoutFailedEvent
  | CheckoutExpiredEvent
  | MemberCreatedEvent
  | MemberUpdatedEvent;

/** Any webhook event the SDK can parse, including unknown event types. */
export type WebhookNotification = KnownWebhookEvent | WebhookEvent;

export class WebhookHandler {
  /**
   * Creates a webhook helper bound to an optional client and signing secret.
   *
   * When bound to a client, typed webhook events can resolve their referenced
   * API resource via `fetchObject()`.
   */
  constructor(
    private readonly client?: HTTPClient,
    private readonly secret?: string,
    private readonly toleranceMs: number = DEFAULT_TOLERANCE_MS,
  ) {}

  /** Verifies the webhook signature and timestamp headers for a raw payload. */
  async verify(
    body: string | ArrayBuffer | ArrayBufferView,
    signatureHeader: string,
    timestampHeader: string,
  ): Promise<void> {
    if (!signatureHeader) {
      throw new WebhookSignatureError("Missing webhook signature header.");
    }
    if (!timestampHeader) {
      throw new WebhookTimestampError("Missing webhook timestamp header.");
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp)) {
      throw new WebhookTimestampError("Invalid webhook timestamp header.");
    }
    if (Math.abs(Date.now() - timestamp * 1000) > this.toleranceMs) {
      throw new WebhookSignatureExpiredError(
        "Webhook timestamp outside allowed tolerance.",
      );
    }

    const [version, digest] = signatureHeader.split("=", 2);
    if (version !== SIGNATURE_VERSION || !digest) {
      throw new WebhookSignatureError("Invalid webhook signature header.");
    }
    if (!this.secret) {
      throw new WebhookSignatureError(
        "Webhook signing secret is not configured.",
      );
    }

    const expectedDigest = await signPayload(this.secret, timestamp, body);
    if (!safeEqualHex(expectedDigest, digest)) {
      throw new WebhookSignatureError("Invalid webhook signature.");
    }
  }

  /** Parses a raw webhook payload into the most specific known event type. */
  parse(body: string | ArrayBuffer | ArrayBufferView): WebhookNotification {
    const payload = parsePayload(body);
    const event = createKnownWebhookEvent(payload);
    if (!event) {
      return new WebhookEvent(payload).bindClient(this.client);
    }
    return event.bindClient(this.client);
  }

  /** Verifies the webhook and then parses it into an event object. */
  async verifyAndParse(
    body: string | ArrayBuffer | ArrayBufferView,
    signatureHeader: string,
    timestampHeader: string,
  ): Promise<WebhookNotification> {
    await this.verify(body, signatureHeader, timestampHeader);
    return this.parse(body);
  }
}

function parsePayload(
  body: string | ArrayBuffer | ArrayBufferView,
): WebhookPayload {
  let payload: unknown;
  try {
    payload = JSON.parse(toText(body));
  } catch (error) {
    throw new WebhookPayloadError(
      `Invalid webhook payload: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as WebhookPayload).id !== "string" ||
    typeof (payload as WebhookPayload).type !== "string" ||
    typeof (payload as WebhookPayload).created_at !== "string" ||
    !(payload as WebhookPayload).object ||
    typeof (payload as WebhookPayload).object.id !== "string" ||
    typeof (payload as WebhookPayload).object.type !== "string" ||
    typeof (payload as WebhookPayload).object.url !== "string"
  ) {
    throw new WebhookPayloadError("Invalid webhook payload shape.");
  }

  return payload as WebhookPayload;
}

function createKnownWebhookEvent(
  payload: WebhookPayload,
): KnownWebhookEvent | undefined {
  switch (payload.type) {
    case "checkout.created":
      assertObjectType(payload, "checkout");
      return new CheckoutCreatedEvent(payload);
    case "checkout.updated":
      assertObjectType(payload, "checkout");
      return new CheckoutUpdatedEvent(payload);
    case "checkout.paid":
      assertObjectType(payload, "checkout");
      return new CheckoutPaidEvent(payload);
    case "checkout.failed":
      assertObjectType(payload, "checkout");
      return new CheckoutFailedEvent(payload);
    case "checkout.expired":
      assertObjectType(payload, "checkout");
      return new CheckoutExpiredEvent(payload);
    case "member.created":
      assertObjectType(payload, "member");
      return new MemberCreatedEvent(payload);
    case "member.updated":
      assertObjectType(payload, "member");
      return new MemberUpdatedEvent(payload);
    default:
      return undefined;
  }
}

function assertObjectType(
  payload: WebhookPayload,
  expectedObjectType: WebhookObject["type"],
): void {
  if (payload.object.type !== expectedObjectType) {
    throw new WebhookError(
      `Unexpected object type '${payload.object.type}' for event '${payload.type}'.`,
    );
  }
}

/** Creates a versioned HMAC digest for the provided webhook payload. */
export async function signPayload(
  secret: string,
  timestamp: number,
  body: string | ArrayBuffer | ArrayBufferView,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(
      `${SIGNATURE_VERSION}:${timestamp}:${toText(body)}`,
    ),
  );
  return toHex(new Uint8Array(signature));
}

function toText(body: string | ArrayBuffer | ArrayBufferView): string {
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }
  return new TextDecoder().decode(body);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBytes = fromHex(left);
  const rightBytes = fromHex(right);
  if (!leftBytes || !rightBytes || leftBytes.length !== rightBytes.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    mismatch |= leftBytes[index] ^ rightBytes[index];
  }
  return mismatch === 0;
}

function fromHex(hex: string): Uint8Array | undefined {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    return undefined;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}
