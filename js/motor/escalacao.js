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
        return Number.isFinite(v) ? v : 0;
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

        const esquema = FORMACOES[formacao];

        if(!esquema){
            return [];
        }

        const titulares=[];
        const clubes={};
        let custo=0;

        for(const posicao of Object.keys(esquema)){

            const quantidade = esquema[posicao];

            const candidatos = jogadores

                .filter(j=>j.posicao===posicao)

                .sort(
                    (a,b)=>
                        nota(b,perfil)-
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

                const clube =
                    jogador.siglaClube ||
                    jogador.clube ||
                    "SEM";

                if((clubes[clube]||0)>=3){
                    continue;
                }

                const preco = numero(jogador.preco);

                if(custo+preco>patrimonio){
                    continue;
                }

                titulares.push(jogador);

                clubes[clube]=(clubes[clube]||0)+1;

                custo+=preco;

            }

        }

        return titulares;

    }

    function montarBanco(
        jogadores,
        titulares
    ){

        const ids =
            new Set(
                titulares.map(j=>j.id)
            );

        return jogadores

            .filter(j=>!ids.has(j.id))

            .sort(
                (a,b)=>
                    numero(b.projecao)-
                    numero(a.projecao)
            )

            .slice(0,5);

    }

    function gerarJustificativa(
        titulares,
        perfil
    ){

        const projecao =
            titulares.reduce(
                (s,j)=>s+numero(j.projecao),
                0
            );

        return `Escalação ${perfil} gerada automaticamente pelo motor estatístico com projeção total de ${projecao.toFixed(2)} pontos.`;

    }

    return{

        montar,
        montarBanco,
        gerarJustificativa

    };

})();
