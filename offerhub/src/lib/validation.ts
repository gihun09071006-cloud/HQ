import { z } from "zod";

export const deviceEnum = z.enum(["ANDROID", "IOS", "WEB", "ALL"]);
export const sortEnum = z.enum(["trending", "newest", "reward", "featured"]);

export const offerListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional(),
  device: deviceEnum.optional(),
  minReward: z.coerce.number().min(0).max(1_000_000).optional(),
  sort: sortEnum.default("trending"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

export type OfferListQuery = z.infer<typeof offerListQuerySchema>;

/**
 * Tolerant parser for URL search params: empty strings are dropped and
 * an invalid query degrades to defaults instead of throwing.
 */
export function parseOfferQuery(
  params: Record<string, string | string[] | undefined>,
): OfferListQuery {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined && v !== "") flat[key] = v;
  }
  const parsed = offerListQuerySchema.safeParse(flat);
  return parsed.success ? parsed.data : offerListQuerySchema.parse({});
}

export const adminOfferPatchSchema = z
  .object({
    status: z.enum(["ACTIVE", "DISABLED", "HIDDEN"]).optional(),
    isFeatured: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Empty patch" });

export const favoriteToggleSchema = z.object({
  offerId: z.string().min(1).max(64),
});
