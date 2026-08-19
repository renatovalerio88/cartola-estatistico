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
     ADEQUAÇÃO À RODADA
     ======================================================= */


  function calcularAdequacaoRodada(
    jogador,
    titularidade,
    riscoEscalacao
  ) {

    if (
      typeof MotorAdequacaoRodada === "undefined" ||
      !MotorAdequacaoRodada ||
      typeof MotorAdequacaoRodada.calcular !== "function"
    ) {

      return {
        disponivel: false,
        nota: null,
        classificacao: "SEM_DADOS",
        cobertura: 0,
        fatorRanking: 1,
        elegivel: true,
        componentes: {},
        pesos: {},
        pontosFortes: [],
        alertas: [],
        principalMotivo: null,
        justificativa: "Motor de adequação à rodada não disponível."
      };

    }


    const jogadorContextualizado = {
      ...jogador,
      titularidade,
      riscoEscalacao,
      viabilidade: {
        ...(jogador?.viabilidade ?? {}),
        titularidade,
        riscoEscalacao
      }
    };


    try {

      const resultado =
        MotorAdequacaoRodada.calcular(
          jogadorContextualizado
        );


      if (
        !resultado ||
        typeof resultado !== "object"
      ) {

        throw new Error(
          "Resultado inválido do motor de adequação."
        );

      }


      return {
        disponivel: true,
        nota: resultado.nota ?? null,
        classificacao: resultado.classificacao ?? "SEM_DADOS",
        cobertura: numero(resultado.cobertura, 0),
        fatorRanking: numero(resultado.fatorRanking, 1),
        elegivel: resultado.elegivel !== false,
        componentes: resultado.componentes ?? {},
        pesos: resultado.pesos ?? {},
        pontosFortes: Array.isArray(resultado.pontosFortes)
          ? resultado.pontosFortes
          : [],
        alertas: Array.isArray(resultado.alertas)
          ? resultado.alertas
          : [],
        principalMotivo: resultado.principalMotivo ?? null,
        justificativa: resultado.justificativa ?? ""
      };


    } catch (erro) {

      console.warn(
        "Erro ao calcular adequação à rodada:",
        erro
      );


      return {
        disponivel: false,
        nota: null,
        classificacao: "SEM_DADOS",
        cobertura: 0,
        fatorRanking: 1,
        elegivel: true,
        componentes: {},
        pesos: {},
        pontosFortes: [],
        alertas: [
          "Adequação à rodada indisponível."
        ],
        principalMotivo: null,
        justificativa: "Não foi possível calcular a adequação à rodada."
      };

    }

  }


  /* =======================================================
     FATOR DE ADEQUAÇÃO EFETIVO
     ======================================================= */


  function calcularFatorAdequacaoEfetivo(
    adequacao
  ) {

    if (
      !adequacao ||
      adequacao.disponivel !== true
    ) {

      return 1;

    }


    const fatorOriginal =
      numero(
        adequacao.fatorRanking,
        1
      );


    const cobertura =
       limitar(
        numero(
          adequacao.cobertura,
          0
        ),
        0,
        100
      );


    /*
     * PROTEÇÃO CONTRA DADOS PARCIAIS
     *
     * Quanto menor a cobertura de dados contextuais,
     * menor será a influência da adequação sobre
     * a projeção final.
     *
     * < 25%  -> 20% da força
     * < 50%  -> 40% da força
     * < 75%  -> 70% da força
     * >=75%  -> força completa
     */

    let intensidade = 1;


    if (
      cobertura < 25
    ) {

      intensidade = 0.20;

    } else if (
      cobertura < 50
    ) {

      intensidade = 0.40;

    } else if (
      cobertura < 75
    ) {

      intensidade = 0.70;

    }


    const fatorEfetivo =
      1 +
      (
        (
          fatorOriginal -
          1
        ) *
        intensidade
      );


    /*
     * Proteção inicial.
     *
     * A adequação à rodada não poderá alterar
     * a projeção em mais de +/-15%.
     *
     * O backtest decidirá posteriormente se
     * esse intervalo deve mudar.
     */

    return arredondar(
      Math.max(
        0.85,
        Math.min(
          1.15,
          fatorEfetivo
        )
      ),
      4
    );

  }


  /* =======================================================
     PROJEÇÃO AJUSTADA
     ======================================================= */


  function calcularProjecaoAjustada(
    jogador,
    fatorDisponibilidade,
    fatorAdequacao = 1
  ) {

    const projecao =
      obterProjecao(
        jogador
      );


    /*
     * PRIMEIRA CAMADA:
     * disponibilidade / titularidade.
     *
     * Não multiplicamos diretamente pela chance
     * de titularidade porque isso penalizaria demais
     * jogadores cuja informação ainda é incompleta.
     */

    const fatorUtilizacao =
      0.35 +
      (
        numero(
          fatorDisponibilidade
        ) *
        0.65
      );


    /*
     * SEGUNDA CAMADA:
     * adequação específica à rodada.
     *
     * Um jogador pode ser estatisticamente forte,
     * mas ter um contexto ruim nesta rodada.
     *
     * Também pode ocorrer o contrário:
     *
     * jogador mediano historicamente +
     * titularidade segura +
     * bom confronto +
     * boa tendência +
     * adversário cedendo pontos.
     */

    const fatorContexto =
      Math.max(
        0.85,
        Math.min(
          1.15,
          numero(
            fatorAdequacao,
            1
          )
        )
      );


    return arredondar(
      projecao *
      fatorUtilizacao *
      fatorContexto,
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


    const adequacao =
      resultado.adequacaoRodada;


    if (
      resultado.bloqueado
    ) {

      if (
        adequacao?.disponivel === true &&
        adequacao?.elegivel === false
      ) {

        return (
          "Jogador retirado das recomendações por risco de utilização " +
          "ou inadequação ao contexto específico desta rodada."
        );

      }


      return (
        "Jogador retirado das recomendações por indisponibilidade " +
        "ou risco incompatível com uma escalação válida."
      );

    }


    let textoJustificativa =
      `Titularidade estimada em ${titularidade}%, ` +
      `risco de escalação ${risco} e ` +
      `projeção ajustada de ${ajustada} pontos ` +
      `(projeção estatística original: ${projecao}).`;


    if (
      adequacao?.disponivel === true &&
      adequacao?.nota !== null &&
      adequacao?.nota !== undefined
    ) {

      textoJustificativa +=
        ` Adequação à rodada: ${adequacao.nota}/100 ` +
        `(${adequacao.classificacao}), ` +
        `com cobertura contextual de ${adequacao.cobertura}%.`;

    }


    if (
      adequacao?.principalMotivo?.nome
    ) {

      const principal =
        adequacao.principalMotivo;


      textoJustificativa +=
        principal.positivo
          ? (
              ` Principal fator favorável: ` +
              `${principal.nome} (${principal.nota}).`
            )
          : (
              ` Principal ponto de atenção: ` +
              `${principal.nome} (${principal.nota}).`
            );

    }


    return textoJustificativa;

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

        adequacaoRodada: {

          disponivel:
            false,

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

        },

        fatorAdequacao:
          1,

        projecaoOriginal:
          0,

        projecaoAjustada:
          0,

        impactoAdequacao:
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


    /* -------------------------------------------------------
       1. TITULARIDADE
       ------------------------------------------------------- */


    const titularidade =
      calcularTitularidade(
        jogador
      );


    /* -------------------------------------------------------
       2. RISCO DE UTILIZAÇÃO
       ------------------------------------------------------- */


    const riscoEscalacao =
      calcularRiscoEscalacao(
        jogador,
        titularidade
      );


    /* -------------------------------------------------------
       3. DISPONIBILIDADE
       ------------------------------------------------------- */


    const fatorDisponibilidade =
      calcularFatorDisponibilidade(
        jogador,
        titularidade
      );


    /* -------------------------------------------------------
       4. ADEQUAÇÃO ESPECÍFICA À RODADA
       ------------------------------------------------------- */


    const adequacaoRodada =
      calcularAdequacaoRodada(
        jogador,
        titularidade,
        riscoEscalacao
      );


    const fatorAdequacao =
      calcularFatorAdequacaoEfetivo(
        adequacaoRodada
      );


    /* -------------------------------------------------------
       5. PROJEÇÃO ESTATÍSTICA ORIGINAL
       ------------------------------------------------------- */


    const projecaoOriginal =
      arredondar(
        obterProjecao(
          jogador
        ),
        2
      );


    /* -------------------------------------------------------
       6. PROJEÇÃO CONTEXTUALIZADA
       ------------------------------------------------------- */


    const projecaoAjustada =
      calcularProjecaoAjustada(
        jogador,
        fatorDisponibilidade,
        fatorAdequacao
      );


    /* -------------------------------------------------------
       7. VIABILIDADE OPERACIONAL
       ------------------------------------------------------- */


    const classificacaoBase =
      classificarViabilidade(
        jogador,
        titularidade,
        riscoEscalacao
      );


    const bloqueadoBase =
      classificacaoBase ===
        "BLOQUEADO" ||

      classificacaoBase ===
        "EVITAR";


    /*
     * Confronto ruim sozinho NÃO bloqueia jogador.
     *
     * A adequação somente elimina o atleta quando
     * o motor contextual detecta combinação de
     * contexto ruim + risco real de utilização.
     */

    const bloqueadoAdequacao =
      adequacaoRodada.disponivel ===
        true &&
      adequacaoRodada.elegivel ===
        false;


    const bloqueado =
      bloqueadoBase ||
      bloqueadoAdequacao;


    let classificacao =
      classificacaoBase;


    if (
      bloqueadoAdequacao &&
      !bloqueadoBase
    ) {

      classificacao =
        "EVITAR";

    }


    /* -------------------------------------------------------
       8. MOTIVOS E ALERTAS
       ------------------------------------------------------- */


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


    if (
      Array.isArray(
        adequacaoRodada.pontosFortes
      )
    ) {

      adequacaoRodada
        .pontosFortes
        .forEach(
          motivo => {

            if (
              !motivos.includes(
                motivo
              )
            ) {

              motivos.push(
                motivo
              );

            }

          }
        );

    }


    if (
      Array.isArray(
        adequacaoRodada.alertas
      )
    ) {

      adequacaoRodada
        .alertas
        .forEach(
          alerta => {

            if (
              !alertas.includes(
                alerta
              )
            ) {

              alertas.push(
                alerta
              );

            }

          }
        );

    }


    if (
      bloqueadoAdequacao
    ) {

      const alertaAdequacao =
        "Jogador considerado inadequado para esta rodada pelo motor contextual.";


      if (
        !alertas.includes(
          alertaAdequacao
        )
      ) {

        alertas.push(
          alertaAdequacao
        );

      }

    }


    /* -------------------------------------------------------
       9. RESULTADO
       ------------------------------------------------------- */


    const resultado = {

      versao:
        VERSAO,

      titularidade,

      riscoEscalacao,

      fatorDisponibilidade,

      adequacaoRodada,

      notaAdequacaoRodada:
        adequacaoRodada.nota,

      classificacaoAdequacaoRodada:
        adequacaoRodada.classificacao,

      coberturaAdequacaoRodada:
        adequacaoRodada.cobertura,

      fatorAdequacao,

      projecaoOriginal,

      projecaoAjustada,

      impactoAdequacao:
        arredondar(
          projecaoAjustada -
          projecaoOriginal,
          2
        ),

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


      /*
       * Resultado completo da camada de viabilidade.
       */

      viabilidade:
        resultado,


      /*
       * Disponibilidade / titularidade.
       */

      titularidade:
        resultado.titularidade,


      riscoEscalacao:
        resultado.riscoEscalacao,


      fatorDisponibilidade:
        resultado.fatorDisponibilidade,


      /*
       * Adequação específica à rodada.
       *
       * Mantemos tanto o objeto completo quanto
       * os principais campos diretamente no jogador.
       *
       * Isso facilita o consumo posterior por:
       *
       * - ranking;
       * - recomendações;
       * - escalações;
       * - cards;
       * - diagnóstico;
       * - backtest.
       */

      adequacaoRodada:
        resultado.adequacaoRodada,


      notaAdequacaoRodada:
        resultado.notaAdequacaoRodada,


      classificacaoAdequacaoRodada:
        resultado.classificacaoAdequacaoRodada,


      coberturaAdequacaoRodada:
        resultado.coberturaAdequacaoRodada,


      fatorAdequacaoRodada:
        resultado.fatorAdequacao,


      /*
       * Projeção final após:
       *
       * projeção estatística
       *        ↓
       * disponibilidade
       *        ↓
       * titularidade
       *        ↓
       * adequação à rodada
       */

      projecaoViabilidade:
        resultado.projecaoAjustada,


      impactoAdequacaoRodada:
        resultado.impactoAdequacao,


      /*
       * Classificação final de utilização.
       */

      classificacaoViabilidade:
        resultado.classificacao,


      elegivelRodada:
        resultado.elegivel,


      bloqueadoRodada:
        resultado.bloqueado,


      /*
       * Explicabilidade.
       */

      motivosViabilidade:
        resultado.motivos,


      alertasViabilidade:
        resultado.alertas,


      pontosFortesRodada:
        resultado.adequacaoRodada
          ?.pontosFortes ??
        [],


      alertasRodada:
        resultado.adequacaoRodada
          ?.alertas ??
        [],


      justificativaRodada:
        resultado.adequacaoRodada
          ?.justificativa ??
        "",


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
     DIAGNÓSTICO INDIVIDUAL
     ======================================================= */


  function diagnosticar(
    jogador
  ) {

    const resultado =
      calcular(
        jogador
      );


    const nome =
      jogador?.apelido ??
      jogador?.nome ??
      jogador?.id ??
      "Jogador";


    console.log(
      "===================================="
    );


    console.log(
      "VIABILIDADE + ADEQUAÇÃO À RODADA"
    );


    console.log(
      nome
    );


    console.log(
      "Titularidade:",
      `${resultado.titularidade}%`
    );


    console.log(
      "Risco de escalação:",
      resultado.riscoEscalacao
    );


    console.log(
      "Fator de disponibilidade:",
      resultado.fatorDisponibilidade
    );


    console.log(
      "Projeção original:",
      resultado.projecaoOriginal
    );


    console.log(
      "Projeção contextualizada:",
      resultado.projecaoAjustada
    );


    console.log(
      "Impacto total:",
      resultado.impactoAdequacao
    );


    console.log(
      "Classificação de viabilidade:",
      resultado.classificacao
    );


    console.log(
      "Elegível:",
      resultado.elegivel
    );


    if (
      resultado.adequacaoRodada
    ) {

      console.log(
        "Adequação à rodada:",
        resultado
          .adequacaoRodada
          .nota
      );


      console.log(
        "Classificação da adequação:",
        resultado
          .adequacaoRodada
          .classificacao
      );


      console.log(
        "Cobertura contextual:",
        `${resultado
          .adequacaoRodada
          .cobertura}%`
      );


      console.log(
        "Fator de adequação bruto:",
        resultado
          .adequacaoRodada
          .fatorRanking
      );


      console.log(
        "Fator de adequação efetivo:",
        resultado
          .fatorAdequacao
      );


      if (
        resultado
          .adequacaoRodada
          .componentes &&
        typeof resultado
          .adequacaoRodada
          .componentes ===
          "object"
      ) {

        console.table(
          resultado
            .adequacaoRodada
            .componentes
        );

      }

    }


    console.log(
      "Motivos:",
      resultado.motivos
    );


    console.log(
      "Alertas:",
      resultado.alertas
    );


    console.log(
      "Justificativa:",
      resultado.justificativa
    );


    console.log(
      "===================================="
    );


    return resultado;

  }


  /* =======================================================
     DIAGNÓSTICO EM LOTE
     ======================================================= */


  function diagnosticarLista(
    jogadores
  ) {

    if (
      !Array.isArray(
        jogadores
      )
    ) {

      return [];

    }


    const resultados =
      jogadores.map(
        jogador => {

          const resultado =
            calcular(
              jogador
            );


          return {

            id:
              jogador?.id ??
              jogador?.atletaId,


            nome:
              jogador?.apelido ??
              jogador?.nome,


            posicao:
              jogador?.posicao ??
              jogador?.posicaoAbreviacao,


            clube:
              jogador?.siglaClube ??
              jogador?.clube,


            titularidade:
              resultado.titularidade,


            risco:
              resultado.riscoEscalacao,


            adequacao:
              resultado
                .adequacaoRodada
                ?.nota ??
              null,


            classificacaoAdequacao:
              resultado
                .adequacaoRodada
                ?.classificacao ??
              "SEM_DADOS",


            cobertura:
              resultado
                .adequacaoRodada
                ?.cobertura ??
              0,


            fatorAdequacao:
              resultado.fatorAdequacao,


            projecaoOriginal:
              resultado.projecaoOriginal,


            projecaoFinal:
              resultado.projecaoAjustada,


            impacto:
              resultado.impactoAdequacao,


            classificacao:
              resultado.classificacao,


            elegivel:
              resultado.elegivel

          };

        }
      );


    console.table(
      resultados
    );


    return resultados;

  }

    /* =======================================================
     API PÚBLICA
     ======================================================= */


  return {

    versao:
      VERSAO,


    /*
     * Cálculo principal.
     */

    calcular,


    /*
     * Aplicação do resultado no objeto jogador.
     */

    aplicar,


    /*
     * Aplicação em lista.
     */

    aplicarLista,


    /*
     * Componentes internos expostos para diagnóstico,
     * testes e futuras integrações.
     */

    calcularTitularidade,

    calcularRiscoEscalacao,

    calcularFatorDisponibilidade,

    calcularAdequacaoRodada,

    calcularFatorAdequacaoEfetivo,

    calcularProjecaoAjustada,


    /*
     * Diagnóstico.
     */

    diagnosticar,

    diagnosticarLista

  };


})();
