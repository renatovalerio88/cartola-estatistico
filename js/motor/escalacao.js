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

    function nota(j,perfil){

        const p =
            PerfisEscalacao[perfil] ||
            PerfisEscalacao.equilibrado;

        return (

              numero(j.projecao)  * p.pesoProjecao
            + numero(j.piso)      * p.pesoPiso
            + numero(j.teto)      * p.pesoTeto
            + numero(j.confianca) * p.pesoConfianca
            + numero(j.risco)     * p.pesoRisco

        );

    }

    function scoreTime(time,perfil){

        return time.reduce(

            (s,j)=>

                s +

                nota(j,perfil),

            0

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

        const titulares=[];

        const clubes={};

        let custo=0;

        for(const posicao of Object.keys(esquema)){

            const quantidade=

                esquema[posicao];

            const candidatos=

                jogadores

                .filter(

                    j=>j.posicao===posicao

                )

                .sort(

                    (a,b)=>

                        nota(b,perfil)

                        -

                        nota(a,perfil)

                );

            for(const jogador of candidatos){

                if(

                    titulares.filter(

                        t=>t.posicao===posicao

                    ).length>=quantidade

                ){

                    break;

                }

                const clube=

                    jogador.siglaClube ||

                    jogador.clube ||

                    "SEM";

                if(

                    (clubes[clube]||0)>=3

                ){

                    continue;

                }

                const preco=

                    numero(jogador.preco);

                if(

                    custo+preco>

                    patrimonio

                ){

                    continue;

                }

                titulares.push(jogador);

                clubes[clube]=

                    (clubes[clube]||0)+1;

                custo+=preco;

            }

        }

        // Segunda passada:
        // tenta melhorar a projeção

        const atual=

            scoreTime(

                titulares,

                perfil

            );

        jogadores.forEach(candidato=>{

            titulares.forEach((titular,i)=>{

                if(

                    candidato.posicao!==titular.posicao

                ){

                    return;

                }

                if(

                    nota(

                        candidato,

                        perfil

                    )

                    <=

                    nota(

                        titular,

                        perfil

                    )

                ){

                    return;

                }

                const novo=[

                    ...titulares

                ];

                novo[i]=

                    candidato;

                const preco=

                    novo.reduce(

                        (s,j)=>

                            s+

                            numero(j.preco),

                        0

                    );

                if(

                    preco>

                    patrimonio

                ){

                    return;

                }

                if(

                    scoreTime(

                        novo,

                        perfil

                    )

                    >

                    atual

                ){

                    titulares[i]=

                        candidato;

                }

            });

        });

        return titulares;

    }

    return{

        montar

    };

})();
