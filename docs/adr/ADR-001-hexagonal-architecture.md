# ADR-001: Hexagonal Architecture para Bounded Contexts

## Status

**Aceito** - 2026-04-01

## Contexto

O profile-services possui 16 bounded contexts com estruturas inconsistentes:

- **identity** (authentication, authorization, two-factor-auth, users)
- **resumes** (sections, themes, versioning)
- **export** (PDF/DOCX generation)
- **import** (resume import)
- **skills-catalog** (tech-skills, spoken-languages)
- **onboarding**
- **integration** (GitHub)
- **collaboration** (chat, sharing)
- **social** (profiles, follows)
- **ats-validation**
- **presentation**
- **translation**
- **analytics**
- **platform** (health, monitoring)
- **dsl** (domain-specific language)

### Problemas Identificados

1. **Estruturas inconsistentes**: Alguns usam `services/`, outros `modules/`, outros `adapters/`
2. **Onboarding difícil**: Novos desenvolvedores não sabem onde colocar código
3. **Business logic vazando**: Lógica de negócio em controllers e repositories
4. **Testes frágeis**: Dependentes de mocks de Prisma/Redis em vez de implementações reais
5. **Acoplamento**: Domain importando NestJS, Prisma e outras libs de infraestrutura

## Decisão

Adotar **Hexagonal Architecture (Ports & Adapters)** com três camadas:

```
┌─────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE                              │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     APPLICATION                          │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                    DOMAIN                        │   │   │
│   │   │                                                  │   │   │
│   │   │   Entities, Value Objects, Domain Events        │   │   │
│   │   │   Repository Ports (interfaces)                 │   │   │
│   │   │                                                  │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                          │   │
│   │   Use Cases, Application Services, Handlers             │   │
│   │   Inbound Ports (interfaces para outros BCs)            │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Controllers, Prisma Repositories, External Adapters           │
│   NestJS Module                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Princípio fundamental**: Dependencies point inward. Domain não conhece Application. Application não conhece Infrastructure.

## Estrutura Obrigatória

```
[bounded-context]/
│
├── domain/                              # CORE: Zero dependências externas
│   ├── entities/                        # Entities COM comportamento
│   │   └── [entity].entity.ts
│   ├── value-objects/                   # Conceitos imutáveis (OPCIONAL)
│   │   └── [vo].vo.ts
│   ├── events/                          # Domain events
│   │   └── [entity-action].event.ts
│   ├── exceptions/                      # Exceções de domínio
│   │   └── [name].exception.ts
│   └── ports/                           # Interfaces de saída (outbound)
│       └── [repository].repository.port.ts
│
├── application/                         # USE CASES: Orquestração
│   ├── use-cases/                       # Ações do usuário
│   │   └── [action-object]/
│   │       ├── [action-object].use-case.ts
│   │       ├── [action-object].dto.ts
│   │       └── [action-object].use-case.spec.ts
│   ├── handlers/                        # Event handlers (OPCIONAL)
│   │   └── on-[event-name].handler.ts
│   └── ports/                           # Interfaces para outros BCs (inbound)
│       └── [service].inbound-port.ts
│
├── infrastructure/                      # ADAPTERS: Mundo externo
│   ├── adapters/
│   │   ├── persistence/                 # Prisma repositories
│   │   │   └── [repository].repository.ts
│   │   └── external-services/           # APIs externas
│   │       └── [service].adapter.ts
│   └── controllers/                     # HTTP endpoints
│       └── [action-object].controller.ts
│
├── testing/                             # IN-MEMORY implementations
│   ├── in-memory-[repository].repository.ts
│   └── fixtures/
│       └── [entity].fixtures.ts
│
├── [context].module.ts                  # NestJS wiring
└── index.ts                             # Public exports
```

## Naming Conventions

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Entity | `[name].entity.ts` | `two-factor-auth.entity.ts` |
| Value Object | `[name].vo.ts` | `totp-secret.vo.ts` |
| Event | `[entity-action].event.ts` | `two-factor-enabled.event.ts` |
| Exception | `[name].exception.ts` | `invalid-totp-token.exception.ts` |
| Use Case | `[verb-object].use-case.ts` | `setup-two-factor.use-case.ts` |
| DTO | `[verb-object].dto.ts` | `setup-two-factor.dto.ts` |
| Repository Port | `[name].repository.port.ts` | `two-factor.repository.port.ts` |
| Repository Impl | `[name].repository.ts` | `two-factor.repository.ts` |
| In-Memory Repo | `in-memory-[name].repository.ts` | `in-memory-two-factor.repository.ts` |
| Controller | `[verb-object].controller.ts` | `setup-two-factor.controller.ts` |
| Handler | `on-[event-name].handler.ts` | `on-two-factor-enabled.handler.ts` |

## Regras

### Obrigatório

- [x] **Entities com comportamento** (métodos que encapsulam regras de negócio)
- [x] **Domain events** para comunicar mudanças de estado
- [x] **Repository ports** definidas no domain (interfaces)
- [x] **In-memory implementations** para todos os repositories
- [x] **Arquivos < 300 linhas** (conforme CLAUDE.md)
- [x] **Use cases isolados** em suas próprias pastas
- [x] **Testes de use case** usando in-memory repositories

### Proibido

- [ ] **Business logic em controllers** (controllers apenas delegam)
- [ ] **`services/` ou `models/` na raiz** (usar estrutura hexagonal)
- [ ] **Repositories retornando Prisma models** (retornar domain entities)
- [ ] **Mocks de Prisma em testes** (usar in-memory repositories)
- [ ] **Imports de NestJS no domain** (domain é framework-agnostic)
- [ ] **Imports de Prisma no domain** (apenas nos adapters)

### Opcional

- [ ] **Value Objects** para conceitos imutáveis com validação
- [ ] **Event Handlers** para reações a domain events
- [ ] **Aggregates** para grupos de entities com invariantes compartilhadas

## Exemplo de Implementação

### Entity com Comportamento

```typescript
// domain/entities/two-factor-auth.entity.ts
export class TwoFactorAuth {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly userId: string,
    private secret: TotpSecret,
    private backupCodes: BackupCodes,
    private enabled: boolean,
    private lastUsedAt: Date | null,
  ) {}

  static create(userId: string, secret: TotpSecret, backupCodes: BackupCodes): TwoFactorAuth {
    return new TwoFactorAuth(userId, secret, backupCodes, false, null);
  }

  enable(): void {
    if (this.enabled) {
      throw new TwoFactorAlreadyEnabledException(this.userId);
    }
    this.enabled = true;
    this.addEvent(new TwoFactorEnabledEvent(this.userId));
  }

  disable(): void {
    if (!this.enabled) {
      throw new TwoFactorNotEnabledException(this.userId);
    }
    this.enabled = false;
    this.addEvent(new TwoFactorDisabledEvent(this.userId));
  }

  validateToken(token: string): boolean {
    const isValid = this.secret.validate(token);
    if (isValid) {
      this.lastUsedAt = new Date();
    }
    return isValid;
  }

  useBackupCode(code: string): void {
    if (!this.backupCodes.use(code)) {
      throw new InvalidBackupCodeException();
    }
    this.addEvent(new BackupCodeUsedEvent(this.userId, this.backupCodes.remainingCount));
  }

  private addEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  pullEvents(): DomainEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }
}
```

### Repository Port

```typescript
// domain/ports/two-factor.repository.port.ts
export interface TwoFactorRepositoryPort {
  findByUserId(userId: string): Promise<TwoFactorAuth | null>;
  save(twoFactor: TwoFactorAuth): Promise<void>;
  delete(userId: string): Promise<void>;
}

export const TWO_FACTOR_REPOSITORY = Symbol('TWO_FACTOR_REPOSITORY');
```

### In-Memory Repository

```typescript
// testing/in-memory-two-factor.repository.ts
export class InMemoryTwoFactorRepository implements TwoFactorRepositoryPort {
  private records = new Map<string, TwoFactorAuth>();

  async findByUserId(userId: string): Promise<TwoFactorAuth | null> {
    return this.records.get(userId) ?? null;
  }

  async save(twoFactor: TwoFactorAuth): Promise<void> {
    this.records.set(twoFactor.userId, twoFactor);
  }

  async delete(userId: string): Promise<void> {
    this.records.delete(userId);
  }

  // Test helpers
  clear(): void {
    this.records.clear();
  }

  getAll(): TwoFactorAuth[] {
    return Array.from(this.records.values());
  }
}
```

### Use Case

```typescript
// application/use-cases/enable-two-factor/enable-two-factor.use-case.ts
@Injectable()
export class EnableTwoFactorUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY)
    private readonly repository: TwoFactorRepositoryPort,
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(dto: EnableTwoFactorDto): Promise<void> {
    const twoFactor = await this.repository.findByUserId(dto.userId);
    if (!twoFactor) {
      throw new TwoFactorNotFoundException(dto.userId);
    }

    twoFactor.enable();

    await this.repository.save(twoFactor);

    for (const event of twoFactor.pullEvents()) {
      await this.eventBus.publish(event);
    }
  }
}
```

### Teste com In-Memory Repository

```typescript
// application/use-cases/enable-two-factor/enable-two-factor.use-case.spec.ts
describe('EnableTwoFactorUseCase', () => {
  let useCase: EnableTwoFactorUseCase;
  let repository: InMemoryTwoFactorRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    eventBus = new InMemoryEventBus();
    useCase = new EnableTwoFactorUseCase(repository, eventBus);
  });

  it('should enable two-factor authentication', async () => {
    // Arrange
    const twoFactor = TwoFactorAuth.create(
      'user-1',
      TotpSecret.generate(),
      BackupCodes.generate(),
    );
    await repository.save(twoFactor);

    // Act
    await useCase.execute({ userId: 'user-1' });

    // Assert
    const saved = await repository.findByUserId('user-1');
    expect(saved?.isEnabled).toBe(true);
    expect(eventBus.getPublishedEvents()).toContainEqual(
      expect.objectContaining({ type: 'TwoFactorEnabled' })
    );
  });

  it('should throw when already enabled', async () => {
    // Arrange
    const twoFactor = TwoFactorAuth.create(
      'user-1',
      TotpSecret.generate(),
      BackupCodes.generate(),
    );
    twoFactor.enable();
    await repository.save(twoFactor);

    // Act & Assert
    await expect(useCase.execute({ userId: 'user-1' }))
      .rejects.toThrow(TwoFactorAlreadyEnabledException);
  });
});
```

## Consequências

### Positivas

- **Separação clara de responsabilidades**: Cada camada tem uma função bem definida
- **Testes sem mocks**: In-memory repositories substituem Prisma
- **Independência de framework**: Domain pode ser testado sem NestJS
- **Onboarding claro**: Estrutura previsível em todos os bounded contexts
- **Refatoração segura**: Testes não quebram com mudanças de infraestrutura

### Negativas

- **Mais arquivos**: Porém menores e mais focados (<300 linhas)
- **Curva de aprendizado inicial**: Desenvolvedores precisam entender hexagonal
- **Esforço de migração**: ~2-4h por bounded context

## Migração

### Ordem Recomendada

1. `identity/two-factor-auth` (exemplo canônico - já parcialmente alinhado)
2. `identity/authentication`
3. `identity/authorization`
4. `resumes`
5. Demais bounded contexts

### Checklist por Bounded Context

- [ ] Criar `domain/entities/` com entities comportamentais
- [ ] Criar `domain/ports/` com repository interfaces
- [ ] Mover exceptions para `domain/exceptions/`
- [ ] Criar `application/use-cases/` reorganizando de `modules/` ou `services/`
- [ ] Criar `infrastructure/adapters/persistence/` com Prisma repos
- [ ] Criar `infrastructure/controllers/`
- [ ] Criar `testing/` com in-memory repositories
- [ ] Atualizar testes para usar in-memory repos
- [ ] Atualizar module com DI correto
- [ ] Verificar: `bun run typecheck && bun test [path]`

## Referências

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
