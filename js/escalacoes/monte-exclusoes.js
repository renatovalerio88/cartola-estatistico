/* Cartola Estatístico V2 — exclusões operacionais do Monte seu Time */
(() => {
  "use strict";

  const jogadoresExcluidos = new Map();
  const clubesExcluidos = new Set();
  let originalPool = null;

  const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const id = j => String(j?.id ?? j?.atletaId ?? j?.atleta_id ?? "");
  const nome = j => String(j?.apelido || j?.nome || "Jogador");
  const clube = j => String(j?.siglaClube || j?.clubeSigla || j?.clube?.abreviacao || j?.clube || "--").toUpperCase();

  function poolOriginal() {
    try { return Array.isArray(originalPool?.()) ? originalPool() : []; } catch (_) { return []; }
  }

  function bloqueado(j) {
    return jogadoresExcluidos.has(id(j)) || clubesExcluidos.has(clube(j));
  }

  function instalarFiltro() {
    if (originalPool) return true;
    const atual = window.obterJogadoresDisponiveisEscalacao || globalThis.obterJogadoresDisponiveisEscalacao;
    if (typeof atual !== "function") return false;
    originalPool = atual;
    const filtrado = (...args) => {
      const lista = originalPool(...args);
      return Array.isArray(lista) ? lista.filter(j => !bloqueado(j)) : lista;
    };
    window.obterJogadoresDisponiveisEscalacao = filtrado;
    try { globalThis.obterJogadoresDisponiveisEscalacao = filtrado; } catch (_) {}
    return true;
  }

  function rerender() {
    const monte = window.CartolaMonteSeuTime;
    if (monte?.estado?.travas instanceof Map) {
      [...monte.estado.travas.entries()].forEach(([chave, j]) => { if (bloqueado(j)) monte.estado.travas.delete(chave); });
      monte.estado.resultado = null;
    }
    const perfil = document.querySelector("#monte-seu-time [data-monte-perfil]");
    if (perfil) perfil.dispatchEvent(new Event("change", { bubbles: true }));
    render();
  }

  function opcoesClubes() {
    return [...new Set(poolOriginal().map(clube).filter(c => c && c !== "--"))].sort();
  }

  function resumoHtml() {
    const jogadores = [...jogadoresExcluidos.values()];
    const clubes = [...clubesExcluidos];
    if (!jogadores.length && !clubes.length) return '<span class="monte-exclusoes-vazio">Nenhuma exclusão ativa.</span>';
    return `${jogadores.map(j => `<button type="button" data-monte-desexcluir-jogador="${id(j)}">${nome(j)} ×</button>`).join("")}${clubes.map(c => `<button type="button" data-monte-desexcluir-clube="${c}">${c} ×</button>`).join("")}<button type="button" class="monte-exclusoes-limpar" data-monte-limpar-exclusoes>Limpar exclusões</button>`;
  }

  function render() {
    const root = document.getElementById("monte-seu-time");
    if (!root || !instalarFiltro()) return;
    let box = root.querySelector("[data-monte-exclusoes]");
    if (!box) {
      box = document.createElement("section");
      box.className = "monte-card monte-exclusoes";
      box.dataset.monteExclusoes = "1";
      const hero = root.querySelector(".monte-hero");
      (hero || root.firstElementChild)?.insertAdjacentElement("afterend", box);
    }
    const clubes = opcoesClubes();
    box.innerHTML = `<div class="monte-exclusoes-head"><div><span class="monte-kicker">NÃO QUERO NO TIME</span><strong>Excluir jogador ou clube</strong><small>Use para notícias de última hora, dúvida de titularidade ou decisão pessoal. O modelo respeita estas exclusões ao completar.</small></div></div><div class="monte-exclusoes-controles"><input type="search" placeholder="Buscar jogador para excluir" data-monte-excluir-busca><select data-monte-excluir-clube><option value="">Excluir um clube…</option>${clubes.map(c => `<option value="${c}">${c}</option>`).join("")}</select></div><div class="monte-exclusoes-resultados" data-monte-excluir-resultados></div><div class="monte-exclusoes-ativas">${resumoHtml()}</div>`;
  }

  function resultadosBusca(valor) {
    const box = document.querySelector("#monte-seu-time [data-monte-excluir-resultados]");
    if (!box) return;
    const q = norm(valor);
    if (q.length < 2) { box.innerHTML = ""; return; }
    const lista = poolOriginal().filter(j => !jogadoresExcluidos.has(id(j)) && !clubesExcluidos.has(clube(j)) && norm(`${nome(j)} ${clube(j)}`).includes(q)).slice(0, 8);
    box.innerHTML = lista.map(j => `<button type="button" data-monte-excluir-jogador="${id(j)}"><strong>${nome(j)}</strong><small>${clube(j)}</small><span>Excluir</span></button>`).join("") || '<small>Nenhum jogador encontrado.</small>';
  }

  function css() {
    if (document.getElementById("monte-exclusoes-css")) return;
    const s = document.createElement("style");
    s.id = "monte-exclusoes-css";
    s.textContent = `#monte-seu-time .monte-exclusoes{margin:12px 0;padding:14px}.monte-exclusoes-head strong{display:block;margin:3px 0}.monte-exclusoes-head small{display:block;opacity:.68;font-size:10px;line-height:1.4}.monte-exclusoes-controles{display:grid;grid-template-columns:1fr 190px;gap:8px;margin-top:10px}.monte-exclusoes-controles input,.monte-exclusoes-controles select{min-height:38px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);padding:7px 9px}.monte-exclusoes-resultados{display:grid;gap:4px;margin-top:6px}.monte-exclusoes-resultados button{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:7px 9px;text-align:left}.monte-exclusoes-resultados button small{opacity:.65}.monte-exclusoes-resultados button span{color:#b94b43;font-size:10px;font-weight:800}.monte-exclusoes-ativas{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.monte-exclusoes-ativas button{border:1px solid rgba(185,75,67,.28);border-radius:999px;background:rgba(185,75,67,.07);color:inherit;padding:5px 8px;font-size:10px}.monte-exclusoes-ativas .monte-exclusoes-limpar{border-color:var(--border);background:transparent}.monte-exclusoes-vazio{font-size:10px;opacity:.6}@media(max-width:700px){.monte-exclusoes-controles{grid-template-columns:1fr}.monte-exclusoes-resultados button{grid-template-columns:1fr auto}.monte-exclusoes-resultados button small{grid-column:1}.monte-exclusoes{padding:11px!important}}`;
    document.head.appendChild(s);
  }

  document.addEventListener("input", e => {
    if (e.target.matches?.("#monte-seu-time [data-monte-excluir-busca]")) resultadosBusca(e.target.value);
  });

  document.addEventListener("change", e => {
    if (!e.target.matches?.("#monte-seu-time [data-monte-excluir-clube]")) return;
    const c = String(e.target.value || "").toUpperCase();
    if (!c) return;
    clubesExcluidos.add(c);
    rerender();
  });

  document.addEventListener("click", e => {
    const excluir = e.target.closest?.("[data-monte-excluir-jogador]");
    if (excluir) {
      const j = poolOriginal().find(x => id(x) === excluir.dataset.monteExcluirJogador);
      if (j) jogadoresExcluidos.set(id(j), j);
      rerender(); return;
    }
    const voltarJogador = e.target.closest?.("[data-monte-desexcluir-jogador]");
    if (voltarJogador) { jogadoresExcluidos.delete(voltarJogador.dataset.monteDesexcluirJogador); rerender(); return; }
    const voltarClube = e.target.closest?.("[data-monte-desexcluir-clube]");
    if (voltarClube) { clubesExcluidos.delete(String(voltarClube.dataset.monteDesexcluirClube).toUpperCase()); rerender(); return; }
    if (e.target.closest?.("[data-monte-limpar-exclusoes]")) { jogadoresExcluidos.clear(); clubesExcluidos.clear(); rerender(); }
  });

  function iniciar() {
    css();
    let tentativas = 0;
    const timer = setInterval(() => {
      tentativas += 1;
      if (instalarFiltro() && document.getElementById("monte-seu-time")) { clearInterval(timer); render(); }
      else if (tentativas > 120) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true }); else iniciar();
  window.CartolaMonteExclusoes = { jogadoresExcluidos, clubesExcluidos, bloqueado };
})();