<div align="center">

# sumup-ts

[![NPM Version](https://img.shields.io/npm/v/%40sumup%2Fsdk.svg)](https://www.npmjs.org/package/@sumup/sdk)
[![JSR Version](https://jsr.io/badges/@sumup/sdk)](https://jsr.io/@sumup/sdk)
[![Documentation][docs-badge]](https://developer.sumup.com)
[![Build Status](https://github.com/sumup/sumup-ts/workflows/CI/badge.svg)](https://github.com/sumup/sumup-ts/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/%40sumup%2Fsdk.svg)](https://www.npmjs.com/package/@sumup/sdk)
[![License](https://img.shields.io/github/license/sumup/sumup-ts)](./LICENSE)

</div>

_**IMPORTANT:** This SDK is under heavy development and subject to breaking changes._

The Node.js SDK for the SumUp [API](https://developer.sumup.com).

To learn more, check out our [API Reference](https://developer.sumup.com/api) and [Developer Documentation](https://developer.sumup.com). You can also find the full documentation of the SumUp Node.js SDK at [sumup.github.io/sumup-ts](https://sumup.github.io/sumup-ts/).

## Requirements

Node 18 or higher.

## Installation

Install the package with:

```sh
npm install @sumup/sdk
# or
yarn add @sumup/sdk
```

Install from jsr:

```sh
deno add jsr:@sumup/sdk
# or
npx jsr add @sumup/sdk
```

## Usage

```js
const sumup = require('@sumup/sdk')({
  apiKey: 'sup_sk_MvxmLOl0...'
});

sumup.merchant.get()
  .then(merchant => console.info(merchant))
  .catch(error => console.error(error));
```

Or using ES modules and async/await:

```ts
import SumUp from "@sumup/sdk";

const client = new SumUp({
  apiKey: 'sup_sk_MvxmLOl0...',
});

const merchant = await client.merchant.get();
console.info(merchant);
```

## Examples

Examples require an API key and your merchant code. You can run the examples using:

```sh
npx tsx examples/checkout/index.ts
```

[docs-badge]: https://img.shields.io/badge/SumUp-documentation-white.svg?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgY29sb3I9IndoaXRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgPHBhdGggZD0iTTIyLjI5IDBIMS43Qy43NyAwIDAgLjc3IDAgMS43MVYyMi4zYzAgLjkzLjc3IDEuNyAxLjcxIDEuN0gyMi4zYy45NCAwIDEuNzEtLjc3IDEuNzEtMS43MVYxLjdDMjQgLjc3IDIzLjIzIDAgMjIuMjkgMFptLTcuMjIgMTguMDdhNS42MiA1LjYyIDAgMCAxLTcuNjguMjQuMzYuMzYgMCAwIDEtLjAxLS40OWw3LjQ0LTcuNDRhLjM1LjM1IDAgMCAxIC40OSAwIDUuNiA1LjYgMCAwIDEtLjI0IDcuNjlabTEuNTUtMTEuOS03LjQ0IDcuNDVhLjM1LjM1IDAgMCAxLS41IDAgNS42MSA1LjYxIDAgMCAxIDcuOS03Ljk2bC4wMy4wM2MuMTMuMTMuMTQuMzUuMDEuNDlaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+
