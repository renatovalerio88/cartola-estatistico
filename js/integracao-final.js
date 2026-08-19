/* =========================================================
   CARTOLA ESTATÍSTICO
   Integração final da interface — PACOTE FINAL

   Responsabilidades:

   - manter Recomendações e Times sincronizados;
   - garantir filtros de exclusão nas duas abas;
   - corrigir contraste dos filtros em desktop/mobile;
   - corrigir a data/hora de última atualização;
   - complementar a composição da nota;
   - adicionar gráfico histórico dos 3 perfis;
   - melhorar a leitura da aba Análise da rodada;
   - manter patrimônio e renderizações estáveis.

   ========================================================= */


const CartolaIntegracaoFinal =
(() => {

  "use strict";


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    inicializado:
      false,

    inicializando:
      false,

    recalculando:
      false,

    ultimaAtualizacao:
      null,

    erros:
      [],

    graficoHistoricoCarregado:
      false,

    timerReconstruirFiltros:
      null,

    observer:
      null

  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  const esperar =
    milissegundos =>
      new Promise(
        resolver =>
          setTimeout(
            resolver,
            milissegundos
          )
      );


  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    ).trim();

  }


  function numero(
    valor,
    padrao = 0
  ) {

    const n =
      Number(
        valor
      );


    return Number.isFinite(
      n
    )
      ? n
      : padrao;

  }


  function escaparHtml(
    valor
  ) {

    return texto(
      valor
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


  function registrarErro(
    origem,
    erro
  ) {

    const registro = {

      origem,

      mensagem:
        erro?.message
        ??
        String(
          erro
        ),

      data:
        new Date()
          .toISOString()

    };


    estado.erros.push(
      registro
    );


    if (
      estado.erros.length >
      20
    ) {

      estado.erros.shift();

    }


    console.warn(
      `[Integração Final] ${origem}:`,
      erro
    );

  }


  /* =======================================================
     ESTILOS FINAIS
     ======================================================= */

  function garantirEstilosFinais() {

    const antigo =
      document.getElementById(
        "cartolaFinalStyle"
      );


    if (
      antigo
    ) {

      antigo.remove();

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "cartolaFinalStyle";


    style.textContent = `


      /* ===================================================
         FILTROS — CONTRASTE E ESTABILIDADE
         =================================================== */


      .ce-filter-wrapper {

        width: 100% !important;

        display: block !important;

        visibility: visible !important;

        opacity: 1 !important;

        margin:
          14px
          0
          18px
          !important;

      }


      .ce-filter-panel {

        color:
          #f3fff7
          !important;

        background:
          linear-gradient(
            180deg,
            rgba(
              16,
              48,
              31,
              .97
            ),
            rgba(
              8,
              28,
              18,
              .98
            )
          )
          !important;

        border-color:
          rgba(
            72,
            214,
            139,
            .28
          )
          !important;

      }


      .ce-filter-dropdown > summary,
      .ce-filter-search,
      .ce-filter-dropdown-body {

        color:
          #f3fff7
          !important;

        background-color:
          #0a1c12
          !important;

      }


      .ce-filter-dropdown > summary {

        border-color:
          rgba(
            255,
            255,
            255,
            .14
          )
          !important;

      }


      .ce-filter-dropdown-body {

        border-color:
          rgba(
            255,
            255,
            255,
            .15
          )
          !important;

      }


      .ce-filter-search::placeholder {

        color:
          rgba(
            255,
            255,
            255,
            .48
          )
          !important;

      }


      .ce-filter-option,
      .ce-filter-player-info strong,
      .ce-filter-player-info small {

        color:
          #f3fff7
          !important;

      }


      .ce-filter-position-title {

        background:
          #0a1c12
          !important;

        color:
          #56df98
          !important;

      }


      .ce-filter-option:hover {

        background:
          rgba(
            255,
            255,
            255,
            .07
          )
          !important;

      }


      .ce-filter-option
      input[type="checkbox"] {

        accent-color:
          #48d68b;

      }


      .ce-filter-clear {

        color:
          #f3fff7
          !important;

        background:
          rgba(
            255,
            255,
            255,
            .045
          )
          !important;

      }


      .ce-filter-apply {

        color:
          #062113
          !important;

        background:
          #53d891
          !important;

      }


      /*
       * GARANTE O FILTRO NAS DUAS ABAS.
       */

      #times
      #ceFilterTeams,

      #times
      .ce-filter-wrapper,

      #recomendacoes
      #ceFilterRecommendations,

      #recomendacoes
      .ce-filter-wrapper {

        display:
          block
          !important;

        visibility:
          visible
          !important;

        opacity:
          1
          !important;

      }


      /* ===================================================
         COMPOSIÇÃO DA NOTA
         =================================================== */


      .component-row.component-unavailable {

        opacity:
          .62;

      }


      .component-row.component-unavailable
      .component-fill {

        opacity:
          .22;

      }


      .component-label small {

        display:
          block;

        margin-top:
          3px;

        color:
          rgba(
            255,
            255,
            255,
            .55
          );

        font-size:
          9px;

        line-height:
          1.35;

      }


      .components-summary {

        margin-bottom:
          10px;

        color:
          rgba(
            255,
            255,
            255,
            .55
          );

      }


      /* ===================================================
         HISTÓRICO — GRÁFICO
         =================================================== */


      .history-evolution {

        margin:
          0
          0
          22px;

        padding:
          18px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .08
          );

        border-radius:
          16px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );

      }


      .history-evolution-header {

        display:
          flex;

        justify-content:
          space-between;

        align-items:
          flex-start;

        gap:
          16px;

        margin-bottom:
          14px;

      }


      .history-evolution-header h3 {

        margin:
          3px
          0
          0;

        font-size:
          1rem;

      }


      .history-evolution-header p {

        margin:
          4px
          0
          0;

        color:
          rgba(
            255,
            255,
            255,
            .56
          );

        font-size:
          11px;

      }


      .history-evolution-legend {

        display:
          flex;

        flex-wrap:
          wrap;

        justify-content:
          flex-end;

        gap:
          8px;

      }


      .history-evolution-legend span {

        display:
          inline-flex;

        align-items:
          center;

        gap:
          6px;

        padding:
          5px
          8px;

        border-radius:
          999px;

        background:
          rgba(
            255,
            255,
            255,
            .045
          );

        font-size:
          10px;

      }


      .history-evolution-legend i {

        width:
          9px;

        height:
          9px;

        border-radius:
          50%;

        display:
          inline-block;

      }


      .history-chart-wrap {

        width:
          100%;

        overflow-x:
          auto;

        overflow-y:
          hidden;

      }


      .history-chart-svg {

        display:
          block;

        width:
          100%;

        min-width:
          760px;

        height:
          330px;

      }


      .history-chart-grid {

        stroke:
          rgba(
            255,
            255,
            255,
            .08
          );

        stroke-width:
          1;

      }


      .history-chart-axis-text {

        fill:
          rgba(
            255,
            255,
            255,
            .48
          );

        font-size:
          10px;

      }


      .history-chart-line {

        fill:
          none;

        stroke-width:
          3;

        stroke-linecap:
          round;

        stroke-linejoin:
          round;

      }


      .history-chart-dot {

        stroke:
          #0b1d13;

        stroke-width:
          2;

      }


      .history-evolution-cards {

        display:
          grid;

        grid-template-columns:
          repeat(
            3,
            minmax(
              0,
              1fr
            )
          );

        gap:
          10px;

        margin-top:
          14px;

      }


      .history-evolution-card {

        padding:
          12px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .07
          );

        border-radius:
          12px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );

      }


      .history-evolution-card span {

        display:
          block;

        color:
          rgba(
            255,
            255,
            255,
            .52
          );

        font-size:
          9px;

        text-transform:
          uppercase;

        letter-spacing:
          .06em;

      }


      .history-evolution-card strong {

        display:
          block;

        margin-top:
          4px;

        font-size:
          18px;

      }


      .history-evolution-card small {

        display:
          block;

        margin-top:
          3px;

        color:
          rgba(
            255,
            255,
            255,
            .52
          );

        font-size:
          10px;

      }


      .history-chart-note {

        margin:
          10px
          0
          0;

        color:
          rgba(
            255,
            255,
            255,
            .48
          );

        font-size:
          10px;

        line-height:
          1.45;

      }


      /* ===================================================
         ANÁLISE — LEITURA RÁPIDA
         =================================================== */


      .round-strategy-reading {

        margin-top:
          16px;

        padding:
          16px;

        border:
          1px solid
          rgba(
            72,
            214,
            139,
            .18
          );

        border-radius:
          15px;

        background:
          rgba(
            28,
            79,
            49,
            .15
          );

      }


      .round-strategy-reading h3 {

        margin:
          0
          0
          10px;

        font-size:
          14px;

      }


      .round-strategy-reading-grid {

        display:
          grid;

        grid-template-columns:
          repeat(
            2,
            minmax(
              0,
              1fr
            )
          );

        gap:
          9px;

      }


      .round-strategy-item {

        padding:
          10px
          11px;

        border-radius:
          10px;

        background:
          rgba(
            255,
            255,
            255,
            .035
          );

      }


      .round-strategy-item span {

        display:
          block;

        color:
          #55dc96;

        font-size:
          9px;

        font-weight:
          800;

        text-transform:
          uppercase;

        letter-spacing:
          .06em;

      }


      .round-strategy-item strong {

        display:
          block;

        margin-top:
          3px;

        font-size:
          12px;

      }


      .round-strategy-item small {

        display:
          block;

        margin-top:
          3px;

        color:
          rgba(
            255,
            255,
            255,
            .52
          );

        font-size:
          10px;

      }


      /* ===================================================
         MOBILE
         =================================================== */


      @media (
        max-width:
        700px
      ) {

        .ce-filter-panel {

          background:
            #0b1e14
            !important;

        }


        .ce-filter-heading {

          flex-direction:
            column;

          align-items:
            stretch;

        }


        .ce-filter-clear {

          width:
            100%;

        }


        .ce-filter-dropdown-body {

          background:
            #081911
            !important;

        }


        .history-evolution {

          padding:
            13px;

        }


        .history-evolution-header {

          display:
            block;

        }


        .history-evolution-legend {

          justify-content:
            flex-start;

          margin-top:
            10px;

        }


        .history-evolution-cards,
        .round-strategy-reading-grid {

          grid-template-columns:
            1fr;

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =======================================================
     RECOMENDAÇÕES
     ======================================================= */

  function atualizarRecomendacoes() {

    try {

      if (
        typeof window
          .exibirDestaquesGerais ===
          "function"
      ) {

        window
          .exibirDestaquesGerais();

      }
      else if (
        typeof exibirDestaquesGerais ===
          "function"
      ) {

        exibirDestaquesGerais();

      }


      if (
        typeof window
          .exibirJogadoresDaPosicao ===
          "function"
      ) {

        window
          .exibirJogadoresDaPosicao();

      }
      else if (
        typeof exibirJogadoresDaPosicao ===
          "function"
      ) {

        exibirJogadoresDaPosicao();

      }


      return true;

    } catch (erro) {

      registrarErro(
        "atualizarRecomendacoes",
        erro
      );


      return false;

    }

  }


  /* =======================================================
     ESCALAÇÕES
     ======================================================= */

  function renderizarEscalacoes() {

    try {

      if (
        typeof window
          .renderizarEscalacoes ===
          "function"
      ) {

        window
          .renderizarEscalacoes();


        return true;

      }


      if (
        window.CartolaEscalacoesCards &&
        typeof window
          .CartolaEscalacoesCards
          .renderizar ===
          "function"
      ) {

        window
          .CartolaEscalacoesCards
          .renderizar();


        return true;

      }


      if (
        typeof exibirEscalacoes ===
          "function"
      ) {

        exibirEscalacoes();


        return true;

      }

    } catch (erro) {

      registrarErro(
        "renderizarEscalacoes",
        erro
      );

    }


    return false;

  }


  /* =======================================================
     RECÁLCULO
     ======================================================= */

  async function recalcularTudo(
    opcoes = {}
  ) {

    if (
      estado.recalculando
    ) {

      return false;

    }


    estado.recalculando =
      true;


    try {

      let resultado =
        null;


      if (
        typeof window
          .recalcularEscalacoes ===
          "function"
      ) {

        resultado =
          await window
            .recalcularEscalacoes(
              opcoes
            );

      }
      else if (
        window.CartolaEscalacoes &&
        typeof window
          .CartolaEscalacoes
          .recalcular ===
          "function"
      ) {

        resultado =
          await window
            .CartolaEscalacoes
            .recalcular(
              opcoes
            );

      }


      atualizarRecomendacoes();

      renderizarEscalacoes();


      await esperar(
        80
      );


      reconstruirFiltros(
        true
      );


      return resultado;

    } catch (erro) {

      registrarErro(
        "recalcularTudo",
        erro
      );


      return false;

    } finally {

      estado.recalculando =
        false;

    }

  }


  /* =======================================================
     PATRIMÔNIO
     ======================================================= */

  function obterPatrimonioAtual() {

    const input =
      document.getElementById(
        "lineupBudgetInput"
      );


    if (!input) {

      return null;

    }


    const valor =
      Number(
        input.value
      );


    return Number.isFinite(
      valor
    )
      ? valor
      : null;

  }


  function sincronizarCamposPatrimonio() {

    const input =
      document.getElementById(
        "lineupBudgetInput"
      );


    if (!input) {

      return false;

    }


    const valor =
      obterPatrimonioAtual();


    if (
      valor === null
    ) {

      return false;

    }


    document
      .querySelectorAll(
        `
          [data-budget-input],
          input[name="patrimonio"]
        `
      )
      .forEach(
        campo => {

          if (
            campo !== input
          ) {

            campo.value =
              valor;

          }

        }
      );


    return true;

  }


  /* =======================================================
     FILTROS — GARANTIA NAS DUAS ABAS
     ======================================================= */

  function reconstruirFiltros(
    forcar = false
  ) {

    if (
      !window
        .CartolaFiltrosExclusao ||
      typeof window
        .CartolaFiltrosExclusao
        .reconstruir !==
        "function"
    ) {

      return false;

    }


    clearTimeout(
      estado
        .timerReconstruirFiltros
    );


    estado.timerReconstruirFiltros =
      setTimeout(
        () => {

          try {

            const secaoReco =
              document
                .getElementById(
                  "recomendacoes"
                );


            const secaoTimes =
              document
                .getElementById(
                  "times"
                );


            const faltaReco =
              !document
                .getElementById(
                  "ceFilterRecommendations"
                );


            const faltaTimes =
              !document
                .getElementById(
                  "ceFilterTeams"
                );


            if (
              forcar ||
              faltaReco ||
              faltaTimes ||
              secaoReco ||
              secaoTimes
            ) {

              window
                .CartolaFiltrosExclusao
                .reconstruir();

            }

          } catch (erro) {

            registrarErro(
              "reconstruirFiltros",
              erro
            );

          }

        },
        60
      );


    return true;

  }


  async function configurarFiltrosExclusao() {

    if (
      !window
        .CartolaFiltrosExclusao ||
      typeof window
        .CartolaFiltrosExclusao
        .inicializar !==
        "function"
    ) {

      return false;

    }


    try {

      await window
        .CartolaFiltrosExclusao
        .inicializar();


      reconstruirFiltros(
        true
      );


      return true;

    } catch (erro) {

      registrarErro(
        "configurarFiltrosExclusao",
        erro
      );


      return false;

    }

  }


  /* =======================================================
     DATA/HORA REAL
     ======================================================= */

  function formatarDataHoraBrasil(
    valor
  ) {

    if (!valor) {

      return null;

    }


    const data =
      new Date(
        valor
      );


    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      return null;

    }


    try {

      return new Intl
        .DateTimeFormat(
          "pt-BR",
          {

            timeZone:
              "America/Sao_Paulo",

            day:
              "2-digit",

            month:
              "2-digit",

            year:
              "numeric",

            hour:
              "2-digit",

            minute:
              "2-digit",

            hour12:
              false

          }
        )
        .format(
          data
        )
        .replace(
          ",",
          " às"
        );

    } catch (_) {

      return data
        .toLocaleString(
          "pt-BR"
        );

    }

  }


  async function atualizarUltimaAtualizacao() {

    try {

      const respostaStatus =
        await fetch(
          "data/api/status.json",
          {
            cache:
              "no-store"
          }
        );


      const status =
        respostaStatus.ok
          ? await respostaStatus
              .json()
          : {};


      const rodada =
        Number(
          status
            ?.rodada_atual
          ||
          0
        );


      let coletadoEm =
        null;


      if (
        rodada > 0
      ) {

        const codigo =
          String(
            rodada
          ).padStart(
            2,
            "0"
          );


        const respostaResumo =
          await fetch(

            `data/api/rodada-${codigo}/resumo.json`,

            {
              cache:
                "no-store"
            }

          );


        if (
          respostaResumo.ok
        ) {

          const resumo =
            await respostaResumo
              .json();


          coletadoEm =

            resumo?.coletadoEm

            ||

            resumo?.coletado_em

            ||

            null;

        }

      }


      const textoData =
        formatarDataHoraBrasil(
          coletadoEm
        );


      const elemento =
        document.getElementById(
          "lastUpdate"
        );


      if (
        elemento
      ) {

        elemento.textContent =
          textoData
            ? (
                `Última atualização: ` +
                `${textoData}`
              )
            : (
                `Dados da rodada ` +
                `${rodada || "--"} ` +
                `carregados`
              );

      }


      estado.ultimaAtualizacao =
        coletadoEm
        ||
        new Date()
          .toISOString();


      return textoData;

    } catch (erro) {

      registrarErro(
        "atualizarUltimaAtualizacao",
        erro
      );


      return null;

    }

  }


  /* =======================================================
     RESULTADOS DE UMA RODADA
     ======================================================= */

  async function buscarResultadosRodada(
    rodada
  ) {

    const codigo =
      String(
        rodada
      ).padStart(
        2,
        "0"
      );


    const caminhos = [

      `data/api/rodada-${codigo}/jogadores.json`,

      `data/api/rodada-${codigo}/pontuados.json`

    ];


    for (
      const caminho
      of caminhos
    ) {

      try {

        const resposta =
          await fetch(
            caminho,
            {
              cache:
                "no-store"
            }
          );


        if (
          !resposta.ok
        ) {

          continue;

        }


        const dados =
          await resposta.json();


        const lista =
          Array.isArray(
            dados
          )
            ? dados
            : Object.values(
                dados?.atletas
                ||
                {}
              );


        if (
          !Array.isArray(
            lista
          ) ||
          lista.length === 0
        ) {

          continue;

        }


        const mapa =
          new Map();


        lista.forEach(
          item => {

            const id =
              texto(

                item?.id

                ??

                item?.atleta_id

                ??

                item?.atletaId

              );


            if (!id) {

              return;

            }


            const pontuacaoRaw =

              item?.pontuacaoReal

              ??

              item?.pontuacao

              ??

              item?.pontos

              ??

              null;


            const pontuacao =
              (
                pontuacaoRaw === null ||
                pontuacaoRaw ===
                  undefined ||
                pontuacaoRaw === ""
              )
                ? null
                : Number(
                    pontuacaoRaw
                  );


            const entrou =

              item?.entrouEmCampo

              ??

              item?.entrou_em_campo

              ??

              (
                pontuacao !== null &&
                Number.isFinite(
                  pontuacao
                )
              );


            mapa.set(
              id,
              {

                id,

                pontuacao:
                  Number.isFinite(
                    pontuacao
                  )
                    ? pontuacao
                    : 0,

                entrouEmCampo:
                  Boolean(
                    entrou
                  )

              }
            );

          }
        );


        if (
          mapa.size > 0
        ) {

          return mapa;

        }

      } catch (_) {

        /*
         * Tenta próxima fonte.
         */

      }

    }


    return new Map();

  }


  function obterIdAtleta(
    item
  ) {

    return texto(

      item?.id

      ??

      item?.atletaId

      ??

      item?.atleta_id

    );

  }


  function obterPosicaoAtleta(
    item
  ) {

    return texto(

      item?.posicao

      ??

      item?.posicaoSigla

      ??

      ""

    ).toUpperCase();

  }


  /* =======================================================
     PONTUAÇÃO EFETIVA DO TIME
     ======================================================= */

  function calcularPontuacaoEfetiva(
    estrategia,
    resultados
  ) {

    const titulares =
      Array.isArray(
        estrategia?.titulares
      )
        ? estrategia.titulares
        : [];


    const banco =
      Array.isArray(
        estrategia?.banco
      )
        ? estrategia.banco
        : [];


    const reservasUsados =
      new Set();


    const substituicoes =
      [];


    let total =
      0;


    titulares.forEach(
      titular => {

        const idTitular =
          obterIdAtleta(
            titular
          );


        const posicao =
          obterPosicaoAtleta(
            titular
          );


        const realTitular =
          resultados.get(
            idTitular
          );


        /*
         * Titular jogou.
         */

        if (
          realTitular
            ?.entrouEmCampo
        ) {

          total +=
            numero(
              realTitular
                .pontuacao,
              0
            );


          return;

        }


        /*
         * Titular não jogou:
         *
         * procura reserva elegível
         * da mesma posição.
         */

        const reserva =
          banco.find(
            item => {

              const idReserva =
                obterIdAtleta(
                  item
                );


              if (
                !idReserva ||
                reservasUsados.has(
                  idReserva
                )
              ) {

                return false;

              }


              if (
                obterPosicaoAtleta(
                  item
                ) !==
                posicao
              ) {

                return false;

              }


              const realReserva =
                resultados.get(
                  idReserva
                );


              return Boolean(
                realReserva
                  ?.entrouEmCampo
              );

            }
          );


        if (
          reserva
        ) {

          const idReserva =
            obterIdAtleta(
              reserva
            );


          const realReserva =
            resultados.get(
              idReserva
            );


          reservasUsados.add(
            idReserva
          );


          total +=
            numero(
              realReserva
                ?.pontuacao,
              0
            );


          substituicoes.push({

            saiu:
              titular?.nome
              ||
              titular?.apelido
              ||
              idTitular,

            entrou:
              reserva?.nome
              ||
              reserva?.apelido
              ||
              idReserva,

            posicao

          });

        }

      }
    );


    /*
     * CAPITÃO:
     *
     * pontuação do capitão é duplicada
     * somente se ele entrou em campo.
     */

    const capitaoId =
      obterIdAtleta(
        estrategia?.capitao
      );


    const capitaoReal =
      resultados.get(
        capitaoId
      );


    if (
      capitaoId &&
      capitaoReal
        ?.entrouEmCampo
    ) {

      total +=
        numero(
          capitaoReal
            .pontuacao,
          0
        );

    }


    return {

      pontuacao:
        Number(
          total.toFixed(
            2
          )
        ),

      substituicoes

    };

  }


  /* =======================================================
     SÉRIES HISTÓRICAS
     ======================================================= */

  async function montarSerieHistorica(
    dados
  ) {

    const rodadas =
      Array.isArray(
        dados?.rodadas
      )
        ? dados.rodadas
        : [];


    const series = {

      Conservador:
        [],

      Equilibrado:
        [],

      Agressivo:
        []

    };


    for (
      const registro
      of rodadas
    ) {

      const rodada =
        Number(
          registro?.rodada
        );


      if (
        !Number.isFinite(
          rodada
        )
      ) {

        continue;

      }


      const resultados =
        await buscarResultadosRodada(
          rodada
        );


      const estrategias =
        Array.isArray(
          registro?.estrategias
        )
          ? registro.estrategias
          : [];


      estrategias.forEach(
        estrategia => {

          const nome =
            texto(
              estrategia?.nome
              ||
              estrategia?.perfil
            );


          const chave =
            Object.keys(
              series
            ).find(
              item =>
                item
                  .toLowerCase() ===
                nome
                  .toLowerCase()
            );


          if (!chave) {

            return;

          }


          let efetiva;


          if (
            resultados.size > 0
          ) {

            efetiva =
              calcularPontuacaoEfetiva(
                estrategia,
                resultados
              );

          } else {

            /*
             * Fallback:
             * usa a simulação histórica já calculada.
             */

            efetiva = {

              pontuacao:
                numero(
                  estrategia
                    ?.pontuacaoComCapitao,
                  0
                ),

              substituicoes:
                []

            };

          }


          series[
            chave
          ].push({

            rodada,

            pontuacao:
              efetiva.pontuacao,

            substituicoes:
              efetiva
                .substituicoes

          });

        }
      );

    }


    Object
      .values(
        series
      )
      .forEach(
        lista => {

          lista.sort(
            (
              a,
              b
            ) =>
              a.rodada -
              b.rodada
          );

        }
      );


    return series;

  }


  /* =======================================================
     SVG DO GRÁFICO
     ======================================================= */

  function criarSvgHistorico(
    series
  ) {

    const todas =
      Object
        .values(
          series
        )
        .flat();


    if (
      todas.length === 0
    ) {

      return `

        <div class="empty-state">

          <strong>
            Sem dados para o gráfico
          </strong>

        </div>

      `;

    }


    const rodadas =
      [
        ...new Set(
          todas.map(
            item =>
              item.rodada
          )
        )
      ]
        .sort(
          (
            a,
            b
          ) =>
            a - b
        );


    const valores =
      todas.map(
        item =>
          item.pontuacao
      );


    const largura =
      Math.max(
        860,
        rodadas.length *
        42
      );


    const altura =
      330;


    const margem = {

      topo:
        20,

      direita:
        22,

      baixo:
        36,

      esquerda:
        48

    };


    const internoW =
      largura -
      margem.esquerda -
      margem.direita;


    const internoH =
      altura -
      margem.topo -
      margem.baixo;


    const minimo =
      Math.min(
        0,
        ...valores
      );


    const maximo =
      Math.max(
        10,
        ...valores
      );


    const folga =
      Math.max(
        5,
        (
          maximo -
          minimo
        ) *
        .08
      );


    const yMin =
      minimo -
      folga;


    const yMax =
      maximo +
      folga;


    function x(
      rodada
    ) {

      const indice =
        rodadas.indexOf(
          rodada
        );


      return (
        margem.esquerda +
        (
          rodadas.length <= 1

            ? internoW /
              2

            : (
                indice /
                (
                  rodadas.length -
                  1
                )
              ) *
              internoW
        )
      );

    }


    function y(
      valor
    ) {

      const proporcao =
        (
          valor -
          yMin
        ) /
        Math.max(
          .0001,
          yMax -
          yMin
        );


      return (
        margem.topo +
        internoH -
        proporcao *
        internoH
      );

    }


    const cores = {

      Conservador:
        "#59c98d",

      Equilibrado:
        "#5da8ff",

      Agressivo:
        "#f2a45a"

    };


    let grade =
      "";


    const divisaoY =
      5;


    for (
      let indice = 0;
      indice <= divisaoY;
      indice += 1
    ) {

      const valor =
        yMin +
        (
          yMax -
          yMin
        ) *
        (
          indice /
          divisaoY
        );


      const py =
        y(
          valor
        );


      grade += `

        <line
          class="history-chart-grid"
          x1="${margem.esquerda}"
          y1="${py}"
          x2="${
            largura -
            margem.direita
          }"
          y2="${py}"
        ></line>


        <text
          class="history-chart-axis-text"
          x="${
            margem.esquerda -
            8
          }"
          y="${
            py +
            3
          }"
          text-anchor="end"
        >
          ${valor.toFixed(0)}
        </text>

      `;

    }


    const passoLabel =
      rodadas.length >
      18
        ? 2
        : 1;


    rodadas.forEach(
      (
        rodada,
        indice
      ) => {

        if (
          indice %
            passoLabel !==
            0 &&
          indice !==
            rodadas.length -
            1
        ) {

          return;

        }


        grade += `

          <text
            class="history-chart-axis-text"
            x="${x(rodada)}"
            y="${
              altura -
              12
            }"
            text-anchor="middle"
          >
            R${rodada}
          </text>

        `;

      }
    );


    let linhas =
      "";


    Object
      .entries(
        series
      )
      .forEach(
        (
          [
            nome,
            lista
          ]
        ) => {

          if (
            !lista.length
          ) {

            return;

          }


          const pontos =
            lista
              .map(
                item =>
                  `${
                    x(
                      item.rodada
                    )
                  },${
                    y(
                      item.pontuacao
                    )
                  }`
              )
              .join(
                " "
              );


          linhas += `

            <polyline
              class="history-chart-line"
              stroke="${cores[nome]}"
              points="${pontos}"
            ></polyline>

          `;


          lista.forEach(
            item => {

              const substituicoes =
                item
                  .substituicoes
                  ?.length

                  ? item
                      .substituicoes
                      .map(
                        troca =>
                          `${
                            troca.saiu
                          } → ${
                            troca.entrou
                          }`
                      )
                      .join(
                        " | "
                      )

                  : "Sem substituições";


              linhas += `

                <circle
                  class="history-chart-dot"
                  cx="${
                    x(
                      item.rodada
                    )
                  }"
                  cy="${
                    y(
                      item.pontuacao
                    )
                  }"
                  r="4"
                  fill="${cores[nome]}"
                >

                  <title>
                    ${nome}
                    • Rodada ${item.rodada}
                    • ${item.pontuacao.toFixed(2)} pts
                    • ${substituicoes}
                  </title>

                </circle>

              `;

            }
          );

        }
      );


    return `

      <svg
        class="history-chart-svg"
        viewBox="
          0 0
          ${largura}
          ${altura}
        "
        role="img"
        aria-label="
          Evolução histórica
          das três estratégias
        "
      >

        ${grade}

        ${linhas}

      </svg>

    `;

  }


  /* =======================================================
     RESUMO DE UMA SÉRIE
     ======================================================= */

  function calcularResumoSerie(
    lista
  ) {

    if (
      !Array.isArray(
        lista
      ) ||
      lista.length === 0
    ) {

      return {

        media:
          0,

        total:
          0,

        melhor:
          0

      };

    }


    const valores =
      lista.map(
        item =>
          numero(
            item.pontuacao,
            0
          )
      );


    const total =
      valores.reduce(
        (
          soma,
          valor
        ) =>
          soma +
          valor,
        0
      );


    return {

      media:
        total /
        valores.length,

      total,

      melhor:
        Math.max(
          ...valores
        )

    };

  }


  /* =======================================================
     RENDERIZA GRÁFICO HISTÓRICO
     ======================================================= */

  async function renderizarGraficoHistorico() {

    const secao =
      document.getElementById(
        "historico"
      );


    if (!secao) {

      return false;

    }


    try {

      const resposta =
        await fetch(
          "data/simulacao-times.json",
          {
            cache:
              "no-store"
          }
        );


      if (
        !resposta.ok
      ) {

        return false;

      }


      const dados =
        await resposta.json();


      const series =
        await montarSerieHistorica(
          dados
        );


      let bloco =
        document.getElementById(
          "historyEvolution"
        );


      if (!bloco) {

        bloco =
          document.createElement(
            "section"
          );


        bloco.id =
          "historyEvolution";


        bloco.className =
          "history-evolution";


        const toolbar =
          secao.querySelector(
            ".history-toolbar"
          );


        if (
          toolbar &&
          toolbar.parentNode
        ) {

          toolbar
            .parentNode
            .insertBefore(
              bloco,
              toolbar
            );

        } else {

          secao.prepend(
            bloco
          );

        }

      }


      const cores = {

        Conservador:
          "#59c98d",

        Equilibrado:
          "#5da8ff",

        Agressivo:
          "#f2a45a"

      };


      const cards =
        Object
          .entries(
            series
          )
          .map(
            (
              [
                nome,
                lista
              ]
            ) => {

              const resumo =
                calcularResumoSerie(
                  lista
                );


              return `

                <article
                  class="
                    history-evolution-card
                  "
                >

                  <span>
                    ${escaparHtml(nome)}
                  </span>

                  <strong>
                    ${
                      resumo
                        .media
                        .toFixed(
                          2
                        )
                    } pts
                  </strong>

                  <small>

                    Total
                    ${
                      resumo
                        .total
                        .toFixed(
                          2
                        )
                    }

                    •

                    melhor rodada
                    ${
                      resumo
                        .melhor
                        .toFixed(
                          2
                        )
                    }

                  </small>

                </article>

              `;

            }
          )
          .join(
            ""
          );


      bloco.innerHTML = `

        <div
          class="
            history-evolution-header
          "
        >

          <div>

            <span
              class="section-label"
            >
              LINHA DO TEMPO DAS ESTRATÉGIAS
            </span>

            <h3>
              Evolução dos times sugeridos
            </h3>

            <p>
              Pontuação real por rodada,
              considerando capitão e
              substituição por reserva da
              mesma posição quando o titular
              não entrou em campo.
            </p>

          </div>


          <div
            class="
              history-evolution-legend
            "
          >

            ${
              Object
                .keys(
                  series
                )
                .map(
                  nome => `

                    <span>

                      <i
                        style="
                          background:
                          ${cores[nome]};
                        "
                      ></i>

                      ${nome}

                    </span>

                  `
                )
                .join(
                  ""
                )
            }

          </div>

        </div>


        <div class="history-chart-wrap">

          ${
            criarSvgHistorico(
              series
            )
          }

        </div>


        <div
          class="
            history-evolution-cards
          "
        >

          ${cards}

        </div>


        <p class="history-chart-note">

          Quando a base histórica da rodada
          informa que um titular não entrou
          em campo, o cálculo procura o
          reserva elegível da mesma posição.

          O bônus do capitão só é aplicado
          quando o próprio capitão entrou
          em campo.

        </p>

      `;


      estado
        .graficoHistoricoCarregado =
        true;


      return true;

    } catch (erro) {

      registrarErro(
        "renderizarGraficoHistorico",
        erro
      );


      return false;

    }

  }


  /* =======================================================
     ANÁLISE DA RODADA — LEITURA RÁPIDA
     ======================================================= */

  function atualizarLeituraAnalise() {

    const secao =
      document.getElementById(
        "analise"
      );


    if (!secao) {

      return false;

    }


    const cards =
      [
        ...secao
          .querySelectorAll(
            `
              .analysis-summary
              .analysis-card
            `
          )
      ];


    if (
      cards.length <
      4
    ) {

      return false;

    }


    const valores =
      cards.map(
        card => ({

          titulo:
            texto(
              card
                .querySelector(
                  "span"
                )
                ?.textContent
            ),

          valor:
            texto(
              card
                .querySelector(
                  "strong"
                )
                ?.textContent
            ),

          detalhe:
            texto(
              card
                .querySelector(
                  "small"
                )
                ?.textContent
            )

        })
      );


    let bloco =
      document.getElementById(
        "roundStrategyReading"
      );


    if (!bloco) {

      bloco =
        document.createElement(
          "section"
        );


      bloco.id =
        "roundStrategyReading";


      bloco.className =
        "round-strategy-reading";


      const resumo =
        secao.querySelector(
          ".analysis-summary"
        );


      if (
        resumo
      ) {

        resumo
          .insertAdjacentElement(
            "afterend",
            bloco
          );

      }

    }


    if (!bloco) {

      return false;

    }


    bloco.innerHTML = `

      <h3>
        Leitura rápida para a rodada
      </h3>


      <div
        class="
          round-strategy-reading-grid
        "
      >

        ${
          valores
            .map(
              item => `

                <div
                  class="
                    round-strategy-item
                  "
                >

                  <span>
                    ${
                      escaparHtml(
                        item.titulo
                        ||
                        "Indicador"
                      )
                    }
                  </span>

                  <strong>
                    ${
                      escaparHtml(
                        item.valor
                        ||
                        "--"
                      )
                    }
                  </strong>

                  <small>
                    ${
                      escaparHtml(
                        item.detalhe
                        ||
                        "Aguardando dados"
                      )
                    }
                  </small>

                </div>

              `
            )
            .join(
              ""
            )
        }

      </div>

    `;


    return true;

  }


  /* =======================================================
     TRATA ABA ATIVA
     ======================================================= */

  function tratarAbaAtiva(
    aba
  ) {

    switch (
      aba
    ) {

      case "recomendacoes":

        atualizarRecomendacoes();

        reconstruirFiltros(
          true
        );

        break;


      case "times":

        renderizarEscalacoes();

        sincronizarCamposPatrimonio();

        reconstruirFiltros(
          true
        );

        break;


      case "historico":

        if (
          typeof window
            .renderizarHistorico ===
            "function"
        ) {

          try {

            window
              .renderizarHistorico();

          } catch (_) {}

        }


        renderizarGraficoHistorico();

        break;


      case "analise":

        if (
          window.AnaliseRodada &&
          typeof window
            .AnaliseRodada
            .carregar ===
            "function"
        ) {

          Promise
            .resolve(
              window
                .AnaliseRodada
                .carregar()
            )
            .finally(
              () =>
                setTimeout(
                  atualizarLeituraAnalise,
                  100
                )
            );

        } else {

          setTimeout(
            atualizarLeituraAnalise,
            100
          );

        }

        break;


      default:

        break;

    }

  }


  /* =======================================================
     ABAS
     ======================================================= */

  function configurarAbas() {

    document
      .querySelectorAll(
        "[data-tab]"
      )
      .forEach(
        botao => {

          if (
            botao
              .dataset
              .cartolaIntegracaoAba ===
            "1"
          ) {

            return;

          }


          botao
            .dataset
            .cartolaIntegracaoAba =
            "1";


          botao.addEventListener(
            "click",
            () => {

              const aba =
                texto(
                  botao
                    .dataset
                    .tab
                );


              setTimeout(
                () =>
                  tratarAbaAtiva(
                    aba
                  ),
                40
              );

            }
          );

        }
      );

  }


  /* =======================================================
     EVENTOS GLOBAIS
     ======================================================= */

  function configurarEventosGlobais() {

    const eventosEscalacao = [

      "cartola:escalacoes-atualizadas",

      "cartola:times-atualizados",

      "cartola:recalculo-concluido",

      "cartola:filtros-aplicados",

      "cartola:filtros-limpos"

    ];


    eventosEscalacao.forEach(
      nome => {

        window.addEventListener(
          nome,
          () => {

            setTimeout(
              () => {

                renderizarEscalacoes();

                reconstruirFiltros(
                  true
                );

              },
              80
            );

          }
        );

      }
    );


    window.addEventListener(
      "cartola:recomendacoes-atualizadas",
      () => {

        setTimeout(
          () => {

            atualizarRecomendacoes();

            reconstruirFiltros(
              true
            );

          },
          80
        );

      }
    );

  }


  /* =======================================================
     OBSERVADOR DOM
     ======================================================= */

  function configurarObservadorDom() {

    if (
      estado.observer
    ) {

      return;

    }


    let agendado =
      false;


    estado.observer =
      new MutationObserver(
        () => {

          if (
            agendado
          ) {

            return;

          }


          agendado =
            true;


          setTimeout(
            () => {

              agendado =
                false;


              configurarAbas();


              const abaTimes =
                document.getElementById(
                  "times"
                );


              const abaReco =
                document.getElementById(
                  "recomendacoes"
                );


              if (
                (
                  abaTimes &&
                  !document
                    .getElementById(
                      "ceFilterTeams"
                    )
                )
                ||
                (
                  abaReco &&
                  !document
                    .getElementById(
                      "ceFilterRecommendations"
                    )
                )
              ) {

                reconstruirFiltros(
                  false
                );

              }

            },
            140
          );

        }
      );


    estado.observer.observe(
      document.body,
      {

        childList:
          true,

        subtree:
          true

      }
    );

  }


  /* =======================================================
     DIAGNÓSTICO
     ======================================================= */

  function obterDiagnostico() {

    return {

      inicializado:
        estado.inicializado,

      recalculando:
        estado.recalculando,

      filtrosRecomendacoes:
        Boolean(
          document
            .getElementById(
              "ceFilterRecommendations"
            )
        ),

      filtrosTimes:
        Boolean(
          document
            .getElementById(
              "ceFilterTeams"
            )
        ),

      graficoHistorico:
        Boolean(
          document
            .getElementById(
              "historyEvolution"
            )
        ),

      leituraAnalise:
        Boolean(
          document
            .getElementById(
              "roundStrategyReading"
            )
        ),

      ultimaAtualizacao:
        estado.ultimaAtualizacao,

      erros:
        [
          ...estado.erros
        ]

    };

  }


  function auditar() {

    const diagnostico =
      obterDiagnostico();


    const problemas =
      [];


    if (
      !diagnostico
        .filtrosRecomendacoes
    ) {

      problemas.push(
        "Filtro de Recomendações ausente"
      );

    }


    if (
      !diagnostico
        .filtrosTimes
    ) {

      problemas.push(
        "Filtro de Times ausente"
      );

    }


    console.group(
      "Auditoria Cartola Estatístico"
    );


    console.table(
      diagnostico
    );


    if (
      problemas.length
    ) {

      console.warn(
        "Problemas:",
        problemas
      );

    } else {

      console.info(
        "Interface integrada sem falhas críticas visíveis."
      );

    }


    console.groupEnd();


    return {

      aprovado:
        problemas.length ===
        0,

      problemas,

      diagnostico

    };

  }


  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  async function inicializar() {

    if (
      estado.inicializado ||
      estado.inicializando
    ) {

      return estado
        .inicializado;

    }


    estado.inicializando =
      true;


    try {

      garantirEstilosFinais();

      configurarAbas();

      configurarEventosGlobais();

      configurarObservadorDom();


      /*
       * Dá tempo para app.js e os módulos
       * principais terminarem a primeira
       * renderização.
       */

      await esperar(
        350
      );


      await configurarFiltrosExclusao();


      atualizarRecomendacoes();


      renderizarEscalacoes();


      sincronizarCamposPatrimonio();


      await atualizarUltimaAtualizacao();


      setTimeout(
        () => {

          reconstruirFiltros(
            true
          );

          atualizarLeituraAnalise();

        },
        500
      );


      estado.inicializado =
        true;


      console.info(
        "Integração final carregada.",
        obterDiagnostico()
      );


      return true;

    } catch (erro) {

      registrarErro(
        "inicializar",
        erro
      );


      return false;

    } finally {

      estado.inicializando =
        false;

    }

  }


  /* =======================================================
     API
     ======================================================= */

  return {

    inicializar,

    recalcular:
      recalcularTudo,

    atualizarRecomendacoes,

    renderizarEscalacoes,

    sincronizarPatrimonio:
      sincronizarCamposPatrimonio,

    reconstruirFiltros,

    renderizarGraficoHistorico,

    atualizarUltimaAtualizacao,

    atualizarLeituraAnalise,

    obterDiagnostico,

    auditar

  };

})();


/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */

if (
  typeof window !==
  "undefined"
) {

  window.CartolaIntegracaoFinal =
    CartolaIntegracaoFinal;


  window.auditarCartola =
    () =>
      CartolaIntegracaoFinal
        .auditar();


  window.diagnosticarCartola =
    () =>
      CartolaIntegracaoFinal
        .obterDiagnostico();


  window.addEventListener(
    "load",
    () => {

      setTimeout(
        () => {

          CartolaIntegracaoFinal
            .inicializar();

        },
        450
      );

    }
  );

}
