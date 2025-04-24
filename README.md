<div align="center">

# sumup-ts

[![NPM Version](https://img.shields.io/npm/v/%40sumup%2Fsdk.svg)](https://www.npmjs.org/package/@sumup/sdk)
[![JSR Version](https://jsr.io/badges/@sumup/sdk)](https://jsr.io/@sumup/sdk)
[![Build Status](https://github.com/sumup/sumup-ts/workflows/CI/badge.svg)](https://github.com/sumup/sumup-ts/actions/workflows/ci.yml)
<!-- [![Downloads](https://img.shields.io/npm/dm/%40sumup%2Fsdk.svg)](https://www.npmjs.com/package/@sumup/sdk) -->

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

Run examples:

```sh
npx tsx examples/checkout/index.ts
```

