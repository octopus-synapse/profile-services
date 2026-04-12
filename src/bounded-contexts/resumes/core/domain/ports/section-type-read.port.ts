/**
 * Section Type Read Port
 *
 * Domain-level abstraction for reading section type definitions.
 * The domain layer depends on this port; infrastructure provides the implementation.
 */

import type { SectionTypeWithDefinition } from '@/shared-kernel/schemas/sections';

export abstract class SectionTypeReadPort {
  abstract getByKey(key: string): SectionTypeWithDefinition | undefined;
  abstract getMandatoryForAts(): SectionTypeWithDefinition[];
}
