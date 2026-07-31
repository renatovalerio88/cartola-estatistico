/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — cards dos jogadores
   ========================================================= */


/* =========================================================
   1. EXIBIÇÃO DOS JOGADORES DA POSIÇÃO
   ========================================================= */

function exibirJogadoresDaPosicao() {
  const grade =
    document.getElementById(
      "playersGrid"
    );

  if (!grade) {
    return;
  }

  if (!recomendacoesCarregadas()) {
    return;
  }

  const posicaoAtiva =
    obterPosicaoAtiva();

  const jogadores =
    obterJogadoresDaPosicao(
      posicaoAtiva
    );

  if (
    !Array.isArray(jogadores) ||
    jogadores.length === 0
  ) {
    exibirPosicaoSemJogadores();
    return;
  }

  grade.innerHTML = "";

  jogadores.forEach(
    (jogador, indice) => {
      const card =
        criarCardJogador(
          jogador,
          indice + 1
        );

      grade.appendChild(card);
    }
  );

  configurarBotoesAnaliseJogador();
}


/* =========================================================
   2. CRIAÇÃO DO CARD
   ========================================================= */

function criarCardJogador(
  jogador,
  colocacao
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "player-card";

  const classeConfianca =
    obterClasseConfianca(
      jogador.confianca
    );

  const classeRisco =
    obterClasseRisco(
      jogador.risco
    );

  const motivoPrincipal =
    obterMotivoPrincipal(
      jogador
    );

  const justificativas =
    criarItensLista(
      jogador.justificativas,
      "Nenhuma justificativa cadastrada."
    );

  const pontosAtencao =
    criarItensLista(
      jogador.pontosAtencao,
      "Nenhum ponto de atenção cadastrado."
    );

  const componentes =
    criarComponentesNotaJogador(
      jogador
    );

  const etiquetas =
    criarEtiquetasEspeciaisJogador(
      jogador
    );

  const resultadoMotor =
    obterResultadoMotorJogador(
      jogador
    );

  const idDetalhes =
    `player-details-${jogador.id}`;

  card.innerHTML = `
    <div class="player-card-header">

      <div class="player-main-info">

        <div class="player-ranking">
          ${colocacao}
        </div>

        <div>

          <span class="player-position">
            ${escaparHtml(
              obterNomePosicao(
                jogador.posicao,
                true
              )
            )}
          </span>

          <h3>
            ${escaparHtml(
              jogador.apelido ||
              jogador.nome
            )}
          </h3>

          <p class="player-club">

            ${escaparHtml(
              jogador.siglaClube ||
              jogador.clube ||
              "--"
            )}

            <span>•</span>

            ${escaparHtml(
              jogador.mando ||
              "Mando não informado"
            )}

            <span>•</span>

            x ${escaparHtml(
              jogador.adversario ||
              "Adversário não informado"
            )}

          </p>

        </div>

      </div>

      <div class="player-price">

        <span>
          Preço
        </span>

        <strong>
          ${formatarCartoletas(
            jogador.preco
          )}
        </strong>

      </div>

    </div>


    ${
      etiquetas
        ? `
          <div class="player-special-tags">
            ${etiquetas}
          </div>
        `
        : ""
    }


    <div class="player-main-metrics">

      <div class="main-metric projection">

        <span>
          Projeção
        </span>

        <strong>
          ${formatarPontos(
            jogador.projecao
          )}
        </strong>

      </div>

      <div class="main-metric">

        <span>
          Piso
        </span>

        <strong>
          ${formatarPontos(
            jogador.piso
          )}
        </strong>

      </div>

      <div class="main-metric">

        <span>
          Teto
        </span>

        <strong>
          ${formatarPontos(
            jogador.teto
          )}
        </strong>

      </div>

    </div>


    <div class="player-indicators">

      ${criarBarraIndicador(
        "Confiança",
        jogador.confiancaNumerica,
        classeConfianca
      )}

      ${criarBarraIndicador(
        "Regularidade",
        jogador.regularidade,
        "regularity"
      )}

    </div>


    <div class="player-badges">

      <span
        class="
          player-badge
          ${classeConfianca}
        "
      >
        Confiança
        ${escaparHtml(
          jogador.confianca ||
          "Não informada"
        )}
      </span>

      <span
        class="
          player-badge
          ${classeRisco}
        "
      >
        Risco
        ${escaparHtml(
          jogador.risco ||
          "Não informado"
        )}
      </span>

      <span class="player-badge value">
        Custo-benefício
        ${formatarDecimal(
          jogador.custoBeneficio,
          2
        )}
      </span>

      <span class="player-badge score">
        Nota
        ${formatarDecimal(
          obterNotaExibicaoJogador(
            jogador,
            resultadoMotor
          ),
          0
        )}
      </span>

    </div>


    <div class="player-main-reason">

      <span class="player-main-reason-icon">
        ✓
      </span>

      <div>

        <strong>
          Principal motivo
        </strong>

        <p>
          ${escaparHtml(
            motivoPrincipal
          )}
        </p>

      </div>

    </div>


    <button
      class="player-details-button"
      type="button"
      aria-expanded="false"
      aria-controls="${idDetalhes}"
      data-player-details-button="${idDetalhes}"
    >

      <span>
        Ver análise completa
      </span>

      <span class="player-details-arrow">
        +
      </span>

    </button>


    <div
      class="player-complete-analysis"
      id="${idDetalhes}"
      hidden
    >

      <div class="player-secondary-metrics">

        <div>

          <span>
            Média geral
          </span>

          <strong>
            ${formatarPontos(
              jogador.mediaGeral
            )}
          </strong>

        </div>

        <div>

          <span>
            Média recente
          </span>

          <strong>
            ${formatarPontos(
              jogador.mediaRecente
            )}
          </strong>

        </div>

        <div>

          <span>
            Mediana
          </span>

          <strong>
            ${formatarPontos(
              jogador.mediana
            )}
          </strong>

        </div>

        <div>

          <span>
            Titularidade
          </span>

          <strong>
            ${formatarPorcentagem(
              jogador.titularidade
            )}
          </strong>

        </div>

      </div>


      ${criarResumoMotorHtml(
        jogador,
        resultadoMotor
      )}


      <div class="player-analysis-box positive">

        <h4>

          <span>
            ✓
          </span>

          Por que foi recomendado

        </h4>

        <ul>
          ${justificativas}
        </ul>

      </div>


      <div class="player-analysis-box attention">

        <h4>

          <span>
            !
          </span>

          Pontos de atenção

        </h4>

        <ul>
          ${pontosAtencao}
        </ul>

      </div>


      <details class="player-details">

        <summary>
          Ver composição da nota
        </summary>

        <div class="components-list">
          ${componentes}
        </div>

      </details>

    </div>
  `;

  return card;
}


/* =========================================================
   3. NOTA EXIBIDA
   ========================================================= */

function obterNotaExibicaoJogador(
  jogador,
  resultadoMotor
) {
  const notaJson =
    Number(
      jogador?.notaFinal
    );

  if (
    Number.isFinite(
      notaJson
    )
  ) {
    return notaJson;
  }

  return numeroSeguro(
    resultadoMotor?.notaFinal
  );
}


/* =========================================================
   4. RESULTADO DO MOTOR
   ========================================================= */

function obterResultadoMotorJogador(
  jogador
) {
  if (
    typeof calcularNotaJogadorComMotor !==
    "function"
  ) {
    return null;
  }

  try {
    return calcularNotaJogadorComMotor(
      jogador
    );
  } catch (erro) {
    console.warn(
      "Não foi possível executar " +
      "o motor para o jogador:",
      jogador?.nome,
      erro
    );

    return null;
  }
}


/* =========================================================
   5. RESUMO DO MOTOR NO CARD
   ========================================================= */

function criarResumoMotorHtml(
  jogador,
  resultadoMotor
) {
  if (
    !resultadoMotor ||
    resultadoMotor.erro
  ) {
    return "";
  }

  const notaMotor =
    numeroSeguro(
      resultadoMotor.notaFinal
    );

  const classificacao =
    resultadoMotor.classificacao ||
    classificarNotaFinal(
      notaMotor
    );

  const explicacao =
    resultadoMotor.explicacao;

  const pontosFortes =
    Array.isArray(
      explicacao?.pontosFortes
    )
      ? explicacao.pontosFortes
          .slice(0, 3)
      : [];

  const pontosFortesHtml =
    pontosFortes.length > 0
      ? pontosFortes
          .map(
            (item) => `
              <li>
                ${escaparHtml(item)}
              </li>
            `
          )
          .join("")
      : `
          <li>
            O motor ainda não possui
            componentes suficientes
            para uma explicação detalhada.
          </li>
        `;

  return `
    <div class="player-analysis-box positive">

      <h4>

        <span>
          ∑
        </span>

        Leitura do Motor Estatístico

      </h4>

      <p>
        Nota calculada pelo motor:
        <strong>
          ${formatarDecimal(
            notaMotor,
            1
          )}
        </strong>

        •

        Classificação:
        <strong>
          ${escaparHtml(
            classificacao
          )}
        </strong>
      </p>

      <ul>
        ${pontosFortesHtml}
      </ul>

    </div>
  `;
}


/* =========================================================
   6. MOTIVO PRINCIPAL
   ========================================================= */

function obterMotivoPrincipal(
  jogador
) {
  if (
    Array.isArray(
      jogador.justificativas
    ) &&
    jogador.justificativas.length > 0
  ) {
    return jogador.justificativas[0];
  }

  const resultadoMotor =
    obterResultadoMotorJogador(
      jogador
    );

  const primeiroPonto =
    resultadoMotor
      ?.explicacao
      ?.pontosFortes
      ?.[0];

  if (primeiroPonto) {
    return primeiroPonto;
  }

  return (
    "Boa combinação entre projeção, " +
    "confronto, regularidade e confiança."
  );
}


/* =========================================================
   7. ETIQUETAS ESPECIAIS
   ========================================================= */

function criarEtiquetasEspeciaisJogador(
  jogador
) {
  const etiquetas = [];

  if (jogador.cobraPenalti) {
    etiquetas.push(
      `
        <span class="special-tag">
          Pênaltis
        </span>
      `
    );
  }

  if (jogador.cobraBolaParada) {
    etiquetas.push(
      `
        <span class="special-tag">
          Bola parada
        </span>
      `
    );
  }

  if (
    numeroSeguro(
      jogador.minutosEsperados
    ) >= 88
  ) {
    etiquetas.push(
      `
        <span class="special-tag">
          90 minutos prováveis
        </span>
      `
    );
  }

  if (
    numeroSeguro(
      jogador.chanceSG
    ) >= 45
  ) {
    etiquetas.push(
      `
        <span class="special-tag">
          Boa chance de SG
        </span>
      `
    );
  }

  if (
    numeroSeguro(
      jogador.regularidade
    ) >= 80
  ) {
    etiquetas.push(
      `
        <span class="special-tag">
          Alta regularidade
        </span>
      `
    );
  }

  if (
    numeroSeguro(
      jogador.custoBeneficio
    ) >= 1
  ) {
    etiquetas.push(
      `
        <span class="special-tag">
          Bom custo-benefício
        </span>
      `
    );
  }

  return etiquetas.join("");
}


/* =========================================================
   8. COMPONENTES DA NOTA
   ========================================================= */

function criarComponentesNotaJogador(
  jogador
) {
  const componentesJson =
    jogador?.componentes;

  if (
    ehObjetoValido(
      componentesJson
    )
  ) {
    return criarComponentesPorObjeto(
      componentesJson
    );
  }

  const resultadoMotor =
    obterResultadoMotorJogador(
      jogador
    );

  if (
    ehObjetoValido(
      resultadoMotor?.contribuicoes
    )
  ) {
    return criarComponentesMotor(
      resultadoMotor.contribuicoes
    );
  }

  return `
    <p>
      Composição da nota
      não informada.
    </p>
  `;
}


/* =========================================================
   9. COMPONENTES DO JSON
   ========================================================= */

function criarComponentesPorObjeto(
  componentes
) {
  return Object.entries(
    componentes
  )
    .map(
      ([rotulo, valor]) => {
        const valorSeguro =
          limitarValor(
            valor,
            0,
            100
          );

        return `
          <div class="component-row">

            <div class="component-label">

              <span>
                ${escaparHtml(rotulo)}
              </span>

              <strong>
                ${Math.round(
                  valorSeguro
                )}
              </strong>

            </div>

            <div class="component-track">

              <div
                class="component-fill"
                style="
                  width: ${valorSeguro}%;
                "
              >
              </div>

            </div>

          </div>
        `;
      }
    )
    .join("");
}


/* =========================================================
   10. COMPONENTES DO MOTOR
   ========================================================= */

function criarComponentesMotor(
  contribuicoes
) {
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
    .map(
      (item) => {
        const nota =
          limitarValor(
            item.nota,
            0,
            100
          );

        return `
          <div class="component-row">

            <div class="component-label">

              <span>
                ${escaparHtml(
                  item.nome ||
                  item.criterio
                )}

                <small>
                  Peso:
                  ${formatarDecimal(
                    item.peso,
                    0
                  )}%
                </small>
              </span>

              <strong>
                ${Math.round(nota)}
              </strong>

            </div>

            <div class="component-track">

              <div
                class="component-fill"
                style="
                  width: ${nota}%;
                "
              >
              </div>

            </div>

          </div>
        `;
      }
    )
    .join("");
}


/* =========================================================
   11. BOTÕES DA ANÁLISE COMPLETA
   ========================================================= */

function configurarBotoesAnaliseJogador() {
  const botoes =
    document.querySelectorAll(
      "[data-player-details-button]"
    );

  botoes.forEach((botao) => {
    botao.addEventListener(
      "click",
      () => {
        alternarAnaliseJogador(
          botao
        );
      }
    );
  });
}


/* =========================================================
   12. ABRIR E FECHAR ANÁLISE
   ========================================================= */

function alternarAnaliseJogador(
  botao
) {
  const idDetalhes =
    botao.dataset
      .playerDetailsButton;

  const detalhes =
    document.getElementById(
      idDetalhes
    );

  if (!detalhes) {
    return;
  }

  const aberto =
    botao.getAttribute(
      "aria-expanded"
    ) === "true";

  botao.setAttribute(
    "aria-expanded",
    String(!aberto)
  );

  detalhes.hidden = aberto;

  const texto =
    botao.querySelector(
      "span:first-child"
    );

  const seta =
    botao.querySelector(
      ".player-details-arrow"
    );

  if (texto) {
    texto.textContent =
      aberto
        ? "Ver análise completa"
        : "Ocultar análise completa";
  }

  if (seta) {
    seta.textContent =
      aberto
        ? "+"
        : "−";
  }

  botao.classList.toggle(
    "open",
    !aberto
  );
}
