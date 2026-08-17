/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Regularidade
======================================================
*/

const MotorRegularidade = (() => {


    /*
    ======================================================
    UTILITÁRIOS
    ======================================================
    */


    function obterPontuacao(
        registro
    ) {

        /*
        Aceita:

        1) número direto:
           5.2

        2) registro histórico:
           {
               rodada: 23,
               pontos: 5.2
           }

        Ausência de pontuação retorna null.
        */


        if (
            registro === null ||
            registro === undefined
        ) {

            return null;

        }


        /*
        Número direto
        */

        if (
            typeof registro === "number"
        ) {

            return Number.isFinite(registro)
                ? registro
                : null;

        }


        /*
        String numérica
        */

        if (
            typeof registro === "string"
        ) {

            if (
                registro.trim() === ""
            ) {

                return null;

            }


            const valor =
                Number(registro);


            return Number.isFinite(valor)
                ? valor
                : null;

        }


        /*
        Objeto histórico
        */

        if (
            typeof registro === "object"
        ) {

            const valorBruto =
                registro.pontuacao ??
                registro.pontos ??
                registro.pontuacaoReal;


            if (
                valorBruto === null ||
                valorBruto === undefined ||
                valorBruto === ""
            ) {

                return null;

            }


            const valor =
                Number(valorBruto);


            return Number.isFinite(valor)
                ? valor
                : null;

        }


        return null;

    }



    /*
    ======================================================
    NORMALIZA HISTÓRICO
    ======================================================
    */


    function normalizarHistorico(
        historico
    ) {

        if (
            !Array.isArray(historico)
        ) {

            return [];

        }


        return historico
            .map(
                obterPontuacao
            )
            .filter(
                valor =>
                    Number.isFinite(valor)
            );

    }



    /*
    ======================================================
    MÉDIA
    ======================================================
    */


    function calcularMedia(
        pontos
    ) {

        if (
            !Array.isArray(pontos) ||
            pontos.length === 0
        ) {

            return 0;

        }


        if (
            typeof MotorMetricas !== "undefined" &&
            typeof MotorMetricas.media === "function"
        ) {

            const resultado =
                Number(
                    MotorMetricas.media(
                        pontos
                    )
                );


            if (
                Number.isFinite(resultado)
            ) {

                return resultado;

            }

        }


        const soma =
            pontos.reduce(
                (total, valor) =>
                    total + valor,
                0
            );


        return soma /
            pontos.length;

    }



    /*
    ======================================================
    DESVIO PADRÃO
    ======================================================
    */


    function calcularDesvioPadrao(
        pontos,
        media
    ) {

        if (
            !Array.isArray(pontos) ||
            pontos.length === 0
        ) {

            return 0;

        }


        if (
            typeof MotorMetricas !== "undefined" &&
            typeof MotorMetricas.desvioPadrao === "function"
        ) {

            const resultado =
                Number(
                    MotorMetricas.desvioPadrao(
                        pontos
                    )
                );


            if (
                Number.isFinite(resultado)
            ) {

                return resultado;

            }

        }


        const variancia =
            pontos.reduce(
                (total, valor) => {

                    const diferenca =
                        valor - media;


                    return total +
                        (
                            diferenca *
                            diferenca
                        );

                },
                0
            ) /
            pontos.length;


        return Math.sqrt(
            variancia
        );

    }



    /*
    ======================================================
    REGULARIDADE
    ======================================================
    */


    function calcular(
        historico
    ) {

        const pontos =
            normalizarHistorico(
                historico
            );


        if (
            pontos.length === 0
        ) {

            return {

                media: 0,

                desvio: 0,

                regularidade: 0,

                quantidadeJogos: 0

            };

        }


        const media =
            calcularMedia(
                pontos
            );


        const desvio =
            calcularDesvioPadrao(
                pontos,
                media
            );


        /*
        Regularidade baseada na relação entre
        dispersão e média.

        Math.abs(media) evita comportamento incorreto
        caso a média histórica seja negativa.
        */


        let regularidade = 0;


        if (
            Math.abs(media) > 0
        ) {

            regularidade =
                100 -
                (
                    desvio /
                    Math.abs(media)
                ) *
                100;

        }


        /*
        Mantém o indicador entre 0 e 100.
        */


        regularidade =
            Math.max(
                0,
                Math.min(
                    100,
                    regularidade
                )
            );


        return {

            media,

            desvio,

            regularidade,

            quantidadeJogos:
                pontos.length

        };

    }



    /*
    ======================================================
    INTERFACE PÚBLICA
    ======================================================
    */


    return {

        obterPontuacao,

        normalizarHistorico,

        calcular

    };


})();
