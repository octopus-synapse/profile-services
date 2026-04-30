/**
 * Bundle token for the ui-metadata BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives
 * in `ui-metadata.composition.ts` — Nest-free.
 */

import type { GetEnumDescriptorUseCase } from '../use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import type { GetUserMenuUseCase } from '../use-cases/get-user-menu/get-user-menu.use-case';
import type { ListEnumKeysUseCase } from '../use-cases/list-enum-keys/list-enum-keys.use-case';
import type { LoadMeDashboardUseCase } from '../use-cases/load-me-dashboard/load-me-dashboard.use-case';

export abstract class UiMetadataUseCases {
  abstract readonly listEnumKeys: ListEnumKeysUseCase;
  abstract readonly getEnumDescriptor: GetEnumDescriptorUseCase;
  abstract readonly getUserMenu: GetUserMenuUseCase;
  abstract readonly loadMeDashboard: LoadMeDashboardUseCase;
}
