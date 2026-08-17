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

    await carregarConfiguracao();

    await carregarPesosDinamicos();

    await carregarJogadores();

    await carregarEscalacoes();

    await inicializarHistorico();

    console.info(
        "Cartola Estatístico inicializado com sucesso."
    );

}



/* =========================================================
   HISTÓRICO
   ========================================================= */

async function inicializarHistorico() {

    if (
        typeof Historico === "undefined" ||
        typeof HistoricoFiltros === "undefined"
    ) {

        return;

    }


    const indice =
        await Historico.carregarIndice();


    if (
        !indice ||
        !Array.isArray(indice.rodadas) ||
        indice.rodadas.length === 0
    ) {

        console.warn(
            "Histórico sem rodadas disponíveis."
        );

        return;

    }


    /*
     * Preenche os filtros.
     *
     * HistoricoFiltros agora seleciona
     * automaticamente a rodada histórica
     * mais recente.
     */

    HistoricoFiltros.preencherRodadas(
        indice
    );


    HistoricoFiltros.preencherPosicoes();


    /*
     * Obtém a rodada que efetivamente ficou
     * selecionada no filtro.
     *
     * Isso evita usar indice.rodadas[0],
     * que anteriormente fazia o site iniciar
     * sempre pela primeira rodada histórica.
     */

    let numeroRodada =
        typeof HistoricoFiltros
            .obterRodadaSelecionada ===
            "function"
            ? HistoricoFiltros
                .obterRodadaSelecionada()
            : null;


    /*
     * Fallback de segurança:
     *
     * se o filtro não retornar uma rodada,
     * procura ultimaRodada no índice.
     */

    if (
        !Number.isInteger(
            Number(numeroRodada)
        ) ||
        Number(numeroRodada) <= 0
    ) {

        numeroRodada =
            Number(
                indice.ultimaRodada
            );

    }


    /*
     * Segundo fallback:
     *
     * encontra a maior rodada disponível.
     */

    if (
        !Number.isInteger(
            Number(numeroRodada)
        ) ||
        Number(numeroRodada) <= 0
    ) {

        numeroRodada =
            Math.max(
                ...indice.rodadas
                    .map(
                        rodada =>
                            Number(
                                rodada.numero
                            )
                    )
                    .filter(
                        Number.isFinite
                    )
            );

    }


    if (
        !Number.isInteger(
            Number(numeroRodada)
        ) ||
        Number(numeroRodada) <= 0
    ) {

        console.warn(
            "Não foi possível determinar a rodada histórica inicial."
        );

        return;

    }


    numeroRodada =
        Number(
            numeroRodada
        );


    /*
     * Carrega as métricas da rodada
     * histórica mais recente.
     */

    await carregarHistoricoRodada(
        numeroRodada
    );


    /*
     * Atualiza automaticamente quando
     * o usuário troca a rodada.
     */

    const seletorRodada =
        document.getElementById(
            "historyRound"
        );


    if (seletorRodada) {

        seletorRodada.addEventListener(
            "change",
            async () => {

                const rodadaSelecionada =
                    typeof HistoricoFiltros
                        .obterRodadaSelecionada ===
                        "function"
                        ? HistoricoFiltros
                            .obterRodadaSelecionada()
                        : Number(
                            seletorRodada.value
                        );


                if (
                    !Number.isInteger(
                        Number(
                            rodadaSelecionada
                        )
                    ) ||
                    Number(
                        rodadaSelecionada
                    ) <= 0
                ) {

                    return;

                }


                await carregarHistoricoRodada(
                    Number(
                        rodadaSelecionada
                    )
                );

            }
        );

    }


    /*
     * Quando a posição mudar, a tabela
     * é renderizada novamente.
     *
     * O filtro de posição pode ser
     * consumido internamente pelo
     * HistoricoCards.
     */

    const seletorPosicao =
        document.getElementById(
            "historyPosition"
        );


    if (seletorPosicao) {

        seletorPosicao.addEventListener(
            "change",
            async () => {

                const rodadaSelecionada =
                    typeof HistoricoFiltros
                        .obterRodadaSelecionada ===
                        "function"
                        ? HistoricoFiltros
                            .obterRodadaSelecionada()
                        : numeroRodada;


                if (
                    !Number.isInteger(
                        Number(
                            rodadaSelecionada
                        )
                    ) ||
                    Number(
                        rodadaSelecionada
                    ) <= 0
                ) {

                    return;

                }


                await carregarHistoricoRodada(
                    Number(
                        rodadaSelecionada
                    )
                );

            }
        );

    }


    console.info(
        `Histórico inicializado na Rodada ${numeroRodada}.`
    );

}



/* =========================================================
   CARREGA E RENDERIZA UMA RODADA HISTÓRICA
   ========================================================= */

async function carregarHistoricoRodada(
    numeroRodada
) {

    if (
        typeof Historico === "undefined"
    ) {

        return;

    }


    const metricas =
        await Historico.carregarRodada(
            numeroRodada
        );


    if (!metricas) {

        console.warn(
            `Nenhum backtest disponível para a Rodada ${numeroRodada}.`
        );


        /*
         * Mesmo sem métricas, permitimos que
         * HistoricoCards tente renderizar o
         * estado correspondente à rodada.
         */

        if (
            typeof HistoricoCards !==
            "undefined" &&
            typeof HistoricoCards
                .renderTabela ===
                "function"
        ) {

            HistoricoCards.renderTabela(
                numeroRodada
            );

        }


        return;

    }


    /*
     * Resumo das métricas.
     */

    if (
        typeof HistoricoCards !==
        "undefined" &&
        typeof HistoricoCards
            .renderResumo ===
            "function"
    ) {

        const resumo =
            typeof HistoricoMetricas !==
                "undefined" &&
            typeof HistoricoMetricas
                .calcular ===
                "function"
                ? HistoricoMetricas.calcular(
                    metricas
                )
                : metricas;


        HistoricoCards.renderResumo(
            resumo
        );

    }


    /*
     * Tabela da rodada.
     */

    if (
        typeof HistoricoCards !==
        "undefined" &&
        typeof HistoricoCards
            .renderTabela ===
            "function"
    ) {

        HistoricoCards.renderTabela(
            numeroRodada
        );

    }

}
