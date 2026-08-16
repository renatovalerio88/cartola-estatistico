"""
=========================================================
CARTOLA ESTATÍSTICO
Simulação Histórica de Times

Versão:
simulacao_times_v3

Objetivo:
Avaliar as escalações históricas produzidas ANTES de
cada rodada contra a pontuação real obtida posteriormente.

Entrada:
data/historico-escalacoes/rodada-XX.json

Resultado real:
data/historico/
data/api/

Saída:
data/simulacao-times.json

Regra científica:
A escalação vem exclusivamente da camada histórica
pré-rodada. A pontuação real é consultada somente depois
da escalação já estar definida.

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
)

PASTA_DATA = (
    BASE_DIR /
    "data"
)

PASTA_ESCALACOES = (
    PASTA_DATA /
    "historico-escalacoes"
)

PASTA_HISTORICO = (
    PASTA_DATA /
    "historico"
)

PASTA_API = (
    PASTA_DATA /
    "api"
)

ARQUIVO_INDICE = (
    PASTA_ESCALACOES /
    "indice.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "simulacao-times.json"
)


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
            f"[AVISO] Erro ao carregar "
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

    return ""


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
# EXTRAÇÃO DE LISTAS
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
# FONTES DE RESULTADO REAL
# ======================================================

def caminhos_resultado_rodada(
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


def carregar_resultados_rodada(
    rodada
):

    for caminho in (
        caminhos_resultado_rodada(
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
# ÍNDICE DE RESULTADOS
# ======================================================

def criar_indice_resultados(
    jogadores
):

    por_id = {}

    por_nome = {}

    for jogador in jogadores:

        jogador_id = obter_id(
            jogador
        )

        nome = normalizar_texto(
            obter_nome(
                jogador
            )
        )

        posicao = obter_posicao(
            jogador
        )

        clube = normalizar_texto(
            obter_clube(
                jogador
            )
        )

        registro = {

            "id":
                jogador_id,

            "nome":
                obter_nome(
                    jogador
                ),

            "posicao":
                posicao,

            "clube":
                clube,

            "pontos":
                obter_pontuacao_real(
                    jogador
                )

        }

        if jogador_id:

            por_id[
                jogador_id
            ] = registro

        if nome:

            chave_nome = (
                f"{nome}|"
                f"{posicao}"
            )

            por_nome[
                chave_nome
            ] = registro

    return {

        "porId":
            por_id,

        "porNome":
            por_nome

    }


# ======================================================
# LOCALIZAÇÃO DO RESULTADO REAL
# ======================================================

def localizar_resultado(
    jogador,
    indice
):

    jogador_id = str(
        jogador.get(
            "id",
            ""
        )
    )

    if jogador_id:

        resultado = (
            indice[
                "porId"
            ].get(
                jogador_id
            )
        )

        if resultado is not None:

            return (
                resultado,
                "id"
            )

    nome = normalizar_texto(
        jogador.get(
            "nome"
        )
    )

    posicao = (
        jogador.get(
            "posicao",
            ""
        )
        .strip()
        .upper()
    )

    if nome:

        chave = (
            f"{nome}|"
            f"{posicao}"
        )

        resultado = (
            indice[
                "porNome"
            ].get(
                chave
            )
        )

        if resultado is not None:

            return (
                resultado,
                "nome_posicao"
            )

    return (
        None,
        None
    )


# ======================================================
# AVALIAÇÃO INDIVIDUAL
# ======================================================

def avaliar_jogador(
    jogador,
    indice
):

    resultado_real, metodo = (
        localizar_resultado(
            jogador,
            indice
        )
    )

    projecao = numero(
        jogador.get(
            "projecao"
        ),
        0
    )

    if resultado_real is None:

        return {

            "id":
                jogador.get(
                    "id"
                ),

            "nome":
                jogador.get(
                    "nome",
                    ""
                ),

            "posicao":
                jogador.get(
                    "posicao",
                    ""
                ),

            "clube":
                jogador.get(
                    "clube",
                    ""
                ),

            "projecao":
                round(
                    projecao,
                    2
                ),

            "pontuacaoReal":
                None,

            "erroAbsoluto":
                None,

            "encontrado":
                False,

            "metodoCorrespondencia":
                None

        }

    pontos = numero(
        resultado_real.get(
            "pontos"
        ),
        0
    )

    erro = abs(
        projecao -
        pontos
    )

    return {

        "id":
            jogador.get(
                "id"
            ),

        "nome":
            jogador.get(
                "nome",
                ""
            ),

        "posicao":
            jogador.get(
                "posicao",
                ""
            ),

        "clube":
            jogador.get(
                "clube",
                ""
            ),

        "projecao":
            round(
                projecao,
                2
            ),

        "pontuacaoReal":
            round(
                pontos,
                2
            ),

        "erroAbsoluto":
            round(
                erro,
                3
            ),

        "encontrado":
            True,

        "metodoCorrespondencia":
            metodo

    }


# ======================================================
# AVALIAÇÃO DO TIME
# ======================================================

def avaliar_time(
    estrategia,
    indice
):

    titulares = estrategia.get(
        "titulares",
        []
    )

    avaliacoes = [

        avaliar_jogador(
            jogador,
            indice
        )

        for jogador in titulares

    ]

    encontrados = [

        jogador

        for jogador in avaliacoes

        if jogador[
            "encontrado"
        ]

    ]

    nao_encontrados = [

        jogador

        for jogador in avaliacoes

        if not jogador[
            "encontrado"
        ]

    ]

    pontuacao_base = sum(

        numero(
            jogador.get(
                "pontuacaoReal"
            ),
            0
        )

        for jogador in encontrados

    )

    projecao_total = sum(

        numero(
            jogador.get(
                "projecao"
            ),
            0
        )

        for jogador in avaliacoes

    )

    erros = [

        numero(
            jogador.get(
                "erroAbsoluto"
            ),
            0
        )

        for jogador in encontrados

    ]

    mae = (

        mean(
            erros
        )

        if erros

        else 0

    )


    # ==================================================
    # CAPITÃO
    #
    # Pontuação do capitão é somada uma segunda vez,
    # reproduzindo a regra do Cartola.
    # ==================================================

    capitao_previsao = estrategia.get(
        "capitao"
    )

    capitao_avaliado = None

    bonus_capitao = 0

    if capitao_previsao:

        capitao_avaliado = avaliar_jogador(
            capitao_previsao,
            indice
        )

        if capitao_avaliado[
            "encontrado"
        ]:

            bonus_capitao = numero(
                capitao_avaliado.get(
                    "pontuacaoReal"
                ),
                0
            )


    pontuacao_com_capitao = (
        pontuacao_base +
        bonus_capitao
    )


    # ==================================================
    # BANCO
    #
    # Avaliado separadamente.
    # Não entra automaticamente na pontuação titular.
    # ==================================================

    banco = [

        avaliar_jogador(
            jogador,
            indice
        )

        for jogador in estrategia.get(
            "banco",
            []
        )

    ]


    # ==================================================
    # RESERVA DE LUXO
    # ==================================================

    reserva_previsao = estrategia.get(
        "reservaLuxo"
    )

    reserva_avaliada = None

    if reserva_previsao:

        reserva_avaliada = avaliar_jogador(
            reserva_previsao,
            indice
        )


    # ==================================================
    # COBERTURA
    # ==================================================

    quantidade_titulares = len(
        titulares
    )

    quantidade_encontrados = len(
        encontrados
    )

    cobertura = (

        (
            quantidade_encontrados /
            quantidade_titulares
        ) *
        100

        if quantidade_titulares

        else 0

    )


    # ==================================================
    # RESULTADO
    # ==================================================

    return {

        "id":
            estrategia.get(
                "id"
            ),

        "nome":
            estrategia.get(
                "nome"
            ),

        "perfil":
            estrategia.get(
                "perfil"
            ),

        "formacao":
            estrategia.get(
                "formacao"
            ),

        "escalacaoCompleta":
            estrategia.get(
                "escalacaoCompleta",
                False
            ),

        "quantidadeTitulares":
            quantidade_titulares,

        "jogadoresEncontrados":
            quantidade_encontrados,

        "jogadoresNaoEncontrados":
            len(
                nao_encontrados
            ),

        "coberturaResultadosPercentual":
            round(
                cobertura,
                2
            ),

        "projecaoTotal":
            round(
                projecao_total,
                2
            ),

        "pontuacaoSemCapitao":
            round(
                pontuacao_base,
                2
            ),

        "bonusCapitao":
            round(
                bonus_capitao,
                2
            ),

        "pontuacaoComCapitao":
            round(
                pontuacao_com_capitao,
                2
            ),

        "maeJogadores":
            round(
                mae,
                3
            ),

        "titulares":
            avaliacoes,

        "naoEncontrados":
            nao_encontrados,

        "capitao":
            capitao_avaliado,

        "banco":
            banco,

        "reservaLuxo":
            reserva_avaliada

    }


# ======================================================
# MÉTRICAS DE UMA ESTRATÉGIA
# ======================================================

def resumir_estrategia(
    nome,
    registros
):

    pontuacoes = [

        numero(
            item.get(
                "pontuacaoComCapitao"
            ),
            0
        )

        for item in registros

    ]

    pontuacoes_sem_capitao = [

        numero(
            item.get(
                "pontuacaoSemCapitao"
            ),
            0
        )

        for item in registros

    ]

    maes = [

        numero(
            item.get(
                "maeJogadores"
            ),
            0
        )

        for item in registros

    ]

    coberturas = [

        numero(
            item.get(
                "coberturaResultadosPercentual"
            ),
            0
        )

        for item in registros

    ]

    if not registros:

        return {

            "nome":
                nome,

            "rodadas":
                0,

            "pontosTotal":
                0,

            "mediaPontos":
                0

        }

    melhor = max(

        registros,

        key=lambda item:
            numero(
                item.get(
                    "pontuacaoComCapitao"
                ),
                0
            )

    )

    pior = min(

        registros,

        key=lambda item:
            numero(
                item.get(
                    "pontuacaoComCapitao"
                ),
                0
            )

    )

    return {

        "nome":
            nome,

        "rodadas":
            len(
                registros
            ),

        "pontosTotal":
            round(
                sum(
                    pontuacoes
                ),
                2
            ),

        "mediaPontos":
            round(
                mean(
                    pontuacoes
                ),
                2
            ),

        "medianaPontos":
            round(
                median(
                    pontuacoes
                ),
                2
            ),

        "desvioPontos":
            round(
                (
                    pstdev(
                        pontuacoes
                    )

                    if len(
                        pontuacoes
                    ) > 1

                    else 0
                ),
                2
            ),

        "mediaSemCapitao":
            round(
                mean(
                    pontuacoes_sem_capitao
                ),
                2
            ),

        "mediaBonusCapitao":
            round(
                (
                    mean(
                        pontuacoes
                    ) -
                    mean(
                        pontuacoes_sem_capitao
                    )
                ),
                2
            ),

        "maeMedioJogadores":
            round(
                mean(
                    maes
                ),
                3
            ),

        "coberturaMediaPercentual":
            round(
                mean(
                    coberturas
                ),
                2
            ),

        "melhorRodada": {

            "rodada":
                melhor[
                    "rodada"
                ],

            "pontos":
                melhor[
                    "pontuacaoComCapitao"
                ]

        },

        "piorRodada": {

            "rodada":
                pior[
                    "rodada"
                ],

            "pontos":
                pior[
                    "pontuacaoComCapitao"
                ]

        }

    }


# ======================================================
# RODADAS DISPONÍVEIS
# ======================================================

def descobrir_rodadas():

    indice = carregar_json(
        ARQUIVO_INDICE
    )

    if isinstance(
        indice,
        dict
    ):

        rodadas = indice.get(
            "rodadasProcessadas"
        )

        if isinstance(
            rodadas,
            list
        ) and rodadas:

            resultado = []

            for rodada in rodadas:

                numero_rodada = inteiro(
                    rodada
                )

                if numero_rodada is not None:

                    resultado.append(
                        numero_rodada
                    )

            if resultado:

                return sorted(
                    set(
                        resultado
                    )
                )

    rodadas = []

    if not PASTA_ESCALACOES.exists():

        return rodadas

    for caminho in (
        PASTA_ESCALACOES.glob(
            "rodada-*.json"
        )
    ):

        nome = (
            caminho
            .stem
            .replace(
                "rodada-",
                ""
            )
        )

        try:

            rodadas.append(
                int(
                    nome
                )
            )

        except Exception:

            pass

    return sorted(
        set(
            rodadas
        )
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
        "SIMULAÇÃO HISTÓRICA DE TIMES V3"
    )

    print(
        "============================================"
    )

    rodadas_disponiveis = (
        descobrir_rodadas()
    )

    print(
        "Rodadas encontradas:",
        rodadas_disponiveis
    )

    resultado = {

        "modelo":
            "simulacao_times_v3",

        "descricao":
            (
                "Avaliação histórica das escalações "
                "progressivas sem vazamento futuro."
            ),

        "metodologia": {

            "fonteEscalacoes":
                "data/historico-escalacoes",

            "resultadoConsultadoDepoisDaEscalacao":
                True,

            "pontuacaoCapitaoDuplicada":
                True,

            "bancoNaoSubstituiAutomaticamente":
                True,

            "reservaLuxoAvaliadaSeparadamente":
                True

        },

        "rodadas":
            [],

        "resumoEstrategias":
            {}

    }

    acumulado = {}

    rodadas_processadas = []

    rodadas_ignoradas = []

    for rodada in rodadas_disponiveis:

        arquivo_escalacao = (

            PASTA_ESCALACOES /
            f"rodada-{rodada:02d}.json"

        )

        dados_escalacao = carregar_json(
            arquivo_escalacao
        )

        if not isinstance(
            dados_escalacao,
            dict
        ):

            rodadas_ignoradas.append({

                "rodada":
                    rodada,

                "motivo":
                    "arquivo_escalacao_invalido"

            })

            print(

                f"[IGNORADA] "
                f"Rodada {rodada:02d}: "
                f"escalação inválida."

            )

            continue

        resultados_reais = (
            carregar_resultados_rodada(
                rodada
            )
        )

        if not resultados_reais:

            rodadas_ignoradas.append({

                "rodada":
                    rodada,

                "motivo":
                    "resultado_real_indisponivel"

            })

            print(

                f"[IGNORADA] "
                f"Rodada {rodada:02d}: "
                f"resultado real indisponível."

            )

            continue

        indice_resultados = (
            criar_indice_resultados(
                resultados_reais
            )
        )

        registro_rodada = {

            "rodada":
                rodada,

            "dadosUtilizadosAteRodada":
                dados_escalacao.get(
                    "dadosUtilizadosAteRodada"
                ),

            "semVazamentoFuturo":
                dados_escalacao.get(
                    "semVazamentoFuturo",
                    False
                ),

            "auditoriaEscalacaoAprovada":
                (
                    dados_escalacao
                    .get(
                        "auditoria",
                        {}
                    )
                    .get(
                        "aprovada",
                        False
                    )
                ),

            "estrategias":
                []

        }

        for estrategia in (
            dados_escalacao.get(
                "estrategias",
                []
            )
        ):

            avaliacao = avaliar_time(
                estrategia,
                indice_resultados
            )

            avaliacao[
                "rodada"
            ] = rodada

            registro_rodada[
                "estrategias"
            ].append(
                avaliacao
            )

            nome = avaliacao.get(
                "nome"
            )

            if nome not in acumulado:

                acumulado[
                    nome
                ] = []

            acumulado[
                nome
            ].append(
                avaliacao
            )

        resultado[
            "rodadas"
        ].append(
            registro_rodada
        )

        rodadas_processadas.append(
            rodada
        )

        print(
            f"[OK] Rodada {rodada:02d}"
        )

        for estrategia in (
            registro_rodada[
                "estrategias"
            ]
        ):

            print(

                "   ",
                estrategia[
                    "nome"
                ],
                "| Pontos:",
                estrategia[
                    "pontuacaoComCapitao"
                ],
                "| Cobertura:",
                (
                    f"{estrategia['coberturaResultadosPercentual']}%"
                ),
                "| MAE:",
                estrategia[
                    "maeJogadores"
                ]

            )

    for nome, registros in (
        acumulado.items()
    ):

        resultado[
            "resumoEstrategias"
        ][
            nome
        ] = resumir_estrategia(
            nome,
            registros
        )

    resultado[
        "rodadasProcessadas"
    ] = rodadas_processadas

    resultado[
        "rodadasIgnoradas"
    ] = rodadas_ignoradas

    resultado[
        "quantidadeRodadas"
    ] = len(
        rodadas_processadas
    )


    # ==================================================
    # AUDITORIA GLOBAL
    # ==================================================

    coberturas = []

    for rodada in resultado[
        "rodadas"
    ]:

        for estrategia in rodada[
            "estrategias"
        ]:

            coberturas.append(

                numero(
                    estrategia.get(
                        "coberturaResultadosPercentual"
                    ),
                    0
                )

            )

    cobertura_global = (

        mean(
            coberturas
        )

        if coberturas

        else 0

    )

    resultado[
        "auditoria"
    ] = {

        "rodadasComSimulacao":
            len(
                rodadas_processadas
            ),

        "rodadasIgnoradas":
            len(
                rodadas_ignoradas
            ),

        "coberturaMediaPercentual":
            round(
                cobertura_global,
                2
            ),

        "separacaoPrevisaoResultado":
            True,

        "aprovada":
            (
                len(
                    rodadas_processadas
                ) > 0

                and

                cobertura_global >= 90
            )

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    print(
        "============================================"
    )

    print(
        "SIMULAÇÃO HISTÓRICA FINALIZADA"
    )

    print(
        "============================================"
    )

    print(
        "Rodadas processadas:",
        len(
            rodadas_processadas
        )
    )

    print(
        "Rodadas ignoradas:",
        len(
            rodadas_ignoradas
        )
    )

    print(
        "Cobertura média:",
        round(
            cobertura_global,
            2
        ),
        "%"
    )

    print(
        "Auditoria:",
        (
            "APROVADA"
            if resultado[
                "auditoria"
            ][
                "aprovada"
            ]
            else
            "REPROVADA"
        )
    )

    print(
        "Arquivo:",
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
