# DTO Refactoring Pattern

## The Problem

We had duplicate DTO definitions:
- Zod schemas in `shared-kernel/dtos/`
- NestJS classes in `bounded-contexts/{context}/dto/`
- Role enums hardcoded in multiple places

## The Solution

**Single Source of Truth using `nestjs-zod`:**

```typescript
// ============================================================================
// BEFORE (WRONG - Duplicate Definitions)
// ============================================================================

// File: shared-kernel/dtos/admin.dto.ts
export const AdminCreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: FullNameSchema.optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),  // ❌ Wrong format
});

// File: bounded-contexts/identity/users/dto/controller-request.dto.ts
export class AdminCreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  password!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  name?: string;

  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'], default: 'USER' })  // ❌ Wrong format
  role?: 'USER' | 'ADMIN';  // ❌ Wrong type
}

// ============================================================================
// AFTER (CORRECT - Single Source of Truth)
// ============================================================================

// File: bounded-contexts/identity/users/dto/admin-user.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EmailSchema, PasswordSchema, FullNameSchema, RoleIdSchema } from '@/shared-kernel/schemas/validation.schemas';

// 1. Define Zod schema
const AdminCreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: FullNameSchema.optional(),
  role: RoleIdSchema.default('role_user'),  // ✅ Correct format
});

// 2. Generate DTO class (validation + Swagger docs)
export class AdminCreateUserDto extends createZodDto(AdminCreateUserSchema) {}

// That's it! No duplication. Swagger docs auto-generated.
```

## Benefits

1. **Single Source of Truth**: Zod schema defines validation AND Swagger docs
2. **Type Safety**: TypeScript types derived from Zod
3. **Correct Role Format**: Uses `'role_user' | 'role_admin'` (matches database)
4. **DRY**: No duplicate definitions
5. **Frontend**: Orval generates perfect SDK from Swagger

## Pattern for All DTOs

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Define schema
const MySchema = z.object({
  field: z.string(),
});

// Generate DTO
export class MyDto extends createZodDto(MySchema) {}

// Use in controller
@Post()
async create(@Body() dto: MyDto) {
  // dto is validated by Zod
  // Swagger docs auto-generated
}
```

## Migration Plan

1. ✅ Create `shared-kernel/schemas/validation.schemas.ts`
2. 🔄 Refactor user management DTOs (proof-of-concept)
3. 🔄 Delete `shared-kernel/dtos/admin.dto.ts`
4. 🔄 Delete `shared-kernel/enums/user-role.enum.ts`
5. 🔄 Update all controllers to use new DTOs
6. 🔄 Document pattern in CLAUDE.md

## Files to Delete After Migration

- `src/shared-kernel/dtos/admin.dto.ts` (duplicate validation logic)
- `src/shared-kernel/enums/user-role.enum.ts` (use `RoleId` from `authorization/roles.ts`)
