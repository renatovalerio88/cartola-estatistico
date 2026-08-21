"""
=========================================================
CARTOLA ESTATÍSTICO
Gerador de Histórico de Escalações

Versão:
historico_escalacoes_v5

OBJETIVO
---------------------------------------------------------
Reconstruir rodada a rodada as escalações que o modelo
poderia sugerir usando SOMENTE informações anteriores
à rodada analisada.

Estratégias:
- Conservador
- Equilibrado
- Agressivo

Saída:
data/historico-escalacoes/rodada-XX.json
data/historico-escalacoes/indice.json


REGRA CIENTÍFICA
---------------------------------------------------------
Para prever a rodada R:

    histórico permitido = R1 ... R(R-1)

A pontuação real da rodada R nunca participa:
- do ranking;
- da projeção;
- da escolha;
- do capitão;
- do banco;
- da Reserva de Luxo.


REGRA FINANCEIRA V5
---------------------------------------------------------
O patrimônio limita SOMENTE:

    11 jogadores + treinador

O banco NÃO consome patrimônio.

Durante a montagem dos titulares, antes de aceitar um
jogador caro, o algoritmo verifica se ainda existe verba
mínima suficiente para completar os TITULARES restantes.

A reserva financeira não inclui banco.

Isso corrige a regra excessivamente restritiva da V4,
que poderia inviabilizar uma escalação válida.


BANCO
---------------------------------------------------------
É escolhido depois dos titulares.

Cada posição:
GOL
LAT
ZAG
MEI
ATA

O banco não entra no custo do patrimônio.


REGRA DE CLUBE
---------------------------------------------------------
Máximo de 3 titulares por clube.


AUDITORIA
---------------------------------------------------------
Valida:
- formação;
- quantidade de titulares;
- banco;
- jogadores duplicados;
- limite de clube;
- patrimônio dos titulares;
- ausência de vazamento da pontuação real.

=========================================================
"""

import json
import math

from pathlib import Path
from statistics import mean, median, pstdev
from collections import defaultdict


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

PASTA_SAIDA = (
    PASTA_DATA /
    "historico-escalacoes"
)

ARQUIVO_CONFIGURACAO = (
    PASTA_DATA /
    "configuracao.json"
)


RODADA_INICIAL = 2


# ======================================================
# REGRAS
# ======================================================

LIMITE_JOGADORES_CLUBE = 3


ESTRATEGIAS = {

    "conservador": {

        "nome":
            "Conservador",

        "formacao":
            "4-4-2"
    },

    "equilibrado": {

        "nome":
            "Equilibrado",

        "formacao":
            "3-4-3"
    },

    "agressivo": {

        "nome":
            "Agressivo",

        "formacao":
            "3-4-3"
    }
}


FORMACOES = {

    "4-4-2": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 4,
        "ATA": 2,
        "TEC": 1
    },

    "3-4-3": {

        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 3,
        "TEC": 1
    },

    "4-3-3": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 3,
        "ATA": 3,
        "TEC": 1
    }
}


ORDEM_POSICOES = [

    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
]


POSICOES_BANCO = [

    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA"
]


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


# ======================================================
# JSON
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


# ======================================================
# CONVERSÕES
# ======================================================

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
# IDENTIFICAÇÃO
# ======================================================

def obter_id(
    jogador
):

    possibilidades = [

        jogador.get(
            "id"
        ),

        jogador.get(
            "atletaId"
        ),

        jogador.get(
            "atleta_id"
        ),

        jogador.get(
            "atleta"
        )
    ]

    for valor in possibilidades:

        if valor is not None:

            return str(
                valor
            )

    nome = normalizar_texto(

        jogador.get(
            "nome"
        )

        or

        jogador.get(
            "apelido"
        )
    )

    clube = normalizar_texto(

        jogador.get(
            "siglaClube"
        )

        or

        jogador.get(
            "clube"
        )

        or

        jogador.get(
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

        jogador.get(
            "apelido"
        )

        or

        jogador.get(
            "nome"
        )

        or

        ""
    )


def obter_clube(
    jogador
):

    return (

        jogador.get(
            "siglaClube"
        )

        or

        jogador.get(
            "clube"
        )

        or

        jogador.get(
            "clubeNome"
        )

        or

        jogador.get(
            "clubeId"
        )

        or

        ""
    )


# ======================================================
# POSIÇÃO
# ======================================================

def obter_posicao(
    jogador
):

    posicao_id = inteiro(

        jogador.get(
            "posicaoId"
        )

        or

        jogador.get(
            "posicao_id"
        )
    )

    if posicao_id in MAPA_POSICOES_ID:

        return MAPA_POSICOES_ID[
            posicao_id
        ]

    valor = normalizar_texto(

        jogador.get(
            "posicao"
        )

        or

        jogador.get(
            "posicaoNome"
        )
    )

    if valor in MAPA_POSICOES_TEXTO:

        return MAPA_POSICOES_TEXTO[
            valor
        ]

    valor = valor.upper()

    if valor in {

        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC"

    }:

        return valor

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

        if jogador.get(
            campo
        ) is not None:

            return numero(
                jogador.get(
                    campo
                ),
                0
            )

    return 0


# ======================================================
# EXTRAIR LISTA
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

    for chave in [

        "jogadores",
        "atletas",
        "pontuados"

    ]:

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

            for atleta_id, atleta in (
                valor.items()
            ):

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
# FONTES DA RODADA
# ======================================================

def caminhos_possiveis_rodada(
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


def carregar_jogadores_rodada(
    rodada
):

    for caminho in (
        caminhos_possiveis_rodada(
            rodada
        )
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
# ÚLTIMA RODADA
# ======================================================

def descobrir_rodada_maxima():

    rodadas = set()

    for pasta in [

        PASTA_HISTORICO,
        PASTA_API

    ]:

        if not pasta.exists():

            continue

        for item in pasta.iterdir():

            nome = item.name

            if not nome.startswith(
                "rodada-"
            ):

                continue

            numero_texto = (
                nome
                .replace(
                    "rodada-",
                    ""
                )
                .replace(
                    ".json",
                    ""
                )
            )

            try:

                rodadas.add(
                    int(
                        numero_texto
                    )
                )

            except Exception:

                pass

    if not rodadas:

        return 0

    return max(
        rodadas
    )


# ======================================================
# HISTÓRICO INDIVIDUAL
# ======================================================

def construir_historico_ate(
    rodada_limite
):

    historico = {}

    for rodada in range(
        1,
        rodada_limite + 1
    ):

        jogadores = carregar_jogadores_rodada(
            rodada
        )

        for jogador in jogadores:

            jogador_id = obter_id(
                jogador
            )

            if jogador_id not in historico:

                historico[
                    jogador_id
                ] = []

            historico[
                jogador_id
            ].append({

                "rodada":
                    rodada,

                "pontos":
                    obter_pontuacao_real(
                        jogador
                    )
            })

    return historico


# ======================================================
# MÉTRICAS
# ======================================================

def calcular_metricas(
    registros
):

    if not registros:

        return {

            "jogos": 0,

            "media": 0,

            "media3": 0,

            "media5": 0,

            "media10": 0,

            "mediana": 0,

            "piso": 0,

            "teto": 0,

            "regularidade": 0,

            "volatilidade": 0,

            "tendencia": 0
        }

    pontos = [

        numero(
            registro.get(
                "pontos"
            ),
            0
        )

        for registro in registros
    ]

    ultimos3 = pontos[
        -3:
    ]

    ultimos5 = pontos[
        -5:
    ]

    ultimos10 = pontos[
        -10:
    ]

    media_geral = mean(
        pontos
    )

    media3 = mean(
        ultimos3
    )

    media5 = mean(
        ultimos5
    )

    media10 = mean(
        ultimos10
    )

    mediana_geral = median(
        pontos
    )

    piso = min(
        ultimos5
    )

    teto = max(
        ultimos5
    )

    volatilidade = (

        pstdev(
            ultimos5
        )

        if len(
            ultimos5
        ) > 1

        else 0
    )

    regularidade = max(

        0,

        min(
            100,

            100 -
            (
                volatilidade *
                10
            )
        )
    )

    tendencia = (
        media3 -
        media10
    )

    return {

        "jogos":
            len(
                pontos
            ),

        "media":
            round(
                media_geral,
                3
            ),

        "media3":
            round(
                media3,
                3
            ),

        "media5":
            round(
                media5,
                3
            ),

        "media10":
            round(
                media10,
                3
            ),

        "mediana":
            round(
                mediana_geral,
                3
            ),

        "piso":
            round(
                piso,
                3
            ),

        "teto":
            round(
                teto,
                3
            ),

        "regularidade":
            round(
                regularidade,
                2
            ),

        "volatilidade":
            round(
                volatilidade,
                3
            ),

        "tendencia":
            round(
                tendencia,
                3
            )
    }


# ======================================================
# STATUS
# ======================================================

def jogador_disponivel(
    jogador
):

    status = inteiro(

        jogador.get(
            "statusId"
        )

        or

        jogador.get(
            "status_id"
        )
    )

    if status is None:

        return True

    return status == 7


# ======================================================
# PREÇO
# ======================================================

def obter_preco(
    jogador
):

    for campo in [

        "preco",
        "preco_num",
        "precoNum",
        "precoCartoleta"

    ]:

        if jogador.get(
            campo
        ) is not None:

            return max(
                0,
                numero(
                    jogador.get(
                        campo
                    ),
                    0
                )
            )

    return 0


# ======================================================
# PATRIMÔNIO
# ======================================================

def obter_limite_patrimonio(
    estrategia=None
):

    limite_estrategia = numero(

        (
            estrategia
            or
            {}
        ).get(
            "limitePatrimonio"
        ),

        0
    )

    if limite_estrategia > 0:

        return round(
            limite_estrategia,
            2
        )

    configuracao = carregar_json(
        ARQUIVO_CONFIGURACAO
    )

    if isinstance(
        configuracao,
        dict
    ):

        limite = numero(
            configuracao.get(
                "limitePatrimonio"
            ),
            0
        )

        if limite > 0:

            return round(
                limite,
                2
            )

    return None


# ======================================================
# NOTA HISTÓRICA DA ESTRATÉGIA
# ======================================================
#
# Esta nota continua sendo o baseline histórico.
#
# NÃO estamos promovendo PB, XGBoost ou qualquer modelo
# novo neste arquivo.
#
# A inclusão da media10 melhora apenas a leitura temporal,
# sem contaminar a rodada futura.
# ======================================================

def calcular_nota(
    metricas,
    estrategia
):

    media_geral = metricas[
        "media"
    ]

    media3 = metricas[
        "media3"
    ]

    media5 = metricas[
        "media5"
    ]

    media10 = metricas[
        "media10"
    ]

    mediana_valor = metricas[
        "mediana"
    ]

    piso = metricas[
        "piso"
    ]

    teto = metricas[
        "teto"
    ]

    regularidade = (
        metricas[
            "regularidade"
        ] /
        100
    )

    volatilidade = metricas[
        "volatilidade"
    ]

    tendencia = metricas[
        "tendencia"
    ]


    if estrategia == "conservador":

        nota = (

            media_geral * 0.16 +

            media10 * 0.12 +

            media5 * 0.18 +

            media3 * 0.11 +

            mediana_valor * 0.13 +

            piso * 0.15 +

            regularidade * 8 * 0.10 +

            tendencia * 0.05 -

            volatilidade * 0.08
        )


    elif estrategia == "agressivo":

        nota = (

            media_geral * 0.09 +

            media10 * 0.09 +

            media5 * 0.17 +

            media3 * 0.23 +

            mediana_valor * 0.05 +

            piso * 0.03 +

            teto * 0.23 +

            tendencia * 0.11
        )


    else:

        nota = (

            media_geral * 0.13 +

            media10 * 0.11 +

            media5 * 0.19 +

            media3 * 0.17 +

            mediana_valor * 0.10 +

            piso * 0.08 +

            teto * 0.10 +

            regularidade * 8 * 0.06 +

            tendencia * 0.06
        )


    jogos = metricas[
        "jogos"
    ]


    if jogos <= 0:

        nota -= 20

    elif jogos == 1:

        nota *= 0.82

    elif jogos == 2:

        nota *= 0.90


    return round(
        nota,
        4
    )


# ======================================================
# PREPARAÇÃO DOS CANDIDATOS
# ======================================================

def preparar_candidatos(
    rodada,
    historico,
    estrategia
):

    jogadores_rodada = carregar_jogadores_rodada(
        rodada
    )

    candidatos = []


    for jogador in jogadores_rodada:

        posicao = obter_posicao(
            jogador
        )

        if not posicao:

            continue

        if not jogador_disponivel(
            jogador
        ):

            continue


        jogador_id = obter_id(
            jogador
        )


        registros = historico.get(
            jogador_id,
            []
        )


        metricas = calcular_metricas(
            registros
        )


        nota = calcular_nota(
            metricas,
            estrategia
        )


        candidatos.append({

            "id":
                jogador_id,

            "nome":
                obter_nome(
                    jogador
                ),

            "posicao":
                posicao,

            "clube":
                obter_clube(
                    jogador
                ),

            "preco":
                round(
                    obter_preco(
                        jogador
                    ),
                    2
                ),

            "nota":
                nota,

            "metricas":
                metricas
        })


    return candidatos


# ======================================================
# DIAGNÓSTICO DOS CANDIDATOS
# ======================================================

def diagnosticar_candidatos(
    candidatos
):

    por_posicao = {

        posicao:
            0

        for posicao in ORDEM_POSICOES
    }


    precos_por_posicao = defaultdict(
        list
    )


    for jogador in candidatos:

        posicao = jogador.get(
            "posicao"
        )

        if posicao not in por_posicao:

            continue

        por_posicao[
            posicao
        ] += 1

        precos_por_posicao[
            posicao
        ].append(

            numero(
                jogador.get(
                    "preco"
                ),
                0
            )
        )


    preco_minimo = {}


    for posicao in ORDEM_POSICOES:

        valores = precos_por_posicao.get(
            posicao,
            []
        )

        preco_minimo[
            posicao
        ] = (

            round(
                min(
                    valores
                ),
                2
            )

            if valores

            else None
        )


    return {

        "quantidadeTotal":
            len(
                candidatos
            ),

        "porPosicao":
            por_posicao,

        "precoMinimoPorPosicao":
            preco_minimo
    }


# ======================================================
# REGRA DE CLUBE
# ======================================================

def pode_adicionar_clube(
    jogador,
    clubes
):

    clube = normalizar_texto(
        jogador.get(
            "clube"
        )
    )

    if not clube:

        return True

    return (
        clubes.get(
            clube,
            0
        )
        <
        LIMITE_JOGADORES_CLUBE
    )


def adicionar_clube(
    jogador,
    clubes
):

    clube = normalizar_texto(
        jogador.get(
            "clube"
        )
    )

    if not clube:

        return

    clubes[
        clube
    ] = (
        clubes.get(
            clube,
            0
        ) +
        1
    )


# ======================================================
# DISPONÍVEIS POR POSIÇÃO
# ======================================================

def candidatos_disponiveis_posicao(
    candidatos,
    posicao,
    ids_usados
):

    return [

        jogador

        for jogador in candidatos

        if (
            jogador.get(
                "posicao"
            ) == posicao

            and

            jogador.get(
                "id"
            ) not in ids_usados
        )
    ]


# ======================================================
# RESERVA MÍNIMA DOS TITULARES FUTUROS
# ======================================================
#
# CORREÇÃO CENTRAL DA V5:
#
# aqui NÃO existe reserva financeira para o banco.
#
# O banco não consome patrimônio.
# ======================================================

def calcular_reserva_minima_titulares(
    candidatos,
    formacao,
    titulares_simulados
):

    estrutura = FORMACOES.get(
        formacao
    )

    if not estrutura:

        return None


    ids_usados = {

        jogador.get(
            "id"
        )

        for jogador in titulares_simulados
    }


    quantidade_atual = defaultdict(
        int
    )


    for jogador in titulares_simulados:

        quantidade_atual[
            jogador.get(
                "posicao"
            )
        ] += 1


    custo_minimo = 0


    for posicao in ORDEM_POSICOES:

        quantidade_necessaria = estrutura.get(
            posicao,
            0
        )

        quantidade_escolhida = quantidade_atual.get(
            posicao,
            0
        )

        faltam = max(

            0,

            quantidade_necessaria -
            quantidade_escolhida
        )


        if faltam <= 0:

            continue


        disponiveis = candidatos_disponiveis_posicao(

            candidatos,
            posicao,
            ids_usados
        )


        if len(
            disponiveis
        ) < faltam:

            return None


        disponiveis = sorted(

            disponiveis,

            key=lambda jogador: (

                numero(
                    jogador.get(
                        "preco"
                    )
                ),

                -numero(
                    jogador.get(
                        "nota"
                    )
                )
            )
        )


        custo_minimo += sum(

            numero(
                jogador.get(
                    "preco"
                )
            )

            for jogador in disponiveis[
                :faltam
            ]
        )


    return round(
        custo_minimo,
        2
    )


# ======================================================
# SELEÇÃO DE TITULARES POR POSIÇÃO
# ======================================================

def selecionar_por_posicao(
    candidatos,
    posicao,
    quantidade,
    selecionados,
    clubes,
    formacao,
    patrimonio=None,
    custo_atual=0
):

    ranking = sorted(

        [

            jogador

            for jogador in candidatos

            if jogador[
                "posicao"
            ] == posicao
        ],

        key=lambda jogador: (

            jogador[
                "nota"
            ],

            jogador[
                "metricas"
            ][
                "jogos"
            ],

            jogador[
                "metricas"
            ][
                "media5"
            ],

            jogador[
                "metricas"
            ][
                "media10"
            ]
        ),

        reverse=True
    )


    escolhidos = []


    ids_usados = {

        jogador[
            "id"
        ]

        for jogador in selecionados
    }


    custo = numero(
        custo_atual
    )


    for jogador in ranking:

        if jogador[
            "id"
        ] in ids_usados:

            continue


        if not pode_adicionar_clube(
            jogador,
            clubes
        ):

            continue


        preco = numero(
            jogador.get(
                "preco"
            )
        )


        novo_custo = (
            custo +
            preco
        )


        if (
            patrimonio is not None

            and

            novo_custo >
            patrimonio +
            0.000001
        ):

            continue


        # ==============================================
        # Simula a entrada do jogador.
        #
        # A reserva financeira cobre somente titulares.
        # ==============================================

        if patrimonio is not None:

            titulares_simulados = [

                *selecionados,
                jogador
            ]


            reserva_futura = (
                calcular_reserva_minima_titulares(

                    candidatos,
                    formacao,
                    titulares_simulados
                )
            )


            if reserva_futura is None:

                continue


            if (
                novo_custo +
                reserva_futura
                >
                patrimonio +
                0.000001
            ):

                continue


        escolhidos.append(
            jogador
        )

        selecionados.append(
            jogador
        )

        ids_usados.add(
            jogador[
                "id"
            ]
        )

        adicionar_clube(
            jogador,
            clubes
        )

        custo = novo_custo


        if len(
            escolhidos
        ) >= quantidade:

            break


    return (
        escolhidos,

        round(
            custo,
            2
        )
    )


# ======================================================
# MONTAGEM DOS TITULARES
# ======================================================

def montar_time(
    candidatos,
    formacao,
    patrimonio=None
):

    estrutura = FORMACOES.get(
        formacao
    )

    if not estrutura:

        raise ValueError(
            f"Formação não suportada: "
            f"{formacao}"
        )


    titulares = []

    clubes = {}

    por_posicao = {}

    custo_titulares = 0


    for posicao in ORDEM_POSICOES:

        quantidade = estrutura.get(
            posicao,
            0
        )


        if quantidade <= 0:

            por_posicao[
                posicao
            ] = []

            continue


        escolhidos, custo_titulares = (
            selecionar_por_posicao(

                candidatos,
                posicao,
                quantidade,
                titulares,
                clubes,
                formacao,
                patrimonio,
                custo_titulares
            )
        )


        por_posicao[
            posicao
        ] = escolhidos


    quantidade_esperada = sum(
        estrutura.values()
    )


    completa = (
        len(
            titulares
        )
        ==
        quantidade_esperada
    )


    faltantes = {}


    for posicao, quantidade in (
        estrutura.items()
    ):

        obtidos = len(
            por_posicao.get(
                posicao,
                []
            )
        )

        if obtidos < quantidade:

            faltantes[
                posicao
            ] = {

                "esperado":
                    quantidade,

                "obtido":
                    obtidos,

                "faltam":
                    quantidade -
                    obtidos
            }


    return {

        "titulares":
            titulares,

        "porPosicao":
            por_posicao,

        "completa":
            completa,

        "quantidadeEsperada":
            quantidade_esperada,

        "quantidadeObtida":
            len(
                titulares
            ),

        "custoTitulares":
            round(
                custo_titulares,
                2
            ),

        "posicoesFaltantes":
            faltantes
    }


# ======================================================
# CAPITÃO
# ======================================================

def escolher_capitao(
    titulares,
    estrategia
):

    candidatos = [

        jogador

        for jogador in titulares

        if jogador[
            "posicao"
        ] != "TEC"
    ]


    if not candidatos:

        return None


    if estrategia == "conservador":

        return max(

            candidatos,

            key=lambda jogador: (

                jogador[
                    "metricas"
                ][
                    "piso"
                ],

                jogador[
                    "metricas"
                ][
                    "media5"
                ],

                jogador[
                    "nota"
                ]
            )
        )


    if estrategia == "agressivo":

        return max(

            candidatos,

            key=lambda jogador: (

                jogador[
                    "metricas"
                ][
                    "teto"
                ],

                jogador[
                    "metricas"
                ][
                    "media3"
                ],

                jogador[
                    "nota"
                ]
            )
        )


    return max(

        candidatos,

        key=lambda jogador:
            jogador[
                "nota"
            ]
    )


# ======================================================
# BANCO
# ======================================================
#
# O banco NÃO consome patrimônio.
#
# Aqui escolhemos o melhor reserva disponível
# de cada posição.
# ======================================================

def montar_banco(
    candidatos,
    titulares
):

    ids_titulares = {

        jogador[
            "id"
        ]

        for jogador in titulares
    }


    banco = []


    for posicao in POSICOES_BANCO:

        disponiveis = [

            jogador

            for jogador in candidatos

            if (
                jogador[
                    "posicao"
                ] == posicao

                and

                jogador[
                    "id"
                ] not in ids_titulares
            )
        ]


        disponiveis.sort(

            key=lambda jogador: (

                jogador[
                    "nota"
                ],

                jogador[
                    "metricas"
                ][
                    "media5"
                ],

                jogador[
                    "metricas"
                ][
                    "jogos"
                ],

                -numero(
                    jogador.get(
                        "preco"
                    )
                )
            ),

            reverse=True
        )


        if not disponiveis:

            return []


        banco.append(
            disponiveis[
                0
            ]
        )


    return banco


# ======================================================
# RESERVA DE LUXO
# ======================================================

def escolher_reserva_luxo(
    banco
):

    if not banco:

        return None

    return max(

        banco,

        key=lambda jogador:
            jogador[
                "nota"
            ]
    )


# ======================================================
# SERIALIZAÇÃO
# ======================================================

def serializar_jogador(
    jogador
):

    if jogador is None:

        return None


    metricas = jogador.get(
        "metricas",
        {}
    )


    return {

        "id":
            jogador[
                "id"
            ],

        "nome":
            jogador[
                "nome"
            ],

        "posicao":
            jogador[
                "posicao"
            ],

        "clube":
            jogador[
                "clube"
            ],

        "preco":
            jogador[
                "preco"
            ],

        "projecao":
            round(
                jogador[
                    "nota"
                ],
                2
            ),

        "historico": {

            "jogos":
                metricas.get(
                    "jogos",
                    0
                ),

            "media":
                metricas.get(
                    "media",
                    0
                ),

            "media3":
                metricas.get(
                    "media3",
                    0
                ),

            "media5":
                metricas.get(
                    "media5",
                    0
                ),

            "media10":
                metricas.get(
                    "media10",
                    0
                ),

            "mediana":
                metricas.get(
                    "mediana",
                    0
                ),

            "piso":
                metricas.get(
                    "piso",
                    0
                ),

            "teto":
                metricas.get(
                    "teto",
                    0
                ),

            "regularidade":
                metricas.get(
                    "regularidade",
                    0
                ),

            "volatilidade":
                metricas.get(
                    "volatilidade",
                    0
                ),

            "tendencia":
                metricas.get(
                    "tendencia",
                    0
                )
        }
    }


# ======================================================
# AUDITORIA
# ======================================================

def auditar_estrategia(
    estrategia
):

    erros = []


    titulares = estrategia.get(
        "titulares",
        []
    )


    formacao = estrategia.get(
        "formacao"
    )


    estrutura = FORMACOES.get(
        formacao,
        {}
    )


    quantidade_esperada = sum(
        estrutura.values()
    )


    if len(
        titulares
    ) != quantidade_esperada:

        erros.append(
            "quantidade_titulares_incorreta"
        )


    ids = [

        jogador.get(
            "id"
        )

        for jogador in titulares
    ]


    if len(
        ids
    ) != len(
        set(
            ids
        )
    ):

        erros.append(
            "jogador_duplicado"
        )


    for posicao, quantidade in (
        estrutura.items()
    ):

        encontrados = sum(

            1

            for jogador in titulares

            if jogador.get(
                "posicao"
            ) == posicao
        )


        if encontrados != quantidade:

            erros.append(

                f"formacao_{posicao}_"
                f"{encontrados}_"
                f"esperado_{quantidade}"
            )


    clubes = {}


    for jogador in titulares:

        clube = normalizar_texto(
            jogador.get(
                "clube"
            )
        )

        if not clube:

            continue

        clubes[
            clube
        ] = (
            clubes.get(
                clube,
                0
            ) +
            1
        )


    for clube, quantidade in (
        clubes.items()
    ):

        if quantidade > LIMITE_JOGADORES_CLUBE:

            erros.append(

                f"limite_clube_"
                f"{clube}_"
                f"{quantidade}"
            )


    banco = estrategia.get(
        "banco",
        []
    )


    if len(
        banco
    ) != len(
        POSICOES_BANCO
    ):

        erros.append(
            "banco_incompleto"
        )


    posicoes_banco = {

        jogador.get(
            "posicao"
        )

        for jogador in banco
    }


    if (
        len(
            banco
        )
        ==
        len(
            POSICOES_BANCO
        )

        and

        posicoes_banco !=
        set(
            POSICOES_BANCO
        )
    ):

        erros.append(
            "posicoes_banco_incorretas"
        )


    ids_banco = {

        jogador.get(
            "id"
        )

        for jogador in banco
    }


    if (
        set(
            ids
        )
        &
        ids_banco
    ):

        erros.append(
            "titular_repetido_no_banco"
        )


    # ==================================================
    # PATRIMÔNIO V5
    #
    # Somente titulares + treinador.
    # ==================================================

    limite_patrimonio = estrategia.get(
        "limitePatrimonio"
    )


    custo_titulares = numero(
        estrategia.get(
            "custoTitulares"
        )
    )


    if (
        limite_patrimonio is not None

        and

        custo_titulares >
        numero(
            limite_patrimonio
        ) +
        0.000001
    ):

        erros.append(
            "patrimonio_titulares_excedido"
        )


    # ==================================================
    # PROIBIÇÃO DE RESULTADO REAL
    # ==================================================

    def possui_resultado_real(
        jogador
    ):

        if not isinstance(
            jogador,
            dict
        ):

            return False


        campos_proibidos = {

            "pontuacaoReal",
            "real",
            "pontuacaoDaRodada",
            "resultadoReal"
        }


        return any(

            campo in jogador

            for campo in campos_proibidos
        )


    jogadores_auditados = list(
        titulares
    )


    jogadores_auditados.extend(
        banco
    )


    capitao = estrategia.get(
        "capitao"
    )


    if capitao:

        jogadores_auditados.append(
            capitao
        )


    reserva_luxo = estrategia.get(
        "reservaLuxo"
    )


    if reserva_luxo:

        jogadores_auditados.append(
            reserva_luxo
        )


    if any(

        possui_resultado_real(
            jogador
        )

        for jogador in jogadores_auditados
    ):

        erros.append(
            "vazamento_pontuacao_real"
        )


    return {

        "aprovada":
            len(
                erros
            ) == 0,

        "erros":
            erros
    }


# ======================================================
# GERAR UMA RODADA
# ======================================================

def gerar_rodada(
    rodada
):

    rodada_limite = (
        rodada -
        1
    )


    historico = construir_historico_ate(
        rodada_limite
    )


    limite_patrimonio_global = (
        obter_limite_patrimonio()
    )


    resultado = {

        "modelo":
            "historico_escalacoes_v5",

        "rodada":
            rodada,

        "dadosUtilizadosAteRodada":
            rodada_limite,

        "regraTemporal":
            (
                f"rodadas_1_a_"
                f"{rodada_limite}"
            ),

        "semVazamentoFuturo":
            True,

        "limiteJogadoresClube":
            LIMITE_JOGADORES_CLUBE,

        "limitePatrimonio":
            limite_patrimonio_global,

        "orcamentoIncluiBanco":
            False,

        "bancoConsomePatrimonio":
            False,

        "reservaTitularesFuturos":
            True,

        "estrategias":
            []
    }


    for estrategia_id, configuracao in (
        ESTRATEGIAS.items()
    ):

        candidatos = preparar_candidatos(

            rodada,
            historico,
            estrategia_id
        )


        diagnostico_candidatos = (
            diagnosticar_candidatos(
                candidatos
            )
        )


        limite_patrimonio = (
            obter_limite_patrimonio(
                configuracao
            )
        )


        time = montar_time(

            candidatos,

            configuracao[
                "formacao"
            ],

            limite_patrimonio
        )


        titulares = time[
            "titulares"
        ]


        custo_titulares = sum(

            numero(
                jogador.get(
                    "preco"
                )
            )

            for jogador in titulares
        )


        # ==============================================
        # BANCO NÃO CONSOME PATRIMÔNIO
        # ==============================================

        banco = montar_banco(

            candidatos,
            titulares
        )


        custo_banco_informativo = sum(

            numero(
                jogador.get(
                    "preco"
                )
            )

            for jogador in banco
        )


        saldo_final = (

            None

            if limite_patrimonio is None

            else (
                limite_patrimonio -
                custo_titulares
            )
        )


        capitao = escolher_capitao(

            titulares,
            estrategia_id
        )


        reserva_luxo = (
            escolher_reserva_luxo(
                banco
            )
        )


        projecao_total = sum(

            jogador[
                "nota"
            ]

            for jogador in titulares
        )


        banco_completo = (
            len(
                banco
            )
            ==
            len(
                POSICOES_BANCO
            )
        )


        registro = {

            "id":
                estrategia_id,

            "nome":
                configuracao[
                    "nome"
                ],

            "perfil":
                estrategia_id,

            "formacao":
                configuracao[
                    "formacao"
                ],

            "escalacaoCompleta":
                time[
                    "completa"
                ],

            "bancoCompleto":
                banco_completo,

            "timeCompletoComBanco":
                (
                    time[
                        "completa"
                    ]
                    and
                    banco_completo
                ),

            "quantidadeTitulares":
                len(
                    titulares
                ),

            "quantidadeEsperada":
                time[
                    "quantidadeEsperada"
                ],

            "quantidadeBanco":
                len(
                    banco
                ),

            "limitePatrimonio":
                limite_patrimonio,

            "orcamentoIncluiBanco":
                False,

            "custoTitulares":
                round(
                    custo_titulares,
                    2
                ),

            # Mantido por compatibilidade.
            #
            # No V5 custoTotal representa o custo que
            # efetivamente consome patrimônio.
            "custoTotal":
                round(
                    custo_titulares,
                    2
                ),

            "custoBancoInformativo":
                round(
                    custo_banco_informativo,
                    2
                ),

            "saldo":
                (
                    round(
                        saldo_final,
                        2
                    )

                    if saldo_final is not None

                    else None
                ),

            "projecaoTitulares":
                round(
                    projecao_total,
                    2
                ),

            "diagnosticoCandidatos":
                diagnostico_candidatos,

            "posicoesFaltantes":
                time.get(
                    "posicoesFaltantes",
                    {}
                ),

            "titulares": [

                serializar_jogador(
                    jogador
                )

                for jogador in titulares
            ],

            "capitao":
                serializar_jogador(
                    capitao
                ),

            "banco": [

                serializar_jogador(
                    jogador
                )

                for jogador in banco
            ],

            "reservaLuxo":
                serializar_jogador(
                    reserva_luxo
                )
        }


        auditoria = auditar_estrategia(
            registro
        )


        registro[
            "auditoria"
        ] = auditoria


        resultado[
            "estrategias"
        ].append(
            registro
        )


    auditorias = [

        estrategia[
            "auditoria"
        ][
            "aprovada"
        ]

        for estrategia in resultado[
            "estrategias"
        ]
    ]


    resultado[
        "auditoria"
    ] = {

        "aprovada":
            all(
                auditorias
            ),

        "estrategiasAprovadas":
            sum(

                1

                for valor in auditorias

                if valor
            ),

        "estrategiasTotal":
            len(
                auditorias
            ),

        "usaPontuacaoRealDaRodadaNaPrevisao":
            False,

        "dadosHistoricosEncerramNaRodada":
            rodada_limite,

        "orcamentoIncluiBanco":
            False,

        "bancoConsomePatrimonio":
            False,

        "reservaTitularesFuturos":
            True
    }


    return resultado


# ======================================================
# LOG DE DIAGNÓSTICO
# ======================================================

def imprimir_diagnostico_estrategia(
    rodada,
    estrategia
):

    if estrategia.get(
        "timeCompletoComBanco"
    ):

        return


    print()

    print(
        "  [DIAGNÓSTICO]"
    )

    print(
        "  Rodada:",
        rodada
    )

    print(
        "  Estratégia:",
        estrategia.get(
            "nome"
        )
    )

    print(
        "  Formação:",
        estrategia.get(
            "formacao"
        )
    )

    print(
        "  Titulares:",
        (
            f"{estrategia.get('quantidadeTitulares')}/"
            f"{estrategia.get('quantidadeEsperada')}"
        )
    )

    print(
        "  Banco:",
        estrategia.get(
            "quantidadeBanco"
        ),
        "/",
        len(
            POSICOES_BANCO
        )
    )

    print(
        "  Custo titulares:",
        estrategia.get(
            "custoTitulares"
        )
    )

    print(
        "  Limite:",
        estrategia.get(
            "limitePatrimonio"
        )
    )

    print(
        "  Candidatos:",
        estrategia.get(
            "diagnosticoCandidatos",
            {}
        ).get(
            "porPosicao",
            {}
        )
    )

    print(
        "  Preço mínimo:",
        estrategia.get(
            "diagnosticoCandidatos",
            {}
        ).get(
            "precoMinimoPorPosicao",
            {}
        )
    )

    print(
        "  Posições faltantes:",
        estrategia.get(
            "posicoesFaltantes"
        )
    )

    print(
        "  Auditoria:",
        estrategia.get(
            "auditoria"
        )
    )

    print()


# ======================================================
# PROCESSAMENTO PRINCIPAL
# ======================================================

def processar():

    PASTA_SAIDA.mkdir(
        parents=True,
        exist_ok=True
    )


    rodada_maxima = descobrir_rodada_maxima()


    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "HISTÓRICO PROGRESSIVO DE ESCALAÇÕES V5"
    )

    print(
        "============================================"
    )

    print(
        "Rodada máxima disponível:",
        rodada_maxima
    )

    print(
        "Limite de jogadores por clube:",
        LIMITE_JOGADORES_CLUBE
    )

    print(
        "Patrimônio considera:",
        "11 jogadores + treinador"
    )

    print(
        "Banco consome patrimônio:",
        "NÃO"
    )

    print(
        "Formação Conservador:",
        ESTRATEGIAS[
            "conservador"
        ][
            "formacao"
        ]
    )

    print(
        "Formação Equilibrado:",
        ESTRATEGIAS[
            "equilibrado"
        ][
            "formacao"
        ]
    )

    print(
        "Formação Agressivo:",
        ESTRATEGIAS[
            "agressivo"
        ][
            "formacao"
        ]
    )

    print(
        "============================================"
    )


    if rodada_maxima < RODADA_INICIAL:

        print(
            "Não há rodadas suficientes."
        )

        return


    processadas = []

    rodadas_aprovadas = []

    rodadas_reprovadas = []


    total_escalacoes = 0

    total_escalacoes_completas = 0

    total_estrategias_aprovadas = 0


    for rodada in range(

        RODADA_INICIAL,
        rodada_maxima + 1
    ):

        candidatos_rodada = (
            carregar_jogadores_rodada(
                rodada
            )
        )


        if not candidatos_rodada:

            print(

                f"[IGNORADA] "
                f"Rodada {rodada:02d}: "
                f"sem jogadores."
            )

            continue


        resultado = gerar_rodada(
            rodada
        )


        caminho_saida = (

            PASTA_SAIDA /
            f"rodada-{rodada:02d}.json"
        )


        salvar_json(
            caminho_saida,
            resultado
        )


        processadas.append(
            rodada
        )


        estrategias = resultado[
            "estrategias"
        ]


        completas = sum(

            1

            for estrategia in estrategias

            if estrategia[
                "timeCompletoComBanco"
            ]
        )


        aprovadas = sum(

            1

            for estrategia in estrategias

            if estrategia[
                "auditoria"
            ][
                "aprovada"
            ]
        )


        total_escalacoes += len(
            estrategias
        )


        total_escalacoes_completas += (
            completas
        )


        total_estrategias_aprovadas += (
            aprovadas
        )


        if resultado[
            "auditoria"
        ][
            "aprovada"
        ]:

            rodadas_aprovadas.append(
                rodada
            )

            status = "APROVADA"

        else:

            rodadas_reprovadas.append(
                rodada
            )

            status = "REPROVADA"


        print(

            f"[{status}] "
            f"Rodada {rodada:02d} | "
            f"{completas}/3 completas | "
            f"{aprovadas}/3 auditorias OK | "
            f"dados até R{rodada - 1:02d}"
        )


        if status == "REPROVADA":

            for estrategia in estrategias:

                imprimir_diagnostico_estrategia(
                    rodada,
                    estrategia
                )


    # ==================================================
    # ÍNDICE
    # ==================================================

    indice = {

        "modelo":
            "historico_escalacoes_indice_v5",

        "descricao":
            (
                "Índice do histórico progressivo "
                "de escalações sem vazamento futuro. "
                "Patrimônio aplicado somente aos titulares "
                "e treinador; banco fora do orçamento."
            ),

        "rodadasProcessadas":
            processadas,

        "quantidadeRodadas":
            len(
                processadas
            ),

        "primeiraRodada":
            (
                min(
                    processadas
                )

                if processadas

                else None
            ),

        "ultimaRodada":
            (
                max(
                    processadas
                )

                if processadas

                else None
            ),

        "totalEscalacoes":
            total_escalacoes,

        "totalEscalacoesCompletas":
            total_escalacoes_completas,

        "totalEstrategiasAuditadas":
            total_escalacoes,

        "totalEstrategiasAprovadas":
            total_estrategias_aprovadas,

        "rodadasAprovadas":
            rodadas_aprovadas,

        "rodadasReprovadas":
            rodadas_reprovadas,

        "auditoriaGlobalAprovada":
            (
                len(
                    rodadas_reprovadas
                ) == 0

                and

                len(
                    processadas
                ) > 0
            ),

        "regras": {

            "rodadaPrevistaNaoEntraNoHistorico":
                True,

            "pontuacaoRealNaoSerializada":
                True,

            "limiteJogadoresClube":
                LIMITE_JOGADORES_CLUBE,

            "formacoesSincronizadasComMotor":
                True,

            "orcamentoIncluiBanco":
                False,

            "bancoConsomePatrimonio":
                False,

            "reservaTitularesFuturos":
                True
        }
    }


    salvar_json(

        PASTA_SAIDA /
        "indice.json",

        indice
    )


    # ==================================================
    # RESUMO
    # ==================================================

    print(
        "============================================"
    )

    print(
        "HISTÓRICO DE ESCALAÇÕES FINALIZADO"
    )

    print(
        "============================================"
    )

    print(
        "Rodadas processadas:",
        len(
            processadas
        )
    )

    print(
        "Escalações geradas:",
        total_escalacoes
    )

    print(
        "Escalações completas:",
        total_escalacoes_completas
    )

    print(
        "Estratégias aprovadas:",
        (
            f"{total_estrategias_aprovadas}/"
            f"{total_escalacoes}"
        )
    )

    print(
        "Rodadas reprovadas:",
        rodadas_reprovadas
    )

    print(
        "Auditoria global:",
        (
            "APROVADA"

            if indice[
                "auditoriaGlobalAprovada"
            ]

            else
            "REPROVADA"
        )
    )

    print(
        "Banco consome patrimônio:",
        "NÃO"
    )

    print(
        "Saída:",
        PASTA_SAIDA
    )

    print(
        "============================================"
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
