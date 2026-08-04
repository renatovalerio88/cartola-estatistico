const Historico = (() => {

    let indice = null;

    const cacheRodadas = {};

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

        if (cacheRodadas[numeroRodada]) {
            return cacheRodadas[numeroRodada];
        }

        try {

            const resposta = await fetch(
                `data/historico/rodada-${String(numeroRodada).padStart(2, "0")}/metricas.json`
            );

            const json = await resposta.json();

            cacheRodadas[numeroRodada] = json;

            return json;

        } catch (e) {

            console.error("Erro ao carregar rodada.", e);

            return null;

        }

    }

    async function montarHistoricoJogadores(jogadores) {

        if (!indice || !indice.rodadas) {
            return jogadores;
        }

        const historicoPorJogador = {};

        for (const rodada of indice.rodadas) {

            const dadosRodada = await carregarRodada(rodada.numero);

            if (!dadosRodada || !dadosRodada.jogadores) {
                continue;
            }

            for (const jogador of dadosRodada.jogadores) {

                const id = jogador.id;

                if (!historicoPorJogador[id]) {

                    historicoPorJogador[id] = [];

                }

                historicoPorJogador[id].push({

                    rodada: rodada.numero,
                    pontuacao: Number(jogador.pontuacao || 0),
                    scouts: jogador.scouts || {},
                    preco: Number(jogador.preco || 0),
                    media: Number(jogador.media || 0)

                });

            }

        }

        for (const jogador of jogadores) {

            const historico = historicoPorJogador[jogador.id] || [];

            jogador.historico = historico;

            jogador.historicoPontuacoes = historico.map(item => item.pontuacao);

        }

        return jogadores;

    }

    function getIndice() {

        return indice;

    }

    return {

        carregarIndice,
        carregarRodada,
        montarHistoricoJogadores,
        getIndice

    };

})();
