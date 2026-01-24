import { z } from "zod";
import { tagResponseSchema } from "../tags/schema";

export const addTagsToLinkSchema = z.object({
  tagIds: z
    .array(z.string().uuid("Invalid tag ID format"))
    .min(1, "At least one tag ID is required"),
});

export type AddTagsToLinkRequest = z.infer<typeof addTagsToLinkSchema>;

export const setTagsForLinkSchema = z.object({
  tagIds: z.array(z.string().uuid("Invalid tag ID format")),
});

export type SetTagsForLinkRequest = z.infer<typeof setTagsForLinkSchema>;

export const linkTagsResponseSchema = z.object({
  tags: z.array(tagResponseSchema),
});

export type LinkTagsResponse = z.infer<typeof linkTagsResponseSchema>;
