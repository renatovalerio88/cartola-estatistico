"""
=========================================================
CARTOLA ESTATÍSTICO
Análise Científica das Simulações Históricas

Objetivo:
Avaliar em profundidade o desempenho das estratégias
de escalação reconstruídas pelo backtest progressivo.

Entradas principais:

data/simulacao-times.json

Arquivos históricos auxiliares:

data/historico/rodada-XX/jogadores.json
data/historico/rodada-XX.json
data/api/rodada-XX/jogadores.json
data/api/rodada-XX/pontuados.json

Saída:

data/analise-simulacoes-historicas.json


Métricas:

- pontuação projetada x real
- erro absoluto de projeção
- erro por posição
- desempenho por estratégia
- desempenho do capitão
- acerto entre melhores reais da posição
- evolução rodada a rodada
- análise com e sem cold start
- evolução conforme aumenta o histórico disponível

IMPORTANTE:

Este script apenas ANALISA resultados já simulados.
Ele não participa da escolha dos jogadores e,
portanto, pode utilizar a pontuação real da rodada
para avaliar a qualidade das previsões.

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


PASTA_DATA = (
    BASE_DIR /
    "data"
)


PASTA_HISTORICO = (
    PASTA_DATA /
    "historico"
)


PASTA_API = (
    PASTA_DATA /
    "api"
)


ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)


ARQUIVO_SAIDA = (
    PASTA_DATA /
    "analise-simulacoes-historicas.json"
)


RODADA_COLD_START = 2


POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
]


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
            f"[AVISO] Falha ao carregar "
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


def inteiro(
    valor,
    padrao=None
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

    valores_validos = [

        numero(
            valor,
            0
        )

        for valor in valores

    ]

    if not valores_validos:
        return 0

    return mean(
        valores_validos
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

    if len(valores) <= 1:
        return 0

    return pstdev(
        valores
    )


def normalizar_texto(
    valor
):

    if valor is None:
        return ""

    return (
        str(valor)
        .strip()
        .lower()
    )


# ======================================================
# IDENTIFICAÇÃO DE JOGADORES
# ======================================================

def obter_id(
    jogador
):

    possibilidades = [

        jogador.get("id"),

        jogador.get(
            "atletaId"
        ),

        jogador.get(
            "atleta_id"
        )

    ]

    for valor in possibilidades:

        if valor is not None:

            return str(
                valor
            )

    nome = normalizar_texto(

        jogador.get("nome")

        or jogador.get(
            "apelido"
        )

    )

    clube = normalizar_texto(

        jogador.get(
            "siglaClube"
        )

        or jogador.get(
            "clube"
        )

        or jogador.get(
            "clubeId"
        )

    )

    posicao = normalizar_texto(

        jogador.get(
            "posicao"
        )

    )

    return (
        f"{nome}|"
        f"{clube}|"
        f"{posicao}"
    )


def obter_nome(
    jogador
):

    return (

        jogador.get("nome")

        or jogador.get(
            "apelido"
        )

        or ""

    )


# ======================================================
# POSIÇÕES
# ======================================================

MAPA_POSICOES_ID = {

    1: "GOL",

    2: "LAT",

    3: "ZAG",

    4: "MEI",

    5: "ATA",

    6: "TEC"

}


MAPA_POSICOES_TEXTO = {

    "gol": "GOL",

    "goleiro": "GOL",

    "lat": "LAT",

    "lateral": "LAT",

    "zag": "ZAG",

    "zagueiro": "ZAG",

    "mei": "MEI",

    "meia": "MEI",

    "ata": "ATA",

    "atacante": "ATA",

    "tec": "TEC",

    "tecnico": "TEC",

    "técnico": "TEC"

}


def obter_posicao(
    jogador
):

    posicao_id = inteiro(

        jogador.get(
            "posicaoId"
        )

        or jogador.get(
            "posicao_id"
        )

    )

    if posicao_id in MAPA_POSICOES_ID:

        return MAPA_POSICOES_ID[
            posicao_id
        ]

    texto = normalizar_texto(

        jogador.get(
            "posicao"
        )

        or jogador.get(
            "posicaoNome"
        )

    )

    if texto in MAPA_POSICOES_TEXTO:

        return MAPA_POSICOES_TEXTO[
            texto
        ]

    texto_maiusculo = (
        texto.upper()
    )

    if texto_maiusculo in POSICOES:

        return texto_maiusculo

    return ""


# ======================================================
# PONTUAÇÃO REAL
# ======================================================

def obter_pontuacao_real(
    jogador
):

    campos = [

        "pontuacaoReal",

        "pontos",

        "pontuacao",

        "real",

        "pontosUltimaRodada"

    ]

    for campo in campos:

        valor = jogador.get(
            campo
        )

        if valor is not None:

            return numero(
                valor,
                0
            )

    return 0


# ======================================================
# EXTRAÇÃO DOS JOGADORES
# ======================================================

def extrair_lista_jogadores(
    dados
):

    if dados is None:
        return []

    if isinstance(
        dados,
        list
    ):

        return dados

    if not isinstance(
        dados,
        dict
    ):

        return []

    possibilidades = [

        "jogadores",

        "atletas",

        "pontuados"

    ]

    for chave in possibilidades:

        valor = dados.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

        if isinstance(
            valor,
            dict
        ):

            lista = []

            for (
                atleta_id,
                atleta
            ) in valor.items():

                if not isinstance(
                    atleta,
                    dict
                ):

                    continue

                copia = dict(
                    atleta
                )

                if copia.get(
                    "id"
                ) is None:

                    copia[
                        "id"
                    ] = atleta_id

                lista.append(
                    copia
                )

            if lista:

                return lista

    return []


# ======================================================
# HISTÓRICO REAL DA RODADA
# ======================================================

def caminhos_rodada(
    rodada
):

    return [

        (
            PASTA_HISTORICO /
            f"rodada-{rodada:02d}" /
            "jogadores.json"
        ),

        (
            PASTA_HISTORICO /
            f"rodada-{rodada:02d}.json"
        ),

        (
            PASTA_API /
            f"rodada-{rodada:02d}" /
            "jogadores.json"
        ),

        (
            PASTA_API /
            f"rodada-{rodada:02d}" /
            "pontuados.json"
        )

    ]


def carregar_jogadores_reais(
    rodada
):

    for caminho in caminhos_rodada(
        rodada
    ):

        dados = carregar_json(
            caminho
        )

        jogadores = extrair_lista_jogadores(
            dados
        )

        if jogadores:

            return jogadores

    return []


# ======================================================
# INDEXAÇÃO DOS RESULTADOS REAIS
# ======================================================

def indexar_reais(
    jogadores
):

    indice = {}

    for jogador in jogadores:

        jogador_id = obter_id(
            jogador
        )

        indice[
            jogador_id
        ] = {

            "id":
                jogador_id,

            "nome":
                obter_nome(
                    jogador
                ),

            "posicao":
                obter_posicao(
                    jogador
                ),

            "pontos":
                obter_pontuacao_real(
                    jogador
                )

        }

    return indice


# ======================================================
# MELHORES REAIS POR POSIÇÃO
# ======================================================

def ranking_real_por_posicao(
    jogadores_reais
):

    ranking = {

        posicao: []

        for posicao
        in POSICOES

    }

    for jogador in jogadores_reais:

        posicao = obter_posicao(
            jogador
        )

        if posicao not in ranking:
            continue

        ranking[
            posicao
        ].append({

            "id":
                obter_id(
                    jogador
                ),

            "nome":
                obter_nome(
                    jogador
                ),

            "pontos":
                obter_pontuacao_real(
                    jogador
                )

        })

    for posicao in ranking:

        ranking[
            posicao
        ].sort(

            key=lambda jogador:
                jogador[
                    "pontos"
                ],

            reverse=True

        )

    return ranking


# ======================================================
# ERROS INDIVIDUAIS
# ======================================================

def analisar_jogador(
    jogador
):

    projecao = numero(

        jogador.get(
            "projecao"
        ),

        0

    )

    real = numero(

        jogador.get(
            "pontos"
        ),

        0

    )

    erro = (
        projecao -
        real
    )

    erro_absoluto = abs(
        erro
    )

    return {

        "id":
            jogador.get(
                "id"
            ),

        "nome":
            jogador.get(
                "nome"
            ),

        "posicao":
            jogador.get(
                "posicao"
            ),

        "projecao":
            arredondar(
                projecao
            ),

        "real":
            arredondar(
                real
            ),

        "erro":
            arredondar(
                erro
            ),

        "erroAbsoluto":
            arredondar(
                erro_absoluto
            ),

        "superestimado":
            erro > 0,

        "subestimado":
            erro < 0,

        "capitao":
            bool(
                jogador.get(
                    "capitao",
                    False
                )
            )

    }


# ======================================================
# ACERTO DOS MELHORES POR POSIÇÃO
# ======================================================

def calcular_top_posicao(
    jogadores_escalados,
    ranking_real
):

    resultado = {}

    for posicao in POSICOES:

        escolhidos = [

            jogador

            for jogador
            in jogadores_escalados

            if jogador.get(
                "posicao"
            ) == posicao

        ]

        quantidade = len(
            escolhidos
        )

        if quantidade == 0:

            resultado[
                posicao
            ] = {

                "escalados": 0,

                "acertosTopReal": 0,

                "taxaAcerto": 0

            }

            continue

        melhores_reais = (
            ranking_real
            .get(
                posicao,
                []
            )[
                :quantidade
            ]
        )

        ids_melhores = {

            str(
                jogador[
                    "id"
                ]
            )

            for jogador
            in melhores_reais

        }

        acertos = sum(

            1

            for jogador
            in escolhidos

            if str(
                jogador.get(
                    "id"
                )
            ) in ids_melhores

        )

        taxa = (

            (
                acertos /
                quantidade
            ) * 100

            if quantidade
            else 0

        )

        resultado[
            posicao
        ] = {

            "escalados":
                quantidade,

            "acertosTopReal":
                acertos,

            "taxaAcerto":
                arredondar(
                    taxa
                ),

            "melhoresReais": [

                {

                    "id":
                        jogador[
                            "id"
                        ],

                    "nome":
                        jogador[
                            "nome"
                        ],

                    "pontos":
                        arredondar(
                            jogador[
                                "pontos"
                            ]
                        )

                }

                for jogador
                in melhores_reais

            ]

        }

    return resultado


# ======================================================
# ANÁLISE DO CAPITÃO
# ======================================================

def analisar_capitao(
    estrategia
):

    jogadores = estrategia.get(
        "jogadores",
        []
    )

    candidatos = [

        jogador

        for jogador
        in jogadores

        if jogador.get(
            "posicao"
        ) != "TEC"

    ]

    capitao = None

    for jogador in candidatos:

        if jogador.get(
            "capitao"
        ):

            capitao = jogador

            break

    if not capitao:

        return {

            "encontrado":
                False,

            "acertouMelhorDoTime":
                False

        }

    melhor_real = None

    if candidatos:

        melhor_real = max(

            candidatos,

            key=lambda jogador:
                numero(
                    jogador.get(
                        "pontos"
                    ),
                    0
                )

        )

    pontos_capitao = numero(

        capitao.get(
            "pontos"
        ),

        0

    )

    pontos_melhor = (

        numero(
            melhor_real.get(
                "pontos"
            ),
            0
        )

        if melhor_real

        else 0

    )

    acertou = (

        melhor_real is not None

        and str(
            capitao.get(
                "id"
            )
        ) == str(
            melhor_real.get(
                "id"
            )
        )

    )

    return {

        "encontrado":
            True,

        "id":
            capitao.get(
                "id"
            ),

        "nome":
            capitao.get(
                "nome"
            ),

        "posicao":
            capitao.get(
                "posicao"
            ),

        "projecao":
            arredondar(

                capitao.get(
                    "projecao"
                )

            ),

        "pontos":
            arredondar(
                pontos_capitao
            ),

        "melhorJogadorRealDoTime": {

            "id":

                (
                    melhor_real.get(
                        "id"
                    )

                    if melhor_real

                    else None
                ),

            "nome":

                (
                    melhor_real.get(
                        "nome"
                    )

                    if melhor_real

                    else None
                ),

            "pontos":

                arredondar(
                    pontos_melhor
                )

        },

        "acertouMelhorDoTime":
            acertou,

        "pontosPerdidosCapitao":
            arredondar(

                max(
                    0,
                    pontos_melhor -
                    pontos_capitao
                )

            )

    }


# ======================================================
# ANÁLISE DE UMA ESTRATÉGIA
# ======================================================

def analisar_estrategia(
    estrategia,
    ranking_real
):

    jogadores = estrategia.get(
        "jogadores",
        []
    )

    analises_jogadores = [

        analisar_jogador(
            jogador
        )

        for jogador
        in jogadores

    ]

    erros_absolutos = [

        jogador[
            "erroAbsoluto"
        ]

        for jogador
        in analises_jogadores

    ]

    erros = [

        jogador[
            "erro"
        ]

        for jogador
        in analises_jogadores

    ]

    projecao_sem_capitao = sum(

        numero(
            jogador.get(
                "projecao"
            ),
            0
        )

        for jogador
        in jogadores

    )

    projecao_capitao = sum(

        numero(
            jogador.get(
                "projecao"
            ),
            0
        )

        for jogador
        in jogadores

        if jogador.get(
            "capitao"
        )

    )

    projecao_total = (
        projecao_sem_capitao +
        projecao_capitao
    )

    pontos_reais = numero(

        estrategia.get(
            "pontos"
        ),

        0

    )

    erro_time = (
        projecao_total -
        pontos_reais
    )

    return {

        "id":
            estrategia.get(
                "id"
            ),

        "nome":
            estrategia.get(
                "nome"
            ),

        "formacao":
            estrategia.get(
                "formacao"
            ),

        "escalaçãoCompleta":
            estrategia.get(
                "escalaçãoCompleta",
                False
            ),

        "quantidadeJogadores":
            len(
                jogadores
            ),

        "projecaoSemCapitao":
            arredondar(
                projecao_sem_capitao
            ),

        "projecaoBonusCapitao":
            arredondar(
                projecao_capitao
            ),

        "projecaoTotal":
            arredondar(
                projecao_total
            ),

        "pontuacaoReal":
            arredondar(
                pontos_reais
            ),

        "erroTime":
            arredondar(
                erro_time
            ),

        "erroAbsolutoTime":
            arredondar(
                abs(
                    erro_time
                )
            ),

        "maeJogadores":
            arredondar(

                media_segura(
                    erros_absolutos
                )

            ),

        "viesProjecao":
            arredondar(

                media_segura(
                    erros
                )

            ),

        "capitao":
            analisar_capitao(
                estrategia
            ),

        "topRealPorPosicao":
            calcular_top_posicao(
                jogadores,
                ranking_real
            ),

        "jogadores":
            analises_jogadores

    }


# ======================================================
# RESUMO POR POSIÇÃO
# ======================================================

def resumir_por_posicao(
    analises_rodadas
):

    acumulado = {

        posicao: {

            "errosAbsolutos":
                [],

            "erros":
                [],

            "projecoes":
                [],

            "reais":
                [],

            "acertosTop":
                0,

            "totalEscaladosTop":
                0

        }

        for posicao
        in POSICOES

    }

    for rodada in analises_rodadas:

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            for jogador in estrategia.get(
                "jogadores",
                []
            ):

                posicao = jogador.get(
                    "posicao"
                )

                if posicao not in acumulado:
                    continue

                acumulado[
                    posicao
                ][
                    "errosAbsolutos"
                ].append(

                    numero(
                        jogador.get(
                            "erroAbsoluto"
                        ),
                        0
                    )

                )

                acumulado[
                    posicao
                ][
                    "erros"
                ].append(

                    numero(
                        jogador.get(
                            "erro"
                        ),
                        0
                    )

                )

                acumulado[
                    posicao
                ][
                    "projecoes"
                ].append(

                    numero(
                        jogador.get(
                            "projecao"
                        ),
                        0
                    )

                )

                acumulado[
                    posicao
                ][
                    "reais"
                ].append(

                    numero(
                        jogador.get(
                            "real"
                        ),
                        0
                    )

                )

            top_posicoes = estrategia.get(
                "topRealPorPosicao",
                {}
            )

            for posicao in POSICOES:

                dados_top = top_posicoes.get(
                    posicao,
                    {}
                )

                acumulado[
                    posicao
                ][
                    "acertosTop"
                ] += inteiro(

                    dados_top.get(
                        "acertosTopReal"
                    ),

                    0

                )

                acumulado[
                    posicao
                ][
                    "totalEscaladosTop"
                ] += inteiro(

                    dados_top.get(
                        "escalados"
                    ),

                    0

                )

    resumo = {}

    for posicao in POSICOES:

        dados = acumulado[
            posicao
        ]

        total_top = dados[
            "totalEscaladosTop"
        ]

        taxa_top = (

            (
                dados[
                    "acertosTop"
                ] /
                total_top
            ) * 100

            if total_top

            else 0

        )

        resumo[
            posicao
        ] = {

            "amostras":
                len(
                    dados[
                        "errosAbsolutos"
                    ]
                ),

            "mae":
                arredondar(

                    media_segura(
                        dados[
                            "errosAbsolutos"
                        ]
                    )

                ),

            "vies":
                arredondar(

                    media_segura(
                        dados[
                            "erros"
                        ]
                    )

                ),

            "mediaProjecao":
                arredondar(

                    media_segura(
                        dados[
                            "projecoes"
                        ]
                    )

                ),

            "mediaReal":
                arredondar(

                    media_segura(
                        dados[
                            "reais"
                        ]
                    )

                ),

            "acertosTopReal":
                dados[
                    "acertosTop"
                ],

            "totalEscalados":
                total_top,

            "taxaAcertoTopReal":
                arredondar(
                    taxa_top
                )

        }

    return resumo


# ======================================================
# RESUMO DE UMA ESTRATÉGIA
# ======================================================

def resumir_estrategia(
    nome,
    resultados
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
            item[
                "pontuacaoReal"
            ],
            0
        )

        for item
        in resultados

    ]

    projecoes = [

        numero(
            item[
                "projecaoTotal"
            ],
            0
        )

        for item
        in resultados

    ]

    erros_times = [

        numero(
            item[
                "erroAbsolutoTime"
            ],
            0
        )

        for item
        in resultados

    ]

    maes_jogadores = [

        numero(
            item[
                "maeJogadores"
            ],
            0
        )

        for item
        in resultados

    ]

    vieses = [

        numero(
            item[
                "viesProjecao"
            ],
            0
        )

        for item
        in resultados

    ]

    capitaes = [

        item.get(
            "capitao",
            {}
        )

        for item
        in resultados

        if item.get(
            "capitao",
            {}
        ).get(
            "encontrado"
        )

    ]

    acertos_capitao = sum(

        1

        for capitao
        in capitaes

        if capitao.get(
            "acertouMelhorDoTime"
        )

    )

    pontos_perdidos_capitao = [

        numero(
            capitao.get(
                "pontosPerdidosCapitao"
            ),
            0
        )

        for capitao
        in capitaes

    ]

    melhor = max(

        resultados,

        key=lambda item:
            item[
                "pontuacaoReal"
            ]

    )

    pior = min(

        resultados,

        key=lambda item:
            item[
                "pontuacaoReal"
            ]

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

        "volatilidadePontos":
            arredondar(
                desvio_seguro(
                    pontos
                )
            ),

        "mediaProjecao":
            arredondar(
                media_segura(
                    projecoes
                )
            ),

        "maeTimes":
            arredondar(
                media_segura(
                    erros_times
                )
            ),

        "maeJogadores":
            arredondar(
                media_segura(
                    maes_jogadores
                )
            ),

        "viesMedio":
            arredondar(
                media_segura(
                    vieses
                )
            ),

        "capitao": {

            "rodadasAvaliadas":
                len(
                    capitaes
                ),

            "acertosMelhorDoTime":
                acertos_capitao,

            "taxaAcerto":
                arredondar(

                    (
                        acertos_capitao /
                        len(
                            capitaes
                        )
                    ) * 100

                    if capitaes

                    else 0

                ),

            "mediaPontosPerdidos":
                arredondar(

                    media_segura(
                        pontos_perdidos_capitao
                    )

                )

        },

        "melhorRodada": {

            "rodada":
                melhor[
                    "rodada"
                ],

            "pontos":
                arredondar(
                    melhor[
                        "pontuacaoReal"
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
                        "pontuacaoReal"
                    ]
                )

        }

    }


# ======================================================
# RESUMO GLOBAL
# ======================================================

def gerar_resumo_estrategias(
    analises_rodadas,
    excluir_cold_start=False
):

    estrategias = {}

    for rodada in analises_rodadas:

        numero_rodada = rodada.get(
            "rodada"
        )

        if (
            excluir_cold_start

            and numero_rodada ==
            RODADA_COLD_START
        ):

            continue

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

            copia = dict(
                estrategia
            )

            copia[
                "rodada"
            ] = numero_rodada

            estrategias[
                nome
            ].append(
                copia
            )

    resumo = [

        resumir_estrategia(
            nome,
            resultados
        )

        for nome, resultados
        in estrategias.items()

    ]

    resumo.sort(

        key=lambda item: (

            item.get(
                "pontosTotal",
                0
            ),

            item.get(
                "mediaPontos",
                0
            )

        ),

        reverse=True

    )

    for indice, item in enumerate(
        resumo,
        start=1
    ):

        item[
            "posicao"
        ] = indice

    return resumo


# ======================================================
# MELHOR ESTRATÉGIA POR RODADA
# ======================================================

def analisar_vencedores_rodada(
    analises_rodadas
):

    resultado = []

    for rodada in analises_rodadas:

        estrategias = rodada.get(
            "estrategias",
            []
        )

        if not estrategias:
            continue

        melhor_pontuacao = max(

            numero(
                estrategia.get(
                    "pontuacaoReal"
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
                    "pontuacaoReal"
                ),
                0
            ) == melhor_pontuacao

        ]

        resultado.append({

            "rodada":
                rodada.get(
                    "rodada"
                ),

            "historicoDisponivel":
                rodada.get(
                    "dadosUtilizadosAteRodada"
                ),

            "vencedores":
                vencedores,

            "melhorPontuacao":
                arredondar(
                    melhor_pontuacao
                )

        })

    return resultado


# ======================================================
# EVOLUÇÃO CONFORME HISTÓRICO
# ======================================================

def classificar_faixa_historico(
    rodadas_anteriores
):

    valor = inteiro(
        rodadas_anteriores,
        0
    )

    if valor <= 3:

        return "01-03"

    if valor <= 7:

        return "04-07"

    if valor <= 12:

        return "08-12"

    return "13+"


def analisar_evolucao_historico(
    analises_rodadas
):

    faixas = {

        "01-03": {},

        "04-07": {},

        "08-12": {},

        "13+": {}

    }

    for rodada in analises_rodadas:

        faixa = (
            classificar_faixa_historico(

                rodada.get(
                    "dadosUtilizadosAteRodada"
                )

            )
        )

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if nome not in faixas[
                faixa
            ]:

                faixas[
                    faixa
                ][
                    nome
                ] = {

                    "pontos":
                        [],

                    "maeTimes":
                        [],

                    "maeJogadores":
                        []

                }

            dados = faixas[
                faixa
            ][
                nome
            ]

            dados[
                "pontos"
            ].append(

                numero(
                    estrategia.get(
                        "pontuacaoReal"
                    ),
                    0
                )

            )

            dados[
                "maeTimes"
            ].append(

                numero(
                    estrategia.get(
                        "erroAbsolutoTime"
                    ),
                    0
                )

            )

            dados[
                "maeJogadores"
            ].append(

                numero(
                    estrategia.get(
                        "maeJogadores"
                    ),
                    0
                )

            )

    resultado = {}

    for faixa, estrategias in (
        faixas.items()
    ):

        resultado[
            faixa
        ] = []

        for nome, dados in (
            estrategias.items()
        ):

            resultado[
                faixa
            ].append({

                "nome":
                    nome,

                "rodadas":
                    len(
                        dados[
                            "pontos"
                        ]
                    ),

                "mediaPontos":
                    arredondar(

                        media_segura(
                            dados[
                                "pontos"
                            ]
                        )

                    ),

                "maeTimes":
                    arredondar(

                        media_segura(
                            dados[
                                "maeTimes"
                            ]
                        )

                    ),

                "maeJogadores":
                    arredondar(

                        media_segura(
                            dados[
                                "maeJogadores"
                            ]
                        )

                    )

            })

        resultado[
            faixa
        ].sort(

            key=lambda item:
                item[
                    "mediaPontos"
                ],

            reverse=True

        )

    return resultado


# ======================================================
# DIAGNÓSTICO AUTOMÁTICO
# ======================================================

def gerar_diagnosticos(
    resumo_completo,
    resumo_sem_cold_start,
    resumo_posicao
):

    diagnosticos = []

    if resumo_completo:

        melhor = resumo_completo[
            0
        ]

        diagnosticos.append({

            "tipo":
                "melhor_estrategia_geral",

            "mensagem":
                (
                    f"{melhor['nome']} lidera "
                    f"o histórico completo com média "
                    f"de {melhor['mediaPontos']} pontos."
                )

        })

    if resumo_sem_cold_start:

        melhor = resumo_sem_cold_start[
            0
        ]

        diagnosticos.append({

            "tipo":
                "melhor_estrategia_sem_cold_start",

            "mensagem":
                (
                    f"Sem a rodada de cold start, "
                    f"{melhor['nome']} apresenta "
                    f"média de {melhor['mediaPontos']} pontos."
                )

        })

    posicoes_validas = [

        (
            posicao,
            dados
        )

        for posicao, dados
        in resumo_posicao.items()

        if dados.get(
            "amostras",
            0
        ) > 0

    ]

    if posicoes_validas:

        melhor_posicao = min(

            posicoes_validas,

            key=lambda item:
                item[
                    1
                ][
                    "mae"
                ]

        )

        pior_posicao = max(

            posicoes_validas,

            key=lambda item:
                item[
                    1
                ][
                    "mae"
                ]

        )

        diagnosticos.append({

            "tipo":
                "posicao_mais_previsivel",

            "mensagem":
                (
                    f"{melhor_posicao[0]} é atualmente "
                    f"a posição com menor erro médio "
                    f"de projeção: "
                    f"{melhor_posicao[1]['mae']}."
                )

        })

        diagnosticos.append({

            "tipo":
                "posicao_menos_previsivel",

            "mensagem":
                (
                    f"{pior_posicao[0]} é atualmente "
                    f"a posição com maior erro médio "
                    f"de projeção: "
                    f"{pior_posicao[1]['mae']}."
                )

        })

    return diagnosticos


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    if not simulacao:

        print(
            "Arquivo de simulação não encontrado "
            "ou vazio:"
        )

        print(
            ARQUIVO_SIMULACAO
        )

        return

    rodadas = simulacao.get(
        "rodadas",
        []
    )

    resultado_rodadas = []

    print(
        "============================================"
    )

    print(
        "ANÁLISE CIENTÍFICA DAS SIMULAÇÕES"
    )

    print(
        "============================================"
    )

    for rodada_dados in rodadas:

        rodada = inteiro(
            rodada_dados.get(
                "rodada"
            )
        )

        if rodada is None:
            continue

        jogadores_reais = (
            carregar_jogadores_reais(
                rodada
            )
        )

        ranking_real = (
            ranking_real_por_posicao(
                jogadores_reais
            )
        )

        analise_rodada = {

            "rodada":
                rodada,

            "dadosUtilizadosAteRodada":
                rodada_dados.get(
                    "dadosUtilizadosAteRodada"
                ),

            "coldStart":
                rodada ==
                RODADA_COLD_START,

            "semVazamentoFuturo":
                rodada_dados.get(
                    "semVazamentoFuturo",
                    False
                ),

            "quantidadeJogadoresReais":
                len(
                    jogadores_reais
                ),

            "estrategias":
                []

        }

        for estrategia in rodada_dados.get(
            "estrategias",
            []
        ):

            analise = analisar_estrategia(
                estrategia,
                ranking_real
            )

            analise_rodada[
                "estrategias"
            ].append(
                analise
            )

        resultado_rodadas.append(
            analise_rodada
        )

        print(
            f"[OK] Rodada {rodada:02d} "
            f"- {len(analise_rodada['estrategias'])} "
            "estratégias analisadas"
        )

    # ==================================================
    # RESUMOS
    # ==================================================

    resumo_completo = (
        gerar_resumo_estrategias(
            resultado_rodadas,
            excluir_cold_start=False
        )
    )

    resumo_sem_cold_start = (
        gerar_resumo_estrategias(
            resultado_rodadas,
            excluir_cold_start=True
        )
    )

    resumo_posicao = (
        resumir_por_posicao(
            resultado_rodadas
        )
    )

    vencedores_rodada = (
        analisar_vencedores_rodada(
            resultado_rodadas
        )
    )

    evolucao_historico = (
        analisar_evolucao_historico(
            resultado_rodadas
        )
    )

    diagnosticos = gerar_diagnosticos(

        resumo_completo,

        resumo_sem_cold_start,

        resumo_posicao

    )

    # ==================================================
    # RESULTADO FINAL
    # ==================================================

    resultado = {

        "modelo":
            "analise_simulacoes_historicas_v1",

        "descricao":
            (
                "Análise científica do desempenho "
                "histórico das estratégias de escalação"
            ),

        "fonte":
            "data/simulacao-times.json",

        "quantidadeRodadas":
            len(
                resultado_rodadas
            ),

        "rodadaColdStart":
            RODADA_COLD_START,

        "metodologia": {

            "maeJogadores":
                (
                    "Média do erro absoluto entre "
                    "projeção individual e pontuação real."
                ),

            "maeTimes":
                (
                    "Média do erro absoluto entre "
                    "pontuação projetada do time e "
                    "pontuação real."
                ),

            "vies":
                (
                    "Erro assinado médio. Valor positivo "
                    "indica tendência de superestimar; "
                    "negativo indica subestimar."
                ),

            "capitao":
                (
                    "Compara o capitão escolhido com o "
                    "jogador que mais pontuou entre os "
                    "titulares não técnicos."
                ),

            "topRealPorPosicao":
                (
                    "Compara os jogadores escalados com "
                    "os melhores pontuadores reais da "
                    "mesma posição na rodada."
                )

        },

        "resumoGeral":
            resumo_completo,

        "resumoSemColdStart":
            resumo_sem_cold_start,

        "desempenhoPorPosicao":
            resumo_posicao,

        "vencedoresPorRodada":
            vencedores_rodada,

        "evolucaoPorQuantidadeHistorico":
            evolucao_historico,

        "diagnosticos":
            diagnosticos,

        "rodadas":
            resultado_rodadas

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
        "ANÁLISE FINALIZADA"
    )

    print(
        "Rodadas analisadas:",
        len(
            resultado_rodadas
        )
    )

    print(
        ""
    )

    print(
        "===== RANKING GERAL ====="
    )

    for estrategia in resumo_completo:

        print(
            f"{estrategia['posicao']}º "
            f"{estrategia['nome']} | "
            f"Média: {estrategia['mediaPontos']} | "
            f"MAE jogadores: "
            f"{estrategia['maeJogadores']} | "
            f"MAE time: "
            f"{estrategia['maeTimes']}"
        )

    print(
        ""
    )

    print(
        "===== SEM COLD START ====="
    )

    for estrategia in (
        resumo_sem_cold_start
    ):

        print(
            f"{estrategia['posicao']}º "
            f"{estrategia['nome']} | "
            f"Média: {estrategia['mediaPontos']} | "
            f"MAE jogadores: "
            f"{estrategia['maeJogadores']}"
        )

    print(
        ""
    )

    print(
        "===== ERRO POR POSIÇÃO ====="
    )

    for posicao in POSICOES:

        dados = resumo_posicao.get(
            posicao,
            {}
        )

        print(
            f"{posicao} | "
            f"MAE: {dados.get('mae', 0)} | "
            f"Top real: "
            f"{dados.get('taxaAcertoTopReal', 0)}%"
        )

    print(
        ""
    )

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
