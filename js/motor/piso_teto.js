/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Piso e Teto
======================================================
*/

const MotorPisoTeto = (() => {


    /*
    ======================================================
    UTILITÁRIOS
    ======================================================
    */


    function obterPontuacao(
        registro
    ) {

        /*
        Aceita os dois formatos utilizados
        atualmente pelo projeto:

        1) número direto:
           5.2

        2) registro histórico:
           {
               rodada: 23,
               pontos: 5.2
           }

        Ausência de pontuação retorna null.

        IMPORTANTE:
        zero verdadeiro continua sendo
        uma pontuação válida.
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

            return Number.isFinite(
                registro
            )
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
                Number(
                    registro
                );


            return Number.isFinite(
                valor
            )
                ? valor
                : null;

        }


        /*
        Registro histórico
        */

        if (
            typeof registro === "object"
        ) {

            const valorBruto =
                registro.pontuacao ??
                registro.pontos ??
                registro.pontuacaoReal;


            /*
            null/undefined significam
            ausência de pontuação.

            Não converter para zero.
            */

            if (
                valorBruto === null ||
                valorBruto === undefined ||
                valorBruto === ""
            ) {

                return null;

            }


            const valor =
                Number(
                    valorBruto
                );


            return Number.isFinite(
                valor
            )
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
            !Array.isArray(
                historico
            )
        ) {

            return [];

        }


        return historico
            .map(
                obterPontuacao
            )
            .filter(
                valor =>
                    Number.isFinite(
                        valor
                    )
            );

    }



    /*
    ======================================================
    MENOR VALOR
    ======================================================
    */


    function calcularMinimo(
        pontos
    ) {

        if (
            !Array.isArray(
                pontos
            ) ||
            pontos.length === 0
        ) {

            return 0;

        }


        if (
            typeof MotorMetricas !== "undefined" &&
            typeof MotorMetricas.minimo === "function"
        ) {

            const resultado =
                Number(
                    MotorMetricas.minimo(
                        pontos
                    )
                );


            if (
                Number.isFinite(
                    resultado
                )
            ) {

                return resultado;

            }

        }


        return Math.min(
            ...pontos
        );

    }



    /*
    ======================================================
    MAIOR VALOR
    ======================================================
    */


    function calcularMaximo(
        pontos
    ) {

        if (
            !Array.isArray(
                pontos
            ) ||
            pontos.length === 0
        ) {

            return 0;

        }


        if (
            typeof MotorMetricas !== "undefined" &&
            typeof MotorMetricas.maximo === "function"
        ) {

            const resultado =
                Number(
                    MotorMetricas.maximo(
                        pontos
                    )
                );


            if (
                Number.isFinite(
                    resultado
                )
            ) {

                return resultado;

            }

        }


        return Math.max(
            ...pontos
        );

    }



    /*
    ======================================================
    CÁLCULO DO PISO E TETO
    ======================================================
    */


    function calcular(
        historico
    ) {

        const pontos =
            normalizarHistorico(
                historico
            );


        /*
        Sem partidas válidas não existe
        informação histórica suficiente.
        Mantemos zero por compatibilidade
        com o restante do motor.
        */

        if (
            pontos.length === 0
        ) {

            return {

                piso: 0,

                teto: 0,

                quantidadeJogos: 0

            };

        }


        const piso =
            calcularMinimo(
                pontos
            );


        const teto =
            calcularMaximo(
                pontos
            );


        return {

            piso,

            teto,

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
