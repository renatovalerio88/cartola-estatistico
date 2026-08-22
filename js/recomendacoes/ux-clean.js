/* Cartola Estatístico — UX clean de Recomendações
 * Lista compacta + um único painel de detalhes.
 */
(function () {
  "use strict";

  const INELEGIVEIS_VISUAIS = {
    GOL: ["Scouts ofensivos", "Bola parada", "Pênaltis"],
    LAT: [],
    ZAG: ["Pênaltis"],
    MEI: ["Chance de SG"],
    ATA: ["Scouts defensivos", "Chance de SG"],
    TEC: ["Scouts ofensivos", "Scouts defensivos", "Minutos esperados", "Bola parada", "Pênaltis"]
  };

  let instalado = false;
  let selecionado = null;

  function estilo() {
    if (document.getElementById("ceUxCleanStyle")) return;
    const s = document.createElement("style");
    s.id = "ceUxCleanStyle";
    s.textContent = `
      .ce-clean-recs{display:grid;gap:12px;width:100%}
      .ce-clean-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
      .ce-clean-player{appearance:none;border:1px solid var(--border);background:var(--surface-soft);color:var(--text);border-radius:999px;padding:9px 13px;cursor:pointer;font:inherit;font-weight:700;display:inline-flex;align-items:center;gap:8px}
      .ce-clean-player:hover,.ce-clean-player.is-active{border-color:var(--primary);background:var(--primary);color:#fff}
      .ce-clean-rank{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.14);font-size:10px}
      .ce-clean-hint{font-size:11px;color:var(--text-soft);padding:0 3px}
      .ce-clean-detail{min-width:0}
      .ce-clean-detail .player-card{width:100%;max-width:none}
      @media(max-width:700px){.ce-clean-tabs{overflow-x:auto;flex-wrap:nowrap;padding:10px}.ce-clean-player{flex:0 0 auto}}
    `;
    document.head.appendChild(s);
  }

  function id(j) { return String(j?.id ?? j?.atletaId ?? j?.atleta_id ?? j?.apelido ?? j?.nome ?? ""); }
  function nome(j) { return String(j?.apelido || j?.nome || "Jogador"); }
  function posicaoAtual() { return typeof obterPosicaoAtiva === "function" ? String(obterPosicaoAtiva()).toUpperCase() : "GOL"; }
  function listaAtual() {
    const p = posicaoAtual();
    const l = typeof obterJogadoresDaPosicao === "function" ? obterJogadoresDaPosicao(p) : [];
    return Array.isArray(l) ? l : [];
  }

  function limparComposicaoPorPosicao(host, posicao) {
    const proibidos = INELEGIVEIS_VISUAIS[posicao] || [];
    if (!proibidos.length) return;
    host.querySelectorAll(".component-row").forEach(row => {
      const txt = row.textContent || "";
      if (proibidos.some(nomeCriterio => txt.includes(nomeCriterio))) row.remove();
    });
    const resumo = host.querySelector(".components-summary");
    if (resumo) {
      const total = host.querySelectorAll(".component-row").length;
      resumo.textContent = `${total} critérios aplicáveis à posição`;
    }
  }

  function renderDetalhe(jogador, host) {
    if (!jogador || !host || typeof criarCardJogador !== "function") return;
    const lista = listaAtual();
    const idx = Math.max(0, lista.findIndex(x => id(x) === id(jogador)));
    const card = criarCardJogador(jogador, idx + 1);
    host.innerHTML = "";
    if (card) host.appendChild(card);
    limparComposicaoPorPosicao(host, posicaoAtual());
    if (typeof configurarBotoesAnaliseJogador === "function") configurarBotoesAnaliseJogador();
  }

  function aplicar() {
    estilo();
    const grade = document.getElementById("playersGrid");
    if (!grade) return;
    const lista = listaAtual();
    if (!lista.length) return;
    if (!selecionado || !lista.some(j => id(j) === selecionado)) selecionado = id(lista[0]);

    grade.innerHTML = `
      <section class="ce-clean-recs">
        <div class="ce-clean-tabs" role="tablist" aria-label="Jogadores recomendados">
          ${lista.map((j,i)=>`<button type="button" class="ce-clean-player ${id(j)===selecionado?"is-active":""}" data-ce-player="${id(j)}" role="tab" aria-selected="${id(j)===selecionado}"><span class="ce-clean-rank">${i+1}</span><span>${nome(j)}</span></button>`).join("")}
        </div>
        <div class="ce-clean-hint">Selecione um jogador para ver projeção, justificativa e composição da nota.</div>
        <div class="ce-clean-detail" id="ceCleanDetail" role="tabpanel"></div>
      </section>`;

    const detalhe = document.getElementById("ceCleanDetail");
    renderDetalhe(lista.find(j => id(j) === selecionado) || lista[0], detalhe);

    grade.querySelectorAll("[data-ce-player]").forEach(botao => {
      botao.addEventListener("click", () => {
        selecionado = botao.dataset.cePlayer;
        grade.querySelectorAll("[data-ce-player]").forEach(b => {
          const ativo = b.dataset.cePlayer === selecionado;
          b.classList.toggle("is-active", ativo);
          b.setAttribute("aria-selected", String(ativo));
        });
        renderDetalhe(lista.find(j => id(j) === selecionado), detalhe);
      });
    });
  }

  function instalar() {
    if (instalado) return true;
    if (typeof exibirJogadoresDaPosicao !== "function" || typeof criarCardJogador !== "function") return false;
    const original = exibirJogadoresDaPosicao;
    window.exibirJogadoresDaPosicao = function () {
      original.apply(this, arguments);
      aplicar();
    };
    instalado = true;
    aplicar();
    return true;
  }

  let n = 0;
  const timer = setInterval(() => { n += 1; if (instalar() || n > 50) clearInterval(timer); }, 100);
  window.RecomendacoesUXClean = { aplicar };
})();
