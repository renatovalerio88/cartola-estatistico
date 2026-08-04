/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Calibração
======================================================
*/

const MotorCalibracao = (() => {

    let pesos = {

        score: 0.25,

        media3: 0.20,

        media5: 0.15,

        mediaGeral: 0.10,

        piso: 0.10,

        teto: 0.20

    };

    async function carregar() {

        try {

            const resposta = await fetch(

                "data/laboratorio.json",

                { cache: "no-store" }

            );

            if (!resposta.ok) {

                return;

            }

            const laboratorio =

                await resposta.json();

            if (

                laboratorio.pesos

            ) {

                pesos =

                    laboratorio.pesos;

            }

        }

        catch(e){

            console.warn(

                "Laboratório não encontrado."

            );

        }

    }

    function obter(){

        return pesos;

    }

    return{

        carregar,

        obter

    };

})();
