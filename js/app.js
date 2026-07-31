/* =========================================================
   CARTOLA ESTATÍSTICO
   Aplicação principal
   ========================================================= */


/* =========================================================
   1. CONFIGURAÇÕES GERAIS
   ========================================================= */

const CONFIG_PATH = "data/configuracao.json";

const POSITION_FILTERS = [
  {
    id: "GOL",
    label: "Goleiros",
    quantidade: 3
  },
  {
    id: "LAT",
    label: "Laterais",
    quantidade: 5
  },
  {
    id: "ZAG",
    label: "Zagueiros",
    quantidade: 5
  },
  {
    id: "MEI",
    label: "Meias",
    quantidade: 5
  },
  {
    id: "ATA",
    label: "Atacantes",
    quantidade: 5
  },
  {
    id: "TEC",
    label: "Treinadores",
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
   2. ESTADO DA APLICAÇÃO
   ========================================================= */

const appState = {
  activeTab: "recomendacoes",
  activePosition: "GOL",
  config: null
};


/* =========================================================
   3. INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  setupNavigation();
  setupTheme();
  setupMobileMenu();
  renderPositionFilters();
  await loadConfiguration();
}


/* =========================================================
   4. NAVEGAÇÃO ENTRE ABAS
   ========================================================= */

function setupNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  const tabContents = document.querySelectorAll(".tab-content");

  menuItems.forEach((menuItem) => {
    menuItem.addEventListener("click", () => {
      const targetTab = menuItem.dataset.tab;

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

      const targetContent = document.getElementById(targetTab);

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
  const pageTitle = document.getElementById("pageTitle");

  if (!pageTitle) {
    return;
  }

  pageTitle.textContent =
    PAGE_TITLES[tabId] || "Cartola Estatístico";
}


/* =========================================================
   5. MODO CLARO E ESCURO
   ========================================================= */

function setupTheme() {
  const themeButton = document.getElementById("themeButton");

  if (!themeButton) {
    return;
  }

  const savedTheme =
    localStorage.getItem("cartola-estatistico-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeButton.textContent = "☀";
    themeButton.setAttribute(
      "aria-label",
      "Ativar modo claro"
    );
  }

  themeButton.addEventListener("click", () => {
    const darkThemeEnabled =
      document.body.classList.toggle("dark-theme");

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
  });
}


/* =========================================================
   6. MENU DO CELULAR
   ========================================================= */

function setupMobileMenu() {
  const menuButton =
    document.getElementById("mobileMenuButton");

  const sidebar =
    document.getElementById("sidebar");

  const sidebarOverlay =
    document.getElementById("sidebarOverlay");

  if (
    !menuButton ||
    !sidebar ||
    !sidebarOverlay
  ) {
    return;
  }

  menuButton.addEventListener("click", () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("visible");

    document.body.style.overflow = "hidden";
  });

  sidebarOverlay.addEventListener(
    "click",
    closeMobileMenu
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });
}

function closeMobileMenu() {
  const sidebar =
    document.getElementById("sidebar");

  const sidebarOverlay =
    document.getElementById("sidebarOverlay");

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  if (sidebarOverlay) {
    sidebarOverlay.classList.remove("visible");
  }

  document.body.style.overflow = "";
}


/* =========================================================
   7. FILTROS DE POSIÇÃO
   ========================================================= */

function renderPositionFilters() {
  const filtersContainer =
    document.getElementById("positionFilters");

  if (!filtersContainer) {
    return;
  }

  filtersContainer.innerHTML = "";

  POSITION_FILTERS.forEach((position) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "position-filter-button";

    if (position.id === appState.activePosition) {
      button.classList.add("active");
    }

    button.dataset.position = position.id;

    button.textContent =
      `${position.label} (${position.quantidade})`;

    button.addEventListener("click", () => {
      changePosition(position.id);
    });

    filtersContainer.appendChild(button);
  });
}

function changePosition(positionId) {
  appState.activePosition = positionId;

  const filterButtons =
    document.querySelectorAll(
      ".position-filter-button"
    );

  filterButtons.forEach((button) => {
    const isActive =
      button.dataset.position === positionId;

    button.classList.toggle(
      "active",
      isActive
    );
  });

  renderTemporaryPositionMessage(positionId);
}

function renderTemporaryPositionMessage(positionId) {
  const playersGrid =
    document.getElementById("playersGrid");

  if (!playersGrid) {
    return;
  }

  const position =
    POSITION_FILTERS.find(
      (item) => item.id === positionId
    );

  const label =
    position?.label || "Jogadores";

  const quantidade =
    position?.quantidade || 0;

  playersGrid.innerHTML = `
    <div class="empty-state">
      <strong>
        ${label} em construção
      </strong>

      <p>
        Esta posição mostrará os
        ${quantidade} melhores nomes da rodada,
        com projeção, piso, teto, risco,
        confiança, custo-benefício,
        pontos positivos e pontos de atenção.
      </p>
    </div>
  `;
}


/* =========================================================
   8. CARREGAMENTO DA CONFIGURAÇÃO
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

    const config = await response.json();

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
    document.getElementById("roundNumber");

  const statusText =
    document.getElementById("statusText");

  const lastUpdate =
    document.getElementById("lastUpdate");

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
    document.getElementById("roundNumber");

  const statusText =
    document.getElementById("statusText");

  const lastUpdate =
    document.getElementById("lastUpdate");

  if (roundNumber) {
    roundNumber.textContent = "--";
  }

  if (statusText) {
    statusText.textContent =
      "Não foi possível carregar a configuração";
  }

  if (lastUpdate) {
    lastUpdate.textContent =
      "Verifique o arquivo data/configuracao.json";
  }
}


/* =========================================================
   9. FUNÇÕES UTILITÁRIAS
   Serão usadas nas próximas etapas
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

function clamp(value, minimum, maximum) {
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

function getConfidenceClass(confidence) {
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
