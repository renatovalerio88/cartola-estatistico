/*
======================================================
CARTOLA ESTATÍSTICO
Motor do Capitão — Posicional Equilibrado
======================================================
Modelo promovido após validação walk-forward.
A nota é normalizada entre os titulares elegíveis quando
selecionar() é usado. calcular() permanece compatível com
chamadas legadas e retorna uma nota posicional bruta.
*/

const MotorCapitao = (() => {

    const PESOS_POSICAO = {
        ATA: { projecao: 0.20, teto: 0.25, explosao: 0.20, potencialOfensivo: 0.15, mediaRecente: 0.12, forma: 0.08 },
        MEI: { projecao: 0.18, mediaRecente: 0.20, teto: 0.18, regularidade: 0.15, explosao: 0.12, potencialOfensivo: 0.10, forma: 0.07 },
        LAT: { piso: 0.20, regularidade: 0.20, mediaRecente: 0.18, projecao: 0.16, confianca: 0.12, teto: 0.09, risco: -0.05 },
        ZAG: { piso: 0.22, regularidade: 0.22, confianca: 0.18, projecao: 0.16, mediaRecente: 0.14, risco: -0.05, volatilidade: -0.03 },
        GOL: { regularidade: 0.23, piso: 0.20, confianca: 0.18, mediaRecente: 0.17, projecao: 0.14, risco: -0.05, volatilidade: -0.03 }
    };

    function numero(valor) {
        valor = Number(valor);
        return Number.isFinite(valor) ? valor : 0;
    }

    function componente(jogador, nome) {
        const aliases = {
            mediaRecente: ["mediaRecente", "media5", "media3", "media"],
            regularidade: ["regularidade", "confianca"],
            explosao: ["explosao", "chance10"],
            potencialOfensivo: ["potencialOfensivo", "teto"],
            forma: ["forma", "score"],
            volatilidade: ["volatilidade", "risco"]
        };
        const nomes = [nome].concat(aliases[nome] || []);
        for (const chave of nomes) {
            const valor = Number(jogador?.[chave]);
            if (Number.isFinite(valor)) return valor;
        }
        return 0;
    }

    function pesos(jogador) {
        const posicao = String(jogador?.posicao || jogador?.posicaoAbreviacao || "").toUpperCase();
        return PESOS_POSICAO[posicao] || { projecao: 1 };
    }

    function calcular(jogador) {
        const mapa = pesos(jogador);
        let soma = 0;
        let total = 0;
        Object.entries(mapa).forEach(([nome, peso]) => {
            const valor = componente(jogador, nome);
            soma += (peso >= 0 ? valor : -valor) * Math.abs(peso);
            total += Math.abs(peso);
        });
        return Number((total ? soma / total : numero(jogador?.projecao)).toFixed(4));
    }

    function selecionar(jogadores) {
        const lista = Array.isArray(jogadores)
            ? jogadores.filter(j => String(j?.posicao || "").toUpperCase() !== "TEC")
            : [];
        if (!lista.length) return null;

        const componentes = new Set();
        lista.forEach(j => Object.keys(pesos(j)).forEach(c => componentes.add(c)));
        const limites = {};
        componentes.forEach(nome => {
            const valores = lista.map(j => componente(j, nome));
            limites[nome] = [Math.min(...valores), Math.max(...valores)];
        });

        function normalizar(valor, limite) {
            const [minimo, maximo] = limite;
            return maximo === minimo ? 0.5 : Math.max(0, Math.min(1, (valor - minimo) / (maximo - minimo)));
        }

        function score(jogador) {
            const mapa = pesos(jogador);
            let soma = 0;
            let total = 0;
            Object.entries(mapa).forEach(([nome, peso]) => {
                const norm = normalizar(componente(jogador, nome), limites[nome]);
                const absoluto = Math.abs(peso);
                soma += (peso >= 0 ? norm : 1 - norm) * absoluto;
                total += absoluto;
            });
            return total ? soma / total : 0;
        }

        return lista.reduce((melhor, jogador) => score(jogador) > score(melhor) ? jogador : melhor);
    }

    return {
        calcular,
        selecionar,
        modelo: "Posicional_Equilibrado"
    };

})();
