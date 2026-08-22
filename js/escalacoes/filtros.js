/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — integração robusta dos filtros manuais
   ========================================================= */

(function () {
  "use strict";

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function idJogador(jogador) {
    return texto(
      jogador?.id ??
      jogador?.atletaId ??
      jogador?.atleta_id ??
      jogador?.atleta?.id ??
      ""
    );
  }

  function clubeJogador(jogador) {
    return texto(
      jogador?.siglaClube ??
      jogador?.clubeSigla ??
      jogador?.clube?.abreviacao ??
      jogador?.clube ??
      jogador?.atleta?.siglaClube ??
      jogador?.atleta?.clubeSigla ??
      jogador?.atleta?.clube?.abreviacao ??
      jogador?.atleta?.clube ??
      ""
    ).toUpperCase();
  }

  function copiar(jogador) {
    if (!jogador || typeof jogador !== "object") return jogador;
    return {
      ...jogador,
      scouts: { ...(jogador.scouts || {}) },
      historico: Array.isArray(jogador.historico)
        ? jogador.historico.map(item => ({
            ...item,
            scouts: { ...(item?.scouts || {}) }
          }))
        : jogador.historico
    };
  }

  function estadoFiltros() {
    try {
      if (
        window.CartolaFiltrosExclusao &&
        typeof window.CartolaFiltrosExclusao.obterEstado === "function"
      ) {
        return window.CartolaFiltrosExclusao.obterEstado() || {};
      }
    } catch (erro) {
      console.warn("Falha ao consultar filtros:", erro);
    }
    return {};
  }

  function conjuntosExclusao() {
    const estado = estadoFiltros();
    return {
      clubes: new Set(
        (Array.isArray(estado.clubesExcluidos) ? estado.clubesExcluidos : [])
          .map(clube => texto(clube).toUpperCase())
          .filter(Boolean)
      ),
      jogadores: new Set(
        (Array.isArray(estado.jogadoresExcluidos) ? estado.jogadoresExcluidos : [])
          .map(texto)
          .filter(Boolean)
      )
    };
  }

  function obterBaseAtiva() {
    const tentativas = [];

    try {
      if (
        typeof estadoRecomendacoes !== "undefined" &&
        Array.isArray(estadoRecomendacoes.jogadores)
      ) {
        tentativas.push(estadoRecomendacoes.jogadores);
      }
    } catch (_) {}

    try {
      if (
        window.CartolaRecomendacoes &&
        typeof window.CartolaRecomendacoes.obterJogadoresParaEscalacoes === "function"
      ) {
        tentativas.push(window.CartolaRecomendacoes.obterJogadoresParaEscalacoes());
      }
    } catch (_) {}

    try {
      if (typeof window.obterJogadoresParaEscalacoes === "function") {
        tentativas.push(window.obterJogadoresParaEscalacoes());
      }
    } catch (_) {}

    try {
      if (typeof window.obterJogadores === "function") {
        tentativas.push(window.obterJogadores());
      }
    } catch (_) {}

    for (const tentativa of tentativas) {
      if (Array.isArray(tentativa) && tentativa.length) {
        return tentativa.map(copiar);
      }
    }

    return [];
  }

  function aplicarExclusoes(jogadores) {
    const { clubes, jogadores: ids } = conjuntosExclusao();
    return (Array.isArray(jogadores) ? jogadores : [])
      .filter(jogador => {
        const clube = clubeJogador(jogador);
        const id = idJogador(jogador);
        if (clube && clubes.has(clube)) return false;
        if (id && ids.has(id)) return false;
        return true;
      })
      .map(copiar);
  }

  function obterJogadoresDisponiveisEscalacaoFiltrados() {
    const base = aplicarExclusoes(obterBaseAtiva());

    return base.filter(jogador => {
      try {
        if (typeof window.jogadorDisponivelEscalacao === "function") {
          return window.jogadorDisponivelEscalacao(jogador);
        }
      } catch (_) {}
      return true;
    });
  }

  async function recalcularEscalacoesComFiltros() {
    let resultado = [];

    if (
      window.EscalacoesDados &&
      typeof window.EscalacoesDados.recarregar === "function"
    ) {
      resultado = await window.EscalacoesDados.recarregar();
    } else if (typeof window.recarregarEscalacoes === "function") {
      resultado = await window.recarregarEscalacoes();
    } else if (typeof window.carregarEscalacoes === "function") {
      resultado = await window.carregarEscalacoes();
    }

    if (typeof window.exibirEscalacoes === "function") {
      try { window.exibirEscalacoes(); } catch (_) {}
    }

    return Array.isArray(resultado) ? resultado : [];
  }

  function auditarFiltrosNasEscalacoes() {
    const { clubes, jogadores: ids } = conjuntosExclusao();
    let escalacoes = [];

    try {
      if (
        window.EscalacoesDados &&
        typeof window.EscalacoesDados.obter === "function"
      ) {
        escalacoes = window.EscalacoesDados.obter();
      } else if (typeof window.obterEscalacoes === "function") {
        escalacoes = window.obterEscalacoes();
      }
    } catch (_) {}

    if (!Array.isArray(escalacoes)) escalacoes = [];

    const problemas = [];
    escalacoes.forEach(escalacao => {
      const lista = [
        ...(Array.isArray(escalacao?.titulares) ? escalacao.titulares : []),
        ...(Array.isArray(escalacao?.banco) ? escalacao.banco : []),
        escalacao?.capitao,
        escalacao?.reservaLuxo
      ].filter(Boolean);

      lista.forEach(jogador => {
        const clube = clubeJogador(jogador);
        const id = idJogador(jogador);
        if ((clube && clubes.has(clube)) || (id && ids.has(id))) {
          problemas.push({
            perfil: escalacao?.perfil ?? escalacao?.nome,
            jogador: jogador?.apelido ?? jogador?.nome,
            clube,
            id
          });
        }
      });
    });

    const diagnostico = {
      aprovado: problemas.length === 0,
      problemas,
      clubesExcluidos: [...clubes],
      jogadoresExcluidos: [...ids]
    };

    if (!diagnostico.aprovado) {
      console.error("Filtros não respeitados nas escalações:", diagnostico);
    }

    return diagnostico;
  }

  /*
   * Ponto crítico da correção:
   * filtros-exclusao.js chama window.recalcularEscalacoes().
   * Antes esta integração não publicava a função robusta,
   * então o clique podia recalcular pela rota antiga e
   * recolocar clubes/jogadores excluídos.
   */
  window.obterJogadoresDisponiveisEscalacao =
    obterJogadoresDisponiveisEscalacaoFiltrados;

  window.recalcularEscalacoes =
    recalcularEscalacoesComFiltros;

  window.addEventListener("cartola:filtros-aplicados", () => {
    window.setTimeout(async () => {
      try {
        const diagnostico = auditarFiltrosNasEscalacoes();
        if (!diagnostico.aprovado) {
          await recalcularEscalacoesComFiltros();
          window.setTimeout(auditarFiltrosNasEscalacoes, 80);
        }
      } catch (erro) {
        console.error("Falha ao validar filtros após aplicação:", erro);
      }
    }, 80);
  });

  window.CartolaEscalacoesFiltros = {
    obterEstado: estadoFiltros,
    aplicarExclusoes,
    obterJogadoresDisponiveis: obterJogadoresDisponiveisEscalacaoFiltrados,
    recalcular: recalcularEscalacoesComFiltros,
    auditar: auditarFiltrosNasEscalacoes
  };

  console.info("Integração robusta dos filtros de escalação carregada.");
})();
