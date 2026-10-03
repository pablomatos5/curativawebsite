// Painel administrativo (protótipo). Lê e altera os mesmos dados que agendar.html grava.
Store.semear();
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let dia = iso(hoje());

// ---------- entrada de demonstração (sem segurança real; o sistema final usa login no servidor) ----------
const logado = () => { try { return sessionStorage.getItem("curativa.adm") === "1"; } catch { return false; } };
function mostrar() {
  const ok = logado();
  $("#entrada").hidden = ok; $("#painel").hidden = !ok; $("#sair").hidden = !ok;
  if (ok) tudo();
}
$("#entrar").onclick = () => { try { sessionStorage.setItem("curativa.adm", "1"); } catch {} mostrar(); };
$("#sair").onclick = () => { try { sessionStorage.removeItem("curativa.adm"); } catch {} mostrar(); };

// ---------- filtros e abas ----------
const optUnidades = UNIDADES.map((u) => `<option value="${u.id}">${u.nome}</option>`).join("");
// unidade: pílulas coloridas no topo (o <select> continua por baixo). Lembra a última escolha neste aparelho;
// no sistema real, a unidade vem do login de cada funcionário.
$("#f-unidade").innerHTML = `<option value="">Todas</option>` + optUnidades;
$("#f-unidade").dataset.cores = ["#8f958c", ...UNIDADES.map((u) => u.cor)].join(",");
$("#f-unidade").value = (() => { try { const v = localStorage.getItem("curativa.adm.unidade"); return v !== null && (v === "" || UNIDADES.some((u) => u.id === v)) ? v : "cameta"; } catch { return "cameta"; } })();
pilulas($("#f-unidade"));
$("#f-unidade").addEventListener("change", () => { try { localStorage.setItem("curativa.adm.unidade", unidadeSel()); } catch {} });
const corUn = (id) => acha(UNIDADES, id).cor || "#8f958c";
// etiqueta colorida com o nome da unidade (aparece na visão "Todas")
const tagUn = (id) => `<span class="un-tag" style="--c:${corUn(id)}">${esc(nomeUnidade(id))}</span>`;
$("#f-status").innerHTML += Object.entries(STATUS_AG).map(([k, v]) => `<option value="${k}">${v}</option>`).join("") + `<option value="atencao">Precisam de atenção</option>`;
["#f-unidade", "#f-status", "#f-tipo"].forEach((s) => ($(s).onchange = tudo));
$("#f-busca").oninput = tudo;
const unidadeSel = () => $("#f-unidade").value;
const filtroUnidade = (x) => !unidadeSel() || x.unidade === unidadeSel();
const abrirAba = (nome) => {
  if ($(`.abas button[data-aba="${nome}"]`).hidden) nome = "agenda"; // aba escondida (unidade sem farmácia) não abre
  $$(".abas button").forEach((x) => x.setAttribute("aria-selected", x.dataset.aba === nome));
  $$(".aba").forEach((s) => (s.hidden = s.dataset.aba !== nome));
};
$$(".abas button").forEach((b) => (b.onclick = () => abrirAba(b.dataset.aba)));
const agPorId = (id) => Store.agendamentos().find((a) => a.id === id);
// atendimentos em aberto de um profissional que ainda vão acontecer (para avisar antes de mexer na escala)
const futurosDe = (prof, filtro) => Store.agendamentos().filter((a) => a.prof === prof && emAberto(a) && !passou(a.data, a.hora) && filtro(a))
  .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
const listaCurta = (ag) => ag.slice(0, 8).map((a) => `• ${dataBR(a.data)} ${a.hora} · ${a.nome}`).join("\n") + (ag.length > 8 ? `\n… e mais ${ag.length - 8}` : "");

// ---------- ações sobre agendamentos ----------
const acoesAg = (a) => {
  const id = esc(a.id);
  const b = (st, txt, cls = "") => `<button class="mini ${cls}" data-id="${id}" data-st="${st}">${txt}</button>`;
  const remarcar = `<button class="mini" data-remarcar="${id}">Remarcar</button>`;
  const cancelar = `<button class="mini perigo" data-cancelar="${id}">Cancelar</button>`;
  const marcar = a.tipo !== "procedimento" && !a.gerou ? `<button class="mini" data-marcar="${id}">Marcar procedimento</button>` : "";
  if (a.status === "pendente") {
    // avaliação que veio do site: a secretaria escolhe o profissional (entre os da área, em escala e livres) e isso confirma
    if (!a.prof) {
      const livres = Store.profsLivres(a.unidade, a.data, a.ambito, a.hora, a.id);
      const sel = livres.length
        ? `<select class="ctl" data-atribuir="${id}" aria-label="Definir profissional para ${esc(a.nome)}"><option value="">Definir profissional…</option>${livres.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("")}</select>`
        : "";
      return [sel, remarcar, cancelar].filter(Boolean).join(" ");
    }
    const outros = Store.profsLivres(a.unidade, a.data, a.ambito, a.hora, a.id).filter((p) => p.id !== a.prof);
    const trocar = outros.length ? `<select class="ctl" data-trocar="${id}" aria-label="Trocar o profissional de ${esc(a.nome)}"><option value="">Trocar profissional…</option>${outros.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("")}</select>` : "";
    return [Store.problema(a) ? "" : b("confirmado", "Confirmar"), trocar, remarcar, cancelar].filter(Boolean).join(" ");
  }
  if (a.status === "confirmado") return [b("concluido", "Concluir"), a.data <= iso(hoje()) ? b("faltou", "Faltou") : "", remarcar, cancelar].filter(Boolean).join(" ");
  if (a.status === "concluido") return marcar;
  if (a.status === "faltou") return a.remarcadoPara ? "" : `<button class="mini" data-nova-data="${id}">Nova data</button>`;
  if (a.status === "cancelado") return `<button class="mini" data-reabrir="${id}">Reabrir</button>`;
  return "";
};
document.addEventListener("click", (e) => {
  const t = e.target;
  const st = t.closest("button[data-st]");
  if (st) { Store.atualizar("agendamentos", st.dataset.id, { status: st.dataset.st }); return tudo(); }
  const m = t.closest("button[data-marcar]");
  if (m) return abrirNovo(agPorId(m.dataset.marcar));
  const rm = t.closest("button[data-remarcar]");
  if (rm) return abrirRemarcar(agPorId(rm.dataset.remarcar), false);
  const nd = t.closest("button[data-nova-data]");
  if (nd) return abrirRemarcar(agPorId(nd.dataset.novaData), true);
  const cn = t.closest("button[data-cancelar]");
  if (cn) return abrirCancelar(agPorId(cn.dataset.cancelar));
  const ra = t.closest("button[data-reabrir]");
  if (ra) {
    // só volta para o mesmo horário se ele ainda existir e estiver livre; senão, escolhe outro
    const a = agPorId(ra.dataset.reabrir);
    if (Store.cabe(a, a)) { Store.atualizar("agendamentos", a.id, { status: "pendente", motivo: "" }); return tudo(); }
    if (confirm(`O horário de ${a.nome} (${dataBR(a.data)} às ${a.hora}) já passou ou foi ocupado por outra pessoa.\n\nEscolher uma nova data?`)) abrirRemarcar(a, false);
    return;
  }
  const nd2 = t.closest("button[data-novo-dia]");
  if (nd2) return abrirNovo(null, null, nd2.dataset.novoDia);
  const lv = t.closest("button[data-livre]");
  if (lv) { const [prof, hora] = lv.dataset.livre.split("|"); return abrirNovo(null, { prof, hora }); }
  if (t.closest("#ver-atencao")) { $("#f-status").value = "atencao"; abrirAba("lista"); return tudo(); }
  const rem = t.closest("button[data-rem-esc]");
  if (rem) return abrirTirar(Store.escalas().find((x) => x.id === rem.dataset.remEsc), rem.dataset.data);
  const vt = t.closest("button[data-volta]");
  if (vt) {
    // desfaz uma folga pontual: o turno volta naquele dia (se não cruzar com outra escala dele)
    const [id, data] = vt.dataset.volta.split("|"), e2 = Store.escalas().find((x) => x.id === id);
    const devolvido = { ...e2, folgas: (e2.folgas || []).filter((d) => d !== data) };
    if (conflitoEscala(devolvido, id, [data])) return alert("Nesse dia este profissional já tem outro turno que cruza com este horário.");
    Store.atualizar("escalas", id, { folgas: devolvido.folgas });
    return tudo();
  }
  const rf = t.closest("button[data-rem-folga]");
  if (rf) {
    const b = Store.bloqueios().find((x) => x.id === rf.dataset.remFolga);
    if (confirm(`Tirar ${b.motivo.toLowerCase()} de ${Store.nomeProf(b.prof)} (${dataBR(b.de)} a ${dataBR(b.ate)})? Ele volta a atender pela escala nesses dias.`)) { Store.remover("bloqueios", b.id); tudo(); }
    return;
  }
  const ed = t.closest("button[data-prof]");
  if (ed) return abrirProf(Store.profissionais().find((p) => p.id === ed.dataset.prof));
  if (t.closest("[data-fechar]")) t.closest("dialog").close();
});
document.addEventListener("change", (e) => {
  if (e.target.matches("select[data-trocar]") && e.target.value) {
    const a = agPorId(e.target.dataset.trocar);
    if (!Store.candidatos(a.unidade, a.data, a.hora, a.ambito, a.id).some((p) => p.id === e.target.value)) { alert("Esse profissional acabou de ser ocupado nesse horário. Escolha outro."); return tudo(); }
    Store.atualizar("agendamentos", a.id, { prof: e.target.value, auto: false });
    return tudo();
  }
  if (e.target.matches("select[data-atribuir]") && e.target.value) {
    const a = agPorId(e.target.dataset.atribuir);
    if (!Store.candidatos(a.unidade, a.data, a.hora, a.ambito, a.id).some((p) => p.id === e.target.value)) { alert("Esse profissional acabou de ser ocupado nesse horário. Escolha outro."); return tudo(); }
    Store.atualizar("agendamentos", a.id, { prof: e.target.value, status: "confirmado" });
    return tudo();
  }
  if (e.target.matches("input[data-auto]")) { Store.definirAutoProf(e.target.dataset.auto, e.target.checked); return tudo(); }
  if (e.target.matches("input[data-lim]")) {
    const [un, d] = e.target.dataset.lim.split("|"), v = e.target.value.trim();
    Store.definirLimite(un, +d, v === "" ? null : Math.max(0, Math.floor(+v) || 0));
    return tudo();
  }
  if (e.target.matches("input[data-est]")) {
    const [id, un] = e.target.dataset.est.split("|");
    Store.definirEstoque(id, un, +e.target.value);
    return tudo();
  }
  if (!e.target.matches("select[data-pedido]")) return;
  const ped = Store.pedidos().find((p) => p.id === e.target.dataset.pedido), novo = e.target.value;
  // pedido já pago online: cancelar aqui não devolve o dinheiro, o estorno é feito no painel do Mercado Pago
  if (novo === "cancelado" && ped.pagamento?.status === "aprovado" && !ped.pagamento.demo && !confirm(`O pedido ${ped.id} já foi pago online. Cancelar aqui NÃO devolve o dinheiro: faça o estorno no painel do Mercado Pago. Cancelar mesmo assim?`)) return tudo();
  // pedido da loja reserva estoque: cancelar devolve os itens, reabrir reserva de novo (se ainda houver)
  if (ped.tipo === "loja" && (ped.status === "cancelado") !== (novo === "cancelado")) {
    if (novo === "cancelado") Store.moverEstoque(ped.itens, ped.unidade, +1);
    else if (ped.itens.every((it) => Store.disponivel(it.id, ped.unidade) >= it.qtd)) Store.moverEstoque(ped.itens, ped.unidade, -1);
    else { alert("Não há estoque suficiente para reabrir este pedido."); return tudo(); }
  }
  Store.atualizar("pedidos", ped.id, { status: novo });
  tudo();
});

// ---------- desenho ----------
function kpis(ag, ped) {
  const h = iso(hoje());
  $("#k-hoje").textContent = ag.filter((a) => a.data === h && a.status !== "cancelado").length;
  $("#k-pend").textContent = ag.filter((a) => a.tipo !== "procedimento" && a.status === "pendente").length;
  $("#k-marcar").textContent = ag.filter((a) => a.tipo !== "procedimento" && a.status === "concluido" && !a.gerou).length;
  $("#k-ped").textContent = ped.filter((p) => !["entregue", "cancelado"].includes(p.status)).length;
}

// card de um atendimento; `ver` diz o que mostrar na linha de detalhes (na agenda por coluna o profissional já está no topo)
function cartao(a, ver = {}) {
  const prob = Store.problema(a);
  const det = (ver.unidade ? tagUn(a.unidade) + " " : "") + [rotuloAg(a), ver.prof !== false && Store.nomeProf(a.prof), a.telefone, a.obs].filter(Boolean).map(esc).join(" · ");
  const hist = [a.auto && a.prof && "Profissional definido automaticamente", a.status === "cancelado" && a.motivo && "Motivo: " + a.motivo, a.antes && "Remarcado · antes " + a.antes, a.remarcadoDe && "Nova data depois de uma falta"]
    .filter(Boolean).map(esc).join(" · ");
  return `<div class="marcado st-${a.status}${a.tipo === "procedimento" ? " proc" : ""}${prob ? " atencao" : ""}">
    <div><strong>${esc(a.nome)}</strong> <span class="selo ${a.status}">${STATUS_AG[a.status]}</span>${prob ? ` <span class="selo atencao">${esc(prob)}</span>` : ""}
    <small>${det}</small>${hist ? `<small class="hist">${hist}</small>` : ""}</div>
    <div class="acoes-ag">${acoesAg(a)}</div></div>`;
}
function agenda(ag) {
  $("#d-txt").textContent = `${diaSemana(dia)}, ${dataBR(dia)}`;
  const doDia = ag.filter((a) => a.data === dia).sort((a, b) => a.hora.localeCompare(b.hora));
  const u = unidadeSel();
  $("#grade-dica").hidden = true;
  $("#uso-dia").hidden = !u;
  if (u) $("#uso-dia").innerHTML = usoTxt(u, dia);
  if (!u) {
    $("#plantao").innerHTML = "";
    $("#grade").className = "grade";
    $("#grade").innerHTML = doDia.length ? doDia.map((a) => `<div class="linha"><time>${a.hora}</time><div>${cartao(a, { unidade: true })}</div></div>`).join("") : `<p class="vazio-msg">Nenhum atendimento neste dia.</p>`;
    return;
  }
  // uma coluna por profissional em escala, mais quem tem atendimento no dia sem estar na escala e as avaliações "a definir"
  const plantao = Store.emEscala(u, dia);
  const cols = plantao.map(({ prof, horas }) => ({ id: prof.id, prof, horas }));
  doDia.forEach((a) => { if (a.prof && !cols.some((c) => c.id === a.prof)) cols.push({ id: a.prof, prof: acha(Store.profissionais(), a.prof), horas: [], fora: true }); });
  if (doDia.some((a) => !a.prof)) cols.push({ id: "", prof: null, horas: [] });
  $("#plantao").innerHTML = plantao.length ? "" : `<span class="rotulo">Em escala</span><span class="chip vazio">Ninguém escalado neste dia em ${esc(nomeUnidade(u))}</span>`;
  const horas = new Set(doDia.map((a) => a.hora)); plantao.forEach((p) => p.horas.forEach((h) => horas.add(h)));
  if (!horas.size) { $("#grade").className = "grade"; $("#grade").innerHTML = `<p class="vazio-msg">Sem escala e sem atendimentos neste dia.</p>`; return; }

  const cab = (c) => c.prof
    ? `<div class="cab"><b>${esc(c.prof.nome || Store.nomeProf(c.id))}</b><small>${c.fora ? "Fora da escala hoje" : `${(c.prof.ambitos || []).map(nomeAmbito).join(", ")} · ${c.horas[0]}–${fimDe(c.horas)}`}</small></div>`
    : `<div class="cab"><b>A definir</b><small>Avaliações do site sem profissional</small></div>`;
  const celula = (c, h) => {
    const itens = doDia.filter((a) => a.hora === h && (a.prof || "") === c.id);
    const ocupado = itens.some((a) => a.status !== "cancelado");
    let livre = "";
    if (c.prof && !ocupado && c.horas.includes(h))
      livre = passou(dia, h) ? `<div class="vaga passada">—</div>`
        : `<button class="vaga" data-livre="${esc(c.id)}|${h}" aria-label="Agendar com ${esc(c.prof.nome)} às ${h}">Livre<span>+ agendar</span></button>`;
    const conteudo = itens.map((a) => cartao(a, { prof: false })).join("") + livre;
    return `<div class="pilha${conteudo ? "" : " fora"}">${conteudo}</div>`;
  };
  const g = $("#grade");
  g.className = "grade-prof";
  g.style.setProperty("--cols", cols.length);
  g.innerHTML = `<div class="canto"></div>${cols.map(cab).join("")}` +
    [...horas].sort().map((h) => `<time>${h}</time>${cols.map((c) => celula(c, h)).join("")}`).join("");
  $("#grade-dica").hidden = !plantao.length;
}
// fim do turno = último horário + 30 min
const fimDe = (horas) => { const [h, m] = horas[horas.length - 1].split(":").map(Number); const t = h * 60 + m + 30; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };

// ---------- período da lista de agendamentos ----------
let pData = iso(hoje());
const sabadoDe = (d) => iso(addDias(new Date(segundaDe(d) + "T12:00"), 5));
const nomeDia = (d) => `${diaSemana(d)}, ${dataBR(d).slice(0, 5)}`;
function noPeriodo(a) {
  const p = $("#f-periodo").value;
  if (p === "dia") return a.data === pData;
  if (p === "semana") return a.data >= segundaDe(pData) && a.data <= sabadoDe(pData);
  if (p === "proximos") return a.data >= iso(hoje());
  return true;
}
function periodoTopo() {
  const p = $("#f-periodo").value, navega = p === "dia" || p === "semana";
  $("#p-ant").hidden = $("#p-prox").hidden = !navega;
  $("#p-txt").textContent = p === "dia" ? nomeDia(pData) : p === "semana" ? `Semana de ${dataBR(segundaDe(pData)).slice(0, 5)} a ${dataBR(sabadoDe(pData)).slice(0, 5)}` : p === "proximos" ? "De hoje em diante" : "Todas as datas";
  $("#p-data").value = pData;
  $("#p-hoje").hidden = p === "dia" ? pData === iso(hoje()) : p === "semana" ? segundaDe(pData) === segundaDe(iso(hoje())) : true;
  const alvo = pData < iso(hoje()) ? iso(hoje()) : pData;
  $("#p-novo-dia").textContent = nomeDia(alvo);
}
const passoPer = (n) => { pData = iso(addDias(new Date(pData + "T12:00"), n * ($("#f-periodo").value === "semana" ? 7 : 1))); tudo(); };
$("#p-ant").onclick = () => passoPer(-1);
$("#p-prox").onclick = () => passoPer(1);
$("#p-hoje").onclick = () => { pData = iso(hoje()); tudo(); };
$("#p-data").onchange = () => { if ($("#p-data").value) { pData = $("#p-data").value; tudo(); } };
$("#f-periodo").onchange = tudo;
pilulas($("#f-periodo"));
$("#p-novo").onclick = () => abrirNovo(null, null, pData < iso(hoje()) ? iso(hoje()) : pData);

function lista(ag) {
  const st = $("#f-status").value, tp = $("#f-tipo").value, q = $("#f-busca").value.trim().toLowerCase();
  periodoTopo();
  $("#per-aviso").hidden = !q;
  // com busca, procura em todas as datas (quem busca um nome raramente sabe o dia)
  const rows = ag.filter((a) => (q || noPeriodo(a)) && (!st || (st === "atencao" ? Store.problema(a) : a.status === st)) && (!tp || (a.tipo || "avaliacao") === tp))
    .filter((a) => !q || [a.nome, a.telefone, a.id].some((v) => String(v).toLowerCase().includes(q)))
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  // agrupa por dia: cabeçalho com a data, a contagem e um atalho para agendar naquele dia
  const futuro = (d) => d >= iso(hoje());
  const cab = (d, n) => `<tr class="dia-sep${d === iso(hoje()) ? " hoje" : ""}"><td colspan="7"><div><strong>${nomeDia(d)}</strong>${d === iso(hoje()) ? ` <span class="selo confirmado">Hoje</span>` : ""}
    <small>${n ? `${n} atendimento${n === 1 ? "" : "s"}` : "nenhum atendimento"}</small>${futuro(d) ? `<button class="mini" data-novo-dia="${d}">+ Agendar</button>` : ""}</div></td></tr>`;
  // na semana e no dia, mostra também os dias sem nada (com o atalho para agendar)
  const p = $("#f-periodo").value, dias = !q && p === "semana" ? [0, 1, 2, 3, 4, 5].map((i) => iso(addDias(new Date(segundaDe(pData) + "T12:00"), i))) : !q && p === "dia" ? [pData] : [...new Set(rows.map((a) => a.data))];
  const linha = (a) => `<tr>
    <td>${a.hora}</td><td>${tagUn(a.unidade)}</td><td>${esc(rotuloAg(a))}</td><td>${esc(Store.nomeProf(a.prof))}${a.auto && a.prof ? `<br><small class="auto-tag">automático</small>` : ""}</td>
    <td>${esc(a.nome)}<br><small style="color:var(--fg-faint)">${esc(a.telefone)} · <code>${esc(a.id)}</code></small></td>
    <td><span class="selo ${a.status}">${STATUS_AG[a.status]}</span>${Store.problema(a) ? `<br><span class="selo atencao" style="margin-top:.3rem">${esc(Store.problema(a))}</span>` : ""}${a.status === "cancelado" && a.motivo ? `<br><small style="color:var(--fg-faint)">${esc(a.motivo)}</small>` : ""}</td>
    <td><div class="acoes-ag">${acoesAg(a)}</div></td></tr>`;
  const html = dias.map((d) => { const doDia = rows.filter((a) => a.data === d); return cab(d, doDia.length) + doDia.map(linha).join(""); }).join("");
  $("#t-ag").innerHTML = html || `<tr><td colspan="7" class="vazio-msg">Nada encontrado.</td></tr>`;
}

// ---------- escalas por semana ----------
let semana = segundaDe(iso(hoje())); // segunda-feira da semana mostrada na aba Escalas
const diasDaSemana = () => [0, 1, 2, 3, 4, 5].map((i) => iso(addDias(new Date(semana + "T12:00"), i)));
const curta = (data) => dataBR(data).slice(0, 5);

function escalas() {
  const u = unidadeSel(), datas = diasDaSemana(), hojeIso = iso(hoje()), bloq = Store.bloqueios();
  const todas = Store.escalas().filter((e) => !u || e.unidade === u);
  $("#s-txt").textContent = `Semana de ${curta(datas[0])} a ${curta(datas[5])}`;
  $("#s-hoje").hidden = semana === segundaDe(hojeIso);
  $("#h-esc").innerHTML = `<tr><th>Profissional</th>${datas.map((d) => `<th class="${d === hojeIso ? "hoje" : ""}">${DIAS[numDia(d)]} <b>${curta(d)}</b>${u ? `<small class="uso">${usoTxt(u, d, true)}</small>` : ""}</th>`).join("")}</tr>`;
  $("#t-esc").innerHTML = Store.profissionais().map((p) => {
    const cel = (data) => {
      const passado = data < hojeIso;
      const folga = Store.deFolga(p.id, data, bloq);
      if (folga) return `<span class="turno off" title="${esc(folga.motivo)} de ${curta(folga.de)} a ${curta(folga.ate)}">${esc(folga.motivo)}<small>até ${curta(folga.ate)}</small>${passado ? "" : `<button data-rem-folga="${esc(folga.id)}" aria-label="Tirar ${esc(folga.motivo)} de ${esc(p.nome)}">×</button>`}</span>`;
      const doDia = todas.filter((e) => e.prof === p.id && e.dias.includes(numDia(data)) && (!e.de || data >= e.de) && (!e.ate || data <= e.ate))
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
      return doDia.map((e) => {
        const onde = u ? "" : `<small class="un-ponto" style="--c:${corUn(e.unidade)}">${esc(nomeUnidade(e.unidade))}</small>`;
        if ((e.folgas || []).includes(data))
          return `<span class="turno off">Folga<small>${e.inicio}–${e.fim}</small>${passado ? "" : `<button data-volta="${esc(e.id)}|${data}" aria-label="Devolver o turno de ${esc(p.nome)} em ${curta(data)}" title="Devolver o turno">↺</button>`}</span>`;
        return `<span class="turno${e.ate ? " temp" : ""}">${e.inicio}–${e.fim}${onde}${e.ate ? `<small>até ${curta(e.ate)}</small>` : ""}${passado ? "" : `<button data-rem-esc="${esc(e.id)}" data-data="${data}" aria-label="Tirar o turno de ${esc(p.nome)} em ${curta(data)}">×</button>`}</span>`;
      }).join("") || `<span class="folga">—</span>`;
    };
    return `<tr class="${p.ativo === false ? "inativo" : ""}"><td class="quem"><strong>${esc(p.nome)}</strong>${p.ativo === false ? ` <span class="selo cancelado">Inativo</span>` : ""}
        <span class="areas">${p.ambitos.map((a) => `<span class="selo confirmado">${esc(nomeAmbito(a))}</span>`).join("")}</span>
        <button class="link-sub editar" data-prof="${esc(p.id)}" aria-label="Editar ${esc(p.nome)}">Editar</button></td>
      ${datas.map((d) => `<td class="${d < hojeIso ? "passado" : d === hojeIso ? "hoje" : ""}">${cel(d)}</td>`).join("")}</tr>`;
  }).join("") || `<tr><td colspan="7" class="vazio-msg">Nenhum profissional cadastrado.</td></tr>`;
}
$("#s-ant").onclick = () => { semana = iso(addDias(new Date(semana + "T12:00"), -7)); escalas(); };
$("#s-prox").onclick = () => { semana = iso(addDias(new Date(semana + "T12:00"), 7)); escalas(); };
$("#s-hoje").onclick = () => { semana = segundaDe(iso(hoje())); escalas(); };

// Duas escalas do mesmo profissional cruzam? Mesmo dia valendo para as duas e horários sobrepostos.
// Com alguma das duas tendo fim, confere dia a dia (assim uma folga pontual libera a troca de unidade naquela semana).
function conflitoEscala(nova, ignorar, soDatas) {
  return Store.escalas().some((x) => {
    if (x.id === ignorar || x.prof !== nova.prof || !(nova.inicio < x.fim && x.inicio < nova.fim) || !x.dias.some((d) => nova.dias.includes(d))) return false;
    const de = [nova.de, x.de].filter(Boolean).sort().pop() || iso(hoje());
    const fins = [nova.ate, x.ate].filter(Boolean).sort();
    if (!fins.length && !soDatas) return true; // as duas valem para sempre
    const datas = soDatas || [];
    if (!soDatas) for (let d = de; d <= fins[0]; d = iso(addDias(new Date(d + "T12:00"), 1))) datas.push(d);
    return datas.some((d) => escalaVale(nova, d) && escalaVale(x, d));
  });
}

// Aplica uma mudança de escala ou folga. Se ela deixar atendimentos já marcados sem profissional, mostra quais e deixa desistir.
function mudarEscala(aplicar, oque) {
  const antes = { escalas: Store.ler("escalas"), bloqueios: Store.ler("bloqueios") };
  const okAntes = new Set(Store.agendamentos().filter((a) => emAberto(a) && !passou(a.data, a.hora) && !Store.problema(a)).map((a) => a.id));
  aplicar();
  const afetados = Store.agendamentos().filter((a) => okAntes.has(a.id) && Store.problema(a)).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  if (afetados.length && !confirm(`${oque} afeta ${afetados.length} atendimento(s) já marcado(s):\n\n${listaCurta(afetados)}\n\nEles vão aparecer no topo do painel para a secretaria remarcar. Continuar?`)) {
    Store.gravar("escalas", antes.escalas); Store.gravar("bloqueios", antes.bloqueios);
    return false;
  }
  tudo();
  return true;
}

// tirar turno: só naquele dia (vira folga pontual) ou aquele dia da semana daqui em diante
let tirarAlvo = null;
function abrirTirar(e, data) {
  tirarAlvo = { e, data };
  const nomeDia = { 1: "segunda", 2: "terça", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sábado" }[numDia(data)];
  $("#tirar-resumo").textContent = `${Store.nomeProf(e.prof)} · ${nomeUnidade(e.unidade)} · ${e.inicio}–${e.fim}`;
  $("#tirar-dia").textContent = `Folga em ${diaSemana(data)} ${curta(data)}. As outras semanas continuam iguais.`;
  $("#tirar-diante").textContent = `Toda ${nomeDia} a partir de ${curta(data)}.`;
  $("#form-tirar").reset();
  $("#dlg-tirar").showModal();
}
$("#form-tirar").addEventListener("submit", (ev) => {
  const { e, data } = tirarAlvo, modo = $("#form-tirar").tirar.value;
  const ok = mudarEscala(() => {
    if (modo === "dia") return Store.atualizar("escalas", e.id, { folgas: [...(e.folgas || []), data] });
    // daqui em diante: a escala antiga acaba na véspera e uma cópia sem esse dia da semana continua a partir de `data`
    const dias = e.dias.filter((d) => d !== numDia(data)), folgas = (e.folgas || []).filter((d) => d >= data);
    const vespera = iso(addDias(new Date(data + "T12:00"), -1));
    if (!e.de || e.de <= vespera) {
      Store.atualizar("escalas", e.id, { ate: vespera, folgas: (e.folgas || []).filter((d) => d <= vespera) });
      if (dias.length && (!e.ate || e.ate >= data)) Store.add("escalas", { ...e, id: protocolo("ES"), de: data, dias, folgas });
    } else if (dias.length) Store.atualizar("escalas", e.id, { dias });
    else Store.remover("escalas", e.id);
  }, "Tirar este turno");
  if (!ok) ev.preventDefault();
});

// folga, férias, atestado: o profissional sai da agenda em todas as unidades nesses dias
$("#nova-folga").onclick = () => {
  $("#fo-prof").innerHTML = Store.profissionais().map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");
  const ini = semana < iso(hoje()) ? iso(hoje()) : semana;
  $("#fo-de").min = iso(hoje()); $("#fo-de").value = ini; $("#fo-ate").value = ini; $("#fo-ate").min = ini; $("#fo-erro").textContent = "";
  $("#dlg-folga").showModal();
};
$("#fo-de").onchange = () => { $("#fo-ate").min = $("#fo-de").value; if ($("#fo-ate").value < $("#fo-de").value) $("#fo-ate").value = $("#fo-de").value; };
$("#form-folga").addEventListener("submit", (ev) => {
  const prof = $("#fo-prof").value, de = $("#fo-de").value, ate = $("#fo-ate").value, motivo = $("#fo-motivo").value;
  const msg = !prof ? "Cadastre um profissional primeiro." : !de || !ate ? "Informe as duas datas." : ate < de ? "A data final precisa ser depois da inicial."
    : Store.bloqueios().some((b) => b.prof === prof && b.de <= ate && de <= b.ate) ? "Já existe folga ou férias deste profissional nesse período." : "";
  $("#fo-erro").textContent = msg;
  if (msg) return ev.preventDefault();
  if (!mudarEscala(() => Store.add("bloqueios", { id: protocolo("BQ"), prof, de, ate, motivo }), `${motivo} de ${Store.nomeProf(prof)}`)) return ev.preventDefault();
  semana = segundaDe(de);
  escalas();
});

// situação do pagamento de um pedido da loja (fórmulas são pagas na unidade depois do orçamento)
function pagamentoTxt(p) {
  const g = p.pagamento;
  if (p.tipo !== "loja") return `<span class="folga">Na unidade</span>`;
  if (!g || g.forma === "retirada") return `<span class="selo">Na retirada</span>`;
  if (g.status === "aprovado") return `<span class="selo concluido">Pago</span><br><small style="color:var(--fg-faint)">${g.metodo === "pix" ? "Pix" : `Cartão${g.final ? " final " + esc(g.final) : ""}${g.parcelas > 1 ? " · " + g.parcelas + "x" : ""}`}${g.demo ? " · simulado" : ""}</small>`;
  if (g.status === "analise") return `<span class="selo pendente">Em análise</span>`;
  if (g.status === "desistiu") return `<span class="selo cancelado">Não pago</span><br><small style="color:var(--fg-faint)">cliente desistiu</small>`;
  if (g.status === "recusado") return `<span class="selo cancelado">Recusado</span><br><small style="color:var(--fg-faint)">cliente pode tentar de novo</small>`;
  return `<span class="selo pendente">Aguardando pagamento</span>`;
}
function pedidos(ped) {
  const rows = ped.slice().sort((a, b) => b.criado.localeCompare(a.criado));
  $("#t-ped").innerHTML = rows.length ? rows.map((p) => `<tr>
    <td>${new Date(p.criado).toLocaleDateString("pt-BR")}</td><td>${tagUn(p.unidade)}</td>
    <td>${esc(p.nome)}<br><small style="color:var(--fg-faint)">${esc(p.telefone)}</small></td>
    <td>${p.tipo === "loja" ? "Loja" : p.tipo === "formula" ? "Fórmula" : "Produto"}</td>
    <td>${p.tipo === "loja" ? p.itens.map((it) => `${it.qtd}× ${esc(it.nome)}${it.variante ? " (" + esc(it.variante) + ")" : ""}`).join("<br>") + `<br><strong>${brl(p.total)}</strong>` : ""}${p.arquivo ? "📎 " + esc(p.arquivo) : ""}${p.tipo === "formula" ? `<br><small class="selo atencao" style="margin-top:.3rem">Exigir receita original ${p.entrega === "entrega" ? "na entrega" : "na retirada"}</small>` : ""}${p.obs ? `<br><small style="color:var(--fg-faint)">${esc(p.obs)}</small>` : ""}</td>
    <td>${p.entrega === "entrega" ? "Entrega" : "Retirada"}</td><td>${pagamentoTxt(p)}</td><td><code>${esc(p.id)}</code></td>
    <td><select class="ctl" data-pedido="${esc(p.id)}" aria-label="Status do pedido ${esc(p.id)}">${Object.entries(STATUS_PED).map(([k, v]) => `<option value="${k}"${k === p.status ? " selected" : ""}>${v}</option>`).join("")}</select></td></tr>`).join("")
    : `<tr><td colspan="9" class="vazio-msg">Nenhum pedido.</td></tr>`;
}

function estoqueTab() {
  const lojas = UNIDADES.filter((u) => u.farmacia && (!unidadeSel() || u.id === unidadeSel()));
  $("#h-est").innerHTML = `<tr><th>Produto</th><th>Preço</th>${lojas.map((u) => `<th>${u.nome}</th>`).join("")}</tr>`;
  $("#t-est").innerHTML = PRODUTOS.map((p) => `<tr><td><strong>${esc(p.nome)}</strong><br><small style="color:var(--fg-faint)">${esc(p.cat)}</small></td><td>${brl(p.preco)}</td>
    ${lojas.map((u) => `<td><input class="ctl" type="number" min="0" step="1" style="width:5.5rem" value="${Store.disponivel(p.id, u.id)}" data-est="${p.id}|${u.id}" aria-label="Estoque de ${esc(p.nome)} em ${u.nome}"></td>`).join("")}</tr>`).join("");
}

// faixa no topo: atendimentos que deixaram de caber depois de mudanças na escala ou no profissional
function atencao(ag) {
  const probs = ag.filter((a) => Store.problema(a));
  $("#atencao").hidden = !probs.length;
  if (!probs.length) return;
  const porTipo = {}; probs.forEach((a) => { const p = Store.problema(a); porTipo[p] = (porTipo[p] || 0) + 1; });
  $("#atencao").innerHTML = `<div><strong>${probs.length === 1 ? "1 atendimento precisa" : probs.length + " atendimentos precisam"} ser remarcado${probs.length === 1 ? "" : "s"}</strong>
    <small>${Object.entries(porTipo).map(([p, n]) => `${esc(p)}: ${n}`).join(" · ")}</small></div><button class="mini" id="ver-atencao">Ver lista</button>`;
}

// título, subtítulo, cor da faixa e abas conforme a unidade escolhida
function cabecalhoUnidade() {
  const u = unidadeSel(), un = acha(UNIDADES, u), h = new Date().getHours();
  const ola = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  $("#saudacao").innerHTML = u ? `${ola}, equipe de <em>${esc(un.nome)}.</em>` : `${ola}, <em>equipe.</em>`;
  $("#un-sub").innerHTML = u ? `${esc(un.end)} · ${un.farmacia ? "Clínica e farmácia" : "Só clínica (sem farmácia nesta unidade)"}` : `Visão geral das ${UNIDADES.length} unidades. Cada item mostra de qual unidade é.`;
  $("#painel").style.setProperty("--un", corUn(u));
  // unidade sem farmácia: as abas de pedidos e estoque somem
  const farm = !u || un.farmacia;
  ["pedidos", "estoque"].forEach((a) => ($(`.abas button[data-aba="${a}"]`).hidden = !farm));
  if (!farm && ["pedidos", "estoque"].includes($('.abas button[aria-selected="true"]').dataset.aba)) abrirAba("agenda");
  // contador de pendências em cada pílula: avaliações a confirmar, atendimentos a remarcar e pedidos em aberto
  const ag = Store.agendamentos(), ped = Store.pedidos();
  const pend = (id) => ag.filter((a) => (!id || a.unidade === id) && ((a.status === "pendente" && a.tipo !== "procedimento") || Store.problema(a))).length
    + ped.filter((p) => (!id || p.unidade === id) && !["entregue", "cancelado"].includes(p.status)).length;
  document.querySelectorAll(".unid-bar .pilulas button").forEach((b) => {
    const n = pend(b.dataset.v);
    b.querySelector(".cont")?.remove();
    if (n) b.insertAdjacentHTML("beforeend", `<span class="cont" aria-label="${n} pendência${n > 1 ? "s" : ""}">${n}</span>`);
  });
}

// "Pelo site: 4 de 6 avaliações" (ou "sem limite"); dia cheio fica em destaque
function usoTxt(u, data, curto) {
  const n = Store.avaliacoesSite(u, data), l = Store.limiteDia(u, data);
  if (l === null) return curto ? `site: ${n}` : `Pelo site: ${n} <span>· sem limite</span>`;
  const cls = n >= l ? "cheio" : "";
  return curto ? `<span class="${cls}">site: ${n}/${l}</span>` : `<span class="${cls}">Pelo site: ${n} de ${l} avaliações${n >= l ? " · cheio" : ""}</span>`;
}

// tabela de limites: uma linha por unidade (ou só a escolhida), uma coluna por dia da semana
function limitesTab() {
  const uns = UNIDADES.filter((x) => x.clinica && (!unidadeSel() || x.id === unidadeSel()));
  $("#h-lim").innerHTML = `<tr><th>Unidade</th>${[1, 2, 3, 4, 5, 6].map((d) => `<th>${DIAS[d]}</th>`).join("")}<th>Profissional automático</th></tr>`;
  $("#t-lim").innerHTML = uns.map((x) => {
    const l = Store.limites()[x.id] || {};
    return `<tr><td>${tagUn(x.id)}</td>${[1, 2, 3, 4, 5, 6].map((d) => `<td><input class="ctl" type="number" min="0" max="99" step="1" placeholder="—" value="${Number.isInteger(l[d]) ? l[d] : ""}" data-lim="${x.id}|${d}" aria-label="Limite de avaliações pelo site em ${esc(x.nome)}, ${DIAS[d]}"></td>`).join("")}
      <td><label class="chave"><input type="checkbox" data-auto="${x.id}"${Store.autoProfLigado(x.id) ? " checked" : ""}><span>${Store.autoProfLigado(x.id) ? "Ligado" : "Desligado"}</span></label></td></tr>`;
  }).join("");
}

function tudo() {
  const ag = Store.agendamentos().filter(filtroUnidade);
  const ped = Store.pedidos().filter(filtroUnidade);
  cabecalhoUnidade(); atencao(ag); kpis(ag, ped); agenda(ag); lista(ag); escalas(); limitesTab(); pedidos(ped); estoqueTab();
}

$("#d-ant").onclick = () => { dia = iso(addDias(new Date(dia + "T12:00"), -1)); tudo(); };
$("#d-prox").onclick = () => { dia = iso(addDias(new Date(dia + "T12:00"), 1)); tudo(); };
$("#d-hoje").onclick = () => { dia = iso(hoje()); tudo(); };
$("#resetar").onclick = () => { if (confirm("Apagar tudo o que foi cadastrado nesta demonstração e voltar aos dados de exemplo?")) { Store.semear(true); tudo(); } };

// ---------- novo agendamento (secretaria) ----------
let origem = null; // avaliação que deu origem ao procedimento
// `vaga` vem do clique num horário livre da agenda: já chega com profissional e hora escolhidos
function abrirNovo(av, vaga, data) {
  origem = av || null;
  $("#form-nag").reset();
  $("#n-unidade").innerHTML = optUnidades;
  $("#n-unidade").value = av ? av.unidade : unidadeSel() || "cameta";
  const quando = data || dia;
  $("#n-data").min = iso(hoje()); $("#n-data").value = quando < iso(hoje()) ? iso(hoje()) : quando;
  $("#n-tipo").value = "procedimento";
  if (av) { $("#n-nome").value = av.nome; $("#n-tel").value = av.telefone; }
  const prof = vaga && acha(Store.profissionais(), vaga.prof);
  oQue(av ? av.ambito : prof && prof.ambitos[0]);
  if (vaga) {
    $("#n-prof").value = vaga.prof; $("#n-prof-erro").textContent = ""; horasLivres();
    if ([...$("#n-hora").options].some((o) => o.value === vaga.hora)) $("#n-hora").value = vaga.hora;
  }
  $("#dlg-ag").showModal();
}
function oQue(ambitoPref) {
  const proc = $("#n-tipo").value === "procedimento";
  $("#n-oque-rot").textContent = proc ? "Procedimento" : "Área da avaliação";
  $("#n-oque").innerHTML = (proc ? PROCEDIMENTOS : AMBITOS).map((x) => `<option value="${x.id}">${x.nome}</option>`).join("");
  if (ambitoPref) { const alvo = proc ? PROCEDIMENTOS.find((p) => p.ambito === ambitoPref) : AMBITOS.find((a) => a.id === ambitoPref); if (alvo) $("#n-oque").value = alvo.id; }
  quemAtende();
}
const ambitoNovo = () => ($("#n-tipo").value === "procedimento" ? acha(PROCEDIMENTOS, $("#n-oque").value).ambito : $("#n-oque").value);
function quemAtende() {
  const d = $("#n-data").value, ag = Store.agendamentos();
  // sugestão: quem está com menos atendimentos no dia vem primeiro (e já selecionado)
  const carga = (p) => ag.filter((a) => a.prof === p.id && a.data === d && a.status !== "cancelado").length;
  const lista = (d ? Store.emEscala($("#n-unidade").value, d, ambitoNovo()) : []).sort((x, y) => carga(x.prof) - carga(y.prof));
  $("#n-prof").innerHTML = lista.map(({ prof }, i) => `<option value="${esc(prof.id)}">${esc(prof.nome)}${i === 0 && lista.length > 1 ? " · sugerido" : ""} (${carga(prof)} no dia)</option>`).join("");
  $("#n-prof-erro").textContent = lista.length ? "" : "Ninguém dessa área está escalado nesse dia nesta unidade. Mude a data, a unidade ou ajuste a escala.";
  horasLivres();
}
function horasLivres() {
  const u = $("#n-unidade").value, d = $("#n-data").value, p = $("#n-prof").value;
  const turno = (Store.emEscala(u, d, ambitoNovo()).find((x) => x.prof.id === p) || { horas: [] }).horas;
  // livre = sem atendimento e sem deixar descoberta uma avaliação do site que ainda espera profissional
  const livres = turno.filter((h) => !passou(d, h) && Store.candidatos(u, d, h, ambitoNovo()).some((x) => x.id === p));
  $("#n-hora").innerHTML = livres.map((h) => `<option>${h}</option>`).join("");
  $("#n-salvar").disabled = !livres.length;
  if (p && !livres.length) $("#n-prof-erro").textContent = "Este profissional não tem horário livre nesse dia.";
}
$("#n-tipo").onchange = () => oQue();
["#n-oque", "#n-unidade", "#n-data"].forEach((s) => ($(s).onchange = quemAtende));
$("#n-prof").onchange = () => { $("#n-prof-erro").textContent = ""; horasLivres(); };
$("#novo-ag").onclick = () => abrirNovo();
const campoErro = (el, msg) => { el.closest(".campo").querySelector(".erro").textContent = msg; return !msg; };
$("#form-nag").addEventListener("submit", (e) => {
  let ok = campoErro($("#n-nome"), $("#n-nome").value.trim().length < 3 ? "Informe o nome." : "");
  ok = campoErro($("#n-tel"), $("#n-tel").value.replace(/\D/g, "").length >= 10 ? "" : "Informe o celular com WhatsApp e DDD.") && ok;
  if (!ok || !$("#n-hora").value) return e.preventDefault();
  const proc = $("#n-tipo").value === "procedimento";
  const novo = { id: protocolo("AG"), tipo: $("#n-tipo").value, ambito: ambitoNovo(), procedimento: proc ? $("#n-oque").value : "", unidade: $("#n-unidade").value,
    data: $("#n-data").value, hora: $("#n-hora").value, prof: $("#n-prof").value, nome: $("#n-nome").value.trim(), telefone: $("#n-tel").value.trim(),
    email: "", obs: $("#n-obs").value.trim(), status: "confirmado", criado: new Date().toISOString(), origem: origem ? origem.id : "" };
  Store.add("agendamentos", novo);
  if (origem && proc) Store.atualizar("agendamentos", origem.id, { gerou: novo.id });
  dia = novo.data; tudo();
});

// ---------- profissionais ----------
let profEd = null;
function abrirProf(p) {
  profEd = p || null;
  $("#prof-titulo").innerHTML = p ? "Editar <em>profissional</em>" : "Novo <em>profissional</em>";
  $("#p-nome").value = p ? p.nome : ""; $("#p-ativo").checked = !p || p.ativo !== false; $("#p-erro").textContent = "";
  $("#p-ambitos").innerHTML = AMBITOS.filter((a) => a.id !== "geral").map((a) => `<label><input type="checkbox" value="${a.id}"${p && p.ambitos.includes(a.id) ? " checked" : ""}> ${a.nome}</label>`).join("");
  $("#dlg-prof").showModal();
}
$("#novo-prof").onclick = () => abrirProf();
$("#form-prof").addEventListener("submit", (e) => {
  const ambitos = $$("#p-ambitos input:checked").map((i) => i.value);
  const ok = campoErro($("#p-nome"), $("#p-nome").value.trim().length < 3 ? "Informe o nome." : "");
  $("#p-erro").textContent = ambitos.length ? "" : "Marque ao menos uma área.";
  if (!ok || !ambitos.length) return e.preventDefault();
  const dados = { nome: $("#p-nome").value.trim(), ambitos, ativo: $("#p-ativo").checked };
  if (profEd) {
    const afetados = futurosDe(profEd.id, (a) => !dados.ativo || !atende(dados, a.ambito));
    const porque = dados.ativo ? "deixam de ser da área dele" : "ficam sem profissional com ele inativo";
    if (afetados.length && !confirm(`${profEd.nome} tem ${afetados.length} atendimento(s) marcado(s) que ${porque}:\n\n${listaCurta(afetados)}\n\nEles vão aparecer no topo do painel para a secretaria remarcar. Salvar mesmo assim?`)) return e.preventDefault();
  }
  profEd ? Store.atualizar("profissionais", profEd.id, dados) : Store.add("profissionais", { id: protocolo("PF"), ...dados });
  tudo();
});

// ---------- escalas ----------
$("#nova-esc").onclick = () => {
  const profs = Store.profissionais();
  $("#e-prof").innerHTML = profs.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");
  $("#e-unidade").innerHTML = optUnidades; $("#e-unidade").value = unidadeSel() || "cameta";
  $("#e-dias").innerHTML = [1, 2, 3, 4, 5, 6].map((d) => `<label><input type="checkbox" value="${d}"> ${DIAS[d]}</label>`).join("");
  const horas = [...HORARIOS, "20:00"].map((h) => `<option>${h}</option>`).join("");
  $("#e-inicio").innerHTML = horas; $("#e-fim").innerHTML = horas; $("#e-inicio").value = "08:00"; $("#e-fim").value = "12:00"; $("#e-erro").textContent = "";
  // a escala nova começa na semana que está na tela (ou hoje, se ela já começou)
  const ini = semana < iso(hoje()) ? iso(hoje()) : semana, sab = iso(addDias(new Date(semana + "T12:00"), 5));
  $("#form-esc").vale.value = "sempre";
  $("#e-de").min = iso(hoje()); $("#e-de").value = ini; $("#e-ate").min = ini; $("#e-ate").value = sab;
  $("#e-semana-txt").textContent = `de ${curta(semana)} a ${curta(sab)}`;
  valeMudou();
  $("#dlg-esc").showModal();
};
function valeMudou() {
  const v = $("#form-esc").vale.value;
  $("#e-de-bloco").hidden = v === "semana"; $("#e-ate-bloco").hidden = v !== "periodo";
}
document.querySelectorAll('#form-esc input[name="vale"]').forEach((r) => (r.onchange = valeMudou));
$("#form-esc").addEventListener("submit", (e) => {
  const dias = $$("#e-dias input:checked").map((i) => +i.value), inicio = $("#e-inicio").value, fim = $("#e-fim").value, prof = $("#e-prof").value;
  const v = $("#form-esc").vale.value, sab = iso(addDias(new Date(semana + "T12:00"), 5));
  const de = v === "semana" ? (semana < iso(hoje()) ? iso(hoje()) : semana) : $("#e-de").value, ate = v === "semana" ? sab : v === "periodo" ? $("#e-ate").value : "";
  const nova = { id: protocolo("ES"), prof, unidade: $("#e-unidade").value, dias, inicio, fim, ...(de ? { de } : {}), ...(ate ? { ate } : {}) };
  let msg = !prof ? "Cadastre um profissional primeiro." : !dias.length ? "Marque ao menos um dia." : inicio >= fim ? "O fim precisa ser depois do início."
    : !de ? "Informe a partir de quando a escala vale." : ate && ate < de ? "A data final precisa ser depois da inicial." : "";
  // a mesma pessoa não pode estar em dois lugares (ou duas vezes) no mesmo horário
  if (!msg && conflitoEscala(nova)) msg = "Este profissional já tem escala que cruza com esse horário em algum desses dias. Dê folga naquele turno antes, se for uma troca.";
  $("#e-erro").textContent = msg;
  if (msg) return e.preventDefault();
  Store.add("escalas", nova);
  semana = segundaDe(de);
  tudo();
});

// ---------- remarcar ----------
// Move o atendimento para outra data. Depois de uma falta (`copia`), cria um atendimento novo e o da falta fica no histórico.
let remAlvo = null, remCopia = false;
function abrirRemarcar(a, copia) {
  remAlvo = a; remCopia = copia;
  $("#rem-titulo").innerHTML = copia ? "Nova <em>data</em>" : "Remarcar <em>atendimento</em>";
  $("#rem-resumo").textContent = `${a.nome} · ${rotuloAg(a)} · ${copia ? "faltou em" : "marcado para"} ${diaSemana(a.data)}, ${dataBR(a.data)} às ${a.hora} em ${nomeUnidade(a.unidade)}`;
  $("#r-unidade").innerHTML = optUnidades; $("#r-unidade").value = a.unidade;
  $("#r-data").min = iso(hoje()); $("#r-data").value = a.data < iso(hoje()) ? iso(hoje()) : a.data;
  remProfs();
  $("#dlg-rem").showModal();
}
function remProfs() {
  const lista = Store.emEscala($("#r-unidade").value, $("#r-data").value, remAlvo.ambito);
  // avaliação do site ainda sem profissional pode continuar "a definir"
  $("#r-prof").innerHTML = (remAlvo.prof ? "" : `<option value="">A definir depois</option>`) + lista.map(({ prof }) => `<option value="${esc(prof.id)}">${esc(prof.nome)}</option>`).join("");
  if (lista.some((x) => x.prof.id === remAlvo.prof)) $("#r-prof").value = remAlvo.prof;
  remHoras();
}
function remHoras() {
  const u = $("#r-unidade").value, d = $("#r-data").value, p = $("#r-prof").value;
  const escala = Store.emEscala(u, d, remAlvo.ambito).filter((x) => !p || x.prof.id === p);
  const horas = [...new Set(escala.flatMap((x) => x.horas))].sort();
  const mesmo = (h) => !remCopia && u === remAlvo.unidade && d === remAlvo.data && h === remAlvo.hora && p === (remAlvo.prof || "");
  const livres = horas.filter((h) => !mesmo(h) && Store.cabe(remAlvo, { unidade: u, data: d, hora: h, prof: p }));
  $("#r-hora").innerHTML = livres.map((h) => `<option>${h}</option>`).join("");
  $("#r-salvar").disabled = !livres.length;
  $("#r-erro").textContent = !d ? "Escolha a data." : !escala.length ? "Ninguém dessa área está escalado nesse dia nesta unidade." : !livres.length ? "Não sobrou horário livre nesse dia. Tente outra data." : "";
}
["#r-unidade", "#r-data"].forEach((s) => ($(s).onchange = remProfs));
$("#r-prof").onchange = remHoras;
$("#form-rem").addEventListener("submit", (e) => {
  const novo = { unidade: $("#r-unidade").value, data: $("#r-data").value, hora: $("#r-hora").value, prof: $("#r-prof").value };
  if (!novo.hora || !Store.cabe(remAlvo, novo)) { remHoras(); return e.preventDefault(); }
  const campos = { ...novo, status: novo.prof ? "confirmado" : "pendente", motivo: "" };
  if (remCopia) {
    const { gerou, remarcadoPara, antes, exemplo, ...base } = remAlvo;
    const id = protocolo("AG");
    Store.add("agendamentos", { ...base, ...campos, id, criado: new Date().toISOString(), remarcadoDe: remAlvo.id });
    Store.atualizar("agendamentos", remAlvo.id, { remarcadoPara: id });
  } else {
    Store.atualizar("agendamentos", remAlvo.id, { ...campos, antes: `${dataBR(remAlvo.data)} ${remAlvo.hora}` });
  }
  dia = novo.data; tudo();
});

// ---------- cancelar (com motivo) ----------
let canAlvo = null;
$("#c-motivo").innerHTML = MOTIVOS_CANCEL.map((m) => `<option>${m}</option>`).join("");
function abrirCancelar(a) {
  canAlvo = a;
  $("#form-can").reset();
  $("#can-resumo").textContent = `${a.nome} · ${rotuloAg(a)} · ${diaSemana(a.data)}, ${dataBR(a.data)} às ${a.hora} em ${nomeUnidade(a.unidade)}`;
  $("#dlg-can").showModal();
}
$("#form-can").addEventListener("submit", () => {
  const det = $("#c-obs").value.trim();
  Store.atualizar("agendamentos", canAlvo.id, { status: "cancelado", motivo: $("#c-motivo").value + (det ? " · " + det : "") });
  tudo();
});

// exportar agendamentos filtrados (abre no Excel)
$("#exportar").onclick = () => {
  const cab = ["codigo", "tipo", "atendimento", "data", "hora", "unidade", "profissional", "nome", "telefone", "status", "motivo do cancelamento"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = Store.agendamentos().filter(filtroUnidade).map((a) => [a.id, a.tipo || "avaliacao", rotuloAg(a), dataBR(a.data), a.hora, nomeUnidade(a.unidade), Store.nomeProf(a.prof), a.nome, a.telefone, STATUS_AG[a.status], a.status === "cancelado" ? a.motivo : ""].map(q).join(";"));
  const blob = new Blob(["﻿" + [cab.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `agendamentos-curativa-${unidadeSel() || "todas"}.csv`; a.click(); URL.revokeObjectURL(a.href);
};

// se outra aba (o site) gravar algo, o painel atualiza sozinho
addEventListener("storage", (e) => { if (e.key && e.key.startsWith("curativa.") && logado()) tudo(); });
mostrar();
