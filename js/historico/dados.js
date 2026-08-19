/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — filtros, ranking e destaques

   Inclui:

   - filtros por posição;
   - ranking;
   - destaques;
   - integração com Motor Estatístico;
   - filtro de exclusão de clubes;
   - filtro de exclusão de jogadores;
   - sincronização automática com Times sugeridos.

   ========================================================= */


/* =========================================================
   1. POSIÇÕES
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
   2. UTILIDADES
   ========================================================= */


function numeroSeguro(
  valor,
  padrao = 0
) {

  const numero =
    Number(valor);


  return Number.isFinite(
    numero
  )
    ? numero
    : padrao;

}


function limitarValor(
  valor,
  minimo = 0,
  maximo = 100
) {

  return Math.max(
    minimo,
    Math.min(
      maximo,
      numeroSeguro(
        valor
      )
    )
  );

}


function normalizarTexto(
  valor
) {

  return String(
    valor ?? ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();

}


function definirTextoElemento(
  id,
  valor
) {

  const elemento =
    document.getElementById(
      id
    );


  if (elemento) {

    elemento.textContent =
      String(
        valor ?? ""
      );

  }

}


function ehObjetoValido(
  objeto
) {

  return Boolean(

    objeto &&

    typeof objeto ===
      "object" &&

    !Array.isArray(
      objeto
    ) &&

    Object.keys(
      objeto
    ).length > 0

  );

}


/* =========================================================
   3. FILTROS DE POSIÇÃO
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


  POSICOES_RECOMENDADAS
    .forEach(
      posicao => {

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
          typeof obterPosicaoAtiva ===
            "function"

            ? obterPosicaoAtiva()

            : "GOL";


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
   4. ALTERAR POSIÇÃO
   ========================================================= */


function alterarPosicaoAtiva(
  codigoPosicao
) {

  const codigo =
    String(
      codigoPosicao || ""
    ).toUpperCase();


  const existe =
    POSICOES_RECOMENDADAS.some(
      posicao =>
        posicao.id ===
        codigo
    );


  if (!existe) {

    return;

  }


  if (
    typeof definirPosicaoAtiva ===
      "function"
  ) {

    definirPosicaoAtiva(
      codigo
    );

  }


  atualizarFiltroAtivo(
    codigo
  );


  if (
    typeof exibirJogadoresDaPosicao ===
      "function"
  ) {

    exibirJogadoresDaPosicao();

  }

}


/* =========================================================
   5. FILTRO VISUAL ATIVO
   ========================================================= */


function atualizarFiltroAtivo(
  codigoPosicao
) {

  document
    .querySelectorAll(
      ".position-filter-button"
    )
    .forEach(
      botao => {

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
   6. CONFIGURAÇÃO DA POSIÇÃO
   ========================================================= */


function obterConfiguracaoPosicao(
  codigoPosicao
) {

  return (

    POSICOES_RECOMENDADAS.find(

      posicao =>
        posicao.id ===
        codigoPosicao

    )

    ||

    null

  );

}


/* =========================================================
   7. JOGADORES DISPONÍVEIS
   ========================================================= */


function obterJogadoresDisponiveisRanking() {

  if (
    typeof obterJogadores ===
      "function"
  ) {

    const jogadores =
      obterJogadores();


    if (
      Array.isArray(
        jogadores
      )
    ) {

      return jogadores;

    }

  }


  if (
    typeof obterJogadoresCarregados ===
      "function"
  ) {

    return obterJogadoresCarregados();

  }


  return [];

}


/* =========================================================
   8. JOGADORES DA POSIÇÃO
   ========================================================= */


function obterJogadoresDaPosicao(
  codigoPosicao
) {

  const codigo =
    String(
      codigoPosicao || ""
    ).toUpperCase();


  const configuracao =
    obterConfiguracaoPosicao(
      codigo
    );


  const limite =
    configuracao?.quantidade ||
    5;


  return obterJogadoresDisponiveisRanking()

    .filter(

      jogador =>
        String(
          jogador?.posicao || ""
        ).toUpperCase() ===
        codigo

    )

    .sort(
      compararJogadoresRanking
    )

    .slice(
      0,
      limite
    );

}


/* =========================================================
   9. PROJEÇÃO UTILIZADA
   ========================================================= */


function obterProjecaoRanking(
  jogador
) {

  const candidatos = [

    jogador?.projecao,

    jogador?.projecaoCalibrada,

    jogador?.projecaoOriginal

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


  return 0;

}


/* =========================================================
   10. NOTA UTILIZADA
   ========================================================= */


function obterNotaRanking(
  jogador
) {

  const candidatos = [

    jogador?.notaFinal,

    jogador?.nota,

    jogador?.score

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


  const resultado =
    calcularNotaJogadorComMotor(
      jogador
    );


  return numeroSeguro(
    resultado?.notaFinal
  );

}


/* =========================================================
   11. ORDENAÇÃO
   ========================================================= */


function compararJogadoresRanking(
  jogadorA,
  jogadorB
) {

  /*
   * Ranking primário:
   * projeção final.
   *
   * Depois:
   * nota estatística,
   * confiança,
   * regularidade,
   * menor risco.
   */


  const diferencaProjecao =

    obterProjecaoRanking(
      jogadorB
    )

    -

    obterProjecaoRanking(
      jogadorA
    );


  if (
    Math.abs(
      diferencaProjecao
    ) > 0.0001
  ) {

    return diferencaProjecao;

  }


  const diferencaNota =

    obterNotaRanking(
      jogadorB
    )

    -

    obterNotaRanking(
      jogadorA
    );


  if (
    Math.abs(
      diferencaNota
    ) > 0.0001
  ) {

    return diferencaNota;

  }


  const diferencaConfianca =

    numeroSeguro(

      jogadorB?.confiancaNumerica

      ??

      jogadorB?.confianca

    )

    -

    numeroSeguro(

      jogadorA?.confiancaNumerica

      ??

      jogadorA?.confianca

    );


  if (
    Math.abs(
      diferencaConfianca
    ) > 0.0001
  ) {

    return diferencaConfianca;

  }


  const diferencaRegularidade =

    numeroSeguro(
      jogadorB?.regularidade
    )

    -

    numeroSeguro(
      jogadorA?.regularidade
    );


  if (
    Math.abs(
      diferencaRegularidade
    ) > 0.0001
  ) {

    return diferencaRegularidade;

  }


  const diferencaRisco =

    numeroSeguro(
      jogadorA?.risco
    )

    -

    numeroSeguro(
      jogadorB?.risco
    );


  if (
    Math.abs(
      diferencaRisco
    ) > 0.0001
  ) {

    return diferencaRisco;

  }


  return String(

    jogadorA?.apelido

    ||

    jogadorA?.nome

    ||

    ""

  ).localeCompare(

    String(

      jogadorB?.apelido

      ||

      jogadorB?.nome

      ||

      ""

    ),

    "pt-BR"

  );

}


/* =========================================================
   12. NOTAS — LEITURA FLEXÍVEL
   ========================================================= */


function obterValorNotaJogador(
  jogador,
  chaves,
  padrao = 0
) {

  const fontes = [

    jogador?.notas,

    jogador?.componentes,

    jogador

  ];


  for (
    const fonte
    of fontes
  ) {

    if (
      !fonte ||
      typeof fonte !==
        "object"
    ) {

      continue;

    }


    for (
      const chave
      of chaves
    ) {

      if (
        Object.prototype
          .hasOwnProperty
          .call(
            fonte,
            chave
          )
      ) {

        const valor =
          Number(
            fonte[chave]
          );


        if (
          Number.isFinite(
            valor
          )
        ) {

          return limitarValor(
            valor,
            0,
            100
          );

        }

      }

    }

  }


  return limitarValor(
    padrao,
    0,
    100
  );

}


/* =========================================================
   13. CONVERTER PONTOS EM NOTA
   ========================================================= */


function converterPontuacaoEmNota(
  pontuacao
) {

  const numero =
    Number(
      pontuacao
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return 0;

  }


  /*
   * -2 pts -> 0
   * 15 pts -> 100
   */

  return limitarValor(

    (
      (
        numero + 2
      )
      /
      17
    )
    *
    100,

    0,

    100

  );

}


/* =========================================================
   14. MINUTOS
   ========================================================= */


function converterMinutosEmNota(
  minutos
) {

  const numero =
    Number(
      minutos
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return 0;

  }


  /*
   * O projeto pode guardar:
   *
   * 85 = minutos esperados
   * ou
   * 95 = nota/percentual de expectativa.
   *
   * Ambos funcionam corretamente dentro de 0..100.
   */

  return limitarValor(
    numero,
    0,
    100
  );

}


/* =========================================================
   15. CUSTO-BENEFÍCIO
   ========================================================= */


function converterCustoBeneficioEmNota(
  valor
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


  return limitarValor(

    numero *
    65,

    0,

    100

  );

}


/* =========================================================
   16. RISCO
   ========================================================= */


function converterRiscoEmNotaPositiva(
  riscoNegativar,
  risco
) {

  const riscoNeg =
    Number(
      riscoNegativar
    );


  if (
    Number.isFinite(
      riscoNeg
    )
  ) {

    return limitarValor(
      100 -
      riscoNeg,
      0,
      100
    );

  }


  const numero =
    Number(
      risco
    );


  if (
    Number.isFinite(
      numero
    )
  ) {

    return limitarValor(
      100 -
      numero,
      0,
      100
    );

  }


  const texto =
    normalizarTexto(
      risco
    );


  if (
    texto.includes(
      "baixo"
    )
  ) {

    return 90;

  }


  if (
    texto.includes(
      "alto"
    )
  ) {

    return 30;

  }


  return 60;

}


/* =========================================================
   17. TENDÊNCIA
   ========================================================= */


function obterNotaTendenciaJogador(
  jogador
) {

  const historico =

    jogador?.ultimasPontuacoes

    ||

    jogador?.historicoPontuacoes

    ||

    jogador?.pontuacoesRecentes

    ||

    [];


  if (
    Array.isArray(
      historico
    ) &&
    historico.length >= 2
  ) {

    const recentes =
      historico
        .map(
          Number
        )
        .filter(
          Number.isFinite
        )
        .slice(
          -6
        );


    if (
      recentes.length >= 2
    ) {

      const metade =
        Math.max(

          1,

          Math.floor(
            recentes.length /
            2
          )

        );


      const inicio =
        recentes.slice(
          0,
          metade
        );


      const fim =
        recentes.slice(
          -metade
        );


      const mediaInicio =
        inicio.reduce(
          (
            total,
            valor
          ) =>
            total +
            valor,
          0
        ) /
        inicio.length;


      const mediaFim =
        fim.reduce(
          (
            total,
            valor
          ) =>
            total +
            valor,
          0
        ) /
        fim.length;


      return limitarValor(

        50 +

        (
          mediaFim -
          mediaInicio
        ) *
        8,

        0,

        100

      );

    }

  }


  const recente =
    Number(
      jogador?.mediaRecente
    );


  const geral =
    Number(
      jogador?.mediaGeral
    );


  if (
    Number.isFinite(
      recente
    ) &&
    Number.isFinite(
      geral
    )
  ) {

    return limitarValor(

      50 +

      (
        recente -
        geral
      ) *
      8,

      0,

      100

    );

  }


  return 0;

}


/* =========================================================
   18. NOTAS PARA O MOTOR
   ========================================================= */


function obterNotasMotorDoJogador(
  jogador
) {

  const mando =
    normalizarTexto(
      jogador?.mando
    );


  let notaCasaFora =
    obterValorNotaJogador(

      jogador,

      [
        "casaFora",
        "notaCasaFora"
      ],

      0

    );


  if (
    notaCasaFora === 0 &&
    mando
  ) {

    notaCasaFora =
      (
        mando === "casa" ||
        mando === "mandante"
      )
        ? 65
        : 45;

  }


  const formaRecente =
    obterValorNotaJogador(

      jogador,

      [
        "formaRecente",
        "notaFormaRecente"
      ],

      converterPontuacaoEmNota(
        jogador?.mediaRecente
      )

    );


  const mediaGeral =
    obterValorNotaJogador(

      jogador,

      [
        "mediaGeral",
        "notaMediaGeral"
      ],

      converterPontuacaoEmNota(
        jogador?.mediaGeral
      )

    );


  const mediana =
    obterValorNotaJogador(

      jogador,

      [
        "mediana",
        "notaMediana"
      ],

      converterPontuacaoEmNota(
        jogador?.mediana
      )

    );


  return {

    formaRecente,

    mediaGeral,

    mediana,

    regularidade:
      obterValorNotaJogador(

        jogador,

        [
          "regularidade",
          "notaRegularidade"
        ],

        jogador?.regularidade

      ),

    pontuacaoBasica:
      obterValorNotaJogador(

        jogador,

        [
          "pontuacaoBasica",
          "notaPontuacaoBasica"
        ],

        jogador?.pontuacaoBasica

      ),

    scoutsOfensivos:
      obterValorNotaJogador(

        jogador,

        [
          "scoutsOfensivos",
          "notaScoutsOfensivos"
        ],

        jogador?.notaScoutsOfensivos

      ),

    scoutsDefensivos:
      obterValorNotaJogador(

        jogador,

        [
          "scoutsDefensivos",
          "notaScoutsDefensivos"
        ],

        jogador?.notaScoutsDefensivos

      ),

    casaFora:
      notaCasaFora,

    /*
     * CORREÇÃO IMPORTANTE:
     *
     * A coleta nova gera notaForcaAdversario.
     */
    forcaAdversario:
      obterValorNotaJogador(

        jogador,

        [
          "forcaAdversario",
          "notaForcaAdversario",
          "notaConfronto"
        ],

        jogador?.notaForcaAdversario

      ),

    /*
     * A coleta nova gera pontosCedidosNota.
     */
    pontosCedidos:
      obterValorNotaJogador(

        jogador,

        [
          "pontosCedidos",
          "pontosCedidosNota",
          "notaPontosCedidos"
        ],

        jogador?.pontosCedidosNota

      ),

    /*
     * chanceSG já está em escala 0..100.
     */
    chanceSG:
      obterValorNotaJogador(

        jogador,

        [
          "chanceSG",
          "notaChanceSG"
        ],

        jogador?.chanceSG

      ),

    titularidade:
      obterValorNotaJogador(

        jogador,

        [
          "titularidade",
          "notaTitularidade"
        ],

        jogador?.titularidade

      ),

    minutosEsperados:
      obterValorNotaJogador(

        jogador,

        [
          "minutosEsperados",
          "notaMinutosEsperados"
        ],

        converterMinutosEmNota(
          jogador?.minutosEsperados
        )

      ),

    bolaParada:
      jogador?.cobraBolaParada === true
        ? 100
        : obterValorNotaJogador(

            jogador,

            [
              "bolaParada",
              "notaBolaParada"
            ],

            0

          ),

    penaltis:
      jogador?.cobraPenalti === true
        ? 100
        : obterValorNotaJogador(

            jogador,

            [
              "penaltis",
              "notaPenaltis"
            ],

            0

          ),

    custoBeneficio:
      obterValorNotaJogador(

        jogador,

        [
          "notaCustoBeneficio"
        ],

        converterCustoBeneficioEmNota(
          jogador?.custoBeneficio
        )

      ),

    tendenciaRecente:
      obterValorNotaJogador(

        jogador,

        [
          "tendenciaRecente",
          "notaTendenciaRecente"
        ],

        obterNotaTendenciaJogador(
          jogador
        )

      ),

    riscoNegativar:
      obterValorNotaJogador(

        jogador,

        [
          "riscoNegativar",
          "protecaoNegativacao",
          "notaRiscoNegativar"
        ],

        converterRiscoEmNotaPositiva(

          jogador?.riscoNegativar,

          jogador?.risco

        )

      )

  };

}


/* =========================================================
   19. EXECUTAR MOTOR
   ========================================================= */


function calcularNotaJogadorComMotor(
  jogador
) {

  if (
    typeof executarMotorEstatistico !==
      "function"
  ) {

    return {

      notaFinal:
        numeroSeguro(
          jogador?.notaFinal,
          numeroSeguro(
            jogador?.score
          )
        ),

      classificacao:
        "Calculada",

      contribuicoes:
        {},

      explicacao:
        null

    };

  }


  try {

    return executarMotorEstatistico({

      jogadorId:
        jogador?.id ||
        null,

      posicao:
        jogador?.posicao ||
        null,

      notas:
        obterNotasMotorDoJogador(
          jogador
        )

    });


  } catch (erro) {

    console.warn(

      "Falha ao executar motor estatístico:",

      jogador?.id,

      erro

    );


    return {

      notaFinal:
        numeroSeguro(
          jogador?.notaFinal,
          numeroSeguro(
            jogador?.score
          )
        ),

      classificacao:
        "Calculada",

      contribuicoes:
        {},

      explicacao:
        null

    };

  }

}


/* =========================================================
   20. DESTAQUES
   ========================================================= */


function exibirDestaquesGerais() {

  const jogadores =
    obterJogadoresDisponiveisRanking();


  if (
    jogadores.length === 0
  ) {

    limparDestaquesGerais();

    return;

  }


  const maiorProjecao =
    [
      ...jogadores
    ]
      .sort(
        compararJogadoresRanking
      )[0]
      ||
      null;


  const maiorConfianca =
    obterMaiorPorCampo(

      jogadores,

      jogador =>
        jogador?.confiancaNumerica
        ??
        jogador?.confianca

    );


  const melhorCustoBeneficio =
    obterMaiorPorCampo(

      jogadores,

      jogador =>
        jogador?.custoBeneficio

    );


  exibirDestaque(

    "bestProjection",

    "bestProjectionName",

    maiorProjecao,

    typeof formatarPontos ===
      "function"

      ? formatarPontos(
          obterProjecaoRanking(
            maiorProjecao
          )
        )

      : `${obterProjecaoRanking(
          maiorProjecao
        ).toFixed(1)} pts`

  );


  exibirDestaque(

    "bestConfidence",

    "bestConfidenceName",

    maiorConfianca,

    `${Math.round(

      numeroSeguro(

        maiorConfianca
          ?.confiancaNumerica

        ??

        maiorConfianca
          ?.confianca

      )

    )}%`

  );


  exibirDestaque(

    "bestValue",

    "bestValueName",

    melhorCustoBeneficio,

    numeroSeguro(
      melhorCustoBeneficio
        ?.custoBeneficio
    )
      .toFixed(
        2
      )

  );

}


/* =========================================================
   21. MAIOR VALOR
   ========================================================= */


function obterMaiorPorCampo(
  jogadores,
  obterValor
) {

  return [
    ...jogadores
  ]
    .sort(

      (
        jogadorA,
        jogadorB
      ) =>

        numeroSeguro(
          obterValor(
            jogadorB
          )
        )

        -

        numeroSeguro(
          obterValor(
            jogadorA
          )
        )

    )[0]
    ||
    null;

}


/* =========================================================
   22. EXIBIR DESTAQUE
   ========================================================= */


function exibirDestaque(
  idValor,
  idNome,
  jogador,
  valor
) {

  definirTextoElemento(
    idValor,
    valor ||
    "--"
  );


  definirTextoElemento(

    idNome,

    jogador

      ? (
          jogador.apelido
          ||
          jogador.nome
          ||
          "Jogador"
        )

      : "Aguardando dados"

  );

}


/* =========================================================
   23. LIMPAR DESTAQUES
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
   24. COMPARAR JOGADORES
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
        jogadorA.apelido
        ||
        jogadorA.nome,

      nota:
        notaA

    },

    jogadorB: {

      id:
        jogadorB.id,

      nome:
        jogadorB.apelido
        ||
        jogadorB.nome,

      nota:
        notaB

    },

    vencedor:
      notaA >= notaB
        ? "A"
        : "B",

    diferenca:
      Math.abs(
        notaA -
        notaB
      )

  };

}


/* =========================================================
   25. FILTROS DE EXCLUSÃO — ESTILO
   ========================================================= */


function garantirEstiloFiltrosExclusao() {

  if (
    document.getElementById(
      "cartolaExclusionFiltersStyle"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "cartolaExclusionFiltersStyle";


  style.textContent = `

    .round-exclusion-filters {
      margin: 18px 0 24px;
      padding: 18px;
      border: 1px solid rgba(78, 191, 126, .28);
      border-radius: 18px;
      background: rgba(17, 43, 31, .72);
    }

    .round-exclusion-filters-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }

    .round-exclusion-filters-kicker {
      display: block;
      margin-bottom: 5px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .12em;
      color: #45cc87;
    }

    .round-exclusion-filters-title {
      display: block;
      margin-bottom: 5px;
      font-size: 18px;
    }

    .round-exclusion-filters-description {
      margin: 0;
      opacity: .82;
      font-size: 13px;
      line-height: 1.45;
    }

    .round-exclusion-reset {
      flex: 0 0 auto;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.14);
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-weight: 700;
    }

    .round-exclusion-reset:hover {
      border-color: #45cc87;
    }

    .round-exclusion-groups {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .round-exclusion-group {
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 14px;
      padding: 13px;
      background: rgba(0,0,0,.08);
    }

    .round-exclusion-group > strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .round-exclusion-group > small {
      display: block;
      margin-bottom: 10px;
      opacity: .72;
      line-height: 1.4;
    }

    .round-exclusion-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 180px;
      overflow: auto;
      padding-right: 4px;
    }

    .round-exclusion-option {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.12);
      cursor: pointer;
      font-size: 12px;
      user-select: none;
    }

    .round-exclusion-option input {
      margin: 0;
    }

    .round-exclusion-option.excluded {
      border-color: #d8ad3f;
      background: rgba(216,173,63,.15);
    }

    .round-exclusion-player-search {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 10px;
      padding: 9px 11px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.12);
      color: inherit;
    }

    .round-exclusion-summary {
      margin-top: 12px;
      font-size: 12px;
      opacity: .76;
    }

    @media (max-width: 850px) {

      .round-exclusion-groups {
        grid-template-columns: 1fr;
      }

      .round-exclusion-filters-header {
        flex-direction: column;
      }

      .round-exclusion-reset {
        width: 100%;
      }

    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   26. CHAVE DO CLUBE
   ========================================================= */


function obterChaveClubeRanking(
  jogador
) {

  if (
    typeof obterChaveClubeJogador ===
      "function"
  ) {

    return obterChaveClubeJogador(
      jogador
    );

  }


  if (
    jogador?.clubeId !==
      null &&
    jogador?.clubeId !==
      undefined
  ) {

    return (
      "ID:" +
      String(
        jogador.clubeId
      )
    );

  }


  return (
    "NOME:" +
    String(

      jogador?.siglaClube

      ||

      jogador?.clube

      ||

      ""

    )
      .trim()
      .toUpperCase()
  );

}


/* =========================================================
   27. CLUBES PARA O FILTRO
   ========================================================= */


function obterClubesFiltro() {

  const jogadores =
    typeof obterJogadoresCarregados ===
      "function"

      ? obterJogadoresCarregados()

      : [];


  const mapa =
    new Map();


  jogadores.forEach(
    jogador => {

      const chave =
        obterChaveClubeRanking(
          jogador
        );


      if (
        !chave ||
        chave ===
          "NOME:"
      ) {

        return;

      }


      if (
        !mapa.has(
          chave
        )
      ) {

        mapa.set(

          chave,

          {

            chave,

            nome:
              jogador.siglaClube
              ||
              jogador.clube
              ||
              chave

          }

        );

      }

    }
  );


  return Array.from(
    mapa.values()
  )
    .sort(
      (
        itemA,
        itemB
      ) =>
        String(
          itemA.nome
        ).localeCompare(
          String(
            itemB.nome
          ),
          "pt-BR"
        )
    );

}


/* =========================================================
   28. JOGADORES RELEVANTES PARA O FILTRO
   ========================================================= */


function obterJogadoresFiltro() {

  const todos =
    typeof obterJogadoresCarregados ===
      "function"

      ? obterJogadoresCarregados()

      : [];


  const ids =
    new Set();


  const resultado = [];


  function adicionar(
    jogador
  ) {

    if (!jogador) {

      return;

    }


    const id =
      String(
        jogador.id ?? ""
      );


    if (
      !id ||
      ids.has(
        id
      )
    ) {

      return;

    }


    ids.add(
      id
    );


    resultado.push(
      jogador
    );

  }


  /*
   * 1. Jogadores atualmente recomendados.
   */
  POSICOES_RECOMENDADAS.forEach(
    posicao => {

      todos

        .filter(
          jogador =>
            String(
              jogador.posicao
            ).toUpperCase() ===
            posicao.id
        )

        .sort(
          compararJogadoresRanking
        )

        .slice(
          0,
          Math.max(
            posicao.quantidade,
            8
          )
        )

        .forEach(
          adicionar
        );

    }
  );


  /*
   * 2. Todos que estão nos três times atuais.
   */
  const escalacoes =
    globalThis
      ?.estadoEscalacoes
      ?.escalacoes;


  if (
    Array.isArray(
      escalacoes
    )
  ) {

    escalacoes.forEach(
      escalacao => {

        const grupos = [

          escalacao?.titulares,

          escalacao?.jogadores,

          escalacao?.banco,

          [
            escalacao?.capitao,
            escalacao?.reservaLuxo
          ]

        ];


        grupos.forEach(
          grupo => {

            if (
              Array.isArray(
                grupo
              )
            ) {

              grupo.forEach(
                adicionar
              );

            }

          }
        );

      }
    );

  }


  /*
   * 3. Jogadores já excluídos permanecem visíveis,
   *    para poderem ser restaurados.
   */
  const filtros =
    typeof obterFiltrosExclusaoRecomendacoes ===
      "function"

      ? obterFiltrosExclusaoRecomendacoes()

      : {
          jogadoresExcluidos:
            []
        };


  const excluidos =
    new Set(
      filtros.jogadoresExcluidos ||
      []
    );


  todos
    .filter(
      jogador =>
        excluidos.has(
          String(
            jogador.id
          )
        )
    )
    .forEach(
      adicionar
    );


  return resultado.sort(
    (
      jogadorA,
      jogadorB
    ) => {

      const posicaoA =
        String(
          jogadorA.posicao || ""
        );


      const posicaoB =
        String(
          jogadorB.posicao || ""
        );


      if (
        posicaoA !==
        posicaoB
      ) {

        return posicaoA.localeCompare(
          posicaoB
        );

      }


      return String(

        jogadorA.apelido

        ||

        jogadorA.nome

        ||

        ""

      ).localeCompare(

        String(

          jogadorB.apelido

          ||

          jogadorB.nome

          ||

          ""

        ),

        "pt-BR"

      );

    }
  );

}


/* =========================================================
   29. NOME CURTO
   ========================================================= */


function obterNomeCurtoFiltro(
  jogador
) {

  return (

    jogador?.apelido

    ||

    jogador?.nome

    ||

    "Jogador"

  );

}


/* =========================================================
   30. CRIAR PAINEL
   ========================================================= */


function criarPainelFiltrosExclusao(
  idPainel
) {

  garantirEstiloFiltrosExclusao();


  const painel =
    document.createElement(
      "section"
    );


  painel.id =
    idPainel;


  painel.className =
    "round-exclusion-filters";


  const filtros =
    typeof obterFiltrosExclusaoRecomendacoes ===
      "function"

      ? obterFiltrosExclusaoRecomendacoes()

      : {
          clubesExcluidos: [],
          jogadoresExcluidos: []
        };


  const clubesExcluidos =
    new Set(
      filtros.clubesExcluidos ||
      []
    );


  const jogadoresExcluidos =
    new Set(
      filtros.jogadoresExcluidos ||
      []
    );


  const clubes =
    obterClubesFiltro();


  const jogadores =
    obterJogadoresFiltro();


  const clubesHtml =
    clubes
      .map(
        clube => {

          const marcado =
            clubesExcluidos.has(
              clube.chave
            );


          return `

            <label
              class="
                round-exclusion-option
                ${marcado
                  ? "excluded"
                  : ""}
              "
            >

              <input
                type="checkbox"
                data-exclude-club="${String(
                  clube.chave
                )}"
                ${marcado
                  ? "checked"
                  : ""}
              >

              <span>
                ${String(
                  clube.nome
                )}
              </span>

            </label>

          `;

        }
      )
      .join("");


  const jogadoresHtml =
    jogadores
      .map(
        jogador => {

          const id =
            String(
              jogador.id
            );


          const marcado =
            jogadoresExcluidos.has(
              id
            );


          const nome =
            obterNomeCurtoFiltro(
              jogador
            );


          const clube =

            jogador.siglaClube

            ||

            jogador.clube

            ||

            "--";


          const posicao =
            jogador.posicao
            ||
            "--";


          const busca =
            normalizarTexto(

              `${nome} ${clube} ${posicao}`

            );


          return `

            <label
              class="
                round-exclusion-option
                ${marcado
                  ? "excluded"
                  : ""}
              "
              data-player-filter-option
              data-search-text="${busca}"
            >

              <input
                type="checkbox"
                data-exclude-player="${id}"
                ${marcado
                  ? "checked"
                  : ""}
              >

              <span>
                ${nome}
                ·
                ${clube}
                ·
                ${posicao}
              </span>

            </label>

          `;

        }
      )
      .join("");


  const resumo =
    typeof obterResumoFiltrosRecomendacoes ===
      "function"

      ? obterResumoFiltrosRecomendacoes()

      : {
          clubesExcluidos: 0,
          jogadoresExcluidos: 0,
          removidos: 0
        };


  painel.innerHTML = `

    <div
      class="round-exclusion-filters-header"
    >

      <div>

        <span
          class="round-exclusion-filters-kicker"
        >
          AJUSTES DA RODADA
        </span>

        <strong
          class="round-exclusion-filters-title"
        >
          Retire clubes ou jogadores
        </strong>

        <p
          class="round-exclusion-filters-description"
        >
          Marque quem você não quer utilizar.
          Recomendações, os três times, capitão,
          banco e Reserva de Luxo serão recalculados.
        </p>

      </div>


      <button
        type="button"
        class="round-exclusion-reset"
        data-reset-exclusion-filters
      >
        Limpar filtros
      </button>

    </div>


    <div
      class="round-exclusion-groups"
    >

      <div
        class="round-exclusion-group"
      >

        <strong>
          Clubes
        </strong>

        <small>
          Ex.: time poupando titulares,
          confronto que você não confia
          ou partida adiada.
        </small>

        <div
          class="round-exclusion-options"
        >
          ${
            clubesHtml
            ||
            "Nenhum clube disponível."
          }
        </div>

      </div>


      <div
        class="round-exclusion-group"
      >

        <strong>
          Jogadores
        </strong>

        <small>
          Útil para informação de última hora:
          desfalque, banco, lesão ou rotação.
        </small>

        <input
          type="search"
          class="round-exclusion-player-search"
          placeholder="Buscar jogador..."
          data-player-exclusion-search
        >

        <div
          class="round-exclusion-options"
          data-player-exclusion-options
        >
          ${
            jogadoresHtml
            ||
            "Nenhum jogador disponível."
          }
        </div>

      </div>

    </div>


    <div
      class="round-exclusion-summary"
    >

      Clubes excluídos:
      <strong>
        ${resumo.clubesExcluidos}
      </strong>

      &nbsp;•&nbsp;

      Jogadores excluídos:
      <strong>
        ${resumo.jogadoresExcluidos}
      </strong>

      &nbsp;•&nbsp;

      Atletas removidos da base disponível:
      <strong>
        ${resumo.removidos}
      </strong>

    </div>

  `;


  configurarEventosPainelFiltros(
    painel
  );


  return painel;

}


/* =========================================================
   31. EVENTOS DO PAINEL
   ========================================================= */


function configurarEventosPainelFiltros(
  painel
) {

  painel
    .querySelectorAll(
      "[data-exclude-club]"
    )
    .forEach(
      input => {

        input.addEventListener(

          "change",

          () => {

            if (
              typeof alternarClubeRecomendacoes ===
                "function"
            ) {

              alternarClubeRecomendacoes(

                input.dataset.excludeClub,

                input.checked

              );

            }

          }

        );

      }
    );


  painel
    .querySelectorAll(
      "[data-exclude-player]"
    )
    .forEach(
      input => {

        input.addEventListener(

          "change",

          () => {

            if (
              typeof alternarJogadorRecomendacoes ===
                "function"
            ) {

              alternarJogadorRecomendacoes(

                input.dataset.excludePlayer,

                input.checked

              );

            }

          }

        );

      }
    );


  const busca =
    painel.querySelector(
      "[data-player-exclusion-search]"
    );


  if (busca) {

    busca.addEventListener(

      "input",

      () => {

        const termo =
          normalizarTexto(
            busca.value
          );


        painel
          .querySelectorAll(
            "[data-player-filter-option]"
          )
          .forEach(
            item => {

              const texto =
                item.dataset
                  .searchText
                ||
                "";


              item.style.display =
                (
                  !termo ||
                  texto.includes(
                    termo
                  )
                )
                  ? ""
                  : "none";

            }
          );

      }

    );

  }


  const reset =
    painel.querySelector(
      "[data-reset-exclusion-filters]"
    );


  if (reset) {

    reset.addEventListener(

      "click",

      () => {

        if (
          typeof limparFiltrosExclusaoRecomendacoes ===
            "function"
        ) {

          limparFiltrosExclusaoRecomendacoes();

        }

      }

    );

  }

}


/* =========================================================
   32. PAINEL EM RECOMENDAÇÕES
   ========================================================= */


function garantirPainelFiltrosRecomendacoes() {

  const filtrosPosicao =
    document.getElementById(
      "positionFilters"
    );


  if (!filtrosPosicao) {

    return;

  }


  const antigo =
    document.getElementById(
      "roundExclusionFiltersRecommendations"
    );


  if (antigo) {

    antigo.remove();

  }


  const painel =
    criarPainelFiltrosExclusao(
      "roundExclusionFiltersRecommendations"
    );


  /*
   * Coloca o painel antes do ranking por posição.
   */
  filtrosPosicao
    .parentElement
    ?.insertBefore(

      painel,

      filtrosPosicao

    );

}


/* =========================================================
   33. PAINEL EM TIMES SUGERIDOS
   ========================================================= */


function garantirPainelFiltrosTimes() {

  const controlePatrimonio =
    document.querySelector(
      ".lineup-budget-control"
    );


  if (!controlePatrimonio) {

    return;

  }


  const antigo =
    document.getElementById(
      "roundExclusionFiltersLineups"
    );


  if (antigo) {

    antigo.remove();

  }


  const painel =
    criarPainelFiltrosExclusao(
      "roundExclusionFiltersLineups"
    );


  controlePatrimonio
    .insertAdjacentElement(
      "afterend",
      painel
    );

}


/* =========================================================
   34. CRIA TODOS OS PAINÉIS
   ========================================================= */


function criarFiltrosExclusaoRodada() {

  garantirPainelFiltrosRecomendacoes();


  garantirPainelFiltrosTimes();

}


/* =========================================================
   35. ATUALIZAR APÓS FILTROS
   ========================================================= */


let timerRecalculoFiltros =
  null;


function recalcularAposFiltros() {

  if (
    timerRecalculoFiltros
  ) {

    clearTimeout(
      timerRecalculoFiltros
    );

  }


  timerRecalculoFiltros =
    setTimeout(

      async () => {

        timerRecalculoFiltros =
          null;


        /*
         * Recomendações
         */

        if (
          typeof exibirDestaquesGerais ===
            "function"
        ) {

          exibirDestaquesGerais();

        }


        if (
          typeof exibirJogadoresDaPosicao ===
            "function"
        ) {

          exibirJogadoresDaPosicao();

        }


        /*
         * Times sugeridos
         */

        if (
          typeof carregarEscalacoes ===
            "function"
        ) {

          try {

            await carregarEscalacoes();

          }
          catch (erro) {

            console.error(

              "Erro ao recalcular escalações após filtros:",

              erro

            );

          }

        }


        /*
         * Refaz os dois painéis com os novos dados.
         */

        setTimeout(

          () => {

            criarFiltrosExclusaoRodada();

          },

          0

        );

      },

      80

    );

}


/* =========================================================
   36. EVENTO DOS FILTROS
   ========================================================= */


if (
  typeof window !==
    "undefined"
) {

  window.addEventListener(

    "cartola:filtros-recomendacoes-alterados",

    recalcularAposFiltros

  );


  /*
   * Quando os times forem renderizados novamente,
   * recoloca o painel ao lado do patrimônio.
   */
  window.addEventListener(

    "cartola:escalacoes-atualizadas",

    () => {

      setTimeout(

        garantirPainelFiltrosTimes,

        0

      );

    }

  );


  /*
   * Garante o painel após o carregamento inicial.
   */
  window.addEventListener(

    "load",

    () => {

      setTimeout(

        criarFiltrosExclusaoRodada,

        250

      );

    }

  );


  window.CartolaRanking = {

    obterJogadoresDaPosicao,

    compararJogadores:
      compararJogadoresRanking,

    obterNota:
      obterNotaRanking,

    obterProjecao:
      obterProjecaoRanking,

    recalcularAposFiltros,

    criarFiltrosExclusaoRodada

  };

}
