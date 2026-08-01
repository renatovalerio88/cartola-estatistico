const HistoricoCards = (() => {

    function renderResumo(metricas) {

        const container = document.getElementById("historySummary");

        if (!container) return;

        container.innerHTML = `

            <div class="summary-card">
                <span>Erro Médio</span>
                <strong>${metricas.erroMedio ?? "--"}</strong>
            </div>

            <div class="summary-card">
                <span>Top 5</span>
                <strong>${metricas.top5 ?? "--"}</strong>
            </div>

            <div class="summary-card">
                <span>Correlação</span>
                <strong>${metricas.correlacao ?? "--"}</strong>
            </div>

            <div class="summary-card">
                <span>Capitão</span>
                <strong>${metricas.capitao ?? "--"}</strong>
            </div>

        `;

    }

    return {

        renderResumo

    };

})();
