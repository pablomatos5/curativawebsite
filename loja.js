// Loja de pronta entrega: escolhe a unidade de retirada, monta a sacola e faz o pedido.
// Pagamento: online (pagamento.html, Pix ou cartão via Mercado Pago) ou na retirada.
// Cartão de produto no padrão da referência: barra "adicionar" que sobe no hover, zoom lento, tilt com brilho, toast.
Store.semear();
const $ = (s) => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lojas = UNIDADES.filter((u) => u.farmacia);
const lerUn = () => { try { return localStorage.getItem("curativa.retirada"); } catch { return null; } };
let unidade = lojas.some((u) => u.id === lerUn()) ? lerUn() : lojas[0].id;
let sacola = Store.ler("carrinho"); // [{ id, variante, qtd }]

$("#retirada").innerHTML = lojas.map((u) => `<option value="${u.id}">${u.nome}</option>`).join("");
$("#retirada").value = unidade;
pilulas($("#retirada"));

const qtdNaSacola = (id) => sacola.filter((i) => i.id === id).reduce((s, i) => s + i.qtd, 0);
const resta = (id) => Store.disponivel(id, unidade) - qtdNaSacola(id);
const salvar = () => { Store.gravar("carrinho", sacola); $("#sacola-n").textContent = sacola.reduce((s, i) => s + i.qtd, 0); };
const ICO_SACOLA = `<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2"/></svg>`;
const ICO_SETA = `<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

// texto e estado da barra de adicionar
function barra(p) {
  const est = Store.disponivel(p.id, unidade);
  if (est === 0) return { txt: "Esgotado nesta unidade", curto: "Esgotado", off: true };
  if (resta(p.id) <= 0) return { txt: "Tudo na sacola", curto: "Na sacola", off: true };
  if (p.variantes) return { txt: "Escolher opção", curto: "Escolher", abrir: true };
  return { txt: "Adicionar à sacola", curto: "Adicionar" };
}

function grade() {
  $("#grade-loja").innerHTML = PRODUTOS.map((p, i) => {
    const est = Store.disponivel(p.id, unidade), b = barra(p);
    return `<article class="produto rv${est === 0 ? " is-out" : ""}" data-tilt style="--i:${i % 4}">
      <span class="glare"></span>
      <div class="produto-pic">
        <img src="${p.img}" alt="${esc(p.nome)}" loading="lazy" style="object-position:${p.pos}">
        <div class="tags"><span class="tag">${est === 0 ? "Esgotado" : est <= 3 ? `Últimas ${est}` : "Pronta entrega"}</span></div>
        <button class="add-bar" type="button" ${b.abrir ? `data-abrir="${p.id}"` : `data-add="${p.id}"`}${b.off ? " disabled" : ""}><span class="add-longo">${b.txt}</span><span class="add-curto">${b.curto}</span>${ICO_SACOLA}</button>
      </div>
      <div class="produto-body">
        <span class="micro">${esc(p.cat)}</span>
        <h3 class="display">${esc(p.nome)}</h3>
        <p class="t-m">${esc(p.desc)}</p>
        <div class="produto-row"><span class="price">${brl(p.preco)}</span><button class="link-r" type="button" data-abrir="${p.id}" aria-label="Detalhes: ${esc(p.nome)}">Detalhes${ICO_SETA}</button></div>
      </div></article>`;
  }).join("");
  observar(); document.querySelectorAll("#grade-loja [data-tilt]").forEach((el) => tilt(el));
}

// ---------- animações do cartão ----------
let io;
function observar() {
  io?.disconnect();
  io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 });
  document.querySelectorAll("#grade-loja .rv").forEach((el) => (grade.vista ? el.classList.add("in") : io.observe(el)));
  grade.vista = true;   // só anima a entrada na primeira vez; depois, redesenhos aparecem direto
}
function tilt(el, max = 5, move = 8) {
  if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const cur = { rx: 0, ry: 0, px: 0, py: 0, gx: 50, gy: 50, go: 0 }, tgt = { ...cur };
  let raf = 0;
  const step = () => {
    let moving = false;
    for (const k in cur) { cur[k] += (tgt[k] - cur[k]) * 0.12; if (Math.abs(tgt[k] - cur[k]) > 0.02) moving = true; }
    el.style.setProperty("--rx", cur.rx.toFixed(2) + "deg"); el.style.setProperty("--ry", cur.ry.toFixed(2) + "deg");
    el.style.setProperty("--px", cur.px.toFixed(2) + "px"); el.style.setProperty("--py", cur.py.toFixed(2) + "px");
    el.style.setProperty("--gx", cur.gx.toFixed(1) + "%"); el.style.setProperty("--gy", cur.gy.toFixed(1) + "%"); el.style.setProperty("--go", cur.go.toFixed(3));
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { raf ||= requestAnimationFrame(step); };
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 2 - 1, y = ((e.clientY - r.top) / r.height) * 2 - 1;
    Object.assign(tgt, { rx: -y * max, ry: x * max, px: -x * move, py: -y * move, gx: (x + 1) * 50, gy: (y + 1) * 50, go: 1 }); kick();
  });
  el.addEventListener("pointerleave", () => { Object.assign(tgt, { rx: 0, ry: 0, px: 0, py: 0, go: 0 }); kick(); });
}
let toastT;
function toast(msg) {
  const t = $("#toast"); $("#toast-msg").textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
}

// ---------- sacola ----------
function desenharSacola() {
  $("#sacola-itens").innerHTML = sacola.length ? sacola.map((it, i) => {
    const p = acha(PRODUTOS, it.id);
    return `<li><img src="${p.img}" alt="" style="object-position:${p.pos}"><div><strong>${esc(p.nome)}</strong>${it.variante ? `<small>${esc(it.variante)}</small>` : ""}<small>${brl(p.preco)} cada</small></div>
      <div class="qtd"><button type="button" data-menos="${i}" aria-label="Diminuir ${esc(p.nome)}">−</button><span aria-live="polite">${it.qtd}</span><button type="button" data-mais="${i}" aria-label="Aumentar ${esc(p.nome)}"${resta(it.id) <= 0 ? " disabled" : ""}>+</button></div>
      <strong class="sub">${brl(p.preco * it.qtd)}</strong></li>`;
  }).join("") : `<li class="vazio-msg" style="display:block">Sua sacola está vazia.</li>`;
  $("#sacola-total").textContent = brl(sacola.reduce((s, i) => s + acha(PRODUTOS, i.id).preco * i.qtd, 0));
  $("#lj-onde").textContent = `Retirada na unidade de ${nomeUnidade(unidade)}. A equipe avisa pelo WhatsApp quando o pedido estiver separado.`;
  $("#lj-finalizar").disabled = !sacola.length;
  $("#lj-finalizar").textContent = formaPag() === "online" ? "Ir para o pagamento" : "Finalizar pedido";
}
const formaPag = () => (document.querySelector('input[name="forma"]:checked') || {}).value || "online";
document.querySelectorAll('input[name="forma"]').forEach((r) => (r.onchange = desenharSacola));
const tudo = () => { salvar(); grade(); desenharSacola(); };

function adicionar(id, variante = "") {
  if (resta(id) <= 0) return false;
  const igual = sacola.find((i) => i.id === id && i.variante === variante);
  igual ? igual.qtd++ : sacola.push({ id, variante, qtd: 1 });
  tudo();
  const n = $("#sacola-n"); n.classList.remove("pulo"); void n.offsetWidth; n.classList.add("pulo");
  toast(`${nomeProduto(id)}${variante ? " · " + variante : ""} na sacola`);
  return true;
}

// se a unidade muda, a sacola respeita o estoque de lá (reduz ou remove o que não tem)
function ajustarAoEstoque() {
  let mudou = false; const visto = {};
  sacola = sacola.map((it) => {
    const livre = Store.disponivel(it.id, unidade) - (visto[it.id] || 0), qtd = Math.min(it.qtd, Math.max(0, livre));
    visto[it.id] = (visto[it.id] || 0) + qtd; if (qtd !== it.qtd) mudou = true;
    return { ...it, qtd };
  }).filter((it) => it.qtd > 0);
  return mudou;
}
$("#retirada").onchange = (e) => {
  unidade = e.target.value; try { localStorage.setItem("curativa.retirada", unidade); } catch {}
  if (ajustarAoEstoque()) toast(`Sacola ajustada ao estoque de ${nomeUnidade(unidade)}`);
  tudo();
};

// ---------- detalhes do produto ----------
function abrirDetalhe(id) {
  const p = acha(PRODUTOS, id), est = Store.disponivel(id, unidade), sobra = resta(id);
  $("#det-img").src = p.img; $("#det-img").alt = p.nome; $("#det-img").style.objectPosition = p.pos;
  $("#det-cat").textContent = p.cat; $("#det-nome").textContent = p.nome; $("#det-desc").textContent = p.desc; $("#det-preco").textContent = brl(p.preco);
  $("#det-estoque").textContent = est === 0 ? `Esgotado em ${nomeUnidade(unidade)}` : `${est} em pronta entrega em ${nomeUnidade(unidade)}`;
  $("#det-var-bloco").hidden = !p.variantes;
  $("#det-var").innerHTML = (p.variantes || []).map((v) => `<option>${esc(v)}</option>`).join("");
  $("#det-var").dataset.cores = (p.cores || []).join(","); pilulas($("#det-var"));
  const b = $("#det-add"); b.dataset.id = id; b.disabled = sobra <= 0; b.textContent = est === 0 ? "Esgotado nesta unidade" : sobra <= 0 ? "Tudo na sacola" : "Adicionar à sacola";
  $("#detalhe").showModal();
}
$("#det-add").onclick = (e) => { const id = e.target.dataset.id; if (adicionar(id, acha(PRODUTOS, id).variantes ? $("#det-var").value : "")) $("#detalhe").close(); };

document.addEventListener("click", (e) => {
  const t = e.target;
  const add = t.closest("[data-add]");
  if (add) {
    if (adicionar(add.dataset.add)) { const b = document.querySelector(`[data-add="${add.dataset.add}"]`); if (b && !b.disabled) { b.classList.add("is-added"); b.querySelector(".add-longo").textContent = "Adicionado"; setTimeout(() => { if (b.isConnected) grade(); }, 1400); } }
    return;
  }
  const ab = t.closest("[data-abrir]");
  if (ab) return abrirDetalhe(ab.dataset.abrir);
  if (t.closest("[data-mais]")) { const it = sacola[+t.closest("[data-mais]").dataset.mais]; if (resta(it.id) > 0) it.qtd++; return tudo(); }
  if (t.closest("[data-menos]")) { const i = +t.closest("[data-menos]").dataset.menos; if (--sacola[i].qtd <= 0) sacola.splice(i, 1); return tudo(); }
  if (t.closest("[data-ver-sacola]")) return abrirSacola();
  if (t.closest("[data-fechar]")) t.closest("dialog").close();
});
function abrirSacola() { $("#toast").classList.remove("show"); $("#sacola-corpo").hidden = false; $("#sacola-feito").hidden = true; $("#lj-erro").textContent = ""; desenharSacola(); $("#sacola").showModal(); }
$("#abrir-sacola").onclick = abrirSacola;

const campoErro = (el, msg) => { el.closest(".campo").querySelector(".erro").textContent = msg; el.setAttribute("aria-invalid", !!msg); return !msg; };
$("#form-loja").addEventListener("submit", (e) => {
  e.preventDefault();
  let ok = campoErro($("#lj-nome"), $("#lj-nome").value.trim().length < 3 ? "Informe seu nome." : "");
  ok = campoErro($("#lj-tel"), $("#lj-tel").value.replace(/\D/g, "").length >= 10 ? "" : "Informe o celular com WhatsApp e DDD.") && ok;
  $("#lj-erro").textContent = $("#lj-aceite").checked ? "" : "É preciso autorizar o uso dos dados para fazer o pedido.";
  if (!ok || !$("#lj-aceite").checked || !sacola.length) return;
  // o estoque pode ter mudado desde que a pessoa abriu a página
  if (ajustarAoEstoque()) { tudo(); $("#lj-erro").textContent = "Algum item acabou enquanto você comprava. Ajustamos a sacola: confira e finalize de novo."; return; }
  const itens = sacola.map((i) => ({ id: i.id, nome: nomeProduto(i.id), variante: i.variante, qtd: i.qtd, preco: acha(PRODUTOS, i.id).preco }));
  const pedido = { id: protocolo("LJ"), tipo: "loja", unidade, itens, total: Math.round(itens.reduce((s, i) => s + i.preco * i.qtd, 0) * 100) / 100, entrega: "retirada", arquivo: "", obs: "",
    nome: $("#lj-nome").value.trim(), telefone: $("#lj-tel").value.trim(), status: "recebido", criado: new Date().toISOString(),
    pagamento: formaPag() === "online" ? { forma: "online", status: "aguardando" } : { forma: "retirada", status: "na-retirada" } };
  Store.add("pedidos", pedido);
  Store.moverEstoque(itens, unidade, -1);   // reserva os itens
  sacola = []; tudo();
  // pagar agora: segue para a página de pagamento do próprio site (o pedido já está reservado)
  if (pedido.pagamento.forma === "online") { location.href = "pagamento.html?pedido=" + encodeURIComponent(pedido.id); return; }
  confirmado(pedido);
});
function confirmado(pedido) {
  $("#lj-quem").textContent = pedido.nome.split(" ")[0] + "."; $("#lj-cod").textContent = pedido.id;
  $("#lj-texto").textContent = `Seu pedido de ${brl(pedido.total)} foi reservado na unidade de ${nomeUnidade(pedido.unidade)}. Pagamento na retirada. A equipe avisa pelo WhatsApp quando estiver separado.`;
  $("#sacola-corpo").hidden = true; $("#sacola-feito").hidden = false;
}

if (ajustarAoEstoque()) salvar();
tudo();
// voltou da página de pagamento escolhendo pagar na retirada: mostra a confirmação do pedido
const voltou = Store.pedidos().find((p) => p.id === new URLSearchParams(location.search).get("pedido") && p.tipo === "loja");
if (voltou) { abrirSacola(); confirmado(voltou); history.replaceState(null, "", "loja.html"); }
