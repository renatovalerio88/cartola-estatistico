"""
=========================================================
CARTOLA ESTATÍSTICO
Backtest de Patrimônio

Versão:
backtest_patrimonio_v1

Objetivo:

Medir historicamente o impacto do patrimônio disponível
na qualidade das escalações do Cartola Estatístico.

Testa diferentes patrimônios:

C$ 100
C$ 110
C$ 120
C$ 130
C$ 140
C$ 150
C$ 175
C$ 200

Para cada patrimônio testa:

- Conservador
- Equilibrado
- Agressivo

Utiliza somente informações disponíveis ANTES da rodada
simulada.

Exemplo:

Rodada 10
usa dados disponíveis até a rodada 09.

Isso evita vazamento de informação futura.

Gera:

data/backtest-patrimonio.json

IMPORTANTE:

Este script NÃO:

- altera pesos;
- altera projeções oficiais;
- altera estratégias oficiais;
- altera escalações do site;
- promove automaticamente nenhuma configuração.

É apenas uma camada experimental de laboratório.

=========================================================
"""

from __future__ import annotations

import json
import math
import sys

from collections import defaultdict
from copy import deepcopy
from pathlib import Path
from statistics import mean
from typing import Any


# ======================================================
# CAMINHOS
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

PASTA_HISTORICO_ESCALACOES = (
    PASTA_DATA /
    "historico-escalacoes"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "backtest-patrimonio.json"
)


# ======================================================
# IMPORTAÇÃO DO OTIMIZADOR
# ======================================================

PASTA_PROCESSAMENTO = (
    BASE_DIR /
    "scripts" /
    "processamento"
)

if str(
    PASTA_PROCESSAMENTO
) not in sys.path:

    sys.path.insert(
        0,
        str(
            PASTA_PROCESSAMENTO
        ),
    )


try:

    import otimizar_escalacao_patrimonio as otimizador

except Exception as erro:

    print(
        "============================================"
    )

    print(
        "[ERRO] Não foi possível importar:"
    )

    print(
        "scripts/processamento/"
        "otimizar_escalacao_patrimonio.py"
    )

    print(
        "Erro:",
        erro,
    )

    print(
        "============================================"
    )

    raise


# ======================================================
# CONFIGURAÇÕES
# ======================================================

PATRIMONIOS = [
    100.0,
    110.0,
    120.0,
    130.0,
    140.0,
    150.0,
    175.0,
    200.0,
]


ESTRATEGIAS = [
    "conservador",
    "equilibrado",
    "agressivo",
]


RODADA_INICIAL = 2


# ======================================================
# UTILIDADES
# ======================================================

def numero(
    valor: Any,
    padrao: float = 0.0,
) -> float:

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
    valor: Any,
    casas: int = 2,
) -> float:

    return round(
        numero(
            valor
        ),
        casas,
    )


def carregar_json(
    caminho: Path,
):

    if not caminho.exists():

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
            "[AVISO] Falha ao carregar:",
            caminho,
        )

        print(
            "        ",
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


def obter_numero_rodada(
    nome: str,
):

    try:

        return int(
            nome.replace(
                "rodada-",
                "",
            )
        )

    except Exception:

        return None


# ======================================================
# RODADAS DISPONÍVEIS
# ======================================================

def descobrir_rodadas():

    rodadas = set()

    for pasta_base in [
        PASTA_API,
        PASTA_HISTORICO,
    ]:

        if not pasta_base.exists():
            continue

        for pasta in pasta_base.glob(
            "rodada-*"
        ):

            if not pasta.is_dir():
                continue

            rodada = obter_numero_rodada(
                pasta.name
            )

            if rodada is None:
                continue

            if rodada >= RODADA_INICIAL:

                rodadas.add(
                    rodada
                )

    return sorted(
        rodadas
    )


# ======================================================
# NORMALIZAÇÃO DE LISTAS
# ======================================================

def extrair_lista_jogadores(
    dados,
):

    if isinstance(
        dados,
        list,
    ):

        return dados

    if isinstance(
        dados,
        dict,
    ):

        for chave in [
            "jogadores",
            "atletas",
            "pontuados",
            "ranking",
        ]:

            valor = dados.get(
                chave
            )

            if isinstance(
                valor,
                list,
            ):

                return valor

    return []


# ======================================================
# IDENTIFICAÇÃO DO JOGADOR
# ======================================================

def obter_id(
    jogador,
):

    return (
        jogador.get("id")
        or jogador.get("atletaId")
        or jogador.get("atleta_id")
    )


def obter_posicao(
    jogador,
):

    valor = (
        jogador.get("posicao")
        or jogador.get("posicaoAbreviacao")
        or jogador.get("posicao_abreviacao")
        or ""
    )

    return (
        str(valor)
        .strip()
        .upper()
    )


# ======================================================
# PONTUAÇÃO REAL
# ======================================================

def obter_pontuacao_real(
    jogador,
):

    campos = [
        "pontuacaoReal",
        "pontos",
        "pontuacao",
        "real",
    ]

    for campo in campos:

        valor = jogador.get(
            campo
        )

        if valor is None:
            continue

        try:

            convertido = float(
                valor
            )

            if math.isfinite(
                convertido
            ):

                return convertido

        except Exception:
            pass

    return None


# ======================================================
# CARREGAMENTO DA RODADA REAL
# ======================================================

def caminhos_jogadores_rodada(
    rodada,
):

    return [

        (
            PASTA_API /
            f"rodada-{rodada:02d}" /
            "jogadores.json"
        ),

        (
            PASTA_HISTORICO /
            f"rodada-{rodada:02d}" /
            "jogadores.json"
        ),

    ]


def carregar_resultado_real(
    rodada,
):

    for caminho in caminhos_jogadores_rodada(
        rodada
    ):

        dados = carregar_json(
            caminho
        )

        jogadores = extrair_lista_jogadores(
            dados
        )

        if not jogadores:
            continue

        resultado = {}

        for jogador in jogadores:

            if not isinstance(
                jogador,
                dict,
            ):
                continue

            jogador_id = obter_id(
                jogador
            )

            if jogador_id is None:
                continue

            pontos = obter_pontuacao_real(
                jogador
            )

            if pontos is None:
                continue

            resultado[
                str(jogador_id)
            ] = pontos

        if resultado:

            return resultado

    return {}


# ======================================================
# ARQUIVOS HISTÓRICOS DE ESCALAÇÃO
# ======================================================

def pasta_escalacao_rodada(
    rodada,
):

    return (
        PASTA_HISTORICO_ESCALACOES /
        f"rodada-{rodada:02d}"
    )


def carregar_arquivo_estrategia(
    rodada,
    estrategia,
):

    pasta = pasta_escalacao_rodada(
        rodada
    )

    candidatos = [

        pasta /
        f"{estrategia}.json",

        pasta /
        f"{estrategia.capitalize()}.json",

    ]

    for arquivo in candidatos:

        dados = carregar_json(
            arquivo
        )

        if isinstance(
            dados,
            dict,
        ):

            return dados

    return None


# ======================================================
# EXTRAÇÃO DE JOGADORES HISTÓRICOS
# ======================================================

def extrair_titulares(
    dados,
):

    if not isinstance(
        dados,
        dict,
    ):

        return []

    for chave in [
        "titulares",
        "jogadores",
        "time",
    ]:

        valor = dados.get(
            chave
        )

        if isinstance(
            valor,
            list,
        ):

            return valor

    escalacao = dados.get(
        "escalacao"
    )

    if isinstance(
        escalacao,
        dict,
    ):

        for chave in [
            "titulares",
            "jogadores",
        ]:

            valor = escalacao.get(
                chave
            )

            if isinstance(
                valor,
                list,
            ):

                return valor

    return []


# ======================================================
# BASE DE CANDIDATOS DA RODADA
# ======================================================

def carregar_candidatos_historicos(
    rodada,
):

    """
    A rodada histórica gerada pelo nosso pipeline já foi
    construída utilizando dados somente até R-1.

    Portanto ela é a fonte preferencial para reconstruir
    o universo de candidatos sem introduzir informação
    posterior à rodada simulada.
    """

    candidatos = {}

    for estrategia in ESTRATEGIAS:

        dados = carregar_arquivo_estrategia(
            rodada,
            estrategia,
        )

        titulares = extrair_titulares(
            dados
        )

        for jogador in titulares:

            if not isinstance(
                jogador,
                dict,
            ):
                continue

            jogador_id = obter_id(
                jogador
            )

            if jogador_id is None:
                continue

            chave = str(
                jogador_id
            )

            if chave not in candidatos:

                candidatos[
                    chave
                ] = deepcopy(
                    jogador
                )

            else:

                # Complementa campos eventualmente
                # presentes em outra estratégia.

                atual = candidatos[
                    chave
                ]

                for campo, valor in (
                    jogador.items()
                ):

                    if (
                        campo not in atual
                        or atual.get(
                            campo
                        ) is None
                    ):

                        atual[
                            campo
                        ] = valor

    return list(
        candidatos.values()
    )


# ======================================================
# FALLBACK DA BASE HISTÓRICA
# ======================================================

def carregar_base_anterior(
    rodada,
):

    """
    Plano B.

    Caso o histórico de escalações não forneça candidatos
    suficientes, utiliza jogadores da rodada anterior.

    Isso mantém a regra temporal:

    projeção da rodada R
    utiliza dados disponíveis até R-1.
    """

    rodada_base = (
        rodada - 1
    )

    caminhos = [

        (
            PASTA_API /
            f"rodada-{rodada_base:02d}" /
            "jogadores.json"
        ),

        (
            PASTA_HISTORICO /
            f"rodada-{rodada_base:02d}" /
            "jogadores.json"
        ),

    ]

    for caminho in caminhos:

        dados = carregar_json(
            caminho
        )

        jogadores = extrair_lista_jogadores(
            dados
        )

        if jogadores:

            return [
                deepcopy(
                    jogador
                )
                for jogador in jogadores
                if isinstance(
                    jogador,
                    dict,
                )
            ]

    return []


# ======================================================
# COMPLEMENTAÇÃO DOS CANDIDATOS
# ======================================================

def combinar_candidatos(
    principais,
    fallback,
):

    mapa = {}

    for jogador in (
        principais +
        fallback
    ):

        if not isinstance(
            jogador,
            dict,
        ):
            continue

        jogador_id = obter_id(
            jogador
        )

        if jogador_id is None:
            continue

        chave = str(
            jogador_id
        )

        if chave not in mapa:

            mapa[
                chave
            ] = deepcopy(
                jogador
            )

            continue

        atual = mapa[
            chave
        ]

        for campo, valor in (
            jogador.items()
        ):

            if (
                campo not in atual
                or atual.get(
                    campo
                ) is None
            ):

                atual[
                    campo
                ] = valor

    return list(
        mapa.values()
    )


# ======================================================
# PREPARAÇÃO PARA O OTIMIZADOR
# ======================================================

def preparar_jogadores_rodada(
    rodada,
):

    historicos = (
        carregar_candidatos_historicos(
            rodada
        )
    )

    fallback = carregar_base_anterior(
        rodada
    )

    jogadores = combinar_candidatos(
        historicos,
        fallback,
    )

    return jogadores


# ======================================================
# PONTUAÇÃO DA ESCALAÇÃO
# ======================================================

def calcular_pontuacao_real_time(
    resultado,
    pontuacoes_reais,
):

    if not isinstance(
        resultado,
        dict,
    ):

        return None

    titulares = resultado.get(
        "titulares",
        [],
    )

    if not isinstance(
        titulares,
        list,
    ):

        return None

    if len(
        titulares
    ) != 12:

        return None

    pontos = 0.0

    encontrados = 0

    atletas_encontrados = 0

    atletas_esperados = 0

    tecnico_encontrado = False

    tecnico_esperado = False

    for jogador in titulares:

        if not isinstance(
            jogador,
            dict,
        ):
            continue

        jogador_id = jogador.get(
            "id"
        )

        if jogador_id is None:
            continue

        posicao = (
            str(
                jogador.get(
                    "posicao",
                    ""
                )
            )
            .strip()
            .upper()
        )

        if posicao == "TEC":

            tecnico_esperado = True

        else:

            atletas_esperados += 1

        chave = str(
            jogador_id
        )

        if chave not in (
            pontuacoes_reais
        ):

            continue

        pontos += numero(
            pontuacoes_reais[
                chave
            ]
        )

        encontrados += 1

        if posicao == "TEC":

            tecnico_encontrado = True

        else:

            atletas_encontrados += 1

    cobertura = (
        encontrados /
        len(titulares) *
        100
        if titulares
        else 0
    )

    cobertura_atletas = (
        atletas_encontrados /
        atletas_esperados *
        100
        if atletas_esperados
        else 0
    )

    return {

        "pontuacaoReal":
            arredondar(
                pontos
            ),

        "jogadoresEncontrados":
            encontrados,

        "jogadoresEsperados":
            len(
                titulares
            ),

        "cobertura":
            arredondar(
                cobertura
            ),

        "atletasEncontrados":
            atletas_encontrados,

        "atletasEsperados":
            atletas_esperados,

        "coberturaAtletas":
            arredondar(
                cobertura_atletas
            ),

        "tecnicoEsperado":
            tecnico_esperado,

        "tecnicoEncontrado":
            tecnico_encontrado,

    }


# ======================================================
# ESCALAÇÃO PARA UM PATRIMÔNIO
# ======================================================

def otimizar_rodada(
    jogadores,
    estrategia,
    patrimonio,
):

    resultado = (
        otimizador.otimizar_estrategia(
            jogadores,
            estrategia,
            patrimonio,
            formacao_forcada=None,
        )
    )

    if resultado is None:

        return None

    auditoria = (
        otimizador.auditar_escalacao(
            resultado
        )
    )

    resultado[
        "auditoria"
    ] = auditoria

    return resultado


# ======================================================
# RESUMO POR PATRIMÔNIO
# ======================================================

def gerar_resumo_patrimonios(
    rodadas,
):

    acumulado = {}

    for patrimonio in PATRIMONIOS:

        chave_patrimonio = (
            f"{patrimonio:.2f}"
        )

        acumulado[
            chave_patrimonio
        ] = {}

        for estrategia in ESTRATEGIAS:

            acumulado[
                chave_patrimonio
            ][
                estrategia
            ] = {

                "pontuacoes":
                    [],

                "custos":
                    [],

                "saldos":
                    [],

                "projecoes":
                    [],

                "coberturas":
                    [],

                "rodadasGeradas":
                    0,

                "rodadasAprovadas":
                    0,

            }

    for rodada in rodadas:

        testes = rodada.get(
            "testes",
            {}
        )

        for chave_patrimonio, dados_patrimonio in (
            testes.items()
        ):

            if chave_patrimonio not in (
                acumulado
            ):

                continue

            estrategias = (
                dados_patrimonio.get(
                    "estrategias",
                    {}
                )
            )

            for estrategia, dados in (
                estrategias.items()
            ):

                if estrategia not in (
                    acumulado[
                        chave_patrimonio
                    ]
                ):

                    continue

                destino = (
                    acumulado[
                        chave_patrimonio
                    ][
                        estrategia
                    ]
                )

                destino[
                    "rodadasGeradas"
                ] += 1

                auditoria = dados.get(
                    "auditoria",
                    {}
                )

                if auditoria.get(
                    "aprovada"
                ):

                    destino[
                        "rodadasAprovadas"
                    ] += 1

                real = dados.get(
                    "resultadoReal",
                    {}
                )

                pontuacao = real.get(
                    "pontuacaoReal"
                )

                if pontuacao is not None:

                    destino[
                        "pontuacoes"
                    ].append(
                        numero(
                            pontuacao
                        )
                    )

                custo = dados.get(
                    "custo"
                )

                if custo is not None:

                    destino[
                        "custos"
                    ].append(
                        numero(
                            custo
                        )
                    )

                saldo = dados.get(
                    "saldo"
                )

                if saldo is not None:

                    destino[
                        "saldos"
                    ].append(
                        numero(
                            saldo
                        )
                    )

                projecao = dados.get(
                    "projecao"
                )

                if projecao is not None:

                    destino[
                        "projecoes"
                    ].append(
                        numero(
                            projecao
                        )
                    )

                cobertura = real.get(
                    "cobertura"
                )

                if cobertura is not None:

                    destino[
                        "coberturas"
                    ].append(
                        numero(
                            cobertura
                        )
                    )

    resumo = {}

    for chave_patrimonio, estrategias in (
        acumulado.items()
    ):

        resumo[
            chave_patrimonio
        ] = {

            "patrimonio":
                numero(
                    chave_patrimonio
                ),

            "estrategias": {},

        }

        for estrategia, dados in (
            estrategias.items()
        ):

            pontuacoes = dados[
                "pontuacoes"
            ]

            custos = dados[
                "custos"
            ]

            saldos = dados[
                "saldos"
            ]

            projecoes = dados[
                "projecoes"
            ]

            coberturas = dados[
                "coberturas"
            ]

            resumo[
                chave_patrimonio
            ][
                "estrategias"
            ][
                estrategia
            ] = {

                "rodadasGeradas":
                    dados[
                        "rodadasGeradas"
                    ],

                "rodadasAprovadas":
                    dados[
                        "rodadasAprovadas"
                    ],

                "pontuacaoTotal":
                    arredondar(
                        sum(
                            pontuacoes
                        )
                    ),

                "pontuacaoMedia":
                    arredondar(
                        mean(
                            pontuacoes
                        )
                        if pontuacoes
                        else 0
                    ),

                "melhorRodada":
                    arredondar(
                        max(
                            pontuacoes
                        )
                        if pontuacoes
                        else 0
                    ),

                "piorRodada":
                    arredondar(
                        min(
                            pontuacoes
                        )
                        if pontuacoes
                        else 0
                    ),

                "custoMedio":
                    arredondar(
                        mean(
                            custos
                        )
                        if custos
                        else 0
                    ),

                "saldoMedio":
                    arredondar(
                        mean(
                            saldos
                        )
                        if saldos
                        else 0
                    ),

                "projecaoMedia":
                    arredondar(
                        mean(
                            projecoes
                        )
                        if projecoes
                        else 0
                    ),

                "coberturaMedia":
                    arredondar(
                        mean(
                            coberturas
                        )
                        if coberturas
                        else 0
                    ),

            }

    return resumo


# ======================================================
# RANKING GERAL
# ======================================================

def gerar_ranking(
    resumo,
):

    ranking = []

    for (
        chave_patrimonio,
        dados_patrimonio
    ) in resumo.items():

        patrimonio = numero(
            dados_patrimonio.get(
                "patrimonio"
            )
        )

        estrategias = (
            dados_patrimonio.get(
                "estrategias",
                {}
            )
        )

        for estrategia, dados in (
            estrategias.items()
        ):

            ranking.append({

                "patrimonio":
                    patrimonio,

                "estrategia":
                    estrategia,

                "pontuacaoMedia":
                    numero(
                        dados.get(
                            "pontuacaoMedia"
                        )
                    ),

                "pontuacaoTotal":
                    numero(
                        dados.get(
                            "pontuacaoTotal"
                        )
                    ),

                "custoMedio":
                    numero(
                        dados.get(
                            "custoMedio"
                        )
                    ),

                "saldoMedio":
                    numero(
                        dados.get(
                            "saldoMedio"
                        )
                    ),

                "coberturaMedia":
                    numero(
                        dados.get(
                            "coberturaMedia"
                        )
                    ),

                "rodadasAprovadas":
                    int(
                        numero(
                            dados.get(
                                "rodadasAprovadas"
                            )
                        )
                    ),

            })

    ranking.sort(

        key=lambda item: (

            item[
                "pontuacaoMedia"
            ],

            item[
                "pontuacaoTotal"
            ],

            -item[
                "patrimonio"
            ],

        ),

        reverse=True,

    )

    for indice, item in enumerate(
        ranking,
        start=1,
    ):

        item[
            "posicao"
        ] = indice

    return ranking


# ======================================================
# GANHO MARGINAL DE PATRIMÔNIO
# ======================================================

def calcular_ganho_marginal(
    resumo,
):

    resultado = {}

    for estrategia in ESTRATEGIAS:

        serie = []

        for patrimonio in PATRIMONIOS:

            chave = (
                f"{patrimonio:.2f}"
            )

            dados = (
                resumo
                .get(
                    chave,
                    {}
                )
                .get(
                    "estrategias",
                    {}
                )
                .get(
                    estrategia,
                    {}
                )
            )

            serie.append({

                "patrimonio":
                    patrimonio,

                "pontuacaoMedia":
                    numero(
                        dados.get(
                            "pontuacaoMedia"
                        )
                    ),

            })

        comparacoes = []

        anterior = None

        for item in serie:

            atual = item[
                "pontuacaoMedia"
            ]

            if anterior is None:

                ganho = None

            else:

                diferenca_patrimonio = (
                    item[
                        "patrimonio"
                    ]
                    -
                    anterior[
                        "patrimonio"
                    ]
                )

                diferenca_pontos = (
                    atual
                    -
                    anterior[
                        "pontuacaoMedia"
                    ]
                )

                ganho = {

                    "patrimonioAdicional":
                        arredondar(
                            diferenca_patrimonio
                        ),

                    "ganhoMedioPontos":
                        arredondar(
                            diferenca_pontos
                        ),

                    "ganhoPorCartoleta":
                        arredondar(
                            (
                                diferenca_pontos /
                                diferenca_patrimonio
                            )
                            if diferenca_patrimonio
                            else 0,
                            4,
                        ),

                }

            comparacoes.append({

                "patrimonio":
                    item[
                        "patrimonio"
                    ],

                "pontuacaoMedia":
                    arredondar(
                        atual
                    ),

                "comparacaoAnterior":
                    ganho,

            })

            anterior = item

        resultado[
            estrategia
        ] = comparacoes

    return resultado


# ======================================================
# MELHOR PATRIMÔNIO POR ESTRATÉGIA
# ======================================================

def melhores_por_estrategia(
    resumo,
):

    resultado = {}

    for estrategia in ESTRATEGIAS:

        candidatos = []

        for patrimonio in PATRIMONIOS:

            chave = (
                f"{patrimonio:.2f}"
            )

            dados = (
                resumo
                .get(
                    chave,
                    {}
                )
                .get(
                    "estrategias",
                    {}
                )
                .get(
                    estrategia,
                    {}
                )
            )

            candidatos.append({

                "patrimonio":
                    patrimonio,

                "pontuacaoMedia":
                    numero(
                        dados.get(
                            "pontuacaoMedia"
                        )
                    ),

                "pontuacaoTotal":
                    numero(
                        dados.get(
                            "pontuacaoTotal"
                        )
                    ),

                "custoMedio":
                    numero(
                        dados.get(
                            "custoMedio"
                        )
                    ),

            })

        candidatos.sort(

            key=lambda item: (

                item[
                    "pontuacaoMedia"
                ],

                item[
                    "pontuacaoTotal"
                ],

                -item[
                    "patrimonio"
                ],

            ),

            reverse=True,

        )

        resultado[
            estrategia
        ] = (
            candidatos[0]
            if candidatos
            else None
        )

    return resultado


# ======================================================
# PROCESSAMENTO
# ======================================================

def executar():

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "BACKTEST DE PATRIMÔNIO V1"
    )

    print(
        "============================================"
    )

    print(
        "Patrimônios:",
        PATRIMONIOS,
    )

    print(
        "Estratégias:",
        ESTRATEGIAS,
    )

    print(
        "============================================"
    )

    rodadas = descobrir_rodadas()

    print(
        "Rodadas encontradas:",
        rodadas,
    )

    if not rodadas:

        print(
            "[ERRO] Nenhuma rodada histórica "
            "encontrada."
        )

        raise SystemExit(
            1
        )

    resultado_rodadas = []

    rodadas_processadas = []

    rodadas_ignoradas = []

    total_testes = 0

    total_aprovados = 0

    for rodada in rodadas:

        print()

        print(
            "--------------------------------------------"
        )

        print(
            f"RODADA {rodada:02d}"
        )

        print(
            "--------------------------------------------"
        )

        pontuacoes_reais = (
            carregar_resultado_real(
                rodada
            )
        )

        if not pontuacoes_reais:

            print(
                "[IGNORADA] Resultado real "
                "não encontrado."
            )

            rodadas_ignoradas.append({
                "rodada":
                    rodada,

                "motivo":
                    "resultado real não encontrado",
            })

            continue

        jogadores = (
            preparar_jogadores_rodada(
                rodada
            )
        )

        if not jogadores:

            print(
                "[IGNORADA] Base histórica "
                "de jogadores não encontrada."
            )

            rodadas_ignoradas.append({
                "rodada":
                    rodada,

                "motivo":
                    (
                        "base histórica de "
                        "jogadores não encontrada"
                    ),
            })

            continue

        print(
            "Jogadores candidatos:",
            len(
                jogadores
            ),
        )

        print(
            "Resultados reais:",
            len(
                pontuacoes_reais
            ),
        )

        dados_rodada = {

            "rodada":
                rodada,

            "dadosDisponiveisAte":
                rodada - 1,

            "quantidadeCandidatos":
                len(
                    jogadores
                ),

            "quantidadeResultadosReais":
                len(
                    pontuacoes_reais
                ),

            "testes": {},

        }

        testes_validos_rodada = 0

        for patrimonio in PATRIMONIOS:

            chave_patrimonio = (
                f"{patrimonio:.2f}"
            )

            dados_rodada[
                "testes"
            ][
                chave_patrimonio
            ] = {

                "patrimonio":
                    patrimonio,

                "estrategias": {},

            }

            for estrategia in ESTRATEGIAS:

                total_testes += 1

                resultado = otimizar_rodada(

                    deepcopy(
                        jogadores
                    ),

                    estrategia,

                    patrimonio,

                )

                if resultado is None:

                    print(
                        f"[FALHA] C$ {patrimonio:.2f} "
                        f"| {estrategia}"
                    )

                    continue

                resultado_real = (
                    calcular_pontuacao_real_time(
                        resultado,
                        pontuacoes_reais,
                    )
                )

                resultado[
                    "resultadoReal"
                ] = resultado_real

                dados_rodada[
                    "testes"
                ][
                    chave_patrimonio
                ][
                    "estrategias"
                ][
                    estrategia
                ] = resultado

                auditoria = resultado.get(
                    "auditoria",
                    {}
                )

                aprovado = bool(
                    auditoria.get(
                        "aprovada"
                    )
                )

                if aprovado:

                    total_aprovados += 1
                    testes_validos_rodada += 1

                pontuacao = (
                    resultado_real.get(
                        "pontuacaoReal"
                    )
                    if resultado_real
                    else None
                )

                cobertura = (
                    resultado_real.get(
                        "cobertura"
                    )
                    if resultado_real
                    else None
                )

                print(
                    (
                        f"[{'OK' if aprovado else 'ERRO'}] "
                        f"C$ {patrimonio:.2f} "
                        f"| {estrategia:<11} "
                        f"| Formação: "
                        f"{resultado.get('formacao', '-'):5} "
                        f"| Custo: "
                        f"{numero(resultado.get('custo')):6.2f} "
                        f"| Real: "
                        f"{numero(pontuacao):6.2f} "
                        f"| Cobertura: "
                        f"{numero(cobertura):6.2f}%"
                    )
                )

        resultado_rodadas.append(
            dados_rodada
        )

        rodadas_processadas.append(
            rodada
        )

        print(
            "Testes válidos na rodada:",
            testes_validos_rodada,
            "/",
            (
                len(PATRIMONIOS)
                *
                len(ESTRATEGIAS)
            ),
        )

    # ==================================================
    # RESUMOS
    # ==================================================

    resumo = gerar_resumo_patrimonios(
        resultado_rodadas
    )

    ranking = gerar_ranking(
        resumo
    )

    ganho_marginal = (
        calcular_ganho_marginal(
            resumo
        )
    )

    melhores = (
        melhores_por_estrategia(
            resumo
        )
    )

    cobertura_testes = (

        (
            total_aprovados /
            total_testes *
            100
        )

        if total_testes
        else 0

    )

    auditoria_global = (

        bool(
            rodadas_processadas
        )

        and

        total_aprovados > 0

    )

    saida = {

        "modelo":
            "backtest_patrimonio_v1",

        "descricao":
            (
                "Backtest experimental do impacto "
                "do patrimônio nas escalações."
            ),

        "regraTemporal":
            (
                "Rodada R utiliza somente dados "
                "disponíveis até R-1."
            ),

        "patrimonios":
            PATRIMONIOS,

        "estrategias":
            ESTRATEGIAS,

        "rodadasProcessadas":
            rodadas_processadas,

        "rodadasIgnoradas":
            rodadas_ignoradas,

        "quantidadeRodadasProcessadas":
            len(
                rodadas_processadas
            ),

        "quantidadeTestes":
            total_testes,

        "quantidadeTestesAprovados":
            total_aprovados,

        "coberturaTestes":
            arredondar(
                cobertura_testes
            ),

        "resumoPorPatrimonio":
            resumo,

        "ranking":
            ranking,

        "melhorPatrimonioPorEstrategia":
            melhores,

        "ganhoMarginal":
            ganho_marginal,

        "rodadas":
            resultado_rodadas,

        "auditoria": {

            "aprovada":
                auditoria_global,

            "rodadasProcessadas":
                len(
                    rodadas_processadas
                ),

            "testesExecutados":
                total_testes,

            "testesAprovados":
                total_aprovados,

            "coberturaTestes":
                arredondar(
                    cobertura_testes
                ),

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraPesos":
                False,

            "alteraProjecoes":
                False,

            "alteraEstrategiaOficial":
                False,

            "alteraEscalacoesSite":
                False,

            "promocaoAutomatica":
                False,

        },

    }

    salvar_json(
        ARQUIVO_SAIDA,
        saida,
    )

    # ==================================================
    # LOG FINAL
    # ==================================================

    print()

    print(
        "============================================"
    )

    print(
        "BACKTEST DE PATRIMÔNIO FINALIZADO"
    )

    print(
        "============================================"
    )

    print(
        "Rodadas processadas:",
        rodadas_processadas,
    )

    print(
        "Rodadas ignoradas:",
        [
            item.get(
                "rodada"
            )
            for item in rodadas_ignoradas
        ],
    )

    print(
        "Testes executados:",
        total_testes,
    )

    print(
        "Testes aprovados:",
        total_aprovados,
    )

    print(
        "Cobertura:",
        f"{cobertura_testes:.2f}%",
    )

    print()

    print(
        "MELHORES RESULTADOS"
    )

    print(
        "--------------------------------------------"
    )

    for estrategia in ESTRATEGIAS:

        melhor = melhores.get(
            estrategia
        )

        if not melhor:
            continue

        print(
            (
                f"{estrategia.capitalize():11} "
                f"| Patrimônio: "
                f"C$ {melhor['patrimonio']:.2f} "
                f"| Média: "
                f"{melhor['pontuacaoMedia']:.2f} "
                f"| Total: "
                f"{melhor['pontuacaoTotal']:.2f}"
            )
        )

    print()

    print(
        "TOP 10 GERAL"
    )

    print(
        "--------------------------------------------"
    )

    for item in ranking[:10]:

        print(
            (
                f"{item['posicao']:02d}. "
                f"C$ {item['patrimonio']:.2f} "
                f"| {item['estrategia']:<11} "
                f"| Média: "
                f"{item['pontuacaoMedia']:.2f} "
                f"| Total: "
                f"{item['pontuacaoTotal']:.2f}"
            )
        )

    print()

    print(
        "Arquivo:",
        ARQUIVO_SAIDA,
    )

    print(
        "Auditoria:",
        (
            "APROVADA"
            if auditoria_global
            else "REPROVADA"
        ),
    )

    print(
        "============================================"
    )

    if not auditoria_global:

        raise SystemExit(
            1
        )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    executar()
