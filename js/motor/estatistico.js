/* =========================================================
   CARTOLA ESTATÍSTICO
   Motor estatístico central
   Versão inicial com pesos especializados por posição
   ========================================================= */


/* =========================================================
   1. IDENTIFICAÇÃO DO MOTOR
   ========================================================= */

const MOTOR_ESTATISTICO = {
  nome: "Motor Estatístico do Cartola",
  versao: "0.2.0",
  status: "MVP funcional",
  quantidadeCriterios: 18
};


/* =========================================================
   2. NOMES AMIGÁVEIS DOS CRITÉRIOS
   ========================================================= */

const NOMES_CRITERIOS = {
  formaRecente:
    "Forma recente",

  mediaGeral:
    "Média geral",

  mediana:
    "Mediana",

  regularidade:
    "Regularidade",

  pontuacaoBasica:
    "Pontuação básica",

  scoutsOfensivos:
    "Scouts ofensivos",

  scoutsDefensivos:
    "Scouts defensivos",

  casaFora:
    "Desempenho em casa ou fora",

  forcaAdversario:
    "Força do adversário",

  pontosCedidos:
    "Pontos cedidos pela posição",

  chanceSG:
    "Probabilidade de SG",

  titularidade:
    "Titularidade",

  minutosEsperados:
    "Minutos esperados",

  bolaParada:
    "Bolas paradas",

  penaltis:
    "Cobrança de pênaltis",

  custoBeneficio:
    "Custo-benefício",

  tendenciaRecente:
    "Tendência recente",

  riscoNegativar:
    "Proteção contra negativação"
};


/* =========================================================
   3. PERFIS DAS POSIÇÕES
   ========================================================= */

const PERFIS_POSICAO = {
  GOL: {
    nome: "Goleiro",

    prioridades: [
      "scoutsDefensivos",
      "chanceSG",
      "regularidade"
    ]
  },

  LAT: {
    nome: "Lateral",

    prioridades: [
      "pontuacaoBasica",
      "scoutsOfensivos",
      "scoutsDefensivos"
    ]
  },

  ZAG: {
    nome: "Zagueiro",

    prioridades: [
      "scoutsDefensivos",
      "chanceSG",
      "regularidade"
    ]
  },

  MEI: {
    nome: "Meia",

    prioridades: [
      "scoutsOfensivos",
      "formaRecente",
      "pontuacaoBasica"
    ]
  },

  ATA: {
    nome: "Atacante",

    prioridades: [
      "scoutsOfensivos",
      "formaRecente",
      "forcaAdversario"
    ]
  },

  TEC: {
    nome: "Treinador",

    prioridades: [
      "forcaAdversario",
      "chanceSG",
      "formaRecente"
    ]
  }
};


/* =========================================================
   4. PREPARAÇÃO DE LISTAS NUMÉRICAS
   ========================================================= */

function prepararListaNumerica(
  valores
) {
  if (!Array.isArray(valores)) {
    return [];
  }

  return valores
    .map(Number)
    .filter(Number.isFinite);
}


/* =========================================================
   5. MÉDIA
   ========================================================= */

function calcularMedia(
  valores
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length === 0) {
    return 0;
  }

  const soma =
    numeros.reduce(
      (total, valor) =>
        total + valor,
      0
    );

  return soma / numeros.length;
}


/* =========================================================
   6. MEDIANA
   ========================================================= */

function calcularMediana(
  valores
) {
  const numeros =
    prepararListaNumerica(valores)
      .sort(
        (valorA, valorB) =>
          valorA - valorB
      );

  if (numeros.length === 0) {
    return 0;
  }

  const indiceCentral =
    Math.floor(
      numeros.length / 2
    );

  const quantidadePar =
    numeros.length % 2 === 0;

  if (quantidadePar) {
    return (
      numeros[indiceCentral - 1] +
      numeros[indiceCentral]
    ) / 2;
  }

  return numeros[indiceCentral];
}


/* =========================================================
   7. VARIÂNCIA
   ========================================================= */

function calcularVariancia(
  valores
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length === 0) {
    return 0;
  }

  const media =
    calcularMedia(numeros);

  const somaDiferencas =
    numeros.reduce(
      (total, valor) => {
        const diferenca =
          valor - media;

        return (
          total +
          diferenca ** 2
        );
      },
      0
    );

  return (
    somaDiferencas /
    numeros.length
  );
}


/* =========================================================
   8. DESVIO-PADRÃO
   ========================================================= */

function calcularDesvioPadrao(
  valores
) {
  return Math.sqrt(
    calcularVariancia(valores)
  );
}


/* =========================================================
   9. AMPLITUDE
   ========================================================= */

function calcularAmplitude(
  valores
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length === 0) {
    return 0;
  }

  return (
    Math.max(...numeros) -
    Math.min(...numeros)
  );
}


/* =========================================================
   10. TENDÊNCIA RECENTE
   Compara a primeira metade com a segunda metade.
   ========================================================= */

function calcularTendencia(
  valores
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length < 2) {
    return {
      valor: 0,
      nota: 50,
      classificacao: "Estável"
    };
  }

  const tamanhoMetade =
    Math.max(
      1,
      Math.floor(
        numeros.length / 2
      )
    );

  const primeiraMetade =
    numeros.slice(
      0,
      tamanhoMetade
    );

  const segundaMetade =
    numeros.slice(
      numeros.length -
      tamanhoMetade
    );

  const mediaInicial =
    calcularMedia(
      primeiraMetade
    );

  const mediaFinal =
    calcularMedia(
      segundaMetade
    );

  const diferenca =
    mediaFinal -
    mediaInicial;

  const nota =
    limitarValor(
      50 + diferenca * 8,
      0,
      100
    );

  let classificacao =
    "Estável";

  if (diferenca >= 1) {
    classificacao =
      "Em crescimento";
  } else if (diferenca <= -1) {
    classificacao =
      "Em queda";
  }

  return {
    valor: diferenca,
    nota,
    classificacao
  };
}


/* =========================================================
   11. REGULARIDADE
   Quanto menor a variação, maior a nota.
   ========================================================= */

function calcularRegularidade(
  valores
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length === 0) {
    return 0;
  }

  const media =
    Math.abs(
      calcularMedia(numeros)
    );

  const desvio =
    calcularDesvioPadrao(
      numeros
    );

  if (media === 0) {
    return desvio === 0
      ? 100
      : 0;
  }

  const coeficienteVariacao =
    desvio / media;

  return limitarValor(
    100 -
    coeficienteVariacao * 70,
    0,
    100
  );
}


/* =========================================================
   12. FREQUÊNCIA DE NEGATIVAÇÃO
   ========================================================= */

function calcularFrequenciaNegativa(
  valores
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length === 0) {
    return 0;
  }

  const negativas =
    numeros.filter(
      (valor) => valor < 0
    ).length;

  return (
    negativas /
    numeros.length
  ) * 100;
}


/* =========================================================
   13. FREQUÊNCIA ACIMA DE UMA META
   ========================================================= */

function calcularFrequenciaAcima(
  valores,
  meta
) {
  const numeros =
    prepararListaNumerica(valores);

  if (numeros.length === 0) {
    return 0;
  }

  const valorMeta =
    numeroSeguro(meta);

  const quantidade =
    numeros.filter(
      (valor) =>
        valor >= valorMeta
    ).length;

  return (
    quantidade /
    numeros.length
  ) * 100;
}


/* =========================================================
   14. NORMALIZAÇÃO PARA 0 A 100
   ========================================================= */

function normalizarNota(
  valor,
  minimo,
  maximo
) {
  const numero =
    numeroSeguro(valor);

  const limiteMinimo =
    numeroSeguro(minimo);

  const limiteMaximo =
    numeroSeguro(maximo);

  if (
    limiteMaximo ===
    limiteMinimo
  ) {
    return 50;
  }

  const nota =
    (
      (
        numero -
        limiteMinimo
      ) /
      (
        limiteMaximo -
        limiteMinimo
      )
    ) * 100;

  return limitarValor(
    nota,
    0,
    100
  );
}


/* =========================================================
   15. CUSTO-BENEFÍCIO
   ========================================================= */

function calcularCustoBeneficio(
  projecao,
  preco
) {
  const valorProjecao =
    numeroSeguro(projecao);

  const valorPreco =
    numeroSeguro(preco);

  if (valorPreco <= 0) {
    return 0;
  }

  return (
    valorProjecao /
    valorPreco
  );
}


/* =========================================================
   16. PESOS DA POSIÇÃO
   ========================================================= */

function obterPesosDoMotor(
  codigoPosicao
) {
  if (
    typeof obterPesosPorPosicao ===
    "function"
  ) {
    return obterPesosPorPosicao(
      codigoPosicao
    );
  }

  console.warn(
    "pesos.js não foi carregado. " +
    "O motor utilizará pesos iguais."
  );

  const pesoIgual =
    100 /
    MOTOR_ESTATISTICO
      .quantidadeCriterios;

  return Object.keys(
    NOMES_CRITERIOS
  ).reduce(
    (pesos, criterio) => {
      pesos[criterio] =
        pesoIgual;

      return pesos;
    },
    {}
  );
}


/* =========================================================
   17. NOME DO MOTOR DA POSIÇÃO
   ========================================================= */

function obterNomeDoMotor(
  codigoPosicao
) {
  if (
    typeof obterNomeMotorPosicao ===
    "function"
  ) {
    return obterNomeMotorPosicao(
      codigoPosicao
    );
  }

  return (
    "Motor Estatístico Geral"
  );
}


/* =========================================================
   18. SOMA DOS PESOS
   ========================================================= */

function somarPesosEstatisticos(
  pesos
) {
  if (
    !pesos ||
    typeof pesos !== "object"
  ) {
    return 0;
  }

  return Object.values(pesos)
    .reduce(
      (total, peso) =>
        total +
        numeroSeguro(peso),
      0
    );
}


/* =========================================================
   19. VALIDAÇÃO DOS PESOS
   ========================================================= */

function validarPesosEstatisticos(
  codigoPosicao
) {
  const pesos =
    obterPesosDoMotor(
      codigoPosicao
    );

  const total =
    somarPesosEstatisticos(
      pesos
    );

  const valido =
    Math.abs(
      total - 100
    ) < 0.001;

  if (!valido) {
    console.error(
      "Erro no Motor Estatístico:",
      `os pesos de ${codigoPosicao} ` +
      `totalizam ${total}, ` +
      "mas deveriam totalizar 100."
    );
  }

  return {
    valido,
    total,
    esperado: 100,
    codigoPosicao,
    pesos
  };
}


/* =========================================================
   20. CONTRIBUIÇÃO PONDERADA
   ========================================================= */

function calcularContribuicao(
  nota,
  peso
) {
  const notaSegura =
    limitarValor(
      nota,
      0,
      100
    );

  const pesoSeguro =
    numeroSeguro(peso);

  return (
    notaSegura *
    pesoSeguro
  ) / 100;
}


/* =========================================================
   21. NOTA FINAL POR POSIÇÃO
   ========================================================= */

function calcularNotaFinal(
  notasCriterios,
  codigoPosicao
) {
  const validacao =
    validarPesosEstatisticos(
      codigoPosicao
    );

  if (!validacao.valido) {
    return {
      notaFinal: 0,
      contribuicoes: {},
      pesosAplicados:
        validacao.pesos,
      erro:
        "Os pesos do motor não totalizam 100."
    };
  }

  const pesos =
    validacao.pesos;

  const contribuicoes = {};

  let notaFinal = 0;

  Object.entries(pesos)
    .forEach(
      ([criterio, peso]) => {
        const nota =
          limitarValor(
            notasCriterios?.[
              criterio
            ],
            0,
            100
          );

        const contribuicao =
          calcularContribuicao(
            nota,
            peso
          );

        contribuicoes[criterio] = {
          criterio,

          nome:
            NOMES_CRITERIOS[
              criterio
            ] || criterio,

          nota,

          peso,

          contribuicao
        };

        notaFinal += contribuicao;
      }
    );

  return {
    notaFinal:
      limitarValor(
        notaFinal,
        0,
        100
      ),

    contribuicoes,

    pesosAplicados: pesos,

    erro: null
  };
}


/* =========================================================
   22. CLASSIFICAÇÃO DA NOTA
   ========================================================= */

function classificarNotaFinal(
  nota
) {
  const valor =
    numeroSeguro(nota);

  if (valor >= 90) {
    return "Excelente";
  }

  if (valor >= 80) {
    return "Muito boa";
  }

  if (valor >= 70) {
    return "Boa";
  }

  if (valor >= 60) {
    return "Regular";
  }

  if (valor >= 50) {
    return "Abaixo da média";
  }

  return "Baixa";
}


/* =========================================================
   23. CLASSIFICAÇÃO DO RISCO
   ========================================================= */

function classificarRiscoEstatistico(
  notaRisco
) {
  const valor =
    numeroSeguro(notaRisco);

  if (valor <= 25) {
    return "Baixo";
  }

  if (valor <= 55) {
    return "Médio";
  }

  return "Alto";
}


/* =========================================================
   24. CLASSIFICAÇÃO DA CONFIANÇA
   ========================================================= */

function classificarConfiancaEstatistica(
  confianca
) {
  const valor =
    numeroSeguro(confianca);

  if (valor >= 85) {
    return "Alta";
  }

  if (valor >= 65) {
    return "Média";
  }

  return "Baixa";
}


/* =========================================================
   25. PRINCIPAIS CONTRIBUIÇÕES
   ========================================================= */

function obterPrincipaisContribuicoes(
  contribuicoes,
  quantidade = 3
) {
  if (
    !contribuicoes ||
    typeof contribuicoes !==
      "object"
  ) {
    return [];
  }

  return Object.values(
    contribuicoes
  )
    .sort(
      (itemA, itemB) =>
        numeroSeguro(
          itemB.contribuicao
        ) -
        numeroSeguro(
          itemA.contribuicao
        )
    )
    .slice(
      0,
      quantidade
    );
}


/* =========================================================
   26. MENORES NOTAS
   ========================================================= */

function obterMenoresContribuicoes(
  contribuicoes,
  quantidade = 3
) {
  if (
    !contribuicoes ||
    typeof contribuicoes !==
      "object"
  ) {
    return [];
  }

  return Object.values(
    contribuicoes
  )
    .sort(
      (itemA, itemB) =>
        numeroSeguro(
          itemA.nota
        ) -
        numeroSeguro(
          itemB.nota
        )
    )
    .slice(
      0,
      quantidade
    );
}


/* =========================================================
   27. GERAÇÃO DA EXPLICAÇÃO
   ========================================================= */

function gerarExplicacaoEstatistica(
  resultado
) {
  if (
    !resultado ||
    resultado.erro
  ) {
    return {
      resumo:
        "Não foi possível calcular a nota.",

      pontosFortes: [],

      pontosAtencao: []
    };
  }

  const melhores =
    obterPrincipaisContribuicoes(
      resultado.contribuicoes,
      3
    );

  const menores =
    obterMenoresContribuicoes(
      resultado.contribuicoes,
      3
    );

  const pontosFortes =
    melhores.map(
      (item) =>
        `${item.nome}: ` +
        `nota ${Math.round(
          item.nota
        )}, peso ${formatarDecimal(
          item.peso,
          0
        )}% e contribuição de ` +
        `${item.contribuicao.toFixed(
          2
        )} pontos.`
    );

  const pontosAtencao =
    menores.map(
      (item) =>
        `${item.nome}: ` +
        `nota ${Math.round(
          item.nota
        )}, abaixo dos principais ` +
        "componentes da análise."
    );

  return {
    resumo:
      `Nota final de ` +
      `${resultado.notaFinal.toFixed(
        1
      )}, classificada como ` +
      `${classificarNotaFinal(
        resultado.notaFinal
      )}.`,

    pontosFortes,

    pontosAtencao
  };
}


/* =========================================================
   28. EXECUÇÃO COMPLETA DO MOTOR
   Porta principal para outros módulos.
   ========================================================= */

function executarMotorEstatistico(
  dadosAnalise
) {
  const codigoPosicao =
    String(
      dadosAnalise?.posicao ||
      ""
    )
      .toUpperCase()
      .trim();

  const notas =
    dadosAnalise?.notas || {};

   const score =
    calcularScoreEstatistico(
        dadosAnalise
    );

  const resultadoNota =
    calcularNotaFinal(
      notas,
      codigoPosicao
    );

  const explicacao =
    gerarExplicacaoEstatistica(
      resultadoNota
    );

  const perfil =
    PERFIS_POSICAO[
      codigoPosicao
    ] || null;

  return {
    motor: {
      nome:
        MOTOR_ESTATISTICO.nome,

      nomeEspecializado:
        obterNomeDoMotor(
          codigoPosicao
        ),

      versao:
        MOTOR_ESTATISTICO.versao,

      status:
        MOTOR_ESTATISTICO.status,

      quantidadeCriterios:
        MOTOR_ESTATISTICO
          .quantidadeCriterios
    },

     score,
     
    jogadorId:
      dadosAnalise?.jogadorId ||
      null,

    posicao:
      codigoPosicao || null,

    nomePosicao:
      perfil?.nome ||
      codigoPosicao ||
      "Não informada",

    prioridades:
      perfil?.prioridades || [],

    notaFinal:
      resultadoNota.notaFinal,

    classificacao:
      classificarNotaFinal(
        resultadoNota.notaFinal
      ),

    pesosAplicados:
      resultadoNota.pesosAplicados,

    contribuicoes:
      resultadoNota.contribuicoes,

    explicacao,

    erro:
      resultadoNota.erro
  };
}

/* =========================================================
   28. SCORE ESTATÍSTICO COMPLETO
   ========================================================= */

function calcularScoreEstatistico(
  jogador
) {

  const historico =
    jogador.historico || [];

  const ultimas3 =
    historico.slice(-3);

  const ultimas5 =
    historico.slice(-5);

  const ultimas10 =
    historico.slice(-10);

  return {

    media3:
      calcularMedia(ultimas3),

    media5:
      calcularMedia(ultimas5),

    media10:
      calcularMedia(ultimas10),

    mediana:
      calcularMediana(historico),

    regularidade:
      calcularRegularidade(historico),

    tendencia:
      calcularTendencia(historico),

    desvioPadrao:
      calcularDesvioPadrao(historico),

    amplitude:
      calcularAmplitude(historico),

    frequenciaNegativa:
      calcularFrequenciaNegativa(historico)

  };

}


/* =========================================================
   29. COMPARAÇÃO ENTRE DOIS RESULTADOS
   ========================================================= */

function compararResultadosEstatisticos(
  resultadoA,
  resultadoB
) {
  const notaA =
    numeroSeguro(
      resultadoA?.notaFinal
    );

  const notaB =
    numeroSeguro(
      resultadoB?.notaFinal
    );

  const diferenca =
    notaA - notaB;

  let vencedor = "empate";

  if (diferenca > 0) {
    vencedor = "A";
  } else if (diferenca < 0) {
    vencedor = "B";
  }

  return {
    vencedor,
    notaA,
    notaB,
    diferenca:
      Math.abs(diferenca)
  };
}


/* =========================================================
   30. COMPARAÇÃO DETALHADA DOS CRITÉRIOS
   ========================================================= */

function compararContribuicoes(
  resultadoA,
  resultadoB
) {
  const contribuicoesA =
    resultadoA?.contribuicoes ||
    {};

  const contribuicoesB =
    resultadoB?.contribuicoes ||
    {};

  const criterios =
    new Set([
      ...Object.keys(
        contribuicoesA
      ),

      ...Object.keys(
        contribuicoesB
      )
    ]);

  return [...criterios]
    .map(
      (criterio) => {
        const itemA =
          contribuicoesA[
            criterio
          ] || {};

        const itemB =
          contribuicoesB[
            criterio
          ] || {};

        const contribuicaoA =
          numeroSeguro(
            itemA.contribuicao
          );

        const contribuicaoB =
          numeroSeguro(
            itemB.contribuicao
          );

        return {
          criterio,

          nome:
            itemA.nome ||
            itemB.nome ||
            NOMES_CRITERIOS[
              criterio
            ] ||
            criterio,

          notaA:
            numeroSeguro(
              itemA.nota
            ),

          notaB:
            numeroSeguro(
              itemB.nota
            ),

          pesoA:
            numeroSeguro(
              itemA.peso
            ),

          pesoB:
            numeroSeguro(
              itemB.peso
            ),

          contribuicaoA,

          contribuicaoB,

          diferenca:
            contribuicaoA -
            contribuicaoB,

          vencedor:
            contribuicaoA >
            contribuicaoB
              ? "A"
              : contribuicaoB >
                contribuicaoA
                ? "B"
                : "empate"
        };
      }
    )
    .sort(
      (itemA, itemB) =>
        Math.abs(
          itemB.diferenca
        ) -
        Math.abs(
          itemA.diferenca
        )
    );
}


/* =========================================================
   31. EXPLICAÇÃO DE POR QUE UM FICOU À FRENTE
   ========================================================= */

function explicarDiferencaResultados(
  resultadoA,
  resultadoB,
  quantidade = 3
) {
  const comparacaoGeral =
    compararResultadosEstatisticos(
      resultadoA,
      resultadoB
    );

  const criterios =
    compararContribuicoes(
      resultadoA,
      resultadoB
    );

  const favoraveisA =
    criterios
      .filter(
        (item) =>
          item.diferenca > 0
      )
      .slice(
        0,
        quantidade
      );

  const favoraveisB =
    criterios
      .filter(
        (item) =>
          item.diferenca < 0
      )
      .slice(
        0,
        quantidade
      );

  return {
    vencedor:
      comparacaoGeral.vencedor,

    diferencaFinal:
      comparacaoGeral.diferenca,

    criteriosFavoraveisA:
      favoraveisA,

    criteriosFavoraveisB:
      favoraveisB,

    resumo:
      criarResumoComparacao(
        comparacaoGeral,
        favoraveisA,
        favoraveisB
      )
  };
}


/* =========================================================
   32. RESUMO TEXTUAL DA COMPARAÇÃO
   ========================================================= */

function criarResumoComparacao(
  comparacao,
  favoraveisA,
  favoraveisB
) {
  if (
    comparacao.vencedor ===
    "empate"
  ) {
    return (
      "Os dois jogadores possuem " +
      "a mesma nota final."
    );
  }

  const vencedor =
    comparacao.vencedor;

  const principais =
    vencedor === "A"
      ? favoraveisA
      : favoraveisB;

  const nomes =
    principais
      .map(
        (item) => item.nome
      )
      .join(", ");

  return (
    `O jogador ${vencedor} ficou ` +
    `à frente por ` +
    `${comparacao.diferenca.toFixed(
      1
    )} ponto(s).` +
    (
      nomes
        ? ` Os critérios que mais ` +
          `contribuíram foram: ${nomes}.`
        : ""
    )
  );
}


/* =========================================================
   33. RESUMO DO MOTOR
   ========================================================= */

function obterResumoMotorEstatistico(
  codigoPosicao = "GOL"
) {
  const validacao =
    validarPesosEstatisticos(
      codigoPosicao
    );

  return {
    nome:
      MOTOR_ESTATISTICO.nome,

    nomeEspecializado:
      obterNomeDoMotor(
        codigoPosicao
      ),

    versao:
      MOTOR_ESTATISTICO.versao,

    status:
      MOTOR_ESTATISTICO.status,

    quantidadeCriterios:
      MOTOR_ESTATISTICO
        .quantidadeCriterios,

    posicao:
      codigoPosicao,

    totalPesos:
      validacao.total,

    pesosValidos:
      validacao.valido,

    criterios:
      Object.entries(
        validacao.pesos
      ).map(
        ([criterio, peso]) => ({
          id: criterio,

          nome:
            NOMES_CRITERIOS[
              criterio
            ] || criterio,

          peso
        })
      )
  };
}


/* =========================================================
   34. VALIDAÇÃO AUTOMÁTICA DOS PERFIS
   ========================================================= */

function validarMotoresPorPosicao() {
  const posicoes = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];

  return posicoes.map(
    (posicao) =>
      validarPesosEstatisticos(
        posicao
      )
  );
}


const VALIDACAO_MOTORES =
  validarMotoresPorPosicao();


console.info(
  "Motor Estatístico carregado:",
  {
    motor:
      MOTOR_ESTATISTICO,

    validacoes:
      VALIDACAO_MOTORES
  }
);
