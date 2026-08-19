/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — criação e exibição dos cards
   ========================================================= */


/* =========================================================
   CONTAINER
   ========================================================= */


function obterContainerEscalacoes() {

  return (
    document.getElementById(
      "suggestedLineupsGrid"
    ) ||
    document.getElementById(
      "suggestedLineups"
    ) ||
    document.querySelector(
      "[data-suggested-lineups]"
    ) ||
    document.querySelector(
      ".suggested-lineups-grid"
    )
  );

}


/* =========================================================
   DADOS
   ========================================================= */


function obterEscalacoesCarregadas() {

  if (
    typeof EscalacoesDados !==
      "undefined" &&
    EscalacoesDados &&
    typeof EscalacoesDados.obter ===
      "function"
  ) {

    const escalacoes =
      EscalacoesDados.obter();


    if (
      Array.isArray(
        escalacoes
      )
    ) {

      return escalacoes;

    }

  }


  if (
    typeof obterEscalacoes ===
      "function"
  ) {

    const escalacoes =
      obterEscalacoes();


    if (
      Array.isArray(
        escalacoes
      )
    ) {

      return escalacoes;

    }

  }


  if (
    typeof estadoEscalacoes !==
      "undefined" &&
    Array.isArray(
      estadoEscalacoes
        ?.escalacoes
    )
  ) {

    return estadoEscalacoes
      .escalacoes;

  }


  return [];

}


/* =========================================================
   UTILITÁRIOS
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


function escaparHtml(
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


function formatarPontos(
  valor
) {

  const numero =
    Number(valor);


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  return (
    `${numero.toFixed(1)} pts`
  );

}


function formatarCartoletas(
  valor
) {

  const numero =
    Number(valor);


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "C$ --";

  }


  return (
    `C$ ${numero.toFixed(2)}`
  );

}


function formatarScore(
  valor
) {

  let score =
    Number(valor);


  if (
    !Number.isFinite(
      score
    )
  ) {

    return "--";

  }


  score =
    Math.abs(
      score
    );


  while (
    score > 100
  ) {

    score /=
      10;

  }


  return score
    .toFixed(1)
    .replace(
      ".",
      ","
    );

}


/* =========================================================
   NOME CURTO
   ========================================================= */


function obterNomeCurtoJogador(
  jogador
) {

  if (!jogador) {

    return "Jogador";

  }


  const apelido =
    String(
      jogador.apelido || ""
    )
      .trim();


  if (apelido) {

    return apelido;

  }


  const nome =
    String(
      jogador.nome || ""
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
      .filter(Boolean);


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
   POSIÇÕES
   ========================================================= */


function compararJogadoresEscalacao(
  jogadorA,
  jogadorB
) {

  const ordem = {

    GOL: 1,

    LAT: 2,

    ZAG: 3,

    MEI: 4,

    ATA: 5,

    TEC: 6

  };


  const posicaoA =
    String(
      jogadorA?.posicao || ""
    )
      .toUpperCase();


  const posicaoB =
    String(
      jogadorB?.posicao || ""
    )
      .toUpperCase();


  const ordemA =
    ordem[posicaoA] ??
    99;


  const ordemB =
    ordem[posicaoB] ??
    99;


  if (
    ordemA !==
    ordemB
  ) {

    return (
      ordemA -
      ordemB
    );

  }


  return (
    numeroSeguro(
      jogadorB?.projecao
    ) -
    numeroSeguro(
      jogadorA?.projecao
    )
  );

}


/* =========================================================
   RISCO
   ========================================================= */


function obterRiscoNumericoEscalacao(
  escalacao
) {

  const risco =
    Number(
      escalacao?.risco
    );


  return Number.isFinite(
    risco
  )
    ? risco
    : null;

}


function obterTextoRiscoEscalacao(
  escalacao
) {

  const textoOriginal =
    String(
      escalacao?.riscoTexto ??
      ""
    )
      .trim();


  if (
    textoOriginal
  ) {

    return textoOriginal;

  }


  const risco =
    obterRiscoNumericoEscalacao(
      escalacao
    );


  if (
    risco === null
  ) {

    const texto =
      String(
        escalacao?.risco ??
        ""
      );


    if (
      texto &&
      !Number.isFinite(
        Number(texto)
      )
    ) {

      return texto;

    }


    return "Não informado";

  }


  if (
    risco <= 30
  ) {

    return "Baixo";

  }


  if (
    risco <= 60
  ) {

    return "Médio";

  }


  return "Alto";

}


function obterClasseRisco(
  escalacao
) {

  const texto =
    normalizarTexto(
      obterTextoRiscoEscalacao(
        escalacao
      )
    );


  if (
    texto.includes(
      "baixo"
    )
  ) {

    return "low";

  }


  if (
    texto.includes(
      "alto"
    )
  ) {

    return "high";

  }


  return "medium";

}


/* =========================================================
   CONFIANÇA
   ========================================================= */


function obterClasseConfiancaNumerica(
  valor
) {

  const numero =
    numeroSeguro(
      valor
    );


  if (
    numero >= 80
  ) {

    return "high";

  }


  if (
    numero >= 60
  ) {

    return "medium";

  }


  return "low";

}


function criarBarraIndicador(
  titulo,
  valor,
  classe = ""
) {

  const numero =
    Math.max(
      0,
      Math.min(
        100,
        numeroSeguro(
          valor
        )
      )
    );


  return `

    <div
      class="
        lineup-indicator
        ${escaparHtml(
          classe
        )}
      "
    >

      <div
        class="lineup-indicator-label"
      >

        <span>
          ${escaparHtml(
            titulo
          )}
        </span>

        <strong>
          ${numero.toFixed(0)}%
        </strong>

      </div>


      <div
        class="lineup-indicator-track"
      >

        <span
          style="
            width:
            ${numero}%;
          "
        ></span>

      </div>

    </div>

  `;

}


/* =========================================================
   LISTAS
   ========================================================= */


function criarItensLista(
  itens,
  textoVazio
) {

  if (
    !Array.isArray(
      itens
    ) ||
    itens.length === 0
  ) {

    return `

      <li>
        ${escaparHtml(
          textoVazio
        )}
      </li>

    `;

  }


  return itens
    .filter(Boolean)
    .map(
      item => `

        <li>
          ${escaparHtml(
            item
          )}
        </li>

      `
    )
    .join("");

}


/* =========================================================
   BANCO — JUSTIFICATIVA
   ========================================================= */


function criarJustificativaBancoGeralEscalacao(
  banco
) {

  const reservas =
    Array.isArray(
      banco
    )
      ? banco
      : [];


  if (
    reservas.length === 0
  ) {

    return "";

  }


  const posicoes =
    reservas
      .map(
        jogador =>
          String(
            jogador?.posicao ??
            ""
          )
            .toUpperCase()
      )
      .filter(Boolean);


  return (

    `Banco com ${reservas.length} reserva(s) ` +
    `nas posições ${posicoes.join(", ")}. ` +
    `Os reservas não consomem o patrimônio da escalação ` +
    `e respeitam o preço máximo permitido para sua posição.`

  );

}


/* =========================================================
   SEM ESCALAÇÃO
   ========================================================= */


function exibirSemEscalacoes() {

  const container =
    obterContainerEscalacoes();


  if (!container) {

    return;

  }


  container.classList.add(
    "suggested-lineups-container"
  );


  container.innerHTML = `

    <div class="empty-state">

      <div class="empty-state-icon">
        CE
      </div>

      <strong>
        Escalações em construção
      </strong>

      <p>
        Não foi possível montar os times sugeridos
        com os dados disponíveis neste momento.
      </p>

    </div>

  `;

}


/* =========================================================
   PATRIMÔNIO ATUAL
   ========================================================= */


function obterPatrimonioAtualCards(
  escalacoes
) {

  if (
    typeof EscalacoesDados !==
      "undefined" &&
    EscalacoesDados &&
    typeof EscalacoesDados
      .obterPatrimonio ===
      "function"
  ) {

    const valor =
      Number(
        EscalacoesDados
          .obterPatrimonio()
      );


    if (
      Number.isFinite(
        valor
      ) &&
      valor > 0
    ) {

      return valor;

    }

  }


  if (
    typeof obterPatrimonioAtualEscalacoes ===
      "function"
  ) {

    const valor =
      Number(
        obterPatrimonioAtualEscalacoes()
      );


    if (
      Number.isFinite(
        valor
      ) &&
      valor > 0
    ) {

      return valor;

    }

  }


  const primeira =
    Array.isArray(
      escalacoes
    )
      ? escalacoes[0]
      : null;


  return numeroSeguro(
    primeira
      ?.limitePatrimonio,
    120
  );

}


/* =========================================================
   CONTROLE DE PATRIMÔNIO
   ========================================================= */


function criarControlePatrimonioEscalacoes(
  escalacoes
) {

  const limiteAtual =
    obterPatrimonioAtualCards(
      escalacoes
    );


  const controle =
    document.createElement(
      "section"
    );


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
        Os três times serão recalculados respeitando
        o valor disponível para os 11 titulares
        e o treinador. O banco não consome patrimônio.
      </p>

    </div>


    <div class="lineup-budget-actions">

      <label
        for="lineupBudgetInput"
      >
        Patrimônio disponível
      </label>


      <div
        class="lineup-budget-input-wrap"
      >

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
            limiteAtual
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
        Limite atual:
        ${formatarCartoletas(
          limiteAtual
        )}
      </small>

    </div>

  `;


  return controle;

}


/* =========================================================
   EVENTOS DO PATRIMÔNIO
   ========================================================= */


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


  if (
    !input ||
    !botaoAplicar
  ) {

    return;

  }


  function definirCarregando(
    carregando
  ) {

    input.disabled =
      carregando;


    botaoAplicar.disabled =
      carregando;


    if (
      botaoRestaurar
    ) {

      botaoRestaurar.disabled =
        carregando;

    }


    botaoAplicar.textContent =
      carregando
        ? "Recalculando..."
        : "Recalcular times";

  }


  async function aplicarPatrimonio() {

    const valor =
      Number(
        String(
          input.value
        )
          .replace(
            ",",
            "."
          )
      );


    if (
      !Number.isFinite(
        valor
      ) ||
      valor <= 0
    ) {

      if (
        status
      ) {

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

      if (
        status
      ) {

        status.textContent =
          "Motor de patrimônio indisponível.";

      }


      return;

    }


    definirCarregando(
      true
    );


    if (
      status
    ) {

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


      definirCarregando(
        false
      );


      if (
        status
      ) {

        status.textContent =
          erro?.message ||
          "Não foi possível recalcular os times.";

      }

    }

  }


  botaoAplicar.addEventListener(
    "click",
    aplicarPatrimonio
  );


  input.addEventListener(
    "keydown",
    evento => {

      if (
        evento.key ===
        "Enter"
      ) {

        evento.preventDefault();

        aplicarPatrimonio();

      }

    }
  );


  if (
    botaoRestaurar
  ) {

    botaoRestaurar.addEventListener(
      "click",
      async () => {

        if (
          typeof restaurarPatrimonioPadraoEscalacoes !==
            "function"
        ) {

          return;

        }


        definirCarregando(
          true
        );


        if (
          status
        ) {

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


          definirCarregando(
            false
          );


          if (
            status
          ) {

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
   CAPITÃO
   ========================================================= */


function criarCapitaoHtml(
  capitao,
  justificativa
) {

  if (!capitao) {

    return `

      <div
        class="lineup-captain-highlight"
      >

        <span
          class="lineup-special-symbol"
        >
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

    <div
      class="lineup-captain-highlight"
    >

      <span
        class="lineup-special-symbol"
      >
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
            "Escolhido pelo modelo estatístico para maximizar a pontuação esperada como capitão."
          )}
        </p>

      </div>

    </div>

  `;

}


/* =========================================================
   TITULAR
   ========================================================= */


function criarJogadorTitularHtml(
  jogador,
  capitao
) {

  const ehCapitao =
    String(
      jogador?.id
    ) ===
    String(
      capitao?.id
    );


  return `

    <div
      class="lineup-player-row"
    >

      <span
        class="lineup-position-pill"
      >
        ${escaparHtml(
          jogador?.posicao ||
          "--"
        )}
      </span>


      <div
        class="lineup-player-name"
      >

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
            jogador?.siglaClube ||
            jogador?.clube ||
            "--"
          )}

        </small>

      </div>


      <div
        class="lineup-player-numbers"
      >

        <strong>

          ${formatarPontos(
            jogador?.projecao
          )}

          <small>
            ⭐ Nota
            ${formatarScore(
              jogador?.score
            )}
          </small>

        </strong>


        <small>

          ${formatarCartoletas(
            jogador?.preco
          )}

        </small>

      </div>

    </div>

  `;

}


/* =========================================================
   BANCO
   ========================================================= */


function criarJogadorBancoHtml(
  jogador
) {

  return `

    <article
      class="lineup-bench-player"
    >

      <span>
        ${escaparHtml(
          jogador?.posicao ||
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
          jogador?.siglaClube ||
          jogador?.clube ||
          "--"
        )}

        •

        ${formatarPontos(
          jogador?.projecao
        )}

        •

        ⭐ Nota
        ${formatarScore(
          jogador?.score
        )}

        •

        ${formatarCartoletas(
          jogador?.preco
        )}

      </small>

    </article>

  `;

}


function criarBancoHtml(
  banco
) {

  if (
    !Array.isArray(
      banco
    ) ||
    banco.length === 0
  ) {

    return `

      <p>
        Banco não informado.
      </p>

    `;

  }


  return [
    ...banco
  ]
    .sort(
      compararJogadoresEscalacao
    )
    .map(
      criarJogadorBancoHtml
    )
    .join("");

}


/* =========================================================
   RESERVA DE LUXO
   ========================================================= */


function criarReservaLuxoHtml(
  jogador
) {

  if (!jogador) {

    return `

      <div
        class="lineup-luxury-player"
      >
        Reserva de Luxo não informado.
      </div>

    `;

  }


  return `

    <div
      class="lineup-luxury-player"
    >

      <div>

        <span>
          ${escaparHtml(
            jogador?.posicao ||
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
            jogador?.siglaClube ||
            jogador?.clube ||
            "--"
          )}
        </small>

      </div>


      <div>

        <strong>
          ${formatarPontos(
            jogador?.projecao
          )}
        </strong>

        <small>
          ⭐ Nota
          ${formatarScore(
            jogador?.score
          )}
        </small>

        <small>
          ${formatarCartoletas(
            jogador?.preco
          )}
        </small>

      </div>

    </div>

  `;

}


/* =========================================================
   PERFIL
   ========================================================= */


function obterClassePerfilEscalacao(
  escalacao
) {

  const perfil =
    normalizarTexto(
      escalacao?.corPerfil ||
      escalacao?.perfil ||
      escalacao?.id ||
      escalacao?.nome
    );


  if (
    perfil.includes(
      "equilibr"
    ) ||
    perfil.includes(
      "azul"
    )
  ) {

    return "balanced";

  }


  if (
    perfil.includes(
      "agress"
    ) ||
    perfil.includes(
      "teto"
    ) ||
    perfil.includes(
      "dourado"
    )
  ) {

    return "aggressive";

  }


  return "conservative";

}


/* =========================================================
   CARD
   ========================================================= */


function criarCardEscalacao(
  escalacao
) {

  const card =
    document.createElement(
      "article"
    );


  const classePerfil =
    obterClassePerfilEscalacao(
      escalacao
    );


  const classeRisco =
    obterClasseRisco(
      escalacao
    );


  const classeConfianca =
    obterClasseConfiancaNumerica(
      escalacao?.confianca
    );


  const idDetalhes =
    (
      "lineup-details-" +
      Math.random()
        .toString(36)
        .slice(2)
    );


  const listaJogadores =
    Array.isArray(
      escalacao?.titulares
    )
      ? escalacao.titulares
      : (
          Array.isArray(
            escalacao?.jogadores
          )
            ? escalacao.jogadores
            : []
        );


  const jogadoresOrdenados =
    [
      ...listaJogadores
    ]
      .sort(
        compararJogadoresEscalacao
      );


  const jogadoresHtml =
    jogadoresOrdenados
      .map(
        jogador =>
          criarJogadorTitularHtml(
            jogador,
            escalacao?.capitao
          )
      )
      .join("");


  const bancoHtml =
    criarBancoHtml(
      escalacao?.banco
    );


  /*
   * CORREÇÃO CRÍTICA:
   *
   * Patrimônio considera SOMENTE
   * os titulares + treinador.
   *
   * Não utilizamos custoTotal,
   * pois ele contém o banco.
   */

  const custoTitulares =
    numeroSeguro(

      escalacao
        ?.custoTitulares

      ??

      escalacao
        ?.custo

    );


  const limite =
    numeroSeguro(
      escalacao
        ?.limitePatrimonio
    );


  const saldo =
    (
      escalacao?.saldo !==
        null &&
      escalacao?.saldo !==
        undefined &&
      Number.isFinite(
        Number(
          escalacao.saldo
        )
      )
    )
      ? numeroSeguro(
          escalacao.saldo
        )
      : (
          limite -
          custoTitulares
        );


  const pontosPositivos =
    criarItensLista(

      escalacao
        ?.pontosPositivos,

      "Nenhum ponto positivo cadastrado."

    );


  const pontosAtencao =
    criarItensLista(

      escalacao
        ?.pontosAtencao,

      "Nenhum ponto de atenção cadastrado."

    );


  const justificativaEstrategia = (

    escalacao?.justificativa

    ||

    escalacao?.descricao

    ||

    escalacao?.descricaoPerfil

    ||

    "Escalação construída pelo modelo estatístico de acordo com o perfil selecionado."

  );


  card.className =
    (
      "suggested-lineup-card " +
      classePerfil
    );


  card.innerHTML = `

    <div
      class="lineup-card-header"
    >

      <div>

        <span
          class="lineup-profile-tag"
        >

          ${escaparHtml(
            escalacao?.perfil ||
            escalacao?.nome ||
            "Modelo"
          )}

        </span>


        <h3>

          ${escaparHtml(
            escalacao?.nome ||
            escalacao?.perfil ||
            "Time sugerido"
          )}

        </h3>


        <p>

          ${escaparHtml(
            escalacao?.subtitulo ||
            escalacao?.estrategia ||
            ""
          )}

        </p>

      </div>


      <div
        class="lineup-formation"
      >

        <span>
          Formação
        </span>

        <strong>
          ${escaparHtml(
            escalacao?.formacao ||
            "--"
          )}
        </strong>

      </div>

    </div>


    <div
      class="lineup-cost-row"
    >

      <div>

        <span>
          Custo dos titulares
        </span>

        <strong>
          ${formatarCartoletas(
            custoTitulares
          )}
        </strong>

      </div>


      <div>

        <span>
          Limite
        </span>

        <strong>
          ${formatarCartoletas(
            limite
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


    <div
      class="lineup-main-metrics"
    >

      <div
        class="
          lineup-main-metric
          projection
        "
      >

        <span>
          Projeção
        </span>

        <strong>
          ${formatarPontos(
            escalacao?.projecao
          )}
        </strong>

      </div>


      <div
        class="lineup-main-metric"
      >

        <span>
          Piso
        </span>

        <strong>
          ${formatarPontos(
            escalacao?.piso
          )}
        </strong>

      </div>


      <div
        class="lineup-main-metric"
      >

        <span>
          Teto
        </span>

        <strong>
          ${formatarPontos(
            escalacao?.teto
          )}
        </strong>

      </div>

    </div>


    <div
      class="lineup-confidence"
    >

      ${criarBarraIndicador(
        "Confiança da escalação",
        escalacao?.confianca,
        classeConfianca
      )}

    </div>


    <div
      class="lineup-badges"
    >

      <span
        class="
          lineup-badge
          formation
        "
      >
        ${escaparHtml(
          escalacao?.formacao ||
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
          obterTextoRiscoEscalacao(
            escalacao
          )
        )}
      </span>


      <span
        class="
          lineup-badge
          players-count
        "
      >
        ${jogadoresOrdenados.length}
        titulares
      </span>

    </div>


    ${criarCapitaoHtml(

      escalacao?.capitao,

      escalacao?.justificativaCapitao
      ??
      escalacao?.capitao
        ?.justificativaCapitao
      ??
      escalacao?.capitao
        ?.justificativa

    )}


    <div
      class="lineup-players-title"
    >
      TITULARES
    </div>


    <div
      class="lineup-players-list"
    >
      ${jogadoresHtml}
    </div>


    <div
      class="lineup-strategy-summary"
    >

      <strong>
        Justificativa da estratégia
      </strong>

      <p>
        ${escaparHtml(
          justificativaEstrategia
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

      <span
        class="lineup-details-arrow"
      >
        +
      </span>

    </button>


    <div
      class="lineup-complete-analysis"
      id="${idDetalhes}"
      hidden
    >


      <section
        class="lineup-detail-section"
      >

        <div
          class="lineup-detail-heading"
        >

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

                escalacao
                  ?.justificativaBanco

                ||

                criarJustificativaBancoGeralEscalacao(
                  escalacao?.banco
                )

                ||

                "Banco não informado."

              )}

            </p>

          </div>

        </div>


        <div
          class="lineup-bench-grid"
        >
          ${bancoHtml}
        </div>

      </section>


      <section
        class="lineup-detail-section"
      >

        <div
          class="lineup-detail-heading"
        >

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

                escalacao
                  ?.justificativaReservaLuxo

                ??

                escalacao
                  ?.reservaLuxo
                  ?.justificativaReservaLuxo

                ??

                escalacao
                  ?.reservaLuxo
                  ?.justificativa

                ??

                "Reserva de Luxo escolhida entre os reservas elegíveis pelo modelo estatístico."

              )}

            </p>

          </div>

        </div>


        ${criarReservaLuxoHtml(
          escalacao?.reservaLuxo
        )}

      </section>


      <div
        class="lineup-analysis-columns"
      >

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
   EXIBIÇÃO
   ========================================================= */


function exibirEscalacoes() {

  const container =
    obterContainerEscalacoes();


  if (!container) {

    console.warn(
      "Container de Times sugeridos não encontrado."
    );

    return;

  }


  const escalacoes =
    obterEscalacoesCarregadas();


  if (
    !Array.isArray(
      escalacoes
    ) ||
    escalacoes.length === 0
  ) {

    exibirSemEscalacoes();

    return;

  }


  container.innerHTML =
    "";


  container.classList.add(
    "suggested-lineups-container"
  );


  const controle =
    criarControlePatrimonioEscalacoes(
      escalacoes
    );


  container.appendChild(
    controle
  );


  const grid =
    document.createElement(
      "div"
    );


  grid.className =
    "suggested-lineups-cards-grid";


  escalacoes.forEach(
    escalacao => {

      grid.appendChild(
        criarCardEscalacao(
          escalacao
        )
      );

    }
  );


  container.appendChild(
    grid
  );


  configurarBotoesDetalhesEscalacao();


  configurarControlePatrimonioEscalacoes();

}


/* =========================================================
   DETALHES
   ========================================================= */


function configurarBotoesDetalhesEscalacao() {

  const botoes =
    document.querySelectorAll(
      "[data-lineup-details-button]"
    );


  botoes.forEach(
    botao => {

      botao.addEventListener(
        "click",
        () => {

          alternarDetalhesEscalacao(
            botao
          );

        }
      );

    }
  );

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


  const aberto =
    botao.getAttribute(
      "aria-expanded"
    ) ===
    "true";


  botao.setAttribute(
    "aria-expanded",
    String(
      !aberto
    )
  );


  detalhes.hidden =
    aberto;


  const texto =
    botao.querySelector(
      "span:first-child"
    );


  const seta =
    botao.querySelector(
      ".lineup-details-arrow"
    );


  if (
    texto
  ) {

    texto.textContent =
      aberto
        ? "Ver banco e análise completa"
        : "Ocultar banco e análise";

  }


  if (
    seta
  ) {

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


/* =========================================================
   ATUALIZAÇÃO AUTOMÁTICA
   ========================================================= */


if (
  typeof window !==
    "undefined"
) {

  window.addEventListener(
    "cartola:escalacoes-atualizadas",
    () => {

      exibirEscalacoes();

    }
  );

}


/* =========================================================
   API PÚBLICA
   ========================================================= */


const CartolaEscalacoesCards = {

  renderizar:
    exibirEscalacoes,

  exibir:
    exibirEscalacoes,

  atualizar:
    exibirEscalacoes

};


if (
  typeof window !==
    "undefined"
) {

  window.CartolaEscalacoesCards =
    CartolaEscalacoesCards;

}
