/* =========================================================
   CARTOLA ESTATÍSTICO
   Motor de Viabilidade da Rodada
   =========================================================

   Versão:
   viabilidade_v1

   Objetivo:

   Evitar que o modelo recomende jogadores apenas porque
   possuem bons números históricos.

   Esta camada avalia:

   - status no mercado;
   - probabilidade de titularidade;
   - evidências recentes de titularidade;
   - risco de não iniciar;
   - risco de não entrar em campo;
   - disponibilidade;
   - quantidade de jogos;
   - confiança da informação;
   - projeção ajustada à chance real de utilização.

   IMPORTANTE:

   Este motor NÃO substitui MotorProjecao.

   Ele recebe a projeção estatística já calculada e produz:

   - viabilidade;
   - titularidade estimada;
   - risco de escalação;
   - fator de disponibilidade;
   - projeção ajustada;
   - motivos positivos;
   - alertas;
   - justificativa objetiva.

   ========================================================= */


const MotorViabilidade = (() => {


  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */


  const VERSAO =
    "viabilidade_v1";


  const STATUS = {

    PROVAVEL: 7,

    DUVIDA: 2,

    SUSPENSO: 3,

    CONTUNDIDO: 5,

    NULO: 6

  };


  const LIMITES = {

    TITULARIDADE_MUITO_ALTA: 90,

    TITULARIDADE_ALTA: 75,

    TITULARIDADE_MEDIA: 55,

    TITULARIDADE_BAIXA: 35,

    BLOQUEIO_TITULARIDADE: 25,

    CONFIANCA_MINIMA: 35,

    JOGOS_POUCOS: 2

  };


  /* =======================================================
     UTILIDADES
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

    return Math.max(
      minimo,
      Math.min(
        maximo,
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


  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    )
      .trim()
      .toLowerCase();

  }


  function booleano(
    valor
  ) {

    if (
      valor === true ||
      valor === 1 ||
      valor === "1"
    ) {

      return true;

    }


    const normalizado =
      texto(valor);


    return [
      "true",
      "sim",
      "yes",
      "titular",
      "provavel",
      "provável"
    ].includes(
      normalizado
    );

  }


  /* =======================================================
     PROJEÇÃO
     ======================================================= */


  function obterProjecao(
    jogador
  ) {

    const possibilidades = [

      jogador?.projecao,

      jogador?.projecaoCalibrada,

      jogador?.projecaoOriginal,

      jogador?.score

    ];


    for (
      const valor
      of possibilidades
    ) {

      const convertido =
        Number(valor);


      if (
        Number.isFinite(
          convertido
        )
      ) {

        return convertido;

      }

    }


    return 0;

  }


  /* =======================================================
     STATUS
     ======================================================= */


  function obterStatusId(
    jogador
  ) {

    const possibilidades = [

      jogador?.statusId,

      jogador?.status_id,

      jogador?.status?.id

    ];


    for (
      const valor
      of possibilidades
    ) {

      const convertido =
        Number(valor);


      if (
        Number.isFinite(
          convertido
        )
      ) {

        return convertido;

      }

    }


    return null;

  }


  function obterStatusTexto(
    jogador
  ) {

    return texto(

      jogador?.statusNome ??

      jogador?.status ??

      jogador?.statusDescricao ??

      jogador?.status?.nome

    );

  }


  function statusBloqueado(
    jogador
  ) {

    const statusId =
      obterStatusId(
        jogador
      );


    if (
      [
        STATUS.SUSPENSO,
        STATUS.CONTUNDIDO,
        STATUS.NULO
      ].includes(
        statusId
      )
    ) {

      return true;

    }


    const statusTexto =
      obterStatusTexto(
        jogador
      );


    return [

      "suspenso",

      "contundido",

      "machucado",

      "lesionado",

      "fora",

      "nulo"

    ].some(
      termo =>
        statusTexto.includes(
          termo
        )
    );

  }


  function statusDuvida(
    jogador
  ) {

    const statusId =
      obterStatusId(
        jogador
      );


    if (
      statusId ===
      STATUS.DUVIDA
    ) {

      return true;

    }


    const statusTexto =
      obterStatusTexto(
        jogador
      );


    return (

      statusTexto.includes(
        "dúvida"
      ) ||

      statusTexto.includes(
        "duvida"
      )

    );

  }


  function statusProvavel(
    jogador
  ) {

    const statusId =
      obterStatusId(
        jogador
      );


    if (
      statusId ===
      STATUS.PROVAVEL
    ) {

      return true;

    }


    const statusTexto =
      obterStatusTexto(
        jogador
      );


    return (

      statusTexto.includes(
        "provável"
      ) ||

      statusTexto.includes(
        "provavel"
      )

    );

  }


  /* =======================================================
     EVIDÊNCIAS DE TITULARIDADE
     ======================================================= */


  function obterTitularidadeExplicita(
    jogador
  ) {

    const camposBooleanos = [

      jogador?.titular,

      jogador?.ehTitular,

      jogador?.provavelTitular,

      jogador?.titularProvavel,

      jogador?.escaladoComoTitular

    ];


    for (
      const valor
      of camposBooleanos
    ) {

      if (
        valor !== undefined &&
        valor !== null
      ) {

        return booleano(
          valor
        )
          ? 100
          : 20;

      }

    }


    const camposNumericos = [

      jogador?.titularidade,

      jogador?.probabilidadeTitular,

      jogador?.probabilidadeTitularidade,

      jogador?.chanceTitular,

      jogador?.chanceTitularidade

    ];


    for (
      const valor
      of camposNumericos
    ) {

      const convertido =
        Number(valor);


      if (
        Number.isFinite(
          convertido
        )
      ) {

        if (
          convertido >= 0 &&
          convertido <= 1
        ) {

          return limitar(
            convertido * 100
          );

        }


        return limitar(
          convertido
        );

      }

    }


    return null;

  }


  function obterIndicadorJogosRecentes(
    jogador
  ) {

    const possibilidades = [

      jogador?.titularUltimos5,

      jogador?.titularidadesUltimos5,

      jogador?.jogosTitularUltimos5,

      jogador?.iniciouUltimos5

    ];


    for (
      const valor
      of possibilidades
    ) {

      const convertido =
        Number(valor);


      if (
        Number.isFinite(
          convertido
        )
      ) {

        return limitar(
          (
            convertido /
            5
          ) * 100
        );

      }

    }


    return null;

  }


  /* =======================================================
     TITULARIDADE ESTIMADA
     ======================================================= */


  function calcularTitularidade(
    jogador
  ) {

    const explicita =
      obterTitularidadeExplicita(
        jogador
      );


    if (
      explicita !== null
    ) {

      return arredondar(
        explicita,
        1
      );

    }


    const recente =
      obterIndicadorJogosRecentes(
        jogador
      );


    let titularidade = 50;


    if (
      statusProvavel(
        jogador
      )
    ) {

      titularidade += 25;

    }


    if (
      statusDuvida(
        jogador
      )
    ) {

      titularidade -= 25;

    }


    if (
      statusBloqueado(
        jogador
      )
    ) {

      return 0;

    }


    if (
      recente !== null
    ) {

      titularidade = (

        titularidade * 0.45 +

        recente * 0.55

      );

    }


    const entrouEmCampo =
      jogador?.entrouEmCampo;


    if (
      entrouEmCampo === false
    ) {

      titularidade -= 15;

    }


    return arredondar(
      limitar(
        titularidade
      ),
      1
    );

  }


  /* =======================================================
     RISCO DE ESCALAÇÃO
     ======================================================= */


  function calcularRiscoEscalacao(
    jogador,
    titularidade
  ) {

    let risco =
      100 -
      numero(
        titularidade
      );


    if (
      statusDuvida(
        jogador
      )
    ) {

      risco += 20;

    }


    if (
      statusBloqueado(
        jogador
      )
    ) {

      risco = 100;

    }


    const jogos =
      numero(
        jogador?.jogos
      );


    if (
      jogos <=
      LIMITES.JOGOS_POUCOS
    ) {

      risco += 8;

    }


    const confianca =
      numero(
        jogador?.confianca,
        50
      );


    if (
      confianca <
      LIMITES.CONFIANCA_MINIMA
    ) {

      risco += 7;

    }


    return arredondar(
      limitar(
        risco
      ),
      1
    );

  }


  /* =======================================================
     FATOR DE DISPONIBILIDADE
     ======================================================= */


  function calcularFatorDisponibilidade(
    jogador,
    titularidade
  ) {

    if (
      statusBloqueado(
        jogador
      )
    ) {

      return 0;

    }


    let fator =
      numero(
        titularidade
      ) /
      100;


    /*
     * Um "provável" não recebe 100% automaticamente.
     *
     * A ideia é impedir que status de mercado sozinho
     * seja tratado como confirmação de titularidade.
     */

    if (
      statusProvavel(
        jogador
      )
    ) {

      fator =
        Math.max(
          fator,
          0.72
        );

    }


    if (
      statusDuvida(
        jogador
      )
    ) {

      fator =
        Math.min(
          fator,
          0.55
        );

    }


    return arredondar(
      limitar(
        fator,
        0,
        1
      ),
      4
    );

  }


  /* =======================================================
     PROJEÇÃO AJUSTADA
     ======================================================= */


  function calcularProjecaoAjustada(
    jogador,
    fatorDisponibilidade
  ) {

    const projecao =
      obterProjecao(
        jogador
      );


    /*
     * Não multiplicamos simplesmente por toda a chance
     * de titularidade, pois isso reduziria demais jogadores
     * sem informação completa.
     *
     * Usamos uma penalização progressiva.
     */

    const fator =
      0.35 +
      (
        numero(
          fatorDisponibilidade
        ) *
        0.65
      );


    return arredondar(
      projecao *
      fator,
      2
    );

  }


  /* =======================================================
     CLASSIFICAÇÃO
     ======================================================= */


  function classificarViabilidade(
    jogador,
    titularidade,
    risco
  ) {

    if (
      statusBloqueado(
        jogador
      )
    ) {

      return "BLOQUEADO";

    }


    if (
      titularidade <
      LIMITES.BLOQUEIO_TITULARIDADE
    ) {

      return "EVITAR";

    }


    if (
      titularidade >=
        LIMITES.TITULARIDADE_MUITO_ALTA &&
      risco <= 20
    ) {

      return "MUITO_ALTA";

    }


    if (
      titularidade >=
      LIMITES.TITULARIDADE_ALTA
    ) {

      return "ALTA";

    }


    if (
      titularidade >=
      LIMITES.TITULARIDADE_MEDIA
    ) {

      return "MEDIA";

    }


    return "BAIXA";

  }


  /* =======================================================
     MOTIVOS
     ======================================================= */


  function gerarMotivos(
    jogador,
    titularidade,
    classificacao
  ) {

    const motivos = [];


    if (
      titularidade >=
      LIMITES.TITULARIDADE_MUITO_ALTA
    ) {

      motivos.push(
        "Alta probabilidade estimada de iniciar a partida."
      );

    } else if (
      titularidade >=
      LIMITES.TITULARIDADE_ALTA
    ) {

      motivos.push(
        "Boa probabilidade estimada de titularidade."
      );

    }


    if (
      statusProvavel(
        jogador
      )
    ) {

      motivos.push(
        "Status atual favorável para escalação."
      );

    }


    const jogos =
      numero(
        jogador?.jogos
      );


    if (
      jogos >= 5
    ) {

      motivos.push(
        "Possui amostra de jogos suficiente para análise."
      );

    }


    const confianca =
      numero(
        jogador?.confianca
      );


    if (
      confianca >= 75
    ) {

      motivos.push(
        `Confiança estatística elevada (${arredondar(
          confianca,
          1
        )}%).`
      );

    }


    if (
      classificacao ===
      "MUITO_ALTA"
    ) {

      motivos.push(
        "Baixo risco operacional para a rodada."
      );

    }


    return motivos;

  }


  /* =======================================================
     ALERTAS
     ======================================================= */


  function gerarAlertas(
    jogador,
    titularidade,
    risco
  ) {

    const alertas = [];


    if (
      statusBloqueado(
        jogador
      )
    ) {

      alertas.push(
        "Jogador indisponível para utilização."
      );


      return alertas;

    }


    if (
      statusDuvida(
        jogador
      )
    ) {

      alertas.push(
        "Status de dúvida aumenta o risco de não iniciar."
      );

    }


    if (
      titularidade <
      LIMITES.TITULARIDADE_BAIXA
    ) {

      alertas.push(
        "Baixa probabilidade estimada de titularidade."
      );

    } else if (
      titularidade <
      LIMITES.TITULARIDADE_MEDIA
    ) {

      alertas.push(
        "Titularidade ainda não é suficientemente segura."
      );

    }


    const jogos =
      numero(
        jogador?.jogos
      );


    if (
      jogos <=
      LIMITES.JOGOS_POUCOS
    ) {

      alertas.push(
        "Poucos jogos disponíveis para avaliar estabilidade."
      );

    }


    if (
      risco >= 60
    ) {

      alertas.push(
        "Risco elevado de utilização na rodada."
      );

    }


    if (
      jogador?.entrouEmCampo ===
      false
    ) {

      alertas.push(
        "Registro recente indica ausência de participação."
      );

    }


    return alertas;

  }


  /* =======================================================
     JUSTIFICATIVA
     ======================================================= */


  function gerarJustificativa(
    resultado
  ) {

    const titularidade =
      resultado.titularidade;


    const risco =
      resultado.riscoEscalacao;


    const projecao =
      resultado.projecaoOriginal;


    const ajustada =
      resultado.projecaoAjustada;


    if (
      resultado.bloqueado
    ) {

      return (
        "Jogador retirado das recomendações por indisponibilidade " +
        "ou risco incompatível com uma escalação válida."
      );

    }


    return (

      `Titularidade estimada em ${titularidade}%, ` +

      `risco de escalação ${risco} e ` +

      `projeção ajustada de ${ajustada} pontos ` +

      `(projeção estatística original: ${projecao}).`

    );

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

        titularidade:
          0,

        riscoEscalacao:
          100,

        fatorDisponibilidade:
          0,

        projecaoOriginal:
          0,

        projecaoAjustada:
          0,

        classificacao:
          "BLOQUEADO",

        elegivel:
          false,

        bloqueado:
          true,

        motivos: [],

        alertas: [
          "Jogador inválido."
        ],

        justificativa:
          "Jogador inválido."

      };

    }


    const titularidade =
      calcularTitularidade(
        jogador
      );


    const riscoEscalacao =
      calcularRiscoEscalacao(
        jogador,
        titularidade
      );


    const fatorDisponibilidade =
      calcularFatorDisponibilidade(
        jogador,
        titularidade
      );


    const projecaoOriginal =
      arredondar(
        obterProjecao(
          jogador
        ),
        2
      );


    const projecaoAjustada =
      calcularProjecaoAjustada(
        jogador,
        fatorDisponibilidade
      );


    const classificacao =
      classificarViabilidade(
        jogador,
        titularidade,
        riscoEscalacao
      );


    const bloqueado =
      classificacao ===
        "BLOQUEADO" ||

      classificacao ===
        "EVITAR";


    const motivos =
      gerarMotivos(
        jogador,
        titularidade,
        classificacao
      );


    const alertas =
      gerarAlertas(
        jogador,
        titularidade,
        riscoEscalacao
      );


    const resultado = {

      versao:
        VERSAO,

      titularidade,

      riscoEscalacao,

      fatorDisponibilidade,

      projecaoOriginal,

      projecaoAjustada,

      classificacao,

      elegivel:
        !bloqueado,

      bloqueado,

      motivos,

      alertas

    };


    resultado.justificativa =
      gerarJustificativa(
        resultado
      );


    return resultado;

  }


  /* =======================================================
     APLICAÇÃO AO JOGADOR
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

      viabilidade:
        resultado,

      titularidade:
        resultado.titularidade,

      riscoEscalacao:
        resultado.riscoEscalacao,

      fatorDisponibilidade:
        resultado.fatorDisponibilidade,

      projecaoViabilidade:
        resultado.projecaoAjustada,

      classificacaoViabilidade:
        resultado.classificacao,

      elegivelRodada:
        resultado.elegivel,

      bloqueadoRodada:
        resultado.bloqueado,

      motivosViabilidade:
        resultado.motivos,

      alertasViabilidade:
        resultado.alertas,

      justificativaViabilidade:
        resultado.justificativa

    };

  }


  /* =======================================================
     APLICAÇÃO EM LOTE
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
     API
     ======================================================= */


  return {

    versao:
      VERSAO,

    calcular,

    aplicar,

    aplicarLista,

    calcularTitularidade,

    calcularRiscoEscalacao,

    calcularFatorDisponibilidade,

    calcularProjecaoAjustada

  };


})();
