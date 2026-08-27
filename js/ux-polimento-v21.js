/* =========================================================
   CARTOLA ESTATÍSTICO V2.1
   Polimento final de UX pós-revisão
   ========================================================= */
(() => {
  "use strict";

  const ID_STYLE = "cartola-ux-polimento-v21";

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function n(v, p = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : p;
  }

  function nome(j) {
    return String(j?.apelido || j?.nome || "Jogador").trim();
  }

  function posicao(j) {
    return String(j?.posicao || j?.posicaoSigla || "").toUpperCase();
  }

  function projecao(j) {
    const candidatos = [j?.projecaoViabilidade, j?.projecaoContextualizada, j?.projecaoCalibrada, j?.projecao, j?.score];
    for (const valor of candidatos) {
      const x = Number(valor);
      if (Number.isFinite(x)) return x;
    }
    return 0;
  }

  function clube(j) {
    return String(j?.siglaClube || j?.clube?.abreviacao || j?.clube || "--").toUpperCase();
  }

  function injetarCss() {
    if (document.getElementById(ID_STYLE)) return;
    const style = document.createElement("style");
    style.id = ID_STYLE;
    style.textContent = `
      /* Composição da nota */
      .component-row.component-explained{padding:12px 14px;border-radius:14px;margin:8px 0;background:var(--card-bg,#fff);border:1px solid var(--border-color,#e1e6e3)}
      .component-row .component-label{align-items:flex-start;gap:10px}.component-row .component-label>span{min-width:0;flex:1}.component-row .component-label b{display:block;font-size:.92rem}.component-row .component-label small{display:block;margin-top:3px;line-height:1.35;opacity:.72}
      .component-row .component-label>strong{flex:0 0 auto;padding:5px 9px;border-radius:999px;font-size:.7rem;letter-spacing:.02em;border:1px solid currentColor}
      .component-row.is-good .component-label>strong{color:#087a46;background:rgba(8,122,70,.08)}
      .component-row.is-neutral .component-label>strong{color:#6c7370;background:rgba(108,115,112,.08)}
      .component-row.is-attention .component-label>strong{color:#a46100;background:rgba(164,97,0,.09)}
      .component-row.is-bad .component-label>strong{color:#b42318;background:rgba(180,35,24,.08)}
      .component-row .component-track{height:5px;margin-top:9px}.component-row .component-human-reading{display:none}

      /* Times sugeridos */
      .suggested-lineup-card.has-visual-pitch .lineup-players-title,.suggested-lineup-card.has-visual-pitch .lineup-players-list{display:none!important}
      .suggested-lineup-card .lineup-detail-section[data-ux-hide-bank="1"]{display:none!important}
      .suggested-lineups-container>.lineup-budget-panel,.suggested-lineups-container>.lineup-patrimony-control{margin-bottom:14px!important}
      .suggested-lineup-card{overflow:hidden}.lineup-pitch-shell{margin-top:14px!important}.lineup-strategy-summary{margin-top:12px!important}
      .pitch-bench{padding:12px!important}.pitch-bench-heading{margin-bottom:9px!important}.pitch-bench-list{gap:7px!important}.pitch-bench-player{min-height:54px!important;padding:7px 9px!important}

      /* Projeções */
      #projecoes .section-header{margin-bottom:10px}#projecoes .v21-toolbar{margin:10px 0!important;gap:8px!important}
      #projecoes .v21-grid{grid-template-columns:repeat(auto-fit,minmax(235px,1fr))!important;gap:8px!important}
      #projecoes .v21-player{padding:10px 12px!important;border-radius:13px!important;min-height:0!important}
      #projecoes .v21-player h3{font-size:.98rem!important}#projecoes .v21-proj{font-size:1.18rem!important}
      #projecoes .v21-chips{margin-top:5px!important}.v21-badge{padding:3px 6px!important;font-size:.67rem!important}.v21-match{margin-top:6px!important}

      /* Histórico */
      #historico .section-header{margin-bottom:12px}#historico .history-filters,#historico .historico-filtros{gap:8px!important}
      #historico .history-card,#historico .historico-card{border-radius:14px!important}
      #historico canvas{max-height:300px!important}
      #historico .history-chart-note{margin:8px 0 14px;padding:9px 11px;border-radius:10px;background:rgba(164,97,0,.08);font-size:.78rem;line-height:1.4}

      /* Nova análise */
      #analise .analysis-summary,#analise [data-analise-detalhes]{display:none!important}
      #analise .analysis-human-intro{display:none!important}
      .decision-dashboard{display:grid;gap:14px;margin-top:10px}
      .decision-hero{padding:17px 18px;border:1px solid var(--border-color,#dfe5e1);border-radius:16px;background:var(--card-bg,#fff)}
      .decision-hero>span,.decision-block>span{font-size:.7rem;font-weight:800;letter-spacing:.08em;color:var(--primary,#138a52)}
      .decision-hero h3{margin:4px 0 6px;font-size:1.25rem}.decision-hero p{margin:0;line-height:1.5;opacity:.78}
      .decision-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .decision-block{padding:15px;border:1px solid var(--border-color,#dfe5e1);border-radius:15px;background:var(--card-bg,#fff)}
      .decision-block h3{margin:4px 0 10px;font-size:1.05rem}.decision-list{display:grid;gap:7px}.decision-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid rgba(127,127,127,.12)}.decision-item:first-child{border-top:0;padding-top:0}
      .decision-item strong{font-size:.9rem}.decision-item small{display:block;margin-top:2px;line-height:1.35;opacity:.7}.decision-rank{flex:0 0 auto;font-size:.7rem;font-weight:800;padding:4px 7px;border-radius:999px;background:rgba(19,138,82,.08);color:#087a46}
      .decision-plan{padding:16px;border-radius:15px;background:rgba(19,138,82,.08);border:1px solid rgba(19,138,82,.22)}.decision-plan h3{margin:0 0 9px}.decision-plan ul{margin:0;padding-left:18px;line-height:1.7}
      @media(max-width:720px){.decision-grid{grid-template-columns:1fr}.decision-hero{padding:14px}.decision-block{padding:13px}.decision-hero h3{font-size:1.1rem}#projecoes .v21-grid{grid-template-columns:1fr!important}.pitch-bench-list{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function polirComposicao() {
    document.querySelectorAll(".component-row.component-explained").forEach(row => {
      const badge = row.querySelector(".component-label>strong");
      const txt = (badge?.textContent || "").toLowerCase();
      row.classList.remove("is-good","is-neutral","is-attention","is-bad");
      if (txt.includes("favor")) row.classList.add("is-good");
      else if (txt.includes("atenção") || txt.includes("atencao")) row.classList.add("is-attention");
      else if (txt.includes("desfavor")) row.classList.add("is-bad");
      else row.classList.add("is-neutral");
    });
  }

  function polirTimes() {
    document.querySelectorAll(".suggested-lineup-card").forEach(card => {
      const detalhes = card.querySelector(".lineup-complete-analysis");
      detalhes?.querySelectorAll(".lineup-detail-section").forEach(sec => {
        const txt = (sec.textContent || "").toLowerCase();
        if (txt.includes("banco") || txt.includes("reserva de luxo")) sec.dataset.uxHideBank = "1";
      });
      const botao = card.querySelector("[data-lineup-details-button] span:first-child");
      if (botao && /banco/i.test(botao.textContent || "")) botao.textContent = "Ver análise completa";
    });
  }

  function polirHistorico() {
    const tab = document.getElementById("historico");
    if (!tab || tab.querySelector(".history-chart-note")) return;
    const texto = tab.textContent || "";
    if (!texto.includes("-250") && !texto.includes("-240")) return;
    const alvo = tab.querySelector("canvas")?.parentElement || tab.querySelector(".section-header");
    if (!alvo) return;
    const nota = document.createElement("div");
    nota.className = "history-chart-note";
    nota.innerHTML = "<strong>R2 marcada como não confiável.</strong> A projeção histórica dessa rodada contém um valor inválido de origem e não deve ser usada para avaliar o modelo. O dado foi preservado para auditoria, mas será desconsiderado na leitura visual.";
    alvo.insertAdjacentElement("afterend", nota);
  }

  function topJogadores(jogadores, filtro, qtd = 3) {
    return jogadores.filter(filtro).slice().sort((a,b) => projecao(b) - projecao(a)).slice(0,qtd);
  }

  function linhaJogador(j, rotulo = "") {
    return `<div class="decision-item"><div><strong>${esc(nome(j))}</strong><small>${esc(posicao(j))} · ${esc(clube(j))} · projeção ${projecao(j).toFixed(1).replace(".",",")} pts</small></div>${rotulo ? `<span class="decision-rank">${esc(rotulo)}</span>` : ""}</div>`;
  }

  function montarAnaliseDecisao() {
    const tab = document.getElementById("analise");
    if (!tab || tab.querySelector(".decision-dashboard")) return;
    const api = window.AnaliseRodada || window.CartolaAnaliseRodada;
    if (!api || typeof api.obterEstado !== "function") return;
    const st = api.obterEstado();
    const jogadores = Array.isArray(st?.jogadores) ? st.jogadores : [];
    const clubes = Array.isArray(st?.analises) ? st.analises : [];
    if (!jogadores.length || !clubes.length) return;

    const ataque = clubes.slice().sort((a,b)=>n(b.forcaOfensiva)-n(a.forcaOfensiva)).slice(0,3);
    const defesa = clubes.slice().sort((a,b)=>n(b.forcaDefensiva)-n(a.forcaDefensiva)).slice(0,3);
    const riscoDef = clubes.slice().sort((a,b)=>n(a.forcaDefensiva)-n(b.forcaDefensiva)).slice(0,2);
    const melhores = topJogadores(jogadores, j => posicao(j) !== "TEC", 5);
    const destaquesPos = ["GOL","LAT","ZAG","MEI","ATA","TEC"].map(p => topJogadores(jogadores,j=>posicao(j)===p,1)[0]).filter(Boolean);

    const hero = `Rodada com melhor cenário ofensivo em <b>${esc(ataque[0]?.clube || "--")}</b> e melhor proteção defensiva em <b>${esc(defesa[0]?.clube || "--")}</b>. Use os blocos abaixo como guia rápido; os índices técnicos continuam no modelo, mas não precisam ser a primeira coisa que você vê.`;
    const jogos = Array.isArray(st?.partidas) ? st.partidas.slice(0,5) : [];
    const jogoHtml = jogos.map((p,i)=>{
      const casa = p?.clube_casa?.abreviacao || p?.clubeCasa?.abreviacao || p?.mandante?.abreviacao || "Mandante";
      const fora = p?.clube_visitante?.abreviacao || p?.clubeVisitante?.abreviacao || p?.visitante?.abreviacao || "Visitante";
      return `<div class="decision-item"><div><strong>${esc(casa)} × ${esc(fora)}</strong><small>${i===0?"Priorize jogadores com boa projeção individual e evite concentração excessiva.":"Confronto para combinar projeção, titularidade e risco antes de escalar."}</small></div></div>`;
    }).join("");

    const dash = document.createElement("div");
    dash.className = "decision-dashboard";
    dash.innerHTML = `
      <section class="decision-hero"><span>LEITURA DA RODADA ${esc(st?.rodada || "")}</span><h3>O que fazer nesta rodada</h3><p>${hero}</p></section>
      <div class="decision-grid">
        <section class="decision-block"><span>🔥 ONDE ATACAR</span><h3>Melhores cenários ofensivos</h3><div class="decision-list">${ataque.map((a,i)=>`<div class="decision-item"><div><strong>${esc(a.clube)}</strong><small>${i===0?"Principal alvo ofensivo da rodada.":"Boa alternativa para meias e atacantes."}</small></div><span class="decision-rank">#${i+1}</span></div>`).join("")}</div></section>
        <section class="decision-block"><span>🛡️ ONDE BUSCAR SG</span><h3>Defesas mais interessantes</h3><div class="decision-list">${defesa.map((a,i)=>`<div class="decision-item"><div><strong>${esc(a.clube)}</strong><small>${i===0?"Melhor cenário defensivo do modelo.":"Boa opção para goleiro, laterais e zagueiros."}</small></div><span class="decision-rank">#${i+1}</span></div>`).join("")}</div></section>
        <section class="decision-block"><span>⚽ JOGOS PARA FICAR DE OLHO</span><h3>Leitura rápida dos confrontos</h3><div class="decision-list">${jogoHtml}</div></section>
        <section class="decision-block"><span>⭐ MELHORES OPORTUNIDADES</span><h3>Destaques por posição</h3><div class="decision-list">${destaquesPos.map(j=>linhaJogador(j,"TOP")).join("")}</div></section>
        <section class="decision-block"><span>🚨 CAUTELAS</span><h3>Onde reduzir exposição</h3><div class="decision-list">${riscoDef.map((a,i)=>`<div class="decision-item"><div><strong>Defesa de ${esc(a.clube)}</strong><small>${i===0?"Cenário defensivo mais frágil entre os clubes analisados.":"Evite concentração defensiva sem boa justificativa individual."}</small></div></div>`).join("")}${melhores.length?`<div class="decision-item"><div><strong>Não dependa só dos óbvios</strong><small>Mesmo os melhores projetados devem respeitar orçamento, formação e limite de atletas por clube.</small></div></div>`:""}</div></section>
        <section class="decision-block"><span>💎 ACHADOS DO MODELO</span><h3>Quem merece atenção</h3><div class="decision-list">${melhores.slice(0,4).map((j,i)=>linhaJogador(j,i===0?"ÓBVIO":i===1?"FORTE":"OPÇÃO")).join("")}</div></section>
      </div>
      <section class="decision-plan"><h3>Plano da rodada</h3><ul><li><b>Priorizar ataque:</b> ${esc(ataque.slice(0,2).map(x=>x.clube).join(" e "))}</li><li><b>Buscar SG:</b> ${esc(defesa.slice(0,2).map(x=>x.clube).join(" e "))}</li><li><b>Evitar concentração defensiva:</b> ${esc(riscoDef.map(x=>x.clube).join(" e "))}</li><li><b>Capitão:</b> comece pelo atleta de maior projeção entre os titulares seguros.</li></ul></section>`;

    const header = tab.querySelector(".section-header");
    (header || tab.firstElementChild)?.insertAdjacentElement("afterend", dash);
  }

  function executar() {
    injetarCss();
    polirComposicao();
    polirTimes();
    polirHistorico();
    montarAnaliseDecisao();
  }

  let timer = null;
  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(executar, 80);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", agendar, {once:true});
  else agendar();

  const observer = new MutationObserver(agendar);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener("cartola:escalacoes-atualizadas", agendar);
  setTimeout(agendar, 700);
  setTimeout(agendar, 1800);
})();
