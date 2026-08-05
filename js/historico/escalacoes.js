/*
======================================================
CARTOLA ESTATÍSTICO

Histórico de Escalações
Laboratório de Backtest

Responsável por:
- carregar escalacoes.json
- organizar resultados
- calcular comparações
- preparar dados para cards e gráficos

======================================================
*/

const HistoricoEscalacoes = (() => {


    const ARQUIVO =
        "data/historico/escalacoes.json";


    let dados = null;



    // ==================================================
    // UTILIDADES
    // ==================================================

    function numero(valor, padrao = 0) {

        valor = Number(valor);

        return Number.isFinite(valor)
            ? valor
            : padrao;

    }



    function ordenarRodadas(lista) {

        return [...lista]
            .sort(
                (a, b) =>
                    numero(a.rodada) -
                    numero(b.rodada)
            );

    }



    // ==================================================
    // CARREGAMENTO
    // ==================================================

    async function carregar() {

        try {

            const resposta =
                await fetch(ARQUIVO);


            if (!resposta.ok) {

                throw new Error(
                    "Arquivo não encontrado"
                );

            }


            dados =
                await resposta.json();


            return dados;


        } catch (erro) {


            console.warn(
                "Histórico de escalações indisponível:",
                erro
            );


            dados = {

                rodadas: [],

                resumo: {}

            };


            return dados;

        }

    }



    // ==================================================
    // ACESSO
    // ==================================================

    function obterDados() {

        return dados || {

            rodadas: [],

            resumo: {}

        };

    }



    function obterRodadas() {

        return ordenarRodadas(
            obterDados()
                .rodadas || []
        );

    }



    // ==================================================
    // RESUMO POR MODELO
    // ==================================================

    function calcularResumoModelo(
        modelo
    ) {


        const rodadas =
            obterRodadas();


        const pontos = [];


        rodadas.forEach(
            rodada => {


                const valor =
                    rodada
                        ?.modelos
                        ?. [modelo]
                        ?.pontuacao;


                pontos.push(
                    numero(valor)
                );


            }
        );



        const total =
            pontos.reduce(
                (soma, valor) =>
                    soma + valor,
                0
            );



        const media =
            pontos.length
                ? total / pontos.length
                : 0;



        return {

            modelo,

            rodadas:
                pontos.length,


            total:
                Number(
                    total.toFixed(2)
                ),


            media:
                Number(
                    media.toFixed(2)
                ),


            melhorRodada:
                pontos.length
                    ? Math.max(
                        ...pontos
                    )
                    : 0,


            piorRodada:
                pontos.length
                    ? Math.min(
                        ...pontos
                    )
                    : 0

        };

    }



    // ==================================================
    // COMPARAÇÃO DOS MODELOS
    // ==================================================

    function compararModelos() {


        const modelos = [

            "base",

            "explosao",

            "diferencial",

            "completo"

        ];



        return modelos.map(
            modelo =>
                calcularResumoModelo(
                    modelo
                )
        );

    }



    // ==================================================
    // EVOLUÇÃO POR RODADA
    // ==================================================

    function evolucao() {


        return obterRodadas()
            .map(
                rodada => {


                    return {

                        rodada:
                            rodada.rodada,


                        base:
                            numero(
                                rodada
                                    ?.modelos
                                    ?.base
                                    ?.pontuacao
                            ),


                        explosao:
                            numero(
                                rodada
                                    ?.modelos
                                    ?.explosao
                                    ?.pontuacao
                            ),


                        diferencial:
                            numero(
                                rodada
                                    ?.modelos
                                    ?.diferencial
                                    ?.pontuacao
                            ),


                        completo:
                            numero(
                                rodada
                                    ?.modelos
                                    ?.completo
                                    ?.pontuacao
                            )

                    };


                }
            );


    }



    // ==================================================
    // MELHOR MODELO
    // ==================================================

    function melhorModelo() {


        const ranking =
            compararModelos();



        return ranking.sort(
            (a, b) =>
                b.total -
                a.total
        )[0] || null;


    }



    // ==================================================
    // POSIÇÕES
    // ==================================================

    function analisarPosicoes() {


        const resultado = {};


        const rodadas =
            obterRodadas();



        rodadas.forEach(
            rodada => {


                Object.values(
                    rodada.modelos || {}
                )
                .forEach(
                    modelo => {


                        modelo.jogadores
                            ?.forEach(
                                jogador => {


                                    const pos =
                                        jogador.posicao ||
                                        "ND";


                                    if (!resultado[pos]) {

                                        resultado[pos] = {

                                            quantidade:
                                                0,

                                            pontos:
                                                0

                                        };

                                    }


                                    resultado[pos]
                                        .quantidade++;


                                    resultado[pos]
                                        .pontos +=
                                            numero(
                                                jogador.real
                                            );


                                }
                            );


                    }
                );


            }
        );



        Object.keys(resultado)
            .forEach(
                pos => {


                    resultado[pos]
                        .media =
                        Number(
                            (
                                resultado[pos]
                                    .pontos /
                                resultado[pos]
                                    .quantidade
                            )
                            .toFixed(2)
                        );


                }
            );



        return resultado;

    }



    // ==================================================
    // EXPORTAÇÃO PÚBLICA
    // ==================================================

    return {

        carregar,

        obterDados,

        obterRodadas,

        compararModelos,

        evolucao,

        melhorModelo,

        analisarPosicoes

    };


})();
