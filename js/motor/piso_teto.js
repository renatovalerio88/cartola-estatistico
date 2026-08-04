/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Piso e Teto
======================================================
*/

const MotorPisoTeto = (() => {

    function calcular(historico){

        if(!historico?.length){

            return {

                piso:0,
                teto:0

            };

        }

        const pontos =
            historico.map(
                j => j.pontuacao ?? j.pontos ?? 0
            );

        return{

            piso:
                MotorMetricas.minimo(
                    pontos
                ),

            teto:
                MotorMetricas.maximo(
                    pontos
                )

        };

    }

    return{

        calcular

    };

})();
