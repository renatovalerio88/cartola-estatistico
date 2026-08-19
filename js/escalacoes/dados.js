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
   - usar C$ 120 apenas como patrimônio padrão inicial;
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


/*
 * C$ 120 NÃO é mais teto.
 *
 * É apenas o patrimônio utilizado quando
 * nenhum valor personalizado foi informado.
 */
const PATRIMONIO_PADRAO_ESCALACAO = 120;


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


/* =========================================================
   RESUMO DE VIABILIDADE
   ========================================================= */


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

    return arredondarEscalacao(
      patrimonio,
      2
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
    limite,
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
   * C$ 120 é somente o patrimônio padrão inicial.
   *
   * Exemplos:
   *
   * usuário informa 80  -> limite C$ 80
   * usuário informa 120 -> limite C$ 120
   * usuário informa 140 -> limite C$ 140
   * usuário informa 200 -> limite C$ 200
   */

  return PATRIMONIO_PADRAO_ESCALACAO;

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


  /*
   * Não usamos Math.min(..., 120).
   * O patrimônio informado pelo usuário
   * passa a ser o limite real.
   */

  estadoEscalacoes
    .patrimonioSelecionado =
      arredondarEscalacao(
        patrimonio,
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

  return numeroEscalacao(

    jogador?.projecaoCalibrada ??

    jogador?.projecao ??

    jogador?.projecaoOriginal ??

    jogador?.score ??

    jogador?.media ??

    0

  );

}


function obterProjecaoFinalEscalacao(
  jogador
) {

  return numeroEscalacao(

    jogador?.projecaoContextualizada ??

    jogador?.projecaoViabilidade ??

    jogador?.projecaoCalibrada ??

    jogador?.projecao ??

    jogador?.projecaoOriginal ??

    jogador?.score ??

    jogador?.media ??

    0

  );

}


function obterPisoEscalacao(
  jogador
) {

  return numeroEscalacao(
    jogador?.piso
  );

}


function obterTetoEscalacao(
  jogador
) {

  return numeroEscalacao(
    jogador?.teto
  );

}


function obterConfiancaEscalacao(
  jogador
) {

  return numeroEscalacao(
    jogador?.confianca,
    50
  );

}


function obterRiscoEscalacao(
  jogador
) {

  return numeroEscalacao(
    jogador?.risco,
    50
  );

}


function obterRegularidadeEscalacao(
  jogador
) {

  return numeroEscalacao(
    jogador?.regularidade,
    50
  );

}


function obterPrecoEscalacao(
  jogador
) {

  return Math.max(
    0,
    numeroEscalacao(
      jogador?.preco
    )
  );

}


function obterTitularidadeEscalacao(
  jogador
) {

  return numeroEscalacao(

    jogador?.titularidade ??

    jogador?.viabilidade
      ?.titularidade ??

    50,

    50

  );

}


function obterNotaAdequacaoEscalacao(
  jogador
) {

  return numeroEscalacao(

    jogador?.notaAdequacaoRodada ??

    jogador?.adequacaoRodada
      ?.nota ??

    jogador?.viabilidade
      ?.adequacaoRodada
      ?.nota ??

    50,

    50

  );

}


/* =========================================================
   MÉDIAS
   ========================================================= */


function calcularMediaEscalacao(
  jogadores,
  seletor
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  if (
    lista.length === 0
  ) {

    return 0;

  }


  const valores =
    lista
      .map(
        jogador =>
          numeroEscalacao(
            seletor(
              jogador
            )
          )
      )
      .filter(
        Number.isFinite
      );


  if (
    valores.length === 0
  ) {

    return 0;

  }


  return (
    valores.reduce(
      (
        soma,
        valor
      ) =>
        soma + valor,
      0
    ) /
    valores.length
  );

}


/* =========================================================
   SOMAS
   ========================================================= */


function somarCampoEscalacao(
  jogadores,
  seletor
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  return lista.reduce(
    (
      soma,
      jogador
    ) =>
      soma +
      numeroEscalacao(
        seletor(
          jogador
        )
      ),
    0
  );

}


function calcularCustoJogadoresEscalacao(
  jogadores
) {

  return arredondarEscalacao(
    somarCampoEscalacao(
      jogadores,
      obterPrecoEscalacao
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
   CLUBES
   ========================================================= */


function obterClubeIdEscalacao(
  jogador
) {

  return String(

    jogador?.clubeId ??

    jogador?.clube_id ??

    jogador?.clube?.id ??

    jogador?.siglaClube ??

    jogador?.clube ??

    ""

  );

}


function contarJogadoresPorClubeEscalacao(
  jogadores
) {

  const contagem = {};


  (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  ).forEach(
    jogador => {

      const clube =
        obterClubeIdEscalacao(
          jogador
        );


      if (!clube) {
        return;
      }


      contagem[clube] =
        numeroEscalacao(
          contagem[clube]
        ) + 1;

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


  return Object.values(
    contagem
  ).every(
    quantidade =>
      quantidade <=
      LIMITE_JOGADORES_CLUBE_ESCALACAO
  );

}


/* =========================================================
   ASSINATURA
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
   NOTA BASE DO JOGADOR
   ========================================================= */


function obterNotaBaseJogadorEscalacao(
  jogador
) {

  const score =
    numeroEscalacao(
      jogador?.score,
      obterProjecaoFinalEscalacao(
        jogador
      )
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const regularidade =
    obterRegularidadeEscalacao(
      jogador
    );


  const risco =
    obterRiscoEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  return (

    score * 1.00 +

    projecao * 0.80 +

    piso * 0.20 +

    teto * 0.12 +

    confianca * 0.025 +

    regularidade * 0.018 +

    titularidade * 0.022 +

    adequacao * 0.012 -

    risco * 0.018

  );

}


/* =========================================================
   CUSTO-BENEFÍCIO
   ========================================================= */


function obterCustoBeneficioEscalacao(
  jogador
) {

  const preco =
    obterPrecoEscalacao(
      jogador
    );


  if (
    preco <= 0
  ) {

    return 0;

  }


  return (
    obterProjecaoFinalEscalacao(
      jogador
    ) /
    preco
  );

}


/* =========================================================
   PERFIL
   ========================================================= */


function obterNomePerfilEscalacao(
  perfil
) {

  return String(

    perfil?.perfil ??

    perfil?.nome ??

    perfil?.tipo ??

    ""

  ).trim();

}


function obterTipoPerfilEscalacao(
  perfil
) {

  const nome =
    normalizarTextoEscalacao(
      obterNomePerfilEscalacao(
        perfil
      )
    );


  if (
    nome.includes(
      "conserv"
    )
  ) {

    return "CONSERVADOR";

  }


  if (
    nome.includes(
      "agress"
    )
  ) {

    return "AGRESSIVO";

  }


  return "EQUILIBRADO";

}

/* =========================================================
   PESOS POR PERFIL
   ========================================================= */


function obterPesosPerfilEscalacao(
  perfil
) {

  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    return {

      score: 1.00,
      projecao: 0.70,
      piso: 0.55,
      teto: 0.05,
      confianca: 0.050,
      regularidade: 0.045,
      titularidade: 0.040,
      adequacao: 0.018,
      risco: -0.050,
      custoBeneficio: 0.20

    };

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    return {

      score: 1.00,
      projecao: 0.95,
      piso: 0.05,
      teto: 0.55,
      confianca: 0.018,
      regularidade: 0.008,
      titularidade: 0.018,
      adequacao: 0.022,
      risco: -0.005,
      custoBeneficio: 0.10

    };

  }


  return {

    score: 1.00,
    projecao: 0.85,
    piso: 0.30,
    teto: 0.28,
    confianca: 0.030,
    regularidade: 0.025,
    titularidade: 0.028,
    adequacao: 0.020,
    risco: -0.025,
    custoBeneficio: 0.16

  };

}


/* =========================================================
   NOTA DO JOGADOR POR PERFIL
   ========================================================= */


function calcularNotaJogadorPerfilEscalacao(
  jogador,
  perfil
) {

  const pesos =
    obterPesosPerfilEscalacao(
      perfil
    );


  const score =
    numeroEscalacao(
      jogador?.score,
      obterProjecaoFinalEscalacao(
        jogador
      )
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const regularidade =
    obterRegularidadeEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  const risco =
    obterRiscoEscalacao(
      jogador
    );


  const custoBeneficio =
    obterCustoBeneficioEscalacao(
      jogador
    );


  return (

    score *
      pesos.score +

    projecao *
      pesos.projecao +

    piso *
      pesos.piso +

    teto *
      pesos.teto +

    confianca *
      pesos.confianca +

    regularidade *
      pesos.regularidade +

    titularidade *
      pesos.titularidade +

    adequacao *
      pesos.adequacao +

    risco *
      pesos.risco +

    custoBeneficio *
      pesos.custoBeneficio

  );

}


/* =========================================================
   PREPARAÇÃO PARA RANKING
   ========================================================= */


function prepararJogadorRankingEscalacao(
  jogador,
  perfil
) {

  const preparado =
    prepararJogadorViabilidadeEscalacao(
      jogador,
      perfil
    );


  const notaPerfil =
    calcularNotaJogadorPerfilEscalacao(
      preparado,
      perfil
    );


  return {

    ...preparado,

    notaEscalacao:
      arredondarEscalacao(
        notaPerfil,
        6
      )

  };

}


/* =========================================================
   ORDENAÇÃO
   ========================================================= */


function compararJogadoresEscalacao(
  a,
  b
) {

  const notaA =
    numeroEscalacao(
      a?.notaEscalacao
    );


  const notaB =
    numeroEscalacao(
      b?.notaEscalacao
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


  const projecaoA =
    obterProjecaoFinalEscalacao(
      a
    );


  const projecaoB =
    obterProjecaoFinalEscalacao(
      b
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
    obterConfiancaEscalacao(
      a
    );


  const confiancaB =
    obterConfiancaEscalacao(
      b
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
    obterPrecoEscalacao(
      a
    ) -
    obterPrecoEscalacao(
      b
    )
  );

}


/* =========================================================
   JOGADORES POR POSIÇÃO
   ========================================================= */


function agruparJogadoresPorPosicaoEscalacao(
  jogadores,
  perfil
) {

  const grupos = {

    GOL: [],
    LAT: [],
    ZAG: [],
    MEI: [],
    ATA: [],
    TEC: []

  };


  (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  ).forEach(
    jogador => {

      if (
        !jogadorElegivelRodadaEscalacao(
          jogador
        )
      ) {

        return;

      }


      const posicao =
        normalizarPosicaoEscalacao(
          jogador
        );


      if (
        !Object.prototype.hasOwnProperty.call(
          grupos,
          posicao
        )
      ) {

        return;

      }


      grupos[
        posicao
      ].push(
        prepararJogadorRankingEscalacao(
          jogador,
          perfil
        )
      );

    }
  );


  Object.keys(
    grupos
  ).forEach(
    posicao => {

      grupos[
        posicao
      ].sort(
        compararJogadoresEscalacao
      );

    }
  );


  return grupos;

}


/* =========================================================
   FORMAÇÃO
   ========================================================= */


function obterEstruturaFormacaoEscalacao(
  formacao
) {

  return (
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ] ??
    null
  );

}


function formacaoValidaEscalacao(
  formacao
) {

  return Boolean(
    obterEstruturaFormacaoEscalacao(
      formacao
    )
  );

}


function obterFormacoesPerfilEscalacao(
  perfil
) {

  const candidatas = [];


  const adicionar =
    formacao => {

      const valor =
        String(
          formacao ??
          ""
        ).trim();


      if (
        !formacaoValidaEscalacao(
          valor
        )
      ) {

        return;

      }


      if (
        !candidatas.includes(
          valor
        )
      ) {

        candidatas.push(
          valor
        );

      }

    };


  /*
   * A formação eventualmente cadastrada
   * no perfil participa normalmente.
   *
   * Ela NÃO recebe bônus.
   */
  adicionar(
    perfil?.formacao
  );


  FORMACOES_CANDIDATAS_ESCALACAO
    .forEach(
      adicionar
    );


  return candidatas;

}


/* =========================================================
   VALIDAÇÃO DA QUANTIDADE POR POSIÇÃO
   ========================================================= */


function validarQuantidadePosicoesEscalacao(
  jogadores,
  formacao
) {

  const estrutura =
    obterEstruturaFormacaoEscalacao(
      formacao
    );


  if (!estrutura) {
    return false;
  }


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
        Object.prototype.hasOwnProperty.call(
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


  return ORDEM_POSICOES_ESCALACAO
    .every(
      posicao =>
        contagem[
          posicao
        ] ===
        numeroEscalacao(
          estrutura[
            posicao
          ]
        )
    );

}


/* =========================================================
   QUANTIDADE DE TITULARES
   ========================================================= */


function obterQuantidadeTitularesFormacaoEscalacao(
  formacao
) {

  const estrutura =
    obterEstruturaFormacaoEscalacao(
      formacao
    );


  if (!estrutura) {
    return 0;
  }


  return Object.values(
    estrutura
  ).reduce(
    (
      soma,
      quantidade
    ) =>
      soma +
      numeroEscalacao(
        quantidade
      ),
    0
  );

}


/* =========================================================
   SELEÇÃO INICIAL POR POSIÇÃO
   ========================================================= */


function selecionarMelhoresPosicaoEscalacao(
  jogadores,
  quantidade
) {

  const limite =
    Math.max(
      0,
      Math.floor(
        numeroEscalacao(
          quantidade
        )
      )
    );


  if (
    limite === 0
  ) {

    return [];

  }


  return (
    Array.isArray(
      jogadores
    )
      ? jogadores
      : []
  )
    .slice(
      0,
      limite
    );

}


/* =========================================================
   MONTA SELEÇÃO INICIAL
   ========================================================= */


function montarSelecaoInicialEscalacao(
  grupos,
  formacao
) {

  const estrutura =
    obterEstruturaFormacaoEscalacao(
      formacao
    );


  if (!estrutura) {
    return null;
  }


  const selecionados = [];


  for (
    const posicao of
    ORDEM_POSICOES_ESCALACAO
  ) {

    const quantidade =
      numeroEscalacao(
        estrutura[
          posicao
        ]
      );


    if (
      quantidade <= 0
    ) {

      continue;

    }


    const candidatos =
      Array.isArray(
        grupos?.[
          posicao
        ]
      )
        ? grupos[
            posicao
          ]
        : [];


    if (
      candidatos.length <
      quantidade
    ) {

      return null;

    }


    selecionados.push(
      ...selecionarMelhoresPosicaoEscalacao(
        candidatos,
        quantidade
      )
    );

  }


  return selecionados;

}


/* =========================================================
   SUBSTITUIÇÃO POR JOGADOR MAIS BARATO
   ========================================================= */


function encontrarSubstitutoMaisBaratoEscalacao(
  jogadorAtual,
  titulares,
  grupos
) {

  const posicao =
    normalizarPosicaoEscalacao(
      jogadorAtual
    );


  const candidatos =
    Array.isArray(
      grupos?.[
        posicao
      ]
    )
      ? grupos[
          posicao
        ]
      : [];


  const idsTitulares =
    new Set(
      (
        Array.isArray(
          titulares
        )
          ? titulares
          : []
      ).map(
        obterIdJogadorEscalacao
      )
    );


  const precoAtual =
    obterPrecoEscalacao(
      jogadorAtual
    );


  const alternativas =
    candidatos.filter(
      candidato => {

        const id =
          obterIdJogadorEscalacao(
            candidato
          );


        if (
          !id ||
          idsTitulares.has(
            id
          )
        ) {

          return false;

        }


        return (
          obterPrecoEscalacao(
            candidato
          ) <
          precoAtual
        );

      }
    );


  alternativas.sort(
    (
      a,
      b
    ) => {

      const economiaA =
        precoAtual -
        obterPrecoEscalacao(
          a
        );


      const economiaB =
        precoAtual -
        obterPrecoEscalacao(
          b
        );


      const perdaA =
        numeroEscalacao(
          jogadorAtual
            ?.notaEscalacao
        ) -
        numeroEscalacao(
          a?.notaEscalacao
        );


      const perdaB =
        numeroEscalacao(
          jogadorAtual
            ?.notaEscalacao
        ) -
        numeroEscalacao(
          b?.notaEscalacao
        );


      const eficienciaA =
        economiaA > 0
          ? perdaA /
            economiaA
          : Infinity;


      const eficienciaB =
        economiaB > 0
          ? perdaB /
            economiaB
          : Infinity;


      if (
        Math.abs(
          eficienciaA -
          eficienciaB
        ) >
        0.000001
      ) {

        return (
          eficienciaA -
          eficienciaB
        );

      }


      return (
        numeroEscalacao(
          b?.notaEscalacao
        ) -
        numeroEscalacao(
          a?.notaEscalacao
        )
      );

    }
  );


  return (
    alternativas[
      0
    ] ??
    null
  );

}


/* =========================================================
   AJUSTE DE LIMITE POR CLUBE
   ========================================================= */


function corrigirLimiteClubeEscalacao(
  titulares,
  grupos
) {

  let resultado =
    Array.isArray(
      titulares
    )
      ? [
          ...titulares
        ]
      : [];


  let tentativas = 0;


  while (
    !respeitaLimiteClubeEscalacao(
      resultado
    ) &&
    tentativas < 100
  ) {

    tentativas += 1;


    const contagem =
      contarJogadoresPorClubeEscalacao(
        resultado
      );


    const clubeExcedente =
      Object.entries(
        contagem
      )
        .find(
          (
            [
              ,
              quantidade
            ]
          ) =>
            quantidade >
            LIMITE_JOGADORES_CLUBE_ESCALACAO
        );


    if (
      !clubeExcedente
    ) {

      break;

    }


    const clube =
      clubeExcedente[
        0
      ];


    const jogadoresClube =
      resultado
        .filter(
          jogador =>
            obterClubeIdEscalacao(
              jogador
            ) ===
            clube
        )
        .sort(
          (
            a,
            b
          ) =>
            numeroEscalacao(
              a?.notaEscalacao
            ) -
            numeroEscalacao(
              b?.notaEscalacao
            )
        );


    let substituiu =
      false;


    for (
      const jogadorAtual of
      jogadoresClube
    ) {

      const posicao =
        normalizarPosicaoEscalacao(
          jogadorAtual
        );


      const idsTitulares =
        new Set(
          resultado.map(
            obterIdJogadorEscalacao
          )
        );


      const alternativas =
        (
          grupos?.[
            posicao
          ] ??
          []
        )
          .filter(
            candidato => {

              const id =
                obterIdJogadorEscalacao(
                  candidato
                );


              if (
                !id ||
                idsTitulares.has(
                  id
                )
              ) {

                return false;

              }


              if (
                obterClubeIdEscalacao(
                  candidato
                ) ===
                clube
              ) {

                return false;

              }


              return true;

            }
          )
          .sort(
            compararJogadoresEscalacao
          );


      for (
        const candidato of
        alternativas
      ) {

        const indice =
          resultado.indexOf(
            jogadorAtual
          );


        if (
          indice < 0
        ) {

          continue;

        }


        const teste = [
          ...resultado
        ];


        teste[
          indice
        ] =
          candidato;


        if (
          respeitaLimiteClubeEscalacao(
            teste
          )
        ) {

          resultado =
            teste;

          substituiu =
            true;

          break;

        }

      }


      if (
        substituiu
      ) {

        break;

      }

    }


    if (
      !substituiu
    ) {

      return null;

    }

  }


  return respeitaLimiteClubeEscalacao(
    resultado
  )
    ? resultado
    : null;

}


/* =========================================================
   AJUSTE AO PATRIMÔNIO
   ========================================================= */


function ajustarTitularesAoPatrimonioEscalacao(
  titulares,
  grupos,
  limitePatrimonio
) {

  let resultado =
    Array.isArray(
      titulares
    )
      ? [
          ...titulares
        ]
      : [];


  const limite =
    numeroEscalacao(
      limitePatrimonio,
      PATRIMONIO_PADRAO_ESCALACAO
    );


  let tentativas = 0;


  while (
    calcularCustoJogadoresEscalacao(
      resultado
    ) >
    limite &&
    tentativas < 300
  ) {

    tentativas += 1;


    let melhorTroca =
      null;


    for (
      let indice = 0;
      indice <
      resultado.length;
      indice += 1
    ) {

      const jogadorAtual =
        resultado[
          indice
        ];


      const substituto =
        encontrarSubstitutoMaisBaratoEscalacao(
          jogadorAtual,
          resultado,
          grupos
        );


      if (
        !substituto
      ) {

        continue;

      }


      const economia =
        obterPrecoEscalacao(
          jogadorAtual
        ) -
        obterPrecoEscalacao(
          substituto
        );


      if (
        economia <= 0
      ) {

        continue;

      }


      const perdaNota =
        numeroEscalacao(
          jogadorAtual
            ?.notaEscalacao
        ) -
        numeroEscalacao(
          substituto
            ?.notaEscalacao
        );


      const eficiencia =
        perdaNota /
        economia;


      const teste = [
        ...resultado
      ];


      teste[
        indice
      ] =
        substituto;


      if (
        !respeitaLimiteClubeEscalacao(
          teste
        )
      ) {

        continue;

      }


      if (
        !melhorTroca ||
        eficiencia <
          melhorTroca
            .eficiencia
      ) {

        melhorTroca = {

          indice,

          substituto,

          economia,

          perdaNota,

          eficiencia

        };

      }

    }


    if (
      !melhorTroca
    ) {

      return null;

    }


    resultado[
      melhorTroca.indice
    ] =
      melhorTroca.substituto;

  }


  if (
    calcularCustoJogadoresEscalacao(
      resultado
    ) >
    limite
  ) {

    return null;

  }


  return resultado;

}


/* =========================================================
   MELHORIA LOCAL DOS TITULARES
   ========================================================= */


function melhorarTitularesEscalacao(
  titulares,
  grupos,
  limitePatrimonio
) {

  let resultado =
    Array.isArray(
      titulares
    )
      ? [
          ...titulares
        ]
      : [];


  const limite =
    numeroEscalacao(
      limitePatrimonio,
      PATRIMONIO_PADRAO_ESCALACAO
    );


  let houveMelhoria =
    true;


  let ciclos = 0;


  while (
    houveMelhoria &&
    ciclos < 30
  ) {

    ciclos += 1;

    houveMelhoria =
      false;


    for (
      let indice = 0;
      indice <
      resultado.length;
      indice += 1
    ) {

      const atual =
        resultado[
          indice
        ];


      const posicao =
        normalizarPosicaoEscalacao(
          atual
        );


      const candidatos =
        grupos?.[
          posicao
        ] ??
        [];


      const ids =
        new Set(
          resultado.map(
            obterIdJogadorEscalacao
          )
        );


      for (
        const candidato of
        candidatos
      ) {

        const id =
          obterIdJogadorEscalacao(
            candidato
          );


        if (
          !id ||
          ids.has(
            id
          )
        ) {

          continue;

        }


        if (
          numeroEscalacao(
            candidato
              ?.notaEscalacao
          ) <=
          numeroEscalacao(
            atual
              ?.notaEscalacao
          )
        ) {

          continue;

        }


        const teste = [
          ...resultado
        ];


        teste[
          indice
        ] =
          candidato;


        if (
          calcularCustoJogadoresEscalacao(
            teste
          ) >
          limite
        ) {

          continue;

        }


        if (
          !respeitaLimiteClubeEscalacao(
            teste
          )
        ) {

          continue;

        }


        resultado =
          teste;

        houveMelhoria =
          true;

        break;

      }


      if (
        houveMelhoria
      ) {

        break;

      }

    }

  }


  return resultado;

}


/* =========================================================
   MONTA TITULARES
   ========================================================= */


function montarTitularesFormacaoEscalacao(
  grupos,
  formacao,
  limitePatrimonio
) {

  let titulares =
    montarSelecaoInicialEscalacao(
      grupos,
      formacao
    );


  if (
    !titulares
  ) {

    return null;

  }


  titulares =
    corrigirLimiteClubeEscalacao(
      titulares,
      grupos
    );


  if (
    !titulares
  ) {

    return null;

  }


  titulares =
    ajustarTitularesAoPatrimonioEscalacao(
      titulares,
      grupos,
      limitePatrimonio
    );


  if (
    !titulares
  ) {

    return null;

  }


  titulares =
    melhorarTitularesEscalacao(
      titulares,
      grupos,
      limitePatrimonio
    );


  if (
    !validarQuantidadePosicoesEscalacao(
      titulares,
      formacao
    )
  ) {

    return null;

  }


  if (
    !respeitaLimiteClubeEscalacao(
      titulares
    )
  ) {

    return null;

  }


  if (
    calcularCustoJogadoresEscalacao(
      titulares
    ) >
    limitePatrimonio
  ) {

    return null;

  }


  return titulares;

}


/* =========================================================
   MÉTRICAS DOS TITULARES
   ========================================================= */


function calcularMetricasTitularesEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  return {

    quantidade:
      jogadores.length,

    custo:
      calcularCustoJogadoresEscalacao(
        jogadores
      ),

    projecao:
      arredondarEscalacao(
        somarCampoEscalacao(
          jogadores,
          obterProjecaoFinalEscalacao
        ),
        2
      ),

    projecaoEstatistica:
      arredondarEscalacao(
        somarCampoEscalacao(
          jogadores,
          obterProjecaoEstatisticaEscalacao
        ),
        2
      ),

    piso:
      arredondarEscalacao(
        somarCampoEscalacao(
          jogadores,
          obterPisoEscalacao
        ),
        2
      ),

    teto:
      arredondarEscalacao(
        somarCampoEscalacao(
          jogadores,
          obterTetoEscalacao
        ),
        2
      ),

    confianca:
      arredondarEscalacao(
        calcularMediaEscalacao(
          jogadores,
          obterConfiancaEscalacao
        ),
        1
      ),

    risco:
      arredondarEscalacao(
        calcularMediaEscalacao(
          jogadores,
          obterRiscoEscalacao
        ),
        1
      ),

    regularidade:
      arredondarEscalacao(
        calcularMediaEscalacao(
          jogadores,
          obterRegularidadeEscalacao
        ),
        1
      ),

    titularidade:
      arredondarEscalacao(
        calcularMediaEscalacao(
          jogadores,
          obterTitularidadeEscalacao
        ),
        1
      ),

    adequacao:
      arredondarEscalacao(
        calcularMediaEscalacao(
          jogadores,
          obterNotaAdequacaoEscalacao
        ),
        1
      ),

    nota:
      arredondarEscalacao(
        somarCampoEscalacao(
          jogadores,
          jogador =>
            jogador?.notaEscalacao
        ),
        4
      )

  };

}


/* =========================================================
   PONTUAÇÃO DA FORMAÇÃO
   ========================================================= */


function calcularNotaFormacaoEscalacao(
  titulares,
  perfil
) {

  const metricas =
    calcularMetricasTitularesEscalacao(
      titulares
    );


  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    return (

      metricas.projecao *
        1.00 +

      metricas.piso *
        0.60 +

      metricas.confianca *
        0.15 +

      metricas.regularidade *
        0.12 +

      metricas.titularidade *
        0.12 +

      metricas.adequacao *
        0.08 -

      metricas.risco *
        0.10

    );

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    return (

      metricas.projecao *
        1.00 +

      metricas.teto *
        0.65 +

      metricas.confianca *
        0.05 +

      metricas.titularidade *
        0.05 +

      metricas.adequacao *
        0.12 -

      metricas.risco *
        0.01

    );

  }


  return (

    metricas.projecao *
      1.00 +

    metricas.piso *
      0.28 +

    metricas.teto *
      0.30 +

    metricas.confianca *
      0.10 +

    metricas.regularidade *
      0.08 +

    metricas.titularidade *
      0.08 +

    metricas.adequacao *
      0.10 -

    metricas.risco *
      0.05

  );

}


/* =========================================================
   COMPARAÇÃO DE FORMAÇÕES
   ========================================================= */


function compararFormacoesEscalacao(
  a,
  b
) {

  const notaA =
    numeroEscalacao(
      a?.notaFormacao
    );


  const notaB =
    numeroEscalacao(
      b?.notaFormacao
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


  const projecaoA =
    numeroEscalacao(
      a?.metricas
        ?.projecao
    );


  const projecaoB =
    numeroEscalacao(
      b?.metricas
        ?.projecao
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


  const pisoA =
    numeroEscalacao(
      a?.metricas
        ?.piso
    );


  const pisoB =
    numeroEscalacao(
      b?.metricas
        ?.piso
    );


  if (
    Math.abs(
      pisoB -
      pisoA
    ) >
    0.000001
  ) {

    return (
      pisoB -
      pisoA
    );

  }


  return (
    numeroEscalacao(
      a?.metricas
        ?.custo
    ) -
    numeroEscalacao(
      b?.metricas
        ?.custo
    )
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

  const grupos =
    agruparJogadoresPorPosicaoEscalacao(
      jogadores,
      perfil
    );


  const formacoes =
    obterFormacoesPerfilEscalacao(
      perfil
    );


  const resultados = [];


  formacoes.forEach(
    formacao => {

      const titulares =
        montarTitularesFormacaoEscalacao(
          grupos,
          formacao,
          limitePatrimonio
        );


      if (
        !titulares
      ) {

        return;

      }


      const quantidadeEsperada =
        obterQuantidadeTitularesFormacaoEscalacao(
          formacao
        );


      if (
        titulares.length !==
        quantidadeEsperada
      ) {

        return;

      }


      const metricas =
        calcularMetricasTitularesEscalacao(
          titulares
        );


      const notaFormacao =
        calcularNotaFormacaoEscalacao(
          titulares,
          perfil
        );


      resultados.push({

        formacao,

        titulares,

        /*
         * Alias intencional.
         *
         * Alguns componentes antigos da interface
         * utilizam "jogadores".
         */
        jogadores:
          titulares,

        metricas,

        notaFormacao:
          arredondarEscalacao(
            notaFormacao,
            6
          )

      });

    }
  );


  resultados.sort(
    compararFormacoesEscalacao
  );


  return (
    resultados[
      0
    ] ??
    null
  );

}


/* =========================================================
   CAPITÃO — NOTA
   ========================================================= */


function calcularNotaCapitaoEscalacao(
  jogador,
  perfil
) {

  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const regularidade =
    obterRegularidadeEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  const risco =
    obterRiscoEscalacao(
      jogador
    );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    return (

      projecao *
        1.00 +

      piso *
        0.60 +

      teto *
        0.12 +

      confianca *
        0.05 +

      regularidade *
        0.05 +

      titularidade *
        0.05 +

      adequacao *
        0.025 -

      risco *
        0.04

    );

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    return (

      projecao *
        1.00 +

      teto *
        0.80 +

      piso *
        0.05 +

      confianca *
        0.02 +

      titularidade *
        0.025 +

      adequacao *
        0.035 -

      risco *
        0.005

    );

  }


  return (

    projecao *
      1.00 +

    piso *
      0.30 +

    teto *
      0.45 +

    confianca *
      0.035 +

    regularidade *
      0.025 +

    titularidade *
      0.035 +

    adequacao *
      0.03 -

    risco *
      0.02

  );

}


/* =========================================================
   JUSTIFICATIVA DO CAPITÃO
   ========================================================= */


function gerarJustificativaCapitaoEscalacao(
  jogador,
  perfil
) {

  if (!jogador) {
    return "";
  }


  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  const partes = [];


  partes.push(
    `projeção de ${arredondarEscalacao(
      projecao,
      1
    )} pontos`
  );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    partes.push(
      `piso de ${arredondarEscalacao(
        piso,
        1
      )}`
    );

  } else {

    partes.push(
      `teto de ${arredondarEscalacao(
        teto,
        1
      )}`
    );

  }


  if (
    confianca >= 70
  ) {

    partes.push(
      `confiança de ${arredondarEscalacao(
        confianca,
        0
      )}%`
    );

  }


  if (
    titularidade >= 80
  ) {

    partes.push(
      `titularidade estimada em ${arredondarEscalacao(
        titularidade,
        0
      )}%`
    );

  }


  if (
    adequacao >= 65
  ) {

    partes.push(
      "boa adequação ao confronto da rodada"
    );

  }


  return (
    `Escolhido como capitão por combinar ${partes.join(
      ", "
    )}.`
  );

}


/* =========================================================
   SELEÇÃO DO CAPITÃO
   ========================================================= */


function selecionarCapitaoEscalacao(
  titulares,
  perfil
) {

  const candidatos =
    (
      Array.isArray(
        titulares
      )
        ? titulares
        : []
    )
      .filter(
        jogador =>
          normalizarPosicaoEscalacao(
            jogador
          ) !==
          "TEC"
      )
      .map(
        jogador => ({

          jogador,

          notaCapitao:
            calcularNotaCapitaoEscalacao(
              jogador,
              perfil
            )

        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.notaCapitao -
          a.notaCapitao
      );


  const escolhido =
    candidatos[
      0
    ];


  if (
    !escolhido
  ) {

    return null;

  }


  const justificativa =
    gerarJustificativaCapitaoEscalacao(
      escolhido.jogador,
      perfil
    );


  return {

    ...escolhido.jogador,

    notaCapitao:
      arredondarEscalacao(
        escolhido.notaCapitao,
        4
      ),

    justificativaCapitao:
      justificativa,

    justificativa:
      justificativa

  };

}


/* =========================================================
   CANDIDATOS AO BANCO
   ========================================================= */


function obterCandidatosBancoEscalacao(
  jogadores,
  titulares,
  posicao,
  perfil
) {

  const idsTitulares =
    new Set(
      (
        Array.isArray(
          titulares
        )
          ? titulares
          : []
      ).map(
        obterIdJogadorEscalacao
      )
    );


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
      jogador =>
        !idsTitulares.has(
          obterIdJogadorEscalacao(
            jogador
          )
        )
    )
    .filter(
      jogadorElegivelRodadaEscalacao
    )
    .map(
      jogador =>
        prepararJogadorRankingEscalacao(
          jogador,
          perfil
        )
    )
    .sort(
      compararJogadoresEscalacao
    );

}


/* =========================================================
   NOTA PARA O BANCO
   ========================================================= */


function calcularNotaBancoEscalacao(
  jogador
) {

  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const risco =
    obterRiscoEscalacao(
      jogador
    );


  const custoBeneficio =
    obterCustoBeneficioEscalacao(
      jogador
    );


  return (

    projecao *
      1.00 +

    piso *
      0.30 +

    confianca *
      0.035 +

    titularidade *
      0.045 -

    risco *
      0.025 +

    custoBeneficio *
      0.30

  );

}


/* =========================================================
   JUSTIFICATIVA DO BANCO
   ========================================================= */


function gerarJustificativaBancoEscalacao(
  jogador
) {

  if (!jogador) {
    return "";
  }


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const preco =
    obterPrecoEscalacao(
      jogador
    );


  return (
    `Reserva escolhido pela combinação de ` +
    `projeção de ${arredondarEscalacao(
      projecao,
      1
    )}, ` +
    `titularidade de ${arredondarEscalacao(
      titularidade,
      0
    )}% e custo de C$ ${arredondarEscalacao(
      preco,
      2
    ).toFixed(
      2
    )}.`
  );

}


/* =========================================================
   ESCOLHA DE UM RESERVA
   ========================================================= */


function escolherReservaPosicaoEscalacao(
  candidatos,
  saldo
) {

  const disponiveis =
    (
      Array.isArray(
        candidatos
      )
        ? candidatos
        : []
    )
      .filter(
        jogador =>
          obterPrecoEscalacao(
            jogador
          ) <=
          saldo
      )
      .map(
        jogador => ({

          jogador,

          notaBanco:
            calcularNotaBancoEscalacao(
              jogador
            )

        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.notaBanco -
          a.notaBanco
      );


  const escolhido =
    disponiveis[
      0
    ];


  if (
    !escolhido
  ) {

    return null;

  }


  const justificativa =
    gerarJustificativaBancoEscalacao(
      escolhido.jogador
    );


  return {

    ...escolhido.jogador,

    notaBanco:
      arredondarEscalacao(
        escolhido.notaBanco,
        4
      ),

    justificativaBanco:
      justificativa,

    justificativa:
      justificativa

  };

}


/* =========================================================
   BANCO
   ========================================================= */


function montarBancoEscalacao(
  jogadores,
  titulares,
  perfil,
  limitePatrimonio
) {

  const banco = [];


  let saldo =
    arredondarEscalacao(

      numeroEscalacao(
        limitePatrimonio,
        PATRIMONIO_PADRAO_ESCALACAO
      ) -

      calcularCustoJogadoresEscalacao(
        titulares
      ),

      2

    );


  if (
    saldo <= 0
  ) {

    return banco;

  }


  for (
    const posicao of
    POSICOES_BANCO
  ) {

    const candidatos =
      obterCandidatosBancoEscalacao(
        jogadores,
        [
          ...titulares,
          ...banco
        ],
        posicao,
        perfil
      );


    const reserva =
      escolherReservaPosicaoEscalacao(
        candidatos,
        saldo
      );


    if (
      !reserva
    ) {

      continue;

    }


    banco.push(
      reserva
    );


    saldo =
      arredondarEscalacao(
        saldo -
        obterPrecoEscalacao(
          reserva
        ),
        2
      );

  }


  return banco;

}

/* =========================================================
   RESERVA DE LUXO — NOTA
   ========================================================= */


function calcularNotaReservaLuxoEscalacao(
  jogador,
  perfil
) {

  if (!jogador) {
    return -Infinity;
  }


  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const regularidade =
    obterRegularidadeEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  const risco =
    obterRiscoEscalacao(
      jogador
    );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    return (

      projecao *
        1.00 +

      piso *
        0.45 +

      teto *
        0.15 +

      confianca *
        0.045 +

      regularidade *
        0.040 +

      titularidade *
        0.050 +

      adequacao *
        0.025 -

      risco *
        0.035

    );

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    return (

      projecao *
        1.00 +

      teto *
        0.65 +

      piso *
        0.08 +

      confianca *
        0.020 +

      titularidade *
        0.030 +

      adequacao *
        0.040 -

      risco *
        0.008

    );

  }


  return (

    projecao *
      1.00 +

    piso *
      0.25 +

    teto *
      0.35 +

    confianca *
      0.032 +

    regularidade *
      0.025 +

    titularidade *
      0.040 +

    adequacao *
      0.032 -

    risco *
      0.020

  );

}


/* =========================================================
   JUSTIFICATIVA DA RESERVA DE LUXO
   ========================================================= */


function gerarJustificativaReservaLuxoEscalacao(
  jogador,
  perfil
) {

  if (!jogador) {
    return "";
  }


  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  const partes = [];


  partes.push(
    `projeção de ${arredondarEscalacao(
      projecao,
      1
    )} pontos`
  );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    partes.push(
      `piso de ${arredondarEscalacao(
        piso,
        1
      )}`
    );

  } else {

    partes.push(
      `teto de ${arredondarEscalacao(
        teto,
        1
      )}`
    );

  }


  if (
    confianca >= 65
  ) {

    partes.push(
      `confiança de ${arredondarEscalacao(
        confianca,
        0
      )}%`
    );

  }


  if (
    titularidade >= 80
  ) {

    partes.push(
      `titularidade estimada em ${arredondarEscalacao(
        titularidade,
        0
      )}%`
    );

  }


  if (
    adequacao >= 65
  ) {

    partes.push(
      "boa adequação à rodada"
    );

  }


  return (
    `Reserva de Luxo escolhida pela combinação de ${partes.join(
      ", "
    )}.`
  );

}


/* =========================================================
   SELEÇÃO DA RESERVA DE LUXO
   ========================================================= */


function selecionarReservaLuxoEscalacao(
  banco,
  perfil
) {

  const candidatos =
    (
      Array.isArray(
        banco
      )
        ? banco
        : []
    )
      .map(
        jogador => ({

          jogador,

          notaReservaLuxo:
            calcularNotaReservaLuxoEscalacao(
              jogador,
              perfil
            )

        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.notaReservaLuxo -
          a.notaReservaLuxo
      );


  const escolhido =
    candidatos[
      0
    ];


  if (
    !escolhido
  ) {

    return null;

  }


  const justificativa =
    gerarJustificativaReservaLuxoEscalacao(
      escolhido.jogador,
      perfil
    );


  return {

    ...escolhido.jogador,

    notaReservaLuxo:
      arredondarEscalacao(
        escolhido.notaReservaLuxo,
        4
      ),

    justificativaReservaLuxo:
      justificativa,

    justificativa:
      justificativa

  };

}


/* =========================================================
   JUSTIFICATIVA DO TITULAR
   ========================================================= */


function gerarJustificativaTitularEscalacao(
  jogador,
  perfil
) {

  if (!jogador) {
    return "";
  }


  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const projecao =
    obterProjecaoFinalEscalacao(
      jogador
    );


  const piso =
    obterPisoEscalacao(
      jogador
    );


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const regularidade =
    obterRegularidadeEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeEscalacao(
      jogador
    );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  const preco =
    obterPrecoEscalacao(
      jogador
    );


  const partes = [];


  partes.push(
    `projeção de ${arredondarEscalacao(
      projecao,
      1
    )}`
  );


  if (
    tipo ===
    "CONSERVADOR" &&
    piso > 0
  ) {

    partes.push(
      `piso de ${arredondarEscalacao(
        piso,
        1
      )}`
    );

  }


  if (
    tipo ===
    "AGRESSIVO" &&
    teto > 0
  ) {

    partes.push(
      `teto de ${arredondarEscalacao(
        teto,
        1
      )}`
    );

  }


  if (
    tipo ===
    "EQUILIBRADO"
  ) {

    if (
      piso > 0
    ) {

      partes.push(
        `piso de ${arredondarEscalacao(
          piso,
          1
        )}`
      );

    }


    if (
      teto > 0
    ) {

      partes.push(
        `teto de ${arredondarEscalacao(
          teto,
          1
        )}`
      );

    }

  }


  if (
    confianca >= 65
  ) {

    partes.push(
      `confiança de ${arredondarEscalacao(
        confianca,
        0
      )}%`
    );

  }


  if (
    regularidade >= 65
  ) {

    partes.push(
      `regularidade de ${arredondarEscalacao(
        regularidade,
        0
      )}%`
    );

  }


  if (
    titularidade >= 75
  ) {

    partes.push(
      `titularidade estimada em ${arredondarEscalacao(
        titularidade,
        0
      )}%`
    );

  }


  if (
    adequacao >= 65
  ) {

    partes.push(
      "boa adequação ao confronto"
    );

  }


  if (
    preco > 0
  ) {

    partes.push(
      `custo de C$ ${arredondarEscalacao(
        preco,
        2
      ).toFixed(
        2
      )}`
    );

  }


  return (
    `Titular escolhido pela combinação de ${partes.join(
      ", "
    )}.`
  );

}


/* =========================================================
   APLICA JUSTIFICATIVAS AOS TITULARES
   ========================================================= */


function aplicarJustificativasTitularesEscalacao(
  titulares,
  perfil
) {

  return (
    Array.isArray(
      titulares
    )
      ? titulares
      : []
  ).map(
    jogador => {

      const justificativa =
        jogador?.justificativa &&
        String(
          jogador.justificativa
        ).trim()
          ? jogador.justificativa
          : gerarJustificativaTitularEscalacao(
              jogador,
              perfil
            );


      return {

        ...jogador,

        justificativaTitular:
          justificativa,

        justificativa:
          justificativa

      };

    }
  );

}


/* =========================================================
   IDENTIFICAÇÃO DO CAPITÃO NOS TITULARES
   ========================================================= */


function marcarCapitaoTitularesEscalacao(
  titulares,
  capitao
) {

  const idCapitao =
    obterIdJogadorEscalacao(
      capitao
    );


  return (
    Array.isArray(
      titulares
    )
      ? titulares
      : []
  ).map(
    jogador => {

      const id =
        obterIdJogadorEscalacao(
          jogador
        );


      return {

        ...jogador,

        capitao:
          Boolean(
            idCapitao &&
            id ===
            idCapitao
          ),

        isCapitao:
          Boolean(
            idCapitao &&
            id ===
            idCapitao
          )

      };

    }
  );

}


/* =========================================================
   IDENTIFICAÇÃO DA RESERVA DE LUXO NO BANCO
   ========================================================= */


function marcarReservaLuxoBancoEscalacao(
  banco,
  reservaLuxo
) {

  const idReservaLuxo =
    obterIdJogadorEscalacao(
      reservaLuxo
    );


  return (
    Array.isArray(
      banco
    )
      ? banco
      : []
  ).map(
    jogador => {

      const id =
        obterIdJogadorEscalacao(
          jogador
        );


      return {

        ...jogador,

        reservaLuxo:
          Boolean(
            idReservaLuxo &&
            id ===
            idReservaLuxo
          ),

        isReservaLuxo:
          Boolean(
            idReservaLuxo &&
            id ===
            idReservaLuxo
          )

      };

    }
  );

}


/* =========================================================
   RESUMO DO PERFIL
   ========================================================= */


function gerarResumoPerfilEscalacao(
  perfil,
  formacao,
  titulares,
  banco,
  limitePatrimonio
) {

  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const metricas =
    calcularMetricasTitularesEscalacao(
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


  const saldo =
    arredondarEscalacao(
      numeroEscalacao(
        limitePatrimonio
      ) -
      custoTotal,
      2
    );


  let descricao =
    "Equilíbrio entre segurança e potencial de pontuação.";


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    descricao =
      "Prioriza piso, regularidade, confiança e segurança de escalação.";

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    descricao =
      "Prioriza teto e potencial de explosão, aceitando maior volatilidade.";

  }


  return {

    tipo,

    descricao,

    formacao,

    quantidadeTitulares:
      titulares.length,

    quantidadeBanco:
      banco.length,

    limitePatrimonio:
      arredondarEscalacao(
        limitePatrimonio,
        2
      ),

    custoTitulares,

    custoBanco,

    custoTotal,

    saldo,

    projecao:
      metricas.projecao,

    piso:
      metricas.piso,

    teto:
      metricas.teto,

    confianca:
      metricas.confianca,

    risco:
      metricas.risco,

    regularidade:
      metricas.regularidade,

    titularidade:
      metricas.titularidade,

    adequacao:
      metricas.adequacao

  };

}


/* =========================================================
   JUSTIFICATIVA GERAL DA ESCALAÇÃO
   ========================================================= */


function gerarJustificativaEscalacao(
  perfil,
  formacao,
  titulares,
  banco,
  limitePatrimonio
) {

  const resumo =
    gerarResumoPerfilEscalacao(
      perfil,
      formacao,
      titulares,
      banco,
      limitePatrimonio
    );


  const partes = [];


  partes.push(
    `${resumo.quantidadeTitulares} titulares`
  );


  partes.push(
    `formação ${formacao}`
  );


  partes.push(
    `projeção de ${arredondarEscalacao(
      resumo.projecao,
      1
    )} pontos`
  );


  partes.push(
    `custo total de C$ ${arredondarEscalacao(
      resumo.custoTotal,
      2
    ).toFixed(
      2
    )}`
  );


  partes.push(
    `dentro do patrimônio de C$ ${arredondarEscalacao(
      limitePatrimonio,
      2
    ).toFixed(
      2
    )}`
  );


  if (
    resumo.titularidade > 0
  ) {

    partes.push(
      `titularidade média de ${arredondarEscalacao(
        resumo.titularidade,
        0
      )}%`
    );

  }


  if (
    resumo.adequacao > 0
  ) {

    partes.push(
      `adequação média à rodada de ${arredondarEscalacao(
        resumo.adequacao,
        0
      )}%`
    );

  }


  return (
    `${resumo.descricao} ` +
    `A escalação foi formada com ${partes.join(
      ", "
    )}.`
  );

}


/* =========================================================
   CONSOLIDA UMA ESCALAÇÃO
   ========================================================= */


function consolidarEscalacaoPerfil(
  perfil,
  resultadoFormacao,
  jogadoresDisponiveis,
  limitePatrimonio
) {

  if (
    !resultadoFormacao
  ) {

    return null;

  }


  const formacao =
    resultadoFormacao.formacao;


  /*
   * Garante que titulares sempre sejam um array.
   *
   * Também aceitamos "jogadores" por compatibilidade
   * com estruturas antigas.
   */
  let titulares =
    Array.isArray(
      resultadoFormacao.titulares
    )
      ? resultadoFormacao.titulares
      : Array.isArray(
          resultadoFormacao.jogadores
        )
        ? resultadoFormacao.jogadores
        : [];


  titulares =
    aplicarJustificativasTitularesEscalacao(
      titulares,
      perfil
    );


  let capitao =
    selecionarCapitaoEscalacao(
      titulares,
      perfil
    );


  titulares =
    marcarCapitaoTitularesEscalacao(
      titulares,
      capitao
    );


  /*
   * Reaponta o capitão para a versão correspondente
   * dentro dos titulares já marcados.
   */
  if (
    capitao
  ) {

    const idCapitao =
      obterIdJogadorEscalacao(
        capitao
      );


    const titularCapitao =
      titulares.find(
        jogador =>
          obterIdJogadorEscalacao(
            jogador
          ) ===
          idCapitao
      );


    if (
      titularCapitao
    ) {

      capitao = {

        ...titularCapitao,

        notaCapitao:
          capitao.notaCapitao,

        justificativaCapitao:
          capitao.justificativaCapitao,

        justificativa:
          capitao.justificativaCapitao

      };

    }

  }


  let banco =
    montarBancoEscalacao(
      jogadoresDisponiveis,
      titulares,
      perfil,
      limitePatrimonio
    );


  let reservaLuxo =
    selecionarReservaLuxoEscalacao(
      banco,
      perfil
    );


  banco =
    marcarReservaLuxoBancoEscalacao(
      banco,
      reservaLuxo
    );


  /*
   * Reaponta a Reserva de Luxo para a versão
   * correspondente dentro do banco já marcado.
   */
  if (
    reservaLuxo
  ) {

    const idReservaLuxo =
      obterIdJogadorEscalacao(
        reservaLuxo
      );


    const bancoReservaLuxo =
      banco.find(
        jogador =>
          obterIdJogadorEscalacao(
            jogador
          ) ===
          idReservaLuxo
      );


    if (
      bancoReservaLuxo
    ) {

      reservaLuxo = {

        ...bancoReservaLuxo,

        notaReservaLuxo:
          reservaLuxo.notaReservaLuxo,

        justificativaReservaLuxo:
          reservaLuxo
            .justificativaReservaLuxo,

        justificativa:
          reservaLuxo
            .justificativaReservaLuxo

      };

    }

  }


  const metricas =
    calcularMetricasTitularesEscalacao(
      titulares
    );


  const resumoViabilidade =
    calcularResumoViabilidadeEscalacao(
      titulares
    );


  const resumoAdequacao =
    calcularResumoAdequacaoEscalacao(
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


  const saldo =
    arredondarEscalacao(
      limitePatrimonio -
      custoTotal,
      2
    );


  const justificativa =
    gerarJustificativaEscalacao(
      perfil,
      formacao,
      titulares,
      banco,
      limitePatrimonio
    );


  const resumo =
    gerarResumoPerfilEscalacao(
      perfil,
      formacao,
      titulares,
      banco,
      limitePatrimonio
    );


  return {

    ...perfil,

    perfil:
      obterNomePerfilEscalacao(
        perfil
      ),

    nome:
      obterNomePerfilEscalacao(
        perfil
      ),

    formacao,

    /*
     * Campos equivalentes intencionalmente.
     *
     * Isso corrige o problema em que alguns cards
     * procuravam "jogadores" enquanto o motor
     * entregava "titulares".
     */
    titulares,

    jogadores:
      titulares,

    quantidadeTitulares:
      titulares.length,

    banco,

    quantidadeBanco:
      banco.length,

    capitao,

    reservaLuxo,

    limitePatrimonio:
      arredondarEscalacao(
        limitePatrimonio,
        2
      ),

    patrimonio:
      arredondarEscalacao(
        limitePatrimonio,
        2
      ),

    custoTitulares,

    custoBanco,

    custoTotal,

    custo:
      custoTotal,

    saldo,

    projecao:
      metricas.projecao,

    projecaoTotal:
      metricas.projecao,

    projecaoEstatistica:
      metricas.projecaoEstatistica,

    piso:
      metricas.piso,

    teto:
      metricas.teto,

    confianca:
      metricas.confianca,

    risco:
      metricas.risco,

    regularidade:
      metricas.regularidade,

    titularidade:
      metricas.titularidade,

    adequacao:
      metricas.adequacao,

    notaFormacao:
      resultadoFormacao
        .notaFormacao,

    metricas,

    resumo,

    resumoViabilidade,

    resumoAdequacao,

    justificativa,

    justificativaEscalacao:
      justificativa,

    assinatura:
      obterAssinaturaEscalacao(
        titulares
      )

  };

}


/* =========================================================
   VALIDAÇÃO FINAL DO TIME
   ========================================================= */


function validarEscalacaoFinal(
  escalacao
) {

  if (
    !escalacao
  ) {

    return false;

  }


  const titulares =
    Array.isArray(
      escalacao.titulares
    )
      ? escalacao.titulares
      : Array.isArray(
          escalacao.jogadores
        )
        ? escalacao.jogadores
        : [];


  const formacao =
    escalacao.formacao;


  if (
    !formacaoValidaEscalacao(
      formacao
    )
  ) {

    return false;

  }


  const quantidadeEsperada =
    obterQuantidadeTitularesFormacaoEscalacao(
      formacao
    );


  if (
    titulares.length !==
    quantidadeEsperada
  ) {

    console.warn(
      `Escalação ${escalacao.perfil}: quantidade de titulares inválida.`,
      {
        esperado:
          quantidadeEsperada,
        recebido:
          titulares.length
      }
    );


    return false;

  }


  if (
    !validarQuantidadePosicoesEscalacao(
      titulares,
      formacao
    )
  ) {

    console.warn(
      `Escalação ${escalacao.perfil}: estrutura da formação inválida.`
    );


    return false;

  }


  if (
    !respeitaLimiteClubeEscalacao(
      titulares
    )
  ) {

    console.warn(
      `Escalação ${escalacao.perfil}: limite de jogadores por clube excedido.`
    );


    return false;

  }


  const custoTotal =
    calcularCustoTotalEscalacao(
      titulares,
      escalacao.banco
    );


  const limite =
    numeroEscalacao(
      escalacao.limitePatrimonio,
      PATRIMONIO_PADRAO_ESCALACAO
    );


  if (
    custoTotal >
    limite + 0.001
  ) {

    console.warn(
      `Escalação ${escalacao.perfil}: custo acima do patrimônio.`,
      {
        custoTotal,
        limite
      }
    );


    return false;

  }


  return true;

}


/* =========================================================
   NORMALIZA PERFIS CARREGADOS
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
    Array.isArray(
      dados?.escalacoes
    )
  ) {

    return dados.escalacoes;

  }


  if (
    Array.isArray(
      dados?.perfis
    )
  ) {

    return dados.perfis;

  }


  if (
    Array.isArray(
      dados?.times
    )
  ) {

    return dados.times;

  }


  return [];

}


/* =========================================================
   OBTÉM JOGADORES DISPONÍVEIS
   ========================================================= */


function obterJogadoresDisponiveisEscalacao() {

  /*
   * Preferimos a função pública do módulo
   * de recomendações, quando disponível.
   */

  if (
    typeof obterJogadores ===
      "function"
  ) {

    try {

      const jogadores =
        obterJogadores();


      if (
        Array.isArray(
          jogadores
        ) &&
        jogadores.length > 0
      ) {

        return jogadores;

      }

    } catch (erro) {

      console.warn(
        "Não foi possível obter jogadores por obterJogadores().",
        erro
      );

    }

  }


  /*
   * Compatibilidade com diferentes nomes
   * usados durante a evolução do projeto.
   */

  const candidatosGlobais = [

    globalThis
      ?.jogadores,

    globalThis
      ?.jogadoresCalculados,

    globalThis
      ?.jogadoresRecomendacoes,

    globalThis
      ?.estadoRecomendacoes
      ?.jogadores,

    globalThis
      ?.estadoRecomendacoes
      ?.jogadoresCalculados

  ];


  for (
    const candidatos of
    candidatosGlobais
  ) {

    if (
      Array.isArray(
        candidatos
      ) &&
      candidatos.length > 0
    ) {

      return candidatos;

    }

  }


  return [];

}


/* =========================================================
   MONTA UM PERFIL
   ========================================================= */


function montarEscalacaoPerfil(
  perfil,
  jogadores
) {

  const limitePatrimonio =
    obterLimitePatrimonioEscalacao(
      perfil
    );


  const jogadoresPreparados =
    prepararJogadoresViabilidadeEscalacao(
      jogadores,
      perfil
    );


  if (
    jogadoresPreparados.length === 0
  ) {

    console.warn(
      `Nenhum jogador elegível para o perfil ${obterNomePerfilEscalacao(
        perfil
      )}.`
    );


    return null;

  }


  const resultadoFormacao =
    escolherMelhorFormacaoEscalacao(
      jogadoresPreparados,
      perfil,
      limitePatrimonio
    );


  if (
    !resultadoFormacao
  ) {

    console.warn(
      `Não foi possível montar uma formação viável para ${obterNomePerfilEscalacao(
        perfil
      )} com patrimônio C$ ${limitePatrimonio.toFixed(
        2
      )}.`
    );


    return null;

  }


  const escalacao =
    consolidarEscalacaoPerfil(
      perfil,
      resultadoFormacao,
      jogadoresPreparados,
      limitePatrimonio
    );


  if (
    !validarEscalacaoFinal(
      escalacao
    )
  ) {

    console.warn(
      `Escalação final inválida para ${obterNomePerfilEscalacao(
        perfil
      )}.`
    );


    return null;

  }


  return escalacao;

}

/* =========================================================
   MONTA TODAS AS ESCALAÇÕES
   ========================================================= */


function montarTodasEscalacoes(
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


  const escalacoes = [];


  for (
    const perfil of
    listaPerfis
  ) {

    try {

      const escalacao =
        montarEscalacaoPerfil(
          perfil,
          listaJogadores
        );


      if (
        escalacao
      ) {

        escalacoes.push(
          escalacao
        );

      }

    } catch (erro) {

      console.error(
        `Erro ao montar escalação ${obterNomePerfilEscalacao(
          perfil
        )}:`,
        erro
      );

    }

  }


  return escalacoes;

}


/* =========================================================
   CARREGA PERFIS
   ========================================================= */


async function carregarPerfisEscalacao() {

  try {

    const resposta =
      await fetch(
        `${CAMINHO_ESCALACOES}?v=${Date.now()}`
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
      perfis.length === 0
    ) {

      console.warn(
        "Nenhum perfil de escalação encontrado."
      );

    }


    return perfis;

  } catch (erro) {

    console.error(
      "Erro ao carregar perfis de escalação:",
      erro
    );


    return [];

  }

}


function renderizarEscalacoesCarregadas() {

  /*
   * =====================================================
   * API ATUAL DOS CARDS
   * =====================================================
   *
   * Esta é a API utilizada atualmente pela interface.
   *
   * Importante:
   * CartolaEscalacoesCards.renderizar() lê diretamente
   * o estado já montado por EscalacoesDados.
   *
   * Portanto, não devemos iniciar novo carregamento aqui.
   * Apenas solicitamos a renderização do estado atual.
   */

  if (
    typeof window !== "undefined" &&
    window.CartolaEscalacoesCards &&
    typeof window.CartolaEscalacoesCards.renderizar === "function"
  ) {

    window.CartolaEscalacoesCards.renderizar();

    return true;

  }


  /*
   * =====================================================
   * COMPATIBILIDADE COM VERSÕES ANTERIORES
   * =====================================================
   */

  if (
    typeof EscalacoesCards !== "undefined" &&
    EscalacoesCards &&
    typeof EscalacoesCards.render === "function"
  ) {

    EscalacoesCards.render(
      estadoEscalacoes.escalacoes
    );

    return true;

  }


  if (
    typeof renderizarEscalacoes === "function"
  ) {

    renderizarEscalacoes(
      estadoEscalacoes.escalacoes
    );

    return true;

  }


  if (
    typeof renderEscalacoes === "function"
  ) {

    renderEscalacoes(
      estadoEscalacoes.escalacoes
    );

    return true;

  }


  /*
   * O motor pode terminar antes de cards.js estar
   * disponível. Nesse caso não iniciamos novo
   * carregamento e não criamos recursão.
   *
   * Fazemos somente uma nova tentativa de renderização
   * após o carregamento dos scripts da página.
   */

  if (
    typeof window !== "undefined"
  ) {

    window.setTimeout(
      () => {

        if (
          window.CartolaEscalacoesCards &&
          typeof window.CartolaEscalacoesCards.renderizar === "function"
        ) {

          window.CartolaEscalacoesCards.renderizar();

        }

      },
      0
    );

  }


  return false;

}


/* =========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================= */


async function carregarEscalacoes() {

  /*
   * Impede duas montagens simultâneas.
   *
   * Isso é especialmente importante quando
   * o usuário altera rapidamente o patrimônio.
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


  const inicio =
    typeof performance !==
      "undefined"
      ? performance.now()
      : Date.now();


  try {

    const perfis =
      await carregarPerfisEscalacao();


    const jogadores =
      obterJogadoresDisponiveisEscalacao();


    if (
      jogadores.length === 0
    ) {

      console.warn(
        "Nenhum jogador disponível para montar as escalações."
      );


      estadoEscalacoes.escalacoes =
        [];


      estadoEscalacoes.carregado =
        true;


      renderizarEscalacoesCarregadas();


      return [];

    }


    const escalacoes =
      montarTodasEscalacoes(
        perfis,
        jogadores
      );


    estadoEscalacoes.escalacoes =
      escalacoes;


    estadoEscalacoes.carregado =
      true;


    renderizarEscalacoesCarregadas();


    const fim =
      typeof performance !==
        "undefined"
        ? performance.now()
        : Date.now();


    console.info(
      "Escalações carregadas:",
      {
        perfis:
          perfis.length,

        jogadores:
          jogadores.length,

        escalacoes:
          escalacoes.length,

        patrimonioSelecionado:
          estadoEscalacoes
            .patrimonioSelecionado,

        tempoMs:
          arredondarEscalacao(
            fim -
            inicio,
            1
          )
      }
    );


    return escalacoes;

  } catch (erro) {

    estadoEscalacoes.erro =
      erro;


    estadoEscalacoes.escalacoes =
      [];


    estadoEscalacoes.carregado =
      false;


    console.error(
      "Erro ao carregar escalações:",
      erro
    );


    renderizarEscalacoesCarregadas();


    return [];

  } finally {

    estadoEscalacoes.carregando =
      false;

  }

}


/* =========================================================
   RECARREGAMENTO
   ========================================================= */


async function recarregarEscalacoes() {

  return carregarEscalacoes();

}


/* =========================================================
   GETTERS
   ========================================================= */


function obterEscalacoes() {

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
      obterEscalacoes()

  };

}


function obterEscalacaoPorPerfil(
  perfil
) {

  const procurado =
    normalizarTextoEscalacao(
      perfil
    );


  if (!procurado) {
    return null;
  }


  return (
    obterEscalacoes()
      .find(
        escalacao => {

          const nome =
            normalizarTextoEscalacao(
              escalacao?.perfil ??
              escalacao?.nome
            );


          return (
            nome ===
            procurado
          );

        }
      ) ??
    null
  );

}


/* =========================================================
   PATRIMÔNIO ATUAL
   ========================================================= */


function obterPatrimonioAtualEscalacoes() {

  return (
    obterPatrimonioSelecionadoEscalacoes() ??
    PATRIMONIO_PADRAO_ESCALACAO
  );

}


/* =========================================================
   RESUMO DAS ESCALAÇÕES
   ========================================================= */


function obterResumoEscalacoes() {

  const escalacoes =
    obterEscalacoes();


  return escalacoes.map(
    escalacao => ({

      perfil:
        escalacao.perfil,

      formacao:
        escalacao.formacao,

      quantidadeTitulares:
        Array.isArray(
          escalacao.titulares
        )
          ? escalacao
              .titulares
              .length
          : Array.isArray(
              escalacao.jogadores
            )
            ? escalacao
                .jogadores
                .length
            : 0,

      quantidadeBanco:
        Array.isArray(
          escalacao.banco
        )
          ? escalacao
              .banco
              .length
          : 0,

      patrimonio:
        numeroEscalacao(
          escalacao
            .limitePatrimonio
        ),

      custoTotal:
        numeroEscalacao(
          escalacao
            .custoTotal
        ),

      saldo:
        numeroEscalacao(
          escalacao.saldo
        ),

      projecao:
        numeroEscalacao(
          escalacao.projecao
        ),

      piso:
        numeroEscalacao(
          escalacao.piso
        ),

      teto:
        numeroEscalacao(
          escalacao.teto
        ),

      capitao:
        escalacao.capitao ??
        null,

      reservaLuxo:
        escalacao.reservaLuxo ??
        null

    })
  );

}


/* =========================================================
   DEBUG
   ========================================================= */


function diagnosticarEscalacoes() {

  const escalacoes =
    obterEscalacoes();


  const diagnostico = {

    carregado:
      estadoEscalacoes.carregado,

    carregando:
      estadoEscalacoes.carregando,

    erro:
      estadoEscalacoes.erro,

    patrimonioSelecionado:
      estadoEscalacoes
        .patrimonioSelecionado,

    patrimonioAtual:
      obterPatrimonioAtualEscalacoes(),

    quantidadeEscalacoes:
      escalacoes.length,

    escalacoes:
      escalacoes.map(
        escalacao => {

          const titulares =
            Array.isArray(
              escalacao.titulares
            )
              ? escalacao.titulares
              : Array.isArray(
                  escalacao.jogadores
                )
                ? escalacao.jogadores
                : [];


          return {

            perfil:
              escalacao.perfil,

            formacao:
              escalacao.formacao,

            titulares:
              titulares.length,

            banco:
              Array.isArray(
                escalacao.banco
              )
                ? escalacao
                    .banco
                    .length
                : 0,

            custoTitulares:
              escalacao
                .custoTitulares,

            custoBanco:
              escalacao
                .custoBanco,

            custoTotal:
              escalacao
                .custoTotal,

            limitePatrimonio:
              escalacao
                .limitePatrimonio,

            saldo:
              escalacao.saldo,

            projecao:
              escalacao.projecao,

            capitao:
              escalacao.capitao
                ?.apelido ??
              escalacao.capitao
                ?.nome ??
              null,

            justificativaCapitao:
              escalacao.capitao
                ?.justificativaCapitao ??
              escalacao.capitao
                ?.justificativa ??
              null,

            reservaLuxo:
              escalacao.reservaLuxo
                ?.apelido ??
              escalacao.reservaLuxo
                ?.nome ??
              null,

            justificativaReservaLuxo:
              escalacao.reservaLuxo
                ?.justificativaReservaLuxo ??
              escalacao.reservaLuxo
                ?.justificativa ??
              null

          };

        }
      )

  };


  console.table(
    diagnostico.escalacoes
  );


  console.info(
    "Diagnóstico completo das escalações:",
    diagnostico
  );


  return diagnostico;

}


/* =========================================================
   EVENTO DE ATUALIZAÇÃO
   ========================================================= */


function dispararEventoEscalacoesAtualizadas() {

  if (
    typeof window ===
      "undefined" ||
    typeof CustomEvent ===
      "undefined"
  ) {

    return;

  }


  try {

    window.dispatchEvent(
      new CustomEvent(
        "cartola:escalacoes-atualizadas",
        {
          detail: {
            escalacoes:
              obterEscalacoes(),

            patrimonio:
              obterPatrimonioAtualEscalacoes()
          }
        }
      )
    );

  } catch (erro) {

    console.warn(
      "Não foi possível disparar evento de atualização das escalações.",
      erro
    );

  }

}


/* =========================================================
   ATUALIZA PATRIMÔNIO E DISPARA EVENTO
   ========================================================= */


async function atualizarPatrimonioEscalacoes(
  valor
) {

  const resultado =
    await definirPatrimonioEscalacoes(
      valor
    );


  dispararEventoEscalacoesAtualizadas();


  return resultado;

}


/* =========================================================
   RESTAURA PATRIMÔNIO E DISPARA EVENTO
   ========================================================= */


async function resetarPatrimonioEscalacoes() {

  const resultado =
    await restaurarPatrimonioPadraoEscalacoes();


  dispararEventoEscalacoesAtualizadas();


  return resultado;

}


/* =========================================================
   API PÚBLICA
   ========================================================= */


const EscalacoesDados = {

  carregar:
    carregarEscalacoes,

  recarregar:
    recarregarEscalacoes,

  obter:
    obterEscalacoes,

  obterEstado:
    obterEstadoEscalacoes,

  obterPorPerfil:
    obterEscalacaoPorPerfil,

  obterResumo:
    obterResumoEscalacoes,

  obterPatrimonio:
    obterPatrimonioAtualEscalacoes,

  definirPatrimonio:
    atualizarPatrimonioEscalacoes,

  restaurarPatrimonio:
    resetarPatrimonioEscalacoes,

  diagnosticar:
    diagnosticarEscalacoes

};


/* =========================================================
   COMPATIBILIDADE GLOBAL
   ========================================================= */


if (
  typeof window !==
    "undefined"
) {

  window.EscalacoesDados =
    EscalacoesDados;


  /*
   * Mantemos as funções globais utilizadas
   * pelas versões anteriores da interface.
   */

  window.carregarEscalacoes =
    carregarEscalacoes;


  window.recarregarEscalacoes =
    recarregarEscalacoes;


  window.obterEscalacoes =
    obterEscalacoes;


  window.obterEstadoEscalacoes =
    obterEstadoEscalacoes;


  window.obterEscalacaoPorPerfil =
    obterEscalacaoPorPerfil;


  window.obterPatrimonioAtualEscalacoes =
    obterPatrimonioAtualEscalacoes;


  window.definirPatrimonioEscalacoes =
    atualizarPatrimonioEscalacoes;


  window.restaurarPatrimonioPadraoEscalacoes =
    resetarPatrimonioEscalacoes;


  window.diagnosticarEscalacoes =
    diagnosticarEscalacoes;

}


/* =========================================================
   FIM
   ========================================================= */
