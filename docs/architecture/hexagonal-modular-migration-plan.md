# 🏗️ Hexagonal Modular Architecture - Migration Plan

> **Alternativa 4**: Combinação de Bounded Contexts + Vertical Slices + Hexagonal Architecture
>
> Aprovado por Uncle Bob! 🎓

## 📋 Sumário Executivo

Esta migração transforma a estrutura atual de `identity/auth` (com múltiplos sub-services) em **Bounded Contexts separados** seguindo a arquitetura hexagonal com vertical slices.

---

## ✅ Status da Migração

| Fase | Bounded Context     | Status      |
| ---- | ------------------- | ----------- |
| 0    | Shared Kernel       | ✅ COMPLETO |
| 1    | Password Management | ✅ COMPLETO |
| 2    | Email Verification  | ✅ COMPLETO |
| 3    | Account Lifecycle   | ✅ COMPLETO |
| 4    | Authentication      | ✅ COMPLETO |
| 5    | Two-Factor Auth     | ✅ COMPLETO |
| 6    | Cleanup & Validação | ✅ COMPLETO |

**MIGRAÇÃO CONCLUÍDA!** O diretório `auth/` foi **deletado** completamente.

---

## 🎯 Objetivos

- ✅ Eliminar múltiplos sub-services em `services/`
- ✅ Cada Bounded Context com responsabilidade única (SRP)
- ✅ Use-cases PUROS (zero imports de infraestrutura)
- ✅ Exceções de domínio (não framework)
- ✅ Repository traduz erros de infraestrutura
- ✅ Value Objects para validação
- ✅ Ports segregados (ISP)
- ✅ Domain Events

---

## 🗂️ Estrutura Alvo

```
bounded-contexts/identity/
│
├── authentication/                      # 🔐 BC: Login/Logout
│   ├── modules/
│   │   ├── login/
│   │   │   ├── login.controller.ts
│   │   │   ├── login.use-case.ts
│   │   │   ├── login.use-case.spec.ts
│   │   │   ├── login.port.ts
│   │   │   └── login.dto.ts
│   │   └── logout/
│   │       └── ... (mesma estrutura)
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── events/
│   │   └── exceptions/
│   ├── ports/
│   │   ├── inbound/
│   │   └── outbound/
│   ├── adapters/
│   │   ├── inbound/http/
│   │   └── outbound/
│   │       ├── persistence/
│   │       └── services/
│   └── authentication.module.ts
│
├── password-management/                 # 🔑 BC: Senhas
│   ├── modules/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── change-password/
│   ├── domain/
│   ├── ports/
│   ├── adapters/
│   └── password-management.module.ts
│
├── email-verification/                  # ✉️ BC: Verificação
│   ├── modules/
│   │   ├── request-verification/
│   │   └── verify-email/
│   ├── domain/
│   ├── ports/
│   ├── adapters/
│   └── email-verification.module.ts
│
├── two-factor-auth/                     # 🔐 BC: 2FA
│   ├── modules/
│   │   ├── setup-2fa/
│   │   ├── verify-2fa/
│   │   └── disable-2fa/
│   ├── domain/
│   ├── ports/
│   ├── adapters/
│   └── two-factor-auth.module.ts
│
├── account-lifecycle/                   # 🗑️ BC: GDPR/Deletion
│   ├── modules/
│   │   ├── delete-account/
│   │   ├── change-email/
│   │   └── export-data/
│   ├── domain/
│   ├── ports/
│   ├── adapters/
│   └── account-lifecycle.module.ts
│
└── shared-kernel/                       # 🌐 Compartilhado
    ├── domain/
    │   ├── value-objects/
    │   │   ├── user-id.vo.ts
    │   │   └── email.vo.ts
    │   └── events/
    │       └── domain-event.base.ts
    ├── ports/
    │   └── event-bus.port.ts
    ├── exceptions/
    │   ├── domain.exception.ts
    │   ├── not-found.exception.ts
    │   ├── conflict.exception.ts
    │   └── validation.exception.ts
    └── adapters/
        └── nest-event-bus.adapter.ts
```

---

## 📦 Mapeamento: Estrutura Atual → Nova

| Atual (identity/auth/services/) | Novo Bounded Context   |
| ------------------------------- | ---------------------- |
| `password-reset/`               | `password-management/` |
| `email-verification/`           | `email-verification/`  |
| `gdpr-deletion/`                | `account-lifecycle/`   |
| `account-management/`           | `account-lifecycle/`   |
| Auth core (login/logout)        | `authentication/`      |
| 2FA (se existir)                | `two-factor-auth/`     |

---

## 📋 Plano de Migração

### Fase 0: Shared Kernel (Pré-requisito)

- [ ] **0.1** Criar estrutura `identity/shared-kernel/`
- [ ] **0.2** Criar `domain/value-objects/user-id.vo.ts`
- [ ] **0.3** Criar `domain/value-objects/email.vo.ts`
- [ ] **0.4** Criar `domain/events/domain-event.base.ts`
- [ ] **0.5** Criar `ports/event-bus.port.ts`
- [ ] **0.6** Criar exceções base em `exceptions/`
- [ ] **0.7** Criar `adapters/nest-event-bus.adapter.ts`

### Fase 1: Password Management BC

- [ ] **1.1** Criar estrutura de diretórios
- [ ] **1.2** Migrar `forgot-password` module
- [ ] **1.3** Migrar `reset-password` module
- [ ] **1.4** Migrar `change-password` module
- [ ] **1.5** Criar domain/value-objects (Password, ResetToken)
- [ ] **1.6** Criar domain/exceptions
- [ ] **1.7** Criar ports/outbound
- [ ] **1.8** Criar adapters/outbound/persistence
- [ ] **1.9** Criar adapters/outbound/crypto (hasher)
- [ ] **1.10** Criar `password-management.module.ts`
- [ ] **1.11** Atualizar testes
- [ ] **1.12** Remover código antigo

### Fase 2: Email Verification BC

- [ ] **2.1** Criar estrutura de diretórios
- [ ] **2.2** Migrar `request-verification` module
- [ ] **2.3** Migrar `verify-email` module
- [ ] **2.4** Criar domain (VerificationToken entity)
- [ ] **2.5** Criar ports/outbound
- [ ] **2.6** Criar adapters (persistence, email)
- [ ] **2.7** Criar `email-verification.module.ts`
- [ ] **2.8** Atualizar testes
- [ ] **2.9** Remover código antigo

### Fase 3: Account Lifecycle BC

- [ ] **3.1** Criar estrutura de diretórios
- [ ] **3.2** Migrar `delete-account` module (GDPR)
- [ ] **3.3** Migrar `change-email` module
- [ ] **3.4** Criar `export-data` module (GDPR)
- [ ] **3.5** Criar domain (DeletionRequest entity)
- [ ] **3.6** Criar ports/outbound
- [ ] **3.7** Criar adapters
- [ ] **3.8** Criar `account-lifecycle.module.ts`
- [ ] **3.9** Atualizar testes
- [ ] **3.10** Remover código antigo

### Fase 4: Authentication BC

- [ ] **4.1** Criar estrutura de diretórios
- [ ] **4.2** Migrar `login` module
- [ ] **4.3** Migrar `logout` module
- [ ] **4.4** Migrar `refresh-token` module
- [ ] **4.5** Criar domain (Session entity, Token VO)
- [ ] **4.6** Criar ports/outbound
- [ ] **4.7** Criar adapters (persistence, jwt)
- [ ] **4.8** Criar `authentication.module.ts`
- [ ] **4.9** Atualizar testes
- [ ] **4.10** Remover código antigo

### Fase 5: Two-Factor Auth BC (se existir)

- [ ] **5.1** Verificar se 2FA existe no projeto
- [ ] **5.2** Criar estrutura se necessário
- [ ] **5.3** Migrar módulos relacionados

### Fase 6: Cleanup & Validation

- [ ] **6.1** Remover `identity/auth/services/` antigo
- [ ] **6.2** Atualizar imports em todo o projeto
- [ ] **6.3** Atualizar `AuthModule` principal
- [ ] **6.4** Atualizar testes de arquitetura
- [ ] **6.5** Rodar todos os testes
- [ ] **6.6** Documentar mudanças

---

## 🔧 Padrões de Implementação

### Estrutura de um Module (Vertical Slice)

```
modules/[feature]/
├── [feature].controller.ts      # Adapter HTTP
├── [feature].use-case.ts        # Application Service
├── [feature].use-case.spec.ts   # Testes unitários
├── [feature].port.ts            # Interface do use-case
└── [feature].dto.ts             # DTOs de entrada/saída
```

### Use-Case Template

```typescript
import type { [Feature]Port, [Feature]Input, [Feature]Output } from './[feature].port';

export class [Feature]UseCase implements [Feature]Port {
  constructor(
    private readonly repository: [Repository]Port,
    // ... outros ports
  ) {}

  async execute(input: [Feature]Input): Promise<[Feature]Output> {
    // Business logic pura
    // ZERO imports de @nestjs, @prisma, etc.
  }
}
```

### Port Template (Inbound)

```typescript
export interface [Feature]Port {
  execute(input: [Feature]Input): Promise<[Feature]Output>;
}

export interface [Feature]Input {
  // Dados de entrada
}

export interface [Feature]Output {
  // Dados de saída
}
```

### Port Template (Outbound)

```typescript
export interface [Repository]Port {
  findById(id: string): Promise<Entity | null>;
  save(entity: Entity): Promise<Entity>;
  // ... outros métodos
}
```

### Domain Exception Template

```typescript
import { DomainException } from '../../../shared-kernel/exceptions/domain.exception';

export class [Specific]Exception extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
```

---

## 📊 Métricas de Sucesso

| Métrica                        | Antes | Depois |
| ------------------------------ | ----- | ------ |
| Sub-services em auth           | 4     | 0      |
| Bounded Contexts               | 1     | 5      |
| Use-cases com deps de infra    | ~15   | 0      |
| Value Objects                  | 0     | 5+     |
| Domain Events                  | 0     | 5+     |
| Testes de arquitetura passando | 34    | 34+    |

---

## 🚀 Começando

**Próximo passo**: Fase 0.1 - Criar estrutura `identity/shared-kernel/`

```bash
# Criar estrutura base
mkdir -p src/bounded-contexts/identity/shared-kernel/{domain/{value-objects,events},ports,exceptions,adapters}
```

---

## 📝 Notas

- Cada fase será implementada com TDD
- Manter backward compatibility durante migração
- Testes de arquitetura validam cada etapa
- Code review após cada fase

---

_Documento criado em: 2026-03-02_
_Última atualização: 2026-03-02_
_Aprovado por: Uncle Bob 🎓_
