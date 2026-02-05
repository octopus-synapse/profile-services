# Changelog

## [7.0.1](https://github.com/octopus-synapse/profile-services/compare/profile-services-v7.0.0...profile-services-v7.0.1) (2026-02-04)


### Bug Fixes

* **ci:** correct Docker build context in release workflow ([#136](https://github.com/octopus-synapse/profile-services/issues/136)) ([6e197e6](https://github.com/octopus-synapse/profile-services/commit/6e197e6bcb80c0e638f86e5b408089ec1f256907))

## [7.0.0](https://github.com/octopus-synapse/profile-services/compare/profile-services-v6.0.1...profile-services-v7.0.0) (2026-02-04)


### ⚠ BREAKING CHANGES

* **architecture:** Major architectural restructuring

### Bug Fixes

* Achieve zero lint and typecheck errors in production code ([#131](https://github.com/octopus-synapse/profile-services/issues/131)) ([abf9b42](https://github.com/octopus-synapse/profile-services/commit/abf9b42c04c9bbaca55a3e15efc1f7de805e85e6))
* **ci:** replace GH_PAT with GITHUB_TOKEN in release workflow ([695d99a](https://github.com/octopus-synapse/profile-services/commit/695d99a9d51a0f3d9744cc7eb8d6a635533f03ba))
* corrigir erros de lint e typecheck ([#129](https://github.com/octopus-synapse/profile-services/issues/129)) ([931ed73](https://github.com/octopus-synapse/profile-services/commit/931ed7343b8006b92179d99bd6ff4f5edaa12c0d))


### Miscellaneous Chores

* release main ([#130](https://github.com/octopus-synapse/profile-services/issues/130)) ([b4c7361](https://github.com/octopus-synapse/profile-services/commit/b4c73612d9b1b1f100c36c42320bbd376f7d549f))
* release main ([#132](https://github.com/octopus-synapse/profile-services/issues/132)) ([8686761](https://github.com/octopus-synapse/profile-services/commit/868676116cf6f5648088e53d50ce6b8209ef3eda))


### Code Refactoring

* **architecture:** restructure codebase to bounded contexts with Swagger enforcement ([#134](https://github.com/octopus-synapse/profile-services/issues/134)) ([66e3dc2](https://github.com/octopus-synapse/profile-services/commit/66e3dc2d694de423180cf8407f545eb06fe3ee63))

## [6.0.1](https://github.com/octopus-synapse/profile-services/compare/profile-services-v6.0.0...profile-services-v6.0.1) (2026-01-16)


### Code Refactoring

* tests are using mock resume factory now ([60d1aa4](https://github.com/octopus-synapse/profile-services/commit/60d1aa413519cb323a8f9243891235f97965edb8))

## [6.0.0](https://github.com/octopus-synapse/profile-services/compare/profile-services-v5.5.0...profile-services-v6.0.0) (2026-01-16)


### ⚠ BREAKING CHANGES

* Replace role-based access control with permission-based authorization

### Features

* implement RBAC authorization system ([#123](https://github.com/octopus-synapse/profile-services/issues/123)) ([c3a20f4](https://github.com/octopus-synapse/profile-services/commit/c3a20f4e0777b7f9edcb13e79a84991e20703ccb))

## [5.5.0](https://github.com/octopus-synapse/profile-services/compare/profile-services-v5.4.1...profile-services-v5.5.0) (2026-01-16)


### Features

* **observability:** configure production alerting and fix build errors ([#121](https://github.com/octopus-synapse/profile-services/issues/121)) ([735f88e](https://github.com/octopus-synapse/profile-services/commit/735f88ebef703e9fb06314b3509919bc59810157))


### Code Refactoring

* migrate codebase to TypeScript and improve naming conventions ([d15018e](https://github.com/octopus-synapse/profile-services/commit/d15018e2fe679a2cb71a7c3ea45e9d13d23698e7))
