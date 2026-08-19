/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — composição completa da nota

   Objetivo:
   - usar as contribuições completas calculadas pelo motor;
   - priorizar contribuicoesCalculadas do MotorCalculadora;
   - mostrar TODOS os 18 critérios;
   - exibir nota, peso e contribuição;
   - não esconder critérios zerados/indisponíveis;
   - não alterar ranking, projeção ou escalações.
   ========================================================= */

(function () {

  "use strict";

  const ORDEM_CRITERIOS = [
    "formaRecente",
    "mediaGeral",
    "mediana",
    "regularidade",
    "pontuacaoBasica",
    "scoutsOfensivos",
    "scoutsDefensivos",
    "casaFora",
    "forcaAdversario",
    "pontosCedidos",
    "chanceSG",
    "titularidade",
    "minutosEsperados",
    "bolaParada",
    "penaltis",
    "custoBeneficio",
    "tendenciaRecente",
    "riscoNegativar"
  ];

  const NOMES_CRITERIOS = {
    formaRecente: "Forma recente",
    mediaGeral: "Média geral",
    mediana: "Mediana",
    regularidade: "Regularidade",
    pontuacaoBasica: "Pontuação básica",
    scoutsOfensivos: "Scouts ofensivos",
    scoutsDefensivos: "Scouts defensivos",
    casaFora: "Mando (casa/fora)",
    forcaAdversario: "Força do adversário",
    pontosCedidos: "Pontos cedidos à posição",
    chanceSG: "Chance de SG",
    titularidade: "Titularidade",
    minutosEsperados: "Minutos esperados",
    bolaParada: "Bola parada",
    penaltis: "Pênaltis",
    custoBeneficio: "Custo-benefício",
    tendenciaRecente: "Tendência recente",
    riscoNegativar: "Proteção contra negativação"
  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function numero(
    valor,
    padrao = null
  ) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {

      return padrao;

    }

    const n =
      Number(
        valor
      );

    return Number.isFinite(
      n
    )
      ? n
      : padrao;

  }


  function limitar(
    valor,
    minimo = 0,
    maximo = 100
  ) {

    const n =
      numero(
        valor,
        minimo
      );

    return Math.max(
      minimo,
      Math.min(
        maximo,
        n
      )
    );

  }


  function objetoValido(
    valor
  ) {

    return Boolean(

      valor &&

      typeof valor ===
        "object" &&

      !Array.isArray(
        valor
      ) &&

      Object.keys(
        valor
      ).length > 0

    );

  }


  function escapar(
    valor
  ) {

    return String(
      valor ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


  function formatar(
    valor,
    casas = 1
  ) {

    const n =
      numero(
        valor,
        null
      );

    return n === null
      ? "--"
      : n.toFixed(
          casas
        );

  }


  /* =======================================================
     RESULTADO MAIS COMPLETO DISPONÍVEL
     ======================================================= */

  function obterResultadoMaisCompleto(
    jogador
  ) {

    const candidatos = [];


    /*
     * PRIORIDADE 1:
     *
     * O MotorCalculadora salva o resultado completo
     * nesses campos.
     */

    if (
      objetoValido(
        jogador?.contribuicoesCalculadas
      )
    ) {

      candidatos.push({

        notaFinal:
          numero(
            jogador?.notaFinal
            ??
            jogador?.notaCalculada
            ??
            jogador?.score,
            0
          ),

        classificacao:
          jogador?.classificacaoCalculada
          ??
          jogador?.classificacao
          ??
          "",

        notas:
          jogador?.notasCriterios
          ??
          jogador?.notas
          ??
          {},

        pesosAplicados:
          jogador?.pesosAplicados
          ??
          {},

        contribuicoes:
          jogador
            .contribuicoesCalculadas,

        explicacao:
          jogador?.explicacaoCalculada
          ??
          jogador?.explicacaoEstatistica
          ??
          jogador?.explicacao
          ??
          null,

        origem:
          "contribuicoesCalculadas"

      });

    }


    /*
     * PRIORIDADE 2:
     *
     * Se necessário, recalcula somente a decomposição
     * para garantir que o card não fique com um objeto
     * parcial.
     */

    if (
      typeof window
        .calcularNotaJogadorComMotor ===
        "function"
    ) {

      try {

        const calculado =
          window
            .calcularNotaJogadorComMotor(
              jogador
            );


        if (
          calculado &&
          typeof calculado ===
            "object"
        ) {

          candidatos.push({

            ...calculado,

            origem:
              "calcularNotaJogadorComMotor"

          });

        }

      } catch (erro) {

        console.warn(
          "Não foi possível recalcular a composição:",
          erro
        );

      }

    }


    /*
     * PRIORIDADE 3:
     *
     * Compatibilidade com formato antigo.
     */

    if (
      objetoValido(
        jogador?.contribuicoes
      )
    ) {

      candidatos.push({

        notaFinal:
          numero(
            jogador?.notaFinal
            ??
            jogador?.nota
            ??
            jogador?.score,
            0
          ),

        classificacao:
          jogador?.classificacao
          ??
          "",

        notas:
          jogador?.notas
          ??
          {},

        pesosAplicados:
          jogador?.pesosAplicados
          ??
          {},

        contribuicoes:
          jogador.contribuicoes,

        explicacao:
          jogador?.explicacaoEstatistica
          ??
          jogador?.explicacao
          ??
          null,

        origem:
          "contribuicoes-legado"

      });

    }


    if (
      candidatos.length === 0
    ) {

      return null;

    }


    /*
     * Escolhe o resultado que tiver a maior
     * quantidade de critérios.
     */

    candidatos.sort(
      (
        a,
        b
      ) => {

        const quantidadeA =
          Object.keys(
            a?.contribuicoes
            ||
            {}
          ).length;


        const quantidadeB =
          Object.keys(
            b?.contribuicoes
            ||
            {}
          ).length;


        return (
          quantidadeB -
          quantidadeA
        );

      }
    );


    return candidatos[0];

  }


  /* =======================================================
     MONTA UM CRITÉRIO
     ======================================================= */

  function montarItemDoCriterio(
    criterio,
    resultado,
    jogador
  ) {

    const contribuicoes =
      resultado?.contribuicoes
      ||
      {};


    const notas =
      resultado?.notas
      ||
      jogador?.notasCriterios
      ||
      {};


    const pesos =
      resultado?.pesosAplicados
      ||
      jogador?.pesosAplicados
      ||
      {};


    const bruto =
      contribuicoes[
        criterio
      ];


    if (
      bruto &&
      typeof bruto ===
        "object"
    ) {

      return {

        criterio,

        nome:
          bruto.nome
          ||
          bruto.criterio
          ||
          NOMES_CRITERIOS[
            criterio
          ]
          ||
          criterio,

        nota:
          numero(
            bruto.nota,
            numero(
              notas[
                criterio
              ],
              null
            )
          ),

        peso:
          numero(
            bruto.peso,
            numero(
              pesos[
                criterio
              ],
              null
            )
          ),

        contribuicao:
          numero(
            bruto.contribuicao,
            null
          ),

        disponivel:
          bruto.disponivel !==
            false &&
          bruto.temDados !==
            false,

        valorOriginal:
          bruto.valorOriginal

      };

    }


    const nota =
      numero(
        notas[
          criterio
        ],
        null
      );


    const peso =
      numero(
        pesos[
          criterio
        ],
        null
      );


    return {

      criterio,

      nome:
        NOMES_CRITERIOS[
          criterio
        ]
        ||
        criterio,

      nota,

      peso,

      contribuicao:
        nota !== null &&
        peso !== null
          ? (
              nota *
              peso /
              100
            )
          : null,

      disponivel:
        nota !== null ||
        peso !== null,

      valorOriginal:
        null

    };

  }


  /* =======================================================
     TODOS OS CRITÉRIOS
     ======================================================= */

  function obterTodosComponentes(
    resultado,
    jogador
  ) {

    const chavesExtras =
      new Set([

        ...Object.keys(
          resultado
            ?.contribuicoes
          ||
          {}
        ),

        ...Object.keys(
          resultado?.notas
          ||
          jogador?.notasCriterios
          ||
          {}
        ),

        ...Object.keys(
          resultado
            ?.pesosAplicados
          ||
          jogador?.pesosAplicados
          ||
          {}
        )

      ]);


    const ordem = [

      ...ORDEM_CRITERIOS,

      ...[
        ...chavesExtras
      ].filter(
        chave =>
          !ORDEM_CRITERIOS
            .includes(
              chave
            )
      )

    ];


    return ordem.map(
      criterio =>
        montarItemDoCriterio(
          criterio,
          resultado,
          jogador
        )
    );

  }


  /* =======================================================
     HTML DE UM CRITÉRIO
     ======================================================= */

  function criarHtmlComponente(
    item
  ) {

    const temNota =
      numero(
        item.nota,
        null
      ) !== null;


    const temPeso =
      numero(
        item.peso,
        null
      ) !== null;


    const temContribuicao =
      numero(
        item.contribuicao,
        null
      ) !== null;


    const disponivel =
      Boolean(

        item.disponivel &&

        (
          temNota ||
          temPeso ||
          temContribuicao
        )

      );


    const nota =
      temNota
        ? limitar(
            item.nota,
            0,
            100
          )
        : 0;


    const textoNota =
      temNota
        ? Math.round(
            nota
          )
        : "--";


    const textoPeso =
      temPeso
        ? `${
            formatar(
              item.peso,
              1
            )
          }%`
        : "--";


    const textoContribuicao =
      temContribuicao
        ? formatar(
            item.contribuicao,
            2
          )
        : "--";


    return `

      <div
        class="
          component-row
          ${
            disponivel
              ? ""
              : "component-unavailable"
          }
        "
      >

        <div class="component-label">

          <span>

            ${escapar(
              item.nome
            )}

            <small>

              Peso:
              ${textoPeso}

              •

              contribuição:
              ${textoContribuicao}

              ${
                disponivel
                  ? ""
                  : " • dado ainda não disponível"
              }

            </small>

          </span>


          <strong>
            ${textoNota}
          </strong>

        </div>


        <div class="component-track">

          <div
            class="component-fill"
            style="
              width:
              ${
                temNota
                  ? nota
                  : 0
              }%;
            "
          ></div>

        </div>

      </div>

    `;

  }


  /* =======================================================
     COMPOSIÇÃO COMPLETA
     ======================================================= */

  function criarComposicaoCompleta(
    jogador,
    resultadoRecebido = null
  ) {

    const calculado =
      obterResultadoMaisCompleto(
        jogador
      );


    const quantidadeCalculado =
      Object.keys(
        calculado
          ?.contribuicoes
        ||
        {}
      ).length;


    const quantidadeRecebido =
      Object.keys(
        resultadoRecebido
          ?.contribuicoes
        ||
        {}
      ).length;


    const resultado =
      quantidadeCalculado >=
      quantidadeRecebido
        ? (
            calculado
            ||
            resultadoRecebido
          )
        : (
            resultadoRecebido
            ||
            calculado
          );


    if (!resultado) {

      return `

        <div class="components-empty">

          <strong>
            Composição ainda não disponível
          </strong>

          <p>
            O motor ainda não devolveu
            a decomposição desta nota.
          </p>

        </div>

      `;

    }


    const componentes =
      obterTodosComponentes(
        resultado,
        jogador
      );


    const disponiveis =
      componentes.filter(
        item =>
          item.disponivel
      ).length;


    return `

      <div class="components-summary">

        <small>

          ${componentes.length}
          critérios do modelo

          •

          ${disponiveis}
          com dados disponíveis

        </small>

      </div>


      ${
        componentes
          .map(
            criarHtmlComponente
          )
          .join("")
      }

    `;

  }


  /* =======================================================
     SUBSTITUI FUNÇÕES GLOBAIS
     ======================================================= */

  window.obterResultadoMotorJogador =
    function (
      jogador
    ) {

      return obterResultadoMaisCompleto(
        jogador
      );

    };


  window.criarComponentesNotaJogador =
    function (
      jogador,
      resultadoMotor = null
    ) {

      return criarComposicaoCompleta(
        jogador,
        resultadoMotor
      );

    };


  /*
   * Garante compatibilidade com chamadas
   * diretas nos scripts clássicos.
   */

  try {

    obterResultadoMotorJogador =
      window
        .obterResultadoMotorJogador;

  } catch (_) {}


  try {

    criarComponentesNotaJogador =
      window
        .criarComponentesNotaJogador;

  } catch (_) {}


  /* =======================================================
     API
     ======================================================= */

  window.CartolaComposicaoNota = {

    obterResultado:
      obterResultadoMaisCompleto,

    criarHtml:
      criarComposicaoCompleta,

    obterTodosComponentes

  };


  console.info(
    "Composição completa da nota carregada — 18 critérios."
  );

})();
