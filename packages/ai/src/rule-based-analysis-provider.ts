import type { AIProvider, AnalysisResult, AnalyzeConversationInput } from "./ai-provider.js";

const purchasePattern = /\b(comprar|compra|contratar|proposta|orçamento|orcamento|fechar)\b/i;
const discountPattern = /\b(desconto|abatimento)\b/i;

export class RuleBasedAnalysisProvider implements AIProvider {
  async analyzeConversation(input: AnalyzeConversationInput): Promise<AnalysisResult> {
    const inbound = input.messages.filter((message) => message.direction === "INBOUND").map((message) => message.body).join(" ");
    const purchase = purchasePattern.test(inbound);
    const discountRequested = discountPattern.test(inbound);
    return {
      analysis: {
        intent: purchase ? "PURCHASE" : "OTHER",
        stage: purchase ? "READY_TO_BUY" : "NEW",
        sentiment: "NEUTRAL",
        urgency: purchase ? 0.7 : 0.2,
        summary: purchase ? "Cliente demonstrou intenção explícita de compra." : "Conversa recebida sem intenção comercial explícita.",
        suggestedNextAction: purchase ? "Responder ao cliente e avançar a negociação." : "Revisar a conversa antes de agir.",
        commercial: { discountRequested, discountAllowed: false, allowedDiscountPercent: null },
      },
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}
