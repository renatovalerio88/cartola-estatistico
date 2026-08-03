/*
======================================================
Perfis de Escalação
======================================================
*/

const PerfisEscalacao = {

    conservador: {

        pesoProjecao: 0.30,
        pesoPiso: 0.35,
        pesoTeto: 0.10,
        pesoConfianca: 0.20,
        pesoRisco: -0.05

    },

    equilibrado: {

        pesoProjecao: 0.35,
        pesoPiso: 0.20,
        pesoTeto: 0.20,
        pesoConfianca: 0.15,
        pesoRisco: -0.10

    },

    agressivo: {

        pesoProjecao: 0.30,
        pesoPiso: 0.05,
        pesoTeto: 0.45,
        pesoConfianca: 0.05,
        pesoRisco: -0.15

    }

};
