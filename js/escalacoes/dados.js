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
   NOTA POR PERFIL
   ========================================================= */


function obterNotaPerfilJogadorEscalacao(
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


  const risco =
    obterRiscoEscalacao(
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


  const custoBeneficio =
    obterCustoBeneficioEscalacao(
      jogador
    );


  const base =
    obterNotaBaseJogadorEscalacao(
      jogador
    );


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    return (

      base +

      piso * 0.55 +

      confianca * 0.035 +

      regularidade * 0.035 +

      titularidade * 0.035 +

      adequacao * 0.020 +

      custoBeneficio * 1.10 -

      risco * 0.045

    );

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    return (

      base +

      projecao * 0.35 +

      teto * 0.60 +

      adequacao * 0.018 +

      custoBeneficio * 0.45 -

      risco * 0.012

    );

  }


  return (

    base +

    projecao * 0.25 +

    piso * 0.25 +

    teto * 0.28 +

    confianca * 0.020 +

    regularidade * 0.020 +

    titularidade * 0.025 +

    adequacao * 0.020 +

    custoBeneficio * 0.80 -

    risco * 0.025

  );

}


/* =========================================================
   ORDENAÇÃO DE JOGADORES
   ========================================================= */


function compararJogadoresEscalacao(
  jogadorA,
  jogadorB,
  perfil
) {

  const notaA =
    obterNotaPerfilJogadorEscalacao(
      jogadorA,
      perfil
    );


  const notaB =
    obterNotaPerfilJogadorEscalacao(
      jogadorB,
      perfil
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


  return (
    obterPrecoEscalacao(
      jogadorA
    ) -
    obterPrecoEscalacao(
      jogadorB
    )
  );

}


/* =========================================================
   CANDIDATOS POR POSIÇÃO
   ========================================================= */


function obterCandidatosPosicaoEscalacao(
  jogadores,
  posicao,
  perfil = null
) {

  const posicaoNormalizada =
    String(
      posicao ?? ""
    )
      .trim()
      .toUpperCase();


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
        posicaoNormalizada
    )
    .filter(
      jogadorElegivelRodadaEscalacao
    )
    .sort(
      (
        jogadorA,
        jogadorB
      ) =>
        compararJogadoresEscalacao(
          jogadorA,
          jogadorB,
          perfil
        )
    );

}


/* =========================================================
   CAPITÃO
   ========================================================= */


function calcularNotaCapitaoEscalacao(
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


  const teto =
    obterTetoEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaEscalacao(
      jogador
    );


  const risco =
    obterRiscoEscalacao(
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


  return (

    projecao * 1.00 +

    piso * 0.22 +

    teto * 0.20 +

    confianca * 0.025 +

    regularidade * 0.018 +

    titularidade * 0.020 -

    risco * 0.022

  );

}


function escolherCapitaoEscalacao(
  titulares
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
      .slice();


  candidatos.sort(
    (
      jogadorA,
      jogadorB
    ) =>
      calcularNotaCapitaoEscalacao(
        jogadorB
      ) -
      calcularNotaCapitaoEscalacao(
        jogadorA
      )
  );


  return (
    candidatos[0] ??
    null
  );

}


/* =========================================================
   NOTA PARA O BANCO
   ========================================================= */


function obterNotaBancoEscalacao(
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


  const regularidade =
    obterRegularidadeEscalacao(
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

    projecao * 0.70 +

    piso * 0.30 +

    confianca * 0.020 +

    regularidade * 0.020 +

    titularidade * 0.025 +

    custoBeneficio * 1.20 -

    risco * 0.020

  );

}


/* =========================================================
   RESERVA DE LUXO
   ========================================================= */


function escolherReservaLuxoEscalacao(
  banco
) {

  const candidatos =
    (
      Array.isArray(
        banco
      )
        ? banco
        : []
    ).slice();


  candidatos.sort(
    (
      jogadorA,
      jogadorB
    ) => {

      const notaA =
        (
          obterProjecaoFinalEscalacao(
            jogadorA
          ) * 0.55
        ) +
        (
          obterTetoEscalacao(
            jogadorA
          ) * 0.25
        ) +
        (
          obterConfiancaEscalacao(
            jogadorA
          ) * 0.015
        ) +
        (
          obterTitularidadeEscalacao(
            jogadorA
          ) * 0.020
        ) -
        (
          obterRiscoEscalacao(
            jogadorA
          ) * 0.015
        );


      const notaB =
        (
          obterProjecaoFinalEscalacao(
            jogadorB
          ) * 0.55
        ) +
        (
          obterTetoEscalacao(
            jogadorB
          ) * 0.25
        ) +
        (
          obterConfiancaEscalacao(
            jogadorB
          ) * 0.015
        ) +
        (
          obterTitularidadeEscalacao(
            jogadorB
          ) * 0.020
        ) -
        (
          obterRiscoEscalacao(
            jogadorB
          ) * 0.015
        );


      return (
        notaB -
        notaA
      );

    }
  );


  return (
    candidatos[0] ??
    null
  );

}


/* =========================================================
   BANCO — CANDIDATOS
   ========================================================= */


function obterCandidatosBancoEscalacao(
  jogadores,
  titulares,
  posicao
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


  return obterCandidatosPosicaoEscalacao(
    jogadores,
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
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

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

          return (
            notaB -
            notaA
          );

        }


        return (
          obterPrecoEscalacao(
            jogadorA
          ) -
          obterPrecoEscalacao(
            jogadorB
          )
        );

      }
    );

}

/* =========================================================
   BANCO — MONTAGEM
   ========================================================= */


function montarBancoEscalacao(
  jogadores,
  titulares,
  limitePatrimonio,
  custoTitulares
) {

  const banco = [];


  let saldo =
    arredondarEscalacao(
      limitePatrimonio -
      custoTitulares,
      2
    );


  if (
    saldo < 0
  ) {

    return null;

  }


  for (
    const posicao of
    POSICOES_BANCO
  ) {

    const candidatos =
      obterCandidatosBancoEscalacao(
        jogadores,
        titulares,
        posicao
      );


    if (
      candidatos.length === 0
    ) {

      return null;

    }


    /*
     * Primeiro tenta o melhor jogador de banco
     * que caiba no saldo e respeite o limite
     * de jogadores por clube.
     */

    let escolhido = null;


    for (
      const candidato of
      candidatos
    ) {

      const preco =
        obterPrecoEscalacao(
          candidato
        );


      if (
        preco >
        saldo + 0.000001
      ) {

        continue;

      }


      const timeParcial = [
        ...titulares,
        ...banco,
        candidato
      ];


      if (
        !respeitaLimiteClubeEscalacao(
          timeParcial
        )
      ) {

        continue;

      }


      escolhido =
        candidato;

      break;

    }


    /*
     * Se nenhum candidato couber usando a
     * ordenação normal do banco, procura
     * explicitamente pela opção mais barata.
     *
     * Esse fallback é importante porque
     * patrimônio é uma restrição dura.
     */

    if (!escolhido) {

      const candidatosBaratos =
        candidatos
          .slice()
          .sort(
            (
              jogadorA,
              jogadorB
            ) => {

              const precoA =
                obterPrecoEscalacao(
                  jogadorA
                );


              const precoB =
                obterPrecoEscalacao(
                  jogadorB
                );


              if (
                Math.abs(
                  precoA -
                  precoB
                ) >
                0.000001
              ) {

                return (
                  precoA -
                  precoB
                );

              }


              return (
                obterNotaBancoEscalacao(
                  jogadorB
                ) -
                obterNotaBancoEscalacao(
                  jogadorA
                )
              );

            }
          );


      for (
        const candidato of
        candidatosBaratos
      ) {

        const preco =
          obterPrecoEscalacao(
            candidato
          );


        if (
          preco >
          saldo + 0.000001
        ) {

          continue;

        }


        const timeParcial = [
          ...titulares,
          ...banco,
          candidato
        ];


        if (
          !respeitaLimiteClubeEscalacao(
            timeParcial
          )
        ) {

          continue;

        }


        escolhido =
          candidato;

        break;

      }

    }


    if (!escolhido) {

      return null;

    }


    banco.push(
      escolhido
    );


    saldo =
      arredondarEscalacao(
        saldo -
        obterPrecoEscalacao(
          escolhido
        ),
        2
      );

  }


  return banco;

}


/* =========================================================
   CUSTO MÍNIMO ESTIMADO DO BANCO
   ========================================================= */


function calcularCustoMinimoBancoEscalacao(
  jogadores,
  titulares = []
) {

  const listaJogadores =
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
      listaTitulares.map(
        obterIdJogadorEscalacao
      )
    );


  let custoMinimo = 0;


  for (
    const posicao of
    POSICOES_BANCO
  ) {

    const candidatos =
      listaJogadores
        .filter(
          jogador =>
            normalizarPosicaoEscalacao(
              jogador
            ) ===
            posicao
        )
        .filter(
          jogador =>
            jogadorElegivelRodadaEscalacao(
              jogador
            )
        )
        .filter(
          jogador =>
            !idsTitulares.has(
              obterIdJogadorEscalacao(
                jogador
              )
            )
        )
        .slice()
        .sort(
          (
            jogadorA,
            jogadorB
          ) =>
            obterPrecoEscalacao(
              jogadorA
            ) -
            obterPrecoEscalacao(
              jogadorB
            )
        );


    if (
      candidatos.length === 0
    ) {

      return Infinity;

    }


    custoMinimo +=
      obterPrecoEscalacao(
        candidatos[0]
      );

  }


  return arredondarEscalacao(
    custoMinimo,
    2
  );

}


/* =========================================================
   RESERVA DE ORÇAMENTO PARA O BANCO
   ========================================================= */


function calcularOrcamentoMaximoTitularesEscalacao(
  jogadores,
  limitePatrimonio
) {

  const custoMinimoBanco =
    calcularCustoMinimoBancoEscalacao(
      jogadores
    );


  if (
    !Number.isFinite(
      custoMinimoBanco
    )
  ) {

    return null;

  }


  const maximoTitulares =
    arredondarEscalacao(
      limitePatrimonio -
      custoMinimoBanco,
      2
    );


  if (
    maximoTitulares <= 0
  ) {

    return null;

  }


  return {

    custoMinimoBanco,

    maximoTitulares

  };

}


/* =========================================================
   VALIDAÇÃO DE ESTRUTURA
   ========================================================= */


function validarEstruturaFormacaoEscalacao(
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


  const contagem = {};


  jogadores.forEach(
    jogador => {

      const posicao =
        normalizarPosicaoEscalacao(
          jogador
        );


      contagem[posicao] =
        numeroEscalacao(
          contagem[posicao]
        ) + 1;

    }
  );


  return Object.entries(
    estrutura
  ).every(
    (
      [
        posicao,
        quantidade
      ]
    ) =>
      numeroEscalacao(
        contagem[posicao]
      ) ===
      quantidade
  );

}


/* =========================================================
   COMBINAÇÕES
   ========================================================= */


function gerarCombinacoesEscalacao(
  jogadores,
  quantidade,
  limiteResultados = 250
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const quantidadeNecessaria =
    Number(
      quantidade
    );


  if (
    quantidadeNecessaria <= 0
  ) {

    return [
      []
    ];

  }


  if (
    lista.length <
    quantidadeNecessaria
  ) {

    return [];

  }


  const resultados = [];


  function percorrer(
    inicio,
    atual
  ) {

    if (
      resultados.length >=
      limiteResultados
    ) {

      return;

    }


    if (
      atual.length ===
      quantidadeNecessaria
    ) {

      resultados.push(
        atual.slice()
      );

      return;

    }


    const faltam =
      quantidadeNecessaria -
      atual.length;


    for (
      let indice = inicio;
      indice <=
        lista.length -
        faltam;
      indice += 1
    ) {

      atual.push(
        lista[indice]
      );


      percorrer(
        indice + 1,
        atual
      );


      atual.pop();


      if (
        resultados.length >=
        limiteResultados
      ) {

        break;

      }

    }

  }


  percorrer(
    0,
    []
  );


  return resultados;

}


/* =========================================================
   DIVERSIDADE DE CANDIDATOS
   ========================================================= */


function adicionarJogadorUnicoEscalacao(
  destino,
  jogador,
  ids
) {

  if (!jogador) {

    return;

  }


  const id =
    obterIdJogadorEscalacao(
      jogador
    );


  if (!id) {

    return;

  }


  if (
    ids.has(
      id
    )
  ) {

    return;

  }


  ids.add(
    id
  );


  destino.push(
    jogador
  );

}


/*
 * A versão anterior pegava apenas os primeiros
 * jogadores do ranking.
 *
 * Isso produzia bons candidatos individualmente,
 * mas podia eliminar cedo demais jogadores mais
 * baratos necessários para fechar titulares +
 * banco dentro do patrimônio.
 *
 * Agora montamos uma amostra diversificada:
 *
 * - melhores pela nota do perfil;
 * - melhores por projeção;
 * - melhores por custo-benefício;
 * - opções de menor preço.
 *
 * Não existe bônus artificial para jogador barato.
 * Preço continua sendo uma restrição de viabilidade.
 */

function obterPoolDiversificadoPosicaoEscalacao(
  jogadores,
  posicao,
  perfil,
  limite = 12
) {

  const candidatos =
    obterCandidatosPosicaoEscalacao(
      jogadores,
      posicao,
      perfil
    );


  if (
    candidatos.length <=
    limite
  ) {

    return candidatos;

  }


  const resultado = [];

  const ids =
    new Set();


  const quantidadeQualidade =
    Math.max(
      3,
      Math.ceil(
        limite * 0.42
      )
    );


  const quantidadeProjecao =
    Math.max(
      2,
      Math.ceil(
        limite * 0.18
      )
    );


  const quantidadeCustoBeneficio =
    Math.max(
      2,
      Math.ceil(
        limite * 0.22
      )
    );


  const quantidadeBaratos =
    Math.max(
      2,
      limite -
      quantidadeQualidade -
      quantidadeProjecao -
      quantidadeCustoBeneficio
    );


  candidatos
    .slice(
      0,
      quantidadeQualidade
    )
    .forEach(
      jogador =>
        adicionarJogadorUnicoEscalacao(
          resultado,
          jogador,
          ids
        )
    );


  candidatos
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) =>
        obterProjecaoFinalEscalacao(
          jogadorB
        ) -
        obterProjecaoFinalEscalacao(
          jogadorA
        )
    )
    .slice(
      0,
      quantidadeProjecao
    )
    .forEach(
      jogador =>
        adicionarJogadorUnicoEscalacao(
          resultado,
          jogador,
          ids
        )
    );


  candidatos
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

        const cbA =
          obterCustoBeneficioEscalacao(
            jogadorA
          );


        const cbB =
          obterCustoBeneficioEscalacao(
            jogadorB
          );


        if (
          Math.abs(
            cbB -
            cbA
          ) >
          0.000001
        ) {

          return (
            cbB -
            cbA
          );

        }


        return (
          obterPrecoEscalacao(
            jogadorA
          ) -
          obterPrecoEscalacao(
            jogadorB
          )
        );

      }
    )
    .slice(
      0,
      quantidadeCustoBeneficio
    )
    .forEach(
      jogador =>
        adicionarJogadorUnicoEscalacao(
          resultado,
          jogador,
          ids
        )
    );


  candidatos
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

        const precoA =
          obterPrecoEscalacao(
            jogadorA
          );


        const precoB =
          obterPrecoEscalacao(
            jogadorB
          );


        if (
          Math.abs(
            precoA -
            precoB
          ) >
          0.000001
        ) {

          return (
            precoA -
            precoB
          );

        }


        return (
          obterNotaPerfilJogadorEscalacao(
            jogadorB,
            perfil
          ) -
          obterNotaPerfilJogadorEscalacao(
            jogadorA,
            perfil
          )
        );

      }
    )
    .slice(
      0,
      quantidadeBaratos
    )
    .forEach(
      jogador =>
        adicionarJogadorUnicoEscalacao(
          resultado,
          jogador,
          ids
        )
    );


  /*
   * Completa o limite, caso jogadores tenham
   * aparecido em mais de uma categoria.
   */

  for (
    const jogador of
    candidatos
  ) {

    if (
      resultado.length >=
      limite
    ) {

      break;

    }


    adicionarJogadorUnicoEscalacao(
      resultado,
      jogador,
      ids
    );

  }


  return resultado.slice(
    0,
    limite
  );

}


/* =========================================================
   COMBINAÇÕES POR POSIÇÃO
   ========================================================= */


function obterCombinacoesPosicaoEscalacao(
  jogadores,
  posicao,
  quantidade,
  perfil
) {

  if (
    quantidade === 0
  ) {

    return [
      []
    ];

  }


  /*
   * Técnicos precisam de menos candidatos.
   */

  const limitePool =
    posicao ===
      "TEC"
      ? 8
      : 12;


  const candidatos =
    obterPoolDiversificadoPosicaoEscalacao(
      jogadores,
      posicao,
      perfil,
      limitePool
    );


  if (
    candidatos.length <
    quantidade
  ) {

    return [];

  }


  /*
   * Mantemos um teto para evitar explosão
   * combinatória no navegador.
   */

  const limiteCombinacoes =
    quantidade >= 4
      ? 220
      : quantidade === 3
        ? 180
        : quantidade === 2
          ? 120
          : 40;


  const combinacoes =
    gerarCombinacoesEscalacao(
      candidatos,
      quantidade,
      limiteCombinacoes
    );


  /*
   * Ordena as combinações pela qualidade
   * agregada do perfil.
   */

  combinacoes.sort(
    (
      combinacaoA,
      combinacaoB
    ) => {

      const notaA =
        somarCampoEscalacao(
          combinacaoA,
          jogador =>
            obterNotaPerfilJogadorEscalacao(
              jogador,
              perfil
            )
        );


      const notaB =
        somarCampoEscalacao(
          combinacaoB,
          jogador =>
            obterNotaPerfilJogadorEscalacao(
              jogador,
              perfil
            )
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
        calcularCustoJogadoresEscalacao(
          combinacaoA
        ) -
        calcularCustoJogadoresEscalacao(
          combinacaoB
        )
      );

    }
  );


  return combinacoes;

}

/* =========================================================
   MÉTRICAS DA COMBINAÇÃO
   ========================================================= */


function calcularMetricasCombinacaoEscalacao(
  titulares,
  perfil
) {

  const lista =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  return {

    custo:
      calcularCustoJogadoresEscalacao(
        lista
      ),

    nota:
      somarCampoEscalacao(
        lista,
        jogador =>
          obterNotaPerfilJogadorEscalacao(
            jogador,
            perfil
          )
      ),

    projecao:
      somarCampoEscalacao(
        lista,
        obterProjecaoFinalEscalacao
      ),

    piso:
      somarCampoEscalacao(
        lista,
        obterPisoEscalacao
      ),

    teto:
      somarCampoEscalacao(
        lista,
        obterTetoEscalacao
      ),

    confianca:
      calcularMediaEscalacao(
        lista,
        obterConfiancaEscalacao
      ),

    risco:
      calcularMediaEscalacao(
        lista,
        obterRiscoEscalacao
      ),

    titularidade:
      calcularMediaEscalacao(
        lista,
        obterTitularidadeEscalacao
      ),

    adequacao:
      calcularMediaEscalacao(
        lista,
        obterNotaAdequacaoEscalacao
      )

  };

}


/* =========================================================
   COMPARAÇÃO DE COMBINAÇÕES
   ========================================================= */


function compararCombinacoesEscalacao(
  combinacaoA,
  combinacaoB
) {

  const metricasA =
    combinacaoA?.metricas ??
    {};


  const metricasB =
    combinacaoB?.metricas ??
    {};


  const notaA =
    numeroEscalacao(
      metricasA.nota
    );


  const notaB =
    numeroEscalacao(
      metricasB.nota
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
      metricasA.projecao
    );


  const projecaoB =
    numeroEscalacao(
      metricasB.projecao
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


  const custoA =
    numeroEscalacao(
      metricasA.custo
    );


  const custoB =
    numeroEscalacao(
      metricasB.custo
    );


  return (
    custoA -
    custoB
  );

}


/* =========================================================
   SCORE DE CUSTO-BENEFÍCIO DA COMBINAÇÃO
   ========================================================= */


function obterScoreCustoBeneficioCombinacaoEscalacao(
  combinacao
) {

  const custo =
    numeroEscalacao(
      combinacao
        ?.metricas
        ?.custo
    );


  const nota =
    numeroEscalacao(
      combinacao
        ?.metricas
        ?.nota
    );


  if (
    custo <= 0
  ) {

    return nota;

  }


  return (
    nota /
    custo
  );

}


/* =========================================================
   SELEÇÃO DIVERSIFICADA DO BEAM
   ========================================================= */


function selecionarEstadosDiversificadosEscalacao(
  estados,
  limite
) {

  const lista =
    Array.isArray(
      estados
    )
      ? estados
      : [];


  if (
    lista.length <=
    limite
  ) {

    return lista;

  }


  const resultado = [];

  const assinaturas =
    new Set();


  function adicionar(
    estado
  ) {

    const assinatura =
      estado.assinatura ??
      obterAssinaturaEscalacao(
        estado.titulares
      );


    if (
      assinaturas.has(
        assinatura
      )
    ) {

      return;

    }


    assinaturas.add(
      assinatura
    );


    resultado.push(
      estado
    );

  }


  /*
   * 50% melhores por nota.
   */

  const quantidadeQualidade =
    Math.ceil(
      limite * 0.50
    );


  lista
    .slice()
    .sort(
      compararCombinacoesEscalacao
    )
    .slice(
      0,
      quantidadeQualidade
    )
    .forEach(
      adicionar
    );


  /*
   * 25% opções mais econômicas.
   *
   * Isso evita eliminar cedo demais times
   * que permitem banco melhor.
   */

  const quantidadeEconomia =
    Math.ceil(
      limite * 0.25
    );


  lista
    .slice()
    .sort(
      (
        a,
        b
      ) =>
        numeroEscalacao(
          a?.metricas?.custo
        ) -
        numeroEscalacao(
          b?.metricas?.custo
        )
    )
    .slice(
      0,
      quantidadeEconomia
    )
    .forEach(
      adicionar
    );


  /*
   * Restante: custo-benefício.
   */

  lista
    .slice()
    .sort(
      (
        a,
        b
      ) =>
        obterScoreCustoBeneficioCombinacaoEscalacao(
          b
        ) -
        obterScoreCustoBeneficioCombinacaoEscalacao(
          a
        )
    )
    .forEach(
      estado => {

        if (
          resultado.length >=
          limite
        ) {

          return;

        }


        adicionar(
          estado
        );

      }
    );


  return resultado.slice(
    0,
    limite
  );

}


/* =========================================================
   MONTAGEM DOS TITULARES — BEAM SEARCH
   ========================================================= */


function montarTitularesFormacaoEscalacao(
  jogadores,
  perfil,
  formacao,
  limitePatrimonio
) {

  const estrutura =
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ];


  if (!estrutura) {

    return [];

  }


  const reservaOrcamento =
    calcularOrcamentoMaximoTitularesEscalacao(
      jogadores,
      limitePatrimonio
    );


  if (!reservaOrcamento) {

    return [];

  }


  const maximoTitulares =
    reservaOrcamento
      .maximoTitulares;


  const LIMITE_BEAM =
    90;


  let estados = [

    {
      titulares: [],

      metricas:
        calcularMetricasCombinacaoEscalacao(
          [],
          perfil
        ),

      assinatura: ""
    }

  ];


  for (
    const posicao of
    ORDEM_POSICOES_ESCALACAO
  ) {

    const quantidade =
      numeroEscalacao(
        estrutura[posicao]
      );


    if (
      quantidade <= 0
    ) {

      continue;

    }


    const combinacoes =
      obterCombinacoesPosicaoEscalacao(
        jogadores,
        posicao,
        quantidade,
        perfil
      );


    if (
      combinacoes.length === 0
    ) {

      return [];

    }


    const novosEstados = [];


    for (
      const estado of
      estados
    ) {

      for (
        const combinacao of
        combinacoes
      ) {

        const titulares = [
          ...estado.titulares,
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


        /*
         * Reserva mínima do banco já é considerada
         * durante a construção dos titulares.
         */

        if (
          custo >
          maximoTitulares +
          0.000001
        ) {

          continue;

        }


        const metricas =
          calcularMetricasCombinacaoEscalacao(
            titulares,
            perfil
          );


        novosEstados.push({

          titulares,

          metricas,

          assinatura:
            obterAssinaturaEscalacao(
              titulares
            )

        });

      }

    }


    if (
      novosEstados.length === 0
    ) {

      return [];

    }


    estados =
      selecionarEstadosDiversificadosEscalacao(
        novosEstados,
        LIMITE_BEAM
      );

  }


  const finais =
    estados
      .filter(
        estado =>
          validarEstruturaFormacaoEscalacao(
            estado.titulares,
            formacao
          )
      )
      .filter(
        estado => {

          const custoTitulares =
            numeroEscalacao(
              estado
                ?.metricas
                ?.custo
            );


          const custoMinimoBanco =
            calcularCustoMinimoBancoEscalacao(
              jogadores,
              estado.titulares
            );


          return (
            Number.isFinite(
              custoMinimoBanco
            ) &&
            custoTitulares +
            custoMinimoBanco <=
              limitePatrimonio +
              0.000001
          );

        }
      )
      .sort(
        compararCombinacoesEscalacao
      );


  return finais.slice(
    0,
    70
  );

}


/* =========================================================
   BANCO OTIMIZADO
   ========================================================= */


function obterPoolBancoDiversificadoEscalacao(
  jogadores,
  titulares,
  posicao
) {

  const candidatos =
    obterCandidatosBancoEscalacao(
      jogadores,
      titulares,
      posicao
    );


  if (
    candidatos.length <= 10
  ) {

    return candidatos;

  }


  const resultado = [];

  const ids =
    new Set();


  candidatos
    .slice(
      0,
      5
    )
    .forEach(
      jogador =>
        adicionarJogadorUnicoEscalacao(
          resultado,
          jogador,
          ids
        )
    );


  candidatos
    .slice()
    .sort(
      (
        a,
        b
      ) =>
        obterPrecoEscalacao(
          a
        ) -
        obterPrecoEscalacao(
          b
        )
    )
    .slice(
      0,
      5
    )
    .forEach(
      jogador =>
        adicionarJogadorUnicoEscalacao(
          resultado,
          jogador,
          ids
        )
    );


  return resultado;

}


function montarBancoOtimizadoEscalacao(
  jogadores,
  titulares,
  limiteBanco
) {

  let estados = [

    {
      banco: [],
      custo: 0,
      nota: 0
    }

  ];


  const LIMITE_BEAM_BANCO =
    60;


  for (
    const posicao of
    POSICOES_BANCO
  ) {

    const candidatos =
      obterPoolBancoDiversificadoEscalacao(
        jogadores,
        titulares,
        posicao
      );


    if (
      candidatos.length === 0
    ) {

      return null;

    }


    const novosEstados = [];


    for (
      const estado of
      estados
    ) {

      for (
        const jogador of
        candidatos
      ) {

        const novoBanco = [
          ...estado.banco,
          jogador
        ];


        const custo =
          calcularCustoJogadoresEscalacao(
            novoBanco
          );


        if (
          custo >
          limiteBanco +
          0.000001
        ) {

          continue;

        }


        const todos = [
          ...titulares,
          ...novoBanco
        ];


        if (
          !respeitaLimiteClubeEscalacao(
            todos
          )
        ) {

          continue;

        }


        const nota =
          somarCampoEscalacao(
            novoBanco,
            obterNotaBancoEscalacao
          );


        novosEstados.push({

          banco:
            novoBanco,

          custo,

          nota

        });

      }

    }


    if (
      novosEstados.length === 0
    ) {

      return null;

    }


    novosEstados.sort(
      (
        a,
        b
      ) => {

        if (
          Math.abs(
            b.nota -
            a.nota
          ) >
          0.000001
        ) {

          return (
            b.nota -
            a.nota
          );

        }


        return (
          a.custo -
          b.custo
        );

      }
    );


    estados =
      novosEstados.slice(
        0,
        LIMITE_BEAM_BANCO
      );

  }


  return (
    estados[0]?.banco ??
    null
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

  const candidatosTitulares =
    montarTitularesFormacaoEscalacao(
      jogadores,
      perfil,
      formacao,
      limitePatrimonio
    );


  if (
    candidatosTitulares.length === 0
  ) {

    return null;

  }


  const composicoes = [];


  for (
    const candidato of
    candidatosTitulares
  ) {

    const titulares =
      candidato.titulares;


    const custoTitulares =
      calcularCustoJogadoresEscalacao(
        titulares
      );


    const limiteBanco =
      arredondarEscalacao(
        limitePatrimonio -
        custoTitulares,
        2
      );


    if (
      limiteBanco <= 0
    ) {

      continue;

    }


    const banco =
      montarBancoOtimizadoEscalacao(
        jogadores,
        titulares,
        limiteBanco
      );


    if (
      !Array.isArray(
        banco
      ) ||
      banco.length !==
        POSICOES_BANCO.length
    ) {

      continue;

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
      limitePatrimonio +
      0.000001
    ) {

      continue;

    }


    if (
      custoTotal >
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO +
      0.000001
    ) {

      continue;

    }


    const todos = [
      ...titulares,
      ...banco
    ];


    if (
      !respeitaLimiteClubeEscalacao(
        todos
      )
    ) {

      continue;

    }


    const metricas =
      calcularMetricasCombinacaoEscalacao(
        titulares,
        perfil
      );


    const capitao =
      escolherCapitaoEscalacao(
        titulares
      );


    const reservaLuxo =
      escolherReservaLuxoEscalacao(
        banco
      );


    const notaBanco =
      somarCampoEscalacao(
        banco,
        obterNotaBancoEscalacao
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
          limitePatrimonio -
          custoTotal,
          2
        ),

      limitePatrimonio,

      metricas,

      notaBanco

    });

  }


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

  const notaA =
    numeroEscalacao(
      composicaoA
        ?.metricas
        ?.nota
    );


  const notaB =
    numeroEscalacao(
      composicaoB
        ?.metricas
        ?.nota
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
      composicaoA
        ?.metricas
        ?.projecao
    );


  const projecaoB =
    numeroEscalacao(
      composicaoB
        ?.metricas
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


  const bancoA =
    numeroEscalacao(
      composicaoA
        ?.notaBanco
    );


  const bancoB =
    numeroEscalacao(
      composicaoB
        ?.notaBanco
    );


  if (
    Math.abs(
      bancoB -
      bancoA
    ) >
    0.000001
  ) {

    return (
      bancoB -
      bancoA
    );

  }


  return (
    numeroEscalacao(
      composicaoA?.custoTotal
    ) -
    numeroEscalacao(
      composicaoB?.custoTotal
    )
  );

}


/* =========================================================
   NOTA DA FORMAÇÃO
   ========================================================= */


function calcularNotaFormacaoEscalacao(
  composicao
) {

  if (!composicao) {

    return -Infinity;

  }


  const metricas =
    composicao.metricas ??
    {};


  const nota =
    numeroEscalacao(
      metricas.nota
    );


  const projecao =
    numeroEscalacao(
      metricas.projecao
    );


  const titularidade =
    numeroEscalacao(
      metricas.titularidade,
      50
    );


  const adequacao =
    numeroEscalacao(
      metricas.adequacao,
      50
    );


  const risco =
    numeroEscalacao(
      metricas.risco,
      50
    );


  /*
   * Nenhum bônus por formação.
   *
   * 4-4-2, 3-4-3 e 4-3-3 competem
   * pelos mesmos critérios.
   */

  return (

    nota +

    projecao * 0.002 +

    titularidade * 0.001 +

    adequacao * 0.001 -

    risco * 0.0005

  );

}


/* =========================================================
   MELHOR FORMAÇÃO
   ========================================================= */


function escolherMelhorFormacaoEscalacao(
  jogadores,
  perfil,
  limitePatrimonio
) {

  const alternativas = [];


  for (
    const formacao of
    FORMACOES_CANDIDATAS_ESCALACAO
  ) {

    const composicao =
      montarComposicaoCompletaEscalacao(
        jogadores,
        perfil,
        formacao,
        limitePatrimonio
      );


    if (!composicao) {

      continue;

    }


    alternativas.push({

      ...composicao,

      notaFormacao:
        calcularNotaFormacaoEscalacao(
          composicao
        )

    });

  }


  if (
    alternativas.length === 0
  ) {

    return null;

  }


  alternativas.sort(
    (
      a,
      b
    ) => {

      const diferenca =
        numeroEscalacao(
          b.notaFormacao
        ) -
        numeroEscalacao(
          a.notaFormacao
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
        a,
        b
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
   ENRIQUECIMENTO DO JOGADOR
   ========================================================= */


function enriquecerJogadorEscalacao(
  jogador,
  perfil,
  tipo
) {

  if (!jogador) {

    return jogador;

  }


  const projecaoOriginal =
    obterProjecaoEstatisticaEscalacao(
      jogador
    );


  const projecaoFinal =
    obterProjecaoFinalEscalacao(
      jogador
    );


  return {

    ...jogador,

    tipoEscalacao:
      tipo,

    projecaoEstatistica:
      projecaoOriginal,

    projecaoContextualizada:
      projecaoFinal,

    impactoContextual:
      arredondarEscalacao(
        projecaoFinal -
        projecaoOriginal,
        2
      ),

    notaPerfilEscalacao:
      obterNotaPerfilJogadorEscalacao(
        jogador,
        perfil
      ),

    titularidade:
      obterTitularidadeEscalacao(
        jogador
      ),

    notaAdequacaoRodada:
      obterNotaAdequacaoEscalacao(
        jogador
      )

  };

}


/* =========================================================
   RESUMO DE CALIBRAÇÃO
   ========================================================= */


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
      jogador =>
        jogador?.calibracaoAplicada ===
          true ||
        jogador
          ?.calibracaoPosicao
          ?.aplicada ===
          true
    );


  return {

    ativa:
      calibrados.length > 0,

    jogadores:
      lista.length,

    jogadoresCalibrados:
      calibrados.length,

    percentual:
      lista.length > 0
        ? arredondarEscalacao(
            (
              calibrados.length /
              lista.length
            ) * 100,
            1
          )
        : 0

  };

}


/* =========================================================
   JUSTIFICATIVA DO JOGADOR
   ========================================================= */


function gerarJustificativaJogadorEscalacao(
  jogador
) {

  const partes = [];


  partes.push(
    `Projeção ${arredondarEscalacao(
      obterProjecaoFinalEscalacao(
        jogador
      ),
      1
    )} pts.`
  );


  partes.push(
    `Titularidade ${arredondarEscalacao(
      obterTitularidadeEscalacao(
        jogador
      ),
      0
    )}%.`
  );


  const adequacao =
    obterNotaAdequacaoEscalacao(
      jogador
    );


  partes.push(
    `Adequação ${arredondarEscalacao(
      adequacao,
      0
    )}/100.`
  );


  return partes.join(
    " "
  );

}


/* =========================================================
   JUSTIFICATIVA DO PERFIL
   ========================================================= */


function gerarJustificativaEstrategia(
  perfil,
  titulares
) {

  const tipo =
    obterTipoPerfilEscalacao(
      perfil
    );


  const projecao =
    somarCampoEscalacao(
      titulares,
      obterProjecaoFinalEscalacao
    );


  const titularidade =
    calcularMediaEscalacao(
      titulares,
      obterTitularidadeEscalacao
    );


  const adequacao =
    calcularMediaEscalacao(
      titulares,
      obterNotaAdequacaoEscalacao
    );


  let inicio =
    "Estratégia equilibrada entre projeção, segurança e teto.";


  if (
    tipo ===
    "CONSERVADOR"
  ) {

    inicio =
      "Estratégia prioriza segurança, piso, regularidade e confiança.";

  }


  if (
    tipo ===
    "AGRESSIVO"
  ) {

    inicio =
      "Estratégia prioriza teto e potencial de pontuação.";

  }


  return (
    `${inicio} ` +
    `Projeção contextualizada de ${arredondarEscalacao(
      projecao,
      1
    )} pontos. ` +
    `Titularidade média de ${arredondarEscalacao(
      titularidade,
      0
    )}%. ` +
    `Adequação média à rodada de ${arredondarEscalacao(
      adequacao,
      0
    )}/100.`
  );

}

/* =========================================================
   PREPARAÇÃO DO PERFIL
   ========================================================= */


function prepararPerfilEscalacao(
  perfil
) {

  const nome =
    obterNomePerfilEscalacao(
      perfil
    ) ||
    "Equilibrado";


  return {

    ...(perfil ?? {}),

    perfil:
      nome,

    nome:
      nome

  };

}


/* =========================================================
   PREPARAÇÃO DOS JOGADORES
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


  return preparados.map(
    jogador => {

      let notaMotor = null;


      if (
        typeof MotorEscalacao !==
          "undefined" &&
        MotorEscalacao &&
        typeof MotorEscalacao
          .calcularNotaJogador ===
          "function"
      ) {

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

            notaMotor =
              resultado;

          } else if (
            resultado &&
            typeof resultado ===
              "object"
          ) {

            notaMotor =
              numeroEscalacao(
                resultado.nota ??
                resultado.score ??
                resultado.valor,
                NaN
              );

          }

        } catch (erro) {

          console.warn(
            "Falha no MotorEscalacao:",
            jogador?.id,
            erro
          );

        }

      }


      const notaPerfil =
        Number.isFinite(
          notaMotor
        )
          ? notaMotor
          : obterNotaPerfilJogadorEscalacao(
              jogador,
              perfil
            );


      return {

        ...jogador,

        notaPerfil

      };

    }
  );

}


/* =========================================================
   CONSTRUÇÃO DO TIME
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


  const escolha =
    escolherMelhorFormacaoEscalacao(
      jogadores,
      perfil,
      limitePatrimonio
    );


  if (
    !escolha ||
    !escolha.melhor
  ) {

    return null;

  }


  const melhor =
    escolha.melhor;


  const titulares =
    melhor.titulares.map(
      jogador => {

        const enriquecido =
          enriquecerJogadorEscalacao(
            jogador,
            perfil,
            "titular"
          );


        return {

          ...enriquecido,

          justificativa:
            gerarJustificativaJogadorEscalacao(
              enriquecido
            )

        };

      }
    );


  const banco =
    melhor.banco.map(
      jogador => {

        const enriquecido =
          enriquecerJogadorEscalacao(
            jogador,
            perfil,
            "reserva"
          );


        return {

          ...enriquecido,

          justificativa:
            gerarJustificativaJogadorEscalacao(
              enriquecido
            )

        };

      }
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
    titulares[0] ??
    null;


  const idLuxo =
    obterIdJogadorEscalacao(
      melhor.reservaLuxo
    );


  const reservaLuxo =
    banco.find(
      jogador =>
        obterIdJogadorEscalacao(
          jogador
        ) ===
        idLuxo
    ) ??
    banco[0] ??
    null;


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


  const projecao =
    somarCampoEscalacao(
      titulares,
      obterProjecaoFinalEscalacao
    );


  const piso =
    somarCampoEscalacao(
      titulares,
      obterPisoEscalacao
    );


  const teto =
    somarCampoEscalacao(
      titulares,
      obterTetoEscalacao
    );


  const confianca =
    calcularMediaEscalacao(
      titulares,
      obterConfiancaEscalacao
    );


  const risco =
    calcularMediaEscalacao(
      titulares,
      obterRiscoEscalacao
    );


  const titularidadeMedia =
    calcularMediaEscalacao(
      titulares,
      obterTitularidadeEscalacao
    );


  const adequacaoMedia =
    calcularMediaEscalacao(
      titulares,
      obterNotaAdequacaoEscalacao
    );


  return {

    ...(perfilOriginal ?? {}),

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

    custo:
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
        0.000001,

    projecao:
      arredondarEscalacao(
        projecao,
        2
      ),

    projecaoContextualizada:
      arredondarEscalacao(
        projecao,
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

    resumoViabilidade: {

      ativa: true,

      titularidadeMedia:
        arredondarEscalacao(
          titularidadeMedia,
          1
        )

    },

    resumoAdequacao: {

      ativa: true,

      notaMedia:
        arredondarEscalacao(
          adequacaoMedia,
          1
        )

    },

    resumoCalibracao:
      calcularResumoCalibracaoEscalacao(
        titulares
      ),

    alternativasFormacao:
      escolha.alternativas.map(
        alternativa => ({

          formacao:
            alternativa.formacao,

          nota:
            arredondarEscalacao(
              alternativa.notaFormacao,
              3
            ),

          projecao:
            arredondarEscalacao(
              alternativa
                ?.metricas
                ?.projecao,
              2
            ),

          custo:
            arredondarEscalacao(
              alternativa.custoTotal,
              2
            )

        })
      ),

    justificativa:
      gerarJustificativaEstrategia(
        perfil,
        titulares
      )

  };

}


/* =========================================================
   VALIDAÇÃO FINAL
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
    time.titulares.length !==
      12
  ) {

    return false;

  }


  if (
    !Array.isArray(
      time.banco
    ) ||
    time.banco.length !==
      5
  ) {

    return false;

  }


  if (
    !validarEstruturaFormacaoEscalacao(
      time.titulares,
      time.formacao
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


  const custo =
    calcularCustoTotalEscalacao(
      time.titulares,
      time.banco
    );


  return (
    custo <=
      numeroEscalacao(
        time.limitePatrimonio,
        120
      ) +
      0.000001 &&

    custo <=
      LIMITE_PATRIMONIO_MAXIMO_ESCALACAO +
      0.000001
  );

}


/* =========================================================
   GERAÇÃO DOS TRÊS PERFIS
   ========================================================= */


function gerarEscalacoesSugeridas(
  perfis,
  jogadores
) {

  const resultado = [];


  for (
    const perfil of
    (
      Array.isArray(
        perfis
      )
        ? perfis
        : []
    )
  ) {

    try {

      const time =
        construirTimeSugeridoEscalacao(
          perfil,
          jogadores
        );


      if (!time) {

        console.warn(
          "Não foi possível montar escalação para o perfil:",
          perfil?.perfil ??
          perfil?.nome
        );

        continue;

      }


      if (
        !validarTimeSugeridoEscalacao(
          time
        )
      ) {

        console.warn(
          "Escalação reprovada na validação:",
          perfil?.perfil ??
          perfil?.nome
        );

        continue;

      }


      resultado.push(
        time
      );

    } catch (erro) {

      console.error(
        "Erro ao gerar escalação:",
        perfil?.perfil ??
        perfil?.nome,
        erro
      );

    }

  }


  return resultado;

}

/* =========================================================
   PERFIS DO JSON
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
      dados?.estrategias
    )
  ) {

    return dados.estrategias;

  }


  return [];

}


function obterPerfisPadraoEscalacao() {

  return [

    {
      perfil:
        "Conservador",

      nome:
        "Conservador"
    },

    {
      perfil:
        "Equilibrado",

      nome:
        "Equilibrado"
    },

    {
      perfil:
        "Agressivo",

      nome:
        "Agressivo"
    }

  ];

}


async function carregarPerfisEscalacao() {

  try {

    const resposta =
      await fetch(
        CAMINHO_ESCALACOES,
        {
          cache:
            "no-store"
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


    return perfis.length > 0
      ? perfis
      : obterPerfisPadraoEscalacao();

  } catch (erro) {

    console.warn(
      "Falha ao carregar perfis. Usando padrão.",
      erro
    );


    return obterPerfisPadraoEscalacao();

  }

}


/* =========================================================
   JOGADORES DISPONÍVEIS
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
    typeof EscalacoesCards.renderizar ===
    "function"
  ) {

    EscalacoesCards.renderizar(
      escalacoes
    );

    return;

  }


  if (
    typeof EscalacoesCards.renderTimes ===
    "function"
  ) {

    EscalacoesCards.renderTimes(
      escalacoes
    );

  }

}


/* =========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================= */


async function carregarEscalacoes() {

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

      throw new Error(
        "Nenhum jogador disponível."
      );

    }


    /*
     * Permite um frame do navegador antes
     * do cálculo das escalações.
     */

    await new Promise(
      resolver => {

        if (
          typeof requestAnimationFrame ===
          "function"
        ) {

          requestAnimationFrame(
            resolver
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


    estadoEscalacoes
      .escalacoes =
        escalacoes;


    estadoEscalacoes
      .carregado =
        true;


    if (
      typeof window !==
      "undefined"
    ) {

      window.escalacoes =
        escalacoes;

    }


    renderizarEscalacoesCarregadas(
      escalacoes
    );


    const fim =
      typeof performance !==
        "undefined"
        ? performance.now()
        : Date.now();


    console.info(
      `Escalações montadas em ${Math.round(
        fim -
        inicio
      )} ms`,
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
      "Erro ao carregar escalações:",
      erro
    );


    return [];

  } finally {

    estadoEscalacoes.carregando =
      false;

  }

}


/* =========================================================
   CONSULTAS
   ========================================================= */


function obterEscalacoesCarregadas() {

  return (
    Array.isArray(
      estadoEscalacoes.escalacoes
    )
      ? estadoEscalacoes.escalacoes
      : []
  );

}


function obterEscalacoes() {

  return obterEscalacoesCarregadas();

}


function obterTimesSugeridos() {

  return obterEscalacoesCarregadas();

}


function obterEscalacaoPorPerfil(
  perfil
) {

  const nome =
    normalizarTextoEscalacao(
      perfil
    );


  return (
    obterEscalacoesCarregadas()
      .find(
        time =>
          normalizarTextoEscalacao(
            time?.perfil ??
            time?.nome
          ) ===
          nome
      ) ??
    null
  );

}


function obterTimeSugerido(
  perfil
) {

  return obterEscalacaoPorPerfil(
    perfil
  );

}


/* =========================================================
   RECÁLCULO
   ========================================================= */


async function recalcularEscalacoes() {

  return carregarEscalacoes();

}


async function atualizarEscalacoes() {

  return carregarEscalacoes();

}


/* =========================================================
   DIAGNÓSTICO
   ========================================================= */


function obterDiagnosticoEscalacoes() {

  return {

    carregado:
      estadoEscalacoes.carregado,

    carregando:
      estadoEscalacoes.carregando,

    erro:
      estadoEscalacoes.erro
        ? String(
            estadoEscalacoes
              .erro.message ??
            estadoEscalacoes.erro
          )
        : null,

    patrimonioSelecionado:
      estadoEscalacoes
        .patrimonioSelecionado,

    limitePatrimonio:
      obterLimitePatrimonioEscalacao(),

    escalacoes:
      obterEscalacoesCarregadas()
        .map(
          time => ({

            perfil:
              time.perfil,

            formacao:
              time.formacao,

            custo:
              time.custoTotal,

            saldo:
              time.saldo,

            projecao:
              time.projecao,

            titulares:
              time.titulares
                ?.length ??
              0,

            banco:
              time.banco
                ?.length ??
              0,

            valido:
              validarTimeSugeridoEscalacao(
                time
              )

          })
        )

  };

}


function diagnosticarEscalacoesConsole() {

  const diagnostico =
    obterDiagnosticoEscalacoes();


  console.table(
    diagnostico.escalacoes
  );


  return diagnostico;

}


/* =========================================================
   API PÚBLICA
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

  obterPorPerfil:
    obterEscalacaoPorPerfil,

  definirPatrimonio:
    definirPatrimonioEscalacoes,

  restaurarPatrimonio:
    restaurarPatrimonioPadraoEscalacoes,

  obterPatrimonio:
    obterPatrimonioSelecionadoEscalacoes,

  diagnosticar:
    obterDiagnosticoEscalacoes

};


if (
  typeof window !==
  "undefined"
) {

  window.CartolaEscalacoes =
    CartolaEscalacoes;


  window.carregarEscalacoes =
    carregarEscalacoes;


  window.recalcularEscalacoes =
    recalcularEscalacoes;


  window.atualizarEscalacoes =
    atualizarEscalacoes;


  window.obterEscalacoes =
    obterEscalacoes;


  window.obterEscalacoesCarregadas =
    obterEscalacoesCarregadas;


  window.obterTimesSugeridos =
    obterTimesSugeridos;


  window.obterEscalacaoPorPerfil =
    obterEscalacaoPorPerfil;


  window.obterTimeSugerido =
    obterTimeSugerido;


  window.definirPatrimonioEscalacoes =
    definirPatrimonioEscalacoes;


  window.restaurarPatrimonioPadraoEscalacoes =
    restaurarPatrimonioPadraoEscalacoes;


  window.diagnosticarEscalacoesConsole =
    diagnosticarEscalacoesConsole;

}


/* =========================================================
   FIM DO ARQUIVO
   ========================================================= */
