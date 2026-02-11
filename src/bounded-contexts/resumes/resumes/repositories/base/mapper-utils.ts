/**
 * Mapper utilities for DTO to Prisma data transformations
 * Eliminates repetitive mapping code in repositories
 */

/**
 * Field transformation types supported by buildUpdateData
 */
export type FieldType =
  | 'string' // Required string: truthy check (dto.field && { field })
  | 'optional' // Optional field: undefined check (dto.field !== undefined)
  | 'date' // Date field: converts string to Date (dto.field && { field: new Date(dto.field) })
  | 'nullableDate' // Nullable date: converts string to Date or null
  | 'array' // Array field: truthy check (dto.field && { field })
  | 'number' // Number field: undefined check (can be 0)
  | 'boolean'; // Boolean field: undefined check (can be false)

/**
 * Configuration map for field transformations
 * Key: field name in DTO
 * Value: type of transformation to apply
 */
export type FieldConfig = Record<string, FieldType>;

/**
 * Generic helper to build Prisma update data from DTO
 * Eliminates repetitive spread operators and conditional logic
 *
 * @example
 * ```typescript
 * protected mapUpdate(dto: UpdateProject) {
 *   return buildUpdateData(dto, {
 *     name: 'string',
 *     description: 'optional',
 *     startDate: 'date',
 *     endDate: 'nullableDate',
 *     technologies: 'array',
 *     order: 'number',
 *     isCurrent: 'boolean',
 *   });
 * }
 * ```
 *
 * @param dto - The update DTO with partial fields
 * @param config - Field configuration mapping
 * @returns Prisma-compatible update data object
 */
export function buildUpdateData<T extends object>(
  dto: T,
  config: FieldConfig,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const dtoRecord = dto as Record<string, unknown>;

  for (const [field, type] of Object.entries(config)) {
    const value = dtoRecord[field];

    switch (type) {
      case 'string':
      case 'array':
        // Truthy check: only include if value exists (non-empty string, non-empty array)
        if (value) {
          result[field] = value;
        }
        break;

      case 'optional':
        // Undefined check: include if explicitly set (can be null, empty string, etc.)
        if (value !== undefined) {
          result[field] = value;
        }
        break;

      case 'date':
        // Date conversion: convert string to Date object
        if (value) {
          result[field] = new Date(value as string | number | Date);
        }
        break;

      case 'nullableDate':
        // Nullable date: convert to Date or null
        if (value !== undefined) {
          result[field] = value ? new Date(value as string | number | Date) : null;
        }
        break;

      case 'number':
      case 'boolean':
        // Explicit undefined check: needed because 0 and false are falsy
        if (value !== undefined) {
          result[field] = value;
        }
        break;
    }
  }

  return result;
}

/**
 * Generic helper to build Prisma create data from DTO
 * Handles default values and required transformations
 *
 * @example
 * ```typescript
 * protected mapCreate(resumeId: string, dto: CreateProject, order: number) {
 *   return buildCreateData(
 *     { resumeId, order: dto.order ?? order },
 *     dto,
 *     {
 *       name: 'string',
 *       description: { type: 'optional' },
 *       startDate: { type: 'date', optional: true },
 *       endDate: { type: 'nullableDate' },
 *       technologies: { type: 'array', default: [] },
 *       isCurrent: { type: 'boolean', default: false },
 *     }
 *   );
 * }
 * ```
 */
export type CreateFieldType =
  | 'string'
  | 'optional'
  | 'date'
  | 'nullableDate'
  | 'array'
  | 'number'
  | 'boolean';

export type CreateFieldConfig =
  | CreateFieldType
  | {
      type: CreateFieldType;
      optional?: boolean;
      default?: unknown;
    };

export type CreateFieldsConfig = Record<string, CreateFieldConfig>;

/**
 * Build Prisma create data from DTO with defaults and transformations
 *
 * @param baseData - Base fields like resumeId, order
 * @param dto - The create DTO
 * @param config - Field configuration with types and defaults
 * @returns Prisma-compatible create data object
 */
export function buildCreateData<T extends object>(
  baseData: Record<string, unknown>,
  dto: T,
  config: CreateFieldsConfig,
): Record<string, unknown> {
  const result = { ...baseData };
  const dtoRecord = dto as Record<string, unknown>;

  for (const [field, fieldConfig] of Object.entries(config)) {
    const value = dtoRecord[field];
    const cfg = typeof fieldConfig === 'string' ? { type: fieldConfig } : fieldConfig;
    const { type, optional, default: defaultValue } = cfg;

    // Handle missing required fields
    if (value === undefined) {
      if (defaultValue !== undefined) {
        result[field] = defaultValue;
      } else if (optional) {
        // Skip optional fields
        continue;
      }
      // Required field without default will be included as undefined (Prisma will error)
      continue;
    }

    // Apply transformation based on type
    switch (type) {
      case 'string':
      case 'array':
      case 'number':
      case 'boolean':
        result[field] = value;
        break;

      case 'optional':
        result[field] = value;
        break;

      case 'date':
        result[field] = new Date(value as string | number | Date);
        break;

      case 'nullableDate':
        result[field] = value ? new Date(value as string | number | Date) : null;
        break;
    }
  }

  return result;
}
