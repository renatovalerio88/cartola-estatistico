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

    function calcular(jogador){

        const score =
            numero(jogador.score);

        const media3 =
            numero(jogador.score?.media3 ?? jogador.media3);

        const media5 =
            numero(jogador.score?.media5 ?? jogador.media5);

        const mediaGeral =
            numero(jogador.mediaGeral);

        const piso =
            numero(jogador.piso);

        const teto =
            numero(jogador.teto);

        const confianca =
            numero(jogador.confianca,50);

        const risco =
            numero(jogador.risco,50);

        const tendencia =
            numero(jogador.tendencia);

        const regularidade =
            numero(jogador.regularidade,50);

        const historico =
            jogador.historico || [];

        let volatilidade = 0;

        if (historico.length >= 2) {

            const media = historico.reduce(
                (soma, r) => soma + numero(r.pontos),
                0
            ) / historico.length;

            volatilidade = Math.sqrt(

                historico.reduce(

                    (soma, r) =>

                        soma +

                        Math.pow(
                            numero(r.pontos) - media,
                            2
                        ),

                    0

                ) / historico.length

            );

        }

        let projecao =

              score * 0.25
            + media3 * 0.20
            + media5 * 0.15
            + mediaGeral * 0.10
            + piso * 0.10
            + teto * 0.20;

        projecao *=
            0.85 + (regularidade / 1000);

        projecao *=
            0.90 + (confianca / 1000);

        projecao *=
            0.95 + (tendencia / 1000);

        projecao *=
            1 - (risco / 350);

        // Penaliza jogadores muito instáveis
        projecao *=
            Math.max(
                0.85,
                1 - (volatilidade / 100)
            );

        return Number(
            projecao.toFixed(2)
        );

    }

    return{

        calcular

    };

})();
