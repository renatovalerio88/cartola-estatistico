/* =========================================================
   CARTOLA ESTATÍSTICO
   Carregamento do histórico individual dos jogadores
   ========================================================= */

const HistoricoJogadores = (() => {

  async function carregar(jogadores) {
    if (!Array.isArray(jogadores)) {
      return [];
    }

    const resultados = await Promise.all(
      jogadores.map(carregarJogador)
    );

    return resultados;
  }


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

      return {
        ...jogador,

        historico,

        historicoPontuacoes:
          historico
            .map(
              registro =>
                Number(registro.pontos)
            )
            .filter(Number.isFinite)
      };

    } catch (erro) {
      console.warn(
        `Histórico não carregado para o jogador ${jogador.id}:`,
        erro
      );

      return jogadorPreparado;
    }
  }


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


  return {
    carregar
  };

})();
