/*
=========================================================
CARTOLA ESTATÍSTICO
OTIMIZADOR DE ESCALAÇÃO POR PATRIMÔNIO

Versão:
otimizador_patrimonio_frontend_v1

Objetivo:

Receber um patrimônio exato informado no site, por exemplo:

C$ 143,72

e encontrar a melhor combinação possível de jogadores
para a próxima rodada, respeitando:

- orçamento máximo exato;
- formação;
- posição;
- 11 jogadores + 1 técnico;
- máximo de jogadores por clube;
- estratégia:
    Conservador
    Equilibrado
    Agressivo

Fonte:

data/otimizador-rodada.json

IMPORTANTE:

- Não faz backtest.
- Não usa resultado futuro.
- Não obriga gastar todo o patrimônio.
- Não arredonda patrimônio para faixas.
- Não altera o modelo estatístico.
- Executa somente no navegador para a rodada atual.

=========================================================
*/


const OtimizadorPatrimonio = (() => {


    /*
    =====================================================
    CONFIGURAÇÃO
    =====================================================
    */


    const ARQUIVO_BASE =
        "data/otimizador-rodada.json";


    const LIMITE_PADRAO_CLUBE =
        3;


    const QUANTIDADE_TITULARES =
        12;


    const ORDEM_POSICOES = [
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC"
    ];


    /*
    =====================================================
    CACHE
    =====================================================
    */


    let baseCache = null;


    /*
    =====================================================
    UTILITÁRIOS
    =====================================================
    */


    function numero(
        valor,
        padrao = 0
    ) {

        const convertido =
            Number(valor);


        return Number.isFinite(
            convertido
        )
            ? convertido
            : padrao;

    }



    function inteiro(
        valor,
        padrao = 0
    ) {

        const convertido =
            parseInt(
                valor,
                10
            );


        return Number.isFinite(
            convertido
        )
            ? convertido
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
                (
                    numero(valor)
                    +
                    Number.EPSILON
                )
                *
                fator
            )
            /
            fator
        );

    }



    function normalizarTexto(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .trim();

    }



    function normalizarEstrategia(
        estrategia
    ) {

        return normalizarTexto(
            estrategia
        )
            .toLowerCase();

    }



    function normalizarPosicao(
        posicao
    ) {

        return normalizarTexto(
            posicao
        )
            .toUpperCase();

    }



    function obterId(
        jogador
    ) {

        return (
            jogador?.id
            ??
            jogador?.atletaId
            ??
            jogador?.atleta_id
            ??
            null
        );

    }



    function obterClubeId(
        jogador
    ) {

        const valor =
            jogador?.clubeId
            ??
            jogador?.clube_id
            ??
            jogador?.siglaClube
            ??
            jogador?.clube
            ??
            "";


        return String(
            valor
        );

    }



    function obterPreco(
        jogador
    ) {

        return Math.max(
            0,
            numero(
                jogador?.preco
            )
        );

    }



    function obterProjecao(
        jogador
    ) {

        return numero(
            jogador?.projecao
        );

    }



    function obterScore(
        jogador,
        estrategia
    ) {

        const scores =
            jogador?.scores;


        if (
            scores
            &&
            typeof scores === "object"
        ) {

            const valor =
                scores[
                    estrategia
                ];


            if (
                Number.isFinite(
                    Number(valor)
                )
            ) {

                return numero(
                    valor
                );

            }

        }


        return obterProjecao(
            jogador
        );

    }



    function copiarJogador(
        jogador
    ) {

        return {
            ...jogador,

            scores: {
                ...(
                    jogador.scores
                    ||
                    {}
                )
            }
        };

    }


    /*
    =====================================================
    CARREGAMENTO
    =====================================================
    */


    async function carregarBase(
        forcar = false
    ) {

        if (
            baseCache
            &&
            !forcar
        ) {

            return baseCache;

        }


        const resposta =
            await fetch(
                ARQUIVO_BASE,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            !resposta.ok
        ) {

            throw new Error(
                "Base do otimizador não encontrada."
            );

        }


        const dados =
            await resposta.json();


        if (
            !dados
            ||
            !Array.isArray(
                dados.jogadores
            )
        ) {

            throw new Error(
                "Base do otimizador inválida."
            );

        }


        if (
            dados.auditoria
            &&
            dados.auditoria.aprovada
            ===
            false
        ) {

            console.warn(
                "Base do otimizador possui auditoria reprovada."
            );

        }


        baseCache =
            dados;


        return baseCache;

    }


    /*
    =====================================================
    PATRIMÔNIO
    =====================================================
    */


    function normalizarPatrimonio(
        valor
    ) {

        if (
            typeof valor === "string"
        ) {

            valor =
                valor
                    .replace(
                        "C$",
                        ""
                    )
                    .replace(
                        /\s/g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );

        }


        const patrimonio =
            numero(
                valor,
                NaN
            );


        if (
            !Number.isFinite(
                patrimonio
            )
            ||
            patrimonio <= 0
        ) {

            throw new Error(
                "Patrimônio inválido."
            );

        }


        return arredondar(
            patrimonio,
            2
        );

    }


    /*
    =====================================================
    FORMAÇÃO
    =====================================================
    */


    function obterFormacao(
        base,
        estrategia,
        formacaoInformada
    ) {

        if (
            formacaoInformada
            &&
            base.formacoes?.[
                formacaoInformada
            ]
        ) {

            return (
                formacaoInformada
            );

        }


        const configuracao =
            base.estrategias?.[
                estrategia
            ];


        const preferida =
            configuracao
                ?.formacaoPreferida;


        if (
            preferida
            &&
            base.formacoes?.[
                preferida
            ]
        ) {

            return preferida;

        }


        const primeira =
            Object.keys(
                base.formacoes
                ||
                {}
            )[0];


        if (
            !primeira
        ) {

            throw new Error(
                "Nenhuma formação disponível."
            );

        }


        return primeira;

    }



    function criarSlots(
        estrutura
    ) {

        const slots = [];


        /*
        Posições com menor universo primeiro
        diminuem bastante o custo da busca.
        */


        const ordemBusca = [
            "TEC",
            "GOL",
            "ATA",
            "LAT",
            "ZAG",
            "MEI"
        ];


        ordemBusca.forEach(
            posicao => {

                const quantidade =
                    inteiro(
                        estrutura?.[
                            posicao
                        ]
                    );


                for (
                    let indice = 0;
                    indice < quantidade;
                    indice++
                ) {

                    slots.push(
                        posicao
                    );

                }

            }
        );


        return slots;

    }


    /*
    =====================================================
    CANDIDATOS
    =====================================================
    */


    function prepararCandidatos(
        base,
        estrategia,
        patrimonio
    ) {

        const resultado = {};


        ORDEM_POSICOES.forEach(
            posicao => {

                resultado[
                    posicao
                ] = [];

            }
        );


        base.jogadores.forEach(
            jogadorOriginal => {

                if (
                    !jogadorOriginal
                    ||
                    typeof jogadorOriginal
                    !==
                    "object"
                ) {

                    return;

                }


                const id =
                    obterId(
                        jogadorOriginal
                    );


                if (
                    id === null
                    ||
                    id === undefined
                ) {

                    return;

                }


                const posicao =
                    normalizarPosicao(
                        jogadorOriginal
                            .posicao
                    );


                if (
                    !resultado[
                        posicao
                    ]
                ) {

                    return;

                }


                const preco =
                    obterPreco(
                        jogadorOriginal
                    );


                if (
                    preco <= 0
                    ||
                    preco >
                    patrimonio
                ) {

                    return;

                }


                const jogador =
                    copiarJogador(
                        jogadorOriginal
                    );


                jogador.__otimizador = {

                    score:
                        obterScore(
                            jogador,
                            estrategia
                        ),

                    preco,

                    projecao:
                        obterProjecao(
                            jogador
                        ),

                    custoBeneficio:
                        preco > 0
                            ?
                            obterScore(
                                jogador,
                                estrategia
                            )
                            /
                            preco
                            :
                            0

                };


                resultado[
                    posicao
                ].push(
                    jogador
                );

            }
        );


        /*
        Não precisamos carregar centenas de jogadores
        em cada posição para encontrar um excelente time.

        Mantemos os candidatos mais relevantes pelo score,
        mas também preservamos alternativas baratas.
        */


        Object.keys(
            resultado
        ).forEach(
            posicao => {

                const lista =
                    resultado[
                        posicao
                    ];


                const melhores =
                    [
                        ...lista
                    ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            return (
                                numero(
                                    b.__otimizador
                                        ?.score
                                )
                                -
                                numero(
                                    a.__otimizador
                                        ?.score
                                )
                            );

                        }
                    )
                    .slice(
                        0,
                        30
                    );


                const baratos =
                    [
                        ...lista
                    ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            return (
                                obterPreco(a)
                                -
                                obterPreco(b)
                            );

                        }
                    )
                    .slice(
                        0,
                        15
                    );


                const custoBeneficio =
                    [
                        ...lista
                    ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            return (
                                numero(
                                    b.__otimizador
                                        ?.custoBeneficio
                                )
                                -
                                numero(
                                    a.__otimizador
                                        ?.custoBeneficio
                                )
                            );

                        }
                    )
                    .slice(
                        0,
                        15
                    );


                const mapa =
                    new Map();


                [
                    ...melhores,
                    ...baratos,
                    ...custoBeneficio
                ]
                    .forEach(
                        jogador => {

                            mapa.set(
                                String(
                                    obterId(
                                        jogador
                                    )
                                ),
                                jogador
                            );

                        }
                    );


                resultado[
                    posicao
                ] =
                    Array.from(
                        mapa.values()
                    )
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            return (
                                numero(
                                    b.__otimizador
                                        ?.score
                                )
                                -
                                numero(
                                    a.__otimizador
                                        ?.score
                                )
                            );

                        }
                    );

            }
        );


        return resultado;

    }


    /*
    =====================================================
    VALIDAÇÃO DE UNIVERSO
    =====================================================
    */


    function validarCandidatosFormacao(
        candidatos,
        estrutura
    ) {

        const problemas = [];


        Object.entries(
            estrutura
        )
            .forEach(
                (
                    [
                        posicao,
                        quantidade
                    ]
                ) => {

                    const disponiveis =
                        candidatos?.[
                            posicao
                        ]?.length
                        ||
                        0;


                    if (
                        disponiveis
                        <
                        quantidade
                    ) {

                        problemas.push(
                            (
                                `${posicao}: `
                                +
                                `${disponiveis}/`
                                +
                                `${quantidade}`
                            )
                        );

                    }

                }
            );


        return {
            valida:
                problemas.length
                ===
                0,

            problemas
        };

    }


    /*
    =====================================================
    CUSTO MÍNIMO RESTANTE
    =====================================================
    */


    function calcularMinimosPorSlot(
        slots,
        candidatos
    ) {

        const resultado =
            new Array(
                slots.length + 1
            )
            .fill(
                0
            );


        for (
            let indice =
                slots.length - 1;

            indice >= 0;

            indice--
        ) {

            const posicao =
                slots[
                    indice
                ];


            const lista =
                candidatos[
                    posicao
                ]
                ||
                [];


            const menorPreco =
                lista.reduce(
                    (
                        menor,
                        jogador
                    ) => {

                        const preco =
                            obterPreco(
                                jogador
                            );


                        if (
                            menor === null
                            ||
                            preco < menor
                        ) {

                            return preco;

                        }


                        return menor;

                    },
                    null
                )
                ??
                Infinity;


            resultado[
                indice
            ] =
                resultado[
                    indice + 1
                ]
                +
                menorPreco;

        }


        return resultado;

    }


    /*
    =====================================================
    LIMITE TEÓRICO DE SCORE
    =====================================================
    */


    function calcularMaximosPorSlot(
        slots,
        candidatos
    ) {

        const resultado =
            new Array(
                slots.length + 1
            )
            .fill(
                0
            );


        for (
            let indice =
                slots.length - 1;

            indice >= 0;

            indice--
        ) {

            const posicao =
                slots[
                    indice
                ];


            const lista =
                candidatos[
                    posicao
                ]
                ||
                [];


            const melhorScore =
                lista.length
                    ?
                    numero(
                        lista[0]
                            ?.__otimizador
                            ?.score
                    )
                    :
                    0;


            resultado[
                indice
            ] =
                resultado[
                    indice + 1
                ]
                +
                melhorScore;

        }


        return resultado;

    }


    /*
    =====================================================
    OTIMIZAÇÃO
    =====================================================
    */


    function buscarMelhorTime(
        candidatos,
        estrutura,
        patrimonio,
        limiteClube
    ) {

        const slots =
            criarSlots(
                estrutura
            );


        const minimoRestante =
            calcularMinimosPorSlot(
                slots,
                candidatos
            );


        const maximoScoreRestante =
            calcularMaximosPorSlot(
                slots,
                candidatos
            );


        let melhor = null;


        let melhorScore =
            -Infinity;


        let estadosVisitados =
            0;


        const selecionados = [];


        const idsUsados =
            new Set();


        const clubes =
            new Map();


        const ultimoIndicePorPosicao =
            {};


        function busca(
            indiceSlot,
            custoAtual,
            scoreAtual,
            projecaoAtual
        ) {

            estadosVisitados++;


            /*
            =================================================
            FINAL
            =================================================
            */


            if (
                indiceSlot
                ===
                slots.length
            ) {

                if (
                    scoreAtual
                    >
                    melhorScore
                ) {

                    melhorScore =
                        scoreAtual;


                    melhor = {

                        jogadores:
                            [
                                ...selecionados
                            ],

                        custo:
                            custoAtual,

                        score:
                            scoreAtual,

                        projecao:
                            projecaoAtual

                    };

                }


                return;

            }


            /*
            =================================================
            CORTE POR ORÇAMENTO MÍNIMO
            =================================================
            */


            if (
                custoAtual
                +
                minimoRestante[
                    indiceSlot
                ]
                >
                patrimonio
                +
                0.001
            ) {

                return;

            }


            /*
            =================================================
            CORTE POR SCORE TEÓRICO
            =================================================
            */


            if (
                melhor
                &&
                scoreAtual
                +
                maximoScoreRestante[
                    indiceSlot
                ]
                <=
                melhorScore
            ) {

                return;

            }


            const posicao =
                slots[
                    indiceSlot
                ];


            const lista =
                candidatos[
                    posicao
                ]
                ||
                [];


            const inicio =
                (
                    ultimoIndicePorPosicao[
                        posicao
                    ]
                    ??
                    -1
                )
                +
                1;


            for (
                let indiceJogador =
                    inicio;

                indiceJogador
                <
                lista.length;

                indiceJogador++
            ) {

                const jogador =
                    lista[
                        indiceJogador
                    ];


                const id =
                    String(
                        obterId(
                            jogador
                        )
                    );


                if (
                    idsUsados.has(
                        id
                    )
                ) {

                    continue;

                }


                const clubeId =
                    obterClubeId(
                        jogador
                    );


                const quantidadeClube =
                    clubeId
                        ?
                        (
                            clubes.get(
                                clubeId
                            )
                            ||
                            0
                        )
                        :
                        0;


                if (
                    clubeId
                    &&
                    quantidadeClube
                    >=
                    limiteClube
                ) {

                    continue;

                }


                const preco =
                    obterPreco(
                        jogador
                    );


                const novoCusto =
                    custoAtual
                    +
                    preco;


                if (
                    novoCusto
                    >
                    patrimonio
                    +
                    0.001
                ) {

                    continue;

                }


                /*
                Ainda precisamos conseguir pagar
                todos os slots restantes.
                */


                if (
                    novoCusto
                    +
                    minimoRestante[
                        indiceSlot + 1
                    ]
                    >
                    patrimonio
                    +
                    0.001
                ) {

                    continue;

                }


                const score =
                    numero(
                        jogador
                            ?.__otimizador
                            ?.score
                    );


                const projecao =
                    numero(
                        jogador
                            ?.__otimizador
                            ?.projecao
                    );


                selecionados.push(
                    jogador
                );


                idsUsados.add(
                    id
                );


                if (
                    clubeId
                ) {

                    clubes.set(
                        clubeId,
                        quantidadeClube
                        +
                        1
                    );

                }


                const anteriorIndice =
                    ultimoIndicePorPosicao[
                        posicao
                    ];


                ultimoIndicePorPosicao[
                    posicao
                ] =
                    indiceJogador;


                busca(
                    indiceSlot + 1,
                    novoCusto,
                    scoreAtual + score,
                    projecaoAtual + projecao
                );


                if (
                    anteriorIndice
                    ===
                    undefined
                ) {

                    delete (
                        ultimoIndicePorPosicao[
                            posicao
                        ]
                    );

                }
                else {

                    ultimoIndicePorPosicao[
                        posicao
                    ] =
                        anteriorIndice;

                }


                if (
                    clubeId
                ) {

                    if (
                        quantidadeClube
                        ===
                        0
                    ) {

                        clubes.delete(
                            clubeId
                        );

                    }
                    else {

                        clubes.set(
                            clubeId,
                            quantidadeClube
                        );

                    }

                }


                idsUsados.delete(
                    id
                );


                selecionados.pop();

            }

        }


        busca(
            0,
            0,
            0,
            0
        );


        if (
            melhor
        ) {

            melhor.estadosVisitados =
                estadosVisitados;

        }


        return melhor;

    }


    /*
    =====================================================
    CAPITÃO
    =====================================================
    */


    function escolherCapitao(
        jogadores,
        estrategia
    ) {

        const elegiveis =
            jogadores.filter(
                jogador => {

                    return (
                        normalizarPosicao(
                            jogador.posicao
                        )
                        !==
                        "TEC"
                    );

                }
            );


        if (
            !elegiveis.length
        ) {

            return null;

        }


        return [
            ...elegiveis
        ]
            .sort(
                (
                    a,
                    b
                ) => {

                    const projecaoA =
                        obterProjecao(
                            a
                        );


                    const projecaoB =
                        obterProjecao(
                            b
                        );


                    const scoreA =
                        obterScore(
                            a,
                            estrategia
                        );


                    const scoreB =
                        obterScore(
                            b,
                            estrategia
                        );


                    /*
                    O capitão prioriza projeção,
                    usando o score da estratégia
                    como desempate.
                    */


                    const notaA =
                        projecaoA
                        *
                        0.75
                        +
                        scoreA
                        *
                        0.25;


                    const notaB =
                        projecaoB
                        *
                        0.75
                        +
                        scoreB
                        *
                        0.25;


                    return (
                        notaB
                        -
                        notaA
                    );

                }
            )[0];

    }


    /*
    =====================================================
    ORDENAÇÃO VISUAL
    =====================================================
    */


    function ordenarTitulares(
        jogadores
    ) {

        return [
            ...jogadores
        ]
            .sort(
                (
                    a,
                    b
                ) => {

                    const posicaoA =
                        ORDEM_POSICOES.indexOf(
                            normalizarPosicao(
                                a.posicao
                            )
                        );


                    const posicaoB =
                        ORDEM_POSICOES.indexOf(
                            normalizarPosicao(
                                b.posicao
                            )
                        );


                    if (
                        posicaoA
                        !==
                        posicaoB
                    ) {

                        return (
                            posicaoA
                            -
                            posicaoB
                        );

                    }


                    return (
                        obterProjecao(
                            b
                        )
                        -
                        obterProjecao(
                            a
                        )
                    );

                }
            );

    }


    /*
    =====================================================
    SERIALIZAÇÃO
    =====================================================
    */


    function serializarJogador(
        jogador,
        estrategia,
        capitaoId
    ) {

        const id =
            obterId(
                jogador
            );


        return {

            id,

            nome:
                jogador.nome
                ||
                "",

            apelido:
                jogador.apelido
                ||
                jogador.nome
                ||
                "",

            foto:
                jogador.foto
                ||
                null,

            posicao:
                normalizarPosicao(
                    jogador.posicao
                ),

            clubeId:
                jogador.clubeId
                ??
                null,

            clube:
                jogador.clube
                ||
                "",

            siglaClube:
                jogador.siglaClube
                ||
                "",

            preco:
                arredondar(
                    obterPreco(
                        jogador
                    )
                ),

            projecao:
                arredondar(
                    obterProjecao(
                        jogador
                    )
                ),

            mediaHistorica:
                arredondar(
                    jogador.mediaHistorica
                ),

            forma:
                arredondar(
                    jogador.forma
                ),

            regularidade:
                arredondar(
                    jogador.regularidade
                ),

            explosao:
                arredondar(
                    jogador.explosao
                ),

            diferencial:
                arredondar(
                    jogador.diferencial
                ),

            scoreEstrategia:
                arredondar(
                    obterScore(
                        jogador,
                        estrategia
                    ),
                    4
                ),

            capitao:
                String(id)
                ===
                String(
                    capitaoId
                )

        };

    }


    /*
    =====================================================
    AUDITORIA
    =====================================================
    */


    function auditarResultado(
        resultado,
        estrutura,
        limiteClube
    ) {

        const problemas = [];


        const titulares =
            resultado?.titulares
            ||
            [];


        if (
            titulares.length
            !==
            QUANTIDADE_TITULARES
        ) {

            problemas.push(
                (
                    "Quantidade de titulares "
                    +
                    `${titulares.length}/`
                    +
                    `${QUANTIDADE_TITULARES}`
                )
            );

        }


        if (
            numero(
                resultado?.custo
            )
            >
            numero(
                resultado?.patrimonio
            )
            +
            0.01
        ) {

            problemas.push(
                "Custo acima do patrimônio."
            );

        }


        const contagemPosicoes =
            {};


        const contagemClubes =
            {};


        const ids =
            new Set();


        titulares.forEach(
            jogador => {

                const posicao =
                    normalizarPosicao(
                        jogador.posicao
                    );


                contagemPosicoes[
                    posicao
                ] =
                    (
                        contagemPosicoes[
                            posicao
                        ]
                        ||
                        0
                    )
                    +
                    1;


                const clubeId =
                    String(
                        jogador.clubeId
                        ??
                        jogador.siglaClube
                        ??
                        jogador.clube
                        ??
                        ""
                    );


                if (
                    clubeId
                ) {

                    contagemClubes[
                        clubeId
                    ] =
                        (
                            contagemClubes[
                                clubeId
                            ]
                            ||
                            0
                        )
                        +
                        1;

                }


                const id =
                    String(
                        jogador.id
                    );


                if (
                    ids.has(
                        id
                    )
                ) {

                    problemas.push(
                        (
                            "Jogador duplicado: "
                            +
                            id
                        )
                    );

                }


                ids.add(
                    id
                );

            }
        );


        Object.entries(
            estrutura
        )
            .forEach(
                (
                    [
                        posicao,
                        esperado
                    ]
                ) => {

                    const encontrado =
                        contagemPosicoes[
                            posicao
                        ]
                        ||
                        0;


                    if (
                        encontrado
                        !==
                        esperado
                    ) {

                        problemas.push(
                            (
                                `${posicao}: `
                                +
                                `${encontrado}/`
                                +
                                `${esperado}`
                            )
                        );

                    }

                }
            );


        Object.entries(
            contagemClubes
        )
            .forEach(
                (
                    [
                        clube,
                        quantidade
                    ]
                ) => {

                    if (
                        quantidade
                        >
                        limiteClube
                    ) {

                        problemas.push(
                            (
                                `Clube ${clube}: `
                                +
                                `${quantidade}/`
                                +
                                `${limiteClube}`
                            )
                        );

                    }

                }
            );


        const capitao =
            resultado?.capitao;


        if (
            !capitao
        ) {

            problemas.push(
                "Capitão não definido."
            );

        }
        else if (
            capitao.posicao
            ===
            "TEC"
        ) {

            problemas.push(
                "Técnico não pode ser capitão."
            );

        }


        return {

            aprovada:
                problemas.length
                ===
                0,

            problemas,

            quantidadeTitulares:
                titulares.length,

            custoDentroPatrimonio:
                (
                    numero(
                        resultado?.custo
                    )
                    <=
                    numero(
                        resultado?.patrimonio
                    )
                    +
                    0.01
                )

        };

    }


    /*
    =====================================================
    OTIMIZA UMA ESTRATÉGIA
    =====================================================
    */


    async function otimizar(
        patrimonioInformado,
        estrategiaInformada =
            "equilibrado",
        formacaoInformada =
            null
    ) {

        const inicio =
            performance.now();


        const patrimonio =
            normalizarPatrimonio(
                patrimonioInformado
            );


        const estrategia =
            normalizarEstrategia(
                estrategiaInformada
            );


        const base =
            await carregarBase();


        if (
            !base.estrategias?.[
                estrategia
            ]
        ) {

            throw new Error(
                (
                    "Estratégia inválida: "
                    +
                    estrategia
                )
            );

        }


        const formacao =
            obterFormacao(
                base,
                estrategia,
                formacaoInformada
            );


        const estrutura =
            base.formacoes?.[
                formacao
            ];


        if (
            !estrutura
        ) {

            throw new Error(
                (
                    "Formação inválida: "
                    +
                    formacao
                )
            );

        }


        const limiteClube =
            inteiro(
                base.limiteJogadoresClube,
                LIMITE_PADRAO_CLUBE
            );


        const candidatos =
            prepararCandidatos(
                base,
                estrategia,
                patrimonio
            );


        const validacao =
            validarCandidatosFormacao(
                candidatos,
                estrutura
            );


        if (
            !validacao.valida
        ) {

            return {

                sucesso:
                    false,

                rodada:
                    base.rodada,

                estrategia:
                    estrategia,

                patrimonio:
                    patrimonio,

                formacao:
                    formacao,

                motivo:
                    "Candidatos insuficientes.",

                problemas:
                    validacao.problemas

            };

        }


        const melhor =
            buscarMelhorTime(
                candidatos,
                estrutura,
                patrimonio,
                limiteClube
            );


        if (
            !melhor
        ) {

            return {

                sucesso:
                    false,

                rodada:
                    base.rodada,

                estrategia:
                    estrategia,

                patrimonio:
                    patrimonio,

                formacao:
                    formacao,

                motivo:
                    (
                        "Não foi possível montar "
                        +
                        "uma escalação completa "
                        +
                        "dentro do patrimônio."
                    )

            };

        }


        const capitao =
            escolherCapitao(
                melhor.jogadores,
                estrategia
            );


        const capitaoId =
            capitao
                ?
                obterId(
                    capitao
                )
                :
                null;


        const titulares =
            ordenarTitulares(
                melhor.jogadores
            )
            .map(
                jogador =>
                    serializarJogador(
                        jogador,
                        estrategia,
                        capitaoId
                    )
            );


        const resultado = {

            sucesso:
                true,

            modelo:
                "otimizador_patrimonio_frontend_v1",

            rodada:
                base.rodada,

            estrategia:
                estrategia,

            estrategiaNome:
                base.estrategias[
                    estrategia
                ]?.nome
                ||
                estrategia,

            patrimonio:
                patrimonio,

            formacao:
                formacao,

            custo:
                arredondar(
                    melhor.custo
                ),

            saldo:
                arredondar(
                    patrimonio
                    -
                    melhor.custo
                ),

            percentualUtilizado:
                arredondar(
                    (
                        melhor.custo
                        /
                        patrimonio
                    )
                    *
                    100
                ),

            scoreTotal:
                arredondar(
                    melhor.score,
                    4
                ),

            projecaoTotal:
                arredondar(
                    melhor.projecao
                ),

            quantidadeTitulares:
                titulares.length,

            limiteJogadoresClube:
                limiteClube,

            capitao:
                titulares.find(
                    jogador =>
                        jogador.capitao
                )
                ||
                null,

            titulares,

            desempenhoOtimizador: {

                estadosVisitados:
                    inteiro(
                        melhor.estadosVisitados
                    ),

                tempoMs:
                    arredondar(
                        (
                            performance.now()
                            -
                            inicio
                        ),
                        2
                    )

            }

        };


        resultado.auditoria =
            auditarResultado(
                resultado,
                estrutura,
                limiteClube
            );


        return resultado;

    }


    /*
    =====================================================
    OTIMIZA AS 3 ESTRATÉGIAS
    =====================================================
    */


    async function otimizarTodas(
        patrimonioInformado
    ) {

        const patrimonio =
            normalizarPatrimonio(
                patrimonioInformado
            );


        const base =
            await carregarBase();


        const estrategias =
            Object.keys(
                base.estrategias
                ||
                {}
            );


        const resultados =
            {};


        /*
        Executamos sequencialmente para não travar
        o navegador com três buscas simultâneas.
        */


        for (
            const estrategia
            of estrategias
        ) {

            resultados[
                estrategia
            ] =
                await otimizar(
                    patrimonio,
                    estrategia
                );

        }


        const validos =
            Object.values(
                resultados
            )
            .filter(
                resultado =>
                    resultado?.sucesso
            );


        let melhor =
            null;


        if (
            validos.length
        ) {

            melhor =
                [
                    ...validos
                ]
                .sort(
                    (
                        a,
                        b
                    ) => {

                        return (
                            numero(
                                b.scoreTotal
                            )
                            -
                            numero(
                                a.scoreTotal
                            )
                        );

                    }
                )[0];

        }


        return {

            modelo:
                "otimizador_patrimonio_frontend_v1",

            rodada:
                base.rodada,

            patrimonio,

            resultados,

            melhor: melhor
                ?
                {
                    estrategia:
                        melhor.estrategia,

                    estrategiaNome:
                        melhor.estrategiaNome,

                    formacao:
                        melhor.formacao,

                    custo:
                        melhor.custo,

                    saldo:
                        melhor.saldo,

                    scoreTotal:
                        melhor.scoreTotal,

                    projecaoTotal:
                        melhor.projecaoTotal
                }
                :
                null

        };

    }


    /*
    =====================================================
    INFORMAÇÕES DA BASE
    =====================================================
    */


    async function getInformacoes() {

        const base =
            await carregarBase();


        return {

            rodada:
                base.rodada,

            mercadoAberto:
                base.mercadoAberto,

            quantidadeJogadores:
                base.quantidadeJogadoresDisponiveis,

            formacoes:
                Object.keys(
                    base.formacoes
                    ||
                    {}
                ),

            estrategias:
                Object.keys(
                    base.estrategias
                    ||
                    {}
                ),

            auditoria:
                base.auditoria

        };

    }


    /*
    =====================================================
    LIMPA CACHE
    =====================================================
    */


    function limparCache() {

        baseCache = null;

    }


    /*
    =====================================================
    INTERFACE PÚBLICA
    =====================================================
    */


    return {

        carregarBase,

        otimizar,

        otimizarTodas,

        getInformacoes,

        normalizarPatrimonio,

        limparCache

    };


})();
