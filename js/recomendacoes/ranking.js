/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — filtros, ranking, viabilidade,
   adequação à rodada e destaques
   =========================================================

   Fluxo do ranking:

   1. disponibilidade / elegibilidade;
   2. segurança de titularidade;
   3. projeção contextualizada;
   4. adequação específica à rodada;
   5. viabilidade operacional;
   6. nota estatística;
   7. confiança;
   8. risco.

   IMPORTANTE

   MotorViabilidade já incorpora:

   - titularidade;
   - risco de utilização;
   - disponibilidade;
   - MotorAdequacaoRodada;
   - projeção contextualizada.

   Portanto, este arquivo NÃO recalcula novamente
   os mesmos pesos. Ele apenas consome os resultados
   produzidos pelos motores.

   ========================================================= */


/* =========================================================
   1. CONFIGURAÇÃO DAS POSIÇÕES
   ========================================================= */


const POSICOES_RECOMENDADAS = [

  {
    id: "GOL",
    nome: "Goleiros",
    singular: "Goleiro",
    quantidade: 3
  },

  {
    id: "LAT",
    nome: "Laterais",
    singular: "Lateral",
    quantidade: 5
  },

  {
    id: "ZAG",
    nome: "Zagueiros",
    singular: "Zagueiro",
    quantidade: 5
  },

  {
    id: "MEI",
    nome: "Meias",
    singular: "Meia",
    quantidade: 5
  },

  {
    id: "ATA",
    nome: "Atacantes",
    singular: "Atacante",
    quantidade: 5
  },

  {
    id: "TEC",
    nome: "Treinadores",
    singular: "Treinador",
    quantidade: 3
  }

];


/* =========================================================
   2. CRIAÇÃO DOS FILTROS
   ========================================================= */


function criarFiltrosPosicao() {

  const container =
    document.getElementById(
      "positionFilters"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  POSICOES_RECOMENDADAS.forEach(
    (posicao) => {

      const botao =
        document.createElement(
          "button"
        );


      botao.type =
        "button";


      botao.className =
        "position-filter-button";


      botao.dataset.position =
        posicao.id;


      botao.textContent =
        `${posicao.nome} ` +
        `(${posicao.quantidade})`;


      const posicaoAtiva =
        obterPosicaoAtiva();


      if (
        posicao.id ===
        posicaoAtiva
      ) {

        botao.classList.add(
          "active"
        );

      }


      botao.addEventListener(
        "click",
        () => {

          alterarPosicaoAtiva(
            posicao.id
          );

        }
      );


      container.appendChild(
        botao
      );

    }
  );

}


/* =========================================================
   3. ALTERAÇÃO DA POSIÇÃO ATIVA
   ========================================================= */


function alterarPosicaoAtiva(
  codigoPosicao
) {

  const posicaoExiste =
    POSICOES_RECOMENDADAS.some(
      (posicao) =>
        posicao.id ===
        codigoPosicao
    );


  if (!posicaoExiste) {

    console.warn(
      "Posição inválida:",
      codigoPosicao
    );


    return;

  }


  definirPosicaoAtiva(
    codigoPosicao
  );


  atualizarFiltroAtivo(
    codigoPosicao
  );


  if (
    typeof exibirJogadoresDaPosicao ===
    "function"
  ) {

    exibirJogadoresDaPosicao();

  }

}


/* =========================================================
   4. DESTAQUE VISUAL DO FILTRO
   ========================================================= */


function atualizarFiltroAtivo(
  codigoPosicao
) {

  const botoes =
    document.querySelectorAll(
      ".position-filter-button"
    );


  botoes.forEach(
    (botao) => {

      const ativo =
        botao.dataset.position ===
        codigoPosicao;


      botao.classList.toggle(
        "active",
        ativo
      );


      botao.setAttribute(
        "aria-pressed",
        String(
          ativo
        )
      );

    }
  );

}


/* =========================================================
   5. CONFIGURAÇÃO DE UMA POSIÇÃO
   ========================================================= */


function obterConfiguracaoPosicao(
  codigoPosicao
) {

  return (
    POSICOES_RECOMENDADAS.find(
      (posicao) =>
        posicao.id ===
        codigoPosicao
    ) ||
    null
  );

}


/* =========================================================
   6. JOGADORES DE UMA POSIÇÃO
   =========================================================

   A seleção ocorre em duas etapas:

   1. remover jogadores considerados realmente inviáveis;
   2. ordenar os restantes pela qualidade contextual.

   Há uma proteção importante:

   se não existirem jogadores viáveis suficientes para
   preencher o ranking visual, o sistema mantém candidatos
   adicionais, mas eles permanecem penalizados na ordenação.

   Isso evita uma aba vazia sem permitir que um atleta
   arriscado apareça artificialmente no topo.
   ========================================================= */


function obterJogadoresDaPosicao(
  codigoPosicao
) {

  const jogadores =
    obterJogadoresCarregados();


  const configuracao =
    obterConfiguracaoPosicao(
      codigoPosicao
    );


  const limite =
    configuracao?.quantidade ||
    5;


  const jogadoresPosicao =
    jogadores.filter(
      (jogador) =>
        jogador.posicao ===
        codigoPosicao
    );


  const jogadoresViaveis =
    jogadoresPosicao.filter(
      (jogador) =>
        jogadorEhViavelParaRanking(
          jogador
        )
    );


  const baseRanking =
    jogadoresViaveis.length >=
    limite
      ? jogadoresViaveis
      : jogadoresPosicao;


  return baseRanking
    .slice()
    .sort(
      compararJogadoresRanking
    )
    .slice(
      0,
      limite
    );

}


/* =========================================================
   7. LEITURA DO MOTOR DE VIABILIDADE
   ========================================================= */


function obterViabilidadeRanking(
  jogador
) {

  if (!jogador) {

    return criarViabilidadeNeutraRanking();

  }


  /*
   * Preferência 1
   *
   * MotorViabilidade é a fonte oficial.
   */

  if (
    typeof MotorViabilidade !==
      "undefined" &&
    MotorViabilidade &&
    typeof MotorViabilidade.calcular ===
      "function"
  ) {

    try {

      const resultado =
        MotorViabilidade.calcular(
          jogador
        );


      if (
        resultado &&
        typeof resultado ===
          "object"
      ) {

        return normalizarViabilidadeRanking(
          resultado,
          jogador
        );

      }

    } catch (erro) {

      console.warn(
        "Falha no MotorViabilidade:",
        jogador?.id,
        erro
      );

    }

  }


  /*
   * Preferência 2
   *
   * Resultado previamente anexado ao jogador.
   */

  const resultadoExistente =
    jogador.viabilidade ||
    jogador.analiseViabilidade ||
    jogador.statusViabilidade;


  if (
    resultadoExistente &&
    typeof resultadoExistente ===
      "object"
  ) {

    return normalizarViabilidadeRanking(
      resultadoExistente,
      jogador
    );

  }


  /*
   * Preferência 3
   *
   * Fallback defensivo.
   */

  return calcularViabilidadeFallback(
    jogador
  );

}


/* =========================================================
   8. OBJETO NEUTRO
   ========================================================= */


function criarViabilidadeNeutraRanking() {

  return {

    disponivel:
      true,

    elegivel:
      true,

    viavel:
      true,

    bloqueado:
      false,

    titularProvavel:
      false,

    titularidade:
      50,

    riscoEscalacao:
      50,

    fatorDisponibilidade:
      1,

    projecaoOriginal:
      0,

    projecaoContextualizada:
      0,

    impactoContextual:
      0,

    classificacao:
      "MEDIA",

    notaViabilidade:
      50,

    adequacaoRodada:
      criarAdequacaoNeutraRanking(),

    notaAdequacao:
      null,

    classificacaoAdequacao:
      "SEM_DADOS",

    coberturaAdequacao:
      0,

    fatorAdequacao:
      1,

    motivos: [],

    alertas: [],

    justificativa:
      ""

  };

}


/* =========================================================
   9. ADEQUAÇÃO NEUTRA
   ========================================================= */


function criarAdequacaoNeutraRanking() {

  return {

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
      true,

    componentes:
      {},

    pesos:
      {},

    pontosFortes: [],

    alertas: [],

    principalMotivo:
      null,

    justificativa:
      ""

  };

}


/* =========================================================
   10. NORMALIZAÇÃO DA VIABILIDADE
   ========================================================= */


function normalizarViabilidadeRanking(
  resultado,
  jogador
) {

  const adequacao =
    normalizarAdequacaoRanking(
      resultado.adequacaoRodada ??
      jogador?.adequacaoRodada
    );


  const titularidade =
    primeiroNumeroValido([

      resultado.titularidade,

      jogador?.titularidade,

      jogador?.probabilidadeTitular,

      jogador?.chanceTitularidade

    ]);


  const riscoEscalacao =
    primeiroNumeroValido([

      resultado.riscoEscalacao,

      jogador?.riscoEscalacao

    ]);


  const fatorDisponibilidade =
    primeiroNumeroValido([

      resultado.fatorDisponibilidade,

      jogador?.fatorDisponibilidade

    ]);


  const projecaoOriginal =
    primeiroNumeroValido([

      resultado.projecaoOriginal,

      jogador?.projecaoOriginal,

      jogador?.projecaoCalibrada,

      jogador?.projecao

    ]);


  const projecaoContextualizada =
    primeiroNumeroValido([

      resultado.projecaoAjustada,

      resultado.projecaoViabilidade,

      jogador?.projecaoViabilidade

    ]);


  const fatorAdequacao =
    primeiroNumeroValido([

      resultado.fatorAdequacao,

      jogador?.fatorAdequacaoRodada,

      adequacao.fatorRanking

    ]);


  const notaAdequacao =
    primeiroNumeroValido([

      resultado.notaAdequacaoRodada,

      jogador?.notaAdequacaoRodada,

      adequacao.nota

    ]);


  const coberturaAdequacao =
    primeiroNumeroValido([

      resultado.coberturaAdequacaoRodada,

      jogador?.coberturaAdequacaoRodada,

      adequacao.cobertura

    ]);


  const elegivel =
    primeiroBooleanoValido([

      resultado.elegivel,

      jogador?.elegivelRodada,

      adequacao.elegivel

    ]);


  const bloqueado =
    primeiroBooleanoValido([

      resultado.bloqueado,

      jogador?.bloqueadoRodada

    ]);


  const classificacao =
    String(
      resultado.classificacao ??
      jogador?.classificacaoViabilidade ??
      "MEDIA"
    )
      .trim()
      .toUpperCase();


  const titularidadeFinal =
    limitarValor(
      titularidade !== null
        ? titularidade
        : 50,
      0,
      100
    );


  const riscoFinal =
    limitarValor(
      riscoEscalacao !== null
        ? riscoEscalacao
        : (
            100 -
            titularidadeFinal
          ),
      0,
      100
    );


  const projecaoBase =
    projecaoOriginal !== null
      ? projecaoOriginal
      : obterProjecaoEstatisticaRanking(
          jogador
        );


  const projecaoFinal =
    projecaoContextualizada !== null
      ? projecaoContextualizada
      : projecaoBase;


  const bloqueadoFinal =
    bloqueado === true ||
    classificacao ===
      "BLOQUEADO" ||
    classificacao ===
      "EVITAR";


  const elegivelFinal =
    elegivel !== false &&
    !bloqueadoFinal;


  const notaViabilidade =
    calcularNotaViabilidadeNormalizada(
      titularidadeFinal,
      riscoFinal,
      classificacao
    );


  const motivos =
    normalizarListaMotivos(
      resultado.motivos ??
      jogador?.motivosViabilidade
    );


  const alertas =
    normalizarListaMotivos(
      resultado.alertas ??
      jogador?.alertasViabilidade
    );


  return {

    disponivel:
      !bloqueadoFinal,

    elegivel:
      elegivelFinal,

    viavel:
      elegivelFinal,

    bloqueado:
      bloqueadoFinal,

    titularProvavel:
      titularidadeFinal >= 70,

    titularidade:
      titularidadeFinal,

    riscoEscalacao:
      riscoFinal,

    fatorDisponibilidade:
      fatorDisponibilidade !== null
        ? limitarValor(
            fatorDisponibilidade,
            0,
            1
          )
        : 1,

    projecaoOriginal:
      numeroSeguro(
        projecaoBase
      ),

    projecaoContextualizada:
      numeroSeguro(
        projecaoFinal
      ),

    impactoContextual:
      numeroSeguro(
        projecaoFinal
      ) -
      numeroSeguro(
        projecaoBase
      ),

    classificacao,

    notaViabilidade,

    adequacaoRodada:
      adequacao,

    notaAdequacao:
      notaAdequacao !== null
        ? limitarValor(
            notaAdequacao,
            0,
            100
          )
        : null,

    classificacaoAdequacao:
      String(
        resultado
          .classificacaoAdequacaoRodada ??
        jogador
          ?.classificacaoAdequacaoRodada ??
        adequacao.classificacao ??
        "SEM_DADOS"
      )
        .trim()
        .toUpperCase(),

    coberturaAdequacao:
      coberturaAdequacao !== null
        ? limitarValor(
            coberturaAdequacao,
            0,
            100
          )
        : 0,

    fatorAdequacao:
      fatorAdequacao !== null
        ? limitarValor(
            fatorAdequacao,
            0.75,
            1.25
          )
        : 1,

    motivos,

    alertas,

    justificativa:
      String(
        resultado.justificativa ??
        jogador?.justificativaViabilidade ??
        ""
      )

  };

}


/* =========================================================
   11. NORMALIZAÇÃO DA ADEQUAÇÃO
   ========================================================= */


function normalizarAdequacaoRanking(
  resultado
) {

  if (
    !resultado ||
    typeof resultado !==
      "object"
  ) {

    return criarAdequacaoNeutraRanking();

  }


  const nota =
    primeiroNumeroValido([
      resultado.nota,
      resultado.notaAdequacao
    ]);


  const cobertura =
    primeiroNumeroValido([
      resultado.cobertura,
      resultado.coberturaDados
    ]);


  const fatorRanking =
    primeiroNumeroValido([
      resultado.fatorRanking,
      resultado.fatorAdequacao
    ]);


  return {

    disponivel:
      true,

    nota:
      nota !== null
        ? limitarValor(
            nota,
            0,
            100
          )
        : null,

    classificacao:
      String(
        resultado.classificacao ??
        "SEM_DADOS"
      )
        .trim()
        .toUpperCase(),

    cobertura:
      cobertura !== null
        ? limitarValor(
            cobertura,
            0,
            100
          )
        : 0,

    fatorRanking:
      fatorRanking !== null
        ? limitarValor(
            fatorRanking,
            0.75,
            1.25
          )
        : 1,

    elegivel:
      resultado.elegivel !==
      false,

    componentes:
      (
        resultado.componentes &&
        typeof resultado.componentes ===
          "object"
      )
        ? resultado.componentes
        : {},

    pesos:
      (
        resultado.pesos &&
        typeof resultado.pesos ===
          "object"
      )
        ? resultado.pesos
        : {},

    pontosFortes:
      normalizarListaMotivos(
        resultado.pontosFortes
      ),

    alertas:
      normalizarListaMotivos(
        resultado.alertas
      ),

    principalMotivo:
      (
        resultado.principalMotivo &&
        typeof resultado.principalMotivo ===
          "object"
      )
        ? resultado.principalMotivo
        : null,

    justificativa:
      String(
        resultado.justificativa ??
        ""
      )

  };

}


/* =========================================================
   12. NOTA NORMALIZADA DE VIABILIDADE
   ========================================================= */


function calcularNotaViabilidadeNormalizada(
  titularidade,
  risco,
  classificacao
) {

  /*
   * Titularidade e risco são praticamente duas faces
   * da mesma informação.
   *
   * Por isso não damos pesos independentes excessivos.
   */

  let nota =
    (
      titularidade * 0.70
    ) +
    (
      (
        100 -
        risco
      ) * 0.30
    );


  switch (
    String(
      classificacao ??
      ""
    ).toUpperCase()
  ) {

    case "MUITO_ALTA":
      nota += 5;
      break;

    case "ALTA":
      nota += 2;
      break;

    case "BAIXA":
      nota -= 8;
      break;

    case "EVITAR":
      nota -= 35;
      break;

    case "BLOQUEADO":
      nota = 0;
      break;

  }


  return limitarValor(
    nota,
    0,
    100
  );

}


/* =========================================================
   13. VIABILIDADE FALLBACK
   ========================================================= */


function calcularViabilidadeFallback(
  jogador
) {

  let titularidade = 50;


  const statusId =
    Number(
      jogador?.statusId
    );


  const titularidadeInformada =
    primeiroNumeroValido([

      jogador?.titularidade,

      jogador?.probabilidadeTitular,

      jogador?.chanceTitularidade

    ]);


  if (
    titularidadeInformada !==
    null
  ) {

    titularidade =
      titularidadeInformada <= 1
        ? titularidadeInformada * 100
        : titularidadeInformada;

  } else if (
    statusId === 7
  ) {

    titularidade = 75;

  }


  titularidade =
    limitarValor(
      titularidade,
      0,
      100
    );


  const risco =
    limitarValor(
      primeiroNumeroValido([
        jogador?.riscoEscalacao,
        jogador?.riscoNegativar
      ]) ??
      (
        100 -
        titularidade
      ),
      0,
      100
    );


  const titularProvavel =
    titularidade >= 70 ||
    statusId === 7;


  const bloqueado =
    [
      3,
      5,
      6
    ].includes(
      statusId
    );


  const projecao =
    obterProjecaoEstatisticaRanking(
      jogador
    );


  return {

    disponivel:
      !bloqueado,

    elegivel:
      !bloqueado,

    viavel:
      !bloqueado,

    bloqueado,

    titularProvavel,

    titularidade,

    riscoEscalacao:
      risco,

    fatorDisponibilidade:
      titularidade /
      100,

    projecaoOriginal:
      projecao,

    projecaoContextualizada:
      projecao,

    impactoContextual:
      0,

    classificacao:
      bloqueado
        ? "BLOQUEADO"
        : titularidade >= 75
          ? "ALTA"
          : titularidade >= 55
            ? "MEDIA"
            : "BAIXA",

    notaViabilidade:
      calcularNotaViabilidadeNormalizada(
        titularidade,
        risco,
        bloqueado
          ? "BLOQUEADO"
          : "MEDIA"
      ),

    adequacaoRodada:
      criarAdequacaoNeutraRanking(),

    notaAdequacao:
      null,

    classificacaoAdequacao:
      "SEM_DADOS",

    coberturaAdequacao:
      0,

    fatorAdequacao:
      1,

    motivos:
      titularProvavel
        ? [
            "Boa indicação de titularidade."
          ]
        : [],

    alertas:
      bloqueado
        ? [
            "Jogador indisponível."
          ]
        : [],

    justificativa:
      ""

  };

}


/* =========================================================
   14. JOGADOR VIÁVEL PARA O RANKING
   ========================================================= */


function jogadorEhViavelParaRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  if (
    viabilidade.bloqueado ===
    true
  ) {

    return false;

  }


  if (
    viabilidade.disponivel ===
    false
  ) {

    return false;

  }


  if (
    viabilidade.elegivel ===
    false
  ) {

    return false;

  }


  if (
    viabilidade.viavel ===
    false
  ) {

    return false;

  }


  return true;

}

/* =========================================================
   15. PROJEÇÃO ESTATÍSTICA
   ========================================================= */


function obterProjecaoEstatisticaRanking(
  jogador
) {

  if (!jogador) {
    return 0;
  }


  const possibilidades = [

    jogador?.projecaoCalibrada,

    jogador?.projecao,

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


/* =========================================================
   16. PROJEÇÃO CONTEXTUALIZADA
   ========================================================= */


function obterProjecaoContextualizadaRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  const contextualizada =
    Number(
      viabilidade
        .projecaoContextualizada
    );


  if (
    Number.isFinite(
      contextualizada
    )
  ) {

    return contextualizada;

  }


  const direta =
    Number(
      jogador?.projecaoViabilidade
    );


  if (
    Number.isFinite(
      direta
    )
  ) {

    return direta;

  }


  return obterProjecaoEstatisticaRanking(
    jogador
  );

}


/* =========================================================
   17. PROJEÇÃO UTILIZADA PELO RANKING
   ========================================================= */


function obterProjecaoRanking(
  jogador
) {

  /*
   * A partir desta versão, a projeção principal do ranking
   * é a contextualizada.
   *
   * Ela já incorpora:
   *
   * - projeção estatística;
   * - disponibilidade;
   * - titularidade;
   * - adequação à rodada.
   *
   * Não multiplicamos novamente por esses fatores aqui.
   */

  return obterProjecaoContextualizadaRanking(
    jogador
  );

}


/* =========================================================
   18. IMPACTO CONTEXTUAL
   ========================================================= */


function obterImpactoContextualRanking(
  jogador
) {

  const estatistica =
    obterProjecaoEstatisticaRanking(
      jogador
    );


  const contextualizada =
    obterProjecaoContextualizadaRanking(
      jogador
    );


  return (
    contextualizada -
    estatistica
  );

}


/* =========================================================
   19. NOTA DE ADEQUAÇÃO À RODADA
   ========================================================= */


function obterNotaAdequacaoRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  if (
    viabilidade.notaAdequacao ===
      null ||
    viabilidade.notaAdequacao ===
      undefined
  ) {

    return 50;

  }


  return limitarValor(
    viabilidade.notaAdequacao,
    0,
    100
  );

}


/* =========================================================
   20. COBERTURA DA ADEQUAÇÃO
   ========================================================= */


function obterCoberturaAdequacaoRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  return limitarValor(
    viabilidade.coberturaAdequacao,
    0,
    100
  );

}


/* =========================================================
   21. NOTA DE VIABILIDADE PARA ORDENAÇÃO
   ========================================================= */


function obterNotaViabilidadeRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  let nota =
    numeroSeguro(
      viabilidade.notaViabilidade
    );


  /*
   * Segurança extra:
   * jogadores bloqueados nunca devem competir
   * normalmente no ranking.
   */

  if (
    viabilidade.bloqueado ===
    true
  ) {

    nota -= 100;

  }


  if (
    viabilidade.elegivel ===
    false
  ) {

    nota -= 100;

  }


  return nota;

}


/* =========================================================
   22. CLASSIFICAÇÃO NUMÉRICA DA ADEQUAÇÃO
   ========================================================= */


function obterPesoClassificacaoAdequacaoRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  const classificacao =
    String(
      viabilidade
        .classificacaoAdequacao ??
      ""
    )
      .trim()
      .toUpperCase();


  switch (
    classificacao
  ) {

    case "MUITO_ALTA":
      return 5;

    case "ALTA":
      return 3;

    case "MEDIA":
      return 0;

    case "BAIXA":
      return -3;

    case "MUITO_BAIXA":
      return -5;

    case "EVITAR":
      return -8;

    default:
      return 0;

  }

}


/* =========================================================
   23. NOTA CONTEXTUAL DO RANKING
   ========================================================= */


function obterNotaContextualRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  const projecao =
    obterProjecaoContextualizadaRanking(
      jogador
    );


  const notaAdequacao =
    obterNotaAdequacaoRanking(
      jogador
    );


  const cobertura =
    obterCoberturaAdequacaoRanking(
      jogador
    );


  const notaViabilidade =
    obterNotaViabilidadeRanking(
      jogador
    );


  /*
   * Projeção continua sendo o principal sinal.
   *
   * Adequação entra como critério complementar.
   *
   * Quanto menor a cobertura contextual,
   * menor o peso da nota de adequação.
   */

  const pesoCobertura =
    cobertura /
    100;


  const bonusAdequacao =
    (
      (
        notaAdequacao -
        50
      ) /
      50
    ) *
    2 *
    pesoCobertura;


  const bonusClassificacao =
    obterPesoClassificacaoAdequacaoRanking(
      jogador
    ) *
    pesoCobertura;


  const bonusViabilidade =
    (
      (
        notaViabilidade -
        50
      ) /
      50
    ) *
    1.5;


  return (
    projecao +
    bonusAdequacao +
    bonusClassificacao +
    bonusViabilidade
  );

}


/* =========================================================
   24. COMPARAÇÃO PRINCIPAL
   =========================================================

   Ordem real:

   1. elegibilidade;
   2. titularidade;
   3. projeção contextualizada;
   4. adequação à rodada;
   5. viabilidade;
   6. nota estatística;
   7. confiança;
   8. risco.

   ========================================================= */


function compararJogadoresRanking(
  jogadorA,
  jogadorB
) {

  const viabilidadeA =
    obterViabilidadeRanking(
      jogadorA
    );


  const viabilidadeB =
    obterViabilidadeRanking(
      jogadorB
    );


  /* -------------------------------------------------------
     1. ELEGIBILIDADE
     ------------------------------------------------------- */


  const aptoA =
    viabilidadeA.disponivel !== false &&
    viabilidadeA.elegivel !== false &&
    viabilidadeA.viavel !== false &&
    viabilidadeA.bloqueado !== true;


  const aptoB =
    viabilidadeB.disponivel !== false &&
    viabilidadeB.elegivel !== false &&
    viabilidadeB.viavel !== false &&
    viabilidadeB.bloqueado !== true;


  if (
    aptoA !==
    aptoB
  ) {

    return aptoA
      ? -1
      : 1;

  }


  /* -------------------------------------------------------
     2. TITULARIDADE
     ------------------------------------------------------- */


  const titularidadeA =
    numeroSeguro(
      viabilidadeA.titularidade
    );


  const titularidadeB =
    numeroSeguro(
      viabilidadeB.titularidade
    );


  /*
   * Só damos prioridade absoluta quando existe
   * uma diferença relevante.
   *
   * Assim evitamos tratar 74% e 76% como mundos
   * completamente diferentes.
   */

  const diferencaTitularidade =
    titularidadeB -
    titularidadeA;


  if (
    Math.abs(
      diferencaTitularidade
    ) >= 20
  ) {

    return diferencaTitularidade;

  }


  /* -------------------------------------------------------
     3. PROJEÇÃO CONTEXTUALIZADA
     ------------------------------------------------------- */


  const projecaoA =
    obterProjecaoContextualizadaRanking(
      jogadorA
    );


  const projecaoB =
    obterProjecaoContextualizadaRanking(
      jogadorB
    );


  const diferencaProjecao =
    projecaoB -
    projecaoA;


  /*
   * Uma diferença maior que 0,35 ponto já é
   * estatisticamente relevante para a ordenação.
   */

  if (
    Math.abs(
      diferencaProjecao
    ) >= 0.35
  ) {

    return diferencaProjecao;

  }


  /* -------------------------------------------------------
     4. ADEQUAÇÃO À RODADA
     ------------------------------------------------------- */


  const notaAdequacaoA =
    obterNotaAdequacaoRanking(
      jogadorA
    );


  const notaAdequacaoB =
    obterNotaAdequacaoRanking(
      jogadorB
    );


  const coberturaA =
    obterCoberturaAdequacaoRanking(
      jogadorA
    );


  const coberturaB =
    obterCoberturaAdequacaoRanking(
      jogadorB
    );


  /*
   * A adequação só desempata fortemente quando
   * os dois jogadores possuem cobertura razoável.
   */

  if (
    coberturaA >= 40 &&
    coberturaB >= 40
  ) {

    const diferencaAdequacao =
      notaAdequacaoB -
      notaAdequacaoA;


    if (
      Math.abs(
        diferencaAdequacao
      ) >= 8
    ) {

      return diferencaAdequacao;

    }

  }


  /* -------------------------------------------------------
     5. NOTA CONTEXTUAL AGREGADA
     ------------------------------------------------------- */


  const notaContextualA =
    obterNotaContextualRanking(
      jogadorA
    );


  const notaContextualB =
    obterNotaContextualRanking(
      jogadorB
    );


  const diferencaContextual =
    notaContextualB -
    notaContextualA;


  if (
    Math.abs(
      diferencaContextual
    ) >= 0.20
  ) {

    return diferencaContextual;

  }


  /* -------------------------------------------------------
     6. VIABILIDADE
     ------------------------------------------------------- */


  const diferencaViabilidade =
    obterNotaViabilidadeRanking(
      jogadorB
    ) -
    obterNotaViabilidadeRanking(
      jogadorA
    );


  if (
    Math.abs(
      diferencaViabilidade
    ) >= 7
  ) {

    return diferencaViabilidade;

  }


  /* -------------------------------------------------------
     7. NOTA ESTATÍSTICA
     ------------------------------------------------------- */


  const diferencaNota =
    obterNotaRanking(
      jogadorB
    ) -
    obterNotaRanking(
      jogadorA
    );


  if (
    Math.abs(
      diferencaNota
    ) >
    0.000001
  ) {

    return diferencaNota;

  }


  /* -------------------------------------------------------
     8. SCORE
     ------------------------------------------------------- */


  const diferencaScore =
    numeroSeguro(
      jogadorB.score
    ) -
    numeroSeguro(
      jogadorA.score
    );


  if (
    Math.abs(
      diferencaScore
    ) >
    0.000001
  ) {

    return diferencaScore;

  }


  /* -------------------------------------------------------
     9. CONFIANÇA
     ------------------------------------------------------- */


  const diferencaConfianca =
    numeroSeguro(
      jogadorB.confiancaNumerica
    ) -
    numeroSeguro(
      jogadorA.confiancaNumerica
    );


  if (
    Math.abs(
      diferencaConfianca
    ) >
    0.000001
  ) {

    return diferencaConfianca;

  }


  /* -------------------------------------------------------
     10. MENOR RISCO
     ------------------------------------------------------- */


  const diferencaRisco =
    numeroSeguro(
      viabilidadeA.riscoEscalacao
    ) -
    numeroSeguro(
      viabilidadeB.riscoEscalacao
    );


  if (
    Math.abs(
      diferencaRisco
    ) >
    0.000001
  ) {

    return diferencaRisco;

  }


  /* -------------------------------------------------------
     11. NOME
     ------------------------------------------------------- */


  return String(
    jogadorA.apelido ||
    jogadorA.nome ||
    ""
  )
    .localeCompare(
      String(
        jogadorB.apelido ||
        jogadorB.nome ||
        ""
      ),
      "pt-BR"
    );

}


/* =========================================================
   25. NOTA UTILIZADA NO RANKING
   ========================================================= */


function obterNotaRanking(
  jogador
) {

  const notaExistente =
    Number(
      jogador?.notaFinal
    );


  if (
    Number.isFinite(
      notaExistente
    )
  ) {

    return notaExistente;

  }


  const resultadoMotor =
    calcularNotaJogadorComMotor(
      jogador
    );


  return numeroSeguro(
    resultadoMotor?.notaFinal
  );

}


/* =========================================================
   26. INTEGRAÇÃO COM O MOTOR ESTATÍSTICO
   ========================================================= */


function calcularNotaJogadorComMotor(
  jogador
) {

  if (
    typeof executarMotorEstatistico !==
      "function"
  ) {

    return {

      notaFinal: 0,

      classificacao:
        "Não calculada",

      contribuicoes: {},

      explicacao: null

    };

  }


  const notas =
    obterNotasMotorDoJogador(
      jogador
    );


  return executarMotorEstatistico({

    jogadorId:
      jogador?.id ||
      null,

    posicao:
      jogador?.posicao ||
      null,

    notas

  });

}

/* =========================================================
   27. NOTAS ENVIADAS AO MOTOR ESTATÍSTICO
   ========================================================= */


function obterNotasMotorDoJogador(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  /*
   * IMPORTANTE:
   *
   * titularidade já foi calculada pelo MotorViabilidade.
   * Não recalculamos o fator aqui.
   *
   * A adequação à rodada também NÃO entra como uma nova
   * nota independente neste motor, porque ela já influencia
   * a projeção contextualizada.
   *
   * Isso evita peso duplicado.
   */

  return {

    media:
      numeroSeguro(
        jogador?.media
      ),

    forma:
      numeroSeguro(
        jogador?.forma
      ),

    regularidade:
      numeroSeguro(
        jogador?.regularidade
      ),

    teto:
      numeroSeguro(
        jogador?.teto
      ),

    piso:
      numeroSeguro(
        jogador?.piso
      ),

    confianca:
      numeroSeguro(
        jogador?.confiancaNumerica ??
        jogador?.confianca
      ),

    risco:
      numeroSeguro(
        jogador?.riscoNumerico ??
        jogador?.risco
      ),

    tendencia:
      numeroSeguro(
        jogador?.tendenciaNumerica ??
        jogador?.tendencia
      ),

    titularidade:
      numeroSeguro(
        viabilidade.titularidade
      )

  };

}


/* =========================================================
   28. RESUMO CONTEXTUAL DO JOGADOR
   ========================================================= */


function obterResumoContextualRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  const projecaoEstatistica =
    obterProjecaoEstatisticaRanking(
      jogador
    );


  const projecaoContextualizada =
    obterProjecaoContextualizadaRanking(
      jogador
    );


  return {

    jogadorId:
      jogador?.id ??
      jogador?.atletaId ??
      null,

    nome:
      jogador?.apelido ??
      jogador?.nome ??
      "",

    posicao:
      jogador?.posicao ??
      null,

    clube:
      jogador?.siglaClube ??
      jogador?.clube ??
      "",

    elegivel:
      viabilidade.elegivel,

    bloqueado:
      viabilidade.bloqueado,

    titularidade:
      viabilidade.titularidade,

    riscoEscalacao:
      viabilidade.riscoEscalacao,

    projecaoEstatistica:
      projecaoEstatistica,

    projecaoContextualizada:
      projecaoContextualizada,

    impactoContextual:
      projecaoContextualizada -
      projecaoEstatistica,

    notaAdequacao:
      viabilidade.notaAdequacao,

    classificacaoAdequacao:
      viabilidade.classificacaoAdequacao,

    coberturaAdequacao:
      viabilidade.coberturaAdequacao,

    fatorAdequacao:
      viabilidade.fatorAdequacao,

    notaViabilidade:
      viabilidade.notaViabilidade,

    classificacaoViabilidade:
      viabilidade.classificacao,

    motivos:
      viabilidade.motivos,

    alertas:
      viabilidade.alertas,

    justificativa:
      viabilidade.justificativa

  };

}


/* =========================================================
   29. EXPLICAÇÃO DA POSIÇÃO NO RANKING
   ========================================================= */


function gerarExplicacaoRanking(
  jogador
) {

  const resumo =
    obterResumoContextualRanking(
      jogador
    );


  const partes = [];


  if (
    resumo.bloqueado
  ) {

    partes.push(
      "Jogador bloqueado para a rodada."
    );


    return partes.join(
      " "
    );

  }


  partes.push(
    `Titularidade estimada em ` +
    `${arredondarRanking(
      resumo.titularidade,
      0
    )}%.`
  );


  partes.push(
    `Projeção contextualizada de ` +
    `${arredondarRanking(
      resumo.projecaoContextualizada,
      2
    )} pontos.`
  );


  if (
    resumo.notaAdequacao !==
      null &&
    resumo.notaAdequacao !==
      undefined
  ) {

    partes.push(
      `Adequação à rodada ` +
      `${arredondarRanking(
        resumo.notaAdequacao,
        1
      )}/100.`
    );

  }


  if (
    Math.abs(
      resumo.impactoContextual
    ) >= 0.05
  ) {

    if (
      resumo.impactoContextual >
      0
    ) {

      partes.push(
        `O contexto da rodada elevou a projeção em ` +
        `${arredondarRanking(
          resumo.impactoContextual,
          2
        )} ponto(s).`
      );

    } else {

      partes.push(
        `O contexto da rodada reduziu a projeção em ` +
        `${arredondarRanking(
          Math.abs(
            resumo.impactoContextual
          ),
          2
        )} ponto(s).`
      );

    }

  }


  const principalMotivo =
    resumo?.justificativa;


  if (
    principalMotivo
  ) {

    partes.push(
      principalMotivo
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
   30. DESTAQUES
   ========================================================= */


function obterDestaquesRecomendacoes() {

  const jogadores =
    obterJogadoresCarregados();


  const candidatos =
    jogadores
      .filter(
        jogadorEhViavelParaRanking
      )
      .slice()
      .sort(
        compararJogadoresRanking
      );


  return {

    melhorProjecao:
      obterMelhorPorCriterio(
        candidatos,
        jogador =>
          obterProjecaoContextualizadaRanking(
            jogador
          ),
        "maior"
      ),

    maiorTeto:
      obterMelhorPorCriterio(
        candidatos,
        jogador =>
          numeroSeguro(
            jogador?.teto
          ),
        "maior"
      ),

    maiorConfianca:
      obterMelhorPorCriterio(
        candidatos,
        jogador =>
          numeroSeguro(
            jogador?.confiancaNumerica ??
            jogador?.confianca
          ),
        "maior"
      ),

    menorRisco:
      obterMelhorPorCriterio(
        candidatos,
        jogador =>
          obterRiscoRanking(
            jogador
          ),
        "menor"
      ),

    melhorAdequacao:
      obterMelhorPorCriterio(
        candidatos.filter(
          jogador =>
            obterCoberturaAdequacaoRanking(
              jogador
            ) >= 40
        ),
        jogador =>
          obterNotaAdequacaoRanking(
            jogador
          ),
        "maior"
      )

  };

}


/* =========================================================
   31. MELHOR JOGADOR POR CRITÉRIO
   ========================================================= */


function obterMelhorPorCriterio(
  jogadores,
  extrairValor,
  direcao = "maior"
) {

  if (
    !Array.isArray(
      jogadores
    ) ||
    jogadores.length === 0
  ) {

    return null;

  }


  let melhor = null;

  let melhorValor = null;


  jogadores.forEach(
    jogador => {

      const valor =
        Number(
          extrairValor(
            jogador
          )
        );


      if (
        !Number.isFinite(
          valor
        )
      ) {

        return;

      }


      if (
        melhor === null
      ) {

        melhor =
          jogador;

        melhorValor =
          valor;

        return;

      }


      const substituir =
        direcao === "menor"
          ? valor < melhorValor
          : valor > melhorValor;


      if (
        substituir
      ) {

        melhor =
          jogador;

        melhorValor =
          valor;

      }

    }
  );


  return melhor;

}


/* =========================================================
   32. RISCO PARA O RANKING
   ========================================================= */


function obterRiscoRanking(
  jogador
) {

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );


  const riscoEscalacao =
    Number(
      viabilidade.riscoEscalacao
    );


  if (
    Number.isFinite(
      riscoEscalacao
    )
  ) {

    return riscoEscalacao;

  }


  const risco =
    primeiroNumeroValido([

      jogador?.riscoNumerico,

      jogador?.risco,

      jogador?.riscoNegativar

    ]);


  return risco !== null
    ? risco
    : 50;

}


/* =========================================================
   33. RANKING COMPLETO
   ========================================================= */


function gerarRankingCompleto() {

  const jogadores =
    obterJogadoresCarregados();


  return jogadores
    .slice()
    .sort(
      compararJogadoresRanking
    )
    .map(
      (
        jogador,
        indice
      ) => {

        const resumo =
          obterResumoContextualRanking(
            jogador
          );


        return {

          posicaoRanking:
            indice + 1,

          jogador,

          ...resumo,

          notaRanking:
            obterNotaRanking(
              jogador
            ),

          notaContextual:
            obterNotaContextualRanking(
              jogador
            ),

          explicacaoRanking:
            gerarExplicacaoRanking(
              jogador
            )

        };

      }
    );

}


/* =========================================================
   34. RANKING POR POSIÇÃO
   ========================================================= */


function gerarRankingPorPosicao(
  codigoPosicao,
  limite = null
) {

  const jogadores =
    obterJogadoresCarregados()
      .filter(
        jogador =>
          jogador?.posicao ===
          codigoPosicao
      )
      .slice()
      .sort(
        compararJogadoresRanking
      );


  const quantidade =
    Number.isFinite(
      Number(
        limite
      )
    )
      ? Math.max(
          0,
          Number(
            limite
          )
        )
      : jogadores.length;


  return jogadores
    .slice(
      0,
      quantidade
    )
    .map(
      (
        jogador,
        indice
      ) => {

        const resumo =
          obterResumoContextualRanking(
            jogador
          );


        return {

          posicaoRanking:
            indice + 1,

          jogador,

          ...resumo,

          notaRanking:
            obterNotaRanking(
              jogador
            ),

          notaContextual:
            obterNotaContextualRanking(
              jogador
            ),

          explicacaoRanking:
            gerarExplicacaoRanking(
              jogador
            )

        };

      }
    );

}


/* =========================================================
   35. DIAGNÓSTICO DO RANKING
   ========================================================= */


function diagnosticarRanking(
  codigoPosicao = null,
  limite = 20
) {

  let jogadores =
    obterJogadoresCarregados();


  if (
    codigoPosicao
  ) {

    jogadores =
      jogadores.filter(
        jogador =>
          jogador?.posicao ===
          codigoPosicao
      );

  }


  const ranking =
    jogadores
      .slice()
      .sort(
        compararJogadoresRanking
      )
      .slice(
        0,
        limite
      )
      .map(
        (
          jogador,
          indice
        ) => {

          const resumo =
            obterResumoContextualRanking(
              jogador
            );


          return {

            ranking:
              indice + 1,

            jogador:
              resumo.nome,

            posicao:
              resumo.posicao,

            clube:
              resumo.clube,

            elegivel:
              resumo.elegivel,

            titularidade:
              arredondarRanking(
                resumo.titularidade,
                1
              ),

            projecaoOriginal:
              arredondarRanking(
                resumo.projecaoEstatistica,
                2
              ),

            projecaoFinal:
              arredondarRanking(
                resumo.projecaoContextualizada,
                2
              ),

            impacto:
              arredondarRanking(
                resumo.impactoContextual,
                2
              ),

            adequacao:
              resumo.notaAdequacao !==
                null
                ? arredondarRanking(
                    resumo.notaAdequacao,
                    1
                  )
                : null,

            cobertura:
              arredondarRanking(
                resumo.coberturaAdequacao,
                1
              ),

            viabilidade:
              arredondarRanking(
                resumo.notaViabilidade,
                1
              ),

            risco:
              arredondarRanking(
                resumo.riscoEscalacao,
                1
              )

          };

        }
      );


  console.table(
    ranking
  );


  return ranking;

}


/* =========================================================
   36. DIAGNÓSTICO DE COBERTURA CONTEXTUAL
   ========================================================= */


function diagnosticarCoberturaAdequacao() {

  const jogadores =
    obterJogadoresCarregados();


  const resumo = {

    total:
      jogadores.length,

    comAdequacao:
      0,

    coberturaAlta:
      0,

    coberturaMedia:
      0,

    coberturaBaixa:
      0,

    semDados:
      0,

    bloqueados:
      0,

    elegiveis:
      0

  };


  jogadores.forEach(
    jogador => {

      const viabilidade =
        obterViabilidadeRanking(
          jogador
        );


      if (
        viabilidade.bloqueado
      ) {

        resumo.bloqueados += 1;

      }


      if (
        viabilidade.elegivel
      ) {

        resumo.elegiveis += 1;

      }


      if (
        viabilidade.notaAdequacao ===
          null ||
        viabilidade.notaAdequacao ===
          undefined
      ) {

        resumo.semDados += 1;

        return;

      }


      resumo.comAdequacao += 1;


      const cobertura =
        numeroSeguro(
          viabilidade.coberturaAdequacao
        );


      if (
        cobertura >= 75
      ) {

        resumo.coberturaAlta += 1;

      } else if (
        cobertura >= 40
      ) {

        resumo.coberturaMedia += 1;

      } else {

        resumo.coberturaBaixa += 1;

      }

    }
  );


  console.table([
    resumo
  ]);


  return resumo;

}


/* =========================================================
   37. COMPARAÇÃO PROJEÇÃO ORIGINAL X CONTEXTUAL
   ========================================================= */


function diagnosticarImpactoContextual(
  limite = 20
) {

  const jogadores =
    obterJogadoresCarregados();


  const comparacao =
    jogadores
      .map(
        jogador => {

          const resumo =
            obterResumoContextualRanking(
              jogador
            );


          return {

            jogador:
              resumo.nome,

            posicao:
              resumo.posicao,

            clube:
              resumo.clube,

            original:
              arredondarRanking(
                resumo.projecaoEstatistica,
                2
              ),

            contextual:
              arredondarRanking(
                resumo.projecaoContextualizada,
                2
              ),

            impacto:
              arredondarRanking(
                resumo.impactoContextual,
                2
              ),

            titularidade:
              arredondarRanking(
                resumo.titularidade,
                1
              ),

            adequacao:
              resumo.notaAdequacao !==
                null
                ? arredondarRanking(
                    resumo.notaAdequacao,
                    1
                  )
                : null,

            cobertura:
              arredondarRanking(
                resumo.coberturaAdequacao,
                1
              )

          };

        }
      )
      .sort(
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
      )
      .slice(
        0,
        limite
      );


  console.table(
    comparacao
  );


  return comparacao;

}

/* =========================================================
   38. UTILITÁRIOS DO RANKING
   ========================================================= */


function arredondarRanking(
  valor,
  casas = 2
) {

  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return 0;

  }


  return Number(
    numero.toFixed(
      casas
    )
  );

}


function primeiroNumeroValido(
  valores
) {

  for (
    const valor
    of valores
  ) {

    const numero =
      Number(
        valor
      );


    if (
      Number.isFinite(
        numero
      )
    ) {

      return numero;

    }

  }


  return null;

}


function primeiroBooleanoValido(
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


    const texto =
      String(
        valor ??
        ""
      )
        .trim()
        .toLowerCase();


    if (
      [
        "sim",
        "true",
        "yes",
        "titular",
        "provavel",
        "provável"
      ].includes(
        texto
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
        "reserva",
        "fora"
      ].includes(
        texto
      )
    ) {

      return false;

    }

  }


  return null;

}


function normalizarListaMotivos(
  valor
) {

  if (
    Array.isArray(
      valor
    )
  ) {

    return valor
      .map(
        item =>
          String(
            item
          ).trim()
      )
      .filter(
        Boolean
      );

  }


  if (
    typeof valor ===
      "string" &&
    valor.trim()
  ) {

    return [
      valor.trim()
    ];

  }


  return [];

}


/* =========================================================
   39. NOME CURTO
   ========================================================= */


function obterNomeCurtoRanking(
  jogador
) {

  if (!jogador) {

    return "Jogador";

  }


  const apelido =
    String(
      jogador.apelido ??
      ""
    )
      .trim();


  if (apelido) {

    return apelido;

  }


  const nome =
    String(
      jogador.nome ??
      ""
    )
      .trim();


  if (!nome) {

    return "Jogador";

  }


  const partes =
    nome
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );


  if (
    partes.length <= 2
  ) {

    return nome;

  }


  return (
    `${partes[0]} ` +
    `${partes[
      partes.length - 1
    ]}`
  );

}


/* =========================================================
   40. JOGADORES VIÁVEIS PARA DESTAQUES
   ========================================================= */


function obterJogadoresViaveisDestaques(
  jogadores
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const viaveis =
    lista.filter(
      jogadorEhViavelParaRanking
    );


  if (
    viaveis.length > 0
  ) {

    return viaveis;

  }


  return lista;

}


/* =========================================================
   41. DESTAQUES GERAIS
   ========================================================= */


function exibirDestaquesGerais() {

  const jogadores =
    obterJogadoresCarregados();


  if (
    !Array.isArray(
      jogadores
    ) ||
    jogadores.length === 0
  ) {

    limparDestaquesGerais();

    return;

  }


  const jogadoresConsiderados =
    obterJogadoresViaveisDestaques(
      jogadores
    );


  /*
   * "Maior projeção" agora significa:
   *
   * maior projeção contextualizada para a rodada,
   * e não simplesmente maior projeção histórica.
   */

  const maiorProjecao =
    obterMelhorPorCriterio(
      jogadoresConsiderados,
      jogador =>
        obterProjecaoContextualizadaRanking(
          jogador
        ),
      "maior"
    );


  const maiorConfianca =
    obterMelhorPorCriterio(
      jogadoresConsiderados,
      jogador =>
        numeroSeguro(
          jogador
            ?.confiancaNumerica ??
          jogador
            ?.confianca
        ),
      "maior"
    );


  const melhorCustoBeneficio =
    obterMelhorPorCriterio(
      jogadoresConsiderados,
      jogador =>
        numeroSeguro(
          jogador
            ?.custoBeneficio
        ),
      "maior"
    );


  exibirDestaque(
    "bestProjection",
    "bestProjectionName",
    maiorProjecao,
    formatarPontos(
      maiorProjecao
        ? obterProjecaoContextualizadaRanking(
            maiorProjecao
          )
        : 0
    )
  );


  exibirDestaque(
    "bestConfidence",
    "bestConfidenceName",
    maiorConfianca,
    formatarPorcentagem(
      maiorConfianca
        ?.confiancaNumerica ??
      maiorConfianca
        ?.confianca
    )
  );


  exibirDestaque(
    "bestValue",
    "bestValueName",
    melhorCustoBeneficio,
    formatarDecimal(
      melhorCustoBeneficio
        ?.custoBeneficio,
      2
    )
  );

}


/* =========================================================
   42. EXIBIÇÃO DE DESTAQUE
   ========================================================= */


function exibirDestaque(
  idValor,
  idNome,
  jogador,
  valorFormatado
) {

  definirTextoElemento(
    idValor,
    valorFormatado ||
    "--"
  );


  definirTextoElemento(
    idNome,
    jogador
      ? obterNomeCurtoRanking(
          jogador
        )
      : "Aguardando dados"
  );

}


/* =========================================================
   43. LIMPEZA DOS DESTAQUES
   ========================================================= */


function limparDestaquesGerais() {

  definirTextoElemento(
    "bestProjection",
    "--"
  );


  definirTextoElemento(
    "bestProjectionName",
    "Aguardando dados"
  );


  definirTextoElemento(
    "bestConfidence",
    "--"
  );


  definirTextoElemento(
    "bestConfidenceName",
    "Aguardando dados"
  );


  definirTextoElemento(
    "bestValue",
    "--"
  );


  definirTextoElemento(
    "bestValueName",
    "Aguardando dados"
  );

}


/* =========================================================
   44. COMPARAÇÃO ENTRE DOIS JOGADORES
   ========================================================= */


function compararJogadoresDoRanking(
  jogadorA,
  jogadorB
) {

  if (
    !jogadorA ||
    !jogadorB
  ) {

    return null;

  }


  const resumoA =
    obterResumoContextualRanking(
      jogadorA
    );


  const resumoB =
    obterResumoContextualRanking(
      jogadorB
    );


  const resultadoA =
    calcularNotaJogadorComMotor(
      jogadorA
    );


  const resultadoB =
    calcularNotaJogadorComMotor(
      jogadorB
    );


  const ordem =
    compararJogadoresRanking(
      jogadorA,
      jogadorB
    );


  const vencedor =
    ordem <= 0
      ? "A"
      : "B";


  const notaA =
    obterNotaRanking(
      jogadorA
    );


  const notaB =
    obterNotaRanking(
      jogadorB
    );


  return {

    jogadorA: {

      id:
        jogadorA.id,

      nome:
        obterNomeCurtoRanking(
          jogadorA
        ),

      nota:
        notaA,

      notaMotor:
        resultadoA?.notaFinal ??
        notaA,

      projecaoOriginal:
        resumoA
          .projecaoEstatistica,

      projecao:
        resumoA
          .projecaoContextualizada,

      impactoContextual:
        resumoA
          .impactoContextual,

      titularidade:
        resumoA
          .titularidade,

      riscoEscalacao:
        resumoA
          .riscoEscalacao,

      adequacao:
        resumoA
          .notaAdequacao,

      classificacaoAdequacao:
        resumoA
          .classificacaoAdequacao,

      coberturaAdequacao:
        resumoA
          .coberturaAdequacao,

      viabilidade:
        resumoA
          .notaViabilidade,

      elegivel:
        resumoA
          .elegivel,

      motivosViabilidade:
        resumoA
          .motivos,

      alertas:
        resumoA
          .alertas,

      explicacao:
        gerarExplicacaoRanking(
          jogadorA
        )

    },


    jogadorB: {

      id:
        jogadorB.id,

      nome:
        obterNomeCurtoRanking(
          jogadorB
        ),

      nota:
        notaB,

      notaMotor:
        resultadoB?.notaFinal ??
        notaB,

      projecaoOriginal:
        resumoB
          .projecaoEstatistica,

      projecao:
        resumoB
          .projecaoContextualizada,

      impactoContextual:
        resumoB
          .impactoContextual,

      titularidade:
        resumoB
          .titularidade,

      riscoEscalacao:
        resumoB
          .riscoEscalacao,

      adequacao:
        resumoB
          .notaAdequacao,

      classificacaoAdequacao:
        resumoB
          .classificacaoAdequacao,

      coberturaAdequacao:
        resumoB
          .coberturaAdequacao,

      viabilidade:
        resumoB
          .notaViabilidade,

      elegivel:
        resumoB
          .elegivel,

      motivosViabilidade:
        resumoB
          .motivos,

      alertas:
        resumoB
          .alertas,

      explicacao:
        gerarExplicacaoRanking(
          jogadorB
        )

    },


    vencedor,


    diferencaProjecao:
      arredondarRanking(
        resumoA
          .projecaoContextualizada -
        resumoB
          .projecaoContextualizada,
        2
      ),


    diferencaAdequacao:
      arredondarRanking(
        numeroSeguro(
          resumoA.notaAdequacao
        ) -
        numeroSeguro(
          resumoB.notaAdequacao
        ),
        1
      ),


    diferencaTitularidade:
      arredondarRanking(
        resumoA.titularidade -
        resumoB.titularidade,
        1
      ),


    diferencaNota:
      arredondarRanking(
        notaA -
        notaB,
        2
      )

  };

}


/* =========================================================
   45. DIAGNÓSTICO DE UM JOGADOR
   ========================================================= */


function diagnosticarJogadorRanking(
  jogador
) {

  if (!jogador) {

    console.warn(
      "Jogador inválido para diagnóstico."
    );


    return null;

  }


  const resumo =
    obterResumoContextualRanking(
      jogador
    );


  const diagnostico = {

    jogador:
      resumo.nome,

    posicao:
      resumo.posicao,

    clube:
      resumo.clube,

    elegivel:
      resumo.elegivel,

    bloqueado:
      resumo.bloqueado,

    titularidade:
      arredondarRanking(
        resumo.titularidade,
        1
      ),

    riscoEscalacao:
      arredondarRanking(
        resumo.riscoEscalacao,
        1
      ),

    projecaoEstatistica:
      arredondarRanking(
        resumo.projecaoEstatistica,
        2
      ),

    projecaoContextualizada:
      arredondarRanking(
        resumo.projecaoContextualizada,
        2
      ),

    impactoContextual:
      arredondarRanking(
        resumo.impactoContextual,
        2
      ),

    adequacao:
      resumo.notaAdequacao,

    classificacaoAdequacao:
      resumo.classificacaoAdequacao,

    coberturaAdequacao:
      arredondarRanking(
        resumo.coberturaAdequacao,
        1
      ),

    fatorAdequacao:
      resumo.fatorAdequacao,

    viabilidade:
      arredondarRanking(
        resumo.notaViabilidade,
        1
      ),

    classificacaoViabilidade:
      resumo.classificacaoViabilidade,

    notaRanking:
      arredondarRanking(
        obterNotaRanking(
          jogador
        ),
        2
      ),

    notaContextual:
      arredondarRanking(
        obterNotaContextualRanking(
          jogador
        ),
        2
      ),

    motivos:
      resumo.motivos,

    alertas:
      resumo.alertas,

    explicacao:
      gerarExplicacaoRanking(
        jogador
      )

  };


  console.log(
    "===================================="
  );


  console.log(
    "DIAGNÓSTICO DO RANKING"
  );


  console.table([
    {
      jogador:
        diagnostico.jogador,

      posicao:
        diagnostico.posicao,

      clube:
        diagnostico.clube,

      elegivel:
        diagnostico.elegivel,

      titularidade:
        diagnostico.titularidade,

      risco:
        diagnostico.riscoEscalacao,

      projecaoOriginal:
        diagnostico.projecaoEstatistica,

      projecaoFinal:
        diagnostico.projecaoContextualizada,

      impacto:
        diagnostico.impactoContextual,

      adequacao:
        diagnostico.adequacao,

      cobertura:
        diagnostico.coberturaAdequacao,

      viabilidade:
        diagnostico.viabilidade
    }
  ]);


  console.log(
    diagnostico.explicacao
  );


  console.log(
    "===================================="
  );


  return diagnostico;

}


/* =========================================================
   46. EXPOSIÇÃO OPCIONAL PARA DEPURAÇÃO
   ========================================================= */


if (
  typeof window !==
  "undefined"
) {

  window.CartolaRanking = {

    gerarCompleto:
      gerarRankingCompleto,

    gerarPorPosicao:
      gerarRankingPorPosicao,

    diagnosticar:
      diagnosticarRanking,

    diagnosticarJogador:
      diagnosticarJogadorRanking,

    diagnosticarCobertura:
      diagnosticarCoberturaAdequacao,

    diagnosticarImpacto:
      diagnosticarImpactoContextual,

    comparar:
      compararJogadoresDoRanking,

    obterResumo:
      obterResumoContextualRanking,

    obterProjecao:
      obterProjecaoRanking,

    obterProjecaoEstatistica:
      obterProjecaoEstatisticaRanking,

    obterProjecaoContextualizada:
      obterProjecaoContextualizadaRanking

  };

}
