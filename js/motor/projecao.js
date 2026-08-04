/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Projeção
======================================================
*/

const MotorProjecao = (() => {

    function numero(valor, padrao = 0) {

        valor = Number(valor);

        return Number.isFinite(valor)
            ? valor
            : padrao;

    }

    function calcular(jogador) {

        const score =
            numero(jogador.score);

        const media3 =
            numero(jogador.media3);

        const media5 =
            numero(jogador.media5);

        const mediaGeral =
            numero(jogador.mediaGeral);

        const piso =
            numero(jogador.piso);

        const teto =
            numero(jogador.teto);

        const confianca =
            numero(jogador.confianca, 50);

        const risco =
            numero(jogador.risco, 50);

        const tendencia =
            numero(jogador.tendencia);

        const regularidade =
            numero(jogador.regularidade, 50);

        const historico =
            jogador.historico || [];

        let volatilidade = 0;

        if (historico.length >= 2) {

            const media =

                historico.reduce(

                    (soma, rodada) =>

                        soma +

                        numero(rodada.pontos),

                    0

                ) / historico.length;

            volatilidade = Math.sqrt(

                historico.reduce(

                    (soma, rodada) =>

                        soma +

                        Math.pow(

                            numero(rodada.pontos) - media,

                            2

                        ),

                    0

                ) / historico.length

            );

        }

        // ==========================
        // PROJEÇÃO BASE
        // ==========================

        const pesos =
        
            MotorCalibracao.obter();
        
        let projecao =
        
              score * pesos.score
            + media3 * pesos.media3
            + media5 * pesos.media5
            + mediaGeral * pesos.mediaGeral
            + piso * pesos.piso
            + teto * pesos.teto;

        // ==========================
        // AJUSTES
        // ==========================

        projecao *=

            0.85 +

            (regularidade / 1000);

        projecao *=

            0.90 +

            (confianca / 1000);

        projecao *=

            0.95 +

            (tendencia / 1000);

        projecao *=

            1 -

            (risco / 350);

        // Penalização por volatilidade

        projecao *=

            Math.max(

                0.85,

                1 -

                (volatilidade / 100)

            );

        // Nunca retornar negativo

        projecao =

            Math.max(

                0,

                projecao

            );

        return Number(

            projecao.toFixed(2)

        );

    }

    return {

        calcular

    };

})();
