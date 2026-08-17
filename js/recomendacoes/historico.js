/* =========================================================
   CARTOLA ESTATÍSTICO
   Carregamento do histórico individual dos jogadores
   ========================================================= */

const HistoricoJogadores = (() => {

  /* =======================================================
     CARREGAMENTO DA LISTA
     ======================================================= */

  async function carregar(jogadores) {
    if (!Array.isArray(jogadores)) {
      return [];
    }

    const resultados = await Promise.all(
      jogadores.map(carregarJogador)
    );

    return resultados;
  }


  /* =======================================================
     CARREGAMENTO INDIVIDUAL
     ======================================================= */

  async function carregarJogador(jogador) {
    const jogadorPreparado = {
      ...jogador,
      historico: [],
      historicoPontuacoes: []
    };

    if (!jogador?.id) {
      return jogadorPreparado;
    }

    try {
      const resposta = await fetch(
        `data/base-historica/${jogador.id}.json`,
        {
          cache: "no-store"
        }
      );

      if (!resposta.ok) {
        return jogadorPreparado;
      }

      const dados = await resposta.json();

      const historico = Array.isArray(
        dados?.historico
      )
        ? dados.historico
            .filter(validarRegistro)
            .sort(
              (registroA, registroB) =>
                Number(registroA.rodada) -
                Number(registroB.rodada)
            )
        : [];

      /*
       * IMPORTANTE
       *
       * Uma rodada com pontos = null significa que não existe
       * pontuação válida registrada para aquele atleta.
       *
       * Ela NÃO pode ser transformada em zero.
       *
       * Zero verdadeiro continua sendo considerado normalmente.
       */

      const historicoPontuacoes =
        historico
          .filter(
            registro =>
              possuiPontuacaoValida(
                registro
              )
          )
          .map(
            registro =>
              obterPontuacao(
                registro
              )
          );

      return {
        ...jogador,

        historico,

        historicoPontuacoes
      };

    } catch (erro) {
      console.warn(
        `Histórico não carregado para o jogador ${jogador.id}:`,
        erro
      );

      return jogadorPreparado;
    }
  }


  /* =======================================================
     VALIDAÇÃO DOS REGISTROS
     ======================================================= */

  function validarRegistro(registro) {
    if (
      !registro ||
      typeof registro !== "object"
    ) {
      return false;
    }

    return Number.isFinite(
      Number(registro.rodada)
    );
  }


  /* =======================================================
     PONTUAÇÃO
     ======================================================= */

  function possuiPontuacaoValida(
    registro
  ) {
    if (
      !registro ||
      typeof registro !== "object"
    ) {
      return false;
    }

    const valor =
      obterValorPontuacaoBruto(
        registro
      );

    /*
     * null e undefined representam ausência de pontuação.
     *
     * Não usamos apenas Number.isFinite(Number(valor)),
     * porque Number(null) === 0.
     */

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return false;
    }

    return Number.isFinite(
      Number(valor)
    );
  }


  function obterPontuacao(
    registro
  ) {
    const valor =
      obterValorPontuacaoBruto(
        registro
      );

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return null;
    }

    const pontuacao =
      Number(valor);

    return Number.isFinite(
      pontuacao
    )
      ? pontuacao
      : null;
  }


  function obterValorPontuacaoBruto(
    registro
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        registro,
        "pontuacao"
      )
    ) {
      const pontuacao =
        registro.pontuacao;

      if (
        pontuacao !== null &&
        pontuacao !== undefined &&
        pontuacao !== ""
      ) {
        return pontuacao;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        registro,
        "pontos"
      )
    ) {
      return registro.pontos;
    }

    return null;
  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  return {
    carregar
  };

})();
