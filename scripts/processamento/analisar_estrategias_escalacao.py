"""
=========================================================
CARTOLA ESTATÍSTICO
Análise Científica das Estratégias de Escalação

Versão:
analise_estrategias_escalacao_v4

Entradas:
- data/ranking-simulacao.json
- data/auditoria-simulacao-times.json
- data/simulacao-times.json

Saída:
- data/analise-estrategias-escalacao.json

Objetivos:
- manter a análise científica das estratégias;
- preservar os critérios de promoção da V3;
- gerar calibração EXPERIMENTAL das estratégias;
- observar o desempenho histórico das formações;
- nunca alterar automaticamente pesos, estratégia ou formação.
=========================================================
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from statistics import mean, median, pstdev


# CONFIGURAÇÕES

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PASTA_DATA = BASE_DIR / "data"

ARQUIVO_RANKING = PASTA_DATA / "ranking-simulacao.json"
ARQUIVO_AUDITORIA = PASTA_DATA / "auditoria-simulacao-times.json"
ARQUIVO_SIMULACAO = PASTA_DATA / "simulacao-times.json"
ARQUIVO_SAIDA = PASTA_DATA / "analise-estrategias-escalacao.json"

ESTRATEGIAS_ESPERADAS = {
    "Conservador",
    "Equilibrado",
    "Agressivo",
}

FORMACOES_MOTOR = {
    "4-4-2",
    "3-4-3",
    "4-3-3",
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

# A calibração é deliberadamente conservadora.
FATOR_EXPERIMENTAL_MIN = 0.92
FATOR_EXPERIMENTAL_MAX = 1.08


# UTILIDADES

def carregar_json(caminho: Path):
    if not caminho.exists():
        print("[ERRO] Arquivo não encontrado:", caminho)
        return None

    try:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except Exception as erro:
        print("[ERRO] Falha ao ler", caminho, ":", erro)
        return None


def salvar_json(caminho: Path, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)

    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(
            dados,
            arquivo,
            ensure_ascii=False,
            indent=2,
        )


def numero(valor, padrao=0.0):
    try:
        if valor is None:
            return padrao

        resultado = float(valor)
        return resultado if math.isfinite(resultado) else padrao
    except Exception:
        return padrao


def arredondar(valor, casas=2):
    return round(numero(valor), casas)


def percentual(parte, total):
    parte = numero(parte)
    total = numero(total)
    return (parte / total) * 100 if total else 0.0


def media_segura(valores):
    valores = [numero(v) for v in valores]
    return mean(valores) if valores else 0.0


def mediana_segura(valores):
    valores = [numero(v) for v in valores]
    return median(valores) if valores else 0.0


def desvio_seguro(valores):
    valores = [numero(v) for v in valores]
    return pstdev(valores) if len(valores) >= 2 else 0.0


def limitar(valor, minimo, maximo):
    return max(minimo, min(maximo, numero(valor)))


def nome_item(item):
    if not isinstance(item, dict):
        return None

    return item.get("nome")


# HISTÓRICO POR ESTRATÉGIA

def coletar_historico(simulacao):
    historico = {}

    for rodada in simulacao.get("rodadas", []):
        numero_rodada = rodada.get("rodada")

        for estrategia in rodada.get("estrategias", []):
            nome = estrategia.get("nome")

            if not nome:
                continue

            historico.setdefault(nome, []).append({
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


# DISPUTAS DIRETAS

def calcular_disputas(simulacao):
    resultado = {}

    for rodada in simulacao.get("rodadas", []):
        valores = []

        for estrategia in rodada.get("estrategias", []):
            nome = estrategia.get("nome")

            if not nome:
                continue

            resultado.setdefault(
                nome,
                {
                    "participacoes": 0,
                    "vitorias": 0,
                    "empates": 0,
                    "derrotas": 0,
                },
            )

            resultado[nome]["participacoes"] += 1

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
            nome = item["nome"]

            if (
                len(vencedores) > 1
                and
                nome in vencedores
            ):
                resultado[nome]["empates"] += 1

            elif nome in vencedores:
                resultado[nome]["vitorias"] += 1

            else:
                resultado[nome]["derrotas"] += 1

    return resultado


# RECENTE / PERÍODOS

def resumir_registros(registros):
    pontos = [
        numero(
            item.get(
                "pontos"
            )
        )
        for item in registros
    ]

    return {
        "rodadas": [
            item.get(
                "rodada"
            )
            for item in registros
        ],

        "quantidade":
            len(registros),

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


def analisar_recente(
    historico,
    janela=JANELA_RECENTE,
):
    return {
        nome:
            resumir_registros(
                registros[
                    -janela:
                ]
            )

        for nome, registros
        in historico.items()
    }


def analisar_periodos(historico):
    resultado = {}

    for nome, registros in historico.items():
        if not registros:
            resultado[nome] = {
                "primeiraMetade": {},
                "segundaMetade": {},
            }

            continue

        corte = max(
            1,
            len(registros) // 2,
        )

        resultado[nome] = {
            "primeiraMetade":
                resumir_registros(
                    registros[
                        :corte
                    ]
                ),

            "segundaMetade":
                resumir_registros(
                    registros[
                        corte:
                    ]
                ),
        }

    return resultado


# ESTABILIDADE

def calcular_estabilidade(
    simulacao,
    estrategia_analisada,
):
    comparacoes = 0
    superior = 0
    empatou = 0
    inferior = 0
    margens = []

    for rodada in simulacao.get("rodadas", []):
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

        margem = (
            pontos[
                estrategia_analisada
            ]
            -
            max(
                adversarios
            )
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


# LÍDERES

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
            ),
    )


def identificar_lideres(ranking):
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


def analisar_divergencia(lideres):
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


def comparar_por_media(ranking):
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


# ROBUSTEZ

def calcular_robustez(
    nome,
    lideres,
    disputas,
    estabilidade,
    recente,
    periodos,
):
    criterios = {
        "liderMedia":
            nome ==
            nome_item(
                lideres.get(
                    "mediaPontos"
                )
            ),

        "liderMediana":
            nome ==
            nome_item(
                lideres.get(
                    "medianaPontos"
                )
            ),

        "liderVitorias":
            nome ==
            nome_item(
                lideres.get(
                    "vitorias"
                )
            ),

        "liderConsistencia":
            nome ==
            nome_item(
                lideres.get(
                    "consistencia"
                )
            ),
    }

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

    primeira = numero(
        periodos
        .get(
            "primeiraMetade",
            {},
        )
        .get(
            "media"
        )
    )

    segunda = numero(
        periodos
        .get(
            "segundaMetade",
            {},
        )
        .get(
            "media"
        )
    )

    media_recente = numero(
        recente.get(
            "media"
        )
    )

    criterios[
        "segundaMetadeCompetitiva"
    ] = (
        segunda
        >=
        primeira * 0.90
    )

    criterios[
        "momentoRecentePositivo"
    ] = (
        media_recente
        >=
        segunda * 0.90
    )

    pesos = {
        "liderMedia": 25,
        "liderMediana": 15,
        "liderVitorias": 15,
        "liderConsistencia": 10,
        "taxaVitoriasMinima": 10,
        "estabilidadeMinima": 10,
        "segundaMetadeCompetitiva": 7.5,
        "momentoRecentePositivo": 7.5,
    }

    pontos = sum(
        pesos.get(
            criterio,
            0,
        )
        for criterio, aprovado
        in criterios.items()
        if aprovado
    )

    return {
        "score":
            arredondar(
                pontos
            ),

        "criterios":
            criterios,
    }


# SCORE DE CONFIANÇA

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

    score_cobertura = limitar(
        cobertura,
        0,
        100,
    )

    score_vitorias = limitar(
        taxa_vitorias,
        0,
        100,
    )

    score_estabilidade = limitar(
        estabilidade,
        0,
        100,
    )

    score_consistencia = limitar(
        consistencia,
        0,
        100,
    )

    score_vantagem = limitar(
        (
            vantagem_percentual /
            5
        ) * 100,
        0,
        100,
    )

    score_lideranca = (
        100
        if lideranca_consistente
        else 0
    )

    score_robustez = limitar(
        robustez,
        0,
        100,
    )

    score = (
        score_amostra * 0.10
        +
        score_cobertura * 0.15
        +
        score_vitorias * 0.15
        +
        score_estabilidade * 0.15
        +
        score_consistencia * 0.10
        +
        score_vantagem * 0.10
        +
        score_lideranca * 0.10
        +
        score_robustez * 0.15
    )

    if not auditoria_aprovada:
        score *= 0.50

    return arredondar(
        score
    )


# CALIBRAÇÃO EXPERIMENTAL

def normalizar_min_max(
    valor,
    minimo,
    maximo,
    maior_melhor=True,
):
    valor = numero(
        valor
    )

    minimo = numero(
        minimo
    )

    maximo = numero(
        maximo
    )

    if abs(
        maximo -
        minimo
    ) <= 0.000001:
        return 50.0

    score = (
        (
            valor -
            minimo
        )
        /
        (
            maximo -
            minimo
        )
    ) * 100

    if not maior_melhor:
        score = (
            100 -
            score
        )

    return limitar(
        score,
        0,
        100,
    )


def calcular_calibracao_experimental(
    diagnostico,
):
    if not diagnostico:
        return {
            "status":
                "sem_dados",

            "aplicarAutomaticamente":
                False,

            "estrategias":
                [],
        }

    campos = {
        "media": [
            numero(
                item.get(
                    "mediaPontos"
                )
            )
            for item in diagnostico
        ],

        "recente": [
            numero(
                item
                .get(
                    "recente",
                    {},
                )
                .get(
                    "media"
                )
            )
            for item in diagnostico
        ],

        "vitorias": [
            numero(
                item.get(
                    "taxaVitorias"
                )
            )
            for item in diagnostico
        ],

        "consistencia": [
            numero(
                item.get(
                    "consistencia"
                )
            )
            for item in diagnostico
        ],

        "robustez": [
            numero(
                item
                .get(
                    "robustez",
                    {},
                )
                .get(
                    "score"
                )
            )
            for item in diagnostico
        ],

        "mae": [
            numero(
                item.get(
                    "maeMedioJogadores"
                )
            )
            for item in diagnostico
        ],
    }

    extremos = {
        chave: (
            min(
                valores
            ),
            max(
                valores
            ),
        )
        for chave, valores
        in campos.items()
    }

    estrategias = []

    for item in diagnostico:
        score_media = normalizar_min_max(
            item.get(
                "mediaPontos"
            ),
            *extremos[
                "media"
            ],
        )

        score_recente = normalizar_min_max(
            item
            .get(
                "recente",
                {},
            )
            .get(
                "media"
            ),
            *extremos[
                "recente"
            ],
        )

        score_vitorias = normalizar_min_max(
            item.get(
                "taxaVitorias"
            ),
            *extremos[
                "vitorias"
            ],
        )

        score_consistencia = normalizar_min_max(
            item.get(
                "consistencia"
            ),
            *extremos[
                "consistencia"
            ],
        )

        score_robustez = normalizar_min_max(
            item
            .get(
                "robustez",
                {},
            )
            .get(
                "score"
            ),
            *extremos[
                "robustez"
            ],
        )

        score_mae = normalizar_min_max(
            item.get(
                "maeMedioJogadores"
            ),
            *extremos[
                "mae"
            ],
            maior_melhor=False,
        )

        score = (
            score_media * 0.30
            +
            score_recente * 0.20
            +
            score_vitorias * 0.15
            +
            score_consistencia * 0.15
            +
            score_robustez * 0.10
            +
            score_mae * 0.10
        )

        estrategias.append({
            "nome":
                item.get(
                    "nome"
                ),

            "scoreCalibracao":
                arredondar(
                    score,
                    3,
                ),

            "componentes": {
                "mediaReal":
                    arredondar(
                        score_media
                    ),

                "momentoRecente":
                    arredondar(
                        score_recente
                    ),

                "taxaVitorias":
                    arredondar(
                        score_vitorias
                    ),

                "consistencia":
                    arredondar(
                        score_consistencia
                    ),

                "robustez":
                    arredondar(
                        score_robustez
                    ),

                "mae":
                    arredondar(
                        score_mae
                    ),
            },
        })

    media_scores = media_segura([
        item[
            "scoreCalibracao"
        ]
        for item in estrategias
    ])

    for item in estrategias:
        fator = (
            item[
                "scoreCalibracao"
            ]
            /
            media_scores
            if media_scores > 0
            else 1.0
        )

        item[
            "fatorExperimental"
        ] = arredondar(
            limitar(
                fator,
                FATOR_EXPERIMENTAL_MIN,
                FATOR_EXPERIMENTAL_MAX,
            ),
            4,
        )

    estrategias.sort(
        key=lambda item:
            numero(
                item.get(
                    "scoreCalibracao"
                )
            ),
        reverse=True,
    )

    return {
        "status":
            "experimental",

        "metodo":
            "blend_normalizado_v1",

        "aplicarAutomaticamente":
            False,

        "limiteFatorMinimo":
            FATOR_EXPERIMENTAL_MIN,

        "limiteFatorMaximo":
            FATOR_EXPERIMENTAL_MAX,

        "pesos": {
            "mediaReal": 0.30,
            "momentoRecente": 0.20,
            "taxaVitorias": 0.15,
            "consistencia": 0.15,
            "robustez": 0.10,
            "mae": 0.10,
        },

        "estrategias":
            estrategias,

        "liderExperimental":
            (
                estrategias[0].get(
                    "nome"
                )
                if estrategias
                else None
            ),
    }


# FORMAÇÕES OBSERVADAS

def analisar_formacoes_observadas(
    simulacao,
):
    acumulado = {}

    for rodada in simulacao.get(
        "rodadas",
        [],
    ):
        for estrategia in rodada.get(
            "estrategias",
            [],
        ):
            formacao = estrategia.get(
                "formacao"
            )

            if not formacao:
                continue

            if formacao not in acumulado:
                acumulado[formacao] = {
                    "pontos": [],
                    "estrategias": set(),
                    "rodadas": set(),
                }

            acumulado[
                formacao
            ][
                "pontos"
            ].append(
                numero(
                    estrategia.get(
                        "pontuacaoComCapitao"
                    )
                )
            )

            nome = estrategia.get(
                "nome"
            )

            if nome:
                acumulado[
                    formacao
                ][
                    "estrategias"
                ].add(
                    nome
                )

            numero_rodada = rodada.get(
                "rodada"
            )

            if numero_rodada is not None:
                acumulado[
                    formacao
                ][
                    "rodadas"
                ].add(
                    numero_rodada
                )

    observadas = []

    for formacao, dados in acumulado.items():
        pontos = dados[
            "pontos"
        ]

        observadas.append({
            "formacao":
                formacao,

            "amostras":
                len(
                    pontos
                ),

            "rodadas":
                len(
                    dados[
                        "rodadas"
                    ]
                ),

            "estrategias":
                sorted(
                    dados[
                        "estrategias"
                    ]
                ),

            "mediaPontos":
                arredondar(
                    media_segura(
                        pontos
                    )
                ),

            "medianaPontos":
                arredondar(
                    mediana_segura(
                        pontos
                    )
                ),

            "desvioPadrao":
                arredondar(
                    desvio_seguro(
                        pontos
                    )
                ),
        })

    observadas.sort(
        key=lambda item:
            numero(
                item.get(
                    "mediaPontos"
                )
            ),
        reverse=True,
    )

    testadas = {
        item[
            "formacao"
        ]
        for item in observadas
    }

    nao_testadas = sorted(
        FORMACOES_MOTOR -
        testadas
    )

    return {
        "observadas":
            observadas,

        "formacoesTestadas":
            sorted(
                testadas
            ),

        "formacoesAindaSemTesteIsolado":
            nao_testadas,

        "melhorMediaObservada":
            (
                observadas[0].get(
                    "formacao"
                )
                if observadas
                else None
            ),

        "observacao":
            (
                "Resultados por formação são observacionais. "
                "Uma formação somente poderá ser promovida após "
                "backtest comparável entre as formações sob a "
                "mesma estratégia e orçamento."
            ),
    }


# PROCESSAMENTO

def processar():
    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "ANÁLISE DAS ESTRATÉGIAS DE ESCALAÇÃO V4"
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

    ranking = (
        ranking
        if isinstance(
            ranking,
            dict,
        )
        else {}
    )

    auditoria = (
        auditoria
        if isinstance(
            auditoria,
            dict,
        )
        else {}
    )

    simulacao = (
        simulacao
        if isinstance(
            simulacao,
            dict,
        )
        else {}
    )

    ranking_lista = ranking.get(
        "ranking",
        [],
    )

    ranking_lista = (
        ranking_lista
        if isinstance(
            ranking_lista,
            list,
        )
        else []
    )

    if not ranking_lista:
        resultado = {
            "modelo":
                "analise_estrategias_escalacao_v4",

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

            "calibracaoExperimental": {
                "status":
                    "sem_dados",

                "aplicarAutomaticamente":
                    False,

                "estrategias":
                    [],
            },

            "formacoesObservadas": {
                "observadas":
                    [],

                "formacoesTestadas":
                    [],

                "formacoesAindaSemTesteIsolado":
                    sorted(
                        FORMACOES_MOTOR
                    ),
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
        auditoria
        .get(
            "decisao",
            {},
        )
        .get(
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

    calibracao_experimental = (
        calcular_calibracao_experimental(
            diagnostico
        )
    )

    formacoes_observadas = (
        analisar_formacoes_observadas(
            simulacao
        )
    )

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
            nomes_ranking
            ==
            ESTRATEGIAS_ESPERADAS,

        "amostraMinimaAnalise":
            quantidade_rodadas
            >=
            MINIMO_RODADAS_ANALISE,

        "amostraMinimaPromocao":
            quantidade_rodadas
            >=
            MINIMO_RODADAS_PROMOCAO,

        "coberturaMinima":
            cobertura
            >=
            MINIMO_COBERTURA,

        "liderScoreTambemLiderMedia":
            nome_lider_score
            ==
            nome_lider_media,

        "vantagemMediaMinima":
            vantagem_media
            >=
            MINIMO_VANTAGEM_MEDIA,

        "vantagemPercentualMinima":
            vantagem_percentual
            >=
            MINIMO_VANTAGEM_PERCENTUAL,

        "taxaVitoriasMinima":
            taxa_vitorias
            >=
            MINIMO_TAXA_VITORIAS,

        "estabilidadeMinima":
            taxa_estabilidade
            >=
            MINIMO_ESTABILIDADE,

        "consistenciaMinima":
            consistencia
            >=
            MINIMO_CONSISTENCIA,

        "robustezMinima":
            robustez_lider
            >=
            MINIMO_ROBUSTEZ,

        "scoreConfiancaMinimo":
            score_confianca
            >=
            MINIMO_SCORE_CONFIANCA,
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
            f"A estratégia {nome_lider_score} lidera "
            "score global e média real e atingiu todos "
            "os critérios de desempenho, estabilidade "
            "e robustez. É candidata experimental à "
            "promoção, mas nenhuma alteração será "
            "automática."
        )

    elif divergencia.get(
        "divergenciaCritica",
        False,
    ):
        observacao = (
            f"O score composto aponta "
            f"{nome_lider_score} como líder, mas a "
            f"maior média real pertence a "
            f"{nome_lider_media}. A divergência "
            "bloqueia promoção."
        )

    else:
        observacao = (
            "Os dados históricos ainda não demonstram "
            "superioridade suficiente para substituir "
            "as estratégias atuais."
        )

    resultado = {
        "modelo":
            "analise_estrategias_escalacao_v4",

        "descricao":
            (
                "Avaliação histórica das estratégias "
                "Conservador, Equilibrado e Agressivo "
                "com validação de desempenho real, "
                "estabilidade, robustez e calibração "
                "experimental segura."
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

            "fatorExperimentalMin":
                FATOR_EXPERIMENTAL_MIN,

            "fatorExperimentalMax":
                FATOR_EXPERIMENTAL_MAX,
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

        "calibracaoExperimental":
            calibracao_experimental,

        "formacoesObservadas":
            formacoes_observadas,

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

            "calibracaoExperimentalAlteraPesos":
                False,

            "formacaoObservadaAlteraModelo":
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
        "Calibração experimental:",
        calibracao_experimental.get(
            "liderExperimental"
        ),
    )

    for item in calibracao_experimental.get(
        "estrategias",
        [],
    ):
        print(
            "   ",
            item.get(
                "nome"
            ),
            "| score:",
            item.get(
                "scoreCalibracao"
            ),
            "| fator:",
            item.get(
                "fatorExperimental"
            ),
        )

    print()

    print(
        "Formações observadas:",
        formacoes_observadas.get(
            "formacoesTestadas"
        ),
    )

    print(
        "Formações sem teste isolado:",
        formacoes_observadas.get(
            "formacoesAindaSemTesteIsolado"
        ),
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


# EXECUÇÃO

if __name__ == "__main__":
    processar()
