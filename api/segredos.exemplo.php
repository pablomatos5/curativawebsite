<?php
// MODELO. Copie para um arquivo chamado curativa-segredos.php UM NÍVEL ACIMA da pasta pública do site
// (na Hostinger, ao lado de public_html), e preencha. Para testar no PC, pode salvar como api/segredos.php.
// Nunca envie este arquivo preenchido por WhatsApp/e-mail nem coloque as chaves no JavaScript.
//
// Onde pegar: mercadopago.com.br/developers > Suas integrações > (sua aplicação) > Credenciais.
// Comece com as credenciais de TESTE e os cartões de teste do Mercado Pago. Troque pelas de produção só no lançamento.
return [
  'MP_PUBLIC_KEY'     => 'TEST-00000000-0000-0000-0000-000000000000',   // chave pública (vai para o navegador)
  'MP_ACCESS_TOKEN'   => 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000', // SECRETA
  'MP_WEBHOOK_SECRET' => '',   // assinatura secreta do webhook (Suas integrações > Webhooks)
  'SITE_URL'          => '',   // ex.: https://curativa.com.br (deixe vazio para testar no PC)
];
