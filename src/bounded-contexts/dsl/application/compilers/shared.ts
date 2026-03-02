/**
 * Shared DSL Compiler Utilities
 *
 * Basic types and utilities for DSL compilation.
 * Section-specific types are now in @/shared-kernel/types/section-projection.adapter.ts
 */

/**
 * Item override configuration for DSL rendering.
 */
export type ItemOverride = {
  itemId: string;
  visible?: boolean;
  order?: number;
};

/**
 * Apply overrides to a list of items.
 */
export function applyOverrides<T extends { id: string; order: number }>(
  items: T[],
  overrides: ItemOverride[],
): T[] {
  return items
    .filter((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      return override?.visible !== false;
    })
    .map((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      if (override?.order !== undefined) {
        return { ...item, order: override.order };
      }
      return item;
    })
    .sort((a, b) => a.order - b.order);
}
