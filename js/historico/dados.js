/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico de jogadores
   Base individual por jogador
   ========================================================= */


const Historico = (() => {


    let indice = null;


    const cacheJogadores = {};



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
                        cache:"no-store"
                    }
                );


            if (!resposta.ok) {

                throw new Error(
                    "Índice histórico não encontrado"
                );

            }


            indice =
                await resposta.json();


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
       CARREGA HISTÓRICO INDIVIDUAL
       ===================================================== */


    async function carregarJogadorHistorico(
        id
    ) {


        if (
            cacheJogadores[id]
        ) {

            return cacheJogadores[id];

        }



        try {


            const resposta =
                await fetch(

                    `data/base-historica/${id}.json`,

                    {
                        cache:"no-store"
                    }

                );



            if (!resposta.ok) {

                cacheJogadores[id] = null;

                return null;

            }



            const dados =
                await resposta.json();



            cacheJogadores[id] =
                dados;



            return dados;


        }
        catch (erro) {


            console.warn(
                "Erro histórico jogador:",
                id
            );


            cacheJogadores[id] = null;


            return null;


        }


    }







    /* =====================================================
       COMPATIBILIDADE
       ===================================================== */


    async function carregarRodada(
        numeroRodada
    ) {


        console.warn(
            "carregarRodada não utilizado na nova arquitetura"
        );


        return [];


    }







    /* =====================================================
       MONTA HISTÓRICO DOS JOGADORES
       ===================================================== */


    async function montarHistoricoJogadores(
        jogadores
    ) {


        if (
            !Array.isArray(jogadores)
        ) {

            return [];

        }



        for (
            const jogador of jogadores
        ) {



            const historicoJogador =
                await carregarJogadorHistorico(
                    jogador.id
                );



            if (
                historicoJogador &&
                Array.isArray(
                    historicoJogador.historico
                )
            ) {


                jogador.historico =
                    historicoJogador.historico;



            }
            else {


                jogador.historico =
                    [];


            }



            jogador.historicoPontuacoes =

                jogador.historico.map(

                    item =>

                        Number(
                            item.pontos || 0
                        )

                );



        }




        console.log(

            "Histórico individual carregado:",

            jogadores.length,

            "jogadores"

        );



        return jogadores;


    }







    function getIndice() {


        return indice;


    }






    return {


        carregarIndice,

        carregarRodada,

        carregarJogadorHistorico,

        montarHistoricoJogadores,

        getIndice


    };



})();
