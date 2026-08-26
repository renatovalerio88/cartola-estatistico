/* Cartola Estatístico — UX V2.1: decisão primeiro, detalhes sob demanda */
(function () {
  "use strict";

  const POSICOES = { GOL: "Goleiros", LAT: "Laterais", ZAG: "Zagueiros", MEI: "Meias", ATA: "Atacantes", TEC: "Treinadores" };
  let instalado = false;
  let selecionado = null;
  let posicaoRenderizada = null;

  function numero(v, p = 0) { const n = Number(v); return Number.isFinite(n) ? n : p; }
  function esc(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
  function texto(el) { return (el?.textContent || "").replace(/\s+/g," ").trim(); }

  function injetarEstilo() {
    if (document.getElementById("ceUxV21Style")) return;
    const s = document.createElement("style");
    s.id = "ceUxV21Style";
    s.textContent = `
      #recomendacoes .hero{grid-template-columns:1fr!important;gap:14px!important}
      #recomendacoes .hero-summary{display:none!important}
      #recomendacoes .hero-text{max-width:860px}
      .ce-clean-recs{display:grid;gap:12px;width:100%}
      .ce-clean-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
      .ce-clean-player{appearance:none;border:1px solid var(--border);background:var(--surface-soft);color:var(--text);border-radius:999px;padding:9px 13px;cursor:pointer;font:inherit;font-weight:700;display:inline-flex;align-items:center;gap:8px}
      .ce-clean-player:hover,.ce-clean-player.is-active{border-color:var(--primary);background:var(--primary);color:#fff}
      .ce-clean-rank{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.14);font-size:10px}
      .ce-clean-hint{font-size:11px;color:var(--text-soft);padding:0 3px}
      .ce-clean-detail{min-width:0}.ce-clean-detail .player-card{width:100%;max-width:none}
      .ce-decision{margin:14px 18px;padding:14px 16px;border:1px solid rgba(83,216,145,.22);border-radius:14px;background:rgba(83,216,145,.07)}
      .ce-decision-kicker{font-size:10px;font-weight:800;letter-spacing:.08em;color:#67dfa0;text-transform:uppercase}
      .ce-decision-title{display:block;margin:4px 0 6px;font-size:18px}.ce-decision p{margin:0;color:var(--text-soft);font-size:12px;line-height:1.55}
      .ce-decision-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.ce-decision-chip{padding:6px 9px;border-radius:999px;background:rgba(127,127,127,.10);font-size:10px;font-weight:700}
      .component-row.ce-secondary-factor{display:none}.ce-show-all-factors{margin:10px 0 0;border:1px solid var(--border);background:var(--surface-soft);color:var(--text);border-radius:9px;padding:8px 11px;cursor:pointer;font:inherit;font-size:11px;font-weight:700}
      .ce-analysis-decisions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 18px}.ce-analysis-decision{padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
      .ce-analysis-decision span{display:block;font-size:9px;letter-spacing:.08em;color:#67dfa0;text-transform:uppercase;font-weight:800}.ce-analysis-decision strong{display:block;margin:5px 0 4px;font-size:16px}.ce-analysis-decision p{margin:0;font-size:11px;color:var(--text-soft);line-height:1.45}
      .ce-lineup-purpose{margin:8px 0 0;font-size:11px;color:var(--text-soft)}
      .lineup-player-numbers{min-width:124px}.lineup-player-numbers>strong>small{display:block;margin-top:3px;font-size:10px;font-weight:600;color:var(--text-soft)}
      #projecoes .v21-player,#projecoes .v21-toolbar input,#projecoes .v21-toolbar select{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important}
      #projecoes .v21-player h3,#projecoes .v21-proj,#projecoes .v21-kpi strong{color:var(--text)!important}
      #projecoes .v21-meta,#projecoes .v21-kpi span{color:var(--text-soft)!important;opacity:1!important}
      #projecoes .v21-badge{background:var(--surface-soft)!important;color:var(--text)!important}
      .ce-history-reprocessing{padding:18px;border:1px solid rgba(222,185,84,.28);border-radius:14px;background:rgba(222,185,84,.08);margin:14px 0}.ce-history-reprocessing strong{display:block;margin-bottom:5px}.ce-history-reprocessing p{margin:0;color:var(--text-soft);font-size:12px;line-height:1.5}
      .ce-tech-hidden{display:none!important}
      .ce-tech-toggle{margin:12px 0 18px;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:10px;padding:10px 13px;font:inherit;font-size:11px;font-weight:700;cursor:pointer}
      .ce-methodology-final{display:grid;gap:16px}.ce-methodology-hero,.ce-methodology-card{padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
      .ce-methodology-hero h2,.ce-methodology-card h3{margin:4px 0 8px}.ce-methodology-hero p,.ce-methodology-card p,.ce-methodology-card li{color:var(--text-soft);line-height:1.55;font-size:12px}
      .ce-methodology-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ce-methodology-card ul{margin:8px 0 0;padding-left:18px}.ce-methodology-badge{display:inline-flex;padding:5px 8px;border-radius:999px;background:rgba(83,216,145,.10);color:#67dfa0;font-size:10px;font-weight:800}
      .ce-methodology-note{padding:12px 14px;border-radius:12px;background:var(--surface-soft);font-size:11px;color:var(--text-soft);line-height:1.5}
      @media(min-width:1200px){.content{padding-left:28px!important;padding-right:28px!important}.main-area{min-width:0}.players-grid,.suggested-lineups-container,#projecoes .v21-grid{max-width:none!important}}
      @media(max-width:900px){.ce-analysis-decisions{grid-template-columns:1fr}.ce-methodology-grid{grid-template-columns:1fr}}
      @media(max-width:700px){.ce-clean-tabs{overflow-x:auto;flex-wrap:nowrap;padding:10px;scroll-behavior:auto;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch}.ce-clean-tabs::-webkit-scrollbar{display:none}.ce-clean-player{flex:0 0 auto;transition:none!important}.lineup-player-numbers{min-width:92px}}
    `;
    document.head.appendChild(s);
  }

  function posicaoAtual() { return typeof obterPosicaoAtiva === "function" ? String(obterPosicaoAtiva()).toUpperCase() : "GOL"; }
  function listaAtual() { const l = typeof obterJogadoresDaPosicao === "function" ? obterJogadoresDaPosicao(posicaoAtual()) : []; return Array.isArray(l) ? l : []; }
  function id(j) { return String(j?.id ?? j?.atletaId ?? j?.atleta_id ?? j?.apelido ?? j?.nome ?? ""); }
  function nome(j) { return String(j?.apelido || j?.nome || "Jogador"); }

  function textoRisco(j) {
    const t = String(j?.riscoTexto ?? j?.risco ?? "").toLowerCase();
    if (t.includes("alto")) return "Risco alto";
    if (t.includes("medio") || t.includes("médio")) return "Risco médio";
    return "Risco baixo";
  }

  function criarVeredito(j, idx) {
    const p = posicaoAtual();
    const conf = numero(j?.confianca ?? j?.confiancaNumerica, 0);
    const proj = numero(j?.projecao ?? j?.projecaoCalibrada ?? j?.score, 0);
    const piso = numero(j?.piso, proj);
    const risco = textoRisco(j);
    let titulo = idx === 0 ? "Forte recomendação" : idx <= 2 ? "Boa opção" : "Alternativa";
    if (conf < 60 || risco === "Risco alto") titulo = idx === 0 ? "Boa opção com cautela" : "Aposta com cautela";
    const contexto = [];
    const titularidade = numero(j?.titularidade ?? j?.probabilidadeTitular, 0);
    const chanceSG = numero(j?.chanceSG ?? j?.probabilidadeSG, 0);
    if (titularidade >= 80) contexto.push("boa segurança de titularidade");
    if (["GOL","LAT","ZAG"].includes(p) && chanceSG >= 60) contexto.push("boa perspectiva de SG");
    if (piso >= 4) contexto.push("piso interessante");
    if (proj >= 8) contexto.push("projeção forte");
    const motivo = contexto.length ? contexto.slice(0,2).join(" e ") : "combinação competitiva de projeção, contexto e confiança";
    return `<section class="ce-decision"><span class="ce-decision-kicker">Decisão do modelo</span><strong class="ce-decision-title">${esc(titulo)}</strong><p><b>${idx+1}º entre ${(POSICOES[p] || p).toLowerCase()} indicados.</b> O modelo destaca ${esc(motivo)} nesta rodada.</p><div class="ce-decision-chips"><span class="ce-decision-chip">${proj.toFixed(1)} pts projetados</span><span class="ce-decision-chip">${Math.round(conf)}% confiança</span><span class="ce-decision-chip">${esc(risco)}</span></div></section>`;
  }

  function limitarFatores(host) {
    const rows = [...host.querySelectorAll(".component-row")];
    if (rows.length <= 5) return;
    rows.forEach((r,i)=>r.classList.toggle("ce-secondary-factor", i >= 5));
    if (host.querySelector(".ce-show-all-factors")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "ce-show-all-factors"; btn.textContent = `Ver todos os ${rows.length} critérios técnicos`;
    btn.addEventListener("click",()=>{
      const fechado = [...host.querySelectorAll(".component-row")].some(r=>r.classList.contains("ce-secondary-factor"));
      host.querySelectorAll(".component-row").forEach((r,i)=>r.classList.toggle("ce-secondary-factor", fechado ? false : i >= 5));
      btn.textContent = fechado ? "Mostrar apenas os 5 fatores decisivos" : `Ver todos os ${rows.length} critérios técnicos`;
    });
    rows[4]?.insertAdjacentElement("afterend",btn);
  }

  function renderDetalhe(jogador, host) {
    if (!jogador || !host || typeof criarCardJogador !== "function") return;
    const lista = listaAtual();
    const idx = Math.max(0, lista.findIndex(x => id(x) === id(jogador)));
    const card = criarCardJogador(jogador, idx + 1);
    host.replaceChildren();
    if (card) host.appendChild(card);
    const cabecalho = host.querySelector(".player-card-header,.player-header") || host.querySelector(".player-card")?.firstElementChild;
    if (cabecalho) cabecalho.insertAdjacentHTML("afterend", criarVeredito(jogador, idx));
    limitarFatores(host);
    if (typeof configurarBotoesAnaliseJogador === "function") configurarBotoesAnaliseJogador();
  }

  function sincronizarSelecao(grade, lista, renderizarDetalhe = true) {
    const tabs = grade.querySelector(".ce-clean-tabs");
    const scrollX = tabs?.scrollLeft || 0;
    grade.querySelectorAll("[data-ce-player]").forEach(b => {
      const ativo = b.dataset.cePlayer === selecionado;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-selected", ativo ? "true" : "false");
      b.tabIndex = ativo ? 0 : -1;
    });
    if (tabs) tabs.scrollLeft = scrollX;
    if (!renderizarDetalhe) return;
    const detalhe = grade.querySelector("#ceCleanDetail");
    const jogador = lista.find(j => id(j) === selecionado) || lista[0];
    renderDetalhe(jogador, detalhe);
  }

  function selecionarJogador(grade, lista, novoId) {
    if (!novoId || novoId === selecionado) return;
    selecionado = novoId;
    sincronizarSelecao(grade, lista, true);
  }

  function aplicarRecomendacoes() {
    const grade = document.getElementById("playersGrid"); if (!grade) return;
    const lista = listaAtual(); if (!lista.length) return;
    const posicao = posicaoAtual();
    if (!selecionado || !lista.some(j => id(j) === selecionado)) selecionado = id(lista[0]);

    const shell = grade.querySelector(":scope > .ce-clean-recs");
    if (shell && posicaoRenderizada === posicao) {
      sincronizarSelecao(grade, lista, true);
      return;
    }

    posicaoRenderizada = posicao;
    grade.innerHTML = `<section class="ce-clean-recs"><div class="ce-clean-tabs" role="tablist" aria-label="Jogadores recomendados">${lista.map((j,i)=>`<button type="button" role="tab" aria-selected="${id(j)===selecionado?"true":"false"}" tabindex="${id(j)===selecionado?"0":"-1"}" class="ce-clean-player ${id(j)===selecionado?"is-active":""}" data-ce-player="${esc(id(j))}"><span class="ce-clean-rank">${i+1}</span><span>${esc(nome(j))}</span></button>`).join("")}</div><div class="ce-clean-hint">Escolha um jogador. A conclusão vem primeiro; os critérios técnicos ficam sob demanda.</div><div class="ce-clean-detail" id="ceCleanDetail"></div></section>`;
    sincronizarSelecao(grade, lista, true);
    grade.querySelector(".ce-clean-tabs")?.addEventListener("click", ev => {
      const botao = ev.target.closest("[data-ce-player]");
      if (!botao || !grade.contains(botao)) return;
      selecionarJogador(grade, listaAtual(), botao.dataset.cePlayer);
    });
  }

  function instalarRecomendacoes() {
    if (instalado) return true;
    if (typeof exibirJogadoresDaPosicao !== "function" || typeof criarCardJogador !== "function") return false;
    const original = exibirJogadoresDaPosicao;
    window.exibirJogadoresDaPosicao = function(){ original.apply(this,arguments); posicaoRenderizada = null; aplicarRecomendacoes(); };
    instalado = true; aplicarRecomendacoes(); return true;
  }

  function simplificarTopoRecomendacoes() {
    const hero = document.querySelector("#recomendacoes .hero-text");
    if (!hero || hero.dataset.ceSimplificado === "1") return;
    hero.dataset.ceSimplificado = "1";
    const h = hero.querySelector("h2"); if (h) h.textContent = "Melhores opções da rodada";
    const ps = [...hero.querySelectorAll("p")]; const ultimo = ps[ps.length-1];
    if (ultimo) ultimo.textContent = "Escolha por posição e veja primeiro a recomendação do modelo. Projeção, risco e contexto aparecem apenas quando ajudam na decisão.";
    [...document.querySelectorAll("#recomendacoes article,#recomendacoes section,#recomendacoes div")].forEach(el=>{
      const t = texto(el);
      if (t.startsWith("O modelo aprende com o que realmente acontece") && t.length < 900) el.classList.add("ce-tech-hidden");
    });
  }

  function deduplicarPatrimonio() {
    const oficial = document.querySelector("#times .lineup-budget-control");
    const antigo = document.getElementById("v21PatrimonioBox");
    if (oficial && antigo) antigo.remove();
    const input = document.getElementById("lineupBudgetInput");
    if (input) { input.max = "200"; if (numero(input.value,200) > 200) input.value = "200"; }
  }

  function tornarIndiceClaro() {
    document.querySelectorAll("#times .lineup-player-numbers,#times .lineup-bench-player,#times .lineup-luxury-player").forEach(el=>{
      if (el.dataset.ceIndice === "1") return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n=>{ if (/Nota\s*/i.test(n.nodeValue||"")) n.nodeValue=(n.nodeValue||"").replace(/⭐?\s*Nota\s*/gi,"Índice de escolha "); });
      el.title = "Índice de escolha: comparação interna do modelo; não são pontos do Cartola.";
      el.dataset.ceIndice = "1";
    });
  }

  function removerRuidoHistorico() {
    const tab = document.getElementById("historico"); if (!tab) return;
    [...tab.querySelectorAll("article,section,div")].forEach(el=>{
      const t = texto(el);
      if ((/Laboratório de capitão/i.test(t) || /Torneio de modelos experimentais/i.test(t)) && t.length < 1800) el.classList.add("ce-tech-hidden");
    });
    const tabela = tab.querySelector(".history-table");
    if (tabela?.tBodies?.[0]) {
      const rows=[...tabela.tBodies[0].rows].filter(r=>r.cells?.length>=4);
      const todosZero=rows.length>=3 && rows.every(r=>Math.abs(numero((r.cells[1]?.textContent||"").replace(",","."),0))<0.0001 && Math.abs(numero((r.cells[2]?.textContent||"").replace(",","."),0))<0.0001);
      const wrap=tabela.closest(".history-table-wrap")||tabela.parentElement;
      if (todosZero && wrap) {
        wrap.classList.add("ce-tech-hidden");
        if (!tab.querySelector(".ce-history-reprocessing")) {
          const box=document.createElement("div");box.className="ce-history-reprocessing";box.innerHTML="<strong>Detalhamento em reprocessamento</strong><p>Esta rodada ainda não possui projeção × resultado confiável no formato novo. O histórico antigo com zeros foi ocultado para não confundir.</p>";wrap.insertAdjacentElement("beforebegin",box);
        }
      }
    }
  }

  function aplicarAnalise() {
    const tab=document.getElementById("analise"); if(!tab) return;
    const resumo=tab.querySelector(":scope > .analysis-summary") || tab.querySelector(".analysis-summary");
    const cards=[...(resumo?.querySelectorAll(".analysis-card")||[])];
    if(!cards.length) return;
    const valor=(padrao, idx)=>cards[idx]?.querySelector("strong")?.textContent?.trim()||padrao;
    if(!tab.querySelector(".ce-analysis-decisions")) {
      const grid=document.createElement("section");grid.className="ce-analysis-decisions";grid.innerHTML=`
        <article class="ce-analysis-decision"><span>Melhor cenário ofensivo</span><strong>${esc(valor("Em análise",0))}</strong><p>Clube que o modelo considera mais interessante para buscar participação ofensiva nesta rodada.</p></article>
        <article class="ce-analysis-decision"><span>Melhor cenário defensivo</span><strong>${esc(valor("Em análise",1))}</strong><p>Clube com leitura mais favorável para goleiro, zagueiro e lateral.</p></article>
        <article class="ce-analysis-decision"><span>Jogo para buscar teto</span><strong>${esc(valor("Em análise",2))}</strong><p>Confronto com maior combinação de força ofensiva e equilíbrio entre os lados.</p></article>`;
      resumo.insertAdjacentElement("beforebegin",grid);
    }
    if(!resumo.dataset.ceTecnico){
      resumo.dataset.ceTecnico="1";resumo.classList.add("ce-tech-hidden");
      const b=document.createElement("button");b.type="button";b.className="ce-tech-toggle";b.textContent="Ver índices técnicos da rodada";
      b.addEventListener("click",()=>{const oculto=resumo.classList.toggle("ce-tech-hidden");b.textContent=oculto?"Ver índices técnicos da rodada":"Ocultar índices técnicos";});
      resumo.insertAdjacentElement("afterend",b);
    }
    const tecnico=[...tab.querySelectorAll("h2,h3")].find(h=>/Força dos clubes na rodada/i.test(texto(h)));
    const bloco=tecnico?.parentElement?.parentElement?.parentElement || tecnico?.closest("section");
    if(bloco && !bloco.dataset.ceTecnicoDetalhe){
      bloco.dataset.ceTecnicoDetalhe="1";bloco.classList.add("ce-tech-hidden");
      const b=document.createElement("button");b.type="button";b.className="ce-tech-toggle";b.textContent="Ver números técnicos dos clubes";
      b.addEventListener("click",()=>{const oculto=bloco.classList.toggle("ce-tech-hidden");b.textContent=oculto?"Ver números técnicos dos clubes":"Ocultar números técnicos";});
      bloco.insertAdjacentElement("beforebegin",b);
    }
  }

  function aplicarMetodologiaFinal() {
    const tab=document.getElementById("metodologia"); if(!tab || tab.dataset.ceFinal==="1") return;
    tab.dataset.ceFinal="1";
    tab.innerHTML=`
      <section class="ce-methodology-final">
        <div class="ce-methodology-hero">
          <span class="ce-methodology-badge">V2.1 validada</span>
          <h2>Como o modelo toma decisões</h2>
          <p>A projeção oficial usa RandomForest treinado em walk-forward: para prever uma rodada, o modelo só aprende com rodadas anteriores. O objetivo é recomendar jogadores e montar times sem usar informação futura.</p>
        </div>
        <div class="ce-methodology-grid">
          <article class="ce-methodology-card"><h3>O que está ativo</h3><ul><li>RandomForest V2 com anti-leakage.</li><li>Elegibilidade oficial das partidas do Cartola.</li><li>Titularidade, limite de até 3 atletas por clube e técnico.</li><li>7 formações competindo sem preferência artificial.</li><li>Patrimônio configurável até C$ 200.</li><li>Capitão 1,5x, banco e Reserva de Luxo na avaliação histórica.</li><li>Calibração seletiva do Equilibrado e Agressivo; Conservador sem ajuste.</li></ul></article>
          <article class="ce-methodology-card"><h3>O que não foi promovido</h3><ul><li>Time Recomendado: não superou o melhor perfil fixo.</li><li>Expected scouts: ganho global abaixo do gate definido.</li><li>Clima observado: útil apenas como diagnóstico/upper-bound; não entra em produção por risco de leakage.</li><li>Lateralidade/heatmap real e consenso pré-jogo: seguem experimentais por falta de fonte histórica sustentável.</li></ul></article>
          <article class="ce-methodology-card"><h3>Como o histórico é avaliado</h3><p>As comparações usam projeção pré-rodada versus resultado real. A pontuação final considera substituições válidas do banco, Reserva de Luxo e bônus correto do capitão. Rodadas sem evidência suficiente são bloqueadas do ranking científico.</p></article>
          <article class="ce-methodology-card"><h3>Limitações e fallback</h3><p>Projeções são probabilísticas e não garantem pontuação. Mudanças de escalação, cartões, lesões e eventos raros podem gerar erro. A V1 permanece preservada como fallback e rollback caso algum gate da V2/V2.1 falhe.</p></article>
        </div>
        <div class="ce-methodology-note">Detalhes completos dos experimentos, gates, ganhos e reprovações permanecem documentados no repositório. A interface mostra apenas o que ajuda a decisão do usuário.</div>
      </section>`;
  }

  function aplicarTudo(){injetarEstilo();simplificarTopoRecomendacoes();deduplicarPatrimonio();tornarIndiceClaro();removerRuidoHistorico();aplicarAnalise();aplicarMetodologiaFinal();}

  let tentativas=0;const timer=setInterval(()=>{tentativas++;if(instalarRecomendacoes()||tentativas>50)clearInterval(timer);},100);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",aplicarTudo);else aplicarTudo();
  const observer=new MutationObserver(mutations=>{
    const relevante=mutations.some(m=>{
      const alvo=m.target?.nodeType===1?m.target:m.target?.parentElement;
      return !alvo?.closest?.("#playersGrid .ce-clean-recs");
    });
    if(!relevante)return;
    clearTimeout(window.__ceUxV21Timer);
    window.__ceUxV21Timer=setTimeout(()=>{
      aplicarTudo();
      if(instalado && !document.querySelector("#playersGrid .ce-clean-recs")) aplicarRecomendacoes();
    },140);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.RecomendacoesUXClean={aplicar:aplicarRecomendacoes};
  console.info("Cartola Estatístico — UX V2.1 de clareza ativa.");
})();
