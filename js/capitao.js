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

/*
======================================================
CARTOLA ESTATÍSTICO
Integração Frontend V2 — RandomForest
======================================================

Objetivo:
- consumir data/modelagem/projecoes_v2_atual.json;
- validar rodada/modelo/anti-leakage/distribuição;
- aplicar a projeção V2 antes da montagem dos times;
- preservar a projeção V1 em projecaoV1;
- manter fallback integral para a V1 em qualquer falha.

A V2 somente entra em uso quando o artefato passa por todos
os gates abaixo. Caso contrário, carregarJogadores permanece
funcional e o site segue usando a V1 sem interrupção.
======================================================
*/

const CartolaProjecaoV2Frontend = (() => {
    "use strict";

    const CAMINHO = "data/modelagem/projecoes_v2_atual.json";
    const MODELO = "RandomForest";
    const MINIMO_PREDICOES = 100;
    const MINIMO_VALORES_UNICOS = 20;
    const MINIMO_DESVIO = 0.10;

    const estado = {
        ativo: false,
        rodada: null,
        modelo: null,
        cobertura: 0,
        total: 0,
        motivoFallback: null
    };

    function numero(valor) {
        const convertido = Number(valor);
        return Number.isFinite(convertido) ? convertido : null;
    }

    async function carregarArtefato() {
        const resposta = await fetch(CAMINHO, { cache: "no-store" });
        if (!resposta.ok) {
            throw new Error(`artefato V2 indisponível: HTTP ${resposta.status}`);
        }
        return await resposta.json();
    }

    async function obterRodadaAtual() {
        const resposta = await fetch("data/api/status.json", { cache: "no-store" });
        if (!resposta.ok) {
            throw new Error(`status indisponível: HTTP ${resposta.status}`);
        }
        const status = await resposta.json();
        const rodada = Number(status?.rodada_atual);
        if (!Number.isInteger(rodada) || rodada <= 0) {
            throw new Error("rodada atual inválida");
        }
        return rodada;
    }

    function validarArtefato(artefato, rodadaAtual) {
        if (!artefato || typeof artefato !== "object") {
            throw new Error("artefato V2 inválido");
        }
        if (String(artefato.versao || "").toUpperCase() !== "V2") {
            throw new Error("versão V2 não confirmada");
        }
        if (String(artefato.modelo || "") !== MODELO) {
            throw new Error("modelo V2 inesperado");
        }
        if (artefato.antiLeakage !== true) {
            throw new Error("gate anti-leakage não aprovado");
        }
        if (Number(artefato.rodada) !== Number(rodadaAtual)) {
            throw new Error(`artefato da rodada ${artefato.rodada}, rodada atual ${rodadaAtual}`);
        }

        const predicoes = artefato.predicoes;
        if (!predicoes || typeof predicoes !== "object") {
            throw new Error("predições V2 ausentes");
        }

        const valores = Object.values(predicoes)
            .map(Number)
            .filter(Number.isFinite);

        if (valores.length < MINIMO_PREDICOES) {
            throw new Error(`cobertura V2 insuficiente: ${valores.length}`);
        }

        const unicos = new Set(valores.map(v => v.toFixed(4))).size;
        if (unicos < MINIMO_VALORES_UNICOS) {
            throw new Error(`predições V2 degeneradas: ${unicos} valores únicos`);
        }

        const media = valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
        const variancia = valores.reduce((soma, valor) => soma + ((valor - media) ** 2), 0) / valores.length;
        const desvio = Math.sqrt(variancia);

        if (!Number.isFinite(desvio) || desvio < MINIMO_DESVIO) {
            throw new Error(`distribuição V2 degenerada: desvio ${desvio}`);
        }

        if (valores.every(valor => valor === 0)) {
            throw new Error("predições V2 zeradas");
        }

        return predicoes;
    }

    function aplicarEmLista(lista, predicoes) {
        if (!Array.isArray(lista)) return { lista: [], cobertura: 0 };

        let cobertura = 0;
        const resultado = lista.map(jogador => {
            const id = String(jogador?.id ?? jogador?.atletaId ?? jogador?.atleta_id ?? "");
            const prevista = numero(predicoes?.[id]);

            if (prevista === null) {
                return jogador;
            }

            cobertura += 1;

            return {
                ...jogador,
                projecaoV1: Number.isFinite(Number(jogador?.projecao))
                    ? Number(jogador.projecao)
                    : null,
                projecaoV2: prevista,
                projecao: prevista,
                versaoProjecao: "V2",
                modeloProjecao: MODELO,
                fonteProjecao: CAMINHO
            };
        });

        return { lista: resultado, cobertura };
    }

    function aplicarNoEstado(predicoes) {
        if (typeof estadoRecomendacoes === "undefined" || !estadoRecomendacoes) {
            throw new Error("estado de recomendações indisponível");
        }

        const ativos = aplicarEmLista(estadoRecomendacoes.jogadores, predicoes);
        const originais = aplicarEmLista(estadoRecomendacoes.jogadoresOriginais, predicoes);

        if (ativos.cobertura < MINIMO_PREDICOES) {
            throw new Error(`cobertura V2 no frontend insuficiente: ${ativos.cobertura}`);
        }

        estadoRecomendacoes.jogadores = ativos.lista;
        estadoRecomendacoes.jogadoresOriginais = originais.lista;

        estado.ativo = true;
        estado.cobertura = ativos.cobertura;
        estado.total = ativos.lista.length;

        if (typeof iniciarRecomendacoes === "function") {
            iniciarRecomendacoes();
        }

        window.dispatchEvent(new CustomEvent("cartola:v2-aplicada", {
            detail: {
                rodada: estado.rodada,
                modelo: estado.modelo,
                cobertura: estado.cobertura,
                total: estado.total
            }
        }));

        console.info(
            `[V2] RandomForest aplicado: ${estado.cobertura}/${estado.total} jogadores com projeção V2.`
        );
    }

    async function preparar() {
        const rodadaAtual = await obterRodadaAtual();
        const artefato = await carregarArtefato();
        const predicoes = validarArtefato(artefato, rodadaAtual);

        estado.rodada = rodadaAtual;
        estado.modelo = artefato.modelo;

        return predicoes;
    }

    function status() {
        return { ...estado };
    }

    return {
        preparar,
        aplicarNoEstado,
        status,
        caminho: CAMINHO
    };
})();

window.addEventListener("DOMContentLoaded", () => {
    let carregarLegado = null;

    try {
        if (typeof carregarJogadores === "function") {
            carregarLegado = carregarJogadores;
        } else if (typeof window.carregarJogadores === "function") {
            carregarLegado = window.carregarJogadores;
        }
    } catch (_) {
        carregarLegado = window.carregarJogadores;
    }

    if (typeof carregarLegado !== "function") {
        console.warn("[V2] carregarJogadores não disponível; V1 preservada.");
        return;
    }

    const carregarComV2 = async function (...args) {
        let predicoes = null;

        try {
            predicoes = await CartolaProjecaoV2Frontend.preparar();
        } catch (erro) {
            console.warn("[V2] artefato não aprovado; fallback V1:", erro);
        }

        const resultado = await carregarLegado.apply(this, args);

        if (!predicoes) {
            return resultado;
        }

        try {
            CartolaProjecaoV2Frontend.aplicarNoEstado(predicoes);

            if (typeof obterJogadores === "function") {
                return obterJogadores();
            }
        } catch (erro) {
            console.warn("[V2] falha ao aplicar no frontend; fallback V1:", erro);
        }

        return resultado;
    };

    try {
        carregarJogadores = carregarComV2;
    } catch (_) {
        /* o vínculo global pode não aceitar atribuição em ambientes de teste */
    }

    window.carregarJogadores = carregarComV2;
});
