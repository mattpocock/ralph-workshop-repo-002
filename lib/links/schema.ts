import { z } from "zod";
import { validateCustomSlug } from "./slug";

export const createLinkSchema = z.object({
  destinationUrl: z.string().url("Invalid URL format"),
  slug: z
    .string()
    .optional()
    .superRefine((slug, ctx) => {
      if (!slug) return;
      const error = validateCustomSlug(slug);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      }
    }),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: "Expiration date must be in the future" },
    ),
});

export type CreateLinkRequest = z.infer<typeof createLinkSchema>;

export const linkResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  destinationUrl: z.string(),
  shortUrl: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LinkResponse = z.infer<typeof linkResponseSchema>;

export const listLinksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;

export const listLinksResponseSchema = z.object({
  links: z.array(linkResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type ListLinksResponse = z.infer<typeof listLinksResponseSchema>;
