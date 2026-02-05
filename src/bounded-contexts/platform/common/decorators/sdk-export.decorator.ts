/**
 * @SdkExport Decorator
 *
 * Marks a controller for automatic inclusion in SDK generation.
 *
 * Robert C. Martin: "The decorator follows Open/Closed Principle -
 * the generation script is closed for modification but open for extension
 * through this decorator."
 *
 * Usage:
 *   @SdkExport({ tag: 'resumes', description: 'Resume CRUD operations' })
 *   @Controller('v1/resumes')
 *   export class ResumesController {}
 *
 * The script will scan all controllers with this decorator and
 * extract their metadata automatically.
 */

import { SetMetadata } from '@nestjs/common';

export const SDK_EXPORT_KEY = 'SDK_EXPORT_METADATA';

export interface SdkExportOptions {
  /**
   * Tag for grouping in Swagger UI and SDK services
   * @example 'resumes', 'auth', 'users'
   */
  tag: string;

  /**
   * Description for the tag in OpenAPI spec
   */
  description?: string;

  /**
   * API version prefix (defaults to 'v1')
   * @example 'v1', 'v2'
   */
  version?: string;

  /**
   * Whether to include auth security requirement
   * @default true
   */
  requiresAuth?: boolean;
}

/**
 * Marks controller for SDK export.
 *
 * The swagger generation script will:
 * 1. Find all files with @SdkExport
 * 2. Extract route and method info from NestJS decorators
 * 3. Extract DTO types from method signatures
 * 4. Generate OpenAPI spec automatically
 */
export const SdkExport = (options: SdkExportOptions): ClassDecorator => {
  return SetMetadata(SDK_EXPORT_KEY, {
    ...options,
    requiresAuth: options.requiresAuth ?? true,
    version: options.version ?? 'v1',
  });
};
