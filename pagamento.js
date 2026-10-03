// Página de pagamento do site (Checkout Transparente do Mercado Pago): Pix ou cartão sem sair da Curativa.
// Sem credenciais configuradas (ou abrindo sem o servidor PHP), entra em MODO DEMONSTRAÇÃO: nada é cobrado.
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const pedido = Store.pedidos().find((p) => p.id === params.get("pedido") && p.tipo === "loja");
let mp = null, demo = true, metodo = "pix";
let cartao = { bandeira: "", emissor: "", bin: "" };
let tentativa = novaTentativa();
let espera = 0; // timer do Pix

function novaTentativa() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2, 12)).replace(/[^A-Za-z0-9-]/g, ""); }
const salvarPag = (campos) => Store.atualizar("pedidos", pedido.id, { pagamento: { ...(Store.pedidos().find((p) => p.id === pedido.id).pagamento || {}), ...campos } });
const erroGeral = (msg) => { $("#pg-erro").textContent = msg; };
const campoErro = (el, msg) => { el.closest(".campo").querySelector(".erro").textContent = msg; el.setAttribute("aria-invalid", !!msg); return !msg; };

// ---------- início ----------
async function iniciar() {
  if (!pedido) { $("#sem-pedido").hidden = false; return; }
  if (pedido.pagamento?.status === "aprovado") return mostrarPago(pedido.pagamento);
  $("#checkout").hidden = false;
  $("#pg-itens").innerHTML = pedido.itens.map((it) => `<li><span>${it.qtd}× ${esc(it.nome)}${it.variante ? ` <small>${esc(it.variante)}</small>` : ""}</span><b>${brl(it.preco * it.qtd)}</b></li>`).join("");
  $("#pg-unidade").textContent = nomeUnidade(pedido.unidade);
  $("#pg-cod").textContent = pedido.id;
  $("#pg-total").textContent = brl(pedido.total);
  $("#pg-nome").value = pedido.nome;
  $("#cc-pagar").textContent = `Pagar ${brl(pedido.total)}`;
  try {
    const r = await fetch("api/chave.php", { cache: "no-store" });
    const c = await r.json();
    if (c.ativo && c.publicKey && window.MercadoPago) { mp = new MercadoPago(c.publicKey, { locale: "pt-BR" }); demo = false; if (c.teste) modo("Ambiente de teste do Mercado Pago: use os cartões de teste. Nenhum valor real é cobrado."); }
  } catch { /* sem servidor PHP: segue em demonstração */ }
  if (demo) modo("Modo demonstração: o Mercado Pago ainda não foi configurado. O pagamento é simulado e nada é cobrado.");
  if (pedido.pagamento?.pix && !demo && new Date(pedido.pagamento.pix.expira) > new Date()) mostrarPix(pedido.pagamento.pix, pedido.pagamento.id);
}
function modo(txt) { $("#modo").textContent = txt; $("#modo").hidden = false; }

// ---------- abas Pix / cartão ----------
["pix", "cartao"].forEach((m) => ($("#tab-" + m).onclick = () => {
  metodo = m;
  ["pix", "cartao"].forEach((x) => { $("#tab-" + x).setAttribute("aria-selected", x === m); $("#pn-" + x).hidden = x !== m; });
  erroGeral("");
  if (m === "cartao") montarCartao();
}));

// ---------- dados de quem paga ----------
$("#pg-cpf").addEventListener("input", (e) => {
  const d = e.target.value.replace(/\D/g, "").slice(0, 11);
  e.target.value = d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2").replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
});
function cpfValido(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if (+c[t] !== ((10 * s) % 11) % 10) return false; }
  return true;
}
function pagador() {
  const nome = $("#pg-nome").value.trim(), email = $("#pg-email").value.trim(), cpf = $("#pg-cpf").value.replace(/\D/g, "");
  let ok = campoErro($("#pg-nome"), nome.length < 3 ? "Informe o nome completo." : "");
  ok = campoErro($("#pg-email"), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Informe um e-mail válido.") && ok;
  ok = campoErro($("#pg-cpf"), cpfValido(cpf) ? "" : "CPF inválido.") && ok;
  return ok ? { nome, email, cpf } : null;
}

async function enviar(extra) {
  const p = pagador(); if (!p) return null;
  erroGeral("");
  const corpo = { pedido: pedido.id, total: pedido.total, itens: pedido.itens.map(({ id, qtd }) => ({ id, qtd })), ...p, tentativa, ...extra };
  const r = await fetch("api/pagar.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({ erro: "Resposta inesperada do servidor." }));
  if (!r.ok) { erroGeral(d.erro || "Não foi possível processar o pagamento."); return null; }
  return d;
}

// ---------- Pix ----------
$("#pix-gerar").onclick = async () => {
  const b = $("#pix-gerar");
  if (demo) {
    if (!pagador()) return;
    const falso = { copia: "00020126580014br.gov.bcb.pix0136DEMONSTRACAO-CURATIVA-NADA-E-COBRADO5204000053039865802BR6304DEMO", imagem: "", expira: new Date(Date.now() + 30 * 60000).toISOString() };
    return mostrarPix(falso, "DEMO");
  }
  b.disabled = true; b.textContent = "Gerando…";
  try {
    const d = await enviar({ metodo: "pix" });
    if (d?.pix) { salvarPag({ forma: "online", metodo: "pix", id: d.id, status: "aguardando", pix: { copia: d.pix.copia, imagem: d.pix.imagem, expira: d.pix.expira } }); mostrarPix(d.pix, d.id); }
  } catch { erroGeral("Sem conexão com o servidor de pagamento. Tente de novo."); }
  b.disabled = false; b.textContent = "Gerar Pix";
};
function mostrarPix(pix, id) {
  $("#pix-inicio").hidden = true; $("#pix-box").hidden = false;
  $("#pix-copia").value = pix.copia;
  $("#pix-qr").innerHTML = pix.imagem ? `<img src="data:image/png;base64,${pix.imagem}" alt="QR Code do Pix" width="220" height="220">` : `<div class="qr-demo" aria-label="QR Code de demonstração">QR Code<br><small>demonstração</small></div>`;
  $("#pix-simular").hidden = !demo;
  $("#tab-cartao").disabled = true; // evita pagar duas vezes enquanto o Pix está em aberto
  const fim = new Date(pix.expira).getTime();
  clearInterval(espera);
  const tique = async (n) => {
    const resta = Math.max(0, fim - Date.now());
    $("#pix-expira").textContent = resta ? `O código expira em ${Math.floor(resta / 60000)}:${String(Math.floor(resta / 1000) % 60).padStart(2, "0")}.` : "O código expirou.";
    if (!resta) { clearInterval(espera); $("#pix-status").textContent = "Código expirado."; $("#pix-inicio").hidden = false; $("#pix-box").hidden = true; $("#tab-cartao").disabled = false; tentativa = novaTentativa(); return; }
    // pergunta ao servidor a cada 5 segundos se o Pix caiu
    if (!demo && n % 5 === 0) {
      try {
        const r = await fetch(`api/status.php?id=${encodeURIComponent(id)}&pedido=${encodeURIComponent(pedido.id)}`, { cache: "no-store" });
        const d = await r.json();
        if (d.status === "approved") { clearInterval(espera); aprovado({ metodo: "pix", id }); }
        else if (d.status === "cancelled" || d.status === "rejected") { clearInterval(espera); $("#pix-status").textContent = "Este Pix foi cancelado. Gere um novo."; }
      } catch {}
    }
  };
  let n = 0; tique(n); espera = setInterval(() => tique(++n), 1000);
}
$("#pix-copiar").onclick = async () => {
  try { await navigator.clipboard.writeText($("#pix-copia").value); } catch { $("#pix-copia").select(); document.execCommand("copy"); }
  $("#pix-copiar").textContent = "Copiado ✓"; setTimeout(() => ($("#pix-copiar").textContent = "Copiar código"), 2000);
};
$("#pix-simular").onclick = () => { clearInterval(espera); aprovado({ metodo: "pix", id: "DEMO" }); };

// ---------- cartão (campos seguros do Mercado Pago) ----------
let montado = false;
function montarCartao() {
  if (montado) return; montado = true;
  if (demo) {
    // demonstração: campos comuns, só leitura, já com o cartão de teste do Mercado Pago. Não aceita cartão real.
    $("#mp-numero").innerHTML = `<input class="falso" value="5031 4332 1540 6351" readonly aria-label="Número do cartão (teste)">`;
    $("#mp-validade").innerHTML = `<input class="falso" value="11/30" readonly aria-label="Validade (teste)">`;
    $("#mp-cvv").innerHTML = `<input class="falso" value="123" readonly aria-label="Código de segurança (teste)">`;
    $("#cc-titular").value = "APRO";
    parcelas([1, 2, 3, 4, 5, 6].map((n) => ({ installments: n, recommended_message: `${n}x de ${brl(pedido.total / n)} sem juros` })));
    $("#cc-bandeira").textContent = "Mastercard (teste)";
    return;
  }
  const estilo = { fontSize: "16px", color: "#16332a", placeholderColor: "#8f958c" };
  const numero = mp.fields.create("cardNumber", { placeholder: "0000 0000 0000 0000", style: estilo, srLabel: "Número do cartão" }).mount("mp-numero");
  const validade = mp.fields.create("expirationDate", { placeholder: "MM/AA", style: estilo, srLabel: "Validade" }).mount("mp-validade");
  const cvv = mp.fields.create("securityCode", { placeholder: "123", style: estilo, srLabel: "Código de segurança" }).mount("mp-cvv");
  const errs = { cardNumber: "#err-numero", expirationDate: "#err-validade", securityCode: "#err-cvv" };
  [numero, validade, cvv].forEach((f) => f.on("validityChange", ({ field, errorMessages }) => { $(errs[field]).textContent = errorMessages.length ? "Confira este campo." : ""; }));
  numero.on("binChange", async ({ bin }) => {
    if (!bin) { cartao = { bandeira: "", emissor: "", bin: "" }; $("#cc-bandeira").textContent = ""; return parcelas(null); }
    if (bin === cartao.bin) return;
    cartao.bin = bin;
    try {
      const { results } = await mp.getPaymentMethods({ bin });
      const pm = results[0];
      if (!pm) { $("#err-numero").textContent = "Cartão não reconhecido."; return parcelas(null); }
      if (pm.payment_type_id !== "credit_card") { $("#err-numero").textContent = "Use um cartão de crédito ou pague com Pix."; return parcelas(null); }
      cartao.bandeira = pm.id; $("#cc-bandeira").textContent = pm.name;
      const s = pm.settings?.[0];
      if (s) { numero.update({ settings: s.card_number }); cvv.update({ settings: s.security_code }); }
      cartao.emissor = pm.issuer?.id || "";
      if ((pm.additional_info_needed || []).includes("issuer_id")) { const iss = await mp.getIssuers({ paymentMethodId: pm.id, bin }); cartao.emissor = iss[0]?.id || ""; }
      const inst = await mp.getInstallments({ amount: String(pedido.total), bin, paymentTypeId: "credit_card" });
      parcelas(inst[0]?.payer_costs || null);
    } catch { $("#err-numero").textContent = "Não conseguimos ler o cartão. Confira o número."; }
  });
}
function parcelas(lista) {
  const s = $("#cc-parcelas");
  s.disabled = !lista;
  s.innerHTML = lista ? lista.filter((x) => x.installments <= 12).map((x) => `<option value="${x.installments}">${esc(x.recommended_message)}</option>`).join("") : `<option>Digite o número do cartão</option>`;
}
const RECUSA = {
  cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
  cc_rejected_bad_filled_date: "Confira a validade do cartão.",
  cc_rejected_bad_filled_security_code: "Confira o código de segurança.",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_insufficient_amount: "O cartão não tem limite suficiente. Tente outro cartão ou o Pix.",
  cc_rejected_call_for_authorize: "O banco pediu autorização. Ligue para a central do cartão e tente de novo.",
  cc_rejected_card_disabled: "O cartão não está ativo. Ligue para a central do cartão.",
  cc_rejected_duplicated_payment: "Já existe um pagamento igual a este. Se precisar pagar de novo, use outro cartão ou o Pix.",
  cc_rejected_max_attempts: "Limite de tentativas atingido. Use outro cartão ou o Pix.",
};
$("#cc-pagar").onclick = async () => {
  const b = $("#cc-pagar");
  const titular = $("#cc-titular").value.trim();
  if (!campoErro($("#cc-titular"), titular.length < 3 ? "Informe o nome como está no cartão." : "")) return;
  if (demo) { if (!pagador()) return; return aprovado({ metodo: "cartao", id: "DEMO", parcelas: +$("#cc-parcelas").value, final: "6351" }); }
  if (!cartao.bandeira) { $("#err-numero").textContent = "Digite um cartão de crédito válido."; return; }
  const p = pagador(); if (!p) return;
  b.disabled = true; b.textContent = "Processando…";
  try {
    // o token é de uso único: cada tentativa gera um novo a partir dos campos seguros
    const tk = await mp.fields.createCardToken({ cardholderName: titular, identificationType: "CPF", identificationNumber: p.cpf });
    const d = await enviar({ metodo: "cartao", token: tk.id, parcelas: +$("#cc-parcelas").value, bandeira: cartao.bandeira, emissor: cartao.emissor });
    if (d) {
      if (d.status === "approved") aprovado({ metodo: "cartao", id: d.id, parcelas: d.parcelas, final: d.final });
      else if (d.status === "in_process" || d.status === "pending") { salvarPag({ forma: "online", metodo: "cartao", id: d.id, status: "analise" }); mostrarPago({ status: "analise" }); }
      else { erroGeral(RECUSA[d.detalhe] || "O banco recusou o pagamento. Tente outro cartão ou o Pix."); salvarPag({ forma: "online", metodo: "cartao", status: "recusado" }); }
    }
  } catch { erroGeral("Confira os dados do cartão e tente de novo."); }
  tentativa = novaTentativa();
  b.disabled = false; b.textContent = `Pagar ${brl(pedido.total)}`;
};

// ---------- resultado ----------
function aprovado(dados) {
  const pag = { forma: "online", status: "aprovado", pagoEm: new Date().toISOString(), demo, ...dados };
  delete pag.pix;
  Store.atualizar("pedidos", pedido.id, { pagamento: pag });
  mostrarPago(pag);
}
function mostrarPago(pag) {
  clearInterval(espera);
  $("#checkout").hidden = true;
  const f = $("#pago"); f.hidden = false;
  $("#pago-nome").textContent = pedido.nome.split(" ")[0] + ".";
  $("#pago-cod").textContent = pedido.id;
  if (pag.status === "analise") {
    $("#pago-tipo").textContent = "Pagamento em análise";
    $("#pago-texto").textContent = "O Mercado Pago está analisando o pagamento. Isso costuma levar poucos minutos, e avisamos pelo WhatsApp assim que for aprovado.";
  } else {
    const como = pag.metodo === "pix" ? "Pix" : `cartão${pag.final ? " final " + pag.final : ""}${pag.parcelas > 1 ? ` em ${pag.parcelas}x` : ""}`;
    $("#pago-tipo").textContent = "Pagamento aprovado";
    $("#pago-texto").textContent = `Recebemos ${brl(pedido.total)} no ${como}. Seu pedido está reservado na unidade de ${nomeUnidade(pedido.unidade)}, e avisamos pelo WhatsApp quando estiver separado para retirada.`;
  }
  f.focus();
}

// desistir do pagamento online: o pedido continua reservado, e paga na unidade
$("#na-retirada").onclick = () => {
  if (!confirm("Seu pedido continua reservado e você paga na unidade, na hora da retirada. Confirmar?")) return;
  clearInterval(espera);
  Store.atualizar("pedidos", pedido.id, { pagamento: { forma: "retirada", status: "na-retirada" } });
  location.href = "loja.html?pedido=" + encodeURIComponent(pedido.id);
};

iniciar();
