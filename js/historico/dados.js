/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico de jogadores e rodadas
   =========================================================

   Responsabilidades:

   - carregar o índice histórico;
   - carregar métricas históricas por rodada;
   - carregar a base individual de cada jogador;
   - montar o histórico dos jogadores;
   - preservar pontuação zero real;
   - ignorar pontuações null/undefined/inválidas;
   - manter cache para evitar requisições repetidas.

   ========================================================= */


const Historico = (() => {


    /* =====================================================
       ESTADO / CACHE
       ===================================================== */


    let indice = null;


    const cacheJogadores = {};


    const cacheRodadas = {};



    /* =====================================================
       UTILIDADES
       ===================================================== */


    function numeroRodadaValido(
        valor
    ) {


        const numero =
            Number(
                valor
            );


        if (
            !Number.isInteger(
                numero
            ) ||
            numero <= 0
        ) {

            return null;

        }


        return numero;


    }



    function obterPontuacaoValida(
        valor
    ) {


        /*
         * IMPORTANTE:
         *
         * null e undefined significam ausência
         * de pontuação e NÃO podem virar zero.
         *
         * Já o número 0 é uma pontuação válida
         * e deve permanecer no histórico.
         */


        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {

            return null;

        }


        const numero =
            Number(
                valor
            );


        return Number.isFinite(
            numero
        )
            ? numero
            : null;


    }



    function ordenarRodadasIndice(
        rodadas
    ) {


        if (
            !Array.isArray(
                rodadas
            )
        ) {

            return [];

        }


        return rodadas
            .filter(
                item => {

                    if (
                        !item ||
                        typeof item !== "object"
                    ) {

                        return false;

                    }


                    return (
                        numeroRodadaValido(
                            item.numero
                        ) !== null
                    );

                }
            )
            .sort(
                (
                    rodadaA,
                    rodadaB
                ) => {

                    return (
                        Number(
                            rodadaA.numero
                        ) -
                        Number(
                            rodadaB.numero
                        )
                    );

                }
            );


    }



    /* =====================================================
       CARREGA ÍNDICE HISTÓRICO
       ===================================================== */


    async function carregarIndice() {


        if (indice) {

            return indice;

        }


        try {


            const resposta =
                await fetch(
                    "data/historico/indice.json",
                    {
                        cache: "no-store"
                    }
                );


            if (!resposta.ok) {

                throw new Error(
                    `Índice histórico não encontrado (HTTP ${resposta.status})`
                );

            }


            const dados =
                await resposta.json();


            const rodadas =
                ordenarRodadasIndice(
                    dados?.rodadas
                );


            /*
             * Mantemos todos os campos existentes
             * no índice e apenas normalizamos a
             * lista de rodadas.
             */


            indice = {

                ...(
                    dados &&
                    typeof dados === "object"
                        ? dados
                        : {}
                ),

                rodadas

            };


            /*
             * Caso ultimaRodada não exista ou esteja
             * inválida, calculamos pela lista.
             */


            const ultimaRodadaInformada =
                numeroRodadaValido(
                    indice.ultimaRodada
                );


            if (
                ultimaRodadaInformada === null
            ) {


                indice.ultimaRodada =
                    rodadas.length > 0
                        ? Math.max(
                            ...rodadas.map(
                                item =>
                                    Number(
                                        item.numero
                                    )
                            )
                        )
                        : 0;


            }


            return indice;


        }
        catch (erro) {


            console.warn(
                "Índice histórico indisponível:",
                erro.message
            );


            indice = {

                ultimaRodada: 0,

                rodadas: []

            };


            return indice;


        }


    }



    /* =====================================================
       CARREGA MÉTRICAS DE UMA RODADA
       ===================================================== */


    async function carregarRodada(
        numeroRodada
    ) {


        const rodada =
            numeroRodadaValido(
                numeroRodada
            );


        if (rodada === null) {


            console.warn(
                "Rodada histórica inválida:",
                numeroRodada
            );


            return null;


        }


        if (
            Object.prototype.hasOwnProperty.call(
                cacheRodadas,
                rodada
            )
        ) {

            return cacheRodadas[rodada];

        }


        const numeroFormatado =
            String(
                rodada
            ).padStart(
                2,
                "0"
            );


        const caminho =
            `data/historico/rodada-${numeroFormatado}/metricas.json`;


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
                    `Métricas da rodada ${numeroFormatado} não encontradas.`
                );


                cacheRodadas[rodada] =
                    null;


                return null;


            }


            const dados =
                await resposta.json();


            cacheRodadas[rodada] =
                dados;


            return dados;


        }
        catch (erro) {


            console.warn(
                `Erro ao carregar métricas da rodada ${numeroFormatado}:`,
                erro.message
            );


            cacheRodadas[rodada] =
                null;


            return null;


        }


    }



    /* =====================================================
       CARREGA HISTÓRICO INDIVIDUAL
       ===================================================== */


    async function carregarJogadorHistorico(
        id
    ) {


        if (
            id === null ||
            id === undefined ||
            id === ""
        ) {

            return null;

        }


        const chave =
            String(
                id
            );


        if (
            Object.prototype.hasOwnProperty.call(
                cacheJogadores,
                chave
            )
        ) {

            return cacheJogadores[chave];

        }


        try {


            const resposta =
                await fetch(
                    `data/base-historica/${chave}.json`,
                    {
                        cache: "no-store"
                    }
                );


            if (!resposta.ok) {


                cacheJogadores[chave] =
                    null;


                return null;


            }


            const dados =
                await resposta.json();


            cacheJogadores[chave] =
                dados;


            return dados;


        }
        catch (erro) {


            console.warn(
                "Erro histórico jogador:",
                chave,
                erro.message
            );


            cacheJogadores[chave] =
                null;


            return null;


        }


    }



    /* =====================================================
       NORMALIZA HISTÓRICO DE UM JOGADOR
       ===================================================== */


    function normalizarHistoricoJogador(
        historico
    ) {


        if (
            !Array.isArray(
                historico
            )
        ) {

            return [];

        }


        return historico
            .filter(
                item => {

                    if (
                        !item ||
                        typeof item !== "object"
                    ) {

                        return false;

                    }


                    return (
                        numeroRodadaValido(
                            item.rodada
                        ) !== null
                    );

                }
            )
            .sort(
                (
                    itemA,
                    itemB
                ) => {

                    return (
                        Number(
                            itemA.rodada
                        ) -
                        Number(
                            itemB.rodada
                        )
                    );

                }
            );


    }



    /* =====================================================
       MONTA HISTÓRICO DOS JOGADORES
       ===================================================== */


    async function montarHistoricoJogadores(
        jogadores
    ) {


        if (
            !Array.isArray(
                jogadores
            )
        ) {

            return [];

        }


        /*
         * Carregamos em paralelo para evitar centenas
         * de requisições executadas uma após a outra.
         */


        await Promise.all(

            jogadores.map(

                async jogador => {


                    if (
                        !jogador ||
                        !jogador.id
                    ) {

                        if (jogador) {

                            jogador.historico =
                                [];

                            jogador.historicoPontuacoes =
                                [];

                        }


                        return;

                    }


                    const historicoJogador =
                        await carregarJogadorHistorico(
                            jogador.id
                        );


                    const historico =
                        normalizarHistoricoJogador(
                            historicoJogador?.historico
                        );


                    jogador.historico =
                        historico;


                    /*
                     * Aqui está a correção principal:
                     *
                     * - null NÃO entra;
                     * - undefined NÃO entra;
                     * - valores inválidos NÃO entram;
                     * - 0 verdadeiro entra normalmente.
                     */


                    jogador.historicoPontuacoes =
                        historico
                            .map(
                                item =>
                                    obterPontuacaoValida(
                                        item.pontos
                                    )
                            )
                            .filter(
                                valor =>
                                    valor !== null
                            );


                }

            )

        );


        console.log(
            "Histórico individual carregado:",
            jogadores.length,
            "jogadores"
        );


        return jogadores;


    }



    /* =====================================================
       CONSULTA DO ÍNDICE
       ===================================================== */


    function getIndice() {


        return indice;


    }



    /* =====================================================
       LIMPEZA DE CACHE
       Útil para futuras atualizações sem reload completo.
       ===================================================== */


    function limparCache() {


        indice = null;


        Object.keys(
            cacheJogadores
        ).forEach(
            chave => {

                delete cacheJogadores[chave];

            }
        );


        Object.keys(
            cacheRodadas
        ).forEach(
            chave => {

                delete cacheRodadas[chave];

            }
        );


    }



    /* =====================================================
       API PÚBLICA
       ===================================================== */


    return {


        carregarIndice,

        carregarRodada,

        carregarJogadorHistorico,

        montarHistoricoJogadores,

        getIndice,

        limparCache


    };


})();
