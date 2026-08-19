/* =========================================================
   CARTOLA ESTATÍSTICO
   Calculadora integrada do modelo estatístico
   ========================================================= */


const MotorCalculadora = (() => {


  const POSICOES_VALIDAS = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];


  const STATUS_INDISPONIVEIS =
    new Set([
      2,
      3,
      5,
      6
    ]);


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */


  function numero(
    valor,
    padrao = 0
  ) {

    const convertido =
      Number(valor);


    return Number.isFinite(
      convertido
    )
      ? convertido
      : padrao;

  }


  function limitar(
    valor,
    minimo = 0,
    maximo = 100
  ) {

    return Math.min(
      maximo,
      Math.max(
        minimo,
        numero(valor)
      )
    );

  }


  function arredondar(
    valor,
    casas = 2
  ) {

    return Number(
      numero(valor)
        .toFixed(casas)
    );

  }


  function media(
    valores
  ) {

    if (
      !Array.isArray(valores) ||
      valores.length === 0
    ) {

      return 0;

    }


    return valores.reduce(
      (
        total,
        valor
      ) =>
        total +
        numero(valor),
      0
    ) / valores.length;

  }


  function mediana(
    valores
  ) {

    if (
      !Array.isArray(valores) ||
      valores.length === 0
    ) {

      return 0;

    }


    const ordenados =
      valores
        .map(Number)
        .filter(Number.isFinite)
        .sort(
          (a, b) =>
            a - b
        );


    if (
      ordenados.length === 0
    ) {

      return 0;

    }


    const meio =
      Math.floor(
        ordenados.length / 2
      );


    if (
      ordenados.length % 2 === 0
    ) {

      return (
        ordenados[
          meio - 1
        ] +
        ordenados[
          meio
        ]
      ) / 2;

    }


    return ordenados[
      meio
    ];

  }


  function desvioPadrao(
    valores
  ) {

    if (
      !Array.isArray(valores) ||
      valores.length === 0
    ) {

      return 0;

    }


    const valorMedio =
      media(valores);


    const variancia =
      valores.reduce(
        (
          total,
          valor
        ) => {

          return (
            total +
            (
              numero(valor) -
              valorMedio
            ) ** 2
          );

        },
        0
      ) /
      valores.length;


    return Math.sqrt(
      variancia
    );

  }


  function normalizar(
    valor,
    minimo,
    maximo
  ) {

    const min =
      numero(minimo);


    const max =
      numero(maximo);


    if (
      min === max
    ) {

      return 50;

    }


    return limitar(
      (
        (
          numero(valor) -
          min
        ) /
        (
          max -
          min
        )
      ) * 100
    );

  }


  function possuiValor(
    valor
  ) {

    return !(
      valor === null ||
      valor === undefined ||
      valor === ""
    );

  }


  /* =======================================================
     HISTÓRICO
     ======================================================= */


  function obterHistoricoRegistros(
    jogador
  ) {

    if (
      !Array.isArray(
        jogador?.historico
      )
    ) {

      return [];

    }


    return [
      ...jogador.historico
    ]
      .filter(
        registro =>
          registro &&
          typeof registro ===
            "object"
      )
      .sort(
        (a, b) =>
          numero(a.rodada) -
          numero(b.rodada)
      );

  }


  function pontuacaoValida(
    valor
  ) {

    if (
      !possuiValor(valor)
    ) {

      return false;

    }


    return Number.isFinite(
      Number(valor)
    );

  }


  function obterPontuacaoRegistro(
    registro
  ) {

    if (
      !registro ||
      typeof registro !==
        "object"
    ) {

      return null;

    }


    if (
      pontuacaoValida(
        registro.pontuacao
      )
    ) {

      return Number(
        registro.pontuacao
      );

    }


    if (
      pontuacaoValida(
        registro.pontos
      )
    ) {

      return Number(
        registro.pontos
      );

    }


    return null;

  }


  function obterHistoricoPontuacoes(
    jogador
  ) {

    const direto =
      jogador?.historicoPontuacoes ??
      jogador?.pontuacoes ??
      jogador?.pontuacoesRecentes;


    if (
      Array.isArray(direto) &&
      direto.length > 0
    ) {

      return direto
        .filter(
          pontuacaoValida
        )
        .map(Number);

    }


    return obterHistoricoRegistros(
      jogador
    )
      .map(
        obterPontuacaoRegistro
      )
      .filter(
        pontuacaoValida
      )
      .map(Number);

  }


  /* =======================================================
     MÉDIAS
     ======================================================= */


  function mediaUltimas(
    historico,
    quantidade
  ) {

    if (
      !Array.isArray(historico) ||
      historico.length === 0
    ) {

      return 0;

    }


    return media(
      historico.slice(
        -quantidade
      )
    );

  }


  /* =======================================================
     SCOUTS HISTÓRICOS
     ======================================================= */


  function obterValorScout(
    scouts,
    nomes
  ) {

    for (
      const nome of nomes
    ) {

      if (
        possuiValor(
          scouts?.[nome]
        )
      ) {

        return numero(
          scouts[nome]
        );

      }

    }


    return 0;

  }


  function possuiScouts(
    scouts
  ) {

    return (
      scouts &&
      typeof scouts ===
        "object" &&
      Object.keys(
        scouts
      ).length > 0
    );

  }


  function agregarScoutsHistoricos(
    jogador
  ) {

    const registros =
      obterHistoricoRegistros(
        jogador
      )
        .filter(
          registro =>
            possuiScouts(
              registro?.scouts
            )
        );


    if (
      registros.length === 0
    ) {

      return {};

    }


    const totais = {};


    registros.forEach(
      registro => {

        Object.entries(
          registro.scouts || {}
        )
          .forEach(
            (
              [
                chave,
                valor
              ]
            ) => {

              const numeroScout =
                Number(valor);


              if (
                !Number.isFinite(
                  numeroScout
                )
              ) {

                return;

              }


              totais[chave] =
                numero(
                  totais[chave]
                ) +
                numeroScout;

            }
          );

      }
    );


    const medias = {};


    Object.entries(
      totais
    )
      .forEach(
        (
          [
            chave,
            total
          ]
        ) => {

          medias[chave] =
            total /
            registros.length;

        }
      );


    return medias;

  }


  function obterScoutsAnalise(
    jogador
  ) {

    const historicos =
      agregarScoutsHistoricos(
        jogador
      );


    if (
      possuiScouts(
        historicos
      )
    ) {

      return historicos;

    }


    if (
      possuiScouts(
        jogador?.scouts
      )
    ) {

      return jogador.scouts;

    }


    return {};

  }


  /* =======================================================
     MÉTRICAS HISTÓRICAS
     ======================================================= */


  function calcularFormaRecente(
    historico
  ) {

    if (
      historico.length === 0
    ) {

      return 50;

    }


    const ultimos =
      historico.slice(
        -5
      );


    const pesos =
      [
        1,
        1.15,
        1.3,
        1.5,
        1.75
      ]
        .slice(
          -ultimos.length
        );


    const somaPesos =
      pesos.reduce(
        (
          total,
          peso
        ) =>
          total +
          peso,
        0
      );


    const resultado =
      ultimos.reduce(
        (
          total,
          pontuacao,
          indice
        ) => {

          return (
            total +
            numero(
              pontuacao
            ) *
            pesos[indice]
          );

        },
        0
      ) /
      somaPesos;


    return normalizar(
      resultado,
      -2,
      15
    );

  }


  function calcularMediaGeral(
    historico
  ) {

    if (
      historico.length === 0
    ) {

      return 50;

    }


    return normalizar(
      media(historico),
      -2,
      15
    );

  }


  function calcularNotaMediana(
    historico
  ) {

    if (
      historico.length === 0
    ) {

      return 50;

    }


    return normalizar(
      mediana(historico),
      -2,
      15
    );

  }


  function calcularRegularidade(
    historico
  ) {

    if (
      historico.length === 0
    ) {

      return 50;

    }


    const mediaAbs =
      Math.abs(
        media(historico)
      );


    const desvio =
      desvioPadrao(
        historico
      );


    if (
      mediaAbs === 0
    ) {

      return (
        desvio === 0
          ? 100
          : 0
      );

    }


    return limitar(
      100 -
      (
        desvio /
        mediaAbs
      ) *
      70
    );

  }


  function calcularTendenciaRecente(
    historico
  ) {

    if (
      historico.length < 2
    ) {

      return 50;

    }


    const recentes =
      historico.slice(
        -6
      );


    const tamanho =
      Math.max(
        1,
        Math.floor(
          recentes.length / 2
        )
      );


    const inicio =
      recentes.slice(
        0,
        tamanho
      );


    const fim =
      recentes.slice(
        -tamanho
      );


    return limitar(
      50 +
      (
        media(fim) -
        media(inicio)
      ) *
      8
    );

  }


  function calcularProtecaoNegativacao(
    historico
  ) {

    if (
      historico.length === 0
    ) {

      return 50;

    }


    const negativas =
      historico.filter(
        valor =>
          valor < 0
      ).length;


    return limitar(
      100 -
      (
        negativas /
        historico.length
      ) *
      100
    );

  }


  /* =======================================================
     PONTUAÇÃO BÁSICA
     ======================================================= */


  function calcularPontuacaoBasica(
    jogador
  ) {

    const scouts =
      obterScoutsAnalise(
        jogador
      );


    const posicao =
      String(
        jogador?.posicao || ""
      )
        .toUpperCase();


    let valor = 0;


    if (
      posicao === "GOL"
    ) {

      valor =
        obterValorScout(
          scouts,
          [
            "defesas",
            "DE"
          ]
        ) *
        1.3
        +
        obterValorScout(
          scouts,
          [
            "defesasDificeis",
            "DD"
          ]
        ) *
        2;

    }


    if (
      posicao === "LAT"
    ) {

      valor =
        obterValorScout(
          scouts,
          [
            "desarmes",
            "DS"
          ]
        ) *
        1.4
        +
        obterValorScout(
          scouts,
          [
            "cruzamentos"
          ]
        ) *
        0.35
        +
        obterValorScout(
          scouts,
          [
            "faltasSofridas",
            "FS"
          ]
        ) *
        0.5;

    }


    if (
      posicao === "ZAG"
    ) {

      valor =
        obterValorScout(
          scouts,
          [
            "desarmes",
            "DS"
          ]
        ) *
        1.5
        +
        obterValorScout(
          scouts,
          [
            "cortes"
          ]
        ) *
        0.25;

    }


    if (
      posicao === "MEI"
    ) {

      valor =
        obterValorScout(
          scouts,
          [
            "desarmes",
            "DS"
          ]
        ) *
        1.2
        +
        (
          obterValorScout(
            scouts,
            [
              "finalizacoes",
              "FD",
              "FF",
              "FT"
            ]
          )
        ) *
        0.5
        +
        obterValorScout(
          scouts,
          [
            "faltasSofridas",
            "FS"
          ]
        ) *
        0.5;

    }


    if (
      posicao === "ATA"
    ) {

      valor =
        (
          obterValorScout(
            scouts,
            [
              "FD"
            ]
          ) *
          1.0
        )
        +
        (
          obterValorScout(
            scouts,
            [
              "FF"
            ]
          ) *
          0.6
        )
        +
        (
          obterValorScout(
            scouts,
            [
              "FT"
            ]
          ) *
          0.8
        )
        +
        (
          obterValorScout(
            scouts,
            [
              "FS"
            ]
          ) *
          0.5
        );

    }


    if (
      posicao === "TEC"
    ) {

      /*
       * Treinador normalmente não possui
       * scouts individuais comparáveis.
       * Neutro quando não houver dado.
       */

      return 50;

    }


    if (
      valor === 0 &&
      !possuiScouts(
        scouts
      )
    ) {

      return 50;

    }


    return normalizar(
      valor,
      0,
      12
    );

  }


  /* =======================================================
     SCOUTS OFENSIVOS
     ======================================================= */


  function calcularScoutsOfensivos(
    jogador
  ) {

    const scouts =
      obterScoutsAnalise(
        jogador
      );


    if (
      !possuiScouts(
        scouts
      )
    ) {

      return 50;

    }


    const valor =
      obterValorScout(
        scouts,
        [
          "gols",
          "G"
        ]
      ) *
      8
      +
      obterValorScout(
        scouts,
        [
          "assistencias",
          "A"
        ]
      ) *
      5
      +
      obterValorScout(
        scouts,
        [
          "FD"
        ]
      ) *
      1.2
      +
      obterValorScout(
        scouts,
        [
          "FT"
        ]
      ) *
      1.0
      +
      obterValorScout(
        scouts,
        [
          "FF"
        ]
      ) *
      0.6
      +
      obterValorScout(
        scouts,
        [
          "FS"
        ]
      ) *
      0.25;


    return normalizar(
      valor,
      0,
      12
    );

  }


  /* =======================================================
     SCOUTS DEFENSIVOS
     ======================================================= */


  function calcularScoutsDefensivos(
    jogador
  ) {

    const scouts =
      obterScoutsAnalise(
        jogador
      );


    if (
      !possuiScouts(
        scouts
      )
    ) {

      return 50;

    }


    const valor =
      obterValorScout(
        scouts,
        [
          "desarmes",
          "DS"
        ]
      ) *
      1.5
      +
      obterValorScout(
        scouts,
        [
          "defesas",
          "DE"
        ]
      ) *
      1.3
      +
      obterValorScout(
        scouts,
        [
          "defesasDificeis",
          "DD"
        ]
      ) *
      2
      +
      obterValorScout(
        scouts,
        [
          "SG"
        ]
      ) *
      4;


    return normalizar(
      valor,
      0,
      12
    );

  }


  /* =======================================================
     MANDO
     ======================================================= */


  function calcularCasaFora(
    jogador
  ) {

    const mando =
      String(
        jogador?.mando || ""
      )
        .toLowerCase()
        .trim();


    if (
      mando === "casa" ||
      mando === "mandante"
    ) {

      return 70;

    }


    if (
      mando === "fora" ||
      mando === "visitante"
    ) {

      return 45;

    }


    return 50;

  }


  /* =======================================================
     FORÇA DO ADVERSÁRIO
     ======================================================= */


  function calcularForcaAdversario(
    jogador
  ) {

    const candidatos = [

      jogador?.notaForcaAdversario,

      jogador?.forcaAdversario,

      jogador?.notaConfronto,

      jogador?.componentes
        ?.forcaAdversario,

      jogador?.componentes
        ?.Confronto,

      jogador?.componentes
        ?.confronto

    ];


    for (
      const candidato of candidatos
    ) {

      if (
        possuiValor(
          candidato
        ) &&
        Number.isFinite(
          Number(candidato)
        )
      ) {

        return limitar(
          Number(candidato)
        );

      }

    }


    /*
     * Temos adversário, mas ainda não temos
     * uma nota confiável de força.
     * Portanto utilizamos o ponto neutro,
     * e não zero.
     */

    return 50;

  }


  /* =======================================================
     PONTOS CEDIDOS
     ======================================================= */


  function calcularPontosCedidos(
    jogador
  ) {

    const candidatos = [

      jogador?.pontosCedidosNota,

      jogador?.notaPontosCedidos,

      jogador?.pontosCedidosPosicao

    ];


    for (
      const candidato of candidatos
    ) {

      if (
        possuiValor(
          candidato
        ) &&
        Number.isFinite(
          Number(candidato)
        )
      ) {

        return limitar(
          Number(candidato)
        );

      }

    }


    return 50;

  }


  /* =======================================================
     SG
     ======================================================= */


  function calcularChanceSGHistorica(
    jogador
  ) {

    const posicao =
      String(
        jogador?.posicao || ""
      )
        .toUpperCase();


    if (
      ![
        "GOL",
        "LAT",
        "ZAG"
      ].includes(
        posicao
      )
    ) {

      return 50;

    }


    const registros =
      obterHistoricoRegistros(
        jogador
      )
        .filter(
          registro =>
            registro?.entrouEmCampo !==
              false &&
            possuiScouts(
              registro?.scouts
            )
        );


    if (
      registros.length < 2
    ) {

      return 50;

    }


    const comSG =
      registros.filter(
        registro => {

          return (
            obterValorScout(
              registro.scouts,
              [
                "SG"
              ]
            ) > 0
          );

        }
      ).length;


    return limitar(
      (
        comSG /
        registros.length
      ) *
      100
    );

  }


  function calcularChanceSG(
    jogador
  ) {

    if (
      possuiValor(
        jogador?.chanceSG
      ) &&
      Number.isFinite(
        Number(
          jogador.chanceSG
        )
      )
    ) {

      return limitar(
        Number(
          jogador.chanceSG
        )
      );

    }


    return calcularChanceSGHistorica(
      jogador
    );

  }


  /* =======================================================
     TITULARIDADE
     ======================================================= */


  function calcularTitularidade(
    jogador
  ) {

    if (
      possuiValor(
        jogador?.titularidade
      ) &&
      Number.isFinite(
        Number(
          jogador.titularidade
        )
      )
    ) {

      return limitar(
        Number(
          jogador.titularidade
        )
      );

    }


    const status =
      numero(
        jogador?.statusId ??
        jogador?.status_id,
        0
      );


    if (
      status === 7
    ) {

      return 95;

    }


    if (
      STATUS_INDISPONIVEIS.has(
        status
      )
    ) {

      return 10;

    }


    return 50;

  }


  /* =======================================================
     MINUTOS
     ======================================================= */


  function calcularMinutosEsperados(
    jogador
  ) {

    if (
      possuiValor(
        jogador?.minutosEsperados
      ) &&
      Number.isFinite(
        Number(
          jogador.minutosEsperados
        )
      )
    ) {

      return limitar(
        Number(
          jogador.minutosEsperados
        ) /
        90 *
        100
      );

    }


    const status =
      numero(
        jogador?.statusId ??
        jogador?.status_id,
        0
      );


    if (
      status === 7
    ) {

      return 94;

    }


    if (
      STATUS_INDISPONIVEIS.has(
        status
      )
    ) {

      return 10;

    }


    return 50;

  }


  /* =======================================================
     BOLA PARADA / PÊNALTI
     ======================================================= */


  function calcularFlagEspecial(
    jogador,
    campo
  ) {

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          jogador,
          campo
        )
    ) {

      return jogador[campo]
        ? 100
        : 0;

    }


    /*
     * Ausência de informação não significa
     * que o atleta NÃO cobre.
     */

    return 50;

  }


  function calcularBolaParada(
    jogador
  ) {

    return calcularFlagEspecial(
      jogador,
      "cobraBolaParada"
    );

  }


  function calcularPenaltis(
    jogador
  ) {

    return calcularFlagEspecial(
      jogador,
      "cobraPenalti"
    );

  }


  /* =======================================================
     CUSTO-BENEFÍCIO
     ======================================================= */


  function calcularCustoBeneficio(
    jogador,
    mediaHistorica
  ) {

    const preco =
      numero(
        jogador?.preco
      );


    if (
      preco <= 0
    ) {

      return 50;

    }


    return normalizar(
      numero(
        mediaHistorica
      ) /
      preco,
      0,
      1.5
    );

  }


  /* =======================================================
     18 CRITÉRIOS
     ======================================================= */


  function calcularNotasJogador(
    jogador
  ) {

    const posicao =
      String(
        jogador?.posicao || ""
      )
        .toUpperCase()
        .trim();


    if (
      !POSICOES_VALIDAS.includes(
        posicao
      )
    ) {

      return {

        erro:
          "Posição inválida.",

        posicao,

        notas: {},

        historicoPontuacoes: [],

        media3: 0,

        media5: 0,

        mediaHistorica: 0

      };

    }


    const historicoPontuacoes =
      obterHistoricoPontuacoes(
        jogador
      );


    const mediaHistorica =
      media(
        historicoPontuacoes
      );


    const media3 =
      mediaUltimas(
        historicoPontuacoes,
        3
      );


    const media5 =
      mediaUltimas(
        historicoPontuacoes,
        5
      );


    return {

      erro: null,

      posicao,

      historicoPontuacoes,

      mediaHistorica,

      media3,

      media5,

      notas: {

        formaRecente:
          calcularFormaRecente(
            historicoPontuacoes
          ),

        mediaGeral:
          calcularMediaGeral(
            historicoPontuacoes
          ),

        mediana:
          calcularNotaMediana(
            historicoPontuacoes
          ),

        regularidade:
          calcularRegularidade(
            historicoPontuacoes
          ),

        pontuacaoBasica:
          calcularPontuacaoBasica(
            jogador
          ),

        scoutsOfensivos:
          calcularScoutsOfensivos(
            jogador
          ),

        scoutsDefensivos:
          calcularScoutsDefensivos(
            jogador
          ),

        casaFora:
          calcularCasaFora(
            jogador
          ),

        forcaAdversario:
          calcularForcaAdversario(
            jogador
          ),

        pontosCedidos:
          calcularPontosCedidos(
            jogador
          ),

        chanceSG:
          calcularChanceSG(
            jogador
          ),

        titularidade:
          calcularTitularidade(
            jogador
          ),

        minutosEsperados:
          calcularMinutosEsperados(
            jogador
          ),

        bolaParada:
          calcularBolaParada(
            jogador
          ),

        penaltis:
          calcularPenaltis(
            jogador
          ),

        custoBeneficio:
          calcularCustoBeneficio(
            jogador,
            mediaHistorica
          ),

        tendenciaRecente:
          calcularTendenciaRecente(
            historicoPontuacoes
          ),

        riscoNegativar:
          calcularProtecaoNegativacao(
            historicoPontuacoes
          )

      }

    };

  }


  /* =======================================================
     JOGADOR
     ======================================================= */


  function analisarJogador(
    jogador
  ) {

    const calculo =
      calcularNotasJogador(
        jogador
      );


    if (
      calculo.erro
    ) {

      return {

        ...jogador,

        erroCalculadora:
          calculo.erro

      };

    }


    if (
      typeof executarMotorEstatistico !==
        "function"
    ) {

      return {

        ...jogador,

        notasCriterios:
          calculo.notas,

        erroCalculadora:
          "Motor estatístico não carregado."

      };

    }


    const resultadoMotor =
      executarMotorEstatistico({

        jogadorId:
          jogador.id,

        posicao:
          calculo.posicao,

        notas:
          calculo.notas

      });


    const historico =
      obterHistoricoRegistros(
        jogador
      );


    const jogadorCompleto = {

      ...jogador,

      historico,

      historicoPontuacoes:
        [
          ...calculo
            .historicoPontuacoes
        ],

      notasCriterios:
        {
          ...calculo.notas
        },

      /*
       * Notas normalizadas também continuam
       * acessíveis diretamente para módulos antigos.
       */

      ...calculo.notas

    };


    /* ===================================================
       MÉDIAS REAIS
       =================================================== */


    jogadorCompleto.media3 =
      arredondar(
        calculo.media3
      );


    jogadorCompleto.media5 =
      arredondar(
        calculo.media5
      );


    jogadorCompleto.mediaRecente =
      arredondar(
        calculo.media5 ||
        calculo.mediaHistorica
      );


    jogadorCompleto.mediaGeral =
      arredondar(
        calculo.mediaHistorica
      );


    jogadorCompleto.mediana =
      arredondar(
        mediana(
          calculo
            .historicoPontuacoes
        )
      );


    /* ===================================================
       SCORE
       =================================================== */


    const score =
      (
        typeof MotorScore !==
          "undefined" &&
        MotorScore &&
        typeof MotorScore.calcular ===
          "function"
      )
        ? MotorScore.calcular(
            jogadorCompleto
          )
        : resultadoMotor.notaFinal;


    jogadorCompleto.score =
      arredondar(
        score
      );


    /* ===================================================
       FORMA
       =================================================== */


    if (
      typeof MotorForma !==
        "undefined" &&
      MotorForma
    ) {

      if (
        typeof MotorForma.mediaRecente ===
          "function"
      ) {

        jogadorCompleto.mediaRecente =
          arredondar(
            MotorForma.mediaRecente(
              calculo
                .historicoPontuacoes
            )
          );

      }


      if (
        typeof MotorForma.tendencia ===
          "function"
      ) {

        jogadorCompleto.tendencia =
          arredondar(
            MotorForma.tendencia(
              calculo
                .historicoPontuacoes
            )
          );

      }


      if (
        typeof MotorForma.fase ===
          "function"
      ) {

        jogadorCompleto.fase =
          MotorForma.fase(
            historico
          );

      }

    }


    if (
      !possuiValor(
        jogadorCompleto.tendencia
      )
    ) {

      jogadorCompleto.tendencia =
        arredondar(
          calculo.notas
            .tendenciaRecente -
          50
        );

    }


    /* ===================================================
       REGULARIDADE
       =================================================== */


    if (
      typeof MotorRegularidade !==
        "undefined" &&
      MotorRegularidade &&
      typeof MotorRegularidade.calcular ===
        "function"
    ) {

      const resultado =
        MotorRegularidade.calcular(
          calculo
            .historicoPontuacoes
        );


      jogadorCompleto.desvioPadrao =
        arredondar(
          resultado?.desvio ??
          desvioPadrao(
            calculo
              .historicoPontuacoes
          )
        );


      jogadorCompleto.regularidade =
        arredondar(
          resultado?.regularidade ??
          calculo.notas
            .regularidade,
          1
        );

    } else {

      jogadorCompleto.desvioPadrao =
        arredondar(
          desvioPadrao(
            calculo
              .historicoPontuacoes
          )
        );


      jogadorCompleto.regularidade =
        arredondar(
          calculo.notas
            .regularidade,
          1
        );

    }


    /* ===================================================
       PISO / TETO
       =================================================== */


    if (
      typeof MotorPisoTeto !==
        "undefined" &&
      MotorPisoTeto &&
      typeof MotorPisoTeto.calcular ===
        "function"
    ) {

      const resultado =
        MotorPisoTeto.calcular(
          calculo
            .historicoPontuacoes
        );


      jogadorCompleto.piso =
        arredondar(
          resultado?.piso
        );


      jogadorCompleto.teto =
        arredondar(
          resultado?.teto
        );

    } else {

      jogadorCompleto.piso =
        calculo
          .historicoPontuacoes
          .length
          ? arredondar(
              Math.min(
                ...calculo
                  .historicoPontuacoes
              )
            )
          : 0;


      jogadorCompleto.teto =
        calculo
          .historicoPontuacoes
          .length
          ? arredondar(
              Math.max(
                ...calculo
                  .historicoPontuacoes
              )
            )
          : 0;

    }


    /* ===================================================
       RISCO
       =================================================== */


    jogadorCompleto.riscoNegativar =
      arredondar(
        100 -
        calculo.notas
          .riscoNegativar,
        1
      );


    jogadorCompleto.risco =
      (
        typeof MotorRisco !==
          "undefined" &&
        MotorRisco &&
        typeof MotorRisco.calcular ===
          "function"
      )
        ? MotorRisco.calcular(
            jogadorCompleto
          )
        : jogadorCompleto
            .riscoNegativar;


    jogadorCompleto.risco =
      arredondar(
        jogadorCompleto.risco,
        1
      );


    jogadorCompleto.riscoTexto =
      (
        typeof MotorRisco !==
          "undefined" &&
        MotorRisco &&
        typeof MotorRisco.nivel ===
          "function"
      )
        ? MotorRisco.nivel(
            jogadorCompleto.risco
          )
        : (
            jogadorCompleto.risco <= 30
              ? "Baixo"
              : jogadorCompleto.risco <= 60
                ? "Médio"
                : "Alto"
          );


    /* ===================================================
       CONFIANÇA
       =================================================== */


    jogadorCompleto.confianca =
      (
        typeof MotorConfianca !==
          "undefined" &&
        MotorConfianca &&
        typeof MotorConfianca.calcular ===
          "function"
      )
        ? MotorConfianca.calcular(
            jogadorCompleto
          )
        : 50;


    jogadorCompleto.confianca =
      arredondar(
        jogadorCompleto.confianca,
        1
      );


    jogadorCompleto.confiancaNumerica =
      jogadorCompleto.confianca;


    /* ===================================================
       PROJEÇÃO
       =================================================== */


    if (
      typeof MotorProjecao !==
        "undefined" &&
      MotorProjecao &&
      typeof MotorProjecao.calcular ===
        "function"
    ) {

      const dadosProjecao = {

        ...jogadorCompleto,

        score:
          jogadorCompleto.score,

        /*
         * CORREÇÃO:
         * media3 e media5 agora são diferentes.
         */

        media3:
          calculo.media3,

        media5:
          calculo.media5,

        mediaGeral:
          calculo.mediaHistorica

      };


      const resultado =
        MotorProjecao.calcular(
          dadosProjecao
        );


      if (
        resultado &&
        typeof resultado ===
          "object"
      ) {

        Object.assign(
          jogadorCompleto,
          resultado
        );

      } else {

        jogadorCompleto.projecao =
          numero(
            resultado
          );

      }

    } else {

      jogadorCompleto.projecao =
        arredondar(
          calculo.mediaHistorica
        );

    }


    jogadorCompleto.projecao =
      arredondar(
        jogadorCompleto.projecao
      );


    /* ===================================================
       PROBABILIDADES
       =================================================== */


    if (
      typeof MotorProbabilidade !==
        "undefined" &&
      MotorProbabilidade &&
      typeof MotorProbabilidade.calcular ===
        "function"
    ) {

      const probabilidades =
        MotorProbabilidade.calcular(
          historico
        );


      jogadorCompleto.chance5 =
        probabilidades?.chance5;


      jogadorCompleto.chance10 =
        probabilidades?.chance10;


      jogadorCompleto.chance15 =
        probabilidades?.chance15;


      jogadorCompleto.chanceNegativar =
        probabilidades
          ?.chanceNegativar;

    }


    /* ===================================================
       CUSTO-BENEFÍCIO REAL
       =================================================== */


    const preco =
      numero(
        jogadorCompleto.preco
      );


    jogadorCompleto.custoBeneficio =
      preco > 0
        ? arredondar(
            jogadorCompleto
              .projecao /
            preco,
            2
          )
        : 0;


    /* ===================================================
       CAMPOS DE CONTEXTO
       =================================================== */


    jogadorCompleto.mando =
      jogador?.mando ??
      null;


    jogadorCompleto.adversario =
      jogador?.adversario ??
      null;


    jogadorCompleto.siglaAdversario =
      jogador?.siglaAdversario ??
      null;


    jogadorCompleto.chanceSG =
      arredondar(
        calcularChanceSG(
          jogadorCompleto
        ),
        1
      );


    /* ===================================================
       RESULTADO
       =================================================== */


    return {

      ...jogadorCompleto,

      notasCriterios:
        {
          ...calculo.notas
        },

      notaCalculada:
        resultadoMotor.notaFinal,

      notaFinal:
        resultadoMotor.notaFinal,

      notaModelo:
        resultadoMotor.notaFinal,

      classificacaoCalculada:
        resultadoMotor.classificacao,

      contribuicoesCalculadas:
        resultadoMotor.contribuicoes,

      pesosAplicados:
        resultadoMotor.pesosAplicados,

      explicacaoCalculada:
        resultadoMotor.explicacao,

      calculadoPeloMotor:
        true,

      erroCalculadora:
        resultadoMotor.erro

    };

  }


  /* =======================================================
     LISTA
     ======================================================= */


  function analisarListaJogadores(
    jogadores
  ) {

    if (
      !Array.isArray(
        jogadores
      )
    ) {

      return [];

    }


    return jogadores.map(
      analisarJogador
    );

  }


  /* =======================================================
     API
     ======================================================= */


  return {

    calcularNotasJogador,

    analisarJogador,

    analisarListaJogadores

  };


})();
