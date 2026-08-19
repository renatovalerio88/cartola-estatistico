/* =========================================================
   CARTOLA ESTATÍSTICO
   Filtros de exclusão — clubes e jogadores

   Objetivo:

   Permitir que o usuário retire manualmente:

   - clubes;
   - jogadores;

   das Recomendações e dos Times sugeridos.

   Exemplo:

   - Fluminense não jogará com força máxima;
   - Pedro foi confirmado fora;
   - usuário não confia em determinado clube.

   IMPORTANTE:

   O filtro NÃO altera:

   - projeções;
   - pesos;
   - histórico;
   - patrimônio;
   - banco;
   - Reserva de Luxo;
   - dados originais.

   Ele apenas retira candidatos antes da nova montagem.

   ========================================================= */


const CartolaFiltrosExclusao = (() => {


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    inicializado: false,

    aplicando: false,

    clubesDisponiveis: [],

    jogadoresDisponiveis: [],

    clubesExcluidos:
      new Set(),

    jogadoresExcluidos:
      new Set(),

    snapshotCriado: false,

    rodadaSnapshot: null

  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */


  function texto(
    valor
  ) {

    return String(
      valor ?? ""
    ).trim();

  }


  function normalizarTexto(
    valor
  ) {

    return texto(
      valor
    )
      .toLowerCase()
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );

  }


  function escaparHtml(
    valor
  ) {

    return texto(
      valor
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


  function obterIdJogador(
    jogador
  ) {

    return String(

      jogador?.id

      ??

      jogador?.atletaId

      ??

      jogador?.atleta_id

      ??

      jogador?.slug

      ??

      jogador?.nome

      ??

      jogador?.apelido

      ??

      ""

    );

  }


  function obterNomeJogador(
    jogador
  ) {

    return texto(

      jogador?.apelido

      ??

      jogador?.nome

      ??

      "Jogador"

    );

  }


  function obterPosicaoJogador(
    jogador
  ) {

    return texto(

      jogador?.posicao

      ??

      jogador?.posicaoSigla

      ??

      jogador?.posicao_sigla

      ??

      ""

    ).toUpperCase();

  }


  function obterClubeJogador(
    jogador
  ) {

    return texto(

      jogador?.siglaClube

      ??

      jogador?.clubeSigla

      ??

      jogador?.clube

      ??

      ""

    ).toUpperCase();

  }


  function copiarJogador(
    jogador
  ) {

    if (
      !jogador ||
      typeof jogador !==
        "object"
    ) {

      return jogador;

    }


    return {

      ...jogador,

      scouts: {
        ...(jogador.scouts || {})
      },

      historico:
        Array.isArray(
          jogador.historico
        )
          ? jogador.historico.map(
              item => ({

                ...item,

                scouts: {
                  ...(item?.scouts || {})
                }

              })
            )
          : jogador.historico

    };

  }


  /* =======================================================
     JOGADORES ORIGINAIS
     ======================================================= */


  function obterJogadoresOriginais() {

    if (
      typeof estadoRecomendacoes !==
        "undefined" &&
      Array.isArray(
        estadoRecomendacoes
          .jogadoresOriginais
      ) &&
      estadoRecomendacoes
        .jogadoresOriginais
        .length > 0
    ) {

      return estadoRecomendacoes
        .jogadoresOriginais
        .map(
          copiarJogador
        );

    }


    if (
      typeof window !==
        "undefined" &&
      window.CartolaRecomendacoes &&
      typeof window
        .CartolaRecomendacoes
        .obterJogadoresCarregados ===
        "function"
    ) {

      return window
        .CartolaRecomendacoes
        .obterJogadoresCarregados()
        .map(
          copiarJogador
        );

    }


    return [];

  }


  /* =======================================================
     ESCALAÇÕES ATUAIS
     ======================================================= */


  function obterEscalacoesAtuais() {

    if (
      typeof window !==
        "undefined" &&
      typeof window
        .obterEscalacoesCarregadas ===
        "function"
    ) {

      const resultado =
        window
          .obterEscalacoesCarregadas();


      return Array.isArray(
        resultado
      )
        ? resultado
        : [];

    }


    if (
      typeof window !==
        "undefined" &&
      window.CartolaEscalacoes &&
      typeof window
        .CartolaEscalacoes
        .obter ===
        "function"
    ) {

      const resultado =
        window
          .CartolaEscalacoes
          .obter();


      return Array.isArray(
        resultado
      )
        ? resultado
        : [];

    }


    if (
      typeof estadoEscalacoes !==
        "undefined" &&
      Array.isArray(
        estadoEscalacoes.escalacoes
      )
    ) {

      return estadoEscalacoes
        .escalacoes;

    }


    return [];

  }


  /* =======================================================
     JOGADORES DAS ESCALAÇÕES
     ======================================================= */


  function obterJogadoresDasEscalacoes() {

    const escalacoes =
      obterEscalacoesAtuais();


    const mapa =
      new Map();


    escalacoes.forEach(
      escalacao => {

        const grupos = [

          escalacao?.titulares,

          escalacao?.jogadores,

          escalacao?.banco

        ];


        grupos.forEach(
          grupo => {

            if (
              !Array.isArray(
                grupo
              )
            ) {

              return;

            }


            grupo.forEach(
              jogador => {

                const id =
                  obterIdJogador(
                    jogador
                  );


                if (
                  !id ||
                  mapa.has(
                    id
                  )
                ) {

                  return;

                }


                mapa.set(
                  id,
                  copiarJogador(
                    jogador
                  )
                );

              }
            );

          }
        );

      }
    );


    return [
      ...mapa.values()
    ];

  }


  /* =======================================================
     SNAPSHOT DAS OPÇÕES
     ======================================================= */


  function criarSnapshotOpcoes() {

    if (
      estado.snapshotCriado
    ) {

      return true;

    }


    const jogadoresOriginais =
      obterJogadoresOriginais();


    if (
      jogadoresOriginais.length ===
      0
    ) {

      return false;

    }


    /*
     * Preferimos jogadores que apareceram nos
     * três times sugeridos.
     *
     * Se as escalações ainda não estiverem prontas,
     * usamos a lista completa de recomendações.
     */

    const jogadoresEscalados =
      obterJogadoresDasEscalacoes();


    const baseOpcoes =
      jogadoresEscalados.length > 0
        ? jogadoresEscalados
        : jogadoresOriginais;


    const clubes =
      [
        ...new Set(

          baseOpcoes
            .map(
              obterClubeJogador
            )
            .filter(
              Boolean
            )

        )
      ]
        .sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        );


    const jogadores =
      baseOpcoes
        .filter(
          jogador =>
            obterIdJogador(
              jogador
            )
        )
        .sort(
          (
            a,
            b
          ) => {

            const clubeA =
              obterClubeJogador(
                a
              );


            const clubeB =
              obterClubeJogador(
                b
              );


            if (
              clubeA !==
              clubeB
            ) {

              return clubeA.localeCompare(
                clubeB,
                "pt-BR"
              );

            }


            return obterNomeJogador(
              a
            ).localeCompare(
              obterNomeJogador(
                b
              ),
              "pt-BR"
            );

          }
        );


    estado.clubesDisponiveis =
      clubes;


    estado.jogadoresDisponiveis =
      jogadores;


    estado.snapshotCriado =
      true;


    return true;

  }


  /* =======================================================
     VERIFICA EXCLUSÃO
     ======================================================= */


  function jogadorEstaExcluido(
    jogador
  ) {

    const id =
      obterIdJogador(
        jogador
      );


    const clube =
      obterClubeJogador(
        jogador
      );


    if (
      clube &&
      estado.clubesExcluidos.has(
        clube
      )
    ) {

      return true;

    }


    if (
      id &&
      estado.jogadoresExcluidos.has(
        id
      )
    ) {

      return true;

    }


    return false;

  }


  /* =======================================================
     APLICA FILTRO À BASE
     ======================================================= */


  function aplicarFiltroNaBase() {

    if (
      typeof estadoRecomendacoes ===
        "undefined"
    ) {

      return [];

    }


    const originais =
      obterJogadoresOriginais();


    const filtrados =
      originais
        .filter(
          jogador =>
            !jogadorEstaExcluido(
              jogador
            )
        )
        .map(
          copiarJogador
        );


    /*
     * MUITO IMPORTANTE:
     *
     * jogadoresOriginais permanece intacto.
     *
     * Somente jogadores — a base ativa usada
     * pela interface e pelas escalações —
     * recebe o filtro.
     */

    estadoRecomendacoes.jogadores =
      filtrados;


    return filtrados;

  }


  /* =======================================================
     ATUALIZA RECOMENDAÇÕES
     ======================================================= */


  function atualizarRecomendacoes() {

    try {

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

    } catch (erro) {

      console.warn(
        "Não foi possível atualizar as recomendações após o filtro:",
        erro
      );

    }

  }


  /* =======================================================
     RECALCULA ESCALAÇÕES
     ======================================================= */


  async function atualizarEscalacoes() {

    if (
      typeof window !==
        "undefined" &&
      typeof window
        .recalcularEscalacoes ===
        "function"
    ) {

      return await window
        .recalcularEscalacoes();

    }


    if (
      typeof window !==
        "undefined" &&
      window.CartolaEscalacoes &&
      typeof window
        .CartolaEscalacoes
        .recalcular ===
        "function"
    ) {

      return await window
        .CartolaEscalacoes
        .recalcular();

    }


    return [];

  }


  /* =======================================================
     APLICAÇÃO COMPLETA
     ======================================================= */


  async function aplicarFiltros() {

    if (
      estado.aplicando
    ) {

      return;

    }


    estado.aplicando =
      true;


    atualizarEstadoDosCheckboxes();


    aplicarFiltroNaBase();


    atualizarRecomendacoes();


    atualizarMensagemStatus(
      "Recalculando times..."
    );


    try {

      await atualizarEscalacoes();


      atualizarMensagemStatus(
        criarTextoResumoFiltros()
      );


      atualizarContadores();


    } catch (erro) {

      console.error(
        "Erro ao recalcular após aplicar filtros:",
        erro
      );


      atualizarMensagemStatus(
        "Não foi possível recalcular os times."
      );

    } finally {

      estado.aplicando =
        false;

    }

  }


  /* =======================================================
     RESTAURA TUDO
     ======================================================= */


  async function limparFiltros() {

    estado.clubesExcluidos.clear();

    estado.jogadoresExcluidos.clear();


    document
      .querySelectorAll(
        ".ce-exclusion-club-checkbox, .ce-exclusion-player-checkbox"
      )
      .forEach(
        checkbox => {

          checkbox.checked =
            false;

        }
      );


    await aplicarFiltros();

  }


  /* =======================================================
     LÊ CHECKBOXES
     ======================================================= */


  function atualizarEstadoDosCheckboxes() {

    estado.clubesExcluidos.clear();

    estado.jogadoresExcluidos.clear();


    document
      .querySelectorAll(
        ".ce-exclusion-club-checkbox:checked"
      )
      .forEach(
        checkbox => {

          const clube =
            texto(
              checkbox.value
            ).toUpperCase();


          if (clube) {

            estado
              .clubesExcluidos
              .add(
                clube
              );

          }

        }
      );


    document
      .querySelectorAll(
        ".ce-exclusion-player-checkbox:checked"
      )
      .forEach(
        checkbox => {

          const id =
            texto(
              checkbox.value
            );


          if (id) {

            estado
              .jogadoresExcluidos
              .add(
                id
              );

          }

        }
      );

  }


  /* =======================================================
     SINCRONIZA CHECKBOXES DUPLICADOS
     ======================================================= */


  function sincronizarCheckboxes() {

    document
      .querySelectorAll(
        ".ce-exclusion-club-checkbox"
      )
      .forEach(
        checkbox => {

          checkbox.checked =
            estado
              .clubesExcluidos
              .has(
                texto(
                  checkbox.value
                ).toUpperCase()
              );

        }
      );


    document
      .querySelectorAll(
        ".ce-exclusion-player-checkbox"
      )
      .forEach(
        checkbox => {

          checkbox.checked =
            estado
              .jogadoresExcluidos
              .has(
                texto(
                  checkbox.value
                )
              );

        }
      );

  }


  /* =======================================================
     CONTADORES
     ======================================================= */


  function atualizarContadores() {

    const clubes =
      estado
        .clubesExcluidos
        .size;


    const jogadores =
      estado
        .jogadoresExcluidos
        .size;


    document
      .querySelectorAll(
        ".ce-exclusion-count"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            (
              clubes === 0 &&
              jogadores === 0
            )
              ? "Nenhuma exclusão"
              : (
                  `${clubes} clube(s) · ` +
                  `${jogadores} jogador(es)`
                );

        }
      );


    sincronizarCheckboxes();

  }


  /* =======================================================
     TEXTO DO RESUMO
     ======================================================= */


  function criarTextoResumoFiltros() {

    const clubes =
      estado
        .clubesExcluidos
        .size;


    const jogadores =
      estado
        .jogadoresExcluidos
        .size;


    if (
      clubes === 0 &&
      jogadores === 0
    ) {

      return (
        "Sem exclusões manuais. " +
        "Modelo usando todos os candidatos disponíveis."
      );

    }


    return (
      `Filtro aplicado: ${clubes} clube(s) e ` +
      `${jogadores} jogador(es) excluído(s).`
    );

  }


  /* =======================================================
     MENSAGEM
     ======================================================= */


  function atualizarMensagemStatus(
    mensagem
  ) {

    document
      .querySelectorAll(
        ".ce-exclusion-status"
      )
      .forEach(
        elemento => {

          elemento.textContent =
            mensagem;

        }
      );

  }


  /* =======================================================
     BUSCA DE JOGADORES
     ======================================================= */


  function filtrarListaJogadores(
    painel,
    termo
  ) {

    if (!painel) {

      return;

    }


    const busca =
      normalizarTexto(
        termo
      );


    painel
      .querySelectorAll(
        ".ce-exclusion-player-item"
      )
      .forEach(
        item => {

          const chave =
            normalizarTexto(
              item.dataset.search
            );


          item.hidden =
            (
              busca &&
              !chave.includes(
                busca
              )
            );

        }
      );

  }


  /* =======================================================
     HTML CLUBES
     ======================================================= */


  function criarHtmlClubes() {

    if (
      estado
        .clubesDisponiveis
        .length === 0
    ) {

      return `

        <div class="ce-exclusion-empty">
          Nenhum clube encontrado.
        </div>

      `;

    }


    return estado
      .clubesDisponiveis
      .map(
        clube => `

          <label
            class="ce-exclusion-option"
          >

            <input
              type="checkbox"
              class="ce-exclusion-club-checkbox"
              value="${escaparHtml(
                clube
              )}"
            >

            <span>
              ${escaparHtml(
                clube
              )}
            </span>

          </label>

        `
      )
      .join("");

  }


  /* =======================================================
     HTML JOGADORES
     ======================================================= */


  function criarHtmlJogadores() {

    if (
      estado
        .jogadoresDisponiveis
        .length === 0
    ) {

      return `

        <div class="ce-exclusion-empty">
          Nenhum jogador encontrado.
        </div>

      `;

    }


    return estado
      .jogadoresDisponiveis
      .map(
        jogador => {

          const id =
            obterIdJogador(
              jogador
            );


          const nome =
            obterNomeJogador(
              jogador
            );


          const clube =
            obterClubeJogador(
              jogador
            );


          const posicao =
            obterPosicaoJogador(
              jogador
            );


          const busca =
            [
              nome,
              clube,
              posicao
            ].join(
              " "
            );


          return `

            <label
              class="ce-exclusion-option ce-exclusion-player-item"
              data-search="${escaparHtml(
                busca
              )}"
            >

              <input
                type="checkbox"
                class="ce-exclusion-player-checkbox"
                value="${escaparHtml(
                  id
                )}"
              >

              <span
                class="ce-exclusion-player-text"
              >

                <strong>
                  ${escaparHtml(
                    nome
                  )}
                </strong>

                <small>
                  ${escaparHtml(
                    posicao
                  )}
                  ·
                  ${escaparHtml(
                    clube
                  )}
                </small>

              </span>

            </label>

          `;

        }
      )
      .join("");

  }


  /* =======================================================
     HTML DO PAINEL
     ======================================================= */


  function criarHtmlPainel() {

    return `

      <div
        class="ce-exclusion-panel"
      >

        <div
          class="ce-exclusion-header"
        >

          <div>

            <strong>
              Ajustes manuais da rodada
            </strong>

            <p>
              Retire clubes ou jogadores e
              recalcule as recomendações e os
              três times sugeridos.
            </p>

          </div>


          <span
            class="ce-exclusion-count"
          >
            Nenhuma exclusão
          </span>

        </div>


        <div
          class="ce-exclusion-columns"
        >

          <div
            class="ce-exclusion-group"
          >

            <button
              type="button"
              class="ce-exclusion-toggle"
            >

              <span>
                Clubes
              </span>

              <small>
                selecionar exclusões
              </small>

            </button>


            <div
              class="ce-exclusion-options"
            >

              ${criarHtmlClubes()}

            </div>

          </div>


          <div
            class="ce-exclusion-group"
          >

            <button
              type="button"
              class="ce-exclusion-toggle"
            >

              <span>
                Jogadores
              </span>

              <small>
                selecionar exclusões
              </small>

            </button>


            <div
              class="ce-exclusion-options"
            >

              <input
                type="search"
                class="ce-exclusion-search"
                placeholder="Buscar jogador..."
                autocomplete="off"
              >


              <div
                class="ce-exclusion-player-list"
              >

                ${criarHtmlJogadores()}

              </div>

            </div>

          </div>

        </div>


        <div
          class="ce-exclusion-actions"
        >

          <button
            type="button"
            class="ce-exclusion-apply"
          >
            Recalcular com filtros
          </button>


          <button
            type="button"
            class="ce-exclusion-clear"
          >
            Limpar filtros
          </button>


          <span
            class="ce-exclusion-status"
          >
            Sem exclusões manuais.
          </span>

        </div>

      </div>

    `;

  }


  /* =======================================================
     ESTILOS
     ======================================================= */


  function garantirEstilos() {

    if (
      document.getElementById(
        "ceExclusionFiltersStyle"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "ceExclusionFiltersStyle";


    style.textContent = `

      .ce-exclusion-panel {
        margin: 18px 0 24px;
        padding: 16px;
        border: 1px solid
          rgba(255,255,255,.09);
        border-radius: 16px;
        background:
          rgba(255,255,255,.025);
      }

      .ce-exclusion-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .ce-exclusion-header strong {
        display: block;
        font-size: 15px;
      }

      .ce-exclusion-header p {
        max-width: 720px;
        margin: 5px 0 0;
        font-size: 12px;
        line-height: 1.5;
        opacity: .7;
      }

      .ce-exclusion-count {
        flex: 0 0 auto;
        padding: 7px 10px;
        border-radius: 999px;
        background:
          rgba(255,255,255,.06);
        font-size: 11px;
        white-space: nowrap;
      }

      .ce-exclusion-columns {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .ce-exclusion-group {
        position: relative;
      }

      .ce-exclusion-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid
          rgba(255,255,255,.09);
        border-radius: 12px;
        background:
          rgba(255,255,255,.025);
        color: inherit;
        cursor: pointer;
        text-align: left;
      }

      .ce-exclusion-toggle span {
        font-weight: 700;
      }

      .ce-exclusion-toggle small {
        opacity: .6;
      }

      .ce-exclusion-options {
        display: none;
        margin-top: 8px;
        max-height: 310px;
        overflow-y: auto;
        padding: 8px;
        border: 1px solid
          rgba(255,255,255,.08);
        border-radius: 12px;
        background:
          rgba(0,0,0,.12);
      }

      .ce-exclusion-group.open
      .ce-exclusion-options {
        display: block;
      }

      .ce-exclusion-option {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 9px;
        border-radius: 9px;
        cursor: pointer;
      }

      .ce-exclusion-option:hover {
        background:
          rgba(255,255,255,.045);
      }

      .ce-exclusion-option input {
        flex: 0 0 auto;
      }

      .ce-exclusion-player-text {
        min-width: 0;
      }

      .ce-exclusion-player-text strong {
        display: block;
        font-size: 12px;
      }

      .ce-exclusion-player-text small {
        display: block;
        margin-top: 2px;
        font-size: 10px;
        opacity: .62;
      }

      .ce-exclusion-search {
        width: 100%;
        margin-bottom: 7px;
        padding: 9px 10px;
        border: 1px solid
          rgba(255,255,255,.09);
        border-radius: 9px;
        background:
          rgba(255,255,255,.04);
        color: inherit;
        outline: none;
      }

      .ce-exclusion-actions {
        display: flex;
        align-items: center;
        gap: 9px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      .ce-exclusion-apply,
      .ce-exclusion-clear {
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .ce-exclusion-apply {
        border: 0;
        background: #43a66f;
        color: #071b11;
      }

      .ce-exclusion-clear {
        border: 1px solid
          rgba(255,255,255,.12);
        background:
          rgba(255,255,255,.035);
        color: inherit;
      }

      .ce-exclusion-status {
        margin-left: auto;
        font-size: 11px;
        opacity: .68;
      }

      .ce-exclusion-empty {
        padding: 10px;
        font-size: 11px;
        opacity: .65;
      }

      @media (
        max-width: 760px
      ) {

        .ce-exclusion-columns {
          grid-template-columns: 1fr;
        }

        .ce-exclusion-header {
          flex-direction: column;
        }

        .ce-exclusion-status {
          width: 100%;
          margin-left: 0;
        }

      }

    `;


    document.head
      .appendChild(
        style
      );

  }


  /* =======================================================
     EVENTOS DE UM PAINEL
     ======================================================= */


  function configurarEventosPainel(
    painel
  ) {

    if (!painel) {

      return;

    }


    painel
      .querySelectorAll(
        ".ce-exclusion-toggle"
      )
      .forEach(
        botao => {

          botao.addEventListener(
            "click",
            () => {

              const grupo =
                botao.closest(
                  ".ce-exclusion-group"
                );


              if (grupo) {

                grupo.classList
                  .toggle(
                    "open"
                  );

              }

            }
          );

        }
      );


    const busca =
      painel.querySelector(
        ".ce-exclusion-search"
      );


    if (busca) {

      busca.addEventListener(
        "input",
        () => {

          filtrarListaJogadores(
            painel,
            busca.value
          );

        }
      );

    }


    painel
      .querySelectorAll(
        ".ce-exclusion-club-checkbox"
      )
      .forEach(
        checkbox => {

          checkbox.addEventListener(
            "change",
            () => {

              const clube =
                texto(
                  checkbox.value
                ).toUpperCase();


              if (
                checkbox.checked
              ) {

                estado
                  .clubesExcluidos
                  .add(
                    clube
                  );

              } else {

                estado
                  .clubesExcluidos
                  .delete(
                    clube
                  );

              }


              atualizarContadores();

            }
          );

        }
      );


    painel
      .querySelectorAll(
        ".ce-exclusion-player-checkbox"
      )
      .forEach(
        checkbox => {

          checkbox.addEventListener(
            "change",
            () => {

              const id =
                texto(
                  checkbox.value
                );


              if (
                checkbox.checked
              ) {

                estado
                  .jogadoresExcluidos
                  .add(
                    id
                  );

              } else {

                estado
                  .jogadoresExcluidos
                  .delete(
                    id
                  );

              }


              atualizarContadores();

            }
          );

        }
      );


    const aplicar =
      painel.querySelector(
        ".ce-exclusion-apply"
      );


    if (aplicar) {

      aplicar.addEventListener(
        "click",
        aplicarFiltros
      );

    }


    const limpar =
      painel.querySelector(
        ".ce-exclusion-clear"
      );


    if (limpar) {

      limpar.addEventListener(
        "click",
        limparFiltros
      );

    }

  }


  /* =======================================================
     INSERE PAINEL NA ABA
     ======================================================= */


  function inserirPainel(
    secao,
    id
  ) {

    if (!secao) {

      return false;

    }


    if (
      secao.querySelector(
        `#${id}`
      )
    ) {

      return true;

    }


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.id =
      id;


    wrapper.className =
      "ce-exclusion-wrapper";


    wrapper.innerHTML =
      criarHtmlPainel();


    /*
     * Colocamos antes das listas/cards principais.
     */

    const referencia =

      secao.querySelector(
        "#playersGrid"
      )

      ||

      secao.querySelector(
        ".players-grid"
      )

      ||

      secao.querySelector(
        ".lineups-grid"
      )

      ||

      secao.querySelector(
        ".strategy-grid"
      )

      ||

      null;


    if (
      referencia &&
      referencia.parentNode
    ) {

      referencia.parentNode
        .insertBefore(
          wrapper,
          referencia
        );

    } else {

      secao.appendChild(
        wrapper
      );

    }


    configurarEventosPainel(
      wrapper
    );


    return true;

  }


  /* =======================================================
     CRIA OS DOIS PAINÉIS
     ======================================================= */


  function criarPaineis() {

    garantirEstilos();


    if (
      !criarSnapshotOpcoes()
    ) {

      return false;

    }


    const recomendacoes =
      document.getElementById(
        "recomendacoes"
      );


    const times =
      document.getElementById(
        "times"
      );


    inserirPainel(
      recomendacoes,
      "ceExclusionRecommendations"
    );


    inserirPainel(
      times,
      "ceExclusionTeams"
    );


    atualizarContadores();


    atualizarMensagemStatus(
      criarTextoResumoFiltros()
    );


    estado.inicializado =
      true;


    return true;

  }


  /* =======================================================
     ESPERA DADOS
     ======================================================= */


  async function esperarDados() {

    /*
     * Aguarda recomendações e escalações iniciais.
     *
     * Máximo aproximado:
     * 30 x 200 ms = 6 segundos.
     */

    for (
      let tentativa = 0;
      tentativa < 30;
      tentativa += 1
    ) {

      const jogadores =
        obterJogadoresOriginais();


      const escalacoes =
        obterEscalacoesAtuais();


      if (
        jogadores.length > 0 &&
        escalacoes.length > 0
      ) {

        return true;

      }


      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            200
          )
      );

    }


    /*
     * Mesmo sem escalações prontas,
     * conseguimos montar o filtro com
     * os jogadores disponíveis.
     */

    return (
      obterJogadoresOriginais()
        .length > 0
    );

  }


  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */


  async function inicializar() {

    if (
      estado.inicializado
    ) {

      return true;

    }


    await esperarDados();


    return criarPaineis();

  }


  /* =======================================================
     DIAGNÓSTICO
     ======================================================= */


  function obterEstado() {

    return {

      inicializado:
        estado.inicializado,

      aplicando:
        estado.aplicando,

      clubesDisponiveis:
        [
          ...estado.clubesDisponiveis
        ],

      jogadoresDisponiveis:
        estado
          .jogadoresDisponiveis
          .map(
            jogador => ({

              id:
                obterIdJogador(
                  jogador
                ),

              nome:
                obterNomeJogador(
                  jogador
                ),

              clube:
                obterClubeJogador(
                  jogador
                ),

              posicao:
                obterPosicaoJogador(
                  jogador
                )

            })
          ),

      clubesExcluidos:
        [
          ...estado.clubesExcluidos
        ],

      jogadoresExcluidos:
        [
          ...estado.jogadoresExcluidos
        ]

    };

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */


  return {

    inicializar,

    aplicar:
      aplicarFiltros,

    limpar:
      limparFiltros,

    obterEstado,

    jogadorEstaExcluido

  };


})();


/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */


if (
  typeof window !==
  "undefined"
) {

  window.CartolaFiltrosExclusao =
    CartolaFiltrosExclusao;


  window.addEventListener(
    "load",
    () => {

      setTimeout(
        () => {

          CartolaFiltrosExclusao
            .inicializar();

        },
        250
      );

    }
  );

}
