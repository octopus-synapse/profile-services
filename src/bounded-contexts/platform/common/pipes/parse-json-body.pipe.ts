import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates that the request body was successfully parsed as JSON
 * Throws BadRequestException if body is undefined or not an object
 * (e.g., when Content-Type is wrong and body parsing fails)
 */
@Injectable()
export class ParseJsonBodyPipe implements PipeTransform {
  transform(value: unknown) {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Invalid request body - must be valid JSON');
    }
    return value;
  }
}
