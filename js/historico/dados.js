/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — carregamento e preparação dos dados

   Responsabilidades:

   - carregar índice do histórico;
   - descobrir rodadas disponíveis;
   - carregar jogadores e métricas de cada rodada;
   - manter cache;
   - montar histórico individual por atleta;
   - oferecer API compatível com os módulos antigos;
   - tolerar ausência de arquivos sem quebrar o site.

   ========================================================= */


const HistoricoDados = (() => {


  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */

  const CAMINHO_BASE =
    "data/historico";


  const CAMINHO_INDICE =
    `${CAMINHO_BASE}/indice.json`;


  const CAMINHO_STATUS =
    "data/api/status.json";


  const POSICOES_VALIDAS = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];


  /* =======================================================
     CACHE
     ======================================================= */

  const cacheRodadas =
    new Map();


  let cacheIndice =
    null;


  let promessaIndice =
    null;


  let rodadaAtualCache =
    null;


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function numero(
    valor,
    padrao = null
  ) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {

      return padrao;

    }


    const convertido =
      Number(valor);


    return Number.isFinite(
      convertido
    )
      ? convertido
      : padrao;

  }


  function texto(
    valor,
    padrao = ""
  ) {

    const resultado =
      String(
        valor ??
        ""
      ).trim();


    return resultado ||
      padrao;

  }


  function arredondar(
    valor,
    casas = 2
  ) {

    const convertido =
      numero(
        valor,
        0
      );


    return Number(
      convertido.toFixed(
        casas
      )
    );

  }


  function normalizarRodada(
    rodada
  ) {

    const valor =
      Math.trunc(
        numero(
          rodada,
          0
        )
      );


    return valor > 0
      ? valor
      : null;

  }


  function formatarRodada(
    rodada
  ) {

    const numeroRodada =
      normalizarRodada(
        rodada
      );


    if (!numeroRodada) {

      return "";

    }


    return String(
      numeroRodada
    ).padStart(
      2,
      "0"
    );

  }


  function copiarObjeto(
    valor
  ) {

    if (
      Array.isArray(valor)
    ) {

      return valor.map(
        copiarObjeto
      );

    }


    if (
      valor &&
      typeof valor ===
        "object"
    ) {

      const resultado = {};


      Object.entries(
        valor
      )
        .forEach(
          ([
            chave,
            conteudo
          ]) => {

            resultado[chave] =
              copiarObjeto(
                conteudo
              );

          }
        );


      return resultado;

    }


    return valor;

  }


  async function buscarJson(
    caminho,
    obrigatorio = false
  ) {

    try {

      const resposta =
        await fetch(
          caminho,
          {
            cache: "no-store"
          }
        );


      if (
        !resposta.ok
      ) {

        if (
          obrigatorio
        ) {

          throw new Error(
            `HTTP ${resposta.status} em ${caminho}`
          );

        }


        return null;

      }


      return await resposta.json();


    } catch (erro) {

      if (
        obrigatorio
      ) {

        throw erro;

      }


      return null;

    }

  }


  /* =======================================================
     RODADA ATUAL
     ======================================================= */

  async function obterRodadaAtual() {

    if (
      rodadaAtualCache
    ) {

      return rodadaAtualCache;

    }


    const status =
      await buscarJson(
        CAMINHO_STATUS,
        false
      );


    const rodada =
      normalizarRodada(
        status?.rodada_atual ??
        status?.rodadaAtual ??
        status?.rodada
      );


    rodadaAtualCache =
      rodada ||
      1;


    return rodadaAtualCache;

  }


  /* =======================================================
     NORMALIZAÇÃO DO ÍNDICE
     ======================================================= */

  function extrairRodadasIndice(
    dados
  ) {

    const rodadas =
      new Set();


    function adicionar(
      valor
    ) {

      if (
        typeof valor ===
          "object" &&
        valor !== null
      ) {

        valor =
          valor.rodada ??
          valor.numero ??
          valor.id ??
          valor.round;

      }


      const rodada =
        normalizarRodada(
          valor
        );


      if (
        rodada
      ) {

        rodadas.add(
          rodada
        );

      }

    }


    if (
      Array.isArray(
        dados
      )
    ) {

      dados.forEach(
        adicionar
      );

    }


    if (
      Array.isArray(
        dados?.rodadas
      )
    ) {

      dados.rodadas.forEach(
        adicionar
      );

    }


    if (
      Array.isArray(
        dados?.disponiveis
      )
    ) {

      dados.disponiveis.forEach(
        adicionar
      );

    }


    if (
      Array.isArray(
        dados?.itens
      )
    ) {

      dados.itens.forEach(
        adicionar
      );

    }


    if (
      dados?.rodadas &&
      typeof dados.rodadas ===
        "object" &&
      !Array.isArray(
        dados.rodadas
      )
    ) {

      Object.keys(
        dados.rodadas
      )
        .forEach(
          adicionar
        );

    }


    return [
      ...rodadas
    ]
      .sort(
        (
          a,
          b
        ) =>
          a - b
      );

  }


  /* =======================================================
     DESCOBERTA POR FALLBACK
     ======================================================= */

  async function descobrirRodadasPorArquivos() {

    const rodadaAtual =
      await obterRodadaAtual();


    const testes =
      [];


    for (
      let rodada = 1;
      rodada <= rodadaAtual;
      rodada += 1
    ) {

      testes.push(
        descobrirRodadaExistente(
          rodada
        )
      );

    }


    const resultados =
      await Promise.all(
        testes
      );


    return resultados
      .filter(Boolean)
      .sort(
        (
          a,
          b
        ) =>
          a - b
      );

  }


  async function descobrirRodadaExistente(
    rodada
  ) {

    const codigo =
      formatarRodada(
        rodada
      );


    if (!codigo) {

      return null;

    }


    const caminhos = [

      `${CAMINHO_BASE}/rodada-${codigo}/jogadores.json`,

      `${CAMINHO_BASE}/rodada-${codigo}/metricas.json`

    ];


    for (
      const caminho of
      caminhos
    ) {

      try {

        const resposta =
          await fetch(
            caminho,
            {
              method: "HEAD",
              cache: "no-store"
            }
          );


        if (
          resposta.ok
        ) {

          return rodada;

        }

      } catch (_) {

        /*
         * Alguns servidores não respondem
         * corretamente ao HEAD.
         */

      }

    }


    /*
     * Fallback final:
     * tenta GET do arquivo de métricas.
     */

    const metricas =
      await buscarJson(
        `${CAMINHO_BASE}/rodada-${codigo}/metricas.json`,
        false
      );


    if (
      metricas !== null
    ) {

      return rodada;

    }


    const jogadores =
      await buscarJson(
        `${CAMINHO_BASE}/rodada-${codigo}/jogadores.json`,
        false
      );


    return jogadores !== null
      ? rodada
      : null;

  }


  /* =======================================================
     CARREGAMENTO DO ÍNDICE
     ======================================================= */

  async function carregarIndice(
    forcar = false
  ) {

    if (
      cacheIndice &&
      !forcar
    ) {

      return copiarObjeto(
        cacheIndice
      );

    }


    if (
      promessaIndice &&
      !forcar
    ) {

      const resultado =
        await promessaIndice;


      return copiarObjeto(
        resultado
      );

    }


    promessaIndice =
      (async () => {

        const arquivo =
          await buscarJson(
            CAMINHO_INDICE,
            false
          );


        let rodadas =
          extrairRodadasIndice(
            arquivo
          );


        let origem =
          "indice.json";


        if (
          rodadas.length === 0
        ) {

          rodadas =
            await descobrirRodadasPorArquivos();


          origem =
            "descoberta-automatica";

        }


        const rodadaAtual =
          await obterRodadaAtual();


        cacheIndice = {

          rodadas,

          total:
            rodadas.length,

          primeiraRodada:
            rodadas.length
              ? rodadas[0]
              : null,

          ultimaRodada:
            rodadas.length
              ? rodadas[
                  rodadas.length - 1
                ]
              : null,

          rodadaAtual,

          origem,

          bruto:
            arquivo

        };


        console.info(
          "Histórico: índice carregado",
          {
            rodadas:
              cacheIndice.rodadas,

            total:
              cacheIndice.total,

            origem:
              cacheIndice.origem
          }
        );


        return cacheIndice;

      })();


    try {

      const resultado =
        await promessaIndice;


      return copiarObjeto(
        resultado
      );


    } finally {

      promessaIndice =
        null;

    }

  }


  /* =======================================================
     NORMALIZAÇÃO DE JOGADOR HISTÓRICO
     ======================================================= */

  function normalizarJogadorHistorico(
    jogador,
    rodada
  ) {

    if (
      !jogador ||
      typeof jogador !==
        "object"
    ) {

      return null;

    }


    const id =
      jogador.id ??
      jogador.atletaId ??
      jogador.atleta_id;


    if (
      id === null ||
      id === undefined
    ) {

      return null;

    }


    const posicao =
      texto(
        jogador.posicao ??
        jogador.posicaoSigla
      ).toUpperCase();


    const projecao =
      numero(
        jogador.projecao ??
        jogador.projecaoFinal ??
        jogador.projecaoCalibrada ??
        jogador.projecaoOriginal,
        null
      );


    const real =
      numero(
        jogador.real ??
        jogador.pontos ??
        jogador.pontuacao ??
        jogador.pontuacaoReal,
        null
      );


    const erro =
      (
        projecao !== null &&
        real !== null
      )
        ? Math.abs(
            projecao -
            real
          )
        : null;


    return {

      ...copiarObjeto(
        jogador
      ),

      id,

      atletaId:
        id,

      rodada:
        normalizarRodada(
          jogador.rodada ??
          rodada
        ) ??
        rodada,

      nome:
        texto(
          jogador.nome ??
          jogador.apelido,
          "Jogador"
        ),

      apelido:
        texto(
          jogador.apelido ??
          jogador.nome,
          "Jogador"
        ),

      posicao,

      clube:
        texto(
          jogador.clube
        ),

      siglaClube:
        texto(
          jogador.siglaClube ??
          jogador.clubeSigla
        ).toUpperCase(),

      projecao,

      real,

      pontuacaoReal:
        real,

      erro:
        erro !== null
          ? arredondar(
              erro,
              2
            )
          : null,

      top5:
        Boolean(
          jogador.top5 ??
          jogador.noTop5 ??
          false
        ),

      capitao:
        Boolean(
          jogador.capitao ??
          jogador.foiCapitao ??
          false
        ),

      acertouCapitao:
        Boolean(
          jogador.acertouCapitao ??
          false
        )

    };

  }


  /* =======================================================
     NORMALIZAÇÃO DE MÉTRICAS
     ======================================================= */

  function normalizarMetricas(
    metricas,
    rodada
  ) {

    const dados =
      (
        metricas &&
        typeof metricas ===
          "object"
      )
        ? metricas
        : {};


    const erroMedio =
      numero(
        dados.erroMedio ??
        dados.mae ??
        dados.erro_medio,
        null
      );


    const correlacao =
      numero(
        dados.correlacao ??
        dados.correlacaoPearson ??
        dados.pearson,
        null
      );


    const top5 =
      dados.top5 ??
      dados.acertoTop5 ??
      dados.top_5 ??
      null;


    const capitao =
      dados.capitao ??
      dados.resultadoCapitao ??
      dados.capitaoAcertou ??
      null;


    return {

      ...copiarObjeto(
        dados
      ),

      rodada:
        normalizarRodada(
          dados.rodada ??
          rodada
        ) ??
        rodada,

      erroMedio,

      correlacao,

      top5,

      capitao

    };

  }


  /* =======================================================
     CARREGAMENTO DE UMA RODADA
     ======================================================= */

  async function carregarRodada(
    rodada,
    forcar = false
  ) {

    const numeroRodada =
      normalizarRodada(
        rodada
      );


    if (
      !numeroRodada
    ) {

      return null;

    }


    if (
      cacheRodadas.has(
        numeroRodada
      ) &&
      !forcar
    ) {

      return copiarObjeto(
        cacheRodadas.get(
          numeroRodada
        )
      );

    }


    const codigo =
      formatarRodada(
        numeroRodada
      );


    const pasta =
      `${CAMINHO_BASE}/rodada-${codigo}`;


    const [
      jogadoresBrutos,
      metricasBrutas
    ] =
      await Promise.all([

        buscarJson(
          `${pasta}/jogadores.json`,
          false
        ),

        buscarJson(
          `${pasta}/metricas.json`,
          false
        )

      ]);


    const jogadores =
      Array.isArray(
        jogadoresBrutos
      )
        ? jogadoresBrutos
            .map(
              jogador =>
                normalizarJogadorHistorico(
                  jogador,
                  numeroRodada
                )
            )
            .filter(Boolean)
        : [];


    const metricas =
      normalizarMetricas(
        metricasBrutas,
        numeroRodada
      );


    const disponivel =
      (
        jogadores.length > 0
        ||
        metricasBrutas !== null
      );


    const resultado = {

      rodada:
        numeroRodada,

      codigoRodada:
        codigo,

      disponivel,

      jogadores,

      metricas,

      quantidadeJogadores:
        jogadores.length,

      caminhos: {

        jogadores:
          `${pasta}/jogadores.json`,

        metricas:
          `${pasta}/metricas.json`

      }

    };


    cacheRodadas.set(
      numeroRodada,
      resultado
    );


    return copiarObjeto(
      resultado
    );

  }


  /* =======================================================
     CARREGAMENTO DE VÁRIAS RODADAS
     ======================================================= */

  async function carregarRodadas(
    rodadas = null
  ) {

    let lista =
      Array.isArray(
        rodadas
      )
        ? rodadas
            .map(
              normalizarRodada
            )
            .filter(Boolean)
        : null;


    if (
      !lista
    ) {

      const indice =
        await carregarIndice();


      lista =
        indice.rodadas;

    }


    const resultados =
      await Promise.all(
        lista.map(
          rodada =>
            carregarRodada(
              rodada
            )
        )
      );


    return resultados
      .filter(
        rodada =>
          rodada &&
          rodada.disponivel
      )
      .sort(
        (
          a,
          b
        ) =>
          a.rodada -
          b.rodada
      );

  }


  /* =======================================================
     HISTÓRICO DE UM ATLETA
     ======================================================= */

  async function carregarHistoricoAtleta(
    atletaId
  ) {

    const id =
      texto(
        atletaId
      );


    if (!id) {

      return [];

    }


    const rodadas =
      await carregarRodadas();


    const historico = [];


    rodadas.forEach(
      dadosRodada => {

        const jogador =
          dadosRodada
            .jogadores
            .find(
              atleta =>
                String(
                  atleta.id
                ) === id
            );


        if (
          jogador
        ) {

          historico.push(
            copiarObjeto(
              jogador
            )
          );

        }

      }
    );


    return historico
      .sort(
        (
          a,
          b
        ) =>
          a.rodada -
          b.rodada
      );

  }


  /* =======================================================
     MONTA HISTÓRICO DOS JOGADORES
     ======================================================= */

  async function montarHistoricoJogadores(
    jogadores
  ) {

    if (
      !Array.isArray(
        jogadores
      )
    ) {

      return [];

    }


    const rodadas =
      await carregarRodadas();


    const mapaHistorico =
      new Map();


    rodadas.forEach(
      dadosRodada => {

        dadosRodada
          .jogadores
          .forEach(
            atleta => {

              const id =
                String(
                  atleta.id
                );


              if (
                !mapaHistorico.has(
                  id
                )
              ) {

                mapaHistorico.set(
                  id,
                  []
                );

              }


              mapaHistorico
                .get(id)
                .push(
                  copiarObjeto(
                    atleta
                  )
                );

            }
          );

      }
    );


    return jogadores.map(
      jogador => {

        const id =
          String(
            jogador?.id ??
            jogador?.atletaId ??
            jogador?.atleta_id ??
            ""
          );


        const historico =
          (
            mapaHistorico.get(
              id
            ) ??
            []
          )
            .slice()
            .sort(
              (
                a,
                b
              ) =>
                a.rodada -
                b.rodada
            );


        const historicoPontuacoes =
          historico
            .map(
              registro =>
                numero(
                  registro.real ??
                  registro.pontuacaoReal,
                  null
                )
            )
            .filter(
              valor =>
                valor !== null
            );


        return {

          ...copiarObjeto(
            jogador
          ),

          historico,

          historicoPontuacoes

        };

      }
    );

  }


  /* =======================================================
     FILTRO POR POSIÇÃO
     ======================================================= */

  function filtrarJogadoresPorPosicao(
    jogadores,
    posicao
  ) {

    const lista =
      Array.isArray(
        jogadores
      )
        ? jogadores
        : [];


    const codigo =
      texto(
        posicao
      ).toUpperCase();


    if (
      !codigo ||
      codigo === "TODAS" ||
      codigo === "TODOS" ||
      codigo === "ALL"
    ) {

      return lista.slice();

    }


    if (
      !POSICOES_VALIDAS.includes(
        codigo
      )
    ) {

      return lista.slice();

    }


    return lista.filter(
      jogador =>
        texto(
          jogador?.posicao
        ).toUpperCase() ===
        codigo
    );

  }


  /* =======================================================
     MÉTRICAS DERIVADAS
     ======================================================= */

  function calcularResumoRodada(
    dadosRodada,
    posicao = null
  ) {

    if (
      !dadosRodada
    ) {

      return null;

    }


    const jogadores =
      filtrarJogadoresPorPosicao(
        dadosRodada.jogadores,
        posicao
      );


    const comparaveis =
      jogadores.filter(
        jogador =>
          numero(
            jogador.projecao,
            null
          ) !== null &&
          numero(
            jogador.real,
            null
          ) !== null
      );


    const erros =
      comparaveis.map(
        jogador =>
          Math.abs(
            jogador.projecao -
            jogador.real
          )
      );


    const erroMedioCalculado =
      erros.length
        ? erros.reduce(
            (
              soma,
              valor
            ) =>
              soma + valor,
            0
          ) /
          erros.length
        : null;


    return {

      rodada:
        dadosRodada.rodada,

      jogadores:
        jogadores.length,

      comparaveis:
        comparaveis.length,

      erroMedio:
        dadosRodada
          ?.metricas
          ?.erroMedio ??
        (
          erroMedioCalculado !== null
            ? arredondar(
                erroMedioCalculado,
                2
              )
            : null
        ),

      top5:
        dadosRodada
          ?.metricas
          ?.top5 ??
        null,

      correlacao:
        dadosRodada
          ?.metricas
          ?.correlacao ??
        null,

      capitao:
        dadosRodada
          ?.metricas
          ?.capitao ??
        null

    };

  }


  /* =======================================================
     RODADAS DISPONÍVEIS
     ======================================================= */

  async function obterRodadasDisponiveis() {

    const indice =
      await carregarIndice();


    return [
      ...indice.rodadas
    ];

  }


  /* =======================================================
     VERIFICA DISPONIBILIDADE
     ======================================================= */

  async function possuiHistorico() {

    const rodadas =
      await obterRodadasDisponiveis();


    return rodadas.length > 0;

  }


  /* =======================================================
     LIMPEZA DO CACHE
     ======================================================= */

  function limparCache() {

    cacheRodadas.clear();


    cacheIndice =
      null;


    promessaIndice =
      null;


    rodadaAtualCache =
      null;


    console.info(
      "Histórico: cache limpo."
    );

  }


  /* =======================================================
     ESTADO
     ======================================================= */

  function obterEstado() {

    return {

      indiceCarregado:
        Boolean(
          cacheIndice
        ),

      rodadasEmCache:
        [
          ...cacheRodadas.keys()
        ]
          .sort(
            (
              a,
              b
            ) =>
              a - b
          ),

      quantidadeRodadasCache:
        cacheRodadas.size,

      rodadaAtual:
        rodadaAtualCache,

      indice:
        cacheIndice
          ? copiarObjeto(
              cacheIndice
            )
          : null

    };

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  return {

    carregarIndice,

    carregarRodada,

    carregarRodadas,

    carregarHistoricoAtleta,

    montarHistoricoJogadores,

    obterRodadasDisponiveis,

    possuiHistorico,

    filtrarJogadoresPorPosicao,

    calcularResumoRodada,

    limparCache,

    obterEstado

  };


})();


/* =========================================================
   COMPATIBILIDADE COM CÓDIGO ANTIGO
   ========================================================= */


/*
 * Mantemos funções globais porque os módulos antigos
 * do Histórico podem chamá-las diretamente.
 */


async function carregarIndice() {

  return HistoricoDados
    .carregarIndice();

}


async function carregarRodada(
  rodada
) {

  return HistoricoDados
    .carregarRodada(
      rodada
    );

}


async function carregarRodadas(
  rodadas = null
) {

  return HistoricoDados
    .carregarRodadas(
      rodadas
    );

}


async function montarHistoricoJogadores(
  jogadores
) {

  return HistoricoDados
    .montarHistoricoJogadores(
      jogadores
    );

}


async function obterRodadasHistorico() {

  return HistoricoDados
    .obterRodadasDisponiveis();

}


/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */

if (
  typeof window !==
  "undefined"
) {

  window.HistoricoDados =
    HistoricoDados;


  window.CartolaHistoricoDados =
    HistoricoDados;


  window.carregarIndice =
    carregarIndice;


  window.carregarRodada =
    carregarRodada;


  window.carregarRodadas =
    carregarRodadas;


  window.montarHistoricoJogadores =
    montarHistoricoJogadores;


  window.obterRodadasHistorico =
    obterRodadasHistorico;

}


/* =========================================================
   PRÉ-CARREGAMENTO LEVE
   ========================================================= */

if (
  typeof window !==
  "undefined"
) {

  window.addEventListener(
    "load",
    () => {

      setTimeout(
        async () => {

          try {

            const indice =
              await HistoricoDados
                .carregarIndice();


            console.info(
              "Histórico disponível:",
              indice.total,
              "rodada(s)."
            );


          } catch (erro) {

            console.warn(
              "Histórico ainda não disponível:",
              erro
            );

          }

        },
        250
      );

    }
  );

}
