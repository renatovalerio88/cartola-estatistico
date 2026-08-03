/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Escalação
======================================================
*/

const MotorEscalacao = (() => {

    const FORMACOES = {

        "4-4-2": {
            GOL:1,
            LAT:2,
            ZAG:2,
            MEI:4,
            ATA:2,
            TEC:1
        },

        "3-4-3": {
            GOL:1,
            LAT:0,
            ZAG:3,
            MEI:4,
            ATA:3,
            TEC:1
        }

    };

    function numero(v){

        v = Number(v);

        return Number.isFinite(v)
            ? v
            : 0;

    }

    function nota(jogador, perfil){

        const p =
            PerfisEscalacao[perfil]
            || PerfisEscalacao.equilibrado;

        return (

            numero(jogador.projecao) *
            p.pesoProjecao +

            numero(jogador.piso) *
            p.pesoPiso +

            numero(jogador.teto) *
            p.pesoTeto +

            numero(jogador.confianca) *
            p.pesoConfianca +

            numero(jogador.risco) *
            p.pesoRisco

        );

    }

    function montar(

        jogadores,

        formacao,

        patrimonio = Infinity,

        perfil = "equilibrado"

    ){

        const esquema =
            FORMACOES[formacao];

        if(!esquema){

            return [];

        }

        const titulares = [];

        let custo = 0;

        for(const posicao of Object.keys(esquema)){

            const quantidade =
                esquema[posicao];

            const candidatos =

                jogadores

                    .filter(
                        j=>j.posicao===posicao
                    )

                    .sort(

                        (a,b)=>

                            nota(
                                b,
                                perfil
                            )

                            -

                            nota(
                                a,
                                perfil
                            )

                    );

            for(const jogador of candidatos){

                if(

                    titulares.filter(

                        t=>

                        t.posicao===posicao

                    ).length

                    >= quantidade

                ){

                    break;

                }

                const preco =

                    numero(
                        jogador.preco
                    );

                if(

                    custo + preco >

                    patrimonio

                ){

                    continue;

                }

                titulares.push(
                    jogador
                );

                custo += preco;

            }

        }

        return titulares;

    }

    return{

        montar

    };

})();
