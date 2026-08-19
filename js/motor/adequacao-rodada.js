/* =========================================================
   CARTOLA ESTATÍSTICO
   Motor de Adequação à Rodada
   =========================================================

   Versão:
   adequacao_rodada_v1

   OBJETIVO

   Separar duas perguntas diferentes:

   1. O jogador é bom estatisticamente?
   2. O jogador é uma boa escolha PARA ESTA RODADA?

   Este motor trabalha somente a segunda pergunta.

   Considera, quando os dados estiverem disponíveis:

   - mando de campo;
   - força do adversário;
   - qualidade do confronto;
   - chance de SG;
   - pontos cedidos pela posição;
   - potencial ofensivo;
   - potencial defensivo;
   - forma recente;
   - tendência;
   - risco;
   - regularidade;
   - titularidade;
   - minutos esperados;
   - bola parada;
   - pênaltis;
   - posição do jogador.

   IMPORTANTE

   O motor é defensivo:
   se determinado dado não existir, ele NÃO inventa valor.
   Apenas reduz a confiança da análise.

   ========================================================= */


const MotorAdequacaoRodada = (() => {


  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */


  const VERSAO =
    "adequacao_rodada_v1";


  const POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];


  const LIMITES = {

    MUITO_ALTA: 78,

    ALTA: 66,

    MEDIA: 52,

    BAIXA: 38,

    EVITAR: 28

  };


  /*
   * Pesos-base da adequação.
   *
   * Eles NÃO substituem os pesos do motor estatístico.
   *
   * Servem apenas para avaliar o contexto da rodada.
   */

  const PESOS_BASE = {

    confronto: 20,

    mando: 7,

    formaRecente: 15,

    regularidade: 8,

    titularidade: 15,

    chanceSG: 0,

    potencialOfensivo: 0,

    potencialDefensivo: 0,

    pontosCedidos: 10,

    minutosEsperados: 8,

    tendencia: 7,

    bolaParada: 4,

    penaltis: 6,

    risco: 10

  };


  /*
   * Ajustes por posição.
   *
   * Aqui começa a leitura futebolística.
   */

  const PESOS_POSICAO = {

    GOL: {

      chanceSG: 22,

      potencialDefensivo: 12,

      potencialOfensivo: 0,

      pontosCedidos: 4,

      confronto: 17,

      bolaParada: 0,

      penaltis: 0

    },


    LAT: {

      chanceSG: 14,

      potencialDefensivo: 8,

      potencialOfensivo: 12,

      pontosCedidos: 10,

      confronto: 16,

      bolaParada: 4,

      penaltis: 2

    },


    ZAG: {

      chanceSG: 21,

      potencialDefensivo: 12,

      potencialOfensivo: 4,

      pontosCedidos: 7,

      confronto: 17,

      bolaParada: 1,

      penaltis: 0

    },


    MEI: {

      chanceSG: 0,

      potencialDefensivo: 2,

      potencialOfensivo: 19,

      pontosCedidos: 15,

      confronto: 18,

      bolaParada: 7,

      penaltis: 7

    },


    ATA: {

      chanceSG: 0,

      potencialDefensivo: 0,

      potencialOfensivo: 24,

      pontosCedidos: 17,

      confronto: 19,

      bolaParada: 5,

      penaltis: 8

    },


    TEC: {

      chanceSG: 15,

      potencialDefensivo: 10,

      potencialOfensivo: 10,

      pontosCedidos: 3,

      confronto: 20,

      bolaParada: 0,

      penaltis: 0

    }

  };


  /* =======================================================
     UTILIDADES
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


  function limitar(
    valor,
    minimo = 0,
    maximo = 100
  ) {

    const n =
      numero(
        valor,
        minimo
      );


    return Math.max(
      minimo,
      Math.min(
        maximo,
        n
      )
    );

  }


  function arredondar(
    valor,
    casas = 2
  ) {

    const n =
      numero(
        valor,
        0
      );


    return Number(
      n.toFixed(
        casas
      )
    );

  }


  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    )
      .trim()
      .toLowerCase();

  }


  function normalizarPosicao(
    jogador
  ) {

    return String(
      jogador?.posicao ??
      jogador?.posicaoAbreviacao ??
      jogador?.posicaoNome ??
      ""
    )
      .trim()
      .toUpperCase();

  }


  function primeiroNumero(
    valores
  ) {

    for (
      const valor
      of valores
    ) {

      const encontrado =
        numero(
          valor,
          null
        );


      if (
        encontrado !== null
      ) {

        return encontrado;

      }

    }


    return null;

  }


  function primeiroBooleano(
    valores
  ) {

    for (
      const valor
      of valores
    ) {

      if (
        typeof valor ===
        "boolean"
      ) {

        return valor;

      }


      if (
        valor === 1 ||
        valor === "1"
      ) {

        return true;

      }


      if (
        valor === 0 ||
        valor === "0"
      ) {

        return false;

      }


      const normalizado =
        texto(
          valor
        );


      if (
        [
          "sim",
          "true",
          "yes",
          "casa",
          "mandante"
        ].includes(
          normalizado
        )
      ) {

        return true;

      }


      if (
        [
          "nao",
          "não",
          "false",
          "no",
          "fora",
          "visitante"
        ].includes(
          normalizado
        )
      ) {

        return false;

      }

    }


    return null;

  }


  /* =======================================================
     NORMALIZAÇÃO DE NOTAS
     ======================================================= */


  function normalizarPercentual(
    valor
  ) {

    const n =
      numero(
        valor,
        null
      );


    if (
      n === null
    ) {

      return null;

    }


    if (
      n >= 0 &&
      n <= 1
    ) {

      return limitar(
        n * 100
      );

    }


    return limitar(
      n
    );

  }


  function normalizarNota(
    valor
  ) {

    return normalizarPercentual(
      valor
    );

  }


  function pontuacaoParaNota(
    valor
  ) {

    const n =
      numero(
        valor,
        null
      );


    if (
      n === null
    ) {

      return null;

    }


    /*
     * Pontuação Cartola aproximada.
     *
     * 0 pontos = nota 35
     * 5 pontos = nota 60
     * 10 pontos = nota 85
     */

    return limitar(
      35 +
      (
        n * 5
      )
    );

  }


  /* =======================================================
     MANDO
     ======================================================= */


  function obterMando(
    jogador
  ) {

    const booleano =
      primeiroBooleano([
        jogador?.mandante,
        jogador?.jogaEmCasa,
        jogador?.emCasa,
        jogador?.casa,
        jogador?.mandoCasa
      ]);


    if (
      booleano !== null
    ) {

      return booleano;

    }


    const mando =
      texto(
        jogador?.mando ??
        jogador?.localJogo ??
        jogador?.casaFora
      );


    if (
      [
        "casa",
        "mandante",
        "home"
      ].includes(
        mando
      )
    ) {

      return true;

    }


    if (
      [
        "fora",
        "visitante",
        "away"
      ].includes(
        mando
      )
    ) {

      return false;

    }


    return null;

  }


  function calcularNotaMando(
    jogador
  ) {

    const mando =
      obterMando(
        jogador
      );


    if (
      mando === true
    ) {

      return 65;

    }


    if (
      mando === false
    ) {

      return 45;

    }


    const notaExistente =
      primeiroNumero([
        jogador?.notaCasaFora,
        jogador?.notaMando
      ]);


    return normalizarNota(
      notaExistente
    );

  }


  /* =======================================================
     CONFRONTO
     ======================================================= */


  function calcularNotaConfronto(
    jogador
  ) {

    const nota =
      primeiroNumero([

        jogador?.notaConfronto,

        jogador?.forcaConfronto,

        jogador?.notaForcaAdversario,

        jogador?.confronto?.nota,

        jogador?.adversario?.notaConfronto

      ]);


    if (
      nota !== null
    ) {

      return normalizarNota(
        nota
      );

    }


    /*
     * Caso exista dificuldade numa escala onde
     * número maior = confronto mais difícil.
     */

    const dificuldade =
      primeiroNumero([

        jogador?.dificuldadeConfronto,

        jogador?.dificuldadeAdversario,

        jogador?.adversario?.dificuldade

      ]);


    if (
      dificuldade !== null
    ) {

      const normalizada =
        normalizarNota(
          dificuldade
        );


      if (
        normalizada !== null
      ) {

        return (
          100 -
          normalizada
        );

      }

    }


    return null;

  }


  /* =======================================================
     CHANCE DE SG
     ======================================================= */


  function calcularNotaSG(
    jogador
  ) {

    return normalizarPercentual(
      primeiroNumero([

        jogador?.chanceSG,

        jogador?.probabilidadeSG,

        jogador?.probabilidadeSemGol,

        jogador?.chanceCleanSheet,

        jogador?.confronto?.chanceSG

      ])
    );

  }


  /* =======================================================
     PONTOS CEDIDOS
     ======================================================= */


  function calcularNotaPontosCedidos(
    jogador
  ) {

    const nota =
      primeiroNumero([

        jogador?.notaPontosCedidos,

        jogador?.pontosCedidosNota,

        jogador?.adversario?.notaPontosCedidos,

        jogador?.confronto?.notaPontosCedidos

      ]);


    if (
      nota !== null
    ) {

      return normalizarNota(
        nota
      );

    }


    const pontos =
      primeiroNumero([

        jogador?.pontosCedidosPosicao,

        jogador?.mediaPontosCedidosPosicao,

        jogador?.adversario?.pontosCedidosPosicao

      ]);


    return pontuacaoParaNota(
      pontos
    );

  }


  /* =======================================================
     FORMA
     ======================================================= */


  function calcularNotaForma(
    jogador
  ) {

    const nota =
      primeiroNumero([

        jogador?.notaForma,

        jogador?.formaNota,

        jogador?.componentes?.formaRecente

      ]);


    if (
      nota !== null
    ) {

      return normalizarNota(
        nota
      );

    }


    const mediaRecente =
      primeiroNumero([

        jogador?.media3,

        jogador?.mediaRecente,

        jogador?.media5

      ]);


    return pontuacaoParaNota(
      mediaRecente
    );

  }


  /* =======================================================
     REGULARIDADE
     ======================================================= */


  function calcularNotaRegularidade(
    jogador
  ) {

    return normalizarNota(
      primeiroNumero([

        jogador?.regularidade,

        jogador?.notaRegularidade,

        jogador?.componentes?.regularidade

      ])
    );

  }


  /* =======================================================
     TITULARIDADE
     ======================================================= */


  function calcularNotaTitularidade(
    jogador
  ) {

    return normalizarPercentual(
      primeiroNumero([

        jogador?.titularidade,

        jogador?.probabilidadeTitular,

        jogador?.chanceTitularidade,

        jogador?.viabilidade?.titularidade

      ])
    );

  }


  /* =======================================================
     MINUTOS
     ======================================================= */


  function calcularNotaMinutos(
    jogador
  ) {

    const minutos =
      primeiroNumero([

        jogador?.minutosEsperados,

        jogador?.minutosProvaveis

      ]);


    if (
      minutos === null
    ) {

      return null;

    }


    return limitar(
      (
        minutos /
        90
      ) *
      100
    );

  }


  /* =======================================================
     POTENCIAL OFENSIVO
     ======================================================= */


  function calcularNotaOfensiva(
    jogador
  ) {

    return normalizarNota(
      primeiroNumero([

        jogador?.potencialOfensivo,

        jogador?.notaPotencialOfensivo,

        jogador?.notaScoutsOfensivos,

        jogador?.componentes
          ?.scoutsOfensivos

      ])
    );

  }


  /* =======================================================
     POTENCIAL DEFENSIVO
     ======================================================= */


  function calcularNotaDefensiva(
    jogador
  ) {

    return normalizarNota(
      primeiroNumero([

        jogador?.potencialDefensivo,

        jogador?.notaPotencialDefensivo,

        jogador?.notaScoutsDefensivos,

        jogador?.componentes
          ?.scoutsDefensivos

      ])
    );

  }


  /* =======================================================
     TENDÊNCIA
     ======================================================= */


  function calcularNotaTendencia(
    jogador
  ) {

    const direta =
      primeiroNumero([

        jogador?.notaTendencia,

        jogador?.tendenciaNota,

        jogador?.componentes
          ?.tendenciaRecente

      ]);


    if (
      direta !== null
    ) {

      return normalizarNota(
        direta
      );

    }


    const mediaRecente =
      primeiroNumero([

        jogador?.media3,

        jogador?.mediaRecente,

        jogador?.media5

      ]);


    const mediaGeral =
      primeiroNumero([

        jogador?.mediaGeral,

        jogador?.media

      ]);


    if (
      mediaRecente === null ||
      mediaGeral === null
    ) {

      return null;

    }


    return limitar(
      50 +
      (
        (
          mediaRecente -
          mediaGeral
        ) *
        8
      )
    );

  }


  /* =======================================================
     RISCO
     ======================================================= */


  function calcularNotaRisco(
    jogador
  ) {

    const riscoEscalacao =
      primeiroNumero([

        jogador?.riscoEscalacao,

        jogador?.viabilidade
          ?.riscoEscalacao

      ]);


    if (
      riscoEscalacao !== null
    ) {

      return (
        100 -
        normalizarPercentual(
          riscoEscalacao
        )
      );

    }


    const risco =
      primeiroNumero([

        jogador?.risco,

        jogador?.riscoNegativar,

        jogador?.notaRisco

      ]);


    if (
      risco !== null
    ) {

      return (
        100 -
        normalizarPercentual(
          risco
        )
      );

    }


    return null;

  }


  /* =======================================================
     BOLA PARADA
     ======================================================= */


  function calcularNotaBolaParada(
    jogador
  ) {

    const cobra =
      primeiroBooleano([

        jogador?.cobraBolaParada,

        jogador?.bolaParada,

        jogador?.cobradorFalta,

        jogador?.cobradorEscanteio

      ]);


    if (
      cobra === true
    ) {

      return 100;

    }


    if (
      cobra === false
    ) {

      return 0;

    }


    return null;

  }


  /* =======================================================
     PÊNALTIS
     ======================================================= */


  function calcularNotaPenaltis(
    jogador
  ) {

    const cobra =
      primeiroBooleano([

        jogador?.cobraPenalti,

        jogador?.cobradorPenalti,

        jogador?.penaltis

      ]);


    if (
      cobra === true
    ) {

      return 100;

    }


    if (
      cobra === false
    ) {

      return 0;

    }


    return null;

  }


  /* =======================================================
     PESOS
     ======================================================= */


  function obterPesos(
    jogador
  ) {

    const posicao =
      normalizarPosicao(
        jogador
      );


    const especificos =
      PESOS_POSICAO[
        posicao
      ] ??
      {};


    return {

      ...PESOS_BASE,

      ...especificos

    };

  }


  /* =======================================================
     COMPONENTES
     ======================================================= */


  function obterComponentes(
    jogador
  ) {

    return {

      confronto:
        calcularNotaConfronto(
          jogador
        ),

      mando:
        calcularNotaMando(
          jogador
        ),

      formaRecente:
        calcularNotaForma(
          jogador
        ),

      regularidade:
        calcularNotaRegularidade(
          jogador
        ),

      titularidade:
        calcularNotaTitularidade(
          jogador
        ),

      chanceSG:
        calcularNotaSG(
          jogador
        ),

      potencialOfensivo:
        calcularNotaOfensiva(
          jogador
        ),

      potencialDefensivo:
        calcularNotaDefensiva(
          jogador
        ),

      pontosCedidos:
        calcularNotaPontosCedidos(
          jogador
        ),

      minutosEsperados:
        calcularNotaMinutos(
          jogador
        ),

      tendencia:
        calcularNotaTendencia(
          jogador
        ),

      bolaParada:
        calcularNotaBolaParada(
          jogador
        ),

      penaltis:
        calcularNotaPenaltis(
          jogador
        ),

      risco:
        calcularNotaRisco(
          jogador
        )

    };

  }


  /* =======================================================
     NOTA FINAL
     ======================================================= */


  function calcularNotaFinal(
    componentes,
    pesos
  ) {

    let soma = 0;

    let somaPesos = 0;


    Object.entries(
      componentes
    ).forEach(
      ([
        componente,
        nota
      ]) => {

        if (
          nota === null ||
          nota === undefined
        ) {

          return;

        }


        const peso =
          numero(
            pesos[
              componente
            ],
            0
          );


        if (
          peso <= 0
        ) {

          return;

        }


        soma +=
          limitar(
            nota
          ) *
          peso;


        somaPesos +=
          peso;

      }
    );


    if (
      somaPesos <= 0
    ) {

      return null;

    }


    return arredondar(
      soma /
      somaPesos,
      2
    );

  }


  /* =======================================================
     COBERTURA DOS DADOS
     ======================================================= */


  function calcularCobertura(
    componentes,
    pesos
  ) {

    let pesoTotal = 0;

    let pesoDisponivel = 0;


    Object.entries(
      pesos
    ).forEach(
      ([
        componente,
        peso
      ]) => {

        const pesoNumerico =
          numero(
            peso,
            0
          );


        if (
          pesoNumerico <= 0
        ) {

          return;

        }


        pesoTotal +=
          pesoNumerico;


        if (
          componentes[
            componente
          ] !== null &&
          componentes[
            componente
          ] !== undefined
        ) {

          pesoDisponivel +=
            pesoNumerico;

        }

      }
    );


    if (
      pesoTotal === 0
    ) {

      return 0;

    }


    return arredondar(
      (
        pesoDisponivel /
        pesoTotal
      ) *
      100,
      1
    );

  }


  /* =======================================================
     CLASSIFICAÇÃO
     ======================================================= */


  function classificar(
    nota
  ) {

    if (
      nota === null
    ) {

      return "SEM_DADOS";

    }


    if (
      nota >=
      LIMITES.MUITO_ALTA
    ) {

      return "MUITO_ALTA";

    }


    if (
      nota >=
      LIMITES.ALTA
    ) {

      return "ALTA";

    }


    if (
      nota >=
      LIMITES.MEDIA
    ) {

      return "MEDIA";

    }


    if (
      nota >=
      LIMITES.BAIXA
    ) {

      return "BAIXA";

    }


    if (
      nota >=
      LIMITES.EVITAR
    ) {

      return "MUITO_BAIXA";

    }


    return "EVITAR";

  }


  /* =======================================================
     PONTOS FORTES
     ======================================================= */


  function gerarPontosFortes(
    componentes
  ) {

    const fortes = [];


    const adicionar =
      (
        chave,
        limite,
        mensagem
      ) => {

        const valor =
          componentes[
            chave
          ];


        if (
          valor !== null &&
          valor >=
          limite
        ) {

          fortes.push(
            mensagem
          );

        }

      };


    adicionar(
      "titularidade",
      80,
      "Boa segurança de titularidade."
    );


    adicionar(
      "confronto",
      70,
      "Confronto favorável para a rodada."
    );


    adicionar(
      "formaRecente",
      70,
      "Chega em boa forma recente."
    );


    adicionar(
      "regularidade",
      70,
      "Apresenta boa regularidade."
    );


    adicionar(
      "chanceSG",
      65,
      "Boa perspectiva de saldo de gols."
    );


    adicionar(
      "potencialOfensivo",
      70,
      "Bom potencial ofensivo no confronto."
    );


    adicionar(
      "potencialDefensivo",
      70,
      "Bom potencial defensivo."
    );


    adicionar(
      "pontosCedidos",
      70,
      "Adversário costuma permitir boa pontuação à posição."
    );


    adicionar(
      "minutosEsperados",
      80,
      "Boa expectativa de minutos em campo."
    );


    adicionar(
      "tendencia",
      65,
      "Tendência recente positiva."
    );


    adicionar(
      "risco",
      75,
      "Baixo risco para a rodada."
    );


    if (
      componentes.bolaParada ===
      100
    ) {

      fortes.push(
        "Participa de bolas paradas."
      );

    }


    if (
      componentes.penaltis ===
      100
    ) {

      fortes.push(
        "Possui potencial adicional por cobrança de pênaltis."
      );

    }


    return fortes;

  }


  /* =======================================================
     ALERTAS
     ======================================================= */


  function gerarAlertas(
    componentes
  ) {

    const alertas = [];


    const adicionar =
      (
        chave,
        limite,
        mensagem
      ) => {

        const valor =
          componentes[
            chave
          ];


        if (
          valor !== null &&
          valor <
          limite
        ) {

          alertas.push(
            mensagem
          );

        }

      };


    adicionar(
      "titularidade",
      55,
      "Titularidade não está suficientemente segura."
    );


    adicionar(
      "confronto",
      40,
      "Confronto desfavorável."
    );


    adicionar(
      "formaRecente",
      40,
      "Forma recente abaixo do ideal."
    );


    adicionar(
      "regularidade",
      40,
      "Baixa regularidade."
    );


    adicionar(
      "chanceSG",
      35,
      "Baixa chance de saldo de gols."
    );


    adicionar(
      "pontosCedidos",
      35,
      "Adversário costuma limitar a pontuação desta posição."
    );


    adicionar(
      "minutosEsperados",
      55,
      "Expectativa de minutos abaixo do ideal."
    );


    adicionar(
      "risco",
      45,
      "Risco elevado para a rodada."
    );


    return alertas;

  }


  /* =======================================================
     PRINCIPAL MOTIVO
     ======================================================= */


  function obterPrincipalMotivo(
    componentes,
    pesos
  ) {

    const candidatos = [];


    Object.entries(
      componentes
    ).forEach(
      ([
        componente,
        nota
      ]) => {

        if (
          nota === null ||
          nota === undefined
        ) {

          return;

        }


        const peso =
          numero(
            pesos[
              componente
            ],
            0
          );


        if (
          peso <= 0
        ) {

          return;

        }


        candidatos.push({

          componente,

          nota,

          impacto:
            (
              nota -
              50
            ) *
            peso

        });

      }
    );


    candidatos.sort(
      (
        a,
        b
      ) =>
        Math.abs(
          b.impacto
        ) -
        Math.abs(
          a.impacto
        )
    );


    const principal =
      candidatos[0];


    if (!principal) {

      return null;

    }


    const nomes = {

      confronto:
        "confronto",

      mando:
        "mando de campo",

      formaRecente:
        "forma recente",

      regularidade:
        "regularidade",

      titularidade:
        "titularidade",

      chanceSG:
        "chance de SG",

      potencialOfensivo:
        "potencial ofensivo",

      potencialDefensivo:
        "potencial defensivo",

      pontosCedidos:
        "pontos cedidos pelo adversário",

      minutosEsperados:
        "minutos esperados",

      tendencia:
        "tendência recente",

      bolaParada:
        "bola parada",

      penaltis:
        "cobrança de pênaltis",

      risco:
        "risco"

    };


    return {

      componente:
        principal.componente,

      nome:
        nomes[
          principal.componente
        ] ??
        principal.componente,

      nota:
        arredondar(
          principal.nota,
          1
        ),

      impacto:
        arredondar(
          principal.impacto,
          2
        ),

      positivo:
        principal.impacto >= 0

    };

  }


  /* =======================================================
     FATOR PARA O RANKING
     ======================================================= */


  function calcularFatorRanking(
    nota,
    cobertura
  ) {

    if (
      nota === null
    ) {

      return 1;

    }


    /*
     * Cobertura baixa = influência menor.
     *
     * Isso evita que uma análise parcial tenha força
     * exagerada sobre o ranking.
     */

    const confiancaDados =
      limitar(
        cobertura
      ) /
      100;


    /*
     * Nota 50 = neutro.
     *
     * Nota 100 pode chegar aproximadamente a +20%.
     * Nota 0 pode chegar aproximadamente a -20%.
     */

    const desvio =
      (
        nota -
        50
      ) /
      50;


    const ajuste =
      desvio *
      0.20 *
      confiancaDados;


    return arredondar(
      limitar(
        1 + ajuste,
        0.75,
        1.25
      ),
      4
    );

  }


  /* =======================================================
     ELEGIBILIDADE
     ======================================================= */


  function calcularElegibilidade(
    nota,
    classificacao,
    componentes
  ) {

    /*
     * Não bloqueamos jogador só por confronto ruim.
     *
     * Bloqueio acontece apenas quando contexto ruim se
     * combina com risco de utilização.
     */

    if (
      classificacao ===
        "EVITAR" &&
      componentes.titularidade !== null &&
      componentes.titularidade < 50
    ) {

      return false;

    }


    if (
      componentes.titularidade !== null &&
      componentes.titularidade < 25
    ) {

      return false;

    }


    if (
      componentes.minutosEsperados !== null &&
      componentes.minutosEsperados < 30
    ) {

      return false;

    }


    return true;

  }


  /* =======================================================
     JUSTIFICATIVA
     ======================================================= */


  function gerarJustificativa(
    resultado
  ) {

    if (
      resultado.nota ===
      null
    ) {

      return (
        "Ainda não há dados suficientes de confronto para " +
        "avaliar a adequação deste jogador à rodada."
      );

    }


    const principal =
      resultado.principalMotivo;


    const motivo =
      principal
        ? (
            principal.positivo
              ? `Principal ponto favorável: ${principal.nome} (${principal.nota}).`
              : `Principal ponto de atenção: ${principal.nome} (${principal.nota}).`
          )
        : "";


    return (
      `Adequação à rodada: ${resultado.nota}/100 ` +
      `(${resultado.classificacao}). ` +
      `${motivo} ` +
      `Cobertura dos dados: ${resultado.cobertura}%.`
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  }


  /* =======================================================
     CÁLCULO PRINCIPAL
     ======================================================= */


  function calcular(
    jogador
  ) {

    if (
      !jogador ||
      typeof jogador !==
        "object"
    ) {

      return {

        versao:
          VERSAO,

        nota:
          null,

        classificacao:
          "SEM_DADOS",

        cobertura:
          0,

        fatorRanking:
          1,

        elegivel:
          false,

        componentes:
          {},

        pesos:
          {},

        pontosFortes: [],

        alertas: [
          "Jogador inválido."
        ],

        principalMotivo:
          null,

        justificativa:
          "Jogador inválido."

      };

    }


    const posicao =
      normalizarPosicao(
        jogador
      );


    const componentes =
      obterComponentes(
        jogador
      );


    const pesos =
      obterPesos(
        jogador
      );


    const nota =
      calcularNotaFinal(
        componentes,
        pesos
      );


    const cobertura =
      calcularCobertura(
        componentes,
        pesos
      );


    const classificacao =
      classificar(
        nota
      );


    const fatorRanking =
      calcularFatorRanking(
        nota,
        cobertura
      );


    const elegivel =
      calcularElegibilidade(
        nota,
        classificacao,
        componentes
      );


    const pontosFortes =
      gerarPontosFortes(
        componentes
      );


    const alertas =
      gerarAlertas(
        componentes
      );


    const principalMotivo =
      obterPrincipalMotivo(
        componentes,
        pesos
      );


    const resultado = {

      versao:
        VERSAO,

      posicao,

      nota,

      classificacao,

      cobertura,

      fatorRanking,

      elegivel,

      componentes,

      pesos,

      pontosFortes,

      alertas,

      principalMotivo

    };


    resultado.justificativa =
      gerarJustificativa(
        resultado
      );


    return resultado;

  }


  /* =======================================================
     APLICAÇÃO NO JOGADOR
     ======================================================= */


  function aplicar(
    jogador
  ) {

    const resultado =
      calcular(
        jogador
      );


    return {

      ...jogador,


      adequacaoRodada:
        resultado,


      notaAdequacaoRodada:
        resultado.nota,


      classificacaoAdequacaoRodada:
        resultado.classificacao,


      coberturaAdequacaoRodada:
        resultado.cobertura,


      fatorAdequacaoRodada:
        resultado.fatorRanking,


      elegivelAdequacaoRodada:
        resultado.elegivel,


      pontosFortesRodada:
        resultado.pontosFortes,


      alertasRodada:
        resultado.alertas,


      justificativaRodada:
        resultado.justificativa

    };

  }


  /* =======================================================
     APLICAÇÃO EM LISTA
     ======================================================= */


  function aplicarLista(
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
      aplicar
    );

  }


  /* =======================================================
     DIAGNÓSTICO
     ======================================================= */


  function diagnosticar(
    jogador
  ) {

    const resultado =
      calcular(
        jogador
      );


    console.log(
      "===================================="
    );

    console.log(
      "ADEQUAÇÃO À RODADA"
    );

    console.log(
      jogador?.apelido ??
      jogador?.nome ??
      jogador?.id
    );

    console.log(
      "Nota:",
      resultado.nota
    );

    console.log(
      "Classificação:",
      resultado.classificacao
    );

    console.log(
      "Cobertura:",
      `${resultado.cobertura}%`
    );

    console.log(
      "Fator ranking:",
      resultado.fatorRanking
    );

    console.log(
      "Elegível:",
      resultado.elegivel
    );

    console.table(
      resultado.componentes
    );

    console.log(
      "Pontos fortes:",
      resultado.pontosFortes
    );

    console.log(
      "Alertas:",
      resultado.alertas
    );

    console.log(
      resultado.justificativa
    );

    console.log(
      "===================================="
    );


    return resultado;

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */


  return {

    versao:
      VERSAO,

    calcular,

    aplicar,

    aplicarLista,

    diagnosticar,

    obterComponentes,

    obterPesos

  };


})();
