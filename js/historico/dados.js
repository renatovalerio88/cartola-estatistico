/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico de jogadores
   ========================================================= */


const Historico = (() => {


    let indice = null;


    const cacheRodadas = {};



    /* =====================================================
       CARREGA STATUS / RODADA ATUAL
       ===================================================== */

    async function carregarIndice() {


        if (indice) {

            return indice;

        }


        try {


            const resposta =
                await fetch(
                    "data/api/status.json",
                    {
                        cache: "no-store"
                    }
                );


            if (!resposta.ok) {

                throw new Error(
                    "Erro ao carregar status"
                );

            }


            const status =
                await resposta.json();



            indice = {

                rodadaAtual:
                    Number(
                        status.rodada_atual || 1
                    )

            };



            return indice;



        }
        catch (erro) {


            console.error(
                "Erro no índice histórico:",
                erro
            );


            indice = {

                rodadaAtual: 1

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



        const status =
            await carregarIndice();



        const mapaHistorico = {};




        /*
          Busca todas as rodadas disponíveis
        */

        for (
            let rodada = 1;
            rodada <= status.rodadaAtual;
            rodada++
        ) {



            const jogadoresRodada =
                await carregarRodada(
                    rodada
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

                        rodada,


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
                    (a,b)=>
                        a.rodada-b.rodada
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
