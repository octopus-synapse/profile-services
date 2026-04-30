/**
 * Shared-kernel database utilities. The pagination helper now returns the
 * canonical `PaginatedResponse<T>` shape from `schemas/common/api.types`;
 * `PaginatedResult` is re-exported as a type alias for migration ease.
 */

export type { PaginatedResponse as PaginatedResult } from '@/shared-kernel/schemas/common/api.types';
export { paginate } from './paginate';
export { patchData } from './patch-data';
export { searchWhere } from './search-where';
