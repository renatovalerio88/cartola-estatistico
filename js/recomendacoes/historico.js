/* =========================================================
   CARTOLA ESTATÍSTICO
   Carregamento do histórico individual dos jogadores

   HOTFIX DE PERFORMANCE / RESILIÊNCIA

   - evita centenas de requests simultâneos no carregamento;
   - prioriza atletas prováveis;
   - reutiliza cache durante a mesma rodada;
   - invalida o cache pela rodada;
   - impõe timeout individual e orçamento global para que
     histórico lento nunca prenda a tela em "Carregando".
   ========================================================= */

const HistoricoJogadores = (() => {

  const LIMITE_CONCORRENCIA = 16;
  const TIMEOUT_REQUEST_MS = 3500;
  const ORCAMENTO_GLOBAL_MS = 7000;
  const cacheSessao = new Map();

  function prepararJogador(jogador) {
    return {
      ...jogador,
      historico: [],
      historicoPontuacoes: []
    };
  }

  async function carregar(jogadores) {
    if (!Array.isArray(jogadores)) {
      return [];
    }

    if (jogadores.length === 0) {
      return [];
    }

    const resultados = jogadores.map(prepararJogador);
    let proximoIndice = 0;
    let encerrado = false;

    const quantidadeWorkers = Math.min(
      LIMITE_CONCORRENCIA,
      jogadores.length
    );

    async function worker() {
      while (!encerrado) {
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

    const workers = Promise.all(
      Array.from(
        { length: quantidadeWorkers },
        () => worker()
      )
    );

    let timerGlobal = null;

    const limiteGlobal = new Promise(resolve => {
      timerGlobal = setTimeout(() => {
        encerrado = true;
        console.warn(
          "Histórico parcial: orçamento global de carregamento atingido. Recomendações liberadas com fallback seguro."
        );
        resolve();
      }, ORCAMENTO_GLOBAL_MS);
    });

    await Promise.race([
      workers,
      limiteGlobal
    ]);

    if (timerGlobal !== null) {
      clearTimeout(timerGlobal);
    }

    encerrado = true;

    return resultados;
  }

  function deveCarregarHistorico(jogador) {
    if (!jogador || !jogador.id) {
      return false;
    }

    const statusId = Number(
      jogador.statusId ?? jogador.status_id
    );

    if (Number.isFinite(statusId)) {
      return statusId === 7;
    }

    return true;
  }

  async function carregarJogador(jogador) {
    const jogadorPreparado = prepararJogador(jogador);

    if (!deveCarregarHistorico(jogador)) {
      return jogadorPreparado;
    }

    const rodada = Number(jogador.rodada);
    const chaveCache = `${jogador.id}:${
      Number.isFinite(rodada) ? rodada : "atual"
    }`;

    if (cacheSessao.has(chaveCache)) {
      return montarJogadorComHistorico(
        jogador,
        cacheSessao.get(chaveCache)
      );
    }

    const versaoRodada = Number.isFinite(rodada)
      ? `?r=${rodada}`
      : "";

    const controller = typeof AbortController !== "undefined"
      ? new AbortController()
      : null;

    let timerRequest = null;

    if (controller) {
      timerRequest = setTimeout(
        () => controller.abort(),
        TIMEOUT_REQUEST_MS
      );
    }

    try {
      const resposta = await fetch(
        `data/base-historica/${jogador.id}.json${versaoRodada}`,
        {
          cache: "default",
          ...(controller ? { signal: controller.signal } : {})
        }
      );

      if (!resposta.ok) {
        cacheSessao.set(chaveCache, []);
        return jogadorPreparado;
      }

      const dados = await resposta.json();

      const historico = Array.isArray(dados?.historico)
        ? dados.historico
            .filter(validarRegistro)
            .sort(
              (registroA, registroB) =>
                Number(registroA.rodada) -
                Number(registroB.rodada)
            )
        : [];

      cacheSessao.set(chaveCache, historico);

      return montarJogadorComHistorico(
        jogador,
        historico
      );
    } catch (erro) {
      if (erro?.name === "AbortError") {
        console.warn(
          `Histórico excedeu ${TIMEOUT_REQUEST_MS}ms para o jogador ${jogador.id}; usando fallback.`
        );
      } else {
        console.warn(
          `Histórico não carregado para o jogador ${jogador.id}:`,
          erro
        );
      }

      return jogadorPreparado;
    } finally {
      if (timerRequest !== null) {
        clearTimeout(timerRequest);
      }
    }
  }

  function montarJogadorComHistorico(jogador, historico) {
    const listaHistorico = Array.isArray(historico)
      ? historico
      : [];

    const historicoPontuacoes = listaHistorico
      .filter(possuiPontuacaoValida)
      .map(obterPontuacao);

    return {
      ...jogador,
      historico: listaHistorico,
      historicoPontuacoes
    };
  }

  function validarRegistro(registro) {
    return Boolean(
      registro &&
      typeof registro === "object" &&
      Number.isFinite(Number(registro.rodada))
    );
  }

  function possuiPontuacaoValida(registro) {
    if (!registro || typeof registro !== "object") {
      return false;
    }

    const valor = obterValorPontuacaoBruto(registro);

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return false;
    }

    return Number.isFinite(Number(valor));
  }

  function obterPontuacao(registro) {
    const valor = obterValorPontuacaoBruto(registro);

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return null;
    }

    const pontuacao = Number(valor);

    return Number.isFinite(pontuacao)
      ? pontuacao
      : null;
  }

  function obterValorPontuacaoBruto(registro) {
    if (
      Object.prototype.hasOwnProperty.call(
        registro,
        "pontuacao"
      )
    ) {
      const pontuacao = registro.pontuacao;

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

  return {
    carregar
  };

})();
