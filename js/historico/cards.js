/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — cards, tabela e painel temporal
   ========================================================= */

function formatarNumeroHistorico(valor, casas = 2) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toFixed(casas).replace(".", ",")
    : "--";
}

function escaparHistorico(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nomeCurtoHistorico(jogador) {
  return jogador?.apelido
    || jogador?.nomeCurto
    || jogador?.nome_atleta
    || jogador?.nome
    || "--";
}

function garantirEstiloHistorico() {
  if (document.getElementById("cartolaHistoryStyle")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "cartolaHistoryStyle";
  style.textContent = `
    .history-temporal-panel {
      margin: 0 0 18px;
      padding: 16px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px;
      background: rgba(255,255,255,.025);
    }

    .history-temporal-title {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      margin-bottom:12px;
    }

    .history-temporal-title h3 {
      margin:3px 0 0;
      font-size:1rem;
    }

    .history-temporal-title p {
      margin:4px 0 0;
      opacity:.62;
      font-size:11px;
    }

    .history-temporal-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
    }

    .history-temporal-strategy {
      padding:13px;
      border:1px solid rgba(255,255,255,.07);
      border-radius:13px;
      background:rgba(255,255,255,.025);
    }

    .history-temporal-strategy > strong {
      display:block;
      margin-bottom:10px;
      font-size:13px;
    }

    .history-temporal-values {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:7px;
    }

    .history-temporal-value {
      padding:8px;
      border-radius:9px;
      background:rgba(255,255,255,.035);
    }

    .history-temporal-value span {
      display:block;
      font-size:9px;
      opacity:.58;
      text-transform:uppercase;
      letter-spacing:.05em;
    }

    .history-temporal-value b {
      display:block;
      margin-top:3px;
      font-size:16px;
    }

    .history-temporal-note {
      margin:10px 0 0;
      font-size:10px;
      opacity:.58;
    }

    .history-summary {
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:14px;
      margin:18px 0;
    }

    .history-metric-card {
      padding:16px;
      border:1px solid rgba(255,255,255,.09);
      border-radius:15px;
      background:rgba(255,255,255,.025);
    }

    .history-metric-card span {
      display:block;
      margin-bottom:7px;
      font-size:12px;
      opacity:.72;
    }

    .history-metric-card strong {
      display:block;
      font-size:22px;
    }

    .history-metric-card small {
      display:block;
      margin-top:6px;
      opacity:.72;
    }

    .history-table-wrap {
      overflow-x:auto;
      border:1px solid rgba(255,255,255,.08);
      border-radius:16px;
    }

    .history-table {
      width:100%;
      border-collapse:collapse;
      min-width:760px;
    }

    .history-table th,
    .history-table td {
      padding:12px 14px;
      text-align:left;
      border-bottom:1px solid rgba(255,255,255,.07);
    }

    .history-table th {
      font-size:11px;
      letter-spacing:.06em;
      text-transform:uppercase;
      opacity:.68;
    }

    .history-player-name { font-weight:700; }
    .history-player-meta {
      display:block;
      margin-top:3px;
      font-size:11px;
      opacity:.65;
    }

    .history-error-good { font-weight:700; color:#52c98b; }
    .history-error-medium { font-weight:700; color:#dcb954; }
    .history-error-high { font-weight:700; color:#e67d70; }
    .history-info-note { margin:14px 0 0; font-size:12px; opacity:.68; }

    @media (max-width:900px) {
      .history-temporal-grid { grid-template-columns:1fr; }
      .history-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }

    @media (max-width:560px) {
      .history-summary { grid-template-columns:1fr; }
      .history-temporal-values { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
  `;

  document.head.appendChild(style);
}

function obterClasseErroHistorico(erro) {
  const valor = Number(erro);
  if (!Number.isFinite(valor)) return "";
  if (valor <= 2) return "history-error-good";
  if (valor <= 5) return "history-error-medium";
  return "history-error-high";
}

async function renderizarPainelTemporalHistorico() {
  const secao = document.getElementById("historico");
  if (!secao) return;

  let painel = document.getElementById("historyTemporalMetrics");
  if (!painel) {
    painel = document.createElement("section");
    painel.id = "historyTemporalMetrics";
    painel.className = "history-temporal-panel";

    const resumo = document.getElementById("historySummary");
    if (resumo?.parentNode) {
      resumo.parentNode.insertBefore(painel, resumo);
    }
    else {
      secao.prepend(painel);
    }
  }

  try {
    const resposta = await fetch("data/ranking-simulacao.json", { cache: "no-store" });
    if (!resposta.ok) throw new Error("ranking-simulacao.json indisponível");

    const dados = await resposta.json();
    const painelTemporal = dados?.painelTemporal || {};
    const ordem = ["Conservador", "Equilibrado", "Agressivo"];

    const cards = ordem.map(nome => {
      const janela = painelTemporal[nome] || {};
      const valor = chave => formatarNumeroHistorico(janela?.[chave]?.media, 2);
      return `
        <article class="history-temporal-strategy">
          <strong>${escaparHistorico(nome)}</strong>
          <div class="history-temporal-values">
            <div class="history-temporal-value">
              <span>Campeonato</span>
              <b>${valor("campeonato")}</b>
            </div>
            <div class="history-temporal-value">
              <span>Últimas 10</span>
              <b>${valor("ultimas10")}</b>
            </div>
            <div class="history-temporal-value">
              <span>Últimas 5</span>
              <b>${valor("ultimas5")}</b>
            </div>
            <div class="history-temporal-value">
              <span>Últimas 3</span>
              <b>${valor("ultimas3")}</b>
            </div>
          </div>
        </article>
      `;
    }).join("");

    const excluidas = Array.isArray(dados?.rodadasExcluidasSemResultadoFinal)
      ? dados.rodadasExcluidasSemResultadoFinal
      : [];

    painel.innerHTML = `
      <div class="history-temporal-title">
        <div>
          <span class="section-label">DESEMPENHO RECENTE</span>
          <h3>Médias dos times sugeridos</h3>
          <p>Campeonato completo e recortes das rodadas mais recentes.</p>
        </div>
      </div>
      <div class="history-temporal-grid">${cards}</div>
      <p class="history-temporal-note">
        Rodadas sem resultado final não entram nas médias${
          excluidas.length ? ` (excluídas: ${excluidas.map(r => `R${r}`).join(", ")})` : ""
        }.
      </p>
    `;
  }
  catch (erro) {
    painel.innerHTML = `
      <div class="empty-state">
        <strong>Médias temporais indisponíveis</strong>
        <p>O ranking histórico ainda não foi gerado para esta execução.</p>
      </div>
    `;
  }
}

function renderizarResumoHistorico(rodada, jogadores) {
  const container = document.getElementById("historySummary");
  if (!container) return;

  const metricas = typeof calcularMetricasHistorico === "function"
    ? calcularMetricasHistorico(jogadores, rodada?.metricas || {})
    : null;

  if (!metricas) {
    container.innerHTML = "";
    return;
  }

  const top5Texto = `${metricas.top5.acertos} / ${metricas.top5.total}`;
  const capitaoTexto = metricas.capitao.acertou ? "Acertou" : "Não acertou";

  container.innerHTML = `
    <article class="history-metric-card">
      <span>Erro médio (MAE)</span>
      <strong>${formatarNumeroHistorico(metricas.erroMedio, 2)}</strong>
      <small>Quanto menor, melhor</small>
    </article>
    <article class="history-metric-card">
      <span>Top 5</span>
      <strong>${top5Texto}</strong>
      <small>Acertos entre os melhores</small>
    </article>
    <article class="history-metric-card">
      <span>Correlação</span>
      <strong>${formatarNumeroHistorico(metricas.correlacao, 2)}</strong>
      <small>Projeção x resultado real</small>
    </article>
    <article class="history-metric-card">
      <span>Capitão</span>
      <strong>${capitaoTexto}</strong>
      <small>${escaparHistorico(nomeCurtoHistorico(metricas.capitao.jogador || {}))}</small>
    </article>
  `;
}

function renderizarTabelaHistorico(jogadores) {
  const container = document.getElementById("historyGrid");
  if (!container) return;

  const lista = (Array.isArray(jogadores) ? jogadores : [])
    .filter(j => Number.isFinite(Number(j.projecao)) || Number.isFinite(Number(j.real)))
    .sort((a, b) => (Number(b.projecao) || -999) - (Number(a.projecao) || -999));

  if (!lista.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Sem jogadores avaliáveis</strong>
        <p>A rodada existe no histórico, mas não há projeção e resultado real suficientes para o filtro atual.</p>
      </div>
    `;
    return;
  }

  const linhas = lista.map(jogador => {
    const proj = Number(jogador.projecao);
    const real = Number(jogador.real);
    const erro = Number.isFinite(proj) && Number.isFinite(real)
      ? Math.abs(proj - real)
      : null;

    return `
      <tr>
        <td>
          <span class="history-player-name">${escaparHistorico(nomeCurtoHistorico(jogador))}</span>
          <span class="history-player-meta">${escaparHistorico(jogador.posicao || "--")} · ${escaparHistorico(jogador.clube || "--")}</span>
        </td>
        <td>${formatarNumeroHistorico(jogador.projecao, 1)}</td>
        <td>${formatarNumeroHistorico(jogador.real, 1)}</td>
        <td class="${obterClasseErroHistorico(erro)}">${formatarNumeroHistorico(erro, 1)}</td>
        <td>${jogador.top5 ? "✓" : "—"}</td>
        <td>${jogador.capitao ? "C" : "—"}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Jogador</th>
            <th>Projeção</th>
            <th>Real</th>
            <th>Erro</th>
            <th>Top 5</th>
            <th>Capitão</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p class="history-info-note">
      O erro representa a diferença absoluta entre a projeção disponível antes da rodada e a pontuação real registrada.
    </p>
  `;
}

function renderizarHistorico() {
  garantirEstiloHistorico();
  renderizarPainelTemporalHistorico();

  if (typeof HistoricoDados === "undefined") return;

  const rodada = HistoricoDados.obterRodada();
  const jogadores = HistoricoDados.obterJogadores();

  if (!rodada) {
    const container = document.getElementById("historyGrid");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>Histórico ainda não carregado</strong>
          <p>Aguarde o carregamento das rodadas disponíveis.</p>
        </div>
      `;
    }
    return;
  }

  renderizarResumoHistorico(rodada, jogadores);
  renderizarTabelaHistorico(jogadores);
}

async function iniciarHistorico() {
  if (typeof HistoricoDados === "undefined") return;
  await HistoricoDados.carregar();
  if (typeof criarFiltrosHistorico === "function") {
    criarFiltrosHistorico();
  }
  renderizarHistorico();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => setTimeout(iniciarHistorico, 0));
  window.HistoricoCards = {
    iniciar: iniciarHistorico,
    renderizar: renderizarHistorico,
    renderizarPainelTemporal: renderizarPainelTemporalHistorico,
  };
  window.iniciarHistorico = iniciarHistorico;
  window.renderizarHistorico = renderizarHistorico;
}
