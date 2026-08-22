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

    function posicao(jogador) {
        return String(
            jogador?.posicao ?? jogador?.posicaoSigla ?? jogador?.posicao_sigla ?? jogador?.posicaoAbreviacao ?? ""
        ).trim().toUpperCase();
    }

    function componente(jogador, nome) {
        const aliases = {
            projecao: ["projecao", "projecaoCalibrada", "projecaoOriginal", "score", "media"],
            mediaRecente: ["mediaRecente", "media5", "media3", "media"],
            regularidade: ["regularidade", "confianca"],
            explosao: ["explosao", "chance10"],
            potencialOfensivo: ["potencialOfensivo", "teto"],
            forma: ["forma", "score"],
            volatilidade: ["volatilidade", "risco"]
        };
        const nomes = aliases[nome] || [nome];
        for (const chave of nomes) {
            const valor = Number(jogador?.[chave]);
            if (Number.isFinite(valor)) return valor;
        }
        return 0;
    }

    function pesos(jogador) {
        return PESOS_POSICAO[posicao(jogador)] || { projecao: 1 };
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
            ? jogadores.filter(j => posicao(j) && posicao(j) !== "TEC")
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

    return { calcular, selecionar, modelo: "Posicional_Equilibrado" };

})();

/*
 * Integração compatível com o motor de Times Sugeridos.
 * dados.js é carregado depois deste arquivo; por isso a substituição é feita
 * somente após o carregamento completo. Se a função global não existir, nada
 * é alterado. O fallback antigo fica preservado em caso de erro.
 */
window.addEventListener("DOMContentLoaded", () => {
    const legado = window.selecionarCapitaoEscalacao;
    if (typeof legado !== "function") return;

    window.selecionarCapitaoEscalacao = function (titulares, ...args) {
        try {
            const escolhido = MotorCapitao.selecionar(titulares);
            return escolhido || legado.call(this, titulares, ...args);
        } catch (erro) {
            console.warn("[Capitão] fallback para seletor legado:", erro);
            return legado.call(this, titulares, ...args);
        }
    };
});
