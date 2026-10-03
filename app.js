// Base compartilhada entre agendar.html e admin.html.
// PROTÓTIPO: os dados ficam só neste navegador (localStorage). No sistema real, isto vira
// um banco de dados em servidor, com login de verdade e proteção de dados de saúde (LGPD).

const UNIDADES = [
  { id: "cameta", end: "R. Padre Antônio Franco, 489", nome: "Cametá", clinica: true, farmacia: true, cor: "#1c4a3d" },
  { id: "abaetetuba", end: "Tv. Santos Dumont, 466 · Centro", nome: "Abaetetuba", clinica: true, farmacia: true, cor: "#a47c2c" },
  { id: "belem", end: "Rod. Augusto Montenegro, 4300 · Parque Office", nome: "Belém", clinica: true, farmacia: false, cor: "#7a5c8a" },
  { id: "barcarena", end: "Av. Germano Aranha · Vila dos Cabanos", nome: "Barcarena", clinica: true, farmacia: false, cor: "#2f6f8f" },
];

// O cliente escolhe a ÁREA a ser avaliada. O procedimento é definido na avaliação.
const AMBITOS = [
  { id: "facial", nome: "Facial", desc: "Harmonização, preenchimento labial, bioestimulador, toxina botulínica" },
  { id: "nariz", nome: "Nariz", desc: "Rino Dreams (rinomodelação)" },
  { id: "corporal", nome: "Corporal", desc: "Glow Perfect, contorno, depilação a laser, PEIM (vasinhos)" },
  { id: "intima", nome: "Íntima", desc: "Harmonização íntima feminina e masculina" },
  { id: "capilar", nome: "Capilar", desc: "Tricoscopia e terapia capilar" },
  { id: "geral", nome: "Ainda não sei", desc: "A equipe orienta na avaliação" },
];

// Procedimentos: só a secretaria marca, depois da avaliação.
const PROCEDIMENTOS = [
  { id: "facial", nome: "Harmonização facial", ambito: "facial" },
  { id: "botox", nome: "Toxina botulínica (Botox)", ambito: "facial" },
  { id: "labial", nome: "Preenchimento labial", ambito: "facial" },
  { id: "bioestimulador", nome: "Bioestimulador de colágeno", ambito: "facial" },
  { id: "rino", nome: "Rino Dreams", ambito: "nariz" },
  { id: "glow", nome: "Glow Perfect Glúteo", ambito: "corporal" },
  { id: "laser", nome: "Depilação a laser", ambito: "corporal" },
  { id: "peim", nome: "PEIM (vasinhos)", ambito: "corporal" },
  { id: "intima", nome: "Harmonização íntima", ambito: "intima" },
  { id: "capilar", nome: "Terapia capilar", ambito: "capilar" },
];

// Produtos prontos da farmácia (pronta entrega, retirada na unidade).
// PREÇOS E ESTOQUES SÃO DE EXEMPLO: trocar pelos reais antes de qualquer uso.
const PRODUTOS = [
  { id: "mist", nome: "Body Mist", cat: "Perfumaria", preco: 59.9, img: "assets/f10.jpg", pos: "50% 55%", desc: "Perfuma e refresca a pele. 130 ml.", variantes: ["Floral azul", "Pera", "Floral rosa", "Héron (masculino)"], cores: ["#9ec5e8", "#d5d98a", "#f2b6c6", "#2f3a2a"] },
  { id: "mist-kit", nome: "Body Mist · kit com 4", cat: "Perfumaria", preco: 199.9, img: "assets/f-bodysplash.jpg", pos: "50% 62%", desc: "As quatro fragrâncias da linha." },
  { id: "base-stick", nome: "Base Stick FPS 50", cat: "Maquiagem", preco: 89.9, img: "assets/f-base.jpg", pos: "50% 78%", desc: "Alta cobertura e toque seco.", variantes: ["Tom 1", "Tom 2", "Tom 3", "Tom 4"], cores: ["#f1d3b8", "#dfb48f", "#c08a62", "#8d5a3b"] },
  { id: "multistick", nome: "Multistick", cat: "Maquiagem", preco: 69.9, img: "assets/f26.jpg", pos: "50% 72%", desc: "Blush, batom e sombra em um bastão." },
  { id: "gloss", nome: "Gloss labial", cat: "Lábios", preco: 49.9, img: "assets/f1.jpg", pos: "50% 58%", desc: "Cor e hidratação, com capa e chaveiro." },
  { id: "serum", nome: "Sérum para cílios e sobrancelhas", cat: "Cuidado", preco: 79.9, img: "assets/f24.jpg", pos: "50% 62%", desc: "Para uso diário." },
  { id: "kit-skin", nome: "Kit skincare", cat: "Skincare", preco: 149.9, img: "assets/f31.jpg", pos: "50% 78%", desc: "Gel de limpeza, água micelar e hidratante." },
  { id: "hidratante", nome: "Hidratante facial", cat: "Skincare", preco: 69.9, img: "assets/f38.jpg", pos: "50% 35%", desc: "Hidratação para todos os dias." },
];
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nomeProduto = (id) => acha(PRODUTOS, id).nome || id;

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
// Grade de horários possíveis, de 30 em 30 min. Quem atende em cada um é definido pelas escalas.
const HORARIOS = (() => {
  const out = [];
  for (let h = 7; h < 20; h++) for (const m of [0, 30]) out.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
  return out;
})();

const STATUS_AG = { pendente: "Pendente", confirmado: "Confirmado", concluido: "Concluído", faltou: "Faltou", cancelado: "Cancelado" };
const MOTIVOS_CANCEL = ["Cliente desistiu", "Cliente vai remarcar depois", "Clínica cancelou", "Profissional indisponível", "Outro"];
const STATUS_PED = { recebido: "Recebido", orcamento: "Em orçamento", producao: "Em produção", pronto: "Pronto", entregue: "Entregue", cancelado: "Cancelado" };

const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dataBR = (s) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const numDia = (s) => new Date(s + "T12:00").getDay();
const diaSemana = (s) => DIAS[numDia(s)];
const acha = (lista, id) => lista.find((x) => x.id === id) || {};
const nomeUnidade = (id) => acha(UNIDADES, id).nome || id;
const nomeAmbito = (id) => acha(AMBITOS, id).nome || id;
const nomeProcedimento = (id) => acha(PROCEDIMENTOS, id).nome || id;
// rótulo do que será feito: "Avaliação · Facial" ou o nome do procedimento
const rotuloAg = (a) => (a.tipo === "procedimento" ? nomeProcedimento(a.procedimento) : "Avaliação · " + nomeAmbito(a.ambito));
const agoraHM = () => { const n = new Date(); return String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0"); };
// horário que já passou: dia anterior, ou hoje até agora
const passou = (data, hora) => data < iso(hoje()) || (data === iso(hoje()) && hora <= agoraHM());
// A escala vale nesta data? Dia da semana, período de validade (de/até, opcionais) e folgas pontuais.
const escalaVale = (e, data) => e.dias.includes(numDia(data)) && (!e.de || data >= e.de) && (!e.ate || data <= e.ate) && !(e.folgas || []).includes(data);
// segunda-feira da semana desta data (a agenda da clínica vai de segunda a sábado)
const segundaDe = (data) => { const d = new Date(data + "T12:00"); return iso(addDias(d, -((d.getDay() + 6) % 7))); };
const emAberto = (a) => a.status === "pendente" || a.status === "confirmado";
const atende = (prof, ambito) => !ambito || ambito === "geral" || prof.ambitos.includes(ambito);
// Dá a cada área da lista um profissional diferente que a atenda (emparelhamento por caminhos aumentantes).
function cobre(profs, ambitos) {
  const dono = new Map(); // id do profissional -> índice da área que ele ficou cobrindo
  const tenta = (i, vistos) => profs.some((p) => {
    if (vistos.has(p.id) || !atende(p, ambitos[i])) return false;
    vistos.add(p.id);
    if (!dono.has(p.id) || tenta(dono.get(p.id), vistos)) { dono.set(p.id, i); return true; }
    return false;
  });
  return ambitos.every((_, i) => tenta(i, new Set()));
}
const protocolo = (p) => p + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
// todo texto digitado por cliente passa por aqui antes de ir para a tela
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const Store = {
  ler(k) { try { return JSON.parse(localStorage.getItem("curativa." + k)) || []; } catch { return []; } },
  gravar(k, v) { try { localStorage.setItem("curativa." + k, JSON.stringify(v)); return true; } catch { return false; } },
  agendamentos() { return this.ler("agendamentos"); },
  pedidos() { return this.ler("pedidos"); },
  profissionais() { return this.ler("profissionais"); },
  escalas() { return this.ler("escalas"); },
  add(k, item) { const l = this.ler(k); l.push(item); this.gravar(k, l); },
  atualizar(k, id, campos) { this.gravar(k, this.ler(k).map((x) => (x.id === id ? { ...x, ...campos } : x))); },
  remover(k, id) { this.gravar(k, this.ler(k).filter((x) => x.id !== id)); },
  nomeProf(id) { return acha(this.profissionais(), id).nome || "A definir"; },

  // estoque por produto e unidade: { mist: { cameta: 6, abaetetuba: 8 }, ... }
  estoque() { try { return JSON.parse(localStorage.getItem("curativa.estoque")) || {}; } catch { return {}; } },
  disponivel(id, unidade) { return (this.estoque()[id] || {})[unidade] || 0; },
  definirEstoque(id, unidade, qtd) { const e = this.estoque(); (e[id] ||= {})[unidade] = Math.max(0, Math.floor(qtd) || 0); this.gravar("estoque", e); },
  moverEstoque(itens, unidade, sinal) { for (const it of itens) this.definirEstoque(it.id, unidade, this.disponivel(it.id, unidade) + sinal * it.qtd); },

  // Limite de avaliações marcadas PELO SITE, por unidade e dia da semana: { cameta: { 1: 8, 6: 4 }, ... } (1 = segunda).
  // Sem número = sem limite. Só conta o que a cliente marcou no site (canal "site"), menos as canceladas;
  // o que a secretaria marca no painel não conta e não tem limite.
  limites() { try { return JSON.parse(localStorage.getItem("curativa.limites")) || {}; } catch { return {}; } },
  limiteDia(unidade, data) { const v = (this.limites()[unidade] || {})[numDia(data)]; return Number.isInteger(v) ? v : null; },
  definirLimite(unidade, dia, v) { const l = this.limites(); l[unidade] ||= {}; if (v === null) delete l[unidade][dia]; else l[unidade][dia] = v; this.gravar("limites", l); },
  avaliacoesSite(unidade, data) { return this.agendamentos().filter((a) => a.unidade === unidade && a.data === data && a.canal === "site" && a.status !== "cancelado").length; },
  lotado(unidade, data) { const l = this.limiteDia(unidade, data); return l !== null && this.avaliacoesSite(unidade, data) >= l; },

  // Escolha automática do profissional (agendamentos do site), ligada por padrão em cada unidade.
  autoProfLigado(unidade) { try { return (JSON.parse(localStorage.getItem("curativa.autoprof")) || {})[unidade] !== false; } catch { return true; } },
  definirAutoProf(unidade, on) { let c = {}; try { c = JSON.parse(localStorage.getItem("curativa.autoprof")) || {}; } catch {} c[unidade] = on; this.gravar("autoprof", c); },
  // Entre quem pode atender (área, escala, livre e sem descobrir outra avaliação pendente), escolhe:
  // 1) quem já atendeu a cliente (mesmo celular); 2) quem tem menos atendimentos no dia; 3) o mais especializado.
  escolherProf(unidade, data, hora, ambito, telefone, ignorar) {
    const cand = this.candidatos(unidade, data, hora, ambito, ignorar);
    if (!cand.length) return "";
    const ag = this.agendamentos().filter((a) => a.id !== ignorar && a.status !== "cancelado");
    const tel = String(telefone || "").replace(/\D/g, "");
    if (tel.length >= 10) {
      const antes = ag.filter((a) => a.prof && String(a.telefone).replace(/\D/g, "") === tel).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
      const conhecido = antes.find((a) => cand.some((p) => p.id === a.prof));
      if (conhecido) return conhecido.prof;
    }
    const carga = (p) => ag.filter((a) => a.prof === p.id && a.data === data).length;
    return cand.slice().sort((a, b) => carga(a) - carga(b) || a.ambitos.length - b.ambitos.length || a.id.localeCompare(b.id))[0].id;
  },

  // folgas, férias e afastamentos por período: { id, prof, de, ate, motivo }
  bloqueios() { return this.ler("bloqueios"); },
  deFolga(prof, data, bloqueios = this.bloqueios()) { return bloqueios.find((b) => b.prof === prof && b.de <= data && data <= b.ate); },

  // Quem atende a área nesta unidade neste dia, e em quais horários (pela escala).
  emEscala(unidade, data, ambito) {
    const escalas = this.escalas(), bloqueios = this.bloqueios();
    const profs = this.profissionais().filter((p) => p.ativo !== false && (!ambito || ambito === "geral" || p.ambitos.includes(ambito)) && !this.deFolga(p.id, data, bloqueios));
    const out = [];
    for (const p of profs) {
      const horas = new Set();
      for (const e of escalas) if (e.prof === p.id && e.unidade === unidade && escalaVale(e, data)) HORARIOS.forEach((h) => { if (h >= e.inicio && h < e.fim) horas.add(h); });
      if (horas.size) out.push({ prof: p, horas: [...horas].sort() });
    }
    return out;
  },
  ocupadosProf(prof, data) { return this.agendamentos().filter((a) => a.prof === prof && a.data === data && a.status !== "cancelado").map((a) => a.hora); },
  // Quem pode atender `ambito` neste horário. Avaliações do site chegam sem profissional, mas cada uma
  // segura a vaga de alguém da área dela: só entra quem, se ocupado, ainda deixa todas cobertas.
  // `ignorar` é o próprio agendamento quando ele está sendo remarcado ou recebendo profissional.
  candidatos(unidade, data, hora, ambito, ignorar) {
    const marcados = this.agendamentos().filter((a) => a.id !== ignorar && a.data === data && a.hora === hora && a.status !== "cancelado");
    const livres = this.emEscala(unidade, data).filter(({ prof, horas }) => horas.includes(hora) && !marcados.some((a) => a.prof === prof.id)).map((x) => x.prof);
    const esperando = marcados.filter((a) => !a.prof && a.unidade === unidade).map((a) => a.ambito);
    return livres.filter((p) => atende(p, ambito) && cobre(livres.filter((x) => x !== p), esperando));
  },
  profsLivres(unidade, data, ambito, hora, ignorar) { return this.candidatos(unidade, data, hora, ambito, ignorar); },
  // O agendamento `a` cabe neste horário (com este profissional, ou com alguém a definir)?
  cabe(a, { unidade, data, hora, prof }) {
    if (passou(data, hora)) return false;
    const c = this.candidatos(unidade, data, hora, a.ambito, a.id);
    return prof ? c.some((p) => p.id === prof) : c.length > 0;
  },
  // Horários livres: { "09:00": [ids de quem pode atender] }. O horário some quando não sobra ninguém.
  livres(unidade, data, ambito) {
    const mapa = {}, horas = new Set();
    if (this.lotado(unidade, data)) return mapa;
    this.emEscala(unidade, data, ambito).forEach((x) => x.horas.forEach((h) => horas.add(h)));
    for (const h of horas) {
      if (passou(data, h)) continue;
      const c = this.candidatos(unidade, data, h, ambito);
      if (c.length) mapa[h] = c.map((p) => p.id);
    }
    return mapa;
  },
  // Atendimento futuro que a secretaria precisa remarcar (a escala ou o profissional mudou depois da marcação).
  problema(a) {
    if (!emAberto(a) || passou(a.data, a.hora)) return "";
    if (!a.prof) return this.candidatos(a.unidade, a.data, a.hora, a.ambito, a.id).length ? "" : "Sem profissional livre";
    if (acha(this.profissionais(), a.prof).ativo === false) return "Profissional inativo";
    if (this.deFolga(a.prof, a.data)) return "Profissional de folga";
    if (!this.emEscala(a.unidade, a.data, a.ambito).some((x) => x.prof.id === a.prof && x.horas.includes(a.hora))) return "Fora da escala";
    if (this.agendamentos().some((x) => x.id !== a.id && x.prof === a.prof && x.data === a.data && x.hora === a.hora && x.status !== "cancelado")) return "Horário em dobro";
    return "";
  },

  // Dados fictícios para a demonstração não abrir vazia. Nomes e escalas são de exemplo.
  semear(forcar) {
    if (!forcar && localStorage.getItem("curativa.semeado") === "5") return;
    const profs = [
      ["p1", "Profissional 1 (exemplo)", ["facial", "nariz"]],
      ["p2", "Profissional 2 (exemplo)", ["corporal", "intima"]],
      ["p3", "Profissional 3 (exemplo)", ["capilar"]],
      ["p4", "Profissional 4 (exemplo)", ["facial"]],
      ["p5", "Profissional 5 (exemplo)", ["facial", "corporal"]],
      ["p6", "Profissional 6 (exemplo)", ["intima", "facial"]],
    ].map(([id, nome, ambitos]) => ({ id, nome, ambitos, ativo: true }));
    const escalas = [
      ["p1", "cameta", [1, 3, 5], "08:00", "12:00"], ["p1", "abaetetuba", [2, 4], "08:00", "18:00"],
      ["p2", "cameta", [2, 4], "08:00", "18:00"], ["p2", "belem", [1], "08:00", "18:00"],
      ["p3", "cameta", [3], "14:00", "18:00"], ["p3", "cameta", [6], "08:00", "12:00"], ["p3", "abaetetuba", [5], "08:00", "18:00"],
      ["p4", "belem", [1, 2, 3, 4, 5], "08:00", "18:00"],
      ["p5", "barcarena", [1, 3, 5], "08:00", "18:00"],
      ["p6", "abaetetuba", [1, 3], "08:00", "18:00"], ["p6", "cameta", [6], "08:00", "12:00"],
    ].map(([prof, unidade, dias, inicio, fim], i) => ({ id: "ES-" + (i + 1), prof, unidade, dias, inicio, fim }));
    this.gravar("profissionais", profs); this.gravar("escalas", escalas); this.gravar("bloqueios", []); this.gravar("agendamentos", []);

    // agendamentos de exemplo: encaixa cada um no primeiro horário livre que respeite a escala
    const exemplos = [
      ["cameta", "facial", "avaliacao", "", "Ana Exemplo", "confirmado"], ["cameta", "facial", "avaliacao", "", "Bruno Exemplo", "pendente"],
      ["cameta", "nariz", "procedimento", "rino", "Carla Exemplo", "confirmado"], ["cameta", "corporal", "avaliacao", "", "Diego Exemplo", "pendente"],
      ["cameta", "capilar", "procedimento", "capilar", "Elisa Exemplo", "confirmado"], ["cameta", "intima", "avaliacao", "", "Fábio Exemplo", "pendente"],
      ["abaetetuba", "facial", "avaliacao", "", "Gabriela Exemplo", "confirmado"], ["belem", "facial", "procedimento", "botox", "Heitor Exemplo", "pendente"],
      ["barcarena", "corporal", "avaliacao", "", "Íris Exemplo", "pendente"],
    ];
    exemplos.forEach(([unidade, ambito, tipo, procedimento, nome, status], i) => {
      for (let d = 0; d < 14; d++) {
        const data = iso(addDias(hoje(), d)), livres = this.livres(unidade, data, ambito), horas = Object.keys(livres).sort();
        if (!horas.length) continue;
        const hora = horas[Math.min(horas.length - 1, (i * 3) % 7)];
        // avaliação pendente chega do site sem profissional: a secretaria define ao confirmar
        const prof = tipo === "avaliacao" && status === "pendente" ? "" : livres[hora][0];
        this.add("agendamentos", { id: "AG-EX" + (i + 1), tipo, ambito, procedimento, unidade, data, hora, prof, nome,
          telefone: "(91) 90000-000" + (i + 1), email: "", obs: "", status, criado: new Date().toISOString(), exemplo: true, ...(tipo === "avaliacao" ? { canal: "site" } : {}) });
        break;
      }
    });
    // estoque de exemplo: varia por produto e unidade, com um item esgotado para mostrar o comportamento
    const est = {};
    PRODUTOS.forEach((p, i) => { est[p.id] = { cameta: [6, 3, 8, 0, 10, 4, 2, 7][i], abaetetuba: [8, 5, 6, 4, 12, 0, 3, 9][i] }; });
    this.gravar("estoque", est); this.gravar("carrinho", []);
    this.gravar("pedidos", [
      ["cameta", "Júlia Exemplo", "formula", "receita-exemplo.pdf", "retirada", "orcamento"],
      ["abaetetuba", "Kleber Exemplo", "produto", "", "entrega", "recebido"],
      ["cameta", "Lívia Exemplo", "formula", "receita-exemplo.jpg", "retirada", "pronto"],
    ].map(([unidade, nome, tipo, arquivo, entrega, status], i) => ({
      id: "PD-EX" + (i + 1), unidade, nome, telefone: "(91) 90000-010" + (i + 1), tipo, arquivo, entrega,
      obs: tipo === "produto" ? "Body Mist, 2 unidades" : "", status, criado: new Date().toISOString(), exemplo: true,
    })));
    // limites de exemplo (gravados depois dos agendamentos de exemplo, para não interferir neles)
    this.gravar("limites", { cameta: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 4 }, abaetetuba: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6, 6: 3 }, belem: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 }, barcarena: { 1: 4, 3: 4, 5: 4 } });
    try { localStorage.setItem("curativa.semeado", "5"); } catch {}
  },
};

// Troca um <select> curto por botões de escolha (pílulas). O select continua existindo, escondido,
// então o resto do código lê e muda o valor do mesmo jeito. Funciona com teclado (setas) e leitor de tela.
function pilulas(sel) {
  let box = sel.nextElementSibling && sel.nextElementSibling.classList.contains("pilulas") ? sel.nextElementSibling : null;
  const marcar = () => box.querySelectorAll("button").forEach((b) => { const on = b.dataset.v === sel.value; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; });
  if (!box) {
    box = document.createElement("div"); box.className = "pilulas"; box.setAttribute("role", "radiogroup");
    sel.after(box); sel.classList.add("sr-only"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    const rot = sel.id && document.querySelector(`label[for="${sel.id}"]`);
    if (rot) { rot.id = rot.id || sel.id + "-rot"; box.setAttribute("aria-labelledby", rot.id); rot.removeAttribute("for"); }
    const escolher = (b) => { if (!b || b.dataset.v === sel.value) return; sel.value = b.dataset.v; sel.dispatchEvent(new Event("change", { bubbles: true })); };
    box.addEventListener("click", (e) => escolher(e.target.closest("button[data-v]")));
    box.addEventListener("keydown", (e) => {
      const bs = [...box.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d || i < 0) return;
      e.preventDefault(); const alvo = bs[(i + d + bs.length) % bs.length]; alvo.focus(); escolher(alvo);
    });
    sel.addEventListener("change", () => box.querySelectorAll("button").forEach((b) => { const on = b.dataset.v === sel.value; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; }));
  }
  const cores = (sel.dataset.cores || "").split(",").filter(Boolean);
  box.innerHTML = [...sel.options].map((o, i) => `<button type="button" role="radio" data-v="${esc(o.value)}" aria-checked="false">${cores[i] ? `<span class="cor" style="background:${esc(cores[i])}"></span>` : ""}${esc(o.text)}</button>`).join("");
  marcar();
}
