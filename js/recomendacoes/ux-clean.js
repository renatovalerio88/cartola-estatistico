/* Cartola Estatístico — UX clean de Recomendações + acabamento final V1 */
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

  const ORDEM_POSICOES = { GOL: 1, LAT: 2, ZAG: 3, MEI: 4, ATA: 5, TEC: 6 };
  const NOMES_POSICOES = { GOL:"Goleiros",LAT:"Laterais",ZAG:"Zagueiros",MEI:"Meias",ATA:"Atacantes",TEC:"Treinadores" };

  let instalado = false;
  let selecionado = null;
  let historicoOrdem = "posicao";

  function numero(v, p = 0) { const n = Number(v); return Number.isFinite(n) ? n : p; }
  function esc(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

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
      .ce-clean-detail{min-width:0}.ce-clean-detail .player-card{width:100%;max-width:none}
      .ce-decision{margin:14px 18px;padding:14px 16px;border:1px solid rgba(83,216,145,.22);border-radius:14px;background:rgba(83,216,145,.07)}
      .ce-decision-kicker{font-size:10px;font-weight:800;letter-spacing:.08em;color:#67dfa0;text-transform:uppercase}
      .ce-decision-title{display:block;margin:4px 0 6px;font-size:18px}.ce-decision p{margin:0;color:var(--text-soft);font-size:12px;line-height:1.55}
      .ce-decision-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.ce-decision-chip{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.05);font-size:10px;font-weight:700}
      .component-row.ce-secondary-factor{display:none}.ce-show-all-factors{margin:10px 0 0;border:1px solid var(--border);background:var(--surface-soft);color:var(--text);border-radius:9px;padding:8px 11px;cursor:pointer;font:inherit;font-size:11px;font-weight:700}
      .ce-history-controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:0 0 14px}.ce-history-controls label{display:grid;gap:5px;font-size:11px;color:var(--text-soft)}
      .ce-history-controls select{min-width:170px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text)}
      .ce-history-group td{padding:9px 14px!important;background:rgba(83,216,145,.07);color:#67dfa0!important;font-size:10px!important;font-weight:800!important;letter-spacing:.08em;text-transform:uppercase}
      .ce-open-round-state{padding:18px;border:1px solid rgba(222,185,84,.28);border-radius:14px;background:rgba(222,185,84,.08);margin:14px 0}.ce-open-round-state strong{display:block;margin-bottom:5px}.ce-open-round-state p{margin:0;color:var(--text-soft);font-size:12px;line-height:1.5}
      .ce-analysis-decisions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}.ce-analysis-decision{padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
      .ce-analysis-decision span{display:block;font-size:9px;letter-spacing:.08em;color:#67dfa0;text-transform:uppercase;font-weight:800}.ce-analysis-decision strong{display:block;margin:5px 0 4px;font-size:16px}.ce-analysis-decision p{margin:0;font-size:11px;color:var(--text-soft);line-height:1.45}
      .ce-lineup-purpose{margin:8px 0 0;font-size:11px;color:var(--text-soft)}
      @media(max-width:900px){.ce-analysis-decisions{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){.ce-clean-tabs{overflow-x:auto;flex-wrap:nowrap;padding:10px}.ce-clean-player{flex:0 0 auto}.ce-analysis-decisions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function id(j) { return String(j?.id ?? j?.atletaId ?? j?.atleta_id ?? j?.apelido ?? j?.nome ?? ""); }
  function nome(j) { return String(j?.apelido || j?.nome || "Jogador"); }
  function posicaoAtual() { return typeof obterPosicaoAtiva === "function" ? String(obterPosicaoAtiva()).toUpperCase() : "GOL"; }
  function listaAtual() { const l = typeof obterJogadoresDaPosicao === "function" ? obterJogadoresDaPosicao(posicaoAtual()) : []; return Array.isArray(l) ? l : []; }

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
    const plural = NOMES_POSICOES[p] || p;
    return `<section class="ce-decision">
      <span class="ce-decision-kicker">Decisão do modelo</span>
      <strong class="ce-decision-title">${esc(titulo)}</strong>
      <p><b>${idx+1}º entre ${esc(plural.toLowerCase())} indicados.</b> O modelo destaca ${esc(motivo)} nesta rodada.</p>
      <div class="ce-decision-chips"><span class="ce-decision-chip">${proj.toFixed(1)} pts projetados</span><span class="ce-decision-chip">${Math.round(conf)}% confiança</span><span class="ce-decision-chip">${esc(risco)}</span></div>
    </section>`;
  }

  function limparComposicaoPorPosicao(host, posicao) {
    const proibidos = INELEGIVEIS_VISUAIS[posicao] || [];
    host.querySelectorAll(".component-row").forEach(row => {
      const txt = row.textContent || "";
      if (proibidos.some(nomeCriterio => txt.includes(nomeCriterio))) row.remove();
    });
    const resumo = host.querySelector(".components-summary");
    if (resumo) resumo.querySelector("small") && (resumo.querySelector("small").textContent = `${host.querySelectorAll(".component-row").length} fatores relevantes com dados disponíveis`);
  }

  function limitarFatores(host) {
    const rows = [...host.querySelectorAll(".component-row")];
    if (rows.length <= 5) return;
    rows.forEach((r,i)=>r.classList.toggle("ce-secondary-factor", i >= 5));
    if (host.querySelector(".ce-show-all-factors")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "ce-show-all-factors"; btn.textContent = `Ver todos os ${rows.length} critérios técnicos`;
    btn.addEventListener("click",()=>{
      const ocultos = host.querySelectorAll(".component-row.ce-secondary-factor");
      const abrir = ocultos.length > 0;
      host.querySelectorAll(".component-row").forEach((r,i)=>r.classList.toggle("ce-secondary-factor", abrir ? false : i >= 5));
      btn.textContent = abrir ? "Mostrar apenas os 5 fatores decisivos" : `Ver todos os ${rows.length} critérios técnicos`;
    });
    const ultimoVisivel = rows[Math.min(4, rows.length-1)];
    ultimoVisivel?.insertAdjacentElement("afterend",btn);
  }

  function renderDetalhe(jogador, host) {
    if (!jogador || !host || typeof criarCardJogador !== "function") return;
    const lista = listaAtual();
    const idx = Math.max(0, lista.findIndex(x => id(x) === id(jogador)));
    const card = criarCardJogador(jogador, idx + 1);
    host.innerHTML = "";
    if (card) host.appendChild(card);
    const cabecalho = host.querySelector(".player-card-header,.player-header") || host.querySelector(".player-card")?.firstElementChild;
    if (cabecalho) cabecalho.insertAdjacentHTML("afterend", criarVeredito(jogador, idx));
    limparComposicaoPorPosicao(host, posicaoAtual());
    limitarFatores(host);
    if (typeof configurarBotoesAnaliseJogador === "function") configurarBotoesAnaliseJogador();
  }

  function aplicarRecomendacoes() {
    estilo();
    const grade = document.getElementById("playersGrid");
    if (!grade) return;
    const lista = listaAtual();
    if (!lista.length) return;
    if (!selecionado || !lista.some(j => id(j) === selecionado)) selecionado = id(lista[0]);
    grade.innerHTML = `<section class="ce-clean-recs"><div class="ce-clean-tabs" role="tablist" aria-label="Jogadores recomendados">${lista.map((j,i)=>`<button type="button" class="ce-clean-player ${id(j)===selecionado?"is-active":""}" data-ce-player="${esc(id(j))}" role="tab" aria-selected="${id(j)===selecionado}"><span class="ce-clean-rank">${i+1}</span><span>${esc(nome(j))}</span></button>`).join("")}</div><div class="ce-clean-hint">Escolha um jogador. A primeira leitura mostra a decisão; os detalhes técnicos ficam disponíveis sob demanda.</div><div class="ce-clean-detail" id="ceCleanDetail" role="tabpanel"></div></section>`;
    const detalhe = document.getElementById("ceCleanDetail");
    renderDetalhe(lista.find(j => id(j) === selecionado) || lista[0], detalhe);
    grade.querySelectorAll("[data-ce-player]").forEach(botao => botao.addEventListener("click",()=>{
      selecionado = botao.dataset.cePlayer;
      grade.querySelectorAll("[data-ce-player]").forEach(b=>{const a=b.dataset.cePlayer===selecionado;b.classList.toggle("is-active",a);b.setAttribute("aria-selected",String(a));});
      renderDetalhe(lista.find(j=>id(j)===selecionado), detalhe);
    }));
  }

  function instalarRecomendacoes() {
    if (instalado) return true;
    if (typeof exibirJogadoresDaPosicao !== "function" || typeof criarCardJogador !== "function") return false;
    const original = exibirJogadoresDaPosicao;
    window.exibirJogadoresDaPosicao = function(){ original.apply(this,arguments); aplicarRecomendacoes(); };
    instalado = true; aplicarRecomendacoes(); return true;
  }

  function obterPosicaoLinha(row) {
    const meta = row.querySelector(".history-player-meta")?.textContent || row.cells?.[0]?.textContent || "";
    const m = meta.toUpperCase().match(/\b(GOL|LAT|ZAG|MEI|ATA|TEC)\b/);
    return m ? m[1] : "ZZZ";
  }

  function valorCelula(row, idx) {
    const t = (row.cells?.[idx]?.textContent || "").replace(",",".").replace(/[^0-9.-]/g,"");
    const n = Number(t); return Number.isFinite(n) ? n : -9999;
  }

  function ordenarHistorico() {
    const tabela = document.querySelector("#historico .history-table");
    if (!tabela?.tBodies?.[0]) return;
    const tbody = tabela.tBodies[0];
    tbody.querySelectorAll(".ce-history-group").forEach(r=>r.remove());
    const rows = [...tbody.querySelectorAll("tr")];
    rows.sort((a,b)=>{
      if (historicoOrdem === "projecao") return valorCelula(b,1)-valorCelula(a,1);
      if (historicoOrdem === "real") return valorCelula(b,2)-valorCelula(a,2);
      if (historicoOrdem === "erro") return valorCelula(a,3)-valorCelula(b,3);
      const pa = ORDEM_POSICOES[obterPosicaoLinha(a)] || 99, pb = ORDEM_POSICOES[obterPosicaoLinha(b)] || 99;
      return pa-pb || valorCelula(b,1)-valorCelula(a,1);
    });
    rows.forEach(r=>tbody.appendChild(r));
    const posSelect = document.getElementById("historyPosition");
    if (!posSelect || posSelect.value !== "TODOS" || historicoOrdem !== "posicao") return;
    let ultima = null;
    rows.forEach(r=>{
      const p = obterPosicaoLinha(r);
      if (p !== ultima) {
        const g = document.createElement("tr"); g.className="ce-history-group"; g.innerHTML=`<td colspan="6">${esc(NOMES_POSICOES[p] || p)}</td>`; tbody.insertBefore(g,r); ultima=p;
      }
    });
  }

  function controlesHistorico() {
    const pos = document.getElementById("historyPosition");
    if (!pos || document.getElementById("ceHistoryOrder")) return;
    const area = pos.closest(".filters,.history-filters,.filter-row") || pos.parentElement?.parentElement || pos.parentElement;
    if (!area) return;
    const wrap = document.createElement("label"); wrap.innerHTML=`<span>Ordenar por</span><select id="ceHistoryOrder"><option value="posicao">Posição + projeção</option><option value="projecao">Maior projeção</option><option value="real">Maior pontuação real</option><option value="erro">Menor erro</option></select>`;
    wrap.className="ce-history-sort"; area.appendChild(wrap);
    wrap.querySelector("select").addEventListener("change",e=>{historicoOrdem=e.target.value; ordenarHistorico();});
  }

  async function tratarRodadaAbertaHistorico() {
    const tab = document.getElementById("historico"); if (!tab) return;
    try {
      const status = await fetch("data/api/status.json",{cache:"no-store"}).then(r=>r.ok?r.json():null);
      const aberta = Number(status?.status_mercado ?? status?.statusMercado) === 1;
      const rodada = Number(status?.rodada_atual ?? status?.rodadaAtual ?? status?.rodada);
      const sel = document.getElementById("historyRound");
      if (!aberta || !rodada || Number(sel?.value) !== rodada) {
        tab.querySelector(".ce-open-round-state")?.remove();
        const wrap = tab.querySelector(".history-table-wrap"); if (wrap) wrap.hidden=false;
        return;
      }
      const wrap = tab.querySelector(".history-table-wrap"); if (wrap) wrap.hidden=true;
      if (!tab.querySelector(".ce-open-round-state")) {
        const box=document.createElement("div"); box.className="ce-open-round-state"; box.innerHTML=`<strong>Rodada ${rodada} em andamento</strong><p>A avaliação individual ficará disponível após o fechamento. Enquanto o mercado estiver aberto, resultado real, erro, Top 5 e acerto de capitão não são tratados como métricas históricas.</p>`;
        (wrap || document.getElementById("historyGrid") || tab).insertAdjacentElement("beforebegin",box);
      }
    } catch(_) {}
  }

  function aplicarHistorico() { controlesHistorico(); ordenarHistorico(); tratarRodadaAbertaHistorico(); }

  function textoCurto(el) { return (el?.textContent || "").replace(/\s+/g," ").trim(); }
  function acharResumoAnalise(label) {
    const candidatos=[...document.querySelectorAll("#analise article,#analise .card,#analise > div > div")];
    return candidatos.find(el=>textoCurto(el).toLowerCase().includes(label.toLowerCase()) && textoCurto(el).length<220);
  }

  function aplicarAnalise() {
    const tab=document.getElementById("analise"); if(!tab || tab.querySelector(".ce-analysis-decisions")) return;
    const ataque=acharResumoAnalise("Melhor ataque"), sg=acharResumoAnalise("Maior chance de SG"), jogo=acharResumoAnalise("Jogo mais aberto");
    if(!ataque && !sg && !jogo) return;
    const extrair=(el,label)=>{const t=textoCurto(el).replace(label,"").trim(); return t || "Dados em processamento";};
    const grid=document.createElement("section"); grid.className="ce-analysis-decisions";
    grid.innerHTML=`<article class="ce-analysis-decision"><span>Onde atacar</span><strong>${esc(extrair(ataque,"Melhor ataque").split(" ")[0])}</strong><p>Priorize opções ofensivas do clube com melhor cenário projetado.</p></article><article class="ce-analysis-decision"><span>Onde buscar SG</span><strong>${esc(extrair(sg,"Maior chance de SG").split(" ")[0])}</strong><p>Defesa com o cenário mais favorável para terminar sem sofrer gol.</p></article><article class="ce-analysis-decision"><span>Onde buscar teto</span><strong>${esc(extrair(jogo,"Jogo mais aberto").split(/Maior|Força/)[0].trim())}</strong><p>Confronto com maior potencial para pontuação ofensiva elevada.</p></article><article class="ce-analysis-decision"><span>Como usar esta aba</span><strong>Decida primeiro</strong><p>Os números técnicos abaixo servem para confirmar a leitura, não para substituir a conclusão.</p></article>`;
    const intro=tab.querySelector(".analysis-human-intro"); (intro || tab.querySelector(".section-header") || tab.firstElementChild)?.insertAdjacentElement("afterend",grid);
    [...tab.querySelectorAll("h2,h3")].forEach(h=>{ if(/posição em destaque/i.test(h.textContent||"")) h.closest("article,.card,div")?.setAttribute("hidden",""); });
  }

  function aplicarTimes() {
    const tab=document.getElementById("times"); if(!tab) return;
    const mapa={Conservador:"Prioriza segurança e menor risco.",Equilibrado:"Busca a melhor relação entre segurança e teto.",Agressivo:"Aceita mais variação em troca de maior teto potencial."};
    Object.entries(mapa).forEach(([nome,frase])=>{
      const headings=[...tab.querySelectorAll("h2,h3,strong")].filter(e=>textoCurto(e)===nome);
      headings.forEach(h=>{const card=h.closest("article,.lineup-card,.suggested-lineup-card,section"); if(card && !card.querySelector(".ce-lineup-purpose")){const p=document.createElement("p");p.className="ce-lineup-purpose";p.textContent=frase;h.insertAdjacentElement("afterend",p);}});
    });
  }

  function aplicarTudo() { estilo(); aplicarHistorico(); aplicarAnalise(); aplicarTimes(); }

  let n=0; const timer=setInterval(()=>{n+=1;if(instalarRecomendacoes()||n>50)clearInterval(timer);},100);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",aplicarTudo); else aplicarTudo();
  const observer=new MutationObserver(()=>{clearTimeout(window.__ceUxFinalTimer);window.__ceUxFinalTimer=setTimeout(aplicarTudo,120);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("change",e=>{if(["historyRound","historyPosition"].includes(e.target?.id)) setTimeout(aplicarHistorico,80);});

  window.RecomendacoesUXClean={aplicar:aplicarRecomendacoes};
  console.info("Cartola Estatístico — acabamento UX final V1 ativo.");
})();
