<div align="center">

# sumup-ts

[![NPM Version](https://img.shields.io/npm/v/sumup.svg)](https://www.npmjs.org/package/sumup)
[![JSR Version](https://jsr.io/badges/@sumup/sumup)](https://jsr.io/@sumup/sumup)
[![Build Status](https://github.com/sumup/sumup-ts/workflows/CI/badge.svg)](https://github.com/sumup/sumup-ts/actions/workflows/ci.yml)
<!-- [![Downloads](https://img.shields.io/npm/dm/sumup.svg)](https://www.npmjs.com/package/sumup) -->

</div>

_**IMPORTANT:** This SDK is under heavy development and subject to breaking changes._

The Node.js SDK for the SumUp [API](https://developer.sumup.com).

To learn more, check out our [API Reference](https://developer.sumup.com/api) and [Documentation](https://developer.sumup.com).

## Requirements

Node 18 or higher.

## Installation

Install the package with:

```sh
npm install sumup
# or
yarn add sumup
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

