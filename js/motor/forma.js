/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Forma
======================================================
*/

const MotorForma = (() => {


    /*
    ======================================================
    UTILITÁRIOS
    ======================================================
    */


    function obterPontuacao(jogo) {

        /*
        Aceita os dois formatos utilizados pelo projeto:

        1) número direto:
           5.2

        2) registro histórico:
           {
               rodada: 23,
               pontos: 5.2
           }

        Retorna null quando não existe pontuação válida.
        Isso evita transformar ausência de jogo em zero.
        */


        if (
            jogo === null ||
            jogo === undefined
        ) {

            return null;

        }


        /*
        Número recebido diretamente
        */

        if (
            typeof jogo === "number"
        ) {

            return Number.isFinite(jogo)
                ? jogo
                : null;

        }


        /*
        String numérica, caso algum dado histórico
        venha serializado nesse formato.
        */

        if (
            typeof jogo === "string"
        ) {

            const valor =
                Number(jogo);


            return Number.isFinite(valor)
                ? valor
                : null;

        }


        /*
        Registro histórico
        */

        if (
            typeof jogo === "object"
        ) {

            const valorBruto =
                jogo.pontuacao ??
                jogo.pontos ??
                jogo.pontuacaoReal;


            /*
            null não pode virar zero.
            */

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
    ÚLTIMOS JOGOS
    ======================================================
    */


    function ultimosJogos(
        historico,
        quantidade = 5
    ) {

        const pontos =
            normalizarHistorico(
                historico
            );


        const limite =
            Number.isFinite(
                Number(quantidade)
            )
                ? Math.max(
                    1,
                    Math.floor(
                        Number(quantidade)
                    )
                )
                : 5;


        return pontos.slice(
            -limite
        );

    }



    /*
    ======================================================
    MÉDIA
    ======================================================
    */


    function calcularMedia(
        valores
    ) {

        if (
            !Array.isArray(valores) ||
            valores.length === 0
        ) {

            return 0;

        }


        /*
        Mantém compatibilidade com MotorMetricas
        quando ele estiver disponível.
        */

        if (
            typeof MotorMetricas !== "undefined" &&
            typeof MotorMetricas.media === "function"
        ) {

            const resultado =
                Number(
                    MotorMetricas.media(
                        valores
                    )
                );


            if (
                Number.isFinite(resultado)
            ) {

                return resultado;

            }

        }


        const soma =
            valores.reduce(
                (total, valor) =>
                    total + valor,
                0
            );


        return soma /
            valores.length;

    }



    /*
    ======================================================
    MÉDIA RECENTE
    ======================================================
    */


    function mediaRecente(
        historico
    ) {

        const jogos =
            ultimosJogos(
                historico,
                5
            );


        return calcularMedia(
            jogos
        );

    }



    /*
    ======================================================
    COMPATIBILIDADE
    Alias utilizado por outros motores do projeto
    ======================================================
    */


    function mediaUltimas(
        historico,
        quantidade = 5
    ) {

        const jogos =
            ultimosJogos(
                historico,
                quantidade
            );


        return calcularMedia(
            jogos
        );

    }



    /*
    ======================================================
    TENDÊNCIA
    ======================================================
    */


    function tendencia(
        historico
    ) {

        const jogos =
            ultimosJogos(
                historico,
                5
            );


        if (
            jogos.length < 2
        ) {

            return 0;

        }


        const primeiro =
            jogos[0];


        const ultimo =
            jogos[
                jogos.length - 1
            ];


        return ultimo -
            primeiro;

    }



    /*
    ======================================================
    FASE DO JOGADOR
    ======================================================
    */


    function fase(
        historico
    ) {

        const media =
            mediaRecente(
                historico
            );


        if (
            media >= 10
        ) {

            return "Excelente";

        }


        if (
            media >= 7
        ) {

            return "Boa";

        }


        if (
            media >= 5
        ) {

            return "Regular";

        }


        return "Ruim";

    }



    /*
    ======================================================
    INTERFACE PÚBLICA
    ======================================================
    */


    return {

        obterPontuacao,

        normalizarHistorico,

        ultimosJogos,

        mediaRecente,

        mediaUltimas,

        tendencia,

        fase

    };


})();
