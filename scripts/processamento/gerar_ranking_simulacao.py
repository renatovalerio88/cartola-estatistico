"""
=========================================================
CARTOLA ESTATÍSTICO
Ranking Histórico das Estratégias

Consome:
data/simulacao-times.json

Gera:
data/ranking-simulacao.json

Compara:
- Conservador
- Equilibrado
- Agressivo

Métricas:
- pontos totais
- média
- mediana
- consistência
- volatilidade
- melhor rodada
- pior rodada
- vitórias
- taxa de vitória

=========================================================
"""

from pathlib import Path
from statistics import (
    mean,
    median,
    pstdev
)

import json
import math


# ======================================================
# CONFIGURAÇÕES
# ======================================================

BASE_DIR = (
    Path(
        __file__
    )
    .resolve()
    .parent
    .parent
    .parent
)


ARQUIVO_ENTRADA = (

    BASE_DIR /
    "data" /
    "simulacao-times.json"

)


ARQUIVO_SAIDA = (

    BASE_DIR /
    "data" /
    "ranking-simulacao.json"

)


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():
        return {}

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
            f"[AVISO] Erro ao carregar "
            f"{caminho}: {erro}"
        )

        return {}


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
    valor
):

    return round(
        numero(
            valor,
            0
        ),
        2
    )


# ======================================================
# VITÓRIAS POR RODADA
# ======================================================

def calcular_vitorias(
    rodadas
):

    vitorias = {}

    empates_primeiro = {}

    for rodada in rodadas:

        estrategias = rodada.get(
            "estrategias",
            []
        )

        if not estrategias:
            continue

        maior_pontuacao = max(

            numero(
                estrategia.get(
                    "pontos"
                ),
                0
            )

            for estrategia
            in estrategias

        )

        vencedores = [

            estrategia

            for estrategia
            in estrategias

            if numero(
                estrategia.get(
                    "pontos"
                ),
                0
            ) == maior_pontuacao

        ]

        for estrategia in estrategias:

            nome = estrategia.get(
                "nome"
            )

            if not nome:
                continue

            if nome not in vitorias:
                vitorias[nome] = 0

            if nome not in empates_primeiro:
                empates_primeiro[nome] = 0

        if len(vencedores) == 1:

            nome = vencedores[
                0
            ].get(
                "nome"
            )

            if nome:

                vitorias[nome] = (
                    vitorias.get(
                        nome,
                        0
                    ) + 1
                )

        else:

            for vencedor in vencedores:

                nome = vencedor.get(
                    "nome"
                )

                if nome:

                    empates_primeiro[
                        nome
                    ] = (
                        empates_primeiro.get(
                            nome,
                            0
                        ) + 1
                    )

    return (
        vitorias,
        empates_primeiro
    )


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    dados = carregar_json(
        ARQUIVO_ENTRADA
    )

    rodadas = dados.get(
        "rodadas",
        []
    )

    estrategias = {}

    for rodada in rodadas:

        numero_rodada = rodada.get(
            "rodada"
        )

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if not nome:
                continue

            pontos = numero(
                estrategia.get(
                    "pontos"
                ),
                0
            )

            if nome not in estrategias:

                estrategias[
                    nome
                ] = []

            estrategias[
                nome
            ].append({

                "rodada":
                    numero_rodada,

                "pontos":
                    pontos,

                "completa":
                    estrategia.get(
                        "escalaçãoCompleta",
                        False
                    )

            })

    (
        vitorias,
        empates_primeiro
    ) = calcular_vitorias(
        rodadas
    )

    ranking = []

    for nome, resultados in (
        estrategias.items()
    ):

        pontos = [

            item["pontos"]

            for item
            in resultados

        ]

        if not pontos:
            continue

        melhor = max(

            resultados,

            key=lambda item:
                item["pontos"]

        )

        pior = min(

            resultados,

            key=lambda item:
                item["pontos"]

        )

        media_pontos = mean(
            pontos
        )

        mediana_pontos = median(
            pontos
        )

        volatilidade = (

            pstdev(
                pontos
            )

            if len(pontos) > 1

            else 0

        )

        # Quanto menor a volatilidade relativa,
        # maior a consistência.
        if media_pontos != 0:

            coeficiente_variacao = (

                volatilidade /
                abs(media_pontos)

            )

            consistencia = max(

                0,

                100 -
                (
                    coeficiente_variacao *
                    100
                )

            )

        else:

            consistencia = 0

        total_vitorias = (
            vitorias.get(
                nome,
                0
            )
        )

        total_empates = (
            empates_primeiro.get(
                nome,
                0
            )
        )

        quantidade_rodadas = len(
            resultados
        )

        taxa_vitoria = (

            (
                total_vitorias /
                quantidade_rodadas
            ) * 100

            if quantidade_rodadas
            else 0

        )

        completas = sum(

            1

            for item in resultados

            if item.get(
                "completa"
            )

        )

        ranking.append({

            "nome":
                nome,

            "rodadas":
                quantidade_rodadas,

            "escalacoesCompletas":
                completas,

            "pontosTotal":
                arredondar(
                    sum(
                        pontos
                    )
                ),

            "mediaPontos":
                arredondar(
                    media_pontos
                ),

            "medianaPontos":
                arredondar(
                    mediana_pontos
                ),

            "volatilidade":
                arredondar(
                    volatilidade
                ),

            "consistencia":
                arredondar(
                    consistencia
                ),

            "vitorias":
                total_vitorias,

            "empatesPrimeiro":
                total_empates,

            "taxaVitoria":
                arredondar(
                    taxa_vitoria
                ),

            "melhorRodada": {

                "rodada":
                    melhor[
                        "rodada"
                    ],

                "pontos":
                    arredondar(
                        melhor[
                            "pontos"
                        ]
                    )

            },

            "piorRodada": {

                "rodada":
                    pior[
                        "rodada"
                    ],

                "pontos":
                    arredondar(
                        pior[
                            "pontos"
                        ]
                    )

            },

            "resultados": [

                {
                    "rodada":
                        item[
                            "rodada"
                        ],

                    "pontos":
                        arredondar(
                            item[
                                "pontos"
                            ]
                        )

                }

                for item
                in resultados

            ]

        })

    # ==================================================
    # ORDENAÇÃO
    # ==================================================

    ranking.sort(

        key=lambda item: (

            item[
                "pontosTotal"
            ],

            item[
                "mediaPontos"
            ],

            item[
                "vitorias"
            ],

            item[
                "consistencia"
            ]

        ),

        reverse=True

    )

    for indice, item in enumerate(
        ranking,
        start=1
    ):

        item[
            "posicao"
        ] = indice

    # ==================================================
    # RESUMO
    # ==================================================

    melhor_estrategia = (

        ranking[0]["nome"]

        if ranking

        else None

    )

    resultado = {

        "modelo":
            "ranking_simulacao_v2",

        "descricao":
            (
                "Ranking histórico das estratégias "
                "de escalação"
            ),

        "quantidadeRodadas":
            len(
                rodadas
            ),

        "quantidadeEstrategias":
            len(
                ranking
            ),

        "melhorEstrategia":
            melhor_estrategia,

        "criterioRanking": [
            "pontosTotal",
            "mediaPontos",
            "vitorias",
            "consistencia"
        ],

        "ranking":
            ranking

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    print(
        "============================================"
    )

    print(
        "RANKING DE SIMULAÇÃO GERADO"
    )

    print(
        "Rodadas:",
        len(
            rodadas
        )
    )

    print(
        "Estratégias:",
        len(
            ranking
        )
    )

    if ranking:

        print(
            "Melhor estratégia:",
            ranking[0][
                "nome"
            ]
        )

        print(
            "Pontos:",
            ranking[0][
                "pontosTotal"
            ]
        )

        print(
            "Média:",
            ranking[0][
                "mediaPontos"
            ]
        )

        print(
            "Vitórias:",
            ranking[0][
                "vitorias"
            ]
        )

    print(
        "Arquivo:",
        ARQUIVO_SAIDA
    )

    print(
        "============================================"
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
