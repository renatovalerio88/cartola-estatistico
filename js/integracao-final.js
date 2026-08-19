/* =========================================================
   CARTOLA ESTATÍSTICO
   Integração final da interface

   Responsabilidades:

   - sincronizar patrimônio;
   - sincronizar filtros de exclusão;
   - atualizar recomendações após recálculo;
   - atualizar escalações;
   - atualizar análise da rodada;
   - corrigir renderizações após troca de aba;
   - evitar múltiplos recálculos simultâneos;
   - expor diagnóstico final do front-end;
   - manter módulos independentes.

   IMPORTANTE:

   Este arquivo NÃO recalcula:
   - pesos;
   - projeções;
   - histórico;
   - métricas estatísticas.

   Ele apenas coordena módulos já existentes.

   ========================================================= */


const CartolaIntegracaoFinal = (() => {


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    inicializado: false,

    inicializando: false,

    recalculando: false,

    ultimoPatrimonio: null,

    ultimaAtualizacao: null,

    erros: []

  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */


  function numero(
    valor,
    padrao = null
  ) {

    const resultado =
      Number(valor);


    return Number.isFinite(
      resultado
    )
      ? resultado
      : padrao;

  }


  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    ).trim();

  }


  function esperar(
    milissegundos
  ) {

    return new Promise(
      resolver =>
        setTimeout(
          resolver,
          milissegundos
        )
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
        String(erro),

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
     RECOMENDAÇÕES
     ======================================================= */


  function recomendacoesDisponiveis() {

    if (
      typeof window ===
      "undefined"
    ) {

      return false;

    }


    if (
      window.CartolaRecomendacoes &&
      typeof window
        .CartolaRecomendacoes
        .obterJogadores ===
        "function"
    ) {

      try {

        const jogadores =
          window
            .CartolaRecomendacoes
            .obterJogadores();


        return (
          Array.isArray(
            jogadores
          ) &&
          jogadores.length > 0
        );

      } catch (erro) {

        return false;

      }

    }


    if (
      typeof window
        .obterJogadoresCarregados ===
      "function"
    ) {

      try {

        const jogadores =
          window
            .obterJogadoresCarregados();


        return (
          Array.isArray(
            jogadores
          ) &&
          jogadores.length > 0
        );

      } catch (erro) {

        return false;

      }

    }


    return false;

  }


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


  function obterEscalacoes() {

    try {

      if (
        typeof window !==
          "undefined" &&
        typeof window
          .obterEscalacoesCarregadas ===
          "function"
      ) {

        const resultado =
          window
            .obterEscalacoesCarregadas();


        return Array.isArray(
          resultado
        )
          ? resultado
          : [];

      }


      if (
        typeof window !==
          "undefined" &&
        window.CartolaEscalacoes &&
        typeof window
          .CartolaEscalacoes
          .obter ===
          "function"
      ) {

        const resultado =
          window
            .CartolaEscalacoes
            .obter();


        return Array.isArray(
          resultado
        )
          ? resultado
          : [];

      }


      return [];


    } catch (erro) {

      registrarErro(
        "obterEscalacoes",
        erro
      );


      return [];

    }

  }


  function renderizarEscalacoes() {

    const escalacoes =
      obterEscalacoes();


    try {

      /*
       * Prioridade:
       * API pública dos cards.
       */

      if (
        typeof window !==
          "undefined" &&
        window.EscalacoesCards &&
        typeof window
          .EscalacoesCards
          .render ===
          "function"
      ) {

        window
          .EscalacoesCards
          .render(
            escalacoes
          );


        return true;

      }


      /*
       * Compatibilidade.
       */

      if (
        typeof window !==
          "undefined" &&
        typeof window
          .renderizarEscalacoesCarregadas ===
          "function"
      ) {

        window
          .renderizarEscalacoesCarregadas(
            escalacoes
          );


        return true;

      }


      if (
        typeof window !==
          "undefined" &&
        typeof window
          .renderizarEscalacoes ===
          "function"
      ) {

        window
          .renderizarEscalacoes(
            escalacoes
          );


        return true;

      }


      return false;


    } catch (erro) {

      registrarErro(
        "renderizarEscalacoes",
        erro
      );


      return false;

    }

  }


  /* =======================================================
     PATRIMÔNIO
     ======================================================= */


  function obterPatrimonioAtual() {

    try {

      if (
        typeof window !==
          "undefined" &&
        typeof window
          .obterPatrimonioSelecionadoEscalacoes ===
          "function"
      ) {

        return numero(
          window
            .obterPatrimonioSelecionadoEscalacoes()
        );

      }


      if (
        typeof window !==
          "undefined" &&
        window.CartolaEscalacoes &&
        typeof window
          .CartolaEscalacoes
          .obterPatrimonioSelecionado ===
          "function"
      ) {

        return numero(
          window
            .CartolaEscalacoes
            .obterPatrimonioSelecionado()
        );

      }


      return null;


    } catch (erro) {

      registrarErro(
        "obterPatrimonioAtual",
        erro
      );


      return null;

    }

  }


  async function definirPatrimonio(
    valor
  ) {

    const patrimonio =
      numero(
        valor
      );


    if (
      patrimonio === null ||
      patrimonio <= 0
    ) {

      return false;

    }


    try {

      if (
        typeof window !==
          "undefined" &&
        typeof window
          .definirPatrimonioEscalacoes ===
          "function"
      ) {

        window
          .definirPatrimonioEscalacoes(
            patrimonio
          );

      }
      else if (
        typeof window !==
          "undefined" &&
        window.CartolaEscalacoes &&
        typeof window
          .CartolaEscalacoes
          .definirPatrimonio ===
          "function"
      ) {

        window
          .CartolaEscalacoes
          .definirPatrimonio(
            patrimonio
          );

      }
      else {

        return false;

      }


      estado.ultimoPatrimonio =
        patrimonio;


      return true;


    } catch (erro) {

      registrarErro(
        "definirPatrimonio",
        erro
      );


      return false;

    }

  }


  /* =======================================================
     PROCURA CAMPOS DE PATRIMÔNIO
     ======================================================= */


  function localizarCamposPatrimonio() {

    const seletores = [

      "#patrimonio",

      "#patrimonioInput",

      "#teamBudget",

      "#budgetInput",

      "#limitePatrimonio",

      "[data-patrimonio]",

      "input[name='patrimonio']"

    ];


    const encontrados =
      [];


    seletores.forEach(
      seletor => {

        document
          .querySelectorAll(
            seletor
          )
          .forEach(
            elemento => {

              if (
                !encontrados.includes(
                  elemento
                )
              ) {

                encontrados.push(
                  elemento
                );

              }

            }
          );

      }
    );


    return encontrados;

  }


  /* =======================================================
     SINCRONIZA CAMPOS DE PATRIMÔNIO
     ======================================================= */


  function sincronizarCamposPatrimonio() {

    const patrimonio =
      obterPatrimonioAtual();


    if (
      patrimonio === null
    ) {

      return;

    }


    localizarCamposPatrimonio()
      .forEach(
        campo => {

          if (
            document.activeElement ===
            campo
          ) {

            return;

          }


          if (
            "value" in campo
          ) {

            campo.value =
              String(
                patrimonio
              );

          }

        }
      );

  }


  /* =======================================================
     RECÁLCULO CENTRAL
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


    const {

      patrimonio = null,

      aplicarFiltros = false,

      atualizarAnalise = true

    } = opcoes;


    try {

      /*
       * 1. Patrimônio.
       */

      if (
        patrimonio !== null &&
        patrimonio !== undefined
      ) {

        await definirPatrimonio(
          patrimonio
        );

      }


      /*
       * 2. Filtros manuais.
       *
       * O módulo de filtros já recalcula
       * as escalações internamente.
       */

      if (
        aplicarFiltros &&
        typeof window !==
          "undefined" &&
        window.CartolaFiltrosExclusao &&
        typeof window
          .CartolaFiltrosExclusao
          .aplicar ===
          "function"
      ) {

        await window
          .CartolaFiltrosExclusao
          .aplicar();

      }
      else {

        /*
         * 3. Recálculo normal.
         */

        if (
          typeof window !==
            "undefined" &&
          typeof window
            .recalcularEscalacoes ===
            "function"
        ) {

          await window
            .recalcularEscalacoes();

        }
        else if (
          typeof window !==
            "undefined" &&
          window.CartolaEscalacoes &&
          typeof window
            .CartolaEscalacoes
            .recalcular ===
            "function"
        ) {

          await window
            .CartolaEscalacoes
            .recalcular();

        }

      }


      /*
       * 4. Renderização.
       */

      atualizarRecomendacoes();


      renderizarEscalacoes();


      sincronizarCamposPatrimonio();


      /*
       * 5. Análise da rodada.
       */

      if (
        atualizarAnalise &&
        typeof window !==
          "undefined" &&
        window.AnaliseRodada &&
        typeof window
          .AnaliseRodada
          .carregar ===
          "function"
      ) {

        await window
          .AnaliseRodada
          .carregar();

      }


      estado.ultimaAtualizacao =
        new Date()
          .toISOString();


      dispararEventoAtualizacao();


      return true;


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
     EVENTO DE ATUALIZAÇÃO
     ======================================================= */


  function dispararEventoAtualizacao() {

    try {

      window.dispatchEvent(
        new CustomEvent(
          "cartola:interface-atualizada",
          {
            detail: {
              patrimonio:
                obterPatrimonioAtual(),

              escalacoes:
                obterEscalacoes()
                  .length,

              data:
                estado
                  .ultimaAtualizacao
            }
          }
        )
      );

    } catch (erro) {

      /*
       * Evento é auxiliar.
       * Não interrompe o fluxo.
       */

    }

  }


  /* =======================================================
     EVENTOS DOS CAMPOS DE PATRIMÔNIO
     ======================================================= */


  function configurarPatrimonio() {

    const campos =
      localizarCamposPatrimonio();


    campos.forEach(
      campo => {

        if (
          campo.dataset
            .cartolaIntegrado ===
          "1"
        ) {

          return;

        }


        campo.dataset
          .cartolaIntegrado =
          "1";


        /*
         * Não recalculamos a cada tecla.
         *
         * Enter ou change confirma o valor.
         */

        campo.addEventListener(
          "keydown",
          async evento => {

            if (
              evento.key !==
              "Enter"
            ) {

              return;

            }


            evento.preventDefault();


            const valor =
              numero(
                campo.value
              );


            if (
              valor === null ||
              valor <= 0
            ) {

              return;

            }


            await recalcularTudo({
              patrimonio:
                valor
            });

          }
        );


        campo.addEventListener(
          "change",
          async () => {

            const valor =
              numero(
                campo.value
              );


            if (
              valor === null ||
              valor <= 0
            ) {

              sincronizarCamposPatrimonio();

              return;

            }


            const atual =
              obterPatrimonioAtual();


            if (
              atual !== null &&
              Math.abs(
                atual -
                valor
              ) < 0.001
            ) {

              return;

            }


            await recalcularTudo({
              patrimonio:
                valor
            });

          }
        );

      }
    );


    sincronizarCamposPatrimonio();

  }


  /* =======================================================
     TROCA DE ABAS
     ======================================================= */


  function configurarAbas() {

    document
      .querySelectorAll(
        "[data-tab]"
      )
      .forEach(
        botao => {

          if (
            botao.dataset
              .cartolaIntegracaoAba ===
            "1"
          ) {

            return;

          }


          botao.dataset
            .cartolaIntegracaoAba =
            "1";


          botao.addEventListener(
            "click",
            () => {

              const aba =
                texto(
                  botao.dataset.tab
                );


              /*
               * Aguarda o sistema principal
               * concluir a troca da aba.
               */

              setTimeout(
                () => {

                  tratarAbaAtiva(
                    aba
                  );

                },
                20
              );

            }
          );

        }
      );

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

        break;


      case "times":

        renderizarEscalacoes();

        sincronizarCamposPatrimonio();

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

          } catch (erro) {

            registrarErro(
              "renderizarHistorico",
              erro
            );

          }

        }

        break;


      case "analise":

        if (
          window.AnaliseRodada &&
          typeof window
            .AnaliseRodada
            .renderizar ===
          "function"
        ) {

          try {

            window
              .AnaliseRodada
              .renderizar();

          } catch (erro) {

            registrarErro(
              "renderizarAnalise",
              erro
            );

          }

        }

        break;


      default:

        break;

    }

  }


  /* =======================================================
     FILTROS DE EXCLUSÃO
     ======================================================= */


  async function configurarFiltrosExclusao() {

    if (
      typeof window ===
        "undefined" ||
      !window.CartolaFiltrosExclusao ||
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
     ESCUTA RECÁLCULOS EXTERNOS
     ======================================================= */


  function configurarEventosGlobais() {

    /*
     * Quando outro módulo atualizar
     * escalações, apenas sincronizamos
     * a interface.
     *
     * NÃO chamamos recalcularEscalacoes
     * novamente para evitar loop.
     */

    window.addEventListener(
      "cartola:escalacoes-atualizadas",
      () => {

        setTimeout(
          () => {

            renderizarEscalacoes();

            sincronizarCamposPatrimonio();

          },
          20
        );

      }
    );


    window.addEventListener(
      "cartola:interface-atualizada",
      () => {

        sincronizarCamposPatrimonio();

      }
    );

  }


  /* =======================================================
     OBSERVADOR LEVE DO DOM
     ======================================================= */


  function configurarObservadorDom() {

    /*
     * Alguns elementos são criados
     * dinamicamente.
     *
     * O observer serve somente para
     * registrar os eventos uma vez.
     *
     * NÃO recalcula nada.
     */

    let agendado =
      false;


    const observer =
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


              configurarPatrimonio();

              configurarAbas();

            },
            150
          );

        }
      );


    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     ESPERA O SISTEMA PRINCIPAL
     ======================================================= */


  async function esperarSistemaPrincipal() {

    /*
     * Máximo aproximado:
     * 8 segundos.
     */

    for (
      let tentativa = 0;
      tentativa < 40;
      tentativa += 1
    ) {

      if (
        recomendacoesDisponiveis()
      ) {

        return true;

      }


      await esperar(
        200
      );

    }


    return false;

  }


  /* =======================================================
     VERIFICAÇÃO DAS ESCALAÇÕES
     ======================================================= */


  function verificarEscalacoes() {

    const escalacoes =
      obterEscalacoes();


    return escalacoes.map(
      time => {

        const titulares =
          Array.isArray(
            time?.titulares
          )
            ? time.titulares
            : [];


        const banco =
          Array.isArray(
            time?.banco
          )
            ? time.banco
            : [];


        const patrimonio =
          numero(

            time?.limitePatrimonio

            ??

            obterPatrimonioAtual()

          );


        const custo =
          numero(
            time?.custoTotal,
            0
          );


        return {

          perfil:
            time?.perfil
            ??
            time?.nome
            ??
            "--",

          formacao:
            time?.formacao
            ??
            "--",

          titulares:
            titulares.length,

          reservas:
            banco.length,

          custo,

          patrimonio,

          dentroOrcamento:
            patrimonio === null
              ? true
              : custo <=
                patrimonio +
                0.001,

          possuiCapitao:
            Boolean(
              time?.capitao
            ),

          possuiReservaLuxo:
            Boolean(

              time?.reservaLuxo

              ??

              time?.reservaDeLuxo

            )

        };

      }
    );

  }


  /* =======================================================
     DIAGNÓSTICO FINAL
     ======================================================= */


  function obterDiagnostico() {

    let filtros = null;


    try {

      if (
        window.CartolaFiltrosExclusao &&
        typeof window
          .CartolaFiltrosExclusao
          .obterEstado ===
          "function"
      ) {

        filtros =
          window
            .CartolaFiltrosExclusao
            .obterEstado();

      }

    } catch (erro) {

      filtros = null;

    }


    let analise = null;


    try {

      if (
        window.AnaliseRodada &&
        typeof window
          .AnaliseRodada
          .obterEstado ===
          "function"
      ) {

        analise =
          window
            .AnaliseRodada
            .obterEstado();

      }

    } catch (erro) {

      analise = null;

    }


    return {

      inicializado:
        estado.inicializado,

      recalculando:
        estado.recalculando,

      patrimonio:
        obterPatrimonioAtual(),

      jogadoresCarregados:
        recomendacoesDisponiveis(),

      quantidadeEscalacoes:
        obterEscalacoes()
          .length,

      escalacoes:
        verificarEscalacoes(),

      filtros: filtros
        ? {

            inicializado:
              filtros.inicializado,

            clubesExcluidos:
              filtros
                .clubesExcluidos
                ?.length
              ??
              0,

            jogadoresExcluidos:
              filtros
                .jogadoresExcluidos
                ?.length
              ??
              0

          }
        : null,

      analise: analise
        ? {

            carregado:
              analise.carregado,

            rodada:
              analise.rodada,

            partidas:
              Array.isArray(
                analise.partidas
              )
                ? analise
                    .partidas
                    .length
                : 0,

            confrontos:
              Array.isArray(
                analise.confrontos
              )
                ? analise
                    .confrontos
                    .length
                : 0

          }
        : null,

      ultimaAtualizacao:
        estado.ultimaAtualizacao,

      erros:
        [
          ...estado.erros
        ]

    };

  }


  /* =======================================================
     TESTE RÁPIDO NO CONSOLE
     ======================================================= */


  function auditar() {

    const diagnostico =
      obterDiagnostico();


    console.group(
      "CARTOLA ESTATÍSTICO — AUDITORIA FINAL"
    );


    console.log(
      "Patrimônio:",
      diagnostico.patrimonio
    );


    console.log(
      "Escalações:",
      diagnostico.escalacoes
    );


    console.log(
      "Filtros:",
      diagnostico.filtros
    );


    console.log(
      "Análise:",
      diagnostico.analise
    );


    console.log(
      "Erros de integração:",
      diagnostico.erros
    );


    const problemas = [];


    diagnostico
      .escalacoes
      .forEach(
        time => {

          if (
            !time.dentroOrcamento
          ) {

            problemas.push(
              `${time.perfil}: custo acima do patrimônio`
            );

          }


          if (
            time.titulares !== 12
          ) {

            problemas.push(
              `${time.perfil}: ${time.titulares} titulares`
            );

          }


          if (
            time.reservas < 5
          ) {

            problemas.push(
              `${time.perfil}: banco incompleto (${time.reservas})`
            );

          }


          if (
            !time.possuiCapitao
          ) {

            problemas.push(
              `${time.perfil}: capitão não identificado`
            );

          }

        }
      );


    if (
      problemas.length === 0
    ) {

      console.log(
        "✓ Auditoria estrutural sem falhas."
      );

    } else {

      console.warn(
        "Problemas encontrados:",
        problemas
      );

    }


    console.groupEnd();


    return {

      aprovado:
        problemas.length === 0,

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

      return estado.inicializado;

    }


    estado.inicializando =
      true;


    try {

      /*
       * Primeiro registramos eventos que
       * não dependem dos dados.
       */

      configurarAbas();

      configurarEventosGlobais();

      configurarObservadorDom();


      /*
       * Espera recomendações.
       */

      await esperarSistemaPrincipal();


      /*
       * Inicializa filtros.
       */

      await configurarFiltrosExclusao();


      /*
       * Sincroniza patrimônio.
       */

      configurarPatrimonio();


      /*
       * Garante renderização das escalações
       * já existentes.
       */

      renderizarEscalacoes();


      /*
       * Atualiza recomendações.
       */

      atualizarRecomendacoes();


      /*
       * Não recalculamos automaticamente.
       *
       * Isso é importante para evitar:
       * - loop;
       * - stack overflow;
       * - trabalho duplicado;
       * - alteração involuntária do patrimônio.
       */

      estado.ultimoPatrimonio =
        obterPatrimonioAtual();


      estado.ultimaAtualizacao =
        new Date()
          .toISOString();


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
     API PÚBLICA
     ======================================================= */


  return {

    inicializar,

    recalcular:
      recalcularTudo,

    atualizarRecomendacoes,

    renderizarEscalacoes,

    sincronizarPatrimonio:
      sincronizarCamposPatrimonio,

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


  /*
   * Atalhos úteis para nosso teste final.
   */

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
        500
      );

    }
  );

}
