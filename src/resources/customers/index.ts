// Code generated by @sumup/ts-sdk-gen@0.0.1. DO NOT EDIT.

import * as Core from "../../core";

/**
 * Profile's personal address information.
 */
export type Address = {
  /**
   * City name from the address.
   */
  city?: string;
  /**
   * Two letter country code formatted according to [ISO3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).
   */
  country?: string;
  /**
   * First line of the address with details of the street name and number.
   */
  line_1?: string;
  /**
   * Second line of the address with details of the building, unit, apartment, and floor numbers.
   */
  line_2?: string;
  /**
   * Postal code from the address.
   */
  postal_code?: string;
  /**
   * State name or abbreviation from the address.
   */
  state?: string;
};

/**
 * Created mandate
 */
export type MandateResponse = {
  /**
   * Indicates the mandate type
   */
  type?: string;
  /**
   * Mandate status
   */
  status?: string;
  /**
   * Merchant code which has the mandate
   */
  merchant_code?: string;
};

/**
 * Personal details for the customer.
 */
export type PersonalDetails = {
  /**
   * First name of the customer.
   */
  first_name?: string;
  /**
   * Last name of the customer.
   */
  last_name?: string;
  /**
   * Email address of the customer.
   */
  email?: string;
  /**
   * Phone number of the customer.
   */
  phone?: string;
  /**
   * Date of birth of the customer.
   */
  birth_date?: string;
  /**
   * An identification number user for tax purposes (e.g. CPF)
   */
  tax_id?: string;
  address?: Address;
};

/**
 * Customer
 */
export type Customer = {
  /**
   * Unique ID of the customer.
   */
  customer_id: string;
  personal_details?: PersonalDetails;
};

/**
 * Error message for forbidden requests.
 */
export type ErrorForbidden = {
  /**
   * Short description of the error.
   */
  error_message?: string;
  /**
   * Platform code for the error.
   */
  error_code?: string;
  /**
   * HTTP status code for the error.
   */
  status_code?: string;
};

/**
 * Payment Instrument Response
 */
export type PaymentInstrumentResponse = {
  /**
   * Unique token identifying the saved payment card for a customer.
   */
  token?: string;
  /**
   * Indicates whether the payment instrument is active and can be used for payments. To deactivate it, send a `DELETE` request to the resource endpoint.
   */
  active?: boolean;
  /**
   * Type of the payment instrument.
   */
  type?: "card";
  /**
   * Details of the payment card.
   */
  card?: {
    /**
     * Last 4 digits of the payment card number.
     */
    last_4_digits?: string;
    /**
     * Issuing card network of the payment card.
     */
    type?:
      | "AMEX"
      | "CUP"
      | "DINERS"
      | "DISCOVER"
      | "ELO"
      | "ELV"
      | "HIPERCARD"
      | "JCB"
      | "MAESTRO"
      | "MASTERCARD"
      | "VISA"
      | "VISA_ELECTRON"
      | "VISA_VPAY"
      | "UNKNOWN";
  };
  mandate?: MandateResponse;
  /**
   * Creation date of payment instrument. Response format expressed according to [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) code.
   */
  created_at?: string;
};

export type UpdateCustomerParams = { personal_details?: PersonalDetails };

export type ListPaymentInstrumentsResponse = PaymentInstrumentResponse[];

export type DeactivatePaymentInstrumentResponse = Record<string, unknown>;

export class Customers extends Core.APIResource {
  /**
   * Create a customer
   */
  create(body: Customer, params?: Core.FetchParams): Core.APIPromise<Customer> {
    return this._client.post<Customer>({
      path: `/v0.1/customers`,
      body,
      ...params,
    });
  }

  /**
   * Retrieve a customer
   */
  get(
    customerId: string,
    params?: Core.FetchParams,
  ): Core.APIPromise<Customer> {
    return this._client.get<Customer>({
      path: `/v0.1/customers/${customerId}`,
      ...params,
    });
  }

  /**
   * Update a customer
   */
  update(
    customerId: string,
    body: UpdateCustomerParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<Customer> {
    return this._client.put<Customer>({
      path: `/v0.1/customers/${customerId}`,
      body,
      ...params,
    });
  }

  /**
   * List payment instruments
   */
  listPaymentInstruments(
    customerId: string,
    params?: Core.FetchParams,
  ): Core.APIPromise<PaymentInstrumentResponse[]> {
    return this._client.get<PaymentInstrumentResponse[]>({
      path: `/v0.1/customers/${customerId}/payment-instruments`,
      ...params,
    });
  }

  /**
   * Deactivate a payment instrument
   */
  deactivatePaymentInstrument(
    customerId: string,
    token: string,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.delete<void>({
      path: `/v0.1/customers/${customerId}/payment-instruments/${token}`,
      ...params,
    });
  }
}

export declare namespace Customers {
  export type {
    Address,
    Customer,
    ErrorForbidden,
    MandateResponse,
    PaymentInstrumentResponse,
    PersonalDetails,
    UpdateCustomerParams,
  };
}
