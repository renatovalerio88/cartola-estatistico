"""
=========================================================
CARTOLA ESTATÍSTICO
Benchmark Científico de Modelos
=========================================================

Compara modelos de previsão usando WALK-FORWARD REAL.

Modelos:

1. Baseline Recente
2. Ridge
3. Random Forest
4. HistGradientBoosting
5. XGBoost

OBJETIVO
---------------------------------------------------------
Não queremos apenas minimizar MAE.

Também medimos:

- correlação projeção x real;
- Top 5 por posição;
- Top 10 por posição;
- jogadores 10+ encontrados;
- jogadores 15+ encontrados;
- média real dos melhores selecionados;
- últimas 5 rodadas;
- últimas 10 rodadas.

REGRA ANTI-LEAKAGE
---------------------------------------------------------
Para prever rodada R:

    treino = rodadas < R
    teste  = rodada R

Nunca treinamos usando a própria rodada prevista.

Entrada:

data/modelagem/matriz_features.json

Saída:

data/modelagem/benchmark_modelos.json

IMPORTANTE
---------------------------------------------------------
Este script NÃO altera o motor oficial.

Ele apenas identifica candidatos melhores.

=========================================================
"""

from __future__ import annotations

import json
import math
import warnings

from pathlib import Path
from collections import defaultdict
from typing import Any


warnings.filterwarnings(
    "ignore"
)


# =========================================================
# CAMINHOS
# =========================================================

ARQUIVO_MATRIZ = Path(
    "data/modelagem/matriz_features.json"
)

ARQUIVO_SAIDA = Path(
    "data/modelagem/benchmark_modelos.json"
)


# =========================================================
# IMPORTS OPCIONAIS
# =========================================================

SKLEARN_OK = False
XGBOOST_OK = False


try:

    import numpy as np

    from sklearn.pipeline import Pipeline

    from sklearn.impute import SimpleImputer

    from sklearn.preprocessing import StandardScaler

    from sklearn.linear_model import Ridge

    from sklearn.ensemble import (
        RandomForestRegressor,
        HistGradientBoostingRegressor,
    )

    SKLEARN_OK = True

except Exception as erro:

    print(
        "[AVISO] scikit-learn indisponível:",
        erro,
    )


try:

    from xgboost import XGBRegressor

    XGBOOST_OK = True

except Exception as erro:

    print(
        "[AVISO] XGBoost indisponível:",
        erro,
    )


# =========================================================
# CONFIGURAÇÃO
# =========================================================

MIN_AMOSTRAS_TREINO = 150

MIN_RODADAS_TREINO = 3


POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC",
]


# Features que sabemos serem numéricas.

FEATURES_NUMERICAS = [

    # histórico temporal

    "jogosHistoricos",

    "media3",
    "media5",
    "media10",
    "mediaGeral",

    "ewma",

    "mediana",

    "piso20",
    "teto80",

    "desvioPadrao",
    "regularidade",

    "tendencia3x5",
    "tendencia5x10",
    "tendenciaEWMA",

    "taxa5Mais",
    "taxa10Mais",
    "taxa15Mais",
    "taxaNegativa",


    # pontuação básica

    "mediaBasica",
    "mediaBasica3",
    "mediaBasica5",
    "mediaBasica10",

    "taxaBasica3Mais",
    "taxaBasica5Mais",

    "dependenciaGolAssistenciaSG",


    # grupos de scouts

    "mediaOfensivaScouts",
    "mediaDefensivaScouts",


    # scouts individuais

    "scoutG",
    "scoutA",
    "scoutDS",
    "scoutFS",
    "scoutFF",
    "scoutFD",
    "scoutFT",
    "scoutSG",
    "scoutDE",
    "scoutCA",
    "scoutFC",


    # contexto atual

    "preco",
    "variacao",

    "mando",

    "statusId",

    "minutosEsperados",
    "titularidade",

    "forcaAdversarioIndice",
    "notaForcaAdversario",

    "pontosCedidosMediaPosicao",
    "pontosCedidosNota",

    "chanceSG",
]


# =========================================================
# UTILITÁRIOS
# =========================================================

def carregar_json(
    caminho: Path,
) -> Any:

    return json.loads(
        caminho.read_text(
            encoding="utf-8"
        )
    )


def salvar_json(
    caminho: Path,
    dados: Any,
) -> None:

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    caminho.write_text(

        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),

        encoding="utf-8",
    )


def numero(
    valor: Any,
    padrao: float = 0.0,
) -> float:

    try:

        if valor is None:

            return padrao

        n = float(
            valor
        )

        if math.isfinite(
            n
        ):

            return n

    except Exception:

        pass

    return padrao


def media(
    valores,
):

    valores = list(
        valores
    )

    if not valores:

        return 0.0

    return (
        sum(
            valores
        )
        /
        len(
            valores
        )
    )


def arredondar(
    valor,
    casas=4,
):

    return round(
        numero(
            valor
        ),
        casas,
    )


def mae(
    reais,
    previstos,
):

    if not reais:

        return 0.0

    return media(

        abs(
            real - previsto
        )

        for real, previsto
        in zip(
            reais,
            previstos
        )
    )


def rmse(
    reais,
    previstos,
):

    if not reais:

        return 0.0

    return math.sqrt(

        media(

            (
                real - previsto
            ) ** 2

            for real, previsto
            in zip(
                reais,
                previstos
            )

        )

    )


def correlacao(
    reais,
    previstos,
):

    if (
        len(reais) < 3
        or
        len(previstos) < 3
        or
        len(reais) != len(previstos)
    ):

        return 0.0


    media_real = media(
        reais
    )

    media_prev = media(
        previstos
    )


    numerador = sum(

        (
            real -
            media_real
        )
        *
        (
            previsto -
            media_prev
        )

        for real, previsto
        in zip(
            reais,
            previstos
        )

    )


    parte_real = math.sqrt(

        sum(

            (
                real -
                media_real
            ) ** 2

            for real in reais

        )

    )


    parte_prev = math.sqrt(

        sum(

            (
                previsto -
                media_prev
            ) ** 2

            for previsto in previstos

        )

    )


    denominador = (
        parte_real *
        parte_prev
    )


    if denominador == 0:

        return 0.0


    return (
        numerador
        /
        denominador
    )


def percentual(
    quantidade,
    total,
):

    if total <= 0:

        return 0.0

    return (
        quantidade
        /
        total
        *
        100
    )


# =========================================================
# FEATURES
# =========================================================

def vetor_features(
    linha,
):

    features = linha.get(
        "features",
        {}
    )


    vetor = [

        numero(
            features.get(
                nome
            ),
            float("nan"),
        )

        for nome in FEATURES_NUMERICAS

    ]


    # one-hot posição

    posicao = str(
        linha.get(
            "posicao",
            ""
        )
    ).upper()


    for posicao_alvo in POSICOES:

        vetor.append(

            1.0
            if posicao == posicao_alvo
            else 0.0

        )


    return vetor


def nomes_features():

    nomes = list(
        FEATURES_NUMERICAS
    )

    nomes.extend(

        f"posicao_{posicao}"

        for posicao
        in POSICOES

    )

    return nomes


# =========================================================
# BASELINE RECENTE
# =========================================================

def previsao_baseline(
    linha,
):

    f = linha.get(
        "features",
        {}
    )


    media3 = numero(
        f.get(
            "media3"
        )
    )

    media5 = numero(
        f.get(
            "media5"
        )
    )

    media10 = numero(
        f.get(
            "media10"
        )
    )

    ewma_valor = numero(
        f.get(
            "ewma"
        )
    )

    geral = numero(
        f.get(
            "mediaGeral"
        )
    )


    # Baseline temporal simples.
    #
    # Não é candidato final.
    # Serve como régua mínima para ML.

    return (

        media3 * 0.25
        +
        media5 * 0.25
        +
        media10 * 0.15
        +
        ewma_valor * 0.25
        +
        geral * 0.10

    )


# =========================================================
# MODELOS
# =========================================================

def criar_modelos():

    modelos = {}


    if not SKLEARN_OK:

        return modelos


    modelos[
        "Ridge"
    ] = Pipeline([

        (
            "imputer",
            SimpleImputer(
                strategy="median"
            )
        ),

        (
            "scaler",
            StandardScaler()
        ),

        (
            "model",
            Ridge(
                alpha=10.0
            )
        ),
    ])


    modelos[
        "RandomForest"
    ] = Pipeline([

        (
            "imputer",
            SimpleImputer(
                strategy="median"
            )
        ),

        (
            "model",
            RandomForestRegressor(

                n_estimators=250,

                max_depth=8,

                min_samples_leaf=8,

                max_features=0.70,

                random_state=42,

                n_jobs=-1,
            )
        ),
    ])


    modelos[
        "HistGradientBoosting"
    ] = Pipeline([

        (
            "imputer",
            SimpleImputer(
                strategy="median"
            )
        ),

        (
            "model",
            HistGradientBoostingRegressor(

                learning_rate=0.05,

                max_iter=250,

                max_leaf_nodes=20,

                min_samples_leaf=20,

                l2_regularization=1.0,

                random_state=42,
            )
        ),
    ])


    if XGBOOST_OK:

        modelos[
            "XGBoost"
        ] = Pipeline([

            (
                "imputer",
                SimpleImputer(
                    strategy="median"
                )
            ),

            (
                "model",
                XGBRegressor(

                    n_estimators=350,

                    learning_rate=0.035,

                    max_depth=4,

                    min_child_weight=8,

                    subsample=0.85,

                    colsample_bytree=0.80,

                    reg_alpha=0.20,

                    reg_lambda=2.0,

                    objective="reg:squarederror",

                    random_state=42,

                    n_jobs=-1,
                )
            ),
        ])


    return modelos


# =========================================================
# METAS DE RANKING
# =========================================================

def ids_top_real(
    linhas,
    quantidade,
):

    por_posicao = defaultdict(
        list
    )


    for linha in linhas:

        posicao = str(
            linha.get(
                "posicao",
                "OUT"
            )
        ).upper()

        por_posicao[
            posicao
        ].append(
            linha
        )


    resultado = {}


    for posicao, lista in (
        por_posicao.items()
    ):

        ordenados = sorted(

            lista,

            key=lambda item:
                numero(
                    item.get(
                        "target",
                        {}
                    ).get(
                        "pontuacaoReal"
                    )
                ),

            reverse=True,
        )


        resultado[
            posicao
        ] = set(

            str(
                item.get(
                    "atletaId"
                )
            )

            for item
            in ordenados[
                :quantidade
            ]

        )


    return resultado


# =========================================================
# AVALIAÇÃO DE UMA RODADA
# =========================================================

def avaliar_rodada(
    linhas,
    previsoes,
):

    avaliados = []


    for linha, previsao in zip(
        linhas,
        previsoes,
    ):

        copia = dict(
            linha
        )

        copia[
            "_previsao"
        ] = numero(
            previsao
        )

        avaliados.append(
            copia
        )


    reais = [

        numero(
            item[
                "target"
            ][
                "pontuacaoReal"
            ]
        )

        for item in avaliados

    ]


    previstos = [

        item[
            "_previsao"
        ]

        for item in avaliados

    ]


    top5_real = ids_top_real(
        avaliados,
        5,
    )

    top10_real = ids_top_real(
        avaliados,
        10,
    )


    por_posicao = defaultdict(
        list
    )


    for item in avaliados:

        posicao = str(
            item.get(
                "posicao",
                "OUT"
            )
        ).upper()

        por_posicao[
            posicao
        ].append(
            item
        )


    selecionados = []

    acertos_top5 = 0

    acertos_top10 = 0

    capturados10 = 0

    capturados15 = 0


    detalhe_posicoes = {}


    for posicao, lista in (
        por_posicao.items()
    ):

        ranking = sorted(

            lista,

            key=lambda item:
                item[
                    "_previsao"
                ],

            reverse=True,
        )


        escolhidos = ranking[
            :5
        ]


        selecionados.extend(
            escolhidos
        )


        ids_escolhidos = {

            str(
                item.get(
                    "atletaId"
                )
            )

            for item
            in escolhidos

        }


        acertos5 = len(

            ids_escolhidos
            &
            top5_real.get(
                posicao,
                set(),
            )

        )


        acertos10 = len(

            ids_escolhidos
            &
            top10_real.get(
                posicao,
                set(),
            )

        )


        qtd10 = sum(

            1

            for item
            in escolhidos

            if numero(
                item[
                    "target"
                ][
                    "pontuacaoReal"
                ]
            ) >= 10

        )


        qtd15 = sum(

            1

            for item
            in escolhidos

            if numero(
                item[
                    "target"
                ][
                    "pontuacaoReal"
                ]
            ) >= 15

        )


        acertos_top5 += acertos5

        acertos_top10 += acertos10

        capturados10 += qtd10

        capturados15 += qtd15


        detalhe_posicoes[
            posicao
        ] = {

            "selecionados":
                len(
                    escolhidos
                ),

            "top5":
                acertos5,

            "top10":
                acertos10,

            "dezMais":
                qtd10,

            "quinzeMais":
                qtd15,

            "mediaReal":

                arredondar(

                    media(

                        numero(
                            item[
                                "target"
                            ][
                                "pontuacaoReal"
                            ]
                        )

                        for item
                        in escolhidos

                    ),

                    3,
                ),
        }


    qtd_selecionados = len(
        selecionados
    )


    media_real_selecionados = media(

        numero(
            item[
                "target"
            ][
                "pontuacaoReal"
            ]
        )

        for item
        in selecionados

    )


    return {

        "mae":
            arredondar(
                mae(
                    reais,
                    previstos,
                )
            ),

        "rmse":
            arredondar(
                rmse(
                    reais,
                    previstos,
                )
            ),

        "correlacao":
            arredondar(
                correlacao(
                    reais,
                    previstos,
                )
            ),

        "selecionados":
            qtd_selecionados,

        "acertosTop5":
            acertos_top5,

        "acertosTop10":
            acertos_top10,

        "capturados10Mais":
            capturados10,

        "capturados15Mais":
            capturados15,

        "taxaTop5":

            arredondar(

                percentual(
                    acertos_top5,
                    qtd_selecionados,
                )
            ),

        "taxaTop10":

            arredondar(

                percentual(
                    acertos_top10,
                    qtd_selecionados,
                )
            ),

        "taxa10Mais":

            arredondar(

                percentual(
                    capturados10,
                    qtd_selecionados,
                )
            ),

        "taxa15Mais":

            arredondar(

                percentual(
                    capturados15,
                    qtd_selecionados,
                )
            ),

        "mediaRealSelecionados":
            arredondar(
                media_real_selecionados
            ),

        "posicoes":
            detalhe_posicoes,
    }


# =========================================================
# ACUMULAÇÃO
# =========================================================

def resumir_resultados(
    resultados,
):

    if not resultados:

        return {}


    total_selecionados = sum(

        item[
            "selecionados"
        ]

        for item
        in resultados

    )


    acertos5 = sum(

        item[
            "acertosTop5"
        ]

        for item
        in resultados

    )


    acertos10 = sum(

        item[
            "acertosTop10"
        ]

        for item
        in resultados

    )


    capturados10 = sum(

        item[
            "capturados10Mais"
        ]

        for item
        in resultados

    )


    capturados15 = sum(

        item[
            "capturados15Mais"
        ]

        for item
        in resultados

    )


    soma_real = sum(

        item[
            "mediaRealSelecionados"
        ]
        *
        item[
            "selecionados"
        ]

        for item
        in resultados

    )


    return {

        "rodadas":
            len(
                resultados
            ),

        "mae":
            arredondar(
                media(
                    item[
                        "mae"
                    ]
                    for item
                    in resultados
                )
            ),

        "rmse":
            arredondar(
                media(
                    item[
                        "rmse"
                    ]
                    for item
                    in resultados
                )
            ),

        "correlacao":
            arredondar(
                media(
                    item[
                        "correlacao"
                    ]
                    for item
                    in resultados
                )
            ),

        "selecionados":
            total_selecionados,

        "taxaTop5":

            arredondar(

                percentual(
                    acertos5,
                    total_selecionados,
                )
            ),

        "taxaTop10":

            arredondar(

                percentual(
                    acertos10,
                    total_selecionados,
                )
            ),

        "taxa10Mais":

            arredondar(

                percentual(
                    capturados10,
                    total_selecionados,
                )
            ),

        "taxa15Mais":

            arredondar(

                percentual(
                    capturados15,
                    total_selecionados,
                )
            ),

        "mediaRealSelecionados":

            arredondar(

                (
                    soma_real
                    /
                    total_selecionados
                )

                if total_selecionados
                else 0
            ),
    }


# =========================================================
# SCORE DE DECISÃO
# =========================================================

def score_modelo(
    resumo,
):

    """
    Nosso objetivo não é MAE puro.

    Queremos especialmente escolher bons jogadores.

    Score experimental:

    - 30% Top5
    - 20% Top10
    - 20% captura 10+
    - 15% captura 15+
    - 10% média real selecionados
    - 5% correlação

    MAE aparece como penalização pequena.

    Esse score ainda é LABORATORIAL.
    """

    if not resumo:

        return -999


    score = (

        resumo.get(
            "taxaTop5",
            0
        )
        *
        0.30

        +

        resumo.get(
            "taxaTop10",
            0
        )
        *
        0.20

        +

        resumo.get(
            "taxa10Mais",
            0
        )
        *
        0.20

        +

        resumo.get(
            "taxa15Mais",
            0
        )
        *
        0.15

        +

        resumo.get(
            "mediaRealSelecionados",
            0
        )
        *
        2
        *
        0.10

        +

        max(
            0,
            resumo.get(
                "correlacao",
                0
            )
        )
        *
        100
        *
        0.05

        -

        resumo.get(
            "mae",
            0
        )
        *
        0.25
    )


    return arredondar(
        score
    )


# =========================================================
# WALK-FORWARD
# =========================================================

def executar_walk_forward(
    linhas,
):

    rodadas = sorted({

        int(
            linha[
                "rodada"
            ]
        )

        for linha
        in linhas

    })


    modelos_disponiveis = (
        criar_modelos()
    )


    nomes = [
        "BaselineRecente",
        *modelos_disponiveis.keys(),
    ]


    resultados_modelos = {

        nome:
            []

        for nome
        in nomes

    }


    rodadas_utilizadas = []


    for rodada in rodadas:

        treino = [

            linha

            for linha
            in linhas

            if int(
                linha[
                    "rodada"
                ]
            ) < rodada

        ]


        teste = [

            linha

            for linha
            in linhas

            if int(
                linha[
                    "rodada"
                ]
            ) == rodada

        ]


        rodadas_treino = {

            int(
                linha[
                    "rodada"
                ]
            )

            for linha
            in treino

        }


        if (
            len(
                treino
            ) < MIN_AMOSTRAS_TREINO
            or
            len(
                rodadas_treino
            ) < MIN_RODADAS_TREINO
            or
            not teste
        ):

            continue


        print(
            ""
        )

        print(
            "Rodada",
            rodada,
            "| treino:",
            len(treino),
            "| teste:",
            len(teste),
        )


        # =============================================
        # BASELINE
        # =============================================

        previsoes_baseline = [

            previsao_baseline(
                linha
            )

            for linha
            in teste

        ]


        avaliacao_baseline = (
            avaliar_rodada(
                teste,
                previsoes_baseline,
            )
        )


        avaliacao_baseline[
            "rodada"
        ] = rodada


        resultados_modelos[
            "BaselineRecente"
        ].append(
            avaliacao_baseline
        )


        # =============================================
        # ML
        # =============================================

        if SKLEARN_OK:

            X_treino = np.asarray(

                [

                    vetor_features(
                        linha
                    )

                    for linha
                    in treino

                ],

                dtype=float,
            )


            y_treino = np.asarray(

                [

                    numero(
                        linha[
                            "target"
                        ][
                            "pontuacaoReal"
                        ]
                    )

                    for linha
                    in treino

                ],

                dtype=float,
            )


            X_teste = np.asarray(

                [

                    vetor_features(
                        linha
                    )

                    for linha
                    in teste

                ],

                dtype=float,
            )


            for nome, modelo in (
                modelos_disponiveis.items()
            ):

                try:

                    modelo.fit(
                        X_treino,
                        y_treino,
                    )


                    previsoes = (
                        modelo.predict(
                            X_teste
                        )
                    )


                    avaliacao = (
                        avaliar_rodada(
                            teste,
                            previsoes,
                        )
                    )


                    avaliacao[
                        "rodada"
                    ] = rodada


                    resultados_modelos[
                        nome
                    ].append(
                        avaliacao
                    )


                except Exception as erro:

                    print(
                        "[ERRO]",
                        nome,
                        "R",
                        rodada,
                        ":",
                        erro,
                    )


        rodadas_utilizadas.append(
            rodada
        )


    return (
        resultados_modelos,
        rodadas_utilizadas,
    )


# =========================================================
# COMPARAÇÃO
# =========================================================

def criar_comparacao(
    resultados_modelos,
):

    comparacao = {}


    for nome, resultados in (
        resultados_modelos.items()
    ):

        global_ = resumir_resultados(
            resultados
        )


        ultimas5 = resumir_resultados(
            resultados[
                -5:
            ]
        )


        ultimas10 = resumir_resultados(
            resultados[
                -10:
            ]
        )


        comparacao[
            nome
        ] = {

            "global":
                global_,

            "ultimas5":
                ultimas5,

            "ultimas10":
                ultimas10,

            "scoreGlobal":
                score_modelo(
                    global_
                ),

            "scoreUltimas5":
                score_modelo(
                    ultimas5
                ),

            "scoreUltimas10":
                score_modelo(
                    ultimas10
                ),

            "rodadas":
                resultados,
        }


    return comparacao


def score_final(
    dados,
):

    """
    Priorizamos o período recente sem abandonar
    robustez histórica.

    45% últimas 5
    35% últimas 10
    20% global
    """

    return arredondar(

        dados.get(
            "scoreUltimas5",
            0
        )
        *
        0.45

        +

        dados.get(
            "scoreUltimas10",
            0
        )
        *
        0.35

        +

        dados.get(
            "scoreGlobal",
            0
        )
        *
        0.20

    )


# =========================================================
# EXECUÇÃO
# =========================================================

def executar():

    print(
        ""
    )

    print(
        "=============================================="
    )

    print(
        "BENCHMARK CIENTÍFICO DE MODELOS"
    )

    print(
        "=============================================="
    )


    if not ARQUIVO_MATRIZ.exists():

        raise FileNotFoundError(

            "Matriz de features não encontrada: "
            f"{ARQUIVO_MATRIZ}"

        )


    dados = carregar_json(
        ARQUIVO_MATRIZ
    )


    linhas = dados.get(
        "linhas",
        []
    )


    if not linhas:

        raise RuntimeError(
            "Matriz de features está vazia."
        )


    print(
        "Amostras:",
        len(linhas),
    )

    print(
        "scikit-learn:",
        "OK"
        if SKLEARN_OK
        else "NÃO INSTALADO",
    )

    print(
        "XGBoost:",
        "OK"
        if XGBOOST_OK
        else "NÃO INSTALADO",
    )


    resultados_modelos, rodadas = (
        executar_walk_forward(
            linhas
        )
    )


    comparacao = criar_comparacao(
        resultados_modelos
    )


    ranking = []


    for nome, dados_modelo in (
        comparacao.items()
    ):

        score = score_final(
            dados_modelo
        )


        ranking.append({

            "modelo":
                nome,

            "scoreFinal":
                score,

            "scoreGlobal":
                dados_modelo.get(
                    "scoreGlobal"
                ),

            "scoreUltimas5":
                dados_modelo.get(
                    "scoreUltimas5"
                ),

            "scoreUltimas10":
                dados_modelo.get(
                    "scoreUltimas10"
                ),

            "maeGlobal":
                dados_modelo.get(
                    "global",
                    {}
                ).get(
                    "mae"
                ),

            "mediaRealSelecionados":
                dados_modelo.get(
                    "global",
                    {}
                ).get(
                    "mediaRealSelecionados"
                ),

            "taxaTop5":
                dados_modelo.get(
                    "global",
                    {}
                ).get(
                    "taxaTop5"
                ),

            "taxa10Mais":
                dados_modelo.get(
                    "global",
                    {}
                ).get(
                    "taxa10Mais"
                ),

            "taxa15Mais":
                dados_modelo.get(
                    "global",
                    {}
                ).get(
                    "taxa15Mais"
                ),
        })


    ranking.sort(

        key=lambda item:
            item[
                "scoreFinal"
            ],

        reverse=True,
    )


    vencedor = (

        ranking[0][
            "modelo"
        ]

        if ranking

        else None

    )


    saida = {

        "modelo":
            "benchmark_modelos_v1",

        "walkForward":
            True,

        "antiLeakage":
            True,

        "criterioFinal": {

            "ultimas5":
                0.45,

            "ultimas10":
                0.35,

            "global":
                0.20,
        },

        "dependencias": {

            "sklearn":
                SKLEARN_OK,

            "xgboost":
                XGBOOST_OK,
        },

        "features": {

            "quantidade":
                len(
                    nomes_features()
                ),

            "nomes":
                nomes_features(),
        },

        "rodadasUtilizadas":
            rodadas,

        "ranking":
            ranking,

        "vencedorExperimental":
            vencedor,

        "comparacao":
            comparacao,

        "promoverAutomaticamente":
            False,

        "observacao":

            (
                "Nenhum modelo deve ser promovido ao motor "
                "antes da análise do laboratório, estabilidade "
                "por posição e validação da escalação completa."
            ),
    }


    salvar_json(
        ARQUIVO_SAIDA,
        saida,
    )


    print(
        ""
    )

    print(
        "=============================================="
    )

    print(
        "RANKING FINAL"
    )

    print(
        "=============================================="
    )


    for indice, item in enumerate(
        ranking,
        start=1,
    ):

        print(
            f"{indice}.",
            item[
                "modelo"
            ],
        )

        print(
            "   Score final:",
            item[
                "scoreFinal"
            ],
        )

        print(
            "   MAE:",
            item[
                "maeGlobal"
            ],
        )

        print(
            "   Média real Top selecionados:",
            item[
                "mediaRealSelecionados"
            ],
        )

        print(
            "   Top5:",
            item[
                "taxaTop5"
            ],
            "%",
        )

        print(
            "   10+:",
            item[
                "taxa10Mais"
            ],
            "%",
        )

        print(
            "   15+:",
            item[
                "taxa15Mais"
            ],
            "%",
        )

        print(
            ""
        )


    print(
        "Vencedor experimental:",
        vencedor,
    )

    print(
        ""
    )

    print(
        "Resultado salvo em:",
        ARQUIVO_SAIDA,
    )

    print(
        "=============================================="
    )


if __name__ == "__main__":

    executar()
