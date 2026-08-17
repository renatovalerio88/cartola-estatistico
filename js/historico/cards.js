/*
======================================================
CARTOLA ESTATÍSTICO

Histórico - Cards

Responsável por:
- exibir resumo do backtest por rodada
- exibir métricas históricas
- carregar jogadores analisados da rodada
- aplicar filtro por posição
- comparar projeção x resultado real

======================================================
*/


const HistoricoCards = (() => {


    /*
    ======================================================
    ESTADO
    ======================================================
    */


    const cacheJogadores = {};


    let ultimaRodadaRenderizada = null;


    /*
    ======================================================
    UTILITÁRIOS
    ======================================================
    */


    function numero(
        valor,
        casas = 2
    ) {

        const convertido =
            Number(valor);


        if (
            !Number.isFinite(
                convertido
            )
        ) {

            return "--";

        }


        return convertido.toFixed(
            casas
        );

    }



    function inteiro(
        valor
    ) {

        const convertido =
            Number(valor);


        if (
            !Number.isFinite(
                convertido
            )
        ) {

            return "--";

        }


        return String(
            Math.round(
                convertido
            )
        );

    }



    function escaparHtml(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }



    function obterElemento(
        ...ids
    ) {

        for (
            const id of ids
        ) {

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                return elemento;

            }

        }


        return null;

    }



    function obterContainerResumo() {

        return obterElemento(
            "historySummary",
            "historicoResumo",
            "historyMetrics",
            "historico-metricas"
        );

    }



    function obterContainerTabela() {

        return obterElemento(
            "historyTable",
            "historicoTabela",
            "historyPlayers",
            "historico-jogadores"
        );

    }



    function obterPosicaoSelecionada() {

        if (
            typeof HistoricoFiltros !==
                "undefined" &&
            typeof HistoricoFiltros
                .obterPosicaoSelecionada ===
                "function"
        ) {

            return (
                HistoricoFiltros
                    .obterPosicaoSelecionada() ||
                "TODOS"
            );

        }


        const select =
            document.getElementById(
                "historyPosition"
            );


        return (
            select?.value ||
            "TODOS"
        );

    }



    function normalizarPosicao(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .trim()
            .toUpperCase();

    }



    function obterNomeJogador(
        jogador
    ) {

        return (
            jogador?.apelido ||
            jogador?.nome ||
            jogador?.nomeJogador ||
            jogador?.atleta ||
            `Jogador ${jogador?.id ?? ""}`
        );

    }



    function obterPosicaoJogador(
        jogador
    ) {

        return normalizarPosicao(
            jogador?.posicao ||
            jogador?.posicaoSigla ||
            jogador?.posicao_nome ||
            ""
        );

    }



    function obterProjecao(
        jogador
    ) {

        const candidatos = [

            jogador?.projecao,

            jogador?.pontuacaoProjetada,

            jogador?.projetado,

            jogador?.previsao,

            jogador?.scoreProjetado

        ];


        for (
            const valor of candidatos
        ) {

            const convertido =
                Number(valor);


            if (
                Number.isFinite(
                    convertido
                )
            ) {

                return convertido;

            }

        }


        return null;

    }



    function obterPontuacaoReal(
        jogador
    ) {

        const candidatos = [

            jogador?.pontuacaoReal,

            jogador?.pontosReais,

            jogador?.real,

            jogador?.pontuacao,

            jogador?.pontos

        ];


        for (
            const valor of candidatos
        ) {

            if (
                valor === null ||
                valor === undefined ||
                valor === ""
            ) {

                continue;

            }


            const convertido =
                Number(valor);


            if (
                Number.isFinite(
                    convertido
                )
            ) {

                return convertido;

            }

        }


        return null;

    }



    function obterErro(
        jogador
    ) {

        const projecao =
            obterProjecao(
                jogador
            );


        const real =
            obterPontuacaoReal(
                jogador
            );


        if (
            projecao === null ||
            real === null
        ) {

            return null;

        }


        return Math.abs(
            projecao -
            real
        );

    }



    /*
    ======================================================
    RESUMO
    ======================================================
    */


    function obterValorMetrica(
        metricas,
        ...chaves
    ) {

        if (
            !metricas ||
            typeof metricas !==
                "object"
        ) {

            return null;

        }


        for (
            const chave of chaves
        ) {

            if (
                metricas[chave] !==
                    undefined &&
                metricas[chave] !==
                    null
            ) {

                return metricas[chave];

            }

        }


        return null;

    }



    function renderResumo(
        metricas
    ) {

        const container =
            obterContainerResumo();


        if (!container) {

            console.warn(
                "Container do resumo histórico não encontrado."
            );

            return;

        }


        if (
            !metricas ||
            typeof metricas !==
                "object"
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <strong>
                        Nenhum backtest disponível
                    </strong>

                    <p>
                        Não existem métricas para esta rodada.
                    </p>

                </div>

            `;


            return;

        }


        const rodada =
            obterValorMetrica(
                metricas,
                "rodada",
                "numeroRodada"
            );


        const erroMedio =
            obterValorMetrica(
                metricas,
                "erroMedio",
                "mae"
            );


        const top5 =
            obterValorMetrica(
                metricas,
                "top5",
                "acertoTop5"
            );


        const correlacao =
            obterValorMetrica(
                metricas,
                "correlacao",
                "correlation"
            );


        const capitao =
            obterValorMetrica(
                metricas,
                "capitao",
                "resultadoCapitao"
            );


        container.innerHTML = `

            <div class="history-summary-grid">

                <div class="history-summary-card">

                    <span class="history-summary-label">
                        Rodada
                    </span>

                    <strong class="history-summary-value">
                        ${
                            rodada !== null
                                ? escaparHtml(
                                    rodada
                                )
                                : "--"
                        }
                    </strong>

                </div>


                <div class="history-summary-card">

                    <span class="history-summary-label">
                        Erro médio
                    </span>

                    <strong class="history-summary-value">
                        ${
                            erroMedio !== null
                                ? `${numero(
                                    erroMedio
                                )} pts`
                                : "--"
                        }
                    </strong>

                </div>


                <div class="history-summary-card">

                    <span class="history-summary-label">
                        Top 5
                    </span>

                    <strong class="history-summary-value">
                        ${
                            top5 !== null
                                ? escaparHtml(
                                    top5
                                )
                                : "--"
                        }
                    </strong>

                </div>


                <div class="history-summary-card">

                    <span class="history-summary-label">
                        Correlação
                    </span>

                    <strong class="history-summary-value">
                        ${
                            correlacao !== null
                                ? numero(
                                    correlacao
                                )
                                : "--"
                        }
                    </strong>

                </div>


                <div class="history-summary-card">

                    <span class="history-summary-label">
                        Capitão
                    </span>

                    <strong class="history-summary-value">
                        ${
                            capitao !== null
                                ? escaparHtml(
                                    capitao
                                )
                                : "--"
                        }
                    </strong>

                </div>

            </div>

        `;

    }



    /*
    ======================================================
    CARREGAMENTO DOS JOGADORES DA RODADA
    ======================================================
    */


    async function carregarJogadoresRodada(
        numeroRodada
    ) {

        const rodada =
            Number(
                numeroRodada
            );


        if (
            !Number.isInteger(
                rodada
            ) ||
            rodada <= 0
        ) {

            return [];

        }


        if (
            Object.prototype
                .hasOwnProperty.call(
                    cacheJogadores,
                    rodada
                )
        ) {

            return cacheJogadores[
                rodada
            ];

        }


        const numeroFormatado =
            String(
                rodada
            ).padStart(
                2,
                "0"
            );


        const caminho =
            `data/historico/rodada-${numeroFormatado}/jogadores.json`;


        try {

            const resposta =
                await fetch(
                    caminho,
                    {
                        cache: "no-store"
                    }
                );


            if (!resposta.ok) {

                console.warn(
                    `Jogadores históricos da rodada ${numeroFormatado} não encontrados.`
                );


                cacheJogadores[
                    rodada
                ] = [];


                return [];

            }


            const dados =
                await resposta.json();


            let jogadores = [];


            if (
                Array.isArray(
                    dados
                )
            ) {

                jogadores =
                    dados;

            } else if (
                Array.isArray(
                    dados?.jogadores
                )
            ) {

                jogadores =
                    dados.jogadores;

            }


            cacheJogadores[
                rodada
            ] =
                jogadores;


            return jogadores;

        }
        catch (erro) {

            console.warn(
                `Erro ao carregar jogadores históricos da rodada ${numeroFormatado}:`,
                erro
            );


            cacheJogadores[
                rodada
            ] = [];


            return [];

        }

    }



    /*
    ======================================================
    FILTRO
    ======================================================
    */


    function filtrarJogadores(
        jogadores
    ) {

        const posicao =
            obterPosicaoSelecionada();


        if (
            !posicao ||
            posicao === "TODOS"
        ) {

            return jogadores;

        }


        return jogadores.filter(
            jogador =>
                obterPosicaoJogador(
                    jogador
                ) ===
                posicao
        );

    }



    /*
    ======================================================
    TABELA
    ======================================================
    */


    function montarLinhaJogador(
        jogador
    ) {

        const nome =
            obterNomeJogador(
                jogador
            );


        const posicao =
            obterPosicaoJogador(
                jogador
            ) || "--";


        const projecao =
            obterProjecao(
                jogador
            );


        const real =
            obterPontuacaoReal(
                jogador
            );


        const erro =
            obterErro(
                jogador
            );


        const top5 =
            jogador?.top5 === true ||
            jogador?.foiTop5 === true;


        return `

            <tr>

                <td>

                    <strong>
                        ${escaparHtml(nome)}
                    </strong>

                </td>

                <td>
                    ${escaparHtml(posicao)}
                </td>

                <td>
                    ${
                        projecao !== null
                            ? numero(
                                projecao
                            )
                            : "--"
                    }
                </td>

                <td>
                    ${
                        real !== null
                            ? numero(
                                real
                            )
                            : "--"
                    }
                </td>

                <td>
                    ${
                        erro !== null
                            ? numero(
                                erro
                            )
                            : "--"
                    }
                </td>

                <td>
                    ${
                        top5
                            ? "✓"
                            : ""
                    }
                </td>

            </tr>

        `;

    }



    async function renderTabela(
        numeroRodada
    ) {

        ultimaRodadaRenderizada =
            Number(
                numeroRodada
            );


        const container =
            obterContainerTabela();


        if (!container) {

            console.warn(
                "Container da tabela histórica não encontrado."
            );

            return;

        }


        container.innerHTML = `

            <div class="empty-state">

                <strong>
                    Carregando histórico...
                </strong>

            </div>

        `;


        const jogadores =
            await carregarJogadoresRodada(
                numeroRodada
            );


        const jogadoresFiltrados =
            filtrarJogadores(
                jogadores
            );


        if (
            jogadoresFiltrados.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <strong>
                        Nenhum backtest disponível
                    </strong>

                    <p>
                        Não existem jogadores históricos para a Rodada
                        ${escaparHtml(
                            numeroRodada
                        )}.
                    </p>

                </div>

            `;


            return;

        }


        const ordenados =
            [...jogadoresFiltrados]
                .sort(
                    (jogadorA, jogadorB) => {

                        const projecaoA =
                            obterProjecao(
                                jogadorA
                            ) ?? -Infinity;


                        const projecaoB =
                            obterProjecao(
                                jogadorB
                            ) ?? -Infinity;


                        return (
                            projecaoB -
                            projecaoA
                        );

                    }
                );


        const linhas =
            ordenados
                .map(
                    montarLinhaJogador
                )
                .join("");


        container.innerHTML = `

            <div class="history-table-wrapper">

                <table class="history-table">

                    <thead>

                        <tr>

                            <th>
                                Jogador
                            </th>

                            <th>
                                Pos.
                            </th>

                            <th>
                                Projeção
                            </th>

                            <th>
                                Real
                            </th>

                            <th>
                                Erro
                            </th>

                            <th>
                                Top 5
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${linhas}

                    </tbody>

                </table>

            </div>

        `;

    }



    /*
    ======================================================
    RENDERIZAÇÃO COMPLETA
    ======================================================
    */


    async function render(
        numeroRodada
    ) {

        const rodada =
            Number(
                numeroRodada
            );


        if (
            !Number.isInteger(
                rodada
            ) ||
            rodada <= 0
        ) {

            return;

        }


        let metricas = null;


        if (
            typeof Historico !==
                "undefined" &&
            typeof Historico
                .carregarRodada ===
                "function"
        ) {

            metricas =
                await Historico
                    .carregarRodada(
                        rodada
                    );

        }


        if (metricas) {

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


            renderResumo(
                resumo
            );

        }


        await renderTabela(
            rodada
        );

    }



    /*
    ======================================================
    ATUALIZAÇÃO APÓS FILTRO
    ======================================================
    */


    async function atualizarFiltro() {

        if (
            !Number.isInteger(
                ultimaRodadaRenderizada
            ) ||
            ultimaRodadaRenderizada <= 0
        ) {

            return;

        }


        await renderTabela(
            ultimaRodadaRenderizada
        );

    }



    /*
    ======================================================
    LIMPEZA DE CACHE
    ======================================================
    */


    function limparCache() {

        Object.keys(
            cacheJogadores
        ).forEach(
            chave => {

                delete cacheJogadores[
                    chave
                ];

            }
        );


        ultimaRodadaRenderizada =
            null;

    }



    /*
    ======================================================
    API PÚBLICA
    ======================================================
    */


    return {

        render,

        renderResumo,

        renderTabela,

        atualizarFiltro,

        limparCache

    };


})();
