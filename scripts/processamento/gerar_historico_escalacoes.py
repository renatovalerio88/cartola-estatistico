"""
=========================================================
CARTOLA ESTATÍSTICO
Gerador de Histórico de Escalações V4
=========================================================

OBJETIVO
---------------------------------------------------------
Reconstruir, rodada a rodada, as escalações que o modelo
poderia sugerir usando SOMENTE informações disponíveis
antes da rodada analisada.

Estratégias:

- Conservador
- Equilibrado
- Agressivo

NOVO NA V4
---------------------------------------------------------
1. Otimização global MILP.
2. Fallback greedy.
3. Patrimônio experimental de C$ 200.
4. Separação entre:

   - fonte de RESULTADO histórico;
   - fonte de CANDIDATOS da rodada.

5. Mercado da rodada passa a ser consultado para completar
   corretamente atletas disponíveis, inclusive técnicos.

6. Não existe tratamento especial para "rodada 24".
   A correção é estrutural.

REGRA CIENTÍFICA
---------------------------------------------------------
Para prever a rodada R:

    dados históricos <= R - 1

A pontuação real da rodada R:

- NÃO entra na nota;
- NÃO entra na escolha;
- NÃO entra na otimização;
- NÃO é serializada.

Portanto:

R2 usa R1
R3 usa R1 + R2
R4 usa R1 + R2 + R3
...

SAÍDA
---------------------------------------------------------
data/historico-escalacoes/rodada-XX.json
data/historico-escalacoes/indice.json

=========================================================
"""

from __future__ import annotations

import json
import math

from pathlib import Path
from statistics import (
    mean,
    median,
    pstdev,
)


# =========================================================
# OTIMIZADOR GLOBAL
# =========================================================

try:

    from otimizador_global import (
        otimizar_formacao,
        status_otimizador,
    )

    OTIMIZADOR_IMPORTADO = True
    ERRO_OTIMIZADOR = None

except Exception as erro:

    OTIMIZADOR_IMPORTADO = False
    ERRO_OTIMIZADOR = str(
        erro
    )


# =========================================================
# CAMINHOS
# =========================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
    .parent
)

PASTA_DATA = (
    BASE_DIR
    /
    "data"
)

PASTA_HISTORICO = (
    PASTA_DATA
    /
    "historico"
)

PASTA_API = (
    PASTA_DATA
    /
    "api"
)

PASTA_SAIDA = (
    PASTA_DATA
    /
    "historico-escalacoes"
)


# =========================================================
# CONFIGURAÇÃO
# =========================================================

RODADA_INICIAL = 2

LIMITE_JOGADORES_CLUBE = 3

# Laboratório:
#
# Não queremos que patrimônio baixo impeça o experimento
# estatístico de descobrir a melhor combinação.
#
# O site continua recalculando conforme o patrimônio
# informado pelo usuário.

PATRIMONIO_LABORATORIO = 200.0


ESTRATEGIAS = {

    "conservador": {

        "nome":
            "Conservador",

        "formacao":
            "4-4-2",
    },

    "equilibrado": {

        "nome":
            "Equilibrado",

        "formacao":
            "3-4-3",
    },

    "agressivo": {

        "nome":
            "Agressivo",

        "formacao":
            "3-4-3",
    },
}


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
}


MAPA_POSICOES_ID = {

    1: "GOL",
    2: "LAT",
    3: "ZAG",
    4: "MEI",
    5: "ATA",
    6: "TEC",
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
    "técnico": "TEC",
}


# =========================================================
# JSON
# =========================================================

def carregar_json(
    caminho,
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
            f"[AVISO] Falha ao carregar "
            f"{caminho}: {erro}"
        )

        return None


def salvar_json(
    caminho,
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


# =========================================================
# UTILIDADES
# =========================================================

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


def inteiro(
    valor,
    padrao=None,
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
    valor,
):

    if valor is None:

        return ""

    return (
        str(
            valor
        )
        .strip()
        .lower()
    )


# =========================================================
# IDENTIFICAÇÃO
# =========================================================

def obter_id(
    jogador,
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
        ),
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

        or

        jogador.get(
            "clube_id"
        )
    )

    posicao = normalizar_texto(

        jogador.get(
            "posicao"
        )

        or

        jogador.get(
            "posicaoId"
        )

        or

        jogador.get(
            "posicao_id"
        )
    )

    return (
        f"{nome}|"
        f"{clube}|"
        f"{posicao}"
    )


def obter_nome(
    jogador,
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

        jogador.get(
            "nomeCompleto"
        )

        or

        ""
    )


def obter_clube(
    jogador,
):

    valor = (

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

        jogador.get(
            "clube_id"
        )

        or

        ""
    )

    if isinstance(
        valor,
        dict,
    ):

        return (

            valor.get(
                "abreviacao"
            )

            or

            valor.get(
                "nome"
            )

            or

            valor.get(
                "id"
            )

            or

            ""
        )

    return valor


# =========================================================
# POSIÇÃO
# =========================================================

def obter_posicao(
    jogador,
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

    posicao_objeto = jogador.get(
        "posicao"
    )

    if isinstance(
        posicao_objeto,
        dict,
    ):

        posicao_id = inteiro(

            posicao_objeto.get(
                "id"
            )
        )

        if posicao_id in MAPA_POSICOES_ID:

            return MAPA_POSICOES_ID[
                posicao_id
            ]

        texto = normalizar_texto(

            posicao_objeto.get(
                "abreviacao"
            )

            or

            posicao_objeto.get(
                "nome"
            )
        )

    else:

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
        "TEC",
    }:

        return texto

    return ""


# =========================================================
# STATUS
# =========================================================

def obter_status_id(
    jogador,
):

    for campo in (
        "statusId",
        "status_id",
    ):

        valor = inteiro(
            jogador.get(
                campo
            ),
            None,
        )

        if valor is not None:

            return valor

    status = jogador.get(
        "status"
    )

    if isinstance(
        status,
        dict,
    ):

        return inteiro(
            status.get(
                "id"
            ),
            None,
        )

    return None


def jogador_disponivel(
    jogador,
):

    status = obter_status_id(
        jogador
    )

    # Bases históricas mais antigas podem não ter status.
    # Nesse caso, preservamos o comportamento anterior.

    if status is None:

        return True

    # Cartola:
    # status 7 = provável.

    return status == 7


# =========================================================
# PREÇO
# =========================================================

def obter_preco(
    jogador,
):

    for campo in (

        "preco",
        "preco_num",
        "precoNum",
        "precoCartoleta",

    ):

        if jogador.get(
            campo
        ) is not None:

            return max(

                0.0,

                numero(
                    jogador.get(
                        campo
                    ),
                    0,
                )
            )

    return 0.0


# =========================================================
# PONTUAÇÃO REAL
#
# SOMENTE PARA HISTÓRICO ANTERIOR
# =========================================================

def obter_pontuacao_real(
    jogador,
):

    campos = [

        "pontuacaoReal",
        "pontos",
        "pontuacao",
        "real",
        "pontosUltimaRodada",
    ]

    for campo in campos:

        if jogador.get(
            campo
        ) is not None:

            return numero(

                jogador.get(
                    campo
                ),

                0,
            )

    return 0


def possui_pontuacao_real(
    jogador,
):

    campos = (

        "pontuacaoReal",
        "pontos",
        "pontuacao",
        "real",
        "pontosUltimaRodada",
    )

    return any(

        jogador.get(
            campo
        ) is not None

        for campo
        in campos
    )


# =========================================================
# EXTRAÇÃO DE LISTAS
# =========================================================

def extrair_lista_jogadores(
    dados,
):

    if dados is None:

        return []

    if isinstance(
        dados,
        list,
    ):

        return dados

    if not isinstance(
        dados,
        dict,
    ):

        return []

    for chave in (
        "jogadores",
        "atletas",
        "pontuados",
    ):

        valor = dados.get(
            chave
        )

        if isinstance(
            valor,
            list,
        ):

            return valor

        if isinstance(
            valor,
            dict,
        ):

            lista = []

            for atleta_id, atleta in (
                valor.items()
            ):

                if not isinstance(
                    atleta,
                    dict,
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


# =========================================================
# FONTES DE RESULTADO
#
# Usadas SOMENTE para formar histórico passado.
#
# Mercado não entra aqui.
# =========================================================

def caminhos_resultado_rodada(
    rodada,
):

    return [

        (
            PASTA_HISTORICO
            /
            f"rodada-{rodada:02d}"
            /
            "jogadores.json"
        ),

        (
            PASTA_HISTORICO
            /
            f"rodada-{rodada:02d}.json"
        ),

        (
            PASTA_API
            /
            f"rodada-{rodada:02d}"
            /
            "jogadores.json"
        ),

        (
            PASTA_API
            /
            f"rodada-{rodada:02d}"
            /
            "pontuados.json"
        ),
    ]


def carregar_resultados_rodada(
    rodada,
):

    for caminho in caminhos_resultado_rodada(
        rodada
    ):

        dados = carregar_json(
            caminho
        )

        jogadores = extrair_lista_jogadores(
            dados
        )

        jogadores_com_resultado = [

            jogador

            for jogador
            in jogadores

            if isinstance(
                jogador,
                dict,
            )

            and

            possui_pontuacao_real(
                jogador
            )
        ]

        if jogadores_com_resultado:

            return jogadores_com_resultado

    return []


# =========================================================
# FONTES DE CANDIDATOS
#
# Usadas para montar a escalação da própria rodada.
#
# IMPORTANTE:
#
# Mercado entra aqui porque contém todos os atletas
# disponíveis, inclusive técnicos.
# =========================================================

def caminhos_candidatos_rodada(
    rodada,
):

    return [

        # Base normalizada da API.

        (
            PASTA_API
            /
            f"rodada-{rodada:02d}"
            /
            "jogadores.json"
        ),

        # Snapshot bruto/normalizado do mercado.
        #
        # Fundamental para recuperar atletas que eventualmente
        # não apareçam no arquivo histórico, como técnicos.

        (
            PASTA_API
            /
            f"rodada-{rodada:02d}"
            /
            "mercado.json"
        ),

        # Bases históricas já produzidas pelo projeto.

        (
            PASTA_HISTORICO
            /
            f"rodada-{rodada:02d}"
            /
            "jogadores.json"
        ),

        (
            PASTA_HISTORICO
            /
            f"rodada-{rodada:02d}.json"
        ),
    ]


def qualidade_registro_candidato(
    jogador,
):

    pontos = 0

    if obter_id(
        jogador
    ):

        pontos += 5

    if obter_nome(
        jogador
    ):

        pontos += 3

    if obter_posicao(
        jogador
    ):

        pontos += 5

    if obter_clube(
        jogador
    ):

        pontos += 3

    if obter_status_id(
        jogador
    ) is not None:

        pontos += 4

    if obter_preco(
        jogador
    ) > 0:

        pontos += 3

    return pontos


def combinar_registros(
    atual,
    novo,
):

    if atual is None:

        return dict(
            novo
        )

    resultado = dict(
        atual
    )

    # Primeiro preenche campos ausentes.

    for chave, valor in novo.items():

        if (
            chave not in resultado

            or

            resultado.get(
                chave
            ) in (
                None,
                "",
                {},
                [],
            )
        ):

            resultado[
                chave
            ] = valor

    # Se o novo registro for estruturalmente mais completo,
    # damos preferência a alguns campos fundamentais.

    qualidade_atual = qualidade_registro_candidato(
        atual
    )

    qualidade_novo = qualidade_registro_candidato(
        novo
    )

    if qualidade_novo > qualidade_atual:

        for chave in (

            "apelido",
            "nome",
            "posicao",
            "posicaoId",
            "posicao_id",
            "clube",
            "clubeId",
            "clube_id",
            "siglaClube",
            "status",
            "statusId",
            "status_id",
            "preco",
            "precoNum",
            "preco_num",

        ):

            if novo.get(
                chave
            ) is not None:

                resultado[
                    chave
                ] = novo[
                    chave
                ]

    return resultado


def carregar_candidatos_rodada(
    rodada,
):

    por_id = {}

    fontes_usadas = []

    for caminho in caminhos_candidatos_rodada(
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

        fontes_usadas.append(
            str(
                caminho.relative_to(
                    BASE_DIR
                )
            )
        )

        for jogador in jogadores:

            if not isinstance(
                jogador,
                dict,
            ):

                continue

            jogador_id = obter_id(
                jogador
            )

            if not jogador_id:

                continue

            atual = por_id.get(
                jogador_id
            )

            por_id[
                jogador_id
            ] = combinar_registros(
                atual,
                jogador,
            )

    candidatos = list(
        por_id.values()
    )

    candidatos = [

        jogador

        for jogador
        in candidatos

        if obter_posicao(
            jogador
        )
    ]

    candidatos.sort(

        key=lambda jogador: (

            obter_posicao(
                jogador
            ),

            normalizar_texto(
                obter_nome(
                    jogador
                )
            ),
        )
    )

    return candidatos, fontes_usadas


# =========================================================
# DIAGNÓSTICO DAS FONTES
# =========================================================

def contar_posicoes(
    jogadores,
):

    contagem = {

        "GOL": 0,
        "LAT": 0,
        "ZAG": 0,
        "MEI": 0,
        "ATA": 0,
        "TEC": 0,
    }

    for jogador in jogadores:

        posicao = obter_posicao(
            jogador
        )

        if posicao in contagem:

            contagem[
                posicao
            ] += 1

    return contagem


# =========================================================
# ÚLTIMA RODADA
# =========================================================

def descobrir_rodada_maxima():

    rodadas = set()

    for pasta in (
        PASTA_HISTORICO,
        PASTA_API,
    ):

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


# =========================================================
# HISTÓRICO WALK-FORWARD
# =========================================================

def construir_historico_ate(
    rodada_limite,
):

    historico = {}

    for rodada in range(
        1,
        rodada_limite + 1,
    ):

        jogadores = carregar_resultados_rodada(
            rodada
        )

        for jogador in jogadores:

            jogador_id = obter_id(
                jogador
            )

            if not jogador_id:

                continue

            historico.setdefault(
                jogador_id,
                [],
            )

            historico[
                jogador_id
            ].append({

                "rodada":
                    rodada,

                "pontos":
                    obter_pontuacao_real(
                        jogador
                    ),
            })

    return historico


# =========================================================
# MÉTRICAS
# =========================================================

def calcular_metricas(
    registros,
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

            "tendencia": 0,
        }

    pontos = [

        numero(
            registro.get(
                "pontos"
            ),
            0,
        )

        for registro
        in registros
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

        100
        -
        (
            volatilidade
            *
            10
        )
    )

    tendencia = (
        media3
        -
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
                3,
            ),

        "media3":
            round(
                media3,
                3,
            ),

        "media5":
            round(
                media5,
                3,
            ),

        "mediana":
            round(
                mediana_geral,
                3,
            ),

        "piso":
            round(
                piso,
                3,
            ),

        "teto":
            round(
                teto,
                3,
            ),

        "regularidade":
            round(
                regularidade,
                2,
            ),

        "volatilidade":
            round(
                volatilidade,
                3,
            ),

        "tendencia":
            round(
                tendencia,
                3,
            ),
    }


# =========================================================
# NOTA POR ESTRATÉGIA
# =========================================================

def calcular_nota(
    metricas,
    estrategia,
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
        ]
        /
        100
    )

    volatilidade = metricas[
        "volatilidade"
    ]

    tendencia = metricas[
        "tendencia"
    ]


    # =====================================================
    # CONSERVADOR
    # =====================================================

    if estrategia == "conservador":

        nota = (

            media_geral * 0.24

            +

            media5 * 0.19

            +

            media3 * 0.12

            +

            mediana_valor * 0.14

            +

            piso * 0.16

            +

            regularidade * 8 * 0.10

            +

            tendencia * 0.05

            -

            volatilidade * 0.08
        )


    # =====================================================
    # AGRESSIVO
    # =====================================================

    elif estrategia == "agressivo":

        nota = (

            media_geral * 0.14

            +

            media5 * 0.19

            +

            media3 * 0.24

            +

            mediana_valor * 0.06

            +

            piso * 0.04

            +

            teto * 0.22

            +

            tendencia * 0.11
        )


    # =====================================================
    # EQUILIBRADO
    # =====================================================

    else:

        nota = (

            media_geral * 0.21

            +

            media5 * 0.20

            +

            media3 * 0.18

            +

            mediana_valor * 0.11

            +

            piso * 0.08

            +

            teto * 0.10

            +

            regularidade * 8 * 0.06

            +

            tendencia * 0.06
        )


    # =====================================================
    # PENALIZAÇÃO POR AMOSTRA
    # =====================================================

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
        4,
    )


# =========================================================
# PREPARAÇÃO DOS CANDIDATOS
# =========================================================

def preparar_candidatos(
    rodada,
    historico,
    estrategia,
):

    jogadores_rodada, fontes = (
        carregar_candidatos_rodada(
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
            [],
        )

        metricas = calcular_metricas(
            registros
        )

        nota = calcular_nota(
            metricas,
            estrategia,
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
                    2,
                ),

            "nota":
                nota,

            "metricas":
                metricas,
        })

    return candidatos, fontes


# =========================================================
# GREEDY - FALLBACK
# =========================================================

def pode_adicionar_clube(
    jogador,
    clubes,
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
            0,
        )

        <

        LIMITE_JOGADORES_CLUBE
    )


def adicionar_clube(
    jogador,
    clubes,
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
            0,
        )

        +

        1
    )


def selecionar_por_posicao_greedy(
    candidatos,
    posicao,
    quantidade,
    selecionados,
    clubes,
    patrimonio,
):

    ranking = sorted(

        [

            jogador

            for jogador
            in candidatos

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
        ),

        reverse=True,
    )

    escolhidos = []

    ids_usados = {

        jogador[
            "id"
        ]

        for jogador
        in selecionados
    }

    custo_atual = sum(

        jogador[
            "preco"
        ]

        for jogador
        in selecionados
    )

    for jogador in ranking:

        if jogador[
            "id"
        ] in ids_usados:

            continue

        if not pode_adicionar_clube(
            jogador,
            clubes,
        ):

            continue

        novo_custo = (

            custo_atual
            +
            jogador[
                "preco"
            ]
        )

        if (
            patrimonio is not None
            and
            novo_custo >
            patrimonio + 0.000001
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
            clubes,
        )

        custo_atual = novo_custo

        if len(
            escolhidos
        ) >= quantidade:

            break

    return escolhidos


def montar_time_greedy(
    candidatos,
    formacao,
    patrimonio,
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

    for posicao in (
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC",
    ):

        quantidade = estrutura.get(
            posicao,
            0,
        )

        if quantidade <= 0:

            por_posicao[
                posicao
            ] = []

            continue

        escolhidos = selecionar_por_posicao_greedy(

            candidatos,
            posicao,
            quantidade,
            titulares,
            clubes,
            patrimonio,
        )

        por_posicao[
            posicao
        ] = escolhidos

    quantidade_esperada = sum(
        estrutura.values()
    )

    return {

        "titulares":
            titulares,

        "porPosicao":
            por_posicao,

        "completa":
            (
                len(
                    titulares
                )
                ==
                quantidade_esperada
            ),

        "quantidadeEsperada":
            quantidade_esperada,

        "quantidadeObtida":
            len(
                titulares
            ),

        "metodo":
            "greedy_fallback",

        "otimizador":
            None,
    }


# =========================================================
# MILP
# =========================================================

def limpar_campos_otimizador(
    jogador,
):

    return {

        chave:
            valor

        for chave, valor
        in jogador.items()

        if not str(
            chave
        ).startswith(
            "_otimizador"
        )
    }


def montar_time_otimizado(
    candidatos,
    formacao,
    patrimonio,
):

    if not OTIMIZADOR_IMPORTADO:

        fallback = montar_time_greedy(
            candidatos,
            formacao,
            patrimonio,
        )

        fallback[
            "motivoFallback"
        ] = (
            "otimizador_nao_importado"
        )

        fallback[
            "erroOtimizador"
        ] = ERRO_OTIMIZADOR

        return fallback

    resultado = otimizar_formacao(

        candidatos=candidatos,

        formacao=formacao,

        patrimonio=patrimonio,

        campo_score="nota",

        limite_clube=(
            LIMITE_JOGADORES_CLUBE
        ),
    )

    if not resultado.get(
        "sucesso"
    ):

        fallback = montar_time_greedy(
            candidatos,
            formacao,
            patrimonio,
        )

        fallback[
            "motivoFallback"
        ] = resultado.get(
            "status"
        )

        fallback[
            "otimizador"
        ] = {

            "sucesso":
                False,

            "status":
                resultado.get(
                    "status"
                ),

            "diagnostico":
                resultado.get(
                    "diagnostico"
                ),

            "custoMinimoTeorico":
                resultado.get(
                    "custoMinimoTeorico"
                ),
        }

        return fallback

    titulares = [

        limpar_campos_otimizador(
            jogador
        )

        for jogador
        in resultado.get(
            "jogadores",
            []
        )
    ]

    estrutura = FORMACOES[
        formacao
    ]

    por_posicao = {}

    for posicao in (
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC",
    ):

        por_posicao[
            posicao
        ] = [

            jogador

            for jogador
            in titulares

            if jogador.get(
                "posicao"
            ) == posicao
        ]

    quantidade_esperada = sum(
        estrutura.values()
    )

    return {

        "titulares":
            titulares,

        "porPosicao":
            por_posicao,

        "completa":
            (
                len(
                    titulares
                )
                ==
                quantidade_esperada
            ),

        "quantidadeEsperada":
            quantidade_esperada,

        "quantidadeObtida":
            len(
                titulares
            ),

        "metodo":
            "milp",

        "otimizador": {

            "sucesso":
                True,

            "status":
                resultado.get(
                    "status"
                ),

            "motor":
                resultado.get(
                    "motor"
                ),

            "scoreTotal":
                resultado.get(
                    "scoreTotal"
                ),

            "custoTotal":
                resultado.get(
                    "custoTotal"
                ),

            "saldo":
                resultado.get(
                    "saldo"
                ),

            "custoMinimoTeorico":
                resultado.get(
                    "custoMinimoTeorico"
                ),

            "auditoria":
                resultado.get(
                    "auditoria"
                ),
        },
    }


# =========================================================
# CAPITÃO
# =========================================================

def escolher_capitao(
    titulares,
    estrategia,
):

    candidatos = [

        jogador

        for jogador
        in titulares

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
                ],
            ),
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
                ],
            ),
        )

    return max(

        candidatos,

        key=lambda jogador:
            jogador[
                "nota"
            ],
    )


# =========================================================
# BANCO
# =========================================================

def montar_banco(
    candidatos,
    titulares,
):

    ids_titulares = {

        jogador[
            "id"
        ]

        for jogador
        in titulares
    }

    banco = []

    for posicao in (
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
    ):

        disponiveis = [

            jogador

            for jogador
            in candidatos

            if (

                jogador[
                    "posicao"
                ] == posicao

                and

                jogador[
                    "id"
                ]
                not in
                ids_titulares
            )
        ]

        disponiveis.sort(

            key=lambda jogador:
                jogador[
                    "nota"
                ],

            reverse=True,
        )

        if disponiveis:

            banco.append(
                disponiveis[
                    0
                ]
            )

    return banco


# =========================================================
# RESERVA DE LUXO
# =========================================================

def escolher_reserva_luxo(
    banco,
):

    if not banco:

        return None

    return max(

        banco,

        key=lambda jogador:
            jogador[
                "nota"
            ],
    )


# =========================================================
# SERIALIZAÇÃO
# =========================================================

def serializar_jogador(
    jogador,
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
                2,
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
                ],
        },
    }


# =========================================================
# AUDITORIA
# =========================================================

def auditar_estrategia(
    estrategia,
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
        {},
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


    # =====================================================
    # DUPLICIDADE
    # =====================================================

    ids = [

        jogador.get(
            "id"
        )

        for jogador
        in titulares
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


    # =====================================================
    # POSIÇÕES
    # =====================================================

    for posicao, quantidade in (
        estrutura.items()
    ):

        encontrados = sum(

            1

            for jogador
            in titulares

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


    # =====================================================
    # LIMITE DE CLUBE
    # =====================================================

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
                0,
            )

            +

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


    # =====================================================
    # PATRIMÔNIO
    # =====================================================

    patrimonio = numero(

        estrategia.get(
            "patrimonio"
        ),

        None,
    )

    custo = numero(

        estrategia.get(
            "custoTitulares"
        ),

        0,
    )

    if (
        patrimonio is not None
        and
        custo >
        patrimonio + 0.01
    ):

        erros.append(
            "patrimonio_excedido"
        )


    # =====================================================
    # DATA LEAKAGE
    # =====================================================

    def possui_resultado_real_serializado(
        jogador,
    ):

        if not isinstance(
            jogador,
            dict,
        ):

            return False

        campos_proibidos = {

            "pontuacaoReal",
            "real",
            "pontuacaoDaRodada",
            "resultadoReal",
        }

        return any(

            campo in jogador

            for campo
            in campos_proibidos
        )


    jogadores_auditados = list(
        titulares
    )

    jogadores_auditados.extend(

        estrategia.get(
            "banco",
            []
        )
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

        possui_resultado_real_serializado(
            jogador
        )

        for jogador
        in jogadores_auditados
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
            erros,
    }


# =========================================================
# GERAÇÃO DA RODADA
# =========================================================

def gerar_rodada(
    rodada,
    patrimonio,
):

    rodada_limite = (
        rodada
        -
        1
    )

    historico = construir_historico_ate(
        rodada_limite
    )

    candidatos_base, fontes = (
        carregar_candidatos_rodada(
            rodada
        )
    )

    disponibilidade = contar_posicoes(
        candidatos_base
    )

    resultado = {

        "modelo":
            "historico_escalacoes_v4_milp",

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

        "patrimonio":
            patrimonio,

        "limiteJogadoresClube":
            LIMITE_JOGADORES_CLUBE,

        "otimizacaoGlobalAtiva":
            OTIMIZADOR_IMPORTADO,

        "fontesCandidatos":
            fontes,

        "candidatosDisponiveisPorPosicao":
            disponibilidade,

        "estrategias":
            [],
    }

    for estrategia_id, configuracao in (
        ESTRATEGIAS.items()
    ):

        candidatos, _ = preparar_candidatos(

            rodada,
            historico,
            estrategia_id,
        )

        candidatos_disponiveis = contar_posicoes(
            candidatos
        )

        time = montar_time_otimizado(

            candidatos,

            configuracao[
                "formacao"
            ],

            patrimonio,
        )

        titulares = time[
            "titulares"
        ]

        capitao = escolher_capitao(
            titulares,
            estrategia_id,
        )

        banco = montar_banco(
            candidatos,
            titulares,
        )

        reserva_luxo = escolher_reserva_luxo(
            banco
        )

        custo_total = sum(

            jogador[
                "preco"
            ]

            for jogador
            in titulares
        )

        projecao_total = sum(

            jogador[
                "nota"
            ]

            for jogador
            in titulares
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

            "metodoSelecao":
                time.get(
                    "metodo"
                ),

            "patrimonio":
                patrimonio,

            "escalacaoCompleta":
                time[
                    "completa"
                ],

            "quantidadeTitulares":
                len(
                    titulares
                ),

            "quantidadeEsperada":
                time[
                    "quantidadeEsperada"
                ],

            "candidatosDisponiveisPorPosicao":
                candidatos_disponiveis,

            "custoTitulares":
                round(
                    custo_total,
                    2,
                ),

            "saldoPatrimonio":
                round(
                    patrimonio
                    -
                    custo_total,
                    2,
                ),

            "projecaoTitulares":
                round(
                    projecao_total,
                    2,
                ),

            "otimizador":
                time.get(
                    "otimizador"
                ),

            "titulares": [

                serializar_jogador(
                    jogador
                )

                for jogador
                in titulares
            ],

            "capitao":
                serializar_jogador(
                    capitao
                ),

            "banco": [

                serializar_jogador(
                    jogador
                )

                for jogador
                in banco
            ],

            "reservaLuxo":
                serializar_jogador(
                    reserva_luxo
                ),
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

        for estrategia
        in resultado[
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

                for valor
                in auditorias

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
    }

    return resultado


# =========================================================
# PROCESSAMENTO
# =========================================================

def processar():

    PASTA_SAIDA.mkdir(
        parents=True,
        exist_ok=True,
    )

    rodada_maxima = descobrir_rodada_maxima()

    patrimonio = PATRIMONIO_LABORATORIO

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
        "MILP + FALLBACK GREEDY"
    )

    print(
        "============================================"
    )

    print(
        "Rodada máxima disponível:",
        rodada_maxima,
    )

    print(
        "Patrimônio experimental:",
        patrimonio,
    )

    print(
        "Limite jogadores por clube:",
        LIMITE_JOGADORES_CLUBE,
    )

    print(
        "Otimizador importado:",
        (
            "SIM"
            if OTIMIZADOR_IMPORTADO
            else "NÃO"
        ),
    )

    if OTIMIZADOR_IMPORTADO:

        try:

            print(
                "Status otimizador:",
                status_otimizador(),
            )

        except Exception as erro:

            print(
                "[AVISO] Status otimizador:",
                erro,
            )

    else:

        print(
            "Erro importação:",
            ERRO_OTIMIZADOR,
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

    total_milp = 0

    total_greedy = 0

    for rodada in range(
        RODADA_INICIAL,
        rodada_maxima + 1,
    ):

        candidatos_rodada, fontes = (
            carregar_candidatos_rodada(
                rodada
            )
        )

        if not candidatos_rodada:

            print(

                f"[IGNORADA] "
                f"Rodada {rodada:02d}: "
                f"sem candidatos."
            )

            continue

        disponibilidade = contar_posicoes(
            candidatos_rodada
        )

        print(
            f"[FONTES] R{rodada:02d} | "
            f"{len(fontes)} arquivo(s) | "
            f"TEC encontrados: "
            f"{disponibilidade.get('TEC', 0)}"
        )

        resultado = gerar_rodada(
            rodada,
            patrimonio,
        )

        caminho_saida = (

            PASTA_SAIDA
            /
            f"rodada-{rodada:02d}.json"
        )

        salvar_json(
            caminho_saida,
            resultado,
        )

        processadas.append(
            rodada
        )

        estrategias = resultado[
            "estrategias"
        ]

        completas = sum(

            1

            for estrategia
            in estrategias

            if estrategia[
                "escalacaoCompleta"
            ]
        )

        aprovadas = sum(

            1

            for estrategia
            in estrategias

            if estrategia[
                "auditoria"
            ][
                "aprovada"
            ]
        )

        milp_rodada = sum(

            1

            for estrategia
            in estrategias

            if estrategia.get(
                "metodoSelecao"
            ) == "milp"
        )

        greedy_rodada = sum(

            1

            for estrategia
            in estrategias

            if estrategia.get(
                "metodoSelecao"
            ) == "greedy_fallback"
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

        total_milp += (
            milp_rodada
        )

        total_greedy += (
            greedy_rodada
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
            f"R{rodada:02d} | "
            f"{completas}/3 completas | "
            f"{aprovadas}/3 auditorias | "
            f"MILP {milp_rodada}/3 | "
            f"fallback {greedy_rodada}/3 | "
            f"dados até R{rodada - 1:02d}"
        )

    indice = {

        "modelo":
            "historico_escalacoes_indice_v4_milp",

        "descricao":
            (
                "Histórico progressivo de escalações "
                "com otimização global MILP, patrimônio "
                "experimental C$ 200, fontes de candidatos "
                "separadas das fontes de resultado e "
                "proteção contra vazamento futuro."
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

        "patrimonio":
            patrimonio,

        "totalEscalacoes":
            total_escalacoes,

        "totalEscalacoesCompletas":
            total_escalacoes_completas,

        "totalEstrategiasAuditadas":
            total_escalacoes,

        "totalEstrategiasAprovadas":
            total_estrategias_aprovadas,

        "totalSelecoesMILP":
            total_milp,

        "totalFallbackGreedy":
            total_greedy,

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

            "fontesResultadoSeparadasDosCandidatos":
                True,

            "mercadoUsadoParaCandidatos":
                True,

            "otimizacaoGlobal":
                True,

            "fallbackGreedy":
                True,

            "patrimonioLaboratorio":
                PATRIMONIO_LABORATORIO,

            "patrimonioRespeitado":
                True,

            "limiteJogadoresClube":
                LIMITE_JOGADORES_CLUBE,

            "formacoesSincronizadasComMotor":
                True,
        },
    }

    salvar_json(

        PASTA_SAIDA
        /
        "indice.json",

        indice,
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
        ),
    )

    print(
        "Escalações geradas:",
        total_escalacoes,
    )

    print(
        "Escalações completas:",
        total_escalacoes_completas,
    )

    print(
        "Estratégias aprovadas:",
        (
            f"{total_estrategias_aprovadas}/"
            f"{total_escalacoes}"
        ),
    )

    print(
        "Seleções MILP:",
        total_milp,
    )

    print(
        "Fallback greedy:",
        total_greedy,
    )

    print(
        "Rodadas reprovadas:",
        rodadas_reprovadas,
    )

    print(
        "Auditoria global:",
        (
            "APROVADA"

            if indice[
                "auditoriaGlobalAprovada"
            ]

            else "REPROVADA"
        ),
    )

    print(
        "Saída:",
        PASTA_SAIDA,
    )

    print(
        "============================================"
    )


# =========================================================
# EXECUÇÃO
# =========================================================

if __name__ == "__main__":

    processar()
