<div align="center">

# @sumup/sumup-ts-codegen

`@sumup/sumup-ts-codegen` is a highly opinionated OpenAPI to SDK generator for our [TypeScript](https://www.typescriptlang.org/) SDK.

</div>

## TypeScript SDK

Generate the SDK with:

```sh
npx @sumup/sumup-ts-codegen <schema url or file> <output dir>
```

## TypeScript Code Samples

The `samples` command generates a deterministic, versioned JSON catalog from the same OpenAPI operation model used to generate the SDK. Each entry contains a complete TypeScript program, and named OpenAPI request examples produce separate entries. The codegen tests type-check every generated program against the local SDK.

Generate `code-samples.json` from the repository root with:

```sh
npm --prefix codegen run generate-codesamples
```

Pass another output path after `--` when needed:

```sh
npm --prefix codegen run generate-codesamples -- --out /tmp/typescript.json
```

Published SDK releases regenerate the catalog from the release tag and open or update a pull request for `src/codesamples/typescript.json` in `sumup/sumup-developer`; generated JSON is not committed to this repository.

## Credits

Implementation inspired by [oxide.ts](https://github.com/oxidecomputer/oxide.ts).
