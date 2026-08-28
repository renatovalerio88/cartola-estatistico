/* =========================================================
   CARTOLA ESTATÍSTICO
   Carregamento do histórico individual dos jogadores

   HOTFIX DE PERFORMANCE

   - evita centenas de requests simultâneos no carregamento;
   - prioriza atletas prováveis, que são os elegíveis reais
     para recomendação/escalação;
   - reutiliza o cache do navegador durante a mesma rodada;
   - mantém a rodada na URL para invalidar o cache quando
     os dados históricos forem atualizados na rodada seguinte.
   ========================================================= */

const HistoricoJogadores = (() => {

  const LIMITE_CONCORRENCIA = 16;

  const cacheSessao = new Map();


  /* =======================================================
     CARREGAMENTO DA LISTA
     ======================================================= */

  async function carregar(jogadores) {
    if (!Array.isArray(jogadores)) {
      return [];
    }

    if (jogadores.length === 0) {
      return [];
    }

    const resultados = new Array(jogadores.length);
    let proximoIndice = 0;

    const quantidadeWorkers = Math.min(
      LIMITE_CONCORRENCIA,
      jogadores.length
    );

    async function worker() {
      while (true) {
        const indice = proximoIndice;
        proximoIndice += 1;

        if (indice >= jogadores.length) {
          return;
        }

        resultados[indice] = await carregarJogador(
          jogadores[indice]
        );
      }
    }

    await Promise.all(
      Array.from(
        { length: quantidadeWorkers },
        () => worker()
      )
    );

    return resultados;
  }


  /* =======================================================
     ELEGIBILIDADE PARA CARREGAR HISTÓRICO
     ======================================================= */

  function deveCarregarHistorico(jogador) {
    if (!jogador || !jogador.id) {
      return false;
    }

    const statusId = Number(
      jogador.statusId ?? jogador.status_id
    );

    /*
     * Status 7 = Provável na API do Cartola.
     *
     * O histórico individual é usado no ranking e na montagem
     * das escalações. Jogadores explicitamente não prováveis
     * não precisam bloquear a abertura do site com uma busca
     * histórica própria.
     *
     * Se o status não vier no payload, mantemos compatibilidade
     * e carregamos normalmente.
     */
    if (Number.isFinite(statusId)) {
      return statusId === 7;
    }

    return true;
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

    if (!deveCarregarHistorico(jogador)) {
      return jogadorPreparado;
    }

    const rodada = Number(
      jogador.rodada
    );

    const chaveCache = `${jogador.id}:${
      Number.isFinite(rodada) ? rodada : "atual"
    }`;

    if (cacheSessao.has(chaveCache)) {
      const historicoCache = cacheSessao.get(chaveCache);

      return montarJogadorComHistorico(
        jogador,
        historicoCache
      );
    }

    try {
      const versaoRodada = Number.isFinite(rodada)
        ? `?r=${rodada}`
        : "";

      const resposta = await fetch(
        `data/base-historica/${jogador.id}.json${versaoRodada}`,
        {
          cache: "default"
        }
      );

      if (!resposta.ok) {
        cacheSessao.set(chaveCache, []);
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

      cacheSessao.set(
        chaveCache,
        historico
      );

      return montarJogadorComHistorico(
        jogador,
        historico
      );

    } catch (erro) {
      console.warn(
        `Histórico não carregado para o jogador ${jogador.id}:`,
        erro
      );

      return jogadorPreparado;
    }
  }


  /* =======================================================
     MONTA JOGADOR COM HISTÓRICO
     ======================================================= */

  function montarJogadorComHistorico(
    jogador,
    historico
  ) {
    const listaHistorico = Array.isArray(historico)
      ? historico
      : [];

    const historicoPontuacoes = listaHistorico
      .filter(
        registro =>
          possuiPontuacaoValida(registro)
      )
      .map(
        registro =>
          obterPontuacao(registro)
      );

    return {
      ...jogador,
      historico: listaHistorico,
      historicoPontuacoes
    };
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
