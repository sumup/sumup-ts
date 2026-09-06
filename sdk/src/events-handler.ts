import type { HTTPClient } from "./client";
import { SumUpError } from "./core";
import type { EventPayload } from "./event";
import { createEvent, type EventMap, type EventNotification } from "./events";

export {
  EventBase,
  type EventObject,
  UnknownEvent,
} from "./event";
export * from "./events";

/** HTTP header carrying the signing timestamp and signature. Pass its complete value to verification methods. */
export const SIGNATURE_HEADER = "X-SumUp-Webhook-Signature";
const TOLERANCE_SECONDS = 300;
/**
 * The unchanged request body, as bytes or a UTF-8 string. Includes Node.js Buffer.
 * Read it before any JSON middleware; parsing and reserializing changes signed bytes.
 */
export type EventBody = string | ArrayBuffer | ArrayBufferView;

/** Base class for event configuration, verification, parsing, and callback errors. */
export class EventError extends SumUpError {}
/** Missing signing secret, invalid signature, or invalid signing timestamp. */
export class EventSignatureError extends EventError {}
/** Missing or malformed signing timestamp. */
export class EventTimestampError extends EventSignatureError {}
/** Signing timestamp more than five minutes before or after the receiver's clock. */
export class EventSignatureExpiredError extends EventSignatureError {}
/** Invalid raw input, UTF-8, JSON, or a payload that is not a JSON object. */
export class EventPayloadError extends EventError {}
/**
 * The selected callback threw or rejected. The original error is available as cause.
 * Return a 5xx response to allow the delivery to be retried.
 */
export class EventCallbackError extends EventError {}

/**
 * Process an event synchronously or asynchronously. The handler awaits completion;
 * throw or reject to signal failure. Make side effects idempotent for repeat deliveries.
 */
export type EventCallback<T = EventNotification> = (
  event: T,
) => void | Promise<void>;

/**
 * Verify incoming events and dispatch them to typed callbacks.
 * Create a handler with client.eventsHandler(secret, fallback), then register callbacks with on().
 * Known events without a callback and unknown event types reach the fallback.
 * Calls may run concurrently; callbacks must synchronize shared state as needed.
 */
export class EventsHandler {
  readonly #client: HTTPClient;
  readonly #secret: string;
  readonly #fallback: EventCallback;
  readonly #callbacks = new Map<string, EventCallback>();

  /** Prefer client.eventsHandler(secret, fallback) to bind the handler to your API client. */
  constructor(client: HTTPClient, secret: string, fallback: EventCallback) {
    assertSecret(secret);
    if (typeof fallback !== "function")
      throw new EventError("An event fallback callback is required.");
    this.#client = client;
    this.#secret = secret;
    this.#fallback = fallback;
  }

  /**
   * Register a callback for an event type. Its event and fetched resource types are inferred.
   *
   * @returns This handler, for chaining registrations.
   * @throws {@link EventError} If the callback is missing or the type is already registered.
   */
  on<T extends keyof EventMap>(
    type: T,
    callback: EventCallback<EventMap[T]>,
  ): this {
    if (typeof callback !== "function")
      throw new EventError("An event callback is required.");
    if (this.#callbacks.has(type))
      throw new EventError(`Event callback already registered: ${type}.`);
    // The parser selects the matching generated class before dispatch.
    this.#callbacks.set(type, callback as EventCallback);
    return this;
  }

  /**
   * Verify and parse an incoming event without invoking callbacks.
   * Requires a signing timestamp within five minutes of the receiver's clock.
   * Event fields follow the API contract and are not separately validated.
   *
   * @param body - Unchanged request body, read before JSON parsing.
   * @param signature - Complete value of the {@link SIGNATURE_HEADER} header.
   * @returns A typed notification, or {@link UnknownEvent} for an unrecognized type.
   * @throws {@link EventSignatureError} If verification fails.
   * @throws {@link EventPayloadError} If the body cannot be decoded as a JSON object.
   */
  parse(body: EventBody, signature: string): Promise<EventNotification> {
    return parseEventNotification(this.#client, this.#secret, body, signature);
  }

  /**
   * Read a standard Fetch Request and process it with {@link EventsHandler.handle}.
   * Consumes the entire body and reads {@link SIGNATURE_HEADER}; do not read the body first.
   * Configure body-size limits in your server or hosting platform and send the response yourself.
   * Use handle(body, signature) with Express or other frameworks that provide a different request type.
   *
   * @throws Propagates body-read errors and verification, parsing, or callback errors from handle().
   */
  async handleRequest(request: Request): Promise<void> {
    await this.handle(
      await request.arrayBuffer(),
      request.headers.get(SIGNATURE_HEADER) ?? "",
    );
  }

  /**
   * Verify and parse an event, then await its registered callback or the fallback.
   * Callbacks only run after successful verification and parsing.
   * Acknowledge delivery with a 2xx response only after this promise resolves.
   *
   * @param body - Unchanged request body. The caller owns reading and limiting it.
   * @param signature - Complete value of the {@link SIGNATURE_HEADER} header.
   * @throws {@link EventSignatureError} If verification fails, including the five-minute timestamp check.
   * @throws {@link EventPayloadError} If the body cannot be decoded as a JSON object.
   * @throws {@link EventCallbackError} If processing fails; its cause holds the original error.
   */
  async handle(body: EventBody, signature: string): Promise<void> {
    const event = await this.parse(body, signature);
    const callback = this.#callbacks.get(event.type) ?? this.#fallback;
    try {
      await callback(event);
    } catch (cause) {
      throw new EventCallbackError("Event callback failed.", { cause });
    }
  }
}

/**
 * Verify the signature and signing timestamp without parsing the event or running callbacks.
 * Use before storing a delivery in a trusted queue; workers can later use
 * client.parseEventNotificationWithoutVerification() on the stored payload.
 *
 * @param secret - Your event signing secret, not an API key.
 * @param body - Unchanged request body, read before JSON parsing.
 * @param signature - Complete value of the {@link SIGNATURE_HEADER} header.
 * @throws {@link EventSignatureError} If the secret is missing, the signature is invalid,
 * or the timestamp is more than five minutes before or after the receiver's clock.
 * @remarks Requires Web Crypto (globalThis.crypto.subtle). Successful verification does not validate JSON.
 */
export async function verifyEventSignature(
  secret: string,
  body: EventBody,
  signature: string,
): Promise<void> {
  await verifyBytes(secret, toBytes(body), signature);
}

/** @internal Used by the public client and handler. */
export async function parseEventNotification(
  client: HTTPClient,
  secret: string,
  body: EventBody,
  signature: string,
): Promise<EventNotification> {
  // Own the bytes across the asynchronous verification boundary.
  const bytes = toBytes(body);
  await verifyBytes(secret, bytes, signature);
  return parse(client, bytes);
}

/** @internal Used by the public client for already verified input. */
export function parseEventNotificationWithoutVerification(
  client: HTTPClient,
  body: EventBody,
): EventNotification {
  return parse(client, toBytes(body));
}

function assertSecret(secret: string): void {
  if (typeof secret !== "string" || !secret)
    throw new EventSignatureError("Event signing secret is required.");
}

function parseSignatureHeader(header: string): {
  timestampText: string;
  signatureBytes: Uint8Array<ArrayBuffer>;
} {
  const [timestampField, signatureField, ...extraFields] = header
    .trim()
    .split(",");
  if (!timestampField?.startsWith("t="))
    throw new EventTimestampError("Missing signing timestamp.");

  const timestampText = timestampField.slice(2);
  const timestamp = Number(timestampText);
  if (!/^\d+$/.test(timestampText) || !Number.isSafeInteger(timestamp))
    throw new EventTimestampError("Invalid signing timestamp.");

  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (Math.abs(ageSeconds) > TOLERANCE_SECONDS)
    throw new EventSignatureExpiredError(
      "Event timestamp outside the five-minute window.",
    );

  if (
    extraFields.length ||
    !signatureField ||
    !/^v1=[0-9a-fA-F]{64}$/.test(signatureField)
  )
    throw new EventSignatureError("Invalid event signature header.");

  const signatureHex = signatureField.slice(3);
  const signatureBytes = new Uint8Array(signatureHex.length / 2);
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureBytes[i] = Number.parseInt(
      signatureHex.slice(i * 2, i * 2 + 2),
      16,
    );
  }
  return { timestampText, signatureBytes };
}

async function verifyBytes(
  secret: string,
  body: Uint8Array<ArrayBuffer>,
  signature: string,
): Promise<void> {
  assertSecret(secret);
  const { timestampText, signatureBytes } = parseSignatureHeader(signature);

  // Preserve the timestamp's original spelling and the exact request bytes.
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`v1:${timestampText}:`);
  const signedPayload = new Uint8Array(prefix.length + body.length);
  signedPayload.set(prefix);
  signedPayload.set(body, prefix.length);

  const subtle = globalThis.crypto?.subtle;
  if (!subtle)
    throw new EventError(
      "Event verification requires Web Crypto (globalThis.crypto.subtle).",
    );
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  if (!(await subtle.verify("HMAC", key, signatureBytes, signedPayload)))
    throw new EventSignatureError("Invalid event signature.");
}

function toBytes(body: EventBody): Uint8Array<ArrayBuffer> {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (ArrayBuffer.isView(body))
    return new Uint8Array(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
    );
  if (body instanceof ArrayBuffer) return new Uint8Array(new Uint8Array(body));
  throw new EventPayloadError(
    "Expected raw request bytes or a string, not parsed JSON.",
  );
}

function parse(
  client: HTTPClient,
  bytes: Uint8Array<ArrayBuffer>,
): EventNotification {
  let payload: unknown;
  try {
    payload = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch (cause) {
    throw new EventPayloadError("Invalid event JSON or UTF-8.", { cause });
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    throw new EventPayloadError("Expected an event JSON object.");
  return createEvent(payload as EventPayload, client);
}
