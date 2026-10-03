<?php
// Base do servidor de pagamento: credenciais, resposta JSON e chamada à API do Mercado Pago.
// A chave secreta (Access Token) só existe aqui no servidor. Ela nunca vai para o JavaScript do site.

// Ordem de busca das credenciais: variáveis de ambiente do servidor; um arquivo de segredos FORA da pasta
// pública (recomendado na hospedagem); por último api/segredos.php, bloqueado pelo .htaccess, para testar no PC.
function cfg(string $k): string {
  static $s = null;
  if ($s === null) {
    $s = [];
    foreach ([dirname(__DIR__, 2) . '/curativa-segredos.php', __DIR__ . '/segredos.php'] as $arq) {
      if (is_file($arq)) { $s = require $arq; break; }
    }
  }
  $v = getenv($k);
  return $v !== false && $v !== '' ? $v : (string)($s[$k] ?? '');
}

function mpAtivo(): bool { return cfg('MP_ACCESS_TOKEN') !== '' && cfg('MP_PUBLIC_KEY') !== ''; }

function responder(int $codigo, array $dados): never {
  http_response_code($codigo);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($dados, JSON_UNESCAPED_UNICODE);
  exit;
}

// Chamada à API. Devolve [código HTTP, resposta decodificada].
function mp(string $metodo, string $caminho, ?array $corpo = null, ?string $idempotencia = null): array {
  $ch = curl_init('https://api.mercadopago.com' . $caminho);
  $cab = ['Authorization: Bearer ' . cfg('MP_ACCESS_TOKEN'), 'Content-Type: application/json'];
  if ($idempotencia) $cab[] = 'X-Idempotency-Key: ' . $idempotencia;
  curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $metodo, CURLOPT_HTTPHEADER => $cab, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25]);
  // no Windows (teste no PC) o PHP costuma vir sem lista de certificados: usa a do próprio sistema
  if (PHP_OS_FAMILY === 'Windows' && defined('CURLSSLOPT_NATIVE_CA')) curl_setopt($ch, CURLOPT_SSL_OPTIONS, CURLSSLOPT_NATIVE_CA);
  if ($corpo !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($corpo, JSON_UNESCAPED_UNICODE));
  $txt = curl_exec($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($txt === false) return [0, ['message' => curl_error($ch)]];
  return [$http, json_decode($txt, true) ?? []];
}

// CPF com dígitos verificadores válidos (o Mercado Pago recusa CPF inválido no Pix).
function cpfValido(string $cpf): bool {
  if (!preg_match('/^\d{11}$/', $cpf) || preg_match('/^(\d)\1{10}$/', $cpf)) return false;
  for ($t = 9; $t < 11; $t++) {
    $soma = 0;
    for ($i = 0; $i < $t; $i++) $soma += (int)$cpf[$i] * ($t + 1 - $i);
    if ((int)$cpf[$t] !== ((10 * $soma) % 11) % 10) return false;
  }
  return true;
}

// Só o que a página precisa saber sobre um pagamento. Nada de dados do cartão.
function resumoPagamento(array $p): array {
  $tx = $p['point_of_interaction']['transaction_data'] ?? [];
  return array_filter([
    'id' => $p['id'] ?? null,
    'status' => $p['status'] ?? 'erro',
    'detalhe' => $p['status_detail'] ?? '',
    'valor' => $p['transaction_amount'] ?? null,
    'parcelas' => $p['installments'] ?? null,
    'final' => $p['card']['last_four_digits'] ?? null,
    'pix' => isset($tx['qr_code']) ? ['copia' => $tx['qr_code'], 'imagem' => $tx['qr_code_base64'] ?? '', 'expira' => $p['date_of_expiration'] ?? ''] : null,
  ], fn($v) => $v !== null);
}
