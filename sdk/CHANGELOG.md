# Changelog

## [0.0.11](https://github.com/sumup/sumup-ts/compare/v0.0.10...v0.0.11) (2025-12-19)


### Bug Fixes

* reader status call response ([7be6747](https://github.com/sumup/sumup-ts/commit/7be674785286c10128523dc09bf69a99ca36c718))
* transaction entry_mode enum ([85c2785](https://github.com/sumup/sumup-ts/commit/85c27852b60d24a7e9f3ea11b877458fb549885c))

## [0.0.10](https://github.com/sumup/sumup-ts/compare/v0.0.9...v0.0.10) (2025-12-07)


### Features

* **codegen:** move codegen in here ([#130](https://github.com/sumup/sumup-ts/issues/130)) ([2aa4495](https://github.com/sumup/sumup-ts/commit/2aa4495455a9c3f0002f2c3694db827491c9480b))


### Bug Fixes

* **sdk:** address package bundle warning for common js ([ab5beb5](https://github.com/sumup/sumup-ts/commit/ab5beb5edaee14820cdcb5dba342b5792aab86b8))
* **sdk:** typo in package exports ([#174](https://github.com/sumup/sumup-ts/issues/174)) ([843f972](https://github.com/sumup/sumup-ts/commit/843f972d08b50e5816613462fbb35b5e1e7aa8c6))
* **sdk:** version header string ([ab9fdd5](https://github.com/sumup/sumup-ts/commit/ab9fdd5722de584545a19b8ac49d523edd92c223))

## [0.0.9](https://github.com/sumup/sumup-ts/compare/v0.0.8...v0.0.9) (2025-12-02)


### Bug Fixes

* **sdk:** typo in package exports ([#174](https://github.com/sumup/sumup-ts/issues/174)) ([843f972](https://github.com/sumup/sumup-ts/commit/843f972d08b50e5816613462fbb35b5e1e7aa8c6))

## [0.0.8](https://github.com/sumup/sumup-ts/compare/v0.0.7...v0.0.8) (2025-11-26)


### Bug Fixes

* **sdk:** address package bundle warning for common js ([ab5beb5](https://github.com/sumup/sumup-ts/commit/ab5beb5edaee14820cdcb5dba342b5792aab86b8))

## [0.0.7](https://github.com/sumup/sumup-ts/compare/v0.0.6...v0.0.7) (2025-11-11)


### Features

* **codegen:** move codegen in here ([#130](https://github.com/sumup/sumup-ts/issues/130)) ([2aa4495](https://github.com/sumup/sumup-ts/commit/2aa4495455a9c3f0002f2c3694db827491c9480b))


### Bug Fixes

* **sdk:** version header string ([ab9fdd5](https://github.com/sumup/sumup-ts/commit/ab9fdd5722de584545a19b8ac49d523edd92c223))

## [0.0.6](https://github.com/sumup/sumup-ts/compare/v0.0.5...v0.0.6) (2025-11-11)


### Bug Fixes

* **sdk:** version header string ([ab9fdd5](https://github.com/sumup/sumup-ts/commit/ab9fdd5722de584545a19b8ac49d523edd92c223))

## [0.0.5](https://github.com/sumup/sumup-ts/compare/v0.0.4...v0.0.5) (2025-10-23)

0.0.5 brings the Merchants API, allowing access to multiple merchant accounts, depending on the authorization. For users that authenticate using SumUp's SSO you can now access any of the merchant accounts that they have membership in. For API keys the access is still restricted to the merchant account for which the API key was created. We are working on introducing more authentication options to make integrations that need to rely on multiple merchant accounts easier in the future.

The merchants endpoints replace the legacy `/me/` endpoints and further cleanup the underlying models.

### Features

* **codegen:** move codegen in here ([#130](https://github.com/sumup/sumup-ts/issues/130)) ([2aa4495](https://github.com/sumup/sumup-ts/commit/2aa4495455a9c3f0002f2c3694db827491c9480b))
