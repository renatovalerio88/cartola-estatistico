/*
======================================================
CARTOLA ESTATÍSTICO
Calibração Oficial de Projeção por Posição
======================================================

Objetivo:

Disponibilizar para o MotorProjecao os parâmetros
oficiais de calibração específicos de cada posição.

A calibração foi validada através de backtest A/B
progressivo e promovida pelo laboratório estatístico.

RESULTADO OFICIAL DO BACKTEST A/B

Rodadas: 21
Jogadores: 756

Modelo A - projeção original
MAE: 4.795

Modelo B - calibração por posição
MAE: 4.481

Melhora:
6.54%

Viés A:
3.268

Viés B:
2.666

DECISÃO:

CALIBRAÇÃO PROMOVIDA

GOL: MODELO B
LAT: MODELO B
ZAG: MODELO B
MEI: MODELO B
ATA: MODELO B
TEC: MODELO ORIGINAL

IMPORTANTE:

Esta camada:

- não recalcula pesos;
- não altera dados históricos;
- não consulta resultado futuro;
- não modifica o motor base;
- apenas fornece ao MotorProjecao os parâmetros
  oficialmente promovidos pelo laboratório.

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
        "2.0";


    const MODELO =
        "calibracao_posicoes_oficial_v1";


    const FONTE =
        "data/calibracao-posicoes-oficial.json";


    // ==================================================
    // RESULTADO OFICIAL DA VALIDAÇÃO A/B
    // ==================================================

    const VALIDACAO = {

        aprovada:
            true,

        promovida:
            true,

        decisao:
            "CALIBRACAO_PROMOVIDA",

        rodadas:
            21,

        jogadores:
            756,

        maeOriginal:
            4.795,

        maeCalibrado:
            4.481,

        melhoraPercentual:
            6.54,

        viesOriginal:
            3.268,

        viesCalibrado:
            2.666

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
    // CALIBRAÇÕES OFICIAIS PROMOVIDAS
    // ==================================================
    //
    // Fonte:
    //
    // data/calibracao-posicoes-oficial.json
    //
    // Resultado da promoção:
    //
    // GOL -> calibrado
    // LAT -> calibrado
    // ZAG -> calibrado
    // MEI -> calibrado
    // ATA -> calibrado
    // TEC -> original
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

            modelo:
                "B",

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.88281,

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
                    2.70,

                direcaoVies:
                    "superestimacao",

                intensidadeVies:
                    "muito_alto",

                mediaProjecao:
                    6.10,

                mediaReal:
                    3.40

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

            modelo:
                "B",

            prioridade:
                "media",

            fatorMultiplicativo:
                0.91944,

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

            modelo:
                "B",

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.8675,

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

            modelo:
                "B",

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.89528,

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

            modelo:
                "B",

            prioridade:
                "alta",

            fatorMultiplicativo:
                0.855,

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

            fonte:
                FONTE

        },


        // ==============================================
        // TÉCNICO
        // ==============================================
        //
        // O backtest decidiu manter o modelo original.
        //
        // Portanto:
        //
        // fator = 1
        // aditivo = 0
        // aplicada = false
        //
        // ==============================================

        TEC: {

            posicao:
                "TEC",

            aplicada:
                false,

            modelo:
                "ORIGINAL",

            prioridade:
                "baixa",

            fatorMultiplicativo:
                1.0,

            correcaoAditiva:
                0.0,

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

        valor =
            Number(
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

            modelo:
                "ORIGINAL",

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


        /*
        --------------------------------------------------
        Caso a posição NÃO esteja calibrada,
        obrigatoriamente devolvemos fator neutro.

        Isso garante que TEC e qualquer posição futura
        não sofram alteração acidental.
        --------------------------------------------------
        */

        if (
            calibracao.aplicada !==
                true
        ) {

            return {

                ...calibracao,

                aplicada:
                    false,

                fatorMultiplicativo:
                    1,

                correcaoAditiva:
                    0

            };

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
    // VERIFICAR SE A CALIBRAÇÃO É APLICADA
    // ==================================================

    function estaCalibrada(
        posicao
    ) {

        const calibracao =
            obter(
                posicao
            );


        return (
            calibracao.aplicada ===
            true
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
                    Number(
                        projecao.toFixed(
                            2
                        )
                    ),

                projecaoCalibrada:
                    Number(
                        projecao.toFixed(
                            2
                        )
                    ),

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
    // LISTAR SOMENTE POSIÇÕES CALIBRADAS
    // ==================================================

    function listarCalibradas() {

        return listar()
            .filter(

                item =>
                    item.aplicada ===
                    true

            );

    }


    // ==================================================
    // RESUMO
    // ==================================================

    function resumo() {

        const calibradas =
            listarCalibradas();


        return {

            modelo:
                MODELO,

            versao:
                VERSAO,

            fonte:
                FONTE,

            ativa:
                true,

            oficial:
                true,

            validacao: {

                ...VALIDACAO

            },

            limites: {

                ...LIMITES

            },

            quantidadePosicoes:
                Object.keys(
                    CALIBRACOES
                ).length,

            quantidadeCalibradas:
                calibradas.length,

            posicoes:
                Object.keys(
                    CALIBRACOES
                ),

            posicoesCalibradas:
                calibradas.map(
                    item =>
                        item.posicao
                ),

            posicoesOriginais:
                listar()
                    .filter(
                        item =>
                            !item.aplicada
                    )
                    .map(
                        item =>
                            item.posicao
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

            fonte:
                FONTE,

            validacao:
                {

                    ...VALIDACAO

                },

            posicoes:
                posicoes.map(

                    item => ({

                        posicao:
                            item.posicao,

                        modelo:
                            item.modelo,

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
    // VALIDAR CONFIGURAÇÃO
    // ==================================================

    function validar() {

        const problemas =
            [];


        Object
            .keys(
                CALIBRACOES
            )
            .forEach(

                posicao => {

                    const item =
                        obter(
                            posicao
                        );


                    if (
                        item.aplicada
                    ) {

                        if (
                            !Number.isFinite(
                                Number(
                                    item.fatorMultiplicativo
                                )
                            )
                        ) {

                            problemas.push(
                                `${posicao}: fator inválido`
                            );

                        }


                        if (
                            !Number.isFinite(
                                Number(
                                    item.correcaoAditiva
                                )
                            )
                        ) {

                            problemas.push(
                                `${posicao}: correção aditiva inválida`
                            );

                        }

                    }

                }

            );


        /*
        --------------------------------------------------
        Regra específica da promoção atual:

        TEC obrigatoriamente deve continuar ORIGINAL.
        --------------------------------------------------
        */

        const tecnico =
            obter(
                "TEC"
            );


        if (
            tecnico.aplicada
            ||
            tecnico.fatorMultiplicativo !== 1
            ||
            tecnico.correcaoAditiva !== 0
        ) {

            problemas.push(
                "TEC deveria permanecer no modelo original."
            );

        }


        return {

            valido:
                problemas.length === 0,

            problemas,

            modelo:
                MODELO,

            versao:
                VERSAO

        };

    }


    // ==================================================
    // API PÚBLICA
    // ==================================================

    return {

        obter,

        possui,

        estaCalibrada,

        aplicar,

        listar,

        listarCalibradas,

        resumo,

        diagnostico,

        validar,

        normalizarPosicao

    };


})();
