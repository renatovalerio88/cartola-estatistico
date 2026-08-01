const Historico = (() => {

    let indice = null;

    async function carregarIndice() {

        try {

            const resposta = await fetch("data/historico/indice.json");

            indice = await resposta.json();

            return indice;

        } catch (e) {

            console.error("Erro ao carregar histórico.", e);

            return null;

        }

    }

    async function carregarRodada(numeroRodada) {

        try {

            const resposta = await fetch(
                `data/historico/rodada-${String(numeroRodada).padStart(2, "0")}/metricas.json`
            );

            return await resposta.json();

        } catch (e) {

            console.error("Erro ao carregar rodada.", e);

            return null;

        }

    }

    function getIndice() {
        return indice;
    }

    return {

        carregarIndice,
        carregarRodada,
        getIndice

    };

})();
