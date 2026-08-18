/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — criação e exibição dos cards
   ========================================================= */


/* =========================================================
   1. EXIBIÇÃO DAS ESCALAÇÕES
   ========================================================= */

function exibirEscalacoes() {
  const container =
    obterContainerEscalacoes();

  if (!container) {
    return;
  }

  const escalacoes =
    obterEscalacoesCarregadas();

  if (
    !Array.isArray(escalacoes) ||
    escalacoes.length === 0
  ) {
    exibirSemEscalacoes();
    return;
  }

  container.innerHTML = "";

  const controlePatrimonio =
    criarControlePatrimonioEscalacoes(
      escalacoes
    );

  if (controlePatrimonio) {
    container.appendChild(
      controlePatrimonio
    );
  }

  escalacoes.forEach(
    (escalacao) => {
      const card =
        criarCardEscalacao(
          escalacao
        );

      container.appendChild(card);
    }
  );

  configurarBotoesDetalhesEscalacao();
  configurarControlePatrimonioEscalacoes();
}


/* =========================================================
   2. CONTROLE DE PATRIMÔNIO
   ========================================================= */

function criarControlePatrimonioEscalacoes(
  escalacoes
) {
  const lista =
    Array.isArray(escalacoes)
      ? escalacoes
      : [];

  const primeiraEscalacao =
    lista[0] || null;

  const patrimonioSelecionado =
    typeof obterPatrimonioSelecionadoEscalacoes === "function"
      ? obterPatrimonioSelecionadoEscalacoes()
      : null;

  const limiteAtual =
    patrimonioSelecionado ??
    numeroSeguro(
      primeiraEscalacao?.limitePatrimonio ??
      120
    );

  const controle =
    document.createElement("section");

  controle.className =
    "lineup-budget-control";

  controle.innerHTML = `
    <div class="lineup-budget-copy">

      <span class="lineup-budget-kicker">
        ORÇAMENTO DA ESCALAÇÃO
      </span>

      <strong>
        Defina seu patrimônio
      </strong>

      <p>
        Os três times serão recalculados respeitando o valor disponível,
        incluindo titulares e banco.
      </p>

    </div>

    <div class="lineup-budget-actions">

      <label for="lineupBudgetInput">
        Patrimônio disponível
      </label>

      <div class="lineup-budget-input-wrap">

        <span>
          C$
        </span>

        <input
          id="lineupBudgetInput"
          type="number"
          min="1"
          step="0.01"
          inputmode="decimal"
          value="${escaparHtml(
            numeroSeguro(limiteAtual)
              .toFixed(2)
          )}"
        >

      </div>

      <button
        id="lineupBudgetApply"
        class="lineup-budget-apply"
        type="button"
      >
        Recalcular times
      </button>

      <button
        id="lineupBudgetReset"
        class="lineup-budget-reset"
        type="button"
      >
        Restaurar padrão
      </button>

      <small
        id="lineupBudgetStatus"
        class="lineup-budget-status"
        aria-live="polite"
      >
        ${
          patrimonioSelecionado !== null
            ? `Patrimônio personalizado: ${formatarCartoletas(
                patrimonioSelecionado
              )}`
            : `Limite atual: ${formatarCartoletas(
                limiteAtual
              )}`
        }
      </small>

    </div>
  `;

  return controle;
}


function configurarControlePatrimonioEscalacoes() {
  const input =
    document.getElementById(
      "lineupBudgetInput"
    );

  const botaoAplicar =
    document.getElementById(
      "lineupBudgetApply"
    );

  const botaoRestaurar =
    document.getElementById(
      "lineupBudgetReset"
    );

  const status =
    document.getElementById(
      "lineupBudgetStatus"
    );

  if (!input || !botaoAplicar) {
    return;
  }

  const definirEstadoCarregando =
    (carregando) => {
      input.disabled =
        carregando;

      botaoAplicar.disabled =
        carregando;

      if (botaoRestaurar) {
        botaoRestaurar.disabled =
          carregando;
      }

      botaoAplicar.textContent =
        carregando
          ? "Recalculando..."
          : "Recalcular times";
    };


  const aplicarPatrimonio =
    async () => {
      const valor =
        Number(
          String(input.value)
            .replace(",", ".")
        );

      if (
        !Number.isFinite(valor) ||
        valor <= 0
      ) {
        if (status) {
          status.textContent =
            "Informe um patrimônio válido.";
        }

        input.focus();

        return;
      }

      if (
        typeof definirPatrimonioEscalacoes !==
        "function"
      ) {
        if (status) {
          status.textContent =
            "Motor de patrimônio indisponível.";
        }

        return;
      }

      definirEstadoCarregando(
        true
      );

      if (status) {
        status.textContent =
          "Recalculando as três estratégias...";
      }

      try {
        await definirPatrimonioEscalacoes(
          valor
        );
      } catch (erro) {
        console.error(
          "Erro ao recalcular patrimônio:",
          erro
        );

        definirEstadoCarregando(
          false
        );

        if (status) {
          status.textContent =
            erro?.message ||
            "Não foi possível recalcular os times.";
        }
      }
    };


  botaoAplicar.addEventListener(
    "click",
    aplicarPatrimonio
  );


  input.addEventListener(
    "keydown",
    (evento) => {
      if (
        evento.key === "Enter"
      ) {
        evento.preventDefault();

        aplicarPatrimonio();
      }
    }
  );


  if (botaoRestaurar) {
    botaoRestaurar.addEventListener(
      "click",
      async () => {
        if (
          typeof restaurarPatrimonioPadraoEscalacoes !==
          "function"
        ) {
          return;
        }

        definirEstadoCarregando(
          true
        );

        if (status) {
          status.textContent =
            "Restaurando orçamento padrão...";
        }

        try {
          await restaurarPatrimonioPadraoEscalacoes();
        } catch (erro) {
          console.error(
            "Erro ao restaurar patrimônio:",
            erro
          );

          definirEstadoCarregando(
            false
          );

          if (status) {
            status.textContent =
              erro?.message ||
              "Não foi possível restaurar o orçamento.";
          }
        }
      }
    );
  }
}


/* =========================================================
   3. CRIAÇÃO DO CARD PRINCIPAL
   ========================================================= */

function criarCardEscalacao(
  escalacao
) {
  const card =
    document.createElement("article");

  const classePerfil =
    obterClassePerfilEscalacao(
      escalacao
    );

  const classeRisco =
    obterClasseRisco(
      escalacao.risco
    );

  const classeConfianca =
    obterClasseConfiancaNumerica(
      escalacao.confianca
    );

  const idDetalhes =
    `lineup-details-${escalacao.id}`;

  const jogadoresOrdenados =
    [...escalacao.jogadores].sort(
      compararJogadoresEscalacao
    );

  const jogadoresHtml =
    jogadoresOrdenados
      .map(
        (jogador) =>
          criarJogadorTitularHtml(
            jogador,
            escalacao.capitao
          )
      )
      .join("");

  const bancoHtml =
    criarBancoHtml(
      escalacao.banco
    );

  const pontosPositivos =
    criarItensLista(
      escalacao.pontosPositivos,
      "Nenhum ponto positivo cadastrado."
    );

  const pontosAtencao =
    criarItensLista(
      escalacao.pontosAtencao,
      "Nenhum ponto de atenção cadastrado."
    );

  /*
   * custo agora representa o custo completo
   * da escalação: titulares + banco.
   *
   * Mantemos fallback para custoTotal para
   * compatibilidade com versões futuras.
   */
  const custoTotal =
    numeroSeguro(
      escalacao.custoTotal ??
      escalacao.custo
    );

  /*
   * O saldo já é calculado pela camada de dados.
   * O cálculo local abaixo fica apenas como
   * fallback para compatibilidade.
   */
  const saldo =
    escalacao.saldo !== null &&
    escalacao.saldo !== undefined &&
    Number.isFinite(
      Number(
        escalacao.saldo
      )
    )
      ? numeroSeguro(
          escalacao.saldo
        )
      : (
          numeroSeguro(
            escalacao.limitePatrimonio
          ) -
          custoTotal
        );

  card.className =
    `suggested-lineup-card ${classePerfil}`;

  card.innerHTML = `
    <div class="lineup-card-header">

      <div>

        <span class="lineup-profile-tag">
          ${escaparHtml(
            escalacao.perfil ||
            escalacao.nome
          )}
        </span>

        <h3>
          ${escaparHtml(
            escalacao.nome
          )}
        </h3>

        <p>
          ${escaparHtml(
            escalacao.subtitulo ||
            ""
          )}
        </p>

      </div>

      <div class="lineup-formation">

        <span>
          Formação
        </span>

        <strong>
          ${escaparHtml(
            escalacao.formacao ||
            "--"
          )}
        </strong>

      </div>

    </div>


    <div class="lineup-cost-row">

      <div>
        <span>Custo total</span>
        <strong>
          ${formatarCartoletas(
            custoTotal
          )}
        </strong>
      </div>

      <div>
        <span>Limite</span>
        <strong>
          ${formatarCartoletas(
            escalacao.limitePatrimonio
          )}
        </strong>
      </div>

      <div>
        <span>Saldo</span>
        <strong>
          ${formatarCartoletas(
            saldo
          )}
        </strong>
      </div>

    </div>


    <div class="lineup-main-metrics">

      <div class="lineup-main-metric projection">
        <span>Projeção</span>
        <strong>
          ${formatarPontos(
            escalacao.projecao
          )}
        </strong>
      </div>

      <div class="lineup-main-metric">
        <span>Piso</span>
        <strong>
          ${formatarPontos(
            escalacao.piso
          )}
        </strong>
      </div>

      <div class="lineup-main-metric">
        <span>Teto</span>
        <strong>
          ${formatarPontos(
            escalacao.teto
          )}
        </strong>
      </div>

    </div>


    <div class="lineup-confidence">

      ${criarBarraIndicador(
        "Confiança da escalação",
        escalacao.confianca,
        classeConfianca
      )}

    </div>


    <div class="lineup-badges">

      <span class="lineup-badge formation">
        ${escaparHtml(
          escalacao.formacao ||
          "--"
        )}
      </span>

      <span
        class="
          lineup-badge
          ${classeRisco}
        "
      >
        Risco
        ${escaparHtml(
          escalacao.risco ||
          "Não informado"
        )}
      </span>

      <span class="lineup-badge players-count">
        ${jogadoresOrdenados.length}
        titulares
      </span>

    </div>


    ${criarCapitaoHtml(
      escalacao.capitao,
      escalacao.justificativaCapitao
    )}


    <div class="lineup-players-title">
      TITULARES
    </div>


    <div class="lineup-players-list">
      ${jogadoresHtml}
    </div>


    <div class="lineup-strategy-summary">

      <strong>
        Justificativa da estratégia
      </strong>

      <p>
        ${escaparHtml(
          escalacao.justificativa ||
          "Justificativa não informada."
        )}
      </p>

    </div>


    <button
      class="lineup-details-button"
      type="button"
      aria-expanded="false"
      aria-controls="${idDetalhes}"
      data-lineup-details-button="${idDetalhes}"
    >

      <span>
        Ver banco e análise completa
      </span>

      <span class="lineup-details-arrow">
        +
      </span>

    </button>


    <div
      class="lineup-complete-analysis"
      id="${idDetalhes}"
      hidden
    >

      <section class="lineup-detail-section">

        <div class="lineup-detail-heading">

          <span
            class="
              lineup-special-symbol
              reserve
            "
          >
            R
          </span>

          <div>

            <strong>
              Banco
            </strong>

            <p>
              ${escaparHtml(
                escalacao.justificativaBanco ||
                "Justificativa do banco não informada."
              )}
            </p>

          </div>

        </div>

        <div class="lineup-bench-grid">
          ${bancoHtml}
        </div>

      </section>


      <section class="lineup-detail-section">

        <div class="lineup-detail-heading">

          <span
            class="
              lineup-special-symbol
              luxury
            "
          >
            ★
          </span>

          <div>

            <strong>
              Reserva de Luxo
            </strong>

            <p>
              ${escaparHtml(
                escalacao.justificativaReservaLuxo ||
                "Justificativa da Reserva de Luxo não informada."
              )}
            </p>

          </div>

        </div>

        ${criarReservaLuxoHtml(
          escalacao.reservaLuxo
        )}

      </section>


      <div class="lineup-analysis-columns">

        <div
          class="
            lineup-analysis-box
            positive
          "
        >

          <h4>
            Pontos positivos
          </h4>

          <ul>
            ${pontosPositivos}
          </ul>

        </div>

        <div
          class="
            lineup-analysis-box
            attention
          "
        >

          <h4>
            Pontos de atenção
          </h4>

          <ul>
            ${pontosAtencao}
          </ul>

        </div>

      </div>

    </div>
  `;

  return card;
}


/* =========================================================
   4. FUNÇÕES DE APRESENTAÇÃO DO JOGADOR
   ========================================================= */

function obterNomeCurtoJogador(
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

  if (partes.length <= 2) {
    return nome;
  }

  return `${partes[0]} ${partes[partes.length - 1]}`;
}


/* =========================================================
   5. NORMALIZAÇÃO VISUAL DO SCORE
   ========================================================= */

function normalizarScoreVisual(
  valor
) {
  let score =
    Number(valor);

  if (!Number.isFinite(score)) {
    return "--";
  }

  /*
   * O score visual deve permanecer
   * na escala de 0 a 100.
   *
   * Alguns registros históricos chegam
   * com casas decimais deslocadas.
   *
   * Exemplos:
   *
   * 1080  -> 10.8
   * 269.3 -> 26.93
   * 188.3 -> 18.83
   * 80.8  -> 80.8
   *
   * A correção abaixo é SOMENTE VISUAL.
   * Não modifica a projeção estatística.
   */

  score =
    Math.abs(score);

  while (score > 100) {
    score =
      score / 10;
  }

  return score
    .toFixed(1)
    .replace(".", ",");
}


/* =========================================================
   6. CAPITÃO
   ========================================================= */

function criarCapitaoHtml(
  capitao,
  justificativa
) {
  if (!capitao) {
    return `
      <div class="lineup-captain-highlight">

        <span class="lineup-special-symbol">
          C
        </span>

        <div>

          <small>
            Capitão
          </small>

          <strong>
            Não informado
          </strong>

        </div>

      </div>
    `;
  }

  return `
    <div class="lineup-captain-highlight">

      <span class="lineup-special-symbol">
        C
      </span>

      <div>

        <small>
          Capitão
        </small>

        <strong>
          ${escaparHtml(
            obterNomeCurtoJogador(
              capitao
            )
          )}
        </strong>

        <p>
          ${escaparHtml(
            justificativa ||
            "Justificativa não informada."
          )}
        </p>

      </div>

    </div>
  `;
}


/* =========================================================
   7. JOGADOR TITULAR
   ========================================================= */

function criarJogadorTitularHtml(
  jogador,
  capitao
) {
  const ehCapitao =
    String(jogador.id) ===
    String(capitao?.id);

  return `
    <div class="lineup-player-row">

      <span class="lineup-position-pill">
        ${escaparHtml(
          jogador.posicao ||
          "--"
        )}
      </span>

      <div class="lineup-player-name">

        <strong>

          ${escaparHtml(
            obterNomeCurtoJogador(
              jogador
            )
          )}

          ${
            ehCapitao
              ? `
                <span
                  class="lineup-captain-mini"
                  title="Capitão"
                >
                  C
                </span>
              `
              : ""
          }

        </strong>

        <small>
          ${escaparHtml(
            jogador.siglaClube ||
            jogador.clube ||
            "--"
          )}
        </small>

      </div>

      <div class="lineup-player-numbers">

        <strong>
          ${formatarPontos(
            jogador.projecao
          )}

          <small>
            ⭐ ${normalizarScoreVisual(
              jogador.score
            )}
          </small>
        </strong>

        <small>
          ${formatarCartoletas(
            jogador.preco
          )}
        </small>

      </div>

    </div>
  `;
}


/* =========================================================
   8. BANCO
   ========================================================= */

function criarBancoHtml(
  banco
) {
  if (
    !Array.isArray(banco) ||
    banco.length === 0
  ) {
    return `
      <p>
        Banco não informado.
      </p>
    `;
  }

  return [...banco]
    .sort(
      compararJogadoresEscalacao
    )
    .map(
      criarJogadorBancoHtml
    )
    .join("");
}


function criarJogadorBancoHtml(
  jogador
) {
  return `
    <article class="lineup-bench-player">

      <span>
        ${escaparHtml(
          jogador.posicao ||
          "--"
        )}
      </span>

      <strong>
        ${escaparHtml(
          obterNomeCurtoJogador(
            jogador
          )
        )}
      </strong>

      <small>

        ${escaparHtml(
          jogador.siglaClube ||
          jogador.clube ||
          "--"
        )}

        •

        ${formatarPontos(
          jogador.projecao
        )}

        •

        ⭐ ${normalizarScoreVisual(
          jogador.score
        )}

      </small>

    </article>
  `;
}


/* =========================================================
   9. RESERVA DE LUXO
   ========================================================= */

function criarReservaLuxoHtml(
  jogador
) {
  if (!jogador) {
    return `
      <div class="lineup-luxury-player">
        Reserva de Luxo não informado.
      </div>
    `;
  }

  return `
    <div class="lineup-luxury-player">

      <div>

        <span>
          ${escaparHtml(
            jogador.posicao ||
            "--"
          )}
        </span>

        <strong>
          ${escaparHtml(
            obterNomeCurtoJogador(
              jogador
            )
          )}
        </strong>

        <small>
          ${escaparHtml(
            jogador.siglaClube ||
            jogador.clube ||
            "--"
          )}
        </small>

      </div>

      <div>

        <strong>
          ${formatarPontos(
            jogador.projecao
          )}
        </strong>

        <small>
          ⭐ ${normalizarScoreVisual(
            jogador.score
          )}
        </small>

        <small>
          ${formatarCartoletas(
            jogador.preco
          )}
        </small>

      </div>

    </div>
  `;
}


/* =========================================================
   10. PERFIL DA ESCALAÇÃO
   ========================================================= */

function obterClassePerfilEscalacao(
  escalacao
) {
  const perfil =
    normalizarTexto(
      escalacao.corPerfil ||
      escalacao.perfil ||
      escalacao.id ||
      escalacao.nome
    );

  if (
    perfil.includes("azul") ||
    perfil.includes("equilibr")
  ) {
    return "balanced";
  }

  if (
    perfil.includes("dourado") ||
    perfil.includes("agress") ||
    perfil.includes("teto")
  ) {
    return "aggressive";
  }

  return "conservative";
}


/* =========================================================
   11. BOTÃO DE DETALHES
   ========================================================= */

function configurarBotoesDetalhesEscalacao() {
  const botoes =
    document.querySelectorAll(
      "[data-lineup-details-button]"
    );

  botoes.forEach((botao) => {
    botao.addEventListener(
      "click",
      () => {
        alternarDetalhesEscalacao(
          botao
        );
      }
    );
  });
}


function alternarDetalhesEscalacao(
  botao
) {
  const idDetalhes =
    botao.dataset
      .lineupDetailsButton;

  const detalhes =
    document.getElementById(
      idDetalhes
    );

  if (!detalhes) {
    return;
  }

  const estaAberto =
    botao.getAttribute(
      "aria-expanded"
    ) === "true";

  botao.setAttribute(
    "aria-expanded",
    String(!estaAberto)
  );

  detalhes.hidden =
    estaAberto;

  const texto =
    botao.querySelector(
      "span:first-child"
    );

  const seta =
    botao.querySelector(
      ".lineup-details-arrow"
    );

  if (texto) {
    texto.textContent =
      estaAberto
        ? "Ver banco e análise completa"
        : "Ocultar banco e análise";
  }

  if (seta) {
    seta.textContent =
      estaAberto
        ? "+"
        : "−";
  }

  botao.classList.toggle(
    "open",
    !estaAberto
  );
}
