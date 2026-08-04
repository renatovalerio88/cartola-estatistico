/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico de jogadores
   ========================================================= */


const Historico = (() => {


    let indice = null;


    const cacheRodadas = {};



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
                    "Erro ao carregar indice historico"
                );

            }



            indice =
                await resposta.json();



            return indice;



        }
        catch (erro) {


            console.error(
                "Erro no índice histórico:",
                erro
            );



            indice = {

                ultimaRodada: 0,

                rodadas: []

            };



            return indice;


        }


    }




    /* =====================================================
       CARREGA JOGADORES DE UMA RODADA
       ===================================================== */


    async function carregarRodada(
        numeroRodada
    ) {


        if (
            cacheRodadas[numeroRodada]
        ) {

            return cacheRodadas[numeroRodada];

        }



        try {


            const caminho =

                `data/api/rodada-${String(numeroRodada).padStart(2,"0")}/jogadores.json`;



            const resposta =
                await fetch(
                    caminho,
                    {
                        cache:"no-store"
                    }
                );



            if (!resposta.ok) {

                return [];

            }



            const dados =
                await resposta.json();



            cacheRodadas[numeroRodada] =
                dados;



            return dados;



        }
        catch (erro) {


            console.error(
                "Erro ao carregar rodada",
                numeroRodada,
                erro
            );


            return [];


        }


    }





    /* =====================================================
       MONTA HISTÓRICO DOS JOGADORES
       ===================================================== */


    async function montarHistoricoJogadores(
        jogadores
    ) {


        if (!Array.isArray(jogadores)) {

            return [];

        }



        const indiceHistorico =
            await carregarIndice();



        const mapaHistorico = {};



        const rodadasDisponiveis =
            Array.isArray(
                indiceHistorico.rodadas
            )
                ? indiceHistorico.rodadas
                : [];





        /*
          Busca somente rodadas existentes
        */


        for (
            const itemRodada of rodadasDisponiveis
        ) {



            const numeroRodada =
                Number(
                    itemRodada.numero
                );



            if (!numeroRodada) {

                continue;

            }



            const jogadoresRodada =
                await carregarRodada(
                    numeroRodada
                );



            if (
                !Array.isArray(jogadoresRodada)
            ) {

                continue;

            }





            jogadoresRodada.forEach(
                atleta => {


                    const id =
                        Number(
                            atleta.id
                        );



                    if (!id) {

                        return;

                    }



                    if (
                        !mapaHistorico[id]
                    ) {

                        mapaHistorico[id] = [];

                    }



                    mapaHistorico[id].push({

                        rodada:
                            numeroRodada,


                        pontos:
                            Number(
                                atleta.pontuacaoReal ??
                                atleta.pontosUltimaRodada ??
                                atleta.pontos ??
                                0
                            ),


                        media:
                            Number(
                                atleta.media || 0
                            ),


                        preco:
                            Number(
                                atleta.preco || 0
                            ),


                        scouts:
                            atleta.scouts || {}

                    });



                }
            );


        }





        /*
          Junta histórico no jogador atual
        */


        jogadores.forEach(
            jogador => {


                const id =
                    Number(
                        jogador.id
                    );



                const historico =
                    mapaHistorico[id]
                    ||
                    [];



                historico.sort(
                    (a,b) =>
                        a.rodada - b.rodada
                );



                jogador.historico =
                    historico;



                jogador.historicoPontuacoes =

                    historico.map(
                        item =>
                            Number(
                                item.pontos || 0
                            )
                    );



            }
        );





        console.log(
            "Histórico carregado:",
            jogadores.length,
            "jogadores"
        );



        return jogadores;



    }





    /* =====================================================
       CONSULTA
       ===================================================== */


    function getIndice() {

        return indice;

    }





    return {


        carregarIndice,

        carregarRodada,

        montarHistoricoJogadores,

        getIndice


    };



})();
