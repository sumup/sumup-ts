// Code generated by @sumup/ts-sdk-gen@0.0.1. DO NOT EDIT.

import * as Core from "../../core";

/**
 * Affiliate metadata for the transaction.
 * It is an optional field that allow for integrators to track the source of the transaction.
 *
 */
export type Affiliate = {
  /**
   * Application ID of the affiliate.
   * It is a unique identifier for the application and should be set by the integrator in the [Affiliate Keys](https://developer.sumup.com/affiliate-keys) page.
   *
   */
  app_id: string;
  /**
   * Key of the affiliate.
   * It is a unique identifier for the key  and should be generated by the integrator in the [Affiliate Keys](https://developer.sumup.com/affiliate-keys) page.
   *
   */
  key: string;
  /**
   * Foreign transaction ID of the affiliate.
   * It is a unique identifier for the transaction.
   * It can be used later to fetch the transaction details via the [Transactions API](https://developer.sumup.com/api/transactions/get).
   *
   */
  foreign_transaction_id: string;
  /**
   * Additional metadata for the transaction.
   * It is key-value object that can be associated with the transaction.
   *
   */
  tags?: Record<string, unknown>;
};

/**
 * Amount of the transaction.
 * The amount is represented as an integer value altogether with the currency and the minor unit.
 * For example, EUR 1.00 is represented as value 100 with minor unit of 2.
 *
 */
export type CreateReaderCheckoutAmount = {
  /**
   * Total amount of the transaction.
   * It must be a positive integer.
   *
   */
  value: number;
  /**
   * Currency ISO 4217 code
   */
  currency: string;
  /**
   * The minor units of the currency. It represents the number of decimals of the currency.
   * For the currencies CLP, COP and HUF, the minor unit is 0.
   *
   */
  minor_unit: number;
};

/**
 * Reader
 *
 * Reader Checkout
 */
export type CreateReaderCheckout = {
  /**
   * Description of the checkout to be shown in the Merchant Sales
   *
   */
  description?: string;
  /**
   * The card type of the card used for the transaction.
   * Is is required only for some countries (e.g: Brazil).
   *
   */
  card_type?: "credit" | "debit";
  /**
   * Number of installments for the transaction.
   * It may vary according to the merchant country.
   * For example, in Brazil, the maximum number of installments is 12.
   *
   */
  installments?: number;
  /**
   * Webhook URL to which the payment result will be sent.
   * It must be a HTTPS url.
   *
   */
  return_url?: string;
  total_amount: CreateReaderCheckoutAmount;
  /**
   * List of tipping rates to be displayed to the cardholder.
   * The rates are in percentage and should be between 0.01 and 0.99.
   * The list should be sorted in ascending order.
   *
   */
  tip_rates?: number[];
  affiliate?: Affiliate;
};

/**
 * Unique identifier of the object.
 * Note that this identifies the instance of the physical devices pairing with your SumUp account.
 * If you DELETE a reader, and pair the device again, the ID will be different. Do not use this ID to refer to a physical device.
 */
export type ReaderID = string;

/**
 * Custom human-readable, user-defined name for easier identification of the reader.
 */
export type ReaderName = string;

/**
 * The status of the reader object gives information about the current state of the reader.
 *
 * Possible values:
 *
 * - `unknown` - The reader status is unknown.
 * - `processing` - The reader is created and waits for the physical device to confirm the pairing.
 * - `paired` - The reader is paired with a merchant account and can be used with SumUp APIs.
 * - `expired` - The pairing is expired and no longer usable with the account. The resource needs to get recreated
 */
export type ReaderStatus = "unknown" | "processing" | "paired" | "expired";

/**
 * Information about the underlying physical device.
 *
 */
export type ReaderDevice = {
  /**
   * A unique identifier of the physical device (e.g. serial number).
   */
  identifier: string;
  /**
   * Identifier of the model of the device.
   */
  model: "solo" | "virtual-solo";
};

/**
 * Set of user-defined key-value pairs attached to the object.
 */
export type Meta = Record<string, Record<string, unknown>>;

/**
 * Reader
 *
 * A physical card reader device that can accept in-person payments.
 */
export type Reader = {
  id: ReaderID;
  name: ReaderName;
  status: ReaderStatus;
  device: ReaderDevice;
  meta?: Meta;
  /**
   * The timestamp of when the reader was created.
   */
  created_at: string;
  /**
   * The timestamp of when the reader was last updated.
   */
  updated_at: string;
};

/**
 * The pairing code is a 8 or 9 character alphanumeric string that is displayed on a SumUp Device after initiating the pairing. It is used to link the physical device to the created pairing.
 */
export type ReaderPairingCode = string;

export type CreateReaderCheckoutResponse = {
  data?: {
    /**
     * The client transaction ID is a unique identifier for the transaction that is generated for the client.
     * It can be used later to fetch the transaction details via the [Transactions API](https://developer.sumup.com/api/transactions/get).
     *
     */
    client_transaction_id?: string;
  };
};

export type ListReadersResponse = { items: Reader[] };

export type CreateReaderParams = {
  pairing_code: ReaderPairingCode;
  name?: ReaderName;
  meta?: Meta;
};

export type UpdateReaderParams = { name?: ReaderName; meta?: Meta };

export class Readers extends Core.APIResource {
  /**
   * Create a Reader Checkout
   */
  createCheckout(
    merchantCode: string,
    id: string,
    body: CreateReaderCheckout,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.post<void>({
      path: `/v0.1/merchants/${merchantCode}/readers/${id}/checkout`,
      body,
      ...params,
    });
  }

  /**
   * Create a Reader Terminate action
   */
  terminateCheckout(
    merchantCode: string,
    id: string,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.post<void>({
      path: `/v0.1/merchants/${merchantCode}/readers/${id}/terminate`,
      ...params,
    });
  }

  /**
   * List Readers
   */
  list(merchantCode: string, params?: Core.FetchParams): Core.APIPromise<void> {
    return this._client.get<void>({
      path: `/v0.1/merchants/${merchantCode}/readers`,
      ...params,
    });
  }

  /**
   * Create a Reader
   */
  create(
    merchantCode: string,
    body: CreateReaderParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<Reader> {
    return this._client.post<Reader>({
      path: `/v0.1/merchants/${merchantCode}/readers`,
      body,
      ...params,
    });
  }

  /**
   * Retrieve a Reader
   */
  get(
    merchantCode: string,
    id: ReaderID,
    params?: Core.FetchParams,
  ): Core.APIPromise<Reader> {
    return this._client.get<Reader>({
      path: `/v0.1/merchants/${merchantCode}/readers/${id}`,
      ...params,
    });
  }

  /**
   * Delete a reader
   */
  deleteReader(
    merchantCode: string,
    id: ReaderID,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.delete<void>({
      path: `/v0.1/merchants/${merchantCode}/readers/${id}`,
      ...params,
    });
  }

  /**
   * Update a Reader
   */
  update(
    merchantCode: string,
    id: ReaderID,
    body: UpdateReaderParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<Reader> {
    return this._client.patch<Reader>({
      path: `/v0.1/merchants/${merchantCode}/readers/${id}`,
      body,
      ...params,
    });
  }
}

export declare namespace Readers {
  export type {
    Affiliate,
    CreateReaderCheckout,
    CreateReaderCheckoutAmount,
    CreateReaderParams,
    Meta,
    Reader,
    ReaderDevice,
    ReaderID,
    ReaderName,
    ReaderPairingCode,
    ReaderStatus,
    UpdateReaderParams,
  };
}
