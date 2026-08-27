/* =========================================================
   CARTOLA ESTATÍSTICO V2.2
   Polimento final de UX pós-validação em desktop/mobile
   - destaque do nº 1 em Recomendações
   - geometria defensiva do Monte seu Time
   - Projeções em ranking/tabela clean
   - Análise da Rodada orientada à decisão
   - preserva ajustes de Times, composição da nota e Histórico
   ========================================================= */
(() => {
  "use strict";

  const STYLE_ID = "cartola-ux-final-v22";
  const POSICOES = ["GOL", "LAT", "ZAG", "MEI", "ATA", "TEC"];
  const POS_NOME = { GOL: "Goleiro", LAT: "Lateral", ZAG: "Zagueiro", MEI: "Meia", ATA: "Atacante", TEC: "Técnico" };

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function n(v, padrao = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : padrao;
  }

  function norm(v) {
    return String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function nome(j) { return String(j?.apelido || j?.nome || "Jogador").trim(); }
  function clube(j) { return String(j?.siglaClube || j?.clubeSigla || j?.clube?.abreviacao || j?.clube || "--").toUpperCase(); }
  function posicao(j) { return String(j?.posicao || j?.posicaoSigla || "--").toUpperCase(); }
  function preco(j) { return n(j?.preco ?? j?.preco_num ?? j?.valor, NaN); }
  function proj(j) {
    for (const v of [j?.projecaoViabilidade, j?.projecaoContextualizada, j?.projecaoCalibrada, j?.projecao, j?.score, j?.media3, j?.media5, j?.media]) {
      const x = Number(v); if (Number.isFinite(x)) return x;
    }
    return 0;
  }
  function adversario(j) { return String(j?.siglaAdversario || j?.adversarioSigla || j?.adversario || j?.clubeAdversario || "--").toUpperCase(); }
  function mando(j) {
    const v = j?.mando ?? j?.mandante ?? j?.ehMandante;
    if (v === true || v === 1 || String(v).toLowerCase() === "casa") return "Casa";
    if (v === false || v === 0 || String(v).toLowerCase() === "fora") return "Fora";
    return "--";
  }
  function status(j) {
    const t = String(j?.status || j?.statusNome || j?.status_nome || "").trim();
    if (t) return t;
    const id = Number(j?.statusId ?? j?.status_id);
    if (id === 7) return "Provável";
    if ([2,3,5,6].includes(id)) return "Atenção";
    return "Status não informado";
  }
  function rodada(j) { return String(j?.rodada ?? j?.round ?? "").trim(); }
  function fmt(v, casas = 1) {
    const x = Number(v);
    return Number.isFinite(x) ? x.toFixed(casas).replace(".", ",") : "--";
  }

  function jogadores() {
    try {
      if (typeof window.obterJogadoresCarregados === "function") {
        const lista = window.obterJogadoresCarregados();
        if (Array.isArray(lista)) return lista.filter(Boolean);
      }
      if (typeof window.estadoRecomendacoes !== "undefined" && Array.isArray(window.estadoRecomendacoes?.jogadores)) {
        return window.estadoRecomendacoes.jogadores.filter(Boolean);
      }
    } catch (_) {}
    return [];
  }

  function injetarCss() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Recomendações: verde significa ranking nº 1, não seleção do detalhe */
      #recomendacoes .ce-clean-player:first-child{border-color:var(--primary)!important;background:var(--primary)!important;color:#fff!important}
      #recomendacoes .ce-clean-player.is-active:not(:first-child){background:var(--surface)!important;color:var(--text)!important;border-color:var(--primary)!important;box-shadow:inset 0 0 0 1px var(--primary)}
      #recomendacoes .ce-clean-player:first-child .ce-clean-rank{background:rgba(255,255,255,.22)!important}
      #recomendacoes .ce-clean-player.is-active:not(:first-child) .ce-clean-rank{background:rgba(83,216,145,.12)!important;color:var(--primary)!important}

      /* Composição da nota */
      .component-row.component-explained{padding:11px 13px!important;border-radius:13px!important;margin:6px 0!important}
      .component-row .component-label>strong,.ce-factor-status{font-size:.68rem!important;padding:4px 8px!important}
      .component-row.ce-factor-positive{background:rgba(83,216,145,.07)!important}
      .component-row.ce-factor-attention{background:rgba(222,185,84,.07)!important}
      .component-row.ce-factor-negative{background:rgba(224,98,98,.07)!important}

      /* Times sugeridos */
      .suggested-lineup-card.has-visual-pitch .lineup-players-title,.suggested-lineup-card.has-visual-pitch .lineup-players-list{display:none!important}
      .suggested-lineup-card .lineup-detail-section[data-ux-hide-bank="1"]{display:none!important}
      .pitch-bench{padding:11px!important}.pitch-bench-list{gap:7px!important}.pitch-bench-player{min-height:52px!important;padding:7px 9px!important}

      /* Projeções V2.2 */
      #projecoes .section-header{margin-bottom:12px!important}
      #projecoes .section-header p{max-width:760px}
      .ce-proj-shell{max-width:1180px;margin:0 auto;display:grid;gap:10px}
      .ce-proj-toolbar{display:grid;grid-template-columns:minmax(220px,1.5fr) repeat(3,minmax(135px,.55fr));gap:8px}
      .ce-proj-toolbar input,.ce-proj-toolbar select{width:100%;min-height:40px;border:1px solid var(--border);border-radius:11px;background:var(--surface);color:var(--text);padding:0 11px;font:inherit;font-size:12px}
      .ce-proj-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--text-soft);font-size:10px;padding:2px 2px 5px}
      .ce-proj-table{border:1px solid var(--border);border-radius:15px;overflow:hidden;background:var(--surface)}
      .ce-proj-head,.ce-proj-row{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(155px,.8fr) 100px 105px;gap:10px;align-items:center}
      .ce-proj-head{padding:8px 12px;background:var(--surface-soft);font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:var(--text-soft)}
      .ce-proj-row{padding:9px 12px;border-top:1px solid var(--border);cursor:pointer;transition:background .12s ease}
      .ce-proj-row:hover{background:rgba(83,216,145,.04)}
      .ce-proj-player{min-width:0;display:flex;align-items:center;gap:10px}.ce-proj-rank{display:grid;place-items:center;width:26px;height:26px;flex:0 0 26px;border-radius:50%;background:var(--surface-soft);font-size:9px;font-weight:850;color:var(--text-soft)}
      .ce-proj-rank.top{background:rgba(83,216,145,.14);color:var(--primary)}
      .ce-proj-name{min-width:0}.ce-proj-name strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-proj-name small{display:flex;gap:5px;align-items:center;margin-top:2px;color:var(--text-soft);font-size:9px}
      .ce-proj-chip{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:2px 5px;font-size:8px;color:var(--text-soft)}
      .ce-proj-game{font-size:10px;color:var(--text-soft)}.ce-proj-game b{color:var(--text);font-weight:750}
      .ce-proj-score{font-size:16px;font-weight:900;text-align:right}.ce-proj-score small{font-size:9px;color:var(--text-soft);font-weight:700}
      .ce-proj-price{text-align:right;font-size:10px;color:var(--text-soft)}.ce-proj-price b{display:block;color:var(--text);font-size:11px}
      .ce-proj-detail{grid-column:1/-1;display:none;padding:7px 0 2px 36px;color:var(--text-soft);font-size:9px;line-height:1.45}.ce-proj-row.is-open .ce-proj-detail{display:block}
      .ce-proj-empty{padding:28px;text-align:center;color:var(--text-soft);font-size:12px}
      #projecoes #v21GridExplorador,#projecoes #v21ResumoExplorador,#projecoes .v21-toolbar{display:none!important}

      /* Análise da rodada: decisão primeiro */
      #analise>.decision-dashboard,#analise>.ce-analysis-final{display:none!important}
      #analise>.ce-round-final{display:grid!important}
      .ce-round-final{max-width:1180px;margin:0 auto;gap:12px}
      .ce-round-hero{padding:18px;border:1px solid var(--border);border-radius:16px;background:linear-gradient(145deg,var(--surface),var(--surface-soft))}
      .ce-round-kicker{font-size:9px;font-weight:850;letter-spacing:.09em;color:var(--primary);text-transform:uppercase}
      .ce-round-hero h2{margin:4px 0 6px;font-size:22px}.ce-round-hero p{margin:0;color:var(--text-soft);font-size:12px;line-height:1.55;max-width:850px}
      .ce-round-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .ce-round-card{padding:15px;border:1px solid var(--border);border-radius:15px;background:var(--surface)}
      .ce-round-card header{display:flex;align-items:center;gap:9px;margin-bottom:9px}.ce-round-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--surface-soft);font-size:16px}.ce-round-card h3{margin:0;font-size:14px}.ce-round-card header small{display:block;margin-top:2px;color:var(--text-soft);font-size:9px}
      .ce-round-list{display:grid;gap:1px}.ce-round-item{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--border)}.ce-round-item:first-child{border-top:0}.ce-round-item strong{font-size:11px}.ce-round-item small{display:block;margin-top:2px;color:var(--text-soft);font-size:9px;line-height:1.4}.ce-round-tag{flex:0 0 auto;align-self:center;border-radius:999px;padding:4px 7px;background:rgba(83,216,145,.10);color:var(--primary);font-size:8px;font-weight:850}
      .ce-round-plan{padding:15px;border:1px solid rgba(83,216,145,.24);border-radius:15px;background:rgba(83,216,145,.07)}.ce-round-plan h3{margin:0 0 9px;font-size:14px}.ce-round-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ce-round-plan-item{padding:9px 10px;border-radius:10px;background:var(--surface);font-size:9px;color:var(--text-soft)}.ce-round-plan-item b{display:block;margin-top:3px;color:var(--text);font-size:11px}
      #analise .analysis-summary,#analise [data-analise-detalhes],#analise .analysis-human-intro,#analise .ce-analysis-decisions,#analise .ce-analysis-insight,#analise .ce-tech-toggle{display:none!important}

      /* Histórico */
      #historico canvas{max-height:300px!important}#historico .history-card,#historico .historico-card{border-radius:14px!important}

      @media(max-width:850px){
        .ce-proj-toolbar{grid-template-columns:1fr 1fr}.ce-proj-toolbar input{grid-column:1/-1}.ce-proj-head{display:none}.ce-proj-row{grid-template-columns:minmax(0,1fr) auto;gap:6px 10px}.ce-proj-game{grid-column:1}.ce-proj-score{grid-column:2;grid-row:1;text-align:right}.ce-proj-price{grid-column:2;grid-row:2;text-align:right}.ce-proj-detail{grid-column:1/-1;padding-left:36px}.ce-round-grid{grid-template-columns:1fr}.ce-round-plan-grid{grid-template-columns:1fr 1fr}
      }
      @media(max-width:520px){
        .ce-proj-toolbar{grid-template-columns:1fr}.ce-proj-toolbar input{grid-column:auto}.ce-proj-row{padding:9px 10px}.ce-proj-name strong{font-size:11px}.ce-proj-score{font-size:15px}.ce-round-hero{padding:14px}.ce-round-hero h2{font-size:18px}.ce-round-card{padding:12px}.ce-round-plan-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function polirComposicao() {
    document.querySelectorAll(".component-row").forEach(row => {
      const t = norm(row.textContent);
      row.classList.remove("ce-factor-positive", "ce-factor-attention", "ce-factor-negative");
      if (t.includes("favoravel") && !t.includes("desfavoravel")) row.classList.add("ce-factor-positive");
      else if (t.includes("desfavoravel") || t.includes("risco para esta escolha")) row.classList.add("ce-factor-negative");
      else row.classList.add("ce-factor-attention");
    });
  }

  function polirTimes() {
    document.querySelectorAll(".suggested-lineup-card").forEach(card => {
      card.querySelectorAll(".lineup-detail-section").forEach(sec => {
        const t = norm(sec.textContent);
        if (t.includes("banco") || t.includes("reserva de luxo")) sec.dataset.uxHideBank = "1";
      });
    });
  }

  function corrigirDefesaMonte() {
    document.querySelectorAll(".monte-line.defense").forEach(linha => {
      const slots = [...linha.querySelectorAll("[data-monte-slot]")];
      if (slots.length < 3) return;
      const laterais = slots.filter(el => el.dataset.pos === "LAT").sort((a,b) => String(a.dataset.monteSlot).localeCompare(String(b.dataset.monteSlot)));
      const zagueiros = slots.filter(el => el.dataset.pos === "ZAG").sort((a,b) => String(a.dataset.monteSlot).localeCompare(String(b.dataset.monteSlot)));
      if (!laterais.length || !zagueiros.length) return;
      const ordem = laterais.length >= 2 ? [laterais[0], ...zagueiros, laterais[1], ...laterais.slice(2)] : [...laterais, ...zagueiros];
      ordem.filter(Boolean).forEach(el => linha.appendChild(el));
    });
  }

  const projState = { busca: "", pos: "", clube: "", rodada: "" };

  function construirProjecoes() {
    const tab = document.getElementById("projecoes");
    if (!tab) return;
    let shell = tab.querySelector(".ce-proj-shell");
    if (!shell) {
      shell = document.createElement("div");
      shell.className = "ce-proj-shell";
      const header = tab.querySelector(".section-header");
      if (header) header.insertAdjacentElement("afterend", shell); else tab.prepend(shell);
    }

    const base = jogadores().slice().sort((a,b) => proj(b) - proj(a));
    if (!base.length) {
      shell.innerHTML = '<div class="ce-proj-empty">Carregando projeções da rodada...</div>';
      return;
    }

    const clubes = [...new Set(base.map(clube).filter(x => x && x !== "--"))].sort();
    const rodadas = [...new Set(base.map(rodada).filter(Boolean))].sort((a,b) => n(b)-n(a));
    if (!projState.rodada && rodadas.length) projState.rodada = rodadas[0];

    const filtrados = base.filter(j => {
      const busca = norm(projState.busca);
      return (!busca || norm(`${nome(j)} ${clube(j)} ${posicao(j)}`).includes(busca)) &&
        (!projState.pos || posicao(j) === projState.pos) &&
        (!projState.clube || clube(j) === projState.clube) &&
        (!projState.rodada || !rodada(j) || rodada(j) === projState.rodada);
    });

    shell.innerHTML = `
      <div class="ce-proj-toolbar">
        <input id="ceProjBusca" type="search" placeholder="🔎 Buscar jogador" value="${esc(projState.busca)}" autocomplete="off">
        <select id="ceProjRodada"><option value="">📅 Rodada atual</option>${rodadas.map(r=>`<option value="${esc(r)}" ${r===projState.rodada?"selected":""}>Rodada ${esc(r)}</option>`).join("")}</select>
        <select id="ceProjPos"><option value="">⚽ Todas posições</option>${POSICOES.map(p=>`<option value="${p}" ${p===projState.pos?"selected":""}>${POS_NOME[p]}</option>`).join("")}</select>
        <select id="ceProjClube"><option value="">🛡️ Todos clubes</option>${clubes.map(c=>`<option value="${esc(c)}" ${c===projState.clube?"selected":""}>${esc(c)}</option>`).join("")}</select>
      </div>
      <div class="ce-proj-summary"><span><b>${filtrados.length}</b> atleta(s) • ranking pela projeção vigente</span><span>Toque na linha para detalhes</span></div>
      <div class="ce-proj-table">
        <div class="ce-proj-head"><span>Atleta</span><span>Confronto</span><span style="text-align:right">Projeção</span><span style="text-align:right">Preço</span></div>
        ${filtrados.length ? filtrados.map((j,i) => {
          const p = preco(j);
          const st = status(j);
          const statIcon = /prov/i.test(st) ? "✓" : /aten/i.test(st) ? "!" : "•";
          return `<div class="ce-proj-row" tabindex="0" role="button">
            <div class="ce-proj-player"><span class="ce-proj-rank ${i<3?"top":""}">${i+1}</span><div class="ce-proj-name"><strong>${esc(nome(j))}</strong><small><span class="ce-proj-chip">${esc(posicao(j))}</span><span>${esc(clube(j))}</span><span>${statIcon} ${esc(st)}</span></small></div></div>
            <div class="ce-proj-game"><b>vs ${esc(adversario(j))}</b> • ${esc(mando(j))}</div>
            <div class="ce-proj-score">${fmt(proj(j))}<small> pts</small></div>
            <div class="ce-proj-price"><b>${Number.isFinite(p)?`C$ ${fmt(p,2)}`:"C$ --"}</b>${esc(POS_NOME[posicao(j)] || posicao(j))}</div>
            <div class="ce-proj-detail">Projeção é a estimativa central do modelo. Status, mando, adversário e preço ajudam a decidir se o atleta faz sentido para sua estratégia e orçamento.</div>
          </div>`;
        }).join("") : '<div class="ce-proj-empty">Nenhum atleta encontrado com esses filtros.</div>'}
      </div>`;

    shell.querySelector("#ceProjBusca")?.addEventListener("input", e => { projState.busca = e.target.value; construirProjecoes(); });
    shell.querySelector("#ceProjRodada")?.addEventListener("change", e => { projState.rodada = e.target.value; construirProjecoes(); });
    shell.querySelector("#ceProjPos")?.addEventListener("change", e => { projState.pos = e.target.value; construirProjecoes(); });
    shell.querySelector("#ceProjClube")?.addEventListener("change", e => { projState.clube = e.target.value; construirProjecoes(); });
    shell.querySelectorAll(".ce-proj-row").forEach(row => {
      const toggle = () => row.classList.toggle("is-open");
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
  }

  function topJogadores(lista, p, qtd = 1) {
    return lista.filter(j => !p || posicao(j) === p).slice().sort((a,b) => proj(b)-proj(a)).slice(0,qtd);
  }

  function obterEstadoAnalise() {
    try {
      const api = window.AnaliseRodada || window.CartolaAnaliseRodada;
      if (api && typeof api.obterEstado === "function") return api.obterEstado() || {};
    } catch (_) {}
    return {};
  }

  function itemClube(a, texto, tag) {
    const sigla = a?.clube || a?.sigla || a?.abreviacao || "--";
    return `<div class="ce-round-item"><div><strong>${esc(sigla)}</strong><small>${esc(texto)}</small></div>${tag?`<span class="ce-round-tag">${esc(tag)}</span>`:""}</div>`;
  }

  function itemJogador(j, tag) {
    return `<div class="ce-round-item"><div><strong>${esc(nome(j))}</strong><small>${esc(posicao(j))} • ${esc(clube(j))} • vs ${esc(adversario(j))}</small></div><span class="ce-round-tag">${tag || `${fmt(proj(j))} pts`}</span></div>`;
  }

  function construirAnalise() {
    const tab = document.getElementById("analise");
    if (!tab) return;
    let box = tab.querySelector(".ce-round-final");
    if (!box) {
      box = document.createElement("div");
      box.className = "ce-round-final";
      tab.prepend(box);
    }

    const st = obterEstadoAnalise();
    const js = Array.isArray(st?.jogadores) && st.jogadores.length ? st.jogadores : jogadores();
    const clubes = Array.isArray(st?.analises) ? st.analises.filter(Boolean) : [];
    if (!js.length) {
      box.innerHTML = '<div class="ce-proj-empty">Preparando a leitura da rodada...</div>';
      return;
    }

    const ataque = clubes.slice().sort((a,b)=>n(b?.forcaOfensiva)-n(a?.forcaOfensiva)).slice(0,3);
    const defesa = clubes.slice().sort((a,b)=>n(b?.forcaDefensiva)-n(a?.forcaDefensiva)).slice(0,3);
    const cautela = clubes.slice().sort((a,b)=>n(a?.forcaDefensiva)-n(b?.forcaDefensiva)).slice(0,2);
    const melhores = topJogadores(js, "", 3);
    const porPos = ["GOL","LAT","ZAG","MEI","ATA"].map(p=>topJogadores(js,p,1)[0]).filter(Boolean);
    const cap = topJogadores(js.filter(j => ["MEI","ATA"].includes(posicao(j))), "", 1)[0] || melhores[0];
    const rodadaAtual = st?.rodada || js.map(rodada).find(Boolean) || document.getElementById("roundNumber")?.textContent || "";
    const atkNome = ataque[0]?.clube || ataque[0]?.sigla || clube(melhores[0]);
    const defNome = defesa[0]?.clube || defesa[0]?.sigla || clube(porPos.find(j=>["GOL","LAT","ZAG"].includes(posicao(j))) || melhores[0]);

    box.innerHTML = `
      <section class="ce-round-hero">
        <span class="ce-round-kicker">LEITURA DA RODADA ${esc(rodadaAtual)}</span>
        <h2>O que vale fazer nesta rodada</h2>
        <p>Resumo direto para montar o time: onde concentrar jogadores, onde buscar segurança, quais nomes merecem prioridade e onde reduzir exposição. Os cálculos técnicos continuam rodando por trás.</p>
      </section>
      <div class="ce-round-grid">
        <section class="ce-round-card"><header><span class="ce-round-icon">🔥</span><div><h3>Onde atacar</h3><small>Clubes com melhor cenário ofensivo</small></div></header><div class="ce-round-list">${ataque.length?ataque.map((a,i)=>itemClube(a,i===0?"Principal alvo para meias e atacantes.":"Boa alternativa ofensiva.",`#${i+1}`)).join(""):melhores.map((j,i)=>itemJogador(j,`#${i+1}`)).join("")}</div></section>
        <section class="ce-round-card"><header><span class="ce-round-icon">🛡️</span><div><h3>Onde buscar segurança</h3><small>Melhores cenários para SG e defesa</small></div></header><div class="ce-round-list">${defesa.length?defesa.map((a,i)=>itemClube(a,i===0?"Melhor cenário defensivo da rodada.":"Boa opção para goleiro, lateral ou zagueiro.",`#${i+1}`)).join(""):porPos.filter(j=>["GOL","LAT","ZAG"].includes(posicao(j))).map(j=>itemJogador(j,"SG")).join("")}</div></section>
        <section class="ce-round-card"><header><span class="ce-round-icon">⭐</span><div><h3>Melhores oportunidades</h3><small>Um destaque forte por posição</small></div></header><div class="ce-round-list">${porPos.map(j=>itemJogador(j,`${fmt(proj(j))} pts`)).join("")}</div></section>
        <section class="ce-round-card"><header><span class="ce-round-icon">🚨</span><div><h3>Onde ter cautela</h3><small>Evite concentração sem boa justificativa</small></div></header><div class="ce-round-list">${cautela.length?cautela.map(a=>itemClube(a,"Cenário defensivo mais frágil; reduza exposição em goleiro/defensores.","CAUTELA")).join(""):`<div class="ce-round-item"><div><strong>Evite concentração excessiva</strong><small>Mesmo em favoritos, distribua risco quando houver alternativas de projeção parecida.</small></div><span class="ce-round-tag">!</span></div>`}</div></section>
      </div>
      <section class="ce-round-plan"><h3>🧠 Plano recomendado para a rodada</h3><div class="ce-round-plan-grid">
        <div class="ce-round-plan-item">Priorizar ataque<b>${esc(atkNome || "melhores projetados")}</b></div>
        <div class="ce-round-plan-item">Buscar segurança<b>${esc(defNome || "defesas mais fortes")}</b></div>
        <div class="ce-round-plan-item">Capitão sugerido<b>${esc(nome(cap))} • ${fmt(proj(cap))} pts</b></div>
      </div></section>`;
  }

  function polirHistorico() {
    const tab = document.getElementById("historico");
    if (!tab) return;
    tab.querySelectorAll("canvas").forEach(c => { c.style.maxHeight = "300px"; });
  }

  function aplicarTudo() {
    polirComposicao();
    polirTimes();
    corrigirDefesaMonte();
    construirProjecoes();
    construirAnalise();
    polirHistorico();
  }

  let timer = null;
  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(aplicarTudo, 80);
  }

  function observar() {
    const obs = new MutationObserver(muts => {
      if (muts.some(m => m.type === "childList" && (m.addedNodes.length || m.removedNodes.length))) agendar();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  injetarCss();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { observar(); aplicarTudo(); }, { once:true });
  else { observar(); aplicarTudo(); }

  window.addEventListener("cartola:escalacoes-atualizadas", agendar);
  window.addEventListener("cartola:rodada-atualizada", agendar);
})();
