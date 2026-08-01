const HistoricoCards = (() => {

    function renderResumo(metricas) {

        const container = document.getElementById("historySummary");

        if (!container) return;

        container.innerHTML = `
            <div class="history-card">
                <span>Erro Médio</span>
                <strong>${metricas.erroMedio ?? "--"}</strong>
            </div>

            <div class="history-card">
                <span>Top 5</span>
                <strong>${metricas.top5 ?? "--"}</strong>
            </div>

            <div class="history-card">
                <span>Correlação</span>
                <strong>${metricas.correlacao ?? "--"}</strong>
            </div>

            <div class="history-card">
                <span>Capitão</span>
                <strong>${metricas.capitao ?? "--"}</strong>
            </div>
        `;

    }

    async function renderTabela(rodada) {

        const container = document.getElementById("historyGrid");

        if (!container) return;

        try {

            const resposta = await fetch(
                `data/historico/rodada-${String(rodada).padStart(2,"0")}/jogadores.json`
            );

            const jogadores = await resposta.json();

            container.innerHTML = `
                <table class="history-table">

                    <thead>

                        <tr>
                            <th>Jogador</th>
                            <th>Posição</th>
                            <th>Projeção</th>
                            <th>Real</th>
                            <th>Erro</th>
                            <th>Top 5</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${jogadores.map(jogador => {

                            const erro =
                                (jogador.real - jogador.projecao).toFixed(2);

                            return `
                                <tr>

                                    <td>${jogador.nome}</td>

                                    <td>${jogador.posicao}</td>

                                    <td>${jogador.projecao}</td>

                                    <td>${jogador.real}</td>

                                    <td>${erro}</td>

                                    <td>${jogador.top5 ? "✅" : "❌"}</td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>
            `;

        } catch(e){

            console.error(e);

        }

    }

    return {

        renderResumo,
        renderTabela

    };

})();
