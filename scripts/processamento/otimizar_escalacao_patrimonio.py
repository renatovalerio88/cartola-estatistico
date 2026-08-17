"""
=========================================================
CARTOLA ESTATÍSTICO
Otimizador de Escalação por Patrimônio

Versão:
otimizador_patrimonio_v1

Objetivo:

Montar a melhor escalação possível respeitando:

- patrimônio EXATO informado pelo usuário;
- formação válida;
- posições;
- 11 atletas + 1 técnico;
- limite máximo de jogadores por clube;
- jogadores elegíveis;
- estratégia:
    Conservador
    Equilibrado
    Agressivo
- não existe patrimônio fixo de C$ 120;
- não existe obrigação de gastar todo o patrimônio.

Exemplo:

python scripts/processamento/otimizar_escalacao_patrimonio.py \
    --patrimonio 143.72

Também é possível:

python scripts/processamento/otimizar_escalacao_patrimonio.py \
    --patrimonio 143.72 \
    --estrategia equilibrado

python scripts/processamento/otimizar_escalacao_patrimonio.py \
    --patrimonio 143.72 \
    --estrategia agressivo \
    --formacao 4-3-3

Saída padrão:

data/otimizacao-patrimonio.json

IMPORTANTE:

Esta é a primeira camada operacional do patrimônio
dinâmico.

Ela NÃO altera:

- pesos oficiais;
- projeções oficiais;
- estratégia oficial;
- modelo estatístico oficial.

=========================================================
"""

from __future__ import annotations

import argparse
import json
import math

from copy import deepcopy
from pathlib import Path
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

ARQUIVO_JOGADORES = (
    PASTA_DATA /
    "jogadores.json"
)

ARQUIVO_ESCALACOES = (
    PASTA_DATA /
    "escalacoes.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "otimizacao-patrimonio.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================

LIMITE_JOGADORES_CLUBE = 3

QUANTIDADE_TITULARES = 12

MAX_CANDIDATOS_POSICAO = 40

MAX_ESTADOS_BEAM = 25000

TOLERANCIA = 0.000001


FORMACOES = {

    "4-4-2": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 4,
        "ATA": 2,
        "TEC": 1,
    },

    "3-4-3": {
        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 3,
        "TEC": 1,
    },

    "4-3-3": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 3,
        "ATA": 3,
        "TEC": 1,
    },

    "3-5-2": {
        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 5,
        "ATA": 2,
        "TEC": 1,
    },

    "5-3-2": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 3,
        "MEI": 3,
        "ATA": 2,
        "TEC": 1,
    },

    "5-4-1": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 1,
        "TEC": 1,
    },

}


ESTRATEGIAS = {
    "conservador",
    "equilibrado",
    "agressivo",
}


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


def inteiro(
    valor: Any,
    padrao: int = 0,
) -> int:

    try:

        return int(
            numero(
                valor,
                padrao,
            )
        )

    except Exception:

        return padrao


def arredondar(
    valor: Any,
    casas: int = 2,
) -> float:

    return round(
        numero(valor),
        casas,
    )


def normalizar_texto(
    valor: Any,
) -> str:

    if valor is None:
        return ""

    return (
        str(valor)
        .strip()
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
            "[ERRO] Falha ao carregar:",
            caminho,
        )

        print(
            erro
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


# ======================================================
# IDENTIFICAÇÃO DOS CAMPOS
# ======================================================

def obter_id(
    jogador,
):

    return (
        jogador.get("id")
        or jogador.get("atletaId")
        or jogador.get("atleta_id")
    )


def obter_nome(
    jogador,
):

    return (
        jogador.get("apelido")
        or jogador.get("nome")
        or jogador.get("nomeCompleto")
        or str(
            obter_id(jogador)
            or ""
        )
    )


def obter_posicao(
    jogador,
):

    valor = (
        jogador.get("posicao")
        or jogador.get("posicaoAbreviacao")
        or jogador.get("posicao_abreviacao")
    )

    return (
        normalizar_texto(
            valor
        )
        .upper()
    )


def obter_clube_id(
    jogador,
):

    valor = (
        jogador.get("clubeId")
        or jogador.get("clube_id")
        or jogador.get("clube")
        or jogador.get("siglaClube")
    )

    return str(
        valor
        if valor is not None
        else ""
    )


def obter_clube(
    jogador,
):

    return (
        jogador.get("siglaClube")
        or jogador.get("clube")
        or jogador.get("clubeNome")
        or ""
    )


def obter_preco(
    jogador,
):

    candidatos = [
        jogador.get("preco"),
        jogador.get("preco_num"),
        jogador.get("precoCartoleta"),
        jogador.get("valor"),
    ]

    for valor in candidatos:

        if valor is not None:

            return max(
                0.0,
                numero(
                    valor
                ),
            )

    return 0.0


# ======================================================
# MÉTRICAS ESTATÍSTICAS
# ======================================================

def primeiro_numero(
    jogador,
    campos,
    padrao=0.0,
):

    for campo in campos:

        if campo not in jogador:
            continue

        valor = jogador.get(
            campo
        )

        if valor is None:
            continue

        convertido = numero(
            valor,
            None,
        )

        if convertido is not None:

            return convertido

    return padrao


def obter_projecao(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "projecaoCalibrada",
            "projecaoFinal",
            "projecao",
            "scoreProjetado",
            "score",
            "mediaProjetada",
            "media",
        ],
        0.0,
    )


def obter_piso(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "piso",
            "pisoProjetado",
            "pisoHistorico",
        ],
        0.0,
    )


def obter_teto(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "teto",
            "tetoProjetado",
            "tetoHistorico",
        ],
        0.0,
    )


def obter_confianca(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "confianca",
            "confiancaFinal",
            "nivelConfianca",
        ],
        50.0,
    )


def obter_regularidade(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "regularidade",
            "indiceRegularidade",
        ],
        50.0,
    )


def obter_risco(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "risco",
            "indiceRisco",
        ],
        50.0,
    )


def obter_explosao(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "notaExplosao",
            "potencialExplosao",
            "explosao",
        ],
        0.0,
    )


def obter_diferencial(
    jogador,
):

    return primeiro_numero(
        jogador,
        [
            "indiceDiferencial",
            "notaDiferencial",
            "diferencial",
        ],
        0.0,
    )


# ======================================================
# NOTAS ESPECÍFICAS JÁ CALCULADAS
# ======================================================

def nota_existente(
    jogador,
    estrategia,
):

    mapas = {

        "conservador": [
            "notaConservador",
            "scoreConservador",
            "rankingConservador",
        ],

        "equilibrado": [
            "notaEquilibrado",
            "scoreEquilibrado",
            "rankingEquilibrado",
        ],

        "agressivo": [
            "notaAgressivo",
            "scoreAgressivo",
            "rankingAgressivo",
        ],

    }

    for campo in mapas.get(
        estrategia,
        [],
    ):

        if campo not in jogador:
            continue

        valor = jogador.get(
            campo
        )

        if valor is None:
            continue

        return numero(
            valor
        )

    return None


# ======================================================
# NOTA DO OTIMIZADOR
# ======================================================

def calcular_nota(
    jogador,
    estrategia,
):

    nota_pronta = nota_existente(
        jogador,
        estrategia,
    )

    if nota_pronta is not None:

        return nota_pronta

    projecao = obter_projecao(
        jogador
    )

    piso = obter_piso(
        jogador
    )

    teto = obter_teto(
        jogador
    )

    confianca = obter_confianca(
        jogador
    )

    regularidade = obter_regularidade(
        jogador
    )

    risco = obter_risco(
        jogador
    )

    explosao = obter_explosao(
        jogador
    )

    diferencial = obter_diferencial(
        jogador
    )

    # ==================================================
    # FALLBACK OPERACIONAL
    #
    # Somente utilizado quando o jogador ainda não
    # possui score específico da estratégia.
    #
    # Não altera pesos oficiais do modelo.
    # ==================================================

    if estrategia == "conservador":

        return (
            projecao * 1.00
            + piso * 0.30
            + regularidade * 0.025
            + confianca * 0.020
            - risco * 0.020
        )

    if estrategia == "agressivo":

        return (
            projecao * 1.00
            + teto * 0.25
            + explosao * 0.020
            + diferencial * 0.010
            + confianca * 0.005
            - risco * 0.005
        )

    return (
        projecao * 1.00
        + piso * 0.10
        + teto * 0.10
        + regularidade * 0.010
        + confianca * 0.010
        - risco * 0.010
    )


# ======================================================
# ELEGIBILIDADE
# ======================================================

def jogador_elegivel(
    jogador,
):

    if not isinstance(
        jogador,
        dict,
    ):
        return False

    if obter_id(
        jogador
    ) is None:
        return False

    posicao = obter_posicao(
        jogador
    )

    if posicao not in {
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC",
    }:

        return False

    if obter_preco(
        jogador
    ) < 0:

        return False

    # ==================================================
    # FLAGS EXPLÍCITAS
    # ==================================================

    for campo in [
        "elegivel",
        "disponivel",
        "apto",
    ]:

        if campo in jogador:

            valor = jogador.get(
                campo
            )

            if valor is False:
                return False

    return True


# ======================================================
# CARREGAMENTO DOS JOGADORES
# ======================================================

def normalizar_lista_jogadores(
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
            "ranking",
        ]:

            lista = dados.get(
                chave
            )

            if isinstance(
                lista,
                list,
            ):

                return lista

    return []


def carregar_jogadores(
    arquivo,
):

    dados = carregar_json(
        arquivo
    )

    jogadores = (
        normalizar_lista_jogadores(
            dados
        )
    )

    jogadores = [

        deepcopy(
            jogador
        )

        for jogador in jogadores

        if jogador_elegivel(
            jogador
        )

    ]

    return jogadores


# ======================================================
# CONFIGURAÇÕES DE PERFIS
# ======================================================

def carregar_formacao_preferida(
    estrategia,
):

    dados = carregar_json(
        ARQUIVO_ESCALACOES
    )

    if not isinstance(
        dados,
        list,
    ):

        return None

    for item in dados:

        if not isinstance(
            item,
            dict,
        ):
            continue

        perfil = (
            normalizar_texto(
                item.get(
                    "perfil"
                )
            )
            .lower()
        )

        identificador = (
            normalizar_texto(
                item.get(
                    "id"
                )
            )
            .lower()
        )

        if estrategia not in {
            perfil,
            identificador,
        }:

            continue

        formacao = normalizar_texto(
            item.get(
                "formacao"
            )
        )

        if formacao in FORMACOES:

            return formacao

    return None


# ======================================================
# PREPARAÇÃO DOS CANDIDATOS
# ======================================================

def preparar_candidatos(
    jogadores,
    estrategia,
    patrimonio,
):

    por_posicao = {

        "GOL": [],
        "LAT": [],
        "ZAG": [],
        "MEI": [],
        "ATA": [],
        "TEC": [],

    }

    for jogador in jogadores:

        preco = obter_preco(
            jogador
        )

        if preco > (
            patrimonio +
            TOLERANCIA
        ):

            continue

        posicao = obter_posicao(
            jogador
        )

        nota = calcular_nota(
            jogador,
            estrategia,
        )

        jogador[
            "_otimizador"
        ] = {

            "nota":
                nota,

            "projecao":
                obter_projecao(
                    jogador
                ),

            "piso":
                obter_piso(
                    jogador
                ),

            "teto":
                obter_teto(
                    jogador
                ),

            "confianca":
                obter_confianca(
                    jogador
                ),

            "regularidade":
                obter_regularidade(
                    jogador
                ),

            "risco":
                obter_risco(
                    jogador
                ),

            "preco":
                preco,

        }

        por_posicao[
            posicao
        ].append(
            jogador
        )

    for posicao in por_posicao:

        por_posicao[
            posicao
        ].sort(

            key=lambda jogador: (

                numero(
                    jogador.get(
                        "_otimizador",
                        {},
                    ).get(
                        "nota"
                    )
                ),

                numero(
                    jogador.get(
                        "_otimizador",
                        {},
                    ).get(
                        "projecao"
                    )
                ),

                -numero(
                    jogador.get(
                        "_otimizador",
                        {},
                    ).get(
                        "preco"
                    )
                ),

            ),

            reverse=True,

        )

        por_posicao[
            posicao
        ] = (
            por_posicao[
                posicao
            ][
                :MAX_CANDIDATOS_POSICAO
            ]
        )

    return por_posicao


# ======================================================
# VALIDAÇÃO DA FORMAÇÃO
# ======================================================

def formacao_disponivel(
    candidatos,
    formacao,
):

    estrutura = FORMACOES.get(
        formacao
    )

    if not estrutura:
        return False

    for posicao, quantidade in (
        estrutura.items()
    ):

        disponiveis = len(
            candidatos.get(
                posicao,
                []
            )
        )

        if disponiveis < quantidade:

            return False

    return True


# ======================================================
# GERAÇÃO DOS SLOTS
# ======================================================

def criar_slots(
    formacao,
):

    estrutura = FORMACOES[
        formacao
    ]

    slots = []

    # Posições mais restritivas primeiro.
    ordem = [
        "TEC",
        "GOL",
        "ATA",
        "LAT",
        "ZAG",
        "MEI",
    ]

    for posicao in ordem:

        quantidade = estrutura.get(
            posicao,
            0,
        )

        for indice in range(
            quantidade
        ):

            slots.append({
                "posicao":
                    posicao,

                "indice":
                    indice,
            })

    return slots


# ======================================================
# ESTADO
# ======================================================

def chave_estado(
    estado,
):

    clubes = tuple(
        sorted(
            estado[
                "clubes"
            ].items()
        )
    )

    ids = tuple(
        sorted(
            estado[
                "ids"
            ]
        )
    )

    return (
        estado["slot"],
        round(
            estado["custo"],
            2,
        ),
        clubes,
        ids,
    )


# ======================================================
# BEAM SEARCH
# ======================================================

def otimizar_formacao(
    candidatos,
    estrategia,
    formacao,
    patrimonio,
):

    slots = criar_slots(
        formacao
    )

    estados = [{

        "slot": 0,

        "jogadores": [],

        "ids": set(),

        "clubes": {},

        "custo": 0.0,

        "nota": 0.0,

        "projecao": 0.0,

        "piso": 0.0,

        "teto": 0.0,

        "confianca": 0.0,

        "regularidade": 0.0,

        "risco": 0.0,

        "ultimoIndicePosicao": {},

    }]

    for indice_slot, slot in enumerate(
        slots
    ):

        posicao = slot[
            "posicao"
        ]

        lista = candidatos.get(
            posicao,
            [],
        )

        novos = []

        for estado in estados:

            ultimo_indice = (
                estado[
                    "ultimoIndicePosicao"
                ].get(
                    posicao,
                    -1,
                )
            )

            for indice_jogador, jogador in enumerate(
                lista
            ):

                # Evita permutações da mesma posição.
                if (
                    indice_jogador
                    <=
                    ultimo_indice
                ):
                    continue

                jogador_id = str(
                    obter_id(
                        jogador
                    )
                )

                if jogador_id in estado[
                    "ids"
                ]:

                    continue

                clube_id = obter_clube_id(
                    jogador
                )

                quantidade_clube = (
                    estado[
                        "clubes"
                    ].get(
                        clube_id,
                        0,
                    )
                )

                if (
                    clube_id
                    and
                    quantidade_clube
                    >=
                    LIMITE_JOGADORES_CLUBE
                ):

                    continue

                metricas = jogador.get(
                    "_otimizador",
                    {},
                )

                preco = numero(
                    metricas.get(
                        "preco"
                    )
                )

                novo_custo = (
                    estado[
                        "custo"
                    ]
                    +
                    preco
                )

                if novo_custo > (
                    patrimonio +
                    TOLERANCIA
                ):

                    continue

                novo = {

                    "slot":
                        indice_slot + 1,

                    "jogadores":
                        estado[
                            "jogadores"
                        ] + [
                            jogador
                        ],

                    "ids":
                        set(
                            estado[
                                "ids"
                            ]
                        ),

                    "clubes":
                        dict(
                            estado[
                                "clubes"
                            ]
                        ),

                    "custo":
                        novo_custo,

                    "nota":
                        estado[
                            "nota"
                        ]
                        +
                        numero(
                            metricas.get(
                                "nota"
                            )
                        ),

                    "projecao":
                        estado[
                            "projecao"
                        ]
                        +
                        numero(
                            metricas.get(
                                "projecao"
                            )
                        ),

                    "piso":
                        estado[
                            "piso"
                        ]
                        +
                        numero(
                            metricas.get(
                                "piso"
                            )
                        ),

                    "teto":
                        estado[
                            "teto"
                        ]
                        +
                        numero(
                            metricas.get(
                                "teto"
                            )
                        ),

                    "confianca":
                        estado[
                            "confianca"
                        ]
                        +
                        numero(
                            metricas.get(
                                "confianca"
                            )
                        ),

                    "regularidade":
                        estado[
                            "regularidade"
                        ]
                        +
                        numero(
                            metricas.get(
                                "regularidade"
                            )
                        ),

                    "risco":
                        estado[
                            "risco"
                        ]
                        +
                        numero(
                            metricas.get(
                                "risco"
                            )
                        ),

                    "ultimoIndicePosicao":
                        dict(
                            estado[
                                "ultimoIndicePosicao"
                            ]
                        ),

                }

                novo[
                    "ids"
                ].add(
                    jogador_id
                )

                if clube_id:

                    novo[
                        "clubes"
                    ][
                        clube_id
                    ] = (
                        quantidade_clube
                        + 1
                    )

                novo[
                    "ultimoIndicePosicao"
                ][
                    posicao
                ] = indice_jogador

                novos.append(
                    novo
                )

        if not novos:

            return None

        # ==================================================
        # ORDENAÇÃO DO BEAM
        #
        # Prioridade:
        # 1. qualidade estatística
        # 2. projeção
        # 3. menor custo em empate
        #
        # Não há bônus simplesmente por gastar dinheiro.
        # ==================================================

        novos.sort(

            key=lambda estado: (

                estado[
                    "nota"
                ],

                estado[
                    "projecao"
                ],

                -estado[
                    "custo"
                ],

            ),

            reverse=True,

        )

        # ==================================================
        # DEDUPLICAÇÃO
        # ==================================================

        unicos = []

        assinaturas = set()

        for estado in novos:

            assinatura = tuple(
                sorted(
                    estado[
                        "ids"
                    ]
                )
            )

            if assinatura in assinaturas:
                continue

            assinaturas.add(
                assinatura
            )

            unicos.append(
                estado
            )

            if (
                len(unicos)
                >=
                MAX_ESTADOS_BEAM
            ):

                break

        estados = unicos

    completos = [

        estado

        for estado in estados

        if len(
            estado[
                "jogadores"
            ]
        ) == QUANTIDADE_TITULARES

    ]

    if not completos:

        return None

    completos.sort(

        key=lambda estado: (

            estado[
                "nota"
            ],

            estado[
                "projecao"
            ],

            -estado[
                "custo"
            ],

        ),

        reverse=True,

    )

    return completos[0]


# ======================================================
# CAPITÃO
# ======================================================

def escolher_capitao(
    jogadores,
    estrategia,
):

    elegiveis = [

        jogador

        for jogador in jogadores

        if obter_posicao(
            jogador
        ) != "TEC"

    ]

    if not elegiveis:

        return None

    def nota_capitao(
        jogador
    ):

        projecao = obter_projecao(
            jogador
        )

        teto = obter_teto(
            jogador
        )

        confianca = obter_confianca(
            jogador
        )

        regularidade = obter_regularidade(
            jogador
        )

        risco = obter_risco(
            jogador
        )

        if estrategia == "conservador":

            return (
                projecao
                + confianca * 0.025
                + regularidade * 0.020
                - risco * 0.015
            )

        if estrategia == "agressivo":

            return (
                projecao
                + teto * 0.30
                + confianca * 0.010
                - risco * 0.005
            )

        return (
            projecao
            + teto * 0.10
            + confianca * 0.020
            - risco * 0.010
        )

    return max(
        elegiveis,
        key=nota_capitao,
    )


# ======================================================
# SERIALIZAÇÃO DO JOGADOR
# ======================================================

def serializar_jogador(
    jogador,
    capitao_id=None,
):

    metricas = jogador.get(
        "_otimizador",
        {},
    )

    jogador_id = obter_id(
        jogador
    )

    return {

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

        "clube":
            obter_clube(
                jogador
            ),

        "clubeId":
            obter_clube_id(
                jogador
            ),

        "preco":
            arredondar(
                obter_preco(
                    jogador
                )
            ),

        "projecao":
            arredondar(
                metricas.get(
                    "projecao"
                )
            ),

        "piso":
            arredondar(
                metricas.get(
                    "piso"
                )
            ),

        "teto":
            arredondar(
                metricas.get(
                    "teto"
                )
            ),

        "confianca":
            arredondar(
                metricas.get(
                    "confianca"
                )
            ),

        "regularidade":
            arredondar(
                metricas.get(
                    "regularidade"
                )
            ),

        "risco":
            arredondar(
                metricas.get(
                    "risco"
                )
            ),

        "notaOtimizador":
            arredondar(
                metricas.get(
                    "nota"
                ),
                4,
            ),

        "capitao":
            (
                str(
                    jogador_id
                )
                ==
                str(
                    capitao_id
                )
            ),

    }


# ======================================================
# RESULTADO DE UMA FORMAÇÃO
# ======================================================

def montar_resultado(
    estado,
    patrimonio,
    estrategia,
    formacao,
):

    if estado is None:

        return None

    jogadores = estado[
        "jogadores"
    ]

    capitao = escolher_capitao(
        jogadores,
        estrategia,
    )

    capitao_id = (
        obter_id(
            capitao
        )
        if capitao
        else None
    )

    quantidade = len(
        jogadores
    )

    confianca_media = (
        estado[
            "confianca"
        ] / quantidade
        if quantidade
        else 0
    )

    regularidade_media = (
        estado[
            "regularidade"
        ] / quantidade
        if quantidade
        else 0
    )

    risco_medio = (
        estado[
            "risco"
        ] / quantidade
        if quantidade
        else 0
    )

    custo = estado[
        "custo"
    ]

    return {

        "estrategia":
            estrategia.capitalize(),

        "formacao":
            formacao,

        "patrimonio":
            arredondar(
                patrimonio
            ),

        "custo":
            arredondar(
                custo
            ),

        "saldo":
            arredondar(
                patrimonio
                -
                custo
            ),

        "percentualPatrimonioUtilizado":
            arredondar(
                (
                    custo /
                    patrimonio *
                    100
                )
                if patrimonio > 0
                else 0
            ),

        "notaOtimizador":
            arredondar(
                estado[
                    "nota"
                ],
                4,
            ),

        "projecao":
            arredondar(
                estado[
                    "projecao"
                ]
            ),

        "piso":
            arredondar(
                estado[
                    "piso"
                ]
            ),

        "teto":
            arredondar(
                estado[
                    "teto"
                ]
            ),

        "confiancaMedia":
            arredondar(
                confianca_media
            ),

        "regularidadeMedia":
            arredondar(
                regularidade_media
            ),

        "riscoMedio":
            arredondar(
                risco_medio
            ),

        "quantidadeTitulares":
            quantidade,

        "capitao": (
            serializar_jogador(
                capitao,
                capitao_id,
            )
            if capitao
            else None
        ),

        "titulares": [

            serializar_jogador(
                jogador,
                capitao_id,
            )

            for jogador in sorted(

                jogadores,

                key=lambda item: (
                    [
                        "GOL",
                        "LAT",
                        "ZAG",
                        "MEI",
                        "ATA",
                        "TEC",
                    ].index(
                        obter_posicao(
                            item
                        )
                    ),

                    -obter_projecao(
                        item
                    ),

                )

            )

        ],

    }


# ======================================================
# OTIMIZAÇÃO DE UMA ESTRATÉGIA
# ======================================================

def otimizar_estrategia(
    jogadores,
    estrategia,
    patrimonio,
    formacao_forcada=None,
):

    candidatos = preparar_candidatos(
        jogadores,
        estrategia,
        patrimonio,
    )

    if formacao_forcada:

        formacoes_testar = [
            formacao_forcada
        ]

    else:

        preferida = (
            carregar_formacao_preferida(
                estrategia
            )
        )

        formacoes_testar = []

        if preferida:

            formacoes_testar.append(
                preferida
            )

        for formacao in FORMACOES:

            if formacao not in (
                formacoes_testar
            ):

                formacoes_testar.append(
                    formacao
                )

    resultados = []

    for formacao in formacoes_testar:

        if not formacao_disponivel(
            candidatos,
            formacao,
        ):

            continue

        estado = otimizar_formacao(

            candidatos,

            estrategia,

            formacao,

            patrimonio,

        )

        resultado = montar_resultado(

            estado,

            patrimonio,

            estrategia,

            formacao,

        )

        if resultado:

            resultados.append(
                resultado
            )

    if not resultados:

        return None

    resultados.sort(

        key=lambda item: (

            numero(
                item.get(
                    "notaOtimizador"
                )
            ),

            numero(
                item.get(
                    "projecao"
                )
            ),

            -numero(
                item.get(
                    "custo"
                )
            ),

        ),

        reverse=True,

    )

    melhor = resultados[0]

    melhor[
        "formacoesTestadas"
    ] = [

        {
            "formacao":
                item[
                    "formacao"
                ],

            "notaOtimizador":
                item[
                    "notaOtimizador"
                ],

            "projecao":
                item[
                    "projecao"
                ],

            "custo":
                item[
                    "custo"
                ],

        }

        for item in resultados

    ]

    return melhor


# ======================================================
# AUDITORIA DA ESCALAÇÃO
# ======================================================

def auditar_escalacao(
    resultado,
):

    problemas = []

    if not isinstance(
        resultado,
        dict,
    ):

        return {

            "aprovada": False,

            "problemas": [
                "escalação não gerada"
            ],

        }

    patrimonio = numero(
        resultado.get(
            "patrimonio"
        )
    )

    custo = numero(
        resultado.get(
            "custo"
        )
    )

    if custo > (
        patrimonio +
        0.01
    ):

        problemas.append(
            "custo acima do patrimônio"
        )

    titulares = resultado.get(
        "titulares",
        [],
    )

    if len(
        titulares
    ) != QUANTIDADE_TITULARES:

        problemas.append(
            (
                "quantidade de titulares "
                f"= {len(titulares)}"
            )
        )

    ids = [

        str(
            jogador.get(
                "id"
            )
        )

        for jogador in titulares

    ]

    if len(
        ids
    ) != len(
        set(ids)
    ):

        problemas.append(
            "jogadores duplicados"
        )

    clubes = {}

    for jogador in titulares:

        clube = str(
            jogador.get(
                "clubeId",
                "",
            )
        )

        if not clube:
            continue

        clubes[
            clube
        ] = (
            clubes.get(
                clube,
                0,
            )
            + 1
        )

    excedidos = {

        clube:
            quantidade

        for clube, quantidade
        in clubes.items()

        if quantidade >
        LIMITE_JOGADORES_CLUBE

    }

    if excedidos:

        problemas.append(
            (
                "limite por clube excedido: "
                f"{excedidos}"
            )
        )

    formacao = resultado.get(
        "formacao"
    )

    estrutura = FORMACOES.get(
        formacao
    )

    if not estrutura:

        problemas.append(
            "formação inválida"
        )

    else:

        contagem = {

            "GOL": 0,
            "LAT": 0,
            "ZAG": 0,
            "MEI": 0,
            "ATA": 0,
            "TEC": 0,

        }

        for jogador in titulares:

            posicao = jogador.get(
                "posicao"
            )

            if posicao in contagem:

                contagem[
                    posicao
                ] += 1

        for (
            posicao,
            esperado
        ) in estrutura.items():

            encontrado = (
                contagem.get(
                    posicao,
                    0,
                )
            )

            if encontrado != esperado:

                problemas.append(
                    (
                        f"{posicao}: "
                        f"{encontrado}/"
                        f"{esperado}"
                    )
                )

    capitao = resultado.get(
        "capitao"
    )

    if not isinstance(
        capitao,
        dict,
    ):

        problemas.append(
            "capitão ausente"
        )

    elif capitao.get(
        "posicao"
    ) == "TEC":

        problemas.append(
            "técnico definido como capitão"
        )

    return {

        "aprovada":
            len(problemas) == 0,

        "problemas":
            problemas,

        "custoDentroPatrimonio":
            custo <= (
                patrimonio +
                0.01
            ),

        "quantidadeTitulares":
            len(
                titulares
            ),

        "limiteClube":
            LIMITE_JOGADORES_CLUBE,

        "clubes":
            clubes,

    }


# ======================================================
# PROCESSAMENTO GERAL
# ======================================================

def processar(
    patrimonio,
    estrategias,
    formacao,
    arquivo_jogadores,
    arquivo_saida,
):

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "OTIMIZADOR POR PATRIMÔNIO V1"
    )

    print(
        "============================================"
    )

    print(
        "Patrimônio:",
        f"C$ {patrimonio:.2f}",
    )

    print(
        "Arquivo de jogadores:",
        arquivo_jogadores,
    )

    print(
        "============================================"
    )

    jogadores = carregar_jogadores(
        arquivo_jogadores
    )

    print(
        "Jogadores elegíveis:",
        len(
            jogadores
        ),
    )

    if not jogadores:

        print(
            "[ERRO] Nenhum jogador disponível."
        )

        raise SystemExit(
            1
        )

    resultados = []

    for estrategia in estrategias:

        print()

        print(
            "--------------------------------------------"
        )

        print(
            estrategia.upper()
        )

        print(
            "--------------------------------------------"
        )

        resultado = otimizar_estrategia(

            jogadores,

            estrategia,

            patrimonio,

            formacao_forcada=formacao,

        )

        auditoria = auditar_escalacao(
            resultado
        )

        if resultado:

            resultado[
                "auditoria"
            ] = auditoria

            resultados.append(
                resultado
            )

            print(
                "Formação:",
                resultado[
                    "formacao"
                ],
            )

            print(
                "Custo:",
                f"C$ {resultado['custo']:.2f}",
            )

            print(
                "Saldo:",
                f"C$ {resultado['saldo']:.2f}",
            )

            print(
                "Projeção:",
                resultado[
                    "projecao"
                ],
            )

            print(
                "Nota:",
                resultado[
                    "notaOtimizador"
                ],
            )

            print(
                "Capitão:",
                (
                    resultado.get(
                        "capitao",
                        {}
                    ).get(
                        "nome"
                    )
                ),
            )

            print(
                "Auditoria:",
                (
                    "APROVADA"
                    if auditoria.get(
                        "aprovada"
                    )
                    else "REPROVADA"
                ),
            )

            if auditoria.get(
                "problemas"
            ):

                for problema in auditoria[
                    "problemas"
                ]:

                    print(
                        "  ->",
                        problema,
                    )

        else:

            print(
                "[ERRO] Não foi possível "
                "montar escalação."
            )

    auditoria_global = (

        len(resultados)
        ==
        len(estrategias)

        and

        all(
            resultado.get(
                "auditoria",
                {}
            ).get(
                "aprovada"
            )
            for resultado in resultados
        )

    )

    saida = {

        "modelo":
            "otimizador_patrimonio_v1",

        "descricao":
            (
                "Escalações calculadas dinamicamente "
                "para o patrimônio exato informado."
            ),

        "patrimonio":
            arredondar(
                patrimonio
            ),

        "estrategiasSolicitadas":
            estrategias,

        "formacaoForcada":
            formacao,

        "quantidadeJogadoresElegiveis":
            len(
                jogadores
            ),

        "limiteJogadoresPorClube":
            LIMITE_JOGADORES_CLUBE,

        "escalacoes":
            resultados,

        "auditoria": {

            "aprovada":
                auditoria_global,

            "estrategiasGeradas":
                len(
                    resultados
                ),

            "estrategiasEsperadas":
                len(
                    estrategias
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

            "patrimonioFixo120":
                False,

            "obrigaGastarTodoPatrimonio":
                False,

        },

    }

    salvar_json(
        arquivo_saida,
        saida,
    )

    print()

    print(
        "============================================"
    )

    print(
        "RESULTADO FINAL"
    )

    print(
        "============================================"
    )

    print(
        "Patrimônio:",
        f"C$ {patrimonio:.2f}",
    )

    print(
        "Escalações geradas:",
        len(
            resultados
        ),
    )

    print(
        "Auditoria global:",
        (
            "APROVADA"
            if auditoria_global
            else "REPROVADA"
        ),
    )

    print(
        "Arquivo:",
        arquivo_saida,
    )

    print(
        "============================================"
    )

    if not auditoria_global:

        raise SystemExit(
            1
        )


# ======================================================
# ARGUMENTOS
# ======================================================

def argumentos():

    parser = argparse.ArgumentParser(

        description=(
            "Otimizador de escalação "
            "por patrimônio do "
            "Cartola Estatístico."
        )

    )

    parser.add_argument(

        "--patrimonio",

        type=float,

        required=True,

        help=(
            "Patrimônio disponível. "
            "Exemplo: 143.72"
        ),

    )

    parser.add_argument(

        "--estrategia",

        choices=[
            "conservador",
            "equilibrado",
            "agressivo",
            "todas",
        ],

        default="todas",

        help=(
            "Estratégia a otimizar."
        ),

    )

    parser.add_argument(

        "--formacao",

        choices=[
            "auto",
            *FORMACOES.keys(),
        ],

        default="auto",

        help=(
            "Formação desejada ou auto."
        ),

    )

    parser.add_argument(

        "--arquivo",

        type=str,

        default=str(
            ARQUIVO_JOGADORES
        ),

        help=(
            "Arquivo JSON com jogadores."
        ),

    )

    parser.add_argument(

        "--saida",

        type=str,

        default=str(
            ARQUIVO_SAIDA
        ),

        help=(
            "Arquivo de saída."
        ),

    )

    return parser.parse_args()


# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":

    args = argumentos()

    patrimonio = numero(
        args.patrimonio
    )

    if patrimonio <= 0:

        print(
            "[ERRO] Patrimônio deve ser "
            "maior que zero."
        )

        raise SystemExit(
            1
        )

    if args.estrategia == "todas":

        estrategias = [
            "conservador",
            "equilibrado",
            "agressivo",
        ]

    else:

        estrategias = [
            args.estrategia
        ]

    formacao = (
        None
        if args.formacao == "auto"
        else args.formacao
    )

    processar(

        patrimonio=
            patrimonio,

        estrategias=
            estrategias,

        formacao=
            formacao,

        arquivo_jogadores=
            Path(
                args.arquivo
            ),

        arquivo_saida=
            Path(
                args.saida
            ),

    )
