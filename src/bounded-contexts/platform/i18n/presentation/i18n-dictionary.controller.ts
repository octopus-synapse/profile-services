/**
 * I18n Dictionary Controller
 *
 * Exposes the `@packages/i18n` dictionaries over HTTP so the frontend can
 * render enum labels and notification templates without duplicating strings.
 *
 * - `GET /v1/i18n/dictionary/errors` — full error catalog keyed by code.
 * - `GET /v1/i18n/dictionary/enums` — all Prisma enum labels, grouped by enum name.
 * - `GET /v1/i18n/dictionary/notifications` — notification templates with
 *   their declared `params` list.
 *
 * All three endpoints are:
 *   - Public (no auth) — the dictionaries are not user-scoped.
 *   - Cached via `Cache-Control` headers for 1h since the data is static
 *     at process-start (dictionaries are compiled-in `as const` objects).
 *   - Shaped to return **both** locales in a single response. The UI picks
 *     the one it needs client-side; avoids a round-trip on locale change.
 */

import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ENUM_DICTIONARY,
  ERROR_DICTIONARY,
  LOCALES,
  NOTIFICATION_DICTIONARY,
} from '@packages/i18n';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';

@SdkExport({ tag: 'i18n', description: 'i18n Dictionary API' })
@ApiTags('i18n')
@Controller('v1/i18n/dictionary')
export class I18nDictionaryController {
  @Public()
  @Get('errors')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @ApiOperation({
    summary: 'Error-message dictionary',
    description:
      'Every stable error code (`DomainException.code`) mapped to `{ en, pt-BR }` messages.',
  })
  getErrors() {
    return {
      success: true,
      data: { locales: LOCALES, entries: ERROR_DICTIONARY },
    };
  }

  @Public()
  @Get('enums')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @ApiOperation({
    summary: 'Enum-label dictionary',
    description: 'Every Prisma enum value mapped to `{ en, pt-BR }` labels, grouped by enum name.',
  })
  getEnums() {
    return {
      success: true,
      data: { locales: LOCALES, entries: ENUM_DICTIONARY },
    };
  }

  @Public()
  @Get('notifications')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @ApiOperation({
    summary: 'Notification-template dictionary',
    description:
      'Every `NotificationType` mapped to `{ title, body, params }` templates in both locales.',
  })
  getNotifications() {
    return {
      success: true,
      data: { locales: LOCALES, entries: NOTIFICATION_DICTIONARY },
    };
  }
}
