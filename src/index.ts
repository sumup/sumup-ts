// Code generated by @sumup/ts-sdk-gen@0.0.1. DO NOT EDIT.

import { HTTPClient } from "./client";
import type * as Core from "./core";

export type { APIConfig } from "./client";

import { Checkouts } from "./resources/checkouts";
import { Customers } from "./resources/customers";
import { Members } from "./resources/members";
import { Memberships } from "./resources/memberships";
import { Merchant } from "./resources/merchant";
import { Payouts } from "./resources/payouts";
import { Readers } from "./resources/readers";
import { Receipts } from "./resources/receipts";
import { Roles } from "./resources/roles";
import { Subaccounts } from "./resources/subaccounts";
import { Transactions } from "./resources/transactions";

export class SumUp extends HTTPClient {
  checkouts: Checkouts = new Checkouts(this);
  customers: Customers = new Customers(this);
  members: Members = new Members(this);
  memberships: Memberships = new Memberships(this);
  merchant: Merchant = new Merchant(this);
  payouts: Payouts = new Payouts(this);
  readers: Readers = new Readers(this);
  receipts: Receipts = new Receipts(this);
  roles: Roles = new Roles(this);
  subaccounts: Subaccounts = new Subaccounts(this);
  transactions: Transactions = new Transactions(this);

  static SumUp = this;
}

SumUp.Checkouts = Checkouts;
SumUp.Customers = Customers;
SumUp.Members = Members;
SumUp.Memberships = Memberships;
SumUp.Merchant = Merchant;
SumUp.Payouts = Payouts;
SumUp.Readers = Readers;
SumUp.Receipts = Receipts;
SumUp.Roles = Roles;
SumUp.Subaccounts = Subaccounts;
SumUp.Transactions = Transactions;

export declare namespace SumUp {
  export type FetchParams = Core.FetchParams;

  export {
    Checkouts,
    Customers,
    Members,
    Memberships,
    Merchant,
    Payouts,
    Readers,
    Receipts,
    Roles,
    Subaccounts,
    Transactions,
  };
}

export default SumUp;
