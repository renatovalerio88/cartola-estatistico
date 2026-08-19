/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — filtros, ranking, viabilidade e destaques
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

   A viabilidade passa a participar da seleção.

   Jogadores claramente inviáveis são retirados quando
   o motor de viabilidade fornecer essa informação.

   Caso o motor ainda não esteja disponível, o ranking
   continua funcionando normalmente.
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

  /*
   * Proteção:
   *
   * Se a filtragem de viabilidade deixar poucas opções,
   * o sistema não quebra o ranking.
   *
   * Nesse caso utilizamos todos os jogadores da posição,
   * mas a ordenação continua penalizando os menos viáveis.
   */

  const baseRanking =
    jogadoresViaveis.length >=
    limite
      ? jogadoresViaveis
      : jogadoresPosicao;

  return baseRanking
    .sort(compararJogadoresRanking)
    .slice(0, limite);
}


/* =========================================================
   7. LEITURA DO MOTOR DE VIABILIDADE
   ========================================================= */

function obterViabilidadeRanking(
  jogador
) {
  if (!jogador) {
    return {
      disponivel: true,
      elegivel: true,
      viavel: true,
      titularProvavel: false,
      nota: 50,
      penalidade: 0,
      classificacao: "neutra",
      motivos: []
    };
  }

  /*
   * Preferência 1:
   * função pública do novo motor.
   */

  if (
    typeof avaliarViabilidadeJogador ===
    "function"
  ) {
    try {
      const resultado =
        avaliarViabilidadeJogador(
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
        "Falha ao avaliar viabilidade:",
        jogador?.id,
        erro
      );
    }
  }

  /*
   * Preferência 2:
   * objeto global MotorViabilidade.
   */

  if (
    typeof MotorViabilidade !==
      "undefined" &&
    MotorViabilidade
  ) {
    const funcoesPossiveis = [
      "avaliar",
      "calcular",
      "analisar",
      "avaliarJogador"
    ];

    for (
      const nomeFuncao of
      funcoesPossiveis
    ) {
      if (
        typeof MotorViabilidade[
          nomeFuncao
        ] === "function"
      ) {
        try {
          const resultado =
            MotorViabilidade[
              nomeFuncao
            ](
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
    }
  }

  /*
   * Preferência 3:
   * dados já anexados ao jogador.
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
   * Fallback defensivo baseado nos dados
   * já disponíveis no jogador.
   */

  return calcularViabilidadeFallback(
    jogador
  );
}


/* =========================================================
   8. NORMALIZAÇÃO DA VIABILIDADE
   ========================================================= */

function normalizarViabilidadeRanking(
  resultado,
  jogador
) {
  const notaPossivel =
    primeiroNumeroValido([
      resultado.nota,
      resultado.score,
      resultado.notaViabilidade,
      resultado.indice,
      resultado.indiceViabilidade
    ]);

  const penalidadePossivel =
    primeiroNumeroValido([
      resultado.penalidade,
      resultado.penalidadeRanking,
      resultado.desconto
    ]);

  const disponivel =
    primeiroBooleanoValido([
      resultado.disponivel,
      resultado.apto,
      resultado.ativo
    ]);

  const elegivel =
    primeiroBooleanoValido([
      resultado.elegivel,
      resultado.podeEscalar,
      resultado.escalavel
    ]);

  const viavel =
    primeiroBooleanoValido([
      resultado.viavel,
      resultado.recomendavel,
      resultado.aprovado
    ]);

  const titularProvavel =
    primeiroBooleanoValido([
      resultado.titularProvavel,
      resultado.provavelTitular,
      resultado.titular
    ]);

  return {
    disponivel:
      disponivel !== null
        ? disponivel
        : true,

    elegivel:
      elegivel !== null
        ? elegivel
        : true,

    viavel:
      viavel !== null
        ? viavel
        : true,

    titularProvavel:
      titularProvavel !== null
        ? titularProvavel
        : inferirTitularidade(
            jogador
          ),

    nota:
      limitarValor(
        notaPossivel !== null
          ? notaPossivel
          : 50,
        0,
        100
      ),

    penalidade:
      limitarValor(
        penalidadePossivel !== null
          ? penalidadePossivel
          : 0,
        0,
        100
      ),

    classificacao:
      String(
        resultado.classificacao ||
        resultado.status ||
        resultado.nivel ||
        "neutra"
      ),

    motivos:
      normalizarListaMotivos(
        resultado.motivos ||
        resultado.justificativas ||
        resultado.alertas
      )
  };
}


/* =========================================================
   9. VIABILIDADE FALLBACK

   Essa camada evita que jogadores com sinais ruins de
   disponibilidade/titularidade tenham o mesmo tratamento
   de jogadores claramente utilizáveis na rodada.
   ========================================================= */

function calcularViabilidadeFallback(
  jogador
) {
  let nota = 50;
  let penalidade = 0;

  const motivos = [];

  const titularidade =
    numeroSeguro(
      jogador?.titularidade
    );

  const minutosEsperados =
    numeroSeguro(
      jogador?.minutosEsperados
    );

  const statusId =
    Number(
      jogador?.statusId
    );

  const entrouEmCampo =
    jogador?.entrouEmCampo;

  const titularProvavel =
    inferirTitularidade(
      jogador
    );

  /*
   * Status 7 na API do Cartola corresponde
   * tradicionalmente a provável.
   *
   * Não excluímos automaticamente outros status aqui,
   * porque o motor de viabilidade é a fonte principal.
   */

  if (statusId === 7) {
    nota += 25;

    motivos.push(
      "Status provável"
    );
  }

  if (titularProvavel) {
    nota += 20;

    motivos.push(
      "Boa indicação de titularidade"
    );
  }

  if (titularidade >= 80) {
    nota += 15;
  } else if (
    titularidade > 0 &&
    titularidade < 50
  ) {
    penalidade += 20;

    motivos.push(
      "Titularidade baixa"
    );
  }

  if (minutosEsperados >= 70) {
    nota += 10;
  } else if (
    minutosEsperados > 0 &&
    minutosEsperados < 45
  ) {
    penalidade += 20;

    motivos.push(
      "Poucos minutos esperados"
    );
  }

  if (entrouEmCampo === false) {
    penalidade += 10;
  }

  nota =
    limitarValor(
      nota - penalidade,
      0,
      100
    );

  return {
    disponivel: true,
    elegivel: true,
    viavel: true,
    titularProvavel,
    nota,
    penalidade,
    classificacao:
      nota >= 75
        ? "alta"
        : nota >= 50
          ? "media"
          : "baixa",
    motivos
  };
}


/* =========================================================
   10. TITULARIDADE PROVÁVEL
   ========================================================= */

function inferirTitularidade(
  jogador
) {
  if (!jogador) {
    return false;
  }

  const camposBooleanos = [
    jogador.titular,
    jogador.titularProvavel,
    jogador.provavelTitular,
    jogador.escaladoComoTitular
  ];

  const booleano =
    primeiroBooleanoValido(
      camposBooleanos
    );

  if (booleano !== null) {
    return booleano;
  }

  const titularidade =
    numeroSeguro(
      jogador.titularidade
    );

  if (titularidade >= 70) {
    return true;
  }

  const minutos =
    numeroSeguro(
      jogador.minutosEsperados
    );

  if (minutos >= 70) {
    return true;
  }

  const statusId =
    Number(
      jogador.statusId
    );

  if (statusId === 7) {
    return true;
  }

  return false;
}


/* =========================================================
   11. JOGADOR VIÁVEL PARA O RANKING
   ========================================================= */

function jogadorEhViavelParaRanking(
  jogador
) {
  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );

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
   12. NOTA DE VIABILIDADE PARA ORDENAÇÃO
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
      viabilidade.nota
    );

  if (
    viabilidade.titularProvavel
  ) {
    nota += 10;
  }

  if (
    viabilidade.disponivel ===
    false
  ) {
    nota -= 100;
  }

  if (
    viabilidade.elegivel ===
    false
  ) {
    nota -= 100;
  }

  if (
    viabilidade.viavel ===
    false
  ) {
    nota -= 100;
  }

  nota -=
    numeroSeguro(
      viabilidade.penalidade
    );

  return nota;
}


/* =========================================================
   13. PROJEÇÃO UTILIZADA NO RANKING
   ========================================================= */

function obterProjecaoRanking(
  jogador
) {
  const projecaoCalibrada =
    Number(
      jogador?.projecaoCalibrada
    );

  if (
    Number.isFinite(
      projecaoCalibrada
    )
  ) {
    return projecaoCalibrada;
  }

  const projecao =
    Number(
      jogador?.projecao
    );

  if (
    Number.isFinite(
      projecao
    )
  ) {
    return projecao;
  }

  const projecaoOriginal =
    Number(
      jogador?.projecaoOriginal
    );

  if (
    Number.isFinite(
      projecaoOriginal
    )
  ) {
    return projecaoOriginal;
  }

  return 0;
}


/* =========================================================
   14. ORDENAÇÃO DO RANKING

   Prioridade:
   1. Disponibilidade/elegibilidade
   2. Titularidade provável
   3. Viabilidade
   4. Projeção
   5. Nota estatística
   6. Confiança
   7. Menor risco

   A projeção continua muito importante, mas um jogador
   com projeção alta não deve superar automaticamente
   outro muito mais seguro para a rodada.
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

  const aptoA =
    viabilidadeA.disponivel !== false &&
    viabilidadeA.elegivel !== false &&
    viabilidadeA.viavel !== false;

  const aptoB =
    viabilidadeB.disponivel !== false &&
    viabilidadeB.elegivel !== false &&
    viabilidadeB.viavel !== false;

  if (aptoA !== aptoB) {
    return aptoA ? -1 : 1;
  }

  if (
    viabilidadeA.titularProvavel !==
    viabilidadeB.titularProvavel
  ) {
    return viabilidadeA.titularProvavel
      ? -1
      : 1;
  }

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
    ) >= 10
  ) {
    return diferencaViabilidade;
  }

  const diferencaProjecao =
    obterProjecaoRanking(
      jogadorB
    ) -
    obterProjecaoRanking(
      jogadorA
    );

  if (diferencaProjecao !== 0) {
    return diferencaProjecao;
  }

  const diferencaNota =
    obterNotaRanking(
      jogadorB
    ) -
    obterNotaRanking(
      jogadorA
    );

  if (diferencaNota !== 0) {
    return diferencaNota;
  }

  const diferencaScore =
    numeroSeguro(
      jogadorB.score
    ) -
    numeroSeguro(
      jogadorA.score
    );

  if (diferencaScore !== 0) {
    return diferencaScore;
  }

  const diferencaConfianca =
    numeroSeguro(
      jogadorB.confiancaNumerica
    ) -
    numeroSeguro(
      jogadorA.confiancaNumerica
    );

  if (diferencaConfianca !== 0) {
    return diferencaConfianca;
  }

  const diferencaRisco =
    numeroSeguro(
      jogadorA.risco
    ) -
    numeroSeguro(
      jogadorB.risco
    );

  if (diferencaRisco !== 0) {
    return diferencaRisco;
  }

  return String(
    jogadorA.nome ||
    jogadorA.apelido ||
    ""
  ).localeCompare(
    String(
      jogadorB.nome ||
      jogadorB.apelido ||
      ""
    ),
    "pt-BR"
  );
}


/* =========================================================
   15. NOTA UTILIZADA NO RANKING
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
   16. INTEGRAÇÃO COM O MOTOR ESTATÍSTICO
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
   17. PREPARAÇÃO DAS NOTAS DO MOTOR
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

  const viabilidade =
    obterViabilidadeRanking(
      jogador
    );

  const titularidadeBase =
    obterNotaComponente(
      componentes,
      [
        "titularidade",
        "Titularidade"
      ],
      jogador?.titularidade
    );

  const titularidadeAjustada =
    viabilidade.titularProvavel
      ? Math.max(
          titularidadeBase,
          85
        )
      : titularidadeBase;

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
      limitarValor(
        titularidadeAjustada,
        0,
        100
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
   18. LEITURA FLEXÍVEL DOS COMPONENTES
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
   19. CONVERSÃO DE PONTUAÇÃO PARA NOTA
   ========================================================= */

function converterPontuacaoEmNota(
  pontuacao
) {
  const valor =
    numeroSeguro(
      pontuacao
    );

  return limitarValor(
    valor * 10,
    0,
    100
  );
}


/* =========================================================
   20. CONVERSÃO DOS MINUTOS
   ========================================================= */

function converterMinutosEmNota(
  minutos
) {
  const valor =
    numeroSeguro(
      minutos
    );

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
   21. NOTAS BOOLEANAS
   ========================================================= */

function obterNotaBooleana(
  condicao
) {
  return condicao
    ? 100
    : 0;
}


/* =========================================================
   22. CUSTO-BENEFÍCIO NORMALIZADO
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
   23. TENDÊNCIA RECENTE
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
   24. RISCO CONVERTIDO EM NOTA POSITIVA
   Quanto menor o risco, maior a nota.
   ========================================================= */

function converterRiscoEmNotaPositiva(
  riscoNumerico,
  riscoTexto
) {
  const numero =
    Number(
      riscoNumerico
    );

  if (
    Number.isFinite(numero)
  ) {
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
   25. UTILITÁRIOS DA VIABILIDADE
   ========================================================= */

function primeiroNumeroValido(
  valores
) {
  for (const valor of valores) {
    const numero =
      Number(valor);

    if (
      Number.isFinite(numero)
    ) {
      return numero;
    }
  }

  return null;
}


function primeiroBooleanoValido(
  valores
) {
  for (const valor of valores) {
    if (
      typeof valor ===
      "boolean"
    ) {
      return valor;
    }

    if (valor === 1) {
      return true;
    }

    if (valor === 0) {
      return false;
    }

    const texto =
      normalizarTexto(
        valor
      );

    if (
      texto === "sim" ||
      texto === "true" ||
      texto === "titular" ||
      texto === "provavel" ||
      texto === "provável"
    ) {
      return true;
    }

    if (
      texto === "nao" ||
      texto === "não" ||
      texto === "false" ||
      texto === "reserva" ||
      texto === "fora"
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
    Array.isArray(valor)
  ) {
    return valor
      .map(
        (item) =>
          String(item).trim()
      )
      .filter(Boolean);
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
   26. NOME CURTO DO JOGADOR
   ========================================================= */

function obterNomeCurtoRanking(
  jogador
) {
  if (!jogador) {
    return "Jogador";
  }

  const apelido =
    String(
      jogador.apelido ||
      ""
    ).trim();

  if (apelido) {
    return apelido;
  }

  const nome =
    String(
      jogador.nome ||
      ""
    ).trim();

  if (!nome) {
    return "Jogador";
  }

  const partes =
    nome
      .split(/\s+/)
      .filter(Boolean);

  if (
    partes.length <= 2
  ) {
    return nome;
  }

  return (
    `${partes[0]} ` +
    `${partes[partes.length - 1]}`
  );
}


/* =========================================================
   27. JOGADORES VIÁVEIS PARA DESTAQUES
   ========================================================= */

function obterJogadoresViaveisDestaques(
  jogadores
) {
  const viaveis =
    jogadores.filter(
      jogadorEhViavelParaRanking
    );

  if (viaveis.length > 0) {
    return viaveis;
  }

  return jogadores;
}


/* =========================================================
   28. DESTAQUES DO TOPO

   Os destaques também passam a respeitar viabilidade.
   Assim evitamos mostrar como "maior projeção" um atleta
   que o próprio sistema considera inadequado para a rodada.
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

  const jogadoresConsiderados =
    obterJogadoresViaveisDestaques(
      jogadores
    );

  const maiorProjecao =
    [...jogadoresConsiderados]
      .sort(
        compararJogadoresRanking
      )[0] || null;

  const maiorConfianca =
    obterMaiorPorCampo(
      jogadoresConsiderados,
      "confiancaNumerica"
    );

  const melhorCustoBeneficio =
    obterMaiorPorCampo(
      jogadoresConsiderados,
      "custoBeneficio"
    );

  exibirDestaque(
    "bestProjection",
    "bestProjectionName",
    maiorProjecao,
    formatarPontos(
      obterProjecaoRanking(
        maiorProjecao
      )
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
   29. MAIOR VALOR DE UM CAMPO
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
   30. EXIBIÇÃO DE UM DESTAQUE
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
      ? obterNomeCurtoRanking(
          jogador
        )
      : "Aguardando dados"
  );
}


/* =========================================================
   31. LIMPEZA DOS DESTAQUES
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
   32. COMPARAÇÃO ENTRE COLOCAÇÕES
   "Por que ficou em 1º e não em 2º?"
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

  const resultadoA =
    calcularNotaJogadorComMotor(
      jogadorA
    );

  const resultadoB =
    calcularNotaJogadorComMotor(
      jogadorB
    );

  const viabilidadeA =
    obterViabilidadeRanking(
      jogadorA
    );

  const viabilidadeB =
    obterViabilidadeRanking(
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
            compararJogadoresRanking(
              jogadorA,
              jogadorB
            ) <= 0
              ? "A"
              : "B",

          notaA:
            obterNotaRanking(
              jogadorA
            ),

          notaB:
            obterNotaRanking(
              jogadorB
            ),

          diferenca:
            Math.abs(
              obterNotaRanking(
                jogadorA
              ) -
              obterNotaRanking(
                jogadorB
              )
            )
        };

  return {
    jogadorA: {
      id:
        jogadorA.id,

      nome:
        obterNomeCurtoRanking(
          jogadorA
        ),

      nota:
        comparacao.notaA,

      projecao:
        obterProjecaoRanking(
          jogadorA
        ),

      viabilidade:
        viabilidadeA.nota,

      titularProvavel:
        viabilidadeA
          .titularProvavel,

      motivosViabilidade:
        viabilidadeA.motivos
    },

    jogadorB: {
      id:
        jogadorB.id,

      nome:
        obterNomeCurtoRanking(
          jogadorB
        ),

      nota:
        comparacao.notaB,

      projecao:
        obterProjecaoRanking(
          jogadorB
        ),

      viabilidade:
        viabilidadeB.nota,

      titularProvavel:
        viabilidadeB
          .titularProvavel,

      motivosViabilidade:
        viabilidadeB.motivos
    },

    vencedor:
      comparacao.vencedor,

    diferenca:
      comparacao.diferenca
  };
}
