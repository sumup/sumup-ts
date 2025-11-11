# Changelog

## [0.0.6](https://github.com/sumup/sumup-ts/compare/v0.0.5...v0.0.6) (2025-11-11)


### Bug Fixes

* **sdk:** version header string ([ab9fdd5](https://github.com/sumup/sumup-ts/commit/ab9fdd5722de584545a19b8ac49d523edd92c223))

## [0.0.5](https://github.com/sumup/sumup-ts/compare/v0.0.4...v0.0.5) (2025-10-23)

0.0.5 brings the Merchants API, allowing access to multiple merchant accounts, depending on the authorization. For users that authenticate using SumUp's SSO you can now access any of the merchant accounts that they have membership in. For API keys the access is still restricted to the merchant account for which the API key was created. We are working on introducing more authentication options to make integrations that need to rely on multiple merchant accounts easier in the future.

The merchants endpoints replace the legacy `/me/` endpoints and further cleanup the underlying models.

### Features

* **codegen:** move codegen in here ([#130](https://github.com/sumup/sumup-ts/issues/130)) ([2aa4495](https://github.com/sumup/sumup-ts/commit/2aa4495455a9c3f0002f2c3694db827491c9480b))
