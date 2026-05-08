/**
 * Returns the full descriptor for a single UI enum key, or `null`
 * when the key isn't in the catalog. The controller maps the null
 * case to a `404`.
 */

import { type EnumDescriptor, getEnum } from '../../services/enum-catalog';

export class GetEnumDescriptorUseCase {
  execute(key: string): EnumDescriptor | null {
    return getEnum(key);
  }
}
