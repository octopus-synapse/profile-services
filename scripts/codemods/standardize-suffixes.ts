#!/usr/bin/env bun
/**
 * Etapa 0 da rapadura — padroniza sufixos no bucket "other"
 * (arquivos > 100 linhas sem sufixo DDD reconhecido).
 *
 * Não toca:
 * - Arquivos com sufixo já válido (.enum, .util, .template, .interface)
 * - Infra Elysia (será splitada na Etapa 4)
 * - Scripts de build
 */

import { loadProject, type Rename, renameFiles } from './lib';

const renames: Rename[] = [
  // Domain entities (em domain/entities/, sem sufixo)
  {
    from: 'src/bounded-contexts/jobs/domain/entities/job.ts',
    to: 'src/bounded-contexts/jobs/domain/entities/job.entity.ts',
  },
  {
    from: 'src/bounded-contexts/notifications/domain/entities/notification.ts',
    to: 'src/bounded-contexts/notifications/domain/entities/notification.entity.ts',
  },
  {
    from: 'src/bounded-contexts/feed/domain/entities/post.ts',
    to: 'src/bounded-contexts/feed/domain/entities/post.entity.ts',
  },

  // Value objects
  {
    from: 'src/bounded-contexts/analytics/resume-analytics/domain/value-objects/industry-keywords.ts',
    to: 'src/bounded-contexts/analytics/resume-analytics/domain/value-objects/industry-keywords.vo.ts',
  },
  {
    from: 'src/bounded-contexts/resumes/domain/value-objects/locale-content.ts',
    to: 'src/bounded-contexts/resumes/domain/value-objects/locale-content.vo.ts',
  },
  {
    from: 'src/bounded-contexts/resumes/domain/value-objects/resume-dsl.ts',
    to: 'src/bounded-contexts/resumes/domain/value-objects/resume-dsl.vo.ts',
  },

  // Types-only (era classificado domain/, mas é só interface TS)
  {
    from: 'src/bounded-contexts/resumes/variants/domain/variant-overlay.ts',
    to: 'src/bounded-contexts/resumes/variants/domain/variant-overlay.types.ts',
  },

  // Domain services / parsers
  {
    from: 'src/bounded-contexts/import/domain/services/json-resume-parser.ts',
    to: 'src/bounded-contexts/import/domain/services/json-resume.parser.ts',
  },
  {
    from: 'src/bounded-contexts/platform/feature-flags/domain/feature-flag-graph.ts',
    to: 'src/bounded-contexts/platform/feature-flags/domain/feature-flag-graph.service.ts',
  },

  // DSL parsers/compilers (já em pastas certas, sem sufixo)
  {
    from: 'src/bounded-contexts/dsl/application/compilers/theme-compiler.ts',
    to: 'src/bounded-contexts/dsl/application/compilers/theme.compiler.ts',
  },
  {
    from: 'src/bounded-contexts/dsl/application/parsers/expression-parser.ts',
    to: 'src/bounded-contexts/dsl/application/parsers/expression.parser.ts',
  },
  {
    from: 'src/bounded-contexts/dsl/application/parsers/expression-lexer.ts',
    to: 'src/bounded-contexts/dsl/application/parsers/expression.lexer.ts',
  },
  {
    from: 'src/bounded-contexts/dsl/application/compilers/token-evaluator.ts',
    to: 'src/bounded-contexts/dsl/application/compilers/token.evaluator.ts',
  },
  {
    from: 'src/bounded-contexts/dsl/application/compilers/color-functions.ts',
    to: 'src/bounded-contexts/dsl/application/compilers/color.functions.ts',
  },

  // UI-metadata services
  {
    from: 'src/bounded-contexts/platform/ui-metadata/application/services/enum-catalog.ts',
    to: 'src/bounded-contexts/platform/ui-metadata/application/services/enum-catalog.service.ts',
  },
  {
    from: 'src/bounded-contexts/platform/ui-metadata/application/services/menu-builder.ts',
    to: 'src/bounded-contexts/platform/ui-metadata/application/services/menu.builder.ts',
  },

  // shared-kernel auth/http
  {
    from: 'src/shared-kernel/authorization/permission-resolver.ts',
    to: 'src/shared-kernel/authorization/permission-resolver.service.ts',
  },
  {
    from: 'src/shared-kernel/authorization/permission-groups.ts',
    to: 'src/shared-kernel/authorization/permission-groups.config.ts',
  },
  {
    from: 'src/shared-kernel/utils/locale-resolver.ts',
    to: 'src/shared-kernel/utils/locale-resolver.util.ts',
  },
  {
    from: 'src/shared-kernel/http/route.ts',
    to: 'src/shared-kernel/http/route.types.ts',
  },
  {
    from: 'src/shared-kernel/http/error-mapper.ts',
    to: 'src/shared-kernel/http/error.mapper.ts',
  },

  // i18n mapper
  {
    from: 'src/bounded-contexts/platform/i18n/application/zod-issue-to-code.ts',
    to: 'src/bounded-contexts/platform/i18n/application/zod-issue-to-code.mapper.ts',
  },

  // Onboarding rules
  {
    from: 'src/bounded-contexts/onboarding/domain/config/onboarding-validation.ts',
    to: 'src/bounded-contexts/onboarding/domain/config/onboarding-validation.rules.ts',
  },

  // Import use-case helper
  {
    from: 'src/bounded-contexts/import/application/use-cases/import-github/parse-github-profile.ts',
    to: 'src/bounded-contexts/import/application/use-cases/import-github/parse-github-profile.helper.ts',
  },

  // Time capsule email builder
  {
    from: 'src/bounded-contexts/resumes/time-capsule/build-time-capsule-email.ts',
    to: 'src/bounded-contexts/resumes/time-capsule/time-capsule-email.builder.ts',
  },

  // Authorization seeds runner
  {
    from: 'src/bounded-contexts/identity/authorization/seeds/seed-runner.ts',
    to: 'src/bounded-contexts/identity/authorization/seeds/seed.runner.ts',
  },

  // Collaboration chat handler
  {
    from: 'src/bounded-contexts/collaboration/chat/gateways/chat-handlers.ts',
    to: 'src/bounded-contexts/collaboration/chat/gateways/chat.handler.ts',
  },

  // Elysia cookie adapter
  {
    from: 'src/infrastructure/elysia-adapter/cookie-bridge.ts',
    to: 'src/infrastructure/elysia-adapter/cookie-bridge.adapter.ts',
  },

  // Testing in-memory / stubs
  {
    from: 'src/bounded-contexts/integration/mec-sync/testing/in-memory-mec-repositories.ts',
    to: 'src/bounded-contexts/integration/mec-sync/testing/in-memory-mec.repository.ts',
  },
  {
    from: 'src/bounded-contexts/identity/shared-kernel/testing/stubs/stub-authorization-service.ts',
    to: 'src/bounded-contexts/identity/shared-kernel/testing/stubs/stub-authorization.service.ts',
  },
  {
    from: 'src/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-authorization-service.ts',
    to: 'src/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-authorization.service.ts',
  },
  {
    from: 'src/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-audit-logger.ts',
    to: 'src/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-audit-logger.adapter.ts',
  },
];

console.log(`Carregando projeto ts-morph...`);
const project = loadProject();
console.log(`Aplicando ${renames.length} renames...`);
renameFiles(project, renames);
console.log(`Done.`);
