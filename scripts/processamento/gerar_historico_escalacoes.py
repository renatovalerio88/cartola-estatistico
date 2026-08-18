"""
=========================================================
CARTOLA ESTATÍSTICO
Gerador de Histórico de Escalações

Versão:
historico_escalacoes_v4

Objetivo:
Reconstruir, rodada a rodada, as escalações que o modelo
poderia sugerir usando SOMENTE informações disponíveis
antes da rodada analisada.

Estratégias:
- Conservador
- Equilibrado
- Agressivo

Saída:
data/historico-escalacoes/rodada-XX.json
data/historico-escalacoes/indice.json

Regra científica:
Para prever a rodada R, nunca utilizar a pontuação real
da própria rodada R na escolha, ranking ou serialização
dos jogadores.

A pontuação real será consultada posteriormente pelo
simulador histórico.

Regra financeira V4:
Antes de selecionar cada titular, o motor reserva verba
mínima para:

1. todos os titulares que ainda precisam ser escolhidos;
2. o técnico, quando ainda não tiver sido escolhido;
3. as cinco posições do banco.

Assim, uma escolha cara no início da escalação não pode
inviabilizar o restante do time.

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
# REGRA DO MOTOR OFICIAL
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


# ======================================================
# FORMAÇÕES
# ======================================================

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

    texto = normalizar_texto(

        jogador.get(
            "posicao"
        )

        or

        jogador.get(
            "posicaoNome"
        )

    )

    if texto in MAPA_POSICOES_TEXTO:

        return MAPA_POSICOES_TEXTO[
            texto
        ]

    texto = texto.upper()

    if texto in {

        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC"

    }:

        return texto

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

                if not copia.get(
                    "id"
                ):

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
# FONTES HISTÓRICAS
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

        jogadores = (
            extrair_lista_jogadores(
                dados
            )
        )

        if jogadores:

            return jogadores

    return []


# ======================================================
# DESCOBERTA DA ÚLTIMA RODADA
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

        jogadores = (
            carregar_jogadores_rodada(
                rodada
            )
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
# MÉTRICAS HISTÓRICAS
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

    media_geral = mean(
        pontos
    )

    media3 = mean(
        ultimos3
    )

    media5 = mean(
        ultimos5
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

        100 -
        (
            volatilidade *
            10
        )

    )

    tendencia = (
        media3 -
        media_geral
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
# STATUS / DISPONIBILIDADE
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

    campos = [

        "preco",
        "preco_num",
        "precoNum",
        "precoCartoleta"

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
# PATRIMÔNIO
# ======================================================

def obter_limite_patrimonio(
    estrategia=None
):

    limite_estrategia = numero(

        (estrategia or {}).get(
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
# NOTA POR ESTRATÉGIA
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

            media_geral * 0.24 +
            media5 * 0.19 +
            media3 * 0.12 +
            mediana_valor * 0.14 +
            piso * 0.16 +
            regularidade * 8 * 0.10 +
            tendencia * 0.05 -
            volatilidade * 0.08

        )

    elif estrategia == "agressivo":

        nota = (

            media_geral * 0.14 +
            media5 * 0.19 +
            media3 * 0.24 +
            mediana_valor * 0.06 +
            piso * 0.04 +
            teto * 0.22 +
            tendencia * 0.11

        )

    else:

        nota = (

            media_geral * 0.21 +
            media5 * 0.20 +
            media3 * 0.18 +
            mediana_valor * 0.11 +
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

    jogadores_rodada = (
        carregar_jogadores_rodada(
            rodada
        )
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
        ) <
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
# CANDIDATOS DISPONÍVEIS
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
# CUSTO MÍNIMO DAS VAGAS FUTURAS
#
# Esta função é a principal correção da V4.
#
# Depois de simular a entrada de um jogador, calculamos
# quanto ainda precisamos reservar para:
#
# - titulares restantes;
# - banco.
#
# ======================================================

def calcular_reserva_minima_futura(
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

    quantidade_atual = {}

    for jogador in titulares_simulados:

        posicao = jogador.get(
            "posicao"
        )

        quantidade_atual[
            posicao
        ] = (

            quantidade_atual.get(
                posicao,
                0
            ) +
            1

        )


    # ==================================================
    # Necessidade total futura por posição
    #
    # Para GOL/LAT/ZAG/MEI/ATA:
    # titulares faltantes + 1 reserva.
    #
    # Para TEC:
    # apenas titulares faltantes.
    # ==================================================

    necessidades = {}

    for posicao in ORDEM_POSICOES:

        titulares_necessarios = (
            estrutura.get(
                posicao,
                0
            )
        )

        titulares_atuais = (
            quantidade_atual.get(
                posicao,
                0
            )
        )

        faltam_titulares = max(

            0,

            titulares_necessarios -
            titulares_atuais

        )

        reserva = (

            1

            if posicao in POSICOES_BANCO

            else 0

        )

        necessidades[
            posicao
        ] = (
            faltam_titulares +
            reserva
        )


    custo_minimo = 0

    for posicao, quantidade in (
        necessidades.items()
    ):

        if quantidade <= 0:

            continue

        disponiveis = (
            candidatos_disponiveis_posicao(

                candidatos,
                posicao,
                ids_usados

            )
        )

        if len(
            disponiveis
        ) < quantidade:

            return None

        disponiveis.sort(

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

        escolhidos = disponiveis[
            :quantidade
        ]

        custo_minimo += sum(

            numero(
                jogador.get(
                    "preco"
                )
            )

            for jogador in escolhidos

        )

    return round(
        custo_minimo,
        2
    )


# ======================================================
# CUSTO MÍNIMO DO BANCO
# ======================================================

def calcular_custo_minimo_banco(
    candidatos,
    titulares
):

    ids_titulares = {

        jogador.get(
            "id"
        )

        for jogador in titulares

    }

    custo = 0

    for posicao in POSICOES_BANCO:

        disponiveis = (
            candidatos_disponiveis_posicao(

                candidatos,
                posicao,
                ids_titulares

            )
        )

        if not disponiveis:

            return None

        jogador = min(

            disponiveis,

            key=lambda item: (

                numero(
                    item.get(
                        "preco"
                    )
                ),

                -numero(
                    item.get(
                        "nota"
                    )
                )

            )

        )

        custo += numero(
            jogador.get(
                "preco"
            )
        )

    return round(
        custo,
        2
    )


# ======================================================
# SELEÇÃO POR POSIÇÃO
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
            patrimonio + 0.000001

        ):

            continue


        # ==============================================
        # V4:
        # Simular escolha antes de confirmar.
        # ==============================================

        if patrimonio is not None:

            titulares_simulados = [

                *selecionados,
                jogador

            ]

            reserva_futura = (
                calcular_reserva_minima_futura(

                    candidatos,
                    formacao,
                    titulares_simulados

                )
            )

            if reserva_futura is None:

                continue

            if (

                novo_custo +
                reserva_futura >

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
# MONTAGEM DO TIME
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
        ) ==
        quantidade_esperada

    )

    reserva_minima_banco = (
        calcular_custo_minimo_banco(

            candidatos,
            titulares

        )
    )

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

        "reservaMinimaBanco":
            reserva_minima_banco

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

def montar_banco(
    candidatos,
    titulares,
    limite_banco=None
):

    ids_titulares = {

        jogador[
            "id"
        ]

        for jogador in titulares

    }

    candidatos_por_posicao = []

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
                ]

            ),

            reverse=True

        )

        if not disponiveis:

            return []

        candidatos_por_posicao.append(
            disponiveis
        )

    if limite_banco is None:

        return [

            lista[
                0
            ]

            for lista in candidatos_por_posicao

        ]


    # ==================================================
    # Otimização do banco dentro do saldo disponível.
    # ==================================================

    limite_centavos = max(

        0,

        int(
            round(
                numero(
                    limite_banco
                ) * 100
            )
        )

    )

    estados = {

        0: {

            "nota": 0.0,
            "media5": 0.0,
            "jogos": 0,
            "jogadores": []

        }

    }

    for lista_posicao in candidatos_por_posicao:

        proximos = {}

        for custo_anterior, estado in (
            estados.items()
        ):

            for jogador in lista_posicao:

                preco_centavos = max(

                    0,

                    int(
                        round(
                            numero(
                                jogador.get(
                                    "preco"
                                )
                            ) * 100
                        )
                    )

                )

                novo_custo = (
                    custo_anterior +
                    preco_centavos
                )

                if novo_custo > limite_centavos:

                    continue

                candidato = {

                    "nota":
                        estado[
                            "nota"
                        ] +
                        numero(
                            jogador.get(
                                "nota"
                            )
                        ),

                    "media5":
                        estado[
                            "media5"
                        ] +
                        numero(
                            jogador.get(
                                "metricas",
                                {}
                            ).get(
                                "media5"
                            )
                        ),

                    "jogos":
                        estado[
                            "jogos"
                        ] +
                        inteiro(
                            jogador.get(
                                "metricas",
                                {}
                            ).get(
                                "jogos"
                            ),
                            0
                        ),

                    "jogadores": [

                        *estado[
                            "jogadores"
                        ],

                        jogador

                    ]

                }

                atual = proximos.get(
                    novo_custo
                )

                if (

                    atual is None

                    or

                    (
                        candidato[
                            "nota"
                        ],
                        candidato[
                            "media5"
                        ],
                        candidato[
                            "jogos"
                        ]
                    )

                    >

                    (
                        atual[
                            "nota"
                        ],
                        atual[
                            "media5"
                        ],
                        atual[
                            "jogos"
                        ]
                    )

                ):

                    proximos[
                        novo_custo
                    ] = candidato

        estados = proximos

        if not estados:

            return []

    melhor_custo, melhor = max(

        estados.items(),

        key=lambda item: (

            item[1][
                "nota"
            ],

            item[1][
                "media5"
            ],

            item[1][
                "jogos"
            ],

            -item[0]

        )

    )

    del melhor_custo

    return melhor[
        "jogadores"
    ]


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
# SERIALIZAÇÃO SEGURA
# ======================================================

def serializar_jogador(
    jogador
):

    if jogador is None:

        return None

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
                jogador[
                    "metricas"
                ][
                    "jogos"
                ],

            "media":
                jogador[
                    "metricas"
                ][
                    "media"
                ],

            "media3":
                jogador[
                    "metricas"
                ][
                    "media3"
                ],

            "media5":
                jogador[
                    "metricas"
                ][
                    "media5"
                ],

            "mediana":
                jogador[
                    "metricas"
                ][
                    "mediana"
                ],

            "piso":
                jogador[
                    "metricas"
                ][
                    "piso"
                ],

            "teto":
                jogador[
                    "metricas"
                ][
                    "teto"
                ],

            "regularidade":
                jogador[
                    "metricas"
                ][
                    "regularidade"
                ],

            "volatilidade":
                jogador[
                    "metricas"
                ][
                    "volatilidade"
                ],

            "tendencia":
                jogador[
                    "metricas"
                ][
                    "tendencia"
                ]

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
        set(ids)
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

        if quantidade > (
            LIMITE_JOGADORES_CLUBE
        ):

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
        len(banco) ==
        len(POSICOES_BANCO)
        and
        posicoes_banco !=
        set(POSICOES_BANCO)
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
        set(ids) &
        ids_banco
    ):

        erros.append(
            "titular_repetido_no_banco"
        )

    limite_patrimonio = estrategia.get(
        "limitePatrimonio"
    )

    custo_total = numero(
        estrategia.get(
            "custoTotal"
        )
    )

    if (

        limite_patrimonio is not None

        and

        custo_total >
        numero(
            limite_patrimonio
        ) + 0.000001

    ):

        erros.append(
            "patrimonio_excedido"
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
# GERAÇÃO DA RODADA
# ======================================================

def gerar_rodada(
    rodada
):

    rodada_limite = (
        rodada -
        1
    )

    historico = (
        construir_historico_ate(
            rodada_limite
        )
    )

    limite_patrimonio_global = (
        obter_limite_patrimonio()
    )

    resultado = {

        "modelo":
            "historico_escalacoes_v4",

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
            True,

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

        saldo_para_banco = (

            None

            if limite_patrimonio is None

            else max(

                0,

                limite_patrimonio -
                custo_titulares

            )

        )

        banco = montar_banco(

            candidatos,
            titulares,
            saldo_para_banco

        )

        custo_banco = sum(

            numero(
                jogador.get(
                    "preco"
                )
            )

            for jogador in banco

        )

        custo_total = (
            custo_titulares +
            custo_banco
        )

        saldo_final = (

            None

            if limite_patrimonio is None

            else (
                limite_patrimonio -
                custo_total
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
            ) ==
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

            "reservaMinimaBanco":
                time.get(
                    "reservaMinimaBanco"
                ),

            "custoTitulares":
                round(
                    custo_titulares,
                    2
                ),

            "custoBanco":
                round(
                    custo_banco,
                    2
                ),

            "custoTotal":
                round(
                    custo_total,
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

        auditoria = (
            auditar_estrategia(
                registro
            )
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
            True,

        "reservaTitularesFuturos":
            True

    }

    return resultado


# ======================================================
# PROCESSAMENTO PRINCIPAL
# ======================================================

def processar():

    PASTA_SAIDA.mkdir(
        parents=True,
        exist_ok=True
    )

    rodada_maxima = (
        descobrir_rodada_maxima()
    )

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "HISTÓRICO PROGRESSIVO DE ESCALAÇÕES V4"
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
        "Proteção financeira:",
        "titulares futuros + banco"
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

    indice = {

        "modelo":
            "historico_escalacoes_indice_v4",

        "descricao":
            (
                "Índice do histórico progressivo "
                "de escalações sem vazamento futuro "
                "e com proteção financeira completa."
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
                True,

            "reservaTitularesFuturos":
                True,

            "reservaMinimaBanco":
                True

        }

    }

    salvar_json(

        PASTA_SAIDA /
        "indice.json",

        indice

    )

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
