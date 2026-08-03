/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Probabilidade
======================================================
*/

const MotorProbabilidade = (() => {

    function numero(valor){

        valor = Number(valor);

        return Number.isFinite(valor)
            ? valor
            : 0;

    }

    function calcular(historico = []){

        const pontos = historico
            .map(r => numero(r.pontos))
            .filter(Number.isFinite);

        if(pontos.length === 0){

            return{

                chance5:0,
                chance10:0,
                chance15:0,
                chanceNegativar:0

            };

        }

        const total = pontos.length;

        const acima5 =
            pontos.filter(p=>p>=5).length;

        const acima10 =
            pontos.filter(p=>p>=10).length;

        const acima15 =
            pontos.filter(p=>p>=15).length;

        const negativos =
            pontos.filter(p=>p<0).length;

        return{

            chance5:
                Number((acima5*100/total).toFixed(1)),

            chance10:
                Number((acima10*100/total).toFixed(1)),

            chance15:
                Number((acima15*100/total).toFixed(1)),

            chanceNegativar:
                Number((negativos*100/total).toFixed(1))

        };

    }

    return{

        calcular

    };

})();
