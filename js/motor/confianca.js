/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Confiança
======================================================
*/

const MotorConfianca = (() => {

    function calcular(jogador){

        let confianca = 50;

        confianca +=
            Number(
                jogador.regularidade || 0
            ) * 0.25;

        confianca +=
            Number(
                jogador.titularidade || 0
            ) * 0.25;

        confianca +=
            Number(
                jogador.formaRecente || 0
            ) * 0.30;

        confianca -=
            Number(
                jogador.riscoNegativar || 0
            ) * 0.20;

        confianca =
            Math.max(
                0,
                Math.min(
                    100,
                    confianca
                )
            );

        return Number(
            confianca.toFixed(1)
        );

    }

    return{

        calcular

    };

})();
