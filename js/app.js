/* =========================================================
   CARTOLA ESTATÍSTICO
   Inicialização principal da aplicação
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    inicializarAplicacao
);


/* =========================================================
   INICIALIZAÇÃO PRINCIPAL
   ========================================================= */

async function inicializarAplicacao() {

    try {

        /*
         * Interface.
         */

        if (
            typeof configurarInterface ===
            "function"
        ) {

            configurarInterface();

        }


        /*
         * Configuração geral.
         */

        if (
            typeof carregarConfiguracao ===
            "function"
        ) {

            await carregarConfiguracao();

        }


        /*
         * Pesos estatísticos.
         */

        if (
            typeof carregarPesosDinamicos ===
            "function"
        ) {

            await carregarPesosDinamicos();

        }


        /*
         * Jogadores.
         *
         * Esta etapa continua sendo aguardada porque
         * Recomendações e Times sugeridos dependem dela.
         */

        if (
            typeof carregarJogadores ===
            "function"
        ) {

            await carregarJogadores();

        }


        /*
         * IMPORTANTE:
         *
         * Escalações e Histórico são independentes.
         *
         * Um erro em Times sugeridos não pode mais impedir
         * a inicialização do Histórico e vice-versa.
         *
         * Também evitamos depender diretamente do
         * identificador carregarEscalacoes, pois o módulo
         * de escalações expõe sua API em window.
         */

        const tarefasIndependentes = [

            inicializarEscalacoesAplicacao(),

            inicializarHistorico()

        ];


        const resultados =
            await Promise.allSettled(
                tarefasIndependentes
            );


        resultados.forEach(
            (
                resultado,
                indice
            ) => {

                if (
                    resultado.status !==
                    "rejected"
                ) {

                    return;

                }


                const modulo =
                    indice === 0
                        ? "Times sugeridos"
                        : "Histórico";


                console.error(
                    `Falha ao inicializar ${modulo}:`,
                    resultado.reason
                );

            }
        );


        console.info(
            "Cartola Estatístico inicializado com sucesso."
        );

    } catch (erro) {

        console.error(
            "Falha na inicialização principal do Cartola Estatístico:",
            erro
        );

    }

}



/* =========================================================
   ESCALAÇÕES
   ========================================================= */

async function inicializarEscalacoesAplicacao() {

    /*
     * Caminho preferencial:
     *
     * usa a API agrupada criada em
     * js/escalacoes/dados.js.
     */

    if (
        typeof window !==
            "undefined" &&
        window.CartolaEscalacoes &&
        typeof window.CartolaEscalacoes
            .carregar ===
            "function"
    ) {

        console.info(
            "Inicializando Times sugeridos pela API CartolaEscalacoes."
        );


        return await window
            .CartolaEscalacoes
            .carregar();

    }


    /*
     * Segundo caminho:
     *
     * função explicitamente exposta no window.
     */

    if (
        typeof window !==
            "undefined" &&
        typeof window.carregarEscalacoes ===
            "function"
    ) {

        console.info(
            "Inicializando Times sugeridos por window.carregarEscalacoes."
        );


        return await window
            .carregarEscalacoes();

    }


    /*
     * Compatibilidade com versões anteriores.
     *
     * typeof é seguro mesmo quando o identificador
     * não existe.
     */

    if (
        typeof carregarEscalacoes ===
        "function"
    ) {

        console.info(
            "Inicializando Times sugeridos pela função global."
        );


        return await carregarEscalacoes();

    }


    /*
     * Não interrompe o restante do site.
     */

    console.warn(
        "Módulo de Times sugeridos não está disponível. Verifique o carregamento de js/escalacoes/dados.js."
    );


    return [];

}



/* =========================================================
   HISTÓRICO
   ========================================================= */

async function inicializarHistorico() {

    if (
        typeof Historico ===
            "undefined" ||
        typeof HistoricoFiltros ===
            "undefined"
    ) {

        console.warn(
            "Módulos do Histórico ainda não estão disponíveis."
        );

        return;

    }


    let indice = null;


    try {

        indice =
            await Historico
                .carregarIndice();

    } catch (erro) {

        console.error(
            "Erro ao carregar índice do Histórico:",
            erro
        );

        return;

    }


    if (
        !indice ||
        !Array.isArray(
            indice.rodadas
        ) ||
        indice.rodadas.length === 0
    ) {

        console.warn(
            "Histórico sem rodadas disponíveis."
        );

        return;

    }


    /*
     * Preenche filtros.
     */

    if (
        typeof HistoricoFiltros
            .preencherRodadas ===
            "function"
    ) {

        HistoricoFiltros
            .preencherRodadas(
                indice
            );

    }


    if (
        typeof HistoricoFiltros
            .preencherPosicoes ===
            "function"
    ) {

        HistoricoFiltros
            .preencherPosicoes();

    }


    /*
     * Descobre a rodada inicialmente selecionada.
     */

    let numeroRodada = null;


    if (
        typeof HistoricoFiltros
            .obterRodadaSelecionada ===
            "function"
    ) {

        numeroRodada =
            Number(
                HistoricoFiltros
                    .obterRodadaSelecionada()
            );

    }


    /*
     * Primeiro fallback:
     * ultimaRodada do índice.
     */

    if (
        !Number.isInteger(
            numeroRodada
        ) ||
        numeroRodada <= 0
    ) {

        numeroRodada =
            Number(
                indice.ultimaRodada
            );

    }


    /*
     * Segundo fallback:
     * maior rodada encontrada no índice.
     */

    if (
        !Number.isInteger(
            numeroRodada
        ) ||
        numeroRodada <= 0
    ) {

        const rodadasValidas =
            indice.rodadas
                .map(
                    rodada =>
                        Number(
                            rodada?.numero ??
                            rodada
                        )
                )
                .filter(
                    numero =>
                        Number.isInteger(
                            numero
                        ) &&
                        numero > 0
                );


        if (
            rodadasValidas.length >
            0
        ) {

            numeroRodada =
                Math.max(
                    ...rodadasValidas
                );

        }

    }


    if (
        !Number.isInteger(
            numeroRodada
        ) ||
        numeroRodada <= 0
    ) {

        console.warn(
            "Não foi possível determinar a rodada histórica inicial."
        );

        return;

    }


    /*
     * Carrega a rodada inicial.
     *
     * Erro nessa rodada não impede a instalação
     * dos listeners dos filtros.
     */

    try {

        await carregarHistoricoRodada(
            numeroRodada
        );

    } catch (erro) {

        console.error(
            `Falha ao carregar Histórico da Rodada ${numeroRodada}:`,
            erro
        );

    }


    configurarEventosHistorico(
        numeroRodada
    );


    console.info(
        `Histórico inicializado na Rodada ${numeroRodada}.`
    );

}



/* =========================================================
   EVENTOS DO HISTÓRICO
   ========================================================= */

function configurarEventosHistorico(
    rodadaInicial
) {

    const seletorRodada =
        document.getElementById(
            "historyRound"
        );


    if (
        seletorRodada &&
        seletorRodada.dataset
            .listenerCartola !==
            "1"
    ) {

        seletorRodada.dataset
            .listenerCartola =
            "1";


        seletorRodada.addEventListener(
            "change",
            async () => {

                let rodadaSelecionada =
                    null;


                if (
                    typeof HistoricoFiltros !==
                        "undefined" &&
                    typeof HistoricoFiltros
                        .obterRodadaSelecionada ===
                        "function"
                ) {

                    rodadaSelecionada =
                        Number(
                            HistoricoFiltros
                                .obterRodadaSelecionada()
                        );

                }


                if (
                    !Number.isInteger(
                        rodadaSelecionada
                    ) ||
                    rodadaSelecionada <= 0
                ) {

                    rodadaSelecionada =
                        Number(
                            seletorRodada.value
                        );

                }


                if (
                    !Number.isInteger(
                        rodadaSelecionada
                    ) ||
                    rodadaSelecionada <= 0
                ) {

                    return;

                }


                try {

                    await carregarHistoricoRodada(
                        rodadaSelecionada
                    );

                } catch (erro) {

                    console.error(
                        `Erro ao trocar Histórico para Rodada ${rodadaSelecionada}:`,
                        erro
                    );

                }

            }
        );

    }


    const seletorPosicao =
        document.getElementById(
            "historyPosition"
        );


    if (
        seletorPosicao &&
        seletorPosicao.dataset
            .listenerCartola !==
            "1"
    ) {

        seletorPosicao.dataset
            .listenerCartola =
            "1";


        seletorPosicao.addEventListener(
            "change",
            async () => {

                let rodadaSelecionada =
                    Number(
                        rodadaInicial
                    );


                if (
                    typeof HistoricoFiltros !==
                        "undefined" &&
                    typeof HistoricoFiltros
                        .obterRodadaSelecionada ===
                        "function"
                ) {

                    const rodadaFiltro =
                        Number(
                            HistoricoFiltros
                                .obterRodadaSelecionada()
                        );


                    if (
                        Number.isInteger(
                            rodadaFiltro
                        ) &&
                        rodadaFiltro > 0
                    ) {

                        rodadaSelecionada =
                            rodadaFiltro;

                    }

                }


                if (
                    !Number.isInteger(
                        rodadaSelecionada
                    ) ||
                    rodadaSelecionada <= 0
                ) {

                    return;

                }


                try {

                    await carregarHistoricoRodada(
                        rodadaSelecionada
                    );

                } catch (erro) {

                    console.error(
                        `Erro ao aplicar filtro de posição na Rodada ${rodadaSelecionada}:`,
                        erro
                    );

                }

            }
        );

    }

}



/* =========================================================
   CARREGA E RENDERIZA UMA RODADA HISTÓRICA
   ========================================================= */

async function carregarHistoricoRodada(
    numeroRodada
) {

    if (
        typeof Historico ===
        "undefined"
    ) {

        return null;

    }


    let metricas = null;


    try {

        metricas =
            await Historico
                .carregarRodada(
                    numeroRodada
                );

    } catch (erro) {

        console.error(
            `Erro ao carregar dados históricos da Rodada ${numeroRodada}:`,
            erro
        );

        return null;

    }


    if (!metricas) {

        console.warn(
            `Nenhum backtest disponível para a Rodada ${numeroRodada}.`
        );


        if (
            typeof HistoricoCards !==
                "undefined" &&
            typeof HistoricoCards
                .renderTabela ===
                "function"
        ) {

            try {

                HistoricoCards
                    .renderTabela(
                        numeroRodada
                    );

            } catch (erro) {

                console.error(
                    "Erro ao renderizar tabela vazia do Histórico:",
                    erro
                );

            }

        }


        return null;

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

        try {

            const resumo =
                typeof HistoricoMetricas !==
                    "undefined" &&
                typeof HistoricoMetricas
                    .calcular ===
                    "function"
                    ? HistoricoMetricas
                        .calcular(
                            metricas
                        )
                    : metricas;


            HistoricoCards
                .renderResumo(
                    resumo
                );

        } catch (erro) {

            console.error(
                "Erro ao renderizar resumo do Histórico:",
                erro
            );

        }

    }


    /*
     * Tabela.
     */

    if (
        typeof HistoricoCards !==
            "undefined" &&
        typeof HistoricoCards
            .renderTabela ===
            "function"
    ) {

        try {

            HistoricoCards
                .renderTabela(
                    numeroRodada
                );

        } catch (erro) {

            console.error(
                "Erro ao renderizar tabela do Histórico:",
                erro
            );

        }

    }


    return metricas;

}
