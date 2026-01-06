# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0](https://github.com/octopus-synapse/profile-services/compare/v2.0.1...v3.0.0) (2026-01-06)


### ⚠ BREAKING CHANGES

* **testing:** Coverage below 60% now fails CI builds
* Username validation now enforces lowercase-only
* **mec-sync:** Controller route structure unchanged, internal refactoring only
* **constants:** Constants now exported from subdirectories
* None - this is a documentation-only change

### Features

* add /api/version endpoint synchronized with deployment manifest ([c2e9cf2](https://github.com/octopus-synapse/profile-services/commit/c2e9cf245d62145d98b6ef69a116bd8385c47be2))
* add /me endpoint and fix refresh token flow ([ffe3618](https://github.com/octopus-synapse/profile-services/commit/ffe361811c2d67fd3ad1643d1db0763d2a665636))
* add ATS validation base structure and interfaces ([d00edfe](https://github.com/octopus-synapse/profile-services/commit/d00edfe00f953a66176f7d3155cb11a92f3f0ec9))
* add ATS validation orchestrator and REST API ([029de3c](https://github.com/octopus-synapse/profile-services/commit/029de3cbc7b22b362319d3dae634dfddf54b4c45))
* add bilingual resume support with translation service ([71fe65f](https://github.com/octopus-synapse/profile-services/commit/71fe65fd68ca00fbc152e21158fd50df8a7f54f6))
* add DSL module with compiler, validator, and token resolver ([f2c3137](https://github.com/octopus-synapse/profile-services/commit/f2c3137d6e705ee2ac38acd6c9759f50592782a1))
* add release workflow with Docker versioning ([7f39656](https://github.com/octopus-synapse/profile-services/commit/7f3965605ffc2e0ff8e579909c6c7bccecfc87b3))
* add user roles and admin authentication ([e3ed71b](https://github.com/octopus-synapse/profile-services/commit/e3ed71bb21f2bd7f2354b908d642c251bb5db826))
* **auth:** add password complexity validation ([589ce26](https://github.com/octopus-synapse/profile-services/commit/589ce26f3743dd5a029cbe716ac16687da5c03f9))
* comprehensive refactoring for data integrity, security, and validation standardization ([140bd02](https://github.com/octopus-synapse/profile-services/commit/140bd02123ac95d5a7cba07f0cab1b11f8c6ed37))
* **docker:** add automatic prisma migrations on dev startup ([cba2cae](https://github.com/octopus-synapse/profile-services/commit/cba2cae735714d8b052d4479852b4f0c75c189ae))
* DSL repository pattern and migration system ([6c12fb2](https://github.com/octopus-synapse/profile-services/commit/6c12fb2bcae4b62f7e48434ee310dece55693ec4))
* **health:** add comprehensive health check module ([c9aa035](https://github.com/octopus-synapse/profile-services/commit/c9aa0355f391b9844027933981233ab48812d29b))
* implement bullet and layout safety validation (Issue [#10](https://github.com/octopus-synapse/profile-services/issues/10)) ([afa79d0](https://github.com/octopus-synapse/profile-services/commit/afa79d03703963358694cd0f14b7dedc6472cc65))
* implement CV section parsing and detection (Issue [#2](https://github.com/octopus-synapse/profile-services/issues/2)) ([c736f53](https://github.com/octopus-synapse/profile-services/commit/c736f5381749fe886a812aff93a395539a0806b2))
* implement document format validation (Issue [#3](https://github.com/octopus-synapse/profile-services/issues/3)) ([227f68c](https://github.com/octopus-synapse/profile-services/commit/227f68c667b6fd4bab4ea2b480abc5b87129f7ba))
* implement DSL repository pattern and migration system ([e0e939d](https://github.com/octopus-synapse/profile-services/commit/e0e939d2a55e97f9522ce69a27d1440ce1395ef5))
* implement encoding and character normalization (Issue [#8](https://github.com/octopus-synapse/profile-services/issues/8)) ([6371948](https://github.com/octopus-synapse/profile-services/commit/6371948ae86ea71892d78fd7c49b9cab19ec6cab))
* implement file integrity and type validation (Issue [#6](https://github.com/octopus-synapse/profile-services/issues/6)) ([68a5ac8](https://github.com/octopus-synapse/profile-services/commit/68a5ac82193dc564f9dc151bebe3a6b37b19eb96))
* implement grammar and spelling validation (Issue [#5](https://github.com/octopus-synapse/profile-services/issues/5)) ([0a7d2e1](https://github.com/octopus-synapse/profile-services/commit/0a7d2e13260e96de59ea705528cf7e73bb7d4e4c))
* implement mandatory section presence validation (Issue [#9](https://github.com/octopus-synapse/profile-services/issues/9)) ([e971869](https://github.com/octopus-synapse/profile-services/commit/e971869670fd72503f037a04fc2a55fa03b10142))
* implement section order and hierarchy validation (Issue [#4](https://github.com/octopus-synapse/profile-services/issues/4)) ([bd53782](https://github.com/octopus-synapse/profile-services/commit/bd53782228043fae641f446af1b472cec9d1de91))
* implement text extraction reliability check (Issue [#7](https://github.com/octopus-synapse/profile-services/issues/7)) ([6ca3ba7](https://github.com/octopus-synapse/profile-services/commit/6ca3ba767d7d824cacf2fcd9f41eb0e7ae6419de))
* improve error handling and API consistency ([1fe1a78](https://github.com/octopus-synapse/profile-services/commit/1fe1a782940cb6fc29d5aa48e8bc104cc9970663))
* init project setup ([e9076c3](https://github.com/octopus-synapse/profile-services/commit/e9076c3d2812fc39e312ea7831921d2841d36a96))
* integrate profile-contracts for backend validation ([e2cf66d](https://github.com/octopus-synapse/profile-services/commit/e2cf66d9fd4b48b486aea37b1e8d16bf9ccbef2a))
* **mec:** add accent-insensitive course search ([5c51f12](https://github.com/octopus-synapse/profile-services/commit/5c51f12f34b4d15bbcc6534b48cf676e3b50fc7d))
* **mec:** add accent-insensitive search with unaccent extension ([078ed5b](https://github.com/octopus-synapse/profile-services/commit/078ed5b01492e937d3044cfb6f0032d9f4b9296d))
* **mec:** add MEC data sync workflow and services ([4748a2b](https://github.com/octopus-synapse/profile-services/commit/4748a2b8a0f5fc841f9f7a61a9b552715c98e5f6))
* service-port updated to work with secrets ([dd87f92](https://github.com/octopus-synapse/profile-services/commit/dd87f921a694456e417086b35e419c1942a87529))
* **spoken-languages:** adiciona catálogo de idiomas falados ([471307f](https://github.com/octopus-synapse/profile-services/commit/471307fa8add15539e45b516a8e7721afec74b87))
* **tech-skills:** adiciona catálogo de skills técnicas ([471307f](https://github.com/octopus-synapse/profile-services/commit/471307fa8add15539e45b516a8e7721afec74b87))
* **testing:** implement Milestone 0 - Kent Beck + Uncle Bob testing infrastructure ([2a5095a](https://github.com/octopus-synapse/profile-services/commit/2a5095aaf2c2095ef22709d2beed903059296faa))


### Bug Fixes

* add API versioning with v1 prefix ([c93c2bf](https://github.com/octopus-synapse/profile-services/commit/c93c2bf368a2aa07d98b0a4d0c175fee7f0416e9)), closes [#26](https://github.com/octopus-synapse/profile-services/issues/26)
* add db:setup script and pre-test-script for CI ([d201392](https://github.com/octopus-synapse/profile-services/commit/d2013924e1d3c0d866fa8c388c08acdaadfb185a))
* add missing MEC tables migration ([d119b68](https://github.com/octopus-synapse/profile-services/commit/d119b68515599d28973d5bd2447135d26a8c7f0c))
* add missing theme system and enum migrations ([30f30b8](https://github.com/octopus-synapse/profile-services/commit/30f30b8c8260736e6b68facca3ded8abb21e241d))
* add missing usernameUpdatedAt column migration ([f78e476](https://github.com/octopus-synapse/profile-services/commit/f78e476f913a1a0f0ac3510db228511b1980a536))
* **auth:** improve password reset flow and email templates ([ddb9faa](https://github.com/octopus-synapse/profile-services/commit/ddb9faa6738a7ec2026f3a8ae0ba6318fcdfd9b7))
* **auth:** require JWT_SECRET env var instead of fallback ([2f54aeb](https://github.com/octopus-synapse/profile-services/commit/2f54aebf59b36e6c996d3924ae124b127eca44c2))
* cd syntax ([9f8ee63](https://github.com/octopus-synapse/profile-services/commit/9f8ee63795009d599968e1722bd54376861a5324))
* **ci:** add per-commit test summaries to PRs ([8b4b747](https://github.com/octopus-synapse/profile-services/commit/8b4b7471d15afd3691c1c950784ef36eff931524))
* **ci:** add test summary comments to PRs ([61529fb](https://github.com/octopus-synapse/profile-services/commit/61529fb2c12d699846ad7db91e6ea3b5fe489e7f))
* **ci:** use GH_PAT for GitHub Packages authentication ([675ecda](https://github.com/octopus-synapse/profile-services/commit/675ecda84411ca88c9c86390b18e512cb2a84204))
* convert absolute imports to relative paths and fix env validation ([f1d0ca8](https://github.com/octopus-synapse/profile-services/commit/f1d0ca83a7a329363ca1464ed88b32deaff0eed5))
* Copy data directory to dist in Dockerfile ([7ac9661](https://github.com/octopus-synapse/profile-services/commit/7ac9661483080fc2ace0114bcec4f4c53a058cc6))
* correct file paths in contract validation workflow ([9d8b66d](https://github.com/octopus-synapse/profile-services/commit/9d8b66d240f1b8ce4bdcb0de1c288614f1f5de24))
* Correct path to main.js in Dockerfile (dist/src/main) ([ab3bd7a](https://github.com/octopus-synapse/profile-services/commit/ab3bd7a0df0edd62bb86ff2e6e727c462577a4d1))
* correct prisma config and migration order for CI ([7a46b91](https://github.com/octopus-synapse/profile-services/commit/7a46b918019254ae3391c6e25e1bd256e18ab3d6))
* enforce CI checks in pre-commit and fix lint errors ([fbb5388](https://github.com/octopus-synapse/profile-services/commit/fbb5388797ef0b02f6e5488fcfcd3c8ba3b8bce6))
* **export:** improve error handling with proper logging ([ebd714d](https://github.com/octopus-synapse/profile-services/commit/ebd714d8c63a672a9cc7fac2b4d4b6ea82c51def))
* Install Prisma CLI and copy config for production migrations ([97d283b](https://github.com/octopus-synapse/profile-services/commit/97d283b5c2643edc496744e97c466447f433f57c))
* **mec:** correct CSV parsing for comma separator and UTF-8 encoding ([c882626](https://github.com/octopus-synapse/profile-services/commit/c882626fbe70e37ffc74a270b32d4b98815de035))
* network ([3628255](https://github.com/octopus-synapse/profile-services/commit/3628255fa98001d9c37bea2e0d0c03a9b16c9e07))
* **onboarding:** add data validation and schema improvements ([a897d47](https://github.com/octopus-synapse/profile-services/commit/a897d47018ca5f02455f4dc54d2b70202235bcd4))
* **onboarding:** improve onboarding completion and progress tracking ([df895b4](https://github.com/octopus-synapse/profile-services/commit/df895b402b02bf16ded0dd82bbdc3c1898d3e0d2))
* **onboarding:** sync profile data to user table for settings ([1a3a1d0](https://github.com/octopus-synapse/profile-services/commit/1a3a1d0331ba07b9169ab0c87ca44f449d0e2fc3))
* passar organization secrets para workflow ([0022e38](https://github.com/octopus-synapse/profile-services/commit/0022e38d1e6b7ca4c7039d795f4710cd5b3af6fc))
* passar secrets da VM explicitamente ([e6c62c5](https://github.com/octopus-synapse/profile-services/commit/e6c62c500f459f6b01027c4e689c6bb69d9fe005))
* refine ATS validation logic and improve test reliability ([ba873e9](https://github.com/octopus-synapse/profile-services/commit/ba873e92104794b72dfc4f1a5cca14f5e9ad7874))
* **release:** align all version artifacts to v1.0.0 ([4066ebd](https://github.com/octopus-synapse/profile-services/commit/4066ebda94779d46962877a75eca67b443c1808f))
* **release:** correct manifest and package version to 1.0.1 ([7f228d3](https://github.com/octopus-synapse/profile-services/commit/7f228d31b17df9c41534758bbea42108803caf30))
* **release:** reset version to logical PATCH sequence 1.0.2 ([9f81397](https://github.com/octopus-synapse/profile-services/commit/9f81397bf64ab63f30fe0c4cfc5638cda8154c96))
* Remove Prisma update notification from migration file ([fd87eea](https://github.com/octopus-synapse/profile-services/commit/fd87eea0a8f360a474b7666f520959b601bfe54f))
* replace fragmented migrations with single initial schema ([ae26f86](https://github.com/octopus-synapse/profile-services/commit/ae26f86401eea4a91bc4b888e12b461fd0767f49))
* resolve all ESLint errors and warnings in ATS module ([3669917](https://github.com/octopus-synapse/profile-services/commit/366991700d58f7b0342682bfe5e1c567ce00c234))
* resolve all ESLint warnings with clean code practices ([625a9c4](https://github.com/octopus-synapse/profile-services/commit/625a9c408e208a6370a5c925cd9f2f8928b085b3))
* resolve typecheck, test, and lint issues ([c425994](https://github.com/octopus-synapse/profile-services/commit/c4259944b59b1633fea8e7e291eb50154a820083))
* resolve TypeScript errors and update test factories ([e2832e8](https://github.com/octopus-synapse/profile-services/commit/e2832e88a716e79eb512619f55191feab7b77d94))
* **services:** resolve TypeScript and lint errors ([bdffc1e](https://github.com/octopus-synapse/profile-services/commit/bdffc1edb991f5d3ff87a97024b3a73e340fd631))
* silence console logs during banner capture tests ([638e485](https://github.com/octopus-synapse/profile-services/commit/638e485566fce80239421c5dee42cf2c814e63ae))
* skip contract validation on release PRs ([b11090f](https://github.com/octopus-synapse/profile-services/commit/b11090faaa4f112d8eed7617bae40e6d48a6266b))
* **smoke tests:** auth tests ([451b5d8](https://github.com/octopus-synapse/profile-services/commit/451b5d8de0d2bc8cc2faa7ebca1f530bd0c3df00))
* **tech-skills:** improve data file path resolution ([56efe64](https://github.com/octopus-synapse/profile-services/commit/56efe6448ead3cce13a083e4c4c017a9d369b97a))
* **tests:** update existing tests to match current implementation ([2626b14](https://github.com/octopus-synapse/profile-services/commit/2626b14c9be5bca2f93c5542960d2a874e72b376))
* **tests:** update smoke tests for /v1/ API versioning ([3e0207d](https://github.com/octopus-synapse/profile-services/commit/3e0207d8fc48d8b22cef159332b0ee815765ce59))
* update onboarding DTOs and tests for contract structure ([6a72af6](https://github.com/octopus-synapse/profile-services/commit/6a72af61b854deb9b55585478708e1d9361c6da8))
* update test expectations for API response format ([ce6593c](https://github.com/octopus-synapse/profile-services/commit/ce6593ca660e9da5ddbc911e055c0f144afc9643))
* update to use organization secrets ([6077609](https://github.com/octopus-synapse/profile-services/commit/6077609390f175d250044470ef7fa9dcbd426de3))
* update to use organization secrets explicitly ([f2a6a0f](https://github.com/octopus-synapse/profile-services/commit/f2a6a0fa76ae8646a98276cb71a378549c862fe1))
* update to use organization secrets explicitly ([9722613](https://github.com/octopus-synapse/profile-services/commit/97226134a05a1a756616247a69fd28ba08ef6b5d))
* usar imagem do GHCR no docker-compose ([dea12b7](https://github.com/octopus-synapse/profile-services/commit/dea12b7103f190fd2b8f7bb82b8420145b1c1a86))
* use Docker secrets instead of build args for GITHUB_TOKEN ([eaf6099](https://github.com/octopus-synapse/profile-services/commit/eaf60998123dbc98a0e1e7f566ebc54b4bf0db5b))
* use published profile-contracts instead of local link for CI ([6e7ce76](https://github.com/octopus-synapse/profile-services/commit/6e7ce762188cdce600688af2ad011973ab80b6f8))
* use secrets instead of build-args for Docker GitHub auth ([4912dbe](https://github.com/octopus-synapse/profile-services/commit/4912dbe8bdad8d8863e35c414d3c14869b23b08d))
* use secrets instead of build-args for GitHub token in release workflow ([76d58a9](https://github.com/octopus-synapse/profile-services/commit/76d58a901c6a836e9b5c15b64615a48b6cb43ea4))
* Use TypeScript config for Prisma migrations (requires ts-node) ([03e8871](https://github.com/octopus-synapse/profile-services/commit/03e88712e16ecfd104defbb90c3ad161eeb016b2))


### Performance Improvements

* **repositories:** optimize update/delete to avoid N+1 queries ([54103b1](https://github.com/octopus-synapse/profile-services/commit/54103b1d936f2dd667126c4fd15b4be085f1013c))


### Documentation

* translate README from Portuguese to English ([b71abef](https://github.com/octopus-synapse/profile-services/commit/b71abefd51d7ab02f9b792ceccaee18c0deb14a4))


### Code Refactoring

* **constants:** split large constant files into smaller modules ([f6c7afc](https://github.com/octopus-synapse/profile-services/commit/f6c7afc9eaceff1d1c0c064117dfe40a2ff0d2b9))
* **mec-sync:** split module into smaller components (100 lines max) ([fadb122](https://github.com/octopus-synapse/profile-services/commit/fadb122944dcd68ad0d7097c66cf0a9905840e11))
* use profile-contracts for backend validation schemas ([27f7f3d](https://github.com/octopus-synapse/profile-services/commit/27f7f3d342d044fc2a402c7c0d99bb617288c986))

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
