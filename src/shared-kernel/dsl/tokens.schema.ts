import { z } from "zod";

export const FontFamilySchema = z.enum([
 "inter",
 "merriweather",
 "roboto",
 "open-sans",
 "playfair-display",
 "source-serif",
 "lato",
 "poppins",
]);

export const FontSizeSchema = z.enum(["sm", "base", "lg"]);

export const HeadingStyleSchema = z.enum([
 "bold",
 "underline",
 "uppercase",
 "accent-border",
 "minimal",
]);

export const TypographyTokensSchema = z.object({
 fontFamily: z.object({
  heading: FontFamilySchema,
  body: FontFamilySchema,
 }),
 fontSize: FontSizeSchema,
 headingStyle: HeadingStyleSchema,
});

export const ColorPaletteSchema = z.object({
 primary: z.string(),
 secondary: z.string(),
 background: z.string(),
 surface: z.string(),
 text: z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
 }),
 border: z.string(),
 divider: z.string(),
});

export const BorderRadiusSchema = z.enum(["none", "sm", "md", "lg", "full"]);
export const ShadowSchema = z.enum(["none", "subtle", "medium", "strong"]);

export const ColorTokensSchema = z.object({
 colors: ColorPaletteSchema,
 borderRadius: BorderRadiusSchema,
 shadows: ShadowSchema,
 gradients: z
  .object({
   enabled: z.boolean(),
   direction: z.enum(["to-right", "to-bottom", "diagonal"]),
  })
  .optional(),
});

export const SpacingDensitySchema = z.enum([
 "compact",
 "comfortable",
 "spacious",
]);
export const SpacingSizeSchema = z.enum(["sm", "md", "lg", "xl"]);

export const SpacingTokensSchema = z.object({
 density: SpacingDensitySchema,
 sectionGap: SpacingSizeSchema,
 itemGap: SpacingSizeSchema,
 contentPadding: SpacingSizeSchema,
});

export const DesignTokensSchema = z.object({
 typography: TypographyTokensSchema,
 colors: ColorTokensSchema,
 spacing: SpacingTokensSchema,
});

export type DesignTokens = z.infer<typeof DesignTokensSchema>;
