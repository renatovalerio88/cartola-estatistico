/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Regularidade
======================================================
*/

const MotorRegularidade = (() => {

    function calcular(historico){

        const pontos = historico.map(
            j => j.pontos || 0
        );

        const media =
            MotorMetricas.media(pontos);

        const desvio =
            MotorMetricas.desvioPadrao(pontos);

        const regularidade =
            media === 0
                ? 0
                : Math.max(
                    0,
                    100 - (
                        desvio /
                        media
                    ) * 100
                );

        return {

            media,

            desvio,

            regularidade

        };

    }

    return{

        calcular

    };

})();
