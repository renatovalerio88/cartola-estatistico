/*
======================================================
CARTOLA ESTATÍSTICO
Histórico - Torneio de Capitães

Exibe o resultado experimental do torneio sem alterar
o capitão oficial.
======================================================
*/

(() => {
  "use strict";

  let carregando = false;

  function numero(valor, padrao = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  }

  function fmt(valor, casas = 2) {
    return numero(valor).toFixed(casas).replace(".", ",");
  }

  function sinal(valor) {
    const n = numero(valor);
    return `${n > 0 ? "+" : ""}${fmt(n, 2)}`;
  }

  function escapar(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function garantirEstilo() {
    if (document.getElementById("torneioCapitaoStyle")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "torneioCapitaoStyle";
    style.textContent = `
      .captain-tournament {
        margin: 0 0 20px;
        padding: 16px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        background: rgba(255,255,255,.025);
      }

      .captain-tournament-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 12px;
      }

      .captain-tournament-head h3 {
        margin: 3px 0 0;
        font-size: 1rem;
      }

      .captain-tournament-head p {
        margin: 5px 0 0;
        color: rgba(255,255,255,.56);
        font-size: 11px;
        line-height: 1.45;
      }

      .captain-tournament-badge {
        white-space: nowrap;
        padding: 6px 9px;
        border-radius: 999px;
        background: rgba(83,216,145,.12);
        color: #67dfa0;
        font-size: 10px;
        font-weight: 800;
      }

      .captain-tournament-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 9px;
      }

      .captain-tournament-card {
        padding: 11px;
        border-radius: 12px;
        background: rgba(255,255,255,.035);
        border: 1px solid rgba(255,255,255,.055);
      }

      .captain-tournament-card span {
        display: block;
        color: rgba(255,255,255,.52);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .captain-tournament-card strong {
        display: block;
        margin-top: 4px;
        font-size: 17px;
      }

      .captain-tournament-card small {
        display: block;
        margin-top: 3px;
        color: rgba(255,255,255,.5);
        font-size: 9px;
      }

      .captain-tournament-table-wrap {
        overflow-x: auto;
        margin-top: 12px;
      }

      .captain-tournament-table {
        width: 100%;
        min-width: 660px;
        border-collapse: collapse;
        font-size: 10px;
      }

      .captain-tournament-table th,
      .captain-tournament-table td {
        padding: 8px 7px;
        border-bottom: 1px solid rgba(255,255,255,.06);
        text-align: right;
      }

      .captain-tournament-table th:first-child,
      .captain-tournament-table td:first-child {
        text-align: left;
      }

      .captain-tournament-table th {
        color: rgba(255,255,255,.52);
        font-weight: 700;
      }

      .captain-tournament-note {
        margin: 10px 0 0;
        color: rgba(255,255,255,.48);
        font-size: 10px;
        line-height: 1.45;
      }

      @media (max-width: 760px) {
        .captain-tournament-head {
          display: block;
        }

        .captain-tournament-badge {
          display: inline-block;
          margin-top: 9px;
        }

        .captain-tournament-grid {
          grid-template-columns: repeat(2, minmax(0,1fr));
        }
      }
    `;

    document.head.appendChild(style);
  }

  function janela(item, chave) {
    return item?.desempenhoTemporal?.[chave] || {};
  }

  function construirTabela(ranking) {
    const lista = Array.isArray(ranking) ? ranking.slice(0, 6) : [];

    if (!lista.length) {
      return "";
    }

    return `
      <div class="captain-tournament-table-wrap">
        <table class="captain-tournament-table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Capitão</th>
              <th>Ganho camp.</th>
              <th>Últ. 10</th>
              <th>Últ. 5</th>
              <th>Últ. 3</th>
              <th>Vitórias</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(item => `
              <tr>
                <td>${escapar(item.modelo)}</td>
                <td>${fmt(item.mediaPontosCapitao, 2)}</td>
                <td>${sinal(item.ganhoMedioTimeVsAtual)}</td>
                <td>${sinal(janela(item, "ultimas10").ganhoTimeVsAtual)}</td>
                <td>${sinal(janela(item, "ultimas5").ganhoTimeVsAtual)}</td>
                <td>${sinal(janela(item, "ultimas3").ganhoTimeVsAtual)}</td>
                <td>${fmt(item.taxaVitoriasVsAtual, 1)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  async function renderizar() {
    if (carregando) {
      return;
    }

    const secao = document.getElementById("historico");
    if (!secao) {
      return;
    }

    carregando = true;

    try {
      const resposta = await fetch("data/torneio-capitao.json", { cache: "no-store" });
      if (!resposta.ok) {
        return;
      }

      const dados = await resposta.json();
      const melhor = dados?.melhorExperimental;
      if (!melhor) {
        return;
      }

      garantirEstilo();

      let bloco = document.getElementById("captainTournament");
      if (!bloco) {
        bloco = document.createElement("section");
        bloco.id = "captainTournament";
        bloco.className = "captain-tournament";

        const toolbar = secao.querySelector(".history-toolbar");
        if (toolbar?.parentNode) {
          toolbar.parentNode.insertBefore(bloco, toolbar);
        } else {
          secao.prepend(bloco);
        }
      }

      const camp = janela(melhor, "campeonato");
      const u10 = janela(melhor, "ultimas10");
      const u5 = janela(melhor, "ultimas5");
      const u3 = janela(melhor, "ultimas3");

      bloco.innerHTML = `
        <div class="captain-tournament-head">
          <div>
            <span class="section-label">LABORATÓRIO DE CAPITÃO</span>
            <h3>Torneio de modelos experimentais</h3>
            <p>
              O vencedor é testado em backtest walk-forward e ainda não altera o capitão oficial.
              O ganho abaixo representa a diferença média na pontuação total do time causada apenas pela troca do capitão.
            </p>
          </div>
          <span class="captain-tournament-badge">
            Melhor: ${escapar(melhor.modelo)}
          </span>
        </div>

        <div class="captain-tournament-grid">
          <article class="captain-tournament-card">
            <span>Campeonato</span>
            <strong>${sinal(camp.ganhoTimeVsAtual)} pt</strong>
            <small>ganho médio vs capitão atual</small>
          </article>

          <article class="captain-tournament-card">
            <span>Últimas 10</span>
            <strong>${sinal(u10.ganhoTimeVsAtual)} pt</strong>
            <small>ganho médio por rodada</small>
          </article>

          <article class="captain-tournament-card">
            <span>Últimas 5</span>
            <strong>${sinal(u5.ganhoTimeVsAtual)} pt</strong>
            <small>ganho médio por rodada</small>
          </article>

          <article class="captain-tournament-card">
            <span>Últimas 3</span>
            <strong>${sinal(u3.ganhoTimeVsAtual)} pt</strong>
            <small>ganho médio por rodada</small>
          </article>
        </div>

        ${construirTabela(dados.ranking)}

        <p class="captain-tournament-note">
          Decisão automática do laboratório: <strong>${escapar(dados.decisao || "--")}</strong>.
          Promoção automática permanece desativada para evitar overfitting.
        </p>
      `;
    } catch (erro) {
      console.warn("[Torneio Capitão]", erro);
    } finally {
      carregando = false;
    }
  }

  window.addEventListener("load", () => {
    setTimeout(renderizar, 250);
  });

  document.addEventListener("click", evento => {
    const botao = evento.target.closest?.('[data-tab="historico"]');
    if (botao) {
      setTimeout(renderizar, 80);
    }
  });

  window.CartolaTorneioCapitao = { renderizar };
})();
