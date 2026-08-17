/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Escalação
======================================================

Responsabilidades:

- montar escalações por formação;
- aplicar perfil estratégico;
- utilizar projeção calibrada quando disponível;
- preservar compatibilidade com projeção tradicional;
- respeitar patrimônio;
- limitar jogadores por clube;
- montar banco;
- gerar justificativa da escalação.

Prioridade da projeção:

1. projecaoCalibrada
2. projecao
3. projecaoOriginal

IMPORTANTE:

Este motor NÃO aplica novamente a calibração.

A calibração é calculada pelo MotorProjecao.

======================================================
*/

const MotorEscalacao = (() => {


    // ==================================================
    // FORMAÇÕES
    // ==================================================

    const FORMACOES = {

        "4-4-2": {

            GOL: 1,
            LAT: 2,
            ZAG: 2,
            MEI: 4,
            ATA: 2,
            TEC: 1

        },

        "3-4-3": {

            GOL: 1,
            LAT: 0,
            ZAG: 3,
            MEI: 4,
            ATA: 3,
            TEC: 1

        },

        "4-3-3": {

            GOL: 1,
            LAT: 2,
            ZAG: 2,
            MEI: 3,
            ATA: 3,
            TEC: 1

        }

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
                numero(valor) *
                fator
            )
            /
            fator
        );

    }


    // ==================================================
    // PROJEÇÃO UTILIZADA NA ESCALAÇÃO
    // ==================================================

    function obterProjecao(
        jogador
    ) {

        if (!jogador) {

            return 0;

        }


        /*
        --------------------------------------------------
        1. Projeção calibrada
        --------------------------------------------------
        */

        const calibrada =
            Number(
                jogador.projecaoCalibrada
            );


        if (
            Number.isFinite(
                calibrada
            )
        ) {

            return calibrada;

        }


        /*
        --------------------------------------------------
        2. Projeção padrão
        --------------------------------------------------
        */

        const projecao =
            Number(
                jogador.projecao
            );


        if (
            Number.isFinite(
                projecao
            )
        ) {

            return projecao;

        }


        /*
        --------------------------------------------------
        3. Projeção original
        --------------------------------------------------
        */

        const original =
            Number(
                jogador.projecaoOriginal
            );


        if (
            Number.isFinite(
                original
            )
        ) {

            return original;

        }


        return 0;

    }


    // ==================================================
    // PROJEÇÃO ORIGINAL
    // ==================================================

    function obterProjecaoOriginal(
        jogador
    ) {

        if (!jogador) {

            return 0;

        }


        const original =
            Number(
                jogador.projecaoOriginal
            );


        if (
            Number.isFinite(
                original
            )
        ) {

            return original;

        }


        const projecao =
            Number(
                jogador.projecao
            );


        if (
            Number.isFinite(
                projecao
            )
        ) {

            return projecao;

        }


        const calibrada =
            Number(
                jogador.projecaoCalibrada
            );


        if (
            Number.isFinite(
                calibrada
            )
        ) {

            return calibrada;

        }


        return 0;

    }


    // ==================================================
    // VERIFICAR CALIBRAÇÃO
    // ==================================================

    function possuiCalibracao(
        jogador
    ) {

        if (!jogador) {

            return false;

        }


        if (
            jogador.calibracaoAplicada ===
            true
        ) {

            return true;

        }


        if (
            jogador.calibracaoPosicao
            &&
            jogador.calibracaoPosicao.aplicada ===
            true
        ) {

            return true;

        }


        const original =
            Number(
                jogador.projecaoOriginal
            );


        const calibrada =
            Number(
                jogador.projecaoCalibrada
            );


        if (
            Number.isFinite(
                original
            )
            &&
            Number.isFinite(
                calibrada
            )
        ) {

            return (
                Math.abs(
                    calibrada -
                    original
                ) > 0.000001
            );

        }


        return false;

    }


    // ==================================================
    // PERFIL
    // ==================================================

    function obterPerfil(
        perfil
    ) {

        if (
            typeof PerfisEscalacao !==
            "undefined"
            &&
            PerfisEscalacao
        ) {

            if (
                PerfisEscalacao[
                    perfil
                ]
            ) {

                return PerfisEscalacao[
                    perfil
                ];

            }


            if (
                PerfisEscalacao
                    .equilibrado
            ) {

                return PerfisEscalacao
                    .equilibrado;

            }

        }


        /*
        --------------------------------------------------
        Fallback defensivo.

        Só será usado caso PerfisEscalacao não esteja
        disponível.
        --------------------------------------------------
        */

        return {

            pesoProjecao:
                1,

            pesoPiso:
                0,

            pesoTeto:
                0,

            pesoConfianca:
                0,

            pesoRisco:
                0

        };

    }


    // ==================================================
    // NOTA DO JOGADOR
    // ==================================================

    function nota(
        jogador,
        perfil
    ) {

        const p =
            obterPerfil(
                perfil
            );


        const projecao =
            obterProjecao(
                jogador
            );


        return (

              projecao
              *
              numero(
                  p.pesoProjecao
              )

            +

              numero(
                  jogador?.piso
              )
              *
              numero(
                  p.pesoPiso
              )

            +

              numero(
                  jogador?.teto
              )
              *
              numero(
                  p.pesoTeto
              )

            +

              numero(
                  jogador?.confianca
              )
              *
              numero(
                  p.pesoConfianca
              )

            +

              numero(
                  jogador?.risco
              )
              *
              numero(
                  p.pesoRisco
              )

        );

    }


    // ==================================================
    // SCORE DO TIME
    // ==================================================

    function scoreTime(
        time,
        perfil
    ) {

        if (
            !Array.isArray(
                time
            )
        ) {

            return 0;

        }


        return time.reduce(

            (
                soma,
                jogador
            ) =>

                soma +

                nota(
                    jogador,
                    perfil
                ),

            0

        );

    }


    // ==================================================
    // COMPARAÇÃO DE JOGADORES
    // ==================================================

    function compararJogadores(
        jogadorA,
        jogadorB,
        perfil
    ) {

        const diferencaNota =

            nota(
                jogadorB,
                perfil
            )

            -

            nota(
                jogadorA,
                perfil
            );


        if (
            diferencaNota !== 0
        ) {

            return diferencaNota;

        }


        /*
        --------------------------------------------------
        Primeiro desempate:
        projeção calibrada/final.
        --------------------------------------------------
        */

        const diferencaProjecao =

            obterProjecao(
                jogadorB
            )

            -

            obterProjecao(
                jogadorA
            );


        if (
            diferencaProjecao !== 0
        ) {

            return diferencaProjecao;

        }


        /*
        --------------------------------------------------
        Segundo desempate:
        confiança.
        --------------------------------------------------
        */

        const diferencaConfianca =

            numero(
                jogadorB?.confianca
            )

            -

            numero(
                jogadorA?.confianca
            );


        if (
            diferencaConfianca !== 0
        ) {

            return diferencaConfianca;

        }


        /*
        --------------------------------------------------
        Terceiro desempate:
        menor risco.
        --------------------------------------------------
        */

        const diferencaRisco =

            numero(
                jogadorA?.risco
            )

            -

            numero(
                jogadorB?.risco
            );


        if (
            diferencaRisco !== 0
        ) {

            return diferencaRisco;

        }


        /*
        --------------------------------------------------
        Quarto desempate:
        maior teto.
        --------------------------------------------------
        */

        const diferencaTeto =

            numero(
                jogadorB?.teto
            )

            -

            numero(
                jogadorA?.teto
            );


        if (
            diferencaTeto !== 0
        ) {

            return diferencaTeto;

        }


        /*
        --------------------------------------------------
        Desempate final determinístico.
        --------------------------------------------------
        */

        return String(

            jogadorA?.nome
            ||
            jogadorA?.apelido
            ||
            ""

        ).localeCompare(

            String(

                jogadorB?.nome
                ||
                jogadorB?.apelido
                ||
                ""

            ),

            "pt-BR"

        );

    }


    // ==================================================
    // MONTAR TIME
    // ==================================================

    function montar(

        jogadores,

        formacao,

        patrimonio = Infinity,

        perfil = "equilibrado"

    ) {


        const esquema =
            FORMACOES[
                formacao
            ];


        if (
            !esquema
        ) {

            return [];

        }


        if (
            !Array.isArray(
                jogadores
            )
        ) {

            return [];

        }


        const titulares = [];


        const clubes = {};


        let custo = 0;


        // ==============================================
        // POSIÇÕES
        // ==============================================


        for (
            const posicao of
            Object.keys(
                esquema
            )
        ) {


            const quantidade =
                numero(
                    esquema[
                        posicao
                    ]
                );


            /*
            ------------------------------------------------
            Formação pode possuir quantidade zero.
            Exemplo:
            LAT = 0 no 3-4-3.
            ------------------------------------------------
            */

            if (
                quantidade <= 0
            ) {

                continue;

            }


            const candidatos =
                jogadores

                    .filter(

                        jogador =>

                            jogador?.posicao ===
                            posicao

                    )

                    .slice()

                    .sort(

                        (
                            jogadorA,
                            jogadorB
                        ) =>

                            compararJogadores(

                                jogadorA,

                                jogadorB,

                                perfil

                            )

                    );


            let selecionadosPosicao =
                0;


            for (
                const jogador of
                candidatos
            ) {


                if (
                    selecionadosPosicao >=
                    quantidade
                ) {

                    break;

                }


                // ======================================
                // CLUBE
                // ======================================


                const clube =

                    jogador?.siglaClube

                    ||

                    jogador?.clube

                    ||

                    "SEM";


                if (
                    numero(
                        clubes[
                            clube
                        ]
                    ) >= 3
                ) {

                    continue;

                }


                // ======================================
                // PREÇO
                // ======================================


                const preco =
                    numero(
                        jogador?.preco
                    );


                if (
                    custo +
                    preco >
                    patrimonio
                ) {

                    continue;

                }


                // ======================================
                // SELEÇÃO
                // ======================================


                titulares.push(
                    jogador
                );


                clubes[
                    clube
                ] =

                    numero(
                        clubes[
                            clube
                        ]
                    )

                    +

                    1;


                custo +=
                    preco;


                selecionadosPosicao +=
                    1;

            }

        }


        return titulares;

    }


    // ==================================================
    // MONTAR BANCO
    // ==================================================

    function montarBanco(
        jogadores,
        titulares
    ) {

        const listaJogadores =
            Array.isArray(
                jogadores
            )
                ? jogadores
                : [];


        const listaTitulares =
            Array.isArray(
                titulares
            )
                ? titulares
                : [];


        const ids =
            new Set(

                listaTitulares.map(

                    jogador =>
                        jogador?.id

                )

            );


        return listaJogadores

            .filter(

                jogador =>

                    !ids.has(
                        jogador?.id
                    )

            )

            .slice()

            .sort(

                (
                    jogadorA,
                    jogadorB
                ) => {


                    const diferencaProjecao =

                        obterProjecao(
                            jogadorB
                        )

                        -

                        obterProjecao(
                            jogadorA
                        );


                    if (
                        diferencaProjecao !== 0
                    ) {

                        return diferencaProjecao;

                    }


                    const diferencaConfianca =

                        numero(
                            jogadorB?.confianca
                        )

                        -

                        numero(
                            jogadorA?.confianca
                        );


                    if (
                        diferencaConfianca !== 0
                    ) {

                        return diferencaConfianca;

                    }


                    return (

                        numero(
                            jogadorA?.risco
                        )

                        -

                        numero(
                            jogadorB?.risco
                        )

                    );

                }

            )

            .slice(
                0,
                5
            );

    }


    // ==================================================
    // RESUMO DA CALIBRAÇÃO DO TIME
    // ==================================================

    function obterResumoCalibracao(
        titulares
    ) {

        const jogadores =
            Array.isArray(
                titulares
            )
                ? titulares
                : [];


        let projecaoOriginal =
            0;


        let projecaoFinal =
            0;


        let jogadoresCalibrados =
            0;


        jogadores.forEach(
            jogador => {


                projecaoOriginal +=
                    obterProjecaoOriginal(
                        jogador
                    );


                projecaoFinal +=
                    obterProjecao(
                        jogador
                    );


                if (
                    possuiCalibracao(
                        jogador
                    )
                ) {

                    jogadoresCalibrados +=
                        1;

                }

            }
        );


        const diferenca =

            projecaoFinal -
            projecaoOriginal;


        const percentual =

            projecaoOriginal !== 0

                ?

                (
                    diferenca /
                    projecaoOriginal
                ) * 100

                :

                0;


        return {

            jogadores:
                jogadores.length,

            jogadoresCalibrados,

            projecaoOriginal:
                arredondar(
                    projecaoOriginal
                ),

            projecaoFinal:
                arredondar(
                    projecaoFinal
                ),

            diferenca:
                arredondar(
                    diferenca
                ),

            percentual:
                arredondar(
                    percentual
                )

        };

    }


    // ==================================================
    // JUSTIFICATIVA
    // ==================================================

    function gerarJustificativa(
        titulares,
        perfil
    ) {

        const jogadores =
            Array.isArray(
                titulares
            )
                ? titulares
                : [];


        const resumo =
            obterResumoCalibracao(
                jogadores
            );


        const projecao =
            resumo.projecaoFinal;


        let texto =

            `Escalação ${perfil} ` +

            `gerada automaticamente ` +

            `pelo motor estatístico ` +

            `com projeção total de ` +

            `${projecao.toFixed(2)} pontos.`;


        /*
        --------------------------------------------------
        Quando houver calibração, deixamos registrado
        que a projeção utilizada já passou pela camada
        científica aprovada.
        --------------------------------------------------
        */

        if (
            resumo.jogadoresCalibrados >
            0
        ) {

            texto +=

                ` A projeção considera ` +

                `calibração estatística por posição ` +

                `em ${resumo.jogadoresCalibrados} ` +

                `dos ${resumo.jogadores} jogadores.`;

        }


        return texto;

    }


    // ==================================================
    // DIAGNÓSTICO
    // ==================================================

    function diagnosticar(
        jogadores,
        formacao,
        patrimonio = Infinity,
        perfil = "equilibrado"
    ) {

        const titulares =
            montar(

                jogadores,

                formacao,

                patrimonio,

                perfil

            );


        const custo =
            titulares.reduce(

                (
                    soma,
                    jogador
                ) =>

                    soma +
                    numero(
                        jogador?.preco
                    ),

                0

            );


        const notaTotal =
            scoreTime(
                titulares,
                perfil
            );


        const calibracao =
            obterResumoCalibracao(
                titulares
            );


        return {

            formacao,

            perfil,

            patrimonio:
                Number.isFinite(
                    patrimonio
                )
                    ? patrimonio
                    : null,

            jogadores:
                titulares.length,

            custo:
                arredondar(
                    custo
                ),

            nota:
                arredondar(
                    notaTotal
                ),

            projecao:
                calibracao
                    .projecaoFinal,

            projecaoOriginal:
                calibracao
                    .projecaoOriginal,

            jogadoresCalibrados:
                calibracao
                    .jogadoresCalibrados,

            impactoCalibracao:
                calibracao
                    .diferenca,

            percentualCalibracao:
                calibracao
                    .percentual,

            completo:

                Boolean(

                    FORMACOES[
                        formacao
                    ]

                )

                &&

                titulares.length ===

                Object
                    .values(
                        FORMACOES[
                            formacao
                        ]
                    )
                    .reduce(

                        (
                            soma,
                            quantidade
                        ) =>

                            soma +
                            numero(
                                quantidade
                            ),

                        0

                    )

        };

    }


    // ==================================================
    // API PÚBLICA
    // ==================================================

    return {

        montar,

        montarBanco,

        gerarJustificativa,

        diagnosticar,

        obterProjecao,

        obterResumoCalibracao

    };


})();
