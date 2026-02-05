import { z } from "zod";

export const SectionIdSchema = z.string();
export const ColumnIdSchema = z.enum(["main", "sidebar", "full-width"]);

export const SectionConfigSchema = z.object({
 id: SectionIdSchema,
 visible: z.boolean(),
 order: z.number(),
 column: ColumnIdSchema,
});

export const ItemOverrideSchema = z.object({
 itemId: z.string(),
 visible: z.boolean(),
 order: z.number(),
});

export const SectionItemOverridesSchema = z.record(
 SectionIdSchema,
 z.array(ItemOverrideSchema),
);

export type SectionConfig = z.infer<typeof SectionConfigSchema>;
export type SectionItemOverrides = z.infer<typeof SectionItemOverridesSchema>;
