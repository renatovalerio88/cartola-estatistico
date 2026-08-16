/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Projeção
======================================================

Responsabilidades:

1. Calcular a projeção original do jogador.
2. Preservar a projeção original para auditoria.
3. Aplicar, quando disponível, a calibração por posição.
4. Retornar projeção original e calibrada.
5. Manter compatibilidade com o restante do sistema.

A calibração por posição foi validada no laboratório
através de backtest A/B progressivo.

IMPORTANTE:

A ausência da camada MotorCalibracaoPosicao NÃO altera
o comportamento atual do sistema.

Nesse caso:

projecaoOriginal = projecaoCalibrada = projecao

======================================================
*/

const MotorProjecao = (() => {


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


    function arredondar(
        valor,
        casas = 2
    ) {

        const fator =
            Math.pow(
                10,
                casas
            );

        return (
            Math.round(
                numero(valor) * fator
            ) / fator
        );

    }


    // ==================================================
    // NORMALIZAÇÃO DO SCORE
    // ==================================================

    function normalizarScore(
        valor
    ) {

        /*
        --------------------------------------------------
        O score estatístico do projeto trabalha na escala
        de 0 a 100.

        Alguns registros podem chegar acima de 100 quando
        uma camada anterior entrega soma bruta de critérios
        em vez da nota normalizada. Isso fazia o MotorProjecao
        interpretar, por exemplo, score 1080 como 1080 pontos
        de nota e gerar projeções absurdas.

        A proteção abaixo NÃO muda scores válidos. Apenas
        impede que valores fora da escala oficial contaminem
        a projeção.
        --------------------------------------------------
        */

        return limitar(
            numero(
                valor,
                0
            ),
            0,
            100
        );

    }


    // ==================================================
    // POSIÇÃO
    // ==================================================

    function obterPosicao(
        jogador
    ) {

        const posicao =

            jogador.posicao

            ??

            jogador.posicaoSigla

            ??

            jogador.posicao_nome

            ??

            jogador.posicaoNome

            ??

            "";


        return String(
            posicao
        )
            .trim()
            .toUpperCase();

    }


    // ==================================================
    // VOLATILIDADE
    // ==================================================

    function calcularVolatilidade(
        historico
    ) {

        if (
            !Array.isArray(
                historico
            )
            ||
            historico.length < 2
        ) {

            return 0;

        }


        const pontos =
            historico.map(

                rodada =>

                    numero(

                        rodada.pontuacao
                        ??
                        rodada.pontos

                    )

            );


        if (
            pontos.length < 2
        ) {

            return 0;

        }


        const media =

            pontos.reduce(

                (
                    soma,
                    valor
                ) =>

                    soma + valor,

                0

            )

            /

            pontos.length;


        const variancia =

            pontos.reduce(

                (
                    soma,
                    valor
                ) =>

                    soma +

                    Math.pow(
                        valor - media,
                        2
                    ),

                0

            )

            /

            pontos.length;


        return Math.sqrt(
            variancia
        );

    }


    // ==================================================
    // PESOS BASE
    // ==================================================

    function obterPesosBase() {

        if (
            typeof MotorCalibracao !==
            "undefined"
            &&
            MotorCalibracao
            &&
            typeof MotorCalibracao.obter ===
            "function"
        ) {

            const pesos =
                MotorCalibracao.obter();


            if (
                pesos
                &&
                typeof pesos ===
                "object"
            ) {

                return pesos;

            }

        }


        /*
        --------------------------------------------------
        Fallback de segurança.

        Normalmente não deve ser utilizado, pois o projeto
        já possui MotorCalibracao.

        Existe apenas para impedir quebra completa do motor
        caso a camada de calibração base não seja carregada.
        --------------------------------------------------
        */

        return {

            score:
                0,

            media3:
                0,

            media5:
                0,

            mediaGeral:
                0,

            piso:
                0,

            teto:
                0

        };

    }


    // ==================================================
    // PROJEÇÃO ORIGINAL
    // ==================================================

    function calcularProjecaoOriginal(
        jogador
    ) {

        const scoreBruto =
            numero(
                jogador.score
            );


        const score =
            normalizarScore(
                scoreBruto
            );


        const media3 =
            numero(
                jogador.media3
            );


        const media5 =
            numero(
                jogador.media5
            );


        const mediaGeral =
            numero(
                jogador.mediaGeral
            );


        const piso =
            numero(
                jogador.piso
            );


        const teto =
            numero(
                jogador.teto
            );


        const confianca =
            numero(
                jogador.confianca,
                50
            );


        const risco =
            numero(
                jogador.risco,
                50
            );


        const tendencia =
            numero(
                jogador.tendencia
            );


        const regularidade =
            numero(
                jogador.regularidade,
                50
            );


        const historico =
            Array.isArray(
                jogador.historico
            )
                ? jogador.historico
                : [];


        const volatilidade =
            calcularVolatilidade(
                historico
            );


        // ==============================================
        // PROJEÇÃO BASE
        // ==============================================

        const pesos =
            obterPesosBase();


        let projecao =

              score *
              numero(
                  pesos.score
              )

            +

              media3 *
              numero(
                  pesos.media3
              )

            +

              media5 *
              numero(
                  pesos.media5
              )

            +

              mediaGeral *
              numero(
                  pesos.mediaGeral
              )

            +

              piso *
              numero(
                  pesos.piso
              )

            +

              teto *
              numero(
                  pesos.teto
              );


        // ==============================================
        // AJUSTE DE REGULARIDADE
        // ==============================================

        projecao *=

            0.85 +

            (
                regularidade /
                1000
            );


        // ==============================================
        // AJUSTE DE CONFIANÇA
        // ==============================================

        projecao *=

            0.90 +

            (
                confianca /
                1000
            );


        // ==============================================
        // AJUSTE DE TENDÊNCIA
        // ==============================================

        projecao *=

            0.95 +

            (
                tendencia /
                1000
            );


        // ==============================================
        // PENALIZAÇÃO DE RISCO
        // ==============================================

        projecao *=

            1 -

            (
                risco /
                350
            );


        // ==============================================
        // PENALIZAÇÃO DE VOLATILIDADE
        // ==============================================

        projecao *=

            Math.max(

                0.85,

                1 -

                (
                    volatilidade /
                    100
                )

            );


        // ==============================================
        // PROTEÇÃO FINAL
        // ==============================================

        projecao =
            Math.max(
                0,
                projecao
            );


        return {

            projecao,

            score,

            scoreBruto,

            media3,

            media5,

            mediaGeral,

            piso,

            teto,

            confianca,

            risco,

            tendencia,

            regularidade,

            volatilidade

        };

    }


    // ==================================================
    // CALIBRAÇÃO POR POSIÇÃO
    // ==================================================

    function obterCalibracaoPosicao(
        jogador
    ) {

        const posicao =
            obterPosicao(
                jogador
            );


        const padrao = {

            disponivel:
                false,

            aplicada:
                false,

            posicao,

            fatorMultiplicativo:
                1,

            correcaoAditiva:
                0,

            fonte:
                "sem_calibracao"

        };


        if (
            typeof MotorCalibracaoPosicao ===
            "undefined"
            ||
            !MotorCalibracaoPosicao
        ) {

            return padrao;

        }


        try {


            let calibracao = null;


            if (
                typeof MotorCalibracaoPosicao.obter ===
                "function"
            ) {

                calibracao =
                    MotorCalibracaoPosicao.obter(
                        posicao
                    );

            }


            if (
                !calibracao
                ||
                typeof calibracao !==
                "object"
            ) {

                return padrao;

            }


            const fatorMultiplicativo =
                limitar(

                    numero(

                        calibracao.fatorMultiplicativo,

                        1

                    ),

                    0.50,

                    1.50

                );


            const correcaoAditiva =
                limitar(

                    numero(

                        calibracao.correcaoAditiva,

                        0

                    ),

                    -5,

                    5

                );


            const aplicada =

                calibracao.aplicada !==
                false

                &&

                (
                    fatorMultiplicativo !== 1
                    ||
                    correcaoAditiva !== 0
                );


            return {

                disponivel:
                    true,

                aplicada,

                posicao,

                fatorMultiplicativo,

                correcaoAditiva,

                confianca:
                    calibracao.confianca
                    ??
                    null,

                amostras:
                    numero(
                        calibracao.amostras,
                        0
                    ),

                fonte:
                    calibracao.fonte
                    ??
                    "calibracao_posicao"

            };


        } catch (
            erro
        ) {


            console.warn(

                "[MotorProjecao] " +
                "Falha ao obter calibração " +
                "da posição:",

                posicao,

                erro

            );


            return padrao;

        }

    }


    // ==================================================
    // APLICAR CALIBRAÇÃO
    // ==================================================

    function aplicarCalibracaoPosicao(
        projecaoOriginal,
        calibracao
    ) {

        if (
            !calibracao
            ||
            !calibracao.aplicada
        ) {

            return projecaoOriginal;

        }


        const fatorMultiplicativo =
            numero(

                calibracao.fatorMultiplicativo,

                1

            );


        const correcaoAditiva =
            numero(

                calibracao.correcaoAditiva,

                0

            );


        let projecaoCalibrada =

            (
                projecaoOriginal *
                fatorMultiplicativo
            )

            +

            correcaoAditiva;


        projecaoCalibrada =
            Math.max(
                0,
                projecaoCalibrada
            );


        return projecaoCalibrada;

    }


    // ==================================================
    // CÁLCULO PRINCIPAL
    // ==================================================

    function calcular(
        jogador
    ) {

        jogador =
            jogador || {};


        const base =
            calcularProjecaoOriginal(
                jogador
            );


        const projecaoOriginal =
            base.projecao;


        const calibracao =
            obterCalibracaoPosicao(
                jogador
            );


        const projecaoCalibrada =
            aplicarCalibracaoPosicao(

                projecaoOriginal,

                calibracao

            );


        const projecaoFinal =
            projecaoCalibrada;


        const diferencaCalibracao =

            projecaoCalibrada -
            projecaoOriginal;


        const percentualCalibracao =

            projecaoOriginal !== 0

                ?

                (
                    diferencaCalibracao /
                    projecaoOriginal
                ) * 100

                :

                0;


        return {

            // ==========================================
            // PROJEÇÃO UTILIZADA PELO SISTEMA
            // ==========================================

            projecao:
                arredondar(
                    projecaoFinal
                ),


            // ==========================================
            // AUDITORIA A/B
            // ==========================================

            projecaoOriginal:
                arredondar(
                    projecaoOriginal
                ),


            projecaoCalibrada:
                arredondar(
                    projecaoCalibrada
                ),


            diferencaCalibracao:
                arredondar(
                    diferencaCalibracao
                ),


            percentualCalibracao:
                arredondar(
                    percentualCalibracao
                ),


            calibracaoAplicada:
                Boolean(
                    calibracao.aplicada
                ),


            calibracaoPosicao: {

                disponivel:
                    Boolean(
                        calibracao.disponivel
                    ),

                aplicada:
                    Boolean(
                        calibracao.aplicada
                    ),

                posicao:
                    calibracao.posicao,

                fatorMultiplicativo:
                    arredondar(
                        calibracao.fatorMultiplicativo,
                        5
                    ),

                correcaoAditiva:
                    arredondar(
                        calibracao.correcaoAditiva,
                        5
                    ),

                confianca:
                    calibracao.confianca
                    ??
                    null,

                amostras:
                    numero(
                        calibracao.amostras,
                        0
                    ),

                fonte:
                    calibracao.fonte
                    ??
                    null

            },


            // ==========================================
            // DIAGNÓSTICO DO SCORE
            // ==========================================

            scoreProjecao:
                arredondar(
                    base.score
                ),


            scoreBrutoProjecao:
                arredondar(
                    base.scoreBruto
                ),


            scoreLimitado:
                Boolean(
                    base.scoreBruto !==
                    base.score
                ),


            // ==========================================
            // MÉTRICAS EXISTENTES
            // ==========================================

            piso:
                arredondar(
                    base.piso
                ),


            teto:
                arredondar(
                    base.teto
                ),


            media3:
                arredondar(
                    base.media3
                ),


            media5:
                arredondar(
                    base.media5
                ),


            mediaGeral:
                arredondar(
                    base.mediaGeral
                ),


            // ==========================================
            // DIAGNÓSTICO
            // ==========================================

            volatilidade:
                arredondar(
                    base.volatilidade
                )

        };

    }


    // ==================================================
    // API PÚBLICA
    // ==================================================

    return {

        calcular

    };


})();
