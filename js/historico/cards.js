/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — renderização do backtest
   ========================================================= */


/* =========================================================
   FORMATAÇÃO
   ========================================================= */


function formatarNumeroHistorico(
  valor,
  casas = 2
) {

  const numero =
    Number(valor);


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  return numero
    .toFixed(
      casas
    )
    .replace(
      ".",
      ","
    );

}


function escaparHistorico(
  valor
) {

  return String(
    valor ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   ESTILO COMPLEMENTAR
   ========================================================= */


function garantirEstiloHistorico() {

  if (
    document.getElementById(
      "cartolaHistoryStyle"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "cartolaHistoryStyle";


  style.textContent = `

    .history-summary {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin: 18px 0;
    }

    .history-metric-card {
      padding: 16px;
      border: 1px solid
        rgba(255,255,255,.09);
      border-radius: 15px;
      background:
        rgba(255,255,255,.025);
    }

    .history-metric-card span {
      display: block;
      margin-bottom: 7px;
      font-size: 12px;
      opacity: .72;
    }

    .history-metric-card strong {
      display: block;
      font-size: 22px;
    }

    .history-metric-card small {
      display: block;
      margin-top: 6px;
      opacity: .72;
    }

    .history-table-wrap {
      overflow-x: auto;
      border: 1px solid
        rgba(255,255,255,.08);
      border-radius: 16px;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }

    .history-table th,
    .history-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid
        rgba(255,255,255,.07);
    }

    .history-table th {
      font-size: 11px;
      letter-spacing: .06em;
      text-transform: uppercase;
      opacity: .68;
    }

    .history-player-name {
      font-weight: 700;
    }

    .history-player-meta {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      opacity: .65;
    }

    .history-error-good {
      font-weight: 700;
      color: #52c98b;
    }

    .history-error-medium {
      font-weight: 700;
      color: #dcb954;
    }

    .history-error-high {
      font-weight: 700;
      color: #e67d70;
    }

    .history-info-note {
      margin: 14px 0 0;
      font-size: 12px;
      opacity: .68;
    }

    @media (max-width: 900px) {

      .history-summary {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

    }

    @media (max-width: 560px) {

      .history-summary {
        grid-template-columns: 1fr;
      }

    }

  `;


  document.head
    .appendChild(
      style
    );

}


/* =========================================================
   CLASSE DE ERRO
   ========================================================= */


function obterClasseErroHistorico(
  erro
) {

  const valor =
    Number(erro);


  if (
    !Number.isFinite(
      valor
    )
  ) {

    return "";

  }


  if (
    valor <= 2
  ) {

    return "history-error-good";

  }


  if (
    valor <= 5
  ) {

    return "history-error-medium";

  }


  return "history-error-high";

}


/* =========================================================
   RESUMO
   ========================================================= */


function renderizarResumoHistorico(
  rodada,
  jogadores
) {

  const container =
    document.getElementById(
      "historySummary"
    );


  if (!container) {

    return;

  }


  const metricas =
    typeof calcularMetricasHistorico ===
      "function"

      ? calcularMetricasHistorico(

          jogadores,

          rodada?.metricas ||
          {}

        )

      : null;


  if (!metricas) {

    container.innerHTML =
      "";

    return;

  }


  const top5Texto =
    `${metricas.top5.acertos} / ${metricas.top5.total}`;


  const capitaoTexto =
    metricas.capitao.acertou
      ? "Acertou"
      : "Não acertou";


  container.innerHTML = `

    <article
      class="history-metric-card"
    >

      <span>
        Erro médio (MAE)
      </span>

      <strong>
        ${formatarNumeroHistorico(
          metricas.erroMedio,
          2
        )}
      </strong>

      <small>
        Quanto menor, melhor
      </small>

    </article>


    <article
      class="history-metric-card"
    >

      <span>
        Top 5
      </span>

      <strong>
        ${top5Texto}
      </strong>

      <small>
        Acertos entre os melhores
      </small>

    </article>


    <article
      class="history-metric-card"
    >

      <span>
        Correlação
      </span>

      <strong>
        ${formatarNumeroHistorico(
          metricas.correlacao,
          2
        )}
      </strong>

      <small>
        Projeção x resultado real
      </small>

    </article>


    <article
      class="history-metric-card"
    >

      <span>
        Capitão
      </span>

      <strong>
        ${capitaoTexto}
      </strong>

      <small>
        ${
          metricas.capitao
            .jogador
            ?.nome
          ||
          "Sem registro"
        }
      </small>

    </article>

  `;

}


/* =========================================================
   TABELA
   ========================================================= */


function renderizarTabelaHistorico(
  jogadores
) {

  const container =
    document.getElementById(
      "historyGrid"
    );


  if (!container) {

    return;

  }


  const lista =
    jogadores
      .filter(
        jogador =>
          Number.isFinite(
            Number(
              jogador.projecao
            )
          )
          ||
          Number.isFinite(
            Number(
              jogador.real
            )
          )
      )
      .sort(
        (
          a,
          b
        ) => {

          const projecaoA =
            Number(
              a.projecao
            );


          const projecaoB =
            Number(
              b.projecao
            );


          return (
            (
              Number.isFinite(
                projecaoB
              )
                ? projecaoB
                : -999
            )
            -
            (
              Number.isFinite(
                projecaoA
              )
                ? projecaoA
                : -999
            )
          );

        }
      );


  if (
    lista.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <strong>
          Sem jogadores avaliáveis
        </strong>

        <p>
          A rodada existe no histórico,
          mas não há projeção e resultado real
          suficientes para o filtro atual.
        </p>

      </div>

    `;


    return;

  }


  const linhas =
    lista
      .map(
        jogador => {

          const erro =
            (
              Number.isFinite(
                Number(
                  jogador.projecao
                )
              )
              &&
              Number.isFinite(
                Number(
                  jogador.real
                )
              )
            )
              ? Math.abs(
                  Number(
                    jogador.projecao
                  )
                  -
                  Number(
                    jogador.real
                  )
                )
              : null;


          return `

            <tr>

              <td>

                <span
                  class="history-player-name"
                >
                  ${escaparHistorico(
                    jogador.nome
                  )}
                </span>

                <span
                  class="history-player-meta"
                >

                  ${escaparHistorico(
                    jogador.posicao ||
                    "--"
                  )}

                  ·

                  ${escaparHistorico(
                    jogador.clube ||
                    "--"
                  )}

                </span>

              </td>


              <td>
                ${formatarNumeroHistorico(
                  jogador.projecao,
                  1
                )}
              </td>


              <td>
                ${formatarNumeroHistorico(
                  jogador.real,
                  1
                )}
              </td>


              <td
                class="${obterClasseErroHistorico(
                  erro
                )}"
              >
                ${formatarNumeroHistorico(
                  erro,
                  1
                )}
              </td>


              <td>
                ${
                  jogador.top5
                    ? "✓"
                    : "—"
                }
              </td>


              <td>
                ${
                  jogador.capitao
                    ? "C"
                    : "—"
                }
              </td>

            </tr>

          `;

        }
      )
      .join("");


  container.innerHTML = `

    <div
      class="history-table-wrap"
    >

      <table
        class="history-table"
      >

        <thead>

          <tr>

            <th>
              Jogador
            </th>

            <th>
              Projeção
            </th>

            <th>
              Real
            </th>

            <th>
              Erro
            </th>

            <th>
              Top 5
            </th>

            <th>
              Capitão
            </th>

          </tr>

        </thead>


        <tbody>
          ${linhas}
        </tbody>

      </table>

    </div>


    <p class="history-info-note">

      O erro representa a diferença absoluta
      entre a projeção disponível antes da rodada
      e a pontuação real registrada.

    </p>

  `;

}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */


function renderizarHistorico() {

  garantirEstiloHistorico();


  if (
    typeof HistoricoDados ===
      "undefined"
  ) {

    return;

  }


  const rodada =
    HistoricoDados
      .obterRodada();


  const jogadores =
    HistoricoDados
      .obterJogadores();


  if (!rodada) {

    const container =
      document.getElementById(
        "historyGrid"
      );


    if (container) {

      container.innerHTML = `

        <div class="empty-state">

          <strong>
            Histórico ainda não carregado
          </strong>

          <p>
            Aguarde o carregamento das rodadas
            disponíveis.
          </p>

        </div>

      `;

    }


    return;

  }


  renderizarResumoHistorico(
    rodada,
    jogadores
  );


  renderizarTabelaHistorico(
    jogadores
  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */


async function iniciarHistorico() {

  if (
    typeof HistoricoDados ===
      "undefined"
  ) {

    return;

  }


  await HistoricoDados
    .carregar();


  if (
    typeof criarFiltrosHistorico ===
      "function"
  ) {

    criarFiltrosHistorico();

  }


  renderizarHistorico();

}


/* =========================================================
   EXECUÇÃO AUTOMÁTICA
   ========================================================= */


if (
  typeof window !==
  "undefined"
) {

  window.addEventListener(

    "load",

    () => {

      setTimeout(
        iniciarHistorico,
        0
      );

    }

  );


  window.HistoricoCards = {

    iniciar:
      iniciarHistorico,

    renderizar:
      renderizarHistorico

  };


  window.iniciarHistorico =
    iniciarHistorico;


  window.renderizarHistorico =
    renderizarHistorico;

}
