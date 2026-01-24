import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "API key name is required")
    .max(100, "API key name must be at most 100 characters"),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;

export const apiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});

export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;

// Response for create includes the plain key (only shown once)
export const createApiKeyResponseSchema = apiKeyResponseSchema.extend({
  key: z.string(),
});

export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;

export const listApiKeysResponseSchema = z.object({
  apiKeys: z.array(apiKeyResponseSchema),
});

export type ListApiKeysResponse = z.infer<typeof listApiKeysResponseSchema>;
