/**
 * Public API of the `@packages/i18n` dictionary.
 *
 * Consumed today by `I18nService` (backend exception filter) and the
 * `/v1/i18n/dictionary/*` endpoints. The frontend can import the same TS
 * module directly once the monorepo is wired.
 */

export type { EnumDictionary, EnumName } from './enums';
export { ENUM_DICTIONARY } from './enums';
export type { ErrorCode } from './errors';
export { ERROR_DICTIONARY } from './errors';

export type {
  NotificationCode,
  NotificationDictionary,
  NotificationTemplate,
} from './notifications';
export { NOTIFICATION_DICTIONARY, renderNotification } from './notifications';
export type { StepTranslation, WelcomeFeature } from './static-steps';
export { renderStaticStep, STATIC_STEP_DICTIONARY } from './static-steps';
export type {
  SuccessMessageCode,
  SuccessMessageDictionary,
  SuccessMessageTemplate,
} from './success-messages';
export { renderSuccessMessage, SUCCESS_MESSAGE_DICTIONARY } from './success-messages';

export type { Locale, LocalizedDictionary, LocalizedMessages, LocalizedRecord } from './types';
export { DEFAULT_LOCALE, LOCALES } from './types';
