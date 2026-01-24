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
  tag: z.string().uuid().optional(),
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

export const updateLinkSchema = z
  .object({
    destinationUrl: z.string().url("Invalid URL format").optional(),
    expiresAt: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .refine(
        (date) => {
          if (!date) return true;
          return new Date(date) > new Date();
        },
        { message: "Expiration date must be in the future" },
      ),
  })
  .refine(
    (data) => data.destinationUrl !== undefined || data.expiresAt !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export type UpdateLinkRequest = z.infer<typeof updateLinkSchema>;

// Schema for a single link in bulk creation (reuses createLinkSchema validation)
export const bulkCreateLinkSchema = createLinkSchema;

export const bulkCreateLinksSchema = z.object({
  links: z
    .array(bulkCreateLinkSchema)
    .min(1, "At least one link is required")
    .max(100, "Maximum 100 links per request"),
});

export type BulkCreateLinksRequest = z.infer<typeof bulkCreateLinksSchema>;

export interface BulkCreateLinkResult {
  index: number;
  success: boolean;
  link?: LinkResponse;
  error?: string;
}

export const bulkCreateLinksResponseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      success: z.boolean(),
      link: linkResponseSchema.optional(),
      error: z.string().optional(),
    }),
  ),
  summary: z.object({
    total: z.number(),
    succeeded: z.number(),
    failed: z.number(),
  }),
});

export type BulkCreateLinksResponse = z.infer<
  typeof bulkCreateLinksResponseSchema
>;
