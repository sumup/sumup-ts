// Code generated by @sumup/ts-sdk-gen@0.0.1. DO NOT EDIT.

import * as Core from "../../core";

/**
 * __Required when payment type is `card`.__ Details of the payment card.
 */
export type Card = {
  /**
   * Three or four-digit card verification value (security code) of the payment card.
   */
  cvv: string;
  /**
   * Month from the expiration time of the payment card. Accepted format is `MM`.
   */
  expiry_month:
    | "01"
    | "02"
    | "03"
    | "04"
    | "05"
    | "06"
    | "07"
    | "08"
    | "09"
    | "10"
    | "11"
    | "12";
  /**
   * Year from the expiration time of the payment card. Accepted formats are `YY` and `YYYY`.
   */
  expiry_year: string;
  /**
   * Last 4 digits of the payment card number.
   */
  last_4_digits: string;
  /**
   * Name of the cardholder as it appears on the payment card.
   */
  name: string;
  /**
   * Number of the payment card (without spaces).
   */
  number: string;
  /**
   * Issuing card network of the payment card.
   */
  type:
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
  /**
   * Required five-digit ZIP code. Applicable only to merchant users in the USA.
   */
  zip_code?: string;
};

/**
 * Three-letter [ISO4217](https://en.wikipedia.org/wiki/ISO_4217) code of the currency for the amount. Currently supported currency values are enumerated above.
 */
export type Currency =
  | "BGN"
  | "BRL"
  | "CHF"
  | "CLP"
  | "CZK"
  | "DKK"
  | "EUR"
  | "GBP"
  | "HRK"
  | "HUF"
  | "NOK"
  | "PLN"
  | "RON"
  | "SEK"
  | "USD";

/**
 * Created mandate
 */
export type MandateResponse = {
  /**
   * Merchant code which has the mandate
   */
  merchant_code?: string;
  /**
   * Mandate status
   */
  status?: string;
  /**
   * Indicates the mandate type
   */
  type?: string;
};

/**
 * Details of the transaction.
 */
export type TransactionMixinBase = {
  /**
   * Total amount of the transaction.
   */
  amount?: number;
  currency?: Currency;
  /**
   * Unique ID of the transaction.
   */
  id?: string;
  /**
   * Current number of the installment for deferred payments.
   */
  installments_count?: number;
  /**
   * Payment type used for the transaction.
   */
  payment_type?: "ECOM" | "RECURRING" | "BOLETO";
  /**
   * Current status of the transaction.
   */
  status?: "SUCCESSFUL" | "CANCELLED" | "FAILED" | "PENDING";
  /**
   * Date and time of the creation of the transaction. Response format expressed according to [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) code.
   */
  timestamp?: string;
  /**
   * Transaction code returned by the acquirer/processing entity after processing the transaction.
   */
  transaction_code?: string;
};

export type TransactionMixinCheckout = {
  /**
   * Authorization code for the transaction sent by the payment card issuer or bank. Applicable only to card payments.
   */
  auth_code?: string;
  /**
   * Entry mode of the payment details.
   */
  entry_mode?: "CUSTOMER_ENTRY" | "BOLETO";
  /**
   * Internal unique ID of the transaction on the SumUp platform.
   */
  internal_id?: number;
  /**
   * Unique code of the registered merchant to whom the payment is made.
   */
  merchant_code?: string;
  /**
   * Amount of the tip (out of the total transaction amount).
   */
  tip_amount?: number;
  /**
   * Amount of the applicable VAT (out of the total transaction amount).
   */
  vat_amount?: number;
};

/**
 * Checkout
 *
 * Details of the payment checkout.
 */
export type Checkout = {
  /**
   * Amount of the payment.
   */
  amount?: number;
  /**
   * Unique ID of the payment checkout specified by the client application when creating the checkout resource.
   */
  checkout_reference?: string;
  currency?: Currency;
  /**
   * Unique identification of a customer. If specified, the checkout session and payment instrument are associated with the referenced customer.
   */
  customer_id?: string;
  /**
   * Date and time of the creation of the payment checkout. Response format expressed according to [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) code.
   */
  date?: string;
  /**
   * Short description of the checkout visible in the SumUp dashboard. The description can contribute to reporting, allowing easier identification of a checkout.
   */
  description?: string;
  /**
   * Unique ID of the checkout resource.
   */
  id?: string;
  mandate?: MandateResponse;
  /**
   * Unique identifying code of the merchant profile.
   */
  merchant_code?: string;
  /**
   * Email address of the registered user (merchant) to whom the payment is made.
   */
  pay_to_email?: string;
  /**
   * URL to which the SumUp platform sends the processing status of the payment checkout.
   */
  return_url?: string;
  /**
   * Current status of the checkout.
   */
  status?: "PENDING" | "FAILED" | "PAID";
  /**
   * List of transactions related to the payment.
   */
  transactions?: (TransactionMixinBase & TransactionMixinCheckout)[];
  /**
   * Date and time of the checkout expiration before which the client application needs to send a processing request. If no value is present, the checkout does not have an expiration time.
   */
  valid_until?: string;
};

/**
 * 3DS Response
 */
export type CheckoutAccepted = {
  /**
   * Required action processing 3D Secure payments.
   */
  next_step?: {
    /**
     * Indicates allowed mechanisms for redirecting an end user. If both values are provided to ensure a redirect takes place in either.
     */
    mechanism?: ("iframe" | "browser")[];
    /**
     * Method used to complete the redirect.
     */
    method?: string;
    /**
     * Contains parameters essential for form redirection. Number of object keys and their content can vary.
     */
    payload?: {
      MD?: Record<string, unknown>;
      PaReq?: Record<string, unknown>;
      TermUrl?: Record<string, unknown>;
    };
    /**
     * Refers to a url where the end user is redirected once the payment processing completes.
     */
    redirect_url?: string;
    /**
     * Where the end user is redirected.
     */
    url?: string;
  };
};

/**
 * Details of the payment checkout.
 */
export type CheckoutCreateRequest = {
  /**
   * Amount of the payment.
   */
  amount: number;
  /**
   * Unique ID of the payment checkout specified by the client application when creating the checkout resource.
   */
  checkout_reference: string;
  currency: Currency;
  /**
   * Unique identification of a customer. If specified, the checkout session and payment instrument are associated with the referenced customer.
   */
  customer_id?: string;
  /**
   * Date and time of the creation of the payment checkout. Response format expressed according to [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) code.
   */
  date?: string;
  /**
   * Short description of the checkout visible in the SumUp dashboard. The description can contribute to reporting, allowing easier identification of a checkout.
   */
  description?: string;
  /**
   * Unique ID of the checkout resource.
   */
  id?: string;
  /**
   * Unique identifying code of the merchant profile.
   */
  merchant_code: string;
  /**
   * Email address of the registered user (merchant) to whom the payment is made. It is highly recommended to use `merchant_code` instead of `pay_to_email`.
   */
  pay_to_email?: string;
  /**
   * Alternative payment method name
   */
  payment_type?: string;
  /**
   * Object containing personal details about the payer, typical for __Boleto__ checkouts
   */
  personal_details?: {
    /**
     * Payer's address information
     */
    address?: {
      /**
       * Payer's city
       */
      city?: string;
      /**
       * Payer's country
       */
      country?: string;
      /**
       * Field for address details
       */
      line_1?: string;
      /**
       * Payer's postal code. Must be eight digits long, however an optional dash could be applied after the 5th digit ([more information about the format available here](https://en.wikipedia.org/wiki/List_of_postal_codes_in_Brazil)). Both options are accepted as correct.
       */
      postal_code?: string;
      /**
       * Payer's state code
       */
      state?:
        | "AC"
        | "AL"
        | "AP"
        | "AM"
        | "BA"
        | "CE"
        | "DF"
        | "ES"
        | "GO"
        | "MA"
        | "MT"
        | "MS"
        | "MG"
        | "PA"
        | "PB"
        | "PR"
        | "PE"
        | "PI"
        | "RJ"
        | "RN"
        | "RS"
        | "RO"
        | "RR"
        | "SC"
        | "SP"
        | "SE"
        | "TO";
    };
    /**
     * Payer's email address
     */
    email?: string;
    /**
     * Payer's first name
     */
    first_name?: string;
    /**
     * Payer's last name
     */
    last_name?: string;
    /**
     * Payer's tax identification number (CPF)
     */
    tax_id?: string;
  };
  /**
   * Purpose of the checkout.
   */
  purpose?: "CHECKOUT" | "SETUP_RECURRING_PAYMENT";
  /**
   * __Required__ for [APMs](https://developer.sumup.com/online-payments/apm/introduction) and __recommended__ for card payments. Refers to a url where the end user is redirected once the payment processing completes. If not specified, the [Payment Widget](https://developer.sumup.com/online-payments/tools/card-widget) renders [3DS challenge](https://developer.sumup.com/online-payments/features/3ds) within an iframe instead of performing a full-page redirect.
   */
  redirect_url?: string;
  /**
   * URL to which the SumUp platform sends the processing status of the payment checkout.
   */
  return_url?: string;
  /**
   * Current status of the checkout.
   */
  status?: "PENDING" | "FAILED" | "PAID";
  /**
   * List of transactions related to the payment.
   */
  transactions?: (TransactionMixinBase & TransactionMixinCheckout)[];
  /**
   * Date and time of the checkout expiration before which the client application needs to send a processing request. If no value is present, the checkout does not have an expiration time.
   */
  valid_until?: string;
};

/**
 * Mandate is passed when a card is to be tokenized
 */
export type MandatePayload = {
  /**
   * Indicates the mandate type
   */
  type: "recurrent";
  /**
   * Operating system and web client used by the end-user
   */
  user_agent: string;
  /**
   * IP address of the end user. Supports IPv4 and IPv6
   */
  user_ip?: string;
};

/**
 * Details of the payment instrument for processing the checkout.
 */
export type CheckoutProcessMixin = {
  card?: Card;
  /**
   * __Required when `token` is provided.__ Unique ID of the customer.
   */
  customer_id?: string;
  /**
   * Number of installments for deferred payments. Available only to merchant users in Brazil.
   */
  installments?: number;
  mandate?: MandatePayload;
  payment_type: "card" | "boleto" | "ideal" | "blik" | "bancontact";
  /**
   * __Required when using a tokenized card to process a checkout.__ Unique token identifying the saved payment card for a customer.
   */
  token?: string;
};

export type CheckoutSuccess = Checkout & {
  /**
   * Name of the merchant
   */
  merchant_name?: string;
  /**
   * Object containing token information for the specified payment instrument
   */
  payment_instrument?: {
    /**
     * Token value
     */
    token?: string;
  };
  /**
   * Refers to a url where the end user is redirected once the payment processing completes.
   */
  redirect_url?: string;
  /**
   * Transaction code of the successful transaction with which the payment for the checkout is completed.
   */
  transaction_code?: string;
  /**
   * Transaction ID of the successful transaction with which the payment for the checkout is completed.
   */
  transaction_id?: string;
};

/**
 * Error message structure.
 */
export type DetailsError = {
  /**
   * Details of the error.
   */
  details?: string;
  failed_constraints?: { message?: string; reference?: string }[];
  /**
   * The status code.
   */
  status?: number;
  /**
   * Short title of the error.
   */
  title?: string;
};

export type ErrorExtended = Error & {
  /**
   * Parameter name (with relative location) to which the error applies. Parameters from embedded resources are displayed using dot notation. For example, `card.name` refers to the `name` parameter embedded in the `card` object.
   */
  param?: string;
};

/**
 * Error message for forbidden requests.
 */
export type ErrorForbidden = {
  /**
   * Platform code for the error.
   */
  error_code?: string;
  /**
   * Short description of the error.
   */
  error_message?: string;
  /**
   * HTTP status code for the error.
   */
  status_code?: string;
};

export type ListCheckoutsQueryParams = {
  checkoutReference?: string;
};

export type ListCheckoutsResponse = CheckoutSuccess[];

export type DeactivateCheckoutResponse = {
  /**
   * Amount of the payment.
   */
  amount?: number;
  /**
   * Unique ID of the payment checkout specified by the client application when creating the checkout resource.
   */
  checkout_reference?: string;
  currency?: Currency;
  /**
   * Date and time of the creation of the payment checkout. Response format expressed according to [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) code.
   */
  date?: string;
  /**
   * Short description of the checkout visible in the SumUp dashboard. The description can contribute to reporting, allowing easier identification of a checkout.
   */
  description?: string;
  /**
   * Unique ID of the checkout resource.
   */
  id?: string;
  /**
   * Unique identifying code of the merchant profile.
   */
  merchant_code?: string;
  /**
   * The merchant's country
   */
  merchant_country?: string;
  /**
   * Merchant name
   */
  merchant_name?: string;
  /**
   * Email address of the registered user (merchant) to whom the payment is made. It is highly recommended to use `merchant_code` instead of `pay_to_email`.
   */
  pay_to_email?: string;
  /**
   * Purpose of the checkout creation initially
   */
  purpose?: "SETUP_RECURRING_PAYMENT" | "CHECKOUT";
  /**
   * Current status of the checkout.
   */
  status?: "EXPIRED";
  /**
   * List of transactions related to the payment.
   */
  transactions?: (TransactionMixinBase & TransactionMixinCheckout)[];
  /**
   * Date and time of the checkout expiration before which the client application needs to send a processing request. If no value is present, the checkout does not have an expiration time.
   */
  valid_until?: string;
};

export type GetPaymentMethodsQueryParams = {
  amount?: number;
  currency?: string;
};

export type GetPaymentMethodsResponse = {
  available_payment_methods?: {
    /**
     * The ID of the payment method.
     */
    id: string;
  }[];
};

export class Checkouts extends Core.APIResource {
  /**
   * List checkouts
   */
  list(
    query?: ListCheckoutsQueryParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<CheckoutSuccess[]> {
    return this._client.get<CheckoutSuccess[]>({
      path: `/v0.1/checkouts`,
      query,
      ...params,
    });
  }

  /**
   * Create a checkout
   */
  create(
    body: CheckoutCreateRequest,
    params?: Core.FetchParams,
  ): Core.APIPromise<Checkout> {
    return this._client.post<Checkout>({
      path: `/v0.1/checkouts`,
      body,
      ...params,
    });
  }

  /**
   * Retrieve a checkout
   */
  get(id: string, params?: Core.FetchParams): Core.APIPromise<CheckoutSuccess> {
    return this._client.get<CheckoutSuccess>({
      path: `/v0.1/checkouts/${id}`,
      ...params,
    });
  }

  /**
   * Process a checkout
   */
  process(
    id: string,
    body: CheckoutProcessMixin,
    params?: Core.FetchParams,
  ): Core.APIPromise<CheckoutSuccess> {
    return this._client.put<CheckoutSuccess>({
      path: `/v0.1/checkouts/${id}`,
      body,
      ...params,
    });
  }

  /**
   * Deactivate a checkout
   */
  deactivate(id: string, params?: Core.FetchParams): Core.APIPromise<void> {
    return this._client.delete<void>({
      path: `/v0.1/checkouts/${id}`,
      ...params,
    });
  }

  /**
   * Get available payment methods
   */
  listAvailablePaymentMethods(
    merchantCode: string,
    query?: GetPaymentMethodsQueryParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.get<void>({
      path: `/v0.1/merchants/${merchantCode}/payment-methods`,
      query,
      ...params,
    });
  }
}

export declare namespace Checkouts {
  export type {
    Card,
    Checkout,
    CheckoutAccepted,
    CheckoutCreateRequest,
    CheckoutProcessMixin,
    CheckoutSuccess,
    Currency,
    DetailsError,
    ErrorExtended,
    ErrorForbidden,
    GetPaymentMethodsQueryParams,
    ListCheckoutsQueryParams,
    MandatePayload,
    MandateResponse,
    TransactionMixinBase,
    TransactionMixinCheckout,
  };
}
