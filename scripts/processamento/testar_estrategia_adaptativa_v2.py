"""
=========================================================
CARTOLA ESTATÍSTICO
Backtest da Estratégia Adaptativa V2

Versão:
estrategia_adaptativa_v2

Entrada:
data/simulacao-times.json

Saída:
data/estrategia-adaptativa-v2.json

Objetivo:
Evoluir a estratégia adaptativa V1 incorporando:

1. média histórica;
2. média recente;
3. mediana;
4. taxa histórica de vitórias;
5. estabilidade;
6. persistência após vitória;
7. regime histórico da rodada anterior;
8. desempenho histórico no regime identificado.

REGRA FUNDAMENTAL:

Para decidir a estratégia da rodada N, somente dados
das rodadas anteriores a N podem ser utilizados.

Nenhuma informação da rodada prevista participa da
escolha.

A classificação de regime também é recalculada
progressivamente, usando somente o histórico disponível
antes da rodada analisada.

=========================================================
"""

import json
import math

from collections import defaultdict
from pathlib import Path
from statistics import mean, median, pstdev


# ======================================================
# CONFIGURAÇÕES
# ======================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
    .parent
)

PASTA_DATA = (
    BASE_DIR /
    "data"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "estrategia-adaptativa-v2.json"
)


ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo"
]


MINIMO_HISTORICO = 3

MINIMO_REGIME = 3

JANELA_RECENTE = 5

TOLERANCIA_EMPATE = 0.001


# ======================================================
# PESOS
# ======================================================

PESOS = {

    "mediaGeral":
        0.22,

    "mediaRecente":
        0.24,

    "mediana":
        0.10,

    "taxaVitorias":
        0.12,

    "estabilidade":
        0.08,

    "persistencia":
        0.08,

    "regime":
        0.16

}


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():

        return None

    try:

        with open(
            caminho,
            "r",
            encoding="utf-8"
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception as erro:

        print(
            f"[ERRO] Falha ao ler {caminho}: {erro}"
        )

        return None


def salvar_json(
    caminho,
    dados
):

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        caminho,
        "w",
        encoding="utf-8"
    ) as arquivo:

        json.dump(
            dados,
            arquivo,
            ensure_ascii=False,
            indent=2
        )


def numero(
    valor,
    padrao=0.0
):

    try:

        if valor is None:

            return padrao

        valor = float(
            valor
        )

        if math.isfinite(
            valor
        ):

            return valor

    except Exception:

        pass

    return padrao


def arredondar(
    valor,
    casas=2
):

    return round(
        numero(
            valor
        ),
        casas
    )


def percentual(
    parte,
    total
):

    parte = numero(
        parte
    )

    total = numero(
        total
    )

    if total == 0:

        return 0

    return (
        parte /
        total
    ) * 100


def media_segura(
    valores
):

    if not valores:

        return 0

    return mean(
        valores
    )


def mediana_segura(
    valores
):

    if not valores:

        return 0

    return median(
        valores
    )


def desvio_seguro(
    valores
):

    if len(
        valores
    ) < 2:

        return 0

    return pstdev(
        valores
    )


# ======================================================
# PERCENTIL
# ======================================================

def percentil(
    valores,
    proporcao
):

    if not valores:

        return 0

    ordenados = sorted(
        valores
    )

    if len(
        ordenados
    ) == 1:

        return ordenados[0]

    posicao = (
        len(
            ordenados
        ) - 1
    ) * proporcao

    inferior = math.floor(
        posicao
    )

    superior = math.ceil(
        posicao
    )

    if inferior == superior:

        return ordenados[
            inferior
        ]

    peso_superior = (
        posicao -
        inferior
    )

    return (

        ordenados[
            inferior
        ]
        *
        (
            1 -
            peso_superior
        )

        +

        ordenados[
            superior
        ]
        *
        peso_superior

    )


# ======================================================
# CARREGAMENTO DA SIMULAÇÃO
# ======================================================

def carregar_rodadas(
    simulacao
):

    rodadas = []

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        numero_rodada = rodada.get(
            "rodada"
        )

        if numero_rodada is None:

            continue

        estrategias = {}

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if nome not in ESTRATEGIAS:

                continue

            estrategias[
                nome
            ] = {

                "pontos":
                    numero(
                        estrategia.get(
                            "pontuacaoComCapitao"
                        )
                    ),

                "pontosSemCapitao":
                    numero(
                        estrategia.get(
                            "pontuacaoSemCapitao"
                        )
                    ),

                "bonusCapitao":
                    numero(
                        estrategia.get(
                            "bonusCapitao"
                        )
                    )

            }

        if len(
            estrategias
        ) != len(
            ESTRATEGIAS
        ):

            continue

        pontos = [

            dados[
                "pontos"
            ]

            for dados
            in estrategias.values()

        ]

        maior = max(
            pontos
        )

        vencedores = [

            nome

            for nome, dados
            in estrategias.items()

            if abs(
                dados[
                    "pontos"
                ]
                -
                maior
            )
            <=
            TOLERANCIA_EMPATE

        ]

        rodadas.append({

            "rodada":
                int(
                    numero_rodada
                ),

            "estrategias":
                estrategias,

            "mediaEstrategias":
                media_segura(
                    pontos
                ),

            "vencedores":
                vencedores

        })

    rodadas.sort(
        key=lambda item:
            item[
                "rodada"
            ]
    )

    return rodadas


# ======================================================
# NORMALIZAÇÃO
# ======================================================

def normalizar_valores(
    valores
):

    if not valores:

        return {}

    minimo = min(
        valores.values()
    )

    maximo = max(
        valores.values()
    )

    amplitude = (
        maximo -
        minimo
    )

    if abs(
        amplitude
    ) <= TOLERANCIA_EMPATE:

        return {

            nome: 50.0

            for nome
            in valores

        }

    return {

        nome:

            (
                (
                    valor -
                    minimo
                )
                /
                amplitude
            )
            *
            100

        for nome, valor
        in valores.items()

    }


# ======================================================
# REGIMES PROGRESSIVOS
# ======================================================

def calcular_limites_regime(
    historico
):

    medias = [

        rodada[
            "mediaEstrategias"
        ]

        for rodada
        in historico

    ]

    if len(
        medias
    ) < MINIMO_REGIME:

        return None

    return {

        "baixoAte":
            percentil(
                medias,
                1 / 3
            ),

        "medioAte":
            percentil(
                medias,
                2 / 3
            )

    }


def classificar_regime(
    valor,
    limites
):

    if not limites:

        return None

    if (
        valor
        <=
        limites[
            "baixoAte"
        ]
    ):

        return "baixo"

    if (
        valor
        <=
        limites[
            "medioAte"
        ]
    ):

        return "medio"

    return "alto"


def regime_mais_recente(
    historico
):

    limites = calcular_limites_regime(
        historico
    )

    if not limites:

        return (
            None,
            None
        )

    ultima = historico[
        -1
    ]

    regime = classificar_regime(

        ultima[
            "mediaEstrategias"
        ],

        limites

    )

    return (
        regime,
        limites
    )


# ======================================================
# PONTOS HISTÓRICOS
# ======================================================

def pontos_estrategia(
    historico,
    estrategia
):

    return [

        numero(
            rodada[
                "estrategias"
            ][
                estrategia
            ][
                "pontos"
            ]
        )

        for rodada
        in historico

        if estrategia
        in rodada[
            "estrategias"
        ]

    ]


# ======================================================
# VITÓRIAS
# ======================================================

def calcular_taxas_vitoria(
    historico
):

    resultado = {}

    for estrategia in ESTRATEGIAS:

        participacoes = 0

        vitorias = 0

        liderancas = 0

        for rodada in historico:

            if (
                estrategia
                not in
                rodada[
                    "estrategias"
                ]
            ):

                continue

            participacoes += 1

            if (
                estrategia
                in
                rodada[
                    "vencedores"
                ]
            ):

                liderancas += 1

                if len(
                    rodada[
                        "vencedores"
                    ]
                ) == 1:

                    vitorias += 1

        resultado[
            estrategia
        ] = {

            "participacoes":
                participacoes,

            "vitorias":
                vitorias,

            "liderancas":
                liderancas,

            "taxaVitorias":
                percentual(
                    vitorias,
                    participacoes
                ),

            "taxaLiderancas":
                percentual(
                    liderancas,
                    participacoes
                )

        }

    return resultado


# ======================================================
# PERSISTÊNCIA
# ======================================================

def calcular_persistencia(
    historico
):

    oportunidades = {

        nome: 0

        for nome in ESTRATEGIAS

    }

    repeticoes = {

        nome: 0

        for nome in ESTRATEGIAS

    }

    for indice in range(
        1,
        len(
            historico
        )
    ):

        anterior = historico[
            indice - 1
        ]

        atual = historico[
            indice
        ]

        if (
            len(
                anterior[
                    "vencedores"
                ]
            ) != 1
            or
            len(
                atual[
                    "vencedores"
                ]
            ) != 1
        ):

            continue

        vencedor_anterior = (
            anterior[
                "vencedores"
            ][0]
        )

        vencedor_atual = (
            atual[
                "vencedores"
            ][0]
        )

        oportunidades[
            vencedor_anterior
        ] += 1

        if (
            vencedor_anterior
            ==
            vencedor_atual
        ):

            repeticoes[
                vencedor_anterior
            ] += 1

    resultado = {}

    for nome in ESTRATEGIAS:

        resultado[
            nome
        ] = percentual(

            repeticoes[
                nome
            ],

            oportunidades[
                nome
            ]

        )

    return resultado


# ======================================================
# DESEMPENHO POR REGIME
# ======================================================

def calcular_desempenho_regime(
    historico,
    regime_alvo,
    limites
):

    resultado = {

        nome: []

        for nome in ESTRATEGIAS

    }

    if (
        not regime_alvo
        or
        not limites
    ):

        return {

            nome: 0

            for nome
            in ESTRATEGIAS

        }

    for rodada in historico:

        regime = classificar_regime(

            rodada[
                "mediaEstrategias"
            ],

            limites

        )

        if regime != regime_alvo:

            continue

        for nome in ESTRATEGIAS:

            resultado[
                nome
            ].append(

                numero(
                    rodada[
                        "estrategias"
                    ][
                        nome
                    ][
                        "pontos"
                    ]
                )

            )

    return {

        nome:
            media_segura(
                valores
            )

        for nome, valores
        in resultado.items()

    }


# ======================================================
# MÉTRICAS
# ======================================================

def calcular_metricas(
    historico
):

    taxas_vitoria = (
        calcular_taxas_vitoria(
            historico
        )
    )

    persistencia = (
        calcular_persistencia(
            historico
        )
    )

    regime_atual, limites = (
        regime_mais_recente(
            historico
        )
    )

    desempenho_regime = (
        calcular_desempenho_regime(
            historico,
            regime_atual,
            limites
        )
    )

    metricas = {}

    for nome in ESTRATEGIAS:

        pontos = pontos_estrategia(
            historico,
            nome
        )

        recentes = pontos[
            -JANELA_RECENTE:
        ]

        desvio = desvio_seguro(
            pontos
        )

        estabilidade = max(

            0,

            100 -
            (
                desvio *
                8
            )

        )

        metricas[
            nome
        ] = {

            "amostra":
                len(
                    pontos
                ),

            "mediaGeral":
                media_segura(
                    pontos
                ),

            "mediaRecente":
                media_segura(
                    recentes
                ),

            "mediana":
                mediana_segura(
                    pontos
                ),

            "desvioPadrao":
                desvio,

            "taxaVitorias":
                taxas_vitoria[
                    nome
                ][
                    "taxaVitorias"
                ],

            "taxaLiderancas":
                taxas_vitoria[
                    nome
                ][
                    "taxaLiderancas"
                ],

            "estabilidade":
                estabilidade,

            "persistencia":
                persistencia[
                    nome
                ],

            "mediaRegime":
                desempenho_regime[
                    nome
                ]

        }

    return {

        "regimeReferencia":
            regime_atual,

        "limitesRegime":
            limites,

        "estrategias":
            metricas

    }


# ======================================================
# SCORE V2
# ======================================================

def calcular_scores(
    metricas
):

    dados = metricas[
        "estrategias"
    ]

    campos = [

        "mediaGeral",
        "mediaRecente",
        "mediana",
        "taxaVitorias",
        "estabilidade",
        "persistencia",
        "mediaRegime"

    ]

    normalizados = {}

    for campo in campos:

        valores = {

            nome:
                numero(
                    dados[
                        nome
                    ][
                        campo
                    ]
                )

            for nome
            in ESTRATEGIAS

        }

        normalizados[
            campo
        ] = normalizar_valores(
            valores
        )

    scores = {}

    for nome in ESTRATEGIAS:

        componentes = {

            "mediaGeral":
                normalizados[
                    "mediaGeral"
                ][
                    nome
                ],

            "mediaRecente":
                normalizados[
                    "mediaRecente"
                ][
                    nome
                ],

            "mediana":
                normalizados[
                    "mediana"
                ][
                    nome
                ],

            "taxaVitorias":
                normalizados[
                    "taxaVitorias"
                ][
                    nome
                ],

            "estabilidade":
                normalizados[
                    "estabilidade"
                ][
                    nome
                ],

            "persistencia":
                normalizados[
                    "persistencia"
                ][
                    nome
                ],

            "regime":
                normalizados[
                    "mediaRegime"
                ][
                    nome
                ]

        }

        score = sum(

            componentes[
                campo
            ]
            *
            PESOS[
                campo
            ]

            for campo
            in PESOS

        )

        scores[
            nome
        ] = {

            "score":
                score,

            "componentes":
                componentes

        }

    return scores


# ======================================================
# ESCOLHA
# ======================================================

def escolher_estrategia(
    historico
):

    if len(
        historico
    ) < MINIMO_HISTORICO:

        return {

            "estrategia":
                "Equilibrado",

            "motivo":
                "cold_start",

            "ranking":
                [],

            "scores":
                {},

            "metricas":
                {},

            "regimeReferencia":
                None,

            "limitesRegime":
                None

        }

    metricas = calcular_metricas(
        historico
    )

    scores = calcular_scores(
        metricas
    )

    ranking = sorted(

        ESTRATEGIAS,

        key=lambda nome: (

            numero(
                scores[
                    nome
                ][
                    "score"
                ]
            ),

            numero(
                metricas[
                    "estrategias"
                ][
                    nome
                ][
                    "mediaRecente"
                ]
            ),

            numero(
                metricas[
                    "estrategias"
                ][
                    nome
                ][
                    "mediaGeral"
                ]
            )

        ),

        reverse=True

    )

    return {

        "estrategia":
            ranking[0],

        "motivo":
            "score_adaptativo_v2",

        "ranking":
            ranking,

        "scores":
            scores,

        "metricas":
            metricas[
                "estrategias"
            ],

        "regimeReferencia":
            metricas[
                "regimeReferencia"
            ],

        "limitesRegime":
            metricas[
                "limitesRegime"
            ]

    }


# ======================================================
# ORÁCULO
# ======================================================

def obter_oraculo(
    rodada
):

    estrategias = rodada[
        "estrategias"
    ]

    melhor = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                estrategias[
                    nome
                ][
                    "pontos"
                ]
            )

    )

    return (
        melhor,
        numero(
            estrategias[
                melhor
            ][
                "pontos"
            ]
        )
    )


# ======================================================
# RESUMO ESTRATÉGIA FIXA
# ======================================================

def resumir_fixa(
    rodadas,
    estrategia
):

    pontos = []

    vitorias = 0

    for rodada in rodadas:

        valor = numero(
            rodada[
                "estrategias"
            ][
                estrategia
            ][
                "pontos"
            ]
        )

        pontos.append(
            valor
        )

        maior = max(

            numero(
                dados[
                    "pontos"
                ]
            )

            for dados
            in rodada[
                "estrategias"
            ].values()

        )

        if abs(
            valor -
            maior
        ) <= TOLERANCIA_EMPATE:

            vitorias += 1

    return {

        "rodadas":
            len(
                pontos
            ),

        "total":
            arredondar(
                sum(
                    pontos
                )
            ),

        "media":
            arredondar(
                media_segura(
                    pontos
                )
            ),

        "mediana":
            arredondar(
                mediana_segura(
                    pontos
                )
            ),

        "vitoriasRodada":
            vitorias,

        "taxaVitoriasPercentual":
            arredondar(
                percentual(
                    vitorias,
                    len(
                        pontos
                    )
                )
            )

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    print(
        "=============================================="
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "ESTRATÉGIA ADAPTATIVA V2"
    )

    print(
        "=============================================="
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    if not isinstance(
        simulacao,
        dict
    ):

        simulacao = {}

    rodadas = carregar_rodadas(
        simulacao
    )

    if not rodadas:

        salvar_json(
            ARQUIVO_SAIDA,
            {
                "modelo":
                    "estrategia_adaptativa_v2",

                "status":
                    "sem_dados",

                "rodadas":
                    []
            }
        )

        print(
            "Nenhuma rodada encontrada."
        )

        return

    resultados = []

    pontos_adaptativo = []

    pontos_oraculo = []

    escolhas = {

        nome: 0

        for nome
        in ESTRATEGIAS

    }

    acertos_oraculo = 0

    # ==================================================
    # BACKTEST PROGRESSIVO
    # ==================================================

    for indice, rodada in enumerate(
        rodadas
    ):

        historico = rodadas[
            :indice
        ]

        decisao = escolher_estrategia(
            historico
        )

        escolhida = decisao[
            "estrategia"
        ]

        pontos_escolhida = numero(

            rodada[
                "estrategias"
            ][
                escolhida
            ][
                "pontos"
            ]

        )

        oraculo, pontos_melhor = (
            obter_oraculo(
                rodada
            )
        )

        perda_oraculo = (
            pontos_melhor -
            pontos_escolhida
        )

        acertou = (

            abs(
                perda_oraculo
            )
            <=
            TOLERANCIA_EMPATE

        )

        if acertou:

            acertos_oraculo += 1

        escolhas[
            escolhida
        ] += 1

        pontos_adaptativo.append(
            pontos_escolhida
        )

        pontos_oraculo.append(
            pontos_melhor
        )

        scores_resumidos = {

            nome:
                arredondar(
                    dados[
                        "score"
                    ],
                    3
                )

            for nome, dados
            in decisao.get(
                "scores",
                {}
            ).items()

        }

        limites = decisao.get(
            "limitesRegime"
        )

        limites_resumidos = None

        if limites:

            limites_resumidos = {

                "baixoAte":
                    arredondar(
                        limites[
                            "baixoAte"
                        ]
                    ),

                "medioAte":
                    arredondar(
                        limites[
                            "medioAte"
                        ]
                    )

            }

        resultados.append({

            "rodada":
                rodada[
                    "rodada"
                ],

            "quantidadeRodadasAnteriores":
                len(
                    historico
                ),

            "estrategiaEscolhida":
                escolhida,

            "motivoEscolha":
                decisao[
                    "motivo"
                ],

            "regimeReferencia":
                decisao.get(
                    "regimeReferencia"
                ),

            "limitesRegimeAntesRodada":
                limites_resumidos,

            "rankingAntesRodada":
                decisao.get(
                    "ranking",
                    []
                ),

            "scoresAntesRodada":
                scores_resumidos,

            "pontosAdaptativo":
                arredondar(
                    pontos_escolhida
                ),

            "melhorEstrategiaReal":
                oraculo,

            "pontosMelhorEstrategia":
                arredondar(
                    pontos_melhor
                ),

            "perdaParaOraculo":
                arredondar(
                    perda_oraculo
                ),

            "acertouMelhorEstrategia":
                acertou

        })

        print(

            f"Rodada "
            f"{rodada['rodada']:02d}"

            f" | histórico: "
            f"{len(historico)}"

            f" | regime: "
            f"{decisao.get('regimeReferencia')}"

            f" | escolha: "
            f"{escolhida}"

            f" | pontos: "
            f"{arredondar(pontos_escolhida)}"

            f" | melhor: "
            f"{oraculo}"

            f" | teto: "
            f"{arredondar(pontos_melhor)}"

        )

    # ==================================================
    # FIXAS
    # ==================================================

    fixas = {

        nome:
            resumir_fixa(
                rodadas,
                nome
            )

        for nome
        in ESTRATEGIAS

    }

    melhor_fixa = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                fixas[
                    nome
                ][
                    "media"
                ]
            )

    )

    # ==================================================
    # MÉTRICAS
    # ==================================================

    total_adaptativo = sum(
        pontos_adaptativo
    )

    media_adaptativo = (
        media_segura(
            pontos_adaptativo
        )
    )

    mediana_adaptativo = (
        mediana_segura(
            pontos_adaptativo
        )
    )

    total_oraculo = sum(
        pontos_oraculo
    )

    media_oraculo = (
        media_segura(
            pontos_oraculo
        )
    )

    media_melhor_fixa = numero(
        fixas[
            melhor_fixa
        ][
            "media"
        ]
    )

    total_melhor_fixa = numero(
        fixas[
            melhor_fixa
        ][
            "total"
        ]
    )

    ganho_media = (
        media_adaptativo -
        media_melhor_fixa
    )

    ganho_total = (
        total_adaptativo -
        total_melhor_fixa
    )

    ganho_percentual = percentual(
        ganho_media,
        media_melhor_fixa
    )

    taxa_acerto = percentual(
        acertos_oraculo,
        len(
            resultados
        )
    )

    eficiencia_oraculo = percentual(
        media_adaptativo,
        media_oraculo
    )

    # ==================================================
    # DECISÃO EXPERIMENTAL
    # ==================================================

    amostra_suficiente = (
        len(
            resultados
        )
        >=
        10
    )

    superou_fixa = (
        ganho_media > 0
    )

    superou_fixa_1pct = (
        ganho_percentual >= 1
    )

    if (
        amostra_suficiente
        and
        superou_fixa_1pct
    ):

        decisao_final = (
            "ADAPTATIVO_V2_CANDIDATO"
        )

    elif (
        amostra_suficiente
        and
        superou_fixa
    ):

        decisao_final = (
            "ADAPTATIVO_V2_PROMISSORIO"
        )

    else:

        decisao_final = (
            "MANTER_ESTRATEGIAS_FIXAS"
        )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "estrategia_adaptativa_v2",

        "descricao":
            (
                "Backtest progressivo da estratégia "
                "adaptativa V2 com comportamento recente, "
                "persistência e regime histórico."
            ),

        "metodologia": {

            "semVazamentoFuturo":
                True,

            "minimoHistorico":
                MINIMO_HISTORICO,

            "minimoHistoricoRegime":
                MINIMO_REGIME,

            "janelaRecente":
                JANELA_RECENTE,

            "estrategiaColdStart":
                "Equilibrado",

            "regime":
                (
                    "Regime da última rodada disponível, "
                    "classificado por tercis calculados "
                    "somente com o histórico anterior."
                ),

            "pesos":
                PESOS

        },

        "resumo": {

            "rodadas":
                len(
                    resultados
                ),

            "adaptativo": {

                "total":
                    arredondar(
                        total_adaptativo
                    ),

                "media":
                    arredondar(
                        media_adaptativo
                    ),

                "mediana":
                    arredondar(
                        mediana_adaptativo
                    ),

                "acertosMelhorEstrategia":
                    acertos_oraculo,

                "taxaAcertoMelhorEstrategia":
                    arredondar(
                        taxa_acerto
                    )

            },

            "melhorEstrategiaFixa":
                melhor_fixa,

            "melhorFixa":
                fixas[
                    melhor_fixa
                ],

            "comparacaoAdaptativoVsMelhorFixa": {

                "ganhoMedia":
                    arredondar(
                        ganho_media
                    ),

                "ganhoTotal":
                    arredondar(
                        ganho_total
                    ),

                "ganhoPercentual":
                    arredondar(
                        ganho_percentual
                    )

            },

            "oraculo": {

                "total":
                    arredondar(
                        total_oraculo
                    ),

                "media":
                    arredondar(
                        media_oraculo
                    ),

                "eficienciaAdaptativoPercentual":
                    arredondar(
                        eficiencia_oraculo
                    )

            },

            "escolhasAdaptativo":
                escolhas

        },

        "estrategiasFixas":
            fixas,

        "rodadas":
            resultados,

        "criterios": {

            "semVazamentoFuturo":
                True,

            "amostraSuficiente":
                amostra_suficiente,

            "superouMelhorFixa":
                superou_fixa,

            "superouMelhorFixaEm1Percentual":
                superou_fixa_1pct

        },

        "decisao": {

            "decisao":
                decisao_final,

            "promover":
                False,

            "promocaoAutomatica":
                False,

            "observacao":
                (
                    "Versão experimental. "
                    "Nenhuma estratégia oficial foi alterada."
                )

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraEstrategiasOficiais":
                False,

            "usaResultadoRodadaNaEscolha":
                False,

            "usaSomenteRodadasAnteriores":
                True,

            "promocaoAutomatica":
                False

        }

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    # ==================================================
    # LOG FINAL
    # ==================================================

    print()

    print(
        "=============================================="
    )

    print(
        "RESULTADO FINAL"
    )

    print(
        "=============================================="
    )

    print(
        "Rodadas:",
        len(
            resultados
        )
    )

    print()

    print(
        "ADAPTATIVO V2"
    )

    print(
        "Média:",
        arredondar(
            media_adaptativo
        )
    )

    print(
        "Total:",
        arredondar(
            total_adaptativo
        )
    )

    print(
        "Taxa de acerto:",
        arredondar(
            taxa_acerto
        ),
        "%"
    )

    print()

    print(
        "MELHOR FIXA:"
    )

    print(
        melhor_fixa,
        "| Média:",
        arredondar(
            media_melhor_fixa
        )
    )

    print()

    print(
        "GANHO V2 VS MELHOR FIXA:"
    )

    print(
        arredondar(
            ganho_media
        ),
        "pontos/rodada"
    )

    print(
        arredondar(
            ganho_percentual
        ),
        "%"
    )

    print()

    print(
        "ORÁCULO:"
    )

    print(
        "Média:",
        arredondar(
            media_oraculo
        )
    )

    print(
        "Eficiência V2:",
        arredondar(
            eficiencia_oraculo
        ),
        "%"
    )

    print()

    print(
        "ESCOLHAS"
    )

    for nome in ESTRATEGIAS:

        print(
            nome,
            ":",
            escolhas[
                nome
            ]
        )

    print()

    print(
        "DECISÃO:",
        decisao_final
    )

    print(
        "Promoção automática: NÃO"
    )

    print()

    print(
        "Arquivo:",
        ARQUIVO_SAIDA
    )

    print(
        "=============================================="
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
