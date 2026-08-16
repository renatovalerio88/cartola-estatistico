"""
=========================================================
CARTOLA ESTATÍSTICO
Ranking Histórico das Estratégias de Escalação

Objetivo:

Comparar historicamente as estratégias:

- Conservador
- Equilibrado
- Agressivo

A análise considera:

- pontos totais
- média
- mediana
- melhor rodada
- pior rodada
- vitórias por rodada
- percentual de vitórias
- consistência
- volatilidade
- frequência acima de faixas de pontuação
- desempenho com e sem cold start
- estratégia mais segura
- estratégia mais explosiva

Entrada:

data/simulacao-times.json

Saída:

data/ranking-simulacao.json

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
    Path(__file__)
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


RODADA_COLD_START = 2


FAIXAS_PONTUACAO = [
    50,
    60,
    70,
    80,
    100
]


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
            f"[ERRO] Não foi possível carregar "
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


def inteiro(
    valor,
    padrao=0
):

    try:

        if valor is None:

            return padrao

        return int(
            valor
        )

    except Exception:

        return padrao


def arredondar(
    valor,
    casas=2
):

    return round(
        numero(
            valor,
            0
        ),
        casas
    )


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
    ) <= 1:

        return 0

    return pstdev(
        valores
    )


def percentual(
    quantidade,
    total
):

    if not total:

        return 0

    return round(
        (
            quantidade /
            total
        ) * 100,
        2
    )


# ======================================================
# NORMALIZAÇÃO DAS ESTRATÉGIAS
# ======================================================

def obter_nome_estrategia(
    estrategia
):

    return (

        estrategia.get(
            "nome"
        )

        or estrategia.get(
            "estrategia"
        )

        or estrategia.get(
            "perfil"
        )

        or estrategia.get(
            "id"
        )

        or "Sem nome"

    )


def obter_pontos_estrategia(
    estrategia
):

    possibilidades = [

        estrategia.get(
            "pontos"
        ),

        estrategia.get(
            "pontuacao"
        ),

        estrategia.get(
            "pontuacaoReal"
        ),

        estrategia.get(
            "total"
        )

    ]

    for valor in possibilidades:

        if valor is not None:

            return numero(
                valor,
                0
            )

    return 0


# ======================================================
# COLETA DOS RESULTADOS
# ======================================================

def coletar_resultados(
    dados
):

    estrategias = {}

    rodadas_validas = []


    for rodada_dados in dados.get(
        "rodadas",
        []
    ):

        rodada = inteiro(

            rodada_dados.get(
                "rodada"
            ),

            0

        )

        if rodada <= 0:

            continue


        estrategias_rodada = (
            rodada_dados.get(
                "estrategias",
                []
            )
        )


        if not estrategias_rodada:

            continue


        registro_rodada = {

            "rodada":
                rodada,

            "dadosUtilizadosAteRodada":
                rodada_dados.get(
                    "dadosUtilizadosAteRodada"
                ),

            "coldStart":
                rodada ==
                RODADA_COLD_START,

            "estrategias":
                []

        }


        for estrategia in (
            estrategias_rodada
        ):

            nome = obter_nome_estrategia(
                estrategia
            )

            pontos = obter_pontos_estrategia(
                estrategia
            )


            if nome not in estrategias:

                estrategias[
                    nome
                ] = []


            resultado = {

                "rodada":
                    rodada,

                "pontos":
                    arredondar(
                        pontos
                    ),

                "coldStart":
                    rodada ==
                    RODADA_COLD_START

            }


            estrategias[
                nome
            ].append(
                resultado
            )


            registro_rodada[
                "estrategias"
            ].append({

                "nome":
                    nome,

                "pontos":
                    arredondar(
                        pontos
                    )

            })


        rodadas_validas.append(
            registro_rodada
        )


    rodadas_validas.sort(

        key=lambda item:
            item[
                "rodada"
            ]

    )


    return (
        estrategias,
        rodadas_validas
    )


# ======================================================
# VITÓRIAS POR RODADA
# ======================================================

def calcular_vitorias(
    rodadas
):

    vitorias = {}

    empates_primeiro = {}

    vencedores_rodadas = []


    for rodada in rodadas:

        estrategias = rodada.get(
            "estrategias",
            []
        )


        if not estrategias:

            continue


        melhor_pontuacao = max(

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

            estrategia.get(
                "nome"
            )

            for estrategia
            in estrategias

            if numero(
                estrategia.get(
                    "pontos"
                ),
                0
            ) == melhor_pontuacao

        ]


        for vencedor in vencedores:

            if vencedor not in vitorias:

                vitorias[
                    vencedor
                ] = 0


            if vencedor not in empates_primeiro:

                empates_primeiro[
                    vencedor
                ] = 0


            if len(
                vencedores
            ) == 1:

                vitorias[
                    vencedor
                ] += 1

            else:

                empates_primeiro[
                    vencedor
                ] += 1


        vencedores_rodadas.append({

            "rodada":
                rodada.get(
                    "rodada"
                ),

            "pontos":
                arredondar(
                    melhor_pontuacao
                ),

            "vencedores":
                vencedores,

            "empate":
                len(
                    vencedores
                ) > 1

        })


    return (
        vitorias,
        empates_primeiro,
        vencedores_rodadas
    )


# ======================================================
# FAIXAS DE PONTUAÇÃO
# ======================================================

def calcular_faixas(
    pontos
):

    resultado = {}


    for faixa in FAIXAS_PONTUACAO:

        quantidade = sum(

            1

            for valor in pontos

            if valor >= faixa

        )


        resultado[
            f"acima{faixa}"
        ] = {

            "quantidade":
                quantidade,

            "percentual":
                percentual(
                    quantidade,
                    len(
                        pontos
                    )
                )

        }


    return resultado


# ======================================================
# CONSISTÊNCIA
# ======================================================

def calcular_consistencia(
    pontos
):

    if not pontos:

        return 0


    media_pontos = media_segura(
        pontos
    )


    if media_pontos == 0:

        return 0


    volatilidade = desvio_seguro(
        pontos
    )


    coeficiente_variacao = (

        volatilidade /
        abs(
            media_pontos
        )

    )


    consistencia = (

        100 -
        (
            coeficiente_variacao *
            100
        )

    )


    consistencia = max(
        0,
        min(
            100,
            consistencia
        )
    )


    return arredondar(
        consistencia
    )


# ======================================================
# ANÁLISE DE UMA ESTRATÉGIA
# ======================================================

def analisar_estrategia(
    nome,
    resultados,
    vitorias,
    empates_primeiro,
    total_rodadas
):

    if not resultados:

        return {

            "nome":
                nome,

            "rodadas":
                0

        }


    pontos = [

        numero(
            resultado.get(
                "pontos"
            ),
            0
        )

        for resultado
        in resultados

    ]


    resultados_sem_cold = [

        resultado

        for resultado
        in resultados

        if not resultado.get(
            "coldStart"
        )

    ]


    pontos_sem_cold = [

        numero(
            resultado.get(
                "pontos"
            ),
            0
        )

        for resultado
        in resultados_sem_cold

    ]


    melhor = max(

        resultados,

        key=lambda item:
            numero(
                item.get(
                    "pontos"
                ),
                0
            )

    )


    pior = min(

        resultados,

        key=lambda item:
            numero(
                item.get(
                    "pontos"
                ),
                0
            )

    )


    quantidade_vitorias = (
        vitorias.get(
            nome,
            0
        )
    )


    quantidade_empates = (
        empates_primeiro.get(
            nome,
            0
        )
    )


    media_pontos = media_segura(
        pontos
    )


    mediana_pontos = mediana_segura(
        pontos
    )


    volatilidade = desvio_seguro(
        pontos
    )


    consistencia = calcular_consistencia(
        pontos
    )


    media_sem_cold = media_segura(
        pontos_sem_cold
    )


    total_sem_cold = sum(
        pontos_sem_cold
    )


    diferenca_cold = (

        media_sem_cold -
        media_pontos

        if pontos_sem_cold

        else 0

    )


    return {

        "nome":
            nome,

        "rodadas":
            len(
                resultados
            ),

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
            consistencia,

        "vitorias":
            quantidade_vitorias,

        "empatesPrimeiro":
            quantidade_empates,

        "taxaVitorias":
            percentual(
                quantidade_vitorias,
                total_rodadas
            ),

        "taxaPrimeiroLugarIncluindoEmpates":
            percentual(

                (
                    quantidade_vitorias +
                    quantidade_empates
                ),

                total_rodadas

            ),

        "melhorRodada": {

            "rodada":
                melhor.get(
                    "rodada"
                ),

            "pontos":
                arredondar(
                    melhor.get(
                        "pontos"
                    )
                )

        },

        "piorRodada": {

            "rodada":
                pior.get(
                    "rodada"
                ),

            "pontos":
                arredondar(
                    pior.get(
                        "pontos"
                    )
                )

        },

        "amplitude":
            arredondar(

                numero(
                    melhor.get(
                        "pontos"
                    ),
                    0
                )

                -

                numero(
                    pior.get(
                        "pontos"
                    ),
                    0
                )

            ),

        "faixasPontuacao":
            calcular_faixas(
                pontos
            ),

        "semColdStart": {

            "rodadas":
                len(
                    pontos_sem_cold
                ),

            "pontosTotal":
                arredondar(
                    total_sem_cold
                ),

            "mediaPontos":
                arredondar(
                    media_sem_cold
                ),

            "medianaPontos":
                arredondar(
                    mediana_segura(
                        pontos_sem_cold
                    )
                ),

            "volatilidade":
                arredondar(
                    desvio_seguro(
                        pontos_sem_cold
                    )
                ),

            "consistencia":
                calcular_consistencia(
                    pontos_sem_cold
                ),

            "diferencaMediaVsHistoricoCompleto":
                arredondar(
                    diferenca_cold
                )

        },

        "historico": [

            {

                "rodada":
                    resultado.get(
                        "rodada"
                    ),

                "pontos":
                    arredondar(
                        resultado.get(
                            "pontos"
                        )
                    ),

                "coldStart":
                    bool(
                        resultado.get(
                            "coldStart"
                        )
                    )

            }

            for resultado
            in resultados

        ]

    }


# ======================================================
# RANKING PRINCIPAL
# ======================================================

def ordenar_ranking(
    ranking
):

    return sorted(

        ranking,

        key=lambda item: (

            numero(
                item.get(
                    "pontosTotal"
                ),
                0
            ),

            numero(
                item.get(
                    "mediaPontos"
                ),
                0
            ),

            numero(
                item.get(
                    "vitorias"
                ),
                0
            ),

            numero(
                item.get(
                    "consistencia"
                ),
                0
            )

        ),

        reverse=True

    )


# ======================================================
# RANKING SEM COLD START
# ======================================================

def gerar_ranking_sem_cold_start(
    ranking
):

    resultado = []


    for estrategia in ranking:

        sem_cold = estrategia.get(
            "semColdStart",
            {}
        )


        resultado.append({

            "nome":
                estrategia.get(
                    "nome"
                ),

            "rodadas":
                sem_cold.get(
                    "rodadas",
                    0
                ),

            "pontosTotal":
                sem_cold.get(
                    "pontosTotal",
                    0
                ),

            "mediaPontos":
                sem_cold.get(
                    "mediaPontos",
                    0
                ),

            "medianaPontos":
                sem_cold.get(
                    "medianaPontos",
                    0
                ),

            "volatilidade":
                sem_cold.get(
                    "volatilidade",
                    0
                ),

            "consistencia":
                sem_cold.get(
                    "consistencia",
                    0
                )

        })


    resultado = sorted(

        resultado,

        key=lambda item: (

            numero(
                item.get(
                    "pontosTotal"
                ),
                0
            ),

            numero(
                item.get(
                    "mediaPontos"
                ),
                0
            ),

            numero(
                item.get(
                    "consistencia"
                ),
                0
            )

        ),

        reverse=True

    )


    for indice, item in enumerate(
        resultado,
        start=1
    ):

        item[
            "posicao"
        ] = indice


    return resultado


# ======================================================
# ESTRATÉGIA MAIS SEGURA
# ======================================================

def encontrar_mais_segura(
    ranking
):

    if not ranking:

        return None


    estrategia = min(

        ranking,

        key=lambda item: (

            numero(
                item.get(
                    "volatilidade"
                ),
                999999
            ),

            -numero(
                item.get(
                    "mediaPontos"
                ),
                0
            )

        )

    )


    return {

        "nome":
            estrategia.get(
                "nome"
            ),

        "mediaPontos":
            estrategia.get(
                "mediaPontos"
            ),

        "volatilidade":
            estrategia.get(
                "volatilidade"
            ),

        "consistencia":
            estrategia.get(
                "consistencia"
            )

    }


# ======================================================
# ESTRATÉGIA MAIS EXPLOSIVA
# ======================================================

def encontrar_mais_explosiva(
    ranking
):

    if not ranking:

        return None


    estrategia = max(

        ranking,

        key=lambda item: (

            numero(
                item.get(
                    "melhorRodada",
                    {}
                ).get(
                    "pontos"
                ),
                0
            ),

            numero(
                item.get(
                    "faixasPontuacao",
                    {}
                ).get(
                    "acima80",
                    {}
                ).get(
                    "percentual"
                ),
                0
            ),

            numero(
                item.get(
                    "mediaPontos"
                ),
                0
            )

        )

    )


    return {

        "nome":
            estrategia.get(
                "nome"
            ),

        "melhorPontuacao":
            estrategia.get(
                "melhorRodada",
                {}
            ).get(
                "pontos"
            ),

        "rodadaMelhorPontuacao":
            estrategia.get(
                "melhorRodada",
                {}
            ).get(
                "rodada"
            ),

        "percentualAcima80":
            estrategia.get(
                "faixasPontuacao",
                {}
            ).get(
                "acima80",
                {}
            ).get(
                "percentual",
                0
            ),

        "percentualAcima100":
            estrategia.get(
                "faixasPontuacao",
                {}
            ).get(
                "acima100",
                {}
            ).get(
                "percentual",
                0
            )

    }


# ======================================================
# ESTRATÉGIA MAIS CONSISTENTE
# ======================================================

def encontrar_mais_consistente(
    ranking
):

    if not ranking:

        return None


    estrategia = max(

        ranking,

        key=lambda item: (

            numero(
                item.get(
                    "consistencia"
                ),
                0
            ),

            numero(
                item.get(
                    "mediaPontos"
                ),
                0
            )

        )

    )


    return {

        "nome":
            estrategia.get(
                "nome"
            ),

        "consistencia":
            estrategia.get(
                "consistencia"
            ),

        "volatilidade":
            estrategia.get(
                "volatilidade"
            ),

        "mediaPontos":
            estrategia.get(
                "mediaPontos"
            )

    }


# ======================================================
# MELHOR ESTRATÉGIA POR CRITÉRIO
# ======================================================

def gerar_destaques(
    ranking
):

    if not ranking:

        return {}


    melhor_media = max(

        ranking,

        key=lambda item:
            numero(
                item.get(
                    "mediaPontos"
                ),
                0
            )

    )


    mais_vitorias = max(

        ranking,

        key=lambda item: (

            numero(
                item.get(
                    "vitorias"
                ),
                0
            ),

            numero(
                item.get(
                    "mediaPontos"
                ),
                0
            )

        )

    )


    melhor_piso = max(

        ranking,

        key=lambda item:
            numero(
                item.get(
                    "piorRodada",
                    {}
                ).get(
                    "pontos"
                ),
                0
            )

    )


    melhor_acima_70 = max(

        ranking,

        key=lambda item:
            numero(
                item.get(
                    "faixasPontuacao",
                    {}
                ).get(
                    "acima70",
                    {}
                ).get(
                    "percentual"
                ),
                0
            )

    )


    return {

        "melhorMedia": {

            "nome":
                melhor_media.get(
                    "nome"
                ),

            "media":
                melhor_media.get(
                    "mediaPontos"
                )

        },

        "maisVitorias": {

            "nome":
                mais_vitorias.get(
                    "nome"
                ),

            "vitorias":
                mais_vitorias.get(
                    "vitorias"
                ),

            "taxa":
                mais_vitorias.get(
                    "taxaVitorias"
                )

        },

        "melhorPisoHistorico": {

            "nome":
                melhor_piso.get(
                    "nome"
                ),

            "piorPontuacao":
                melhor_piso.get(
                    "piorRodada",
                    {}
                ).get(
                    "pontos"
                )

        },

        "maisFrequenteAcima70": {

            "nome":
                melhor_acima_70.get(
                    "nome"
                ),

            "percentual":
                melhor_acima_70.get(
                    "faixasPontuacao",
                    {}
                ).get(
                    "acima70",
                    {}
                ).get(
                    "percentual"
                )

        }

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    dados = carregar_json(
        ARQUIVO_ENTRADA
    )


    if not dados:

        print(
            "Arquivo de simulação inexistente "
            "ou vazio:"
        )

        print(
            ARQUIVO_ENTRADA
        )

        return


    (
        estrategias,
        rodadas
    ) = coletar_resultados(
        dados
    )


    if not rodadas:

        resultado_vazio = {

            "modelo":
                "ranking_simulacao_v2",

            "descricao":
                (
                    "Ranking histórico avançado das "
                    "estratégias de escalação"
                ),

            "melhorEstrategia":
                None,

            "quantidadeRodadas":
                0,

            "ranking":
                [],

            "rankingSemColdStart":
                []

        }


        salvar_json(
            ARQUIVO_SAIDA,
            resultado_vazio
        )


        print(
            "Nenhuma rodada disponível "
            "para geração do ranking."
        )

        return


    (
        vitorias,
        empates_primeiro,
        vencedores_rodadas
    ) = calcular_vitorias(
        rodadas
    )


    ranking = []


    for (
        nome,
        resultados
    ) in estrategias.items():


        analise = analisar_estrategia(

            nome,

            resultados,

            vitorias,

            empates_primeiro,

            len(
                rodadas
            )

        )


        ranking.append(
            analise
        )


    ranking = ordenar_ranking(
        ranking
    )


    for indice, item in enumerate(
        ranking,
        start=1
    ):

        item[
            "posicao"
        ] = indice


    ranking_sem_cold = (
        gerar_ranking_sem_cold_start(
            ranking
        )
    )


    mais_segura = (
        encontrar_mais_segura(
            ranking
        )
    )


    mais_explosiva = (
        encontrar_mais_explosiva(
            ranking
        )
    )


    mais_consistente = (
        encontrar_mais_consistente(
            ranking
        )
    )


    destaques = gerar_destaques(
        ranking
    )


    resultado = {

        "modelo":
            "ranking_simulacao_v2",

        "descricao":
            (
                "Ranking histórico avançado das "
                "estratégias de escalação"
            ),

        "fonte":
            "data/simulacao-times.json",

        "quantidadeRodadas":
            len(
                rodadas
            ),

        "rodadaColdStart":
            RODADA_COLD_START,

        "melhorEstrategia":

            (
                ranking[
                    0
                ][
                    "nome"
                ]

                if ranking

                else None
            ),

        "estrategiaMaisSegura":
            mais_segura,

        "estrategiaMaisExplosiva":
            mais_explosiva,

        "estrategiaMaisConsistente":
            mais_consistente,

        "destaques":
            destaques,

        "ranking":
            ranking,

        "rankingSemColdStart":
            ranking_sem_cold,

        "vencedoresPorRodada":
            vencedores_rodadas

    }


    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )


    # ==================================================
    # LOG RESUMIDO
    # ==================================================

    print(
        "============================================"
    )

    print(
        "RANKING HISTÓRICO DAS ESTRATÉGIAS"
    )

    print(
        "============================================"
    )


    print(
        "Rodadas analisadas:",
        len(
            rodadas
        )
    )


    print()


    for item in ranking:

        print(
            f"{item['posicao']}º "
            f"{item['nome']} | "
            f"Total: {item['pontosTotal']} | "
            f"Média: {item['mediaPontos']} | "
            f"Vitórias: {item['vitorias']} | "
            f"Consistência: "
            f"{item['consistencia']}% | "
            f"Volatilidade: "
            f"{item['volatilidade']}"
        )


    print()


    print(
        "Melhor estratégia:",
        resultado[
            "melhorEstrategia"
        ]
    )


    if mais_segura:

        print(
            "Mais segura:",
            mais_segura[
                "nome"
            ]
        )


    if mais_explosiva:

        print(
            "Mais explosiva:",
            mais_explosiva[
                "nome"
            ]
        )


    if mais_consistente:

        print(
            "Mais consistente:",
            mais_consistente[
                "nome"
            ]
        )


    print()


    print(
        "===== SEM COLD START ====="
    )


    for item in ranking_sem_cold:

        print(
            f"{item['posicao']}º "
            f"{item['nome']} | "
            f"Total: {item['pontosTotal']} | "
            f"Média: {item['mediaPontos']} | "
            f"Consistência: "
            f"{item['consistencia']}%"
        )


    print()


    print(
        "Arquivo:"
    )

    print(
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
