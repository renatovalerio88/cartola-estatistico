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

  function estilos() {
    if (document.getElementById("historicoV21Style")) return;
    const style = document.createElement("style");
    style.id = "historicoV21Style";
    style.textContent = `
      #historyTemporalMetrics,
      #captainTournament,
      #historySummary,
      #historyGrid,
      .history-filters,
      .history-filter-bar { display:none !important; }

      .history-v21 { display:grid; gap:18px; }
      .history-v21-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
      .history-v21-intro h3 { margin:4px 0 0; font-size:1.15rem; }
      .history-v21-intro p { margin:5px 0 0; opacity:.68; max-width:720px; font-size:12px; line-height:1.5; }

      .history-v21-profiles { display:flex; flex-wrap:wrap; gap:8px; }
      .history-v21-profile {
        border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.035);
        color:inherit; border-radius:999px; padding:9px 13px; cursor:pointer; font-weight:750;
      }
      .history-v21-profile.is-active { border-color:rgba(92,220,147,.55); background:rgba(92,220,147,.12); }
      .history-v21-profile[disabled] { opacity:.42; cursor:not-allowed; }

      .history-v21-card {
        border:1px solid rgba(255,255,255,.08); border-radius:16px;
        background:rgba(255,255,255,.025); padding:16px;
      }
      .history-v21-card-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
      .history-v21-card-head h4 { margin:0; font-size:1rem; }
      .history-v21-card-head p { margin:4px 0 0; opacity:.62; font-size:11px; }
      .history-v21-badge { font-size:10px; font-weight:800; border-radius:999px; padding:6px 9px; background:rgba(255,255,255,.05); white-space:nowrap; }

      .history-v21-chart-wrap { overflow-x:auto; }
      .history-v21-chart { width:100%; min-width:620px; height:auto; display:block; }
      .history-v21-legend { display:flex; gap:16px; margin-top:8px; font-size:11px; opacity:.72; }
      .history-v21-legend span::before { content:""; display:inline-block; width:18px; height:3px; border-radius:3px; margin-right:6px; vertical-align:middle; background:currentColor; }
      .history-v21-legend .proj { color:#8da2ff; }
      .history-v21-legend .real { color:#66dca0; }

      .history-v21-controls { display:flex; flex-wrap:wrap; gap:10px; align-items:end; }
      .history-v21-control { display:grid; gap:5px; min-width:180px; }
      .history-v21-control span { font-size:10px; opacity:.62; text-transform:uppercase; letter-spacing:.06em; }
      .history-v21-control select {
        width:100%; border-radius:10px; border:1px solid rgba(255,255,255,.1);
        background:var(--surface, #151a22); color:inherit; padding:10px 11px;
      }

      .history-v21-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
      .history-v21-summary article { padding:13px; border-radius:12px; background:rgba(255,255,255,.035); }
      .history-v21-summary span { display:block; font-size:10px; opacity:.62; }
      .history-v21-summary strong { display:block; margin-top:4px; font-size:18px; }
      .history-v21-summary small { display:block; margin-top:3px; opacity:.58; font-size:10px; }

      .history-v21-table-wrap { overflow-x:auto; border:1px solid rgba(255,255,255,.07); border-radius:13px; }
      .history-v21-table { width:100%; min-width:760px; border-collapse:collapse; }
      .history-v21-table th, .history-v21-table td { padding:11px 12px; border-bottom:1px solid rgba(255,255,255,.065); text-align:left; }
      .history-v21-table th { font-size:10px; opacity:.62; text-transform:uppercase; letter-spacing:.055em; }
      .history-v21-table td { font-size:12px; }
      .history-v21-player { font-weight:750; }
      .history-v21-meta { display:block; margin-top:2px; font-size:10px; opacity:.6; }
      .history-v21-diff.pos { color:#66dca0; font-weight:800; }
      .history-v21-diff.neg { color:#e88a7d; font-weight:800; }
      .history-v21-reading { max-width:330px; line-height:1.4; opacity:.82; }
      .history-v21-note { margin:10px 0 0; font-size:10px; opacity:.58; line-height:1.5; }
      .history-v21-empty { padding:24px; text-align:center; opacity:.7; }

      @media (max-width:900px) {
        .history-v21-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .history-v21-intro { display:block; }
        .history-v21-profiles { margin-top:12px; }
      }
      @media (max-width:560px) {
        .history-v21-summary { grid-template-columns:1fr 1fr; }
        .history-v21-control { min-width:calc(50% - 5px); flex:1; }
        .history-v21-card { padding:13px; }
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

  function svgGrafico(itens) {
    if (!itens.length) return '<div class="history-v21-empty">Sem histórico confiável para este perfil.</div>';
    const W = 920, H = 300, L = 46, R = 18, T = 22, B = 38;
    const valores = itens.flatMap(x => [Number(x.time.projecaoFinalPreJogo ?? x.time.projecaoTitulares), Number(x.time.pontuacaoFinalCartola)]).filter(Number.isFinite);
    const max = Math.max(20, Math.ceil(Math.max(...valores) / 10) * 10);
    const min = Math.min(0, Math.floor(Math.min(...valores) / 10) * 10);
    const x = i => itens.length === 1 ? (L + W - R) / 2 : L + i * ((W - L - R) / (itens.length - 1));
    const y = v => T + (max - v) * ((H - T - B) / (max - min || 1));
    const pontos = chave => itens.map((item, i) => `${x(i).toFixed(1)},${y(Number(item.time[chave] ?? item.time.projecaoTitulares)).toFixed(1)}`).join(" ");
    const linhasY = 4;
    let grade = "";
    for (let i = 0; i <= linhasY; i++) {
      const valor = min + (max - min) * (i / linhasY);
      const yy = y(valor);
      grade += `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="currentColor" opacity=".08"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="currentColor" opacity=".48">${Math.round(valor)}</text>`;
    }
    const rotulos = itens.map((item, i) => `<text x="${x(i)}" y="${H-12}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".5">R${item.rodada}</text>`).join("");
    return `
      <div class="history-v21-chart-wrap">
        <svg class="history-v21-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projeção e pontuação real por rodada">
          ${grade}
          <polyline points="${pontos("projecaoFinalPreJogo")}" fill="none" stroke="#8da2ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${pontos("pontuacaoFinalCartola")}" fill="none" stroke="#66dca0" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
          ${rotulos}
        </svg>
      </div>
      <div class="history-v21-legend"><span class="proj">Projeção pré-rodada</span><span class="real">Real final</span></div>
    `;
  }

  function resumoRodada(time) {
    const proj = Number(time?.projecaoFinalPreJogo ?? time?.projecaoTitulares);
    const real = Number(time?.pontuacaoFinalCartola);
    const banco = Number(time?.pontosRecuperadosBancoLuxo);
    const cap = Number(time?.bonusCapitao15);
    return `
      <div class="history-v21-summary">
        <article><span>Projeção</span><strong>${n(proj)} pts</strong><small>antes da rodada</small></article>
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
      return `
        <tr>
          <td><span class="history-v21-player">${esc(j.nome)}${marcador}</span><span class="history-v21-meta">${esc(meta || "--")}</span></td>
          <td>${n(j.projecao)}</td>
          <td>${j.entrou === false ? "Não jogou" : n(j.pontos)}</td>
          <td class="history-v21-diff ${classe}">${j.entrou === false ? "--" : sinal(dif)}</td>
          <td class="history-v21-reading">${esc(j.leitura || (j.entrou === false ? "Não entrou em campo" : "Resultado comparado à projeção"))}</td>
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
      <p class="history-v21-note">A leitura separa a projeção pré-rodada do que aconteceu depois. Surpresas de escalação não são tratadas automaticamente como erro do modelo; o impacto do banco é medido à parte.</p>
    `;
  }

  function opcoesRodada(perfil) {
    return rodadasDoPerfil(perfil).map(x => `<option value="${x.rodada}" ${x.rodada === rodadaAtual ? "selected" : ""}>Rodada ${x.rodada}</option>`).join("");
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
    if (!rodadaAtual || !itens.some(x => x.rodada === rodadaAtual)) rodadaAtual = itens.at(-1)?.rodada || null;
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
          <p>Escolha um perfil para acompanhar a evolução. A pontuação real considera capitão 1,5x, banco e Reserva de Luxo quando a regra pôde ser comprovada no histórico.</p>
        </div>
        <div class="history-v21-profiles">${botoes}</div>
      </div>

      <section class="history-v21-card">
        <div class="history-v21-card-head">
          <div><h4>${esc(perfilAtual)} · Projeção x Real</h4><p>${itens.length} rodadas com resultado confiável.</p></div>
          <span class="history-v21-badge">até R${dados.rodadaMaximaProcessada || "--"}</span>
        </div>
        ${svgGrafico(itens)}
      </section>

      <section class="history-v21-card">
        <div class="history-v21-card-head">
          <div><h4>Auditoria da escalação</h4><p>Veja jogador por jogador sem excesso de métricas.</p></div>
        </div>
        <div class="history-v21-controls">
          <label class="history-v21-control"><span>Rodada</span><select id="historyRoundSelect">${opcoesRodada(perfilAtual)}</select></label>
          <label class="history-v21-control"><span>Time</span><select id="historyProfileSelect">${PERFIS.map(p => `<option value="${esc(p)}" ${p === perfilAtual ? "selected" : ""} ${perfilDisponivel(p) ? "" : "disabled"}>${esc(p)}${p === "Recomendado" && !perfilDisponivel(p) ? " · em validação" : ""}</option>`).join("")}</select></label>
        </div>
        <div style="margin-top:14px">${time ? resumoRodada(time) : ""}</div>
        <div style="margin-top:14px">${time ? tabela(time) : '<div class="history-v21-empty">Sem dados para este filtro.</div>'}</div>
      </section>
    `;

    raiz.querySelectorAll("[data-history-profile]").forEach(btn => btn.addEventListener("click", () => {
      perfilAtual = btn.dataset.historyProfile;
      rodadaAtual = rodadasDoPerfil(perfilAtual).at(-1)?.rodada || null;
      renderizar();
    }));
    raiz.querySelector("#historyRoundSelect")?.addEventListener("change", e => {
      rodadaAtual = Number(e.target.value);
      renderizar();
    });
    raiz.querySelector("#historyProfileSelect")?.addEventListener("change", e => {
      perfilAtual = e.target.value;
      rodadaAtual = rodadasDoPerfil(perfilAtual).at(-1)?.rodada || null;
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
