# Changelog

## [2.0.0](https://github.com/octopus-synapse/profile-services/compare/v1.1.0...v2.0.0) (2026-01-09)


### ⚠ BREAKING CHANGES

* None
* **tests:** Remove Jest from auth strategies and services
* **tests:** Remove Jest, use only bun:test

### Features

* complete Jest to Bun migration - 131 files, 872/1118 tests passing, 19x faster ([58a694f](https://github.com/octopus-synapse/profile-services/commit/58a694fec53c9ec198a75580ae524b5ad1e3fcbe))
* Implement GraphQL API Migration (Epic [#67](https://github.com/octopus-synapse/profile-services/issues/67)) ([#83](https://github.com/octopus-synapse/profile-services/issues/83)) ([2de23b6](https://github.com/octopus-synapse/profile-services/commit/2de23b620e4b5256361f6c2af088f8bd198a4b51))
* **tests:** add 32 bug detection tests - Uncle Bob audit ([b27b49a](https://github.com/octopus-synapse/profile-services/commit/b27b49a7698951b5b10409e732201bed2c8805e1))
* **tests:** migrate Auth Core (Milestone 2) to Bun native ([7485be4](https://github.com/octopus-synapse/profile-services/commit/7485be4867cf6aee66aef2017bdbc862fefa5370))
* **tests:** migrate Foundation (Milestone 1) to Bun native ([df973a5](https://github.com/octopus-synapse/profile-services/commit/df973a53c7427819b7f42f1d3d83213fdd14d119))


### Bug Fixes

* **auth:** minor test fixes after refactoring ([eb0938f](https://github.com/octopus-synapse/profile-services/commit/eb0938f03491f1f8f53b4255b6649014d860174c))
* **ci gate:** add checks: read permission to release workflow ([78a683c](https://github.com/octopus-synapse/profile-services/commit/78a683c0bf398e75d6bac2adc7c83dbca7857cbf))
* **core:** resolve lint errors in production code ([4201b57](https://github.com/octopus-synapse/profile-services/commit/4201b579bc73f4b725973479f69d1b676a82d8f1))
* **release:** remove self-referential CI Gate check ([dac080a](https://github.com/octopus-synapse/profile-services/commit/dac080a11de336100984ed065a106b8cd513901b))
* **test:** clean up bun:test imports in smoke tests ([a99d74c](https://github.com/octopus-synapse/profile-services/commit/a99d74c11ff2028e83e05cce4aae68c35c1f5f0b))
* **username:** reject uppercase, validate reserved names and format ([f83f5a9](https://github.com/octopus-synapse/profile-services/commit/f83f5a913daaca474c91b9e8c98e87eb82a1ba19))
