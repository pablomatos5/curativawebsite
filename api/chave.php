<?php
// Diz à página de pagamento se o Mercado Pago está configurado e entrega a chave PÚBLICA (feita para ficar no navegador).
require __DIR__ . '/lib.php';
responder(200, [
  'ativo' => mpAtivo(),
  'publicKey' => mpAtivo() ? cfg('MP_PUBLIC_KEY') : '',
  'teste' => str_starts_with(cfg('MP_ACCESS_TOKEN'), 'TEST-'),
]);
