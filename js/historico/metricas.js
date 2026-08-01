const HistoricoMetricas = (() => {

    function calcular(metricas) {

        if (!metricas) {

            return {

                erroMedio: "--",
                top5: "--",
                correlacao: "--",
                capitao: "--"

            };

        }

        return {

            erroMedio: metricas.erroMedio,
            top5: metricas.top5,
            correlacao: metricas.correlacao,
            capitao: metricas.capitao

        };

    }

    return {

        calcular

    };

})();
