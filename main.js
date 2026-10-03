// Curativa demo — sem dependências. Reveal, nav, flip, tilt e motion leve (progresso, contagem, parallax).
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// nav vira "vidro" depois do topo + barra de progresso + parallax, tudo num único rAF por scroll
const nav = document.getElementById("nav");
const barra = document.getElementById("progresso");
const pars = [...document.querySelectorAll("[data-par]")];
let pendente = false;
function aoRolar() {
  pendente = false;
  nav.classList.toggle("docked", scrollY > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  barra.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
  if (reduce) return;
  for (const el of pars) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) continue;
    // -1 (abaixo da tela) a 1 (acima): desloca a imagem dentro da moldura
    const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    (el.tagName === "IMG" ? el : el.querySelector("img")).style.setProperty("--par", (t * +el.dataset.par).toFixed(1) + "px");
  }
}
addEventListener("scroll", () => { if (!pendente) { pendente = true; requestAnimationFrame(aoRolar); } }, { passive: true });
aoRolar();

// números que contam ao aparecer
function contar(el) {
  const alvo = +el.dataset.conta, suf = el.dataset.sufixo || "";
  if (reduce) { el.textContent = alvo + suf; return; }
  const t0 = performance.now(), dur = 1400;
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3))) + suf;
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// reveal por scroll
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  if (e.target.classList.contains("flip") && !reduce) e.target.classList.add("espia");
  e.target.querySelectorAll("[data-conta]").forEach(contar);
  io.unobserve(e.target);
}), { threshold: 0.15 });
document.querySelectorAll(".rv").forEach((el) => io.observe(el));

// flip: toque/clique alterna (no mouse o :hover do CSS já vira); "Agendar" no verso leva ao agendamento
document.querySelectorAll(".flip").forEach((card) => card.addEventListener("click", (e) => {
  const go = e.target.closest(".go");
  if (go) { location.href = go.dataset.href; return; }
  const on = card.classList.toggle("is-flipped");
  card.setAttribute("aria-pressed", on);
}));

// tilt 3D seguindo o mouse, com suavização
function tilt(el, max = 5) {
  const cur = { rx: 0, ry: 0, gx: 50, gy: 50, go: 0 };
  const tgt = { ...cur };
  let raf = 0;
  const step = () => {
    let moving = false;
    for (const k in cur) { cur[k] += (tgt[k] - cur[k]) * 0.12; if (Math.abs(tgt[k] - cur[k]) > 0.02) moving = true; }
    el.style.setProperty("--rx", cur.rx.toFixed(2) + "deg");
    el.style.setProperty("--ry", cur.ry.toFixed(2) + "deg");
    el.style.setProperty("--gx", cur.gx.toFixed(1) + "%");
    el.style.setProperty("--gy", cur.gy.toFixed(1) + "%");
    el.style.setProperty("--go", cur.go.toFixed(3));
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { raf ||= requestAnimationFrame(step); };
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    Object.assign(tgt, { rx: -y * max, ry: x * max, gx: (x + 1) * 50, gy: (y + 1) * 50, go: 1 });
    kick();
  });
  el.addEventListener("pointerleave", () => { Object.assign(tgt, { rx: 0, ry: 0, go: 0 }); kick(); });
}
if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.querySelectorAll("[data-tilt]").forEach((el) => tilt(el));
}

// botão fixo de agendar (celular): aparece depois do hero e some perto do rodapé
const fixo = document.querySelector(".fixo-cel");
if (fixo) addEventListener("scroll", () => {
  const fim = document.documentElement.scrollHeight - innerHeight - 500;
  fixo.classList.toggle("on", scrollY > innerHeight * 0.8 && scrollY < fim);
}, { passive: true });

// destaca no menu a seção que está na tela
const elos = [...document.querySelectorAll('.nav ul a[href^="#"]')];
const visto = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) elos.forEach((a) => a.classList.toggle("atual", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
elos.forEach((a) => { const alvo = document.querySelector(a.getAttribute("href")); if (alvo) visto.observe(alvo); });

// vídeos: qualquer <figure data-reel="CODIGO"> (reel do Instagram) ou data-mp4="arquivo" ganha botão de play e abre no player
const dlgVideo = document.getElementById("video"), quadro = document.getElementById("video-quadro");
if (dlgVideo) {
  document.querySelectorAll("[data-reel], [data-mp4]").forEach((fig) => {
    fig.classList.add("tem-video");
    const b = document.createElement("button");
    b.className = "play"; b.type = "button";
    b.setAttribute("aria-label", "Assistir ao vídeo: " + (fig.querySelector("figcaption")?.textContent || fig.querySelector("img")?.alt || ""));
    (fig.querySelector(".capa") || fig).append(b);
    fig.addEventListener("click", () => {
      quadro.innerHTML = "";
      if (fig.dataset.mp4) {
        const v = document.createElement("video");
        v.src = fig.dataset.mp4; v.controls = true; v.autoplay = true; v.playsInline = true;
        quadro.append(v);
      } else {
        const f = document.createElement("iframe");
        // só aceita código de reel/post (letras, números, - e _), nunca uma URL qualquer
        const cod = fig.dataset.reel.replace(/[^\w-]/g, "");
        f.src = "https://www.instagram.com/reel/" + cod + "/embed/"; f.allow = "autoplay; encrypted-media"; f.title = "Vídeo do Instagram da Curativa";
        quadro.append(f);
      }
      dlgVideo.showModal();
    });
  });
  const fechar = () => { dlgVideo.close(); };
  dlgVideo.addEventListener("close", () => { quadro.innerHTML = ""; });   // para o vídeo ao fechar
  dlgVideo.addEventListener("click", (e) => { if (e.target === dlgVideo || e.target.closest("[data-fechar-video]")) fechar(); });
}

// cenas com transformação de traço (nariz): só animam com a carta virada, e ficam paradas com "reduzir movimento"
// Cada vez que a carta vira, a cena recomeça do zero: assim o "antes" sempre aparece antes do "depois".
document.querySelectorAll(".flip").forEach((card) => {
  const svgs = card.querySelectorAll("svg.cena");
  let ligada = false;
  const ligar = (on) => {
    svgs.forEach((s) => {
      if (!s.pauseAnimations) return;
      if (on && !reduce) { if (!ligada) s.setCurrentTime(0); s.unpauseAnimations(); }
      else { s.pauseAnimations(); s.setCurrentTime(0); }
    });
    ligada = on && !reduce;
  };
  ligar(false);
  const ver = () => ligar(card.matches(":hover, :focus-visible, .is-flipped"));
  ["mouseenter", "mouseleave", "focus", "blur", "click"].forEach((ev) => card.addEventListener(ev, () => setTimeout(ver, 0)));
});

// menu do celular
const menuBtn = document.getElementById("menu-btn");
if (menuBtn) {
  const abrir = (on) => { nav.classList.toggle("aberto", on); menuBtn.setAttribute("aria-expanded", on); menuBtn.setAttribute("aria-label", on ? "Fechar menu" : "Abrir menu"); };
  menuBtn.addEventListener("click", () => abrir(!nav.classList.contains("aberto")));
  document.getElementById("menu").addEventListener("click", (e) => { if (e.target.closest("a")) abrir(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") abrir(false); });
}

// "Como funciona": motion graphic em 3 cenas, sincronizado com os passos e com a linha dourada do caminho.
// Avança sozinho enquanto a seção está na tela; passar o mouse num passo mostra a cena dele. Com "reduzir movimento", fica parado.
(() => {
  const sec = document.getElementById("como");
  if (!sec) return;
  const cenas = sec.querySelectorAll(".mg-c"), passos = sec.querySelectorAll(".caminho li");
  let k = 0, timer = 0;
  const mostrar = (n) => {
    k = n; sec.style.setProperty("--k", n);
    cenas.forEach((c, i) => c.classList.toggle("on", i === n));
    passos.forEach((p, i) => { p.classList.toggle("ativa", i === n); p.classList.toggle("feita", i < n); });
  };
  const tocar = () => { clearInterval(timer); timer = setInterval(() => mostrar((k + 1) % cenas.length), 3600); };
  if (reduce) return;
  sec.classList.add("anima");
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { mostrar(0); tocar(); } else clearInterval(timer); }, { threshold: 0.35 }).observe(sec);
  passos.forEach((p, i) => p.addEventListener("mouseenter", () => { mostrar(i); tocar(); }));
})();
