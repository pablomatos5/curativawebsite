// Agendamento online de AVALIAÇÃO (clínica) e pedido com receita (farmácia).
// O cliente não marca procedimento: escolhe a área a avaliar. A secretaria marca o procedimento depois, no painel.
Store.semear();
const $ = (s, el = document) => el.querySelector(s);
const params = new URLSearchParams(location.search);
const valido = (lista, v) => (lista.some((x) => x.id === v) ? v : "");
const estado = { passo: 1, unidade: valido(UNIDADES, params.get("unidade")), ambito: valido(AMBITOS, params.get("a")), data: "", hora: "" };

// ---------- alternar clínica / farmácia ----------
const app = $("#app");
function modo(m) {
  const farm = m === "farmacia";
  app.classList.toggle("theme-farmacia", farm);
  $("#tab-clinica").setAttribute("aria-selected", !farm);
  $("#tab-farmacia").setAttribute("aria-selected", farm);
  $("#fluxo-clinica").hidden = farm;
  $("#fluxo-farmacia").hidden = !farm;
  $("#feito").hidden = true;
  $("#titulo").innerHTML = farm ? "Faça seu <em>pedido.</em>" : "Agende sua <em>avaliação.</em>";
  $("#sub").textContent = farm
    ? "Envie sua receita ou peça um produto da linha Curativa. A equipe responde pelo WhatsApp com valor e prazo."
    : "Tudo começa por uma avaliação. Escolha a unidade, a área que você quer avaliar e o horário.";
}
$("#tab-clinica").onclick = () => modo("clinica");
$("#tab-farmacia").onclick = () => modo("farmacia");

// ---------- opções em cartão ----------
function opcao(nome, valor, rotulo, extra = "", marcado = false, desativado = false) {
  return `<label class="opcao${desativado ? " cheio" : ""}"><input type="radio" name="${nome}" value="${valor}"${marcado ? " checked" : ""}${desativado ? " disabled" : ""}><span>${rotulo}${extra ? `<small>${extra}</small>` : ""}</span></label>`;
}
$("#op-unidade").innerHTML = UNIDADES.filter((u) => u.clinica).map((u) => opcao("unidade", u.id, u.nome, u.end, u.id === estado.unidade)).join("");
$("#op-ambito").innerHTML = AMBITOS.map((a) => opcao("ambito", a.id, a.nome, a.desc, a.id === estado.ambito)).join("");

// próximos dias (sem domingo); só fica clicável o dia em que há profissional da área escalado e com vaga
const dias = [];
for (let i = 0; dias.length < 12; i++) { const d = addDias(hoje(), i); if (d.getDay() !== 0) dias.push(iso(d)); }
function desenharDias() {
  let abertos = 0;
  $("#op-dia").innerHTML = dias.map((d) => {
    const tem = estado.unidade && estado.ambito && Object.keys(Store.livres(estado.unidade, d, estado.ambito)).length > 0;
    const cheio = estado.unidade && Store.lotado(estado.unidade, d);
    if (tem) abertos++;
    return opcao("dia", d, `<b>${d.slice(8)}</b>`, cheio ? "agenda cheia" : `${diaSemana(d)} · ${d.slice(5, 7)}`, d === estado.data && tem, !tem);
  }).join("");
  if (estado.data && !Object.keys(Store.livres(estado.unidade, estado.data, estado.ambito)).length) { estado.data = ""; estado.hora = ""; }
  $("#dia-info").textContent = abertos
    ? `Dias riscados não têm profissional da área ${nomeAmbito(estado.ambito).toLowerCase()} em ${nomeUnidade(estado.unidade)}, ou já estão cheios.`
    : `Não há agenda aberta para ${nomeAmbito(estado.ambito).toLowerCase()} em ${nomeUnidade(estado.unidade)} nos próximos dias. Volte e escolha outra unidade.`;
  desenharHoras();
}
function desenharHoras() {
  if (!estado.data) { $("#op-hora").innerHTML = ""; return; }
  const livres = Store.livres(estado.unidade, estado.data, estado.ambito);
  $("#op-hora").innerHTML = Object.keys(livres).sort().map((h) => opcao("hora", h, h, "", h === estado.hora)).join("");
}

// ---------- resumo ao vivo ----------
function resumo() {
  const set = (id, v) => { const el = $(id); el.textContent = v || "—"; el.classList.toggle("vazio", !v); };
  set("#r-unidade", estado.unidade && nomeUnidade(estado.unidade));
  set("#r-ambito", estado.ambito && nomeAmbito(estado.ambito));
  set("#r-quando", estado.data && `${diaSemana(estado.data)}, ${dataBR(estado.data)}${estado.hora ? " · " + estado.hora : ""}`);
}
$("#form-ag").addEventListener("change", (e) => {
  const { name, value } = e.target;
  if (name === "unidade") { estado.unidade = value; estado.data = estado.hora = ""; }
  if (name === "ambito") { estado.ambito = value; estado.data = estado.hora = ""; }
  if (name === "dia") { estado.data = value; estado.hora = ""; desenharHoras(); }
  if (name === "hora") estado.hora = value;
  resumo();
});
resumo();

// ---------- navegação entre passos ----------
const btnVoltar = $("#ag-voltar"), btnAvancar = $("#ag-avancar");
function irPara(n) {
  estado.passo = n;
  if (n === 3) desenharDias();
  document.querySelectorAll(".passo").forEach((p) => (p.hidden = +p.dataset.passo !== n));
  document.querySelectorAll(".passos li").forEach((li, i) => { li.classList.toggle("on", i + 1 === n); li.classList.toggle("ok", i + 1 < n); });
  btnVoltar.hidden = n === 1;
  btnAvancar.textContent = n === 4 ? "Confirmar avaliação" : "Continuar →";
  const foco = $(`.passo[data-passo="${n}"] input:not([disabled])`);
  if (foco) foco.focus({ preventScroll: true });
}
function erro(input, msg) { const e = input.closest(".campo")?.querySelector(".erro"); if (e) e.textContent = msg; input.setAttribute("aria-invalid", !!msg); return !msg; }
const telOk = (v) => v.replace(/\D/g, "").length >= 10;

function validarPasso(n) {
  if (n === 1 && !estado.unidade) return alerta("Escolha uma unidade.");
  if (n === 2 && !estado.ambito) return alerta("Escolha o que você quer avaliar.");
  if (n === 3 && !(estado.data && estado.hora)) return alerta("Escolha o dia e o horário.");
  if (n === 4) {
    let ok = erro($("#ag-nome"), $("#ag-nome").value.trim().length < 3 ? "Informe seu nome." : "");
    ok = erro($("#ag-tel"), telOk($("#ag-tel").value) ? "" : "Informe o celular com WhatsApp e DDD.") && ok;
    const em = $("#ag-email"); ok = erro(em, em.value && !em.checkValidity() ? "E-mail inválido." : "") && ok;
    $("#ag-erro-aceite").textContent = $("#ag-aceite").checked ? "" : "É preciso autorizar o uso dos dados para agendar.";
    return ok && $("#ag-aceite").checked;
  }
  return true;
}
function alerta(msg) {
  let el = $(`.passo[data-passo="${estado.passo}"] .aviso-erro`);
  if (!el) { el = document.createElement("p"); el.className = "aviso aviso-erro"; el.setAttribute("role", "alert"); $(`.passo[data-passo="${estado.passo}"]`).append(el); }
  el.textContent = msg; return false;
}
btnVoltar.onclick = () => irPara(estado.passo - 1);
btnAvancar.onclick = () => {
  document.querySelectorAll(".aviso-erro").forEach((e) => (e.textContent = ""));
  if (!validarPasso(estado.passo)) return;
  if (estado.passo < 4) return irPara(estado.passo + 1);
  // a vaga pode ter sido tomada enquanto a pessoa preenchia: confere de novo
  if (!Store.livres(estado.unidade, estado.data, estado.ambito)[estado.hora]) { estado.hora = ""; irPara(3); resumo(); return alerta("Esse horário acabou de ser ocupado. Escolha outro."); }
  const ag = {
    // prof fica vazio: quem define o profissional da avaliação é a secretaria, no painel
    id: protocolo("AG"), canal: "site", tipo: "avaliacao", ambito: estado.ambito, procedimento: "", unidade: estado.unidade, data: estado.data, hora: estado.hora, prof: "",
    nome: $("#ag-nome").value.trim(), telefone: $("#ag-tel").value.trim(), email: $("#ag-email").value.trim(),
    obs: $("#ag-obs").value.trim(), status: "pendente", criado: new Date().toISOString(),
  };
  Store.add("agendamentos", ag);
  concluir("Avaliação solicitada", ag.nome, `Avaliação ${nomeAmbito(ag.ambito).toLowerCase()} em ${nomeUnidade(ag.unidade)}, ${diaSemana(ag.data)} ${dataBR(ag.data)} às ${ag.hora}. A equipe confirma pelo WhatsApp e define o profissional que vai atender você. Se houver indicação de procedimento, ele é marcado depois, direto com a clínica.`, ag.id,
    "Guarde este código. Se precisar remarcar ou cancelar, informe-o à clínica: com ele a equipe encontra o seu agendamento na hora.");
};
irPara(1);

// ---------- farmácia ----------
$("#pd-unidade").innerHTML = UNIDADES.filter((u) => u.farmacia).map((u) => `<option value="${u.id}">${u.nome}</option>`).join("");
const tipo = $("#pd-tipo");
const ajustaTipo = () => {
  const formula = tipo.value === "formula";
  $("#bloco-receita").hidden = !formula;
  $("#pd-obs-rotulo").textContent = formula ? "Observações (opcional)" : "Quais produtos e quantidades?";
  // fórmula com receita: a original precisa ser apresentada na retirada (ou a quem entregar)
  $("#bloco-ciente").hidden = !formula;
  const entrega = $("#pd-entrega").value === "entrega";
  $("#pd-ciente-quando").textContent = entrega ? "Na hora de receber a entrega" : "No ato da retirada";
  $("#pd-ciente-txt").textContent = `Estou ciente de que devo apresentar a receita original ${entrega ? "ao receber a entrega" : "no ato da retirada"}.`;
};
tipo.onchange = ajustaTipo; $("#pd-entrega").addEventListener("change", ajustaTipo); ajustaTipo();
["#pd-unidade", "#pd-tipo", "#pd-entrega"].forEach((id) => pilulas($(id)));

$("#form-ped").addEventListener("submit", (e) => {
  e.preventDefault();
  const formula = tipo.value === "formula";
  const arq = $("#pd-arquivo").files[0];
  let ok = erro($("#pd-nome"), $("#pd-nome").value.trim().length < 3 ? "Informe seu nome." : "");
  ok = erro($("#pd-tel"), telOk($("#pd-tel").value) ? "" : "Informe o celular com WhatsApp e DDD.") && ok;
  ok = erro($("#pd-arquivo"), formula && !arq ? "Anexe a foto ou o PDF da receita." : "") && ok;
  ok = erro($("#pd-obs"), !formula && !$("#pd-obs").value.trim() ? "Diga quais produtos você quer." : "") && ok;
  $("#pd-erro-ciente").textContent = formula && !$("#pd-ciente").checked ? "Confirme que está ciente de que a receita original é obrigatória." : "";
  if (formula && !$("#pd-ciente").checked) ok = false;
  $("#pd-erro-aceite").textContent = $("#pd-aceite").checked ? "" : "É preciso autorizar o uso dos dados para enviar o pedido.";
  if (!ok || !$("#pd-aceite").checked) return;
  const p = {
    id: protocolo("PD"), unidade: $("#pd-unidade").value, tipo: tipo.value, arquivo: formula && arq ? arq.name : "",
    entrega: $("#pd-entrega").value, nome: $("#pd-nome").value.trim(), telefone: $("#pd-tel").value.trim(),
    obs: $("#pd-obs").value.trim(), status: "recebido", criado: new Date().toISOString(), cienteReceita: formula,
  };
  Store.add("pedidos", p);
  const lembrete = formula ? ` Lembre-se: a receita original é obrigatória ${p.entrega === "entrega" ? "ao receber a entrega" : "no ato da retirada"}.` : "";
  concluir("Pedido enviado", p.nome, `Seu pedido para a unidade de ${nomeUnidade(p.unidade)} foi recebido. A equipe confere ${formula ? "a receita" : "o pedido"} e retorna pelo WhatsApp com valor e prazo.${lembrete}`, p.id,
    "Guarde este código. Informe-o ao falar com a farmácia e na retirada: com ele a equipe encontra o seu pedido na hora.");
});

function concluir(tipoTxt, nome, texto, cod, dica) {
  $("#fluxo-clinica").hidden = true; $("#fluxo-farmacia").hidden = true;
  $("#feito-tipo").textContent = tipoTxt;
  $("#feito-nome").textContent = nome.split(" ")[0] + ".";
  $("#feito-texto").textContent = texto;
  $("#feito-cod").textContent = cod;
  $("#feito-dica").textContent = dica;
  const f = $("#feito"); f.hidden = false; f.focus(); f.scrollIntoView({ behavior: "smooth", block: "center" });
}

if (params.get("modo") === "farmacia") modo("farmacia");
