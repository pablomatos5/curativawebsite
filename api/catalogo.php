<?php
// Preços que valem para cobrança. O valor cobrado é sempre calculado aqui no servidor, nunca aceito do navegador
// (senão bastaria editar a página para pagar menos). Manter igual à lista PRODUTOS de app.js até existir banco de dados.
// PREÇOS DE EXEMPLO: trocar pelos reais.
return [
  'mist'       => ['nome' => 'Body Mist', 'preco' => 59.90],
  'mist-kit'   => ['nome' => 'Body Mist · kit com 4', 'preco' => 199.90],
  'base-stick' => ['nome' => 'Base Stick FPS 50', 'preco' => 89.90],
  'multistick' => ['nome' => 'Multistick', 'preco' => 69.90],
  'gloss'      => ['nome' => 'Gloss labial', 'preco' => 49.90],
  'serum'      => ['nome' => 'Sérum para cílios e sobrancelhas', 'preco' => 79.90],
  'kit-skin'   => ['nome' => 'Kit skincare', 'preco' => 149.90],
  'hidratante' => ['nome' => 'Hidratante facial', 'preco' => 69.90],
];
