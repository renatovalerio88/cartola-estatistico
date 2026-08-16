"""
=========================================================
CARTOLA ESTATÍSTICO
Gerador de Histórico de Escalações

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

Regra científica:
Para prever a rodada R, nunca utilizar a pontuação real
da própria rodada R na escolha dos jogadores.

=========================================================
"""

import json
import math
from pathlib import Path
from statistics import mean, median, pstdev


# ======================================================
# CONFIGURAÇÕES
# ======================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent

PASTA_DATA = BASE_DIR / "data"

PASTA_HISTORICO = PASTA_DATA / "historico"

PASTA_API = PASTA_DATA / "api"

PASTA_SAIDA = PASTA_DATA / "historico-escalacoes"

ARQUIVO_CONFIGURACAO = PASTA_DATA / "configuracao.json"


RODADA_INICIAL = 2

LIMITE_JOGADORES_CLUBE = 5


ESTRATEGIAS = {

    "conservador": {
        "nome": "Conservador",
        "formacao": "4-4-2"
    },

    "equilibrado": {
        "nome": "Equilibrado",
        "formacao": "3-4-3"
    },

    "agressivo": {
        "nome": "Agressivo",
        "formacao": "3-4-3"
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
        "LAT": 1,
        "ZAG": 2,
        "MEI": 4,
        "ATA": 3,
        "TEC": 1
    }

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

            return json.load(arquivo)

    except Exception as erro:

        print(
            f"[AVISO] Falha ao carregar {caminho}: {erro}"
        )

        return None


def salvar_json(caminho, dados):

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


def numero(valor, padrao=0.0):

    try:

        if valor is None:
            return padrao

        resultado = float(valor)

        if math.isfinite(resultado):
            return resultado

    except Exception:
        pass

    return padrao


def inteiro(valor, padrao=None):

    try:

        if valor is None:
            return padrao

        return int(valor)

    except Exception:

        return padrao


def normalizar_texto(valor):

    if valor is None:
        return ""

    return str(valor).strip().lower()


# ======================================================
# IDENTIFICAÇÃO DE JOGADORES
# ======================================================

def obter_id(jogador):

    possibilidades = [

        jogador.get("id"),
        jogador.get("atletaId"),
        jogador.get("atleta_id"),
        jogador.get("atleta")

    ]

    for valor in possibilidades:

        if valor is not None:

            return str(valor)

    nome = normalizar_texto(
        jogador.get("nome")
        or jogador.get("apelido")
    )

    clube = normalizar_texto(
        jogador.get("siglaClube")
        or jogador.get("clube")
        or jogador.get("clubeId")
    )

    posicao = normalizar_texto(
        jogador.get("posicao")
    )

    return f"{nome}|{clube}|{posicao}"


def obter_nome(jogador):

    return (
        jogador.get("apelido")
        or jogador.get("nome")
        or ""
    )


def obter_clube(jogador):

    return (
        jogador.get("siglaClube")
        or jogador.get("clube")
        or jogador.get("clubeNome")
        or jogador.get("clubeId")
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


def obter_posicao(jogador):

    posicao_id = inteiro(
        jogador.get("posicaoId")
        or jogador.get("posicao_id")
    )

    if posicao_id in MAPA_POSICOES_ID:

        return MAPA_POSICOES_ID[posicao_id]

    texto = normalizar_texto(
        jogador.get("posicao")
        or jogador.get("posicaoNome")
    )

    if texto in MAPA_POSICOES_TEXTO:

        return MAPA_POSICOES_TEXTO[
            texto
        ]

    texto = texto.upper()

    if texto in FORMACOES["4-4-2"]:

        return texto

    return ""


# ======================================================
# PONTUAÇÃO REAL
# ======================================================

def obter_pontuacao_real(jogador):

    campos = [

        "pontuacaoReal",
        "pontos",
        "pontuacao",
        "real",
        "pontosUltimaRodada"

    ]

    for campo in campos:

        if jogador.get(campo) is not None:

            return numero(
                jogador.get(campo),
                0
            )

    return 0


# ======================================================
# CARREGAMENTO DAS RODADAS
# ======================================================

def extrair_lista_jogadores(dados):

    if dados is None:
        return []

    if isinstance(dados, list):
        return dados

    if not isinstance(dados, dict):
        return []

    possibilidades = [

        "jogadores",
        "atletas",
        "pontuados"

    ]

    for chave in possibilidades:

        valor = dados.get(chave)

        if isinstance(valor, list):
            return valor

        if isinstance(valor, dict):

            lista = []

            for atleta_id, atleta in valor.items():

                if not isinstance(
                    atleta,
                    dict
                ):
                    continue

                copia = dict(atleta)

                if not copia.get("id"):

                    copia["id"] = atleta_id

                lista.append(copia)

            if lista:
                return lista

    return []


def caminhos_possiveis_rodada(rodada):

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


def carregar_jogadores_rodada(rodada):

    for caminho in caminhos_possiveis_rodada(
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


def descobrir_rodada_maxima():

    rodadas = set()

    pastas = [
        PASTA_HISTORICO,
        PASTA_API
    ]

    for pasta in pastas:

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
                .replace("rodada-", "")
                .replace(".json", "")
            )

            try:

                rodadas.add(
                    int(numero_texto)
                )

            except Exception:
                pass

    if not rodadas:
        return 0

    return max(rodadas)


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
            "mediana": 0,
            "piso": 0,
            "teto": 0,
            "regularidade": 0,
            "volatilidade": 0,
            "tendencia": 0
        }

    pontos = [

        numero(
            registro.get("pontos"),
            0
        )

        for registro in registros
    ]

    ultimos3 = pontos[-3:]

    ultimos5 = pontos[-5:]

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
        if len(ultimos5) > 1
        else 0
    )

    regularidade = max(
        0,
        100 - (
            volatilidade * 10
        )
    )

    tendencia = (
        media3 -
        media_geral
    )

    return {

        "jogos":
            len(pontos),

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
        jogador.get("statusId")
        or jogador.get("status_id")
    )

    if status is None:

        return True

    # Cartola:
    # 7 = provável.
    # Se a base histórica possuir status,
    # priorizamos somente prováveis.
    return status == 7


# ======================================================
# PREÇO
# ======================================================

def obter_preco(jogador):

    campos = [

        "preco",
        "preco_num",
        "precoNum",
        "precoCartoleta"

    ]

    for campo in campos:

        if jogador.get(campo) is not None:

            return numero(
                jogador.get(campo),
                0
            )

    return 0


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
        ] / 100
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
                metricas,

            "pontuacaoReal":
                round(
                    obter_pontuacao_real(
                        jogador
                    ),
                    2
                )

        })

    return candidatos


# ======================================================
# ESCALAÇÃO
# ======================================================

def pode_adicionar_clube(
    jogador,
    clubes
):

    clube = normalizar_texto(
        jogador.get("clube")
    )

    if not clube:
        return True

    quantidade = clubes.get(
        clube,
        0
    )

    return (
        quantidade <
        LIMITE_JOGADORES_CLUBE
    )


def adicionar_clube(
    jogador,
    clubes
):

    clube = normalizar_texto(
        jogador.get("clube")
    )

    if not clube:
        return

    clubes[clube] = (
        clubes.get(
            clube,
            0
        ) + 1
    )


def selecionar_por_posicao(
    candidatos,
    posicao,
    quantidade,
    selecionados,
    clubes
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
            jogador["nota"],
            jogador["metricas"]["jogos"],
            jogador["metricas"]["media5"]
        ),

        reverse=True

    )

    escolhidos = []

    ids_usados = {
        jogador["id"]
        for jogador in selecionados
    }

    for jogador in ranking:

        if jogador["id"] in ids_usados:
            continue

        if not pode_adicionar_clube(
            jogador,
            clubes
        ):
            continue

        escolhidos.append(
            jogador
        )

        selecionados.append(
            jogador
        )

        ids_usados.add(
            jogador["id"]
        )

        adicionar_clube(
            jogador,
            clubes
        )

        if len(escolhidos) >= quantidade:
            break

    return escolhidos


def montar_time(
    candidatos,
    formacao
):

    estrutura = FORMACOES.get(
        formacao
    )

    if not estrutura:

        raise ValueError(
            f"Formação não suportada: {formacao}"
        )

    titulares = []

    clubes = {}

    por_posicao = {}

    ordem = [
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA",
        "TEC"
    ]

    for posicao in ordem:

        quantidade = estrutura.get(
            posicao,
            0
        )

        escolhidos = selecionar_por_posicao(
            candidatos,
            posicao,
            quantidade,
            titulares,
            clubes
        )

        por_posicao[
            posicao
        ] = escolhidos

    completa = (
        len(titulares) ==
        sum(
            estrutura.values()
        )
    )

    return {
        "titulares": titulares,
        "porPosicao": por_posicao,
        "completa": completa
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

                jogador["nota"]
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

                jogador["nota"]
            )

        )

    return max(
        candidatos,
        key=lambda jogador:
            jogador["nota"]
    )


# ======================================================
# BANCO
# ======================================================

def montar_banco(
    candidatos,
    titulares
):

    ids_titulares = {
        jogador["id"]
        for jogador in titulares
    }

    banco = []

    for posicao in [
        "GOL",
        "LAT",
        "ZAG",
        "MEI",
        "ATA"
    ]:

        disponiveis = [

            jogador

            for jogador in candidatos

            if (
                jogador[
                    "posicao"
                ] == posicao

                and jogador[
                    "id"
                ] not in ids_titulares
            )
        ]

        disponiveis.sort(

            key=lambda jogador:
                jogador["nota"],

            reverse=True

        )

        if disponiveis:

            banco.append(
                disponiveis[0]
            )

    return banco


def escolher_reserva_luxo(
    banco
):

    if not banco:
        return None

    return max(
        banco,
        key=lambda jogador:
            jogador["nota"]
    )


# ======================================================
# SERIALIZAÇÃO
# ======================================================

def serializar_jogador(
    jogador
):

    if jogador is None:
        return None

    return {

        "id":
            jogador["id"],

        "nome":
            jogador["nome"],

        "posicao":
            jogador["posicao"],

        "clube":
            jogador["clube"],

        "preco":
            jogador["preco"],

        "projecao":
            round(
                jogador["nota"],
                2
            ),

        "pontuacaoReal":
            jogador[
                "pontuacaoReal"
            ],

        "historico": {

            "jogos":
                jogador[
                    "metricas"
                ]["jogos"],

            "media":
                jogador[
                    "metricas"
                ]["media"],

            "media3":
                jogador[
                    "metricas"
                ]["media3"],

            "media5":
                jogador[
                    "metricas"
                ]["media5"],

            "piso":
                jogador[
                    "metricas"
                ]["piso"],

            "teto":
                jogador[
                    "metricas"
                ]["teto"],

            "regularidade":
                jogador[
                    "metricas"
                ]["regularidade"],

            "volatilidade":
                jogador[
                    "metricas"
                ]["volatilidade"],

            "tendencia":
                jogador[
                    "metricas"
                ]["tendencia"]

        }

    }


# ======================================================
# GERAÇÃO DA RODADA
# ======================================================

def gerar_rodada(
    rodada
):

    historico = construir_historico_ate(
        rodada - 1
    )

    resultado = {

        "modelo":
            "historico_escalacoes_v1",

        "rodada":
            rodada,

        "dadosUtilizadosAteRodada":
            rodada - 1,

        "semVazamentoFuturo":
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

        time = montar_time(
            candidatos,
            configuracao[
                "formacao"
            ]
        )

        titulares = time[
            "titulares"
        ]

        capitao = escolher_capitao(
            titulares,
            estrategia_id
        )

        banco = montar_banco(
            candidatos,
            titulares
        )

        reserva_luxo = (
            escolher_reserva_luxo(
                banco
            )
        )

        custo_total = sum(
            jogador[
                "preco"
            ]
            for jogador in titulares
        )

        resultado[
            "estrategias"
        ].append({

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

            "escalaçãoCompleta":
                time[
                    "completa"
                ],

            "quantidadeTitulares":
                len(
                    titulares
                ),

            "custoTitulares":
                round(
                    custo_total,
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

        })

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
        "GERAÇÃO DO HISTÓRICO DE ESCALAÇÕES"
    )

    print(
        "============================================"
    )

    print(
        "Rodada máxima disponível:",
        rodada_maxima
    )

    if rodada_maxima < RODADA_INICIAL:

        print(
            "Não há rodadas suficientes."
        )

        return

    processadas = []

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
                f"[IGNORADA] Rodada {rodada}: "
                "sem jogadores."
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

        completas = sum(

            1

            for estrategia
            in resultado[
                "estrategias"
            ]

            if estrategia[
                "escalaçãoCompleta"
            ]

        )

        print(
            f"[OK] Rodada {rodada:02d} "
            f"- {completas}/3 escalações completas"
        )

    indice = {

        "modelo":
            "historico_escalacoes_indice_v1",

        "rodadasProcessadas":
            processadas,

        "quantidadeRodadas":
            len(processadas),

        "primeiraRodada":
            min(processadas)
            if processadas
            else None,

        "ultimaRodada":
            max(processadas)
            if processadas
            else None

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
        "Rodadas processadas:",
        len(processadas)
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
