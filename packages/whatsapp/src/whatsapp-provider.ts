export interface ConnectInput { code: string; redirectUri: string }
export interface ConnectionResult { businessAccountId: string; phoneNumberIds: string[] }
export interface SendInput { phoneNumberId: string; to: string; payload: Record<string, unknown> }
export interface SendResult { messageId: string }
export interface WhatsAppTemplate { id: string; name: string; status: string; language: string }

export interface WhatsAppProvider {
  connect(input: ConnectInput): Promise<ConnectionResult>;
  send(input: SendInput): Promise<SendResult>;
  getTemplates(businessAccountId: string): Promise<WhatsAppTemplate[]>;
}
