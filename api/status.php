<?php
// Consulta o status de um pagamento (a página do Pix pergunta a cada poucos segundos até ser aprovado).
require __DIR__ . '/lib.php';
if (!mpAtivo()) responder(503, ['erro' => 'Pagamento online ainda não configurado.']);
$id = (string)($_GET['id'] ?? ''); $pedido = (string)($_GET['pedido'] ?? '');
if (!ctype_digit($id) || !preg_match('/^LJ-[A-Z0-9]{5}$/', $pedido)) responder(400, ['erro' => 'Consulta inválida.']);
[$http, $r] = mp('GET', '/v1/payments/' . $id);
// só responde se o pagamento for mesmo deste pedido: ninguém consulta pagamento alheio chutando números
if ($http !== 200 || ($r['external_reference'] ?? '') !== $pedido) responder(404, ['erro' => 'Pagamento não encontrado.']);
$res = resumoPagamento($r);
unset($res['pix']['imagem']);
responder(200, $res);
