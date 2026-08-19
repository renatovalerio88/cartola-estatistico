/* =========================================================
   CARTOLA ESTATÍSTICO
   Filtros manuais da rodada
   Clubes + jogadores

   VERSÃO CONSOLIDADA V2

   Regras:
   - Recomendações:
     mostra candidatos da base de recomendações.
   - Times sugeridos:
     mostra SOMENTE jogadores presentes nos times sugeridos.
   - NÃO usa a base completa como fallback na aba Times.
   - filtros sincronizados;
   - exclusão efetiva antes do recálculo;
   - jogadoresOriginais preservados;
   - patrimônio preservado;
   - evita duplicação de filtros.
   ========================================================= */

const CartolaFiltrosExclusao = (() => {

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

    clubesRecomendacoes: [],
    jogadoresRecomendacoes: [],

    clubesTimes: [],
    jogadoresTimes: [],

    clubesExcluidos: new Set(),
    jogadoresExcluidos: new Set(),

    quantidadeRemovida: 0,

    ultimoResultado: null

  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function texto(valor) {

    return String(
      valor ?? ""
    ).trim();

  }


  function normalizarTexto(valor) {

    return texto(valor)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );

  }


  function escaparHtml(valor) {

    return texto(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function copiarJogador(jogador) {

    if (
      !jogador ||
      typeof jogador !== "object"
    ) {

      return jogador;

    }

    return {

      ...jogador,

      scouts: {
        ...(jogador.scouts || {})
      },

      historico:
        Array.isArray(jogador.historico)
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
     IDENTIFICAÇÃO DO JOGADOR
     ======================================================= */

  function obterIdJogador(jogador) {

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


  function obterNomeJogador(jogador) {

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


  function obterPosicaoJogador(jogador) {

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


  function obterClubeJogador(jogador) {

    return texto(
      jogador?.siglaClube
      ??
      jogador?.clubeSigla
      ??
      jogador?.clube
      ??
      jogador?.atleta?.siglaClube
      ??
      jogador?.atleta?.clubeSigla
      ??
      jogador?.atleta?.clube
      ??
      ""
    ).toUpperCase();

  }


  function indicePosicao(posicao) {

    const indice =
      ORDEM_POSICOES.indexOf(
        posicao
      );

    return indice >= 0
      ? indice
      : 999;

  }


  function ordenarJogadores(lista) {

    return [...lista].sort(
      (
        jogadorA,
        jogadorB
      ) => {

        const posicaoA =
          obterPosicaoJogador(
            jogadorA
          );

        const posicaoB =
          obterPosicaoJogador(
            jogadorB
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

          return ordemA - ordemB;

        }

        return obterNomeJogador(
          jogadorA
        ).localeCompare(
          obterNomeJogador(
            jogadorB
          ),
          "pt-BR"
        );

      }
    );

  }


  function removerDuplicados(lista) {

    const mapa =
      new Map();

    lista.forEach(
      jogador => {

        const id =
          obterIdJogador(
            jogador
          );

        if (
          !id ||
          mapa.has(id)
        ) {

          return;

        }

        mapa.set(
          id,
          copiarJogador(
            jogador
          )
        );

      }
    );

    return [
      ...mapa.values()
    ];

  }


  /* =======================================================
     BASE ORIGINAL
     ======================================================= */

  function obterJogadoresOriginais() {

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


    if (
      typeof window !==
        "undefined" &&
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
        Array.isArray(jogadores)
      ) {

        return jogadores.map(
          copiarJogador
        );

      }

    }

    return [];

  }


  /* =======================================================
     ESCALAÇÕES
     ======================================================= */

  function normalizarListaEscalacoes(valor) {

    if (
      Array.isArray(valor)
    ) {

      return valor;

    }

    if (
      valor &&
      Array.isArray(valor.escalacoes)
    ) {

      return valor.escalacoes;

    }

    if (
      valor &&
      Array.isArray(valor.times)
    ) {

      return valor.times;

    }

    if (
      valor &&
      typeof valor === "object"
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
        typeof window !==
          "undefined" &&
        typeof window
          .obterEscalacoesCarregadas ===
          "function"
      ) {

        tentativas.push(
          window
            .obterEscalacoesCarregadas()
        );

      }

    } catch (erro) {

      console.warn(
        "Falha em obterEscalacoesCarregadas:",
        erro
      );

    }


    try {

      if (
        typeof window !==
          "undefined" &&
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

    } catch (erro) {

      console.warn(
        "Falha em CartolaEscalacoes:",
        erro
      );

    }


    try {

      if (
        typeof estadoEscalacoes !==
          "undefined"
      ) {

        tentativas.push(
          estadoEscalacoes
        );

      }

    } catch (erro) {

      console.warn(
        "Falha em estadoEscalacoes:",
        erro
      );

    }


    try {

      if (
        typeof window !==
          "undefined" &&
        window.estadoEscalacoes
      ) {

        tentativas.push(
          window.estadoEscalacoes
        );

      }

    } catch (erro) {

      console.warn(
        "Falha em window.estadoEscalacoes:",
        erro
      );

    }


    for (
      const tentativa of tentativas
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
     EXTRAI JOGADORES DE UMA ESCALAÇÃO
     ======================================================= */

  function adicionarJogadorAoMapa(
    mapa,
    jogador
  ) {

    if (!jogador) {

      return;

    }

    const jogadorReal =
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
        jogadorReal
      );

    if (
      !id ||
      mapa.has(id)
    ) {

      return;

    }

    mapa.set(
      id,
      copiarJogador(
        jogadorReal
      )
    );

  }


  function adicionarListaAoMapa(
    mapa,
    lista
  ) {

    if (
      !Array.isArray(lista)
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


  function obterJogadoresDasEscalacoes() {

    const mapa =
      new Map();

    const escalacoes =
      obterEscalacoesAtuais();


    escalacoes.forEach(
      escalacao => {

        if (!escalacao) {

          return;

        }


        const listas = [

          escalacao.titulares,

          escalacao.jogadores,

          escalacao.atletas,

          escalacao.time,

          escalacao.banco,

          escalacao.reservas

        ];


        listas.forEach(
          lista =>
            adicionarListaAoMapa(
              mapa,
              lista
            )
        );


        const especiais = [

          escalacao.capitao,

          escalacao.capitão,

          escalacao.reservaLuxo,

          escalacao.reservaDeLuxo,

          escalacao.tecnico,

          escalacao.técnico

        ];


        especiais.forEach(
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

          const interna =
            escalacao.escalacao;

          [
            interna.titulares,
            interna.jogadores,
            interna.atletas,
            interna.banco,
            interna.reservas
          ].forEach(
            lista =>
              adicionarListaAoMapa(
                mapa,
                lista
              )
          );


          [
            interna.capitao,
            interna.capitão,
            interna.reservaLuxo,
            interna.reservaDeLuxo,
            interna.tecnico,
            interna.técnico
          ].forEach(
            jogador =>
              adicionarJogadorAoMapa(
                mapa,
                jogador
              )
          );

        }

      }
    );


    return [
      ...mapa.values()
    ];

  }


  /* =======================================================
     TENTA LER OS JOGADORES DIRETAMENTE DOS CARDS DOS TIMES

     É apenas uma fonte auxiliar.
     NÃO existe fallback para todos os jogadores.
     ======================================================= */

  function obterJogadoresDosCardsTimes() {

    const secao =
      document.getElementById(
        "times"
      );

    if (!secao) {

      return [];

    }


    const originais =
      obterJogadoresOriginais();

    if (
      originais.length === 0
    ) {

      return [];

    }


    const mapaPorNome =
      new Map();


    originais.forEach(
      jogador => {

        const nome =
          normalizarTexto(
            obterNomeJogador(
              jogador
            )
          );

        if (!nome) {

          return;

        }

        if (
          !mapaPorNome.has(nome)
        ) {

          mapaPorNome.set(
            nome,
            jogador
          );

        }

      }
    );


    const conteudo =
      normalizarTexto(
        secao.innerText
      );


    const encontrados = [];


    mapaPorNome.forEach(
      (
        jogador,
        nome
      ) => {

        if (
          nome.length >= 3 &&
          conteudo.includes(nome)
        ) {

          encontrados.push(
            copiarJogador(
              jogador
            )
          );

        }

      }
    );


    return removerDuplicados(
      encontrados
    );

  }


  /* =======================================================
     BASE DE CADA CONTEXTO
     ======================================================= */

  function obterBaseRecomendacoes() {

    return ordenarJogadores(
      removerDuplicados(
        obterJogadoresOriginais()
      )
    );

  }


  function obterBaseTimes() {

    /*
     * REGRA PRINCIPAL:
     *
     * Na aba Times sugeridos NÃO fazemos:
     *
     * escalados.length > 0
     *   ? escalados
     *   : todos
     *
     * Esse fallback era justamente o problema.
     */

    const escalados =
      obterJogadoresDasEscalacoes();


    if (
      escalados.length > 0
    ) {

      return ordenarJogadores(
        removerDuplicados(
          escalados
        )
      );

    }


    /*
     * Fonte auxiliar:
     * tenta identificar os atletas que já estão
     * renderizados nos cards dos times.
     */

    const dosCards =
      obterJogadoresDosCardsTimes();


    if (
      dosCards.length > 0
    ) {

      return ordenarJogadores(
        removerDuplicados(
          dosCards
        )
      );

    }


    /*
     * IMPORTANTE:
     *
     * Se os times ainda não estiverem disponíveis,
     * retorna lista vazia.
     *
     * NUNCA retorna a base completa.
     */

    return [];

  }


  function obterClubesDaBase(
    base
  ) {

    return [
      ...new Set(
        base
          .map(
            obterClubeJogador
          )
          .filter(Boolean)
      )
    ].sort(
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


  function atualizarOpcoesDisponiveis() {

    const recomendacoes =
      obterBaseRecomendacoes();

    const times =
      obterBaseTimes();


    estado.jogadoresRecomendacoes =
      recomendacoes;

    estado.clubesRecomendacoes =
      obterClubesDaBase(
        recomendacoes
      );


    estado.jogadoresTimes =
      times;

    estado.clubesTimes =
      obterClubesDaBase(
        times
      );

  }


  function obterJogadoresContexto(
    contexto
  ) {

    if (
      contexto === "times"
    ) {

      return estado
        .jogadoresTimes;

    }

    return estado
      .jogadoresRecomendacoes;

  }


  function obterClubesContexto(
    contexto
  ) {

    if (
      contexto === "times"
    ) {

      return estado
        .clubesTimes;

    }

    return estado
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


    if (
      clube &&
      estado.clubesExcluidos.has(
        clube
      )
    ) {

      return true;

    }


    if (
      id &&
      estado.jogadoresExcluidos.has(
        id
      )
    ) {

      return true;

    }


    return false;

  }


  /* =======================================================
     APLICA FILTRO À BASE ATIVA
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


    if (
      typeof estadoRecomendacoes !==
        "undefined"
    ) {

      estadoRecomendacoes.jogadores =
        filtrados;

    }


    return filtrados;

  }


  /* =======================================================
     RESTAURA BASE
     ======================================================= */

  function restaurarBaseOriginal() {

    const originais =
      obterJogadoresOriginais();


    if (
      typeof estadoRecomendacoes !==
        "undefined"
    ) {

      estadoRecomendacoes.jogadores =
        originais.map(
          copiarJogador
        );

    }


    estado.quantidadeRemovida =
      0;


    return originais;

  }


  /* =======================================================
     RECOMENDAÇÕES
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
        "Erro ao atualizar recomendações após filtro:",
        erro
      );

      return false;

    }

  }


  /* =======================================================
     RECÁLCULO DAS ESCALAÇÕES
     ======================================================= */

  async function recalcularEscalacoesFiltradas() {

    if (
      typeof window !==
        "undefined" &&
      typeof window
        .recalcularEscalacoes ===
        "function"
    ) {

      return await window
        .recalcularEscalacoes();

    }


    if (
      typeof window !==
        "undefined" &&
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


    console.warn(
      "Função de recálculo das escalações não encontrada."
    );


    return [];

  }


  /* =======================================================
     RESUMOS
     ======================================================= */

  function obterNomesJogadoresExcluidos() {

    const mapa =
      new Map();


    [
      ...estado.jogadoresRecomendacoes,
      ...estado.jogadoresTimes
    ].forEach(
      jogador => {

        const id =
          obterIdJogador(
            jogador
          );

        if (
          id &&
          !mapa.has(id)
        ) {

          mapa.set(
            id,
            obterNomeJogador(
              jogador
            )
          );

        }

      }
    );


    return [
      ...estado.jogadoresExcluidos
    ]
      .map(
        id =>
          mapa.get(id)
          ??
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
      estado.clubesExcluidos.size;

    const jogadores =
      estado.jogadoresExcluidos.size;


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
      ...estado.clubesExcluidos
    ].sort();


    const jogadores =
      obterNomesJogadoresExcluidos();


    if (
      clubes.length === 0 &&
      jogadores.length === 0
    ) {

      return (
        "Sem exclusões manuais. " +
        "Todos os candidatos disponíveis podem ser utilizados."
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
      " • "
    );

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

      if (
        contexto === "times"
      ) {

        return `
          <div class="ce-filter-empty">
            Aguardando os times sugeridos.
          </div>
        `;

      }

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
            estado.clubesExcluidos.has(
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
      obterJogadoresContexto(
        contexto
      );


    if (
      base.length === 0
    ) {

      if (
        contexto === "times"
      ) {

        return `
          <div class="ce-filter-empty">
            Aguardando os jogadores dos times sugeridos.
          </div>
        `;

      }

      return `
        <div class="ce-filter-empty">
          Nenhum jogador disponível.
        </div>
      `;

    }


    let html = "";


    ORDEM_POSICOES.forEach(
      posicao => {

        const jogadores =
          base.filter(
            jogador =>
              obterPosicaoJogador(
                jogador
              ) === posicao
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
                .has(id);


            const busca =
              normalizarTexto(
                [
                  nome,
                  clube,
                  posicao
                ].join(" ")
              );


            html += `

              <label
                class="ce-filter-option ce-filter-player-item"
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
        ? "Apenas jogadores presentes nos times sugeridos."
        : "Retire opções que você não quer nas recomendações.";


    return `

      <div
        class="ce-filter-panel"
        data-context="${contexto}"
      >

        <div
          class="ce-filter-top"
        >

          <div
            class="ce-filter-title-area"
          >

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

            <small>
              ${textoContexto}
            </small>

          </div>


          <div
            class="ce-filter-top-actions"
          >

            <span
              class="ce-filter-count"
            >
              ${escaparHtml(
                criarResumoCurto()
              )}
            </span>

            <button
              type="button"
              class="ce-filter-clear"
            >
              Limpar
            </button>

          </div>

        </div>


        <div
          class="ce-filter-controls"
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
                class="ce-filter-options ce-filter-club-list"
              >

                ${criarHtmlClubes(
                  contexto
                )}

              </div>

            </div>

          </details>


          <details
            class="ce-filter-dropdown ce-filter-dropdown-player"
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
                class="ce-filter-options ce-filter-player-list"
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
          class="ce-filter-status"
        >
          ${escaparHtml(
            criarResumoCompleto()
          )}
        </div>

      </div>

    `;

  }


  /* =======================================================
     ESTILOS
     ======================================================= */

  function garantirEstilos() {

    const existente =
      document.getElementById(
        "ceFiltrosRodadaStyle"
      );


    if (
      existente
    ) {

      existente.remove();

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "ceFiltrosRodadaStyle";


    style.textContent = `

      .ce-filter-wrapper {
        margin: 14px 0 18px;
      }

      .ce-filter-panel {
        padding: 13px 15px;
        border: 1px solid rgba(78,195,126,.25);
        border-radius: 16px;
        background: rgba(27,70,45,.20);
      }

      .ce-filter-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 11px;
      }

      .ce-filter-title-area {
        display: flex;
        align-items: baseline;
        gap: 10px;
        min-width: 0;
        flex-wrap: wrap;
      }

      .ce-filter-kicker {
        color: #44d887;
        font-size: 10px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: .11em;
      }

      .ce-filter-title {
        font-size: 14px;
        line-height: 1.2;
      }

      .ce-filter-title-area small {
        font-size: 11px;
        opacity: .64;
      }

      .ce-filter-top-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      .ce-filter-count {
        padding: 6px 9px;
        border-radius: 999px;
        background: rgba(255,255,255,.055);
        font-size: 10px;
        white-space: nowrap;
      }

      .ce-filter-controls {
        display: grid;
        grid-template-columns:
          minmax(180px,.75fr)
          minmax(240px,1fr)
          auto;
        gap: 9px;
        align-items: start;
      }

      .ce-filter-dropdown {
        position: relative;
      }

      .ce-filter-dropdown > summary {
        list-style: none;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 12px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 11px;
        background: rgba(5,25,16,.36);
        cursor: pointer;
        user-select: none;
        font-size: 12px;
        font-weight: 700;
      }

      .ce-filter-dropdown > summary::-webkit-details-marker {
        display: none;
      }

      .ce-filter-dropdown > summary::after {
        content: "▾";
        margin-left: auto;
        opacity: .65;
      }

      .ce-filter-dropdown[open] > summary::after {
        content: "▴";
      }

      .ce-filter-dropdown > summary strong {
        min-width: 21px;
        height: 21px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        border-radius: 999px;
        background: rgba(68,216,135,.15);
        color: #44d887;
        font-size: 10px;
      }

      .ce-filter-dropdown-body {
        position: absolute;
        z-index: 80;
        left: 0;
        right: 0;
        top: calc(100% + 6px);
        padding: 9px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 12px;
        background: #0b1a12;
        box-shadow: 0 18px 45px rgba(0,0,0,.35);
      }

      .ce-filter-options {
        max-height: 285px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .ce-filter-option {
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
        margin: 0;
        flex: 0 0 auto;
      }

      .ce-filter-player-info {
        display: flex;
        min-width: 0;
        align-items: baseline;
        gap: 6px;
      }

      .ce-filter-player-info strong {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .ce-filter-player-info small {
        opacity: .55;
        font-size: 9px;
      }

      .ce-filter-position-title {
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 7px 8px 5px;
        background: #0b1a12;
        color: #44d887;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .09em;
        text-transform: uppercase;
      }

      .ce-filter-search {
        width: 100%;
        height: 38px;
        margin-bottom: 7px;
        padding: 0 10px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 9px;
        outline: 0;
        background: rgba(255,255,255,.035);
        color: inherit;
        font-size: 11px;
      }

      .ce-filter-search:focus {
        border-color: rgba(68,216,135,.55);
      }

      .ce-filter-apply,
      .ce-filter-clear {
        border-radius: 10px;
        cursor: pointer;
        font-weight: 800;
      }

      .ce-filter-apply {
        min-height: 42px;
        padding: 0 15px;
        border: 0;
        background: #45be7c;
        color: #071b10;
        white-space: nowrap;
      }

      .ce-filter-clear {
        height: 34px;
        padding: 0 11px;
        border: 1px solid rgba(255,255,255,.11);
        background: rgba(255,255,255,.025);
        color: inherit;
        font-size: 10px;
      }

      .ce-filter-apply:disabled,
      .ce-filter-clear:disabled {
        opacity: .5;
        cursor: wait;
      }

      .ce-filter-status {
        margin-top: 8px;
        overflow: hidden;
        color: rgba(255,255,255,.58);
        font-size: 10px;
        line-height: 1.4;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .ce-filter-empty {
        padding: 10px;
        opacity: .6;
        font-size: 11px;
      }

      @media (max-width: 900px) {

        .ce-filter-controls {
          grid-template-columns: 1fr 1fr;
        }

        .ce-filter-apply {
          grid-column: 1 / -1;
        }

      }

      @media (max-width: 650px) {

        .ce-filter-panel {
          padding: 12px;
        }

        .ce-filter-top {
          align-items: flex-start;
        }

        .ce-filter-title-area {
          display: block;
        }

        .ce-filter-kicker,
        .ce-filter-title,
        .ce-filter-title-area small {
          display: block;
        }

        .ce-filter-title {
          margin-top: 5px;
        }

        .ce-filter-title-area small {
          margin-top: 4px;
        }

        .ce-filter-count {
          display: none;
        }

        .ce-filter-controls {
          grid-template-columns: 1fr;
        }

        .ce-filter-apply {
          grid-column: auto;
        }

        .ce-filter-dropdown-body {
          position: static;
          margin-top: 6px;
        }

        .ce-filter-status {
          white-space: normal;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =======================================================
     REMOVE PAINÉIS ANTIGOS
     ======================================================= */

  function removerPaineisAntigos() {

    const seletores = [

      "#ceExclusionRecommendations",
      "#ceExclusionTeams",
      ".ce-exclusion-wrapper",
      ".ce-exclusion-panel"

    ];


    seletores.forEach(
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


  /* =======================================================
     REMOVE FILTRO LEGADO
     ======================================================= */

  function removerFiltroLegadoDuplicado() {

    const candidatos = [
      ...document.querySelectorAll(
        "div, section, article"
      )
    ];


    candidatos.forEach(
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


        const temTitulo =
          conteudo.includes(
            "retire clubes ou jogadores"
          );


        const temContadores =
          (
            conteudo.includes(
              "clubes excluidos"
            )
            ||
            conteudo.includes(
              "atletas removidos"
            )
          );


        const temBotao =
          [
            ...elemento.querySelectorAll(
              "button"
            )
          ].some(
            botao =>
              normalizarTexto(
                botao.textContent
              ).includes(
                "limpar filtros"
              )
          );


        if (
          !temTitulo ||
          !temContadores ||
          !temBotao
        ) {

          return;

        }


        const filhosComMesmoTitulo =
          [
            ...elemento.children
          ].some(
            filho =>
              normalizarTexto(
                filho.textContent
              ).includes(
                "retire clubes ou jogadores"
              )
          );


        if (
          filhosComMesmoTitulo
        ) {

          return;

        }


        elemento.remove();

      }
    );

  }


  /* =======================================================
     SINCRONIZA CHECKBOXES
     ======================================================= */

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
     ATUALIZA CONTADORES
     ======================================================= */

  function atualizarInterfaceResumo() {

    document
      .querySelectorAll(
        ".ce-filter-count"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            criarResumoCurto();

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-club-count"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            estado.clubesExcluidos.size;

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-player-count"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            estado.jogadoresExcluidos.size;

        }
      );


    document
      .querySelectorAll(
        ".ce-filter-status"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            criarResumoCompleto();

        }
      );


    sincronizarCheckboxes();

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

          const corresponde =
            !busca ||
            texto(
              item.dataset.search
            ).includes(
              busca
            );


          item.hidden =
            !corresponde;

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
              ...grupo.querySelectorAll(
                ".ce-filter-player-item"
              )
            ].some(
              item =>
                !item.hidden
            );


          grupo.hidden =
            !algumVisivel;

        }
      );

  }


  /* =======================================================
     EVENTOS
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
                ).toUpperCase();


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
     FECHAMENTO DOS DROPDOWNS
     ======================================================= */

  function configurarFechamentoDropdown() {

    if (
      document
        .documentElement
        .dataset
        .ceFilterDropdownReady ===
      "1"
    ) {

      return;

    }


    document
      .documentElement
      .dataset
      .ceFilterDropdownReady =
      "1";


    document.addEventListener(
      "click",
      evento => {

        const detailsClicado =
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
                detailsClicado
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
     ESTADO APLICANDO
     ======================================================= */

  function definirAplicando(
    valor
  ) {

    estado.aplicando =
      Boolean(valor);


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


    if (
      estado.aplicando
    ) {

      document
        .querySelectorAll(
          ".ce-filter-apply"
        )
        .forEach(
          botao => {

            botao.dataset.textoOriginal =
              botao.textContent;


            botao.textContent =
              "Recalculando...";

          }
        );

    } else {

      document
        .querySelectorAll(
          ".ce-filter-apply"
        )
        .forEach(
          botao => {

            botao.textContent =
              botao.dataset.textoOriginal
              ||
              "Aplicar filtros";

          }
        );

    }

  }


  /* =======================================================
     APLICA FILTROS
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


      const escalacoes =
        await recalcularEscalacoesFiltradas();


      /*
       * Aguarda o DOM e o estado das escalações
       * terminarem de atualizar.
       */

      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            80
          )
      );


      atualizarOpcoesDisponiveis();


      estado.ultimoResultado = {

        sucesso: true,

        jogadoresDisponiveis:
          filtrados.length,

        removidos:
          estado.quantidadeRemovida,

        clubesExcluidos: [
          ...estado.clubesExcluidos
        ],

        jogadoresExcluidos: [
          ...estado.jogadoresExcluidos
        ],

        escalacoes:
          Array.isArray(escalacoes)
            ? escalacoes.length
            : obterEscalacoesAtuais().length,

        jogadoresNosTimes:
          estado.jogadoresTimes.length

      };


      reconstruirPaineis();

      atualizarInterfaceResumo();


      console.info(
        "Filtros da rodada aplicados:",
        estado.ultimoResultado
      );


      window.dispatchEvent(
        new CustomEvent(
          "cartola:filtros-aplicados",
          {
            detail:
              estado.ultimoResultado
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
          String(erro)

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


    estado
      .clubesExcluidos
      .clear();


    estado
      .jogadoresExcluidos
      .clear();


    restaurarBaseOriginal();

    atualizarInterfaceResumo();

    definirAplicando(
      true
    );


    try {

      atualizarRecomendacoes();


      await recalcularEscalacoesFiltradas();


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            80
          )
      );


      atualizarOpcoesDisponiveis();

      reconstruirPaineis();

      atualizarInterfaceResumo();


      estado.ultimoResultado = {

        sucesso: true,
        limpo: true,
        removidos: 0,
        jogadoresNosTimes:
          estado.jogadoresTimes.length

      };


      console.info(
        "Filtros da rodada removidos."
      );


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


    const existente =
      document.getElementById(
        "ceFilterRecommendations"
      );


    if (
      existente
    ) {

      existente.remove();

    }


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


    const grid =
      secao.querySelector(
        "#playersGrid"
      );


    const filtrosPosicao =
      secao.querySelector(
        ".position-filters, .filters, .recommendation-filters"
      );


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


    const existente =
      document.getElementById(
        "ceFilterTeams"
      );


    if (
      existente
    ) {

      existente.remove();

    }


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

    } else {

      const strategyGrid =
        secao.querySelector(
          ".strategy-grid"
        );


      if (
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
     ESPERA BASE PRINCIPAL
     ======================================================= */

  async function esperarDados() {

    for (
      let tentativa = 0;
      tentativa < 40;
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
            200
          )
      );

    }


    return false;

  }


  /* =======================================================
     ESPERA ESCALAÇÕES
     ======================================================= */

  async function esperarEscalacoes() {

    for (
      let tentativa = 0;
      tentativa < 25;
      tentativa += 1
    ) {

      const jogadores =
        obterJogadoresDasEscalacoes();


      if (
        jogadores.length > 0
      ) {

        return true;

      }


      const cards =
        obterJogadoresDosCardsTimes();


      if (
        cards.length > 0
      ) {

        return true;

      }


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            160
          )
      );

    }


    return false;

  }


  /* =======================================================
     ATUALIZA OPÇÕES
     ======================================================= */

  function atualizarOpcoes() {

    atualizarOpcoesDisponiveis();

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

        clubesDisponiveis: [
          ...estado.clubesRecomendacoes
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
                  obterPosicaoJogador(
                    jogador
                  ),

                clube:
                  obterClubeJogador(
                    jogador
                  )

              })
            )

      },

      times: {

        clubesDisponiveis: [
          ...estado.clubesTimes
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
                  obterPosicaoJogador(
                    jogador
                  ),

                clube:
                  obterClubeJogador(
                    jogador
                  )

              })
            )

      },

      clubesExcluidos: [
        ...estado.clubesExcluidos
      ],

      jogadoresExcluidos: [
        ...estado.jogadoresExcluidos
      ],

      quantidadeRemovida:
        estado.quantidadeRemovida,

      ultimoResultado:
        estado.ultimoResultado

    };

  }


  /* =======================================================
     EVENTOS DE ATUALIZAÇÃO DOS TIMES
     ======================================================= */

  function configurarEventosExternos() {

    if (
      document
        .documentElement
        .dataset
        .ceFilterExternalReady ===
      "1"
    ) {

      return;

    }


    document
      .documentElement
      .dataset
      .ceFilterExternalReady =
      "1";


    const atualizarDepoisDosTimes =
      () => {

        if (
          estado.aplicando
        ) {

          return;

        }


        setTimeout(
          () => {

            const anterior =
              estado
                .jogadoresTimes
                .map(
                  obterIdJogador
                )
                .sort()
                .join("|");


            const novaBase =
              obterBaseTimes();


            const depois =
              novaBase
                .map(
                  obterIdJogador
                )
                .sort()
                .join("|");


            if (
              anterior === depois
            ) {

              return;

            }


            estado.jogadoresTimes =
              novaBase;


            estado.clubesTimes =
              obterClubesDaBase(
                novaBase
              );


            inserirEmTimes();

            atualizarInterfaceResumo();

          },
          120
        );

      };


    [
      "cartola:escalacoes-atualizadas",
      "cartola:times-atualizados",
      "cartola:escalacoes-carregadas",
      "cartola:recalculo-concluido"
    ].forEach(
      nomeEvento => {

        window.addEventListener(
          nomeEvento,
          atualizarDepoisDosTimes
        );

      }
    );

  }


  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  async function inicializar() {

    if (
      estado.inicializado
    ) {

      atualizarOpcoesDisponiveis();

      reconstruirPaineis();

      return true;

    }


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
          "Filtros da rodada: jogadores ainda indisponíveis."
        );

        return false;

      }


      /*
       * Primeiro carregamos Recomendações.
       */

      estado.jogadoresRecomendacoes =
        obterBaseRecomendacoes();


      estado.clubesRecomendacoes =
        obterClubesDaBase(
          estado.jogadoresRecomendacoes
        );


      /*
       * Damos tempo para os times serem montados.
       *
       * Mesmo que não estejam prontos,
       * NÃO usamos todos os jogadores.
       */

      await esperarEscalacoes();


      estado.jogadoresTimes =
        obterBaseTimes();


      estado.clubesTimes =
        obterClubesDaBase(
          estado.jogadoresTimes
        );


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
        "Filtros da rodada inicializados:",
        obterEstado()
      );


      return true;


    } catch (erro) {

      console.error(
        "Erro ao inicializar filtros da rodada:",
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
        300
      );

    }
  );

}
