const Historico = (() => {

    let indice = null;

    const cacheRodadas = {};

    async function carregarIndice() {

        if (indice) {
            return indice;
        }

        try {

            const resposta = await fetch(
                "data/api/status.json",
                { cache: "no-store" }
            );

            const status = await resposta.json();

            indice = {
                rodadaAtual: Number(status.rodada_atual || 1)
            };

            return indice;

        } catch (e) {

            console.error("Erro ao carregar status.", e);

            indice = {
                rodadaAtual: 1
            };

            return indice;

        }

    }

    async function carregarRodada(numeroRodada) {

        if (cacheRodadas[numeroRodada]) {
            return cacheRodadas[numeroRodada];
        }

        try {

            const resposta = await fetch(
                `data/api/rodada-${String(numeroRodada).padStart(2, "0")}/jogadores.json`,
                {
                    cache: "no-store"
                }
            );

            if (!resposta.ok) {
                return [];
            }

            const json = await resposta.json();

            cacheRodadas[numeroRodada] = json;

            return json;

        } catch (e) {

            console.error(
                `Erro ao carregar rodada ${numeroRodada}.`,
                e
            );

            return [];

        }

    }

    async function montarHistoricoJogadores(jogadores) {

        if (!Array.isArray(jogadores)) {
            return jogadores;
        }

        const info = await carregarIndice();

        const historicoPorJogador = {};

        for (
            let rodada = 1;
            rodada <= info.rodadaAtual;
            rodada++
        ) {

            const jogadoresRodada =
                await carregarRodada(rodada);

            if (!Array.isArray(jogadoresRodada)) {
                continue;
            }

            for (const atleta of jogadoresRodada) {

                const id = Number(atleta.id);

                if (!id) {
                    continue;
                }

                if (!historicoPorJogador[id]) {
                    historicoPorJogador[id] = [];
                }

                historicoPorJogador[id].push({

                    rodada,

                    pontuacao: Number(
                        atleta.pontuacaoReal ??
                        atleta.pontos ??
                        atleta.pontuacao ??
                        atleta.pontosUltimaRodada ??
                        0
                    ),

                    preco: Number(
                        atleta.preco ?? 0
                    ),

                    media: Number(
                        atleta.media ??
                        atleta.mediaGeral ??
                        0
                    ),

                    scouts: atleta.scouts || {}

                });

            }

        }

        for (const jogador of jogadores) {

            const historico =
                historicoPorJogador[
                    Number(jogador.id)
                ] || [];

            historico.sort(
                (a, b) => a.rodada - b.rodada
            );

            jogador.historico =
                historico;

            jogador.historicoPontuacoes =
                historico.map(
                    item => Number(item.pontuacao || 0)
                );

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
