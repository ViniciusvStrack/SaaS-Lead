import { z } from "zod";

export const conversationAnalysisSchema = z.object({
  intent: z.enum(["PURCHASE", "SUPPORT", "INFORMATION", "OTHER"]),
  stage: z.enum(["NEW", "QUALIFYING", "READY_TO_BUY", "NOT_INTERESTED"]),
  sentiment: z.enum(["NEGATIVE", "NEUTRAL", "POSITIVE"]),
  urgency: z.number().min(0).max(1),
  summary: z.string().min(1).max(1000),
  suggestedNextAction: z.string().min(1).max(500),
  commercial: z.object({
    discountRequested: z.boolean(),
    discountAllowed: z.boolean(),
    allowedDiscountPercent: z.number().min(0).max(100).nullable(),
  }),
});

export type ConversationAnalysis = z.infer<typeof conversationAnalysisSchema>;

export const conversationAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "stage", "sentiment", "urgency", "summary", "suggestedNextAction", "commercial"],
  properties: {
    intent: { type: "string", enum: ["PURCHASE", "SUPPORT", "INFORMATION", "OTHER"] },
    stage: { type: "string", enum: ["NEW", "QUALIFYING", "READY_TO_BUY", "NOT_INTERESTED"] },
    sentiment: { type: "string", enum: ["NEGATIVE", "NEUTRAL", "POSITIVE"] },
    urgency: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string", minLength: 1, maxLength: 1000 },
    suggestedNextAction: { type: "string", minLength: 1, maxLength: 500 },
    commercial: {
      type: "object",
      additionalProperties: false,
      required: ["discountRequested", "discountAllowed", "allowedDiscountPercent"],
      properties: {
        discountRequested: { type: "boolean" },
        discountAllowed: { type: "boolean" },
        allowedDiscountPercent: { type: ["number", "null"], minimum: 0, maximum: 100 },
      },
    },
  },
} as const;
