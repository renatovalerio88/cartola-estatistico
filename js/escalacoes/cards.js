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
}


/* =========================================================
   2. CRIAÇÃO DO CARD PRINCIPAL
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

  const saldo =
    numeroSeguro(
      escalacao.limitePatrimonio
    ) -
    numeroSeguro(
      escalacao.custo
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

        <span>
          Custo
        </span>

        <strong>
          ${formatarCartoletas(
            escalacao.custo
          )}
        </strong>

      </div>

      <div>

        <span>
          Limite
        </span>

        <strong>
          ${formatarCartoletas(
            escalacao.limitePatrimonio
          )}
        </strong>

      </div>

      <div>

        <span>
          Saldo
        </span>

        <strong>
          ${formatarCartoletas(
            saldo
          )}
        </strong>

      </div>

    </div>


    <div class="lineup-main-metrics">

      <div class="lineup-main-metric projection">

        <span>
          Projeção
        </span>

        <strong>
          ${formatarPontos(
            escalacao.projecao
          )}
        </strong>

      </div>

      <div class="lineup-main-metric">

        <span>
          Piso
        </span>

        <strong>
          ${formatarPontos(
            escalacao.piso
          )}
        </strong>

      </div>

      <div class="lineup-main-metric">

        <span>
          Teto
        </span>

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
      Titulares
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
   3. CAPITÃO
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
            capitao.nome ||
            "Não informado"
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
   4. JOGADOR TITULAR
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
            jogador.nome ||
            "Jogador"
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
            ⭐ ${jogador.score?.toFixed(1) ?? "--"}
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
   5. BANCO
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
          jogador.nome ||
          "Jogador"
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
         
         ⭐ ${jogador.score?.toFixed(1) ?? "--"}

      </small>

    </article>
  `;
}


/* =========================================================
   6. RESERVA DE LUXO
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
            jogador.nome ||
            "Jogador"
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
             ⭐ ${jogador.score?.toFixed(1) ?? "--"}
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
   7. PERFIL DA ESCALAÇÃO
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
   8. BOTÃO DE DETALHES
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
