const HistoricoFiltros = (() => {

    function preencherRodadas(indice) {

        const select = document.getElementById("historyRound");

        if (!select || !indice) return;

        select.innerHTML = "";

        indice.rodadas.forEach(rodada => {

            const option = document.createElement("option");

            option.value = rodada.numero;
            option.textContent = `Rodada ${rodada.numero}`;

            select.appendChild(option);

        });

    }

    function preencherPosicoes() {

        const select = document.getElementById("historyPosition");

        if (!select) return;

        [
            "TODOS",
            "GOL",
            "LAT",
            "ZAG",
            "MEI",
            "ATA",
            "TEC"
        ].forEach(posicao => {

            const option = document.createElement("option");

            option.value = posicao;
            option.textContent = posicao;

            select.appendChild(option);

        });

    }

    return {

        preencherRodadas,
        preencherPosicoes

    };

})();
