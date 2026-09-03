/**
 * Bundle token for the ui-metadata BC — the enum catalog the app reads
 * labels from. The server-driven menu and page payloads were removed
 * (ADR-005): the app builds its own navigation and screens.
 */

import type { GetEnumDescriptorUseCase } from '../use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import type { ListEnumKeysUseCase } from '../use-cases/list-enum-keys/list-enum-keys.use-case';

export abstract class UiMetadataUseCases {
  abstract readonly listEnumKeys: ListEnumKeysUseCase;
  abstract readonly getEnumDescriptor: GetEnumDescriptorUseCase;
}
