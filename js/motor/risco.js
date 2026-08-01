/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Risco
======================================================
*/

const MotorRisco = (() => {

    function calcular(jogador){

        let risco = 0;

        risco +=
            Number(
                jogador.riscoNegativar || 0
            );

        risco +=
            (
                100 -
                Number(
                    jogador.titularidade || 100
                )
            ) * 0.30;

        risco +=
            (
                100 -
                Number(
                    jogador.regularidade || 100
                )
            ) * 0.20;

        risco = Math.max(
            0,
            Math.min(
                100,
                risco
            )
        );

        return Number(
            risco.toFixed(1)
        );

    }

    function nivel(valor){

        if(valor < 25) return "Muito Baixo";

        if(valor < 45) return "Baixo";

        if(valor < 65) return "Médio";

        if(valor < 80) return "Alto";

        return "Muito Alto";

    }

    return{

        calcular,
        nivel

    };

})();
