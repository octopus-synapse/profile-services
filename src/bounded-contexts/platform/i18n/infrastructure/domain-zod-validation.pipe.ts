/**
 * DomainZodValidationPipe
 *
 * Drop-in replacement for the legacy `ZodValidationPipe` that throws a
 * DomainError with structured `fields` instead of a BadRequestException
 * carrying a string. Controllers migrate one at a time.
 *
 * Usage:
 *   @Post('login')
 *   login(@Body(createDomainZodPipe(LoginSchema)) dto: LoginDto) { … }
 */

import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { zodIssueToCode } from '../application/zod-issue-to-code';
import { DomainError } from '../domain/domain-error';

@Injectable()
export class DomainZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const fields = result.error.issues.map((issue) => ({
      path: issue.path,
      code: zodIssueToCode(issue).code,
      params: zodIssueToCode(issue).params,
    }));

    throw new DomainError({
      code: 'VALIDATION_FAILED',
      status: 422,
      humanFallback: 'One or more fields did not pass validation.',
      fields,
    });
  }
}

export const createDomainZodPipe = <T>(schema: ZodSchema<T>) => new DomainZodValidationPipe(schema);
