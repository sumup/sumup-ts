<div align="center">

# SumUp Node.js SDK

[![NPM Version](https://img.shields.io/npm/v/%40sumup%2Fsdk.svg)](https://www.npmjs.org/package/@sumup/sdk)
[![JSR Version](https://jsr.io/badges/@sumup/sdk)](https://jsr.io/@sumup/sdk)
[![Documentation][docs-badge]](https://developer.sumup.com)
[![Build Status](https://github.com/sumup/sumup-ts/workflows/CI/badge.svg)](https://github.com/sumup/sumup-ts/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/%40sumup%2Fsdk.svg)](https://www.npmjs.com/package/@sumup/sdk)
[![License](https://img.shields.io/github/license/sumup/sumup-ts)](https://github.com/sumup/sumup-ts/blob/main/LICENSE)

</div>

_**IMPORTANT:** This SDK is under development. We might still introduce minor breaking changes before reaching v1._

The Node.js SDK for the SumUp [API](https://developer.sumup.com).

To learn more, check out our [API Reference](https://developer.sumup.com/api) and [Developer Documentation](https://developer.sumup.com). You can also find the full documentation of the SumUp Node.js SDK at [sumup.github.io/sumup-ts](https://sumup.github.io/sumup-ts/).

## Requirements

Node 18 or higher.

The package is published to both npm and JSR, so you can use it from modern JavaScript runtimes that provide the standard `fetch`, `Headers`, `Request`, and `Response` APIs.

## Installation

Install the package with:

```bash
npm install @sumup/sdk
# or
yarn add @sumup/sdk
# or
pnpm add @sumup/sdk
# or
bun add @sumup/sdk
```

Install from jsr:

```bash
deno add jsr:@sumup/sdk
# or
npx jsr add @sumup/sdk
```

## Supported Features

The SDK provides:

- Typed clients for all SumUp API endpoints.
- API key authentication and OAuth access token usage through the same client.
- ESM and CommonJS entry points.
- Base and per-request overrides for headers, authorization, host, timeout, retries, and abort signals.
- Access to both parsed data and the raw `Response` object via companion `*WithResponse()` methods.

## Setup

Before making requests:

1. Create a SumUp API key, see [Authorization](https://developer.sumup.com/tools/authorization) guide in the SumUp Developer portal.
2. Export your credentials as environment variables.
3. Use your merchant code for merchant-scoped requests and examples.

```bash
export SUMUP_API_KEY="sup_sk_..."
export SUMUP_MERCHANT_CODE="MC123456789"
```

## Usage

```js
const { SumUp } = require("@sumup/sdk");

const client = new SumUp({
  apiKey: 'sup_sk_MvxmLOl0...'
});

const merchantCode = process.env.SUMUP_MERCHANT_CODE;

client.merchants.get(merchantCode)
  .then(merchant => console.info(merchant))
  .catch(error => console.error(error));
```

Or using ES modules and async/await:

```ts
import SumUp from "@sumup/sdk";

const client = new SumUp({
  apiKey: 'sup_sk_MvxmLOl0...',
});

const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
const merchant = await client.merchants.get(merchantCode);
console.info(merchant);
```

Per-request options are available as the last argument to any SDK call. For example, you can override authorization, timeout, retries, or headers for a single request:

```ts
await client.checkouts.list(undefined, {
  timeout: 5_000,
});

await client.merchants.get(merchantCode, {
  authorization: `Bearer ${accessToken}`,
  headers: {
    "x-request-id": "req_123",
  },
  maxRetries: 1,
});
```

If you need the raw response metadata together with the parsed payload:

```ts
const { data, response } = await client.merchants.getWithResponse(merchantCode);

console.info(response.status, data);
```

## Examples

Install dependencies inside an example directory before running it:

```bash
cd examples/checkout
npm install
```

Available examples:

### `examples/checkout`

Creates an online checkout and shows how to process it with card details.

Required environment variables:

```bash
export SUMUP_API_KEY="sup_sk_..."
export SUMUP_MERCHANT_CODE="MC123456789"
```

Run it with:

```bash
cd examples/checkout
npx tsx index.ts
```

### `examples/card-reader-checkout`

Lists paired readers for a merchant and creates a terminal checkout on the first
available reader.

Required environment variables:

```bash
export SUMUP_API_KEY="sup_sk_..."
export SUMUP_MERCHANT_CODE="MC123456789"
```

Run it with:

```bash
cd examples/card-reader-checkout
npx tsx index.ts
```

### `examples/oauth2`

Runs a local Express app that implements the OAuth 2.0 Authorization Code flow with PKCE and then uses the returned access token with the SDK.

Required environment variables:

```bash
export CLIENT_ID="..."
export CLIENT_SECRET="..."
export REDIRECT_URI="http://localhost:8080/callback"
export PORT="8080"
```

Run it with:

```bash
cd examples/oauth2
npx tsx index.ts
```

Then open `http://localhost:8080/login` in your browser to start the flow.

## Support

For SDK reference material and API details:

- API reference: <https://developer.sumup.com/api>
- Developer documentation: <https://developer.sumup.com>
- Generated SDK docs: <https://sumup.github.io/sumup-ts/>

If you need to report a bug or request an enhancement, open an issue in this
repository.

[docs-badge]: https://img.shields.io/badge/SumUp-documentation-white.svg?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgY29sb3I9IndoaXRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgPHBhdGggZD0iTTIyLjI5IDBIMS43Qy43NyAwIDAgLjc3IDAgMS43MVYyMi4zYzAgLjkzLjc3IDEuNyAxLjcxIDEuN0gyMi4zYy45NCAwIDEuNzEtLjc3IDEuNzEtMS43MVYxLjdDMjQgLjc3IDIzLjIzIDAgMjIuMjkgMFptLTcuMjIgMTguMDdhNS42MiA1LjYyIDAgMCAxLTcuNjguMjQuMzYuMzYgMCAwIDEtLjAxLS40OWw3LjQ0LTcuNDRhLjM1LjM1IDAgMCAxIC40OSAwIDUuNiA1LjYgMCAwIDEtLjI0IDcuNjlabTEuNTUtMTEuOS03LjQ0IDcuNDVhLjM1LjM1IDAgMCAxLS41IDAgNS42MSA1LjYxIDAgMCAxIDcuOS03Ljk2bC4wMy4wM2MuMTMuMTMuMTQuMzUuMDEuNDlaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+
