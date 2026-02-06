import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/config';

/**
 * Validates that a string is a valid CUID (Collision-resistant Unique Identifier).
 * CUIDs start with 'c' and are 25 characters long (Prisma default format).
 *
 * BUG-036 FIX: Now throws BadRequestException for invalid CUID format
 * instead of passing through invalid IDs to the service layer.
 */
@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  private readonly cuidRegex = /^c[a-z0-9]{24}$/;

  transform(value: string): string {
    if (!value) {
      throw new BadRequestException(ERROR_MESSAGES.ID_REQUIRED);
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(ERROR_MESSAGES.ID_MUST_BE_STRING);
    }

    // BUG-036 FIX: Reject invalid CUID format immediately
    // This prevents invalid IDs from reaching the database layer
    if (!this.cuidRegex.test(value)) {
      throw new BadRequestException(
        `Invalid ID - expected CUID (example: 'clx1abc2def3ghi4jkl5mno6p')`,
      );
    }

    return value;
  }
}
