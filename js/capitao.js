/*
======================================================
CARTOLA ESTATÍSTICO
Motor do Capitão
======================================================
*/

const MotorCapitao = (() => {

    function numero(valor){

        valor = Number(valor);

        return Number.isFinite(valor)
            ? valor
            : 0;

    }

    function calcular(jogador){

        return Number(

              numero(jogador.projecao) * 0.35

            + numero(jogador.teto) * 0.25

            + numero(jogador.chance10) * 0.20

            + numero(jogador.confianca) * 0.15

            - numero(jogador.risco) * 0.05

        ).toFixed(2);

    }

    return{

        calcular

    };

})();
