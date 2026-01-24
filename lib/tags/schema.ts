import { z } from "zod";

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9\s_-]+$/,
      "Tag name can only contain letters, numbers, spaces, underscores, and hyphens",
    ),
});

export type CreateTagRequest = z.infer<typeof createTagSchema>;

export const tagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export type TagResponse = z.infer<typeof tagResponseSchema>;

export const listTagsResponseSchema = z.object({
  tags: z.array(tagResponseSchema),
});

export type ListTagsResponse = z.infer<typeof listTagsResponseSchema>;
