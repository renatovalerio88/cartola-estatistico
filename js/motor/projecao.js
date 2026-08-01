/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Projeção
======================================================
*/

const MotorProjecao = (() => {

    function calcular(jogador){

        const score =
            Number(jogador.score || 0);

        const piso =
            Number(jogador.piso || 0);

        const teto =
            Number(jogador.teto || 0);

        const confianca =
            Number(jogador.confianca || 50);

        const risco =
            Number(jogador.risco || 50);

        let projecao =

            (score * 0.55) +

            (piso * 0.15) +

            (teto * 0.30);

        projecao *=

            confianca / 100;

        projecao *=

            1 - (risco / 250);

        return Number(

            projecao.toFixed(2)

        );

    }

    return{

        calcular

    };

})();
