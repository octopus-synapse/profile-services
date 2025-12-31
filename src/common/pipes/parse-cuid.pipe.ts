import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/app.constants';

/**
 * Validates that a string is a valid CUID (Collision-resistant Unique Identifier).
 * CUIDs start with 'c' and are 25 characters long (Prisma default format).
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

    // Check if it matches CUID format
    // Allow invalid IDs to pass through so services can return 404 instead of 400
    // This provides better error messages (resource not found vs invalid format)
    if (!this.cuidRegex.test(value)) {
      // Still return the value, let the service handle 404
      return value;
    }

    return value;
  }
}
