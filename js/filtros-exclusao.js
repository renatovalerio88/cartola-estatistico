/* =========================================================
   CARTOLA ESTATÍSTICO
   Filtros manuais da rodada
   Clubes + jogadores

   VERSÃO CONSOLIDADA V3

   OBJETIVOS

   RECOMENDAÇÕES
   - usar somente jogadores pertencentes ao universo real
     dos rankings por posição;
   - NÃO listar o mercado inteiro;
   - atualizar o universo quando filtros provocarem entrada
     de novos candidatos no ranking.

   TIMES SUGERIDOS
   - usar somente jogadores efetivamente presentes nos
     três times sugeridos;
   - titulares + banco + capitão + reserva de luxo;
   - nunca cair para a base completa.

   FILTROS
   - clubes em ordem alfabética;
   - jogadores por posição e ordem alfabética;
   - exclusões sincronizadas;
   - mostrar nominalmente clubes/jogadores excluídos;
   - recalcular Recomendações e Times;
   - preservar jogadoresOriginais;
   - preservar patrimônio;
   - evitar painéis duplicados.

   INTERFACE
   - bloco mais compacto no desktop;
   - dropdowns suspensos;
   - responsivo no celular.
   ========================================================= */


const CartolaFiltrosExclusao = (() => {

  "use strict";


  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */

  const ORDEM_POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];


  const NOMES_POSICOES = {

    GOL: "Goleiros",
    LAT: "Laterais",
    ZAG: "Zagueiros",
    MEI: "Meias",
    ATA: "Atacantes",
    TEC: "Treinadores"

  };


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    inicializado: false,
    inicializando: false,
    aplicando: false,

    jogadoresRecomendacoes: [],
    jogadoresTimes: [],

    clubesRecomendacoes: [],
    clubesTimes: [],

    clubesExcluidos:
      new Set(),

    jogadoresExcluidos:
      new Set(),

    nomesJogadores:
      new Map(),

    quantidadeRemovida: 0,

    ultimoResultado: null

  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    ).trim();

  }


  function normalizarTexto(
    valor
  ) {

    return texto(
      valor
    )
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );

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


  function copiarJogador(
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
     IDENTIFICAÇÃO
     ======================================================= */

  function obterIdJogador(
    jogador
  ) {

    return texto(

      jogador?.id

      ??

      jogador?.atletaId

      ??

      jogador?.atleta_id

      ??

      jogador?.atleta?.id

      ??

      jogador?.atleta?.atletaId

      ??

      ""

    );

  }


  function obterNomeJogador(
    jogador
  ) {

    return texto(

      jogador?.apelido

      ??

      jogador?.nome

      ??

      jogador?.atleta?.apelido

      ??

      jogador?.atleta?.nome

      ??

      "Jogador"

    );

  }


  function obterPosicaoJogador(
    jogador
  ) {

    return texto(

      jogador?.posicao

      ??

      jogador?.posicaoSigla

      ??

      jogador?.posicao_sigla

      ??

      jogador?.atleta?.posicao

      ??

      jogador?.atleta?.posicaoSigla

      ??

      ""

    ).toUpperCase();

  }


  function obterClubeJogador(
    jogador
  ) {

    return texto(

      jogador?.siglaClube

      ??

      jogador?.clubeSigla

      ??

      jogador?.clube?.abreviacao

      ??

      jogador?.clube

      ??

      jogador?.atleta?.siglaClube

      ??

      jogador?.atleta?.clubeSigla

      ??

      jogador?.atleta?.clube?.abreviacao

      ??

      jogador?.atleta?.clube

      ??

      ""

    ).toUpperCase();

  }


  /* =======================================================
     ORDENAÇÃO
     ======================================================= */

  function indicePosicao(
    posicao
  ) {

    const indice =
      ORDEM_POSICOES.indexOf(
        obterPosicaoNormalizada(
          posicao
        )
      );


    return indice >= 0
      ? indice
      : 999;

  }


  function obterPosicaoNormalizada(
    posicao
  ) {

    const codigo =
      texto(
        posicao
      ).toUpperCase();


    const mapa = {

      GOLEIRO: "GOL",
      GOLEIROS: "GOL",

      LATERAL: "LAT",
      LATERAIS: "LAT",

      ZAGUEIRO: "ZAG",
      ZAGUEIROS: "ZAG",

      MEIA: "MEI",
      MEIAS: "MEI",

      ATACANTE: "ATA",
      ATACANTES: "ATA",

      TECNICO: "TEC",
      TÉCNICO: "TEC",

      TREINADOR: "TEC",
      TREINADORES: "TEC"

    };


    return mapa[codigo] ||
      codigo;

  }


  function ordenarJogadores(
    lista
  ) {

    return [
      ...(lista || [])
    ]
      .sort(
        (
          jogadorA,
          jogadorB
        ) => {

          const posicaoA =
            obterPosicaoNormalizada(
              obterPosicaoJogador(
                jogadorA
              )
            );


          const posicaoB =
            obterPosicaoNormalizada(
              obterPosicaoJogador(
                jogadorB
              )
            );


          const ordemA =
            indicePosicao(
              posicaoA
            );


          const ordemB =
            indicePosicao(
              posicaoB
            );


          if (
            ordemA !== ordemB
          ) {

            return ordemA -
              ordemB;

          }


          return obterNomeJogador(
            jogadorA
          )
            .localeCompare(
              obterNomeJogador(
                jogadorB
              ),
              "pt-BR"
            );

        }
      );

  }


  function removerDuplicados(
    lista
  ) {

    const mapa =
      new Map();


    (
      Array.isArray(lista)
        ? lista
        : []
    )
      .forEach(
        jogador => {

          const id =
            obterIdJogador(
              jogador
            );


          if (!id) {

            return;

          }


          if (
            mapa.has(
              id
            )
          ) {

            return;

          }


          mapa.set(
            id,
            copiarJogador(
              jogador
            )
          );


          estado.nomesJogadores.set(
            id,
            obterNomeJogador(
              jogador
            )
          );

        }
      );


    return [
      ...mapa.values()
    ];

  }


  function mesclarJogadores(
    ...listas
  ) {

    return removerDuplicados(
      listas.flatMap(
        lista =>
          Array.isArray(lista)
            ? lista
            : []
      )
    );

  }


  /* =======================================================
     BASE ORIGINAL COMPLETA

     Usada SOMENTE para aplicar exclusões ao motor.
     NÃO é usada para preencher o dropdown de Recomendações.
     ======================================================= */

  function obterJogadoresOriginais() {

    try {

      if (
        typeof estadoRecomendacoes !==
          "undefined" &&
        Array.isArray(
          estadoRecomendacoes
            .jogadoresOriginais
        ) &&
        estadoRecomendacoes
          .jogadoresOriginais
          .length > 0
      ) {

        return estadoRecomendacoes
          .jogadoresOriginais
          .map(
            copiarJogador
          );

      }

    } catch (_) {

      /*
       * continua
       */

    }


    try {

      if (
        window.CartolaRecomendacoes &&
        typeof window
          .CartolaRecomendacoes
          .obterJogadoresCarregados ===
          "function"
      ) {

        const jogadores =
          window
            .CartolaRecomendacoes
            .obterJogadoresCarregados();


        if (
          Array.isArray(
            jogadores
          )
        ) {

          return jogadores.map(
            copiarJogador
          );

        }

      }

    } catch (_) {

      /*
       * continua
       */

    }


    return [];

  }


  /* =======================================================
     BASE ATIVA DAS RECOMENDAÇÕES
     ======================================================= */

  function obterJogadoresAtivos() {

    try {

      if (
        typeof estadoRecomendacoes !==
          "undefined" &&
        Array.isArray(
          estadoRecomendacoes
            .jogadores
        )
      ) {

        return estadoRecomendacoes
          .jogadores
          .map(
            copiarJogador
          );

      }

    } catch (_) {

      /*
       * continua
       */

    }


    try {

      if (
        typeof window
          .obterJogadoresCarregados ===
          "function"
      ) {

        const jogadores =
          window
            .obterJogadoresCarregados();


        if (
          Array.isArray(
            jogadores
          )
        ) {

          return jogadores.map(
            copiarJogador
          );

        }

      }

    } catch (_) {

      /*
       * continua
       */

    }


    return [];

  }


  /* =======================================================
     UNIVERSO REAL DAS RECOMENDAÇÕES

     Usa a própria função oficial do ranking:

     obterJogadoresDaPosicao()

     Portanto o dropdown passa a refletir:
     - viabilidade;
     - ordenação;
     - quantidade configurada;
     - ranking por posição.
     ======================================================= */

  function obterRankingDePosicao(
    posicao
  ) {

    try {

      if (
        typeof obterJogadoresDaPosicao ===
          "function"
      ) {

        const ranking =
          obterJogadoresDaPosicao(
            posicao
          );


        if (
          Array.isArray(
            ranking
          )
        ) {

          return ranking.map(
            copiarJogador
          );

        }

      }

    } catch (erro) {

      console.warn(
        `Falha ao obter ranking ${posicao}:`,
        erro
      );

    }


    return [];

  }


  function montarUniversoAtualRecomendacoes() {

    const candidatos = [];


    ORDEM_POSICOES.forEach(
      posicao => {

        const ranking =
          obterRankingDePosicao(
            posicao
          );


        candidatos.push(
          ...ranking
        );

      }
    );


    return ordenarJogadores(
      removerDuplicados(
        candidatos
      )
    );

  }


  function atualizarBaseRecomendacoes() {

    const atuais =
      montarUniversoAtualRecomendacoes();


    /*
     * Mantém jogadores anteriormente apresentados.
     *
     * Isso é importante porque:
     * - excluímos A;
     * - B entra no ranking;
     * - B também passa a poder ser excluído.
     *
     * Mas o universo nunca vira a lista inteira do mercado.
     */

    estado.jogadoresRecomendacoes =
      ordenarJogadores(
        mesclarJogadores(
          estado.jogadoresRecomendacoes,
          atuais
        )
      );


    estado.clubesRecomendacoes =
      obterClubesDaBase(
        estado.jogadoresRecomendacoes
      );


    return estado
      .jogadoresRecomendacoes;

  }


  /* =======================================================
     ESCALAÇÕES
     ======================================================= */

  function normalizarListaEscalacoes(
    valor
  ) {

    if (
      Array.isArray(
        valor
      )
    ) {

      return valor;

    }


    if (
      valor &&
      Array.isArray(
        valor.escalacoes
      )
    ) {

      return valor.escalacoes;

    }


    if (
      valor &&
      Array.isArray(
        valor.times
      )
    ) {

      return valor.times;

    }


    if (
      valor &&
      typeof valor ===
        "object"
    ) {

      const possiveis = [

        valor.conservador,
        valor.equilibrado,
        valor.agressivo,

        valor.Conservador,
        valor.Equilibrado,
        valor.Agressivo

      ].filter(Boolean);


      if (
        possiveis.length > 0
      ) {

        return possiveis;

      }

    }


    return [];

  }


  function obterEscalacoesAtuais() {

    const tentativas = [];


    try {

      if (
        typeof window
          .obterEscalacoesCarregadas ===
          "function"
      ) {

        tentativas.push(
          window
            .obterEscalacoesCarregadas()
        );

      }

    } catch (_) {}


    try {

      if (
        typeof window
          .obterEscalacoes ===
          "function"
      ) {

        tentativas.push(
          window
            .obterEscalacoes()
        );

      }

    } catch (_) {}


    try {

      if (
        window.CartolaEscalacoes
      ) {

        if (
          typeof window
            .CartolaEscalacoes
            .obter ===
            "function"
        ) {

          tentativas.push(
            window
              .CartolaEscalacoes
              .obter()
          );

        }


        if (
          typeof window
            .CartolaEscalacoes
            .obterEscalacoes ===
            "function"
        ) {

          tentativas.push(
            window
              .CartolaEscalacoes
              .obterEscalacoes()
          );

        }


        if (
          Array.isArray(
            window
              .CartolaEscalacoes
              .escalacoes
          )
        ) {

          tentativas.push(
            window
              .CartolaEscalacoes
              .escalacoes
          );

        }

      }

    } catch (_) {}


    try {

      if (
        typeof estadoEscalacoes !==
          "undefined"
      ) {

        tentativas.push(
          estadoEscalacoes
        );

      }

    } catch (_) {}


    try {

      if (
        window.estadoEscalacoes
      ) {

        tentativas.push(
          window.estadoEscalacoes
        );

      }

    } catch (_) {}


    for (
      const tentativa of
      tentativas
    ) {

      const lista =
        normalizarListaEscalacoes(
          tentativa
        );


      if (
        lista.length > 0
      ) {

        return lista;

      }

    }


    return [];

  }


  /* =======================================================
     EXTRAI JOGADORES DOS TIMES
     ======================================================= */

  function adicionarJogadorAoMapa(
    mapa,
    jogador
  ) {

    if (!jogador) {

      return;

    }


    const real =
      jogador?.atleta &&
      typeof jogador.atleta ===
        "object"

        ? {
            ...jogador.atleta,
            ...jogador
          }

        : jogador;


    const id =
      obterIdJogador(
        real
      );


    if (!id) {

      return;

    }


    if (
      mapa.has(
        id
      )
    ) {

      return;

    }


    mapa.set(
      id,
      copiarJogador(
        real
      )
    );


    estado.nomesJogadores.set(
      id,
      obterNomeJogador(
        real
      )
    );

  }


  function adicionarListaAoMapa(
    mapa,
    lista
  ) {

    if (
      !Array.isArray(
        lista
      )
    ) {

      return;

    }


    lista.forEach(
      jogador =>
        adicionarJogadorAoMapa(
          mapa,
          jogador
        )
    );

  }


  function adicionarEscalacaoAoMapa(
    mapa,
    escalacao
  ) {

    if (!escalacao) {

      return;

    }


    [
      escalacao.titulares,
      escalacao.jogadores,
      escalacao.atletas,
      escalacao.time,
      escalacao.banco,
      escalacao.reservas
    ]
      .forEach(
        lista =>
          adicionarListaAoMapa(
            mapa,
            lista
          )
      );


    [
      escalacao.capitao,
      escalacao.capitão,
      escalacao.reservaLuxo,
      escalacao.reservaDeLuxo,
      escalacao.tecnico,
      escalacao.técnico
    ]
      .forEach(
        jogador =>
          adicionarJogadorAoMapa(
            mapa,
            jogador
          )
      );


    if (
      escalacao.escalacao &&
      typeof escalacao.escalacao ===
        "object"
    ) {

      adicionarEscalacaoAoMapa(
        mapa,
        escalacao.escalacao
      );

    }

  }


  function obterJogadoresDasEscalacoes() {

    const mapa =
      new Map();


    const escalacoes =
      obterEscalacoesAtuais();


    escalacoes.forEach(
      escalacao =>
        adicionarEscalacaoAoMapa(
          mapa,
          escalacao
        )
    );


    return ordenarJogadores(
      [
        ...mapa.values()
      ]
    );

  }


  /* =======================================================
     FALLBACK APENAS VISUAL DOS TIMES

     Caso o estado ainda não esteja exposto,
     procura os nomes efetivamente renderizados.
     ======================================================= */

  function obterJogadoresDosCardsTimes() {

    const secao =
      document.getElementById(
        "times"
      );


    if (!secao) {

      return [];

    }


    const universo =
      obterJogadoresOriginais();


    if (
      universo.length === 0
    ) {

      return [];

    }


    const conteudo =
      normalizarTexto(
        secao.innerText
      );


    const encontrados =
      universo.filter(
        jogador => {

          const nome =
            normalizarTexto(
              obterNomeJogador(
                jogador
              )
            );


          return (
            nome.length >= 3 &&
            conteudo.includes(
              nome
            )
          );

        }
      );


    return ordenarJogadores(
      removerDuplicados(
        encontrados
      )
    );

  }


  function atualizarBaseTimes() {

    let jogadores =
      obterJogadoresDasEscalacoes();


    if (
      jogadores.length === 0
    ) {

      jogadores =
        obterJogadoresDosCardsTimes();

    }


    /*
     * Aqui NÃO existe fallback para todos.
     */

    estado.jogadoresTimes =
      ordenarJogadores(
        removerDuplicados(
          jogadores
        )
      );


    estado.clubesTimes =
      obterClubesDaBase(
        estado.jogadoresTimes
      );


    return estado
      .jogadoresTimes;

  }


  /* =======================================================
     CLUBES
     ======================================================= */

  function obterClubesDaBase(
    base
  ) {

    return [
      ...new Set(
        (
          Array.isArray(base)
            ? base
            : []
        )
          .map(
            obterClubeJogador
          )
          .filter(Boolean)
      )
    ]
      .sort(
        (
          clubeA,
          clubeB
        ) =>
          clubeA.localeCompare(
            clubeB,
            "pt-BR"
          )
      );

  }


  /* =======================================================
     BASE POR CONTEXTO
     ======================================================= */

  function obterJogadoresContexto(
    contexto
  ) {

    const base =
      contexto === "times"

        ? estado.jogadoresTimes

        : estado
            .jogadoresRecomendacoes;


    /*
     * Quando um clube é excluído,
     * jogadores daquele clube desaparecem do dropdown.
     *
     * Jogador excluído individualmente continua visível,
     * marcado, para poder ser desmarcado.
     */

    return base.filter(
      jogador => {

        const clube =
          obterClubeJogador(
            jogador
          );


        if (
          clube &&
          estado
            .clubesExcluidos
            .has(
              clube
            )
        ) {

          return false;

        }


        return true;

      }
    );

  }


  function obterClubesContexto(
    contexto
  ) {

    return contexto === "times"

      ? estado.clubesTimes

      : estado
          .clubesRecomendacoes;

  }


  /* =======================================================
     EXCLUSÃO
     ======================================================= */

  function jogadorEstaExcluido(
    jogador
  ) {

    const id =
      obterIdJogador(
        jogador
      );


    const clube =
      obterClubeJogador(
        jogador
      );


    return Boolean(

      (
        clube &&
        estado
          .clubesExcluidos
          .has(
            clube
          )
      )

      ||

      (
        id &&
        estado
          .jogadoresExcluidos
          .has(
            id
          )
      )

    );

  }


  /* =======================================================
     APLICA EXCLUSÕES À BASE DO MOTOR
     ======================================================= */

  function aplicarFiltroNaBase() {

    const originais =
      obterJogadoresOriginais();


    const filtrados =
      originais
        .filter(
          jogador =>
            !jogadorEstaExcluido(
              jogador
            )
        )
        .map(
          copiarJogador
        );


    estado.quantidadeRemovida =
      originais.length -
      filtrados.length;


    try {

      if (
        typeof estadoRecomendacoes !==
          "undefined"
      ) {

        estadoRecomendacoes.jogadores =
          filtrados;

      }

    } catch (_) {}


    return filtrados;

  }


  function restaurarBaseOriginal() {

    const originais =
      obterJogadoresOriginais();


    try {

      if (
        typeof estadoRecomendacoes !==
          "undefined"
      ) {

        estadoRecomendacoes.jogadores =
          originais.map(
            copiarJogador
          );

      }

    } catch (_) {}


    estado.quantidadeRemovida =
      0;


    return originais;

  }


  /* =======================================================
     ATUALIZA RECOMENDAÇÕES
     ======================================================= */

  function atualizarRecomendacoes() {

    try {

      if (
        typeof exibirDestaquesGerais ===
          "function"
      ) {

        exibirDestaquesGerais();

      }


      if (
        typeof exibirJogadoresDaPosicao ===
          "function"
      ) {

        exibirJogadoresDaPosicao();

      }


      return true;


    } catch (erro) {

      console.warn(
        "Erro ao atualizar recomendações:",
        erro
      );


      return false;

    }

  }


  /* =======================================================
     RECÁLCULO DOS TIMES
     ======================================================= */

  async function recalcularEscalacoesFiltradas() {

    try {

      if (
        typeof window
          .recalcularEscalacoes ===
          "function"
      ) {

        return await window
          .recalcularEscalacoes();

      }


      if (
        window.CartolaEscalacoes &&
        typeof window
          .CartolaEscalacoes
          .recalcular ===
          "function"
      ) {

        return await window
          .CartolaEscalacoes
          .recalcular();

      }

    } catch (erro) {

      console.error(
        "Erro no recálculo das escalações:",
        erro
      );


      throw erro;

    }


    console.warn(
      "Função de recálculo das escalações não encontrada."
    );


    return [];

  }


  /* =======================================================
     NOMES DAS EXCLUSÕES
     ======================================================= */

  function obterNomesJogadoresExcluidos() {

    return [
      ...estado
        .jogadoresExcluidos
    ]
      .map(
        id =>
          estado
            .nomesJogadores
            .get(
              id
            )
          ||
          id
      )
      .sort(
        (
          a,
          b
        ) =>
          a.localeCompare(
            b,
            "pt-BR"
          )
      );

  }


  function criarResumoCurto() {

    const clubes =
      estado
        .clubesExcluidos
        .size;


    const jogadores =
      estado
        .jogadoresExcluidos
        .size;


    if (
      clubes === 0 &&
      jogadores === 0
    ) {

      return "Nenhuma exclusão";

    }


    const partes = [];


    if (
      clubes > 0
    ) {

      partes.push(
        `${clubes} clube${clubes > 1 ? "s" : ""}`
      );

    }


    if (
      jogadores > 0
    ) {

      partes.push(
        `${jogadores} jogador${jogadores > 1 ? "es" : ""}`
      );

    }


    return partes.join(
      " · "
    );

  }


  function criarResumoCompleto() {

    const clubes = [
      ...estado
        .clubesExcluidos
    ]
      .sort();


    const jogadores =
      obterNomesJogadoresExcluidos();


    if (
      clubes.length === 0 &&
      jogadores.length === 0
    ) {

      return (
        "Nenhuma exclusão ativa."
      );

    }


    const partes = [];


    if (
      clubes.length > 0
    ) {

      partes.push(
        `Clubes: ${clubes.join(", ")}`
      );

    }


    if (
      jogadores.length > 0
    ) {

      partes.push(
        `Jogadores: ${jogadores.join(", ")}`
      );

    }


    return partes.join(
      "  •  "
    );

  }


  function criarChipsExclusoes() {

    const itens = [];


    [
      ...estado.clubesExcluidos
    ]
      .sort()
      .forEach(
        clube => {

          itens.push(`
            <span
              class="ce-filter-chip ce-filter-chip-club"
              title="Clube excluído"
            >
              Clube: ${escaparHtml(clube)}
            </span>
          `);

        }
      );


    const jogadores =
      obterNomesJogadoresExcluidos();


    jogadores.forEach(
      nome => {

        itens.push(`
          <span
            class="ce-filter-chip ce-filter-chip-player"
            title="Jogador excluído"
          >
            ${escaparHtml(nome)}
          </span>
        `);

      }
    );


    if (
      itens.length === 0
    ) {

      return `
        <span class="ce-filter-none">
          Nenhuma exclusão ativa
        </span>
      `;

    }


    return itens.join("");

  }


  /* =======================================================
     HTML CLUBES
     ======================================================= */

  function criarHtmlClubes(
    contexto
  ) {

    const clubes =
      obterClubesContexto(
        contexto
      );


    if (
      clubes.length === 0
    ) {

      return `
        <div class="ce-filter-empty">
          Nenhum clube disponível.
        </div>
      `;

    }


    return clubes
      .map(
        clube => {

          const marcado =
            estado
              .clubesExcluidos
              .has(
                clube
              );


          return `

            <label
              class="ce-filter-option"
            >

              <input
                type="checkbox"
                class="ce-filter-club"
                value="${escaparHtml(clube)}"
                ${marcado ? "checked" : ""}
              >

              <span>
                ${escaparHtml(clube)}
              </span>

            </label>

          `;

        }
      )
      .join("");

  }


  /* =======================================================
     HTML JOGADORES
     ======================================================= */

  function criarHtmlJogadores(
    contexto
  ) {

    const base =
      ordenarJogadores(
        obterJogadoresContexto(
          contexto
        )
      );


    if (
      base.length === 0
    ) {

      return `

        <div class="ce-filter-empty">

          ${
            contexto === "times"

              ? "Aguardando jogadores dos times sugeridos."

              : "Nenhum jogador do ranking disponível."
          }

        </div>

      `;

    }


    let html = "";


    ORDEM_POSICOES.forEach(
      posicao => {

        const jogadores =
          base.filter(
            jogador =>
              obterPosicaoNormalizada(
                obterPosicaoJogador(
                  jogador
                )
              ) ===
              posicao
          );


        if (
          jogadores.length === 0
        ) {

          return;

        }


        html += `

          <div
            class="ce-filter-position"
            data-position="${posicao}"
          >

            <div
              class="ce-filter-position-title"
            >

              ${NOMES_POSICOES[posicao]}

              <span>
                ${jogadores.length}
              </span>

            </div>

        `;


        jogadores.forEach(
          jogador => {

            const id =
              obterIdJogador(
                jogador
              );


            const nome =
              obterNomeJogador(
                jogador
              );


            const clube =
              obterClubeJogador(
                jogador
              );


            const marcado =
              estado
                .jogadoresExcluidos
                .has(
                  id
                );


            const busca =
              normalizarTexto(
                [
                  nome,
                  clube,
                  posicao
                ].join(" ")
              );


            estado.nomesJogadores.set(
              id,
              nome
            );


            html += `

              <label
                class="
                  ce-filter-option
                  ce-filter-player-item
                "
                data-search="${escaparHtml(busca)}"
              >

                <input
                  type="checkbox"
                  class="ce-filter-player"
                  value="${escaparHtml(id)}"
                  ${marcado ? "checked" : ""}
                >

                <span
                  class="ce-filter-player-info"
                >

                  <strong>
                    ${escaparHtml(nome)}
                  </strong>

                  <small>
                    ${escaparHtml(clube)}
                  </small>

                </span>

              </label>

            `;

          }
        );


        html += `
          </div>
        `;

      }
    );


    return html;

  }


  /* =======================================================
     HTML PAINEL
     ======================================================= */

  function criarHtmlPainel(
    contexto
  ) {

    const textoContexto =
      contexto === "times"

        ? (
            "Os filtros abaixo mostram apenas os atletas " +
            "presentes nos três times sugeridos."
          )

        : (
            "Os jogadores abaixo pertencem aos rankings " +
            "recomendados da rodada."
          );


    return `

      <div
        class="ce-filter-panel"
        data-context="${contexto}"
      >

        <div
          class="ce-filter-heading"
        >

          <div>

            <span
              class="ce-filter-kicker"
            >
              AJUSTES DA RODADA
            </span>

            <strong
              class="ce-filter-title"
            >
              Excluir clubes ou jogadores
            </strong>

            <small
              class="ce-filter-subtitle"
            >
              ${textoContexto}
            </small>

          </div>


          <button
            type="button"
            class="ce-filter-clear"
          >
            Limpar filtros
          </button>

        </div>


        <div
          class="ce-filter-main-row"
        >

          <details
            class="ce-filter-dropdown"
          >

            <summary>

              <span>
                Clubes
              </span>

              <strong
                class="ce-filter-club-count"
              >
                ${estado.clubesExcluidos.size}
              </strong>

            </summary>


            <div
              class="ce-filter-dropdown-body"
            >

              <div
                class="
                  ce-filter-options
                  ce-filter-club-list
                "
              >

                ${criarHtmlClubes(
                  contexto
                )}

              </div>

            </div>

          </details>


          <details
            class="
              ce-filter-dropdown
              ce-filter-dropdown-player
            "
          >

            <summary>

              <span>
                Jogadores
              </span>

              <strong
                class="ce-filter-player-count"
              >
                ${estado.jogadoresExcluidos.size}
              </strong>

            </summary>


            <div
              class="ce-filter-dropdown-body"
            >

              <input
                type="search"
                class="ce-filter-search"
                placeholder="Buscar jogador..."
                autocomplete="off"
              >


              <div
                class="
                  ce-filter-options
                  ce-filter-player-list
                "
              >

                ${criarHtmlJogadores(
                  contexto
                )}

              </div>

            </div>

          </details>


          <button
            type="button"
            class="ce-filter-apply"
          >
            Aplicar filtros
          </button>

        </div>


        <div
          class="ce-filter-active"
        >

          <span
            class="ce-filter-active-label"
          >
            Excluídos:
          </span>

          <div
            class="ce-filter-chips"
          >
            ${criarChipsExclusoes()}
          </div>

        </div>

      </div>

    `;

  }


  /* =======================================================
     CSS
     ======================================================= */

  function garantirEstilos() {

    const antigo =
      document.getElementById(
        "ceFiltrosRodadaStyle"
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
      "ceFiltrosRodadaStyle";


    style.textContent = `

      .ce-filter-wrapper {
        width: 100%;
        margin: 14px 0 20px;
      }


      .ce-filter-panel {
        width: 100%;
        box-sizing: border-box;
        padding: 14px 16px;
        border: 1px solid rgba(70, 205, 130, .22);
        border-radius: 16px;
        background:
          linear-gradient(
            180deg,
            rgba(27, 70, 45, .24),
            rgba(10, 34, 22, .18)
          );
      }


      .ce-filter-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 12px;
      }


      .ce-filter-heading > div {
        min-width: 0;
      }


      .ce-filter-kicker {
        display: block;
        margin-bottom: 4px;
        color: #48d68b;
        font-size: 10px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: .11em;
      }


      .ce-filter-title {
        display: block;
        color: inherit;
        font-size: 14px;
        line-height: 1.3;
      }


      .ce-filter-subtitle {
        display: block;
        margin-top: 3px;
        opacity: .58;
        font-size: 10px;
        line-height: 1.35;
      }


      .ce-filter-main-row {
        display: grid;
        grid-template-columns:
          minmax(170px, .72fr)
          minmax(240px, 1fr)
          150px;
        gap: 9px;
        align-items: start;
      }


      .ce-filter-dropdown {
        position: relative;
        min-width: 0;
      }


      .ce-filter-dropdown > summary {
        list-style: none;
        box-sizing: border-box;
        width: 100%;
        min-height: 42px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 10px;
        background: rgba(4, 24, 15, .42);
        cursor: pointer;
        user-select: none;
        font-size: 12px;
        font-weight: 700;
      }


      .ce-filter-dropdown >
      summary::-webkit-details-marker {
        display: none;
      }


      .ce-filter-dropdown >
      summary::after {
        content: "▾";
        margin-left: 6px;
        opacity: .55;
      }


      .ce-filter-dropdown[open] >
      summary::after {
        content: "▴";
      }


      .ce-filter-dropdown >
      summary > span {
        min-width: 0;
        flex: 1;
      }


      .ce-filter-dropdown >
      summary strong {
        min-width: 22px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 0 6px;
        border-radius: 999px;
        background: rgba(67, 215, 135, .14);
        color: #48d68b;
        font-size: 10px;
      }


      .ce-filter-dropdown-body {
        position: absolute;
        z-index: 500;
        top: calc(100% + 6px);
        left: 0;
        width: max(100%, 270px);
        max-width: 420px;
        box-sizing: border-box;
        padding: 9px;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 12px;
        background: #0a1c12;
        box-shadow:
          0 18px 50px rgba(0,0,0,.45);
      }


      .ce-filter-dropdown-player
      .ce-filter-dropdown-body {
        width: max(100%, 340px);
      }


      .ce-filter-options {
        max-height: 300px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }


      .ce-filter-option {
        box-sizing: border-box;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 7px 8px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 11px;
      }


      .ce-filter-option:hover {
        background: rgba(255,255,255,.055);
      }


      .ce-filter-option input {
        flex: 0 0 auto;
        margin: 0;
      }


      .ce-filter-player-info {
        min-width: 0;
        flex: 1;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }


      .ce-filter-player-info strong {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }


      .ce-filter-player-info small {
        flex: 0 0 auto;
        opacity: .50;
        font-size: 9px;
      }


      .ce-filter-position {
        padding-bottom: 3px;
      }


      .ce-filter-position-title {
        position: sticky;
        z-index: 2;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 8px 5px;
        background: #0a1c12;
        color: #48d68b;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .09em;
        text-transform: uppercase;
      }


      .ce-filter-position-title span {
        opacity: .55;
      }


      .ce-filter-search {
        box-sizing: border-box;
        width: 100%;
        height: 38px;
        margin-bottom: 7px;
        padding: 0 10px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 9px;
        outline: none;
        background: rgba(255,255,255,.035);
        color: inherit;
        font-size: 11px;
      }


      .ce-filter-search:focus {
        border-color: rgba(72,214,139,.55);
      }


      .ce-filter-apply {
        box-sizing: border-box;
        width: 100%;
        min-height: 42px;
        padding: 0 14px;
        border: 0;
        border-radius: 10px;
        background: #48c881;
        color: #071b10;
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
      }


      .ce-filter-clear {
        flex: 0 0 auto;
        min-height: 32px;
        padding: 0 11px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 9px;
        background: rgba(255,255,255,.025);
        color: inherit;
        cursor: pointer;
        font-size: 10px;
        font-weight: 700;
      }


      .ce-filter-apply:disabled,
      .ce-filter-clear:disabled {
        opacity: .50;
        cursor: wait;
      }


      .ce-filter-active {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        min-height: 24px;
        margin-top: 10px;
        padding-top: 9px;
        border-top: 1px solid rgba(255,255,255,.055);
      }


      .ce-filter-active-label {
        flex: 0 0 auto;
        padding-top: 4px;
        color: rgba(255,255,255,.50);
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .06em;
      }


      .ce-filter-chips {
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }


      .ce-filter-chip {
        display: inline-flex;
        align-items: center;
        min-height: 23px;
        box-sizing: border-box;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 9px;
        line-height: 1.2;
        font-weight: 700;
      }


      .ce-filter-chip-club {
        border: 1px solid rgba(255, 196, 80, .25);
        background: rgba(255, 196, 80, .09);
        color: #e9bf68;
      }


      .ce-filter-chip-player {
        border: 1px solid rgba(72, 214, 139, .22);
        background: rgba(72, 214, 139, .09);
        color: #70dfa1;
      }


      .ce-filter-none {
        padding-top: 3px;
        color: rgba(255,255,255,.42);
        font-size: 10px;
      }


      .ce-filter-empty {
        padding: 12px 8px;
        opacity: .55;
        font-size: 10px;
      }


      /* ================================================
         AJUSTE DO BLOCO DE POSIÇÕES

         Impede o layout observado no print:
         título apertado + botões comprimidos.
         ================================================ */


      #recomendacoes #positionFilters,
      #recomendacoes .position-filters {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px;
        margin-top: 8px;
      }


      #recomendacoes
      .position-filter-button {
        flex: 0 0 auto;
        min-width: 0;
        white-space: nowrap;
      }


      /* ================================================
         DESKTOP MÉDIO
         ================================================ */


      @media (max-width: 1050px) {

        .ce-filter-main-row {
          grid-template-columns:
            minmax(150px, .8fr)
            minmax(210px, 1fr)
            130px;
        }

      }


      /* ================================================
         TABLET
         ================================================ */


      @media (max-width: 800px) {

        .ce-filter-main-row {
          grid-template-columns:
            1fr
            1fr;
        }


        .ce-filter-apply {
          grid-column: 1 / -1;
        }


        .ce-filter-dropdown-body {
          width: 100%;
          max-width: none;
        }


        .ce-filter-dropdown-player
        .ce-filter-dropdown-body {
          width: 100%;
        }

      }


      /* ================================================
         CELULAR
         ================================================ */


      @media (max-width: 620px) {

        .ce-filter-panel {
          padding: 12px;
        }


        .ce-filter-heading {
          gap: 10px;
        }


        .ce-filter-main-row {
          grid-template-columns: 1fr;
        }


        .ce-filter-apply {
          grid-column: auto;
        }


        .ce-filter-dropdown-body {
          position: static;
          width: 100%;
          margin-top: 6px;
          box-shadow: none;
        }


        .ce-filter-active {
          display: block;
        }


        .ce-filter-active-label {
          display: block;
          margin-bottom: 6px;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =======================================================
     REMOVE PAINÉIS ANTIGOS / DUPLICADOS
     ======================================================= */

  function removerPaineisAntigos() {

    [
      "#ceFilterRecommendations",
      "#ceFilterTeams",

      "#ceExclusionRecommendations",
      "#ceExclusionTeams",

      ".ce-exclusion-wrapper",
      ".ce-exclusion-panel"
    ]
      .forEach(
        seletor => {

          document
            .querySelectorAll(
              seletor
            )
            .forEach(
              elemento =>
                elemento.remove()
            );

        }
      );


    const estiloAntigo =
      document.getElementById(
        "ceExclusionFiltersStyle"
      );


    if (
      estiloAntigo
    ) {

      estiloAntigo.remove();

    }

  }


  function removerFiltroLegadoDuplicado() {

    const elementos = [
      ...document
        .querySelectorAll(
          "section, article, div"
        )
    ];


    elementos.forEach(
      elemento => {

        if (
          elemento.closest(
            ".ce-filter-wrapper"
          )
        ) {

          return;

        }


        const conteudo =
          normalizarTexto(
            elemento.textContent
          );


        const pareceFiltroAntigo =

          (
            conteudo.includes(
              "retire clubes ou jogadores"
            )

            ||

            conteudo.includes(
              "ajustes manuais da rodada"
            )
          )

          &&

          (
            conteudo.includes(
              "clubes excluidos"
            )

            ||

            conteudo.includes(
              "atletas removidos"
            )
          );


        if (
          !pareceFiltroAntigo
        ) {

          return;

        }


        const botoes =
          [
            ...elemento
              .querySelectorAll(
                "button"
              )
          ];


        const temBotaoLimpar =
          botoes.some(
            botao =>
              normalizarTexto(
                botao.textContent
              )
                .includes(
                  "limpar"
                )
          );


        if (
          temBotaoLimpar
        ) {

          elemento.remove();

        }

      }
    );

  }


  /* =======================================================
     INTERFACE
     ======================================================= */

  function atualizarInterfaceResumo() {

    document
      .querySelectorAll(
        ".ce-filter-club-count"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            estado
              .clubesExcluidos
              .size;

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-player-count"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            estado
              .jogadoresExcluidos
              .size;

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-chips"
      )
      .forEach(
        elemento => {

          elemento.innerHTML =
            criarChipsExclusoes();

        }
      );


    sincronizarCheckboxes();

  }


  function sincronizarCheckboxes() {

    document
      .querySelectorAll(
        ".ce-filter-club"
      )
      .forEach(
        checkbox => {

          checkbox.checked =
            estado
              .clubesExcluidos
              .has(
                texto(
                  checkbox.value
                ).toUpperCase()
              );

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-player"
      )
      .forEach(
        checkbox => {

          checkbox.checked =
            estado
              .jogadoresExcluidos
              .has(
                texto(
                  checkbox.value
                )
              );

        }
      );

  }


  /* =======================================================
     BUSCA
     ======================================================= */

  function filtrarJogadoresNoPainel(
    painel,
    termo
  ) {

    if (!painel) {

      return;

    }


    const busca =
      normalizarTexto(
        termo
      );


    painel
      .querySelectorAll(
        ".ce-filter-player-item"
      )
      .forEach(
        item => {

          item.hidden =
            Boolean(
              busca &&
              !texto(
                item.dataset.search
              ).includes(
                busca
              )
            );

        }
      );


    painel
      .querySelectorAll(
        ".ce-filter-position"
      )
      .forEach(
        grupo => {

          const algumVisivel =
            [
              ...grupo
                .querySelectorAll(
                  ".ce-filter-player-item"
                )
            ]
              .some(
                item =>
                  !item.hidden
              );


          grupo.hidden =
            !algumVisivel;

        }
      );

  }


  /* =======================================================
     EVENTOS DOS PAINÉIS
     ======================================================= */

  function configurarEventosPainel(
    wrapper
  ) {

    if (!wrapper) {

      return;

    }


    wrapper
      .querySelectorAll(
        ".ce-filter-club"
      )
      .forEach(
        checkbox => {

          checkbox.addEventListener(
            "change",
            () => {

              const clube =
                texto(
                  checkbox.value
                )
                  .toUpperCase();


              if (
                checkbox.checked
              ) {

                estado
                  .clubesExcluidos
                  .add(
                    clube
                  );

              } else {

                estado
                  .clubesExcluidos
                  .delete(
                    clube
                  );

              }


              atualizarInterfaceResumo();

            }
          );

        }
      );


    wrapper
      .querySelectorAll(
        ".ce-filter-player"
      )
      .forEach(
        checkbox => {

          checkbox.addEventListener(
            "change",
            () => {

              const id =
                texto(
                  checkbox.value
                );


              const item =
                checkbox.closest(
                  ".ce-filter-player-item"
                );


              const nome =
                item
                  ?.querySelector(
                    "strong"
                  )
                  ?.textContent;


              if (
                nome
              ) {

                estado
                  .nomesJogadores
                  .set(
                    id,
                    texto(nome)
                  );

              }


              if (
                checkbox.checked
              ) {

                estado
                  .jogadoresExcluidos
                  .add(
                    id
                  );

              } else {

                estado
                  .jogadoresExcluidos
                  .delete(
                    id
                  );

              }


              atualizarInterfaceResumo();

            }
          );

        }
      );


    const busca =
      wrapper.querySelector(
        ".ce-filter-search"
      );


    if (
      busca
    ) {

      busca.addEventListener(
        "input",
        () => {

          filtrarJogadoresNoPainel(
            wrapper,
            busca.value
          );

        }
      );

    }


    const aplicar =
      wrapper.querySelector(
        ".ce-filter-apply"
      );


    if (
      aplicar
    ) {

      aplicar.addEventListener(
        "click",
        aplicarFiltros
      );

    }


    const limpar =
      wrapper.querySelector(
        ".ce-filter-clear"
      );


    if (
      limpar
    ) {

      limpar.addEventListener(
        "click",
        limparFiltros
      );

    }

  }


  /* =======================================================
     FECHA OUTRO DROPDOWN
     ======================================================= */

  function configurarFechamentoDropdown() {

    if (
      document
        .documentElement
        .dataset
        .ceFilterDropdownV3 ===
      "1"
    ) {

      return;

    }


    document
      .documentElement
      .dataset
      .ceFilterDropdownV3 =
      "1";


    document.addEventListener(
      "click",
      evento => {

        const clicado =
          evento.target.closest(
            ".ce-filter-dropdown"
          );


        document
          .querySelectorAll(
            ".ce-filter-dropdown[open]"
          )
          .forEach(
            details => {

              if (
                details !==
                clicado
              ) {

                details.removeAttribute(
                  "open"
                );

              }

            }
          );

      }
    );

  }


  /* =======================================================
     BOTÕES DURANTE RECÁLCULO
     ======================================================= */

  function definirAplicando(
    valor
  ) {

    estado.aplicando =
      Boolean(
        valor
      );


    document
      .querySelectorAll(
        ".ce-filter-apply, .ce-filter-clear"
      )
      .forEach(
        botao => {

          botao.disabled =
            estado.aplicando;

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-apply"
      )
      .forEach(
        botao => {

          if (
            estado.aplicando
          ) {

            if (
              !botao.dataset
                .textoOriginal
            ) {

              botao.dataset
                .textoOriginal =
                botao.textContent;

            }


            botao.textContent =
              "Recalculando...";

          } else {

            botao.textContent =
              botao.dataset
                .textoOriginal
              ||
              "Aplicar filtros";

          }

        }
      );

  }


  /* =======================================================
     APLICA
     ======================================================= */

  async function aplicarFiltros() {

    if (
      estado.aplicando
    ) {

      return estado
        .ultimoResultado;

    }


    definirAplicando(
      true
    );


    try {

      const filtrados =
        aplicarFiltroNaBase();


      atualizarRecomendacoes();


      /*
       * Agora o ranking já mudou.
       * Captura novos candidatos que entraram no lugar
       * dos excluídos.
       */

      atualizarBaseRecomendacoes();


      const escalacoes =
        await recalcularEscalacoesFiltradas();


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            120
          )
      );


      atualizarBaseTimes();


      estado.ultimoResultado = {

        sucesso: true,

        jogadoresDisponiveis:
          filtrados.length,

        removidos:
          estado.quantidadeRemovida,

        clubesExcluidos: [
          ...estado
            .clubesExcluidos
        ],

        jogadoresExcluidos: [
          ...estado
            .jogadoresExcluidos
        ],

        escalacoes:
          Array.isArray(
            escalacoes
          )
            ? escalacoes.length
            : obterEscalacoesAtuais()
                .length,

        jogadoresRecomendacoes:
          estado
            .jogadoresRecomendacoes
            .length,

        jogadoresTimes:
          estado
            .jogadoresTimes
            .length

      };


      reconstruirPaineis();


      console.info(
        "Filtros aplicados:",
        estado.ultimoResultado
      );


      window.dispatchEvent(
        new CustomEvent(
          "cartola:filtros-aplicados",
          {
            detail:
              estado
                .ultimoResultado
          }
        )
      );


      return estado
        .ultimoResultado;


    } catch (erro) {

      console.error(
        "Erro ao aplicar filtros:",
        erro
      );


      estado.ultimoResultado = {

        sucesso: false,

        erro:
          erro?.message
          ??
          String(
            erro
          )

      };


      return estado
        .ultimoResultado;


    } finally {

      definirAplicando(
        false
      );

    }

  }


  /* =======================================================
     LIMPAR
     ======================================================= */

  async function limparFiltros() {

    if (
      estado.aplicando
    ) {

      return;

    }


    definirAplicando(
      true
    );


    try {

      estado
        .clubesExcluidos
        .clear();


      estado
        .jogadoresExcluidos
        .clear();


      restaurarBaseOriginal();


      atualizarRecomendacoes();


      atualizarBaseRecomendacoes();


      await recalcularEscalacoesFiltradas();


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            120
          )
      );


      atualizarBaseTimes();


      estado.ultimoResultado = {

        sucesso: true,

        limpo: true,

        removidos: 0

      };


      reconstruirPaineis();


      window.dispatchEvent(
        new CustomEvent(
          "cartola:filtros-limpos"
        )
      );


    } catch (erro) {

      console.error(
        "Erro ao limpar filtros:",
        erro
      );


    } finally {

      definirAplicando(
        false
      );

    }

  }


  /* =======================================================
     INSERE EM RECOMENDAÇÕES
     ======================================================= */

  function inserirEmRecomendacoes() {

    const secao =
      document.getElementById(
        "recomendacoes"
      );


    if (!secao) {

      return false;

    }


    document
      .getElementById(
        "ceFilterRecommendations"
      )
      ?.remove();


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.id =
      "ceFilterRecommendations";


    wrapper.className =
      "ce-filter-wrapper";


    wrapper.innerHTML =
      criarHtmlPainel(
        "recomendacoes"
      );


    const filtrosPosicao =
      secao.querySelector(
        "#positionFilters, .position-filters"
      );


    const grid =
      secao.querySelector(
        "#playersGrid"
      );


    /*
     * Posiciona o bloco ANTES dos botões de posição,
     * sem entrar no mesmo container.
     *
     * Isso corrige o layout comprimido do print.
     */

    if (
      filtrosPosicao &&
      filtrosPosicao.parentNode
    ) {

      filtrosPosicao
        .parentNode
        .insertBefore(
          wrapper,
          filtrosPosicao
        );

    } else if (
      grid &&
      grid.parentNode
    ) {

      grid
        .parentNode
        .insertBefore(
          wrapper,
          grid
        );

    } else {

      secao.appendChild(
        wrapper
      );

    }


    configurarEventosPainel(
      wrapper
    );


    return true;

  }


  /* =======================================================
     INSERE EM TIMES
     ======================================================= */

  function inserirEmTimes() {

    const secao =
      document.getElementById(
        "times"
      );


    if (!secao) {

      return false;

    }


    document
      .getElementById(
        "ceFilterTeams"
      )
      ?.remove();


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.id =
      "ceFilterTeams";


    wrapper.className =
      "ce-filter-wrapper";


    wrapper.innerHTML =
      criarHtmlPainel(
        "times"
      );


    const patrimonio =

      secao.querySelector(
        ".budget-panel"
      )

      ||

      secao.querySelector(
        ".budget-card"
      )

      ||

      secao.querySelector(
        "[class*='budget']"
      );


    const strategyGrid =
      secao.querySelector(
        ".strategy-grid"
      );


    if (
      patrimonio &&
      patrimonio.parentNode
    ) {

      patrimonio
        .parentNode
        .insertBefore(
          wrapper,
          patrimonio
        );

    } else if (
      strategyGrid &&
      strategyGrid.parentNode
    ) {

      strategyGrid
        .parentNode
        .insertBefore(
          wrapper,
          strategyGrid
        );

    } else {

      secao.appendChild(
        wrapper
      );

    }


    configurarEventosPainel(
      wrapper
    );


    return true;

  }


  /* =======================================================
     RECONSTRÓI
     ======================================================= */

  function reconstruirPaineis() {

    garantirEstilos();

    removerPaineisAntigos();

    removerFiltroLegadoDuplicado();

    inserirEmRecomendacoes();

    inserirEmTimes();

    atualizarInterfaceResumo();

  }


  /* =======================================================
     ESPERA DADOS
     ======================================================= */

  async function esperarDados() {

    for (
      let tentativa = 0;
      tentativa < 35;
      tentativa += 1
    ) {

      if (
        obterJogadoresOriginais()
          .length > 0
      ) {

        return true;

      }


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            180
          )
      );

    }


    return false;

  }


  async function esperarEscalacoes() {

    for (
      let tentativa = 0;
      tentativa < 20;
      tentativa += 1
    ) {

      if (
        obterJogadoresDasEscalacoes()
          .length > 0
      ) {

        return true;

      }


      if (
        obterJogadoresDosCardsTimes()
          .length > 0
      ) {

        return true;

      }


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            150
          )
      );

    }


    return false;

  }


  /* =======================================================
     EVENTOS EXTERNOS
     ======================================================= */

  function configurarEventosExternos() {

    if (
      document
        .documentElement
        .dataset
        .ceFilterExternalV3 ===
      "1"
    ) {

      return;

    }


    document
      .documentElement
      .dataset
      .ceFilterExternalV3 =
      "1";


    const atualizarTimes =
      () => {

        if (
          estado.aplicando
        ) {

          return;

        }


        setTimeout(
          () => {

            const antes =
              estado
                .jogadoresTimes
                .map(
                  obterIdJogador
                )
                .sort()
                .join("|");


            atualizarBaseTimes();


            const depois =
              estado
                .jogadoresTimes
                .map(
                  obterIdJogador
                )
                .sort()
                .join("|");


            if (
              antes !==
              depois
            ) {

              inserirEmTimes();

              atualizarInterfaceResumo();

            }

          },
          120
        );

      };


    const atualizarRecomendacoesEvento =
      () => {

        if (
          estado.aplicando
        ) {

          return;

        }


        setTimeout(
          () => {

            atualizarBaseRecomendacoes();

            inserirEmRecomendacoes();

            atualizarInterfaceResumo();

          },
          100
        );

      };


    [
      "cartola:escalacoes-atualizadas",
      "cartola:times-atualizados",
      "cartola:escalacoes-carregadas",
      "cartola:recalculo-concluido"
    ]
      .forEach(
        nomeEvento => {

          window.addEventListener(
            nomeEvento,
            atualizarTimes
          );

        }
      );


    [
      "cartola:recomendacoes-atualizadas"
    ]
      .forEach(
        nomeEvento => {

          window.addEventListener(
            nomeEvento,
            atualizarRecomendacoesEvento
          );

        }
      );

  }


  /* =======================================================
     ATUALIZA OPÇÕES
     ======================================================= */

  function atualizarOpcoes() {

    atualizarBaseRecomendacoes();

    atualizarBaseTimes();

    reconstruirPaineis();


    return obterEstado();

  }


  /* =======================================================
     DIAGNÓSTICO
     ======================================================= */

  function obterEstado() {

    return {

      inicializado:
        estado.inicializado,

      inicializando:
        estado.inicializando,

      aplicando:
        estado.aplicando,

      recomendacoes: {

        total:
          estado
            .jogadoresRecomendacoes
            .length,

        clubesDisponiveis: [
          ...estado
            .clubesRecomendacoes
        ],

        jogadoresDisponiveis:
          estado
            .jogadoresRecomendacoes
            .map(
              jogador => ({

                id:
                  obterIdJogador(
                    jogador
                  ),

                nome:
                  obterNomeJogador(
                    jogador
                  ),

                posicao:
                  obterPosicaoNormalizada(
                    obterPosicaoJogador(
                      jogador
                    )
                  ),

                clube:
                  obterClubeJogador(
                    jogador
                  )

              })
            )

      },

      times: {

        total:
          estado
            .jogadoresTimes
            .length,

        clubesDisponiveis: [
          ...estado
            .clubesTimes
        ],

        jogadoresDisponiveis:
          estado
            .jogadoresTimes
            .map(
              jogador => ({

                id:
                  obterIdJogador(
                    jogador
                  ),

                nome:
                  obterNomeJogador(
                    jogador
                  ),

                posicao:
                  obterPosicaoNormalizada(
                    obterPosicaoJogador(
                      jogador
                    )
                  ),

                clube:
                  obterClubeJogador(
                    jogador
                  )

              })
            )

      },

      clubesExcluidos: [
        ...estado
          .clubesExcluidos
      ],

      jogadoresExcluidos: [
        ...estado
          .jogadoresExcluidos
      ],

      nomesJogadoresExcluidos:
        obterNomesJogadoresExcluidos(),

      quantidadeRemovida:
        estado
          .quantidadeRemovida,

      ultimoResultado:
        estado
          .ultimoResultado

    };

  }


  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  async function inicializar() {

    if (
      estado.inicializando
    ) {

      return false;

    }


    estado.inicializando =
      true;


    try {

      const carregou =
        await esperarDados();


      if (
        !carregou
      ) {

        console.warn(
          "Filtros: dados das recomendações indisponíveis."
        );


        return false;

      }


      /*
       * Agora o filtro de Recomendações nasce
       * a partir do ranking real.
       */

      estado.jogadoresRecomendacoes =
        montarUniversoAtualRecomendacoes();


      estado.clubesRecomendacoes =
        obterClubesDaBase(
          estado
            .jogadoresRecomendacoes
        );


      await esperarEscalacoes();


      atualizarBaseTimes();


      garantirEstilos();

      removerPaineisAntigos();

      removerFiltroLegadoDuplicado();

      inserirEmRecomendacoes();

      inserirEmTimes();

      configurarFechamentoDropdown();

      configurarEventosExternos();

      atualizarInterfaceResumo();


      estado.inicializado =
        true;


      console.info(
        "Filtros V3 inicializados:",
        obterEstado()
      );


      return true;


    } catch (erro) {

      console.error(
        "Erro ao inicializar filtros V3:",
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

    aplicar:
      aplicarFiltros,

    limpar:
      limparFiltros,

    atualizarOpcoes,

    reconstruir:
      reconstruirPaineis,

    jogadorEstaExcluido,

    obterEstado

  };


})();


/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */

if (
  typeof window !==
  "undefined"
) {

  window.CartolaFiltrosExclusao =
    CartolaFiltrosExclusao;


  window.addEventListener(
    "load",
    () => {

      setTimeout(
        () => {

          CartolaFiltrosExclusao
            .inicializar();

        },
        250
      );

    }
  );

}
