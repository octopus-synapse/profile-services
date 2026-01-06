# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1](https://github.com/octopus-synapse/profile-services/compare/v1.1.0...v1.1.1) (2026-01-06)


### Bug Fixes

* **auth:** minor test fixes after refactoring ([eb0938f](https://github.com/octopus-synapse/profile-services/commit/eb0938f03491f1f8f53b4255b6649014d860174c))

## [1.1.0](https://github.com/octopus-synapse/profile-services/compare/v1.0.0...v1.1.0) (2026-01-06)


### Features

* add /api/version endpoint synchronized with deployment manifest ([c2e9cf2](https://github.com/octopus-synapse/profile-services/commit/c2e9cf245d62145d98b6ef69a116bd8385c47be2))
* add release workflow with Docker versioning ([7f39656](https://github.com/octopus-synapse/profile-services/commit/7f3965605ffc2e0ff8e579909c6c7bccecfc87b3))
* integrate profile-contracts for backend validation ([ad0456d](https://github.com/octopus-synapse/profile-services/commit/ad0456d8ca2e2c2779fd6667429a0b8a30805e36))
* **testing:** implement Milestone 0 - Kent Beck + Uncle Bob testing infrastructure ([b8540b5](https://github.com/octopus-synapse/profile-services/commit/b8540b5d0ea713e42b0aaca92fdadf48d2b01c5b))


### Bug Fixes

* add API versioning with v1 prefix ([8779725](https://github.com/octopus-synapse/profile-services/commit/87797252224485ad05f70c1aa02f4445bc0af912)), closes [#26](https://github.com/octopus-synapse/profile-services/issues/26)
* **ci:** add per-commit test summaries to PRs ([2b3d7b3](https://github.com/octopus-synapse/profile-services/commit/2b3d7b39950a6a2e9af281f1217bea44e0e9fc10))
* **ci:** add test summary comments to PRs ([e4d0325](https://github.com/octopus-synapse/profile-services/commit/e4d03251888b1d962ca2c85ce70aa78aae719f76))
* **ci:** use GH_PAT for GitHub Packages authentication ([d98d82a](https://github.com/octopus-synapse/profile-services/commit/d98d82ab522c16c551c98f7d26ed9316198f672a))
* correct file paths in contract validation workflow ([0de4959](https://github.com/octopus-synapse/profile-services/commit/0de4959b858d78ca3086873eef6f5bb9a1e27287))
* enforce CI checks in pre-commit and fix lint errors ([3cfe3d9](https://github.com/octopus-synapse/profile-services/commit/3cfe3d9ce680ac8e3baf01844f2f6265871a81c4))
* **release:** align all version artifacts to v1.0.0 ([45b277a](https://github.com/octopus-synapse/profile-services/commit/45b277a1aa08df644cc908bbe0785cdc6975f168))
* **release:** correct manifest and package version to 1.0.1 ([071ae4e](https://github.com/octopus-synapse/profile-services/commit/071ae4e378d5de09daa0cb85421f25c07b8bc5db))
* **release:** reset version to logical PATCH sequence 1.0.2 ([93d9e38](https://github.com/octopus-synapse/profile-services/commit/93d9e388339e629546bd097eeea206a338ba9f67))
* skip contract validation on release PRs ([510415f](https://github.com/octopus-synapse/profile-services/commit/510415f22fd5cb50573636ac8b9540333dc5dc8c))
* **tests:** update smoke tests for /v1/ API versioning ([04f7437](https://github.com/octopus-synapse/profile-services/commit/04f7437f7c92d842d5d6671e4215aa36227917e3))
* update onboarding DTOs and tests for contract structure ([b84748b](https://github.com/octopus-synapse/profile-services/commit/b84748b980952bd55eccea1c64ef38f3b7a5fa0c))
* use secrets instead of build-args for Docker GitHub auth ([47a4d2f](https://github.com/octopus-synapse/profile-services/commit/47a4d2fe98764cae92c3b3be1bec33b5b8a4bb8c))
* use secrets instead of build-args for GitHub token in release workflow ([4053c35](https://github.com/octopus-synapse/profile-services/commit/4053c353782a858eea133201c5003fe31f87f13e))

## [2.0.1](https://github.com/octopus-synapse/profile-services/compare/v2.0.0...v2.0.1) (2026-01-05)


### Bug Fixes

* add API versioning with v1 prefix ([c93c2bf](https://github.com/octopus-synapse/profile-services/commit/c93c2bf368a2aa07d98b0a4d0c175fee7f0416e9)), closes [#26](https://github.com/octopus-synapse/profile-services/issues/26)
* **ci:** add per-commit test summaries to PRs ([8b4b747](https://github.com/octopus-synapse/profile-services/commit/8b4b7471d15afd3691c1c950784ef36eff931524))
* **ci:** add test summary comments to PRs ([61529fb](https://github.com/octopus-synapse/profile-services/commit/61529fb2c12d699846ad7db91e6ea3b5fe489e7f))
* **tests:** update smoke tests for /v1/ API versioning ([3e0207d](https://github.com/octopus-synapse/profile-services/commit/3e0207d8fc48d8b22cef159332b0ee815765ce59))
* use secrets instead of build-args for GitHub token in release workflow ([76d58a9](https://github.com/octopus-synapse/profile-services/commit/76d58a901c6a836e9b5c15b64615a48b6cb43ea4))

## [2.0.0](https://github.com/octopus-synapse/profile-services/compare/v1.0.0...v2.0.0) (2026-01-05)


### ⚠ BREAKING CHANGES

* Username validation now enforces lowercase-only

### Features

* add /api/version endpoint synchronized with deployment manifest ([c2e9cf2](https://github.com/octopus-synapse/profile-services/commit/c2e9cf245d62145d98b6ef69a116bd8385c47be2))
* add release workflow with Docker versioning ([7f39656](https://github.com/octopus-synapse/profile-services/commit/7f3965605ffc2e0ff8e579909c6c7bccecfc87b3))
* integrate profile-contracts for backend validation ([e2cf66d](https://github.com/octopus-synapse/profile-services/commit/e2cf66d9fd4b48b486aea37b1e8d16bf9ccbef2a))


### Bug Fixes

* correct file paths in contract validation workflow ([9d8b66d](https://github.com/octopus-synapse/profile-services/commit/9d8b66d240f1b8ce4bdcb0de1c288614f1f5de24))
* enforce CI checks in pre-commit and fix lint errors ([fbb5388](https://github.com/octopus-synapse/profile-services/commit/fbb5388797ef0b02f6e5488fcfcd3c8ba3b8bce6))
* skip contract validation on release PRs ([b11090f](https://github.com/octopus-synapse/profile-services/commit/b11090faaa4f112d8eed7617bae40e6d48a6266b))
* update onboarding DTOs and tests for contract structure ([6a72af6](https://github.com/octopus-synapse/profile-services/commit/6a72af61b854deb9b55585478708e1d9361c6da8))
* use secrets instead of build-args for Docker GitHub auth ([4912dbe](https://github.com/octopus-synapse/profile-services/commit/4912dbe8bdad8d8863e35c414d3c14869b23b08d))


### Code Refactoring

* use profile-contracts for backend validation schemas ([27f7f3d](https://github.com/octopus-synapse/profile-services/commit/27f7f3d342d044fc2a402c7c0d99bb617288c986))

## [1.0.0] - 2026-01-04

### Declaration

**v1.0.0 marks the beginning of semantically versioned contracts, not functional stability.**  
This version establishes the baseline for SemVer compliance going forward.  
Breaking changes, additions, and fixes will be tracked according to SemVer rules from this point.

### Added

- Initial production-grade backend service with NestJS
- Authentication and authorization with JWT
- Resume management system with AST and DSL support
- Tech skills and spoken languages management
- ATS integration endpoints
- Export functionality for resumes
- MEC.gov.br skills synchronization
- Database migrations with Prisma
- Docker containerization
- Health check endpoints
- Comprehensive test suite (unit + e2e + smoke)

### Infrastructure

- PostgreSQL database with Prisma ORM
- Redis caching layer
- MinIO object storage integration
- SendGrid email integration
- GitHub Container Registry deployment
- Alpine Linux VM deployment target

[1.0.0]: https://github.com/octopus-synapse/profile-services/releases/tag/v1.0.0
