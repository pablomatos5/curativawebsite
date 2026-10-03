<?php
// Aviso do Mercado Pago quando um pagamento muda de status (Pix pago com a página fechada, estorno, contestação).
// Configure em: Mercado Pago > Suas integrações > Webhooks, evento "Pagamentos", URL https://SEU-SITE/api/webhook.php.
// A assinatura secreta mostrada lá vai em MP_WEBHOOK_SECRET. Sem ela, qualquer um poderia forjar um "pago".
require __DIR__ . '/lib.php';

$corpo = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (string)($_GET['data_id'] ?? ($corpo['data']['id'] ?? ''));   // o PHP troca "data.id" por "data_id"
if (($corpo['type'] ?? $_GET['type'] ?? '') !== 'payment' || !ctype_digit($id)) responder(200, ['ok' => true]); // outros eventos: ignora

// x-signature: "ts=...,v1=..." = HMAC-SHA256 de "id:<id>;request-id:<x-request-id>;ts:<ts>;"
$segredo = cfg('MP_WEBHOOK_SECRET');
if ($segredo === '') responder(503, ['erro' => 'Webhook sem assinatura configurada.']);
parse_str(str_replace(',', '&', $_SERVER['HTTP_X_SIGNATURE'] ?? ''), $sig);
$manifesto = 'id:' . strtolower($id) . ';request-id:' . ($_SERVER['HTTP_X_REQUEST_ID'] ?? '') . ';ts:' . ($sig['ts'] ?? '') . ';';
if (empty($sig['v1']) || !hash_equals(hash_hmac('sha256', $manifesto, $segredo), $sig['v1'])) responder(401, ['erro' => 'Assinatura inválida.']);

// nunca confia no corpo do aviso: busca o pagamento direto no Mercado Pago
[$http, $p] = mp('GET', '/v1/payments/' . $id);
if ($http !== 200) responder(502, ['erro' => 'Falha ao consultar o pagamento.']); // o Mercado Pago tenta de novo depois
$ref = (string)($p['external_reference'] ?? '');
if (preg_match('/^LJ-[A-Z0-9]{5}$/', $ref)) {
  // PROTÓTIPO: grava num arquivo. No sistema real, aqui se atualiza o pedido no banco de dados.
  $dir = __DIR__ . '/dados';
  if (!is_dir($dir)) mkdir($dir, 0750, true);
  $res = resumoPagamento($p); unset($res['pix']);
  file_put_contents("$dir/$ref.json", json_encode($res + ['atualizado' => date('c')], JSON_UNESCAPED_UNICODE), LOCK_EX);
}
responder(200, ['ok' => true]);
