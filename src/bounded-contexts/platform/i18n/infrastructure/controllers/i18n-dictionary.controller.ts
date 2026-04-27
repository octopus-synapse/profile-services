/**
 * I18n Dictionary Controller
 *
 * Exposes the `@packages/i18n` dictionaries over HTTP as **flat, single-locale**
 * JSON so the Orval-generated client can consume them without any hand-written
 * helpers. The backend negotiates the locale from `Accept-Language`; the
 * response carries the chosen locale in both `Content-Language` and the body.
 *
 * - `GET /v1/i18n/dictionary/errors`         → `{ locale, entries: { [CODE]: msg } }`
 * - `GET /v1/i18n/dictionary/enums`          → `{ locale, entries: { [Enum]: { [VAL]: label } } }`
 * - `GET /v1/i18n/dictionary/notifications`  → `{ locale, entries: { [TYPE]: { title, body, params[] } } }`
 *
 * Public, cached (1h + 24h SWR). Controller stays thin — the projection
 * from two-locale `as const` dictionaries to flat single-locale maps lives
 * in `DictionaryProjectorService`.
 */

import { Controller, Get, Header, Headers, Res as ResDecorator } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { negotiateLocale } from '../../application/locale-negotiator';
import { GetDictionaryUseCase } from '../../application/use-cases/get-dictionary/get-dictionary.use-case';
import {
  EnumsDictionaryDto,
  ErrorsDictionaryDto,
  NotificationsDictionaryDto,
  NotificationTemplateDto,
} from './dictionary.dto';

@SdkExport({ tag: 'i18n', description: 'i18n Dictionary API' })
@ApiTags('i18n')
@ApiExtraModels(NotificationTemplateDto)
@Controller('v1/i18n/dictionary')
export class I18nDictionaryController {
  constructor(private readonly getDictionary: GetDictionaryUseCase) {}

  @Public()
  @Get('errors')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @Header('Vary', 'Accept-Language')
  @ApiOperation({
    summary: 'Error-message dictionary in the negotiated locale',
    description:
      'Returns `{ locale, entries: { [CODE]: localized message } }`. ' +
      'Locale is chosen from `Accept-Language` (supports `en`, `pt-BR`).',
  })
  @ApiOkResponse({ type: ErrorsDictionaryDto })
  getErrors(
    @Headers('accept-language') acceptLanguage: string | undefined,
    @ResDecorator({ passthrough: true }) res: Response,
  ): ErrorsDictionaryDto {
    const { locale } = negotiateLocale(acceptLanguage);
    res.setHeader('Content-Language', locale);
    const payload = this.getDictionary.execute('errors', locale);
    return { locale, entries: payload.entries as Record<string, string> };
  }

  @Public()
  @Get('enums')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @Header('Vary', 'Accept-Language')
  @ApiOperation({
    summary: 'Prisma enum label dictionary in the negotiated locale',
    description:
      'Returns `{ locale, entries: { [EnumName]: { [VALUE]: label } } }`. ' +
      'Locale is chosen from `Accept-Language` (supports `en`, `pt-BR`).',
  })
  @ApiOkResponse({ type: EnumsDictionaryDto })
  getEnums(
    @Headers('accept-language') acceptLanguage: string | undefined,
    @ResDecorator({ passthrough: true }) res: Response,
  ): EnumsDictionaryDto {
    const { locale } = negotiateLocale(acceptLanguage);
    res.setHeader('Content-Language', locale);
    const payload = this.getDictionary.execute('enums', locale);
    return { locale, entries: payload.entries as Record<string, Record<string, string>> };
  }

  @Public()
  @Get('notifications')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @Header('Vary', 'Accept-Language')
  @ApiOperation({
    summary: 'Notification-template dictionary in the negotiated locale',
    description:
      'Returns `{ locale, entries: { [TYPE]: { title, body, params[] } } }`. ' +
      'Templates may contain `{ param }` placeholders — the client substitutes ' +
      'them at render time using the `params` list as the allowed key set.',
  })
  @ApiOkResponse({ type: NotificationsDictionaryDto })
  getNotifications(
    @Headers('accept-language') acceptLanguage: string | undefined,
    @ResDecorator({ passthrough: true }) res: Response,
  ): NotificationsDictionaryDto {
    const { locale } = negotiateLocale(acceptLanguage);
    res.setHeader('Content-Language', locale);
    const payload = this.getDictionary.execute('notifications', locale);
    return {
      locale,
      entries: payload.entries as NotificationsDictionaryDto['entries'],
    };
  }
}
