/* Cartola Estatístico — fechamento visual V2.3 */
(() => {
  "use strict";

  const STYLE_ID = "cartola-ux-final-v23";
  const ORANGE = "#d9822b";

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
      /* Recomendações: hierarquia mais limpa e menos cor */
      #recomendacoes .ce-clean-tabs{gap:7px!important;padding:10px!important}
      #recomendacoes .ce-clean-player{padding:8px 11px!important;font-size:12px!important;position:relative}
      #recomendacoes .ce-clean-player:first-child{background:var(--primary)!important;color:#fff!important;border-color:var(--primary)!important}
      #recomendacoes .ce-clean-player.is-active:not(:first-child){background:var(--surface)!important;color:var(--text)!important;border-color:var(--text-soft)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--text-soft) 45%,transparent)!important}
      #recomendacoes .ce-clean-player.is-active:not(:first-child)::after{content:"aberto";font-size:7px;font-weight:850;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft);margin-left:1px}
      #recomendacoes .ce-clean-detail{max-width:900px!important}
      #recomendacoes .player-card{box-shadow:0 8px 22px rgba(0,0,0,.045)!important}
      #recomendacoes .ce-decision{margin:9px 12px!important;padding:11px 13px!important;border-color:var(--border)!important;background:var(--surface-soft)!important}
      #recomendacoes .ce-decision-kicker{font-size:8px!important;color:var(--text-soft)!important}
      #recomendacoes .ce-decision-title{font-size:15px!important;margin:3px 0 4px!important}
      #recomendacoes .ce-decision p{font-size:10px!important;line-height:1.4!important}
      #recomendacoes .ce-decision-chips{margin-top:7px!important;gap:5px!important}
      #recomendacoes .ce-decision-chip{padding:4px 7px!important;font-size:8px!important;background:var(--surface)!important;border:1px solid var(--border)!important}
      #recomendacoes .component-row.component-explained{padding:8px 10px!important;margin:4px 0!important;background:var(--surface)!important}
      #recomendacoes .component-row .component-label b{font-size:11px!important}
      #recomendacoes .component-row .component-label small{font-size:9px!important;line-height:1.3!important}
      #recomendacoes .ce-show-all-factors{padding:7px!important;margin-top:7px!important;font-size:9px!important}
      #recomendacoes [data-ux-v23-hide="1"]{display:none!important}

      /* Patrimônio / times sugeridos: remover vazio vertical */
      #times .lineup-budget-control,#times .lineup-budget-panel,#times .lineup-patrimony-control{min-height:0!important;height:auto!important;max-height:none!important;padding:14px!important;margin:0 0 12px!important;align-content:start!important;justify-content:flex-start!important;gap:10px!important}
      #times .lineup-budget-control>*{margin-top:0!important;margin-bottom:0!important}

      /* Monte seu time: campo menor e defesa estável */
      #monte-seu-time .monte-builder-pitch{min-height:500px!important}
      #monte-seu-time .monte-line.defense{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(0,1fr)!important}
      #monte-seu-time .monte-slot{transition:none!important}

      /* Histórico */
      #historico .history-v21-legend .proj{color:${ORANGE}!important}
      #historico [data-ux-v23-filter="1"]{display:none!important}
      #historico .history-v21-table tr{box-shadow:none!important}

      /* Análise: confronto explícito e menos peso visual */
      #analise .ce-round-item{padding:7px 0!important}
      #analise .ce-round-item strong{font-size:11px!important}
      #analise .ce-round-item small{font-size:9px!important;line-height:1.35!important}
      #analise .ce-round-tag{background:var(--surface-soft)!important;color:var(--text-soft)!important}
      #analise .ce-round-card{padding:13px!important}

      @media(max-width:700px){
        #recomendacoes .ce-clean-detail .player-card{border-radius:14px!important}
        #recomendacoes .ce-decision{margin:7px 0!important;padding:10px 11px!important}
        #recomendacoes .ce-clean-hint{font-size:9px!important}
        #times .lineup-budget-control,#times .lineup-budget-panel,#times .lineup-patrimony-control{padding:11px!important;gap:8px!important}
        #monte-seu-time .monte-builder-pitch{min-height:395px!important;margin:0 5px!important}
        #monte-seu-time .monte-line.attack{top:5%!important}
        #monte-seu-time .monte-line.midfield{top:29%!important}
        #monte-seu-time .monte-line.defense{top:56%!important}
        #monte-seu-time .monte-line.goalkeeper{top:80%!important}
        #monte-seu-time .monte-slot{min-height:56px!important;width:min(70px,100%)!important}
        #historico .history-v21{gap:8px!important}
        #historico .history-v21-card{padding:10px!important}
        #historico .history-v21-table tbody{gap:5px!important}
        #historico .history-v21-table tr{grid-template-columns:minmax(0,1.35fr) repeat(2,minmax(62px,.55fr))!important;gap:4px 7px!important;padding:7px 8px!important;border-radius:9px!important;align-items:center!important}
        #historico .history-v21-table td{font-size:9px!important}
        #historico .history-v21-table td:first-child{grid-column:1!important}
        #historico .history-v21-table td::before{font-size:6.5px!important;margin-bottom:1px!important}
        #historico .history-v21-reading{grid-column:1/-1!important;max-width:none!important;font-size:8px!important;line-height:1.25!important}
        #historico .history-v21-meta{font-size:7.5px!important}
      }
      @media(max-width:390px){#monte-seu-time .monte-builder-pitch{min-height:375px!important}}
    `;
    document.head.appendChild(style);
  }

  function ajustarMenu() {
    if (document.documentElement.dataset.uxV23Menu === "1") return;
    document.documentElement.dataset.uxV23Menu = "1";
    document.addEventListener("click", evento => {
      const item = evento.target.closest?.(".menu-item[data-tab]");
      if (!item) return;
      window.setTimeout(() => {
        document.querySelectorAll(".menu-item").forEach(botao => botao.classList.toggle("active", botao === item));
        document.querySelectorAll(".tab-content").forEach(secao => secao.classList.toggle("active", secao.id === item.dataset.tab));
      }, 0);
    }, true);
  }

  function ajustarRecomendacoes() {
    const detalhe = document.querySelector("#recomendacoes .ce-clean-detail");
    if (!detalhe) return;

    const termosRedundantes = ["leitura do motor estatistico", "principal motivo"];
    detalhe.querySelectorAll("section,article,div").forEach(el => {
      if (el.dataset.uxV23Hide === "1") return;
      const texto = norm(el.textContent);
      if (texto.length > 1100) return;
      if (termosRedundantes.some(t => texto.includes(t))) {
        const filhosComMesmoTermo = [...el.children].some(f => termosRedundantes.some(t => norm(f.textContent).includes(t)));
        if (!filhosComMesmoTermo || el.children.length <= 3) el.dataset.uxV23Hide = "1";
      }
    });

    const tabs = document.querySelector("#recomendacoes .ce-clean-tabs");
    if (tabs) {
      const botoes = [...tabs.querySelectorAll(".ce-clean-player")];
      botoes.forEach((b, i) => {
        b.title = i === 0 ? "Melhor opção do modelo nesta posição" : (b.classList.contains("is-active") ? "Jogador aberto nos detalhes" : "Abrir detalhes");
      });
    }
  }

  function corrigirDefesaMonte() {
    document.querySelectorAll("#monte-seu-time .monte-line.defense").forEach(linha => {
      const slots = [...linha.querySelectorAll("[data-monte-slot]")];
      if (slots.length < 3) return;
      const lat = slots.filter(s => String(s.dataset.pos || "").toUpperCase() === "LAT")
        .sort((a,b) => String(a.dataset.monteSlot).localeCompare(String(b.dataset.monteSlot)));
      const zag = slots.filter(s => String(s.dataset.pos || "").toUpperCase() === "ZAG")
        .sort((a,b) => String(a.dataset.monteSlot).localeCompare(String(b.dataset.monteSlot)));
      if (!lat.length || !zag.length) return;
      const ordem = lat.length >= 2 ? [lat[0], ...zag, lat[1], ...lat.slice(2)] : [...lat, ...zag];
      ordem.forEach(slot => linha.appendChild(slot));
    });
  }

  function removerFiltrosHistorico() {
    ["historyRound", "historyPosition"].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      const label = select.closest("label");
      (label || select).dataset.uxV23Filter = "1";
    });
  }

  function trocarCorGrafico() {
    document.querySelectorAll("#historico svg [stroke='#6077db']").forEach(el => el.setAttribute("stroke", ORANGE));
    document.querySelectorAll("#historico svg [fill='#6077db']").forEach(el => el.setAttribute("fill", ORANGE));
  }

  function enriquecerAnalise() {
    const base = jogadores();
    if (!base.length) return;
    document.querySelectorAll("#analise .ce-round-card").forEach(card => {
      const titulo = norm(card.querySelector("h3")?.textContent);
      if (!["onde atacar", "onde buscar seguranca", "onde ter cautela"].includes(titulo)) return;
      card.querySelectorAll(".ce-round-item").forEach(item => {
        const strong = item.querySelector("strong");
        const small = item.querySelector("small");
        if (!strong || !small || norm(small.textContent).includes(" vs ")) return;
        const sigla = String(strong.textContent || "").trim().toUpperCase();
        const atleta = base.find(j => clube(j) === sigla && adversario(j));
        if (!atleta) return;
        const adv = adversario(atleta);
        small.textContent = `${sigla} x ${adv} • ${small.textContent}`;
      });
    });
  }

  let timer = null;
  function aplicar() {
    css();
    ajustarMenu();
    ajustarRecomendacoes();
    corrigirDefesaMonte();
    removerFiltrosHistorico();
    trocarCorGrafico();
    enriquecerAnalise();
  }

  function agendar() {
    window.clearTimeout(timer);
    timer = window.setTimeout(aplicar, 45);
  }

  function iniciar() {
    aplicar();
    [180, 500, 1100, 2200].forEach(ms => window.setTimeout(aplicar, ms));
    const observer = new MutationObserver(agendar);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("cartola:escalacoes-atualizadas", agendar);
    window.addEventListener("cartola:rodada-atualizada", agendar);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
