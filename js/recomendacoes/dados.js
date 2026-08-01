/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — carregamento e processamento dos dados
   ========================================================= */


/* =========================================================
   1. CAMINHO DO ARQUIVO
   ========================================================= */

const CAMINHO_STATUS =
  "data/api/status.json";

let CAMINHO_JOGADORES = "";


/* =========================================================
   2. ESTADO DAS RECOMENDAÇÕES
   ========================================================= */

const estadoRecomendacoes = {
  jogadores: [],
  jogadoresOriginais: [],
  carregado: false,
  carregando: false,
  erro: null,
  posicaoAtiva: "GOL",
  calculadoraAplicada: false
};


/* =========================================================
   3. CARREGAMENTO DOS JOGADORES
   ========================================================= */

async function carregarJogadores() {
  estadoRecomendacoes.carregando = true;
  estadoRecomendacoes.carregado = false;
  estadoRecomendacoes.erro = null;
  estadoRecomendacoes.calculadoraAplicada = false;

  exibirCarregamentoJogadores();

  try {
      
      const statusResposta =
        await fetch(
          CAMINHO_STATUS,
          {
            cache: "no-store"
          }
        );
      
      if (!statusResposta.ok) {
        throw new Error(
          "Não foi possível carregar status.json"
        );
      }
      
      const status =
        await statusResposta.json();
      
      const rodada =
        Number(
          status.rodada_atual
        );
      
      CAMINHO_JOGADORES =
        `data/api/rodada-${String(rodada).padStart(2,"0")}/jogadores.json`;  
     
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

    estadoRecomendacoes.jogadoresOriginais =
      jogadoresValidos.map(
        copiarJogador
      );

    const jogadoresProcessados =
      processarJogadoresPelaCalculadora(
        jogadoresValidos
      );

    estadoRecomendacoes.jogadores =
      jogadoresProcessados;

    estadoRecomendacoes.carregado = true;
    estadoRecomendacoes.carregando = false;

    iniciarRecomendacoes();

    console.info(
      "Jogadores carregados e processados:",
      {
        quantidade:
          jogadoresProcessados.length,

        calculadoraAplicada:
          estadoRecomendacoes
            .calculadoraAplicada
      }
    );

    return jogadoresProcessados;
  } catch (erro) {
    console.error(
      "Erro ao carregar jogadores:",
      erro
    );

    estadoRecomendacoes.jogadores = [];
    estadoRecomendacoes.jogadoresOriginais = [];
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
   4. PROCESSAMENTO PELA CALCULADORA
   ========================================================= */

function processarJogadoresPelaCalculadora(
  jogadores
) {
  if (!Array.isArray(jogadores)) {
    return [];
  }

  if (
    typeof CalculadoraEstatistica ===
      "undefined" ||
    typeof CalculadoraEstatistica
      .analisarListaJogadores !==
      "function"
  ) {
    console.warn(
      "CalculadoraEstatistica não foi carregada. " +
      "Os dados originais serão utilizados."
    );

    estadoRecomendacoes.calculadoraAplicada =
      false;

    return jogadores.map(
      prepararJogadorSemCalculadora
    );
  }

  try {
    const jogadoresCalculados =
      CalculadoraEstatistica
        .analisarListaJogadores(
          jogadores
        );

    estadoRecomendacoes.calculadoraAplicada =
      true;

    return jogadoresCalculados.map(
      prepararJogadorCalculado
    );
  } catch (erro) {
    console.error(
      "Erro ao executar a calculadora estatística:",
      erro
    );

    estadoRecomendacoes.calculadoraAplicada =
      false;

    return jogadores.map(
      prepararJogadorSemCalculadora
    );
  }
}


/* =========================================================
   5. PREPARAÇÃO DO JOGADOR CALCULADO
   ========================================================= */

function prepararJogadorCalculado(
  jogador
) {
  const notaOriginal =
    obterNumeroSeguroLocal(
      jogador?.notaFinal
    );

  const notaCalculada =
    obterNumeroSeguroLocal(
      jogador?.notaCalculada,
      notaOriginal
    );

  const possuiNotaCalculada =
    Number.isFinite(
      Number(jogador?.notaCalculada)
    );

  const explicacaoCalculada =
    jogador?.explicacaoCalculada ||
    null;

  return {
    ...jogador,

    notaOriginal,

    notaFinal:
      possuiNotaCalculada
        ? notaCalculada
        : notaOriginal,

    notaModelo:
      possuiNotaCalculada
        ? notaCalculada
        : notaOriginal,

    calculadoPeloMotor:
      possuiNotaCalculada,

    justificativas:
      combinarJustificativas(
        jogador?.justificativas,
        explicacaoCalculada
      ),

    pontosAtencao:
      combinarPontosAtencao(
        jogador?.pontosAtencao,
        explicacaoCalculada
      )
  };
}


/* =========================================================
   6. PREPARAÇÃO SEM CALCULADORA
   ========================================================= */

function prepararJogadorSemCalculadora(
  jogador
) {
  const notaOriginal =
    obterNumeroSeguroLocal(
      jogador?.notaFinal
    );

  return {
    ...jogador,

    notaOriginal,

    notaModelo:
      notaOriginal,

    calculadoPeloMotor:
      false
  };
}


/* =========================================================
   7. COMBINAÇÃO DAS JUSTIFICATIVAS
   ========================================================= */

function combinarJustificativas(
  justificativasOriginais,
  explicacaoCalculada
) {
  const justificativas =
    Array.isArray(
      justificativasOriginais
    )
      ? [...justificativasOriginais]
      : [];

  const pontosFortes =
    Array.isArray(
      explicacaoCalculada?.pontosFortes
    )
      ? explicacaoCalculada.pontosFortes
      : [];

  pontosFortes.forEach(
    (texto) => {
      if (
        texto &&
        !justificativas.includes(texto)
      ) {
        justificativas.push(texto);
      }
    }
  );

  return justificativas;
}


/* =========================================================
   8. COMBINAÇÃO DOS PONTOS DE ATENÇÃO
   ========================================================= */

function combinarPontosAtencao(
  pontosOriginais,
  explicacaoCalculada
) {
  const pontos =
    Array.isArray(
      pontosOriginais
    )
      ? [...pontosOriginais]
      : [];

  const pontosCalculados =
    Array.isArray(
      explicacaoCalculada?.pontosAtencao
    )
      ? explicacaoCalculada.pontosAtencao
      : [];

  pontosCalculados.forEach(
    (texto) => {
      if (
        texto &&
        !pontos.includes(texto)
      ) {
        pontos.push(texto);
      }
    }
  );

  return pontos;
}


/* =========================================================
   9. CÓPIA SEGURA DO JOGADOR
   ========================================================= */

function copiarJogador(
  jogador
) {
  return {
    ...jogador,

    scouts: {
      ...(jogador?.scouts || {})
    },

    componentes: {
      ...(jogador?.componentes || {})
    },

    justificativas:
      Array.isArray(
        jogador?.justificativas
      )
        ? [...jogador.justificativas]
        : [],

    pontosAtencao:
      Array.isArray(
        jogador?.pontosAtencao
      )
        ? [...jogador.pontosAtencao]
        : [],

    historicoPontuacoes:
      Array.isArray(
        jogador?.historicoPontuacoes
      )
        ? [...jogador.historicoPontuacoes]
        : [],

    pontuacoes:
      Array.isArray(
        jogador?.pontuacoes
      )
        ? [...jogador.pontuacoes]
        : []
  };
}


/* =========================================================
   10. NÚMERO SEGURO LOCAL
   ========================================================= */

function obterNumeroSeguroLocal(
  valor,
  padrao = 0
) {
  const convertido =
    Number(valor);

  return Number.isFinite(
    convertido
  )
    ? convertido
    : padrao;
}


/* =========================================================
   11. VALIDAÇÃO DE UM JOGADOR
   ========================================================= */

function validarJogador(
  jogador
) {
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

  const posicao =
    String(
      jogador.posicao
    )
      .toUpperCase()
      .trim();

  const posicoesValidas = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];

  return posicoesValidas.includes(
    posicao
  );
}


/* =========================================================
   12. INICIALIZAÇÃO DAS RECOMENDAÇÕES
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
   13. ESTADO DE CARREGAMENTO
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
        Calculando os 18 critérios,
        aplicando os pesos por posição,
        organizando o ranking
        e gerando as justificativas.
      </p>

    </div>
  `;
}


/* =========================================================
   14. ESTADO DE ERRO
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
        <strong>data/jogadores.json</strong>
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
   15. ESTADO SEM JOGADORES NA POSIÇÃO
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
   16. ACESSO AOS DADOS
   ========================================================= */

function obterJogadoresCarregados() {
  return estadoRecomendacoes
    .jogadores
    .map(copiarJogador);
}


function obterJogadoresOriginais() {
  return estadoRecomendacoes
    .jogadoresOriginais
    .map(copiarJogador);
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
    String(
      codigoPosicao || ""
    )
      .toUpperCase()
      .trim();
}


function recomendacoesCarregadas() {
  return estadoRecomendacoes.carregado;
}


function obterErroRecomendacoes() {
  return estadoRecomendacoes.erro;
}


function calculadoraEstatisticaAplicada() {
  return estadoRecomendacoes
    .calculadoraAplicada;
}
