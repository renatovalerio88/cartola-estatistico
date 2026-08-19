/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — integração dos filtros manuais

   Objetivo:

   Garantir que Times sugeridos consumam exatamente a mesma
   base ativa da aba Recomendações após exclusões manuais
   de clubes e jogadores.

   Corrige o cenário:

   - usuário exclui Santos;
   - usuário exclui Neymar;
   - Recomendações atualizam;
   - Conservador / Equilibrado / Agressivo precisam ser
     remontados SEM esses candidatos.

   IMPORTANTE:

   Este arquivo NÃO:
   - recalcula projeções;
   - altera pesos;
   - altera patrimônio;
   - altera regra do banco;
   - altera Reserva de Luxo;
   - altera formação;
   - altera histórico.

   Apenas garante que a montagem das escalações receba
   a base filtrada correta.

   ========================================================= */


(function () {

  "use strict";


  /* =======================================================
     CÓPIA SEGURA
     ======================================================= */


  function copiarJogadorFiltroEscalacao(
    jogador
  ) {

    if (
      !jogador ||
      typeof jogador !==
        "object"
    ) {

      return jogador;

    }


    return {

      ...jogador,

      scouts: {
        ...(jogador.scouts || {})
      },

      historico:
        Array.isArray(
          jogador.historico
        )
          ? jogador.historico.map(
              item => ({

                ...item,

                scouts: {
                  ...(item?.scouts || {})
                }

              })
            )
          : jogador.historico

    };

  }


  /* =======================================================
     ID
     ======================================================= */


  function obterIdFiltroEscalacao(
    jogador
  ) {

    return String(

      jogador?.id

      ??

      jogador?.atletaId

      ??

      jogador?.atleta_id

      ??

      ""

    );

  }


  /* =======================================================
     CLUBE
     ======================================================= */


  function obterClubeFiltroEscalacao(
    jogador
  ) {

    return String(

      jogador?.siglaClube

      ??

      jogador?.clubeSigla

      ??

      jogador?.clube

      ??

      ""

    )
      .trim()
      .toUpperCase();

  }


  /* =======================================================
     FILTROS ATIVOS
     ======================================================= */


  function obterEstadoFiltrosEscalacao() {

    try {

      if (
        window.CartolaFiltrosExclusao &&
        typeof window
          .CartolaFiltrosExclusao
          .obterEstado ===
          "function"
      ) {

        const filtros =
          window
            .CartolaFiltrosExclusao
            .obterEstado();


        if (
          filtros &&
          typeof filtros ===
            "object"
        ) {

          return filtros;

        }

      }

    } catch (erro) {

      console.warn(
        "Não foi possível consultar os filtros manuais:",
        erro
      );

    }


    return {

      clubesExcluidos: [],

      jogadoresExcluidos: []

    };

  }


  /* =======================================================
     BASE ATIVA DAS RECOMENDAÇÕES
     ======================================================= */


  function obterBaseAtivaRecomendacoes() {

    let jogadores = [];


    /*
     * 1.
     * API explicitamente preparada para escalações.
     */

    if (
      typeof window
        .obterJogadoresParaEscalacoes ===
        "function"
    ) {

      try {

        jogadores =
          window
            .obterJogadoresParaEscalacoes();

      } catch (erro) {

        console.warn(
          "Falha em obterJogadoresParaEscalacoes():",
          erro
        );

      }

    }


    /*
     * 2.
     * API pública das Recomendações.
     */

    if (
      (
        !Array.isArray(
          jogadores
        ) ||
        jogadores.length === 0
      ) &&
      window.CartolaRecomendacoes &&
      typeof window
        .CartolaRecomendacoes
        .obterJogadoresParaEscalacoes ===
        "function"
    ) {

      try {

        jogadores =
          window
            .CartolaRecomendacoes
            .obterJogadoresParaEscalacoes();

      } catch (erro) {

        console.warn(
          "Falha em CartolaRecomendacoes.obterJogadoresParaEscalacoes():",
          erro
        );

      }

    }


    /*
     * 3.
     * obterJogadores() também já representa
     * a lista disponível/filtrada.
     */

    if (
      (
        !Array.isArray(
          jogadores
        ) ||
        jogadores.length === 0
      ) &&
      typeof window.obterJogadores ===
        "function"
    ) {

      try {

        jogadores =
          window.obterJogadores();

      } catch (erro) {

        console.warn(
          "Falha em obterJogadores():",
          erro
        );

      }

    }


    /*
     * 4.
     * Estado ativo.
     *
     * Este é especialmente importante porque
     * filtros-exclusao.js altera justamente:
     *
     * estadoRecomendacoes.jogadores
     */

    if (
      (
        !Array.isArray(
          jogadores
        ) ||
        jogadores.length === 0
      ) &&
      typeof window
        .estadoRecomendacoes !==
        "undefined" &&
      Array.isArray(
        window
          .estadoRecomendacoes
          .jogadores
      )
    ) {

      jogadores =
        window
          .estadoRecomendacoes
          .jogadores;

    }


    if (
      !Array.isArray(
        jogadores
      )
    ) {

      return [];

    }


    return jogadores.map(
      copiarJogadorFiltroEscalacao
    );

  }


  /* =======================================================
     GARANTIA EXTRA DOS FILTROS
     ======================================================= */


  function aplicarExclusoesNovamente(
    jogadores
  ) {

    const lista =
      Array.isArray(
        jogadores
      )
        ? jogadores
        : [];


    const filtros =
      obterEstadoFiltrosEscalacao();


    const clubesExcluidos =
      new Set(

        Array.isArray(
          filtros?.clubesExcluidos
        )
          ? filtros.clubesExcluidos
              .map(
                clube =>
                  String(
                    clube
                  )
                    .trim()
                    .toUpperCase()
              )
          : []

      );


    const jogadoresExcluidos =
      new Set(

        Array.isArray(
          filtros?.jogadoresExcluidos
        )
          ? filtros.jogadoresExcluidos
              .map(
                id =>
                  String(id)
              )
          : []

      );


    return lista.filter(
      jogador => {

        const id =
          obterIdFiltroEscalacao(
            jogador
          );


        const clube =
          obterClubeFiltroEscalacao(
            jogador
          );


        if (
          clube &&
          clubesExcluidos.has(
            clube
          )
        ) {

          return false;

        }


        if (
          id &&
          jogadoresExcluidos.has(
            id
          )
        ) {

          return false;

        }


        return true;

      }
    );

  }


  /* =======================================================
     DISPONIBILIDADE ORIGINAL DO MOTOR
     ======================================================= */


  function jogadorDisponivelDepoisDoFiltro(
    jogador
  ) {

    /*
     * Mantém a validação que já existe
     * no motor principal.
     */

    if (
      typeof window
        .jogadorDisponivelEscalacao ===
        "function"
    ) {

      try {

        return window
          .jogadorDisponivelEscalacao(
            jogador
          );

      } catch (erro) {

        /*
         * Em caso de incompatibilidade,
         * não derrubamos o candidato aqui.
         */

      }

    }


    return true;

  }


  /* =======================================================
     NOVA FONTE DOS JOGADORES
     ======================================================= */


  function obterJogadoresDisponiveisEscalacaoFiltrados() {

    const baseAtiva =
      obterBaseAtivaRecomendacoes();


    const filtrados =
      aplicarExclusoesNovamente(
        baseAtiva
      );


    return filtrados

      .filter(
        jogadorDisponivelDepoisDoFiltro
      )

      .map(
        copiarJogadorFiltroEscalacao
      );

  }


  /* =======================================================
     SOBRESCREVE A FUNÇÃO UTILIZADA PELO MOTOR
     ======================================================= */


  /*
   * scripts clássicos do navegador expõem
   * function declarations de dados.js no escopo global.
   *
   * Ao substituir esta propriedade global depois
   * de dados.js ser carregado, carregarEscalacoes()
   * passa a resolver esta nova implementação.
   */

  window.obterJogadoresDisponiveisEscalacao =
    obterJogadoresDisponiveisEscalacaoFiltrados;


  /* =======================================================
     RECÁLCULO
     ======================================================= */


  async function recalcularEscalacoesComFiltros() {

    let resultado = [];


    /*
     * Preferência pela API pública do motor.
     */

    if (
      window.EscalacoesDados &&
      typeof window
        .EscalacoesDados
        .recarregar ===
        "function"
    ) {

      resultado =
        await window
          .EscalacoesDados
          .recarregar();

    }
    else if (
      typeof window
        .recarregarEscalacoes ===
        "function"
    ) {

      resultado =
        await window
          .recarregarEscalacoes();

    }
    else if (
      typeof window
        .carregarEscalacoes ===
        "function"
    ) {

      resultado =
        await window
          .carregarEscalacoes();

    }


    return Array.isArray(
      resultado
    )
      ? resultado
      : [];

  }


  /* =======================================================
     AUDITORIA DOS FILTROS
     ======================================================= */


  function auditarFiltrosNasEscalacoes() {

    const filtros =
      obterEstadoFiltrosEscalacao();


    const clubesExcluidos =
      new Set(

        (
          filtros.clubesExcluidos ||
          []
        )
          .map(
            clube =>
              String(clube)
                .trim()
                .toUpperCase()
          )

      );


    const jogadoresExcluidos =
      new Set(

        (
          filtros.jogadoresExcluidos ||
          []
        )
          .map(
            id =>
              String(id)
          )

      );


    let escalacoes = [];


    if (
      window.EscalacoesDados &&
      typeof window
        .EscalacoesDados
        .obter ===
        "function"
    ) {

      escalacoes =
        window
          .EscalacoesDados
          .obter();

    }
    else if (
      typeof window
        .obterEscalacoes ===
        "function"
    ) {

      escalacoes =
        window
          .obterEscalacoes();

    }


    if (
      !Array.isArray(
        escalacoes
      )
    ) {

      escalacoes = [];

    }


    const problemas = [];


    escalacoes.forEach(
      escalacao => {

        const jogadores = [

          ...(
            Array.isArray(
              escalacao?.titulares
            )
              ? escalacao.titulares
              : []
          ),

          ...(
            Array.isArray(
              escalacao?.banco
            )
              ? escalacao.banco
              : []
          )

        ];


        jogadores.forEach(
          jogador => {

            const id =
              obterIdFiltroEscalacao(
                jogador
              );


            const clube =
              obterClubeFiltroEscalacao(
                jogador
              );


            if (
              clubesExcluidos.has(
                clube
              )
            ) {

              problemas.push({

                perfil:
                  escalacao.perfil,

                tipo:
                  "CLUBE_EXCLUIDO",

                jogador:
                  jogador.apelido ??
                  jogador.nome,

                clube

              });

            }


            if (
              jogadoresExcluidos.has(
                id
              )
            ) {

              problemas.push({

                perfil:
                  escalacao.perfil,

                tipo:
                  "JOGADOR_EXCLUIDO",

                jogador:
                  jogador.apelido ??
                  jogador.nome,

                clube

              });

            }

          }
        );


        const especiais = [

          {
            tipo:
              "CAPITAO",

            jogador:
              escalacao?.capitao
          },

          {
            tipo:
              "RESERVA_LUXO",

            jogador:
              escalacao?.reservaLuxo
          }

        ];


        especiais.forEach(
          item => {

            if (!item.jogador) {

              return;

            }


            const id =
              obterIdFiltroEscalacao(
                item.jogador
              );


            const clube =
              obterClubeFiltroEscalacao(
                item.jogador
              );


            if (
              clubesExcluidos.has(
                clube
              ) ||
              jogadoresExcluidos.has(
                id
              )
            ) {

              problemas.push({

                perfil:
                  escalacao.perfil,

                tipo:
                  item.tipo,

                jogador:
                  item.jogador.apelido ??
                  item.jogador.nome,

                clube

              });

            }

          }
        );

      }
    );


    const diagnostico = {

      aprovado:
        problemas.length === 0,

      clubesExcluidos:
        [
          ...clubesExcluidos
        ],

      jogadoresExcluidos:
        [
          ...jogadoresExcluidos
        ],

      quantidadeEscalacoes:
        escalacoes.length,

      problemas

    };


    if (
      problemas.length === 0
    ) {

      console.info(
        "✓ Filtros respeitados pelas escalações.",
        diagnostico
      );

    }
    else {

      console.error(
        "Jogadores excluídos encontrados nas escalações:",
        diagnostico
      );

    }


    return diagnostico;

  }


  /* =======================================================
     EVENTO APÓS APLICAÇÃO DOS FILTROS
     ======================================================= */


  window.addEventListener(
    "cartola:filtros-aplicados",
    () => {

      /*
       * O módulo principal já tenta recalcular.
       *
       * Portanto aqui NÃO chamamos um segundo recálculo
       * automaticamente.
       *
       * Apenas auditamos depois que a montagem terminar.
       */

      window.setTimeout(
        () => {

          auditarFiltrosNasEscalacoes();

        },
        150
      );

    }
  );


  /* =======================================================
     EVENTO APÓS ESCALAÇÕES
     ======================================================= */


  window.addEventListener(
    "cartola:escalacoes-atualizadas",
    () => {

      window.setTimeout(
        () => {

          const filtros =
            obterEstadoFiltrosEscalacao();


          const possuiFiltros =
            (
              (
                filtros
                  ?.clubesExcluidos
                  ?.length ||
                0
              ) > 0
            )
            ||
            (
              (
                filtros
                  ?.jogadoresExcluidos
                  ?.length ||
                0
              ) > 0
            );


          if (
            possuiFiltros
          ) {

            auditarFiltrosNasEscalacoes();

          }

        },
        50
      );

    }
  );


  /* =======================================================
     API
     ======================================================= */


  const api = {

    obterJogadores:
      obterJogadoresDisponiveisEscalacaoFiltrados,

    recalcular:
      recalcularEscalacoesComFiltros,

    auditar:
      auditarFiltrosNasEscalacoes

  };


  window.CartolaEscalacoesFiltros =
    api;


  console.info(
    "Integração de filtros das escalações carregada."
  );


})();
