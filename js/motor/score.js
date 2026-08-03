/* =========================================================
   CARTOLA ESTATÍSTICO
   Motor de Score Inteligente
   ========================================================= */

const MotorScore = (() => {

    function calcular(jogador) {

        const pesos =
            obterPesosPorPosicao(
                jogador.posicao
            );

        const pesosHistorico =
            (typeof PESOS_DINAMICOS !== "undefined"
                ? PESOS_DINAMICOS[
                    jogador.posicao
                  ]
                : null) || {};

        let score = 0;

        // ----------------------------
        // HISTÓRICO
        // ----------------------------

        if (
            jogador.historico &&
            jogador.historico.length
        ) {

            const forma =
                MotorForma.mediaRecente(
                    jogador.historico
                );

            const tendencia =
                MotorForma.tendencia(
                    jogador.historico
                );

            const regularidade =
                MotorRegularidade.calcular(
                    jogador.historico
                );

            const media3 =
                MotorForma.mediaUltimas(
                    jogador.historico,
                    3
                );

            const media5 =
                MotorForma.mediaUltimas(
                    jogador.historico,
                    5
                );

            const media10 =
                MotorForma.mediaUltimas(
                    jogador.historico,
                    10
                );

            score +=
                forma *
                pesos.formaRecente;

            score +=
                tendencia *
                pesos.tendenciaRecente;

            score +=
                regularidade.regularidade *
                pesos.regularidade;

            score +=
                regularidade.media *
                pesos.mediaGeral;

            score +=
                media3 *
                (pesosHistorico.media3 ?? 6);

            score +=
                media5 *
                (pesosHistorico.media5 ?? 5);

            score +=
                media10 *
                (pesosHistorico.media10 ?? 4);

        }

        // ----------------------------
        // DADOS DA RODADA
        // ----------------------------

        score +=
            valor(jogador.mediana)
            * pesos.mediana;

        score +=
            valor(jogador.pontuacaoBasica)
            * pesos.pontuacaoBasica;

        score +=
            valor(jogador.scoutsOfensivos)
            * pesos.scoutsOfensivos;

        score +=
            valor(jogador.scoutsDefensivos)
            * pesos.scoutsDefensivos;

        score +=
            valor(jogador.casaFora)
            * pesos.casaFora;

        score +=
            valor(jogador.forcaAdversario)
            * pesos.forcaAdversario;

        score +=
            valor(jogador.pontosCedidos)
            * pesos.pontosCedidos;

        score +=
            valor(jogador.chanceSG)
            * pesos.chanceSG;

        score +=
            valor(jogador.titularidade)
            * pesos.titularidade;

        score +=
            valor(jogador.minutosEsperados)
            * pesos.minutosEsperados;

        score +=
            valor(jogador.bolaParada)
            * pesos.bolaParada;

        score +=
            valor(jogador.penaltis)
            * pesos.penaltis;

        score +=
            valor(jogador.custoBeneficio)
            * pesos.custoBeneficio;

        score -=
            valor(jogador.riscoNegativar)
            * pesos.riscoNegativar;

        return Number(
            (score / 100).toFixed(2)
        );

    }

    function valor(v) {

        if (
            v === undefined ||
            v === null ||
            Number.isNaN(Number(v))
        ) {
            return 0;
        }

        return Number(v);

    }

    return {

        calcular

    };

})();
