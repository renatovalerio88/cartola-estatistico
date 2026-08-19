/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — dados

   VERSÃO CONSOLIDADA

   Compatível com:

   1) data/historico/rodada-XX.json

   2) data/historico/rodada-XX/
        jogadores.json
        metricas.json

   Responsabilidades:
   - descobrir rodadas disponíveis;
   - carregar rodada;
   - normalizar jogadores;
   - normalizar métricas;
   - controlar rodada selecionada;
   - controlar posição selecionada;
   - fornecer API para cards e filtros.
   ========================================================= */


const HistoricoDados = (() => {

  "use strict";


  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */

  const CAMINHO_STATUS =
    "data/api/status.json";


  const CAMINHO_HISTORICO =
    "data/historico";


  const POSICOES_VALIDAS = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    carregado: false,

    carregando: false,

    erro: null,

    rodadaAtual: null,

    rodadaSelecionada: null,

    posicaoSelecionada: "TODOS",

    rodadasDisponiveis: [],

    rodadas: new Map(),

    jogadores: [],

    jogadoresFiltrados: [],

    ultimaAtualizacao: null

  };


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
        valor ?? ""
      ).trim();


    return resultado ||
      padrao;

  }


  function inteiro(
    valor,
    padrao = null
  ) {

    const convertido =
      numero(
        valor,
        padrao
      );


    if (
      convertido === null
    ) {

      return padrao;

    }


    return Math.trunc(
      convertido
    );

  }


  function arredondar(
    valor,
    casas = 2
  ) {

    const convertido =
      numero(
        valor,
        null
      );


    if (
      convertido === null
    ) {

      return null;

    }


    return Number(
      convertido.toFixed(
        casas
      )
    );

  }


  function copiarObjeto(
    objeto
  ) {

    if (
      !objeto ||
      typeof objeto !== "object"
    ) {

      return objeto;

    }


    return {
      ...objeto
    };

  }


  function copiarJogador(
    jogador
  ) {

    return {

      ...jogador,

      scouts: {
        ...(jogador?.scouts || {})
      }

    };

  }


  /* =======================================================
     FETCH
     ======================================================= */

  async function buscarJson(
    caminho
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

        return null;

      }


      return await resposta.json();


    } catch (_) {

      return null;

    }

  }


  /* =======================================================
     STATUS
     ======================================================= */

  async function carregarStatus() {

    const dados =
      await buscarJson(
        CAMINHO_STATUS
      );


    if (!dados) {

      return null;

    }


    const rodada =
      inteiro(
        dados.rodada_atual
        ??
        dados.rodadaAtual
        ??
        dados.rodada,
        null
      );


    if (
      rodada !== null
    ) {

      estado.rodadaAtual =
        rodada;

    }


    estado.ultimaAtualizacao =
      dados.ultima_atualizacao
      ??
      dados.ultimaAtualizacao
      ??
      dados.atualizado_em
      ??
      null;


    return dados;

  }


  /* =======================================================
     NORMALIZA POSIÇÃO
     ======================================================= */

  function normalizarPosicao(
    valor
  ) {

    const codigo =
      texto(
        valor
      ).toUpperCase();


    const mapa = {

      GOLEIRO:
        "GOL",

      GOLEIROS:
        "GOL",

      LATERAL:
        "LAT",

      LATERAIS:
        "LAT",

      ZAGUEIRO:
        "ZAG",

      ZAGUEIROS:
        "ZAG",

      MEIA:
        "MEI",

      MEIAS:
        "MEI",

      ATACANTE:
        "ATA",

      ATACANTES:
        "ATA",

      TECNICO:
        "TEC",

      TÉCNICO:
        "TEC",

      TREINADOR:
        "TEC",

      TREINADORES:
        "TEC"

    };


    if (
      POSICOES_VALIDAS.includes(
        codigo
      )
    ) {

      return codigo;

    }


    return mapa[codigo] || codigo;

  }


  /* =======================================================
     NORMALIZA JOGADOR
     ======================================================= */

  function normalizarJogador(
    jogador,
    rodada
  ) {

    if (
      !jogador ||
      typeof jogador !== "object"
    ) {

      return null;

    }


    const projecao =
      numero(
        jogador.projecao
        ??
        jogador.projecaoOriginal
        ??
        jogador.projecao_calculada
        ??
        jogador.score,
        null
      );


    const real =
      numero(
        jogador.real
        ??
        jogador.pontuacaoReal
        ??
        jogador.pontuacao
        ??
        jogador.pontos,
        null
      );


    let erro =
      numero(
        jogador.erro,
        null
      );


    if (
      erro === null &&
      projecao !== null &&
      real !== null
    ) {

      erro =
        Math.abs(
          real -
          projecao
        );

    }


    return {

      ...jogador,

      id:
        jogador.id
        ??
        jogador.atletaId
        ??
        jogador.atleta_id
        ??
        null,

      rodada:
        inteiro(
          jogador.rodada,
          rodada
        ),

      nome:
        texto(
          jogador.apelido
          ??
          jogador.nome
          ??
          jogador.nomeCompleto,
          "Jogador"
        ),

      apelido:
        texto(
          jogador.apelido
          ??
          jogador.nome,
          "Jogador"
        ),

      posicao:
        normalizarPosicao(
          jogador.posicao
          ??
          jogador.posicaoSigla
          ??
          jogador.posicao_sigla
        ),

      clube:
        texto(
          jogador.siglaClube
          ??
          jogador.clube
          ??
          jogador.clubeSigla
        ).toUpperCase(),

      siglaClube:
        texto(
          jogador.siglaClube
          ??
          jogador.clube
          ??
          jogador.clubeSigla
        ).toUpperCase(),

      preco:
        numero(
          jogador.preco
          ??
          jogador.precoNum,
          null
        ),

      media:
        numero(
          jogador.media
          ??
          jogador.mediaGeral,
          null
        ),

      jogos:
        numero(
          jogador.jogos,
          null
        ),

      projecao,

      real,

      pontuacaoReal:
        real,

      erro:
        erro !== null
          ? arredondar(
              Math.abs(erro),
              2
            )
          : null,

      top5:
        jogador.top5 === true,

      capitao:
        jogador.capitao === true,

      scouts: {
        ...(jogador.scouts || {})
      }

    };

  }


  /* =======================================================
     NORMALIZA LISTA
     ======================================================= */

  function normalizarJogadores(
    lista,
    rodada
  ) {

    if (
      !Array.isArray(
        lista
      )
    ) {

      return [];

    }


    return lista
      .map(
        jogador =>
          normalizarJogador(
            jogador,
            rodada
          )
      )
      .filter(Boolean);

  }


  /* =======================================================
     NORMALIZA MÉTRICAS
     ======================================================= */

  function normalizarTop5(
    valor
  ) {

    if (
      valor &&
      typeof valor === "object"
    ) {

      return {

        acertos:
          numero(
            valor.acertos,
            0
          ),

        total:
          numero(
            valor.total,
            5
          )

      };

    }


    if (
      typeof valor === "string"
    ) {

      const partes =
        valor
          .split("/")
          .map(
            item =>
              numero(
                item.trim(),
                null
              )
          );


      return {

        acertos:
          partes[0] ?? 0,

        total:
          partes[1] ?? 5

      };

    }


    return {

      acertos: 0,

      total: 5

    };

  }


  function normalizarCapitao(
    valor
  ) {

    if (
      valor &&
      typeof valor === "object"
    ) {

      return {

        acertou:
          valor.acertou === true,

        jogador:
          valor.jogador
          ??
          null

      };

    }


    return {

      acertou:
        texto(
          valor
        ).toLowerCase() ===
        "acertou",

      jogador:
        null

    };

  }


  function normalizarMetricas(
    dados,
    rodada
  ) {

    const origem =
      dados &&
      typeof dados === "object"
        ? dados
        : {};


    return {

      rodada,

      erroMedio:
        numero(
          origem.erroMedio
          ??
          origem.mae,
          null
        ),

      mae:
        numero(
          origem.mae
          ??
          origem.erroMedio,
          null
        ),

      maiorErro:
        numero(
          origem.maiorErro,
          null
        ),

      menorErro:
        numero(
          origem.menorErro,
          null
        ),

      taxaAcerto:
        numero(
          origem.taxaAcerto,
          null
        ),

      quantidade:
        numero(
          origem.quantidade,
          null
        ),

      correlacao:
        numero(
          origem.correlacao,
          null
        ),

      top5:
        normalizarTop5(
          origem.top5
        ),

      capitao:
        normalizarCapitao(
          origem.capitao
        ),

      vies:
        numero(
          origem.vies,
          null
        )

    };

  }


  /* =======================================================
     CARREGA FORMATO ARQUIVO ÚNICO
     ======================================================= */

  async function carregarFormatoArquivo(
    rodada
  ) {

    const codigo =
      String(
        rodada
      ).padStart(
        2,
        "0"
      );


    const caminho =
      `${CAMINHO_HISTORICO}/rodada-${codigo}.json`;


    const dados =
      await buscarJson(
        caminho
      );


    if (
      !dados ||
      typeof dados !== "object"
    ) {

      return null;

    }


    const jogadores =
      normalizarJogadores(
        dados.jogadores,
        rodada
      );


    if (
      jogadores.length === 0 &&
      !numero(
        dados.quantidade,
        0
      )
    ) {

      return null;

    }


    return {

      numero:
        rodada,

      rodada,

      arquivo:
        caminho,

      formato:
        "arquivo",

      jogadores,

      metricas:
        normalizarMetricas(
          dados,
          rodada
        ),

      bruto:
        dados

    };

  }


  /* =======================================================
     CARREGA FORMATO PASTA
     ======================================================= */

  async function carregarFormatoPasta(
    rodada
  ) {

    const codigo =
      String(
        rodada
      ).padStart(
        2,
        "0"
      );


    const base =
      `${CAMINHO_HISTORICO}/rodada-${codigo}`;


    const [
      jogadoresDados,
      metricasDados
    ] =
      await Promise.all([

        buscarJson(
          `${base}/jogadores.json`
        ),

        buscarJson(
          `${base}/metricas.json`
        )

      ]);


    if (
      !Array.isArray(
        jogadoresDados
      ) &&
      !metricasDados
    ) {

      return null;

    }


    const jogadores =
      normalizarJogadores(
        Array.isArray(
          jogadoresDados
        )
          ? jogadoresDados
          : metricasDados?.jogadores,
        rodada
      );


    return {

      numero:
        rodada,

      rodada,

      arquivo:
        base,

      formato:
        "pasta",

      jogadores,

      metricas:
        normalizarMetricas(
          metricasDados,
          rodada
        ),

      bruto: {

        jogadores:
          jogadoresDados,

        metricas:
          metricasDados

      }

    };

  }


  /* =======================================================
     CARREGA UMA RODADA
     ======================================================= */

  async function carregarRodada(
    rodada
  ) {

    const numeroRodada =
      inteiro(
        rodada,
        null
      );


    if (
      numeroRodada === null ||
      numeroRodada <= 0
    ) {

      return null;

    }


    if (
      estado.rodadas.has(
        numeroRodada
      )
    ) {

      return estado
        .rodadas
        .get(
          numeroRodada
        );

    }


    /*
     * Primeiro tenta o formato atual:
     *
     * data/historico/rodada-XX.json
     */

    let resultado =
      await carregarFormatoArquivo(
        numeroRodada
      );


    /*
     * Se não existir, tenta o formato antigo:
     *
     * data/historico/rodada-XX/
     */

    if (!resultado) {

      resultado =
        await carregarFormatoPasta(
          numeroRodada
        );

    }


    if (!resultado) {

      return null;

    }


    estado.rodadas.set(
      numeroRodada,
      resultado
    );


    return resultado;

  }


  /* =======================================================
     DESCOBRE RODADAS
     ======================================================= */

  async function descobrirRodadas() {

    await carregarStatus();


    let limite =
      estado.rodadaAtual;


    /*
     * Fallback caso status.json não carregue.
     */

    if (
      !limite ||
      limite <= 0
    ) {

      limite = 50;

    }


    const tentativas = [];


    for (
      let rodada = 1;
      rodada <= limite;
      rodada += 1
    ) {

      tentativas.push(
        carregarRodada(
          rodada
        )
      );

    }


    const resultados =
      await Promise.all(
        tentativas
      );


    const disponiveis =
      resultados
        .filter(Boolean)
        .map(
          item =>
            Number(
              item.rodada
            )
        )
        .filter(
          Number.isFinite
        )
        .sort(
          (
            a,
            b
          ) =>
            a - b
        );


    estado.rodadasDisponiveis =
      [
        ...new Set(
          disponiveis
        )
      ];


    return [
      ...estado.rodadasDisponiveis
    ];

  }


  /* =======================================================
     CARREGA ÍNDICE
     ======================================================= */

  async function carregarIndice() {

    const rodadas =
      await descobrirRodadas();


    return {

      total:
        rodadas.length,

      ultimaRodada:
        rodadas.length
          ? Math.max(
              ...rodadas
            )
          : null,

      rodadas:
        rodadas.map(
          numeroRodada => ({

            numero:
              numeroRodada,

            status:
              "finalizada",

            arquivo:
              `rodada-${String(
                numeroRodada
              ).padStart(
                2,
                "0"
              )}`

          })
        )

    };

  }


  /* =======================================================
     APLICA POSIÇÃO
     ======================================================= */

  function aplicarFiltroPosicao() {

    if (
      estado.posicaoSelecionada ===
      "TODOS"
    ) {

      estado.jogadoresFiltrados =
        estado.jogadores.map(
          copiarJogador
        );


      return estado
        .jogadoresFiltrados;

    }


    estado.jogadoresFiltrados =
      estado.jogadores
        .filter(
          jogador =>
            normalizarPosicao(
              jogador.posicao
            ) ===
            estado.posicaoSelecionada
        )
        .map(
          copiarJogador
        );


    return estado
      .jogadoresFiltrados;

  }


  /* =======================================================
     SELECIONA RODADA
     ======================================================= */

  async function selecionarRodada(
    rodada
  ) {

    const numeroRodada =
      inteiro(
        rodada,
        null
      );


    if (
      numeroRodada === null
    ) {

      return null;

    }


    const dados =
      await carregarRodada(
        numeroRodada
      );


    if (!dados) {

      return null;

    }


    estado.rodadaSelecionada =
      numeroRodada;


    estado.jogadores =
      dados.jogadores.map(
        copiarJogador
      );


    aplicarFiltroPosicao();


    return dados;

  }


  /* =======================================================
     SELECIONA POSIÇÃO
     ======================================================= */

  function selecionarPosicao(
    posicao
  ) {

    const codigo =
      texto(
        posicao,
        "TODOS"
      ).toUpperCase();


    estado.posicaoSelecionada =
      codigo === "TODOS"
        ? "TODOS"
        : normalizarPosicao(
            codigo
          );


    aplicarFiltroPosicao();


    return estado
      .posicaoSelecionada;

  }


  /* =======================================================
     CARREGAMENTO PRINCIPAL
     ======================================================= */

  async function carregar() {

    if (
      estado.carregado
    ) {

      return obterEstado();

    }


    if (
      estado.carregando
    ) {

      return obterEstado();

    }


    estado.carregando =
      true;


    estado.erro =
      null;


    try {

      const rodadas =
        await descobrirRodadas();


      if (
        rodadas.length === 0
      ) {

        throw new Error(
          "Nenhuma rodada histórica encontrada."
        );

      }


      /*
       * Seleciona a rodada mais recente disponível.
       */

      const rodadaInicial =
        Math.max(
          ...rodadas
        );


      await selecionarRodada(
        rodadaInicial
      );


      estado.carregado =
        true;


      console.info(
        "Histórico carregado:",
        {
          rodadas:
            estado.rodadasDisponiveis,

          rodadaSelecionada:
            estado.rodadaSelecionada,

          jogadores:
            estado.jogadores.length,

          posicao:
            estado.posicaoSelecionada
        }
      );


      return obterEstado();


    } catch (erro) {

      estado.erro =
        erro?.message
        ??
        String(
          erro
        );


      console.error(
        "Erro ao carregar Histórico:",
        erro
      );


      return obterEstado();


    } finally {

      estado.carregando =
        false;

    }

  }


  /* =======================================================
     CARREGA VÁRIAS RODADAS
     ======================================================= */

  async function carregarRodadas(
    rodadas = null
  ) {

    const lista =
      Array.isArray(
        rodadas
      )
        ? rodadas
        : (
            estado
              .rodadasDisponiveis
              .length > 0
              ? estado
                  .rodadasDisponiveis
              : await descobrirRodadas()
          );


    const resultados =
      await Promise.all(
        lista.map(
          carregarRodada
        )
      );


    return resultados
      .filter(Boolean);

  }


  /* =======================================================
     HISTÓRICO INDIVIDUAL
     ======================================================= */

  async function carregarHistoricoAtleta(
    atletaId
  ) {

    const rodadas =
      await carregarRodadas();


    const id =
      texto(
        atletaId
      );


    return rodadas
      .map(
        rodada =>
          rodada.jogadores.find(
            jogador =>
              texto(
                jogador.id
              ) === id
          )
      )
      .filter(Boolean);

  }


  /* =======================================================
     MONTA HISTÓRICO NOS JOGADORES
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


    return jogadores.map(
      jogador => {

        const id =
          texto(
            jogador.id
          );


        const historico =
          rodadas
            .map(
              rodada =>
                rodada.jogadores.find(
                  item =>
                    texto(
                      item.id
                    ) === id
                )
            )
            .filter(Boolean)
            .sort(
              (
                a,
                b
              ) =>
                numero(
                  a.rodada,
                  0
                ) -
                numero(
                  b.rodada,
                  0
                )
            );


        return {

          ...jogador,

          historico,

          historicoPontuacoes:
            historico
              .map(
                item =>
                  numero(
                    item.real,
                    null
                  )
              )
              .filter(
                valor =>
                  valor !== null
              )

        };

      }
    );

  }


  /* =======================================================
     OBTENÇÕES
     ======================================================= */

  function obterRodadasDisponiveis() {

    return [
      ...estado
        .rodadasDisponiveis
    ];

  }


  function obterRodada() {

    if (
      estado.rodadaSelecionada ===
      null
    ) {

      return null;

    }


    const rodada =
      estado
        .rodadas
        .get(
          estado.rodadaSelecionada
        );


    if (!rodada) {

      return null;

    }


    return {

      ...rodada,

      jogadores:
        rodada.jogadores.map(
          copiarJogador
        ),

      metricas:
        copiarObjeto(
          rodada.metricas
        )

    };

  }


  function obterJogadores() {

    return estado
      .jogadoresFiltrados
      .map(
        copiarJogador
      );

  }


  function obterTodosJogadoresDaRodada() {

    return estado
      .jogadores
      .map(
        copiarJogador
      );

  }


  function possuiHistorico() {

    return (
      estado
        .rodadasDisponiveis
        .length > 0
    );

  }


  function filtrarJogadoresPorPosicao(
    jogadores,
    posicao
  ) {

    if (
      !Array.isArray(
        jogadores
      )
    ) {

      return [];

    }


    const codigo =
      texto(
        posicao,
        "TODOS"
      ).toUpperCase();


    if (
      codigo ===
      "TODOS"
    ) {

      return jogadores.map(
        copiarJogador
      );

    }


    return jogadores
      .filter(
        jogador =>
          normalizarPosicao(
            jogador.posicao
          ) ===
          normalizarPosicao(
            codigo
          )
      )
      .map(
        copiarJogador
      );

  }


  /* =======================================================
     RESUMO DA RODADA
     ======================================================= */

  function calcularResumoRodada(
    rodada = null
  ) {

    const dados =
      rodada
      ??
      obterRodada();


    if (!dados) {

      return null;

    }


    const jogadores =
      dados.jogadores || [];


    const validos =
      jogadores.filter(
        jogador =>
          numero(
            jogador.projecao,
            null
          ) !== null
          &&
          numero(
            jogador.real,
            null
          ) !== null
      );


    if (
      validos.length === 0
    ) {

      return {

        rodada:
          dados.rodada,

        quantidade:
          0,

        erroMedio:
          dados
            .metricas
            ?.erroMedio
            ??
            null

      };

    }


    const erroMedio =
      validos.reduce(
        (
          soma,
          jogador
        ) =>
          soma +
          Math.abs(
            numero(
              jogador.real,
              0
            ) -
            numero(
              jogador.projecao,
              0
            )
          ),
        0
      ) /
      validos.length;


    return {

      rodada:
        dados.rodada,

      quantidade:
        validos.length,

      erroMedio:
        arredondar(
          erroMedio,
          2
        ),

      metricas:
        dados.metricas

    };

  }


  /* =======================================================
     LIMPA CACHE
     ======================================================= */

  function limparCache() {

    estado.rodadas.clear();

    estado.rodadasDisponiveis =
      [];

    estado.jogadores =
      [];

    estado.jogadoresFiltrados =
      [];

    estado.rodadaSelecionada =
      null;

    estado.carregado =
      false;

    estado.erro =
      null;

  }


  /* =======================================================
     ESTADO
     ======================================================= */

  function obterEstado() {

    return {

      carregado:
        estado.carregado,

      carregando:
        estado.carregando,

      erro:
        estado.erro,

      rodadaAtual:
        estado.rodadaAtual,

      rodadaSelecionada:
        estado.rodadaSelecionada,

      posicaoSelecionada:
        estado.posicaoSelecionada,

      rodadasDisponiveis: [
        ...estado
          .rodadasDisponiveis
      ],

      quantidadeRodadas:
        estado
          .rodadasDisponiveis
          .length,

      quantidadeJogadores:
        estado.jogadores.length,

      quantidadeJogadoresFiltrados:
        estado
          .jogadoresFiltrados
          .length,

      ultimaAtualizacao:
        estado.ultimaAtualizacao

    };

  }


  /* =======================================================
     API
     ======================================================= */

  return {

    carregar,

    carregarIndice,

    carregarRodada,

    carregarRodadas,

    carregarHistoricoAtleta,

    montarHistoricoJogadores,

    descobrirRodadas,

    selecionarRodada,

    selecionarPosicao,

    obterRodadasDisponiveis,

    obterRodada,

    obterJogadores,

    obterTodosJogadoresDaRodada,

    possuiHistorico,

    filtrarJogadoresPorPosicao,

    calcularResumoRodada,

    limparCache,

    obterEstado

  };


})();


/* =========================================================
   COMPATIBILIDADE COM MÓDULOS ANTIGOS
   ========================================================= */

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
   PRÉ-CARREGAMENTO
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

            await HistoricoDados
              .carregar();

          } catch (erro) {

            console.warn(
              "Histórico ainda não disponível:",
              erro
            );

          }

        },
        150
      );

    }
  );

}
