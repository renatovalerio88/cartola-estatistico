"""
=========================================================
CARTOLA ESTATÍSTICO
Ranking Histórico das Estratégias

Versão:
ranking_simulacao_v2

Entrada:
data/simulacao-times.json

Saída:
data/ranking-simulacao.json

Objetivo:
Comparar historicamente as estratégias:

- Conservador
- Equilibrado
- Agressivo

A avaliação considera:

- pontuação total;
- média;
- mediana;
- consistência;
- melhor rodada;
- pior rodada;
- desempenho do capitão;
- cobertura dos resultados;
- vitórias entre estratégias;
- aproveitamento por rodada.

=========================================================
"""

import json
import math

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
            f"[ERRO] Não foi possível ler "
            f"{caminho}: {erro}"
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


def media(
    valores
):

    if not valores:

        return 0

    return mean(
        valores
    )


def mediana(
    valores
):

    if not valores:

        return 0

    return median(
        valores
    )


def desvio(
    valores
):

    if len(
        valores
    ) <= 1:

        return 0

    return pstdev(
        valores
    )


# ======================================================
# COLETA DOS RESULTADOS
# ======================================================

def coletar_resultados(
    dados
):

    estrategias = {}

    for rodada in dados.get(
        "rodadas",
        []
    ):

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

            if nome not in estrategias:

                estrategias[
                    nome
                ] = []

            estrategias[
                nome
            ].append({

                "rodada":
                    numero_rodada,

                "perfil":
                    estrategia.get(
                        "perfil"
                    ),

                "formacao":
                    estrategia.get(
                        "formacao"
                    ),

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
                    ),

                "quantidadeTitulares":
                    int(
                        numero(
                            estrategia.get(
                                "quantidadeTitulares"
                            )
                        )
                    ),

                "jogadoresEncontrados":
                    int(
                        numero(
                            estrategia.get(
                                "jogadoresEncontrados"
                            )
                        )
                    ),

                "escalacaoCompleta":
                    bool(
                        estrategia.get(
                            "escalacaoCompleta",
                            False
                        )
                    )

            })

    return estrategias


# ======================================================
# VITÓRIAS POR RODADA
# ======================================================

def calcular_vitorias(
    dados
):

    vitorias = {}

    empates = {}

    participacoes = {}

    for rodada in dados.get(
        "rodadas",
        []
    ):

        estrategias = rodada.get(
            "estrategias",
            []
        )

        if not estrategias:

            continue

        pontuacoes = []

        for estrategia in estrategias:

            nome = estrategia.get(
                "nome"
            )

            if not nome:

                continue

            pontos = numero(
                estrategia.get(
                    "pontuacaoComCapitao"
                )
            )

            pontuacoes.append(
                (
                    nome,
                    pontos
                )
            )

            participacoes[
                nome
            ] = (
                participacoes.get(
                    nome,
                    0
                ) +
                1
            )

            if nome not in vitorias:

                vitorias[
                    nome
                ] = 0

            if nome not in empates:

                empates[
                    nome
                ] = 0

        if not pontuacoes:

            continue

        maior_pontuacao = max(

            pontos

            for _, pontos in pontuacoes

        )

        vencedores = [

            nome

            for nome, pontos in pontuacoes

            if abs(
                pontos -
                maior_pontuacao
            ) < 0.001

        ]

        if len(
            vencedores
        ) == 1:

            vencedor = vencedores[
                0
            ]

            vitorias[
                vencedor
            ] += 1

        else:

            for nome in vencedores:

                empates[
                    nome
                ] += 1

    return {

        "vitorias":
            vitorias,

        "empates":
            empates,

        "participacoes":
            participacoes

    }


# ======================================================
# MELHOR E PIOR RODADA
# ======================================================

def obter_melhor_rodada(
    resultados
):

    if not resultados:

        return None

    melhor = max(

        resultados,

        key=lambda item:
            numero(
                item.get(
                    "pontos"
                )
            )

    )

    return {

        "rodada":
            melhor.get(
                "rodada"
            ),

        "pontos":
            round(
                numero(
                    melhor.get(
                        "pontos"
                    )
                ),
                2
            )

    }


def obter_pior_rodada(
    resultados
):

    if not resultados:

        return None

    pior = min(

        resultados,

        key=lambda item:
            numero(
                item.get(
                    "pontos"
                )
            )

    )

    return {

        "rodada":
            pior.get(
                "rodada"
            ),

        "pontos":
            round(
                numero(
                    pior.get(
                        "pontos"
                    )
                ),
                2
            )

    }


# ======================================================
# SCORE DE CONSISTÊNCIA
# ======================================================

def calcular_consistencia(
    media_pontos,
    desvio_pontos
):

    if media_pontos <= 0:

        return 0

    coeficiente_variacao = (

        desvio_pontos /
        media_pontos

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

    return round(
        consistencia,
        2
    )


# ======================================================
# SCORE GLOBAL
# ======================================================

def calcular_score_global(
    media_pontos,
    consistencia,
    cobertura,
    taxa_vitorias,
    mae
):

    # Pontuação média é o componente principal.
    #
    # Os demais fatores servem como critérios de
    # qualidade e estabilidade da estratégia.

    score = (

          media_pontos * 0.65

        + consistencia * 0.10

        + cobertura * 0.10

        + taxa_vitorias * 0.15

    )

    # Pequena penalização pelo erro médio individual.

    score -= (
        mae *
        0.10
    )

    return round(
        score,
        3
    )


# ======================================================
# RESUMO DE ESTRATÉGIA
# ======================================================

def resumir_estrategia(
    nome,
    resultados,
    estatisticas_vitorias
):

    pontos = [

        numero(
            item.get(
                "pontos"
            )
        )

        for item in resultados

    ]

    pontos_sem_capitao = [

        numero(
            item.get(
                "pontosSemCapitao"
            )
        )

        for item in resultados

    ]

    bonus_capitao = [

        numero(
            item.get(
                "bonusCapitao"
            )
        )

        for item in resultados

    ]

    maes = [

        numero(
            item.get(
                "mae"
            )
        )

        for item in resultados

    ]

    coberturas = [

        numero(
            item.get(
                "cobertura"
            )
        )

        for item in resultados

    ]

    completos = [

        item

        for item in resultados

        if item.get(
            "escalacaoCompleta"
        )

    ]

    media_pontos = media(
        pontos
    )

    mediana_pontos = mediana(
        pontos
    )

    desvio_pontos = desvio(
        pontos
    )

    media_sem_capitao = media(
        pontos_sem_capitao
    )

    media_bonus_capitao = media(
        bonus_capitao
    )

    mae_medio = media(
        maes
    )

    cobertura_media = media(
        coberturas
    )

    vitorias = (
        estatisticas_vitorias[
            "vitorias"
        ].get(
            nome,
            0
        )
    )

    empates = (
        estatisticas_vitorias[
            "empates"
        ].get(
            nome,
            0
        )
    )

    participacoes = (
        estatisticas_vitorias[
            "participacoes"
        ].get(
            nome,
            0
        )
    )

    taxa_vitorias = (

        (
            vitorias /
            participacoes
        ) *
        100

        if participacoes

        else 0

    )

    consistencia = (
        calcular_consistencia(
            media_pontos,
            desvio_pontos
        )
    )

    score_global = (
        calcular_score_global(

            media_pontos,

            consistencia,

            cobertura_media,

            taxa_vitorias,

            mae_medio

        )
    )

    return {

        "nome":
            nome,

        "perfil":
            (
                resultados[
                    0
                ].get(
                    "perfil"
                )

                if resultados

                else None
            ),

        "formacao":
            (
                resultados[
                    0
                ].get(
                    "formacao"
                )

                if resultados

                else None
            ),

        "rodadas":
            len(
                resultados
            ),

        "pontosTotal":
            round(
                sum(
                    pontos
                ),
                2
            ),

        "mediaPontos":
            round(
                media_pontos,
                2
            ),

        "medianaPontos":
            round(
                mediana_pontos,
                2
            ),

        "desvioPadrao":
            round(
                desvio_pontos,
                2
            ),

        "consistencia":
            consistencia,

        "mediaSemCapitao":
            round(
                media_sem_capitao,
                2
            ),

        "mediaBonusCapitao":
            round(
                media_bonus_capitao,
                2
            ),

        "ganhoMedioCapitaoPercentual":
            round(

                (
                    (
                        media_bonus_capitao /
                        media_sem_capitao
                    ) *
                    100
                )

                if media_sem_capitao

                else 0,

                2

            ),

        "maeMedioJogadores":
            round(
                mae_medio,
                3
            ),

        "coberturaMediaPercentual":
            round(
                cobertura_media,
                2
            ),

        "escalacoesCompletas":
            len(
                completos
            ),

        "taxaEscalacoesCompletas":
            round(

                (
                    (
                        len(
                            completos
                        ) /
                        len(
                            resultados
                        )
                    ) *
                    100
                )

                if resultados

                else 0,

                2

            ),

        "vitorias":
            vitorias,

        "empatesNaLideranca":
            empates,

        "taxaVitorias":
            round(
                taxa_vitorias,
                2
            ),

        "melhorRodada":
            obter_melhor_rodada(
                resultados
            ),

        "piorRodada":
            obter_pior_rodada(
                resultados
            ),

        "scoreGlobal":
            score_global

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
        "RANKING HISTÓRICO DAS ESTRATÉGIAS V2"
    )

    print(
        "=============================================="
    )

    dados = carregar_json(
        ARQUIVO_ENTRADA
    )

    if not isinstance(
        dados,
        dict
    ):

        print(
            "[ERRO] simulacao-times.json inválido."
        )

        salvar_json(

            ARQUIVO_SAIDA,

            {

                "modelo":
                    "ranking_simulacao_v2",

                "erro":
                    "simulacao_times_invalida",

                "ranking":
                    []

            }

        )

        return

    estrategias = (
        coletar_resultados(
            dados
        )
    )

    estatisticas_vitorias = (
        calcular_vitorias(
            dados
        )
    )

    ranking = []

    for nome, resultados in (
        estrategias.items()
    ):

        resumo = resumir_estrategia(

            nome,

            resultados,

            estatisticas_vitorias

        )

        ranking.append(
            resumo
        )


    # ==================================================
    # ORDENAÇÃO
    # ==================================================

    ranking.sort(

        key=lambda item: (

            numero(
                item.get(
                    "scoreGlobal"
                )
            ),

            numero(
                item.get(
                    "mediaPontos"
                )
            ),

            numero(
                item.get(
                    "pontosTotal"
                )
            )

        ),

        reverse=True

    )


    # ==================================================
    # POSIÇÃO
    # ==================================================

    for indice, item in enumerate(
        ranking,
        start=1
    ):

        item[
            "posicao"
        ] = indice


    # ==================================================
    # VENCEDOR
    # ==================================================

    melhor_estrategia = (

        ranking[
            0
        ][
            "nome"
        ]

        if ranking

        else None

    )


    # ==================================================
    # AUDITORIA
    # ==================================================

    cobertura_geral = [

        numero(
            item.get(
                "coberturaMediaPercentual"
            )
        )

        for item in ranking

    ]

    cobertura_media = media(
        cobertura_geral
    )

    quantidade_rodadas = len(
        dados.get(
            "rodadas",
            []
        )
    )

    auditoria_simulacao = dados.get(
        "auditoria",
        {}
    )

    auditoria_aprovada = (

        bool(
            ranking
        )

        and

        quantidade_rodadas > 0

        and

        cobertura_media >= 90

        and

        auditoria_simulacao.get(
            "aprovada",
            False
        )

    )


    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "ranking_simulacao_v2",

        "descricao":
            (
                "Ranking histórico das estratégias "
                "Conservador, Equilibrado e Agressivo "
                "usando escalações progressivas."
            ),

        "fonte":
            "data/simulacao-times.json",

        "modeloSimulacao":
            dados.get(
                "modelo"
            ),

        "quantidadeRodadas":
            quantidade_rodadas,

        "melhorEstrategia":
            melhor_estrategia,

        "criterioRanking": {

            "principal":
                "scoreGlobal",

            "desempate1":
                "mediaPontos",

            "desempate2":
                "pontosTotal",

            "componentesScore": {

                "mediaPontos":
                    0.65,

                "consistencia":
                    0.10,

                "cobertura":
                    0.10,

                "taxaVitorias":
                    0.15,

                "penalizacaoMae":
                    0.10

            }

        },

        "ranking":
            ranking,

        "auditoria": {

            "rankingGerado":
                bool(
                    ranking
                ),

            "estrategiasEncontradas":
                len(
                    ranking
                ),

            "rodadasAvaliadas":
                quantidade_rodadas,

            "coberturaMediaPercentual":
                round(
                    cobertura_media,
                    2
                ),

            "simulacaoOrigemAprovada":
                auditoria_simulacao.get(
                    "aprovada",
                    False
                ),

            "aprovada":
                auditoria_aprovada

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
        "Rodadas avaliadas:",
        quantidade_rodadas
    )

    print(
        "Estratégias:",
        len(
            ranking
        )
    )

    print()

    for item in ranking:

        print(
            "#",
            item[
                "posicao"
            ],
            item[
                "nome"
            ],
            "| Média:",
            item[
                "mediaPontos"
            ],
            "| Total:",
            item[
                "pontosTotal"
            ],
            "| Vitórias:",
            item[
                "vitorias"
            ],
            "| Consistência:",
            item[
                "consistencia"
            ],
            "| Score:",
            item[
                "scoreGlobal"
            ]
        )

    print()

    print(
        "Melhor estratégia:",
        melhor_estrategia
    )

    print(
        "Cobertura média:",
        round(
            cobertura_media,
            2
        ),
        "%"
    )

    print(
        "Auditoria:",
        (
            "APROVADA"
            if auditoria_aprovada
            else
            "REPROVADA"
        )
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
