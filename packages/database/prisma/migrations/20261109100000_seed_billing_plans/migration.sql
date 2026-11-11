INSERT INTO "Plan" ("id", "code", "name", "status", "entitlements", "pricingConfig", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'essential', 'Essencial', 'ACTIVE', '{"messages.analyze":2000,"users.seat":3,"whatsapp.number":1,"automation.chatbot":false,"jarvis.minutes":0}', '{"currency":"BRL","amount":397,"interval":"month"}', NOW(), NOW()),
  (gen_random_uuid(), 'professional', 'Profissional', 'ACTIVE', '{"messages.analyze":10000,"users.seat":8,"whatsapp.number":2,"automation.chatbot":false,"jarvis.minutes":0}', '{"currency":"BRL","amount":897,"interval":"month"}', NOW(), NOW()),
  (gen_random_uuid(), 'performance', 'Performance', 'ACTIVE', '{"messages.analyze":30000,"users.seat":20,"whatsapp.number":5,"automation.chatbot":true,"jarvis.minutes":0}', '{"currency":"BRL","amount":1797,"interval":"month"}', NOW(), NOW()),
  (gen_random_uuid(), 'jarvis', 'Jarvis', 'ACTIVE', '{"messages.analyze":60000,"users.seat":50,"whatsapp.number":10,"automation.chatbot":true,"jarvis.minutes":300}', '{"currency":"BRL","amount":3497,"interval":"month"}', NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "entitlements" = EXCLUDED."entitlements", "pricingConfig" = EXCLUDED."pricingConfig", "updatedAt" = NOW();
