/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — filtros
   ========================================================= */

const HistoricoFiltros = (() => {


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */


    function obterNumeroRodada(
        rodada
    ) {

        if (
            rodada === null ||
            rodada === undefined
        ) {

            return null;

        }


        const valor =
            typeof rodada === "object"
                ? rodada.numero
                : rodada;


        const numero =
            Number(
                valor
            );


        if (
            !Number.isInteger(numero) ||
            numero <= 0
        ) {

            return null;

        }


        return numero;

    }



    /* =====================================================
       FILTRO DE RODADAS
       ===================================================== */


    function preencherRodadas(
        indice
    ) {

        const select =
            document.getElementById(
                "historyRound"
            );


        if (!select) {

            return;

        }


        select.innerHTML = "";


        if (
            !indice ||
            !Array.isArray(indice.rodadas) ||
            indice.rodadas.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value = "";

            option.textContent =
                "Nenhuma rodada disponível";


            select.appendChild(
                option
            );


            select.disabled = true;


            return;

        }


        /*
         * Normaliza e remove rodadas inválidas.
         */

        const rodadas =
            indice.rodadas
                .map(
                    rodada => ({
                        rodada,
                        numero:
                            obterNumeroRodada(
                                rodada
                            )
                    })
                )
                .filter(
                    item =>
                        item.numero !== null
                );


        if (
            rodadas.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value = "";

            option.textContent =
                "Nenhuma rodada disponível";


            select.appendChild(
                option
            );


            select.disabled = true;


            return;

        }


        select.disabled = false;


        /*
         * Exibe da rodada mais recente
         * para a mais antiga.
         *
         * Exemplo:
         *
         * Rodada 23
         * Rodada 22
         * Rodada 21
         * ...
         */


        rodadas.sort(
            (itemA, itemB) =>
                itemB.numero -
                itemA.numero
        );


        rodadas.forEach(
            item => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(
                        item.numero
                    );


                option.textContent =
                    `Rodada ${item.numero}`;


                select.appendChild(
                    option
                );

            }
        );


        /*
         * Descobre a rodada mais recente.
         *
         * Primeiro tenta usar ultimaRodada
         * informada pelo índice.
         *
         * Caso ela não exista ou não esteja
         * disponível, usa a maior rodada
         * encontrada.
         */


        const ultimaRodadaIndice =
            obterNumeroRodada(
                indice.ultimaRodada
            );


        const rodadaMaisRecente =
            (
                ultimaRodadaIndice !== null &&
                rodadas.some(
                    item =>
                        item.numero ===
                        ultimaRodadaIndice
                )
            )
                ? ultimaRodadaIndice
                : rodadas[0].numero;


        /*
         * Seleciona automaticamente
         * a rodada mais recente.
         */


        select.value =
            String(
                rodadaMaisRecente
            );


        console.log(
            "Histórico:",
            `Rodada ${rodadaMaisRecente}`,
            "selecionada automaticamente."
        );

    }



    /* =====================================================
       FILTRO DE POSIÇÕES
       ===================================================== */


    function preencherPosicoes() {

        const select =
            document.getElementById(
                "historyPosition"
            );


        if (!select) {

            return;

        }


        select.innerHTML = "";


        const posicoes = [

            {
                valor: "TODOS",
                texto: "Todas as posições"
            },

            {
                valor: "GOL",
                texto: "Goleiros"
            },

            {
                valor: "LAT",
                texto: "Laterais"
            },

            {
                valor: "ZAG",
                texto: "Zagueiros"
            },

            {
                valor: "MEI",
                texto: "Meias"
            },

            {
                valor: "ATA",
                texto: "Atacantes"
            },

            {
                valor: "TEC",
                texto: "Treinadores"
            }

        ];


        posicoes.forEach(
            posicao => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    posicao.valor;


                option.textContent =
                    posicao.texto;


                select.appendChild(
                    option
                );

            }
        );


        /*
         * Sempre inicia mostrando
         * todas as posições.
         */


        select.value =
            "TODOS";

    }



    /* =====================================================
       CONSULTAS
       ===================================================== */


    function obterRodadaSelecionada() {

        const select =
            document.getElementById(
                "historyRound"
            );


        if (!select) {

            return null;

        }


        return obterNumeroRodada(
            select.value
        );

    }



    function obterPosicaoSelecionada() {

        const select =
            document.getElementById(
                "historyPosition"
            );


        if (!select) {

            return "TODOS";

        }


        return (
            select.value ||
            "TODOS"
        );

    }



    /* =====================================================
       API PÚBLICA
       ===================================================== */


    return {

        preencherRodadas,

        preencherPosicoes,

        obterRodadaSelecionada,

        obterPosicaoSelecionada

    };


})();
