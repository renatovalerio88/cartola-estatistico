"""
=========================================================
CARTOLA ESTATÍSTICO
Análise Científica das Estratégias de Escalação

Versão:
analise_estrategias_escalacao_v3

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

A análise separa:

1. líder por score global;
2. líder por média real;
3. líder por mediana;
4. líder por vitórias;
5. consistência;
6. estabilidade;
7. desempenho recente;
8. desempenho por metade da temporada;
9. vantagem real sobre os concorrentes;
10. robustez da liderança.

IMPORTANTE:

O score composto NÃO é suficiente para promover
uma estratégia.

Uma estratégia somente poderá ser considerada
candidata à promoção quando também demonstrar
superioridade em pontuação real.

Nenhuma promoção é automática.

=========================================================
"""

from __future__ import annotations

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
    "Agressivo",
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

MINIMO_ROBUSTEZ = 60.0

JANELA_RECENTE = 5

TOLERANCIA_EMPATE = 0.001


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(
    caminho: Path,
):

    if not caminho.exists():

        print(
            "[ERRO] Arquivo não encontrado:",
            caminho,
        )

        return None

    try:

        with open(
            caminho,
            "r",
            encoding="utf-8",
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception as erro:

        print(
            "[ERRO] Falha ao ler",
            caminho,
            ":",
            erro,
        )

        return None


def salvar_json(
    caminho: Path,
    dados,
):

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        caminho,
        "w",
        encoding="utf-8",
    ) as arquivo:

        json.dump(
            dados,
            arquivo,
            ensure_ascii=False,
            indent=2,
        )


def numero(
    valor,
    padrao=0.0,
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
    casas=2,
):

    return round(
        numero(valor),
        casas,
    )


def percentual(
    parte,
    total,
):

    parte = numero(
        parte
    )

    total = numero(
        total
    )

    if total == 0:
        return 0.0

    return (
        parte /
        total
    ) * 100


def media_segura(
    valores,
):

    valores = [
        numero(valor)
        for valor in valores
    ]

    if not valores:
        return 0.0

    return mean(
        valores
    )


def mediana_segura(
    valores,
):

    valores = [
        numero(valor)
        for valor in valores
    ]

    if not valores:
        return 0.0

    return median(
        valores
    )


def desvio_seguro(
    valores,
):

    valores = [
        numero(valor)
        for valor in valores
    ]

    if len(valores) < 2:
        return 0.0

    return pstdev(
        valores
    )


# ======================================================
# HISTÓRICO POR ESTRATÉGIA
# ======================================================

def coletar_historico(
    simulacao,
):

    historico = {}

    for rodada in simulacao.get(
        "rodadas",
        [],
    ):

        numero_rodada = rodada.get(
            "rodada"
        )

        for estrategia in rodada.get(
            "estrategias",
            [],
        ):

            nome = estrategia.get(
                "nome"
            )

            if not nome:
                continue

            if nome not in historico:
                historico[nome] = []

            historico[nome].append({

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
                    ),

            })

    for nome in historico:

        historico[nome].sort(
            key=lambda item:
                numero(
                    item.get(
                        "rodada"
                    )
                )
        )

    return historico


# ======================================================
# DISPUTAS DIRETAS
# ======================================================

def calcular_disputas(
    simulacao,
):

    resultado = {}

    for rodada in simulacao.get(
        "rodadas",
        [],
    ):

        estrategias = rodada.get(
            "estrategias",
            [],
        )

        valores = []

        for estrategia in estrategias:

            nome = estrategia.get(
                "nome"
            )

            if not nome:
                continue

            if nome not in resultado:

                resultado[nome] = {

                    "participacoes": 0,

                    "vitorias": 0,

                    "empates": 0,

                    "derrotas": 0,

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
                    ),

            })

        if not valores:
            continue

        maior = max(
            item["pontos"]
            for item in valores
        )

        vencedores = [

            item["nome"]

            for item in valores

            if abs(
                item["pontos"] -
                maior
            ) <= TOLERANCIA_EMPATE

        ]

        for item in valores:

            nome = item[
                "nome"
            ]

            if (
                len(vencedores) > 1
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
    janela=JANELA_RECENTE,
):

    resultado = {}

    for nome, registros in historico.items():

        recentes = registros[
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

        resultado[nome] = {

            "rodadas": [

                item.get(
                    "rodada"
                )

                for item in recentes

            ],

            "quantidade":
                len(recentes),

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

            "total":
                arredondar(
                    sum(
                        pontos
                    )
                ),

            "desvioPadrao":
                arredondar(
                    desvio_seguro(
                        pontos
                    )
                ),

        }

    return resultado


# ======================================================
# DESEMPENHO POR PERÍODO
# ======================================================

def analisar_periodos(
    historico,
):

    resultado = {}

    for nome, registros in historico.items():

        quantidade = len(
            registros
        )

        if quantidade == 0:

            resultado[nome] = {
                "primeiraMetade": {},
                "segundaMetade": {},
            }

            continue

        corte = max(
            1,
            quantidade // 2,
        )

        primeira = registros[
            :corte
        ]

        segunda = registros[
            corte:
        ]

        def resumo(
            itens,
        ):

            pontos = [

                numero(
                    item.get(
                        "pontos"
                    )
                )

                for item in itens

            ]

            return {

                "rodadas": [

                    item.get(
                        "rodada"
                    )

                    for item in itens

                ],

                "quantidade":
                    len(itens),

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

                "total":
                    arredondar(
                        sum(
                            pontos
                        )
                    ),

                "desvioPadrao":
                    arredondar(
                        desvio_seguro(
                            pontos
                        )
                    ),

            }

        resultado[nome] = {

            "primeiraMetade":
                resumo(
                    primeira
                ),

            "segundaMetade":
                resumo(
                    segunda
                ),

        }

    return resultado


# ======================================================
# ESTABILIDADE
# ======================================================

def calcular_estabilidade(
    simulacao,
    estrategia_analisada,
):

    comparacoes = 0

    superior = 0

    empatou = 0

    inferior = 0

    margens = []

    for rodada in simulacao.get(
        "rodadas",
        [],
    ):

        pontos = {

            item.get("nome"):
                numero(
                    item.get(
                        "pontuacaoComCapitao"
                    )
                )

            for item in rodada.get(
                "estrategias",
                [],
            )

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
                percentual(
                    superior,
                    comparacoes,
                )
            ),

        "taxaNaoDerrotaPercentual":
            arredondar(
                percentual(
                    superior + empatou,
                    comparacoes,
                )
            ),

        "margemMediaContraMelhorAdversario":
            arredondar(
                media_segura(
                    margens
                )
            ),

        "desvioMargem":
            arredondar(
                desvio_seguro(
                    margens
                )
            ),

    }


# ======================================================
# LÍDERES
# ======================================================

def obter_lider_por_campo(
    ranking,
    campo,
    maior_melhor=True,
):

    candidatos = [

        item

        for item in ranking

        if item.get(
            "nome"
        )

    ]

    if not candidatos:
        return None

    funcao = (
        max
        if maior_melhor
        else min
    )

    return funcao(

        candidatos,

        key=lambda item:
            numero(
                item.get(
                    campo
                )
            )

    )


def identificar_lideres(
    ranking,
):

    return {

        "scoreGlobal":
            ranking[0]
            if ranking
            else None,

        "mediaPontos":
            obter_lider_por_campo(
                ranking,
                "mediaPontos",
            ),

        "medianaPontos":
            obter_lider_por_campo(
                ranking,
                "medianaPontos",
            ),

        "vitorias":
            obter_lider_por_campo(
                ranking,
                "vitorias",
            ),

        "consistencia":
            obter_lider_por_campo(
                ranking,
                "consistencia",
            ),

        "menorMae":
            obter_lider_por_campo(
                ranking,
                "maeMedioJogadores",
                maior_melhor=False,
            ),

    }


def nome_item(
    item,
):

    if not item:
        return None

    return item.get(
        "nome"
    )


# ======================================================
# DIVERGÊNCIA ENTRE LÍDERES
# ======================================================

def analisar_divergencia(
    lideres,
):

    lider_score = nome_item(
        lideres.get(
            "scoreGlobal"
        )
    )

    lider_media = nome_item(
        lideres.get(
            "mediaPontos"
        )
    )

    lider_mediana = nome_item(
        lideres.get(
            "medianaPontos"
        )
    )

    score_igual_media = (
        lider_score is not None
        and
        lider_score == lider_media
    )

    score_igual_mediana = (
        lider_score is not None
        and
        lider_score == lider_mediana
    )

    media_igual_mediana = (
        lider_media is not None
        and
        lider_media == lider_mediana
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
            f"({lider_score}) não é o líder "
            f"pela média real "
            f"({lider_media})."
        )

    elif not score_igual_mediana:

        classificacao = (
            "DIVERGENCIA_SECUNDARIA"
        )

        explicacao = (
            "O líder por score e média coincide, "
            "mas existe divergência na mediana."
        )

    else:

        classificacao = (
            "LIDERANCA_CONSISTENTE"
        )

        explicacao = (
            "O líder por score global também "
            "lidera os principais indicadores "
            "de pontuação real."
        )

    return {

        "liderScore":
            lider_score,

        "liderMedia":
            lider_media,

        "liderMediana":
            lider_mediana,

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
            explicacao,

    }


# ======================================================
# COMPARAÇÃO POR MÉDIA
# ======================================================

def comparar_por_media(
    ranking,
):

    ordenado = sorted(

        ranking,

        key=lambda item:
            numero(
                item.get(
                    "mediaPontos"
                )
            ),

        reverse=True,

    )

    if len(
        ordenado
    ) < 2:

        return None

    primeiro = ordenado[0]

    segundo = ordenado[1]

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

    vantagem = (
        media_primeiro -
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
                vantagem
            ),

        "vantagemMediaPercentual":
            arredondar(
                percentual(
                    vantagem,
                    media_segundo,
                )
            ),

    }


# ======================================================
# ROBUSTEZ
# ======================================================

def calcular_robustez(
    nome,
    lideres,
    disputas,
    estabilidade,
    recente,
    periodos,
):

    pontos = 0.0

    criterios = {}

    criterios[
        "liderMedia"
    ] = (
        nome ==
        nome_item(
            lideres.get(
                "mediaPontos"
            )
        )
    )

    criterios[
        "liderMediana"
    ] = (
        nome ==
        nome_item(
            lideres.get(
                "medianaPontos"
            )
        )
    )

    criterios[
        "liderVitorias"
    ] = (
        nome ==
        nome_item(
            lideres.get(
                "vitorias"
            )
        )
    )

    criterios[
        "liderConsistencia"
    ] = (
        nome ==
        nome_item(
            lideres.get(
                "consistencia"
            )
        )
    )

    disputa = disputas.get(
        nome,
        {},
    )

    taxa_vitorias = percentual(
        disputa.get(
            "vitorias"
        ),
        disputa.get(
            "participacoes"
        ),
    )

    criterios[
        "taxaVitoriasMinima"
    ] = (
        taxa_vitorias
        >=
        MINIMO_TAXA_VITORIAS
    )

    criterios[
        "estabilidadeMinima"
    ] = (
        numero(
            estabilidade.get(
                "taxaSuperioridadePercentual"
            )
        )
        >=
        MINIMO_ESTABILIDADE
    )

    primeira = (
        periodos
        .get(
            "primeiraMetade",
            {},
        )
        .get(
            "media",
            0,
        )
    )

    segunda = (
        periodos
        .get(
            "segundaMetade",
            {},
        )
        .get(
            "media",
            0,
        )
    )

    criterios[
        "segundaMetadeCompetitiva"
    ] = (
        numero(
            segunda
        )
        >=
        numero(
            primeira
        ) * 0.90
    )

    criterios[
        "momentoRecentePositivo"
    ] = (
        numero(
            recente.get(
                "media"
            )
        )
        >=
        numero(
            segunda
        ) * 0.90
    )

    pesos = {

        "liderMedia":
            25,

        "liderMediana":
            15,

        "liderVitorias":
            15,

        "liderConsistencia":
            10,

        "taxaVitoriasMinima":
            10,

        "estabilidadeMinima":
            10,

        "segundaMetadeCompetitiva":
            7.5,

        "momentoRecentePositivo":
            7.5,

    }

    for criterio, aprovado in criterios.items():

        if aprovado:

            pontos += pesos.get(
                criterio,
                0,
            )

    return {

        "score":
            arredondar(
                pontos
            ),

        "criterios":
            criterios,

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
    auditoria_aprovada,
    robustez,
):

    score_amostra = min(
        100,
        percentual(
            rodadas,
            MINIMO_RODADAS_PROMOCAO,
        ),
    )

    score_cobertura = max(
        0,
        min(
            100,
            cobertura,
        ),
    )

    score_vitorias = max(
        0,
        min(
            100,
            taxa_vitorias,
        ),
    )

    score_estabilidade = max(
        0,
        min(
            100,
            estabilidade,
        ),
    )

    score_consistencia = max(
        0,
        min(
            100,
            consistencia,
        ),
    )

    score_vantagem = min(
        100,
        max(
            0,
            (
                vantagem_percentual /
                5
            ) * 100,
        ),
    )

    score_lideranca = (
        100
        if lideranca_consistente
        else 0
    )

    score_robustez = max(
        0,
        min(
            100,
            robustez,
        ),
    )

    score = (

        score_amostra * 0.10

        + score_cobertura * 0.15

        + score_vitorias * 0.15

        + score_estabilidade * 0.15

        + score_consistencia * 0.10

        + score_vantagem * 0.10

        + score_lideranca * 0.10

        + score_robustez * 0.15

    )

    if not auditoria_aprovada:

        score *= 0.50

    return arredondar(
        score
    )


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "ANÁLISE DAS ESTRATÉGIAS DE ESCALAÇÃO V3"
    )

    print(
        "============================================"
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
        dict,
    ):
        ranking = {}

    if not isinstance(
        auditoria,
        dict,
    ):
        auditoria = {}

    if not isinstance(
        simulacao,
        dict,
    ):
        simulacao = {}

    ranking_lista = ranking.get(
        "ranking",
        [],
    )

    if not isinstance(
        ranking_lista,
        list,
    ):
        ranking_lista = []

    if not ranking_lista:

        resultado = {

            "modelo":
                "analise_estrategias_escalacao_v3",

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
                    False,

            },

        }

        salvar_json(
            ARQUIVO_SAIDA,
            resultado,
        )

        print(
            "Nenhum ranking disponível."
        )

        return

    historico = coletar_historico(
        simulacao
    )

    disputas = calcular_disputas(
        simulacao
    )

    recente = analisar_recente(
        historico
    )

    periodos = analisar_periodos(
        historico
    )

    lideres = identificar_lideres(
        ranking_lista
    )

    divergencia = analisar_divergencia(
        lideres
    )

    comparacao_media = comparar_por_media(
        ranking_lista
    )

    quantidade_rodadas = int(
        numero(
            ranking.get(
                "quantidadeRodadas"
            )
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
            {},
        ).get(
            "aprovada",
            False,
        )

    )

    diagnostico = []

    robustez_por_estrategia = {}

    for item in ranking_lista:

        nome = item.get(
            "nome"
        )

        if not nome:
            continue

        estabilidade = calcular_estabilidade(
            simulacao,
            nome,
        )

        robustez = calcular_robustez(

            nome,

            lideres,

            disputas,

            estabilidade,

            recente.get(
                nome,
                {},
            ),

            periodos.get(
                nome,
                {},
            ),

        )

        robustez_por_estrategia[
            nome
        ] = robustez

        disputa = disputas.get(
            nome,
            {},
        )

        diagnostico.append({

            "nome":
                nome,

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
                    3,
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
                    3,
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
                        ),
                    )
                ),

            "estabilidade":
                estabilidade,

            "recente":
                recente.get(
                    nome,
                    {},
                ),

            "periodos":
                periodos.get(
                    nome,
                    {},
                ),

            "robustez":
                robustez,

        })

    lider_score = lideres.get(
        "scoreGlobal"
    )

    lider_media = lideres.get(
        "mediaPontos"
    )

    nome_lider_score = nome_item(
        lider_score
    )

    nome_lider_media = nome_item(
        lider_media
    )

    disputa_lider = disputas.get(
        nome_lider_score,
        {},
    )

    taxa_vitorias = percentual(
        disputa_lider.get(
            "vitorias"
        ),
        disputa_lider.get(
            "participacoes"
        ),
    )

    estabilidade_lider = calcular_estabilidade(
        simulacao,
        nome_lider_score,
    )

    taxa_estabilidade = numero(
        estabilidade_lider.get(
            "taxaSuperioridadePercentual"
        )
    )

    cobertura = numero(

        lider_score.get(
            "coberturaMediaPercentual"
        )

        if lider_score

        else 0

    )

    consistencia = numero(

        lider_score.get(
            "consistencia"
        )

        if lider_score

        else 0

    )

    vantagem_media = numero(

        comparacao_media.get(
            "vantagemMedia"
        )

        if comparacao_media

        else 0

    )

    vantagem_percentual = numero(

        comparacao_media.get(
            "vantagemMediaPercentual"
        )

        if comparacao_media

        else 0

    )

    lideranca_consistente = (
        not divergencia.get(
            "divergenciaCritica",
            True,
        )
    )

    robustez_lider = numero(

        robustez_por_estrategia
        .get(
            nome_lider_score,
            {},
        )
        .get(
            "score"
        )

    )

    score_confianca = calcular_score_confianca(

        quantidade_rodadas,

        cobertura,

        taxa_vitorias,

        taxa_estabilidade,

        vantagem_percentual,

        consistencia,

        lideranca_consistente,

        auditoria_aprovada,

        robustez_lider,

    )

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
                cobertura
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
                vantagem_media
                >=
                MINIMO_VANTAGEM_MEDIA
            ),

        "vantagemPercentualMinima":
            (
                vantagem_percentual
                >=
                MINIMO_VANTAGEM_PERCENTUAL
            ),

        "taxaVitoriasMinima":
            (
                taxa_vitorias
                >=
                MINIMO_TAXA_VITORIAS
            ),

        "estabilidadeMinima":
            (
                taxa_estabilidade
                >=
                MINIMO_ESTABILIDADE
            ),

        "consistenciaMinima":
            (
                consistencia
                >=
                MINIMO_CONSISTENCIA
            ),

        "robustezMinima":
            (
                robustez_lider
                >=
                MINIMO_ROBUSTEZ
            ),

        "scoreConfiancaMinimo":
            (
                score_confianca
                >=
                MINIMO_SCORE_CONFIANCA
            ),

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

        "robustezMinima",

        "scoreConfiancaMinimo",

    ]

    aprovados = [

        criterio

        for criterio in criterios_promocao

        if criterios.get(
            criterio,
            False,
        )

    ]

    falhas = [

        criterio

        for criterio in criterios_promocao

        if not criterios.get(
            criterio,
            False,
        )

    ]

    promover = (
        len(
            falhas
        ) == 0
    )

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
        False,
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

    if promover:

        observacao = (

            f"A estratégia {nome_lider_score} "
            "lidera score global e média real e "
            "atingiu todos os critérios de "
            "desempenho, estabilidade e robustez. "
            "É candidata experimental à promoção, "
            "mas nenhuma alteração será automática."

        )

    elif divergencia.get(
        "divergenciaCritica",
        False,
    ):

        observacao = (

            f"O score composto aponta "
            f"{nome_lider_score} como líder, "
            f"mas a maior média real pertence a "
            f"{nome_lider_media}. "
            "A divergência bloqueia promoção."

        )

    else:

        observacao = (

            "Os dados históricos ainda não "
            "demonstram superioridade suficiente "
            "para substituir as estratégias atuais."

        )

    resultado = {

        "modelo":
            "analise_estrategias_escalacao_v3",

        "descricao":
            (
                "Avaliação histórica das estratégias "
                "Conservador, Equilibrado e Agressivo "
                "com validação de desempenho real, "
                "estabilidade e robustez."
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

            "minimoRobustez":
                MINIMO_ROBUSTEZ,

            "minimoScoreConfianca":
                MINIMO_SCORE_CONFIANCA,

            "janelaRecente":
                JANELA_RECENTE,

        },

        "resumo": {

            "rodadas":
                quantidade_rodadas,

            "estrategias":
                len(
                    ranking_lista
                ),

            "liderScoreGlobal":
                nome_lider_score,

            "liderMediaReal":
                nome_lider_media,

            "liderMediana":
                nome_item(
                    lideres.get(
                        "medianaPontos"
                    )
                ),

            "liderVitorias":
                nome_item(
                    lideres.get(
                        "vitorias"
                    )
                ),

            "liderConsistencia":
                nome_item(
                    lideres.get(
                        "consistencia"
                    )
                ),

            "menorMae":
                nome_item(
                    lideres.get(
                        "menorMae"
                    )
                ),

            "taxaVitoriasLider":
                arredondar(
                    taxa_vitorias
                ),

            "estabilidadeLider":
                arredondar(
                    taxa_estabilidade
                ),

            "coberturaLider":
                arredondar(
                    cobertura
                ),

            "robustezLider":
                arredondar(
                    robustez_lider
                ),

            "scoreConfianca":
                score_confianca,

            "liderancaConsistente":
                lideranca_consistente,

            "divergenciaScoreMedia":
                divergencia.get(
                    "divergenciaCritica",
                    False,
                ),

        },

        "comparacaoPorMedia":
            comparacao_media,

        "lideresPorCriterio": {

            chave:
                nome_item(
                    valor
                )

            for chave, valor
            in lideres.items()

        },

        "divergenciaLideres":
            divergencia,

        "desempenhoRecente":
            recente,

        "desempenhoPorPeriodo":
            periodos,

        "disputas":
            disputas,

        "robustez":
            robustez_por_estrategia,

        "diagnosticoEstrategias":
            diagnostico,

        "ranking":
            ranking_lista,

        "criterios":
            criterios,

        "criteriosPromocao": {

            "aprovados":
                aprovados,

            "falhas":
                falhas,

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

            "robustez":
                robustez_lider,

            "divergenciaScoreMedia":
                divergencia.get(
                    "divergenciaCritica",
                    False,
                ),

            "observacao":
                observacao,

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
                True,

        },

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado,
    )

    print()

    print(
        "Rodadas analisadas:",
        quantidade_rodadas,
    )

    print(
        "Estratégias:",
        len(
            ranking_lista
        ),
    )

    print()

    print(
        "============================================"
    )

    print(
        "LÍDERES"
    )

    print(
        "============================================"
    )

    print(
        "Score global:",
        nome_lider_score,
    )

    print(
        "Maior média real:",
        nome_lider_media,
    )

    print(
        "Maior mediana:",
        nome_item(
            lideres.get(
                "medianaPontos"
            )
        ),
    )

    print(
        "Mais vitórias:",
        nome_item(
            lideres.get(
                "vitorias"
            )
        ),
    )

    print(
        "Maior consistência:",
        nome_item(
            lideres.get(
                "consistencia"
            )
        ),
    )

    print(
        "Menor MAE:",
        nome_item(
            lideres.get(
                "menorMae"
            )
        ),
    )

    print()

    print(
        "============================================"
    )

    print(
        "VALIDAÇÃO"
    )

    print(
        "============================================"
    )

    print(
        "Auditoria:",
        (
            "APROVADA"
            if auditoria_aprovada
            else "REPROVADA"
        ),
    )

    print(
        "Cobertura:",
        arredondar(
            cobertura
        ),
        "%",
    )

    print(
        "Taxa de vitórias:",
        arredondar(
            taxa_vitorias
        ),
        "%",
    )

    print(
        "Estabilidade:",
        arredondar(
            taxa_estabilidade
        ),
        "%",
    )

    print(
        "Robustez:",
        arredondar(
            robustez_lider
        ),
        "%",
    )

    print(
        "Score de confiança:",
        score_confianca,
        "%",
    )

    print()

    print(
        "============================================"
    )

    print(
        "CRITÉRIOS DE PROMOÇÃO"
    )

    print(
        "============================================"
    )

    for criterio in criterios_promocao:

        aprovado = criterios.get(
            criterio,
            False,
        )

        print(
            f"[{'OK' if aprovado else 'FALHA'}] "
            f"{criterio}"
        )

    print()

    print(
        "============================================"
    )

    print(
        "DECISÃO:",
        decisao,
    )

    print(
        "Estratégia recomendada:",
        (
            nome_lider_score
            if promover
            else None
        ),
    )

    print(
        "Promoção automática: NÃO"
    )

    print()

    print(
        "Observação:",
        observacao,
    )

    print()

    print(
        "Arquivo:",
        ARQUIVO_SAIDA,
    )

    print(
        "============================================"
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
