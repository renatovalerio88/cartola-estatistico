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

        let score = 0;

        // =====================================================
        // HISTÓRICO INTELIGENTE
        // =====================================================

        if (
            jogador.historico &&
            jogador.historico.length
        ) {

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

            const tendencia =
                MotorForma.tendencia(
                    jogador.historico
                );

            const regularidade =
                MotorRegularidade.calcular(
                    jogador.historico
                );

            const historicoInteligente =

                  media3 * 0.40
                + media5 * 0.30
                + media10 * 0.20
                + tendencia * 0.10;

            score +=
                historicoInteligente *
                pesos.formaRecente;

            score +=
                regularidade.regularidade *
                pesos.regularidade;

            score +=
                regularidade.media *
                pesos.mediaGeral;

        }

        // =====================================================
        // DADOS DA RODADA
        // =====================================================

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
