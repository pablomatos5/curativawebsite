<?php
// Cria o pagamento no Mercado Pago (Checkout Transparente): a cliente paga na página do site, sem sair dela.
// Cartão: o número digitado vai direto do navegador para o Mercado Pago (campos seguros) e volta como um token
// de uso único. Este servidor só recebe o token, nunca o número do cartão.
// Pix: o servidor cria a cobrança e devolve o QR Code e o "copia e cola" para a página mostrar.
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(405, ['erro' => 'Use POST.']);
if (!mpAtivo()) responder(503, ['erro' => 'Pagamento online ainda não configurado.']);
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) responder(400, ['erro' => 'Dados inválidos.']);

// ---------- pedido e valor (calculado aqui, com os preços do servidor) ----------
$pedido = (string)($in['pedido'] ?? '');
if (!preg_match('/^LJ-[A-Z0-9]{5}$/', $pedido)) responder(400, ['erro' => 'Código de pedido inválido.']);
$catalogo = require __DIR__ . '/catalogo.php';
$itens = $in['itens'] ?? [];
if (!is_array($itens) || !$itens || count($itens) > 30) responder(400, ['erro' => 'Sacola vazia ou inválida.']);
$total = 0; $nomes = [];
foreach ($itens as $it) {
  $id = (string)($it['id'] ?? ''); $qtd = (int)($it['qtd'] ?? 0);
  if (!isset($catalogo[$id]) || $qtd < 1 || $qtd > 20) responder(400, ['erro' => 'Produto ou quantidade inválida.']);
  $total += $catalogo[$id]['preco'] * $qtd;
  $nomes[] = $qtd . 'x ' . $catalogo[$id]['nome'];
}
$total = round($total, 2);
// se o preço mudou desde que a página abriu, avisa em vez de cobrar um valor que a cliente não viu
if (abs($total - (float)($in['total'] ?? 0)) > 0.009) responder(409, ['erro' => 'O valor do pedido mudou. Confira o novo total.', 'total' => $total]);

// ---------- quem paga ----------
$nome = trim((string)($in['nome'] ?? ''));
$email = trim((string)($in['email'] ?? ''));
$cpf = preg_replace('/\D/', '', (string)($in['cpf'] ?? ''));
if (mb_strlen($nome) < 3 || mb_strlen($nome) > 80) responder(400, ['erro' => 'Informe o nome completo.']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responder(400, ['erro' => 'E-mail inválido.']);
if (!cpfValido($cpf)) responder(400, ['erro' => 'CPF inválido.']);
$partes = preg_split('/\s+/', $nome);
$payer = ['email' => $email, 'first_name' => array_shift($partes), 'last_name' => implode(' ', $partes) ?: '-', 'identification' => ['type' => 'CPF', 'number' => $cpf]];

$corpo = [
  'transaction_amount' => $total,
  'description' => 'Curativa Farmácia · pedido ' . $pedido,
  'external_reference' => $pedido,
  'statement_descriptor' => 'CURATIVA',
  'payer' => $payer,
  'metadata' => ['itens' => implode(', ', $nomes)],
];
// aviso automático do Mercado Pago quando o status muda (só funciona com o site publicado em https)
$site = rtrim(cfg('SITE_URL'), '/');
if (str_starts_with($site, 'https://')) $corpo['notification_url'] = $site . '/api/webhook.php';

$metodo = (string)($in['metodo'] ?? '');
if ($metodo === 'pix') {
  $corpo['payment_method_id'] = 'pix';
  $corpo['date_of_expiration'] = (new DateTime('+30 minutes', new DateTimeZone('America/Belem')))->format('Y-m-d\TH:i:s.vP');
} elseif ($metodo === 'cartao') {
  $token = (string)($in['token'] ?? ''); $parcelas = (int)($in['parcelas'] ?? 1); $bandeira = (string)($in['bandeira'] ?? '');
  if (!preg_match('/^[A-Za-z0-9]{16,64}$/', $token)) responder(400, ['erro' => 'Dados do cartão inválidos. Digite de novo.']);
  if ($parcelas < 1 || $parcelas > 12 || !preg_match('/^[a-z_]{2,30}$/', $bandeira)) responder(400, ['erro' => 'Parcelamento inválido.']);
  $corpo += ['token' => $token, 'installments' => $parcelas, 'payment_method_id' => $bandeira];
  if (!empty($in['emissor']) && ctype_digit((string)$in['emissor'])) $corpo['issuer_id'] = (int)$in['emissor'];
} else {
  responder(400, ['erro' => 'Escolha Pix ou cartão.']);
}

// a mesma chave na mesma tentativa impede cobrança em dobro se a cliente clicar duas vezes ou a rede cair
$idem = (string)($in['tentativa'] ?? '');
if (!preg_match('/^[A-Za-z0-9-]{16,64}$/', $idem)) $idem = bin2hex(random_bytes(16));

[$http, $r] = mp('POST', '/v1/payments', $corpo, $pedido . '-' . $idem);
if ($http === 0) responder(502, ['erro' => 'Não conseguimos falar com o Mercado Pago. Tente de novo em instantes.', 'tecnico' => $r['message'] ?? '']);
if ($http >= 400) responder(422, ['erro' => 'O Mercado Pago recusou os dados enviados. Confira e tente de novo.', 'tecnico' => $r['message'] ?? '']);
responder(200, resumoPagamento($r));
