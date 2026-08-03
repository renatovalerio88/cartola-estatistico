/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Escalação
======================================================
*/

const MotorEscalacao = (() => {

    const FORMACOES = {

        "4-4-2": {
            GOL: 1,
            LAT: 2,
            ZAG: 2,
            MEI: 4,
            ATA: 2,
            TEC: 1
        },

        "3-4-3": {
            GOL: 1,
            LAT: 0,
            ZAG: 3,
            MEI: 4,
            ATA: 3,
            TEC: 1
        }

    };

    function montar(jogadores, formacao) {

        const esquema =
            FORMACOES[formacao];

        if (!esquema) {
            return [];
        }

        const titulares = [];

        for (const posicao of Object.keys(esquema)) {

            const quantidade =
                esquema[posicao];

            jogadores
                .filter(j => j.posicao === posicao)
                .sort(
                    (a, b) =>
                        (b.score || 0) -
                        (a.score || 0)
                )
                .slice(0, quantidade)
                .forEach(
                    jogador =>
                        titulares.push(jogador)
                );

        }

        return titulares;

    }

    return {

        montar

    };

})();
