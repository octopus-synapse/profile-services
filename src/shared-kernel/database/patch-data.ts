/**
 * Build a patch/update payload from a DTO, filtering out undefined values.
 *
 * Replaces the copy-pasted pattern found in 8+ services:
 *   const data: Record<string, unknown> = {};
 *   if (dto.field1 !== undefined) data.field1 = dto.field1;
 *   if (dto.field2 !== undefined) data.field2 = dto.field2;
 *   // ... repeat 10-20 times
 *
 * Usage:
 *   const data = patchData(dto, ['nameEn', 'namePtBr', 'icon', 'color', 'order', 'isActive']);
 *   return this.prisma.techArea.update({ where: { id }, data });
 */
export function patchData<T extends Record<string, unknown>>(
  dto: T,
  fields: (keyof T)[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (dto[field] !== undefined) {
      data[field as string] = dto[field];
    }
  }
  return data;
}
