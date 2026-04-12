# ADR-002: Modular Hexagonal Architecture para Bounded Contexts Complexos

> **Escopo**: Bounded contexts com múltiplos submodules.
> Para BCs simples (sem submodules), ver [ADR-001](./ADR-001-hexagonal-architecture.md).

## Status

**Aceito** - 2026-04-06

## Contexto

Alguns bounded contexts (como `identity`) possuem múltiplas áreas funcionais distintas que:

1. Têm controllers, repositories e lógica de negócio próprios
2. Compartilham conceitos de domínio (events, value objects, exceptions)
3. Precisam de coordenação sem acoplamento direto

O ADR-001 define a estrutura hexagonal para BCs simples. Este ADR estende o padrão para BCs complexos que agregam múltiplos submodules.

## Decisão

Adotar **Modular Hexagonal Architecture** onde cada submodule segue ADR-001 internamente, coordenados por um shared-kernel no nível do BC.

```
┌──────────────────────────────────────────────────────────────┐
│                    BOUNDED CONTEXT                            │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │    Submodule A       │  │    Submodule B       │          │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │          │
│  │  │    Domain      │  │  │  │    Domain      │  │          │
│  │  └───────────────┘  │  │  └───────────────┘  │          │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │          │
│  │  │  Application   │  │  │  │  Application   │  │          │
│  │  └───────────────┘  │  │  └───────────────┘  │          │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │          │
│  │  │ Infrastructure │  │  │  │ Infrastructure │  │          │
│  │  └───────────────┘  │  │  └───────────────┘  │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │              Shared Kernel                    │           │
│  │  Domain Events, Value Objects, Exceptions    │           │
│  │  Shared Ports, Adapters, Testing Doubles     │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  [bc].module.ts  (agrega submodules)                        │
│  index.ts        (public exports)                           │
└──────────────────────────────────────────────────────────────┘
```

## Estrutura Obrigatória

```
[bounded-context]/
│
├── [submodule-a]/                       # Segue ADR-001 internamente
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/               (OPCIONAL)
│   │   ├── events/                      (eventos locais ao submodule)
│   │   ├── exceptions/
│   │   └── ports/
│   ├── application/
│   │   ├── use-cases/
│   │   ├── handlers/                    (OPCIONAL)
│   │   └── ports/                       (OPCIONAL)
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── persistence/
│   │   │   └── external-services/
│   │   └── controllers/
│   ├── testing/
│   │   ├── in-memory-[repo].repository.ts
│   │   └── fixtures/
│   ├── [submodule-a].module.ts
│   └── index.ts
│
├── [submodule-b]/                       # Mesmo padrão ADR-001
│   └── ...
│
├── shared-kernel/                       # Compartilhado entre submodules
│   ├── domain/
│   │   ├── events/                      # Domain events compartilhados
│   │   └── value-objects/               # VOs usados por 2+ submodules
│   ├── exceptions/                      # Exceções base do BC
│   ├── ports/                           # Ports compartilhadas (ex: EventBus)
│   ├── adapters/                        # Adapters compartilhados
│   ├── infrastructure/                  # Guards, decorators, strategies compartilhados
│   │   ├── decorators/
│   │   ├── guards/
│   │   └── strategies/
│   └── testing/
│       ├── in-memory/                   # In-memory repos compartilhados
│       └── stubs/                       # Stubs para serviços externos
│
├── [bc].module.ts                       # Agrega todos os submodules
└── index.ts                             # Public exports do BC
```

## Regras do Shared Kernel

### O que pertence ao shared-kernel

- [x] Domain events que cruzam submodules (ex: `UserRegisteredEvent`)
- [x] Value objects usados por 2+ submodules (ex: `UserId`, `Email`)
- [x] Exceções base do BC (ex: `DomainException`, `UnauthorizedException`)
- [x] Ports compartilhadas (ex: `EventBusPort`)
- [x] Infrastructure compartilhada (guards, strategies, decorators)
- [x] Testing doubles usados por 2+ submodules

### O que NÃO pertence ao shared-kernel

- [ ] Entities (pertencem ao submodule)
- [ ] Use cases (pertencem ao submodule)
- [ ] Controllers (pertencem ao submodule)
- [ ] Repositories específicos (pertencem ao submodule)
- [ ] Events locais a um único submodule

## Module Aggregator

O `[bc].module.ts` é um module simples que agrega os submodules:

```typescript
// identity.module.ts
@Module({
  imports: [
    AuthenticationModule,
    AuthorizationModule,
    PasswordManagementModule,
    EmailVerificationModule,
    AccountLifecycleModule,
    TwoFactorAuthModule,
  ],
  exports: [
    AuthenticationModule,
    AuthorizationModule,
    PasswordManagementModule,
    EmailVerificationModule,
    AccountLifecycleModule,
    TwoFactorAuthModule,
  ],
})
export class IdentityModule {}
```

## Public Exports

O `index.ts` exporta a API pública do BC:

```typescript
// index.ts

// NestJS Modules
export { IdentityModule } from './identity.module';
export { AuthenticationModule } from './authentication/authentication.module';

// Shared Kernel Exceptions (para uso por outros BCs)
export { DomainException, UnauthorizedException } from './shared-kernel/exceptions';

// Shared Kernel Ports (para implementação por outros BCs)
export type { EventBusPort } from './shared-kernel/ports/event-bus.port';
```

## Comunicação entre Submodules

Submodules se comunicam via:

1. **Domain Events** (preferido): Submodule A publica evento, Submodule B reage via handler
2. **Inbound Ports**: Submodule A define interface, Submodule B importa o module e injeta
3. **NUNCA** importar diretamente de `domain/` ou `application/` de outro submodule

## Naming Conventions

Seguem ADR-001, com adição de:

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Module Aggregator | `[bc].module.ts` | `identity.module.ts` |
| Shared Event | `shared-kernel/domain/events/[entity-action].event.ts` | `user-registered.event.ts` |
| Shared Exception | `shared-kernel/exceptions/[name].exception.ts` | `domain.exception.ts` |
| Shared Port | `shared-kernel/ports/[name].port.ts` | `event-bus.port.ts` |
| Shared In-Memory | `shared-kernel/testing/in-memory/in-memory-[name].repository.ts` | `in-memory-users.repository.ts` |
| Shared Stub | `shared-kernel/testing/stubs/stub-[name].ts` | `stub-event-bus.ts` |

## DTO Conventions

Seguem ADR-001. Cada submodule mantém seu próprio diretório `dto/` com barrel `index.ts`.
DTOs compartilhados entre 2+ submodules ficam em `shared-kernel/dto/`.

## Regras

### Obrigatório

- [x] Cada submodule segue ADR-001 (domain/application/infrastructure/testing)
- [x] Shared-kernel apenas para conceitos compartilhados entre 2+ submodules
- [x] Module aggregator (`[bc].module.ts`) importa e exporta todos os submodules
- [x] `index.ts` exporta API pública (modules, exceptions, ports)
- [x] Domain events compartilhados ficam no shared-kernel
- [x] Testing doubles compartilhados ficam em `shared-kernel/testing/`

### Proibido

- [ ] Submodule importando diretamente de `domain/` de outro submodule
- [ ] Business logic no shared-kernel (apenas tipos, interfaces, eventos)
- [ ] Shared-kernel com dependências de framework (NestJS) em `domain/` ou `ports/`
- [ ] Shared-kernel com `@prisma/client` imports
- [ ] **`application/services/` directories** — Mesmo que ADR-001: use `application/use-cases/`. Services-facade são proibidos

## Exemplo de Implementação

Ver `src/bounded-contexts/identity/` como exemplo canônico:

- **7 submodules**: account-lifecycle, authentication, authorization, email-verification, password-management, two-factor-auth, users
- **Shared-kernel** com: exceptions, domain events, value objects, ports, testing doubles
- **Testes** usando in-memory repositories e stubs do shared-kernel

## Consequências

### Positivas

- **Escalabilidade**: Submodules podem evoluir independentemente
- **Clareza**: Fronteiras claras entre áreas funcionais
- **Reutilização**: Shared-kernel evita duplicação de conceitos cross-cutting
- **Testing**: In-memory repos e stubs compartilhados simplificam testes

### Negativas

- **Complexidade inicial**: Mais diretórios e arquivos que ADR-001
- **Decisão de boundary**: Requer julgamento sobre o que vai no shared-kernel vs submodule
- **Overhead para BCs simples**: NÃO usar para BCs com responsabilidade única (usar ADR-001)

## Quando usar ADR-001 vs ADR-002

| Critério | ADR-001 | ADR-002 (este) |
|----------|---------|----------------|
| Responsabilidade | Única, coesa | Múltiplas áreas funcionais |
| Submodules | Não tem | 2+ com controllers/repos próprios |
| Exemplos | `translation`, `export`, `import` | `identity`, `analytics`, `resumes` |
| Shared kernel | Não necessário | Sim |

## Referências

- [ADR-001: Hexagonal Architecture (Flat)](./ADR-001-hexagonal-architecture.md)
- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Vernon - Implementing Domain-Driven Design (Bounded Contexts)](https://www.informit.com/store/implementing-domain-driven-design-9780321834577)
