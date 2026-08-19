/* =========================================================
   CARTOLA ESTATÍSTICO
   Análise da rodada

   Responsabilidades:

   - carregar partidas da rodada atual;
   - utilizar jogadores já processados pelo modelo;
   - analisar confrontos;
   - identificar ataques favorecidos;
   - estimar chance relativa de SG;
   - identificar jogos mais abertos;
   - identificar posições favorecidas;
   - preencher a aba "Análise da rodada";
   - remover mensagens provisórias do MVP.

   ========================================================= */


const AnaliseRodada = (() => {


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    rodada: null,

    partidas: [],

    jogadores: [],

    confrontos: [],

    carregado: false,

    carregando: false,

    erro: null

  };


  /* =======================================================
     CONSTANTES
     ======================================================= */

  const POSICOES_ANALISE = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA"
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
     NÚMEROS
     ======================================================= */

  function numero(
    valor,
    padrao = 0
  ) {

    const resultado =
      Number(valor);


    return Number.isFinite(
      resultado
    )
      ? resultado
      : padrao;

  }


  function limitar(
    valor,
    minimo,
    maximo
  ) {

    return Math.max(
      minimo,
      Math.min(
        maximo,
        valor
      )
    );

  }


  function arredondar(
    valor,
    casas = 1
  ) {

    const fator =
      10 ** casas;


    return (
      Math.round(
        numero(valor) *
        fator
      ) /
      fator
    );

  }


  /* =======================================================
     TEXTO
     ======================================================= */

  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    ).trim();

  }


  function normalizarSigla(
    valor
  ) {

    return texto(
      valor
    )
      .toUpperCase()
      .trim();

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


  /* =======================================================
     FORMATAÇÃO
     ======================================================= */

  function formatarNumero(
    valor,
    casas = 1
  ) {

    const resultado =
      Number(valor);


    if (
      !Number.isFinite(
        resultado
      )
    ) {

      return "--";

    }


    return resultado
      .toFixed(
        casas
      )
      .replace(
        ".",
        ","
      );

  }


  function formatarPercentual(
    valor
  ) {

    return (
      `${formatarNumero(
        valor,
        0
      )}%`
    );

  }


  /* =======================================================
     BUSCA JSON
     ======================================================= */

  async function buscarJson(
    caminho
  ) {

    try {

      const resposta =
        await fetch(
          `${caminho}?v=${Date.now()}`,
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


    } catch (erro) {

      console.warn(
        "Falha ao carregar:",
        caminho,
        erro
      );


      return null;

    }

  }


  /* =======================================================
     RODADA ATUAL
     ======================================================= */

  async function obterRodadaAtual() {

    const status =
      await buscarJson(
        "data/api/status.json"
      );


    const rodada =
      numero(
        status?.rodada_atual
        ??
        status?.rodada,
        0
      );


    return rodada > 0
      ? Math.floor(
          rodada
        )
      : null;

  }


  /* =======================================================
     PARTIDAS
     ======================================================= */

  async function carregarPartidas(
    rodada
  ) {

    const numeroRodada =
      String(
        rodada
      ).padStart(
        2,
        "0"
      );


    const caminhos = [

      `data/api/rodada-${numeroRodada}/partidas.json`,

      `data/api/rodada-${rodada}/partidas.json`

    ];


    for (
      const caminho
      of caminhos
    ) {

      const dados =
        await buscarJson(
          caminho
        );


      if (dados) {

        return normalizarPartidas(
          dados
        );

      }

    }


    return [];

  }


  /* =======================================================
     NORMALIZA PARTIDAS
     ======================================================= */

  function normalizarPartidas(
    dados
  ) {

    let lista = [];


    if (
      Array.isArray(
        dados
      )
    ) {

      lista = dados;

    }
    else if (
      Array.isArray(
        dados?.partidas
      )
    ) {

      lista =
        dados.partidas;

    }


    return lista
      .filter(
        partida =>
          partida &&
          typeof partida ===
            "object"
      )
      .map(
        partida => {

          const mandante = {

            id:
              partida.clube_casa_id
              ??
              partida.mandante_id
              ??
              partida.clubeCasaId,

            nome:
              partida.clube_casa
                ?.nome
              ??
              partida.mandante
                ?.nome
              ??
              partida.nome_clube_casa
              ??
              "",

            sigla:
              partida.clube_casa
                ?.abreviacao
              ??
              partida.mandante
                ?.abreviacao
              ??
              partida.clube_casa
                ?.sigla
              ??
              partida.mandante
                ?.sigla
              ??
              ""

          };


          const visitante = {

            id:
              partida.clube_visitante_id
              ??
              partida.visitante_id
              ??
              partida.clubeVisitanteId,

            nome:
              partida.clube_visitante
                ?.nome
              ??
              partida.visitante
                ?.nome
              ??
              partida.nome_clube_visitante
              ??
              "",

            sigla:
              partida.clube_visitante
                ?.abreviacao
              ??
              partida.visitante
                ?.abreviacao
              ??
              partida.clube_visitante
                ?.sigla
              ??
              partida.visitante
                ?.sigla
              ??
              ""

          };


          return {

            original:
              partida,

            mandante,

            visitante,

            local:
              partida.local
              ??
              partida.estadio
              ??
              "",

            data:
              partida.partida_data
              ??
              partida.data
              ??
              null

          };

        }
      );

  }


  /* =======================================================
     JOGADORES PROCESSADOS
     ======================================================= */

  function carregarJogadoresProcessados() {

    let jogadores = [];


    if (
      typeof window !==
        "undefined" &&
      window.CartolaRecomendacoes &&
      typeof window
        .CartolaRecomendacoes
        .obterJogadores ===
        "function"
    ) {

      jogadores =
        window
          .CartolaRecomendacoes
          .obterJogadores();

    }
    else if (
      typeof window !==
        "undefined" &&
      typeof window
        .obterJogadoresCarregados ===
        "function"
    ) {

      jogadores =
        window
          .obterJogadoresCarregados();

    }
    else if (
      typeof window !==
        "undefined" &&
      typeof window.obterJogadores ===
        "function"
    ) {

      jogadores =
        window.obterJogadores();

    }


    return Array.isArray(
      jogadores
    )
      ? jogadores
      : [];

  }


  /* =======================================================
     SIGLA DO JOGADOR
     ======================================================= */

  function obterSiglaJogador(
    jogador
  ) {

    return normalizarSigla(

      jogador?.siglaClube

      ??

      jogador?.clubeSigla

      ??

      jogador?.clube

    );

  }


  /* =======================================================
     POSIÇÃO
     ======================================================= */

  function obterPosicaoJogador(
    jogador
  ) {

    return normalizarSigla(
      jogador?.posicao
    );

  }


  /* =======================================================
     DISPONIBILIDADE
     ======================================================= */

  function jogadorDisponivel(
    jogador
  ) {

    if (!jogador) {

      return false;

    }


    const statusId =
      numero(
        jogador.statusId
        ??
        jogador.status_id,
        7
      );


    /*
     * No Cartola, 7 normalmente representa
     * atleta provável.
     *
     * Entretanto, dados históricos e versões
     * diferentes do normalizador podem não
     * possuir statusId.
     *
     * Portanto a ausência do status não elimina.
     */

    if (
      jogador.statusId !==
        undefined &&
      jogador.statusId !==
        null &&
      statusId !== 7
    ) {

      return false;

    }


    return true;

  }


  /* =======================================================
     NOTA DO JOGADOR
     ======================================================= */

  function obterNota(
    jogador
  ) {

    return numero(

      jogador?.notaFinal

      ??

      jogador?.scoreFinal

      ??

      jogador?.score

      ??

      jogador?.nota,

      0

    );

  }


  /* =======================================================
     PROJEÇÃO
     ======================================================= */

  function obterProjecao(
    jogador
  ) {

    return numero(

      jogador?.projecao

      ??

      jogador?.projecaoCalibrada

      ??

      jogador?.projecaoOriginal,

      0

    );

  }


  /* =======================================================
     PISO
     ======================================================= */

  function obterPiso(
    jogador
  ) {

    return numero(
      jogador?.piso,
      0
    );

  }


  /* =======================================================
     TETO
     ======================================================= */

  function obterTeto(
    jogador
  ) {

    return numero(
      jogador?.teto,
      0
    );

  }


  /* =======================================================
     CONFIANÇA
     ======================================================= */

  function obterConfianca(
    jogador
  ) {

    return numero(

      jogador?.confiancaNumerica

      ??

      jogador?.confianca,

      50

    );

  }


  /* =======================================================
     REGULARIDADE
     ======================================================= */

  function obterRegularidade(
    jogador
  ) {

    return numero(
      jogador?.regularidade,
      50
    );

  }


  /* =======================================================
     ADEQUAÇÃO
     ======================================================= */

  function obterAdequacao(
    jogador
  ) {

    return numero(

      jogador?.adequacaoRodada

      ??

      jogador
        ?.resumoAdequacao
        ?.nota

      ??

      jogador
        ?.resumoAdequacao
        ?.notaFinal

      ??

      jogador?.notaAdequacao,

      50

    );

  }


  /* =======================================================
     MÉDIA
     ======================================================= */

  function media(
    valores
  ) {

    const validos =
      valores
        .map(
          Number
        )
        .filter(
          Number.isFinite
        );


    if (
      validos.length === 0
    ) {

      return 0;

    }


    return validos.reduce(
      (
        total,
        valor
      ) =>
        total +
        valor,
      0
    ) /
    validos.length;

  }


  /* =======================================================
     JOGADORES DE UM CLUBE
     ======================================================= */

  function jogadoresDoClube(
    sigla
  ) {

    const clube =
      normalizarSigla(
        sigla
      );


    if (!clube) {

      return [];

    }


    return estado
      .jogadores
      .filter(
        jogador =>
          jogadorDisponivel(
            jogador
          ) &&
          obterSiglaJogador(
            jogador
          ) === clube
      );

  }


  /* =======================================================
     MÉTRICAS OFENSIVAS
     ======================================================= */

  function calcularForcaOfensiva(
    jogadores
  ) {

    const ofensivos =
      jogadores.filter(
        jogador => {

          const posicao =
            obterPosicaoJogador(
              jogador
            );


          return (
            posicao === "MEI" ||
            posicao === "ATA" ||
            posicao === "LAT"
          );

        }
      );


    if (
      ofensivos.length === 0
    ) {

      return 0;

    }


    const melhores =
      [
        ...ofensivos
      ]
        .sort(
          (
            a,
            b
          ) =>
            obterProjecao(
              b
            )
            -
            obterProjecao(
              a
            )
        )
        .slice(
          0,
          6
        );


    const projecao =
      media(
        melhores.map(
          obterProjecao
        )
      );


    const teto =
      media(
        melhores.map(
          obterTeto
        )
      );


    const nota =
      media(
        melhores.map(
          obterNota
        )
      );


    const adequacao =
      media(
        melhores.map(
          obterAdequacao
        )
      );


    return limitar(

      (
        projecao *
        4
      )
      +
      (
        teto *
        1.5
      )
      +
      (
        nota *
        0.28
      )
      +
      (
        adequacao *
        0.15
      ),

      0,
      100

    );

  }


  /* =======================================================
     MÉTRICAS DEFENSIVAS
     ======================================================= */

  function calcularForcaDefensiva(
    jogadores
  ) {

    const defensivos =
      jogadores.filter(
        jogador => {

          const posicao =
            obterPosicaoJogador(
              jogador
            );


          return (
            posicao === "GOL" ||
            posicao === "LAT" ||
            posicao === "ZAG"
          );

        }
      );


    if (
      defensivos.length === 0
    ) {

      return 0;

    }


    const melhores =
      [
        ...defensivos
      ]
        .sort(
          (
            a,
            b
          ) =>
            obterNota(
              b
            )
            -
            obterNota(
              a
            )
        )
        .slice(
          0,
          5
        );


    const piso =
      media(
        melhores.map(
          obterPiso
        )
      );


    const projecao =
      media(
        melhores.map(
          obterProjecao
        )
      );


    const confianca =
      media(
        melhores.map(
          obterConfianca
        )
      );


    const regularidade =
      media(
        melhores.map(
          obterRegularidade
        )
      );


    return limitar(

      (
        piso *
        4.2
      )
      +
      (
        projecao *
        2
      )
      +
      (
        confianca *
        0.27
      )
      +
      (
        regularidade *
        0.18
      ),

      0,
      100

    );

  }


  /* =======================================================
     MANDO
     ======================================================= */

  function bonusMando(
    mandante
  ) {

    return mandante
      ? 4
      : 0;

  }


  /* =======================================================
     CHANCE RELATIVA DE SG
     ======================================================= */

  function calcularChanceSG({
    defesa,
    ataqueAdversario,
    mandante
  }) {

    const base =
      50;


    const resultado =

      base

      +

      (
        defesa -
        ataqueAdversario
      ) *
      0.58

      +

      (
        mandante
          ? 5
          : -2
      );


    return limitar(
      resultado,
      5,
      90
    );

  }


  /* =======================================================
     POTENCIAL OFENSIVO NO CONFRONTO
     ======================================================= */

  function calcularPotencialAtaque({
    ataque,
    defesaAdversario,
    mandante
  }) {

    return limitar(

      ataque

      -

      defesaAdversario *
      0.42

      +

      bonusMando(
        mandante
      ),

      0,
      100

    );

  }


  /* =======================================================
     ANÁLISE POR POSIÇÃO
     ======================================================= */

  function calcularPosicoesClube(
    jogadores,
    potencialAtaque,
    chanceSG
  ) {

    const resultado = {};


    POSICOES_ANALISE
      .forEach(
        posicao => {

          const lista =
            jogadores.filter(
              jogador =>
                obterPosicaoJogador(
                  jogador
                ) === posicao
            );


          if (
            lista.length === 0
          ) {

            resultado[
              posicao
            ] = 0;


            return;

          }


          const melhores =
            [
              ...lista
            ]
              .sort(
                (
                  a,
                  b
                ) =>
                  obterNota(
                    b
                  )
                  -
                  obterNota(
                    a
                  )
              )
              .slice(
                0,
                3
              );


          let contexto = 50;


          if (
            posicao ===
              "ATA"
          ) {

            contexto =
              potencialAtaque;

          }
          else if (
            posicao ===
              "MEI"
          ) {

            contexto =
              potencialAtaque *
              0.9;

          }
          else if (
            posicao ===
              "LAT"
          ) {

            contexto =
              (
                potencialAtaque +
                chanceSG
              ) /
              2;

          }
          else {

            contexto =
              chanceSG;

          }


          resultado[
            posicao
          ] =
            limitar(

              media(
                melhores.map(
                  jogador =>

                    obterNota(
                      jogador
                    ) *
                    0.45

                    +

                    obterProjecao(
                      jogador
                    ) *
                    4

                    +

                    obterAdequacao(
                      jogador
                    ) *
                    0.15

                )
              ) *
              0.72

              +

              contexto *
              0.28,

              0,
              100

            );

        }
      );


    return resultado;

  }


  /* =======================================================
     ANALISA UM CONFRONTO
     ======================================================= */

  function analisarConfronto(
    partida
  ) {

    const siglaCasa =
      normalizarSigla(
        partida
          ?.mandante
          ?.sigla
      );


    const siglaFora =
      normalizarSigla(
        partida
          ?.visitante
          ?.sigla
      );


    const jogadoresCasa =
      jogadoresDoClube(
        siglaCasa
      );


    const jogadoresFora =
      jogadoresDoClube(
        siglaFora
      );


    const ataqueCasa =
      calcularForcaOfensiva(
        jogadoresCasa
      );


    const ataqueFora =
      calcularForcaOfensiva(
        jogadoresFora
      );


    const defesaCasa =
      calcularForcaDefensiva(
        jogadoresCasa
      );


    const defesaFora =
      calcularForcaDefensiva(
        jogadoresFora
      );


    const potencialCasa =
      calcularPotencialAtaque({

        ataque:
          ataqueCasa,

        defesaAdversario:
          defesaFora,

        mandante:
          true

      });


    const potencialFora =
      calcularPotencialAtaque({

        ataque:
          ataqueFora,

        defesaAdversario:
          defesaCasa,

        mandante:
          false

      });


    const sgCasa =
      calcularChanceSG({

        defesa:
          defesaCasa,

        ataqueAdversario:
          ataqueFora,

        mandante:
          true

      });


    const sgFora =
      calcularChanceSG({

        defesa:
          defesaFora,

        ataqueAdversario:
          ataqueCasa,

        mandante:
          false

      });


    const abertura =
      limitar(

        (
          potencialCasa +
          potencialFora
        ) /
        2

        +

        (
          100 -
          (
            sgCasa +
            sgFora
          ) /
          2
        ) *
        0.3,

        0,
        100

      );


    const posicoesCasa =
      calcularPosicoesClube(
        jogadoresCasa,
        potencialCasa,
        sgCasa
      );


    const posicoesFora =
      calcularPosicoesClube(
        jogadoresFora,
        potencialFora,
        sgFora
      );


    return {

      partida,

      casa: {

        sigla:
          siglaCasa,

        nome:
          partida
            ?.mandante
            ?.nome
          ||
          siglaCasa,

        jogadores:
          jogadoresCasa,

        ataque:
          arredondar(
            ataqueCasa
          ),

        defesa:
          arredondar(
            defesaCasa
          ),

        potencialAtaque:
          arredondar(
            potencialCasa
          ),

        chanceSG:
          arredondar(
            sgCasa
          ),

        posicoes:
          posicoesCasa

      },

      fora: {

        sigla:
          siglaFora,

        nome:
          partida
            ?.visitante
            ?.nome
          ||
          siglaFora,

        jogadores:
          jogadoresFora,

        ataque:
          arredondar(
            ataqueFora
          ),

        defesa:
          arredondar(
            defesaFora
          ),

        potencialAtaque:
          arredondar(
            potencialFora
          ),

        chanceSG:
          arredondar(
            sgFora
          ),

        posicoes:
          posicoesFora

      },

      abertura:
        arredondar(
          abertura
        )

    };

  }


  /* =======================================================
     ANALISA TODOS OS CONFRONTOS
     ======================================================= */

  function analisarConfrontos() {

    estado.confrontos =
      estado
        .partidas
        .map(
          analisarConfronto
        )
        .filter(
          confronto =>
            confronto.casa.sigla &&
            confronto.fora.sigla
        );


    return estado.confrontos;

  }


  /* =======================================================
     MELHOR ATAQUE
     ======================================================= */

  function obterMelhorAtaque() {

    const clubes = [];


    estado.confrontos
      .forEach(
        confronto => {

          clubes.push({
            ...confronto.casa,
            adversario:
              confronto.fora.sigla,
            mando:
              "Casa"
          });


          clubes.push({
            ...confronto.fora,
            adversario:
              confronto.casa.sigla,
            mando:
              "Fora"
          });

        }
      );


    return clubes
      .sort(
        (
          a,
          b
        ) =>
          b.potencialAtaque -
          a.potencialAtaque
      )[0]
      ||
      null;

  }


  /* =======================================================
     MELHOR SG
     ======================================================= */

  function obterMelhorSG() {

    const clubes = [];


    estado.confrontos
      .forEach(
        confronto => {

          clubes.push({
            ...confronto.casa,
            adversario:
              confronto.fora.sigla,
            mando:
              "Casa"
          });


          clubes.push({
            ...confronto.fora,
            adversario:
              confronto.casa.sigla,
            mando:
              "Fora"
          });

        }
      );


    return clubes
      .sort(
        (
          a,
          b
        ) =>
          b.chanceSG -
          a.chanceSG
      )[0]
      ||
      null;

  }


  /* =======================================================
     JOGO MAIS ABERTO
     ======================================================= */

  function obterJogoMaisAberto() {

    return [
      ...estado.confrontos
    ]
      .sort(
        (
          a,
          b
        ) =>
          b.abertura -
          a.abertura
      )[0]
      ||
      null;

  }


  /* =======================================================
     POSIÇÃO MAIS FAVORECIDA
     ======================================================= */

  function obterMelhorPosicao() {

    const resultados = [];


    estado.confrontos
      .forEach(
        confronto => {

          [
            confronto.casa,
            confronto.fora
          ]
            .forEach(
              clube => {

                Object.entries(
                  clube.posicoes
                )
                  .forEach(
                    ([
                      posicao,
                      nota
                    ]) => {

                      resultados.push({

                        clube:
                          clube.sigla,

                        posicao,

                        nota:
                          numero(
                            nota
                          )

                      });

                    }
                  );

              }
            );

        }
      );


    return resultados
      .sort(
        (
          a,
          b
        ) =>
          b.nota -
          a.nota
      )[0]
      ||
      null;

  }


  /* =======================================================
     RESUMO
     ======================================================= */

  function obterResumo() {

    return {

      melhorAtaque:
        obterMelhorAtaque(),

      melhorSG:
        obterMelhorSG(),

      jogoAberto:
        obterJogoMaisAberto(),

      melhorPosicao:
        obterMelhorPosicao()

    };

  }


  /* =======================================================
     ESTILO
     ======================================================= */

  function garantirEstilos() {

    if (
      document.getElementById(
        "cartolaAnaliseRodadaStyle"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "cartolaAnaliseRodadaStyle";


    style.textContent = `

      .round-analysis-intro {
        margin: 18px 0;
        padding: 16px 18px;
        border: 1px solid
          rgba(255,255,255,.08);
        border-radius: 14px;
        background:
          rgba(255,255,255,.025);
        line-height: 1.6;
      }

      .round-analysis-intro strong {
        display: block;
        margin-bottom: 5px;
      }

      .round-analysis-intro p {
        margin: 0;
        opacity: .75;
      }

      .round-games-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0,1fr));
        gap: 16px;
        margin-top: 20px;
      }

      .round-game-card {
        border: 1px solid
          rgba(255,255,255,.08);
        border-radius: 16px;
        overflow: hidden;
        background:
          rgba(255,255,255,.025);
      }

      .round-game-header {
        display: grid;
        grid-template-columns:
          1fr auto 1fr;
        gap: 12px;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid
          rgba(255,255,255,.07);
      }

      .round-game-team {
        min-width: 0;
      }

      .round-game-team:last-child {
        text-align: right;
      }

      .round-game-team strong {
        display: block;
        font-size: 18px;
      }

      .round-game-team small {
        display: block;
        margin-top: 4px;
        opacity: .65;
      }

      .round-game-x {
        opacity: .5;
        font-weight: 800;
      }

      .round-game-body {
        display: grid;
        grid-template-columns:
          repeat(3,minmax(0,1fr));
        gap: 10px;
        padding: 14px 16px;
      }

      .round-game-metric {
        padding: 10px;
        border-radius: 11px;
        background:
          rgba(255,255,255,.035);
        text-align: center;
      }

      .round-game-metric span {
        display: block;
        font-size: 10px;
        opacity: .62;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      .round-game-metric strong {
        display: block;
        margin-top: 5px;
        font-size: 16px;
      }

      .round-game-reading {
        padding: 0 16px 16px;
        font-size: 12px;
        line-height: 1.55;
        opacity: .75;
      }

      .round-game-position {
        font-weight: 700;
      }

      @media (
        max-width: 900px
      ) {

        .round-games-grid {
          grid-template-columns: 1fr;
        }

      }

      @media (
        max-width: 520px
      ) {

        .round-game-body {
          grid-template-columns: 1fr;
        }

      }

    `;


    document.head
      .appendChild(
        style
      );

  }


  /* =======================================================
     ENCONTRA OS 4 CARDS DO RESUMO
     ======================================================= */

  function obterCardsResumo() {

    const aba =
      document.getElementById(
        "analise"
      );


    if (!aba) {

      return [];

    }


    return [
      ...aba.querySelectorAll(
        ".analysis-card"
      )
    ];

  }


  /* =======================================================
     PREENCHE UM CARD
     ======================================================= */

  function preencherCard(
    card,
    titulo,
    valor,
    detalhe
  ) {

    if (!card) {

      return;

    }


    const span =
      card.querySelector(
        "span"
      );


    const strong =
      card.querySelector(
        "strong"
      );


    const small =
      card.querySelector(
        "small"
      );


    if (span) {

      span.textContent =
        titulo;

    }


    if (strong) {

      strong.textContent =
        valor;

    }


    if (small) {

      small.textContent =
        detalhe;

    }

  }


  /* =======================================================
     RESUMO VISUAL
     ======================================================= */

  function renderizarResumo() {

    const cards =
      obterCardsResumo();


    if (
      cards.length < 4
    ) {

      return;

    }


    const resumo =
      obterResumo();


    preencherCard(

      cards[0],

      "Melhor ataque",

      resumo
        .melhorAtaque
        ?.sigla
      ||
      "--",

      resumo.melhorAtaque
        ? (
            `Potencial ${formatarNumero(
              resumo
                .melhorAtaque
                .potencialAtaque
            )} · x ${
              resumo
                .melhorAtaque
                .adversario
            }`
          )
        : "Dados insuficientes"

    );


    preencherCard(

      cards[1],

      "Maior chance de SG",

      resumo
        .melhorSG
        ?.sigla
      ||
      "--",

      resumo.melhorSG
        ? (
            `${formatarPercentual(
              resumo
                .melhorSG
                .chanceSG
            )} · x ${
              resumo
                .melhorSG
                .adversario
            }`
          )
        : "Dados insuficientes"

    );


    preencherCard(

      cards[2],

      "Jogo mais aberto",

      resumo.jogoAberto
        ? (
            `${
              resumo
                .jogoAberto
                .casa
                .sigla
            } x ${
              resumo
                .jogoAberto
                .fora
                .sigla
            }`
          )
        : "--",

      resumo.jogoAberto
        ? (
            `Índice de abertura ${
              formatarNumero(
                resumo
                  .jogoAberto
                  .abertura
              )
            }`
          )
        : "Dados insuficientes"

    );


    preencherCard(

      cards[3],

      "Posição em destaque",

      resumo.melhorPosicao
        ? (
            NOMES_POSICOES[
              resumo
                .melhorPosicao
                .posicao
            ]
            ||
            resumo
              .melhorPosicao
              .posicao
          )
        : "--",

      resumo.melhorPosicao
        ? (
            `${
              resumo
                .melhorPosicao
                .clube
            } · índice ${
              formatarNumero(
                resumo
                  .melhorPosicao
                  .nota
              )
            }`
          )
        : "Dados insuficientes"

    );

  }


  /* =======================================================
     POSIÇÃO DE DESTAQUE DO CLUBE
     ======================================================= */

  function posicaoDestaqueClube(
    clube
  ) {

    const entradas =
      Object.entries(
        clube?.posicoes ||
        {}
      );


    if (
      entradas.length === 0
    ) {

      return null;

    }


    const melhor =
      entradas.sort(
        (
          a,
          b
        ) =>
          numero(
            b[1]
          )
          -
          numero(
            a[1]
          )
      )[0];


    return {

      posicao:
        melhor[0],

      nota:
        numero(
          melhor[1]
        )

    };

  }


  /* =======================================================
     LEITURA DO CONFRONTO
     ======================================================= */

  function criarLeituraConfronto(
    confronto
  ) {

    const casa =
      confronto.casa;


    const fora =
      confronto.fora;


    const melhorAtaque =
      casa.potencialAtaque >=
      fora.potencialAtaque
        ? casa
        : fora;


    const melhorDefesa =
      casa.chanceSG >=
      fora.chanceSG
        ? casa
        : fora;


    const destaqueCasa =
      posicaoDestaqueClube(
        casa
      );


    const destaqueFora =
      posicaoDestaqueClube(
        fora
      );


    const melhorPosicao =
      (
        numero(
          destaqueCasa?.nota
        ) >=
        numero(
          destaqueFora?.nota
        )
      )
        ? {
            clube:
              casa.sigla,
            ...destaqueCasa
          }
        : {
            clube:
              fora.sigla,
            ...destaqueFora
          };


    return (
      `${melhorAtaque.sigla} apresenta o melhor cenário ofensivo do confronto. ` +
      `${melhorDefesa.sigla} possui a maior proteção relativa para SG. ` +
      `A posição mais favorecida pelo modelo é ${
        NOMES_POSICOES[
          melhorPosicao
            ?.posicao
        ]
        ||
        melhorPosicao
          ?.posicao
        ||
        "não definida"
      } de ${
        melhorPosicao
          ?.clube
        ||
        "--"
      }.`
    );

  }


  /* =======================================================
     CARD DO CONFRONTO
     ======================================================= */

  function criarHtmlConfronto(
    confronto
  ) {

    const casa =
      confronto.casa;


    const fora =
      confronto.fora;


    const leitura =
      criarLeituraConfronto(
        confronto
      );


    return `

      <article
        class="round-game-card"
      >

        <div
          class="round-game-header"
        >

          <div
            class="round-game-team"
          >

            <strong>
              ${escaparHtml(
                casa.sigla
              )}
            </strong>

            <small>
              Mandante
            </small>

          </div>


          <div
            class="round-game-x"
          >
            ×
          </div>


          <div
            class="round-game-team"
          >

            <strong>
              ${escaparHtml(
                fora.sigla
              )}
            </strong>

            <small>
              Visitante
            </small>

          </div>

        </div>


        <div
          class="round-game-body"
        >

          <div
            class="round-game-metric"
          >

            <span>
              Ataque
            </span>

            <strong>
              ${
                formatarNumero(
                  casa.potencialAtaque
                )
              }
              ×
              ${
                formatarNumero(
                  fora.potencialAtaque
                )
              }
            </strong>

          </div>


          <div
            class="round-game-metric"
          >

            <span>
              Chance SG
            </span>

            <strong>
              ${
                formatarPercentual(
                  casa.chanceSG
                )
              }
              ×
              ${
                formatarPercentual(
                  fora.chanceSG
                )
              }
            </strong>

          </div>


          <div
            class="round-game-metric"
          >

            <span>
              Jogo aberto
            </span>

            <strong>
              ${
                formatarNumero(
                  confronto.abertura
                )
              }
            </strong>

          </div>

        </div>


        <div
          class="round-game-reading"
        >

          ${escaparHtml(
            leitura
          )}

        </div>

      </article>

    `;

  }


  /* =======================================================
     CONTAINER PRINCIPAL
     ======================================================= */

  function obterContainerConfrontos() {

    const aba =
      document.getElementById(
        "analise"
      );


    if (!aba) {

      return null;

    }


    const emptyState =
      aba.querySelector(
        ".empty-state"
      );


    if (
      emptyState
    ) {

      return emptyState;

    }


    return null;

  }


  /* =======================================================
     RENDERIZA CONFRONTOS
     ======================================================= */

  function renderizarConfrontos() {

    const container =
      obterContainerConfrontos();


    if (!container) {

      return;

    }


    if (
      estado.confrontos.length ===
      0
    ) {

      container.innerHTML = `

        <strong>
          Dados da rodada ainda insuficientes
        </strong>

        <p>
          Não foi possível cruzar partidas e
          jogadores disponíveis para gerar
          a análise dos confrontos.
        </p>

      `;


      return;

    }


    const html =
      estado
        .confrontos
        .map(
          criarHtmlConfronto
        )
        .join("");


    container.classList.remove(
      "empty-state"
    );


    container.innerHTML = `

      <div
        class="round-analysis-intro"
      >

        <strong>
          Leitura estatística dos confrontos
        </strong>

        <p>
          Os índices abaixo cruzam projeção,
          piso, teto, confiança, regularidade,
          adequação à rodada, força ofensiva,
          força defensiva e mando de campo.
          São indicadores relativos da rodada,
          não probabilidades oficiais de resultado.
        </p>

      </div>


      <div
        class="round-games-grid"
      >
        ${html}
      </div>

    `;

  }


  /* =======================================================
     LIMPEZA DOS TEXTOS PROVISÓRIOS
     ======================================================= */

  function limparTextosProvisorios() {

    /*
     * Sidebar.
     */

    const sidebarInfo =
      document.querySelector(
        ".sidebar-info"
      );


    if (
      sidebarInfo
    ) {

      const titulo =
        sidebarInfo.querySelector(
          "strong"
        );


      const paragrafo =
        sidebarInfo.querySelector(
          "p"
        );


      if (titulo) {

        titulo.textContent =
          "Modelo estatístico";

      }


      if (paragrafo) {

        paragrafo.textContent =
          "Projeções, recomendações e escalações recalculadas com dados da rodada e histórico disponível.";

      }

    }


    /*
     * Aviso da Metodologia.
     */

    const aviso =
      document.querySelector(
        ".methodology-notice"
      );


    if (
      aviso
    ) {

      const titulo =
        aviso.querySelector(
          "strong"
        );


      const paragrafo =
        aviso.querySelector(
          "p"
        );


      if (titulo) {

        titulo.textContent =
          "Calibração contínua";

      }


      if (paragrafo) {

        paragrafo.textContent =
          "O modelo utiliza pesos especializados por posição e pode ser recalibrado pelo backtest histórico. Alterações só devem ser promovidas quando os testes indicarem melhora consistente, evitando ajustes baseados apenas em uma rodada.";

      }

    }

  }


  /* =======================================================
     ATUALIZA TEXTO DA METODOLOGIA
     ======================================================= */

  function atualizarMetodologia() {

    const intro =
      document.querySelector(
        "#metodologia .methodology-intro"
      );


    if (!intro) {

      return;

    }


    const paragrafo =
      intro.querySelector(
        "p:not(.section-label)"
      );


    if (
      paragrafo
    ) {

      paragrafo.textContent =
        "O Cartola Estatístico combina desempenho histórico, forma recente, regularidade, scouts, confronto, mando, titularidade, risco, confiança, custo-benefício e adequação à rodada. As escalações são montadas respeitando formação, patrimônio e regras de reservas.";

    }

  }


  /* =======================================================
     RENDERIZAÇÃO COMPLETA
     ======================================================= */

  function renderizar() {

    garantirEstilos();

    limparTextosProvisorios();

    atualizarMetodologia();

    renderizarResumo();

    renderizarConfrontos();

  }


  /* =======================================================
     CARREGAMENTO
     ======================================================= */

  async function carregar() {

    if (
      estado.carregando
    ) {

      return estado;

    }


    estado.carregando =
      true;


    estado.erro =
      null;


    try {

      const rodada =
        await obterRodadaAtual();


      if (!rodada) {

        throw new Error(
          "Rodada atual não identificada."
        );

      }


      estado.rodada =
        rodada;


      const partidas =
        await carregarPartidas(
          rodada
        );


      estado.partidas =
        partidas;


      /*
       * Recomendações carregam de maneira assíncrona.
       * Por isso fazemos algumas tentativas rápidas antes
       * de concluir que os jogadores ainda não chegaram.
       */

      let jogadores = [];


      for (
        let tentativa = 0;
        tentativa < 20;
        tentativa += 1
      ) {

        jogadores =
          carregarJogadoresProcessados();


        if (
          jogadores.length > 0
        ) {

          break;

        }


        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              150
            )
        );

      }


      estado.jogadores =
        jogadores;


      analisarConfrontos();


      estado.carregado =
        true;


      renderizar();


      console.info(
        "Análise da rodada carregada:",
        {
          rodada:
            estado.rodada,

          partidas:
            estado.partidas.length,

          jogadores:
            estado.jogadores.length,

          confrontos:
            estado.confrontos.length,

          resumo:
            obterResumo()
        }
      );


      return estado;


    } catch (erro) {

      estado.erro =
        erro;


      estado.carregado =
        false;


      console.error(
        "Erro na análise da rodada:",
        erro
      );


      limparTextosProvisorios();

      atualizarMetodologia();


      return estado;


    } finally {

      estado.carregando =
        false;

    }

  }


  /* =======================================================
     ESTADO PÚBLICO
     ======================================================= */

  function obterEstado() {

    return {

      rodada:
        estado.rodada,

      partidas:
        [...estado.partidas],

      jogadores:
        [...estado.jogadores],

      confrontos:
        [...estado.confrontos],

      carregado:
        estado.carregado,

      carregando:
        estado.carregando,

      erro:
        estado.erro,

      resumo:
        obterResumo()

    };

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  return {

    carregar,

    renderizar,

    obterEstado,

    obterResumo

  };


})();


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */


if (
  typeof window !==
  "undefined"
) {

  window.AnaliseRodada =
    AnaliseRodada;


  /*
   * Limpeza visual já pode ocorrer no DOMContentLoaded,
   * sem esperar dados externos.
   */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      try {

        AnaliseRodada
          .renderizar();

      } catch (erro) {

        /*
         * O carregamento completo acontecerá no load.
         */

      }

    }
  );


  /*
   * No load os módulos de recomendações já terão iniciado.
   */

  window.addEventListener(
    "load",
    () => {

      setTimeout(
        () => {

          AnaliseRodada
            .carregar();

        },
        0
      );

    }
  );


  /*
   * Se as escalações forem recalculadas,
   * atualizamos também a leitura da rodada.
   */

  window.addEventListener(
    "cartola:escalacoes-atualizadas",
    () => {

      setTimeout(
        () => {

          AnaliseRodada
            .carregar();

        },
        50
      );

    }
  );

}
