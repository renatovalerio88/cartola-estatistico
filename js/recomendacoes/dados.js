/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — carregamento dos dados
   ========================================================= */


/* =========================================================
   1. CAMINHO DO ARQUIVO
   ========================================================= */

const CAMINHO_JOGADORES =
  "data/jogadores.json";


/* =========================================================
   2. ESTADO DAS RECOMENDAÇÕES
   ========================================================= */

const estadoRecomendacoes = {
  jogadores: [],
  carregado: false,
  carregando: false,
  erro: null,
  posicaoAtiva: "GOL"
};


/* =========================================================
   3. CARREGAMENTO DOS JOGADORES
   ========================================================= */

async function carregarJogadores() {
  estadoRecomendacoes.carregando = true;
  estadoRecomendacoes.carregado = false;
  estadoRecomendacoes.erro = null;

  exibirCarregamentoJogadores();

  try {
    const resposta = await fetch(
      CAMINHO_JOGADORES,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro HTTP ${resposta.status}`
      );
    }

    const dados =
      await resposta.json();

    if (!Array.isArray(dados)) {
      throw new Error(
        "O arquivo jogadores.json " +
        "não contém uma lista válida."
      );
    }

    const jogadoresValidos =
      dados.filter(validarJogador);

    if (jogadoresValidos.length === 0) {
      throw new Error(
        "Nenhum jogador válido foi encontrado."
      );
    }

    estadoRecomendacoes.jogadores =
      jogadoresValidos;

    estadoRecomendacoes.carregado = true;
    estadoRecomendacoes.carregando = false;

    iniciarRecomendacoes();

    return jogadoresValidos;
  } catch (erro) {
    console.error(
      "Erro ao carregar jogadores:",
      erro
    );

    estadoRecomendacoes.jogadores = [];
    estadoRecomendacoes.carregado = false;
    estadoRecomendacoes.carregando = false;
    estadoRecomendacoes.erro =
      erro.message;

    exibirErroJogadores(
      erro.message
    );

    return [];
  }
}


/* =========================================================
   4. VALIDAÇÃO DE UM JOGADOR
   ========================================================= */

function validarJogador(jogador) {
  if (!ehObjetoValido(jogador)) {
    return false;
  }

  if (!jogador.id) {
    return false;
  }

  if (!jogador.nome) {
    return false;
  }

  if (!jogador.posicao) {
    return false;
  }

  return true;
}


/* =========================================================
   5. INICIALIZAÇÃO DAS RECOMENDAÇÕES
   ========================================================= */

function iniciarRecomendacoes() {
  if (!estadoRecomendacoes.carregado) {
    return;
  }

  criarFiltrosPosicao();
  exibirDestaquesGerais();
  exibirJogadoresDaPosicao();
}


/* =========================================================
   6. ESTADO DE CARREGAMENTO
   ========================================================= */

function exibirCarregamentoJogadores() {
  const grade =
    document.getElementById(
      "playersGrid"
    );

  if (!grade) {
    return;
  }

  grade.innerHTML = `
    <div class="empty-state">

      <strong>
        Carregando jogadores
      </strong>

      <p>
        Organizando projeções,
        riscos, confiança,
        ranking e justificativas.
      </p>

    </div>
  `;
}


/* =========================================================
   7. ESTADO DE ERRO
   ========================================================= */

function exibirErroJogadores(
  mensagem = ""
) {
  const grade =
    document.getElementById(
      "playersGrid"
    );

  if (!grade) {
    return;
  }

  grade.innerHTML = `
    <div class="empty-state">

      <strong>
        Não foi possível
        carregar os jogadores
      </strong>

      <p>
        Confirme se o arquivo
        <strong>dados/jogadores.json</strong>
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
   8. ESTADO SEM JOGADORES NA POSIÇÃO
   ========================================================= */

function exibirPosicaoSemJogadores() {
  const grade =
    document.getElementById(
      "playersGrid"
    );

  if (!grade) {
    return;
  }

  const nomePosicao =
    obterNomePosicao(
      estadoRecomendacoes
        .posicaoAtiva
    );

  grade.innerHTML = `
    <div class="empty-state">

      <strong>
        Nenhum jogador encontrado
      </strong>

      <p>
        Não existem jogadores cadastrados
        para a posição
        ${escaparHtml(nomePosicao)}.
      </p>

    </div>
  `;
}


/* =========================================================
   9. ACESSO AOS DADOS
   ========================================================= */

function obterJogadoresCarregados() {
  return [
    ...estadoRecomendacoes.jogadores
  ];
}


function obterJogadorPorId(
  jogadorId
) {
  return (
    estadoRecomendacoes.jogadores.find(
      (jogador) =>
        String(jogador.id) ===
        String(jogadorId)
    ) || null
  );
}


function obterPosicaoAtiva() {
  return estadoRecomendacoes
    .posicaoAtiva;
}


function definirPosicaoAtiva(
  codigoPosicao
) {
  estadoRecomendacoes.posicaoAtiva =
    codigoPosicao;
}


function recomendacoesCarregadas() {
  return estadoRecomendacoes.carregado;
}


function obterErroRecomendacoes() {
  return estadoRecomendacoes.erro;
}
