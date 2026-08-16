"""
=========================================================
CARTOLA ESTATÍSTICO
Análise de Regimes das Estratégias

Versão:
analise_regimes_estrategias_v1

Entrada:
data/simulacao-times.json

Saída:
data/analise-regimes-estrategias.json

Objetivo:
Descobrir em quais contextos históricos cada estratégia
de escalação apresenta melhor desempenho.

Estratégias:

- Conservador
- Equilibrado
- Agressivo

Análises:

1. desempenho global;
2. regimes de pontuação da rodada;
3. frequência de vitória;
4. margem de vitória;
5. estabilidade;
6. desempenho recente;
7. persistência do vencedor;
8. transições entre vencedores;
9. comportamento após vitória;
10. sinais úteis para futura estratégia adaptativa.

IMPORTANTE:

Este arquivo é exclusivamente experimental.

Não altera:

- modelo oficial;
- pesos;
- projeções;
- escalações;
- estratégia oficial.

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
    "analise-regimes-estrategias.json"
)


ESTRATEGIAS = [

    "Conservador",
    "Equilibrado",
    "Agressivo"

]


JANELA_RECENTE = 5

TOLERANCIA_EMPATE = 0.001


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(
    caminho
):

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

        resultado = float(
            valor
        )

        if math.isfinite(
            resultado
        ):

            return resultado

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
# CARREGAMENTO DAS RODADAS
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
                    ),

                "mae":
                    numero(
                        estrategia.get(
                            "maeJogadores"
                        )
                    ),

                "cobertura":
                    numero(
                        estrategia.get(
                            "coberturaResultadosPercentual"
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

            for dados in estrategias.values()

        ]

        media_rodada = media_segura(
            pontos
        )

        maior = max(
            pontos
        )

        menor = min(
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

            ) <= TOLERANCIA_EMPATE

        ]

        rodadas.append({

            "rodada":
                int(
                    numero_rodada
                ),

            "estrategias":
                estrategias,

            "mediaEstrategias":
                media_rodada,

            "melhorPontuacao":
                maior,

            "piorPontuacao":
                menor,

            "amplitude":
                maior -
                menor,

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

        return ordenados[
            0
        ]

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
# DEFINIÇÃO DOS REGIMES
# ======================================================

def calcular_limites_regimes(
    rodadas
):

    medias = [

        rodada[
            "mediaEstrategias"
        ]

        for rodada in rodadas

    ]

    limite_baixo = percentil(
        medias,
        1 / 3
    )

    limite_alto = percentil(
        medias,
        2 / 3
    )

    return {

        "baixoAte":
            limite_baixo,

        "medioAte":
            limite_alto

    }


def classificar_regime(
    media_rodada,
    limites
):

    if (
        media_rodada
        <=
        limites[
            "baixoAte"
        ]
    ):

        return "baixo"

    if (
        media_rodada
        <=
        limites[
            "medioAte"
        ]
    ):

        return "medio"

    return "alto"


# ======================================================
# RESUMO DE PONTUAÇÕES
# ======================================================

def resumir_pontuacoes(
    pontos
):

    if not pontos:

        return {

            "quantidade":
                0,

            "total":
                0,

            "media":
                0,

            "mediana":
                0,

            "minimo":
                0,

            "maximo":
                0,

            "desvioPadrao":
                0

        }

    return {

        "quantidade":
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

        "minimo":
            arredondar(
                min(
                    pontos
                )
            ),

        "maximo":
            arredondar(
                max(
                    pontos
                )
            ),

        "desvioPadrao":
            arredondar(
                desvio_seguro(
                    pontos
                )
            )

    }


# ======================================================
# DESEMPENHO GLOBAL
# ======================================================

def analisar_global(
    rodadas
):

    resultado = {}

    for estrategia in ESTRATEGIAS:

        pontos = []

        maes = []

        bonus_capitao = []

        vitorias = 0

        empates_vitoria = 0

        margens_melhor_adversario = []

        for rodada in rodadas:

            dados = rodada[
                "estrategias"
            ][
                estrategia
            ]

            valor = dados[
                "pontos"
            ]

            pontos.append(
                valor
            )

            maes.append(
                dados[
                    "mae"
                ]
            )

            bonus_capitao.append(
                dados[
                    "bonusCapitao"
                ]
            )

            adversarios = [

                outro[
                    "pontos"
                ]

                for nome, outro
                in rodada[
                    "estrategias"
                ].items()

                if nome != estrategia

            ]

            melhor_adversario = max(
                adversarios
            )

            margem = (
                valor -
                melhor_adversario
            )

            margens_melhor_adversario.append(
                margem
            )

            if estrategia in rodada[
                "vencedores"
            ]:

                if len(
                    rodada[
                        "vencedores"
                    ]
                ) == 1:

                    vitorias += 1

                else:

                    empates_vitoria += 1

        resumo = resumir_pontuacoes(
            pontos
        )

        resultado[
            estrategia
        ] = {

            **resumo,

            "vitorias":
                vitorias,

            "empatesNaLideranca":
                empates_vitoria,

            "taxaVitoriasPercentual":
                arredondar(

                    percentual(
                        vitorias,
                        len(
                            rodadas
                        )
                    )

                ),

            "taxaLiderancaPercentual":
                arredondar(

                    percentual(

                        vitorias +
                        empates_vitoria,

                        len(
                            rodadas
                        )

                    )

                ),

            "maeMedio":
                arredondar(
                    media_segura(
                        maes
                    ),
                    3
                ),

            "bonusCapitaoMedio":
                arredondar(
                    media_segura(
                        bonus_capitao
                    )
                ),

            "margemMediaContraMelhorAdversario":
                arredondar(

                    media_segura(
                        margens_melhor_adversario
                    )

                ),

            "estabilidade":
                arredondar(

                    max(

                        0,

                        100 -
                        (
                            desvio_seguro(
                                pontos
                            )
                            *
                            5
                        )

                    )

                )

        }

    return resultado


# ======================================================
# ANÁLISE POR REGIME
# ======================================================

def analisar_por_regime(
    rodadas,
    limites
):

    regimes = {

        "baixo": [],
        "medio": [],
        "alto": []

    }

    for rodada in rodadas:

        regime = classificar_regime(

            rodada[
                "mediaEstrategias"
            ],

            limites

        )

        rodada[
            "regime"
        ] = regime

        regimes[
            regime
        ].append(
            rodada
        )

    resultado = {}

    for nome_regime, lista in (
        regimes.items()
    ):

        estrategias = {}

        for estrategia in ESTRATEGIAS:

            pontos = [

                rodada[
                    "estrategias"
                ][
                    estrategia
                ][
                    "pontos"
                ]

                for rodada in lista

            ]

            vitorias = sum(

                1

                for rodada in lista

                if (
                    estrategia
                    in
                    rodada[
                        "vencedores"
                    ]
                    and
                    len(
                        rodada[
                            "vencedores"
                        ]
                    ) == 1
                )

            )

            liderancas = sum(

                1

                for rodada in lista

                if estrategia
                in
                rodada[
                    "vencedores"
                ]

            )

            resumo = resumir_pontuacoes(
                pontos
            )

            estrategias[
                estrategia
            ] = {

                **resumo,

                "vitorias":
                    vitorias,

                "liderancas":
                    liderancas,

                "taxaVitoriasPercentual":
                    arredondar(

                        percentual(
                            vitorias,
                            len(
                                lista
                            )
                        )

                    ),

                "taxaLiderancaPercentual":
                    arredondar(

                        percentual(
                            liderancas,
                            len(
                                lista
                            )
                        )

                    )

            }

        ranking_media = sorted(

            ESTRATEGIAS,

            key=lambda nome:
                numero(
                    estrategias[
                        nome
                    ][
                        "media"
                    ]
                ),

            reverse=True

        )

        ranking_vitorias = sorted(

            ESTRATEGIAS,

            key=lambda nome: (

                numero(
                    estrategias[
                        nome
                    ][
                        "vitorias"
                    ]
                ),

                numero(
                    estrategias[
                        nome
                    ][
                        "media"
                    ]
                )

            ),

            reverse=True

        )

        resultado[
            nome_regime
        ] = {

            "rodadas":
                len(
                    lista
                ),

            "numerosRodadas":

                [

                    rodada[
                        "rodada"
                    ]

                    for rodada in lista

                ],

            "mediaPontuacaoRegime":
                arredondar(

                    media_segura(

                        [

                            rodada[
                                "mediaEstrategias"
                            ]

                            for rodada in lista

                        ]

                    )

                ),

            "estrategias":
                estrategias,

            "liderPorMedia":
                (
                    ranking_media[
                        0
                    ]
                    if ranking_media
                    else None
                ),

            "liderPorVitorias":
                (
                    ranking_vitorias[
                        0
                    ]
                    if ranking_vitorias
                    else None
                )

        }

    return resultado


# ======================================================
# DESEMPENHO RECENTE
# ======================================================

def analisar_recente(
    rodadas
):

    recentes = rodadas[
        -JANELA_RECENTE:
    ]

    resultado = {}

    for estrategia in ESTRATEGIAS:

        pontos = [

            rodada[
                "estrategias"
            ][
                estrategia
            ][
                "pontos"
            ]

            for rodada in recentes

        ]

        vitorias = sum(

            1

            for rodada in recentes

            if (
                estrategia
                in
                rodada[
                    "vencedores"
                ]
                and
                len(
                    rodada[
                        "vencedores"
                    ]
                ) == 1
            )

        )

        resumo = resumir_pontuacoes(
            pontos
        )

        resultado[
            estrategia
        ] = {

            **resumo,

            "vitorias":
                vitorias,

            "taxaVitoriasPercentual":
                arredondar(

                    percentual(
                        vitorias,
                        len(
                            recentes
                        )
                    )

                )

        }

    ranking = sorted(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                resultado[
                    nome
                ][
                    "media"
                ]
            ),

        reverse=True

    )

    return {

        "janela":
            JANELA_RECENTE,

        "rodadas":

            [

                rodada[
                    "rodada"
                ]

                for rodada in recentes

            ],

        "estrategias":
            resultado,

        "lider":
            (
                ranking[
                    0
                ]
                if ranking
                else None
            )

    }


# ======================================================
# TRANSIÇÕES ENTRE VENCEDORES
# ======================================================

def analisar_transicoes(
    rodadas
):

    matriz = {

        origem: {

            destino: 0

            for destino in ESTRATEGIAS

        }

        for origem in ESTRATEGIAS

    }

    oportunidades = {

        nome: 0

        for nome in ESTRATEGIAS

    }

    persistencias = {

        nome: 0

        for nome in ESTRATEGIAS

    }

    sequencia = []

    for rodada in rodadas:

        vencedores = rodada[
            "vencedores"
        ]

        if len(
            vencedores
        ) != 1:

            sequencia.append(
                None
            )

        else:

            sequencia.append(
                vencedores[
                    0
                ]
            )

    for indice in range(
        1,
        len(
            sequencia
        )
    ):

        anterior = sequencia[
            indice - 1
        ]

        atual = sequencia[
            indice
        ]

        if (
            anterior is None
            or
            atual is None
        ):

            continue

        matriz[
            anterior
        ][
            atual
        ] += 1

        oportunidades[
            anterior
        ] += 1

        if anterior == atual:

            persistencias[
                anterior
            ] += 1

    taxas_persistencia = {}

    for nome in ESTRATEGIAS:

        taxas_persistencia[
            nome
        ] = arredondar(

            percentual(

                persistencias[
                    nome
                ],

                oportunidades[
                    nome
                ]

            )

        )

    total_transicoes = sum(
        oportunidades.values()
    )

    total_persistencias = sum(
        persistencias.values()
    )

    return {

        "matriz":
            matriz,

        "oportunidades":
            oportunidades,

        "persistencias":
            persistencias,

        "taxaPersistenciaPorEstrategia":
            taxas_persistencia,

        "totalTransicoesValidas":
            total_transicoes,

        "totalPersistencias":
            total_persistencias,

        "taxaPersistenciaGlobalPercentual":
            arredondar(

                percentual(
                    total_persistencias,
                    total_transicoes
                )

            )

    }


# ======================================================
# COMPORTAMENTO APÓS VITÓRIA
# ======================================================

def analisar_pos_vitoria(
    rodadas
):

    resultado = {}

    for estrategia in ESTRATEGIAS:

        pontos_seguinte = []

        diferencas_seguinte = []

        venceu_novamente = 0

        oportunidades = 0

        for indice in range(
            len(
                rodadas
            ) - 1
        ):

            atual = rodadas[
                indice
            ]

            seguinte = rodadas[
                indice + 1
            ]

            if (
                len(
                    atual[
                        "vencedores"
                    ]
                ) != 1
            ):

                continue

            if (
                atual[
                    "vencedores"
                ][
                    0
                ]
                !=
                estrategia
            ):

                continue

            oportunidades += 1

            pontos_estrategia = (
                seguinte[
                    "estrategias"
                ][
                    estrategia
                ][
                    "pontos"
                ]
            )

            pontos_seguinte.append(
                pontos_estrategia
            )

            adversarios = [

                dados[
                    "pontos"
                ]

                for nome, dados
                in seguinte[
                    "estrategias"
                ].items()

                if nome != estrategia

            ]

            melhor_adversario = max(
                adversarios
            )

            diferencas_seguinte.append(

                pontos_estrategia
                -
                melhor_adversario

            )

            if (
                estrategia
                in
                seguinte[
                    "vencedores"
                ]
                and
                len(
                    seguinte[
                        "vencedores"
                    ]
                ) == 1
            ):

                venceu_novamente += 1

        resultado[
            estrategia
        ] = {

            "oportunidades":
                oportunidades,

            "vitoriasConsecutivas":
                venceu_novamente,

            "taxaRepeticaoVitoriaPercentual":
                arredondar(

                    percentual(
                        venceu_novamente,
                        oportunidades
                    )

                ),

            "mediaPontosRodadaSeguinte":
                arredondar(

                    media_segura(
                        pontos_seguinte
                    )

                ),

            "margemMediaRodadaSeguinte":
                arredondar(

                    media_segura(
                        diferencas_seguinte
                    )

                )

        }

    return resultado


# ======================================================
# MAPA DE VENCEDORES
# ======================================================

def construir_mapa_rodadas(
    rodadas
):

    resultado = []

    for rodada in rodadas:

        ranking = sorted(

            [

                {

                    "nome":
                        nome,

                    "pontos":
                        arredondar(
                            dados[
                                "pontos"
                            ]
                        )

                }

                for nome, dados
                in rodada[
                    "estrategias"
                ].items()

            ],

            key=lambda item:
                item[
                    "pontos"
                ],

            reverse=True

        )

        resultado.append({

            "rodada":
                rodada[
                    "rodada"
                ],

            "regime":
                rodada.get(
                    "regime"
                ),

            "mediaEstrategias":
                arredondar(
                    rodada[
                        "mediaEstrategias"
                    ]
                ),

            "amplitude":
                arredondar(
                    rodada[
                        "amplitude"
                    ]
                ),

            "vencedores":
                rodada[
                    "vencedores"
                ],

            "ranking":
                ranking

        })

    return resultado


# ======================================================
# GERAÇÃO DE SINAIS
# ======================================================

def gerar_sinais(
    global_resultado,
    regimes,
    recente,
    transicoes,
    pos_vitoria
):

    sinais = []

    # --------------------------------------------------
    # Melhor média global
    # --------------------------------------------------

    lider_global = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                global_resultado[
                    nome
                ][
                    "media"
                ]
            )

    )

    sinais.append({

        "tipo":
            "lider_media_global",

        "estrategia":
            lider_global,

        "forca":
            "informativa",

        "valor":
            global_resultado[
                lider_global
            ][
                "media"
            ],

        "descricao":
            (
                f"{lider_global} possui a maior "
                f"média histórica de pontos."
            )

    })

    # --------------------------------------------------
    # Líder por regime
    # --------------------------------------------------

    for regime in [
        "baixo",
        "medio",
        "alto"
    ]:

        dados = regimes.get(
            regime,
            {}
        )

        lider = dados.get(
            "liderPorMedia"
        )

        if not lider:

            continue

        sinais.append({

            "tipo":
                "lider_regime",

            "regime":
                regime,

            "estrategia":
                lider,

            "forca":
                "experimental",

            "valor":
                dados.get(
                    "estrategias",
                    {}
                ).get(
                    lider,
                    {}
                ).get(
                    "media"
                ),

            "descricao":
                (
                    f"{lider} apresenta a maior média "
                    f"no regime de pontuação {regime}."
                )

        })

    # --------------------------------------------------
    # Líder recente
    # --------------------------------------------------

    lider_recente = recente.get(
        "lider"
    )

    if lider_recente:

        sinais.append({

            "tipo":
                "lider_recente",

            "estrategia":
                lider_recente,

            "forca":
                "experimental",

            "valor":
                recente.get(
                    "estrategias",
                    {}
                ).get(
                    lider_recente,
                    {}
                ).get(
                    "media"
                ),

            "descricao":
                (
                    f"{lider_recente} possui a maior "
                    f"média nas últimas "
                    f"{JANELA_RECENTE} rodadas."
                )

        })

    # --------------------------------------------------
    # Persistência
    # --------------------------------------------------

    taxas = transicoes.get(
        "taxaPersistenciaPorEstrategia",
        {}
    )

    if taxas:

        maior_persistencia = max(

            ESTRATEGIAS,

            key=lambda nome:
                numero(
                    taxas.get(
                        nome
                    )
                )

        )

        sinais.append({

            "tipo":
                "persistencia_vencedor",

            "estrategia":
                maior_persistencia,

            "forca":
                "experimental",

            "valor":
                taxas.get(
                    maior_persistencia
                ),

            "descricao":
                (
                    f"{maior_persistencia} apresenta "
                    f"a maior taxa histórica de repetir "
                    f"uma vitória na rodada seguinte."
                )

        })

    # --------------------------------------------------
    # Pós-vitória
    # --------------------------------------------------

    candidatos_pos = [

        nome

        for nome in ESTRATEGIAS

        if numero(
            pos_vitoria.get(
                nome,
                {}
            ).get(
                "oportunidades"
            )
        ) > 0

    ]

    if candidatos_pos:

        melhor_pos = max(

            candidatos_pos,

            key=lambda nome:
                numero(
                    pos_vitoria[
                        nome
                    ][
                        "taxaRepeticaoVitoriaPercentual"
                    ]
                )

        )

        sinais.append({

            "tipo":
                "desempenho_pos_vitoria",

            "estrategia":
                melhor_pos,

            "forca":
                "experimental",

            "valor":
                pos_vitoria[
                    melhor_pos
                ][
                    "taxaRepeticaoVitoriaPercentual"
                ],

            "descricao":
                (
                    f"{melhor_pos} possui a maior taxa "
                    f"de vitória consecutiva após vencer "
                    f"uma rodada."
                )

        })

    return sinais


# ======================================================
# DIAGNÓSTICO
# ======================================================

def gerar_diagnostico(
    global_resultado,
    regimes,
    recente,
    transicoes
):

    lider_global = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                global_resultado[
                    nome
                ][
                    "media"
                ]
            )

    )

    lideres_regimes = {

        regime:
            dados.get(
                "liderPorMedia"
            )

        for regime, dados
        in regimes.items()

    }

    lideres_validos = [

        nome

        for nome in lideres_regimes.values()

        if nome
    ]

    regimes_divergentes = (
        len(
            set(
                lideres_validos
            )
        )
        >
        1
    )

    lider_recente = recente.get(
        "lider"
    )

    persistencia_global = numero(

        transicoes.get(
            "taxaPersistenciaGlobalPercentual"
        )

    )

    if regimes_divergentes:

        utilidade_adaptativa = (
            "ALTA"
        )

        motivo = (

            "Estratégias diferentes lideram regimes "
            "distintos de pontuação, indicando possível "
            "valor para seleção adaptativa."

        )

    elif (
        lider_recente
        and
        lider_recente != lider_global
    ):

        utilidade_adaptativa = (
            "MODERADA"
        )

        motivo = (

            "O líder recente difere do líder histórico, "
            "sugerindo possível mudança temporal de regime."

        )

    else:

        utilidade_adaptativa = (
            "BAIXA"
        )

        motivo = (

            "Não foi detectada divergência forte entre "
            "os principais regimes históricos."
        )

    return {

        "liderMediaGlobal":
            lider_global,

        "liderRecente":
            lider_recente,

        "lideresPorRegime":
            lideres_regimes,

        "regimesComLideresDiferentes":
            regimes_divergentes,

        "taxaPersistenciaVencedorPercentual":
            arredondar(
                persistencia_global
            ),

        "utilidadePotencialModeloAdaptativo":
            utilidade_adaptativa,

        "motivo":
            motivo

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
        "ANÁLISE DE REGIMES DAS ESTRATÉGIAS"
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

        resultado = {

            "modelo":
                "analise_regimes_estrategias_v1",

            "status":
                "sem_dados",

            "descricao":
                (
                    "Não existem rodadas suficientes "
                    "para análise de regimes."
                )

        }

        salvar_json(
            ARQUIVO_SAIDA,
            resultado
        )

        print(
            "Nenhuma rodada válida encontrada."
        )

        return

    limites = calcular_limites_regimes(
        rodadas
    )

    global_resultado = analisar_global(
        rodadas
    )

    regimes = analisar_por_regime(
        rodadas,
        limites
    )

    recente = analisar_recente(
        rodadas
    )

    transicoes = analisar_transicoes(
        rodadas
    )

    pos_vitoria = analisar_pos_vitoria(
        rodadas
    )

    mapa_rodadas = construir_mapa_rodadas(
        rodadas
    )

    sinais = gerar_sinais(

        global_resultado,

        regimes,

        recente,

        transicoes,

        pos_vitoria

    )

    diagnostico = gerar_diagnostico(

        global_resultado,

        regimes,

        recente,

        transicoes

    )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "analise_regimes_estrategias_v1",

        "descricao":
            (
                "Análise histórica dos regimes de "
                "desempenho das estratégias Conservador, "
                "Equilibrado e Agressivo."
            ),

        "metodologia": {

            "regimes":
                (
                    "As rodadas são classificadas em "
                    "baixo, médio e alto usando tercis da "
                    "média de pontuação das três estratégias."
                ),

            "janelaRecente":
                JANELA_RECENTE,

            "semVazamentoFuturoNaAnaliseDescritiva":
                True,

            "observacao":
                (
                    "Os regimes históricos são utilizados "
                    "somente para diagnóstico nesta versão. "
                    "A futura estratégia adaptativa deverá "
                    "calcular qualquer limiar usando apenas "
                    "dados anteriores à rodada prevista."
                )

        },

        "resumo": {

            "rodadas":
                len(
                    rodadas
                ),

            "primeiraRodada":
                rodadas[
                    0
                ][
                    "rodada"
                ],

            "ultimaRodada":
                rodadas[
                    -1
                ][
                    "rodada"
                ],

            "limitesRegimes": {

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

            },

            "diagnostico":
                diagnostico

        },

        "desempenhoGlobal":
            global_resultado,

        "regimes":
            regimes,

        "desempenhoRecente":
            recente,

        "transicoes":
            transicoes,

        "posVitoria":
            pos_vitoria,

        "sinaisExperimentais":
            sinais,

        "mapaRodadas":
            mapa_rodadas,

        "decisao": {

            "decisao":
                "MANTER_COMO_ANALISE_EXPERIMENTAL",

            "utilidadeModeloAdaptativo":
                diagnostico.get(
                    "utilidadePotencialModeloAdaptativo"
                ),

            "promover":
                False,

            "promocaoAutomatica":
                False,

            "observacao":
                (
                    "Os resultados devem ser usados para "
                    "desenvolver e testar uma estratégia "
                    "adaptativa em backtest progressivo."
                )

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraPesos":
                False,

            "alteraProjecoes":
                False,

            "alteraEscalacoes":
                False,

            "alteraEstrategiaOficial":
                False,

            "promocaoAutomatica":
                False

        }

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    # ==================================================
    # LOG
    # ==================================================

    print()

    print(
        "Rodadas:",
        len(
            rodadas
        )
    )

    print()

    print(
        "LIMITES DOS REGIMES"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Baixo até:",
        arredondar(
            limites[
                "baixoAte"
            ]
        )
    )

    print(
        "Médio até:",
        arredondar(
            limites[
                "medioAte"
            ]
        )
    )

    print(
        "Acima disso: alto"
    )

    print()

    print(
        "DESEMPENHO GLOBAL"
    )

    print(
        "----------------------------------------------"
    )

    for nome in ESTRATEGIAS:

        dados = global_resultado[
            nome
        ]

        print(

            nome,

            "| Média:",
            dados[
                "media"
            ],

            "| Mediana:",
            dados[
                "mediana"
            ],

            "| Vitórias:",
            dados[
                "vitorias"
            ],

            "| Taxa:",
            dados[
                "taxaVitoriasPercentual"
            ],
            "%",

            "| Desvio:",
            dados[
                "desvioPadrao"
            ],

            "| Estabilidade:",
            dados[
                "estabilidade"
            ]

        )

    print()

    print(
        "REGIMES"
    )

    print(
        "----------------------------------------------"
    )

    for regime in [
        "baixo",
        "medio",
        "alto"
    ]:

        dados = regimes[
            regime
        ]

        print()

        print(
            regime.upper(),
            "| Rodadas:",
            dados[
                "rodadas"
            ],
            "| Líder média:",
            dados[
                "liderPorMedia"
            ],
            "| Líder vitórias:",
            dados[
                "liderPorVitorias"
            ]
        )

        for nome in ESTRATEGIAS:

            estrategia = (
                dados[
                    "estrategias"
                ][
                    nome
                ]
            )

            print(

                "  ",
                nome,

                "| Média:",
                estrategia[
                    "media"
                ],

                "| Vitórias:",
                estrategia[
                    "vitorias"
                ],

                "| Taxa:",
                estrategia[
                    "taxaVitoriasPercentual"
                ],
                "%"

            )

    print()

    print(
        "DESEMPENHO RECENTE"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Rodadas:",
        recente[
            "rodadas"
        ]
    )

    print(
        "Líder:",
        recente[
            "lider"
        ]
    )

    for nome in ESTRATEGIAS:

        dados = recente[
            "estrategias"
        ][
            nome
        ]

        print(

            nome,

            "| Média:",
            dados[
                "media"
            ],

            "| Vitórias:",
            dados[
                "vitorias"
            ]

        )

    print()

    print(
        "PERSISTÊNCIA DO VENCEDOR"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Taxa global:",
        transicoes[
            "taxaPersistenciaGlobalPercentual"
        ],
        "%"
    )

    for nome in ESTRATEGIAS:

        print(

            nome,

            "| Persistência:",
            transicoes[
                "taxaPersistenciaPorEstrategia"
            ][
                nome
            ],
            "%"

        )

    print()

    print(
        "DIAGNÓSTICO"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Líder global:",
        diagnostico[
            "liderMediaGlobal"
        ]
    )

    print(
        "Líder recente:",
        diagnostico[
            "liderRecente"
        ]
    )

    print(
        "Líderes por regime:",
        diagnostico[
            "lideresPorRegime"
        ]
    )

    print(
        "Regimes divergentes:",
        diagnostico[
            "regimesComLideresDiferentes"
        ]
    )

    print(
        "Utilidade adaptativa:",
        diagnostico[
            "utilidadePotencialModeloAdaptativo"
        ]
    )

    print(
        "Motivo:",
        diagnostico[
            "motivo"
        ]
    )

    print()

    print(
        "SINAIS EXPERIMENTAIS"
    )

    print(
        "----------------------------------------------"
    )

    for sinal in sinais:

        print(

            sinal.get(
                "tipo"
            ),

            "|",

            sinal.get(
                "estrategia"
            ),

            "|",

            sinal.get(
                "valor"
            )

        )

    print()

    print(
        "DECISÃO:"
    )

    print(
        "MANTER_COMO_ANALISE_EXPERIMENTAL"
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
