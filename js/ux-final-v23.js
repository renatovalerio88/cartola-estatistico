/* Cartola Estatístico — fechamento visual V2.4 */
(() => {
  "use strict";

  const STYLE_ID = "cartola-ux-final-v24";
  const ORANGE = "#d9822b";
  const GREEN = "#53d891";
  let reparandoRecomendacao = false;

  function norm(v) {
    return String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function jogadores() {
    try {
      if (typeof window.obterJogadoresCarregados === "function") {
        const lista = window.obterJogadoresCarregados();
        if (Array.isArray(lista)) return lista.filter(Boolean);
      }
      if (Array.isArray(window.estadoRecomendacoes?.jogadores)) {
        return window.estadoRecomendacoes.jogadores.filter(Boolean);
      }
    } catch (_) {}
    return [];
  }

  function jogadoresDaPosicao() {
    try {
      if (typeof window.obterPosicaoAtiva === "function" && typeof window.obterJogadoresDaPosicao === "function") {
        const lista = window.obterJogadoresDaPosicao(window.obterPosicaoAtiva());
        if (Array.isArray(lista)) return lista.filter(Boolean);
      }
    } catch (_) {}
    return [];
  }

  function idJogador(j) {
    return String(j?.id ?? j?.atletaId ?? j?.atleta_id ?? j?.apelido ?? j?.nome ?? "");
  }

  function nomeJogador(j) {
    return String(j?.apelido || j?.nome || "").trim();
  }

  function clube(j) {
    return String(j?.siglaClube || j?.clubeSigla || j?.clube?.abreviacao || j?.clube || "").toUpperCase();
  }

  function adversario(j) {
    return String(j?.siglaAdversario || j?.adversarioSigla || j?.adversario || j?.clubeAdversario || "").toUpperCase();
  }

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Recomendações — nº1 é ranking; aberto é somente seleção */
      #recomendacoes .ce-clean-tabs{gap:7px!important;padding:9px!important}
      #recomendacoes .ce-clean-player{padding:7px 10px!important;font-size:11px!important;position:relative;transition:none!important}
      #recomendacoes .ce-clean-player[data-ux-rank="1"]{background:var(--primary)!important;color:#fff!important;border-color:var(--primary)!important;box-shadow:none!important}
      #recomendacoes .ce-clean-player[data-ux-rank="1"] .ce-clean-rank{background:rgba(255,255,255,.22)!important;color:#fff!important}
      #recomendacoes .ce-clean-player.is-active:not([data-ux-rank="1"]){background:var(--surface)!important;color:var(--text)!important;border-color:var(--text-soft)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--text-soft) 45%,transparent)!important}
      #recomendacoes .ce-clean-player.is-active:not([data-ux-rank="1"])::after{content:"aberto";font-size:7px;font-weight:850;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft);margin-left:2px}
      #recomendacoes .ce-clean-player[data-ux-rank="1"].is-active::after{content:"#1";font-size:7px;font-weight:850;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.82);margin-left:2px}
      #recomendacoes .ce-clean-detail{max-width:900px!important}
      #recomendacoes .player-card{box-shadow:0 7px 20px rgba(0,0,0,.04)!important}
      #recomendacoes .ce-decision{margin:7px 10px!important;padding:9px 11px!important;border-color:var(--border)!important;background:var(--surface-soft)!important}
      #recomendacoes .ce-decision-kicker{font-size:7px!important;color:var(--text-soft)!important}
      #recomendacoes .ce-decision-title{font-size:14px!important;margin:2px 0 3px!important}
      #recomendacoes .ce-decision p{font-size:9px!important;line-height:1.35!important;margin:0!important}
      #recomendacoes .ce-decision-chips{margin-top:6px!important;gap:4px!important}
      #recomendacoes .ce-decision-chip{padding:3px 6px!important;font-size:7.5px!important;background:var(--surface)!important;border:1px solid var(--border)!important}
      #recomendacoes .component-row.component-explained{padding:7px 9px!important;margin:3px 0!important;background:var(--surface)!important}
      #recomendacoes .component-row .component-label b{font-size:10px!important}
      #recomendacoes .component-row .component-label small{font-size:8px!important;line-height:1.25!important}
      #recomendacoes .ce-show-all-factors{padding:6px!important;margin-top:6px!important;font-size:8px!important}
      #recomendacoes [data-ux-v24-hide="1"]{display:none!important}

      /* Times sugeridos — controle de patrimônio sem vazio vertical */
      #times .lineup-budget-control{
        display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;
        min-height:0!important;height:auto!important;max-height:none!important;padding:14px!important;margin:0 0 12px!important;gap:10px!important;
      }
      #times .lineup-budget-control .lineup-budget-copy,
      #times .lineup-budget-control .lineup-budget-actions{
        display:flex!important;flex-direction:column!important;position:static!important;inset:auto!important;transform:none!important;
        min-height:0!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important;gap:8px!important;
      }
      #times .lineup-budget-control .lineup-budget-copy p{margin:0!important;max-width:760px!important}
      #times .lineup-budget-control .lineup-budget-actions{margin-top:2px!important}
      #times .lineup-budget-control .lineup-budget-input-wrap{min-height:0!important;height:auto!important;margin:0!important}
      #times .lineup-budget-control>*{min-height:0!important;max-height:none!important}

      /* Monte seu time — campo menor e linhas estáveis */
      #monte-seu-time .monte-builder-pitch{min-height:470px!important;max-width:920px!important;margin-inline:auto!important}
      #monte-seu-time .monte-line.defense{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(0,1fr)!important;align-items:center!important}
      #monte-seu-time .monte-slot{transition:none!important}
      #monte-seu-time .pitch-line.defense{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(0,1fr)!important;align-items:center!important}

      /* Histórico */
      #historico .history-v21-legend .proj{color:${ORANGE}!important}
      #historico .history-v21-legend .real{color:${GREEN}!important}
      #historico [data-ux-v24-filter="1"]{display:none!important}
      #historico [data-ux-v24-toolbar-hidden="1"]{display:none!important}
      #historico .history-v21-table tr{box-shadow:none!important}
      #historico svg{overflow:visible!important}

      /* Análise da rodada */
      #analise [data-ux-v24-old-reading="1"]{display:none!important}
      #analise .ce-round-item{padding:7px 0!important}
      #analise .ce-round-item strong{font-size:11px!important}
      #analise .ce-round-item small{font-size:9px!important;line-height:1.35!important}
      #analise .ce-round-tag{background:var(--surface-soft)!important;color:var(--text-soft)!important}
      #analise .ce-round-card{padding:13px!important}

      @media(max-width:700px){
        #recomendacoes .ce-clean-tabs{padding:7px!important;gap:5px!important}
        #recomendacoes .ce-clean-player{padding:6px 8px!important;font-size:10px!important}
        #recomendacoes .ce-clean-detail .player-card{border-radius:13px!important;padding:10px!important}
        #recomendacoes .ce-decision{margin:5px 0!important;padding:8px 9px!important}
        #recomendacoes .ce-clean-hint{font-size:8px!important;margin:4px 0!important}
        #recomendacoes .component-row.component-explained{padding:6px 8px!important}
        #recomendacoes [data-ux-v24-mobile-extra="1"]{display:none!important}

        #times .lineup-budget-control{padding:11px!important;gap:8px!important}
        #times .lineup-budget-control .lineup-budget-copy,
        #times .lineup-budget-control .lineup-budget-actions{gap:6px!important}
        #times .lineup-budget-control .lineup-budget-copy p{font-size:10px!important;line-height:1.4!important}

        #monte-seu-time .monte-builder-pitch{min-height:365px!important;margin:0 4px!important}
        #monte-seu-time .monte-line.attack{top:5%!important}
        #monte-seu-time .monte-line.midfield{top:29%!important}
        #monte-seu-time .monte-line.defense{top:56%!important}
        #monte-seu-time .monte-line.goalkeeper{top:80%!important}
        #monte-seu-time .monte-slot{min-height:50px!important;width:min(66px,100%)!important;padding:5px!important}
        #monte-seu-time .monte-slot strong{font-size:9px!important}
        #monte-seu-time .monte-slot small{font-size:7px!important}
        #monte-seu-time .lineup-pitch{min-height:370px!important}

        #historico .history-v21{gap:7px!important}
        #historico .history-v21-card{padding:9px!important}
        #historico .history-v21-chart,#historico .history-chart{min-height:210px!important;overflow-x:auto!important;overflow-y:hidden!important}
        #historico .history-v21-chart svg,#historico .history-chart svg{min-width:620px!important;height:210px!important}
        #historico .history-v21-table tbody{gap:4px!important}
        #historico .history-v21-table tr{grid-template-columns:minmax(0,1.4fr) repeat(2,minmax(58px,.5fr))!important;gap:3px 6px!important;padding:6px 7px!important;border-radius:8px!important;align-items:center!important}
        #historico .history-v21-table td{font-size:8.5px!important}
        #historico .history-v21-table td::before{font-size:6px!important;margin-bottom:1px!important}
        #historico .history-v21-reading{grid-column:1/-1!important;max-width:none!important;font-size:7.5px!important;line-height:1.2!important}
        #historico .history-v21-meta{font-size:7px!important}
      }
      @media(max-width:390px){
        #monte-seu-time .monte-builder-pitch{min-height:350px!important}
        #monte-seu-time .monte-slot{width:min(61px,100%)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ajustarMenu() {
    if (document.documentElement.dataset.uxV24Menu === "1") return;
    document.documentElement.dataset.uxV24Menu = "1";
    document.addEventListener("click", evento => {
      const item = evento.target.closest?.(".menu-item[data-tab]");
      if (!item) return;
      document.querySelectorAll(".menu-item[data-tab]").forEach(botao => botao.classList.toggle("active", botao === item));
      document.querySelectorAll(".tab-content").forEach(secao => secao.classList.toggle("active", secao.id === item.dataset.tab));
    }, true);
  }

  function garantirSelecaoRecomendacao() {
    const tabs = document.querySelector("#recomendacoes .ce-clean-tabs");
    if (!tabs) return;
    const botoes = [...tabs.querySelectorAll(".ce-clean-player[data-ce-player]")];
    if (!botoes.length) return;
    botoes.forEach((botao, i) => {
      botao.dataset.uxRank = String(i + 1);
      botao.title = i === 0 ? "Melhor opção do modelo nesta posição" : (botao.classList.contains("is-active") ? "Jogador aberto nos detalhes" : "Abrir detalhes");
    });
    if (!botoes.some(botao => botao.classList.contains("is-active"))) {
      botoes[0].click();
    }
  }

  function detalheCorrespondeAoSelecionado() {
    const detalhe = document.querySelector("#recomendacoes #ceCleanDetail, #recomendacoes .ce-clean-detail");
    const ativo = document.querySelector("#recomendacoes .ce-clean-player.is-active[data-ce-player]");
    if (!detalhe || !ativo) return true;
    const lista = jogadoresDaPosicao();
    const jogador = lista.find(j => idJogador(j) === ativo.dataset.cePlayer);
    if (!jogador) return true;
    const nome = norm(nomeJogador(jogador));
    return !nome || norm(detalhe.textContent).includes(nome);
  }

  function repararDetalheSeNecessario() {
    if (reparandoRecomendacao) return;
    garantirSelecaoRecomendacao();
    if (detalheCorrespondeAoSelecionado()) return;
    const ativo = document.querySelector("#recomendacoes .ce-clean-player.is-active[data-ce-player]");
    if (!ativo) return;
    reparandoRecomendacao = true;
    try {
      ativo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    } catch (_) {
    } finally {
      window.setTimeout(() => { reparandoRecomendacao = false; }, 80);
    }
  }

  function ajustarRecomendacoes() {
    garantirSelecaoRecomendacao();
    const detalhe = document.querySelector("#recomendacoes .ce-clean-detail");
    if (!detalhe) return;

    detalhe.querySelectorAll("[data-ux-v24-mobile-extra]").forEach(el => delete el.dataset.uxV24MobileExtra);
    const fatores = [...detalhe.querySelectorAll(".component-row.component-explained, .component-row")];
    fatores.slice(3).forEach(el => el.dataset.uxV24MobileExtra = "1");

    const termosRedundantes = [
      "leitura do motor estatistico",
      "principal motivo",
      "entenda a nota",
      "como o modelo chegou",
      "composicao da nota"
    ];
    detalhe.querySelectorAll("section,article,div").forEach(el => {
      if (el === detalhe || el.dataset.uxV24Hide === "1") return;
      const texto = norm(el.textContent);
      if (!texto || texto.length > 700) return;
      if (termosRedundantes.some(t => texto.startsWith(t) || texto.includes(t))) {
        const filhoIgual = [...el.children].some(f => termosRedundantes.some(t => norm(f.textContent).startsWith(t)));
        if (!filhoIgual || el.children.length <= 2) el.dataset.uxV24Hide = "1";
      }
    });
    repararDetalheSeNecessario();
  }

  function ordenarDefesaBuilder() {
    document.querySelectorAll("#monte-seu-time .monte-line.defense").forEach(linha => {
      const slots = [...linha.querySelectorAll("[data-monte-slot]")];
      if (slots.length < 3) return;
      const lat = slots.filter(s => String(s.dataset.pos || "").toUpperCase() === "LAT")
        .sort((a, b) => String(a.dataset.monteSlot).localeCompare(String(b.dataset.monteSlot)));
      const zag = slots.filter(s => String(s.dataset.pos || "").toUpperCase() === "ZAG")
        .sort((a, b) => String(a.dataset.monteSlot).localeCompare(String(b.dataset.monteSlot)));
      if (!lat.length || !zag.length) return;
      const ordem = lat.length >= 2 ? [lat[0], ...zag, lat[1], ...lat.slice(2)] : [...lat, ...zag];
      ordem.filter(Boolean).forEach((slot, i) => {
        slot.style.order = String(i + 1);
        linha.appendChild(slot);
      });
      linha.dataset.uxV24DefenseStable = "1";
    });
  }

  function ordenarDefesaResultado() {
    document.querySelectorAll("#monte-seu-time .pitch-line.defense").forEach(linha => {
      const jogadoresLinha = [...linha.querySelectorAll(":scope > .pitch-player")];
      if (jogadoresLinha.length < 3) return;
      const posicaoDoCard = card => {
        const titulo = String(card.getAttribute("title") || "").toUpperCase();
        if (/\bLAT\b/.test(titulo)) return "LAT";
        if (/\bZAG\b/.test(titulo)) return "ZAG";
        return "";
      };
      const lat = jogadoresLinha.filter(c => posicaoDoCard(c) === "LAT");
      const zag = jogadoresLinha.filter(c => posicaoDoCard(c) === "ZAG");
      if (!lat.length || !zag.length) return;
      const ordem = lat.length >= 2 ? [lat[0], ...zag, lat[1], ...lat.slice(2)] : [...lat, ...zag];
      ordem.filter(Boolean).forEach((card, i) => {
        card.style.order = String(i + 1);
        linha.appendChild(card);
      });
      linha.dataset.uxV24DefenseStable = "1";
    });
  }

  function removerFiltrosHistorico() {
    ["historyRound", "historyPosition"].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      const label = select.closest("label");
      (label || select).dataset.uxV24Filter = "1";
    });
    document.querySelectorAll("#historico .history-toolbar").forEach(toolbar => {
      const visiveis = [...toolbar.children].filter(el => el.dataset.uxV24Filter !== "1");
      if (!visiveis.length) toolbar.dataset.uxV24ToolbarHidden = "1";
    });
  }

  function trocarCorGrafico() {
    document.querySelectorAll("#historico svg [stroke='#6077db'],#historico svg [stroke='#4f67d8'],#historico svg [stroke='rgb(96, 119, 219)']").forEach(el => el.setAttribute("stroke", ORANGE));
    document.querySelectorAll("#historico svg [fill='#6077db'],#historico svg [fill='#4f67d8'],#historico svg [fill='rgb(96, 119, 219)']").forEach(el => el.setAttribute("fill", ORANGE));
  }

  function removerLeituraAntigaAnalise() {
    const raiz = document.getElementById("analise");
    if (!raiz) return;
    [...raiz.querySelectorAll("h2,h3,h4,strong")].forEach(titulo => {
      const texto = norm(titulo.textContent);
      if (!texto.includes("leitura rapida para a rodada")) return;
      let bloco = titulo.closest("section,article,.analysis-card,.analysis-summary,.round-reading,.quick-reading");
      if (!bloco || bloco === raiz) bloco = titulo.parentElement;
      if (bloco && bloco !== raiz) bloco.dataset.uxV24OldReading = "1";
    });
  }

  function enriquecerAnalise() {
    removerLeituraAntigaAnalise();
    const base = jogadores();
    if (!base.length) return;
    document.querySelectorAll("#analise .ce-round-card").forEach(card => {
      const titulo = norm(card.querySelector("h3")?.textContent);
      if (!["onde atacar", "onde buscar seguranca", "onde ter cautela"].includes(titulo)) return;
      card.querySelectorAll(".ce-round-item").forEach(item => {
        const strong = item.querySelector("strong");
        const small = item.querySelector("small");
        if (!strong || !small) return;
        const textoAtual = norm(small.textContent);
        if (textoAtual.includes(" vs ") || textoAtual.includes(" x ")) return;
        const sigla = String(strong.textContent || "").trim().toUpperCase();
        const atleta = base.find(j => clube(j) === sigla && adversario(j));
        if (!atleta) return;
        const adv = adversario(atleta);
        small.textContent = `${sigla} x ${adv} • ${small.textContent}`;
      });
    });
  }

  function aplicarImediato() {
    css();
    ajustarMenu();
    ajustarRecomendacoes();
    ordenarDefesaBuilder();
    ordenarDefesaResultado();
    removerFiltrosHistorico();
    trocarCorGrafico();
    enriquecerAnalise();
  }

  let timer = null;
  function agendar() {
    window.clearTimeout(timer);
    timer = window.setTimeout(aplicarImediato, 0);
  }

  function iniciar() {
    aplicarImediato();
    [80, 250, 700, 1500].forEach(ms => window.setTimeout(aplicarImediato, ms));
    const observer = new MutationObserver(() => aplicarImediato());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("cartola:escalacoes-atualizadas", agendar);
    window.addEventListener("cartola:rodada-atualizada", agendar);
    document.addEventListener("click", evento => {
      if (evento.target.closest?.("#recomendacoes [data-ce-player]")) {
        window.setTimeout(repararDetalheSeNecessario, 0);
        window.setTimeout(repararDetalheSeNecessario, 50);
      }
      if (evento.target.closest?.("#monte-seu-time")) window.setTimeout(aplicarImediato, 0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
