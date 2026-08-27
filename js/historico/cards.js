/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico V2.1 — decisão primeiro, detalhe sob demanda
   ========================================================= */

const HistoricoV21 = (() => {
  const PERFIS = ["Conservador", "Equilibrado", "Agressivo", "Recomendado"];
  let dados = null;
  let perfilAtual = "Equilibrado";
  let rodadaAtual = null;

  function n(valor, casas = 1) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toFixed(casas).replace(".", ",") : "--";
  }

  function sinal(valor, casas = 1) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "--";
    return `${numero > 0 ? "+" : ""}${n(numero, casas)}`;
  }

  function esc(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function projecaoTime(time) {
    return Number(time?.projecaoFinalPreJogo ?? time?.projecaoTitulares);
  }

  function rodadaConfiavel(item) {
    const proj = projecaoTime(item?.time);
    const real = Number(item?.time?.pontuacaoFinalCartola);
    return Number.isFinite(proj) && Number.isFinite(real) && proj >= 0 && proj <= 250 && real > -80 && real <= 300;
  }

  function estilos() {
    if (document.getElementById("historicoV21Style")) return;
    const style = document.createElement("style");
    style.id = "historicoV21Style";
    style.textContent = `
      #historyTemporalMetrics,#captainTournament,#historySummary,#historyGrid,
      .history-filters,.history-filter-bar{display:none!important}

      .history-v21{display:grid;gap:14px;max-width:1180px;margin:0 auto}
      .history-v21-intro{display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
      .history-v21-intro h3{margin:3px 0 0;font-size:1.12rem}
      .history-v21-intro p{margin:5px 0 0;opacity:.7;max-width:720px;font-size:12px;line-height:1.45}

      .history-v21-profiles{display:flex;flex-wrap:wrap;gap:7px}
      .history-v21-profile{border:1px solid var(--border,#dfe5e1);background:var(--surface-soft,rgba(127,127,127,.05));
        color:inherit;border-radius:999px;padding:8px 12px;cursor:pointer;font-weight:750;font-size:12px}
      .history-v21-profile.is-active{border-color:rgba(19,138,82,.5);background:rgba(19,138,82,.1);color:var(--primary,#138a52)}
      .history-v21-profile[disabled]{opacity:.42;cursor:not-allowed}

      .history-v21-card{border:1px solid var(--border,#dfe5e1);border-radius:16px;background:var(--surface,#fff);padding:15px;
        box-shadow:0 8px 24px rgba(0,0,0,.035)}
      .history-v21-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}
      .history-v21-card-head h4{margin:0;font-size:1rem}
      .history-v21-card-head p{margin:4px 0 0;opacity:.64;font-size:11px}
      .history-v21-badge{font-size:10px;font-weight:800;border-radius:999px;padding:5px 8px;background:rgba(19,138,82,.08);
        color:var(--primary,#138a52);white-space:nowrap}

      .history-v21-chart-wrap{overflow-x:auto;padding-bottom:2px}
      .history-v21-chart{width:100%;min-width:860px;height:auto;display:block}
      .history-v21-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:7px;font-size:11px;opacity:.76}
      .history-v21-legend span::before{content:"";display:inline-block;width:16px;height:3px;border-radius:3px;margin-right:6px;vertical-align:middle;background:currentColor}
      .history-v21-legend .proj{color:#6077db}.history-v21-legend .real{color:#15915a}
      .history-v21-chart-note{margin-top:9px;padding:9px 11px;border-radius:10px;background:rgba(164,97,0,.08);
        border:1px solid rgba(164,97,0,.16);font-size:10px;line-height:1.4}

      .history-v21-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
      .history-v21-control{display:grid;gap:4px;min-width:170px}
      .history-v21-control span{font-size:9px;opacity:.64;text-transform:uppercase;letter-spacing:.05em}
      .history-v21-control select{width:100%;min-height:38px;border-radius:10px;border:1px solid var(--border,#dfe5e1);
        background:var(--surface-soft,#f6f8f7);color:inherit;padding:7px 9px}

      .history-v21-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .history-v21-summary article{padding:11px 12px;border-radius:11px;background:var(--surface-soft,rgba(127,127,127,.05));border:1px solid var(--border,#e6ebe8)}
      .history-v21-summary span{display:block;font-size:9px;opacity:.65}
      .history-v21-summary strong{display:block;margin-top:3px;font-size:16px}
      .history-v21-summary small{display:block;margin-top:2px;opacity:.6;font-size:9px}
      .history-v21-summary article.is-warning{background:rgba(164,97,0,.08);border-color:rgba(164,97,0,.18)}

      .history-v21-table-wrap{overflow-x:auto;border:1px solid var(--border,#e2e8e4);border-radius:12px}
      .history-v21-table{width:100%;min-width:720px;border-collapse:collapse}
      .history-v21-table th,.history-v21-table td{padding:9px 10px;border-bottom:1px solid var(--border,#e7ebe8);text-align:left}
      .history-v21-table th{font-size:9px;opacity:.62;text-transform:uppercase;letter-spacing:.045em}
      .history-v21-table td{font-size:11px}
      .history-v21-player{font-weight:750}.history-v21-meta{display:block;margin-top:2px;font-size:9px;opacity:.6}
      .history-v21-diff.pos{color:#15915a;font-weight:800}.history-v21-diff.neg{color:#bd5146;font-weight:800}
      .history-v21-reading{max-width:300px;line-height:1.35;opacity:.82}
      .history-v21-note{margin:9px 0 0;font-size:10px;opacity:.62;line-height:1.4}
      .history-v21-empty{padding:22px;text-align:center;opacity:.7}

      @media(max-width:900px){
        .history-v21-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
        .history-v21-intro{display:block}.history-v21-profiles{margin-top:10px}
      }
      @media(max-width:640px){
        .history-v21{gap:11px}.history-v21-card{padding:12px;border-radius:14px}
        .history-v21-card-head{margin-bottom:8px}.history-v21-card-head p{font-size:10px}
        .history-v21-profile{padding:7px 10px;font-size:11px}
        .history-v21-control{min-width:calc(50% - 4px);flex:1}.history-v21-control select{min-height:36px}
        .history-v21-summary{gap:6px}.history-v21-summary article{padding:9px 10px}.history-v21-summary strong{font-size:14px}
        .history-v21-chart{min-width:780px}
        .history-v21-table-wrap{border:0;overflow:visible}
        .history-v21-table{display:block;min-width:0}.history-v21-table thead{display:none}.history-v21-table tbody{display:grid;gap:8px}
        .history-v21-table tr{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;padding:10px;border:1px solid var(--border,#e2e8e4);border-radius:11px;background:var(--surface-soft,rgba(127,127,127,.04))}
        .history-v21-table td{display:block;padding:0;border:0;font-size:10px}.history-v21-table td:first-child{grid-column:1/-1}
        .history-v21-table td::before{content:attr(data-label);display:block;margin-bottom:2px;font-size:8px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;opacity:.5}
        .history-v21-table td:first-child::before{display:none}.history-v21-reading{grid-column:1/-1;max-width:none}
      }
    `;
    document.head.appendChild(style);
  }

  function obterSecao() {
    return document.getElementById("historico");
  }

  function garantirRaiz() {
    const secao = obterSecao();
    if (!secao) return null;
    let raiz = document.getElementById("historyV21");
    if (!raiz) {
      raiz = document.createElement("div");
      raiz.id = "historyV21";
      raiz.className = "history-v21";
      const alvo = secao.querySelector("#historySummary") || secao.firstElementChild;
      if (alvo?.parentNode) alvo.parentNode.insertBefore(raiz, alvo);
      else secao.appendChild(raiz);
    }
    return raiz;
  }

  function timeDaRodada(rodada, perfil) {
    return rodada?.times?.find(t => String(t.perfil).toLowerCase() === String(perfil).toLowerCase()) || null;
  }

  function perfilDisponivel(perfil) {
    return Array.isArray(dados?.rodadas) && dados.rodadas.some(r => timeDaRodada(r, perfil));
  }

  function rodadasDoPerfil(perfil) {
    return (dados?.rodadas || [])
      .map(r => ({ rodada: Number(r.rodada), time: timeDaRodada(r, perfil) }))
      .filter(x => x.time)
      .sort((a, b) => a.rodada - b.rodada);
  }

  function svgGrafico(itensOriginais) {
    const invalidos = itensOriginais.filter(item => !rodadaConfiavel(item));
    const itens = itensOriginais.filter(rodadaConfiavel);
    if (!itens.length) return '<div class="history-v21-empty">Sem histórico confiável para este perfil.</div>';

    const W = Math.max(920, 54 * itens.length), H = 316, L = 44, R = 24, T = 34, B = 38;
    const valores = itens.flatMap(x => [projecaoTime(x.time), Number(x.time.pontuacaoFinalCartola)]).filter(Number.isFinite);
    const max = Math.max(20, Math.ceil((Math.max(...valores) + 8) / 10) * 10);
    const min = Math.min(0, Math.floor((Math.min(...valores) - 8) / 10) * 10);
    const x = i => itens.length === 1 ? (L + W - R) / 2 : L + i * ((W - L - R) / (itens.length - 1));
    const y = v => T + (max - v) * ((H - T - B) / (max - min || 1));
    const path = seletor => itens.map((item, i) => `${x(i).toFixed(1)},${y(seletor(item)).toFixed(1)}`).join(" ");
    const linhasY = 4;
    let grade = "";

    for (let i = 0; i <= linhasY; i += 1) {
      const valor = min + (max - min) * (i / linhasY);
      const yy = y(valor);
      grade += `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="currentColor" opacity=".08"/>`;
      grade += `<text x="${L-7}" y="${yy+3}" text-anchor="end" font-size="9" fill="currentColor" opacity=".48">${Math.round(valor)}</text>`;
    }

    const rotulos = itens.map((item, i) =>
      `<text x="${x(i)}" y="${H-12}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".52">R${item.rodada}</text>`
    ).join("");

    const pontosSerie = (seletor, cor, deslocamento, classe) => itens.map((item, i) => {
      const valor = seletor(item);
      const xx = x(i), yy = y(valor);
      return `<g class="${classe}">
        <circle cx="${xx}" cy="${yy}" r="3.2" fill="${cor}" stroke="var(--surface,#fff)" stroke-width="1.5">
          <title>R${item.rodada}: ${n(valor)} pts</title>
        </circle>
        <text x="${xx}" y="${yy + deslocamento}" text-anchor="middle" font-size="8" font-weight="700" fill="${cor}">${n(valor,0)}</text>
      </g>`;
    }).join("");

    const aviso = invalidos.length
      ? `<div class="history-v21-chart-note"><strong>${invalidos.length} rodada(s) fora do gráfico:</strong> ${invalidos.map(x => `R${x.rodada}`).join(", ")} contém projeção histórica inválida ou resultado não confiável. O registro continua disponível na auditoria, mas não altera a escala nem a leitura do gráfico.</div>`
      : "";

    return `
      <div class="history-v21-chart-wrap">
        <svg class="history-v21-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projeção e pontuação real por rodada; valores rotulados em cada ponto">
          ${grade}
          <polyline points="${path(item => projecaoTime(item.time))}" fill="none" stroke="#6077db" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${path(item => Number(item.time.pontuacaoFinalCartola))}" fill="none" stroke="#15915a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${pontosSerie(item => projecaoTime(item.time), "#6077db", -8, "history-point-proj")}
          ${pontosSerie(item => Number(item.time.pontuacaoFinalCartola), "#15915a", 13, "history-point-real")}
          ${rotulos}
        </svg>
      </div>
      <div class="history-v21-legend"><span class="proj">Projeção pré-rodada</span><span class="real">Real final</span></div>
      ${aviso}
    `;
  }

  function resumoRodada(time) {
    const proj = projecaoTime(time);
    const projOk = Number.isFinite(proj) && proj >= 0 && proj <= 250;
    const real = Number(time?.pontuacaoFinalCartola);
    const banco = Number(time?.pontosRecuperadosBancoLuxo);
    const cap = Number(time?.bonusCapitao15);

    return `
      <div class="history-v21-summary">
        <article class="${projOk ? "" : "is-warning"}"><span>Projeção</span><strong>${projOk ? `${n(proj)} pts` : "Não confiável"}</strong><small>${projOk ? "antes da rodada" : "valor preservado só para auditoria"}</small></article>
        <article><span>Real final</span><strong>${n(real)} pts</strong><small>com regras do Cartola</small></article>
        <article><span>Banco + Luxo</span><strong>${sinal(banco)} pt</strong><small>impacto efetivo</small></article>
        <article><span>Capitão</span><strong>${sinal(cap)} pt</strong><small>bônus de 50%</small></article>
      </div>
    `;
  }

  function tabela(time) {
    const jogadores = Array.isArray(time?.jogadores) ? time.jogadores : [];
    if (!jogadores.length) return '<div class="history-v21-empty">Sem jogadores disponíveis para esta rodada.</div>';

    const linhas = jogadores.map(j => {
      const dif = Number(j.diferenca ?? (Number(j.pontos) - Number(j.projecao)));
      const classe = Number.isFinite(dif) ? (dif >= 0 ? "pos" : "neg") : "";
      const meta = [j.posicao, j.clube].filter(Boolean).join(" · ");
      const marcador = j.capitao ? " ©" : "";
      const proj = Number(j.projecao);
      const projOk = Number.isFinite(proj) && proj >= -10 && proj <= 40;
      return `
        <tr>
          <td><span class="history-v21-player">${esc(j.nome)}${marcador}</span><span class="history-v21-meta">${esc(meta || "--")}</span></td>
          <td data-label="Projeção">${projOk ? n(proj) : "--"}</td>
          <td data-label="Real">${j.entrou === false ? "Não jogou" : n(j.pontos)}</td>
          <td data-label="Diferença" class="history-v21-diff ${classe}">${j.entrou === false || !projOk ? "--" : sinal(dif)}</td>
          <td data-label="Leitura" class="history-v21-reading">${esc(!projOk ? "Projeção histórica inválida nesta rodada" : (j.leitura || (j.entrou === false ? "Não entrou em campo" : "Resultado comparado à projeção")))}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="history-v21-table-wrap">
        <table class="history-v21-table">
          <thead><tr><th>Jogador</th><th>Projeção</th><th>Real</th><th>Diferença</th><th>Leitura</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <p class="history-v21-note">A leitura separa a projeção pré-rodada do que aconteceu depois. Dados de projeção fora de faixa permanecem preservados para auditoria, mas não entram no gráfico nem nas comparações visuais.</p>
    `;
  }

  function opcoesRodada(perfil) {
    return rodadasDoPerfil(perfil).map(x =>
      `<option value="${x.rodada}" ${x.rodada === rodadaAtual ? "selected" : ""}>Rodada ${x.rodada}${rodadaConfiavel(x) ? "" : " · projeção não confiável"}</option>`
    ).join("");
  }

  function renderizar() {
    estilos();
    const raiz = garantirRaiz();
    if (!raiz) return;

    if (!dados) {
      raiz.innerHTML = '<div class="history-v21-card history-v21-empty">Carregando histórico validado...</div>';
      return;
    }

    if (!perfilDisponivel(perfilAtual)) perfilAtual = PERFIS.find(perfilDisponivel) || "Equilibrado";
    const itens = rodadasDoPerfil(perfilAtual);
    const confiaveis = itens.filter(rodadaConfiavel);

    if (!rodadaAtual || !itens.some(x => x.rodada === rodadaAtual)) rodadaAtual = confiaveis.at(-1)?.rodada || itens.at(-1)?.rodada || null;
    const registro = itens.find(x => x.rodada === rodadaAtual);
    const time = registro?.time;

    const botoes = PERFIS.map(perfil => {
      const disponivel = perfilDisponivel(perfil);
      const ativo = perfil === perfilAtual;
      const titulo = perfil === "Recomendado" && !disponivel ? "Em validação científica" : perfil;
      return `<button class="history-v21-profile ${ativo ? "is-active" : ""}" data-history-profile="${esc(perfil)}" ${disponivel ? "" : "disabled"} title="${esc(titulo)}">${esc(perfil)}${perfil === "Recomendado" && !disponivel ? " · em validação" : ""}</button>`;
    }).join("");

    raiz.innerHTML = `
      <div class="history-v21-intro">
        <div>
          <span class="section-label">HISTÓRICO VALIDADO</span>
          <h3>O que projetamos × o que aconteceu</h3>
          <p>Compare projeção e resultado sem poluição visual. Rodadas com projeção histórica inválida ficam fora do gráfico, mas continuam acessíveis na auditoria.</p>
        </div>
        <div class="history-v21-profiles">${botoes}</div>
      </div>

      <section class="history-v21-card">
        <div class="history-v21-card-head">
          <div><h4>${esc(perfilAtual)} · Projeção x Real</h4><p>${confiaveis.length} rodadas confiáveis no gráfico${itens.length !== confiaveis.length ? ` · ${itens.length - confiaveis.length} preservada(s) só para auditoria` : ""}.</p></div>
          <span class="history-v21-badge">até R${dados.rodadaMaximaProcessada || "--"}</span>
        </div>
        ${svgGrafico(itens)}
      </section>

      <section class="history-v21-card">
        <div class="history-v21-card-head">
          <div><h4>Auditoria da escalação</h4><p>Escolha a rodada e veja projeção, real e diferença jogador por jogador.</p></div>
        </div>
        <div class="history-v21-controls">
          <label class="history-v21-control"><span>Rodada</span><select id="historyRoundSelect">${opcoesRodada(perfilAtual)}</select></label>
          <label class="history-v21-control"><span>Time</span><select id="historyProfileSelect">${PERFIS.map(p => `<option value="${esc(p)}" ${p === perfilAtual ? "selected" : ""} ${perfilDisponivel(p) ? "" : "disabled"}>${esc(p)}${p === "Recomendado" && !perfilDisponivel(p) ? " · em validação" : ""}</option>`).join("")}</select></label>
        </div>
        <div style="margin-top:12px">${time ? resumoRodada(time) : ""}</div>
        <div style="margin-top:12px">${time ? tabela(time) : '<div class="history-v21-empty">Sem dados para este filtro.</div>'}</div>
      </section>
    `;

    raiz.querySelectorAll("[data-history-profile]").forEach(btn => btn.addEventListener("click", () => {
      perfilAtual = btn.dataset.historyProfile;
      const lista = rodadasDoPerfil(perfilAtual);
      rodadaAtual = lista.filter(rodadaConfiavel).at(-1)?.rodada || lista.at(-1)?.rodada || null;
      renderizar();
    }));

    raiz.querySelector("#historyRoundSelect")?.addEventListener("change", e => {
      rodadaAtual = Number(e.target.value);
      renderizar();
    });

    raiz.querySelector("#historyProfileSelect")?.addEventListener("change", e => {
      perfilAtual = e.target.value;
      const lista = rodadasDoPerfil(perfilAtual);
      rodadaAtual = lista.filter(rodadaConfiavel).at(-1)?.rodada || lista.at(-1)?.rodada || null;
      renderizar();
    });
  }

  async function iniciar() {
    estilos();
    garantirRaiz();
    try {
      const resposta = await fetch("data/pontuacao-final-cartola-v21.json", { cache: "no-store" });
      if (!resposta.ok) throw new Error("histórico V2.1 ainda não publicado");
      dados = await resposta.json();
      if (dados?.gate?.aptaParaRankingFinal !== true) throw new Error("histórico ainda não passou pelo gate de atuação explícita");
      renderizar();
    } catch (erro) {
      const raiz = garantirRaiz();
      if (raiz) raiz.innerHTML = `
        <div class="history-v21-card history-v21-empty">
          <strong>Histórico validado em atualização</strong>
          <p>Os dados antigos foram ocultados para não mostrar números incompletos. A nova série Projeção x Real será exibida assim que o reprocessamento científico estiver publicado.</p>
        </div>`;
      console.warn("[Histórico V2.1]", erro);
    }
  }

  return { iniciar, renderizar };
})();

function renderizarHistorico() {
  HistoricoV21.renderizar();
}

async function iniciarHistorico() {
  await HistoricoV21.iniciar();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => setTimeout(iniciarHistorico, 0));
  window.HistoricoCards = { iniciar: iniciarHistorico, renderizar: renderizarHistorico };
  window.iniciarHistorico = iniciarHistorico;
  window.renderizarHistorico = renderizarHistorico;
}
