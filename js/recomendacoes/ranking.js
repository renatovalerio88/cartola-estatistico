/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — filtros, ranking e destaques
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

      botao.type = "button";

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

  botoes.forEach((botao) => {
    const ativo =
      botao.dataset.position ===
      codigoPosicao;

    botao.classList.toggle(
      "active",
      ativo
    );

    botao.setAttribute(
      "aria-pressed",
      String(ativo)
    );
  });
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
    ) || null
  );
}


/* =========================================================
   6. JOGADORES DE UMA POSIÇÃO
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

  return jogadores
    .filter(
      (jogador) =>
        jogador.posicao ===
        codigoPosicao
    )
    .sort(compararJogadoresRanking)
    .slice(0, limite);
}


/* =========================================================
   7. ORDENAÇÃO DO RANKING
   ========================================================= */

function compararJogadoresRanking(
  jogadorA,
  jogadorB
) {

  const diferencaProjecao =
    numeroSeguro(jogadorB.projecao) -
    numeroSeguro(jogadorA.projecao);

  if (diferencaProjecao !== 0) {
    return diferencaProjecao;
  }

  const diferencaScore =
    numeroSeguro(jogadorB.score) -
    numeroSeguro(jogadorA.score);

  if (diferencaScore !== 0) {
    return diferencaScore;
  }

  const diferencaConfianca =
    numeroSeguro(jogadorB.confiancaNumerica) -
    numeroSeguro(jogadorA.confiancaNumerica);

  if (diferencaConfianca !== 0) {
    return diferencaConfianca;
  }

  const diferencaRisco =
    numeroSeguro(jogadorA.risco) -
    numeroSeguro(jogadorB.risco);

  if (diferencaRisco !== 0) {
    return diferencaRisco;
  }

  return String(
    jogadorA.nome || ""
  ).localeCompare(
    String(jogadorB.nome || ""),
    "pt-BR"
  );

}


/* =========================================================
   8. NOTA UTILIZADA NO RANKING
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
   9. INTEGRAÇÃO INICIAL COM O MOTOR
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
      jogador?.id || null,

    posicao:
      jogador?.posicao || null,

    notas
  });
}


/* =========================================================
   10. PREPARAÇÃO DAS NOTAS DO MOTOR
   ========================================================= */

function obterNotasMotorDoJogador(
  jogador
) {
  const componentes =
    ehObjetoValido(
      jogador?.componentes
    )
      ? jogador.componentes
      : {};

  return {
    formaRecente:
      obterNotaComponente(
        componentes,
        [
          "formaRecente",
          "Forma recente",
          "forma recente"
        ],
        converterPontuacaoEmNota(
          jogador?.mediaRecente
        )
      ),

    mediaGeral:
      obterNotaComponente(
        componentes,
        [
          "mediaGeral",
          "Média geral",
          "media geral"
        ],
        converterPontuacaoEmNota(
          jogador?.mediaGeral
        )
      ),

    mediana:
      obterNotaComponente(
        componentes,
        [
          "mediana",
          "Mediana"
        ],
        converterPontuacaoEmNota(
          jogador?.mediana
        )
      ),

    regularidade:
      obterNotaComponente(
        componentes,
        [
          "regularidade",
          "Regularidade"
        ],
        jogador?.regularidade
      ),

    pontuacaoBasica:
      obterNotaComponente(
        componentes,
        [
          "pontuacaoBasica",
          "Pontuação básica",
          "pontuacao basica"
        ],
        jogador?.pontuacaoBasica
      ),

    scoutsOfensivos:
      obterNotaComponente(
        componentes,
        [
          "scoutsOfensivos",
          "Scouts ofensivos",
          "scouts ofensivos"
        ],
        jogador?.notaScoutsOfensivos
      ),

    scoutsDefensivos:
      obterNotaComponente(
        componentes,
        [
          "scoutsDefensivos",
          "Scouts defensivos",
          "scouts defensivos"
        ],
        jogador?.notaScoutsDefensivos
      ),

    casaFora:
      obterNotaComponente(
        componentes,
        [
          "casaFora",
          "Casa ou fora",
          "Casa/Fora"
        ],
        jogador?.notaCasaFora
      ),

    forcaAdversario:
      obterNotaComponente(
        componentes,
        [
          "forcaAdversario",
          "Força do adversário",
          "Confronto"
        ],
        jogador?.notaConfronto
      ),

    pontosCedidos:
      obterNotaComponente(
        componentes,
        [
          "pontosCedidos",
          "Pontos cedidos"
        ],
        jogador?.notaPontosCedidos
      ),

    chanceSG:
      obterNotaComponente(
        componentes,
        [
          "chanceSG",
          "Chance de SG",
          "SG"
        ],
        jogador?.chanceSG
      ),

    titularidade:
      obterNotaComponente(
        componentes,
        [
          "titularidade",
          "Titularidade"
        ],
        jogador?.titularidade
      ),

    minutosEsperados:
      obterNotaComponente(
        componentes,
        [
          "minutosEsperados",
          "Minutos esperados"
        ],
        converterMinutosEmNota(
          jogador?.minutosEsperados
        )
      ),

    bolaParada:
      obterNotaBooleana(
        jogador?.cobraBolaParada
      ),

    penaltis:
      obterNotaBooleana(
        jogador?.cobraPenalti
      ),

    custoBeneficio:
      converterCustoBeneficioEmNota(
        jogador?.custoBeneficio
      ),

    tendenciaRecente:
      obterNotaTendenciaJogador(
        jogador
      ),

    riscoNegativar:
      converterRiscoEmNotaPositiva(
        jogador?.riscoNegativar,
        jogador?.risco
      )
  };
}


/* =========================================================
   11. LEITURA FLEXÍVEL DOS COMPONENTES
   ========================================================= */

function obterNotaComponente(
  componentes,
  nomesPossiveis,
  valorAlternativo = 0
) {
  for (
    const nome of nomesPossiveis
  ) {
    if (
      Object.prototype
        .hasOwnProperty.call(
          componentes,
          nome
        )
    ) {
      return limitarValor(
        componentes[nome],
        0,
        100
      );
    }
  }

  return limitarValor(
    valorAlternativo,
    0,
    100
  );
}


/* =========================================================
   12. CONVERSÃO DE PONTUAÇÃO PARA NOTA
   ========================================================= */

function converterPontuacaoEmNota(
  pontuacao
) {
  const valor =
    numeroSeguro(pontuacao);

  return limitarValor(
    valor * 10,
    0,
    100
  );
}


/* =========================================================
   13. CONVERSÃO DOS MINUTOS
   ========================================================= */

function converterMinutosEmNota(
  minutos
) {
  const valor =
    numeroSeguro(minutos);

  return limitarValor(
    (
      valor /
      90
    ) * 100,
    0,
    100
  );
}


/* =========================================================
   14. NOTAS BOOLEANAS
   ========================================================= */

function obterNotaBooleana(
  condicao
) {
  return condicao
    ? 100
    : 0;
}


/* =========================================================
   15. CUSTO-BENEFÍCIO NORMALIZADO
   ========================================================= */

function converterCustoBeneficioEmNota(
  custoBeneficio
) {
  const valor =
    numeroSeguro(
      custoBeneficio
    );

  return limitarValor(
    valor * 80,
    0,
    100
  );
}


/* =========================================================
   16. TENDÊNCIA RECENTE
   ========================================================= */

function obterNotaTendenciaJogador(
  jogador
) {
  const historico =
    jogador?.ultimasPontuacoes ||
    jogador?.historicoPontuacoes ||
    jogador?.pontuacoesRecentes;

  if (
    Array.isArray(historico) &&
    typeof calcularTendencia ===
      "function"
  ) {
    return calcularTendencia(
      historico
    ).nota;
  }

  const mediaRecente =
    numeroSeguro(
      jogador?.mediaRecente
    );

  const mediaGeral =
    numeroSeguro(
      jogador?.mediaGeral
    );

  const diferenca =
    mediaRecente -
    mediaGeral;

  return limitarValor(
    50 + diferenca * 10,
    0,
    100
  );
}


/* =========================================================
   17. RISCO CONVERTIDO EM NOTA POSITIVA
   Quanto menor o risco, maior a nota.
   ========================================================= */

function converterRiscoEmNotaPositiva(
  riscoNumerico,
  riscoTexto
) {
  const numero =
    Number(riscoNumerico);

  if (Number.isFinite(numero)) {
    return limitarValor(
      100 - numero,
      0,
      100
    );
  }

  const texto =
    normalizarTexto(
      riscoTexto
    );

  if (
    texto === "baixo" ||
    texto === "baixa"
  ) {
    return 90;
  }

  if (
    texto === "alto" ||
    texto === "alta"
  ) {
    return 30;
  }

  return 60;
}


/* =========================================================
   18. DESTAQUES DO TOPO
   ========================================================= */

function exibirDestaquesGerais() {
  const jogadores =
    obterJogadoresCarregados();

  if (
    !Array.isArray(jogadores) ||
    jogadores.length === 0
  ) {
    limparDestaquesGerais();
    return;
  }

  const maiorProjecao =
    obterMaiorPorCampo(
      jogadores,
      "projecao"
    );

  const maiorConfianca =
    obterMaiorPorCampo(
      jogadores,
      "confiancaNumerica"
    );

  const melhorCustoBeneficio =
    obterMaiorPorCampo(
      jogadores,
      "custoBeneficio"
    );

  exibirDestaque(
    "bestProjection",
    "bestProjectionName",
    maiorProjecao,
    formatarPontos(
      maiorProjecao?.projecao
    )
  );

  exibirDestaque(
    "bestConfidence",
    "bestConfidenceName",
    maiorConfianca,
    formatarPorcentagem(
      maiorConfianca
        ?.confiancaNumerica
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
   19. MAIOR VALOR DE UM CAMPO
   ========================================================= */

function obterMaiorPorCampo(
  jogadores,
  campo
) {
  return [...jogadores].sort(
    (jogadorA, jogadorB) =>
      numeroSeguro(
        jogadorB?.[campo]
      ) -
      numeroSeguro(
        jogadorA?.[campo]
      )
  )[0] || null;
}


/* =========================================================
   20. EXIBIÇÃO DE UM DESTAQUE
   ========================================================= */

function exibirDestaque(
  idValor,
  idNome,
  jogador,
  valorFormatado
) {
  definirTextoElemento(
    idValor,
    valorFormatado || "--"
  );

  definirTextoElemento(
    idNome,
    jogador
      ? (
          jogador.apelido ||
          jogador.nome ||
          "Jogador"
        )
      : "Aguardando dados"
  );
}


/* =========================================================
   21. LIMPEZA DOS DESTAQUES
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
   22. COMPARAÇÃO ENTRE COLOCAÇÕES
   Preparado para o recurso:
   "Por que ficou em 1º e não em 2º?"
   ========================================================= */

function compararJogadoresDoRanking(
  jogadorA,
  jogadorB
) {
  if (!jogadorA || !jogadorB) {
    return null;
  }

  const resultadoA =
    calcularNotaJogadorComMotor(
      jogadorA
    );

  const resultadoB =
    calcularNotaJogadorComMotor(
      jogadorB
    );

  const comparacao =
    typeof compararResultadosEstatisticos ===
      "function"
      ? compararResultadosEstatisticos(
          resultadoA,
          resultadoB
        )
      : {
          vencedor:
            obterNotaRanking(jogadorA) >=
            obterNotaRanking(jogadorB)
              ? "A"
              : "B",

          notaA:
            obterNotaRanking(jogadorA),

          notaB:
            obterNotaRanking(jogadorB),

          diferenca:
            Math.abs(
              obterNotaRanking(jogadorA) -
              obterNotaRanking(jogadorB)
            )
        };

  return {
    jogadorA: {
      id: jogadorA.id,
      nome:
        jogadorA.apelido ||
        jogadorA.nome,
      nota:
        comparacao.notaA
    },

    jogadorB: {
      id: jogadorB.id,
      nome:
        jogadorB.apelido ||
        jogadorB.nome,
      nota:
        comparacao.notaB
    },

    vencedor:
      comparacao.vencedor,

    diferenca:
      comparacao.diferenca
  };
}
