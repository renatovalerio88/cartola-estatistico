/* =========================================================
   CARTOLA ESTATÍSTICO
   Interface geral do site
   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const CAMINHO_CONFIGURACAO =
  "data/configuracao.json";

const TITULOS_PAGINAS = {
  recomendacoes: "Recomendações",
  times: "Times sugeridos",
  historico: "Histórico",
  metodologia: "Metodologia",
  analise: "Análise da rodada"
};


/* =========================================================
   ESTADO DA INTERFACE
   ========================================================= */

const estadoInterface = {
  abaAtiva: "recomendacoes",
  configuracao: null
};


/* =========================================================
   INICIALIZAÇÃO DA INTERFACE
   ========================================================= */

function configurarInterface() {
  configurarNavegacao();
  configurarTema();
  configurarMenuCelular();
}


/* =========================================================
   NAVEGAÇÃO ENTRE ABAS
   ========================================================= */

function configurarNavegacao() {
  const itensMenu =
    document.querySelectorAll(
      ".menu-item"
    );

  const conteudosAbas =
    document.querySelectorAll(
      ".tab-content"
    );

  itensMenu.forEach((itemMenu) => {
    itemMenu.addEventListener(
      "click",
      () => {
        const abaDestino =
          itemMenu.dataset.tab;

        if (!abaDestino) {
          return;
        }

        estadoInterface.abaAtiva =
          abaDestino;

        itensMenu.forEach((item) => {
          item.classList.remove(
            "active"
          );
        });

        conteudosAbas.forEach(
          (conteudo) => {
            conteudo.classList.remove(
              "active"
            );
          }
        );

        itemMenu.classList.add(
          "active"
        );

        const conteudoDestino =
          document.getElementById(
            abaDestino
          );

        if (conteudoDestino) {
          conteudoDestino.classList.add(
            "active"
          );
        }

        atualizarTituloPagina(
          abaDestino
        );

        fecharMenuCelular();

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  });
}


function atualizarTituloPagina(
  idAba
) {
  const titulo =
    TITULOS_PAGINAS[idAba] ||
    "Cartola Estatístico";

  definirTextoElemento(
    "pageTitle",
    titulo
  );
}


/* =========================================================
   TEMA CLARO E ESCURO
   ========================================================= */

function configurarTema() {
  const botaoTema =
    document.getElementById(
      "themeButton"
    );

  if (!botaoTema) {
    return;
  }

  const temaSalvo =
    localStorage.getItem(
      "cartola-estatistico-theme"
    );

  if (temaSalvo === "dark") {
    ativarTemaEscuro(botaoTema);
  } else {
    ativarTemaClaro(botaoTema);
  }

  botaoTema.addEventListener(
    "click",
    () => {
      const temaEscuroAtivo =
        document.body.classList.contains(
          "dark-theme"
        );

      if (temaEscuroAtivo) {
        ativarTemaClaro(botaoTema);
      } else {
        ativarTemaEscuro(botaoTema);
      }
    }
  );
}


function ativarTemaEscuro(
  botaoTema
) {
  document.body.classList.add(
    "dark-theme"
  );

  botaoTema.textContent = "☀";

  botaoTema.setAttribute(
    "aria-label",
    "Ativar modo claro"
  );

  localStorage.setItem(
    "cartola-estatistico-theme",
    "dark"
  );
}


function ativarTemaClaro(
  botaoTema
) {
  document.body.classList.remove(
    "dark-theme"
  );

  botaoTema.textContent = "☾";

  botaoTema.setAttribute(
    "aria-label",
    "Ativar modo escuro"
  );

  localStorage.setItem(
    "cartola-estatistico-theme",
    "light"
  );
}


/* =========================================================
   MENU DO CELULAR
   ========================================================= */

function configurarMenuCelular() {
  const botaoMenu =
    document.getElementById(
      "mobileMenuButton"
    );

  const menuLateral =
    document.getElementById(
      "sidebar"
    );

  const fundoMenu =
    document.getElementById(
      "sidebarOverlay"
    );

  if (
    !botaoMenu ||
    !menuLateral ||
    !fundoMenu
  ) {
    return;
  }

  botaoMenu.addEventListener(
    "click",
    abrirMenuCelular
  );

  fundoMenu.addEventListener(
    "click",
    fecharMenuCelular
  );

  document.addEventListener(
    "keydown",
    (evento) => {
      if (evento.key === "Escape") {
        fecharMenuCelular();
      }
    }
  );

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900) {
        fecharMenuCelular();
      }
    }
  );
}


function abrirMenuCelular() {
  const menuLateral =
    document.getElementById(
      "sidebar"
    );

  const fundoMenu =
    document.getElementById(
      "sidebarOverlay"
    );

  if (menuLateral) {
    menuLateral.classList.add(
      "open"
    );
  }

  if (fundoMenu) {
    fundoMenu.classList.add(
      "visible"
    );
  }

  document.body.style.overflow =
    "hidden";
}


function fecharMenuCelular() {
  const menuLateral =
    document.getElementById(
      "sidebar"
    );

  const fundoMenu =
    document.getElementById(
      "sidebarOverlay"
    );

  if (menuLateral) {
    menuLateral.classList.remove(
      "open"
    );
  }

  if (fundoMenu) {
    fundoMenu.classList.remove(
      "visible"
    );
  }

  document.body.style.overflow = "";
}


/* =========================================================
   CARREGAMENTO DA CONFIGURAÇÃO
   ========================================================= */

async function carregarConfiguracao() {
  atualizarStatusCarregamento();

  try {
    const resposta = await fetch(
      CAMINHO_CONFIGURACAO,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro HTTP ${resposta.status}`
      );
    }

    const configuracao =
      await resposta.json();

    if (
      !configuracao ||
      typeof configuracao !== "object"
    ) {
      throw new Error(
        "Configuração inválida."
      );
    }

    estadoInterface.configuracao =
      configuracao;

    exibirConfiguracao(
      configuracao
    );

    return configuracao;
  } catch (erro) {
    console.error(
      "Erro ao carregar configuração:",
      erro
    );

    exibirErroConfiguracao();

    return null;
  }
}


/* =========================================================
   EXIBIÇÃO DA CONFIGURAÇÃO
   ========================================================= */

function exibirConfiguracao(
  configuracao
) {
  definirTextoElemento(
    "roundNumber",
    configuracao.rodada ?? "--"
  );

  definirTextoElemento(
    "statusText",
    configuracao.status ||
    "Cartola Estatístico carregado"
  );

  definirTextoElemento(
    "lastUpdate",
    `Última atualização: ${
      configuracao.ultimaAtualizacao ||
      "não informada"
    }`
  );

  atualizarStatusVisual(
    "success"
  );
}


function atualizarStatusCarregamento() {
  definirTextoElemento(
    "statusText",
    "Carregando informações..."
  );

  definirTextoElemento(
    "lastUpdate",
    "Última atualização: --"
  );

  atualizarStatusVisual(
    "loading"
  );
}


function exibirErroConfiguracao() {
  definirTextoElemento(
    "roundNumber",
    "--"
  );

  definirTextoElemento(
    "statusText",
    "Não foi possível carregar a configuração"
  );

  definirTextoElemento(
    "lastUpdate",
    "Verifique o arquivo data/configuracao.json"
  );

  atualizarStatusVisual(
    "error"
  );
}


/* =========================================================
   ESTADO VISUAL DA BARRA DE STATUS
   ========================================================= */

function atualizarStatusVisual(
  tipo
) {
  const pontoStatus =
    document.querySelector(
      ".status-dot"
    );

  const barraStatus =
    document.querySelector(
      ".status-bar"
    );

  if (!pontoStatus) {
    return;
  }

  pontoStatus.classList.remove(
    "status-loading",
    "status-success",
    "status-error"
  );

  if (barraStatus) {
    barraStatus.classList.remove(
      "status-loading",
      "status-success",
      "status-error"
    );
  }

  const classe =
    tipo === "error"
      ? "status-error"
      : tipo === "loading"
        ? "status-loading"
        : "status-success";

  pontoStatus.classList.add(
    classe
  );

  if (barraStatus) {
    barraStatus.classList.add(
      classe
    );
  }
}


/* =========================================================
   FUNÇÕES AUXILIARES DA INTERFACE
   ========================================================= */

function obterConfiguracaoAtual() {
  return estadoInterface.configuracao;
}


function obterAbaAtiva() {
  return estadoInterface.abaAtiva;
}


function abrirAbaPorId(
  idAba
) {
  const botao =
    document.querySelector(
      `.menu-item[data-tab="${idAba}"]`
    );

  if (!botao) {
    return;
  }

  botao.click();
}
