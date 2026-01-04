# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
