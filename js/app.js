/* =========================================================
   CARTOLA ESTATÍSTICO
   Aplicação principal
   ========================================================= */


/* =========================================================
   1. CAMINHOS DOS ARQUIVOS
   ========================================================= */

const CONFIG_PATH = "data/configuracao.json";
const PLAYERS_PATH = "data/jogadores.json";


/* =========================================================
   2. CONFIGURAÇÕES DAS POSIÇÕES
   ========================================================= */

const POSITION_FILTERS = [
  {
    id: "GOL",
    label: "Goleiros",
    singular: "Goleiro",
    quantidade: 3
  },
  {
    id: "LAT",
    label: "Laterais",
    singular: "Lateral",
    quantidade: 5
  },
  {
    id: "ZAG",
    label: "Zagueiros",
    singular: "Zagueiro",
    quantidade: 5
  },
  {
    id: "MEI",
    label: "Meias",
    singular: "Meia",
    quantidade: 5
  },
  {
    id: "ATA",
    label: "Atacantes",
    singular: "Atacante",
    quantidade: 5
  },
  {
    id: "TEC",
    label: "Treinadores",
    singular: "Treinador",
    quantidade: 3
  }
];

const PAGE_TITLES = {
  recomendacoes: "Recomendações",
  times: "Times sugeridos",
  metodologia: "Metodologia",
  analise: "Análise da rodada"
};


/* =========================================================
   3. ESTADO DA APLICAÇÃO
   ========================================================= */

const appState = {
  activeTab: "recomendacoes",
  activePosition: "GOL",
  config: null,
  players: [],
  playersLoaded: false
};


/* =========================================================
   4. INICIALIZAÇÃO
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);

async function initializeApp() {
  setupNavigation();
  setupTheme();
  setupMobileMenu();
  renderPositionFilters();

  await Promise.all([
    loadConfiguration(),
    loadPlayers()
  ]);
}


/* =========================================================
   5. NAVEGAÇÃO ENTRE ABAS
   ========================================================= */

function setupNavigation() {
  const menuItems =
    document.querySelectorAll(".menu-item");

  const tabContents =
    document.querySelectorAll(".tab-content");

  menuItems.forEach((menuItem) => {
    menuItem.addEventListener("click", () => {
      const targetTab =
        menuItem.dataset.tab;

      if (!targetTab) {
        return;
      }

      appState.activeTab = targetTab;

      menuItems.forEach((item) => {
        item.classList.remove("active");
      });

      tabContents.forEach((tab) => {
        tab.classList.remove("active");
      });

      menuItem.classList.add("active");

      const targetContent =
        document.getElementById(targetTab);

      if (targetContent) {
        targetContent.classList.add("active");
      }

      updatePageTitle(targetTab);
      closeMobileMenu();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  });
}

function updatePageTitle(tabId) {
  const pageTitle =
    document.getElementById("pageTitle");

  if (!pageTitle) {
    return;
  }

  pageTitle.textContent =
    PAGE_TITLES[tabId] ||
    "Cartola Estatístico";
}


/* =========================================================
   6. MODO CLARO E ESCURO
   ========================================================= */

function setupTheme() {
  const themeButton =
    document.getElementById("themeButton");

  if (!themeButton) {
    return;
  }

  const savedTheme =
    localStorage.getItem(
      "cartola-estatistico-theme"
    );

  if (savedTheme === "dark") {
    document.body.classList.add(
      "dark-theme"
    );

    themeButton.textContent = "☀";

    themeButton.setAttribute(
      "aria-label",
      "Ativar modo claro"
    );
  }

  themeButton.addEventListener(
    "click",
    () => {
      const darkThemeEnabled =
        document.body.classList.toggle(
          "dark-theme"
        );

      if (darkThemeEnabled) {
        themeButton.textContent = "☀";

        themeButton.setAttribute(
          "aria-label",
          "Ativar modo claro"
        );

        localStorage.setItem(
          "cartola-estatistico-theme",
          "dark"
        );
      } else {
        themeButton.textContent = "☾";

        themeButton.setAttribute(
          "aria-label",
          "Ativar modo escuro"
        );

        localStorage.setItem(
          "cartola-estatistico-theme",
          "light"
        );
      }
    }
  );
}


/* =========================================================
   7. MENU DO CELULAR
   ========================================================= */

function setupMobileMenu() {
  const menuButton =
    document.getElementById(
      "mobileMenuButton"
    );

  const sidebar =
    document.getElementById("sidebar");

  const sidebarOverlay =
    document.getElementById(
      "sidebarOverlay"
    );

  if (
    !menuButton ||
    !sidebar ||
    !sidebarOverlay
  ) {
    return;
  }

  menuButton.addEventListener(
    "click",
    () => {
      sidebar.classList.add("open");

      sidebarOverlay.classList.add(
        "visible"
      );

      document.body.style.overflow =
        "hidden";
    }
  );

  sidebarOverlay.addEventListener(
    "click",
    closeMobileMenu
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    }
  );
}

function closeMobileMenu() {
  const sidebar =
    document.getElementById("sidebar");

  const sidebarOverlay =
    document.getElementById(
      "sidebarOverlay"
    );

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  if (sidebarOverlay) {
    sidebarOverlay.classList.remove(
      "visible"
    );
  }

  document.body.style.overflow = "";
}


/* =========================================================
   8. FILTROS DE POSIÇÃO
   ========================================================= */

function renderPositionFilters() {
  const filtersContainer =
    document.getElementById(
      "positionFilters"
    );

  if (!filtersContainer) {
    return;
  }

  filtersContainer.innerHTML = "";

  POSITION_FILTERS.forEach(
    (position) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "position-filter-button";

      if (
        position.id ===
        appState.activePosition
      ) {
        button.classList.add("active");
      }

      button.dataset.position =
        position.id;

      button.textContent =
        `${position.label} ` +
        `(${position.quantidade})`;

      button.addEventListener(
        "click",
        () => {
          changePosition(position.id);
        }
      );

      filtersContainer.appendChild(
        button
      );
    }
  );
}

function changePosition(positionId) {
  appState.activePosition = positionId;

  const filterButtons =
    document.querySelectorAll(
      ".position-filter-button"
    );

  filterButtons.forEach((button) => {
    const isActive =
      button.dataset.position ===
      positionId;

    button.classList.toggle(
      "active",
      isActive
    );
  });

  renderPlayers();
}


/* =========================================================
   9. CONFIGURAÇÃO DA RODADA
   ========================================================= */

async function loadConfiguration() {
  try {
    const response = await fetch(
      CONFIG_PATH,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Erro HTTP ${response.status}`
      );
    }

    const config =
      await response.json();

    appState.config = config;

    renderConfiguration(config);
  } catch (error) {
    console.error(
      "Erro ao carregar configuração:",
      error
    );

    renderConfigurationError();
  }
}

function renderConfiguration(config) {
  const roundNumber =
    document.getElementById(
      "roundNumber"
    );

  const statusText =
    document.getElementById(
      "statusText"
    );

  const lastUpdate =
    document.getElementById(
      "lastUpdate"
    );

  if (roundNumber) {
    roundNumber.textContent =
      config.rodada ?? "--";
  }

  if (statusText) {
    statusText.textContent =
      config.status ||
      "Cartola Estatístico carregado";
  }

  if (lastUpdate) {
    lastUpdate.textContent =
      `Última atualização: ${
        config.ultimaAtualizacao ||
        "não informada"
      }`;
  }
}

function renderConfigurationError() {
  const roundNumber =
    document.getElementById(
      "roundNumber"
    );

  const statusText =
    document.getElementById(
      "statusText"
    );

  const lastUpdate =
    document.getElementById(
      "lastUpdate"
    );

  if (roundNumber) {
    roundNumber.textContent = "--";
  }

  if (statusText) {
    statusText.textContent =
      "Não foi possível carregar a configuração";
  }

  if (lastUpdate) {
    lastUpdate.textContent =
      "Verifique data/configuracao.json";
  }
}


/* =========================================================
   10. CARREGAMENTO DOS JOGADORES
   ========================================================= */

async function loadPlayers() {
  renderPlayersLoading();

  try {
    const response = await fetch(
      PLAYERS_PATH,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Erro HTTP ${response.status}`
      );
    }

    const players =
      await response.json();

    if (!Array.isArray(players)) {
      throw new Error(
        "O arquivo jogadores.json " +
        "não contém uma lista válida."
      );
    }

    appState.players =
      players.filter(isValidPlayer);

    appState.playersLoaded = true;

    renderHighlights();
    renderPlayers();
  } catch (error) {
    console.error(
      "Erro ao carregar jogadores:",
      error
    );

    appState.playersLoaded = false;

    renderPlayersError();
  }
}

function isValidPlayer(player) {
  if (!player) {
    return false;
  }

  if (!player.nome) {
    return false;
  }

  if (!player.posicao) {
    return false;
  }

  return true;
}


/* =========================================================
   11. CARREGAMENTO VISUAL
   ========================================================= */

function renderPlayersLoading() {
  const playersGrid =
    document.getElementById(
      "playersGrid"
    );

  if (!playersGrid) {
    return;
  }

  playersGrid.innerHTML = `
    <div class="empty-state">
      <strong>
        Carregando jogadores
      </strong>

      <p>
        O Cartola Estatístico está lendo
        as projeções e organizando
        o ranking da rodada.
      </p>
    </div>
  `;
}

function renderPlayersError() {
  const playersGrid =
    document.getElementById(
      "playersGrid"
    );

  if (!playersGrid) {
    return;
  }

  playersGrid.innerHTML = `
    <div class="empty-state">
      <strong>
        Não foi possível carregar
        os jogadores
      </strong>

      <p>
        Confirme se o arquivo
        data/jogadores.json foi criado
        corretamente e aguarde a publicação
        do GitHub Pages.
      </p>
    </div>
  `;
}


/* =========================================================
   12. RANKING DOS JOGADORES
   ========================================================= */

function getRankedPlayersByPosition(
  positionId
) {
  const position =
    POSITION_FILTERS.find(
      (item) =>
        item.id === positionId
    );

  const limit =
    position?.quantidade || 5;

  return appState.players
    .filter(
      (player) =>
        player.posicao === positionId
    )
    .sort(comparePlayers)
    .slice(0, limit);
}

function comparePlayers(
  playerA,
  playerB
) {
  const scoreDifference =
    safeNumber(playerB.notaFinal) -
    safeNumber(playerA.notaFinal);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const projectionDifference =
    safeNumber(playerB.projecao) -
    safeNumber(playerA.projecao);

  if (projectionDifference !== 0) {
    return projectionDifference;
  }

  const confidenceDifference =
    safeNumber(
      playerB.confiancaNumerica
    ) -
    safeNumber(
      playerA.confiancaNumerica
    );

  if (confidenceDifference !== 0) {
    return confidenceDifference;
  }

  return (
    safeNumber(
      playerA.riscoNegativar
    ) -
    safeNumber(
      playerB.riscoNegativar
    )
  );
}


/* =========================================================
   13. RENDERIZAÇÃO DOS JOGADORES
   ========================================================= */

function renderPlayers() {
  const playersGrid =
    document.getElementById(
      "playersGrid"
    );

  if (!playersGrid) {
    return;
  }

  if (!appState.playersLoaded) {
    return;
  }

  const players =
    getRankedPlayersByPosition(
      appState.activePosition
    );

  if (players.length === 0) {
    renderNoPlayersForPosition();
    return;
  }

  playersGrid.innerHTML = "";

  players.forEach(
    (player, index) => {
      const card =
        createPlayerCard(
          player,
          index + 1
        );

      playersGrid.appendChild(card);
    }
  );
}

function renderNoPlayersForPosition() {
  const playersGrid =
    document.getElementById(
      "playersGrid"
    );

  const position =
    POSITION_FILTERS.find(
      (item) =>
        item.id ===
        appState.activePosition
    );

  if (!playersGrid) {
    return;
  }

  playersGrid.innerHTML = `
    <div class="empty-state">
      <strong>
        Nenhum jogador encontrado
      </strong>

      <p>
        Não existem jogadores cadastrados
        para a posição
        ${position?.label || "selecionada"}.
      </p>
    </div>
  `;
}


/* =========================================================
   14. CRIAÇÃO DO CARD
   ========================================================= */

function createPlayerCard(
  player,
  ranking
) {
  const article =
    document.createElement("article");

  article.className = "player-card";

  const position =
    POSITION_FILTERS.find(
      (item) =>
        item.id === player.posicao
    );

  const positionLabel =
    position?.singular ||
    player.posicao;

  const confidenceClass =
    getConfidenceClass(
      player.confianca
    );

  const riskClass =
    getRiskClass(
      player.risco
    );

  const reasons =
    createListItems(
      player.justificativas,
      "Nenhuma justificativa cadastrada."
    );

  const attentionPoints =
    createListItems(
      player.pontosAtencao,
      "Nenhum ponto de atenção cadastrado."
    );

  const components =
    createComponentsHtml(
      player.componentes
    );

  const specialTags =
    createSpecialTags(player);

  article.innerHTML = `
    <div class="player-card-header">

      <div class="player-main-info">

        <div class="player-ranking">
          ${ranking}
        </div>

        <div>
          <span class="player-position">
            ${escapeHtml(positionLabel)}
          </span>

          <h3>
            ${escapeHtml(
              player.apelido ||
              player.nome
            )}
          </h3>

          <p class="player-club">
            ${escapeHtml(
              player.siglaClube ||
              player.clube
            )}

            <span>•</span>

            ${escapeHtml(
              player.mando ||
              "Mando não informado"
            )}

            <span>•</span>

            x ${escapeHtml(
              player.adversario ||
              "Adversário não informado"
            )}
          </p>
        </div>

      </div>

      <div class="player-price">
        <span>Preço</span>

        <strong>
          ${formatCartoletas(
            player.preco
          )}
        </strong>
      </div>

    </div>

    ${
      specialTags
        ? `
          <div class="player-special-tags">
            ${specialTags}
          </div>
        `
        : ""
    }

    <div class="player-main-metrics">

      <div class="main-metric projection">
        <span>Projeção</span>

        <strong>
          ${formatPoints(
            player.projecao
          )}
        </strong>
      </div>

      <div class="main-metric">
        <span>Piso</span>

        <strong>
          ${formatPoints(
            player.piso
          )}
        </strong>
      </div>

      <div class="main-metric">
        <span>Teto</span>

        <strong>
          ${formatPoints(
            player.teto
          )}
        </strong>
      </div>

    </div>

    <div class="player-indicators">

      <div class="indicator-line">

        <div class="indicator-label">
          <span>Confiança</span>

          <strong>
            ${formatPercentage(
              player.confiancaNumerica
            )}
          </strong>
        </div>

        <div class="indicator-track">
          <div
            class="
              indicator-fill
              ${confidenceClass}
            "
            style="
              width:
              ${clamp(
                safeNumber(
                  player.confiancaNumerica
                ),
                0,
                100
              )}%;
            "
          >
          </div>
        </div>

      </div>

      <div class="indicator-line">

        <div class="indicator-label">
          <span>Regularidade</span>

          <strong>
            ${formatPercentage(
              player.regularidade
            )}
          </strong>
        </div>

        <div class="indicator-track">
          <div
            class="indicator-fill regularity"
            style="
              width:
              ${clamp(
                safeNumber(
                  player.regularidade
                ),
                0,
                100
              )}%;
            "
          >
          </div>
        </div>

      </div>

    </div>

    <div class="player-badges">

      <span
        class="
          player-badge
          ${confidenceClass}
        "
      >
        Confiança
        ${escapeHtml(
          player.confianca ||
          "Não informada"
        )}
      </span>

      <span
        class="
          player-badge
          ${riskClass}
        "
      >
        Risco
        ${escapeHtml(
          player.risco ||
          "Não informado"
        )}
      </span>

      <span class="player-badge value">
        Custo-benefício
        ${formatDecimal(
          player.custoBeneficio,
          2
        )}
      </span>

      <span class="player-badge score">
        Nota
        ${formatDecimal(
          player.notaFinal,
          0
        )}
      </span>

    </div>

    <div class="player-secondary-metrics">

      <div>
        <span>Média geral</span>

        <strong>
          ${formatPoints(
            player.mediaGeral
          )}
        </strong>
      </div>

      <div>
        <span>Média recente</span>

        <strong>
          ${formatPoints(
            player.mediaRecente
          )}
        </strong>
      </div>

      <div>
        <span>Mediana</span>

        <strong>
          ${formatPoints(
            player.mediana
          )}
        </strong>
      </div>

      <div>
        <span>Titularidade</span>

        <strong>
          ${formatPercentage(
            player.titularidade
          )}
        </strong>
      </div>

    </div>

    <div class="player-analysis-box positive">

      <h4>
        <span>✓</span>
        Por que foi recomendado
      </h4>

      <ul>
        ${reasons}
      </ul>

    </div>

    <div class="player-analysis-box attention">

      <h4>
        <span>!</span>
        Pontos de atenção
      </h4>

      <ul>
        ${attentionPoints}
      </ul>

    </div>

    <details class="player-details">

      <summary>
        Ver composição da nota
      </summary>

      <div class="components-list">
        ${components}
      </div>

    </details>
  `;

  return article;
}


/* =========================================================
   15. DESTAQUES DA RODADA
   ========================================================= */

function renderHighlights() {
  if (
    !Array.isArray(appState.players) ||
    appState.players.length === 0
  ) {
    return;
  }

  const highestProjection =
    [...appState.players].sort(
      (playerA, playerB) =>
        safeNumber(
          playerB.projecao
        ) -
        safeNumber(
          playerA.projecao
        )
    )[0];

  const highestConfidence =
    [...appState.players].sort(
      (playerA, playerB) =>
        safeNumber(
          playerB.confiancaNumerica
        ) -
        safeNumber(
          playerA.confiancaNumerica
        )
    )[0];

  const bestValue =
    [...appState.players].sort(
      (playerA, playerB) =>
        safeNumber(
          playerB.custoBeneficio
        ) -
        safeNumber(
          playerA.custoBeneficio
        )
    )[0];

  setElementText(
    "bestProjection",
    formatPoints(
      highestProjection.projecao
    )
  );

  setElementText(
    "bestProjectionName",
    highestProjection.apelido ||
    highestProjection.nome
  );

  setElementText(
    "bestConfidence",
    formatPercentage(
      highestConfidence
        .confiancaNumerica
    )
  );

  setElementText(
    "bestConfidenceName",
    highestConfidence.apelido ||
    highestConfidence.nome
  );

  setElementText(
    "bestValue",
    formatDecimal(
      bestValue.custoBeneficio,
      2
    )
  );

  setElementText(
    "bestValueName",
    bestValue.apelido ||
    bestValue.nome
  );
}


/* =========================================================
   16. COMPONENTES DA NOTA
   ========================================================= */

function createComponentsHtml(
  components
) {
  if (
    !components ||
    typeof components !== "object"
  ) {
    return `
      <p>
        Composição da nota
        não informada.
      </p>
    `;
  }

  return Object.entries(components)
    .map(([label, value]) => {
      const safeValue =
        clamp(
          safeNumber(value),
          0,
          100
        );

      return `
        <div class="component-row">

          <div class="component-label">
            <span>
              ${escapeHtml(label)}
            </span>

            <strong>
              ${Math.round(safeValue)}
            </strong>
          </div>

          <div class="component-track">
            <div
              class="component-fill"
              style="
                width:
                ${safeValue}%;
              "
            >
            </div>
          </div>

        </div>
      `;
    })
    .join("");
}


/* =========================================================
   17. ETIQUETAS ESPECIAIS
   ========================================================= */

function createSpecialTags(player) {
  const tags = [];

  if (player.cobraPenalti) {
    tags.push(
      `
        <span class="special-tag">
          Pênaltis
        </span>
      `
    );
  }

  if (player.cobraBolaParada) {
    tags.push(
      `
        <span class="special-tag">
          Bola parada
        </span>
      `
    );
  }

  if (
    safeNumber(
      player.minutosEsperados
    ) >= 88
  ) {
    tags.push(
      `
        <span class="special-tag">
          90 minutos prováveis
        </span>
      `
    );
  }

  if (
    safeNumber(player.chanceSG) >= 45
  ) {
    tags.push(
      `
        <span class="special-tag">
          Boa chance de SG
        </span>
      `
    );
  }

  return tags.join("");
}


/* =========================================================
   18. CRIAÇÃO DAS LISTAS
   ========================================================= */

function createListItems(
  items,
  fallbackText
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return `
      <li>
        ${escapeHtml(fallbackText)}
      </li>
    `;
  }

  return items
    .map(
      (item) => `
        <li>
          ${escapeHtml(item)}
        </li>
      `
    )
    .join("");
}


/* =========================================================
   19. FUNÇÕES UTILITÁRIAS
   ========================================================= */

function formatPoints(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${number.toFixed(1)} pts`;
}

function formatCartoletas(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "C$ --";
  }

  return `C$ ${number.toFixed(2)}`;
}

function formatPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${Math.round(number)}%`;
}

function formatDecimal(
  value,
  decimalPlaces = 1
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return number.toFixed(decimalPlaces);
}

function safeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(value, minimum),
    maximum
  );
}

function getRiskClass(risk) {
  const normalizedRisk =
    normalizeText(risk);

  if (
    normalizedRisk === "baixo" ||
    normalizedRisk === "baixa"
  ) {
    return "risk-low";
  }

  if (
    normalizedRisk === "alto" ||
    normalizedRisk === "alta"
  ) {
    return "risk-high";
  }

  return "risk-medium";
}

function getConfidenceClass(
  confidence
) {
  const normalizedConfidence =
    normalizeText(confidence);

  if (
    normalizedConfidence === "alta" ||
    normalizedConfidence === "alto"
  ) {
    return "confidence-high";
  }

  if (
    normalizedConfidence === "baixa" ||
    normalizedConfidence === "baixo"
  ) {
    return "confidence-low";
  }

  return "confidence-medium";
}

function setElementText(
  elementId,
  text
) {
  const element =
    document.getElementById(
      elementId
    );

  if (!element) {
    return;
  }

  element.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
