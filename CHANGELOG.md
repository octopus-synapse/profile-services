# Changelog

## [4.0.0](https://github.com/octopus-synapse/profile-services/compare/profile-services-v3.1.0...profile-services-v4.0.0) (2026-01-09)


### ⚠ BREAKING CHANGES

* Removes pre-push hook. Pre-commit remains as fast feedback, CI is definitive validation.
* None
* **tests:** Remove Jest from auth strategies and services
* **tests:** Remove Jest, use only bun:test
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
* complete Jest to Bun migration - 131 files, 872/1118 tests passing, 19x faster ([58a694f](https://github.com/octopus-synapse/profile-services/commit/58a694fec53c9ec198a75580ae524b5ad1e3fcbe))
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
* Implement GraphQL API Migration (Epic [#67](https://github.com/octopus-synapse/profile-services/issues/67)) ([#83](https://github.com/octopus-synapse/profile-services/issues/83)) ([2de23b6](https://github.com/octopus-synapse/profile-services/commit/2de23b620e4b5256361f6c2af088f8bd198a4b51))
* implement mandatory section presence validation (Issue [#9](https://github.com/octopus-synapse/profile-services/issues/9)) ([e971869](https://github.com/octopus-synapse/profile-services/commit/e971869670fd72503f037a04fc2a55fa03b10142))
* implement section order and hierarchy validation (Issue [#4](https://github.com/octopus-synapse/profile-services/issues/4)) ([bd53782](https://github.com/octopus-synapse/profile-services/commit/bd53782228043fae641f446af1b472cec9d1de91))
* implement text extraction reliability check (Issue [#7](https://github.com/octopus-synapse/profile-services/issues/7)) ([6ca3ba7](https://github.com/octopus-synapse/profile-services/commit/6ca3ba767d7d824cacf2fcd9f41eb0e7ae6419de))
* improve error handling and API consistency ([1fe1a78](https://github.com/octopus-synapse/profile-services/commit/1fe1a782940cb6fc29d5aa48e8bc104cc9970663))
* init project setup ([e9076c3](https://github.com/octopus-synapse/profile-services/commit/e9076c3d2812fc39e312ea7831921d2841d36a96))
* integrate profile-contracts for backend validation ([ad0456d](https://github.com/octopus-synapse/profile-services/commit/ad0456d8ca2e2c2779fd6667429a0b8a30805e36))
* **mec:** add accent-insensitive course search ([5c51f12](https://github.com/octopus-synapse/profile-services/commit/5c51f12f34b4d15bbcc6534b48cf676e3b50fc7d))
* **mec:** add accent-insensitive search with unaccent extension ([078ed5b](https://github.com/octopus-synapse/profile-services/commit/078ed5b01492e937d3044cfb6f0032d9f4b9296d))
* **mec:** add MEC data sync workflow and services ([4748a2b](https://github.com/octopus-synapse/profile-services/commit/4748a2b8a0f5fc841f9f7a61a9b552715c98e5f6))
* Resume Sharing, Versioning & Analytics (Epic [#63](https://github.com/octopus-synapse/profile-services/issues/63)) ([#88](https://github.com/octopus-synapse/profile-services/issues/88)) ([a4b67cd](https://github.com/octopus-synapse/profile-services/commit/a4b67cdaf92e643ba8535ad35171997bcaac47bc))
* service-port updated to work with secrets ([dd87f92](https://github.com/octopus-synapse/profile-services/commit/dd87f921a694456e417086b35e419c1942a87529))
* **spoken-languages:** adiciona catálogo de idiomas falados ([471307f](https://github.com/octopus-synapse/profile-services/commit/471307fa8add15539e45b516a8e7721afec74b87))
* **tech-skills:** adiciona catálogo de skills técnicas ([471307f](https://github.com/octopus-synapse/profile-services/commit/471307fa8add15539e45b516a8e7721afec74b87))
* **testing:** implement Milestone 0 - Kent Beck + Uncle Bob testing infrastructure ([b8540b5](https://github.com/octopus-synapse/profile-services/commit/b8540b5d0ea713e42b0aaca92fdadf48d2b01c5b))
* **tests:** add 32 bug detection tests - Uncle Bob audit ([b27b49a](https://github.com/octopus-synapse/profile-services/commit/b27b49a7698951b5b10409e732201bed2c8805e1))
* **tests:** migrate Auth Core (Milestone 2) to Bun native ([7485be4](https://github.com/octopus-synapse/profile-services/commit/7485be4867cf6aee66aef2017bdbc862fefa5370))
* **tests:** migrate Foundation (Milestone 1) to Bun native ([df973a5](https://github.com/octopus-synapse/profile-services/commit/df973a53c7427819b7f42f1d3d83213fdd14d119))


### Bug Fixes

* add API versioning with v1 prefix ([8779725](https://github.com/octopus-synapse/profile-services/commit/87797252224485ad05f70c1aa02f4445bc0af912)), closes [#26](https://github.com/octopus-synapse/profile-services/issues/26)
* add db:setup script and pre-test-script for CI ([d201392](https://github.com/octopus-synapse/profile-services/commit/d2013924e1d3c0d866fa8c388c08acdaadfb185a))
* add missing MEC tables migration ([d119b68](https://github.com/octopus-synapse/profile-services/commit/d119b68515599d28973d5bd2447135d26a8c7f0c))
* add missing theme system and enum migrations ([30f30b8](https://github.com/octopus-synapse/profile-services/commit/30f30b8c8260736e6b68facca3ded8abb21e241d))
* add missing usernameUpdatedAt column migration ([f78e476](https://github.com/octopus-synapse/profile-services/commit/f78e476f913a1a0f0ac3510db228511b1980a536))
* **auth:** improve password reset flow and email templates ([ddb9faa](https://github.com/octopus-synapse/profile-services/commit/ddb9faa6738a7ec2026f3a8ae0ba6318fcdfd9b7))
* **auth:** minor test fixes after refactoring ([eb0938f](https://github.com/octopus-synapse/profile-services/commit/eb0938f03491f1f8f53b4255b6649014d860174c))
* **auth:** require JWT_SECRET env var instead of fallback ([2f54aeb](https://github.com/octopus-synapse/profile-services/commit/2f54aebf59b36e6c996d3924ae124b127eca44c2))
* cd syntax ([9f8ee63](https://github.com/octopus-synapse/profile-services/commit/9f8ee63795009d599968e1722bd54376861a5324))
* **ci gate:** add checks: read permission to release workflow ([78a683c](https://github.com/octopus-synapse/profile-services/commit/78a683c0bf398e75d6bac2adc7c83dbca7857cbf))
* **ci:** add per-commit test summaries to PRs ([2b3d7b3](https://github.com/octopus-synapse/profile-services/commit/2b3d7b39950a6a2e9af281f1217bea44e0e9fc10))
* **ci:** add test summary comments to PRs ([e4d0325](https://github.com/octopus-synapse/profile-services/commit/e4d03251888b1d962ca2c85ce70aa78aae719f76))
* **ci:** use GH_PAT for GitHub Packages authentication ([d98d82a](https://github.com/octopus-synapse/profile-services/commit/d98d82ab522c16c551c98f7d26ed9316198f672a))
* convert absolute imports to relative paths and fix env validation ([f1d0ca8](https://github.com/octopus-synapse/profile-services/commit/f1d0ca83a7a329363ca1464ed88b32deaff0eed5))
* Copy data directory to dist in Dockerfile ([7ac9661](https://github.com/octopus-synapse/profile-services/commit/7ac9661483080fc2ace0114bcec4f4c53a058cc6))
* **core:** resolve lint errors in production code ([4201b57](https://github.com/octopus-synapse/profile-services/commit/4201b579bc73f4b725973479f69d1b676a82d8f1))
* correct file paths in contract validation workflow ([0de4959](https://github.com/octopus-synapse/profile-services/commit/0de4959b858d78ca3086873eef6f5bb9a1e27287))
* Correct path to main.js in Dockerfile (dist/src/main) ([ab3bd7a](https://github.com/octopus-synapse/profile-services/commit/ab3bd7a0df0edd62bb86ff2e6e727c462577a4d1))
* correct prisma config and migration order for CI ([7a46b91](https://github.com/octopus-synapse/profile-services/commit/7a46b918019254ae3391c6e25e1bd256e18ab3d6))
* enforce CI checks in pre-commit and fix lint errors ([3cfe3d9](https://github.com/octopus-synapse/profile-services/commit/3cfe3d9ce680ac8e3baf01844f2f6265871a81c4))
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
* **release:** align all version artifacts to v1.0.0 ([45b277a](https://github.com/octopus-synapse/profile-services/commit/45b277a1aa08df644cc908bbe0785cdc6975f168))
* **release:** correct manifest and package version to 1.0.1 ([071ae4e](https://github.com/octopus-synapse/profile-services/commit/071ae4e378d5de09daa0cb85421f25c07b8bc5db))
* **release:** remove self-referential CI Gate check ([dac080a](https://github.com/octopus-synapse/profile-services/commit/dac080a11de336100984ed065a106b8cd513901b))
* **release:** reset version to logical PATCH sequence 1.0.2 ([93d9e38](https://github.com/octopus-synapse/profile-services/commit/93d9e388339e629546bd097eeea206a338ba9f67))
* Remove Prisma update notification from migration file ([fd87eea](https://github.com/octopus-synapse/profile-services/commit/fd87eea0a8f360a474b7666f520959b601bfe54f))
* replace fragmented migrations with single initial schema ([ae26f86](https://github.com/octopus-synapse/profile-services/commit/ae26f86401eea4a91bc4b888e12b461fd0767f49))
* resolve all ESLint errors and warnings in ATS module ([3669917](https://github.com/octopus-synapse/profile-services/commit/366991700d58f7b0342682bfe5e1c567ce00c234))
* resolve all ESLint warnings with clean code practices ([625a9c4](https://github.com/octopus-synapse/profile-services/commit/625a9c408e208a6370a5c925cd9f2f8928b085b3))
* resolve typecheck, test, and lint issues ([c425994](https://github.com/octopus-synapse/profile-services/commit/c4259944b59b1633fea8e7e291eb50154a820083))
* resolve TypeScript errors and update test factories ([e2832e8](https://github.com/octopus-synapse/profile-services/commit/e2832e88a716e79eb512619f55191feab7b77d94))
* **services:** resolve TypeScript and lint errors ([bdffc1e](https://github.com/octopus-synapse/profile-services/commit/bdffc1edb991f5d3ff87a97024b3a73e340fd631))
* silence console logs during banner capture tests ([638e485](https://github.com/octopus-synapse/profile-services/commit/638e485566fce80239421c5dee42cf2c814e63ae))
* skip contract validation on release PRs ([510415f](https://github.com/octopus-synapse/profile-services/commit/510415f22fd5cb50573636ac8b9540333dc5dc8c))
* **smoke tests:** auth tests ([451b5d8](https://github.com/octopus-synapse/profile-services/commit/451b5d8de0d2bc8cc2faa7ebca1f530bd0c3df00))
* **tech-skills:** improve data file path resolution ([56efe64](https://github.com/octopus-synapse/profile-services/commit/56efe6448ead3cce13a083e4c4c017a9d369b97a))
* **test:** clean up bun:test imports in smoke tests ([a99d74c](https://github.com/octopus-synapse/profile-services/commit/a99d74c11ff2028e83e05cce4aae68c35c1f5f0b))
* **tests:** update existing tests to match current implementation ([2626b14](https://github.com/octopus-synapse/profile-services/commit/2626b14c9be5bca2f93c5542960d2a874e72b376))
* **tests:** update smoke tests for /v1/ API versioning ([04f7437](https://github.com/octopus-synapse/profile-services/commit/04f7437f7c92d842d5d6671e4215aa36227917e3))
* update onboarding DTOs and tests for contract structure ([b84748b](https://github.com/octopus-synapse/profile-services/commit/b84748b980952bd55eccea1c64ef38f3b7a5fa0c))
* update test expectations for API response format ([ce6593c](https://github.com/octopus-synapse/profile-services/commit/ce6593ca660e9da5ddbc911e055c0f144afc9643))
* update to use organization secrets ([6077609](https://github.com/octopus-synapse/profile-services/commit/6077609390f175d250044470ef7fa9dcbd426de3))
* update to use organization secrets explicitly ([f2a6a0f](https://github.com/octopus-synapse/profile-services/commit/f2a6a0fa76ae8646a98276cb71a378549c862fe1))
* update to use organization secrets explicitly ([9722613](https://github.com/octopus-synapse/profile-services/commit/97226134a05a1a756616247a69fd28ba08ef6b5d))
* usar imagem do GHCR no docker-compose ([dea12b7](https://github.com/octopus-synapse/profile-services/commit/dea12b7103f190fd2b8f7bb82b8420145b1c1a86))
* use Docker secrets instead of build args for GITHUB_TOKEN ([eaf6099](https://github.com/octopus-synapse/profile-services/commit/eaf60998123dbc98a0e1e7f566ebc54b4bf0db5b))
* use published profile-contracts instead of local link for CI ([6e7ce76](https://github.com/octopus-synapse/profile-services/commit/6e7ce762188cdce600688af2ad011973ab80b6f8))
* use secrets instead of build-args for Docker GitHub auth ([47a4d2f](https://github.com/octopus-synapse/profile-services/commit/47a4d2fe98764cae92c3b3be1bec33b5b8a4bb8c))
* use secrets instead of build-args for GitHub token in release workflow ([4053c35](https://github.com/octopus-synapse/profile-services/commit/4053c353782a858eea133201c5003fe31f87f13e))
* Use TypeScript config for Prisma migrations (requires ts-node) ([03e8871](https://github.com/octopus-synapse/profile-services/commit/03e88712e16ecfd104defbb90c3ad161eeb016b2))
* **username:** reject uppercase, validate reserved names and format ([f83f5a9](https://github.com/octopus-synapse/profile-services/commit/f83f5a913daaca474c91b9e8c98e87eb82a1ba19))


### Performance Improvements

* **repositories:** optimize update/delete to avoid N+1 queries ([54103b1](https://github.com/octopus-synapse/profile-services/commit/54103b1d936f2dd667126c4fd15b4be085f1013c))


### Documentation

* add ADR-002 for contract usage pattern ([8047e28](https://github.com/octopus-synapse/profile-services/commit/8047e28bea87d1bef9a9eeabd4e9c64d55710a79)), closes [#28](https://github.com/octopus-synapse/profile-services/issues/28)
* complete Milestone 1 testing infrastructure ([f5205df](https://github.com/octopus-synapse/profile-services/commit/f5205df5083acb7c6df29595534c5535b7faa658))
* document entity ordering strategies in repositories ([#45](https://github.com/octopus-synapse/profile-services/issues/45)) ([2582c41](https://github.com/octopus-synapse/profile-services/commit/2582c4169a6ba31896ebcbde4f7f0214eae875af))
* expand bugs-found.json to 64 bugs (doubled) ([5007e8b](https://github.com/octopus-synapse/profile-services/commit/5007e8b08f3070a3f6af5486afb03926b0ca65f8))
* translate README from Portuguese to English ([b71abef](https://github.com/octopus-synapse/profile-services/commit/b71abefd51d7ab02f9b792ceccaee18c0deb14a4))


### Miscellaneous Chores

* bootstrap v1.0.0 with CHANGELOG and commitlint ([be89dde](https://github.com/octopus-synapse/profile-services/commit/be89dde6083eb76ba55e7d8c5c31acac43ab6e8f))
* bump version to 1.0.3 ([390d84e](https://github.com/octopus-synapse/profile-services/commit/390d84ee620a66726a6a052fc850cf7ef57a5dcb))
* **ci:** adjust coverage thresholds for progressive improvement ([b8d9fd7](https://github.com/octopus-synapse/profile-services/commit/b8d9fd7e5b9dcd7baf4b99b7c5588cb9c9f39ecc))
* **config:** update email configuration in docker compose ([263361a](https://github.com/octopus-synapse/profile-services/commit/263361aeef633a1e3b872df954a2f3873bb4ece0))
* configure npm authentication for GitHub Packages ([fcf8863](https://github.com/octopus-synapse/profile-services/commit/fcf8863fd23ae13e441ac7f8a21fbb5e2a9a8a4a))
* **main:** release 1.1.0 ([#55](https://github.com/octopus-synapse/profile-services/issues/55)) ([03c1f9e](https://github.com/octopus-synapse/profile-services/commit/03c1f9e2a9ff51c442b471434ff45e2735da3885))
* **main:** release 2.0.0 ([#41](https://github.com/octopus-synapse/profile-services/issues/41)) ([1e698e1](https://github.com/octopus-synapse/profile-services/commit/1e698e1e755388d0abd9e54d5887929bed73b832))
* **main:** release 2.0.0 ([#84](https://github.com/octopus-synapse/profile-services/issues/84)) ([1c83b6c](https://github.com/octopus-synapse/profile-services/commit/1c83b6caff519d3305597bb0c52c724d72f667cc))
* **main:** release 2.0.1 ([#44](https://github.com/octopus-synapse/profile-services/issues/44)) ([4ff8154](https://github.com/octopus-synapse/profile-services/commit/4ff815428ecd7fb2000bafcea66e43e3b2fae9f4))
* **main:** release 3.0.0 ([#87](https://github.com/octopus-synapse/profile-services/issues/87)) ([16bc70d](https://github.com/octopus-synapse/profile-services/commit/16bc70de115a2f1a7275147e430bf47a8c38583e))
* **main:** release 3.1.0 ([#89](https://github.com/octopus-synapse/profile-services/issues/89)) ([0aa0ec7](https://github.com/octopus-synapse/profile-services/commit/0aa0ec76c65e616c2cef4c1dc9e2816e5fbef30f))
* migrar para org octopus-synapse ([a6d173e](https://github.com/octopus-synapse/profile-services/commit/a6d173e42018432d40a412e102999db41b06e26c))
* optimize CI workflow and fix release Docker build ([#86](https://github.com/octopus-synapse/profile-services/issues/86)) ([e2c2555](https://github.com/octopus-synapse/profile-services/commit/e2c25554410ed28f5c08d3529c6c20b2f4d7476f))
* **release:** configure always-bump-patch versioning ([ecf0bc0](https://github.com/octopus-synapse/profile-services/commit/ecf0bc09810e107d3a57f2c1edd7a748923905ad))
* **release:** prepare for v1.1.0 semver compliance ([cf09bdb](https://github.com/octopus-synapse/profile-services/commit/cf09bdb3f8e0f649d57f0bdb0bb4f1db3b5cd9fe))
* test octopus-workflows fixes ([f74872a](https://github.com/octopus-synapse/profile-services/commit/f74872a248afd72a45d769522087d7465cdc2ed2))
* test summaries with counts ([8f5886f](https://github.com/octopus-synapse/profile-services/commit/8f5886f14bc91a186e78dc0741c307dd826e591d))
* trigger CD redeploy with fixed workflow ([325deaa](https://github.com/octopus-synapse/profile-services/commit/325deaa8899a4d30ef422eb3452e440c37757ec0))
* trigger deploy ([b9bd2d3](https://github.com/octopus-synapse/profile-services/commit/b9bd2d33d1b3317606e02c5ee49f6def04db6f0e))
* Trigger rebuild to ensure Dockerfile changes are picked up ([a226d29](https://github.com/octopus-synapse/profile-services/commit/a226d29c2155fac6713102b117d6c80124d8c894))
* trigger release v3.1.1 ([0e86d29](https://github.com/octopus-synapse/profile-services/commit/0e86d29605c9931b25e1adc63b6cdb0b011166bf))
* trigger release v3.1.1 ([27394fd](https://github.com/octopus-synapse/profile-services/commit/27394fd78bf4fddde7bdd85a4961ef20d2a9c24a))


### Code Refactoring

* **admin,cache:** split large services into smaller components ([1b87c70](https://github.com/octopus-synapse/profile-services/commit/1b87c703ae666e3549b5185bb7f8153797aa57ae))
* **architecture:** enforce Clean Architecture boundaries ([143186f](https://github.com/octopus-synapse/profile-services/commit/143186f6a35f9215e022383be3f26f23079985e6))
* **auth:** split auth.controller.ts (219 lines) into 4 specialized controllers ([366fc4b](https://github.com/octopus-synapse/profile-services/commit/366fc4b38160dba0fc0d0f75f2bd18dca63b6a60))
* **auth:** split auth.service.ts (253 lines) into specialized services ([7ac87d1](https://github.com/octopus-synapse/profile-services/commit/7ac87d164c144fca28e4fd203849265131264f13))
* **ci:** implement Kent Beck + Uncle Bob test hierarchy ([d4d8533](https://github.com/octopus-synapse/profile-services/commit/d4d85333c1dbbbf3f930f8132d0998b95f0eb7ff))
* **ci:** migrate to octopus-workflows reusable workflows ([cc6cb40](https://github.com/octopus-synapse/profile-services/commit/cc6cb40a7840fba8f3a4b507ab437da5be9b889c))
* consolidated 15 sub-resource repositories ([#90](https://github.com/octopus-synapse/profile-services/issues/90)) ([34e23be](https://github.com/octopus-synapse/profile-services/commit/34e23be5890948544aff91f31ff6ead54f4a5773))
* **constants:** split large constant files into smaller modules ([f6c7afc](https://github.com/octopus-synapse/profile-services/commit/f6c7afc9eaceff1d1c0c064117dfe40a2ff0d2b9))
* **export:** split services into smaller components (100 lines max) ([217b4bb](https://github.com/octopus-synapse/profile-services/commit/217b4bbf14e6a44e42f6ba5f59f070564be583c2))
* extract magic numbers to named constants in ATS validators ([#47](https://github.com/octopus-synapse/profile-services/issues/47)) ([e6f4d2e](https://github.com/octopus-synapse/profile-services/commit/e6f4d2ea8f71174cd5b2e4e45205e487e8f03149))
* extract ownership verification to dedicated method ([5816cf8](https://github.com/octopus-synapse/profile-services/commit/5816cf8c43dda1f14eaafcad87eeee893cccfb70)), closes [#32](https://github.com/octopus-synapse/profile-services/issues/32)
* **github:** extract types from github-api.service.ts (146 -&gt; 97 lines) ([1cf9e1c](https://github.com/octopus-synapse/profile-services/commit/1cf9e1cbe5fcb1500a83313bad4a3c2d41781e01))
* **github:** split github.service.ts into database and sync services (275 lines -&gt; 95 facade + 68 db + 115 sync) ([91050d7](https://github.com/octopus-synapse/profile-services/commit/91050d7ec78b9bc0cf220e562accb6df70a22bd8))
* improve service initialization and error handling ([4da15fa](https://github.com/octopus-synapse/profile-services/commit/4da15faea458a93e381431e522d66efd85d77d92))
* **mec-sync:** split module into smaller components (100 lines max) ([fadb122](https://github.com/octopus-synapse/profile-services/commit/fadb122944dcd68ad0d7097c66cf0a9905840e11))
* migrate password validation to profile-contracts ([f6244e3](https://github.com/octopus-synapse/profile-services/commit/f6244e3b0c2cee4bd8f380bef8d8519d13b91557))
* migrate to octopus-workflows secret system ([266c022](https://github.com/octopus-synapse/profile-services/commit/266c0223de82f1629c2a4bd4ef65f0c13adf41a1))
* **onboarding:** extract progress service from onboarding.service.ts (226 -&gt; 103 lines) ([6e36425](https://github.com/octopus-synapse/profile-services/commit/6e364255e1d6e88060f92e75b39251d676bb3a8a))
* **onboarding:** split onboarding.dto.ts into smaller DTOs ([b1b1312](https://github.com/octopus-synapse/profile-services/commit/b1b1312491898fc907458277c8f157b253e2a53d))
* **onboarding:** use Zod from profile-contracts, remove class-validator duplication ([886f229](https://github.com/octopus-synapse/profile-services/commit/886f229347bd69e3bacc1e9873e9c6a358ca56a6))
* remove deprecated app.constants file ([4989b2f](https://github.com/octopus-synapse/profile-services/commit/4989b2f717bb95fcbab1108a5e42d5f7487f3953)), closes [#30](https://github.com/octopus-synapse/profile-services/issues/30)
* remove implementation assertions from base service tests ([67d891e](https://github.com/octopus-synapse/profile-services/commit/67d891ea3d632a1f84a7acb6f2fba878cc9cd6f5)), closes [#34](https://github.com/octopus-synapse/profile-services/issues/34)
* **resumes:** implement BaseSubResourceController to eliminate duplication ([35d26f1](https://github.com/octopus-synapse/profile-services/commit/35d26f1e04ce4ab7993a65c600657d8276b6ac07))
* Split large files into focused modules ([77bb5c0](https://github.com/octopus-synapse/profile-services/commit/77bb5c00ce3588d126392d4fc46559e74aa555d6))
* standardize API response format across services ([dc80859](https://github.com/octopus-synapse/profile-services/commit/dc80859325af991336871e6b312121e2b1d7840a))
* standardize pagination defaults across repositories ([#46](https://github.com/octopus-synapse/profile-services/issues/46)) ([f12a8ec](https://github.com/octopus-synapse/profile-services/commit/f12a8ecbd9070c3a4af64f15e2257a039c4102cd))
* **tech-skills:** complete milestone 2 - split all large files ([f2b94aa](https://github.com/octopus-synapse/profile-services/commit/f2b94aa98ff17519f87e1637b8d45227f87aae4f))
* **tech-skills:** split stackoverflow-parser into smaller modules ([f45d367](https://github.com/octopus-synapse/profile-services/commit/f45d36734d4975eafc60d958b18e75c008fe9826))
* **tech-skills:** split tech-skills-query into smaller services ([fa558ed](https://github.com/octopus-synapse/profile-services/commit/fa558edc95df10db28f597a7946aa56fa51a0d1b))
* **tech-skills:** split tech-skills-sync.service.ts (292 lines) into 5 specialized services ([e74173e](https://github.com/octopus-synapse/profile-services/commit/e74173ec1d8e8eaf5cbac18dedfa3d7ba416995e))
* **tests:** replace garbage tests with real service tests ([8e24a3d](https://github.com/octopus-synapse/profile-services/commit/8e24a3d5e4491ea5f8ff31428489c3b1163f28bf))
* **translation:** split translation.service.ts (276 lines) into 3 specialized services ([4e07d9c](https://github.com/octopus-synapse/profile-services/commit/4e07d9ce683cdff75a2d72f22111c93cfba389d4))
* use profile-contracts for backend validation schemas ([bf2bfbf](https://github.com/octopus-synapse/profile-services/commit/bf2bfbf364c14c0fb296305c5597de5a7d2d9719))
* **users:** split users.service.ts (228 lines) into 3 specialized services ([8229117](https://github.com/octopus-synapse/profile-services/commit/8229117994969fa879f4c7989cb54d865f4fa3bb))
* **validators:** remove what comments per ADR discipline ([396441f](https://github.com/octopus-synapse/profile-services/commit/396441fcd140516238860b02ab48ee230edc3d6b)), closes [#24](https://github.com/octopus-synapse/profile-services/issues/24)


### Tests

* achieve complete test coverage with 961 passing tests ([f7ed132](https://github.com/octopus-synapse/profile-services/commit/f7ed1324733628a38c147099a7a227bd4365c57d))
* add error path tests for cache and GitHub services ([618b82d](https://github.com/octopus-synapse/profile-services/commit/618b82dbb18e9337c976ade2ec3110ead6feb252))
* **admin:** add admin service tests ([a7403f7](https://github.com/octopus-synapse/profile-services/commit/a7403f77215f4fd02258a16d35db114ffda1d8ea))
* **ats:** add ATS service tests ([d0afa89](https://github.com/octopus-synapse/profile-services/commit/d0afa89e84ee8d906abc7f4c79d5b62cf173fbd5))
* **ats:** add comprehensive CV section parser tests ([0181acb](https://github.com/octopus-synapse/profile-services/commit/0181acbc6f6f5bf0c369799610e22818b628ccb6))
* **ats:** add comprehensive grammar validator test suite ([de90e5b](https://github.com/octopus-synapse/profile-services/commit/de90e5bd46e06d84a03155116fe30ac30e8baa3a))
* **ats:** add comprehensive layout safety validator tests ([3661e50](https://github.com/octopus-synapse/profile-services/commit/3661e500a374285103331b3c1938b60081222d14))
* **auth:** add account management tests with admin protection ([43c5dfd](https://github.com/octopus-synapse/profile-services/commit/43c5dfd2868fc5526f0854c6775ac7651e92188f))
* **auth:** add auth core service tests ([6e87233](https://github.com/octopus-synapse/profile-services/commit/6e872333225edfdb00805ae1a719cc024766bee7))
* **auth:** add password reset and email verification tests ([8506097](https://github.com/octopus-synapse/profile-services/commit/85060970f8082e369eb6776aace3a61158922ca0))
* **auth:** add token refresh service tests ([f2111aa](https://github.com/octopus-synapse/profile-services/commit/f2111aa8147b5488f7ad68f21c69d018d9fdc9ef))
* **auth:** add verification token tests ([6257871](https://github.com/octopus-synapse/profile-services/commit/62578717e5e61838c32ba9dc9e6b67e957e8a910))
* **auth:** refactor auth.service.spec to focus on behavior ([90a6353](https://github.com/octopus-synapse/profile-services/commit/90a63538e2262ba87210a5fe57c01895e2e21680))
* **bug-detection:** add Uncle Bob-style specification tests exposing 22 real bugs ([a7c9598](https://github.com/octopus-synapse/profile-services/commit/a7c959822d73fba2dbd3ff93dee163495afa5610))
* **bug:** BUG-010/032/049 rate limiting failures ([7c5c9af](https://github.com/octopus-synapse/profile-services/commit/7c5c9af5c475d89674a5e65cbb7882995979351c))
* **bug:** BUG-017/047 DSL version migration & size limit ([e086b6b](https://github.com/octopus-synapse/profile-services/commit/e086b6b187cc361ce14054769d3c908cbf27624d))
* **bug:** BUG-019/052 education missing date & order validation ([41c4485](https://github.com/octopus-synapse/profile-services/commit/41c4485eac515218f1a5e461cb4914b5aa3a63e6))
* **bug:** BUG-031/048 github URL extraction & token exposure ([e22c5de](https://github.com/octopus-synapse/profile-services/commit/e22c5dec635ead5daf7f700def0191e562d6630b))
* **bug:** BUG-033/055/057 account management race & session bugs ([79a16d8](https://github.com/octopus-synapse/profile-services/commit/79a16d82ad0b3768bd9a07a02fbfbe0d6db4e68c))
* **bug:** BUG-034/041/044 skill admin race & audit bugs ([0c8c1bb](https://github.com/octopus-synapse/profile-services/commit/0c8c1bba7fce8bf7148e98d6ce807c64e88fe499))
* **bug:** BUG-035 parseInt NaN not validated ([582fe5c](https://github.com/octopus-synapse/profile-services/commit/582fe5cca4460475fd6c8b8c1b2ec9cb88b44514))
* **bug:** BUG-036 ParseCuidPipe allows invalid IDs ([8a3b51f](https://github.com/octopus-synapse/profile-services/commit/8a3b51fa75951404867382a2b16ba523ba04ae0b))
* **bug:** BUG-037 PDF generator no timeout protection ([d98cc98](https://github.com/octopus-synapse/profile-services/commit/d98cc9804e4c443fac13d199b663eca6bc763e11))
* **bug:** BUG-045 CSRF protection missing ([022b68b](https://github.com/octopus-synapse/profile-services/commit/022b68baf4c7cc5dad4b2f8333fd1215bf285802))
* **bug:** BUG-050/054 redis lock & cache error handling ([cd9b1b3](https://github.com/octopus-synapse/profile-services/commit/cd9b1b3c22af69c1e0e94fda3498596a44df613e))
* **bug:** BUG-051/059 theme query no limits ([2066225](https://github.com/octopus-synapse/profile-services/commit/2066225e565796f396289dbf3c3a28589d11bcf2))
* **bug:** BUG-056 password change no session invalidation ([031b983](https://github.com/octopus-synapse/profile-services/commit/031b9834c8426c96783fd4be980fade5ad9b4126))
* **bug:** BUG-060 XSS sanitization missing ([38f3424](https://github.com/octopus-synapse/profile-services/commit/38f3424974943cbd29e96058a769dea66b4dc802))
* **bug:** BUG-061/062 resource limits missing ([d8e35cb](https://github.com/octopus-synapse/profile-services/commit/d8e35cbcd9664fe1b977d0ab0d359f1290e88286))
* **bug:** BUG-063 MEC data injection unsanitized ([cc07cfa](https://github.com/octopus-synapse/profile-services/commit/cc07cfacae8776c9ca72602cecfbc71cbad3e17a))
* **bug:** BUG-064 ATS parser ReDoS vulnerability ([b68bc62](https://github.com/octopus-synapse/profile-services/commit/b68bc62cb05d90af48c4d1cb1088918b6d901de0))
* **common:** add common module tests ([4b0658a](https://github.com/octopus-synapse/profile-services/commit/4b0658ad5db0de71e574d0c1bfcced100153cc53))
* **core:** add unit tests for base services ([06ef0a2](https://github.com/octopus-synapse/profile-services/commit/06ef0a2577dc82f8029a71e14f1a76778bb2b47d))
* **export:** add export service tests ([e37ec0e](https://github.com/octopus-synapse/profile-services/commit/e37ec0e57a9fdebe53428196b0b926015b17718c))
* **export:** add unit tests for export module services ([d487395](https://github.com/octopus-synapse/profile-services/commit/d487395de6dbc7cd6dc3d59b0c5545c2ac766748))
* **health:** add comprehensive health controller tests ([80e6579](https://github.com/octopus-synapse/profile-services/commit/80e6579060d2f9fc1065e160cc7e69a5d1bc6731))
* **integration:** add integration test infrastructure (WIP) ([851171a](https://github.com/octopus-synapse/profile-services/commit/851171a114b49488b79ec2055723329e93b44134))
* **integration:** add resume CRUD and onboarding integration tests ([8b97d62](https://github.com/octopus-synapse/profile-services/commit/8b97d62ea241162a886e67a67e67604d374c5bed))
* **languages:** add spoken languages catalog tests ([9f1dd1b](https://github.com/octopus-synapse/profile-services/commit/9f1dd1b0d7a8e0b9ccf2b68ed01ea3946b269aa0))
* **mec-sync:** add comprehensive MEC parser tests ([59a41ac](https://github.com/octopus-synapse/profile-services/commit/59a41ac337c303802c6e44a63835a1a90a54d082))
* **mec-sync:** add MEC sync service tests ([a4a8f00](https://github.com/octopus-synapse/profile-services/commit/a4a8f00ddf11b8f314f062f73abdd7c01bcc5f89))
* **onboarding:** add onboarding business rules tests ([23b6f8d](https://github.com/octopus-synapse/profile-services/commit/23b6f8df72ca3a6541168e0d1f9db943463e4782))
* **onboarding:** add progress tracking tests ([22ef265](https://github.com/octopus-synapse/profile-services/commit/22ef2657a2cfcce5cfb2cefa89aa67358ab48e0e))
* remove implementation assertions from base service tests ([#51](https://github.com/octopus-synapse/profile-services/issues/51)) ([390d84e](https://github.com/octopus-synapse/profile-services/commit/390d84ee620a66726a6a052fc850cf7ef57a5dcb))
* **resumes:** add education and publication service tests ([3227a1e](https://github.com/octopus-synapse/profile-services/commit/3227a1e7e745b8fd03bd5b8b90d901730f28083a))
* **resumes:** add resume business rules tests ([2ef94d5](https://github.com/octopus-synapse/profile-services/commit/2ef94d576efa5374f7599fb7e50a813e62617fd8))
* **services:** add resume service tests ([3283c60](https://github.com/octopus-synapse/profile-services/commit/3283c60d3e7056aad2ac0a48b777a71ff09b228e))
* **smoke:** add smoke tests for critical user flows ([89933a1](https://github.com/octopus-synapse/profile-services/commit/89933a138f696cf7ed82d1c91b6d77629479b1c3))
* **tech-skills:** add tech skills service tests ([b148d8f](https://github.com/octopus-synapse/profile-services/commit/b148d8f0a32483ca0525375820da122e851e62b8))
* **themes:** add comprehensive unit tests for themes module ([40ce825](https://github.com/octopus-synapse/profile-services/commit/40ce8256a1644a1504a3ea9aac35e13a6a52da45))
* **themes:** add theme business rules tests ([afe5192](https://github.com/octopus-synapse/profile-services/commit/afe51924256988564443545f3dece2999a4e9d07))
* **translation:** add comprehensive translation service tests ([8a7e072](https://github.com/octopus-synapse/profile-services/commit/8a7e07279bb06f0c1570c8b6853f6889268f442a))
* **translation:** add translation service tests ([5039c51](https://github.com/octopus-synapse/profile-services/commit/5039c512dff9a934fb2af57f328204fed7afed9f))
* trigger CI with corrected octopus-workflows ([90fb13d](https://github.com/octopus-synapse/profile-services/commit/90fb13d49759a913dede274d3b10fd451284ec66))
* trigger workflow ([92ec772](https://github.com/octopus-synapse/profile-services/commit/92ec77227f7c1ff5a64a6780dc60fcd73734300a))
* trigger workflow ([3578fbd](https://github.com/octopus-synapse/profile-services/commit/3578fbdb30fb1265f927b9f74064c8492ed703a5))
* **upload:** add comprehensive upload service test suite ([743aeb5](https://github.com/octopus-synapse/profile-services/commit/743aeb5f56331698afe670d00914bdd0b987be8f))
* **users:** add user profile and preferences services tests ([ea94267](https://github.com/octopus-synapse/profile-services/commit/ea94267d0917790fd8a35a6850ffb09388297e37))
* **users:** add username business rules tests ([b79d4e6](https://github.com/octopus-synapse/profile-services/commit/b79d4e6c733b5daf258d17c928c9cba4ff914f99))
* **users:** add username service tests with cooldown validation ([1a587ba](https://github.com/octopus-synapse/profile-services/commit/1a587bac1aa5826344efc954cc0d0ab21b3c2d10))


### Build System

* add test:smoke and typecheck scripts ([80dc45b](https://github.com/octopus-synapse/profile-services/commit/80dc45b8d277b0e9b1c6e8a0330968972f6518d0))


### Continuous Integration

* add CI gate before release ([25532c7](https://github.com/octopus-synapse/profile-services/commit/25532c7ebdffa454070b2506d1caf93f39ab97e7))
* add GitHub Packages authentication to Docker build ([915f82f](https://github.com/octopus-synapse/profile-services/commit/915f82fd915be6a821016709e9f1e83110653735))
* add packages read permission for GitHub Packages ([17b4ad2](https://github.com/octopus-synapse/profile-services/commit/17b4ad23d2e71ffd420958fe7638931bcf534935))
* add smoke tests and env validation to CI/CD workflows ([dd4c49e](https://github.com/octopus-synapse/profile-services/commit/dd4c49ed270d5bc6526400422bab28cd76816a23))
* configure NODE_AUTH_TOKEN for GitHub Packages authentication ([ea435e8](https://github.com/octopus-synapse/profile-services/commit/ea435e87e2cf1affb689551af8dc40de876258fe))
* Enforce strict concurrency control for production deployments ([dc969d6](https://github.com/octopus-synapse/profile-services/commit/dc969d6d5d74478de6b05afd978e6406b26db77b))
* fix permissions for reusable workflows ([9e6fc76](https://github.com/octopus-synapse/profile-services/commit/9e6fc76260b86b4bd5bb88ff7b79e7a8799dcc70))
* inline workflow jobs for GH_PAT authentication control ([4082775](https://github.com/octopus-synapse/profile-services/commit/4082775c102746cdab1795fd7bd9b5246bb3965b))
* move permissions to job level for GitHub Packages access ([65d283c](https://github.com/octopus-synapse/profile-services/commit/65d283c5b0f26b802b9320b909644e69009a93c8))
* trigger re-run after octopus-workflows update ([13921ed](https://github.com/octopus-synapse/profile-services/commit/13921eddf3d133c13ce4b0123c5845e7742a6f16))
* use GH_PAT for GitHub Packages authentication ([85f23e0](https://github.com/octopus-synapse/profile-services/commit/85f23e0a088eea3c05db76ccc95a7c6c87ac5a13))

## [3.1.0](https://github.com/octopus-synapse/profile-services/compare/v3.0.0...v3.1.0) (2026-01-09)


### Features

* Resume Sharing, Versioning & Analytics (Epic [#63](https://github.com/octopus-synapse/profile-services/issues/63)) ([#88](https://github.com/octopus-synapse/profile-services/issues/88)) ([a4b67cd](https://github.com/octopus-synapse/profile-services/commit/a4b67cdaf92e643ba8535ad35171997bcaac47bc))

## [3.0.0](https://github.com/octopus-synapse/profile-services/compare/v2.0.0...v3.0.0) (2026-01-09)


### ⚠ BREAKING CHANGES

* Removes pre-push hook. Pre-commit remains as fast feedback, CI is definitive validation.
* None
* **tests:** Remove Jest from auth strategies and services
* **tests:** Remove Jest, use only bun:test
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
* complete Jest to Bun migration - 131 files, 872/1118 tests passing, 19x faster ([58a694f](https://github.com/octopus-synapse/profile-services/commit/58a694fec53c9ec198a75580ae524b5ad1e3fcbe))
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
* Implement GraphQL API Migration (Epic [#67](https://github.com/octopus-synapse/profile-services/issues/67)) ([#83](https://github.com/octopus-synapse/profile-services/issues/83)) ([2de23b6](https://github.com/octopus-synapse/profile-services/commit/2de23b620e4b5256361f6c2af088f8bd198a4b51))
* implement mandatory section presence validation (Issue [#9](https://github.com/octopus-synapse/profile-services/issues/9)) ([e971869](https://github.com/octopus-synapse/profile-services/commit/e971869670fd72503f037a04fc2a55fa03b10142))
* implement section order and hierarchy validation (Issue [#4](https://github.com/octopus-synapse/profile-services/issues/4)) ([bd53782](https://github.com/octopus-synapse/profile-services/commit/bd53782228043fae641f446af1b472cec9d1de91))
* implement text extraction reliability check (Issue [#7](https://github.com/octopus-synapse/profile-services/issues/7)) ([6ca3ba7](https://github.com/octopus-synapse/profile-services/commit/6ca3ba767d7d824cacf2fcd9f41eb0e7ae6419de))
* improve error handling and API consistency ([1fe1a78](https://github.com/octopus-synapse/profile-services/commit/1fe1a782940cb6fc29d5aa48e8bc104cc9970663))
* init project setup ([e9076c3](https://github.com/octopus-synapse/profile-services/commit/e9076c3d2812fc39e312ea7831921d2841d36a96))
* integrate profile-contracts for backend validation ([ad0456d](https://github.com/octopus-synapse/profile-services/commit/ad0456d8ca2e2c2779fd6667429a0b8a30805e36))
* **mec:** add accent-insensitive course search ([5c51f12](https://github.com/octopus-synapse/profile-services/commit/5c51f12f34b4d15bbcc6534b48cf676e3b50fc7d))
* **mec:** add accent-insensitive search with unaccent extension ([078ed5b](https://github.com/octopus-synapse/profile-services/commit/078ed5b01492e937d3044cfb6f0032d9f4b9296d))
* **mec:** add MEC data sync workflow and services ([4748a2b](https://github.com/octopus-synapse/profile-services/commit/4748a2b8a0f5fc841f9f7a61a9b552715c98e5f6))
* service-port updated to work with secrets ([dd87f92](https://github.com/octopus-synapse/profile-services/commit/dd87f921a694456e417086b35e419c1942a87529))
* **spoken-languages:** adiciona catálogo de idiomas falados ([471307f](https://github.com/octopus-synapse/profile-services/commit/471307fa8add15539e45b516a8e7721afec74b87))
* **tech-skills:** adiciona catálogo de skills técnicas ([471307f](https://github.com/octopus-synapse/profile-services/commit/471307fa8add15539e45b516a8e7721afec74b87))
* **testing:** implement Milestone 0 - Kent Beck + Uncle Bob testing infrastructure ([b8540b5](https://github.com/octopus-synapse/profile-services/commit/b8540b5d0ea713e42b0aaca92fdadf48d2b01c5b))
* **tests:** add 32 bug detection tests - Uncle Bob audit ([b27b49a](https://github.com/octopus-synapse/profile-services/commit/b27b49a7698951b5b10409e732201bed2c8805e1))
* **tests:** migrate Auth Core (Milestone 2) to Bun native ([7485be4](https://github.com/octopus-synapse/profile-services/commit/7485be4867cf6aee66aef2017bdbc862fefa5370))
* **tests:** migrate Foundation (Milestone 1) to Bun native ([df973a5](https://github.com/octopus-synapse/profile-services/commit/df973a53c7427819b7f42f1d3d83213fdd14d119))


### Bug Fixes

* add API versioning with v1 prefix ([8779725](https://github.com/octopus-synapse/profile-services/commit/87797252224485ad05f70c1aa02f4445bc0af912)), closes [#26](https://github.com/octopus-synapse/profile-services/issues/26)
* add db:setup script and pre-test-script for CI ([d201392](https://github.com/octopus-synapse/profile-services/commit/d2013924e1d3c0d866fa8c388c08acdaadfb185a))
* add missing MEC tables migration ([d119b68](https://github.com/octopus-synapse/profile-services/commit/d119b68515599d28973d5bd2447135d26a8c7f0c))
* add missing theme system and enum migrations ([30f30b8](https://github.com/octopus-synapse/profile-services/commit/30f30b8c8260736e6b68facca3ded8abb21e241d))
* add missing usernameUpdatedAt column migration ([f78e476](https://github.com/octopus-synapse/profile-services/commit/f78e476f913a1a0f0ac3510db228511b1980a536))
* **auth:** improve password reset flow and email templates ([ddb9faa](https://github.com/octopus-synapse/profile-services/commit/ddb9faa6738a7ec2026f3a8ae0ba6318fcdfd9b7))
* **auth:** minor test fixes after refactoring ([eb0938f](https://github.com/octopus-synapse/profile-services/commit/eb0938f03491f1f8f53b4255b6649014d860174c))
* **auth:** require JWT_SECRET env var instead of fallback ([2f54aeb](https://github.com/octopus-synapse/profile-services/commit/2f54aebf59b36e6c996d3924ae124b127eca44c2))
* cd syntax ([9f8ee63](https://github.com/octopus-synapse/profile-services/commit/9f8ee63795009d599968e1722bd54376861a5324))
* **ci gate:** add checks: read permission to release workflow ([78a683c](https://github.com/octopus-synapse/profile-services/commit/78a683c0bf398e75d6bac2adc7c83dbca7857cbf))
* **ci:** add per-commit test summaries to PRs ([2b3d7b3](https://github.com/octopus-synapse/profile-services/commit/2b3d7b39950a6a2e9af281f1217bea44e0e9fc10))
* **ci:** add test summary comments to PRs ([e4d0325](https://github.com/octopus-synapse/profile-services/commit/e4d03251888b1d962ca2c85ce70aa78aae719f76))
* **ci:** use GH_PAT for GitHub Packages authentication ([d98d82a](https://github.com/octopus-synapse/profile-services/commit/d98d82ab522c16c551c98f7d26ed9316198f672a))
* convert absolute imports to relative paths and fix env validation ([f1d0ca8](https://github.com/octopus-synapse/profile-services/commit/f1d0ca83a7a329363ca1464ed88b32deaff0eed5))
* Copy data directory to dist in Dockerfile ([7ac9661](https://github.com/octopus-synapse/profile-services/commit/7ac9661483080fc2ace0114bcec4f4c53a058cc6))
* **core:** resolve lint errors in production code ([4201b57](https://github.com/octopus-synapse/profile-services/commit/4201b579bc73f4b725973479f69d1b676a82d8f1))
* correct file paths in contract validation workflow ([0de4959](https://github.com/octopus-synapse/profile-services/commit/0de4959b858d78ca3086873eef6f5bb9a1e27287))
* Correct path to main.js in Dockerfile (dist/src/main) ([ab3bd7a](https://github.com/octopus-synapse/profile-services/commit/ab3bd7a0df0edd62bb86ff2e6e727c462577a4d1))
* correct prisma config and migration order for CI ([7a46b91](https://github.com/octopus-synapse/profile-services/commit/7a46b918019254ae3391c6e25e1bd256e18ab3d6))
* enforce CI checks in pre-commit and fix lint errors ([3cfe3d9](https://github.com/octopus-synapse/profile-services/commit/3cfe3d9ce680ac8e3baf01844f2f6265871a81c4))
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
* **release:** align all version artifacts to v1.0.0 ([45b277a](https://github.com/octopus-synapse/profile-services/commit/45b277a1aa08df644cc908bbe0785cdc6975f168))
* **release:** correct manifest and package version to 1.0.1 ([071ae4e](https://github.com/octopus-synapse/profile-services/commit/071ae4e378d5de09daa0cb85421f25c07b8bc5db))
* **release:** remove self-referential CI Gate check ([dac080a](https://github.com/octopus-synapse/profile-services/commit/dac080a11de336100984ed065a106b8cd513901b))
* **release:** reset version to logical PATCH sequence 1.0.2 ([93d9e38](https://github.com/octopus-synapse/profile-services/commit/93d9e388339e629546bd097eeea206a338ba9f67))
* Remove Prisma update notification from migration file ([fd87eea](https://github.com/octopus-synapse/profile-services/commit/fd87eea0a8f360a474b7666f520959b601bfe54f))
* replace fragmented migrations with single initial schema ([ae26f86](https://github.com/octopus-synapse/profile-services/commit/ae26f86401eea4a91bc4b888e12b461fd0767f49))
* resolve all ESLint errors and warnings in ATS module ([3669917](https://github.com/octopus-synapse/profile-services/commit/366991700d58f7b0342682bfe5e1c567ce00c234))
* resolve all ESLint warnings with clean code practices ([625a9c4](https://github.com/octopus-synapse/profile-services/commit/625a9c408e208a6370a5c925cd9f2f8928b085b3))
* resolve typecheck, test, and lint issues ([c425994](https://github.com/octopus-synapse/profile-services/commit/c4259944b59b1633fea8e7e291eb50154a820083))
* resolve TypeScript errors and update test factories ([e2832e8](https://github.com/octopus-synapse/profile-services/commit/e2832e88a716e79eb512619f55191feab7b77d94))
* **services:** resolve TypeScript and lint errors ([bdffc1e](https://github.com/octopus-synapse/profile-services/commit/bdffc1edb991f5d3ff87a97024b3a73e340fd631))
* silence console logs during banner capture tests ([638e485](https://github.com/octopus-synapse/profile-services/commit/638e485566fce80239421c5dee42cf2c814e63ae))
* skip contract validation on release PRs ([510415f](https://github.com/octopus-synapse/profile-services/commit/510415f22fd5cb50573636ac8b9540333dc5dc8c))
* **smoke tests:** auth tests ([451b5d8](https://github.com/octopus-synapse/profile-services/commit/451b5d8de0d2bc8cc2faa7ebca1f530bd0c3df00))
* **tech-skills:** improve data file path resolution ([56efe64](https://github.com/octopus-synapse/profile-services/commit/56efe6448ead3cce13a083e4c4c017a9d369b97a))
* **test:** clean up bun:test imports in smoke tests ([a99d74c](https://github.com/octopus-synapse/profile-services/commit/a99d74c11ff2028e83e05cce4aae68c35c1f5f0b))
* **tests:** update existing tests to match current implementation ([2626b14](https://github.com/octopus-synapse/profile-services/commit/2626b14c9be5bca2f93c5542960d2a874e72b376))
* **tests:** update smoke tests for /v1/ API versioning ([04f7437](https://github.com/octopus-synapse/profile-services/commit/04f7437f7c92d842d5d6671e4215aa36227917e3))
* update onboarding DTOs and tests for contract structure ([b84748b](https://github.com/octopus-synapse/profile-services/commit/b84748b980952bd55eccea1c64ef38f3b7a5fa0c))
* update test expectations for API response format ([ce6593c](https://github.com/octopus-synapse/profile-services/commit/ce6593ca660e9da5ddbc911e055c0f144afc9643))
* update to use organization secrets ([6077609](https://github.com/octopus-synapse/profile-services/commit/6077609390f175d250044470ef7fa9dcbd426de3))
* update to use organization secrets explicitly ([f2a6a0f](https://github.com/octopus-synapse/profile-services/commit/f2a6a0fa76ae8646a98276cb71a378549c862fe1))
* update to use organization secrets explicitly ([9722613](https://github.com/octopus-synapse/profile-services/commit/97226134a05a1a756616247a69fd28ba08ef6b5d))
* usar imagem do GHCR no docker-compose ([dea12b7](https://github.com/octopus-synapse/profile-services/commit/dea12b7103f190fd2b8f7bb82b8420145b1c1a86))
* use Docker secrets instead of build args for GITHUB_TOKEN ([eaf6099](https://github.com/octopus-synapse/profile-services/commit/eaf60998123dbc98a0e1e7f566ebc54b4bf0db5b))
* use published profile-contracts instead of local link for CI ([6e7ce76](https://github.com/octopus-synapse/profile-services/commit/6e7ce762188cdce600688af2ad011973ab80b6f8))
* use secrets instead of build-args for Docker GitHub auth ([47a4d2f](https://github.com/octopus-synapse/profile-services/commit/47a4d2fe98764cae92c3b3be1bec33b5b8a4bb8c))
* use secrets instead of build-args for GitHub token in release workflow ([4053c35](https://github.com/octopus-synapse/profile-services/commit/4053c353782a858eea133201c5003fe31f87f13e))
* Use TypeScript config for Prisma migrations (requires ts-node) ([03e8871](https://github.com/octopus-synapse/profile-services/commit/03e88712e16ecfd104defbb90c3ad161eeb016b2))
* **username:** reject uppercase, validate reserved names and format ([f83f5a9](https://github.com/octopus-synapse/profile-services/commit/f83f5a913daaca474c91b9e8c98e87eb82a1ba19))


### Performance Improvements

* **repositories:** optimize update/delete to avoid N+1 queries ([54103b1](https://github.com/octopus-synapse/profile-services/commit/54103b1d936f2dd667126c4fd15b4be085f1013c))


### Documentation

* translate README from Portuguese to English ([b71abef](https://github.com/octopus-synapse/profile-services/commit/b71abefd51d7ab02f9b792ceccaee18c0deb14a4))


### Miscellaneous Chores

* optimize CI workflow and fix release Docker build ([#86](https://github.com/octopus-synapse/profile-services/issues/86)) ([e2c2555](https://github.com/octopus-synapse/profile-services/commit/e2c25554410ed28f5c08d3529c6c20b2f4d7476f))


### Code Refactoring

* **constants:** split large constant files into smaller modules ([f6c7afc](https://github.com/octopus-synapse/profile-services/commit/f6c7afc9eaceff1d1c0c064117dfe40a2ff0d2b9))
* **mec-sync:** split module into smaller components (100 lines max) ([fadb122](https://github.com/octopus-synapse/profile-services/commit/fadb122944dcd68ad0d7097c66cf0a9905840e11))

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
