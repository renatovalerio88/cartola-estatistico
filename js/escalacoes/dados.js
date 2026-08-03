/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento dos dados
   ========================================================= */

const CAMINHO_ESCALACOES =
  "data/escalacoes.json";

const estadoEscalacoes = {
  escalacoes: [],
  carregado: false,
  carregando: false,
  erro: null
};

async function carregarEscalacoes() {

  estadoEscalacoes.carregando = true;
  estadoEscalacoes.carregado = false;
  estadoEscalacoes.erro = null;

  exibirCarregamentoEscalacoes();

  try {

    const resposta = await fetch(
      CAMINHO_ESCALACOES,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro HTTP ${resposta.status}`
      );
    }

    const perfis =
      await resposta.json();

    if (!Array.isArray(perfis)) {
      throw new Error(
        "Arquivo de perfis inválido."
      );
    }

    const jogadores =
      obterJogadoresCarregados();

    const escalacoes = [];

    for (const perfil of perfis) {

      const titulares =
        MotorEscalacao.montar(
          jogadores,
          perfil.formacao,
          Infinity,
          perfil.perfil
        );

      const escalacao = {

        ...perfil,

        jogadores: titulares,

        custo: titulares.reduce(
          (s,j)=>s+(j.preco||0),
          0
        ),

        projecao: titulares.reduce(
          (s,j)=>s+(j.projecao||0),
          0
        ),

        piso: titulares.reduce(
          (s,j)=>s+(j.piso||0),
          0
        ),

        teto: titulares.reduce(
          (s,j)=>s+(j.teto||0),
          0
        ),

        confianca:
          titulares.length
          ? titulares.reduce(
              (s,j)=>s+(j.confianca||0),
              0
            ) / titulares.length
          : 0,

        risco:
          titulares.length
          ? titulares.reduce(
              (s,j)=>s+(j.risco||0),
              0
            ) / titulares.length
          : 0,

        banco: []

      };

      if (
        typeof MotorCapitao !==
        "undefined"
      ) {

        escalacao.capitao =
          titulares
            .slice()
            .sort(
              (a,b)=>
                MotorCapitao.calcular(b)
                -
                MotorCapitao.calcular(a)
            )[0];

      }

      if (
        typeof MotorReservaLuxo !==
        "undefined"
      ) {

        escalacao.reservaLuxo =
          titulares
            .slice()
            .sort(
              (a,b)=>
                MotorReservaLuxo.calcular(b)
                -
                MotorReservaLuxo.calcular(a)
            )[0];

      }

      escalacoes.push(
        escalacao
      );

    }

    estadoEscalacoes.escalacoes =
      escalacoes;

    estadoEscalacoes.carregado =
      true;

    estadoEscalacoes.carregando =
      false;

    iniciarEscalacoes();

    return escalacoes;

  } catch (erro) {

    console.error(
      "Erro ao carregar escalações:",
      erro
    );

    estadoEscalacoes.escalacoes = [];

    estadoEscalacoes.carregado =
      false;

    estadoEscalacoes.carregando =
      false;

    estadoEscalacoes.erro =
      erro.message;

    exibirErroEscalacoes(
      erro.message
    );

    return [];

  }

}

function validarEscalacao(
  escalacao
) {

  return !!(
    escalacao &&
    escalacao.id &&
    escalacao.nome
  );

}

function iniciarEscalacoes() {

  if (
    estadoEscalacoes.carregado &&
    typeof exibirEscalacoes ===
      "function"
  ) {

    exibirEscalacoes();

  }

}

function obterContainerEscalacoes() {

  const secao =
    document.getElementById(
      "times"
    );

  if (!secao) {

    return null;

  }

  let container =
    document.getElementById(
      "suggestedLineupsGrid"
    );

  if (container) {

    return container;

  }

  container =
    document.createElement("div");

  container.id =
    "suggestedLineupsGrid";

  container.className =
    "suggested-lineups-grid";

  secao.appendChild(
    container
  );

  return container;

}

function exibirCarregamentoEscalacoes() {

  const container =
    obterContainerEscalacoes();

  if (!container) {

    return;

  }

  container.innerHTML =
    `<div class="empty-state">
      <strong>Carregando escalações...</strong>
    </div>`;

}

function exibirErroEscalacoes(
  mensagem=""
) {

  const container =
    obterContainerEscalacoes();

  if (!container) {

    return;

  }

  container.innerHTML =
    `<div class="empty-state">
      <strong>Erro ao carregar escalações</strong>
      <p>${escaparHtml(mensagem)}</p>
    </div>`;

}

function exibirSemEscalacoes() {

  const container =
    obterContainerEscalacoes();

  if (!container) {

    return;

  }

  container.innerHTML =
    `<div class="empty-state">
      Nenhuma escalação disponível.
    </div>`;

}

function obterEscalacoesCarregadas() {

  return [
    ...estadoEscalacoes.escalacoes
  ];

}

function obterEscalacaoPorId(id) {

  return estadoEscalacoes.escalacoes.find(
    e =>
      String(e.id) ===
      String(id)
  ) || null;

}

function escalacoesCarregadas() {

  return estadoEscalacoes.carregado;

}

function obterErroEscalacoes() {

  return estadoEscalacoes.erro;

}
