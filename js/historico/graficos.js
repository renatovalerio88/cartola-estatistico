/*
======================================================
CARTOLA ESTATÍSTICO

Histórico - Gráficos

Responsável por:
- evolução dos modelos
- comparação por posição
- acumulado do campeonato

======================================================
*/


const HistoricoGraficos = (() => {


    let graficos = {};



    // ==================================================
    // CONFIGURAÇÕES
    // ==================================================

    function limparGrafico(
        id
    ){

        if(
            graficos[id]
        ){

            graficos[id].destroy();

            delete graficos[id];

        }

    }



    function criar(
        id,
        configuracao
    ){

        const canvas =
            document.getElementById(id);



        if(
            !canvas ||
            !window.Chart
        ){

            return;

        }



        limparGrafico(id);



        graficos[id] =
            new Chart(
                canvas,
                configuracao
            );


    }



    // ==================================================
    // EVOLUÇÃO POR RODADA
    // ==================================================

    function evolucaoModelos(
        id = "grafico-evolucao-modelos"
    ){


        if(
            !window.HistoricoEscalacoes
        ){

            return;

        }



        const dados =
            HistoricoEscalacoes
                .evolucao();



        if(
            !dados.length
        ){

            return;

        }



        criar(
            id,
            {

                type:
                    "line",


                data: {


                    labels:

                        dados.map(
                            r =>
                                "R" +
                                r.rodada
                        ),



                    datasets: [


                        {

                            label:
                                "Base",

                            data:

                                dados.map(
                                    r =>
                                    r.base
                                )

                        },


                        {

                            label:
                                "Explosão",

                            data:

                                dados.map(
                                    r =>
                                    r.explosao
                                )

                        },


                        {

                            label:
                                "Diferencial",

                            data:

                                dados.map(
                                    r =>
                                    r.diferencial
                                )

                        },


                        {

                            label:
                                "Completo",

                            data:

                                dados.map(
                                    r =>
                                    r.completo
                                )

                        }


                    ]

                },


                options: {


                    responsive:
                        true,


                    plugins: {


                        legend: {


                            position:
                                "bottom"


                        }


                    }


                }


            }
        );


    }



    // ==================================================
    // POSIÇÕES
    // ==================================================

    function posicoes(
        id = "grafico-posicoes"
    ){


        if(
            !window.HistoricoEscalacoes
        ){

            return;

        }



        const dados =
            HistoricoEscalacoes
                .analisarPosicoes();



        const labels =
            Object.keys(
                dados
            );



        criar(
            id,
            {

                type:
                    "bar",


                data: {


                    labels,


                    datasets: [

                        {

                            label:
                                "Média de pontos",

                            data:

                                labels.map(
                                    pos =>
                                        dados[pos]
                                            .media
                                )

                        }

                    ]

                },


                options: {


                    responsive:
                        true,


                    plugins: {


                        legend: {


                            display:
                                false

                        }


                    }


                }

            }

        );


    }



    // ==================================================
    // ACUMULADO
    // ==================================================

    function acumulado(
        id = "grafico-acumulado"
    ){


        if(
            !window.HistoricoEscalacoes
        ){

            return;

        }



        const dados =
            HistoricoEscalacoes
                .compararModelos();



        criar(
            id,
            {

                type:
                    "bar",


                data: {


                    labels:

                        dados.map(
                            m =>
                            m.modelo
                        ),


                    datasets: [

                        {

                            label:
                                "Pontuação acumulada",

                            data:

                                dados.map(
                                    m =>
                                    m.total
                                )

                        }

                    ]

                },


                options: {


                    responsive:
                        true,


                    plugins: {


                        legend:


                            {

                                display:
                                    false

                            }


                    }


                }

            }

        );


    }



    // ==================================================
    // RENDER COMPLETO
    // ==================================================

    function render(){

        evolucaoModelos();

        posicoes();

        acumulado();

    }



    return {


        render,

        evolucaoModelos,

        posicoes,

        acumulado


    };


})();
