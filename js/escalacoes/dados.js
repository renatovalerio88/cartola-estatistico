/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento e montagem dos times sugeridos
   =========================================================

   Responsabilidades:

   - carregar Conservador, Equilibrado e Agressivo;
   - utilizar os jogadores já calculados pelo motor;
   - respeitar patrimônio definido pelo usuário;
   - preservar projeção original e calibrada;
   - consolidar projeção, piso, teto, confiança e risco;
   - comparar formações sem preferência artificial;
   - selecionar capitão;
   - montar banco dentro do saldo disponível;
   - consolidar custo total de titulares + banco;
   - selecionar Reserva de Luxo;
   - aplicar viabilidade/titularidade da rodada;
   - aplicar adequação contextual à rodada;
   - limitar qualquer time sugerido a C$ 120;
   - gerar justificativas automáticas;
   - manter compatibilidade com os cards atuais.

   IMPORTANTE:

   A calibração NÃO é aplicada novamente aqui.

   MotorProjecao já entrega:

   - projecaoOriginal
   - projecaoCalibrada
   - projecao

   ========================================================= */


const CAMINHO_ESCALACOES =
  "data/escalacoes.json";


const POSICOES_BANCO = [
  "GOL",
  "LAT",
  "ZAG",
  "MEI",
  "ATA"
];


const FORMACOES_CANDIDATAS_ESCALACAO = [
  "4-4-2",
  "3-4-3",
  "4-3-3"
];


const FORMACOES_ESTRUTURA_ESCALACAO = {

  "4-4-2": {
    GOL: 1,
    LAT: 2,
    ZAG: 2,
    MEI: 4,
    ATA: 2,
    TEC: 1
  },

  "3-4-3": {
    GOL: 1,
    LAT: 0,
    ZAG: 3,
    MEI: 4,
    ATA: 3,
    TEC: 1
  },

  "4-3-3": {
    GOL: 1,
    LAT: 2,
    ZAG: 2,
    MEI: 3,
    ATA: 3,
    TEC: 1
  }

};


const ORDEM_POSICOES_ESCALACAO = [
  "GOL",
  "LAT",
  "ZAG",
  "MEI",
  "ATA",
  "TEC"
];


const LIMITE_JOGADORES_CLUBE_ESCALACAO = 3;


const LIMITE_PATRIMONIO_MAXIMO_ESCALACAO = 120;


const estadoEscalacoes = {

  escalacoes: [],

  carregado: false,

  carregando: false,

  erro: null,

  patrimonioSelecionado: null

};


/* =========================================================
   UTILIDADES
   ========================================================= */


function numeroEscalacao(
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


function arredondarEscalacao(
  valor,
  casas = 2
) {

  return Number(
    numeroEscalacao(
      valor
    ).toFixed(
      casas
    )
  );

}


function normalizarTextoEscalacao(
  valor
) {

  return String(
    valor ?? ""
  )
    .trim()
    .toLowerCase();

}


function normalizarPosicaoEscalacao(
  jogador
) {

  return String(
    jogador?.posicao ??
    jogador?.posicaoAbreviacao ??
    ""
  )
    .trim()
    .toUpperCase();

}


function obterIdJogadorEscalacao(
  jogador
) {

  return String(
    jogador?.id ??
    jogador?.atletaId ??
    jogador?.atleta_id ??
    ""
  );

}


/* =========================================================
   VIABILIDADE DA RODADA
   ========================================================= */


function obterAnaliseViabilidadeEscalacao(
  jogador
) {

  if (!jogador) {
    return null;
  }


  if (
    jogador.viabilidade &&
    typeof jogador.viabilidade ===
      "object"
  ) {

    return jogador.viabilidade;

  }


  if (
    typeof MotorViabilidade !==
      "undefined" &&
    MotorViabilidade &&
    typeof MotorViabilidade.calcular ===
      "function"
  ) {

    try {

      return MotorViabilidade.calcular(
        jogador
      );

    } catch (erro) {

      console.warn(
        "Falha ao calcular viabilidade do jogador:",
        jogador?.id,
        erro
      );

    }

  }


  return null;

}


function jogadorElegivelRodadaEscalacao(
  jogador
) {

  const analise =
    obterAnaliseViabilidadeEscalacao(
      jogador
    );


  if (!analise) {
    return true;
  }


  return (
    analise.bloqueado !== true &&
    analise.elegivel !== false &&
    analise.classificacao !==
      "BLOQUEADO" &&
    analise.classificacao !==
      "EVITAR"
  );

}


function obterPesoViabilidadePerfilEscalacao(
  perfil
) {

  const nome =
    normalizarTextoEscalacao(
      perfil?.perfil ??
      perfil?.nome
    );


  if (
    nome.includes(
      "conserv"
    )
  ) {

    return 1.00;

  }


  if (
    nome.includes(
      "agress"
    )
  ) {

    return 0.70;

  }


  return 0.85;

}


function prepararJogadorViabilidadeEscalacao(
  jogador,
  perfil
) {

  const analise =
    obterAnaliseViabilidadeEscalacao(
      jogador
    );


  if (!analise) {

    return {
      ...jogador
    };

  }


  const scoreOriginal =
    numeroEscalacao(
      jogador?.score,
      obterProjecaoEstatisticaEscalacao(
        jogador
      )
    );


  const projecaoEstatistica =
    obterProjecaoEstatisticaEscalacao(
      jogador
    );


  const projecaoContextualizada =
    numeroEscalacao(
      analise.projecaoAjustada,
      projecaoEstatistica
    );


  const fatorDisponibilidade =
    Math.max(
      0,
      Math.min(
        1,
        numeroEscalacao(
          analise.fatorDisponibilidade,
          numeroEscalacao(
            analise.titularidade,
            50
          ) / 100
        )
      )
    );


  const adequacao =
    analise?.adequacaoRodada &&
    typeof analise.adequacaoRodada ===
      "object"
      ? analise.adequacaoRodada
      : null;


  const notaAdequacao =
    adequacao?.nota !== null &&
    adequacao?.nota !== undefined
      ? numeroEscalacao(
          adequacao.nota,
          50
        )
      : null;


  const coberturaAdequacao =
    Math.max(
      0,
      Math.min(
        100,
        numeroEscalacao(
          adequacao?.cobertura,
          0
        )
      )
    );


  /*
   * O MotorViabilidade já produziu a projeção contextualizada.
   * Aqui apenas transferimos o MESMO impacto para o score usado
   * pelo MotorEscalacao, sem recalcular titularidade ou confronto.
   */

  let fatorContextualScore = 1;


  if (
    Math.abs(
      projecaoEstatistica
    ) > 0.000001
  ) {

    fatorContextualScore =
      projecaoContextualizada /
      projecaoEstatistica;

  }


  fatorContextualScore =
    Math.max(
      0.55,
      Math.min(
        1.20,
        fatorContextualScore
      )
    );


  /*
   * Perfis não recebem pesos novos de futebol.
   * Apenas variamos a intensidade da contextualização:
   *
   * Conservador -> absorve 100% do ajuste;
   * Equilibrado -> absorve 85%;
   * Agressivo   -> absorve 70%, preservando mais teto.
   *
   * Bloqueios objetivos continuam iguais para todos.
   */

  const intensidadePerfil =
    obterPesoViabilidadePerfilEscalacao(
      perfil
    );


  const fatorPerfil =
    1 +
    (
      (
        fatorContextualScore -
        1
      ) *
      intensidadePerfil
    );


  const scoreAjustado =
    scoreOriginal *
    fatorPerfil;


  return {

    ...jogador,

    scoreEstatistico:
      scoreOriginal,

    score:
      arredondarEscalacao(
        scoreAjustado,
        4
      ),

    fatorContextualScore:
      arredondarEscalacao(
        fatorContextualScore,
        4
      ),

    intensidadeContextualPerfil:
      intensidadePerfil,

    viabilidade:
      analise,

    titularidade:
      numeroEscalacao(
        analise.titularidade,
        0
      ),

    riscoEscalacao:
      numeroEscalacao(
        analise.riscoEscalacao,
        0
      ),

    fatorDisponibilidade,

    projecaoViabilidade:
      projecaoContextualizada,

    projecaoContextualizada:
      projecaoContextualizada,

    adequacaoRodada:
      adequacao,

    notaAdequacaoRodada:
      notaAdequacao,

    classificacaoAdequacaoRodada:
      adequacao?.classificacao ??
      "SEM_DADOS",

    coberturaAdequacaoRodada:
      coberturaAdequacao,

    fatorAdequacaoRodada:
      numeroEscalacao(
        analise.fatorAdequacao,
        1
      ),

    classificacaoViabilidade:
      analise.classificacao ??
      "MEDIA",

    elegivelRodada:
      analise.elegivel !== false,

    bloqueadoRodada:
      analise.bloqueado === true,

    motivosViabilidade:
      Array.isArray(
        analise.motivos
      )
        ? analise.motivos
        : [],

    alertasViabilidade:
      Array.isArray(
        analise.alertas
      )
        ? analise.alertas
        : [],

    pontosFortesRodada:
      Array.isArray(
        adequacao?.pontosFortes
      )
        ? adequacao.pontosFortes
        : [],

    alertasRodada:
      Array.isArray(
        adequacao?.alertas
      )
        ? adequacao.alertas
        : [],

    justificativaRodada:
      adequacao?.justificativa ??
      "",

    justificativaViabilidade:
      analise.justificativa ??
      ""

  };

}


function prepararJogadoresViabilidadeEscalacao(
  jogadores,
  perfil
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const preparados =
    lista.map(
      jogador =>
        prepararJogadorViabilidadeEscalacao(
          jogador,
          perfil
        )
    );


  return preparados.filter(
    jogadorElegivelRodadaEscalacao
  );

}


function calcularResumoViabilidadeEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  if (
    jogadores.length === 0
  ) {

    return {

      ativa: false,

      titularidadeMedia: 0,

      riscoEscalacaoMedio: 0,

      altaOuMuitoAlta: 0,

      baixa: 0,

      bloqueados: 0

    };

  }


  const analisados =
    jogadores.filter(
      jogador =>
        jogador?.viabilidade &&
        typeof jogador.viabilidade ===
          "object"
    );


  if (
    analisados.length === 0
  ) {

    return {

      ativa: false,

      titularidadeMedia: 0,

      riscoEscalacaoMedio: 0,

      altaOuMuitoAlta: 0,

      baixa: 0,

      bloqueados: 0

    };

  }


  const titularidadeMedia =
    calcularMediaEscalacao(
      analisados,
      jogador =>
        jogador?.viabilidade
          ?.titularidade
    );


  const riscoEscalacaoMedio =
    calcularMediaEscalacao(
      analisados,
      jogador =>
        jogador?.viabilidade
          ?.riscoEscalacao
    );


  const altaOuMuitoAlta =
    analisados.filter(
      jogador =>
        [
          "ALTA",
          "MUITO_ALTA"
        ].includes(
          jogador?.viabilidade
            ?.classificacao
        )
    ).length;


  const baixa =
    analisados.filter(
      jogador =>
        jogador?.viabilidade
          ?.classificacao ===
        "BAIXA"
    ).length;


  const bloqueados =
    analisados.filter(
      jogador =>
        jogador?.viabilidade
          ?.bloqueado ===
        true
    ).length;


  return {

    ativa: true,

    jogadoresAnalisados:
      analisados.length,

    titularidadeMedia:
      arredondarEscalacao(
        titularidadeMedia,
        1
      ),

    riscoEscalacaoMedio:
      arredondarEscalacao(
        riscoEscalacaoMedio,
        1
      ),

    altaOuMuitoAlta,

    baixa,

    bloqueados

  };

}


/* =========================================================
   RESUMO DE ADEQUAÇÃO À RODADA
   ========================================================= */


function calcularResumoAdequacaoEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  const analisados =
    jogadores.filter(
      jogador => {

        const adequacao =
          jogador?.adequacaoRodada ??
          jogador?.viabilidade
            ?.adequacaoRodada;


        return (
          adequacao &&
          typeof adequacao ===
            "object" &&
          adequacao.nota !== null &&
          adequacao.nota !== undefined
        );

      }
    );


  if (
    analisados.length === 0
  ) {

    return {
      ativa: false,
      jogadoresAnalisados: 0,
      notaMedia: 0,
      coberturaMedia: 0,
      muitoAltaOuAlta: 0,
      baixaOuPior: 0
    };

  }


  const notaMedia =
    calcularMediaEscalacao(
      analisados,
      jogador =>
        jogador?.adequacaoRodada
          ?.nota ??
        jogador?.viabilidade
          ?.adequacaoRodada
          ?.nota
    );


  const coberturaMedia =
    calcularMediaEscalacao(
      analisados,
      jogador =>
        jogador?.adequacaoRodada
          ?.cobertura ??
        jogador?.viabilidade
          ?.adequacaoRodada
          ?.cobertura
    );


  const muitoAltaOuAlta =
    analisados.filter(
      jogador => {

        const classificacao =
          String(
            jogador?.adequacaoRodada
              ?.classificacao ??
            jogador?.viabilidade
              ?.adequacaoRodada
              ?.classificacao ??
            ""
          ).toUpperCase();


        return [
          "MUITO_ALTA",
          "ALTA"
        ].includes(
          classificacao
        );

      }
    ).length;


  const baixaOuPior =
    analisados.filter(
      jogador => {

        const classificacao =
          String(
            jogador?.adequacaoRodada
              ?.classificacao ??
            jogador?.viabilidade
              ?.adequacaoRodada
              ?.classificacao ??
            ""
          ).toUpperCase();


        return [
          "BAIXA",
          "MUITO_BAIXA",
          "EVITAR"
        ].includes(
          classificacao
        );

      }
    ).length;


  return {

    ativa: true,

    jogadoresAnalisados:
      analisados.length,

    notaMedia:
      arredondarEscalacao(
        notaMedia,
        1
      ),

    coberturaMedia:
      arredondarEscalacao(
        coberturaMedia,
        1
      ),

    muitoAltaOuAlta,

    baixaOuPior

  };

}


/* =========================================================
   PATRIMÔNIO
   ========================================================= */

function obterPatrimonioSelecionadoEscalacoes() {

  const patrimonio =
    Number(
      estadoEscalacoes
        .patrimonioSelecionado
    );


  if (
    Number.isFinite(
      patrimonio
    ) &&
    patrimonio > 0
  ) {

    return Math.min(
      patrimonio,
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
    );

  }


  return null;

}


function normalizarLimitePatrimonioEscalacao(
  valor
) {

  const limite =
    Number(valor);


  if (
    !Number.isFinite(
      limite
    ) ||
    limite <= 0
  ) {

    return null;

  }


  return arredondarEscalacao(
    Math.min(
      limite,
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
    ),
    2
  );

}


function obterLimitePatrimonioEscalacao(
  perfil = null
) {

  const patrimonioSelecionado =
    obterPatrimonioSelecionadoEscalacoes();


  if (
    patrimonioSelecionado !== null
  ) {

    return patrimonioSelecionado;

  }


  const limitePerfil =
    normalizarLimitePatrimonioEscalacao(
      perfil?.limitePatrimonio
    );


  if (
    limitePerfil !== null
  ) {

    return limitePerfil;

  }


  const configuracao =
    typeof obterConfiguracaoAtual ===
      "function"
      ? obterConfiguracaoAtual()
      : null;


  const limiteConfiguracao =
    normalizarLimitePatrimonioEscalacao(
      configuracao?.limitePatrimonio
    );


  if (
    limiteConfiguracao !== null
  ) {

    return limiteConfiguracao;

  }


  /*
   * Mesmo sem patrimônio informado,
   * nenhum time sugerido pode ultrapassar
   * C$ 120.
   */

  return LIMITE_PATRIMONIO_MAXIMO_ESCALACAO;

}


async function definirPatrimonioEscalacoes(
  valor
) {

  const patrimonio =
    Number(valor);


  if (
    !Number.isFinite(
      patrimonio
    ) ||
    patrimonio <= 0
  ) {

    throw new Error(
      "Patrimônio inválido."
    );

  }


  estadoEscalacoes
    .patrimonioSelecionado =
      arredondarEscalacao(
        Math.min(
          patrimonio,
          LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
        ),
        2
      );


  return carregarEscalacoes();

}


async function restaurarPatrimonioPadraoEscalacoes() {

  estadoEscalacoes
    .patrimonioSelecionado =
      null;


  return carregarEscalacoes();

}


/* =========================================================
   PROJEÇÕES
   ========================================================= */


function obterProjecaoEstatisticaEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const projecaoEstatistica =
    Number(
      jogador.projecaoEstatistica
    );


  if (
    Number.isFinite(
      projecaoEstatistica
    )
  ) {

    return projecaoEstatistica;

  }


  const projecao =
    Number(
      jogador.projecao
    );


  if (
    Number.isFinite(
      projecao
    )
  ) {

    return projecao;

  }


  const calibrada =
    Number(
      jogador.projecaoCalibrada
    );


  if (
    Number.isFinite(
      calibrada
    )
  ) {

    return calibrada;

  }


  const original =
    Number(
      jogador.projecaoOriginal
    );


  return Number.isFinite(
    original
  )
    ? original
    : 0;

}


function obterProjecaoContextualizadaEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const contextualDireta =
    Number(
      jogador.projecaoContextualizada
    );


  if (
    Number.isFinite(
      contextualDireta
    )
  ) {

    return contextualDireta;

  }


  const projecaoViabilidade =
    Number(
      jogador.projecaoViabilidade
    );


  if (
    Number.isFinite(
      projecaoViabilidade
    )
  ) {

    return projecaoViabilidade;

  }


  const analise =
    obterAnaliseViabilidadeEscalacao(
      jogador
    );


  const contextualMotor =
    Number(
      analise?.projecaoAjustada
    );


  if (
    Number.isFinite(
      contextualMotor
    )
  ) {

    return contextualMotor;

  }


  return obterProjecaoEstatisticaEscalacao(
    jogador
  );

}


function obterProjecaoFinalEscalacao(
  jogador
) {

  return obterProjecaoContextualizadaEscalacao(
    jogador
  );

}


function obterProjecaoOriginalEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const original =
    Number(
      jogador.projecaoOriginal
    );


  if (
    Number.isFinite(
      original
    )
  ) {

    return original;

  }


  return obterProjecaoEstatisticaEscalacao(
    jogador
  );

}


function obterProjecaoCalibradaEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const calibrada =
    Number(
      jogador.projecaoCalibrada
    );


  if (
    Number.isFinite(
      calibrada
    )
  ) {

    return calibrada;

  }


  return obterProjecaoEstatisticaEscalacao(
    jogador
  );

}


/* =========================================================
   SOMA E MÉDIA
   ========================================================= */


function somarCampoEscalacao(
  jogadores,
  funcao
) {

  if (
    !Array.isArray(
      jogadores
    )
  ) {

    return 0;

  }


  return jogadores.reduce(
    (
      total,
      jogador
    ) => {

      return (
        total +
        numeroEscalacao(
          funcao(
            jogador
          )
        )
      );

    },
    0
  );

}


function calcularMediaEscalacao(
  jogadores,
  funcao
) {

  if (
    !Array.isArray(
      jogadores
    ) ||
    jogadores.length === 0
  ) {

    return 0;

  }


  return (
    somarCampoEscalacao(
      jogadores,
      funcao
    ) /
    jogadores.length
  );

}


/* =========================================================
   CALIBRAÇÃO — RESUMO
   ========================================================= */


function jogadorPossuiCalibracao(
  jogador
) {

  if (!jogador) {
    return false;
  }


  if (
    jogador.calibracaoAplicada ===
    true
  ) {

    return true;

  }


  return (
    jogador.calibracaoPosicao
      ?.aplicada === true
  );

}


function calcularResumoCalibracaoEscalacao(
  jogadores
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const calibrados =
    lista.filter(
      jogadorPossuiCalibracao
    );


  const quantidade =
    lista.length;


  const quantidadeCalibrados =
    calibrados.length;


  const percentual =
    quantidade > 0
      ? (
          quantidadeCalibrados /
          quantidade
        ) * 100
      : 0;


  const projecaoOriginal =
    somarCampoEscalacao(
      lista,
      obterProjecaoOriginalEscalacao
    );


  const projecaoCalibrada =
    somarCampoEscalacao(
      lista,
      obterProjecaoCalibradaEscalacao
    );


  return {

    ativa:
      quantidadeCalibrados > 0,

    jogadores:
      quantidade,

    jogadoresCalibrados:
      quantidadeCalibrados,

    percentual:
      arredondarEscalacao(
        percentual,
        1
      ),

    projecaoOriginal:
      arredondarEscalacao(
        projecaoOriginal
      ),

    projecaoCalibrada:
      arredondarEscalacao(
        projecaoCalibrada
      ),

    impacto:
      arredondarEscalacao(
        projecaoCalibrada -
        projecaoOriginal
      )

  };

}


/* =========================================================
   NOTA DO JOGADOR PARA O PERFIL
   ========================================================= */


function obterNotaMotorEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const candidatos = [
    jogador.notaPerfil,
    jogador.notaMotor,
    jogador.notaRanking,
    jogador.notaFinal,
    jogador.score
  ];


  for (
    const valor
    of candidatos
  ) {

    const numero =
      Number(valor);


    if (
      Number.isFinite(
        numero
      )
    ) {

      return numero;

    }

  }


  return obterProjecaoFinalEscalacao(
    jogador
  );

}


function obterNotaTitularEscalacao(
  jogador
) {

  const notaMotor =
    obterNotaMotorEscalacao(
      jogador
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const confianca =
    numeroEscalacao(
      jogador?.confianca,
      50
    );


  const risco =
    numeroEscalacao(
      jogador?.risco,
      50
    );


  /*
   * O score já foi contextualizado antes.
   * Projeção e confiança entram apenas como
   * desempate/estabilidade da montagem.
   */

  return (
    notaMotor +
    (
      projecao *
      0.001
    ) +
    (
      confianca *
      0.00001
    ) -
    (
      risco *
      0.000001
    )
  );

}


/* =========================================================
   NOTA DO BANCO
   ========================================================= */


function obterNotaBancoEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const confianca =
    numeroEscalacao(
      jogador.confianca,
      50
    );


  const risco =
    numeroEscalacao(
      jogador.risco,
      50
    );


  const titularidade =
    numeroEscalacao(
      jogador.titularidade ??
      jogador.viabilidade
        ?.titularidade,
      50
    );


  const notaAdequacao =
    numeroEscalacao(
      jogador.notaAdequacaoRodada ??
      jogador.adequacaoRodada
        ?.nota ??
      jogador.viabilidade
        ?.adequacaoRodada
        ?.nota,
      50
    );


  return (
    (
      projecao *
      0.52
    ) +
    (
      confianca *
      0.16
    ) +
    (
      titularidade *
      0.17
    ) +
    (
      notaAdequacao *
      0.10
    ) -
    (
      risco *
      0.05
    )
  );

}


/* =========================================================
   COMPARAÇÃO DO BANCO
   ========================================================= */


function compararCandidatosBancoEscalacao(
  jogadorA,
  jogadorB
) {

  const notaA =
    obterNotaBancoEscalacao(
      jogadorA
    );


  const notaB =
    obterNotaBancoEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      notaB -
      notaA
    ) >
    0.000001
  ) {

    return notaB - notaA;

  }


  const projecaoA =
    obterProjecaoFinalEscalacao(
      jogadorA
    );


  const projecaoB =
    obterProjecaoFinalEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      projecaoB -
      projecaoA
    ) >
    0.000001
  ) {

    return (
      projecaoB -
      projecaoA
    );

  }


  const confiancaA =
    numeroEscalacao(
      jogadorA?.confianca
    );


  const confiancaB =
    numeroEscalacao(
      jogadorB?.confianca
    );


  if (
    Math.abs(
      confiancaB -
      confiancaA
    ) >
    0.000001
  ) {

    return (
      confiancaB -
      confiancaA
    );

  }


  return (
    numeroEscalacao(
      jogadorA?.preco
    ) -
    numeroEscalacao(
      jogadorB?.preco
    )
  );

}

/* =========================================================
   BANCO
   ========================================================= */


function montarBancoEscalacao(
  jogadores,
  titulares,
  limiteBanco = null
) {

  const candidatos =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const listaTitulares =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  const idsTitulares =
    new Set(
      listaTitulares
        .map(
          obterIdJogadorEscalacao
        )
        .filter(
          Boolean
        )
    );


  const limite =
    Number(
      limiteBanco
    );


  const possuiLimite =
    Number.isFinite(
      limite
    ) &&
    limite >= 0;


  const candidatosPorPosicao =
    POSICOES_BANCO.map(
      posicao => {

        return candidatos
          .filter(
            jogador => {

              const id =
                obterIdJogadorEscalacao(
                  jogador
                );


              if (
                id &&
                idsTitulares.has(
                  id
                )
              ) {

                return false;

              }


              if (
                !jogadorElegivelRodadaEscalacao(
                  jogador
                )
              ) {

                return false;

              }


              return (
                normalizarPosicaoEscalacao(
                  jogador
                ) ===
                posicao
              );

            }
          )
          .sort(
            compararCandidatosBancoEscalacao
          );

      }
    );


  if (
    candidatosPorPosicao.some(
      lista =>
        lista.length === 0
    )
  ) {

    return [];

  }


  if (!possuiLimite) {

    return candidatosPorPosicao.map(
      lista =>
        lista[0]
    );

  }


  const limiteCentavos =
    Math.max(
      0,
      Math.round(
        limite * 100
      )
    );


  let estados =
    new Map([
      [
        0,
        {
          custoCentavos: 0,
          nota: 0,
          projecao: 0,
          confianca: 0,
          jogadores: []
        }
      ]
    ]);


  candidatosPorPosicao.forEach(
    listaPosicao => {

      const proximos =
        new Map();


      estados.forEach(
        estado => {

          listaPosicao.forEach(
            jogador => {

              const preco =
                Math.max(
                  0,
                  numeroEscalacao(
                    jogador?.preco
                  )
                );


              const precoCentavos =
                Math.round(
                  preco * 100
                );


              const novoCusto =
                estado.custoCentavos +
                precoCentavos;


              if (
                novoCusto >
                limiteCentavos
              ) {

                return;

              }


              const candidato = {

                custoCentavos:
                  novoCusto,

                nota:
                  estado.nota +
                  obterNotaBancoEscalacao(
                    jogador
                  ),

                projecao:
                  estado.projecao +
                  obterProjecaoFinalEscalacao(
                    jogador
                  ),

                confianca:
                  estado.confianca +
                  numeroEscalacao(
                    jogador?.confianca
                  ),

                jogadores: [
                  ...estado.jogadores,
                  jogador
                ]

              };


              const atual =
                proximos.get(
                  novoCusto
                );


              const candidatoMelhor =
                !atual ||

                candidato.nota >
                  atual.nota +
                  0.000001 ||

                (
                  Math.abs(
                    candidato.nota -
                    atual.nota
                  ) <= 0.000001 &&

                  candidato.projecao >
                    atual.projecao +
                    0.000001
                ) ||

                (
                  Math.abs(
                    candidato.nota -
                    atual.nota
                  ) <= 0.000001 &&

                  Math.abs(
                    candidato.projecao -
                    atual.projecao
                  ) <= 0.000001 &&

                  candidato.confianca >
                    atual.confianca
                );


              if (
                candidatoMelhor
              ) {

                proximos.set(
                  novoCusto,
                  candidato
                );

              }

            }
          );

        }
      );


      estados =
        proximos;

    }
  );


  const solucoes =
    Array.from(
      estados.values()
    );


  if (
    solucoes.length === 0
  ) {

    return [];

  }


  solucoes.sort(
    (
      a,
      b
    ) => {

      if (
        Math.abs(
          b.nota -
          a.nota
        ) > 0.000001
      ) {

        return (
          b.nota -
          a.nota
        );

      }


      if (
        Math.abs(
          b.projecao -
          a.projecao
        ) > 0.000001
      ) {

        return (
          b.projecao -
          a.projecao
        );

      }


      if (
        Math.abs(
          b.confianca -
          a.confianca
        ) > 0.000001
      ) {

        return (
          b.confianca -
          a.confianca
        );

      }


      return (
        a.custoCentavos -
        b.custoCentavos
      );

    }
  );


  return (
    solucoes[0]
      ?.jogadores ??
    []
  );

}


/* =========================================================
   RESERVA DE LUXO
   ========================================================= */


function obterNotaReservaLuxoEscalacao(
  jogador
) {

  if (
    typeof MotorReservaLuxo !==
      "undefined" &&
    MotorReservaLuxo &&
    typeof MotorReservaLuxo.calcular ===
      "function"
  ) {

    const resultado =
      MotorReservaLuxo.calcular(
        jogador
      );


    if (
      typeof resultado ===
        "number"
    ) {

      return numeroEscalacao(
        resultado
      );

    }


    if (
      resultado &&
      typeof resultado ===
        "object"
    ) {

      return numeroEscalacao(
        resultado.score ??
        resultado.nota ??
        resultado.valor,
        obterNotaBancoEscalacao(
          jogador
        )
      );

    }

  }


  return obterNotaBancoEscalacao(
    jogador
  );

}


function escolherReservaLuxoEscalacao(
  banco
) {

  if (
    !Array.isArray(
      banco
    ) ||
    banco.length === 0
  ) {

    return null;

  }


  return banco
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

        const notaA =
          obterNotaReservaLuxoEscalacao(
            jogadorA
          );


        const notaB =
          obterNotaReservaLuxoEscalacao(
            jogadorB
          );


        if (
          Math.abs(
            notaB -
            notaA
          ) >
          0.000001
        ) {

          return (
            notaB -
            notaA
          );

        }


        return compararCandidatosBancoEscalacao(
          jogadorA,
          jogadorB
        );

      }
    )[0];

}


/* =========================================================
   CAPITÃO
   ========================================================= */


function obterNotaCapitaoContextualEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  let notaMotor = null;


  if (
    typeof MotorCapitao !==
      "undefined" &&
    MotorCapitao &&
    typeof MotorCapitao.calcular ===
      "function"
  ) {

    try {

      const resultado =
        MotorCapitao.calcular(
          jogador
        );


      if (
        typeof resultado ===
        "number"
      ) {

        notaMotor =
          numeroEscalacao(
            resultado
          );

      } else if (
        resultado &&
        typeof resultado ===
          "object"
      ) {

        notaMotor =
          numeroEscalacao(
            resultado.score ??
            resultado.nota ??
            resultado.valor,
            NaN
          );

      }

    } catch (erro) {

      console.warn(
        "Falha ao calcular nota de capitão:",
        jogador?.id,
        erro
      );

    }

  }


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const confianca =
    numeroEscalacao(
      jogador?.confianca,
      50
    );


  const titularidade =
    numeroEscalacao(
      jogador?.titularidade ??
      jogador?.viabilidade
        ?.titularidade,
      50
    );


  const riscoEscalacao =
    numeroEscalacao(
      jogador?.riscoEscalacao ??
      jogador?.viabilidade
        ?.riscoEscalacao,
      50
    );


  const base =
    Number.isFinite(
      notaMotor
    )
      ? notaMotor
      : projecao;


  return (
    base +
    (
      projecao *
      0.05
    ) +
    (
      confianca *
      0.002
    ) +
    (
      titularidade *
      0.003
    ) -
    (
      riscoEscalacao *
      0.003
    )
  );

}


function escolherCapitaoEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  if (
    jogadores.length === 0
  ) {

    return null;

  }


  return jogadores
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

        const notaA =
          obterNotaCapitaoContextualEscalacao(
            jogadorA
          );


        const notaB =
          obterNotaCapitaoContextualEscalacao(
            jogadorB
          );


        if (
          Math.abs(
            notaB -
            notaA
          ) >
          0.000001
        ) {

          return (
            notaB -
            notaA
          );

        }


        return (
          obterProjecaoFinalEscalacao(
            jogadorB
          ) -
          obterProjecaoFinalEscalacao(
            jogadorA
          )
        );

      }
    )[0];

}


/* =========================================================
   JUSTIFICATIVA DA ESTRATÉGIA
   ========================================================= */


function gerarJustificativaEstrategia(
  perfil,
  titulares,
  resumoViabilidade,
  resumoAdequacao
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  const nomePerfil =
    String(
      perfil?.perfil ??
      perfil?.nome ??
      "Equilibrado"
    );


  const perfilNormalizado =
    normalizarTextoEscalacao(
      nomePerfil
    );


  const projecaoTotal =
    somarCampoEscalacao(
      jogadores,
      obterProjecaoFinalEscalacao
    );


  const pisoTotal =
    somarCampoEscalacao(
      jogadores,
      jogador =>
        jogador?.piso
    );


  const tetoTotal =
    somarCampoEscalacao(
      jogadores,
      jogador =>
        jogador?.teto
    );


  const confiancaMedia =
    calcularMediaEscalacao(
      jogadores,
      jogador =>
        jogador?.confianca
    );


  const riscoMedio =
    calcularMediaEscalacao(
      jogadores,
      jogador =>
        jogador?.risco
    );


  const partes = [];


  if (
    perfilNormalizado.includes(
      "conserv"
    )
  ) {

    partes.push(
      "Estratégia prioriza segurança, regularidade, piso e confiança."
    );

  } else if (
    perfilNormalizado.includes(
      "agress"
    )
  ) {

    partes.push(
      "Estratégia prioriza teto e potencial de pontuação, aceitando maior volatilidade."
    );

  } else {

    partes.push(
      "Estratégia busca equilíbrio entre projeção, segurança, teto e risco."
    );

  }


  partes.push(
    `Projeção contextualizada do time: ${arredondarEscalacao(
      projecaoTotal,
      1
    )} pontos.`
  );


  partes.push(
    `Faixa histórica estimada entre ${arredondarEscalacao(
      pisoTotal,
      1
    )} e ${arredondarEscalacao(
      tetoTotal,
      1
    )} pontos.`
  );


  partes.push(
    `Confiança média de ${arredondarEscalacao(
      confiancaMedia,
      0
    )}% e risco médio de ${arredondarEscalacao(
      riscoMedio,
      0
    )}%.`
  );


  if (
    resumoViabilidade?.ativa
  ) {

    partes.push(
      `Titularidade média estimada em ${arredondarEscalacao(
        resumoViabilidade.titularidadeMedia,
        0
      )}%.`
    );


    if (
      resumoViabilidade.altaOuMuitoAlta >
      0
    ) {

      partes.push(
        `${resumoViabilidade.altaOuMuitoAlta} titular(es) apresentam viabilidade alta ou muito alta para a rodada.`
      );

    }


    if (
      resumoViabilidade.baixa >
      0
    ) {

      partes.push(
        `${resumoViabilidade.baixa} titular(es) ainda apresentam atenção de viabilidade.`
      );

    }

  }


  if (
    resumoAdequacao?.ativa
  ) {

    partes.push(
      `Adequação média ao contexto da rodada: ${arredondarEscalacao(
        resumoAdequacao.notaMedia,
        0
      )}/100.`
    );


    if (
      resumoAdequacao.muitoAltaOuAlta >
      0
    ) {

      partes.push(
        `${resumoAdequacao.muitoAltaOuAlta} jogador(es) possuem adequação alta ou muito alta ao cenário específico da rodada.`
      );

    }


    if (
      resumoAdequacao.baixaOuPior >
      0
    ) {

      partes.push(
        `${resumoAdequacao.baixaOuPior} jogador(es) possuem contexto menos favorável e foram mantidos apenas quando a composição geral justificou a escolha.`
      );

    }

  }


  return partes
    .join(
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   JUSTIFICATIVA DO JOGADOR
   ========================================================= */


function gerarJustificativaJogadorEscalacao(
  jogador,
  perfil = null
) {

  if (!jogador) {
    return "";
  }


  const partes = [];


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const projecaoEstatistica =
    obterProjecaoEstatisticaEscalacao(
      jogador
    );


  const impactoContextual =
    projecao -
    projecaoEstatistica;


  const titularidade =
    numeroEscalacao(
      jogador?.titularidade ??
      jogador?.viabilidade
        ?.titularidade,
      0
    );


  const confianca =
    numeroEscalacao(
      jogador?.confianca,
      50
    );


  const risco =
    numeroEscalacao(
      jogador?.riscoEscalacao ??
      jogador?.viabilidade
        ?.riscoEscalacao ??
      jogador?.risco,
      50
    );


  const adequacao =
    jogador?.adequacaoRodada ??
    jogador?.viabilidade
      ?.adequacaoRodada;


  const notaAdequacao =
    adequacao?.nota !== null &&
    adequacao?.nota !== undefined
      ? numeroEscalacao(
          adequacao.nota
        )
      : null;


  partes.push(
    `Projeção de ${arredondarEscalacao(
      projecao,
      1
    )} pontos.`
  );


  if (
    titularidade > 0
  ) {

    partes.push(
      `Titularidade estimada em ${arredondarEscalacao(
        titularidade,
        0
      )}%.`
    );

  }


  if (
    notaAdequacao !== null
  ) {

    partes.push(
      `Adequação à rodada: ${arredondarEscalacao(
        notaAdequacao,
        0
      )}/100.`
    );

  }


  if (
    impactoContextual >= 0.15
  ) {

    partes.push(
      `O cenário específico da rodada aumentou sua projeção em ${arredondarEscalacao(
        impactoContextual,
        1
      )} ponto(s).`
    );

  } else if (
    impactoContextual <= -0.15
  ) {

    partes.push(
      `O cenário específico da rodada reduziu sua projeção em ${arredondarEscalacao(
        Math.abs(
          impactoContextual
        ),
        1
      )} ponto(s).`
    );

  }


  if (
    Array.isArray(
      adequacao?.pontosFortes
    ) &&
    adequacao.pontosFortes.length >
      0
  ) {

    partes.push(
      String(
        adequacao.pontosFortes[0]
      )
    );

  }


  if (
    Array.isArray(
      jogador?.viabilidade
        ?.motivos
    ) &&
    jogador.viabilidade
      .motivos.length >
      0
  ) {

    partes.push(
      String(
        jogador.viabilidade
          .motivos[0]
      )
    );

  }


  if (
    confianca >= 70
  ) {

    partes.push(
      "Boa confiança estatística."
    );

  }


  if (
    risco <= 30
  ) {

    partes.push(
      "Risco de utilização relativamente baixo."
    );

  }


  const nomePerfil =
    normalizarTextoEscalacao(
      perfil?.perfil ??
      perfil?.nome
    );


  if (
    nomePerfil.includes(
      "conserv"
    ) &&
    numeroEscalacao(
      jogador?.piso
    ) >= 4
  ) {

    partes.push(
      "O piso favorece a estratégia conservadora."
    );

  }


  if (
    nomePerfil.includes(
      "agress"
    ) &&
    numeroEscalacao(
      jogador?.teto
    ) >= 10
  ) {

    partes.push(
      "O teto elevado favorece a estratégia agressiva."
    );

  }


  return partes
    .join(
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   PREPARAÇÃO DOS JOGADORES DO TIME
   ========================================================= */


function enriquecerJogadorEscalacao(
  jogador,
  perfil,
  tipo = "titular"
) {

  if (!jogador) {
    return jogador;
  }


  const projecaoEstatistica =
    obterProjecaoEstatisticaEscalacao(
      jogador
    );


  const projecaoContextualizada =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const adequacao =
    jogador?.adequacaoRodada ??
    jogador?.viabilidade
      ?.adequacaoRodada ??
    null;


  return {

    ...jogador,

    tipoEscalacao:
      tipo,

    projecaoEstatistica,

    projecaoContextualizada,

    projecaoViabilidade:
      projecaoContextualizada,

    impactoContextual:
      arredondarEscalacao(
        projecaoContextualizada -
        projecaoEstatistica,
        2
      ),

    notaAdequacaoRodada:
      adequacao?.nota !== null &&
      adequacao?.nota !== undefined
        ? numeroEscalacao(
            adequacao.nota
          )
        : null,

    classificacaoAdequacaoRodada:
      adequacao?.classificacao ??
      jogador
        ?.classificacaoAdequacaoRodada ??
      "SEM_DADOS",

    coberturaAdequacaoRodada:
      numeroEscalacao(
        adequacao?.cobertura ??
        jogador
          ?.coberturaAdequacaoRodada,
        0
      ),

    justificativa:
      gerarJustificativaJogadorEscalacao(
        jogador,
        perfil
      )

  };

}


/* =========================================================
   CUSTOS
   ========================================================= */


function calcularCustoJogadoresEscalacao(
  jogadores
) {

  return arredondarEscalacao(
    somarCampoEscalacao(
      jogadores,
      jogador =>
        jogador?.preco
    ),
    2
  );

}


function calcularCustoTotalEscalacao(
  titulares,
  banco
) {

  return arredondarEscalacao(
    calcularCustoJogadoresEscalacao(
      titulares
    ) +
    calcularCustoJogadoresEscalacao(
      banco
    ),
    2
  );

}


/* =========================================================
   CONTAGEM POR CLUBE
   ========================================================= */


function obterChaveClubeEscalacao(
  jogador
) {

  return String(
    jogador?.clubeId ??
    jogador?.clube_id ??
    jogador?.siglaClube ??
    jogador?.clube ??
    ""
  )
    .trim()
    .toUpperCase();

}


function contarJogadoresPorClubeEscalacao(
  jogadores
) {

  const contagem =
    new Map();


  (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  ).forEach(
    jogador => {

      const clube =
        obterChaveClubeEscalacao(
          jogador
        );


      if (!clube) {
        return;
      }


      contagem.set(
        clube,
        (
          contagem.get(
            clube
          ) ??
          0
        ) + 1
      );

    }
  );


  return contagem;

}


function respeitaLimiteClubeEscalacao(
  jogadores
) {

  const contagem =
    contarJogadoresPorClubeEscalacao(
      jogadores
    );


  for (
    const quantidade
    of contagem.values()
  ) {

    if (
      quantidade >
      LIMITE_JOGADORES_CLUBE_ESCALACAO
    ) {

      return false;

    }

  }


  return true;

}


/* =========================================================
   VALIDAÇÃO DA FORMAÇÃO
   ========================================================= */


function contarPosicoesEscalacao(
  jogadores
) {

  const contagem = {
    GOL: 0,
    LAT: 0,
    ZAG: 0,
    MEI: 0,
    ATA: 0,
    TEC: 0
  };


  (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  ).forEach(
    jogador => {

      const posicao =
        normalizarPosicaoEscalacao(
          jogador
        );


      if (
        Object.prototype
          .hasOwnProperty.call(
            contagem,
            posicao
          )
      ) {

        contagem[
          posicao
        ] += 1;

      }

    }
  );


  return contagem;

}


function formacaoValidaEscalacao(
  titulares,
  formacao
) {

  const estrutura =
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ];


  if (!estrutura) {
    return false;
  }


  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  if (
    jogadores.length !== 12
  ) {

    return false;

  }


  const contagem =
    contarPosicoesEscalacao(
      jogadores
    );


  return ORDEM_POSICOES_ESCALACAO
    .every(
      posicao =>
        numeroEscalacao(
          contagem[
            posicao
          ]
        ) ===
        numeroEscalacao(
          estrutura[
            posicao
          ]
        )
    );

}


/* =========================================================
   ORDENAÇÃO DOS CANDIDATOS
   ========================================================= */


function compararTitularesEscalacao(
  jogadorA,
  jogadorB
) {

  const notaA =
    obterNotaTitularEscalacao(
      jogadorA
    );


  const notaB =
    obterNotaTitularEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      notaB -
      notaA
    ) >
    0.000001
  ) {

    return notaB - notaA;

  }


  const projecaoA =
    obterProjecaoFinalEscalacao(
      jogadorA
    );


  const projecaoB =
    obterProjecaoFinalEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      projecaoB -
      projecaoA
    ) >
    0.000001
  ) {

    return (
      projecaoB -
      projecaoA
    );

  }


  const titularidadeA =
    numeroEscalacao(
      jogadorA?.titularidade ??
      jogadorA?.viabilidade
        ?.titularidade,
      0
    );


  const titularidadeB =
    numeroEscalacao(
      jogadorB?.titularidade ??
      jogadorB?.viabilidade
        ?.titularidade,
      0
    );


  if (
    Math.abs(
      titularidadeB -
      titularidadeA
    ) >
    0.000001
  ) {

    return (
      titularidadeB -
      titularidadeA
    );

  }


  return (
    numeroEscalacao(
      jogadorA?.preco
    ) -
    numeroEscalacao(
      jogadorB?.preco
    )
  );

}


/* =========================================================
   CANDIDATOS POR POSIÇÃO
   ========================================================= */


function obterCandidatosPosicaoEscalacao(
  jogadores,
  posicao
) {

  return (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  )
    .filter(
      jogador =>
        normalizarPosicaoEscalacao(
          jogador
        ) ===
        posicao
    )
    .filter(
      jogadorElegivelRodadaEscalacao
    )
    .slice()
    .sort(
      compararTitularesEscalacao
    );

}


/* =========================================================
   ASSINATURA DE UMA ESCALAÇÃO
   ========================================================= */


function obterAssinaturaEscalacao(
  jogadores
) {

  return (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  )
    .map(
      obterIdJogadorEscalacao
    )
    .filter(
      Boolean
    )
    .sort()
    .join(
      "|"
    );

}

/* =========================================================
   MÉTRICAS DE UMA COMBINAÇÃO
   ========================================================= */


function calcularMetricasCombinacaoEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  return {

    custo:
      calcularCustoJogadoresEscalacao(
        jogadores
      ),

    nota:
      somarCampoEscalacao(
        jogadores,
        obterNotaTitularEscalacao
      ),

    projecao:
      somarCampoEscalacao(
        jogadores,
        obterProjecaoFinalEscalacao
      ),

    projecaoEstatistica:
      somarCampoEscalacao(
        jogadores,
        obterProjecaoEstatisticaEscalacao
      ),

    piso:
      somarCampoEscalacao(
        jogadores,
        jogador =>
          jogador?.piso
      ),

    teto:
      somarCampoEscalacao(
        jogadores,
        jogador =>
          jogador?.teto
      ),

    confianca:
      calcularMediaEscalacao(
        jogadores,
        jogador =>
          jogador?.confianca
      ),

    risco:
      calcularMediaEscalacao(
        jogadores,
        jogador =>
          jogador?.risco
      ),

    titularidade:
      calcularMediaEscalacao(
        jogadores,
        jogador =>
          jogador?.titularidade ??
          jogador?.viabilidade
            ?.titularidade
      ),

    adequacao:
      calcularMediaEscalacao(
        jogadores.filter(
          jogador =>
            jogador
              ?.notaAdequacaoRodada !==
            null &&
            jogador
              ?.notaAdequacaoRodada !==
            undefined
        ),
        jogador =>
          jogador
            ?.notaAdequacaoRodada
      )

  };

}


/* =========================================================
   COMPARAÇÃO ENTRE COMBINAÇÕES
   ========================================================= */


function compararCombinacoesEscalacao(
  combinacaoA,
  combinacaoB
) {

  const metricasA =
    combinacaoA.metricas ??
    calcularMetricasCombinacaoEscalacao(
      combinacaoA.titulares
    );


  const metricasB =
    combinacaoB.metricas ??
    calcularMetricasCombinacaoEscalacao(
      combinacaoB.titulares
    );


  if (
    Math.abs(
      metricasB.nota -
      metricasA.nota
    ) >
    0.000001
  ) {

    return (
      metricasB.nota -
      metricasA.nota
    );

  }


  if (
    Math.abs(
      metricasB.projecao -
      metricasA.projecao
    ) >
    0.000001
  ) {

    return (
      metricasB.projecao -
      metricasA.projecao
    );

  }


  if (
    Math.abs(
      metricasB.titularidade -
      metricasA.titularidade
    ) >
    0.000001
  ) {

    return (
      metricasB.titularidade -
      metricasA.titularidade
    );

  }


  if (
    Math.abs(
      metricasB.confianca -
      metricasA.confianca
    ) >
    0.000001
  ) {

    return (
      metricasB.confianca -
      metricasA.confianca
    );

  }


  if (
    Math.abs(
      metricasA.risco -
      metricasB.risco
    ) >
    0.000001
  ) {

    return (
      metricasA.risco -
      metricasB.risco
    );

  }


  return (
    metricasA.custo -
    metricasB.custo
  );

}


/* =========================================================
   GERAÇÃO DE COMBINAÇÕES POR POSIÇÃO
   ========================================================= */


function gerarCombinacoesPosicaoEscalacao(
  candidatos,
  quantidade,
  limiteCandidatos = 10
) {

  const lista =
    (
      Array.isArray(
        candidatos
      )
        ? candidatos
        : []
    )
      .slice(
        0,
        Math.max(
          quantidade,
          limiteCandidatos
        )
      );


  if (
    quantidade === 0
  ) {

    return [
      []
    ];

  }


  if (
    lista.length <
    quantidade
  ) {

    return [];

  }


  const resultado = [];


  function percorrer(
    inicio,
    escolhidos
  ) {

    if (
      escolhidos.length ===
      quantidade
    ) {

      resultado.push(
        escolhidos.slice()
      );

      return;

    }


    const faltam =
      quantidade -
      escolhidos.length;


    for (
      let indice = inicio;
      indice <=
        lista.length - faltam;
      indice += 1
    ) {

      escolhidos.push(
        lista[
          indice
        ]
      );


      percorrer(
        indice + 1,
        escolhidos
      );


      escolhidos.pop();

    }

  }


  percorrer(
    0,
    []
  );


  return resultado;

}


/* =========================================================
   LIMITE DE CANDIDATOS POR POSIÇÃO
   ========================================================= */


function obterLimiteCandidatosPosicaoEscalacao(
  posicao,
  quantidade
) {

  /*
   * PERFORMANCE:
   *
   * O navegador não precisa combinar todo o mercado.
   * Nesta etapa trabalhamos somente com a elite já ordenada
   * pelo motor de cada posição. O objetivo é preservar
   * alternativas de preço/perfil sem criar milhões de
   * combinações que bloqueiam a interface.
   */

  const limites = {
    GOL: 5,
    LAT: 7,
    ZAG: 7,
    MEI: 8,
    ATA: 7,
    TEC: 5
  };


  return Math.max(
    quantidade,
    limites[posicao] ?? 7
  );

}


/* =========================================================
   MONTAGEM DAS OPÇÕES POR POSIÇÃO
   ========================================================= */


function montarOpcoesPosicaoEscalacao(
  jogadores,
  formacao
) {

  const estrutura =
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ];


  if (!estrutura) {
    return null;
  }


  const opcoes = {};


  for (
    const posicao
    of ORDEM_POSICOES_ESCALACAO
  ) {

    const quantidade =
      numeroEscalacao(
        estrutura[
          posicao
        ]
      );


    const candidatos =
      obterCandidatosPosicaoEscalacao(
        jogadores,
        posicao
      );


    const limiteCandidatos =
      obterLimiteCandidatosPosicaoEscalacao(
        posicao,
        quantidade
      );


    const combinacoes =
      gerarCombinacoesPosicaoEscalacao(
        candidatos,
        quantidade,
        limiteCandidatos
      );


    if (
      combinacoes.length === 0
    ) {

      return null;

    }


    /*
     * As combinações da própria posição também são ordenadas.
     * Isso faz as melhores alternativas entrarem primeiro no
     * beam search abaixo.
     */

    opcoes[posicao] =
      combinacoes
        .map(
          titulares => ({
            titulares,
            metricas:
              calcularMetricasCombinacaoEscalacao(
                titulares
              )
          })
        )
        .sort(
          compararCombinacoesEscalacao
        )
        .map(
          item =>
            item.titulares
        );

  }


  return opcoes;

}


/* =========================================================
   MONTAGEM DE TITULARES — BUSCA OTIMIZADA
   ========================================================= */


function montarTitularesFormacaoEscalacao(
  jogadores,
  formacao,
  limitePatrimonio
) {

  const opcoes =
    montarOpcoesPosicaoEscalacao(
      jogadores,
      formacao
    );


  if (!opcoes) {
    return null;
  }


  const limite =
    numeroEscalacao(
      limitePatrimonio,
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
    );


  /*
   * BEAM SEARCH
   *
   * A versão anterior fazia o produto cartesiano completo
   * das combinações de GOL/LAT/ZAG/MEI/ATA/TEC. Dependendo
   * da rodada isso podia gerar milhões de caminhos e travar
   * a thread principal do navegador.
   *
   * Agora cada posição expande somente as melhores soluções
   * parciais e, imediatamente, fazemos poda por:
   *
   * - orçamento;
   * - limite de jogadores por clube;
   * - qualidade estatística;
   * - projeção;
   * - titularidade;
   * - confiança/risco.
   *
   * Assim continuamos comparando formações e alternativas,
   * mas com custo computacional previsível.
   */

  const LIMITE_BEAM_ESCALACAO = 60;
  const LIMITE_FINAL_ESCALACAO = 80;


  const posicoes =
    ORDEM_POSICOES_ESCALACAO
      .filter(
        posicao =>
          numeroEscalacao(
            FORMACOES_ESTRUTURA_ESCALACAO[
              formacao
            ][
              posicao
            ]
          ) > 0
      );


  let beam = [
    {
      titulares: [],
      metricas:
        calcularMetricasCombinacaoEscalacao(
          []
        )
    }
  ];


  for (
    const posicao
    of posicoes
  ) {

    const combinacoesPosicao =
      opcoes[posicao] ?? [];


    const expandidas = [];


    for (
      const parcial
      of beam
    ) {

      for (
        const combinacao
        of combinacoesPosicao
      ) {

        const titulares = [
          ...parcial.titulares,
          ...combinacao
        ];


        if (
          !respeitaLimiteClubeEscalacao(
            titulares
          )
        ) {

          continue;

        }


        const custo =
          calcularCustoJogadoresEscalacao(
            titulares
          );


        if (
          custo >
          limite + 0.000001
        ) {

          continue;

        }


        expandidas.push({

          titulares,

          metricas:
            calcularMetricasCombinacaoEscalacao(
              titulares
            )

        });

      }

    }


    if (
      expandidas.length === 0
    ) {

      return null;

    }


    expandidas.sort(
      compararCombinacoesEscalacao
    );


    /*
     * Remove escalações parciais idênticas antes da poda.
     */

    const unicas = [];
    const assinaturas =
      new Set();


    for (
      const combinacao
      of expandidas
    ) {

      const assinatura =
        obterAssinaturaEscalacao(
          combinacao.titulares
        );


      if (
        assinaturas.has(
          assinatura
        )
      ) {

        continue;

      }


      assinaturas.add(
        assinatura
      );


      unicas.push(
        combinacao
      );


      if (
        unicas.length >=
        LIMITE_BEAM_ESCALACAO
      ) {

        break;

      }

    }


    beam = unicas;

  }


  const finais =
    beam
      .filter(
        combinacao =>
          formacaoValidaEscalacao(
            combinacao.titulares,
            formacao
          )
      )
      .sort(
        compararCombinacoesEscalacao
      )
      .slice(
        0,
        LIMITE_FINAL_ESCALACAO
      );


  return finais.length > 0
    ? finais
    : null;

}


/* =========================================================
   VALIDAÇÃO DO BANCO
   ========================================================= */


function bancoValidoEscalacao(
  banco
) {

  const jogadores =
    Array.isArray(
      banco
    )
      ? banco
      : [];


  if (
    jogadores.length !==
    POSICOES_BANCO.length
  ) {

    return false;

  }


  const posicoes =
    jogadores.map(
      normalizarPosicaoEscalacao
    );


  return POSICOES_BANCO.every(
    posicao =>
      posicoes.includes(
        posicao
      )
  );

}


/* =========================================================
   COMPOSIÇÃO COMPLETA
   ========================================================= */


function montarComposicaoCompletaEscalacao(
  jogadores,
  perfil,
  formacao,
  limitePatrimonio
) {

  const limite =
    Math.min(
      numeroEscalacao(
        limitePatrimonio,
        LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
      ),
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
    );


  const combinacoesTitulares =
    montarTitularesFormacaoEscalacao(
      jogadores,
      formacao,
      limite
    );


  if (
    !Array.isArray(
      combinacoesTitulares
    ) ||
    combinacoesTitulares.length === 0
  ) {

    return null;

  }


  const composicoes = [];


  /*
   * PERFORMANCE:
   *
   * O beam search já entregou apenas as melhores
   * alternativas de titulares.
   *
   * Mesmo assim, não precisamos testar banco para
   * uma quantidade ilimitada de times.
   */

  const LIMITE_COMPOSICOES_BANCO = 40;


  combinacoesTitulares
    .slice(
      0,
      LIMITE_COMPOSICOES_BANCO
    )
    .forEach(
      combinacao => {

        const titulares =
          combinacao.titulares;


        const custoTitulares =
          calcularCustoJogadoresEscalacao(
            titulares
          );


        const saldoBanco =
          arredondarEscalacao(
            limite -
            custoTitulares,
            2
          );


        if (
          saldoBanco < 0
        ) {

          return;

        }


        const banco =
          montarBancoEscalacao(
            jogadores,
            titulares,
            saldoBanco
          );


        if (
          !bancoValidoEscalacao(
            banco
          )
        ) {

          return;

        }


        const todosJogadores = [
          ...titulares,
          ...banco
        ];


        if (
          !respeitaLimiteClubeEscalacao(
            todosJogadores
          )
        ) {

          return;

        }


        const custoBanco =
          calcularCustoJogadoresEscalacao(
            banco
          );


        const custoTotal =
          calcularCustoTotalEscalacao(
            titulares,
            banco
          );


        if (
          custoTotal >
          limite + 0.000001
        ) {

          return;

        }


        if (
          custoTotal >
          LIMITE_PATRIMONIO_MAXIMO_ESCALACAO +
          0.000001
        ) {

          return;

        }


        const metricasTitulares =
          combinacao.metricas ??
          calcularMetricasCombinacaoEscalacao(
            titulares
          );


        const projecaoBanco =
          somarCampoEscalacao(
            banco,
            obterProjecaoFinalEscalacao
          );


        const notaBanco =
          somarCampoEscalacao(
            banco,
            obterNotaBancoEscalacao
          );


        const reservaLuxo =
          escolherReservaLuxoEscalacao(
            banco
          );


        const capitao =
          escolherCapitaoEscalacao(
            titulares
          );


        composicoes.push({

          perfil,

          formacao,

          titulares,

          banco,

          capitao,

          reservaLuxo,

          custoTitulares,

          custoBanco,

          custoTotal,

          saldo:
            arredondarEscalacao(
              limite -
              custoTotal,
              2
            ),

          limitePatrimonio:
            limite,

          metricasTitulares,

          projecaoBanco:
            arredondarEscalacao(
              projecaoBanco,
              2
            ),

          notaBanco:
            arredondarEscalacao(
              notaBanco,
              4
            ),

          assinatura:
            obterAssinaturaEscalacao(
              todosJogadores
            )

        });

      }
    );


  if (
    composicoes.length === 0
  ) {

    return null;

  }


  composicoes.sort(
    compararComposicoesCompletasEscalacao
  );


  return composicoes[0];

}


/* =========================================================
   COMPARAÇÃO DE COMPOSIÇÕES COMPLETAS
   ========================================================= */


function compararComposicoesCompletasEscalacao(
  composicaoA,
  composicaoB
) {

  const metricasA =
    composicaoA
      ?.metricasTitulares ??
    {};


  const metricasB =
    composicaoB
      ?.metricasTitulares ??
    {};


  /*
   * 1. Qualidade dos titulares segundo o perfil.
   */

  if (
    Math.abs(
      numeroEscalacao(
        metricasB.nota
      ) -
      numeroEscalacao(
        metricasA.nota
      )
    ) >
    0.000001
  ) {

    return (
      numeroEscalacao(
        metricasB.nota
      ) -
      numeroEscalacao(
        metricasA.nota
      )
    );

  }


  /*
   * 2. Projeção contextualizada.
   */

  if (
    Math.abs(
      numeroEscalacao(
        metricasB.projecao
      ) -
      numeroEscalacao(
        metricasA.projecao
      )
    ) >
    0.000001
  ) {

    return (
      numeroEscalacao(
        metricasB.projecao
      ) -
      numeroEscalacao(
        metricasA.projecao
      )
    );

  }


  /*
   * 3. Maior titularidade média.
   */

  if (
    Math.abs(
      numeroEscalacao(
        metricasB.titularidade
      ) -
      numeroEscalacao(
        metricasA.titularidade
      )
    ) >
    0.000001
  ) {

    return (
      numeroEscalacao(
        metricasB.titularidade
      ) -
      numeroEscalacao(
        metricasA.titularidade
      )
    );

  }


  /*
   * 4. Melhor banco.
   */

  if (
    Math.abs(
      numeroEscalacao(
        composicaoB.notaBanco
      ) -
      numeroEscalacao(
        composicaoA.notaBanco
      )
    ) >
    0.000001
  ) {

    return (
      numeroEscalacao(
        composicaoB.notaBanco
      ) -
      numeroEscalacao(
        composicaoA.notaBanco
      )
    );

  }


  /*
   * 5. Menor custo como desempate.
   */

  return (
    numeroEscalacao(
      composicaoA.custoTotal
    ) -
    numeroEscalacao(
      composicaoB.custoTotal
    )
  );

}


/* =========================================================
   NOTA DE UMA FORMAÇÃO
   ========================================================= */


function calcularNotaFormacaoEscalacao(
  composicao
) {

  if (!composicao) {
    return -Infinity;
  }


  const metricas =
    composicao.metricasTitulares ??
    {};


  const titulares =
    Array.isArray(
      composicao.titulares
    )
      ? composicao.titulares
      : [];


  const resumoViabilidade =
    calcularResumoViabilidadeEscalacao(
      titulares
    );


  const resumoAdequacao =
    calcularResumoAdequacaoEscalacao(
      titulares
    );


  const notaBase =
    numeroEscalacao(
      metricas.nota
    );


  const projecao =
    numeroEscalacao(
      metricas.projecao
    );


  const titularidade =
    numeroEscalacao(
      resumoViabilidade
        .titularidadeMedia,
      50
    );


  const riscoEscalacao =
    numeroEscalacao(
      resumoViabilidade
        .riscoEscalacaoMedio,
      50
    );


  const adequacao =
    resumoAdequacao.ativa
      ? numeroEscalacao(
          resumoAdequacao.notaMedia,
          50
        )
      : 50;


  const cobertura =
    resumoAdequacao.ativa
      ? numeroEscalacao(
          resumoAdequacao
            .coberturaMedia,
          0
        ) / 100
      : 0;


  /*
   * A nota principal continua vindo do motor do perfil.
   *
   * Titularidade e adequação entram somente como
   * desempates suaves, pois já influenciaram os
   * jogadores individualmente.
   */

  const ajusteTitularidade =
    (
      titularidade -
      50
    ) *
    0.002;


  const ajusteRisco =
    (
      50 -
      riscoEscalacao
    ) *
    0.001;


  const ajusteAdequacao =
    (
      adequacao -
      50
    ) *
    0.0015 *
    cobertura;


  return (
    notaBase +
    (
      projecao *
      0.0001
    ) +
    ajusteTitularidade +
    ajusteRisco +
    ajusteAdequacao
  );

}


/* =========================================================
   ESCOLHA DA MELHOR FORMAÇÃO
   ========================================================= */


function escolherMelhorFormacaoEscalacao(
  jogadores,
  perfil,
  limitePatrimonio
) {

  const alternativas = [];


  FORMACOES_CANDIDATAS_ESCALACAO
    .forEach(
      formacao => {

        const composicao =
          montarComposicaoCompletaEscalacao(
            jogadores,
            perfil,
            formacao,
            limitePatrimonio
          );


        if (!composicao) {
          return;
        }


        alternativas.push({

          ...composicao,

          notaFormacao:
            calcularNotaFormacaoEscalacao(
              composicao
            )

        });

      }
    );


  if (
    alternativas.length === 0
  ) {

    return null;

  }


  alternativas.sort(
    (
      alternativaA,
      alternativaB
    ) => {

      const diferenca =
        numeroEscalacao(
          alternativaB.notaFormacao
        ) -
        numeroEscalacao(
          alternativaA.notaFormacao
        );


      if (
        Math.abs(
          diferenca
        ) >
        0.000001
      ) {

        return diferenca;

      }


      return compararComposicoesCompletasEscalacao(
        alternativaA,
        alternativaB
      );

    }
  );


  return {

    melhor:
      alternativas[0],

    alternativas

  };

}


/* =========================================================
   PREPARAÇÃO DO PERFIL
   ========================================================= */


function prepararPerfilEscalacao(
  perfil
) {

  if (
    !perfil ||
    typeof perfil !==
      "object"
  ) {

    return {
      perfil: "Equilibrado",
      nome: "Equilibrado"
    };

  }


  const nome =
    String(
      perfil.perfil ??
      perfil.nome ??
      perfil.estrategia ??
      "Equilibrado"
    );


  return {

    ...perfil,

    perfil:
      nome,

    nome:
      nome

  };

}


/* =========================================================
   JOGADORES CARREGADOS PARA ESCALAÇÃO
   ========================================================= */


function obterJogadoresDisponiveisEscalacao() {

  if (
    typeof obterJogadoresCarregados ===
      "function"
  ) {

    const jogadores =
      obterJogadoresCarregados();


    if (
      Array.isArray(
        jogadores
      )
    ) {

      return jogadores;

    }

  }


  if (
    typeof estadoRecomendacoes !==
      "undefined" &&
    Array.isArray(
      estadoRecomendacoes
        ?.jogadores
    )
  ) {

    return estadoRecomendacoes
      .jogadores;

  }


  if (
    typeof window !==
      "undefined" &&
    Array.isArray(
      window.jogadores
    )
  ) {

    return window.jogadores;

  }


  return [];

}


/* =========================================================
   MOTOR DE ESCALAÇÃO
   ========================================================= */


function prepararJogadoresMotorEscalacao(
  jogadores,
  perfil
) {

  const preparados =
    prepararJogadoresViabilidadeEscalacao(
      jogadores,
      perfil
    );


  if (
    typeof MotorEscalacao ===
      "undefined" ||
    !MotorEscalacao ||
    typeof MotorEscalacao
      .calcularNotaJogador !==
      "function"
  ) {

    return preparados;

  }


  return preparados.map(
    jogador => {

      try {

        const resultado =
          MotorEscalacao
            .calcularNotaJogador(
              jogador,
              perfil
            );


        if (
          typeof resultado ===
            "number"
        ) {

          return {

            ...jogador,

            notaPerfil:
              resultado

          };

        }


        if (
          resultado &&
          typeof resultado ===
            "object"
        ) {

          return {

            ...jogador,

            notaPerfil:
              numeroEscalacao(
                resultado.nota ??
                resultado.score ??
                resultado.valor,
                obterNotaMotorEscalacao(
                  jogador
                )
              ),

            resultadoMotorEscalacao:
              resultado

          };

        }

      } catch (erro) {

        console.warn(
          "Falha no MotorEscalacao para jogador:",
          jogador?.id,
          erro
        );

      }


      return jogador;

    }
  );

}


/* =========================================================
   CONSTRUÇÃO DO TIME SUGERIDO
   ========================================================= */


function construirTimeSugeridoEscalacao(
  perfilOriginal,
  jogadoresOriginais
) {

  const perfil =
    prepararPerfilEscalacao(
      perfilOriginal
    );


  const limitePatrimonio =
    obterLimitePatrimonioEscalacao(
      perfil
    );


  const jogadores =
    prepararJogadoresMotorEscalacao(
      jogadoresOriginais,
      perfil
    );


  if (
    jogadores.length === 0
  ) {

    return null;

  }


  const escolhaFormacao =
    escolherMelhorFormacaoEscalacao(
      jogadores,
      perfil,
      limitePatrimonio
    );


  if (
    !escolhaFormacao ||
    !escolhaFormacao.melhor
  ) {

    return null;

  }


  const melhor =
    escolhaFormacao.melhor;


  const titulares =
    melhor.titulares.map(
      jogador =>
        enriquecerJogadorEscalacao(
          jogador,
          perfil,
          "titular"
        )
    );


  const banco =
    melhor.banco.map(
      jogador =>
        enriquecerJogadorEscalacao(
          jogador,
          perfil,
          "reserva"
        )
    );


  const idCapitao =
    obterIdJogadorEscalacao(
      melhor.capitao
    );


  const capitao =
    titulares.find(
      jogador =>
        obterIdJogadorEscalacao(
          jogador
        ) ===
        idCapitao
    ) ??
    melhor.capitao ??
    null;


  const idReservaLuxo =
    obterIdJogadorEscalacao(
      melhor.reservaLuxo
    );


  const reservaLuxo =
    banco.find(
      jogador =>
        obterIdJogadorEscalacao(
          jogador
        ) ===
        idReservaLuxo
    ) ??
    melhor.reservaLuxo ??
    null;


  const resumoViabilidade =
    calcularResumoViabilidadeEscalacao(
      titulares
    );


  const resumoAdequacao =
    calcularResumoAdequacaoEscalacao(
      titulares
    );


  const resumoCalibracao =
    calcularResumoCalibracaoEscalacao(
      titulares
    );


  const custoTitulares =
    calcularCustoJogadoresEscalacao(
      titulares
    );


  const custoBanco =
    calcularCustoJogadoresEscalacao(
      banco
    );


  const custoTotal =
    calcularCustoTotalEscalacao(
      titulares,
      banco
    );


  const projecaoEstatistica =
    somarCampoEscalacao(
      titulares,
      obterProjecaoEstatisticaEscalacao
    );


  const projecaoContextualizada =
    somarCampoEscalacao(
      titulares,
      obterProjecaoFinalEscalacao
    );


  const piso =
    somarCampoEscalacao(
      titulares,
      jogador =>
        jogador?.piso
    );


  const teto =
    somarCampoEscalacao(
      titulares,
      jogador =>
        jogador?.teto
    );


  const confianca =
    calcularMediaEscalacao(
      titulares,
      jogador =>
        jogador?.confianca
    );


  const risco =
    calcularMediaEscalacao(
      titulares,
      jogador =>
        jogador?.risco
    );


  const alternativasFormacao =
    escolhaFormacao.alternativas.map(
      alternativa => ({

        formacao:
          alternativa.formacao,

        nota:
          arredondarEscalacao(
            alternativa.notaFormacao,
            4
          ),

        projecao:
          arredondarEscalacao(
            alternativa
              .metricasTitulares
              ?.projecao,
            2
          ),

        custo:
          arredondarEscalacao(
            alternativa.custoTotal,
            2
          )

      })
    );


  return {

    ...perfilOriginal,

    perfil:
      perfil.perfil,

    nome:
      perfil.nome,

    formacao:
      melhor.formacao,

    titulares,

    banco,

    capitao,

    reservaLuxo,

    patrimonio:
      limitePatrimonio,

    limitePatrimonio:
      limitePatrimonio,

    custoTitulares:
      arredondarEscalacao(
        custoTitulares,
        2
      ),

    custoBanco:
      arredondarEscalacao(
        custoBanco,
        2
      ),

    custoTotal:
      arredondarEscalacao(
        custoTotal,
        2
      ),

    saldo:
      arredondarEscalacao(
        limitePatrimonio -
        custoTotal,
        2
      ),

    dentroOrcamento:
      custoTotal <=
        limitePatrimonio +
        0.000001 &&
      custoTotal <=
        LIMITE_PATRIMONIO_MAXIMO_ESCALACAO +
        0.000001,

    projecao:
      arredondarEscalacao(
        projecaoContextualizada,
        2
      ),

    projecaoContextualizada:
      arredondarEscalacao(
        projecaoContextualizada,
        2
      ),

    projecaoEstatistica:
      arredondarEscalacao(
        projecaoEstatistica,
        2
      ),

    impactoContextual:
      arredondarEscalacao(
        projecaoContextualizada -
        projecaoEstatistica,
        2
      ),

    piso:
      arredondarEscalacao(
        piso,
        2
      ),

    teto:
      arredondarEscalacao(
        teto,
        2
      ),

    confianca:
      arredondarEscalacao(
        confianca,
        1
      ),

    risco:
      arredondarEscalacao(
        risco,
        1
      ),

    resumoViabilidade,

    resumoAdequacao,

    resumoCalibracao,

    alternativasFormacao,

    justificativa:
      gerarJustificativaEstrategia(
        perfil,
        titulares,
        resumoViabilidade,
        resumoAdequacao
      )

  };

}


/* =========================================================
   VALIDAÇÃO FINAL DO TIME
   ========================================================= */


function validarTimeSugeridoEscalacao(
  time
) {

  if (!time) {
    return false;
  }


  if (
    !Array.isArray(
      time.titulares
    ) ||
    !Array.isArray(
      time.banco
    )
  ) {

    return false;

  }


  if (
    !formacaoValidaEscalacao(
      time.titulares,
      time.formacao
    )
  ) {

    return false;

  }


  if (
    !bancoValidoEscalacao(
      time.banco
    )
  ) {

    return false;

  }


  const todos = [
    ...time.titulares,
    ...time.banco
  ];


  if (
    !respeitaLimiteClubeEscalacao(
      todos
    )
  ) {

    return false;

  }


  if (
    todos.some(
      jogador =>
        !jogadorElegivelRodadaEscalacao(
          jogador
        )
    )
  ) {

    return false;

  }


  const custoTotal =
    calcularCustoTotalEscalacao(
      time.titulares,
      time.banco
    );


  const limite =
    Math.min(
      numeroEscalacao(
        time.limitePatrimonio,
        LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
      ),
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO
    );


  if (
    custoTotal >
    limite + 0.000001
  ) {

    return false;

  }


  if (
    custoTotal >
    LIMITE_PATRIMONIO_MAXIMO_ESCALACAO +
    0.000001
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   GERAÇÃO DOS TRÊS PERFIS
   ========================================================= */

function gerarEscalacoesSugeridas(
  perfis,
  jogadores
) {

  const listaPerfis =
    Array.isArray(
      perfis
    )
      ? perfis
      : [];


  const listaJogadores =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  if (
    listaPerfis.length === 0 ||
    listaJogadores.length === 0
  ) {

    return [];

  }


  const resultado = [];


  listaPerfis.forEach(
    perfil => {

      try {

        const time =
          construirTimeSugeridoEscalacao(
            perfil,
            listaJogadores
          );


        if (!time) {

          console.warn(
            "Não foi possível montar escalação para o perfil:",
            perfil?.perfil ??
            perfil?.nome
          );

          return;

        }


        if (
          !validarTimeSugeridoEscalacao(
            time
          )
        ) {

          console.warn(
            "Escalação gerada foi reprovada na validação final:",
            perfil?.perfil ??
            perfil?.nome
          );

          return;

        }


        resultado.push(
          time
        );

      } catch (erro) {

        console.error(
          "Erro ao gerar escalação do perfil:",
          perfil?.perfil ??
          perfil?.nome,
          erro
        );

      }

    }
  );


  return resultado;

}


/* =========================================================
   NORMALIZAÇÃO DOS PERFIS DO JSON
   ========================================================= */


function normalizarPerfisEscalacao(
  dados
) {

  if (
    Array.isArray(
      dados
    )
  ) {

    return dados;

  }


  if (
    !dados ||
    typeof dados !==
      "object"
  ) {

    return [];

  }


  if (
    Array.isArray(
      dados.escalacoes
    )
  ) {

    return dados.escalacoes;

  }


  if (
    Array.isArray(
      dados.perfis
    )
  ) {

    return dados.perfis;

  }


  if (
    Array.isArray(
      dados.estrategias
    )
  ) {

    return dados.estrategias;

  }


  /*
   * Compatibilidade com JSON no formato:
   *
   * {
   *   "Conservador": {...},
   *   "Equilibrado": {...},
   *   "Agressivo": {...}
   * }
   */

  const nomesEsperados = [
    "Conservador",
    "Equilibrado",
    "Agressivo"
  ];


  const encontrados = [];


  nomesEsperados.forEach(
    nome => {

      const valor =
        dados[
          nome
        ];


      if (
        valor &&
        typeof valor ===
          "object"
      ) {

        encontrados.push({

          ...valor,

          perfil:
            valor.perfil ??
            valor.nome ??
            nome,

          nome:
            valor.nome ??
            valor.perfil ??
            nome

        });

      }

    }
  );


  if (
    encontrados.length > 0
  ) {

    return encontrados;

  }


  /*
   * Último fallback:
   * transforma propriedades de objeto
   * em perfis quando fizer sentido.
   */

  return Object.entries(
    dados
  )
    .filter(
      (
        [
          chave,
          valor
        ]
      ) => {

        if (
          !valor ||
          typeof valor !==
            "object" ||
          Array.isArray(
            valor
          )
        ) {

          return false;

        }


        const nome =
          normalizarTextoEscalacao(
            chave
          );


        return (
          nome.includes(
            "conserv"
          ) ||
          nome.includes(
            "equilibr"
          ) ||
          nome.includes(
            "agress"
          )
        );

      }
    )
    .map(
      (
        [
          chave,
          valor
        ]
      ) => ({

        ...valor,

        perfil:
          valor.perfil ??
          valor.nome ??
          chave,

        nome:
          valor.nome ??
          valor.perfil ??
          chave

      })
    );

}


/* =========================================================
   PERFIS PADRÃO
   ========================================================= */


function obterPerfisPadraoEscalacao() {

  return [

    {
      perfil: "Conservador",
      nome: "Conservador"
    },

    {
      perfil: "Equilibrado",
      nome: "Equilibrado"
    },

    {
      perfil: "Agressivo",
      nome: "Agressivo"
    }

  ];

}


/* =========================================================
   CARREGAMENTO DO JSON DE ESCALAÇÕES
   ========================================================= */


async function carregarPerfisEscalacao() {

  try {

    const resposta =
      await fetch(
        CAMINHO_ESCALACOES,
        {
          cache: "no-store"
        }
      );


    if (
      !resposta.ok
    ) {

      throw new Error(
        `HTTP ${resposta.status}`
      );

    }


    const dados =
      await resposta.json();


    const perfis =
      normalizarPerfisEscalacao(
        dados
      );


    if (
      perfis.length > 0
    ) {

      return perfis;

    }


    console.warn(
      "data/escalacoes.json não contém perfis utilizáveis. Usando perfis padrão."
    );


    return obterPerfisPadraoEscalacao();

  } catch (erro) {

    console.warn(
      "Falha ao carregar data/escalacoes.json. Usando perfis padrão.",
      erro
    );


    return obterPerfisPadraoEscalacao();

  }

}


/* =========================================================
   RENDERIZAÇÃO
   ========================================================= */


function renderizarEscalacoesCarregadas(
  escalacoes
) {

  if (
    typeof EscalacoesCards ===
      "undefined" ||
    !EscalacoesCards
  ) {

    return;

  }


  if (
    typeof EscalacoesCards.render ===
      "function"
  ) {

    EscalacoesCards.render(
      escalacoes
    );

    return;

  }


  if (
    typeof EscalacoesCards
      .renderizar ===
      "function"
  ) {

    EscalacoesCards.renderizar(
      escalacoes
    );

    return;

  }


  if (
    typeof EscalacoesCards
      .renderTimes ===
      "function"
  ) {

    EscalacoesCards.renderTimes(
      escalacoes
    );

  }

}


/* =========================================================
   ESTADO DE CARREGAMENTO
   ========================================================= */


function marcarEscalacoesCarregando(
  carregando
) {

  estadoEscalacoes.carregando =
    carregando === true;


  if (
    typeof EscalacoesCards ===
      "undefined" ||
    !EscalacoesCards
  ) {

    return;

  }


  if (
    typeof EscalacoesCards
      .definirCarregando ===
      "function"
  ) {

    EscalacoesCards
      .definirCarregando(
        carregando === true
      );

  }

}


/* =========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================= */


async function carregarEscalacoes() {

  /*
   * Impede duas montagens pesadas simultâneas.
   */

  if (
    estadoEscalacoes.carregando
  ) {

    return estadoEscalacoes
      .escalacoes;

  }


  estadoEscalacoes.carregando =
    true;

  estadoEscalacoes.erro =
    null;


  marcarEscalacoesCarregando(
    true
  );


  const inicio =
    typeof performance !==
      "undefined" &&
    typeof performance.now ===
      "function"
      ? performance.now()
      : Date.now();


  try {

    const [
      perfis,
      jogadores
    ] =
      await Promise.all([

        carregarPerfisEscalacao(),

        Promise.resolve(
          obterJogadoresDisponiveisEscalacao()
        )

      ]);


    if (
      !Array.isArray(
        jogadores
      ) ||
      jogadores.length === 0
    ) {

      console.warn(
        "Nenhum jogador disponível para montar as escalações."
      );


      estadoEscalacoes.escalacoes =
        [];

      estadoEscalacoes.carregado =
        true;


      renderizarEscalacoesCarregadas(
        []
      );


      return [];

    }


    /*
     * Devolve o controle ao navegador antes do
     * cálculo pesado.
     *
     * Isso permite que o primeiro frame da página,
     * navegação e estados visuais sejam processados
     * antes da montagem das escalações.
     */

    await new Promise(
      resolver => {

        if (
          typeof requestAnimationFrame ===
            "function"
        ) {

          requestAnimationFrame(
            () =>
              resolver()
          );

        } else {

          setTimeout(
            resolver,
            0
          );

        }

      }
    );


    const escalacoes =
      gerarEscalacoesSugeridas(
        perfis,
        jogadores
      );


    estadoEscalacoes.escalacoes =
      escalacoes;

    estadoEscalacoes.carregado =
      true;


    renderizarEscalacoesCarregadas(
      escalacoes
    );


    const fim =
      typeof performance !==
        "undefined" &&
      typeof performance.now ===
        "function"
        ? performance.now()
        : Date.now();


    console.info(
      `Escalações montadas em ${arredondarEscalacao(
        fim - inicio,
        0
      )} ms.`,
      {
        jogadores:
          jogadores.length,

        perfis:
          perfis.length,

        escalacoes:
          escalacoes.length,

        patrimonio:
          obterLimitePatrimonioEscalacao()
      }
    );


    return escalacoes;

  } catch (erro) {

    estadoEscalacoes.erro =
      erro;

    estadoEscalacoes.carregado =
      false;


    console.error(
      "Erro ao carregar/montar escalações:",
      erro
    );


    renderizarEscalacoesCarregadas(
      []
    );


    return [];

  } finally {

    estadoEscalacoes.carregando =
      false;


    marcarEscalacoesCarregando(
      false
    );

  }

}


/* =========================================================
   CONSULTAS AO ESTADO
   ========================================================= */


function obterEscalacoesCarregadas() {

  return Array.isArray(
    estadoEscalacoes.escalacoes
  )
    ? estadoEscalacoes.escalacoes
    : [];

}


function obterEstadoEscalacoes() {

  return {

    ...estadoEscalacoes,

    escalacoes:
      obterEscalacoesCarregadas()

  };

}


/* =========================================================
   RECÁLCULO
   ========================================================= */


async function recalcularEscalacoes() {

  return carregarEscalacoes();

}


/* =========================================================
   COMPATIBILIDADE COM CHAMADAS ANTIGAS
   ========================================================= */


async function atualizarEscalacoes() {

  return carregarEscalacoes();

}


function obterPatrimonioEscalacoes() {

  return obterLimitePatrimonioEscalacao();

}


/* =========================================================
   DIAGNÓSTICO DE PERFORMANCE
   ========================================================= */


function obterDiagnosticoEscalacoes() {

  const escalacoes =
    obterEscalacoesCarregadas();


  return {

    carregado:
      estadoEscalacoes.carregado,

    carregando:
      estadoEscalacoes.carregando,

    erro:
      estadoEscalacoes.erro
        ? String(
            estadoEscalacoes.erro
          )
        : null,

    patrimonioSelecionado:
      estadoEscalacoes
        .patrimonioSelecionado,

    limitePatrimonio:
      obterLimitePatrimonioEscalacao(),

    quantidadeEscalacoes:
      escalacoes.length,

    escalacoes:
      escalacoes.map(
        time => ({

          perfil:
            time?.perfil ??
            time?.nome,

          formacao:
            time?.formacao,

          titulares:
            Array.isArray(
              time?.titulares
            )
              ? time.titulares.length
              : 0,

          banco:
            Array.isArray(
              time?.banco
            )
              ? time.banco.length
              : 0,

          custoTotal:
            time?.custoTotal,

          patrimonio:
            time?.limitePatrimonio,

          dentroOrcamento:
            time?.dentroOrcamento,

          projecao:
            time?.projecao,

          titularidadeMedia:
            time?.resumoViabilidade
              ?.titularidadeMedia,

          adequacaoMedia:
            time?.resumoAdequacao
              ?.notaMedia

        })
      )

  };

}

/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */


if (
  typeof window !==
  "undefined"
) {

  window.estadoEscalacoes =
    estadoEscalacoes;


  window.carregarEscalacoes =
    carregarEscalacoes;


  window.recalcularEscalacoes =
    recalcularEscalacoes;


  window.atualizarEscalacoes =
    atualizarEscalacoes;


  window.obterEscalacoesCarregadas =
    obterEscalacoesCarregadas;


  window.obterEstadoEscalacoes =
    obterEstadoEscalacoes;


  window.definirPatrimonioEscalacoes =
    definirPatrimonioEscalacoes;


  window.restaurarPatrimonioPadraoEscalacoes =
    restaurarPatrimonioPadraoEscalacoes;


  window.obterPatrimonioSelecionadoEscalacoes =
    obterPatrimonioSelecionadoEscalacoes;


  window.obterLimitePatrimonioEscalacao =
    obterLimitePatrimonioEscalacao;


  window.obterPatrimonioEscalacoes =
    obterPatrimonioEscalacoes;


  window.obterDiagnosticoEscalacoes =
    obterDiagnosticoEscalacoes;

}


/* =========================================================
   API AGRUPADA
   ========================================================= */


const CartolaEscalacoes = {

  carregar:
    carregarEscalacoes,

  recalcular:
    recalcularEscalacoes,

  atualizar:
    atualizarEscalacoes,

  obter:
    obterEscalacoesCarregadas,

  obterEstado:
    obterEstadoEscalacoes,

  definirPatrimonio:
    definirPatrimonioEscalacoes,

  restaurarPatrimonio:
    restaurarPatrimonioPadraoEscalacoes,

  obterPatrimonioSelecionado:
    obterPatrimonioSelecionadoEscalacoes,

  obterLimitePatrimonio:
    obterLimitePatrimonioEscalacao,

  diagnosticar:
    obterDiagnosticoEscalacoes

};


if (
  typeof window !==
  "undefined"
) {

  window.CartolaEscalacoes =
    CartolaEscalacoes;

}


/* =========================================================
   DIAGNÓSTICO MANUAL
   ========================================================= */


function diagnosticarEscalacoesConsole() {

  const diagnostico =
    obterDiagnosticoEscalacoes();


  console.info(
    "========================================"
  );


  console.info(
    "CARTOLA ESTATÍSTICO — ESCALAÇÕES"
  );


  console.info(
    "========================================"
  );


  console.info(
    "Carregado:",
    diagnostico.carregado
  );


  console.info(
    "Carregando:",
    diagnostico.carregando
  );


  console.info(
    "Patrimônio selecionado:",
    diagnostico.patrimonioSelecionado
  );


  console.info(
    "Limite efetivo:",
    diagnostico.limitePatrimonio
  );


  console.info(
    "Escalações:",
    diagnostico.quantidadeEscalacoes
  );


  if (
    Array.isArray(
      diagnostico.escalacoes
    ) &&
    diagnostico.escalacoes.length >
      0
  ) {

    console.table(
      diagnostico.escalacoes
    );

  }


  if (
    diagnostico.erro
  ) {

    console.error(
      "Erro:",
      diagnostico.erro
    );

  }


  console.info(
    "========================================"
  );


  return diagnostico;

}


if (
  typeof window !==
  "undefined"
) {

  window.diagnosticarEscalacoesConsole =
    diagnosticarEscalacoesConsole;

}


/* =========================================================
   FIM DO ARQUIVO
   ========================================================= */
