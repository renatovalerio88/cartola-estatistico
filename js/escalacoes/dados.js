/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento dos dados
   ========================================================= */


/* =========================================================
   1. CAMINHO DO ARQUIVO
   ========================================================= */

const CAMINHO_ESCALACOES =
  "data/escalacoes.json";


/* =========================================================
   2. ESTADO DAS ESCALAÇÕES
   ========================================================= */

const estadoEscalacoes = {
  escalacoes: [],
  carregado: false,
  carregando: false,
  erro: null
};


/* =========================================================
   3. CARREGAMENTO DAS ESCALAÇÕES
   ========================================================= */

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
          perfil.formacao
        );

      const escalacao = {

        ...perfil,

        jogadores: titulares,

        custo: titulares.reduce(
          (s,j)=>
            s + (j.preco || 0),
          0
        ),

        projecao: titulares.reduce(
          (s,j)=>
            s + (j.projecao || 0),
          0
        ),

        piso: titulares.reduce(
          (s,j)=>
            s + (j.piso || 0),
          0
        ),

        teto: titulares.reduce(
          (s,j)=>
            s + (j.teto || 0),
          0
        ),

        confianca: 0,

        risco: 0,

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
                MotorCapitao.calcular(b) -
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
                MotorReservaLuxo.calcular(b) -
                MotorReservaLuxo.calcular(a)
            )[0];

      }

      escalacoes.push(
        escalacao
      );

    }

    estadoEscalacoes.escalacoes =
      escalacoes;

    estadoEscalacoes.carregado = true;

    estadoEscalacoes.carregando = false;

    iniciarEscalacoes();

    return escalacoes;

  } catch (erro) {

    console.error(erro);

    estadoEscalacoes.escalacoes = [];

    estadoEscalacoes.carregado = false;

    estadoEscalacoes.carregando = false;

    estadoEscalacoes.erro =
      erro.message;

    exibirErroEscalacoes(
      erro.message
    );

    return [];

  }

}

/* =========================================================
   4. VALIDAÇÃO DE UMA ESCALAÇÃO
   ========================================================= */

function validarEscalacao(
  escalacao
) {
  if (!ehObjetoValido(escalacao)) {
    return false;
  }

  if (!escalacao.id) {
    return false;
  }

  if (!escalacao.nome) {
    return false;
  }

  if (
    !Array.isArray(
      escalacao.jogadores
    )
  ) {
    return false;
  }

  if (
    escalacao.jogadores.length === 0
  ) {
    return false;
  }

  return true;
}


/* =========================================================
   5. INICIALIZAÇÃO DAS ESCALAÇÕES
   ========================================================= */

function iniciarEscalacoes() {
  if (!estadoEscalacoes.carregado) {
    return;
  }

  if (
    typeof exibirEscalacoes ===
    "function"
  ) {
    exibirEscalacoes();
  }
}


/* =========================================================
   6. LOCALIZAÇÃO DO CONTAINER
   ========================================================= */

function obterContainerEscalacoes() {
  const secaoTimes =
    document.getElementById(
      "times"
    );

  if (!secaoTimes) {
    return null;
  }

  let container =
    document.getElementById(
      "suggestedLineupsGrid"
    );

  if (container) {
    return container;
  }

  const estadoVazio =
    secaoTimes.querySelector(
      ".empty-state"
    );

  container =
    document.createElement("div");

  container.id =
    "suggestedLineupsGrid";

  container.className =
    "suggested-lineups-grid";

  if (estadoVazio) {
    estadoVazio.replaceWith(
      container
    );
  } else {
    secaoTimes.appendChild(
      container
    );
  }

  return container;
}


/* =========================================================
   7. ESTADO DE CARREGAMENTO
   ========================================================= */

function exibirCarregamentoEscalacoes() {
  const container =
    obterContainerEscalacoes();

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state">

      <strong>
        Carregando escalações
      </strong>

      <p>
        Organizando titulares,
        formação, patrimônio,
        capitão, banco,
        Reserva de Luxo
        e justificativas.
      </p>

    </div>
  `;
}


/* =========================================================
   8. ESTADO DE ERRO
   ========================================================= */

function exibirErroEscalacoes(
  mensagem = ""
) {
  const container =
    obterContainerEscalacoes();

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state">

      <strong>
        Não foi possível
        carregar as escalações
      </strong>

      <p>
        Confirme se o arquivo
        <strong>data/escalacoes.json</strong>
        existe e contém um JSON válido.
      </p>

      ${
        mensagem
          ? `
            <small>
              Detalhe técnico:
              ${escaparHtml(mensagem)}
            </small>
          `
          : ""
      }

    </div>
  `;
}


/* =========================================================
   9. ESTADO SEM ESCALAÇÕES
   ========================================================= */

function exibirSemEscalacoes() {
  const container =
    obterContainerEscalacoes();

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state">

      <strong>
        Nenhuma escalação cadastrada
      </strong>

      <p>
        O arquivo
        data/escalacoes.json
        está vazio.
      </p>

    </div>
  `;
}


/* =========================================================
   10. ACESSO AOS DADOS
   ========================================================= */

function obterEscalacoesCarregadas() {
  return [
    ...estadoEscalacoes.escalacoes
  ];
}


function obterEscalacaoPorId(
  escalacaoId
) {
  return (
    estadoEscalacoes.escalacoes.find(
      (escalacao) =>
        String(escalacao.id) ===
        String(escalacaoId)
    ) || null
  );
}


function escalacoesCarregadas() {
  return estadoEscalacoes.carregado;
}


function obterErroEscalacoes() {
  return estadoEscalacoes.erro;
}
