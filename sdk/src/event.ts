import type { HTTPClient } from "./client";
import { type RequestOptions, SumUpError } from "./core";

/** Reference to the affected resource. Use the notification's fetchObject() method to retrieve it. */
export type EventObject = { id: string; type: string; url: string };

/** @internal Wire representation shared by generated event classes. */
export type EventPayload = {
  id: string;
  type: string;
  created_at: string;
  object: EventObject;
};

/** A thin notification. Fetching its object returns the latest resource state. */
export class EventBase<T = unknown> {
  /** Event identifier. Use it to deduplicate repeated deliveries. */
  readonly id: string;
  /** Event type, such as members.updated. */
  readonly type: string;
  /** When the event was created; distinct from the delivery's signing timestamp. */
  readonly createdAt: Date;
  /** Reference to the affected resource, rather than a snapshot of its data. */
  readonly object: EventObject;
  readonly #client: HTTPClient;

  /** @internal Events are created by the client's parsing methods. */
  constructor(payload: EventPayload, client: HTTPClient) {
    this.id = payload.id;
    this.type = payload.type;
    this.createdAt = new Date(payload.created_at);
    this.object = payload.object;
    this.#client = client;
  }

  /**
   * Retrieve the affected resource using the client that parsed this notification.
   * Returns current state, which may differ from the state when the event occurred.
   * URLs must match the client host origin. Credentials and fragments in the URL are
   * ignored; its path and query use the client's configured host.
   *
   * @param options - Per-request authentication, timeout, retry, and cancellation options.
   * @throws APIError for API failures, including 404 if the resource was deleted.
   * @throws SumUpError if the object URL is invalid or its origin does not match the client host.
   */
  async fetchObject(options: RequestOptions = {}): Promise<T> {
    let url: URL;
    try {
      url = new URL(this.object.url);
    } catch (cause) {
      throw new SumUpError("Invalid event object URL.", { cause });
    }
    if (url.origin !== new URL(this.#client.host).origin) {
      throw new SumUpError(
        "Event object URL must match the client host origin.",
      );
    }
    return this.#client.get<T>({ ...options, path: url.pathname + url.search });
  }
}

/**
 * An event type this SDK does not recognize. Routed to the handler's fallback callback.
 * Its metadata is available normally; fetchObject() returns unknown for you to validate.
 */
export class UnknownEvent extends EventBase<unknown> {}
