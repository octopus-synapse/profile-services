/**
 * Section Ordering Utilities
 * Handles reordering of sections and items
 */

interface Orderable {
  order: number;
}

interface ItemOverride {
  itemId: string;
  visible: boolean;
  order: number;
}

/**
 * Sort sections by order property
 */
export function sortByOrder<T extends Orderable>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * Normalize orders to be sequential (0, 1, 2, ...)
 */
export function normalizeOrders<T extends Orderable>(items: T[]): T[] {
  const sorted = sortByOrder(items);
  return sorted.map((item, index) => ({ ...item, order: index }));
}

/**
 * Move an item to a new position
 */
export function moveItem<T extends Orderable>(items: T[], fromIndex: number, toIndex: number): T[] {
  const sorted = sortByOrder(items);
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);
  return normalizeOrders(sorted);
}

/**
 * Apply item overrides to database items
 */
export function applyItemOverrides<T extends { id: string }>(
  items: T[],
  overrides: ItemOverride[] | undefined,
): (T & { visible: boolean; order: number })[] {
  if (!overrides?.length) {
    return items.map((item, index) => ({
      ...item,
      visible: true,
      order: index,
    }));
  }

  const overrideMap = new Map(overrides.map((o) => [o.itemId, o]));

  return items.map((item, index) => {
    const override = overrideMap.get(item.id);
    return {
      ...item,
      visible: override?.visible ?? true,
      order: override?.order ?? index,
    };
  });
}
