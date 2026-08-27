/* =========================================================
   CARTOLA ESTATÍSTICO
   Interface geral do site
   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const CAMINHO_CONFIGURACAO =
  "data/configuracao.json";

const CAMINHO_STATUS_CARTOLA =
  "data/api/status.json";

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
  configuracao: null,
  statusCartola: null
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
    /*
     * A configuração continua sendo carregada normalmente,
     * pois contém parâmetros próprios do projeto.
     *
     * A rodada, porém, passa a ser obtida prioritariamente
     * do status atualizado da API do Cartola.
     */

    const [
      respostaConfiguracao,
      respostaStatus
    ] =
      await Promise.all([
        fetch(
          CAMINHO_CONFIGURACAO,
          {
            cache: "no-store"
          }
        ),

        fetch(
          CAMINHO_STATUS_CARTOLA,
          {
            cache: "no-store"
          }
        ).catch(() => null)
      ]);

    if (!respostaConfiguracao.ok) {
      throw new Error(
        `Erro HTTP ${respostaConfiguracao.status}`
      );
    }

    const configuracao =
      await respostaConfiguracao.json();

    if (
      !configuracao ||
      typeof configuracao !== "object"
    ) {
      throw new Error(
        "Configuração inválida."
      );
    }

    let statusCartola = null;

    if (
      respostaStatus &&
      respostaStatus.ok
    ) {
      try {
        statusCartola =
          await respostaStatus.json();
      } catch (erroStatus) {
        console.warn(
          "Não foi possível interpretar status.json:",
          erroStatus
        );
      }
    }

    estadoInterface.configuracao =
      configuracao;

    estadoInterface.statusCartola =
      statusCartola;

    exibirConfiguracao(
      configuracao,
      statusCartola
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
   RODADA ATUAL
   ========================================================= */

function obterRodadaAtualInterface(
  configuracao,
  statusCartola
) {
  const rodadaStatus =
    Number(
      statusCartola?.rodada_atual
    );

  if (
    Number.isInteger(rodadaStatus) &&
    rodadaStatus > 0
  ) {
    return rodadaStatus;
  }

  const rodadaConfiguracao =
    Number(
      configuracao?.rodada
    );

  if (
    Number.isInteger(
      rodadaConfiguracao
    ) &&
    rodadaConfiguracao > 0
  ) {
    return rodadaConfiguracao;
  }

  return "--";
}


/* =========================================================
   STATUS DO MERCADO
   ========================================================= */

function obterTextoStatusInterface(
  configuracao,
  statusCartola
) {
  const statusMercado =
    Number(
      statusCartola?.status_mercado
    );

  if (statusMercado === 1) {
    return "Mercado aberto";
  }

  if (statusMercado === 2) {
    return "Mercado fechado";
  }

  if (statusMercado === 3) {
    return "Mercado em manutenção";
  }

  if (statusMercado === 4) {
    return "Fim de temporada";
  }

  return (
    configuracao?.status ||
    "Cartola Estatístico carregado"
  );
}


/* =========================================================
   ÚLTIMA ATUALIZAÇÃO
   ========================================================= */

function obterTextoUltimaAtualizacao(
  configuracao,
  statusCartola
) {
  /*
   * O status da API confirma a rodada corrente, mas não
   * possui necessariamente o horário em que o GitHub
   * terminou de gerar os arquivos.
   *
   * Por isso, mantemos a data da configuração como
   * fallback até ligarmos esse campo ao pipeline.
   */

  const atualizacao =
    configuracao?.ultimaAtualizacao;

  if (atualizacao) {
    return (
      `Última atualização: ${atualizacao}`
    );
  }

  const fechamento =
    statusCartola?.fechamento;

  if (
    fechamento &&
    fechamento.dia &&
    fechamento.mes &&
    fechamento.ano
  ) {
    const dia =
      String(
        fechamento.dia
      ).padStart(2, "0");

    const mes =
      String(
        fechamento.mes
      ).padStart(2, "0");

    const hora =
      String(
        fechamento.hora ?? 0
      ).padStart(2, "0");

    const minuto =
      String(
        fechamento.minuto ?? 0
      ).padStart(2, "0");

    return (
      `Fechamento da rodada: ` +
      `${dia}/${mes}/${fechamento.ano} ` +
      `${hora}:${minuto}`
    );
  }

  return "Última atualização: --";
}


/* =========================================================
   EXIBIÇÃO DA CONFIGURAÇÃO
   ========================================================= */

function exibirConfiguracao(
  configuracao,
  statusCartola = null
) {
  const rodadaAtual =
    obterRodadaAtualInterface(
      configuracao,
      statusCartola
    );

  definirTextoElemento(
    "roundNumber",
    rodadaAtual
  );

  definirTextoElemento(
    "statusText",
    obterTextoStatusInterface(
      configuracao,
      statusCartola
    )
  );

  definirTextoElemento(
    "lastUpdate",
    obterTextoUltimaAtualizacao(
      configuracao,
      statusCartola
    )
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
    "Verifique os arquivos de configuração"
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


function obterStatusCartolaAtual() {
  return estadoInterface.statusCartola;
}


function obterRodadaAtual() {
  return obterRodadaAtualInterface(
    estadoInterface.configuracao,
    estadoInterface.statusCartola
  );
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


/* =========================================================
   V2.1 — CAMPO VISUAL DAS ESCALAÇÕES
   Carregado de forma desacoplada para poder ser reutilizado
   no futuro "Monte seu time" sem duplicar o motor atual.
   ========================================================= */

(function carregarCampoVisualEscalacoes() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.querySelector('script[data-cartola-campo-escalacoes]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "js/escalacoes/campo.js";
  script.defer = true;
  script.dataset.cartolaCampoEscalacoes = "true";
  document.head.appendChild(script);
})();