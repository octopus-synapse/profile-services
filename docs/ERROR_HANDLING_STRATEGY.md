# Error Handling Strategy

**Version:** 1.0.0  
**Date:** 2026-01-06  
**Status:** Active

---

## Principles

1. **Let Exceptions Bubble** - Services throw, controllers/filters catch
2. **Single Responsibility** - Logging belongs in filters, not services
3. **Predictable Contracts** - Same error type = same HTTP status
4. **No Silent Failures** - Never swallow exceptions without explicit justification

---

## Rules

### ✅ DO: Throw domain exceptions

```typescript
async signup(dto: SignupDto) {
  await this.ensureEmailNotExists(dto.email); // Throws ConflictException
  const user = await this.createUser(dto);
  return this.buildAuthResponse(user);
  // No try-catch needed - let it bubble
}
```

### ✅ DO: Use try-catch for external I/O recovery

```typescript
async uploadToS3(file: Buffer): Promise<string> {
  try {
    return await this.s3.upload(file);
  } catch (error) {
    // Legitimate: recover from transient failure
    this.logger.warn('S3 upload failed, retrying...', { error });
    return await this.s3.upload(file); // Retry logic
  }
}
```

### ❌ DON'T: Re-throw without adding value

```typescript
// VIOLATION: This adds no value
async login(dto: LoginDto) {
  try {
    const user = await this.validateUser(dto);
    return this.buildAuthResponse(user);
  } catch (error) {
    this.logger.error('Login error', error); // ❌ Duplicate logging
    throw error; // ❌ Re-throw without value
  }
}

// CORRECT: Remove try-catch entirely
async login(dto: LoginDto) {
  const user = await this.validateUser(dto);
  return this.buildAuthResponse(user);
  // Exception filter handles logging globally
}
```

### ❌ DON'T: Swallow exceptions

```typescript
// VIOLATION: Silent failure
async parseJSON(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return null; // ❌ Caller can't distinguish error from valid null
  }
}

// CORRECT: Let it throw or return Result<T, E>
async parseJSON(data: string): Promise<object> {
  return JSON.parse(data); // Throws SyntaxError - caller handles
}
```

---

## Classification

### Legitimate Try-Catch

Use **ONLY** when:

- **External I/O recovery** (retry, failover, circuit breaker)
- **Resource cleanup** (finally blocks for connections/files)
- **Parsing with fallback** (multiple format attempts)
- **Transactional rollback** (Prisma transactions)

### Violation Try-Catch

Remove when:

- Re-throwing known exceptions (ConflictException, UnauthorizedException)
- Logging then re-throwing (use global filter)
- Catching to return null (use explicit Result type)
- Wrapping sync operations with no I/O

---

## Implementation

### Global Exception Filter

`src/common/filters/http-exception.filter.ts`

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Log ALL exceptions here (not in services)
    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : undefined,
      'HttpExceptionFilter',
      {
        path: request.url,
        method: request.method,
        userId: request.user?.id,
      },
    );

    // Transform to HTTP response
    const status = this.getHttpStatus(exception);
    const message = this.getMessage(exception);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Register in main.ts

```typescript
app.useGlobalFilters(new HttpExceptionFilter(logger));
```

---

## Migration Plan

### Phase 1: Remove Re-Throw Violations

**Target:** `auth-core.service.ts`, `password-reset.service.ts`

- Remove try-catch that only re-throws
- Let exceptions bubble to controller
- Global filter handles logging

### Phase 2: Audit I/O Try-Catch

**Target:** `cache-core.service.ts`, `s3-upload.service.ts`, `email-sender.service.ts`

- Verify recovery logic exists
- Document retry/failover strategy
- Add tests for failure scenarios

### Phase 3: Document Legitimate Cases

**Target:** All remaining try-catch blocks

- Add inline comment justifying try-catch
- Link to this strategy doc
- Example: `// External I/O recovery - see ERROR_HANDLING_STRATEGY.md`

---

## Testing

### Valid Exception Bubbling

```typescript
it('should throw ConflictException when email exists', async () => {
  await expect(service.signup(dto)).rejects.toThrow(ConflictException);
  // No assertion on logging - that's filter's job
});
```

### I/O Recovery

```typescript
it('should retry S3 upload on transient failure', async () => {
  mockS3.upload
    .mockRejectedValueOnce(new Error('Timeout'))
    .mockResolvedValueOnce('success');

  const result = await service.uploadFile(buffer);
  expect(result).toBe('success');
  expect(mockS3.upload).toHaveBeenCalledTimes(2);
});
```

---

## Metrics

Track via global filter:

- Exception count by type
- HTTP status distribution
- Error rate by endpoint
- Mean time to exception (latency)

---

## References

- NestJS Exception Filters: https://docs.nestjs.com/exception-filters
- Clean Architecture Error Handling: Uncle Bob - "Screaming Architecture"
- Result Type Pattern: https://www.youtube.com/watch?v=YR5WdGrpoug
