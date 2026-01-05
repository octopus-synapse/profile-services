# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0](https://github.com/octopus-synapse/profile-services/compare/v2.0.0...v3.0.0) (2026-01-05)


### ⚠ BREAKING CHANGES

* All API routes now require /v1/ prefix

### Features

* add API versioning with v1 prefix ([ad93e92](https://github.com/octopus-synapse/profile-services/commit/ad93e920a3a7b7c54048e402df9d7874410196a1)), closes [#26](https://github.com/octopus-synapse/profile-services/issues/26)


### Bug Fixes

* **tests:** update smoke tests for /v1/ API versioning ([8a73230](https://github.com/octopus-synapse/profile-services/commit/8a73230cf1f75f165803da39ffe900c13900b3c3))
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
