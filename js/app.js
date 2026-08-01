/* =========================================================
   CARTOLA ESTATÍSTICO
   Inicialização principal da aplicação
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    inicializarAplicacao
);

async function inicializarAplicacao() {

    configurarInterface();

    await Promise.all([
        carregarConfiguracao(),
        carregarJogadores(),
        carregarEscalacoes()
    ]);

    await inicializarHistorico();

    console.info(
        "Cartola Estatístico inicializado com sucesso."
    );

}

async function inicializarHistorico() {

    if (
        typeof Historico === "undefined" ||
        typeof HistoricoFiltros === "undefined"
    ) {
        return;
    }

    const indice = await Historico.carregarIndice();

    if (!indice) return;

    HistoricoFiltros.preencherRodadas(indice);

    HistoricoFiltros.preencherPosicoes();

    if (indice.rodadas.length > 0) {

        const numero = indice.rodadas[0].numero;

        const metricas = await Historico.carregarRodada(numero);

        if (
            metricas &&
            typeof HistoricoCards !== "undefined"
        ) {

            HistoricoCards.renderResumo(
                HistoricoMetricas.calcular(metricas)
            );

        }

    }

}
