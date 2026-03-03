# 🏗️ Plano de Migração Clean Architecture - 15 Services

## 📊 Visão Geral

O teste de arquitetura `enforces service/controller response responsibility split` identificou **15 services** que violam o padrão de separação de responsabilidades ao retornar objetos envelope com campo `success` (que é responsabilidade do Controller/HTTP layer).

### Modelo de Referência: `resume-version`

A estrutura ideal seguindo Clean Architecture:

```
services/
├── {domain}.service.ts           # Fachada - delega para use cases
├── {domain}.service.spec.ts      # Testes da fachada (mockando use cases)
└── {domain}/
    ├── ports/
    │   └── {domain}.port.ts      # Interfaces (Repository Port + Use Cases)
    ├── repository/
    │   └── {domain}.repository.ts # Implementação do Repository (Prisma)
    ├── use-cases/
    │   ├── action-1.use-case.ts   # Use case específico
    │   └── action-1.use-case.spec.ts  # Teste unitário do use case
    └── {domain}.composition.ts    # Factory que compõe use cases com deps
```

### Princípios a Seguir

1. **Services retornam dados de domínio** - Nunca objetos envelope `{ success, data, message }`
2. **Controllers criam a resposta HTTP** - Envelopes são responsabilidade da camada de transporte
3. **Use Cases encapsulam lógica de negócio** - Uma ação por use case
4. **Ports definem contratos** - Abstrações para Repository e Use Cases
5. **Repository implementa persistência** - Única responsabilidade de acesso a dados
6. **TDD obrigatório** - Escrever testes primeiro, depois implementação

---

## 📋 Lista dos 15 Services a Corrigir

| #   | Service             | Localização                                 | Prioridade |
| --- | ------------------- | ------------------------------------------- | ---------- |
| 1   | skill-management    | `skills-catalog/skills/services/`           | Alta       |
| 2   | onboarding          | `onboarding/onboarding/`                    | Alta       |
| 3   | onboarding-progress | `onboarding/onboarding/services/`           | Alta       |
| 4   | user-management     | `identity/users/services/`                  | Alta       |
| 5   | user-preferences    | `identity/users/services/`                  | Média      |
| 6   | username            | `identity/users/services/`                  | Média      |
| 7   | password-reset      | `identity/auth/services/`                   | Alta       |
| 8   | gdpr-deletion       | `identity/auth/services/`                   | Média      |
| 9   | account-management  | `identity/auth/services/`                   | Média      |
| 10  | email-verification  | `identity/auth/services/`                   | Alta       |
| 11  | two-factor-auth     | `identity/auth/services/`                   | Baixa      |
| 12  | github-sync         | `integration/integrations/github/services/` | Baixa      |
| 13  | section-visibility  | `presentation/themes/services/`             | Média      |
| 14  | theme-application   | `presentation/themes/services/`             | Média      |
| 15  | section-ordering    | `presentation/themes/services/`             | Média      |

---

## 🔧 Padrão de Migração TDD (para cada service)

### Fase 1: RED - Escrever Testes que Falham

```typescript
// Exemplo: skill-management.service.spec.ts
describe('SkillManagementService (Facade)', () => {
  let service: SkillManagementService;
  let useCases: SkillManagementUseCases;

  beforeEach(() => {
    useCases = {
      listSkillsUseCase: { execute: mock(async () => [mockSkill]) },
      addSkillUseCase: { execute: mock(async () => mockSkill) },
      updateSkillUseCase: { execute: mock(async () => mockSkill) },
      deleteSkillUseCase: { execute: mock(async () => undefined) },
    };
    service = new SkillManagementService(useCases);
  });

  it('delegates listSkillsForResume to use case', async () => {
    const result = await service.listSkillsForResume('resume-1');

    expect(useCases.listSkillsUseCase.execute).toHaveBeenCalledWith('resume-1');
    expect(result).toEqual([mockSkill]); // Retorna dados, NÃO envelope
  });

  it('delegates addSkillToResume to use case', async () => {
    const result = await service.addSkillToResume('resume-1', input);

    expect(result).toEqual(mockSkill); // Retorna skill, NÃO { success, skill, message }
  });
});
```

### Fase 2: GREEN - Implementar Minimamente

```typescript
// skill-management.service.ts (fachada)
@Injectable()
export class SkillManagementService {
  constructor(
    @Inject(SKILL_MANAGEMENT_USE_CASES)
    private readonly useCases: SkillManagementUseCases,
  ) {}

  async listSkillsForResume(resumeId: string) {
    return this.useCases.listSkillsUseCase.execute(resumeId);
  }

  async addSkillToResume(resumeId: string, data: CreateSkillInput) {
    return this.useCases.addSkillUseCase.execute(resumeId, data);
  }
}
```

### Fase 3: REFACTOR - Estruturar Clean Architecture

```
skill-management/
├── ports/
│   └── skill-management.port.ts
├── repository/
│   └── skill-management.repository.ts
├── use-cases/
│   ├── list-skills.use-case.ts
│   ├── list-skills.use-case.spec.ts
│   ├── add-skill.use-case.ts
│   ├── add-skill.use-case.spec.ts
│   ├── update-skill.use-case.ts
│   ├── update-skill.use-case.spec.ts
│   ├── delete-skill.use-case.ts
│   └── delete-skill.use-case.spec.ts
└── skill-management.composition.ts
```

---

## 📁 Estrutura de Arquivos por Service

### 1. skill-management.service.ts

**Atual:**

```typescript
return {
  success: true,
  skill: this.toSkillResponse(...),
  message: 'Skill added successfully',
};
```

**Novo:**

```typescript
return this.useCases.addSkillUseCase.execute(resumeId, data);
// Retorna apenas: Skill (dados de domínio)
```

**Estrutura:**

```
skills/services/
├── skill-management.service.ts
├── skill-management.service.spec.ts
└── skill-management/
    ├── ports/skill-management.port.ts
    ├── repository/skill-management.repository.ts
    ├── use-cases/
    │   ├── list-skills.use-case.ts
    │   ├── add-skill.use-case.ts
    │   ├── update-skill.use-case.ts
    │   └── delete-skill.use-case.ts
    └── skill-management.composition.ts
```

---

### 2-3. onboarding.service.ts & onboarding-progress.service.ts

**Estrutura:**

```
onboarding/
├── onboarding.service.ts
├── onboarding.service.spec.ts
└── onboarding/
    ├── ports/onboarding.port.ts
    ├── repository/onboarding.repository.ts
    ├── use-cases/
    │   ├── start-onboarding.use-case.ts
    │   ├── get-progress.use-case.ts
    │   ├── update-progress.use-case.ts
    │   └── complete-onboarding.use-case.ts
    └── onboarding.composition.ts
```

---

### 4-6. user-management, user-preferences, username

**Estrutura:**

```
users/services/
├── user-management.service.ts
├── user-management.service.spec.ts
├── user-management/
│   ├── ports/user-management.port.ts
│   ├── repository/user-management.repository.ts
│   ├── use-cases/
│   └── user-management.composition.ts
│
├── user-preferences.service.ts
├── user-preferences.service.spec.ts
├── user-preferences/
│   ├── ports/user-preferences.port.ts
│   ├── repository/user-preferences.repository.ts
│   ├── use-cases/
│   └── user-preferences.composition.ts
│
├── username.service.ts
├── username.service.spec.ts
└── username/
    ├── ports/username.port.ts
    ├── repository/username.repository.ts
    ├── use-cases/
    │   ├── update-username.use-case.ts
    │   ├── check-username.use-case.ts
    │   └── validate-username.use-case.ts
    └── username.composition.ts
```

---

### 7-11. auth services (password-reset, gdpr-deletion, account-management, email-verification, two-factor-auth)

**Estrutura:**

```
auth/services/
├── password-reset.service.ts
├── password-reset/
│   └── ... (ports, repository, use-cases, composition)
│
├── gdpr-deletion.service.ts
├── gdpr-deletion/
│   └── ...
│
├── account-management.service.ts
├── account-management/
│   └── ...
│
├── email-verification.service.ts
├── email-verification/
│   └── ...
│
├── two-factor-auth.service.ts
└── two-factor-auth/
    └── ...
```

---

### 12. github-sync.service.ts

**Estrutura:**

```
github/services/
├── github-sync.service.ts
├── github-sync.service.spec.ts
└── github-sync/
    ├── ports/github-sync.port.ts
    ├── repository/github-sync.repository.ts
    ├── use-cases/
    │   ├── sync-github.use-case.ts
    │   ├── get-sync-status.use-case.ts
    │   └── auto-sync.use-case.ts
    └── github-sync.composition.ts
```

---

### 13-15. themes services (section-visibility, theme-application, section-ordering)

**Estrutura:**

```
themes/services/
├── section-visibility.service.ts
├── section-visibility/
│   └── ...
│
├── theme-application.service.ts
├── theme-application/
│   └── ...
│
├── section-ordering.service.ts
└── section-ordering/
    └── ...
```

---

## ✅ Checklist de Migração (por service)

Para cada service, seguir em ordem:

- [ ] 1. Criar arquivo de port com interfaces (`{domain}.port.ts`)
- [ ] 2. Criar testes unitários dos use cases (RED)
- [ ] 3. Implementar use cases (GREEN)
- [ ] 4. Criar repository implementando o port
- [ ] 5. Criar composition factory
- [ ] 6. Refatorar service para ser fachada
- [ ] 7. Atualizar testes do service para mockar use cases
- [ ] 8. Atualizar controller se necessário (envelope de resposta)
- [ ] 9. Rodar `bun run test:arch` para validar
- [ ] 10. Refatorar (REFACTOR)

---

## 🚀 Ordem de Execução Sugerida

### Sprint 1 - Alta Prioridade (5 services)

1. `skill-management` - Mais simples, bom para estabelecer padrão
2. `user-management` - Core do sistema
3. `password-reset` - Auth crítico
4. `email-verification` - Auth crítico
5. `onboarding` - Fluxo principal de usuários

### Sprint 2 - Média Prioridade (7 services)

6. `onboarding-progress`
7. `user-preferences`
8. `username`
9. `gdpr-deletion`
10. `account-management`
11. `section-visibility`
12. `theme-application`

### Sprint 3 - Baixa Prioridade (3 services)

13. `section-ordering`
14. `two-factor-auth`
15. `github-sync`

---

## 📝 Template de Port (Interface)

```typescript
// {domain}.port.ts
import type { Prisma } from '@prisma/client';

// Types para o domínio
export type DomainEntity = {
  id: string;
  // ... campos
};

// Port do Repository (abstração)
export abstract class DomainRepositoryPort {
  abstract findById(id: string): Promise<DomainEntity | null>;
  abstract create(data: CreateInput): Promise<DomainEntity>;
  abstract update(id: string, data: UpdateInput): Promise<DomainEntity>;
  abstract delete(id: string): Promise<void>;
}

// Token para injeção de dependência
export const DOMAIN_USE_CASES = Symbol('DOMAIN_USE_CASES');

// Interface dos Use Cases
export interface DomainUseCases {
  createUseCase: { execute: (input: CreateInput) => Promise<DomainEntity> };
  updateUseCase: {
    execute: (id: string, input: UpdateInput) => Promise<DomainEntity>;
  };
  deleteUseCase: { execute: (id: string) => Promise<void> };
  getUseCase: { execute: (id: string) => Promise<DomainEntity> };
}
```

---

## 📝 Template de Use Case

```typescript
// create-{domain}.use-case.ts
import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  DomainRepositoryPort,
  type DomainEntity,
} from '../ports/{domain}.port';

export class CreateDomainUseCase {
  constructor(private readonly repository: DomainRepositoryPort) {}

  async execute(input: CreateInput): Promise<DomainEntity> {
    // Validações de negócio
    // ...

    // Criar entidade
    return this.repository.create(input);
  }
}
```

---

## 📝 Template de Composition

```typescript
// {domain}.composition.ts
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { DOMAIN_USE_CASES, type DomainUseCases } from './ports/{domain}.port';
import { DomainRepository } from './repository/{domain}.repository';
import { CreateDomainUseCase } from './use-cases/create-{domain}.use-case';
// ... outros use cases

export { DOMAIN_USE_CASES };

export function buildDomainUseCases(prisma: PrismaService): DomainUseCases {
  const repository = new DomainRepository(prisma);

  return {
    createUseCase: new CreateDomainUseCase(repository),
    updateUseCase: new UpdateDomainUseCase(repository),
    deleteUseCase: new DeleteDomainUseCase(repository),
    getUseCase: new GetDomainUseCase(repository),
  };
}
```

---

## 🎯 Métricas de Sucesso

Após migração completa:

```bash
bun run test:arch
```

Deve passar com:

- ✅ `enforces service/controller response responsibility split` - 0 violações
- ✅ Todos os 15 services seguindo Clean Architecture
- ✅ Cobertura de testes unitários para cada Use Case

---

## 📚 Referências

- Modelo de referência: `src/bounded-contexts/resumes/resume-versions/`
- Clean Architecture (Robert C. Martin)
- TDD (Kent Beck)
- Ports & Adapters (Hexagonal Architecture)
