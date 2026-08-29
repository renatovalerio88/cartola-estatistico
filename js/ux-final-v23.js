/* Cartola Estatístico — fechamento visual V2.6 seguro */
(() => {
  "use strict";

  const STYLE_ID = "cartola-ux-final-v26-safe";
  const ORANGE = "#d9822b";
  const GREEN = "#53d891";
  let timer = null;
  let reparando = false;

  function norm(v) {
    return String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #recomendacoes .ce-clean-tabs{gap:7px!important;padding:9px!important}
      #recomendacoes .ce-clean-player{padding:7px 10px!important;font-size:11px!important;position:relative;transition:none!important}
      #recomendacoes .ce-clean-player[data-ux-rank="1"]{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important;box-shadow:none!important}
      #recomendacoes .ce-clean-player[data-ux-rank="1"] .ce-clean-rank{background:color-mix(in srgb,var(--primary) 18%,transparent)!important;color:var(--primary)!important}
      #recomendacoes .ce-clean-player.is-active{background:var(--primary)!important;color:#fff!important;border-color:var(--primary)!important;box-shadow:none!important}
      #recomendacoes .ce-clean-player.is-active .ce-clean-rank{background:rgba(255,255,255,.22)!important;color:#fff!important}
      #recomendacoes .ce-clean-detail{max-width:900px!important}
      #recomendacoes .player-card{box-shadow:0 7px 20px rgba(0,0,0,.04)!important}
      #recomendacoes .ce-decision{margin:7px 10px!important;padding:9px 11px!important}
      #recomendacoes .component-row.component-explained{padding:7px 9px!important;margin:3px 0!important}
      #recomendacoes [data-ux-v24-tech-collapsed="1"]{display:none!important}
      #recomendacoes .ce-v24-tech-toggle{display:block;width:100%;margin:8px 0 2px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-weight:700;cursor:pointer}

      #times .lineup-budget-control{display:grid!important;grid-template-columns:minmax(0,1fr) 170px!important;align-items:start!important;justify-content:stretch!important;min-height:0!important;height:auto!important;max-height:none!important;padding:14px!important;margin:0 0 12px!important;gap:16px!important}
      #times .lineup-budget-control .lineup-budget-copy{display:block!important;position:static!important;inset:auto!important;transform:none!important;min-height:0!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important}
      #times .lineup-budget-control .lineup-budget-actions{display:flex!important;flex-direction:column!important;align-items:stretch!important;position:static!important;inset:auto!important;transform:none!important;min-height:0!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important;gap:8px!important}
      #times .lineup-budget-control .lineup-budget-input-wrap{min-height:0!important;height:auto!important;margin:0!important;position:static!important}
      #times .lineup-budget-control>*{min-height:0!important;max-height:none!important}
      #times .pitch-line.defense,#monte-seu-time .monte-line.defense,#monte-seu-time .pitch-line.defense{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(0,1fr)!important;align-items:center!important}

      #monte-seu-time .monte-builder-pitch{min-height:470px!important;max-width:920px!important;margin-inline:auto!important}
      #monte-seu-time .monte-slot{transition:none!important}

      #historico .history-v21-legend .proj{color:${ORANGE}!important}
      #historico .history-v21-legend .real{color:${GREEN}!important}
      #historico .history-v21-chart polyline:first-of-type{stroke:${ORANGE}!important}
      #historico .history-v21-chart .history-point-proj circle{fill:${ORANGE}!important}
      #historico .history-v21-chart .history-point-proj text{fill:${ORANGE}!important}
      #historico .history-v21-chart polyline:nth-of-type(2){stroke:${GREEN}!important}
      #historico .history-v21-chart .history-point-real circle{fill:${GREEN}!important}
      #historico .history-v21-chart .history-point-real text{fill:${GREEN}!important}
      #historico [data-ux-v24-filter="1"],#historico [data-ux-v24-toolbar-hidden="1"]{display:none!important}
      #historico svg{overflow:visible!important}

      #analise [data-ux-v24-old-reading="1"],#analise [data-ux-v26-orphan-reading="1"]{display:none!important}
      #analise .ce-round-item{padding:7px 0!important}
      #analise .ce-round-item strong{font-size:11px!important}
      #analise .ce-round-item small{font-size:9px!important;line-height:1.35!important}
      #analise .ce-round-card{padding:13px!important}

      @media(max-width:700px){
        #recomendacoes .ce-clean-tabs{padding:7px!important;gap:5px!important}
        #recomendacoes .ce-clean-player{padding:6px 8px!important;font-size:10px!important}
        #recomendacoes .ce-clean-detail .player-card{border-radius:13px!important;padding:7px!important}
        #recomendacoes .ce-clean-detail .player-header{padding:6px!important;margin-bottom:4px!important}
        #recomendacoes .ce-clean-detail .player-card h2,#recomendacoes .ce-clean-detail .player-card h3{margin-top:2px!important;margin-bottom:3px!important}
        #recomendacoes .ce-clean-detail .projection-box,#recomendacoes .ce-clean-detail .projection-highlight{padding:7px!important;margin:5px 0!important;min-height:0!important}
        #recomendacoes .ce-decision{margin:4px 0!important;padding:7px 8px!important}
        #recomendacoes .component-row.component-explained{padding:5px 6px!important;margin:2px 0!important}
        #recomendacoes .ce-v24-tech-toggle{margin-top:5px!important;padding:7px!important}
        #times .lineup-budget-control{display:flex!important;flex-direction:column!important;padding:11px!important;gap:8px!important;min-height:0!important;height:auto!important}
        #times .lineup-budget-control .lineup-budget-copy,#times .lineup-budget-control .lineup-budget-actions{display:flex!important;flex-direction:column!important;gap:6px!important;min-height:0!important;height:auto!important}
        #monte-seu-time .monte-builder-pitch{min-height:365px!important;margin:0 4px!important}
        #monte-seu-time .monte-line.attack{top:5%!important}
        #monte-seu-time .monte-line.midfield{top:29%!important}
        #monte-seu-time .monte-line.defense{top:56%!important}
        #monte-seu-time .monte-line.goalkeeper{top:80%!important}
        #monte-seu-time .monte-slot{min-height:50px!important;width:min(66px,100%)!important;padding:5px!important}
        #monte-seu-time .lineup-pitch{min-height:370px!important}
        #historico .history-v21-chart,#historico .history-chart{min-height:250px!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch}
        #historico .history-v21-chart svg,#historico .history-chart svg{min-width:860px!important;height:250px!important}
        #historico .history-v21-table tr{grid-template-columns:minmax(0,1.4fr) repeat(2,minmax(58px,.5fr))!important;gap:3px 6px!important;padding:6px 7px!important;border-radius:8px!important}
        #historico .history-v21-table td{font-size:8.5px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function jogadoresDaPosicao() {
    try {
      if (typeof window.obterPosicaoAtiva === "function" && typeof window.obterJogadoresDaPosicao === "function") {
        const lista = window.obterJogadoresDaPosicao(window.obterPosicaoAtiva());
        return Array.isArray(lista) ? lista.filter(Boolean) : [];
      }
    } catch (_) {}
    return [];
  }

  function idJogador(j) {
    return String(j?.id ?? j?.atletaId ?? j?.atleta_id ?? j?.apelido ?? j?.nome ?? "");
  }

  function garantirRecomendacoes() {
    const tabs = document.querySelector("#recomendacoes .ce-clean-tabs");
    if (!tabs) return;
    const botoes = [...tabs.querySelectorAll(".ce-clean-player[data-ce-player]")];
    if (!botoes.length) return;
    botoes.forEach((botao, i) => { botao.dataset.uxRank = String(i + 1); });
    if (!botoes.some(botao => botao.classList.contains("is-active"))) botoes[0].click();

    const detalhe = document.querySelector("#recomendacoes .ce-clean-detail");
    if (!detalhe) return;
    detalhe.querySelectorAll("[data-ux-v24-mobile-extra]").forEach(el => delete el.dataset.uxV24MobileExtra);

    const componentes = [...detalhe.querySelectorAll(".component-row.component-explained, .component-row")];
    if (componentes.length) {
      const pai = componentes[0].parentElement;
      if (pai && !pai.querySelector(".ce-v24-tech-toggle")) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "ce-v24-tech-toggle";
        botao.textContent = "Ver critérios técnicos";
        botao.addEventListener("click", () => {
          const fechado = componentes.some(el => el.dataset.uxV24TechCollapsed === "1");
          componentes.forEach(el => {
            if (fechado) delete el.dataset.uxV24TechCollapsed;
            else el.dataset.uxV24TechCollapsed = "1";
          });
          botao.textContent = fechado ? "Ocultar critérios técnicos" : "Ver critérios técnicos";
        });
        componentes.forEach(el => el.dataset.uxV24TechCollapsed = "1");
        pai.insertBefore(botao, componentes[0]);
      }
    }

    const ativo = botoes.find(botao => botao.classList.contains("is-active"));
    if (!ativo || reparando) return;
    const jogador = jogadoresDaPosicao().find(j => idJogador(j) === ativo.dataset.cePlayer);
    const nome = norm(jogador?.apelido || jogador?.nome || "");
    if (nome && !norm(detalhe.textContent).includes(nome)) {
      reparando = true;
      try { ativo.click(); } catch (_) {}
      window.setTimeout(() => { reparando = false; }, 100);
    }
  }

  function ordenarDefesa(selector, seletorItens, obterPosicao) {
    document.querySelectorAll(selector).forEach(linha => {
      const itens = [...linha.querySelectorAll(seletorItens)];
      if (itens.length < 3) return;
      itens.forEach(item => { item.style.order = ""; });
      const lat = itens.filter(i => obterPosicao(i) === "LAT");
      const zag = itens.filter(i => obterPosicao(i) === "ZAG");
      let ordem = itens;
      if (lat.length >= 2 && zag.length) ordem = [lat[0], ...zag, lat[1], ...lat.slice(2)].filter(Boolean);
      else if (lat.length === 1 && zag.length) ordem = [lat[0], ...zag].filter(Boolean);
      ordem.forEach((item, i) => { item.style.order = String(i + 1); });
      linha.dataset.uxV24DefenseStable = "1";
      linha.dataset.uxV24DefenseOrder = ordem.map(obterPosicao).join("|");
    });
  }

  function posicaoCardCampo(card) {
    const titulo = String(card.getAttribute("title") || "").toUpperCase();
    if (/\bLAT\b/.test(titulo)) return "LAT";
    if (/\bZAG\b/.test(titulo)) return "ZAG";
    return "";
  }

  function ajustarDefesa() {
    ordenarDefesa(
      "#monte-seu-time .monte-line.defense",
      "[data-monte-slot]",
      slot => String(slot.dataset.pos || "").toUpperCase()
    );
    ordenarDefesa(
      "#monte-seu-time .pitch-line.defense, #times .pitch-line.defense",
      ":scope > .pitch-player",
      posicaoCardCampo
    );
  }

  function ajustarMenuAtivo(item) {
    if (!item?.matches?.(".menu-item[data-tab]")) return;
    document.querySelectorAll(".menu-item.active").forEach(outro => {
      if (outro !== item) outro.classList.remove("active");
    });
    item.classList.add("active");
  }

  function ajustarHistorico() {
    ["historyRound", "historyPosition"].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      (select.closest("label") || select).dataset.uxV24Filter = "1";
    });
    document.querySelectorAll("#historico .history-toolbar").forEach(toolbar => {
      if (![...toolbar.children].some(el => el.dataset.uxV24Filter !== "1")) toolbar.dataset.uxV24ToolbarHidden = "1";
    });
    document.querySelectorAll("#historico svg [stroke='#6077db'],#historico svg [stroke='#4f67d8']").forEach(el => el.setAttribute("stroke", ORANGE));
    document.querySelectorAll("#historico svg [fill='#6077db'],#historico svg [fill='#4f67d8']").forEach(el => el.setAttribute("fill", ORANGE));
  }

  function jogadores() {
    try {
      if (typeof window.obterJogadoresCarregados === "function") {
        const lista = window.obterJogadoresCarregados();
        if (Array.isArray(lista)) return lista.filter(Boolean);
      }
    } catch (_) {}
    return [];
  }

  function ocultarCabecalhoAntigo(raiz) {
    [...raiz.querySelectorAll("h1,h2,h3,h4,.section-kicker,.eyebrow,strong")].forEach(el => {
      const texto = norm(el.textContent);
      if (!texto.includes("leitura dos confrontos") && !texto.includes("leitura rapida para a rodada")) return;

      const pai = el.parentElement;
      const textoPai = norm(pai?.textContent);
      const somenteTitulo = textoPai === "leitura dos confrontos analise da rodada" ||
        textoPai === "leitura rapida para a rodada analise da rodada";

      if (pai && somenteTitulo) {
        pai.dataset.uxV26OrphanReading = "1";
        return;
      }

      el.dataset.uxV26OrphanReading = "1";
      if (pai) {
        [...pai.querySelectorAll("h1,h2,h3,h4")].forEach(titulo => {
          if (titulo !== el && norm(titulo.textContent) === "analise da rodada") titulo.dataset.uxV26OrphanReading = "1";
        });
      }
    });
  }

  function ajustarAnalise() {
    const raiz = document.getElementById("analise");
    if (!raiz) return;
    ocultarCabecalhoAntigo(raiz);

    const base = jogadores();
    if (!base.length) return;
    document.querySelectorAll("#analise .ce-round-card").forEach(card => {
      const titulo = norm(card.querySelector("h3")?.textContent);
      if (!["onde atacar", "onde buscar seguranca", "onde ter cautela"].includes(titulo)) return;
      card.querySelectorAll(".ce-round-item").forEach(item => {
        const strong = item.querySelector("strong");
        const small = item.querySelector("small");
        if (!strong || !small || /\b(vs|x)\b/i.test(small.textContent)) return;
        const sigla = String(strong.textContent || "").trim().toUpperCase();
        const atleta = base.find(j => String(j?.siglaClube || j?.clubeSigla || j?.clube || "").toUpperCase() === sigla && (j?.siglaAdversario || j?.adversarioSigla || j?.adversario));
        if (!atleta) return;
        const adv = String(atleta.siglaAdversario || atleta.adversarioSigla || atleta.adversario || "").toUpperCase();
        if (adv) small.textContent = `${sigla} x ${adv} • ${small.textContent}`;
      });
    });
  }

  function aplicar() {
    css();
    garantirRecomendacoes();
    ajustarDefesa();
    ajustarHistorico();
    ajustarAnalise();
  }

  function agendar(atraso = 60) {
    window.clearTimeout(timer);
    timer = window.setTimeout(aplicar, atraso);
  }

  function iniciar() {
    css();
    [0, 120, 450, 1000, 2200].forEach(ms => window.setTimeout(aplicar, ms));
    window.addEventListener("cartola:escalacoes-atualizadas", () => agendar(80));
    window.addEventListener("cartola:rodada-atualizada", () => agendar(80));
    document.addEventListener("click", evento => {
      const itemMenu = evento.target.closest?.(".menu-item[data-tab]");
      if (itemMenu) {
        window.setTimeout(() => ajustarMenuAtivo(itemMenu), 0);
        agendar(50);
      }
      if (evento.target.closest?.("#recomendacoes, #times, #monte-seu-time, #historico, #analise, .monte-picker-backdrop")) agendar(50);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();