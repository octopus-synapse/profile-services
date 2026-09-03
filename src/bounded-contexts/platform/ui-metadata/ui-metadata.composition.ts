/**
 * Composition for the ui-metadata BC: the enum catalog, which the app reads
 * to label enum values in the request locale (ADR-003 §15).
 */

import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import { GetEnumDescriptorUseCase } from './application/use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import { ListEnumKeysUseCase } from './application/use-cases/list-enum-keys/list-enum-keys.use-case';
import { uiMetadataRoutes } from './ui-metadata.routes';

export { UiMetadataUseCases };

export function buildUiMetadataUseCases(): UiMetadataUseCases {
  return {
    listEnumKeys: new ListEnumKeysUseCase(),
    getEnumDescriptor: new GetEnumDescriptorUseCase(),
  };
}

export function buildUiMetadataComposition(): BoundedContextComposition<UiMetadataUseCases> {
  return {
    useCases: buildUiMetadataUseCases(),
    routes: uiMetadataRoutes,
  };
}
