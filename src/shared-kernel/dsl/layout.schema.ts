import { z } from "zod";

export const LayoutTypeSchema = z.enum([
 "single-column",
 "two-column",
 "sidebar-left",
 "sidebar-right",
 "magazine",
 "compact",
]);

export const PaperSizeSchema = z.enum(["a4", "letter", "legal"]);
export const MarginSizeSchema = z.enum([
 "compact",
 "normal",
 "relaxed",
 "wide",
]);
export const ColumnDistributionSchema = z.enum([
 "60-40",
 "70-30",
 "65-35",
 "50-50",
]);
export const PageBreakBehaviorSchema = z.enum([
 "auto",
 "section-aware",
 "manual",
]);
export const PageNumberPositionSchema = z.enum([
 "bottom-center",
 "bottom-right",
 "top-right",
]);

export const LayoutConfigSchema = z.object({
 type: LayoutTypeSchema,
 paperSize: PaperSizeSchema,
 margins: MarginSizeSchema,
 columnDistribution: ColumnDistributionSchema.optional(),
 pageBreakBehavior: PageBreakBehaviorSchema,
 showPageNumbers: z.boolean().optional(),
 pageNumberPosition: PageNumberPositionSchema.optional(),
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
