/*
======================================================
CARTOLA ESTATÍSTICO
Calibração de Projeção por Posição
======================================================

Objetivo:

Disponibilizar para o MotorProjecao os parâmetros de
calibração específicos de cada posição.

A calibração foi construída a partir do laboratório
histórico e posteriormente validada através de
backtest A/B progressivo.

Resultado do A/B:

Modelo A - projeção original
MAE: 4.882

Modelo B - calibração por posição
MAE: 4.555

Melhora:
6.69%

Rodadas:
- Vitórias A: 6
- Vitórias B: 14
- Empates: 1

Decisão científica:
PROMOVER_CALIBRACAO

IMPORTANTE:

Esta camada:

- não recalcula pesos;
- não altera dados históricos;
- não consulta resultado futuro;
- apenas fornece os parâmetros que já foram validados.

Fórmula:

projecaoCalibrada =
    (projecaoOriginal * fatorMultiplicativo)
    + correcaoAditiva

======================================================
*/

const MotorCalibracaoPosicao = (() => {


    // ==================================================
    // VERSÃO
    // ==================================================

    const VERSAO =
        "1.0";


    const MODELO =
        "calibracao_posicoes_promovida_v1";


    const FONTE =
        "backtest_ab_calibracao_v1";


    // ==================================================
    // RESULTADO DA VALIDAÇÃO A/B
    // ==================================================

    const VALIDACAO = {

        aprovada:
            true,

        decisao:
            "PROMOVER_CALIBRACAO",

        maeOriginal:
            4.882,

        maeCalibrado:
            4.555,

        melhoraPercentual:
            6.69,

        viesOriginal:
            3.362,

        viesCalibrado:
            2.735,

        rodadas: {

            vitoriasOriginal:
                6,

            vitoriasCalibrado:
                14,

            empates:
                1

        }

    };


    // ==================================================
    // LIMITES DE SEGURANÇA
    // ==================================================

    const LIMITES = {

        fatorMinimo:
            0.85,

        fatorMaximo:
            1.15,

        correcaoAditivaMinima:
            -1.5,

        correcaoAditivaMaxima:
            1.5

    };


    // ==================================================
    // CALIBRAÇÕES PROMOVIDAS
    // ==================================================
    //
    // Os valores abaixo vêm diretamente de:
    //
    // data/calibracao-posicoes-candidata.json
    //
    // Nenhum valor foi inventado nesta camada.
    //
    // ==================================================

    const CALIBRACOES = {


        // ==============================================
        // GOLEIRO
        // ==============================================

        GOL: {

            posicao:
                "GOL",

            aplicada:
                true,

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.86181,

            correcaoAditiva:
                -0.945,

            confianca:
                "moderada",

            fatorConfianca:
                0.7,

            amostras:
                66,

            diagnostico: {

                mae:
                    5.69,

                vies:
                    2.7,

                direcaoVies:
                    "superestimacao",

                intensidadeVies:
                    "muito_alto",

                mediaProjecao:
                    6.10,

                mediaReal:
                    3.40

            },

            auditoria: {

                taxaIdentificacao:
                    100,

                topN:
                    6.35,

                top5:
                    23.81,

                top10:
                    61.90,

                percentilMedio:
                    46.85,

                eficienciaCapturaPontos:
                    27.75

            },

            fonte:
                FONTE

        },


        // ==============================================
        // LATERAL
        // ==============================================

        LAT: {

            posicao:
                "LAT",

            aplicada:
                true,

            prioridade:
                "media",

            fatorMultiplicativo:
                0.90894,

            correcaoAditiva:
                -0.50225,

            confianca:
                "moderada",

            fatorConfianca:
                0.7,

            amostras:
                88,

            diagnostico: {

                mae:
                    5.64,

                vies:
                    2.05,

                direcaoVies:
                    "superestimacao",

                intensidadeVies:
                    "alto",

                mediaProjecao:
                    6.96,

                mediaReal:
                    4.92

            },

            auditoria: {

                taxaIdentificacao:
                    100,

                topN:
                    4.76,

                top5:
                    11.90,

                top10:
                    20.24,

                percentilMedio:
                    56.82,

                eficienciaCapturaPontos:
                    32.82

            },

            fonte:
                FONTE

        },


        // ==============================================
        // ZAGUEIRO
        // ==============================================

        ZAG: {

            posicao:
                "ZAG",

            aplicada:
                true,

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.85,

            correcaoAditiva:
                -1.305,

            confianca:
                "alta",

            fatorConfianca:
                1.0,

            amostras:
                132,

            diagnostico: {

                mae:
                    5.43,

                vies:
                    2.61,

                direcaoVies:
                    "superestimacao",

                intensidadeVies:
                    "muito_alto",

                mediaProjecao:
                    5.37,

                mediaReal:
                    2.75

            },

            auditoria: {

                taxaIdentificacao:
                    100,

                topN:
                    2.38,

                top5:
                    3.97,

                top10:
                    19.84,

                percentilMedio:
                    47.35,

                eficienciaCapturaPontos:
                    21.97

            },

            fonte:
                FONTE

        },


        // ==============================================
        // MEIA
        // ==============================================

        MEI: {

            posicao:
                "MEI",

            aplicada:
                true,

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.88028,

            correcaoAditiva:
                -0.294,

            confianca:
                "alta",

            fatorConfianca:
                1.0,

            amostras:
                264,

            diagnostico: {

                mae:
                    6.20,

                vies:
                    1.47,

                direcaoVies:
                    "superestimacao",

                intensidadeVies:
                    "moderado",

                mediaProjecao:
                    6.41,

                mediaReal:
                    4.95

            },

            auditoria: {

                taxaIdentificacao:
                    100,

                topN:
                    12.70,

                top5:
                    13.49,

                top10:
                    23.02,

                percentilMedio:
                    62.93,

                eficienciaCapturaPontos:
                    35.48

            },

            fonte:
                FONTE

        },


        // ==============================================
        // ATACANTE
        // ==============================================

        ATA: {

            posicao:
                "ATA",

            aplicada:
                true,

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.85,

            correcaoAditiva:
                -1.455,

            confianca:
                "alta",

            fatorConfianca:
                1.0,

            amostras:
                176,

            diagnostico: {

                mae:
                    6.62,

                vies:
                    2.91,

                direcaoVies:
                    "superestimacao",

                intensidadeVies:
                    "muito_alto",

                mediaProjecao:
                    8.13,

                mediaReal:
                    5.23

            },

            auditoria: {

                taxaIdentificacao:
                    100,

                topN:
                    8.33,

                top5:
                    10.71,

                top10:
                    23.21,

                percentilMedio:
                    64.40,

                eficienciaCapturaPontos:
                    31.80

            },

            fonte:
                FONTE

        },


        // ==============================================
        // TÉCNICO
        // ==============================================

        TEC: {

            posicao:
                "TEC",

            aplicada:
                true,

            prioridade:
                "baixa",

            fatorMultiplicativo:
                0.98865,

            correcaoAditiva:
                0,

            confianca:
                "moderada",

            fatorConfianca:
                0.7,

            amostras:
                66,

            diagnostico: {

                mae:
                    3.40,

                vies:
                    0.26,

                direcaoVies:
                    "equilibrado",

                intensidadeVies:
                    "baixo",

                mediaProjecao:
                    5.61,

                mediaReal:
                    5.35

            },

            auditoria: {

                taxaIdentificacao:
                    100,

                topN:
                    4.76,

                top5:
                    36.51,

                top10:
                    66.67,

                percentilMedio:
                    57.22,

                eficienciaCapturaPontos:
                    56.54

            },

            fonte:
                FONTE

        }

    };


    // ==================================================
    // ALIASES DE POSIÇÃO
    // ==================================================

    const ALIASES = {

        GOL:
            "GOL",

        GOLEIRO:
            "GOL",


        LAT:
            "LAT",

        LATERAL:
            "LAT",


        ZAG:
            "ZAG",

        ZAGUEIRO:
            "ZAG",


        MEI:
            "MEI",

        MEIA:
            "MEI",


        ATA:
            "ATA",

        ATACANTE:
            "ATA",


        TEC:
            "TEC",

        TECNICO:
            "TEC",

        "TÉCNICO":
            "TEC"

    };


    // ==================================================
    // UTILIDADES
    // ==================================================

    function numero(
        valor,
        padrao = 0
    ) {

        valor = Number(
            valor
        );

        return Number.isFinite(
            valor
        )
            ? valor
            : padrao;

    }


    function limitar(
        valor,
        minimo,
        maximo
    ) {

        return Math.max(

            minimo,

            Math.min(
                maximo,
                valor
            )

        );

    }


    function normalizarTexto(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .trim()
            .toUpperCase();

    }


    function removerAcentos(
        texto
    ) {

        try {

            return texto
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                );

        } catch (
            erro
        ) {

            return texto;

        }

    }


    // ==================================================
    // NORMALIZAR POSIÇÃO
    // ==================================================

    function normalizarPosicao(
        posicao
    ) {

        let texto =
            normalizarTexto(
                posicao
            );


        if (
            ALIASES[
                texto
            ]
        ) {

            return ALIASES[
                texto
            ];

        }


        texto =
            removerAcentos(
                texto
            );


        if (
            ALIASES[
                texto
            ]
        ) {

            return ALIASES[
                texto
            ];

        }


        return texto;

    }


    // ==================================================
    // CALIBRAÇÃO NEUTRA
    // ==================================================

    function calibracaoNeutra(
        posicao
    ) {

        return {

            posicao:
                normalizarPosicao(
                    posicao
                ),

            aplicada:
                false,

            prioridade:
                "nenhuma",

            fatorMultiplicativo:
                1,

            correcaoAditiva:
                0,

            confianca:
                null,

            fatorConfianca:
                0,

            amostras:
                0,

            diagnostico:
                null,

            auditoria:
                null,

            fonte:
                "calibracao_neutra"

        };

    }


    // ==================================================
    // SANITIZAÇÃO
    // ==================================================

    function sanitizarCalibracao(
        calibracao
    ) {

        if (
            !calibracao
            ||
            typeof calibracao !==
            "object"
        ) {

            return null;

        }


        const fator =
            limitar(

                numero(

                    calibracao.fatorMultiplicativo,

                    1

                ),

                LIMITES.fatorMinimo,

                LIMITES.fatorMaximo

            );


        const aditivo =
            limitar(

                numero(

                    calibracao.correcaoAditiva,

                    0

                ),

                LIMITES.correcaoAditivaMinima,

                LIMITES.correcaoAditivaMaxima

            );


        return {

            ...calibracao,

            fatorMultiplicativo:
                fator,

            correcaoAditiva:
                aditivo

        };

    }


    // ==================================================
    // OBTER CALIBRAÇÃO
    // ==================================================

    function obter(
        posicao
    ) {

        const chave =
            normalizarPosicao(
                posicao
            );


        const calibracao =
            CALIBRACOES[
                chave
            ];


        if (
            !calibracao
        ) {

            return calibracaoNeutra(
                chave
            );

        }


        const segura =
            sanitizarCalibracao(
                calibracao
            );


        if (
            !segura
        ) {

            return calibracaoNeutra(
                chave
            );

        }


        return {

            ...segura

        };

    }


    // ==================================================
    // VERIFICAR DISPONIBILIDADE
    // ==================================================

    function possui(
        posicao
    ) {

        const chave =
            normalizarPosicao(
                posicao
            );


        return Boolean(
            CALIBRACOES[
                chave
            ]
        );

    }


    // ==================================================
    // APLICAR DIRETAMENTE
    // ==================================================

    function aplicar(
        posicao,
        projecaoOriginal
    ) {

        const projecao =
            Math.max(

                0,

                numero(
                    projecaoOriginal
                )

            );


        const calibracao =
            obter(
                posicao
            );


        if (
            !calibracao.aplicada
        ) {

            return {

                projecaoOriginal:
                    projecao,

                projecaoCalibrada:
                    projecao,

                diferenca:
                    0,

                percentual:
                    0,

                calibracao

            };

        }


        let calibrada =

            (
                projecao *
                calibracao.fatorMultiplicativo
            )

            +

            calibracao.correcaoAditiva;


        calibrada =
            Math.max(
                0,
                calibrada
            );


        const diferenca =
            calibrada -
            projecao;


        const percentual =

            projecao !== 0

                ?

                (
                    diferenca /
                    projecao
                ) * 100

                :

                0;


        return {

            projecaoOriginal:
                Number(
                    projecao.toFixed(
                        2
                    )
                ),

            projecaoCalibrada:
                Number(
                    calibrada.toFixed(
                        2
                    )
                ),

            diferenca:
                Number(
                    diferenca.toFixed(
                        2
                    )
                ),

            percentual:
                Number(
                    percentual.toFixed(
                        2
                    )
                ),

            calibracao

        };

    }


    // ==================================================
    // LISTAR CALIBRAÇÕES
    // ==================================================

    function listar() {

        return Object
            .keys(
                CALIBRACOES
            )
            .map(

                posicao =>

                    obter(
                        posicao
                    )

            );

    }


    // ==================================================
    // RESUMO
    // ==================================================

    function resumo() {

        return {

            modelo:
                MODELO,

            versao:
                VERSAO,

            fonte:
                FONTE,

            ativa:
                true,

            validacao: {

                ...VALIDACAO,

                rodadas: {

                    ...VALIDACAO.rodadas

                }

            },

            limites: {

                ...LIMITES

            },

            quantidadePosicoes:
                Object.keys(
                    CALIBRACOES
                ).length,

            posicoes:
                Object.keys(
                    CALIBRACOES
                )

        };

    }


    // ==================================================
    // DIAGNÓSTICO
    // ==================================================

    function diagnostico() {

        const posicoes =
            listar();


        return {

            modelo:
                MODELO,

            versao:
                VERSAO,

            validacao:
                VALIDACAO,

            posicoes:
                posicoes.map(

                    item => ({

                        posicao:
                            item.posicao,

                        aplicada:
                            item.aplicada,

                        prioridade:
                            item.prioridade,

                        fator:
                            item.fatorMultiplicativo,

                        aditivo:
                            item.correcaoAditiva,

                        confianca:
                            item.confianca,

                        amostras:
                            item.amostras,

                        mae:
                            item.diagnostico
                            ?.mae
                            ??
                            null,

                        vies:
                            item.diagnostico
                            ?.vies
                            ??
                            null

                    })

                )

        };

    }


    // ==================================================
    // API PÚBLICA
    // ==================================================

    return {

        obter,

        possui,

        aplicar,

        listar,

        resumo,

        diagnostico,

        normalizarPosicao

    };


})();
