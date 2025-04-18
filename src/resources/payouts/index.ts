// Code generated by @sumup/ts-sdk-gen@0.0.1. DO NOT EDIT.

import * as Core from "../../core";

/**
 * Financial Payouts
 */
export type FinancialPayouts = {
  amount?: number;
  currency?: string;
  date?: string;
  fee?: number;
  id?: number;
  reference?: string;
  status?: "SUCCESSFUL" | "FAILED";
  transaction_code?: string;
  type?:
    | "PAYOUT"
    | "CHARGE_BACK_DEDUCTION"
    | "REFUND_DEDUCTION"
    | "DD_RETURN_DEDUCTION"
    | "BALANCE_DEDUCTION";
}[];

export type ListPayoutsV1QueryParams = {
  start_date: string;
  end_date: string;
  format?: "json" | "csv";
  limit?: number;
  order?: "desc" | "asc";
};

export type ListPayoutsQueryParams = {
  start_date: string;
  end_date: string;
  format?: "json" | "csv";
  limit?: number;
  order?: "desc" | "asc";
};

export class Payouts extends Core.APIResource {
  /**
   * List payouts
   */
  list(
    merchantCode: string,
    query: ListPayoutsV1QueryParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<FinancialPayouts> {
    return this._client.get<FinancialPayouts>({
      path: `/v1.0/merchants/${merchantCode}/payouts`,
      query,
      ...params,
    });
  }

  /**
   * List payouts
   */
  listDeprecated(
    query: ListPayoutsQueryParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<FinancialPayouts> {
    return this._client.get<FinancialPayouts>({
      path: `/v0.1/me/financials/payouts`,
      query,
      ...params,
    });
  }
}

export declare namespace Payouts {
  export type {
    FinancialPayouts,
    ListPayoutsQueryParams,
    ListPayoutsV1QueryParams,
  };
}
