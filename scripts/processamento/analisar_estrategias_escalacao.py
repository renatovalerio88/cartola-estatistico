"""
=========================================================
CARTOLA ESTATÍSTICO
Análise Científica das Estratégias de Escalação

Versão:
analise_estrategias_escalacao_v2

Entradas:
data/ranking-simulacao.json
data/auditoria-simulacao-times.json
data/simulacao-times.json

Saída:
data/analise-estrategias-escalacao.json

Objetivo:
Avaliar cientificamente as estratégias históricas:

- Conservador
- Equilibrado
- Agressivo

e separar claramente:

1. líder por score global;
2. líder por média de pontos;
3. líder por mediana;
4. líder por número de vitórias;
5. consistência;
6. estabilidade;
7. desempenho recente.

Regra científica:

Uma estratégia NÃO pode ser candidata à promoção apenas
porque lidera um score composto.

Para promoção, o líder do score global também precisa
liderar a média de pontos reais, além de cumprir os demais
critérios estatísticos.

A análise NÃO altera automaticamente o modelo oficial.

=========================================================
"""

import json
import math

from pathlib import Path
from statistics import mean, median


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

ARQUIVO_RANKING = (
    PASTA_DATA /
    "ranking-simulacao.json"
)

ARQUIVO_AUDITORIA = (
    PASTA_DATA /
    "auditoria-simulacao-times.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "analise-estrategias-escalacao.json"
)


ESTRATEGIAS_ESPERADAS = {

    "Conservador",
    "Equilibrado",
    "Agressivo"

}


MINIMO_RODADAS_ANALISE = 5

MINIMO_RODADAS_PROMOCAO = 10

MINIMO_VANTAGEM_MEDIA = 1.0

MINIMO_VANTAGEM_PERCENTUAL = 1.5

MINIMO_TAXA_VITORIAS = 40.0

MINIMO_COBERTURA = 90.0

MINIMO_ESTABILIDADE = 55.0

MINIMO_CONSISTENCIA = 45.0

MINIMO_SCORE_CONFIANCA = 65.0

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

            f"[ERRO] Falha ao ler "
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


# ======================================================
# HISTÓRICO POR ESTRATÉGIA
# ======================================================

def coletar_historico(
    simulacao
):

    historico = {}

    for rodada in simulacao.get(
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

            if nome not in historico:

                historico[
                    nome
                ] = []

            historico[
                nome
            ].append({

                "rodada":
                    numero_rodada,

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

                "cobertura":
                    numero(
                        estrategia.get(
                            "coberturaResultadosPercentual"
                        )
                    ),

                "mae":
                    numero(
                        estrategia.get(
                            "maeJogadores"
                        )
                    )

            })

    for nome in historico:

        historico[
            nome
        ].sort(

            key=lambda item:
                numero(
                    item.get(
                        "rodada"
                    )
                )

        )

    return historico


# ======================================================
# DISPUTAS POR RODADA
# ======================================================

def calcular_disputas(
    simulacao
):

    resultado = {}

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        estrategias = rodada.get(
            "estrategias",
            []
        )

        if not estrategias:

            continue

        valores = []

        for estrategia in estrategias:

            nome = estrategia.get(
                "nome"
            )

            if not nome:

                continue

            if nome not in resultado:

                resultado[
                    nome
                ] = {

                    "participacoes":
                        0,

                    "vitorias":
                        0,

                    "empates":
                        0,

                    "derrotas":
                        0

                }

            resultado[
                nome
            ][
                "participacoes"
            ] += 1

            valores.append({

                "nome":
                    nome,

                "pontos":
                    numero(
                        estrategia.get(
                            "pontuacaoComCapitao"
                        )
                    )

            })

        if not valores:

            continue

        maior = max(

            item[
                "pontos"
            ]

            for item in valores

        )

        vencedores = [

            item[
                "nome"
            ]

            for item in valores

            if abs(

                item[
                    "pontos"
                ] -
                maior

            ) <= TOLERANCIA_EMPATE

        ]

        for item in valores:

            nome = item[
                "nome"
            ]

            if (
                len(
                    vencedores
                ) > 1

                and

                nome in vencedores
            ):

                resultado[
                    nome
                ][
                    "empates"
                ] += 1

            elif nome in vencedores:

                resultado[
                    nome
                ][
                    "vitorias"
                ] += 1

            else:

                resultado[
                    nome
                ][
                    "derrotas"
                ] += 1

    return resultado


# ======================================================
# DESEMPENHO RECENTE
# ======================================================

def analisar_recente(
    historico,
    janela=JANELA_RECENTE
):

    resultados = {}

    for nome, rodadas in historico.items():

        recentes = rodadas[
            -janela:
        ]

        pontos = [

            numero(
                item.get(
                    "pontos"
                )
            )

            for item in recentes

        ]

        resultados[
            nome
        ] = {

            "rodadas":

                [

                    item.get(
                        "rodada"
                    )

                    for item in recentes

                ],

            "quantidade":
                len(
                    recentes
                ),

            "media":
                arredondar(

                    mean(
                        pontos
                    )

                    if pontos

                    else 0

                ),

            "mediana":
                arredondar(

                    median(
                        pontos
                    )

                    if pontos

                    else 0

                ),

            "total":
                arredondar(
                    sum(
                        pontos
                    )
                )

        }

    return resultados


# ======================================================
# ESTABILIDADE DE UMA ESTRATÉGIA
# ======================================================

def calcular_estabilidade(
    simulacao,
    estrategia_analisada
):

    comparacoes = 0

    superior = 0

    empatou = 0

    inferior = 0

    margens = []

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        estrategias = rodada.get(
            "estrategias",
            []
        )

        pontos = {

            item.get(
                "nome"
            ):
                numero(
                    item.get(
                        "pontuacaoComCapitao"
                    )
                )

            for item in estrategias

            if item.get(
                "nome"
            )

        }

        if estrategia_analisada not in pontos:

            continue

        adversarios = [

            valor

            for nome, valor in pontos.items()

            if nome != estrategia_analisada

        ]

        if not adversarios:

            continue

        melhor_adversario = max(
            adversarios
        )

        margem = (

            pontos[
                estrategia_analisada
            ]
            -
            melhor_adversario

        )

        margens.append(
            margem
        )

        comparacoes += 1

        if margem > TOLERANCIA_EMPATE:

            superior += 1

        elif abs(
            margem
        ) <= TOLERANCIA_EMPATE:

            empatou += 1

        else:

            inferior += 1

    taxa_superioridade = percentual(
        superior,
        comparacoes
    )

    taxa_nao_derrota = percentual(
        superior + empatou,
        comparacoes
    )

    margem_media = (

        mean(
            margens
        )

        if margens

        else 0

    )

    return {

        "estrategia":
            estrategia_analisada,

        "comparacoes":
            comparacoes,

        "rodadasSuperior":
            superior,

        "rodadasEmpatado":
            empatou,

        "rodadasInferior":
            inferior,

        "taxaSuperioridadePercentual":
            arredondar(
                taxa_superioridade
            ),

        "taxaNaoDerrotaPercentual":
            arredondar(
                taxa_nao_derrota
            ),

        "margemMediaContraMelhorAdversario":
            arredondar(
                margem_media
            )

    }


# ======================================================
# MAPA DO RANKING
# ======================================================

def criar_mapa_ranking(
    ranking_lista
):

    return {

        item.get(
            "nome"
        ):
            item

        for item in ranking_lista

        if item.get(
            "nome"
        )

    }


# ======================================================
# LÍDERES POR CRITÉRIO
# ======================================================

def obter_lider_por_campo(
    ranking_lista,
    campo,
    maior_melhor=True
):

    candidatos = [

        item

        for item in ranking_lista

        if item.get(
            "nome"
        )

    ]

    if not candidatos:

        return None

    if maior_melhor:

        return max(

            candidatos,

            key=lambda item:
                numero(
                    item.get(
                        campo
                    )
                )

        )

    return min(

        candidatos,

        key=lambda item:
            numero(
                item.get(
                    campo
                )
            )

    )


def identificar_lideres(
    ranking_lista
):

    lider_score = (
        ranking_lista[
            0
        ]
        if ranking_lista
        else None
    )

    lider_media = obter_lider_por_campo(
        ranking_lista,
        "mediaPontos"
    )

    lider_mediana = obter_lider_por_campo(
        ranking_lista,
        "medianaPontos"
    )

    lider_vitorias = obter_lider_por_campo(
        ranking_lista,
        "vitorias"
    )

    lider_consistencia = obter_lider_por_campo(
        ranking_lista,
        "consistencia"
    )

    menor_mae = obter_lider_por_campo(
        ranking_lista,
        "maeMedioJogadores",
        maior_melhor=False
    )

    return {

        "scoreGlobal":
            lider_score,

        "mediaPontos":
            lider_media,

        "medianaPontos":
            lider_mediana,

        "vitorias":
            lider_vitorias,

        "consistencia":
            lider_consistencia,

        "menorMae":
            menor_mae

    }


# ======================================================
# RESUMO DE UM LÍDER
# ======================================================

def resumir_item_ranking(
    item
):

    if not item:

        return None

    return {

        "nome":
            item.get(
                "nome"
            ),

        "posicaoRanking":
            item.get(
                "posicao"
            ),

        "mediaPontos":
            arredondar(
                item.get(
                    "mediaPontos"
                )
            ),

        "medianaPontos":
            arredondar(
                item.get(
                    "medianaPontos"
                )
            ),

        "pontosTotal":
            arredondar(
                item.get(
                    "pontosTotal"
                )
            ),

        "vitorias":
            int(
                numero(
                    item.get(
                        "vitorias"
                    )
                )
            ),

        "taxaVitorias":
            arredondar(
                item.get(
                    "taxaVitorias"
                )
            ),

        "consistencia":
            arredondar(
                item.get(
                    "consistencia"
                )
            ),

        "maeMedioJogadores":
            arredondar(
                item.get(
                    "maeMedioJogadores"
                ),
                3
            ),

        "scoreGlobal":
            arredondar(
                item.get(
                    "scoreGlobal"
                ),
                3
            )

    }


# ======================================================
# DIAGNÓSTICO DE DIVERGÊNCIA
# ======================================================

def analisar_divergencia_lideres(
    lideres
):

    lider_score = lideres.get(
        "scoreGlobal"
    )

    lider_media = lideres.get(
        "mediaPontos"
    )

    lider_mediana = lideres.get(
        "medianaPontos"
    )

    nome_score = (

        lider_score.get(
            "nome"
        )

        if lider_score

        else None

    )

    nome_media = (

        lider_media.get(
            "nome"
        )

        if lider_media

        else None

    )

    nome_mediana = (

        lider_mediana.get(
            "nome"
        )

        if lider_mediana

        else None

    )

    score_igual_media = (

        nome_score is not None

        and

        nome_score == nome_media

    )

    score_igual_mediana = (

        nome_score is not None

        and

        nome_score == nome_mediana

    )

    media_igual_mediana = (

        nome_media is not None

        and

        nome_media == nome_mediana

    )

    divergencia_critica = (
        not score_igual_media
    )

    if divergencia_critica:

        classificacao = (
            "DIVERGENCIA_SCORE_MEDIA"
        )

        explicacao = (

            f"O líder pelo score global "
            f"({nome_score}) não é o líder "
            f"pela média de pontos reais "
            f"({nome_media})."

        )

    elif not score_igual_mediana:

        classificacao = (
            "DIVERGENCIA_SECUNDARIA"
        )

        explicacao = (

            "O líder pelo score e pela média coincide, "
            "mas existe divergência na mediana."

        )

    else:

        classificacao = (
            "LIDERANCA_CONSISTENTE"
        )

        explicacao = (

            "O líder pelo score global também lidera "
            "os principais indicadores de pontuação."

        )

    return {

        "liderScore":
            nome_score,

        "liderMedia":
            nome_media,

        "liderMediana":
            nome_mediana,

        "scoreIgualMedia":
            score_igual_media,

        "scoreIgualMediana":
            score_igual_mediana,

        "mediaIgualMediana":
            media_igual_mediana,

        "divergenciaCritica":
            divergencia_critica,

        "classificacao":
            classificacao,

        "explicacao":
            explicacao

    }


# ======================================================
# COMPARAÇÃO DO LÍDER DE SCORE COM MELHOR MÉDIA
# ======================================================

def comparar_score_com_media(
    lider_score,
    lider_media
):

    if (
        not lider_score
        or
        not lider_media
    ):

        return None

    media_score = numero(
        lider_score.get(
            "mediaPontos"
        )
    )

    media_lider = numero(
        lider_media.get(
            "mediaPontos"
        )
    )

    diferenca = (
        media_score -
        media_lider
    )

    diferenca_percentual = percentual(
        diferenca,
        media_lider
    )

    score_score = numero(
        lider_score.get(
            "scoreGlobal"
        )
    )

    score_media = numero(
        lider_media.get(
            "scoreGlobal"
        )
    )

    return {

        "liderScore":
            lider_score.get(
                "nome"
            ),

        "liderMedia":
            lider_media.get(
                "nome"
            ),

        "mediaLiderScore":
            arredondar(
                media_score
            ),

        "melhorMediaReal":
            arredondar(
                media_lider
            ),

        "diferencaMedia":
            arredondar(
                diferenca
            ),

        "diferencaMediaPercentual":
            arredondar(
                diferenca_percentual
            ),

        "scoreGlobalLiderScore":
            arredondar(
                score_score,
                3
            ),

        "scoreGlobalLiderMedia":
            arredondar(
                score_media,
                3
            ),

        "diferencaScore":
            arredondar(
                score_score -
                score_media,
                3
            ),

        "mesmaEstrategia":
            (
                lider_score.get(
                    "nome"
                )
                ==
                lider_media.get(
                    "nome"
                )
            )

    }


# ======================================================
# SEGUNDO MELHOR POR MÉDIA
# ======================================================

def comparar_lider_media_com_segundo(
    ranking_lista
):

    ordenado = sorted(

        ranking_lista,

        key=lambda item:
            numero(
                item.get(
                    "mediaPontos"
                )
            ),

        reverse=True

    )

    if len(
        ordenado
    ) < 2:

        return None

    primeiro = ordenado[
        0
    ]

    segundo = ordenado[
        1
    ]

    media_primeiro = numero(
        primeiro.get(
            "mediaPontos"
        )
    )

    media_segundo = numero(
        segundo.get(
            "mediaPontos"
        )
    )

    diferenca = (
        media_primeiro -
        media_segundo
    )

    diferenca_percentual = percentual(
        diferenca,
        media_segundo
    )

    return {

        "lider":
            primeiro.get(
                "nome"
            ),

        "segundo":
            segundo.get(
                "nome"
            ),

        "mediaLider":
            arredondar(
                media_primeiro
            ),

        "mediaSegundo":
            arredondar(
                media_segundo
            ),

        "vantagemMedia":
            arredondar(
                diferenca
            ),

        "vantagemMediaPercentual":
            arredondar(
                diferenca_percentual
            ),

        "scoreLider":
            arredondar(
                primeiro.get(
                    "scoreGlobal"
                ),
                3
            ),

        "scoreSegundo":
            arredondar(
                segundo.get(
                    "scoreGlobal"
                ),
                3
            )

    }


# ======================================================
# COMPARAÇÃO PRIMEIRO × SEGUNDO DO SCORE
#
# Mantida por compatibilidade com os relatórios já
# existentes.
# ======================================================

def comparar_lideres(
    ranking
):

    lista = ranking.get(
        "ranking",
        []
    )

    if len(
        lista
    ) < 2:

        return None

    primeiro = lista[
        0
    ]

    segundo = lista[
        1
    ]

    media_primeiro = numero(
        primeiro.get(
            "mediaPontos"
        )
    )

    media_segundo = numero(
        segundo.get(
            "mediaPontos"
        )
    )

    diferenca = (
        media_primeiro -
        media_segundo
    )

    diferenca_percentual = percentual(
        diferenca,
        media_segundo
    )

    score_primeiro = numero(
        primeiro.get(
            "scoreGlobal"
        )
    )

    score_segundo = numero(
        segundo.get(
            "scoreGlobal"
        )
    )

    return {

        "criterio":
            "scoreGlobal",

        "lider":
            primeiro.get(
                "nome"
            ),

        "segundo":
            segundo.get(
                "nome"
            ),

        "mediaLider":
            arredondar(
                media_primeiro
            ),

        "mediaSegundo":
            arredondar(
                media_segundo
            ),

        "vantagemMedia":
            arredondar(
                diferenca
            ),

        "vantagemMediaPercentual":
            arredondar(
                diferenca_percentual
            ),

        "scoreLider":
            arredondar(
                score_primeiro,
                3
            ),

        "scoreSegundo":
            arredondar(
                score_segundo,
                3
            ),

        "vantagemScore":
            arredondar(
                score_primeiro -
                score_segundo,
                3
            )

    }


# ======================================================
# SCORE DE CONFIANÇA
# ======================================================

def calcular_score_confianca(
    rodadas,
    cobertura,
    taxa_vitorias,
    estabilidade,
    vantagem_percentual,
    consistencia,
    lideranca_consistente,
    auditoria_aprovada
):

    score_amostra = min(

        100,

        (
            rodadas /
            MINIMO_RODADAS_PROMOCAO
        ) *
        100

    )

    score_cobertura = max(
        0,
        min(
            100,
            cobertura
        )
    )

    score_vitorias = max(
        0,
        min(
            100,
            taxa_vitorias
        )
    )

    score_estabilidade = max(
        0,
        min(
            100,
            estabilidade
        )
    )

    score_consistencia = max(
        0,
        min(
            100,
            consistencia
        )
    )

    score_vantagem = min(

        100,

        max(

            0,

            (
                vantagem_percentual /
                5
            ) *
            100

        )

    )

    score_lideranca = (
        100
        if lideranca_consistente
        else 0
    )

    score = (

          score_amostra * 0.15

        + score_cobertura * 0.15

        + score_vitorias * 0.15

        + score_estabilidade * 0.20

        + score_consistencia * 0.10

        + score_vantagem * 0.15

        + score_lideranca * 0.10

    )

    if not auditoria_aprovada:

        score *= 0.50

    return arredondar(
        score
    )


# ======================================================
# DIAGNÓSTICO COMPLETO DAS ESTRATÉGIAS
# ======================================================

def construir_diagnostico_estrategias(
    ranking_lista,
    disputas,
    recente,
    simulacao
):

    diagnostico = []

    for item in ranking_lista:

        nome = item.get(
            "nome"
        )

        disputa = disputas.get(
            nome,
            {}
        )

        estabilidade = calcular_estabilidade(
            simulacao,
            nome
        )

        recente_item = recente.get(
            nome,
            {}
        )

        diagnostico.append({

            "nome":
                nome,

            "posicaoScoreGlobal":
                item.get(
                    "posicao"
                ),

            "mediaPontos":
                arredondar(
                    item.get(
                        "mediaPontos"
                    )
                ),

            "medianaPontos":
                arredondar(
                    item.get(
                        "medianaPontos"
                    )
                ),

            "pontosTotal":
                arredondar(
                    item.get(
                        "pontosTotal"
                    )
                ),

            "scoreGlobal":
                arredondar(
                    item.get(
                        "scoreGlobal"
                    ),
                    3
                ),

            "consistencia":
                arredondar(
                    item.get(
                        "consistencia"
                    )
                ),

            "maeMedioJogadores":
                arredondar(
                    item.get(
                        "maeMedioJogadores"
                    ),
                    3
                ),

            "participacoes":
                int(
                    numero(
                        disputa.get(
                            "participacoes"
                        )
                    )
                ),

            "vitorias":
                int(
                    numero(
                        disputa.get(
                            "vitorias"
                        )
                    )
                ),

            "empates":
                int(
                    numero(
                        disputa.get(
                            "empates"
                        )
                    )
                ),

            "derrotas":
                int(
                    numero(
                        disputa.get(
                            "derrotas"
                        )
                    )
                ),

            "taxaVitorias":
                arredondar(

                    percentual(

                        disputa.get(
                            "vitorias"
                        ),

                        disputa.get(
                            "participacoes"
                        )

                    )

                ),

            "estabilidade":
                estabilidade,

            "recente":
                recente_item

        })

    return diagnostico


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
        "ANÁLISE DAS ESTRATÉGIAS DE ESCALAÇÃO V2"
    )

    print(
        "=============================================="
    )

    ranking = carregar_json(
        ARQUIVO_RANKING
    )

    auditoria = carregar_json(
        ARQUIVO_AUDITORIA
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    if not isinstance(
        ranking,
        dict
    ):

        ranking = {}

    if not isinstance(
        auditoria,
        dict
    ):

        auditoria = {}

    if not isinstance(
        simulacao,
        dict
    ):

        simulacao = {}

    ranking_lista = ranking.get(
        "ranking",
        []
    )

    if not isinstance(
        ranking_lista,
        list
    ):

        ranking_lista = []

    # ==================================================
    # SEM DADOS
    # ==================================================

    if not ranking_lista:

        resultado = {

            "modelo":
                "analise_estrategias_escalacao_v2",

            "descricao":
                (
                    "Análise científica das estratégias "
                    "históricas de escalação."
                ),

            "status":
                "sem_dados",

            "decisao": {

                "decisao":
                    "AGUARDAR_DADOS",

                "estrategiaRecomendada":
                    None,

                "promover":
                    False,

                "promocaoAutomatica":
                    False

            }

        }

        salvar_json(
            ARQUIVO_SAIDA,
            resultado
        )

        print(
            "Nenhum ranking disponível."
        )

        print(
            "DECISÃO: AGUARDAR_DADOS"
        )

        return

    # ==================================================
    # BASES
    # ==================================================

    historico = coletar_historico(
        simulacao
    )

    disputas = calcular_disputas(
        simulacao
    )

    recente = analisar_recente(
        historico
    )

    lideres = identificar_lideres(
        ranking_lista
    )

    divergencia = analisar_divergencia_lideres(
        lideres
    )

    comparacao_score = comparar_lideres(
        ranking
    )

    comparacao_media = (
        comparar_lider_media_com_segundo(
            ranking_lista
        )
    )

    comparacao_score_media = (
        comparar_score_com_media(

            lideres.get(
                "scoreGlobal"
            ),

            lideres.get(
                "mediaPontos"
            )

        )
    )

    diagnostico_estrategias = (
        construir_diagnostico_estrategias(

            ranking_lista,

            disputas,

            recente,

            simulacao

        )
    )

    nomes_ranking = {

        item.get(
            "nome"
        )

        for item in ranking_lista

        if item.get(
            "nome"
        )

    }

    auditoria_aprovada = bool(

        auditoria.get(
            "decisao",
            {}
        ).get(
            "aprovada",
            False
        )

    )

    quantidade_rodadas = int(

        numero(

            ranking.get(
                "quantidadeRodadas"
            )

        )

    )

    # ==================================================
    # LÍDER DO SCORE
    # ==================================================

    lider_score = lideres.get(
        "scoreGlobal"
    )

    lider_media = lideres.get(
        "mediaPontos"
    )

    nome_lider_score = (
        lider_score.get(
            "nome"
        )
        if lider_score
        else None
    )

    nome_lider_media = (
        lider_media.get(
            "nome"
        )
        if lider_media
        else None
    )

    dados_disputa_score = disputas.get(
        nome_lider_score,
        {}
    )

    participacoes_score = int(

        numero(

            dados_disputa_score.get(
                "participacoes"
            )

        )

    )

    vitorias_score = int(

        numero(

            dados_disputa_score.get(
                "vitorias"
            )

        )

    )

    taxa_vitorias_score = percentual(
        vitorias_score,
        participacoes_score
    )

    estabilidade_score = calcular_estabilidade(
        simulacao,
        nome_lider_score
    )

    taxa_estabilidade_score = numero(

        estabilidade_score.get(
            "taxaSuperioridadePercentual"
        )

    )

    cobertura_score = numero(

        lider_score.get(
            "coberturaMediaPercentual"
        )

        if lider_score

        else 0

    )

    consistencia_score = numero(

        lider_score.get(
            "consistencia"
        )

        if lider_score

        else 0

    )

    # ==================================================
    # VANTAGEM REAL DO LÍDER DE MÉDIA
    # ==================================================

    vantagem_media_real = (

        numero(
            comparacao_media.get(
                "vantagemMedia"
            )
        )

        if comparacao_media

        else 0

    )

    vantagem_percentual_real = (

        numero(
            comparacao_media.get(
                "vantagemMediaPercentual"
            )
        )

        if comparacao_media

        else 0

    )

    lideranca_consistente = (
        not divergencia.get(
            "divergenciaCritica",
            True
        )
    )

    # ==================================================
    # SCORE DE CONFIANÇA
    # ==================================================

    score_confianca = calcular_score_confianca(

        quantidade_rodadas,

        cobertura_score,

        taxa_vitorias_score,

        taxa_estabilidade_score,

        vantagem_percentual_real,

        consistencia_score,

        lideranca_consistente,

        auditoria_aprovada

    )

    # ==================================================
    # CRITÉRIOS
    # ==================================================

    criterios = {

        "auditoriaAprovada":
            auditoria_aprovada,

        "tresEstrategiasPresentes":
            (
                nomes_ranking
                ==
                ESTRATEGIAS_ESPERADAS
            ),

        "amostraMinimaAnalise":
            (
                quantidade_rodadas
                >=
                MINIMO_RODADAS_ANALISE
            ),

        "amostraMinimaPromocao":
            (
                quantidade_rodadas
                >=
                MINIMO_RODADAS_PROMOCAO
            ),

        "coberturaMinima":
            (
                cobertura_score
                >=
                MINIMO_COBERTURA
            ),

        "liderScoreTambemLiderMedia":
            (
                nome_lider_score
                ==
                nome_lider_media
            ),

        "vantagemMediaMinima":
            (
                vantagem_media_real
                >=
                MINIMO_VANTAGEM_MEDIA
            ),

        "vantagemPercentualMinima":
            (
                vantagem_percentual_real
                >=
                MINIMO_VANTAGEM_PERCENTUAL
            ),

        "taxaVitoriasMinima":
            (
                taxa_vitorias_score
                >=
                MINIMO_TAXA_VITORIAS
            ),

        "estabilidadeMinima":
            (
                taxa_estabilidade_score
                >=
                MINIMO_ESTABILIDADE
            ),

        "consistenciaMinima":
            (
                consistencia_score
                >=
                MINIMO_CONSISTENCIA
            ),

        "scoreConfiancaMinimo":
            (
                score_confianca
                >=
                MINIMO_SCORE_CONFIANCA
            )

    }

    criterios_promocao = [

        "auditoriaAprovada",

        "tresEstrategiasPresentes",

        "amostraMinimaPromocao",

        "coberturaMinima",

        "liderScoreTambemLiderMedia",

        "vantagemMediaMinima",

        "vantagemPercentualMinima",

        "taxaVitoriasMinima",

        "estabilidadeMinima",

        "consistenciaMinima",

        "scoreConfiancaMinimo"

    ]

    aprovados_promocao = [

        nome

        for nome in criterios_promocao

        if criterios.get(
            nome,
            False
        )

    ]

    falhas_promocao = [

        nome

        for nome in criterios_promocao

        if not criterios.get(
            nome,
            False
        )

    ]

    promover = (
        len(
            falhas_promocao
        ) == 0
    )

    # ==================================================
    # DECISÃO
    # ==================================================

    if not auditoria_aprovada:

        decisao = (
            "AGUARDAR_VALIDACAO_SIMULACAO"
        )

    elif (
        quantidade_rodadas
        <
        MINIMO_RODADAS_ANALISE
    ):

        decisao = (
            "AMOSTRA_INSUFICIENTE"
        )

    elif divergencia.get(
        "divergenciaCritica",
        False
    ):

        decisao = (
            "MANTER_ESTRATEGIAS_DIVERGENCIA_SCORE_MEDIA"
        )

    elif promover:

        decisao = (
            "ESTRATEGIA_CANDIDATA_PROMOCAO"
        )

    else:

        decisao = (
            "MANTER_ESTRATEGIAS_ATUAIS"
        )

    # ==================================================
    # OBSERVAÇÃO
    # ==================================================

    if promover:

        observacao = (

            f"A estratégia {nome_lider_score} "
            f"lidera score global e média real "
            f"e atingiu todos os critérios "
            f"experimentais para promoção."

        )

    elif divergencia.get(
        "divergenciaCritica",
        False
    ):

        observacao = (

            f"O ranking composto aponta "
            f"{nome_lider_score} como líder, "
            f"mas a maior média real pertence a "
            f"{nome_lider_media}. "
            f"A divergência bloqueia promoção "
            f"automática ou experimental."

        )

    else:

        observacao = (

            "Ainda não há evidência suficiente "
            "para substituir automaticamente "
            "as estratégias atuais."

        )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "analise_estrategias_escalacao_v2",

        "descricao":
            (
                "Avaliação histórica das estratégias "
                "Conservador, Equilibrado e Agressivo "
                "com separação entre score composto e "
                "desempenho real."
            ),

        "configuracao": {

            "minimoRodadasAnalise":
                MINIMO_RODADAS_ANALISE,

            "minimoRodadasPromocao":
                MINIMO_RODADAS_PROMOCAO,

            "minimoVantagemMedia":
                MINIMO_VANTAGEM_MEDIA,

            "minimoVantagemPercentual":
                MINIMO_VANTAGEM_PERCENTUAL,

            "minimoTaxaVitorias":
                MINIMO_TAXA_VITORIAS,

            "minimoCobertura":
                MINIMO_COBERTURA,

            "minimoEstabilidade":
                MINIMO_ESTABILIDADE,

            "minimoConsistencia":
                MINIMO_CONSISTENCIA,

            "minimoScoreConfianca":
                MINIMO_SCORE_CONFIANCA,

            "janelaRecente":
                JANELA_RECENTE

        },

        "resumo": {

            "rodadas":
                quantidade_rodadas,

            "estrategias":
                len(
                    ranking_lista
                ),

            # Compatibilidade com relatório antigo
            "lider":
                nome_lider_score,

            "mediaLider":
                arredondar(

                    lider_score.get(
                        "mediaPontos"
                    )

                    if lider_score

                    else 0

                ),

            "scoreGlobalLider":
                arredondar(

                    lider_score.get(
                        "scoreGlobal"
                    )

                    if lider_score

                    else 0,

                    3

                ),

            "taxaVitoriasLider":
                arredondar(
                    taxa_vitorias_score
                ),

            "estabilidadeLider":
                arredondar(
                    taxa_estabilidade_score
                ),

            "coberturaLider":
                arredondar(
                    cobertura_score
                ),

            "scoreConfianca":
                score_confianca,

            # Novos campos
            "liderScoreGlobal":
                nome_lider_score,

            "liderMediaReal":
                nome_lider_media,

            "liderMediana":
                (
                    lideres.get(
                        "medianaPontos"
                    ) or {}
                ).get(
                    "nome"
                ),

            "liderVitorias":
                (
                    lideres.get(
                        "vitorias"
                    ) or {}
                ).get(
                    "nome"
                ),

            "liderConsistencia":
                (
                    lideres.get(
                        "consistencia"
                    ) or {}
                ).get(
                    "nome"
                ),

            "menorMae":
                (
                    lideres.get(
                        "menorMae"
                    ) or {}
                ).get(
                    "nome"
                ),

            "liderancaConsistente":
                lideranca_consistente,

            "divergenciaScoreMedia":
                divergencia.get(
                    "divergenciaCritica",
                    False
                )

        },

        # Compatibilidade
        "comparacaoPrimeiroSegundo":
            comparacao_score,

        # Novas comparações
        "comparacaoPorMedia":
            comparacao_media,

        "comparacaoScoreVsMedia":
            comparacao_score_media,

        "lideresPorCriterio": {

            chave:
                resumir_item_ranking(
                    valor
                )

            for chave, valor in (
                lideres.items()
            )

        },

        "divergenciaLideres":
            divergencia,

        "estabilidadeLider":
            estabilidade_score,

        "desempenhoRecente":
            recente,

        "disputas":
            disputas,

        "diagnosticoEstrategias":
            diagnostico_estrategias,

        "ranking":
            ranking_lista,

        "criterios":
            criterios,

        "criteriosPromocao": {

            "aprovados":
                aprovados_promocao,

            "falhas":
                falhas_promocao

        },

        "decisao": {

            "decisao":
                decisao,

            "estrategiaRecomendada":
                (
                    nome_lider_score
                    if promover
                    else None
                ),

            "liderAtual":
                nome_lider_score,

            "liderScoreGlobal":
                nome_lider_score,

            "liderMediaReal":
                nome_lider_media,

            "promover":
                promover,

            "promocaoAutomatica":
                False,

            "scoreConfianca":
                score_confianca,

            "divergenciaScoreMedia":
                divergencia.get(
                    "divergenciaCritica",
                    False
                ),

            "observacao":
                observacao

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraPerfilOficial":
                False,

            "alteraPesos":
                False,

            "promocaoAutomatica":
                False,

            "bloqueiaPromocaoComDivergenciaScoreMedia":
                True

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
        quantidade_rodadas
    )

    print()

    print(
        "LÍDERES POR CRITÉRIO"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Score global:",
        nome_lider_score
    )

    print(
        "Maior média real:",
        nome_lider_media
    )

    print(
        "Maior mediana:",
        (
            lideres.get(
                "medianaPontos"
            ) or {}
        ).get(
            "nome"
        )
    )

    print(
        "Mais vitórias:",
        (
            lideres.get(
                "vitorias"
            ) or {}
        ).get(
            "nome"
        )
    )

    print(
        "Maior consistência:",
        (
            lideres.get(
                "consistencia"
            ) or {}
        ).get(
            "nome"
        )
    )

    print(
        "Menor MAE:",
        (
            lideres.get(
                "menorMae"
            ) or {}
        ).get(
            "nome"
        )
    )

    print()

    print(
        "DIVERGÊNCIA"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Classificação:",
        divergencia.get(
            "classificacao"
        )
    )

    print(
        "Score = média:",
        divergencia.get(
            "scoreIgualMedia"
        )
    )

    print(
        "Score = mediana:",
        divergencia.get(
            "scoreIgualMediana"
        )
    )

    print(
        "Explicação:",
        divergencia.get(
            "explicacao"
        )
    )

    print()

    if comparacao_score_media:

        print(
            "COMPARAÇÃO SCORE × DESEMPENHO REAL"
        )

        print(
            "----------------------------------------------"
        )

        print(
            "Líder score:",
            comparacao_score_media.get(
                "liderScore"
            )
        )

        print(
            "Líder média:",
            comparacao_score_media.get(
                "liderMedia"
            )
        )

        print(
            "Média líder score:",
            comparacao_score_media.get(
                "mediaLiderScore"
            )
        )

        print(
            "Melhor média real:",
            comparacao_score_media.get(
                "melhorMediaReal"
            )
        )

        print(
            "Diferença:",
            comparacao_score_media.get(
                "diferencaMedia"
            )
        )

        print(
            "Diferença percentual:",
            comparacao_score_media.get(
                "diferencaMediaPercentual"
            ),
            "%"
        )

        print()

    if comparacao_media:

        print(
            "RANKING POR MÉDIA REAL"
        )

        print(
            "----------------------------------------------"
        )

        print(
            "1º:",
            comparacao_media.get(
                "lider"
            ),
            "| Média:",
            comparacao_media.get(
                "mediaLider"
            )
        )

        print(
            "2º:",
            comparacao_media.get(
                "segundo"
            ),
            "| Média:",
            comparacao_media.get(
                "mediaSegundo"
            )
        )

        print(
            "Vantagem:",
            comparacao_media.get(
                "vantagemMedia"
            ),
            "pontos"
        )

        print(
            "Vantagem percentual:",
            comparacao_media.get(
                "vantagemMediaPercentual"
            ),
            "%"
        )

        print()

    print(
        "CRITÉRIOS DE PROMOÇÃO"
    )

    print(
        "----------------------------------------------"
    )

    for nome, aprovado in (
        criterios.items()
    ):

        status = (
            "OK"
            if aprovado
            else
            "FALHA"
        )

        print(
            f"[{status}] {nome}"
        )

    print()

    print(
        "Score de confiança:",
        score_confianca,
        "%"
    )

    print()

    print(
        "DECISÃO:",
        decisao
    )

    print(
        "Estratégia recomendada:",
        (
            nome_lider_score
            if promover
            else None
        )
    )

    print(
        "Promoção automática: NÃO"
    )

    print()

    print(
        "Observação:",
        observacao
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
