from pathlib import Path
import json
import math
from collections import defaultdict


# ==========================================================
# CARTOLA ESTATÍSTICO
# BACKTEST CIENTÍFICO V2
# ==========================================================
#
# Objetivos:
#
# 1. Walk-forward real:
#       histórico anterior -> próxima rodada
#
# 2. Nunca usar dados da rodada que está sendo prevista
#    na criação das features.
#
# 3. Testar a hipótese de Pontuação Básica Sustentável:
#
#       PB3
#       PB5
#       PB10
#
# 4. Medir:
#
#       - Top 5 por posição
#       - Top 10 por posição
#       - taxa de 10+
#       - taxa de 15+
#       - PB >= 3
#       - PB >= 5
#       - PB >= 7
#       - estabilidade
#       - dependência de gol/assistência/SG
#
# 5. Comparar:
#
#       MODELO ATUAL
#              x
#       SINAL DE PONTUAÇÃO BÁSICA
#
# IMPORTANTE:
#
# Este script NÃO altera os pesos oficiais do modelo.
# Ele apenas produz evidências.
#
# ==========================================================


PASTA_HISTORICO = Path(
    "data/historico"
)

PASTA_BASE = Path(
    "data/base-historica"
)

ARQUIVO_SAIDA = Path(
    "data/backtest_cientifico.json"
)


# ==========================================================
# PESOS OFICIAIS DOS SCOUTS
# ==========================================================

PESOS_SCOUTS = {

    # POSITIVOS

    "G": 8.0,

    "A": 5.0,

    "SG": 5.0,

    "FT": 3.0,

    "DP": 7.0,

    "DE": 1.3,

    "DD": 1.3,

    "FD": 1.2,

    "PS": 1.0,

    "FF": 0.8,

    "DS": 1.5,

    "FS": 0.5,


    # NEGATIVOS

    "GC": -3.0,

    "CV": -3.0,

    "PP": -4.0,

    "CA": -1.0,

    "GS": -1.0,

    "PC": -1.0,

    "FC": -0.3,

    "I": -0.1
}


# ==========================================================
# EVENTOS QUE NÃO ENTRAM NA PONTUAÇÃO BÁSICA
# ==========================================================
#
# A hipótese que queremos testar é:
#
# "O jogador pontua bem sem depender de eventos
# difíceis de prever?"
#
# Gol, assistência, SG e defesa de pênalti são retirados.
#
# Defesas difíceis continuam porque representam
# volume/participação do goleiro e podem ser recorrentes.
# ==========================================================

EVENTOS_EXCLUIDOS_PB = {

    "G",

    "A",

    "SG",

    "DP"
}


POSICOES_VALIDAS = {

    "GOL",

    "LAT",

    "ZAG",

    "MEI",

    "ATA",

    "TEC"
}


# ==========================================================
# UTILITÁRIOS
# ==========================================================

def carregar_json(caminho):

    try:

        with open(
            caminho,
            "r",
            encoding="utf-8"
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception:

        return None


def numero(
    valor,
    padrao=0.0
):

    try:

        n = float(
            valor
        )

        if math.isfinite(
            n
        ):

            return n

    except Exception:

        pass

    return padrao


def media(
    valores
):

    valores = [

        numero(
            x
        )

        for x in valores

    ]

    if not valores:

        return 0.0

    return sum(
        valores
    ) / len(
        valores
    )


def mediana(
    valores
):

    if not valores:

        return 0.0

    ordenados = sorted(

        numero(
            x
        )

        for x in valores

    )

    tamanho = len(
        ordenados
    )

    meio = tamanho // 2

    if tamanho % 2:

        return ordenados[
            meio
        ]

    return (

        ordenados[
            meio - 1
        ]

        +

        ordenados[
            meio
        ]

    ) / 2


def desvio_padrao(
    valores
):

    if len(
        valores
    ) < 2:

        return 0.0

    m = media(
        valores
    )

    variancia = sum(

        (
            numero(
                x
            ) - m
        ) ** 2

        for x in valores

    ) / len(
        valores
    )

    return math.sqrt(
        variancia
    )


def correlacao(
    x,
    y
):

    if (
        len(x) != len(y)
        or
        len(x) < 3
    ):

        return 0.0

    mx = media(
        x
    )

    my = media(
        y
    )

    numerador = sum(

        (
            numero(a) - mx
        )
        *
        (
            numero(b) - my
        )

        for a, b in zip(
            x,
            y
        )

    )

    denominador_x = math.sqrt(

        sum(

            (
                numero(a) - mx
            ) ** 2

            for a in x

        )

    )

    denominador_y = math.sqrt(

        sum(

            (
                numero(b) - my
            ) ** 2

            for b in y

        )

    )

    denominador = (
        denominador_x
        *
        denominador_y
    )

    if denominador == 0:

        return 0.0

    return (
        numerador
        /
        denominador
    )


def percentual(
    parte,
    total
):

    if not total:

        return 0.0

    return (
        parte
        /
        total
        *
        100
    )


def arredondar(
    valor,
    casas=2
):

    return round(
        numero(
            valor
        ),
        casas
    )


# ==========================================================
# PONTUAÇÃO DE SCOUTS
# ==========================================================

def valor_scout(
    scouts,
    scout
):

    return numero(

        (
            scouts
            or
            {}
        ).get(
            scout,
            0
        )

    )


def pontuacao_dos_scouts(
    scouts,
    excluir=None
):

    excluir = (
        excluir
        or
        set()
    )

    total = 0.0

    for scout, quantidade in (
        scouts
        or
        {}
    ).items():

        scout = str(
            scout
        ).upper()

        if scout in excluir:

            continue

        peso = PESOS_SCOUTS.get(
            scout
        )

        if peso is None:

            continue

        total += (
            numero(
                quantidade
            )
            *
            peso
        )

    return total


def pontuacao_basica(
    jogo
):

    scouts = jogo.get(
        "scouts",
        {}
    ) or {}

    return pontuacao_dos_scouts(

        scouts,

        excluir=
            EVENTOS_EXCLUIDOS_PB

    )


def pontuacao_eventos(
    jogo
):

    scouts = jogo.get(
        "scouts",
        {}
    ) or {}

    total = 0.0

    for scout in EVENTOS_EXCLUIDOS_PB:

        peso = PESOS_SCOUTS.get(
            scout,
            0
        )

        total += (

            valor_scout(
                scouts,
                scout
            )

            *

            peso

        )

    return total


# ==========================================================
# CARREGAR BASE HISTÓRICA
# ==========================================================

def carregar_base_historica():

    base = {}

    arquivos = sorted(

        PASTA_BASE.glob(
            "*.json"
        )

    )

    for arquivo in arquivos:

        dados = carregar_json(
            arquivo
        )

        if not isinstance(
            dados,
            dict
        ):

            continue

        jogador_id = dados.get(
            "id"
        )

        if jogador_id is None:

            try:

                jogador_id = int(
                    arquivo.stem
                )

            except Exception:

                continue

        historico = dados.get(
            "historico",
            []
        )

        if not isinstance(
            historico,
            list
        ):

            historico = []

        historico = sorted(

            historico,

            key=lambda item:
                numero(
                    item.get(
                        "rodada"
                    ),
                    0
                )

        )

        base[
            str(
                jogador_id
            )
        ] = {

            "id":
                jogador_id,

            "nome":
                dados.get(
                    "nome"
                ),

            "posicao":
                dados.get(
                    "posicao"
                ),

            "clube":
                dados.get(
                    "clube"
                ),

            "historico":
                historico
        }

    return base


# ==========================================================
# FEATURES ANTERIORES À RODADA
# ==========================================================

def janela(
    valores,
    tamanho
):

    if not valores:

        return []

    return valores[
        -tamanho:
    ]


def criar_features(
    jogador_base,
    rodada_teste
):

    historico_total = jogador_base.get(
        "historico",
        []
    )

    # ======================================================
    # PROTEÇÃO CONTRA VAZAMENTO
    # ======================================================
    #
    # Somente rodadas ANTERIORES à rodada testada.
    # ======================================================

    historico = [

        jogo

        for jogo in historico_total

        if numero(
            jogo.get(
                "rodada"
            ),
            0
        )
        <
        rodada_teste

    ]

    if not historico:

        return None


    pontos = [

        numero(
            jogo.get(
                "pontos"
            )
        )

        for jogo in historico

    ]


    pbs = [

        pontuacao_basica(
            jogo
        )

        for jogo in historico

    ]


    eventos = [

        pontuacao_eventos(
            jogo
        )

        for jogo in historico

    ]


    pontos3 = janela(
        pontos,
        3
    )

    pontos5 = janela(
        pontos,
        5
    )

    pontos10 = janela(
        pontos,
        10
    )


    pb3_lista = janela(
        pbs,
        3
    )

    pb5_lista = janela(
        pbs,
        5
    )

    pb10_lista = janela(
        pbs,
        10
    )


    eventos10 = janela(
        eventos,
        10
    )


    pb3 = media(
        pb3_lista
    )

    pb5 = media(
        pb5_lista
    )

    pb10 = media(
        pb10_lista
    )


    jogos10 = len(
        pb10_lista
    )


    freq_pb3 = percentual(

        sum(
            1
            for valor in pb10_lista
            if valor >= 3
        ),

        jogos10

    )


    freq_pb5 = percentual(

        sum(
            1
            for valor in pb10_lista
            if valor >= 5
        ),

        jogos10

    )


    freq_pb7 = percentual(

        sum(
            1
            for valor in pb10_lista
            if valor >= 7
        ),

        jogos10

    )


    volatilidade_pb = desvio_padrao(
        pb10_lista
    )


    # ======================================================
    # REGULARIDADE PB
    # ======================================================
    #
    # Quanto menor a volatilidade, maior o indicador.
    #
    # 0 de desvio -> 100
    # 10+ de desvio -> 0
    # ======================================================

    regularidade_pb = max(

        0,

        min(

            100,

            100
            -
            volatilidade_pb
            *
            10

        )

    )


    media_pontos10 = media(
        pontos10
    )


    media_eventos10 = media(
        eventos10
    )


    # ======================================================
    # DEPENDÊNCIA DE EVENTOS
    # ======================================================

    if abs(
        media_pontos10
    ) > 0.01:

        dependencia_eventos = (

            media_eventos10
            /
            abs(
                media_pontos10
            )
            *
            100

        )

    else:

        dependencia_eventos = 0.0


    dependencia_eventos = max(

        0,

        min(
            100,
            dependencia_eventos
        )

    )


    # ======================================================
    # SCORE EXPERIMENTAL DE SUSTENTABILIDADE
    # ======================================================
    #
    # NÃO É O NOVO MODELO.
    #
    # É apenas uma ferramenta para testar a hipótese PB.
    #
    # Mais peso para R5 e R10.
    #
    # ======================================================

    score_pb = (

        pb3
        * 0.20

        +

        pb5
        * 0.35

        +

        pb10
        * 0.30

        +

        (
            freq_pb3
            /
            100
            *
            5
        )
        * 0.10

        +

        (
            regularidade_pb
            /
            100
            *
            5
        )
        * 0.05

    )


    return {

        "jogosHistoricos":
            len(
                historico
            ),

        "media3":
            arredondar(
                media(
                    pontos3
                )
            ),

        "media5":
            arredondar(
                media(
                    pontos5
                )
            ),

        "media10":
            arredondar(
                media(
                    pontos10
                )
            ),

        "pb3":
            arredondar(
                pb3
            ),

        "pb5":
            arredondar(
                pb5
            ),

        "pb10":
            arredondar(
                pb10
            ),

        "medianaPB10":
            arredondar(
                mediana(
                    pb10_lista
                )
            ),

        "freqPB3":
            arredondar(
                freq_pb3
            ),

        "freqPB5":
            arredondar(
                freq_pb5
            ),

        "freqPB7":
            arredondar(
                freq_pb7
            ),

        "volatilidadePB10":
            arredondar(
                volatilidade_pb
            ),

        "regularidadePB":
            arredondar(
                regularidade_pb
            ),

        "mediaEventos10":
            arredondar(
                media_eventos10
            ),

        "dependenciaEventos":
            arredondar(
                dependencia_eventos
            ),

        "scorePB":
            arredondar(
                score_pb,
                4
            )
    }


# ==========================================================
# HISTÓRICO DAS PROJEÇÕES
# ==========================================================

def carregar_rodadas():

    rodadas = []

    arquivos = sorted(

        PASTA_HISTORICO.glob(
            "rodada-*.json"
        )

    )

    for arquivo in arquivos:

        dados = carregar_json(
            arquivo
        )

        if not isinstance(
            dados,
            dict
        ):

            continue

        rodada = int(
            numero(
                dados.get(
                    "rodada"
                ),
                0
            )
        )

        if rodada <= 0:

            continue

        jogadores = dados.get(
            "jogadores",
            []
        )

        if not isinstance(
            jogadores,
            list
        ):

            continue

        rodadas.append({

            "rodada":
                rodada,

            "arquivo":
                arquivo.name,

            "jogadores":
                jogadores
        })

    return sorted(

        rodadas,

        key=lambda item:
            item[
                "rodada"
            ]

    )


# ==========================================================
# TOP REAL POR POSIÇÃO
# ==========================================================

def criar_rank_real(
    jogadores
):

    por_posicao = defaultdict(
        list
    )

    for jogador in jogadores:

        posicao = str(

            jogador.get(
                "posicao",
                "OUT"
            )

        ).upper()

        if posicao not in POSICOES_VALIDAS:

            continue

        por_posicao[
            posicao
        ].append(
            jogador
        )

    ranking = {}

    for posicao, lista in por_posicao.items():

        ordenados = sorted(

            lista,

            key=lambda item:
                numero(
                    item.get(
                        "real"
                    )
                ),

            reverse=True

        )

        ranking[
            posicao
        ] = {

            "top5": {

                str(
                    item.get(
                        "id"
                    )
                )

                for item in ordenados[
                    :5
                ]

            },

            "top10": {

                str(
                    item.get(
                        "id"
                    )
                )

                for item in ordenados[
                    :10
                ]

            }
        }

    return ranking


# ==========================================================
# COMPARAÇÃO DE RANKINGS
# ==========================================================

def avaliar_ranking(
    jogadores,
    campo,
    rank_real
):

    por_posicao = defaultdict(
        list
    )

    for jogador in jogadores:

        if jogador.get(
            campo
        ) is None:

            continue

        posicao = str(

            jogador.get(
                "posicao",
                "OUT"
            )

        ).upper()

        if posicao not in POSICOES_VALIDAS:

            continue

        por_posicao[
            posicao
        ].append(
            jogador
        )


    resultado_posicoes = {}

    totais = {

        "selecionados":
            0,

        "acertosTop5":
            0,

        "acertosTop10":
            0,

        "jogadores10Mais":
            0,

        "jogadores15Mais":
            0,

        "pontosReais":
            []
    }


    for posicao, lista in por_posicao.items():

        ordenados = sorted(

            lista,

            key=lambda item:
                numero(
                    item.get(
                        campo
                    )
                ),

            reverse=True

        )


        escolhidos = ordenados[
            :5
        ]


        top5_real = rank_real.get(
            posicao,
            {}
        ).get(
            "top5",
            set()
        )


        top10_real = rank_real.get(
            posicao,
            {}
        ).get(
            "top10",
            set()
        )


        acertos5 = sum(

            1

            for item in escolhidos

            if str(
                item.get(
                    "id"
                )
            )
            in top5_real

        )


        acertos10 = sum(

            1

            for item in escolhidos

            if str(
                item.get(
                    "id"
                )
            )
            in top10_real

        )


        dez_mais = sum(

            1

            for item in escolhidos

            if numero(
                item.get(
                    "real"
                )
            ) >= 10

        )


        quinze_mais = sum(

            1

            for item in escolhidos

            if numero(
                item.get(
                    "real"
                )
            ) >= 15

        )


        pontos_reais = [

            numero(
                item.get(
                    "real"
                )
            )

            for item in escolhidos

        ]


        resultado_posicoes[
            posicao
        ] = {

            "quantidade":
                len(
                    escolhidos
                ),

            "acertosTop5":
                acertos5,

            "acertosTop10":
                acertos10,

            "taxaTop5":
                arredondar(
                    percentual(
                        acertos5,
                        len(
                            escolhidos
                        )
                    )
                ),

            "taxaTop10":
                arredondar(
                    percentual(
                        acertos10,
                        len(
                            escolhidos
                        )
                    )
                ),

            "quantidade10Mais":
                dez_mais,

            "quantidade15Mais":
                quinze_mais,

            "mediaRealSelecionados":
                arredondar(
                    media(
                        pontos_reais
                    )
                )
        }


        totais[
            "selecionados"
        ] += len(
            escolhidos
        )

        totais[
            "acertosTop5"
        ] += acertos5

        totais[
            "acertosTop10"
        ] += acertos10

        totais[
            "jogadores10Mais"
        ] += dez_mais

        totais[
            "jogadores15Mais"
        ] += quinze_mais

        totais[
            "pontosReais"
        ].extend(
            pontos_reais
        )


    resumo = {

        "selecionados":
            totais[
                "selecionados"
            ],

        "acertosTop5":
            totais[
                "acertosTop5"
            ],

        "acertosTop10":
            totais[
                "acertosTop10"
            ],

        "taxaTop5":
            arredondar(
                percentual(
                    totais[
                        "acertosTop5"
                    ],
                    totais[
                        "selecionados"
                    ]
                )
            ),

        "taxaTop10":
            arredondar(
                percentual(
                    totais[
                        "acertosTop10"
                    ],
                    totais[
                        "selecionados"
                    ]
                )
            ),

        "taxa10Mais":
            arredondar(
                percentual(
                    totais[
                        "jogadores10Mais"
                    ],
                    totais[
                        "selecionados"
                    ]
                )
            ),

        "taxa15Mais":
            arredondar(
                percentual(
                    totais[
                        "jogadores15Mais"
                    ],
                    totais[
                        "selecionados"
                    ]
                )
            ),

        "mediaRealSelecionados":
            arredondar(
                media(
                    totais[
                        "pontosReais"
                    ]
                )
            )
    }


    return {

        "resumo":
            resumo,

        "posicoes":
            resultado_posicoes
    }


# ==========================================================
# ACUMULADOR GLOBAL
# ==========================================================

def acumular_metricas(
    destino,
    resultado
):

    resumo = resultado.get(
        "resumo",
        {}
    )

    destino[
        "selecionados"
    ] += resumo.get(
        "selecionados",
        0
    )

    destino[
        "acertosTop5"
    ] += resumo.get(
        "acertosTop5",
        0
    )

    destino[
        "acertosTop10"
    ] += resumo.get(
        "acertosTop10",
        0
    )

    destino[
        "quantidade10Mais"
    ] += round(

        resumo.get(
            "taxa10Mais",
            0
        )
        /
        100
        *
        resumo.get(
            "selecionados",
            0
        )

    )

    destino[
        "quantidade15Mais"
    ] += round(

        resumo.get(
            "taxa15Mais",
            0
        )
        /
        100
        *
        resumo.get(
            "selecionados",
            0
        )

    )

    quantidade = resumo.get(
        "selecionados",
        0
    )

    media_real = resumo.get(
        "mediaRealSelecionados",
        0
    )

    destino[
        "somaReal"
    ] += (
        quantidade
        *
        media_real
    )


def fechar_acumulador(
    dados
):

    selecionados = dados[
        "selecionados"
    ]

    return {

        "selecionados":
            selecionados,

        "taxaTop5":
            arredondar(
                percentual(
                    dados[
                        "acertosTop5"
                    ],
                    selecionados
                )
            ),

        "taxaTop10":
            arredondar(
                percentual(
                    dados[
                        "acertosTop10"
                    ],
                    selecionados
                )
            ),

        "taxa10Mais":
            arredondar(
                percentual(
                    dados[
                        "quantidade10Mais"
                    ],
                    selecionados
                )
            ),

        "taxa15Mais":
            arredondar(
                percentual(
                    dados[
                        "quantidade15Mais"
                    ],
                    selecionados
                )
            ),

        "mediaRealSelecionados":
            arredondar(

                dados[
                    "somaReal"
                ]
                /
                selecionados

                if selecionados

                else 0

            )
    }


# ==========================================================
# EXECUÇÃO
# ==========================================================

print()
print(
    "=============================================="
)
print(
    "BACKTEST CIENTÍFICO V2"
)
print(
    "PONTUAÇÃO BÁSICA / WALK-FORWARD"
)
print(
    "=============================================="
)
print()


base = carregar_base_historica()

rodadas = carregar_rodadas()


print(
    "Jogadores na base histórica:",
    len(
        base
    )
)

print(
    "Rodadas encontradas:",
    len(
        rodadas
    )
)

print()


resultado_rodadas = []


acumulador_modelo = defaultdict(
    float
)

acumulador_pb = defaultdict(
    float
)


correlacoes = {

    "pb3": {
        "x": [],
        "y": []
    },

    "pb5": {
        "x": [],
        "y": []
    },

    "pb10": {
        "x": [],
        "y": []
    },

    "media3": {
        "x": [],
        "y": []
    },

    "media5": {
        "x": [],
        "y": []
    },

    "media10": {
        "x": [],
        "y": []
    },

    "projecao": {
        "x": [],
        "y": []
    }
}


cobertura_total = 0

jogadores_total = 0


for rodada_dados in rodadas:

    rodada = rodada_dados[
        "rodada"
    ]

    jogadores_rodada = rodada_dados[
        "jogadores"
    ]


    enriquecidos = []


    for jogador in jogadores_rodada:

        jogador_id = str(
            jogador.get(
                "id"
            )
        )

        real = numero(
            jogador.get(
                "real"
            )
        )

        item = dict(
            jogador
        )


        jogador_base = base.get(
            jogador_id
        )


        features = None

        if jogador_base:

            features = criar_features(
                jogador_base,
                rodada
            )


        if features:

            item.update(
                features
            )

            cobertura_total += 1


            for nome in [

                "pb3",

                "pb5",

                "pb10",

                "media3",

                "media5",

                "media10"

            ]:

                correlacoes[
                    nome
                ][
                    "x"
                ].append(
                    features[
                        nome
                    ]
                )

                correlacoes[
                    nome
                ][
                    "y"
                ].append(
                    real
                )

        else:

            item[
                "scorePB"
            ] = None


        projecao = jogador.get(
            "projecao"
        )

        if projecao is not None:

            correlacoes[
                "projecao"
            ][
                "x"
            ].append(
                numero(
                    projecao
                )
            )

            correlacoes[
                "projecao"
            ][
                "y"
            ].append(
                real
            )


        enriquecidos.append(
            item
        )

        jogadores_total += 1


    rank_real = criar_rank_real(
        enriquecidos
    )


    avaliacao_modelo = avaliar_ranking(

        enriquecidos,

        "projecao",

        rank_real

    )


    avaliacao_pb = avaliar_ranking(

        enriquecidos,

        "scorePB",

        rank_real

    )


    acumular_metricas(

        acumulador_modelo,

        avaliacao_modelo

    )


    acumular_metricas(

        acumulador_pb,

        avaliacao_pb

    )


    cobertura_rodada = sum(

        1

        for item in enriquecidos

        if item.get(
            "scorePB"
        ) is not None

    )


    resultado_rodadas.append({

        "rodada":
            rodada,

        "quantidadeJogadores":
            len(
                enriquecidos
            ),

        "jogadoresComHistoricoAnterior":
            cobertura_rodada,

        "coberturaHistoricaPercentual":
            arredondar(
                percentual(
                    cobertura_rodada,
                    len(
                        enriquecidos
                    )
                )
            ),

        "modeloAtual":
            avaliacao_modelo,

        "pontuacaoBasica":
            avaliacao_pb
    })


# ==========================================================
# CORRELAÇÕES
# ==========================================================

resultado_correlacoes = {}


for nome, valores in correlacoes.items():

    resultado_correlacoes[
        nome
    ] = {

        "amostras":
            len(
                valores[
                    "x"
                ]
            ),

        "correlacaoComProximaPontuacao":
            arredondar(

                correlacao(

                    valores[
                        "x"
                    ],

                    valores[
                        "y"
                    ]

                ),

                4

            )
    }


# ==========================================================
# ÚLTIMAS 5 / 10 RODADAS
# ==========================================================

def resumo_periodo(
    lista_rodadas
):

    modelo = defaultdict(
        float
    )

    pb = defaultdict(
        float
    )


    for item in lista_rodadas:

        acumular_metricas(

            modelo,

            item[
                "modeloAtual"
            ]

        )

        acumular_metricas(

            pb,

            item[
                "pontuacaoBasica"
            ]

        )


    return {

        "modeloAtual":
            fechar_acumulador(
                modelo
            ),

        "pontuacaoBasica":
            fechar_acumulador(
                pb
            )
    }


ultimas5 = resultado_rodadas[
    -5:
]

ultimas10 = resultado_rodadas[
    -10:
]


# ==========================================================
# DECISÃO EXPERIMENTAL
# ==========================================================

global_modelo = fechar_acumulador(
    acumulador_modelo
)

global_pb = fechar_acumulador(
    acumulador_pb
)


ganho_media_pb = (

    global_pb[
        "mediaRealSelecionados"
    ]

    -

    global_modelo[
        "mediaRealSelecionados"
    ]

)


ganho_top5_pb = (

    global_pb[
        "taxaTop5"
    ]

    -

    global_modelo[
        "taxaTop5"
    ]

)


if (
    ganho_media_pb > 0
    and
    ganho_top5_pb > 0
):

    decisao = (
        "HIPOTESE_PB_PROMISSORA"
    )

elif (
    ganho_media_pb > 0
    or
    ganho_top5_pb > 0
):

    decisao = (
        "HIPOTESE_PB_MISTA"
    )

else:

    decisao = (
        "HIPOTESE_PB_NAO_CONFIRMADA"
    )


# ==========================================================
# JSON FINAL
# ==========================================================

saida = {

    "modelo":
        "backtest_cientifico_v2_pb_walk_forward",

    "descricao":

        (
            "Backtest walk-forward da hipótese de "
            "Pontuação Básica Sustentável. "
            "As features de cada rodada utilizam "
            "somente rodadas anteriores."
        ),

    "regrasPontuacaoBasica": {

        "scoutsConsiderados":

            {

                scout:
                    peso

                for scout, peso
                in PESOS_SCOUTS.items()

                if scout
                not in
                EVENTOS_EXCLUIDOS_PB

            },

        "eventosExcluidos":

            sorted(
                EVENTOS_EXCLUIDOS_PB
            )
    },

    "amostra": {

        "rodadas":
            len(
                resultado_rodadas
            ),

        "jogadores":
            jogadores_total,

        "jogadoresComHistoricoAnterior":
            cobertura_total,

        "coberturaPercentual":
            arredondar(
                percentual(
                    cobertura_total,
                    jogadores_total
                )
            )
    },

    "correlacoes":
        resultado_correlacoes,

    "resumoGlobal": {

        "modeloAtual":
            global_modelo,

        "pontuacaoBasica":
            global_pb,

        "ganhoMediaRealPB":
            arredondar(
                ganho_media_pb
            ),

        "ganhoTaxaTop5PB":
            arredondar(
                ganho_top5_pb
            )
    },

    "ultimas5Rodadas":
        resumo_periodo(
            ultimas5
        ),

    "ultimas10Rodadas":
        resumo_periodo(
            ultimas10
        ),

    "decisaoExperimental": {

        "decisao":
            decisao,

        "promoverParaMotor":
            False,

        "motivo":

            (
                "Este primeiro teste é diagnóstico. "
                "Nenhum peso oficial deve ser alterado "
                "antes da análise dos resultados."
            )
    },

    "rodadas":
        resultado_rodadas
}


ARQUIVO_SAIDA.parent.mkdir(
    parents=True,
    exist_ok=True
)


with open(

    ARQUIVO_SAIDA,

    "w",

    encoding="utf-8"

) as arquivo:

    json.dump(

        saida,

        arquivo,

        ensure_ascii=False,

        indent=2

    )


# ==========================================================
# RESUMO NO ACTIONS
# ==========================================================

print()
print(
    "=============================================="
)
print(
    "RESULTADO GLOBAL"
)
print(
    "=============================================="
)

print(
    "Cobertura histórica:",
    saida[
        "amostra"
    ][
        "coberturaPercentual"
    ],
    "%"
)

print()

print(
    "Modelo atual - média real Top5:",
    global_modelo[
        "mediaRealSelecionados"
    ]
)

print(
    "PB - média real Top5:",
    global_pb[
        "mediaRealSelecionados"
    ]
)

print()

print(
    "Modelo atual - taxa Top5:",
    global_modelo[
        "taxaTop5"
    ],
    "%"
)

print(
    "PB - taxa Top5:",
    global_pb[
        "taxaTop5"
    ],
    "%"
)

print()

print(
    "Modelo atual - 10+:",
    global_modelo[
        "taxa10Mais"
    ],
    "%"
)

print(
    "PB - 10+:",
    global_pb[
        "taxa10Mais"
    ],
    "%"
)

print()

print(
    "Modelo atual - 15+:",
    global_modelo[
        "taxa15Mais"
    ],
    "%"
)

print(
    "PB - 15+:",
    global_pb[
        "taxa15Mais"
    ],
    "%"
)

print()

print(
    "Ganho médio PB:",
    saida[
        "resumoGlobal"
    ][
        "ganhoMediaRealPB"
    ]
)

print(
    "Ganho Top5 PB:",
    saida[
        "resumoGlobal"
    ][
        "ganhoTaxaTop5PB"
    ],
    "p.p."
)

print()

print(
    "Decisão:",
    decisao
)

print()
print(
    "Backtest científico V2 concluído."
)
