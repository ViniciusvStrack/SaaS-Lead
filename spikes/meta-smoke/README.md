# Meta webhook smoke spike

Prova descartável das duas primitivas necessárias antes do endpoint de produção:

- validar o challenge de configuração do webhook;
- verificar a assinatura HMAC sobre o body bruto exato.

Execute:

```powershell
corepack pnpm --dir spikes/meta-smoke test
```

Este diretório não é código de produção, não persiste eventos, não chama IA e não envia mensagens. Um smoke test real ainda exige uma conta/app Meta de desenvolvimento, callback HTTPS e credenciais fornecidas fora do Git.

## Evidência pendente da conta

1. Completar Embedded Signup com uma conta de teste.
2. Registrar WABA ID e phone number ID em secret/configuração local.
3. Confirmar a versão da Graph API mostrada no dashboard.
4. Validar challenge e assinatura com evento entregue pela Meta.
5. Enviar mensagem permitida somente em ambiente controlado.
6. Manter coexistência desativada até prova de elegibilidade e eventos.
