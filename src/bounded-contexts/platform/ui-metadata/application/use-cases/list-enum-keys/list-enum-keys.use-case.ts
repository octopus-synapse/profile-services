/**
 * Lists every UI enum key the catalog exposes. Trivial wrapper around
 * the pure helper — exists so the controller depends on a use case
 * (POJO) rather than reaching into `application/services` directly.
 */

import { listEnumKeys } from '../../services/enum-catalog';

export class ListEnumKeysUseCase {
  execute(): { keys: string[] } {
    return { keys: listEnumKeys() };
  }
}
