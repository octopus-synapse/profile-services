/**
 * DTOs for the /v1/i18n/dictionary/* endpoints.
 *
 * Each endpoint returns a flat map of strings in the **single locale** the
 * backend negotiated from the request's `Accept-Language` header. The chosen
 * locale is surfaced in the `locale` field + `Content-Language` response
 * header. The frontend never has to think about locale switching — it just
 * reads the strings and renders.
 *
 * Shapes are intentionally open maps (`additionalProperties: { type: string }`)
 * so new codes / enum values / notification types added on the backend flow
 * straight through to the typed Orval client without a schema bump.
 */

import { ApiProperty } from '@nestjs/swagger';

export class DictionaryLocaleDto {
  @ApiProperty({
    description: 'Locale the strings are in (negotiated from Accept-Language).',
    enum: ['en', 'pt-BR'],
    example: 'pt-BR',
  })
  locale!: 'en' | 'pt-BR';
}

// --- Errors -----------------------------------------------------------------

export class ErrorsDictionaryDto extends DictionaryLocaleDto {
  @ApiProperty({
    description: 'Map from stable error code to the localized message.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      ENTITY_NOT_FOUND: 'Usuário não encontrado',
      CONFLICT: 'Conflito',
    },
  })
  entries!: Record<string, string>;
}

// --- Enums ------------------------------------------------------------------

export class EnumEntryDto {
  @ApiProperty({
    description: 'Map from enum value to the localized label.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { REMOTE: 'Remoto', HYBRID: 'Híbrido', ONSITE: 'Presencial' },
  })
  values!: Record<string, string>;
}

export class EnumsDictionaryDto extends DictionaryLocaleDto {
  @ApiProperty({
    description:
      'Map from Prisma enum name to its `{ value → label }` map in the negotiated locale.',
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    example: {
      RemotePolicy: { REMOTE: 'Remoto', HYBRID: 'Híbrido', ONSITE: 'Presencial' },
      JobType: { FULL_TIME: 'Tempo integral', PART_TIME: 'Meio período' },
    },
  })
  entries!: Record<string, Record<string, string>>;
}

// --- Notifications ----------------------------------------------------------

export class NotificationTemplateDto {
  @ApiProperty({
    description: 'Short title for UI surfaces like the bell dropdown.',
    example: '{actorName} curtiu seu post',
  })
  title!: string;

  @ApiProperty({
    description: 'Longer body for the notifications page / email.',
    example: '{actorName} curtiu seu post "{postExcerpt}"',
  })
  body!: string;

  @ApiProperty({
    description: 'Placeholder names that must be supplied when rendering.',
    type: [String],
    example: ['actorName', 'postExcerpt'],
  })
  params!: string[];
}

export class NotificationsDictionaryDto extends DictionaryLocaleDto {
  @ApiProperty({
    description: 'Map from NotificationType value to its template in the negotiated locale.',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/NotificationTemplateDto' },
  })
  entries!: Record<string, NotificationTemplateDto>;
}
