/*
======================================================
CARTOLA ESTATÍSTICO
Motor Reserva de Luxo
======================================================
*/

const MotorReservaLuxo = (() => {

    function numero(valor){

        valor = Number(valor);

        return Number.isFinite(valor)
            ? valor
            : 0;

    }

    function calcular(jogador){

        return Number(

              numero(jogador.projecao) * 0.30

            + numero(jogador.score) * 0.25

            + numero(jogador.teto) * 0.25

            + numero(jogador.confianca) * 0.10

            - numero(jogador.preco) * 0.10

        ).toFixed(2);

    }

    return{

        calcular

    };

})();
