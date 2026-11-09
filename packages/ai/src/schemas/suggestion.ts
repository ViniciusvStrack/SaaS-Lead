import { z } from "zod";

export const suggestionSchema = z.object({
  content: z.string().min(1).max(2000),
  rationale: z.string().min(1).max(1000),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

export const suggestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["content", "rationale"],
  properties: {
    content: { type: "string", minLength: 1, maxLength: 2000 },
    rationale: { type: "string", minLength: 1, maxLength: 1000 },
  },
} as const;
