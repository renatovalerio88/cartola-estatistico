/* =========================================================
   CARTOLA ESTATÍSTICO
   Motor estatístico central

   Responsabilidades:
   - Normalizar o histórico dos jogadores
   - Calcular médias, piso, teto e regularidade
   - Calcular tendência, risco e confiança
   - Aplicar os pesos especializados por posição
   - Enriquecer cada jogador com suas estatísticas
   - Preparar os dados para o Motor de Projeção
   - Manter compatibilidade com os demais módulos
   ========================================================= */


/* =========================================================
   1. IDENTIFICAÇÃO DO MOTOR
   ========================================================= */

const MOTOR_ESTATISTICO = {
    nome: "Motor Estatístico do Cartola",
    versao: "0.3.0",
    status: "Motor estatístico central",
    quantidadeCriterios: 18
};


/* =========================================================
   2. NOMES AMIGÁVEIS DOS CRITÉRIOS
   ========================================================= */

const NOMES_CRITERIOS = {

    formaRecente:
        "Forma recente",

    mediaGeral:
        "Média geral",

    mediana:
        "Mediana",

    regularidade:
        "Regularidade",

    pontuacaoBasica:
        "Pontuação básica",

    scoutsOfensivos:
        "Scouts ofensivos",

    scoutsDefensivos:
        "Scouts defensivos",

    casaFora:
        "Desempenho em casa ou fora",

    forcaAdversario:
        "Força do adversário",

    pontosCedidos:
        "Pontos cedidos pela posição",

    chanceSG:
        "Probabilidade de SG",

    titularidade:
        "Titularidade",

    minutosEsperados:
        "Minutos esperados",

    bolaParada:
        "Bolas paradas",

    penaltis:
        "Cobrança de pênaltis",

    custoBeneficio:
        "Custo-benefício",

    tendenciaRecente:
        "Tendência recente",

    riscoNegativar:
        "Proteção contra negativação"

};


/* =========================================================
   3. PERFIS DAS POSIÇÕES
   ========================================================= */

const PERFIS_POSICAO = {

    GOL: {

        nome: "Goleiro",

        prioridades: [
            "scoutsDefensivos",
            "chanceSG",
            "regularidade"
        ]

    },

    LAT: {

        nome: "Lateral",

        prioridades: [
            "pontuacaoBasica",
            "scoutsOfensivos",
            "scoutsDefensivos"
        ]

    },

    ZAG: {

        nome: "Zagueiro",

        prioridades: [
            "scoutsDefensivos",
            "chanceSG",
            "regularidade"
        ]

    },

    MEI: {

        nome: "Meia",

        prioridades: [
            "scoutsOfensivos",
            "formaRecente",
            "pontuacaoBasica"
        ]

    },

    ATA: {

        nome: "Atacante",

        prioridades: [
            "scoutsOfensivos",
            "formaRecente",
            "forcaAdversario"
        ]

    },

    TEC: {

        nome: "Treinador",

        prioridades: [
            "forcaAdversario",
            "chanceSG",
            "formaRecente"
        ]

    }

};


/* =========================================================
   4. CONVERSÃO SEGURA DE NÚMEROS
   ========================================================= */

function numeroEstatistico(
    valor,
    padrao = 0
) {

    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : padrao;

}


/* =========================================================
   5. LIMITADOR DE VALORES
   ========================================================= */

function limitarValorEstatistico(
    valor,
    minimo = 0,
    maximo = 100
) {

    const numero =
        numeroEstatistico(valor);

    return Math.min(
        maximo,
        Math.max(
            minimo,
            numero
        )
    );

}


/* =========================================================
   6. FORMATAÇÃO INTERNA
   ========================================================= */

function formatarNumeroEstatistico(
    valor,
    casas = 2
) {

    return numeroEstatistico(valor)
        .toFixed(casas);

}


/* =========================================================
   7. PREPARAÇÃO DE LISTAS NUMÉRICAS
   ========================================================= */

function prepararListaNumerica(
    valores
) {

    if (!Array.isArray(valores)) {
        return [];
    }

    return valores
        .map((item) => {

            if (
                typeof item === "number" ||
                typeof item === "string"
            ) {

                return Number(item);

            }

            if (
                item &&
                typeof item === "object"
            ) {

                const possibilidades = [

                    item.pontuacao,
                    item.pontuacaoReal,
                    item.pontos,
                    item.score,
                    item.valor

                ];

                for (
                    const possibilidade
                    of possibilidades
                ) {

                    const numero =
                        Number(possibilidade);

                    if (
                        Number.isFinite(numero)
                    ) {

                        return numero;

                    }

                }

            }

            return NaN;

        })
        .filter(Number.isFinite);

}


/* =========================================================
   8. EXTRAÇÃO DO HISTÓRICO DO JOGADOR
   ========================================================= */

function extrairHistoricoPontuacoes(
    jogador
) {

    if (
        Array.isArray(
            jogador?.historicoPontuacoes
        )
    ) {

        const pontuacoes =
            prepararListaNumerica(
                jogador.historicoPontuacoes
            );

        if (pontuacoes.length > 0) {
            return pontuacoes;
        }

    }

    if (
        Array.isArray(
            jogador?.historico
        )
    ) {

        const pontuacoes =
            prepararListaNumerica(
                jogador.historico
            );

        if (pontuacoes.length > 0) {
            return pontuacoes;
        }

    }

    if (
        Array.isArray(
            jogador?.pontuacoes
        )
    ) {

        const pontuacoes =
            prepararListaNumerica(
                jogador.pontuacoes
            );

        if (pontuacoes.length > 0) {
            return pontuacoes;
        }

    }

    return [];

}


/* =========================================================
   9. MÉDIA
   ========================================================= */

function calcularMedia(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    const soma =
        numeros.reduce(
            (
                total,
                valor
            ) =>
                total + valor,
            0
        );

    return (
        soma /
        numeros.length
    );

}


/* =========================================================
   10. MEDIANA
   ========================================================= */

function calcularMediana(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        )
            .sort(
                (
                    valorA,
                    valorB
                ) =>
                    valorA - valorB
            );

    if (numeros.length === 0) {
        return 0;
    }

    const indiceCentral =
        Math.floor(
            numeros.length / 2
        );

    const quantidadePar =
        numeros.length % 2 === 0;

    if (quantidadePar) {

        return (

            numeros[
                indiceCentral - 1
            ] +

            numeros[
                indiceCentral
            ]

        ) / 2;

    }

    return numeros[
        indiceCentral
    ];

}


/* =========================================================
   11. VARIÂNCIA
   ========================================================= */

function calcularVariancia(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    const media =
        calcularMedia(
            numeros
        );

    const somaDiferencas =
        numeros.reduce(
            (
                total,
                valor
            ) => {

                const diferenca =
                    valor - media;

                return (
                    total +
                    diferenca ** 2
                );

            },
            0
        );

    return (
        somaDiferencas /
        numeros.length
    );

}


/* =========================================================
   12. DESVIO-PADRÃO
   ========================================================= */

function calcularDesvioPadrao(
    valores
) {

    return Math.sqrt(
        calcularVariancia(
            valores
        )
    );

}


/* =========================================================
   13. AMPLITUDE
   ========================================================= */

function calcularAmplitude(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    return (

        Math.max(
            ...numeros
        ) -

        Math.min(
            ...numeros
        )

    );

}


/* =========================================================
   14. PISO
   ========================================================= */

function calcularPiso(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    return Math.min(
        ...numeros
    );

}


/* =========================================================
   15. TETO
   ========================================================= */

function calcularTeto(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    return Math.max(
        ...numeros
    );

}


/* =========================================================
   16. TENDÊNCIA RECENTE

   Compara a primeira metade das últimas partidas
   com a segunda metade.
   ========================================================= */

function calcularTendencia(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length < 2) {

        return {

            valor: 0,
            nota: 50,
            classificacao:
                "Estável"

        };

    }

    const historicoRecente =
        numeros.slice(-10);

    const tamanhoMetade =
        Math.max(
            1,
            Math.floor(
                historicoRecente.length /
                2
            )
        );

    const primeiraMetade =
        historicoRecente.slice(
            0,
            tamanhoMetade
        );

    const segundaMetade =
        historicoRecente.slice(
            historicoRecente.length -
            tamanhoMetade
        );

    const mediaInicial =
        calcularMedia(
            primeiraMetade
        );

    const mediaFinal =
        calcularMedia(
            segundaMetade
        );

    const diferenca =
        mediaFinal -
        mediaInicial;

    const nota =
        limitarValorEstatistico(
            50 +
            diferenca * 8,
            0,
            100
        );

    let classificacao =
        "Estável";

    if (diferenca >= 1) {

        classificacao =
            "Em crescimento";

    }
    else if (
        diferenca <= -1
    ) {

        classificacao =
            "Em queda";

    }

    return {

        valor:
            diferenca,

        nota,

        classificacao

    };

}


/* =========================================================
   17. REGULARIDADE

   Quanto menor o coeficiente de variação,
   maior a nota de regularidade.
   ========================================================= */

function calcularRegularidade(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    if (numeros.length === 1) {
        return 50;
    }

    const media =
        Math.abs(
            calcularMedia(
                numeros
            )
        );

    const desvio =
        calcularDesvioPadrao(
            numeros
        );

    if (media === 0) {

        return desvio === 0
            ? 100
            : 0;

    }

    const coeficienteVariacao =
        desvio / media;

    return limitarValorEstatistico(

        100 -
        coeficienteVariacao * 70,

        0,
        100

    );

}


/* =========================================================
   18. FREQUÊNCIA DE NEGATIVAÇÃO
   ========================================================= */

function calcularFrequenciaNegativa(
    valores
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    const negativas =
        numeros.filter(
            (valor) =>
                valor < 0
        ).length;

    return (

        negativas /
        numeros.length

    ) * 100;

}


/* =========================================================
   19. FREQUÊNCIA ACIMA DE UMA META
   ========================================================= */

function calcularFrequenciaAcima(
    valores,
    meta
) {

    const numeros =
        prepararListaNumerica(
            valores
        );

    if (numeros.length === 0) {
        return 0;
    }

    const valorMeta =
        numeroEstatistico(
            meta
        );

    const quantidade =
        numeros.filter(
            (valor) =>
                valor >= valorMeta
        ).length;

    return (

        quantidade /
        numeros.length

    ) * 100;

}


/* =========================================================
   20. NORMALIZAÇÃO PARA 0 A 100
   ========================================================= */

function normalizarNota(
    valor,
    minimo,
    maximo
) {

    const numero =
        numeroEstatistico(
            valor
        );

    const limiteMinimo =
        numeroEstatistico(
            minimo
        );

    const limiteMaximo =
        numeroEstatistico(
            maximo
        );

    if (
        limiteMaximo ===
        limiteMinimo
    ) {

        return 50;

    }

    const nota =
        (
            (
                numero -
                limiteMinimo
            ) /
            (
                limiteMaximo -
                limiteMinimo
            )
        ) * 100;

    return limitarValorEstatistico(
        nota,
        0,
        100
    );

}


/* =========================================================
   21. CUSTO-BENEFÍCIO
   ========================================================= */

function calcularCustoBeneficio(
    projecao,
    preco
) {

    const valorProjecao =
        numeroEstatistico(
            projecao
        );

    const valorPreco =
        numeroEstatistico(
            preco
        );

    if (valorPreco <= 0) {
        return 0;
    }

    return (
        valorProjecao /
        valorPreco
    );

}


/* =========================================================
   22. CÁLCULO DO RISCO ESTATÍSTICO
   ========================================================= */

function calcularRiscoEstatistico(
    dados
) {

    const regularidade =
        numeroEstatistico(
            dados?.regularidade
        );

    const frequenciaNegativa =
        numeroEstatistico(
            dados?.frequenciaNegativa
        );

    const desvioPadrao =
        numeroEstatistico(
            dados?.desvioPadrao
        );

    const quantidadeJogos =
        numeroEstatistico(
            dados?.quantidadeJogos
        );

    const riscoVariacao =
        limitarValorEstatistico(
            desvioPadrao * 10,
            0,
            100
        );

    const riscoRegularidade =
        100 -
        limitarValorEstatistico(
            regularidade,
            0,
            100
        );

    const riscoAmostra =
        quantidadeJogos >= 5
            ? 0
            : (
                5 -
                quantidadeJogos
            ) * 10;

    const risco =
        (
            riscoVariacao * 0.35 +
            riscoRegularidade * 0.35 +
            frequenciaNegativa * 0.20 +
            riscoAmostra * 0.10
        );

    return limitarValorEstatistico(
        risco,
        0,
        100
    );

}


/* =========================================================
   23. CÁLCULO DA CONFIANÇA
   ========================================================= */

function calcularConfiancaEstatistica(
    dados
) {

    const quantidadeJogos =
        numeroEstatistico(
            dados?.quantidadeJogos
        );

    const regularidade =
        numeroEstatistico(
            dados?.regularidade
        );

    const risco =
        numeroEstatistico(
            dados?.risco
        );

    const notaAmostra =
        limitarValorEstatistico(
            quantidadeJogos * 12,
            0,
            100
        );

    const confianca =
        (
            notaAmostra * 0.35 +
            regularidade * 0.35 +
            (
                100 -
                risco
            ) * 0.30
        );

    return limitarValorEstatistico(
        confianca,
        0,
        100
    );

}


/* =========================================================
   24. PESOS DA POSIÇÃO
   ========================================================= */

function obterPesosDoMotor(
    codigoPosicao
) {

    if (
        typeof obterPesosPorPosicao ===
        "function"
    ) {

        return obterPesosPorPosicao(
            codigoPosicao
        );

    }

    console.warn(
        "pesos.js não foi carregado. " +
        "O motor utilizará pesos iguais."
    );

    const pesoIgual =
        100 /
        MOTOR_ESTATISTICO
            .quantidadeCriterios;

    return Object.keys(
        NOMES_CRITERIOS
    )
        .reduce(
            (
                pesos,
                criterio
            ) => {

                pesos[criterio] =
                    pesoIgual;

                return pesos;

            },
            {}
        );

}


/* =========================================================
   25. NOME DO MOTOR DA POSIÇÃO
   ========================================================= */

function obterNomeDoMotor(
    codigoPosicao
) {

    if (
        typeof obterNomeMotorPosicao ===
        "function"
    ) {

        return obterNomeMotorPosicao(
            codigoPosicao
        );

    }

    return (
        "Motor Estatístico Geral"
    );

}


/* =========================================================
   26. SOMA DOS PESOS
   ========================================================= */

function somarPesosEstatisticos(
    pesos
) {

    if (
        !pesos ||
        typeof pesos !== "object"
    ) {

        return 0;

    }

    return Object.values(
        pesos
    )
        .reduce(
            (
                total,
                peso
            ) =>

                total +
                numeroEstatistico(
                    peso
                ),

            0
        );

}


/* =========================================================
   27. VALIDAÇÃO DOS PESOS
   ========================================================= */

function validarPesosEstatisticos(
    codigoPosicao
) {

    const pesos =
        obterPesosDoMotor(
            codigoPosicao
        );

    const total =
        somarPesosEstatisticos(
            pesos
        );

    const valido =
        Math.abs(
            total - 100
        ) < 0.001;

    if (!valido) {

        console.error(

            "Erro no Motor Estatístico:",

            `os pesos de ${codigoPosicao} ` +
            `totalizam ${total}, ` +
            "mas deveriam totalizar 100."

        );

    }

    return {

        valido,
        total,
        esperado: 100,
        codigoPosicao,
        pesos

    };

}


/* =========================================================
   28. CONTRIBUIÇÃO PONDERADA
   ========================================================= */

function calcularContribuicao(
    nota,
    peso
) {

    const notaSegura =
        limitarValorEstatistico(
            nota,
            0,
            100
        );

    const pesoSeguro =
        numeroEstatistico(
            peso
        );

    return (

        notaSegura *
        pesoSeguro

    ) / 100;

}


/* =========================================================
   29. NOTA FINAL POR POSIÇÃO
   ========================================================= */

function calcularNotaFinal(
    notasCriterios,
    codigoPosicao
) {

    const validacao =
        validarPesosEstatisticos(
            codigoPosicao
        );

    if (!validacao.valido) {

        return {

            notaFinal: 0,

            contribuicoes: {},

            pesosAplicados:
                validacao.pesos,

            erro:
                "Os pesos do motor não totalizam 100."

        };

    }

    const pesos =
        validacao.pesos;

    const contribuicoes = {};

    let notaFinal = 0;

    Object.entries(
        pesos
    )
        .forEach(
            (
                [
                    criterio,
                    peso
                ]
            ) => {

                const nota =
                    limitarValorEstatistico(

                        notasCriterios?.[
                            criterio
                        ],

                        0,
                        100

                    );

                const contribuicao =
                    calcularContribuicao(
                        nota,
                        peso
                    );

                contribuicoes[
                    criterio
                ] = {

                    criterio,

                    nome:
                        NOMES_CRITERIOS[
                            criterio
                        ] ||
                        criterio,

                    nota,

                    peso,

                    contribuicao

                };

                notaFinal +=
                    contribuicao;

            }
        );

    return {

        notaFinal:
            limitarValorEstatistico(
                notaFinal,
                0,
                100
            ),

        contribuicoes,

        pesosAplicados:
            pesos,

        erro:
            null

    };

}


/* =========================================================
   30. CLASSIFICAÇÃO DA NOTA
   ========================================================= */

function classificarNotaFinal(
    nota
) {

    const valor =
        numeroEstatistico(
            nota
        );

    if (valor >= 90) {
        return "Excelente";
    }

    if (valor >= 80) {
        return "Muito boa";
    }

    if (valor >= 70) {
        return "Boa";
    }

    if (valor >= 60) {
        return "Regular";
    }

    if (valor >= 50) {
        return "Abaixo da média";
    }

    return "Baixa";

}


/* =========================================================
   31. CLASSIFICAÇÃO DO RISCO
   ========================================================= */

function classificarRiscoEstatistico(
    notaRisco
) {

    const valor =
        numeroEstatistico(
            notaRisco
        );

    if (valor <= 25) {
        return "Baixo";
    }

    if (valor <= 55) {
        return "Médio";
    }

    return "Alto";

}


/* =========================================================
   32. CLASSIFICAÇÃO DA CONFIANÇA
   ========================================================= */

function classificarConfiancaEstatistica(
    confianca
) {

    const valor =
        numeroEstatistico(
            confianca
        );

    if (valor >= 85) {
        return "Alta";
    }

    if (valor >= 65) {
        return "Média";
    }

    return "Baixa";

}


/* =========================================================
   33. PRINCIPAIS CONTRIBUIÇÕES
   ========================================================= */

function obterPrincipaisContribuicoes(
    contribuicoes,
    quantidade = 3
) {

    if (
        !contribuicoes ||
        typeof contribuicoes !==
        "object"
    ) {

        return [];

    }

    return Object.values(
        contribuicoes
    )
        .sort(
            (
                itemA,
                itemB
            ) =>

                numeroEstatistico(
                    itemB.contribuicao
                ) -

                numeroEstatistico(
                    itemA.contribuicao
                )

        )
        .slice(
            0,
            quantidade
        );

}


/* =========================================================
   34. MENORES NOTAS
   ========================================================= */

function obterMenoresContribuicoes(
    contribuicoes,
    quantidade = 3
) {

    if (
        !contribuicoes ||
        typeof contribuicoes !==
        "object"
    ) {

        return [];

    }

    return Object.values(
        contribuicoes
    )
        .sort(
            (
                itemA,
                itemB
            ) =>

                numeroEstatistico(
                    itemA.nota
                ) -

                numeroEstatistico(
                    itemB.nota
                )

        )
        .slice(
            0,
            quantidade
        );

}


/* =========================================================
   35. EXPLICAÇÃO ESTATÍSTICA
   ========================================================= */

function gerarExplicacaoEstatistica(
    resultado
) {

    if (
        !resultado ||
        resultado.erro
    ) {

        return {

            resumo:
                "Não foi possível calcular a nota.",

            pontosFortes: [],

            pontosAtencao: []

        };

    }

    const melhores =
        obterPrincipaisContribuicoes(
            resultado.contribuicoes,
            3
        );

    const menores =
        obterMenoresContribuicoes(
            resultado.contribuicoes,
            3
        );

    const pontosFortes =
        melhores.map(
            (item) =>

                `${item.nome}: ` +
                `nota ${Math.round(
                    item.nota
                )}, peso ${formatarNumeroEstatistico(
                    item.peso,
                    0
                )}% e contribuição de ` +
                `${formatarNumeroEstatistico(
                    item.contribuicao,
                    2
                )} pontos.`

        );

    const pontosAtencao =
        menores.map(
            (item) =>

                `${item.nome}: ` +
                `nota ${Math.round(
                    item.nota
                )}, abaixo dos principais ` +
                "componentes da análise."

        );

    return {

        resumo:
            `Nota final de ` +
            `${formatarNumeroEstatistico(
                resultado.notaFinal,
                1
            )}, classificada como ` +
            `${classificarNotaFinal(
                resultado.notaFinal
            )}.`,

        pontosFortes,

        pontosAtencao

    };

}


/* =========================================================
   36. NOTAS DOS CRITÉRIOS DO JOGADOR
   ========================================================= */

function montarNotasCriterios(
    jogador,
    estatisticas
) {

    const mediaGeral =
        numeroEstatistico(
            estatisticas.mediaGeral
        );

    const mediaRecente =
        numeroEstatistico(
            estatisticas.mediaRecente
        );

    const mediana =
        numeroEstatistico(
            estatisticas.mediana
        );

    const regularidade =
        numeroEstatistico(
            estatisticas.regularidade
        );

    const tendencia =
        numeroEstatistico(
            estatisticas.tendencia?.nota,
            50
        );

    const frequenciaNegativa =
        numeroEstatistico(
            estatisticas.frequenciaNegativa
        );

    const preco =
        numeroEstatistico(
            jogador?.preco
        );

    const mediaCartola =
        numeroEstatistico(
            jogador?.media
        );

    const pontosUltimaRodada =
        numeroEstatistico(
            jogador?.pontosUltimaRodada
        );

    const titularidade =
        jogador?.statusId === 7
            ? 100
            : jogador?.statusId
                ? 60
                : 50;

    const notasOriginais =
        jogador?.notas ||
        jogador?.notasCriterios ||
        {};

    return {

        formaRecente:
            normalizarNota(
                mediaRecente,
                -2,
                12
            ),

        mediaGeral:
            normalizarNota(
                mediaGeral,
                -2,
                12
            ),

        mediana:
            normalizarNota(
                mediana,
                -2,
                12
            ),

        regularidade:
            regularidade,

        pontuacaoBasica:
            normalizarNota(
                mediaCartola ||
                mediaGeral,
                -2,
                12
            ),

        scoutsOfensivos:
            numeroEstatistico(
                notasOriginais
                    .scoutsOfensivos,
                50
            ),

        scoutsDefensivos:
            numeroEstatistico(
                notasOriginais
                    .scoutsDefensivos,
                50
            ),

        casaFora:
            numeroEstatistico(
                notasOriginais
                    .casaFora,
                50
            ),

        forcaAdversario:
            numeroEstatistico(
                notasOriginais
                    .forcaAdversario,
                50
            ),

        pontosCedidos:
            numeroEstatistico(
                notasOriginais
                    .pontosCedidos,
                50
            ),

        chanceSG:
            numeroEstatistico(
                notasOriginais
                    .chanceSG,
                50
            ),

        titularidade:
            numeroEstatistico(
                notasOriginais
                    .titularidade,
                titularidade
            ),

        minutosEsperados:
            numeroEstatistico(
                notasOriginais
                    .minutosEsperados,
                titularidade
            ),

        bolaParada:
            numeroEstatistico(
                notasOriginais
                    .bolaParada,
                50
            ),

        penaltis:
            numeroEstatistico(
                notasOriginais
                    .penaltis,
                50
            ),

        custoBeneficio:
            normalizarNota(

                calcularCustoBeneficio(
                    mediaRecente ||
                    mediaGeral ||
                    pontosUltimaRodada,
                    preco
                ),

                0,
                1.5

            ),

        tendenciaRecente:
            tendencia,

        riscoNegativar:
            100 -
            limitarValorEstatistico(
                frequenciaNegativa,
                0,
                100
            )

    };

}


/* =========================================================
   37. SCORE ESTATÍSTICO COMPLETO
   ========================================================= */

function calcularScoreEstatistico(
    jogador
) {

    const historico =
        extrairHistoricoPontuacoes(
            jogador
        );

    const ultimas3 =
        historico.slice(-3);

    const ultimas5 =
        historico.slice(-5);

    const ultimas10 =
        historico.slice(-10);

    const mediaGeral =
        calcularMedia(
            historico
        );

    const media3 =
        calcularMedia(
            ultimas3
        );

    const media5 =
        calcularMedia(
            ultimas5
        );

    const media10 =
        calcularMedia(
            ultimas10
        );

    const mediaRecente =
        ultimas5.length > 0
            ? media5
            : mediaGeral;

    const mediana =
        calcularMediana(
            historico
        );

    const piso =
        calcularPiso(
            historico
        );

    const teto =
        calcularTeto(
            historico
        );

    const regularidade =
        calcularRegularidade(
            historico
        );

    const tendencia =
        calcularTendencia(
            historico
        );

    const desvioPadrao =
        calcularDesvioPadrao(
            historico
        );

    const amplitude =
        calcularAmplitude(
            historico
        );

    const frequenciaNegativa =
        calcularFrequenciaNegativa(
            historico
        );

    const frequenciaAcimaMedia =
        calcularFrequenciaAcima(
            historico,
            mediaGeral
        );

    const quantidadeJogos =
        historico.length;

    const risco =
        calcularRiscoEstatistico({

            regularidade,
            frequenciaNegativa,
            desvioPadrao,
            quantidadeJogos

        });

    const confianca =
        calcularConfiancaEstatistica({

            quantidadeJogos,
            regularidade,
            risco

        });

    return {

        historicoPontuacoes:
            [...historico],

        quantidadeJogos,

        mediaGeral,

        mediaRecente,

        media3,

        media5,

        media10,

        mediana,

        piso,

        teto,

        regularidade,

        tendencia,

        desvioPadrao,

        amplitude,

        frequenciaNegativa,

        frequenciaAcimaMedia,

        risco,

        classificacaoRisco:
            classificarRiscoEstatistico(
                risco
            ),

        confianca,

        classificacaoConfianca:
            classificarConfiancaEstatistica(
                confianca
            )

    };

}


/* =========================================================
   38. EXECUÇÃO COMPLETA DO MOTOR
   ========================================================= */

function executarMotorEstatistico(
    dadosAnalise
) {

    const codigoPosicao =
        String(

            dadosAnalise?.posicao ||
            ""

        )
            .toUpperCase()
            .trim();

    const score =
        calcularScoreEstatistico(
            dadosAnalise || {}
        );

    const notas =
        dadosAnalise?.notas ||
        dadosAnalise?.notasCriterios ||
        montarNotasCriterios(
            dadosAnalise || {},
            score
        );

    const resultadoNota =
        calcularNotaFinal(
            notas,
            codigoPosicao
        );

    const explicacao =
        gerarExplicacaoEstatistica(
            resultadoNota
        );

    const perfil =
        PERFIS_POSICAO[
            codigoPosicao
        ] ||
        null;

    return {

        motor: {

            nome:
                MOTOR_ESTATISTICO.nome,

            nomeEspecializado:
                obterNomeDoMotor(
                    codigoPosicao
                ),

            versao:
                MOTOR_ESTATISTICO.versao,

            status:
                MOTOR_ESTATISTICO.status,

            quantidadeCriterios:
                MOTOR_ESTATISTICO
                    .quantidadeCriterios

        },

        score,

        jogadorId:
            dadosAnalise?.jogadorId ||
            dadosAnalise?.id ||
            null,

        posicao:
            codigoPosicao ||
            null,

        nomePosicao:
            perfil?.nome ||
            codigoPosicao ||
            "Não informada",

        prioridades:
            perfil?.prioridades ||
            [],

        notas,

        notaFinal:
            resultadoNota.notaFinal,

        classificacao:
            classificarNotaFinal(
                resultadoNota.notaFinal
            ),

        pesosAplicados:
            resultadoNota
                .pesosAplicados,

        contribuicoes:
            resultadoNota
                .contribuicoes,

        explicacao,

        erro:
            resultadoNota.erro

    };

}


/* =========================================================
   39. APLICAÇÃO DO MOTOR DE PROJEÇÃO
   ========================================================= */

function aplicarMotorProjecao(
    jogador
) {

    if (
        typeof MotorProjecao ===
        "undefined" ||
        !MotorProjecao ||
        typeof MotorProjecao.calcular !==
        "function"
    ) {

        return null;

    }

    try {

        return MotorProjecao.calcular(
            jogador
        );

    }
    catch (erro) {

        console.error(
            "Erro ao calcular projeção:",
            jogador?.nome ||
            jogador?.apelido ||
            jogador?.id,
            erro
        );

        return null;

    }

}


/* =========================================================
   40. ENRIQUECIMENTO DE UM JOGADOR
   ========================================================= */

function analisarJogadorEstatisticamente(
    jogador
) {

    if (
        !jogador ||
        typeof jogador !== "object"
    ) {

        return jogador;

    }

    const historicoPontuacoes =
        extrairHistoricoPontuacoes(
            jogador
        );

    const jogadorPreparado = {

        ...jogador,

        scouts: {
            ...(jogador.scouts || {})
        },

        historico:
            Array.isArray(
                jogador.historico
            )
                ? jogador.historico
                    .map((item) => {

                        if (
                            item &&
                            typeof item ===
                            "object"
                        ) {

                            return {

                                ...item,

                                scouts: {
                                    ...(
                                        item.scouts ||
                                        {}
                                    )
                                }

                            };

                        }

                        return item;

                    })
                : [],

        historicoPontuacoes:
            [...historicoPontuacoes]

    };

    const score =
        calcularScoreEstatistico(
            jogadorPreparado
        );

    const notas =
        montarNotasCriterios(
            jogadorPreparado,
            score
        );

    const resultadoMotor =
        executarMotorEstatistico({

            ...jogadorPreparado,

            notas

        });

    const jogadorCalculado = {

        ...jogadorPreparado,

        historicoPontuacoes:
            [...score.historicoPontuacoes],

        quantidadeJogosHistorico:
            score.quantidadeJogos,

        mediaGeral:
            score.mediaGeral,

        mediaRecente:
            score.mediaRecente,

        media3:
            score.media3,

        media5:
            score.media5,

        media10:
            score.media10,

        mediana:
            score.mediana,

        piso:
            score.piso,

        teto:
            score.teto,

        regularidade:
            score.regularidade,

        tendencia:
            score.tendencia,

        tendenciaValor:
            score.tendencia.valor,

        tendenciaNota:
            score.tendencia.nota,

        tendenciaClassificacao:
            score.tendencia
                .classificacao,

        desvioPadrao:
            score.desvioPadrao,

        amplitude:
            score.amplitude,

        frequenciaNegativa:
            score.frequenciaNegativa,

        frequenciaAcimaMedia:
            score.frequenciaAcimaMedia,

        risco:
            score.risco,

        classificacaoRisco:
            score.classificacaoRisco,

        confianca:
            score.confianca,

        classificacaoConfianca:
            score.classificacaoConfianca,

        nota:
            resultadoMotor.notaFinal,

        notaFinal:
            resultadoMotor.notaFinal,

        score:
            resultadoMotor.notaFinal,

        classificacao:
            resultadoMotor.classificacao,

        notas,

        pesosAplicados:
            resultadoMotor
                .pesosAplicados,

        contribuicoes:
            resultadoMotor
                .contribuicoes,

        explicacaoEstatistica:
            resultadoMotor.explicacao,

        estatisticas: {

            quantidadeJogos:
                score.quantidadeJogos,

            mediaGeral:
                score.mediaGeral,

            mediaRecente:
                score.mediaRecente,

            media3:
                score.media3,

            media5:
                score.media5,

            media10:
                score.media10,

            mediana:
                score.mediana,

            piso:
                score.piso,

            teto:
                score.teto,

            regularidade:
                score.regularidade,

            tendencia:
                score.tendencia,

            desvioPadrao:
                score.desvioPadrao,

            amplitude:
                score.amplitude,

            frequenciaNegativa:
                score.frequenciaNegativa,

            frequenciaAcimaMedia:
                score.frequenciaAcimaMedia,

            risco:
                score.risco,

            classificacaoRisco:
                score.classificacaoRisco,

            confianca:
                score.confianca,

            classificacaoConfianca:
                score.classificacaoConfianca,

            nota:
                resultadoMotor.notaFinal,

            classificacao:
                resultadoMotor.classificacao

        }

    };

    const resultadoProjecao =
        aplicarMotorProjecao(
            jogadorCalculado
        );

    if (
        resultadoProjecao &&
        typeof resultadoProjecao ===
        "object"
    ) {

        Object.assign(
            jogadorCalculado,
            resultadoProjecao
        );

        jogadorCalculado.estatisticas = {

            ...jogadorCalculado
                .estatisticas,

            projecao:
                numeroEstatistico(

                    resultadoProjecao
                        .projecao ??
                    resultadoProjecao
                        .pontuacaoProjetada ??
                    jogadorCalculado
                        .projecao

                ),

            risco:
                numeroEstatistico(

                    resultadoProjecao
                        .risco ??
                    jogadorCalculado
                        .risco

                ),

            confianca:
                numeroEstatistico(

                    resultadoProjecao
                        .confianca ??
                    jogadorCalculado
                        .confianca

                )

        };

    }

    return jogadorCalculado;

}


/* =========================================================
   41. ANÁLISE DE LISTA DE JOGADORES
   ========================================================= */

function analisarListaJogadoresEstatisticamente(
    jogadores
) {

    if (!Array.isArray(jogadores)) {
        return [];
    }

    return jogadores
        .filter(
            (jogador) =>
                jogador &&
                typeof jogador ===
                "object"
        )
        .map(
            analisarJogadorEstatisticamente
        );

}


/* =========================================================
   42. COMPARAÇÃO ENTRE DOIS RESULTADOS
   ========================================================= */

function compararResultadosEstatisticos(
    resultadoA,
    resultadoB
) {

    const notaA =
        numeroEstatistico(
            resultadoA?.notaFinal ??
            resultadoA?.nota ??
            resultadoA?.score
        );

    const notaB =
        numeroEstatistico(
            resultadoB?.notaFinal ??
            resultadoB?.nota ??
            resultadoB?.score
        );

    const diferenca =
        notaA - notaB;

    let vencedor =
        "empate";

    if (diferenca > 0) {

        vencedor = "A";

    }
    else if (
        diferenca < 0
    ) {

        vencedor = "B";

    }

    return {

        vencedor,
        notaA,
        notaB,

        diferenca:
            Math.abs(
                diferenca
            )

    };

}


/* =========================================================
   43. COMPARAÇÃO DETALHADA DOS CRITÉRIOS
   ========================================================= */

function compararContribuicoes(
    resultadoA,
    resultadoB
) {

    const contribuicoesA =
        resultadoA?.contribuicoes ||
        {};

    const contribuicoesB =
        resultadoB?.contribuicoes ||
        {};

    const criterios =
        new Set([

            ...Object.keys(
                contribuicoesA
            ),

            ...Object.keys(
                contribuicoesB
            )

        ]);

    return [
        ...criterios
    ]
        .map(
            (criterio) => {

                const itemA =
                    contribuicoesA[
                        criterio
                    ] ||
                    {};

                const itemB =
                    contribuicoesB[
                        criterio
                    ] ||
                    {};

                const contribuicaoA =
                    numeroEstatistico(
                        itemA.contribuicao
                    );

                const contribuicaoB =
                    numeroEstatistico(
                        itemB.contribuicao
                    );

                return {

                    criterio,

                    nome:
                        itemA.nome ||
                        itemB.nome ||
                        NOMES_CRITERIOS[
                            criterio
                        ] ||
                        criterio,

                    notaA:
                        numeroEstatistico(
                            itemA.nota
                        ),

                    notaB:
                        numeroEstatistico(
                            itemB.nota
                        ),

                    pesoA:
                        numeroEstatistico(
                            itemA.peso
                        ),

                    pesoB:
                        numeroEstatistico(
                            itemB.peso
                        ),

                    contribuicaoA,

                    contribuicaoB,

                    diferenca:
                        contribuicaoA -
                        contribuicaoB,

                    vencedor:
                        contribuicaoA >
                        contribuicaoB
                            ? "A"
                            : contribuicaoB >
                                contribuicaoA
                                ? "B"
                                : "empate"

                };

            }
        )
        .sort(
            (
                itemA,
                itemB
            ) =>

                Math.abs(
                    itemB.diferenca
                ) -

                Math.abs(
                    itemA.diferenca
                )

        );

}


/* =========================================================
   44. EXPLICAÇÃO DA DIFERENÇA
   ========================================================= */

function explicarDiferencaResultados(
    resultadoA,
    resultadoB,
    quantidade = 3
) {

    const comparacaoGeral =
        compararResultadosEstatisticos(
            resultadoA,
            resultadoB
        );

    const criterios =
        compararContribuicoes(
            resultadoA,
            resultadoB
        );

    const favoraveisA =
        criterios
            .filter(
                (item) =>
                    item.diferenca > 0
            )
            .slice(
                0,
                quantidade
            );

    const favoraveisB =
        criterios
            .filter(
                (item) =>
                    item.diferenca < 0
            )
            .slice(
                0,
                quantidade
            );

    return {

        vencedor:
            comparacaoGeral.vencedor,

        diferencaFinal:
            comparacaoGeral.diferenca,

        criteriosFavoraveisA:
            favoraveisA,

        criteriosFavoraveisB:
            favoraveisB,

        resumo:
            criarResumoComparacao(
                comparacaoGeral,
                favoraveisA,
                favoraveisB
            )

    };

}


/* =========================================================
   45. RESUMO TEXTUAL DA COMPARAÇÃO
   ========================================================= */

function criarResumoComparacao(
    comparacao,
    favoraveisA,
    favoraveisB
) {

    if (
        comparacao.vencedor ===
        "empate"
    ) {

        return (
            "Os dois jogadores possuem " +
            "a mesma nota final."
        );

    }

    const vencedor =
        comparacao.vencedor;

    const principais =
        vencedor === "A"
            ? favoraveisA
            : favoraveisB;

    const nomes =
        principais
            .map(
                (item) =>
                    item.nome
            )
            .join(", ");

    return (

        `O jogador ${vencedor} ficou ` +
        `à frente por ` +
        `${formatarNumeroEstatistico(
            comparacao.diferenca,
            1
        )} ponto(s).` +

        (
            nomes
                ? ` Os critérios que mais ` +
                  `contribuíram foram: ${nomes}.`
                : ""
        )

    );

}


/* =========================================================
   46. RESUMO DO MOTOR
   ========================================================= */

function obterResumoMotorEstatistico(
    codigoPosicao = "GOL"
) {

    const validacao =
        validarPesosEstatisticos(
            codigoPosicao
        );

    return {

        nome:
            MOTOR_ESTATISTICO.nome,

        nomeEspecializado:
            obterNomeDoMotor(
                codigoPosicao
            ),

        versao:
            MOTOR_ESTATISTICO.versao,

        status:
            MOTOR_ESTATISTICO.status,

        quantidadeCriterios:
            MOTOR_ESTATISTICO
                .quantidadeCriterios,

        posicao:
            codigoPosicao,

        totalPesos:
            validacao.total,

        pesosValidos:
            validacao.valido,

        criterios:
            Object.entries(
                validacao.pesos
            )
                .map(
                    (
                        [
                            criterio,
                            peso
                        ]
                    ) => ({

                        id:
                            criterio,

                        nome:
                            NOMES_CRITERIOS[
                                criterio
                            ] ||
                            criterio,

                        peso

                    })
                )

    };

}


/* =========================================================
   47. VALIDAÇÃO DOS PERFIS
   ========================================================= */

function validarMotoresPorPosicao() {

    const posicoes = [

        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC"

    ];

    return posicoes.map(
        (posicao) =>
            validarPesosEstatisticos(
                posicao
            )
    );

}


/* =========================================================
   48. INTERFACE PÚBLICA DA CALCULADORA
   ========================================================= */

const CalculadoraEstatistica = {

    analisarJogador(
        jogador
    ) {

        return analisarJogadorEstatisticamente(
            jogador
        );

    },

    analisarListaJogadores(
        jogadores
    ) {

        return analisarListaJogadoresEstatisticamente(
            jogadores
        );

    },

    calcularScore(
        jogador
    ) {

        return calcularScoreEstatistico(
            jogador
        );

    },

    extrairHistoricoPontuacoes(
        jogador
    ) {

        return extrairHistoricoPontuacoes(
            jogador
        );

    },

    calcularMedia(
        valores
    ) {

        return calcularMedia(
            valores
        );

    },

    calcularMediana(
        valores
    ) {

        return calcularMediana(
            valores
        );

    },

    calcularPiso(
        valores
    ) {

        return calcularPiso(
            valores
        );

    },

    calcularTeto(
        valores
    ) {

        return calcularTeto(
            valores
        );

    },

    calcularRegularidade(
        valores
    ) {

        return calcularRegularidade(
            valores
        );

    },

    calcularTendencia(
        valores
    ) {

        return calcularTendencia(
            valores
        );

    },

    executarMotor(
        dadosAnalise
    ) {

        return executarMotorEstatistico(
            dadosAnalise
        );

    }

};


/* =========================================================
   49. VALIDAÇÃO AUTOMÁTICA
   ========================================================= */

const VALIDACAO_MOTORES =
    validarMotoresPorPosicao();


console.info(
    "Motor Estatístico carregado:",
    {

        motor:
            MOTOR_ESTATISTICO,

        validacoes:
            VALIDACAO_MOTORES

    }
);
