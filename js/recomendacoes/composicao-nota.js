/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — composição real da nota

   Objetivo:

   - usar as contribuições JÁ calculadas pelo MotorCalculadora;
   - impedir recálculo parcial da nota no momento do card;
   - mostrar todos os critérios que realmente contribuíram;
   - preservar pesos especializados por posição;
   - não alterar ranking, projeção ou escalações.

   ========================================================= */


(function () {

  "use strict";


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */


  function numeroSeguro(
    valor,
    padrao = 0
  ) {

    const numero =
      Number(
        valor
      );


    return Number.isFinite(
      numero
    )
      ? numero
      : padrao;

  }


  function objetoValido(
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


  function limitar(
    valor,
    minimo = 0,
    maximo = 100
  ) {

    return Math.max(
      minimo,
      Math.min(
        maximo,
        numeroSeguro(
          valor,
          minimo
        )
      )
    );

  }


  function formatar(
    valor,
    casas = 2
  ) {

    return numeroSeguro(
      valor,
      0
    ).toFixed(
      casas
    );

  }


  /* =======================================================
     RESULTADO REAL DO MOTOR
     ======================================================= */


  function obterResultadoMotorPrecalculado(
    jogador
  ) {

    if (
      !jogador ||
      !objetoValido(
        jogador.contribuicoes
      )
    ) {

      return null;

    }


    return {

      notaFinal:
        numeroSeguro(

          jogador.notaFinal

          ??

          jogador.nota

          ??

          jogador.score

        ),

      classificacao:

        jogador.classificacao

        ??

        "",

      notas:

        objetoValido(
          jogador.notas
        )

          ? jogador.notas

          : {},

      pesosAplicados:

        objetoValido(
          jogador.pesosAplicados
        )

          ? jogador.pesosAplicados

          : {},

      contribuicoes:

        jogador.contribuicoes,

      explicacao:

        jogador.explicacaoEstatistica

        ??

        jogador.explicacao

        ??

        null,

      origem:

        "motor-precalculado"

    };

  }


  /* =======================================================
     PRESERVA FUNÇÃO ORIGINAL
     ======================================================= */


  const obterResultadoMotorOriginal =

    typeof window
      .obterResultadoMotorJogador ===
      "function"

      ? window
          .obterResultadoMotorJogador

      : null;


  /* =======================================================
     SOBRESCREVE RESULTADO DO CARD
     ======================================================= */


  window.obterResultadoMotorJogador =
    function (
      jogador
    ) {

      /*
       * PRIMEIRA OPÇÃO:
       *
       * usa o cálculo completo que já veio do
       * MotorCalculadora.
       */

      const pronto =
        obterResultadoMotorPrecalculado(
          jogador
        );


      if (
        pronto
      ) {

        return pronto;

      }


      /*
       * FALLBACK:
       *
       * somente jogadores antigos que não tenham
       * contribuições previamente calculadas.
       */

      if (
        obterResultadoMotorOriginal
      ) {

        try {

          return obterResultadoMotorOriginal(
            jogador
          );


        } catch (erro) {

          console.warn(

            "Falha ao usar motor original:",

            erro

          );

        }

      }


      return null;

    };


  /*
   * Também substituímos a referência global direta.
   *
   * Como os scripts do projeto usam function declarations
   * no escopo global, isso garante que criarCardJogador()
   * use a nova versão.
   */

  try {

    obterResultadoMotorJogador =
      window.obterResultadoMotorJogador;

  } catch (_) {

    /*
     * Não faz nada.
     */

  }


  /* =======================================================
     VALIDA COMPONENTE
     ======================================================= */


  function componenteValido(
    item
  ) {

    if (
      !item ||
      typeof item !==
        "object"
    ) {

      return false;

    }


    const peso =
      numeroSeguro(
        item.peso,
        0
      );


    const contribuicao =
      numeroSeguro(
        item.contribuicao,
        0
      );


    /*
     * O critério entra na composição quando:
     *
     * 1) tem peso estatístico;
     * 2) efetivamente gerou contribuição diferente de zero.
     *
     * Critérios sem dado e com contribuição 0 não serão
     * exibidos como se tivessem influenciado a nota.
     */

    return (
      peso > 0 &&
      Math.abs(
        contribuicao
      ) > 0.000001
    );

  }


  /* =======================================================
     CRIA HTML DA COMPOSIÇÃO
     ======================================================= */


  function criarComponentesCompletos(
    contribuicoes
  ) {

    if (
      !objetoValido(
        contribuicoes
      )
    ) {

      return `

        <div class="components-empty">

          <strong>
            Componentes ainda não disponíveis
          </strong>

          <p>
            O motor ainda não informou a decomposição
            estatística deste jogador.
          </p>

        </div>

      `;

    }


    const componentes =
      Object.values(
        contribuicoes
      )
        .filter(
          componenteValido
        )
        .sort(
          (
            itemA,
            itemB
          ) =>

            Math.abs(
              numeroSeguro(
                itemB.contribuicao
              )
            )

            -

            Math.abs(
              numeroSeguro(
                itemA.contribuicao
              )
            )
        );


    if (
      componentes.length === 0
    ) {

      return `

        <div class="components-empty">

          <strong>
            Critérios sem contribuição mensurável
          </strong>

          <p>
            Nenhum critério recebeu dados suficientes para
            contribuir numericamente para a nota.
          </p>

        </div>

      `;

    }


    return componentes
      .map(
        item => {

          const nota =
            limitar(
              item.nota,
              0,
              100
            );


          const peso =
            numeroSeguro(
              item.peso,
              0
            );


          const contribuicao =
            numeroSeguro(
              item.contribuicao,
              0
            );


          const nome =

            item.nome

            ||

            item.criterio

            ||

            "Critério";


          return `

            <div class="component-row">

              <div class="component-label">

                <span>

                  ${escapar(
                    nome
                  )}

                  <small>

                    Peso:

                    ${formatar(
                      peso,
                      1
                    )}%

                    •

                    contribuição:

                    ${formatar(
                      contribuicao,
                      2
                    )}

                  </small>

                </span>


                <strong>

                  ${Math.round(
                    nota
                  )}

                </strong>

              </div>


              <div class="component-track">

                <div
                  class="component-fill"
                  style="
                    width:
                    ${nota}%;
                  "
                ></div>

              </div>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =======================================================
     PRESERVA COMPONENTES ORIGINAIS
     ======================================================= */


  const criarComponentesOriginal =

    typeof window
      .criarComponentesNotaJogador ===
      "function"

      ? window
          .criarComponentesNotaJogador

      : null;


  /* =======================================================
     SUBSTITUI COMPOSIÇÃO
     ======================================================= */


  window.criarComponentesNotaJogador =
    function (
      jogador,
      resultadoMotor = null
    ) {

      /*
       * Prioridade absoluta:
       * contribuições calculadas e armazenadas no jogador.
       */

      if (
        objetoValido(
          jogador?.contribuicoes
        )
      ) {

        return criarComponentesCompletos(
          jogador.contribuicoes
        );

      }


      /*
       * Segunda opção:
       * resultado recebido diretamente do motor.
       */

      if (
        objetoValido(
          resultadoMotor
            ?.contribuicoes
        )
      ) {

        return criarComponentesCompletos(
          resultadoMotor
            .contribuicoes
        );

      }


      /*
       * Compatibilidade.
       */

      if (
        criarComponentesOriginal
      ) {

        return criarComponentesOriginal(

          jogador,

          resultadoMotor

        );

      }


      return `

        <div class="components-empty">

          <strong>
            Componentes ainda não disponíveis
          </strong>

        </div>

      `;

    };


  try {

    criarComponentesNotaJogador =
      window
        .criarComponentesNotaJogador;

  } catch (_) {

    /*
     * Não faz nada.
     */

  }


  /* =======================================================
     DIAGNÓSTICO
     ======================================================= */


  function diagnosticar(
    jogador
  ) {

    if (!jogador) {

      return null;

    }


    const contribuicoes =
      jogador.contribuicoes
      ?? {};


    const componentes =
      Object.values(
        contribuicoes
      );


    const efetivos =
      componentes.filter(
        componenteValido
      );


    const diagnostico = {

      jogador:

        jogador.apelido

        ??

        jogador.nome

        ??

        jogador.id,

      posicao:
        jogador.posicao,

      notaFinal:

        jogador.notaFinal

        ??

        jogador.nota

        ??

        jogador.score,

      criteriosDoMotor:
        componentes.length,

      criteriosComContribuicao:
        efetivos.length,

      componentes:
        efetivos.map(
          item => ({

            criterio:
              item.criterio,

            nome:
              item.nome,

            nota:
              item.nota,

            peso:
              item.peso,

            contribuicao:
              item.contribuicao

          })
        )

    };


    console.table(
      diagnostico.componentes
    );


    console.info(
      "Diagnóstico da composição:",
      diagnostico
    );


    return diagnostico;

  }


  /* =======================================================
     API
     ======================================================= */


  window.CartolaComposicaoNota = {

    obterResultado:
      obterResultadoMotorPrecalculado,

    criarHtml:
      criarComponentesCompletos,

    diagnosticar

  };


  console.info(
    "Composição real da nota carregada."
  );


})();
