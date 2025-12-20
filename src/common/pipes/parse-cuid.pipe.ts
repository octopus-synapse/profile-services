import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a string is a valid CUID (Collision-resistant Unique Identifier).
 * CUIDs start with 'c' and are 25 characters long (Prisma default format).
 */
@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  private readonly cuidRegex = /^c[a-z0-9]{24}$/;

  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('ID is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('ID must be a string');
    }

    // Check if it matches CUID format
    if (!this.cuidRegex.test(value)) {
      throw new BadRequestException(`Invalid ID format: ${value}`);
    }

    return value;
  }
}
