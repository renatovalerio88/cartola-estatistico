"""
=========================================================
CARTOLA ESTATÍSTICO
Auditoria da Métrica Top Real

Objetivo:

Auditar a métrica utilizada para medir se os jogadores
escalados pelo modelo ficaram entre os melhores atletas
reais de cada posição.

Problema investigado:

As taxas atuais de Top Real ficaram muito baixas.
Antes de alterar pesos do modelo, precisamos saber se:

1. o modelo realmente está escolhendo mal;
2. a definição de Top Real está excessivamente rígida;
3. estamos comparando conjuntos de tamanhos diferentes;
4. existe algum problema de identificação dos atletas;
5. uma métrica mais informativa deve substituir ou
   complementar a métrica atual.

Este script NÃO altera o modelo.

Entradas:

data/simulacao-times.json

Dados históricos auxiliares:

data/historico/rodada-XX/jogadores.json
data/historico/rodada-XX.json
data/api/rodada-XX/jogadores.json
data/api/rodada-XX/pontuados.json

Saída:

data/auditoria-top-real.json

Métricas:

- Top N exato
- Top 5
- Top 10
- ranking real médio
- percentil médio
- pontos reais dos escalados
- pontos do time perfeito da posição
- eficiência de captura de pontos
- análise por estratégia
- análise por posição
- análise sem cold start

=========================================================
"""

from pathlib import Path
from statistics import mean
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
    "auditoria-top-real.json"
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
# MAPAS DE POSIÇÃO
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

    valores = [

        numero(
            valor,
            0
        )

        for valor
        in valores

    ]

    if not valores:
        return 0

    return mean(
        valores
    )


def percentual(
    quantidade,
    total
):

    if not total:
        return 0

    return round(
        (
            quantidade /
            total
        ) * 100,
        2
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

        jogador.get(
            "nome"
        )

        or jogador.get(
            "apelido"
        )

        or ""

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


    texto = texto.upper()


    if texto in POSICOES:
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
# ARQUIVOS HISTÓRICOS
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
# NORMALIZAÇÃO DOS REAIS
# ======================================================

def preparar_reais(
    jogadores
):

    resultado = {

        posicao: []

        for posicao
        in POSICOES

    }


    for jogador in jogadores:

        posicao = obter_posicao(
            jogador
        )


        if posicao not in resultado:
            continue


        resultado[
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

            "posicao":
                posicao,

            "pontos":
                arredondar(
                    obter_pontuacao_real(
                        jogador
                    )
                )

        })


    for posicao in resultado:

        resultado[
            posicao
        ].sort(

            key=lambda jogador:
                jogador[
                    "pontos"
                ],

            reverse=True

        )


        for indice, jogador in enumerate(
            resultado[
                posicao
            ],
            start=1
        ):

            jogador[
                "rankingReal"
            ] = indice


    return resultado


# ======================================================
# ÍNDICE DE RANKING REAL
# ======================================================

def criar_indice_ranking(
    ranking_posicao
):

    indice = {}


    total = len(
        ranking_posicao
    )


    for jogador in ranking_posicao:

        jogador_id = str(
            jogador.get(
                "id"
            )
        )


        ranking = inteiro(
            jogador.get(
                "rankingReal"
            ),
            0
        )


        if (
            total > 1
            and ranking > 0
        ):

            percentil = (

                1 -
                (
                    (
                        ranking -
                        1
                    )
                    /
                    (
                        total -
                        1
                    )
                )

            ) * 100

        elif total == 1:

            percentil = 100

        else:

            percentil = 0


        indice[
            jogador_id
        ] = {

            "ranking":
                ranking,

            "percentil":
                arredondar(
                    percentil
                ),

            "pontos":
                numero(
                    jogador.get(
                        "pontos"
                    ),
                    0
                ),

            "nome":
                jogador.get(
                    "nome"
                )

        }


    return indice


# ======================================================
# AUDITORIA DE UMA POSIÇÃO
# ======================================================

def auditar_posicao(
    jogadores_escalados,
    ranking_real
):

    quantidade_escalada = len(
        jogadores_escalados
    )


    quantidade_reais = len(
        ranking_real
    )


    if quantidade_escalada == 0:

        return {

            "jogadoresEscalados":
                0,

            "jogadoresReais":
                quantidade_reais,

            "identificados":
                0,

            "naoIdentificados":
                0,

            "topN": {
                "acertos": 0,
                "taxa": 0
            },

            "top5": {
                "acertos": 0,
                "taxa": 0
            },

            "top10": {
                "acertos": 0,
                "taxa": 0
            },

            "rankingRealMedio":
                0,

            "percentilMedio":
                0,

            "pontosEscalados":
                0,

            "pontosOtimos":
                0,

            "eficienciaCapturaPontos":
                0,

            "detalhes":
                []

        }


    indice = criar_indice_ranking(
        ranking_real
    )


    ids_top_n = {

        str(
            jogador[
                "id"
            ]
        )

        for jogador
        in ranking_real[
            :quantidade_escalada
        ]

    }


    ids_top_5 = {

        str(
            jogador[
                "id"
            ]
        )

        for jogador
        in ranking_real[
            :5
        ]

    }


    ids_top_10 = {

        str(
            jogador[
                "id"
            ]
        )

        for jogador
        in ranking_real[
            :10
        ]

    }


    acertos_top_n = 0

    acertos_top_5 = 0

    acertos_top_10 = 0

    identificados = 0

    rankings = []

    percentis = []

    pontos_escalados = 0

    detalhes = []


    for jogador in jogadores_escalados:

        jogador_id = str(
            jogador.get(
                "id"
            )
        )


        real = indice.get(
            jogador_id
        )


        if real:

            identificados += 1

            ranking = real[
                "ranking"
            ]

            percentil = real[
                "percentil"
            ]

            pontos = real[
                "pontos"
            ]


            rankings.append(
                ranking
            )

            percentis.append(
                percentil
            )

            pontos_escalados += pontos


        else:

            ranking = None

            percentil = None

            pontos = numero(

                jogador.get(
                    "pontos"
                ),

                0

            )

            pontos_escalados += pontos


        top_n = (
            jogador_id
            in ids_top_n
        )


        top_5 = (
            jogador_id
            in ids_top_5
        )


        top_10 = (
            jogador_id
            in ids_top_10
        )


        if top_n:

            acertos_top_n += 1


        if top_5:

            acertos_top_5 += 1


        if top_10:

            acertos_top_10 += 1


        detalhes.append({

            "id":
                jogador.get(
                    "id"
                ),

            "nome":
                jogador.get(
                    "nome"
                ),

            "projecao":
                arredondar(
                    jogador.get(
                        "projecao"
                    )
                ),

            "pontos":
                arredondar(
                    pontos
                ),

            "rankingReal":
                ranking,

            "percentilReal":
                percentil,

            "topN":
                top_n,

            "top5":
                top_5,

            "top10":
                top_10,

            "identificadoNaBaseReal":
                real is not None

        })


    pontos_otimos = sum(

        numero(
            jogador.get(
                "pontos"
            ),
            0
        )

        for jogador
        in ranking_real[
            :quantidade_escalada
        ]

    )


    if pontos_otimos != 0:

        eficiencia = (

            pontos_escalados /
            pontos_otimos

        ) * 100

    else:

        eficiencia = 0


    return {

        "jogadoresEscalados":
            quantidade_escalada,

        "jogadoresReais":
            quantidade_reais,

        "identificados":
            identificados,

        "naoIdentificados":
            (
                quantidade_escalada -
                identificados
            ),

        "taxaIdentificacao":
            percentual(
                identificados,
                quantidade_escalada
            ),

        "topN": {

            "tamanhoTop":
                quantidade_escalada,

            "acertos":
                acertos_top_n,

            "taxa":
                percentual(
                    acertos_top_n,
                    quantidade_escalada
                )

        },

        "top5": {

            "tamanhoTop":
                min(
                    5,
                    quantidade_reais
                ),

            "acertos":
                acertos_top_5,

            "taxa":
                percentual(
                    acertos_top_5,
                    quantidade_escalada
                )

        },

        "top10": {

            "tamanhoTop":
                min(
                    10,
                    quantidade_reais
                ),

            "acertos":
                acertos_top_10,

            "taxa":
                percentual(
                    acertos_top_10,
                    quantidade_escalada
                )

        },

        "rankingRealMedio":
            arredondar(
                media_segura(
                    rankings
                )
            ),

        "percentilMedio":
            arredondar(
                media_segura(
                    percentis
                )
            ),

        "pontosEscalados":
            arredondar(
                pontos_escalados
            ),

        "pontosOtimos":
            arredondar(
                pontos_otimos
            ),

        "eficienciaCapturaPontos":
            arredondar(
                eficiencia
            ),

        "detalhes":
            detalhes

    }


# ======================================================
# AUDITORIA DE UMA ESTRATÉGIA
# ======================================================

def auditar_estrategia(
    estrategia,
    reais_por_posicao
):

    jogadores = estrategia.get(
        "jogadores",
        []
    )


    resultado_posicoes = {}


    for posicao in POSICOES:

        selecionados = [

            jogador

            for jogador
            in jogadores

            if jogador.get(
                "posicao"
            ) == posicao

        ]


        ranking_real = (
            reais_por_posicao.get(
                posicao,
                []
            )
        )


        resultado_posicoes[
            posicao
        ] = auditar_posicao(

            selecionados,

            ranking_real

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

        "pontos":
            arredondar(
                estrategia.get(
                    "pontos"
                )
            ),

        "posicoes":
            resultado_posicoes

    }


# ======================================================
# ACUMULADOR
# ======================================================

def criar_acumulador():

    return {

        "escalados":
            0,

        "identificados":
            0,

        "topNAcertos":
            0,

        "top5Acertos":
            0,

        "top10Acertos":
            0,

        "rankings":
            [],

        "percentis":
            [],

        "pontosEscalados":
            0,

        "pontosOtimos":
            0,

        "eficiencias":
            []

    }


def acumular(
    acumulador,
    dados
):

    acumulador[
        "escalados"
    ] += inteiro(
        dados.get(
            "jogadoresEscalados"
        ),
        0
    )


    acumulador[
        "identificados"
    ] += inteiro(
        dados.get(
            "identificados"
        ),
        0
    )


    acumulador[
        "topNAcertos"
    ] += inteiro(
        dados.get(
            "topN",
            {}
        ).get(
            "acertos"
        ),
        0
    )


    acumulador[
        "top5Acertos"
    ] += inteiro(
        dados.get(
            "top5",
            {}
        ).get(
            "acertos"
        ),
        0
    )


    acumulador[
        "top10Acertos"
    ] += inteiro(
        dados.get(
            "top10",
            {}
        ).get(
            "acertos"
        ),
        0
    )


    for detalhe in dados.get(
        "detalhes",
        []
    ):

        ranking = detalhe.get(
            "rankingReal"
        )


        percentil = detalhe.get(
            "percentilReal"
        )


        if ranking is not None:

            acumulador[
                "rankings"
            ].append(
                numero(
                    ranking,
                    0
                )
            )


        if percentil is not None:

            acumulador[
                "percentis"
            ].append(
                numero(
                    percentil,
                    0
                )
            )


    acumulador[
        "pontosEscalados"
    ] += numero(
        dados.get(
            "pontosEscalados"
        ),
        0
    )


    acumulador[
        "pontosOtimos"
    ] += numero(
        dados.get(
            "pontosOtimos"
        ),
        0
    )


    acumulador[
        "eficiencias"
    ].append(

        numero(
            dados.get(
                "eficienciaCapturaPontos"
            ),
            0
        )

    )


# ======================================================
# RESUMO DO ACUMULADOR
# ======================================================

def resumir_acumulador(
    acumulador
):

    escalados = acumulador[
        "escalados"
    ]


    identificados = acumulador[
        "identificados"
    ]


    pontos_escalados = acumulador[
        "pontosEscalados"
    ]


    pontos_otimos = acumulador[
        "pontosOtimos"
    ]


    if pontos_otimos != 0:

        eficiencia_global = (

            pontos_escalados /
            pontos_otimos

        ) * 100

    else:

        eficiencia_global = 0


    return {

        "escalados":
            escalados,

        "identificados":
            identificados,

        "taxaIdentificacao":
            percentual(
                identificados,
                escalados
            ),

        "topN": {

            "acertos":
                acumulador[
                    "topNAcertos"
                ],

            "taxa":
                percentual(
                    acumulador[
                        "topNAcertos"
                    ],
                    escalados
                )

        },

        "top5": {

            "acertos":
                acumulador[
                    "top5Acertos"
                ],

            "taxa":
                percentual(
                    acumulador[
                        "top5Acertos"
                    ],
                    escalados
                )

        },

        "top10": {

            "acertos":
                acumulador[
                    "top10Acertos"
                ],

            "taxa":
                percentual(
                    acumulador[
                        "top10Acertos"
                    ],
                    escalados
                )

        },

        "rankingRealMedio":
            arredondar(
                media_segura(
                    acumulador[
                        "rankings"
                    ]
                )
            ),

        "percentilMedio":
            arredondar(
                media_segura(
                    acumulador[
                        "percentis"
                    ]
                )
            ),

        "pontosEscalados":
            arredondar(
                pontos_escalados
            ),

        "pontosOtimos":
            arredondar(
                pontos_otimos
            ),

        "eficienciaCapturaPontos":
            arredondar(
                eficiencia_global
            ),

        "eficienciaMediaRodada":
            arredondar(
                media_segura(
                    acumulador[
                        "eficiencias"
                    ]
                )
            )

    }


# ======================================================
# RESUMO GERAL
# ======================================================

def gerar_resumos(
    rodadas_auditadas,
    excluir_cold_start=False
):

    por_estrategia = {}

    por_posicao = {

        posicao:
            criar_acumulador()

        for posicao
        in POSICOES

    }


    geral = criar_acumulador()


    for rodada in rodadas_auditadas:

        if (
            excluir_cold_start
            and rodada.get(
                "coldStart"
            )
        ):

            continue


        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )


            if nome not in por_estrategia:

                por_estrategia[
                    nome
                ] = {

                    posicao:
                        criar_acumulador()

                    for posicao
                    in POSICOES

                }


            for posicao in POSICOES:

                dados = (
                    estrategia.get(
                        "posicoes",
                        {}
                    ).get(
                        posicao,
                        {}
                    )
                )


                acumular(

                    por_estrategia[
                        nome
                    ][
                        posicao
                    ],

                    dados

                )


                acumular(

                    por_posicao[
                        posicao
                    ],

                    dados

                )


                acumular(
                    geral,
                    dados
                )


    resumo_estrategias = {}


    for (
        nome,
        posicoes
    ) in por_estrategia.items():

        acumulador_estrategia = (
            criar_acumulador()
        )


        resumo_posicoes = {}


        for (
            posicao,
            acumulador
        ) in posicoes.items():

            resumo_posicoes[
                posicao
            ] = resumir_acumulador(
                acumulador
            )


            acumulador_estrategia[
                "escalados"
            ] += acumulador[
                "escalados"
            ]


            acumulador_estrategia[
                "identificados"
            ] += acumulador[
                "identificados"
            ]


            acumulador_estrategia[
                "topNAcertos"
            ] += acumulador[
                "topNAcertos"
            ]


            acumulador_estrategia[
                "top5Acertos"
            ] += acumulador[
                "top5Acertos"
            ]


            acumulador_estrategia[
                "top10Acertos"
            ] += acumulador[
                "top10Acertos"
            ]


            acumulador_estrategia[
                "rankings"
            ].extend(
                acumulador[
                    "rankings"
                ]
            )


            acumulador_estrategia[
                "percentis"
            ].extend(
                acumulador[
                    "percentis"
                ]
            )


            acumulador_estrategia[
                "pontosEscalados"
            ] += acumulador[
                "pontosEscalados"
            ]


            acumulador_estrategia[
                "pontosOtimos"
            ] += acumulador[
                "pontosOtimos"
            ]


            acumulador_estrategia[
                "eficiencias"
            ].extend(
                acumulador[
                    "eficiencias"
                ]
            )


        resumo_estrategias[
            nome
        ] = {

            "geral":
                resumir_acumulador(
                    acumulador_estrategia
                ),

            "posicoes":
                resumo_posicoes

        }


    resumo_posicoes = {

        posicao:
            resumir_acumulador(
                acumulador
            )

        for (
            posicao,
            acumulador
        ) in por_posicao.items()

    }


    return {

        "geral":
            resumir_acumulador(
                geral
            ),

        "estrategias":
            resumo_estrategias,

        "posicoes":
            resumo_posicoes

    }


# ======================================================
# DIAGNÓSTICO AUTOMÁTICO
# ======================================================

def gerar_diagnostico(
    resumo
):

    diagnosticos = []


    geral = resumo.get(
        "geral",
        {}
    )


    taxa_identificacao = numero(

        geral.get(
            "taxaIdentificacao"
        ),

        0

    )


    if taxa_identificacao < 95:

        diagnosticos.append({

            "nivel":
                "critico",

            "tipo":
                "identificacao",

            "mensagem":
                (
                    "A taxa de identificação entre "
                    "jogadores escalados e base real "
                    f"é de apenas {taxa_identificacao}%. "
                    "A métrica Top Real não deve ser usada "
                    "para calibrar pesos antes da correção."
                )

        })


    else:

        diagnosticos.append({

            "nivel":
                "ok",

            "tipo":
                "identificacao",

            "mensagem":
                (
                    "A identificação dos atletas entre "
                    "escalação e base real está adequada: "
                    f"{taxa_identificacao}%."
                )

        })


    top_n = numero(

        geral.get(
            "topN",
            {}
        ).get(
            "taxa"
        ),

        0

    )


    top_5 = numero(

        geral.get(
            "top5",
            {}
        ).get(
            "taxa"
        ),

        0

    )


    top_10 = numero(

        geral.get(
            "top10",
            {}
        ).get(
            "taxa"
        ),

        0

    )


    percentil = numero(

        geral.get(
            "percentilMedio"
        ),

        0

    )


    eficiencia = numero(

        geral.get(
            "eficienciaCapturaPontos"
        ),

        0

    )


    diagnosticos.append({

        "nivel":
            "informativo",

        "tipo":
            "top_real",

        "mensagem":
            (
                f"Top N exato: {top_n}%. "
                f"Top 5: {top_5}%. "
                f"Top 10: {top_10}%."
            )

    })


    diagnosticos.append({

        "nivel":
            "informativo",

        "tipo":
            "qualidade_ranking",

        "mensagem":
            (
                f"O jogador escalado médio está no "
                f"percentil {percentil} da sua posição."
            )

    })


    diagnosticos.append({

        "nivel":
            "informativo",

        "tipo":
            "captura_pontos",

        "mensagem":
            (
                "A eficiência global de captura de pontos "
                f"em relação ao time perfeito é "
                f"{eficiencia}%."
            )

    })


    # --------------------------------------------------
    # Melhor e pior posição
    # --------------------------------------------------

    posicoes = resumo.get(
        "posicoes",
        {}
    )


    validas = [

        (
            posicao,
            dados
        )

        for (
            posicao,
            dados
        ) in posicoes.items()

        if dados.get(
            "escalados",
            0
        ) > 0

    ]


    if validas:

        melhor_percentil = max(

            validas,

            key=lambda item:
                numero(
                    item[
                        1
                    ].get(
                        "percentilMedio"
                    ),
                    0
                )

        )


        pior_percentil = min(

            validas,

            key=lambda item:
                numero(
                    item[
                        1
                    ].get(
                        "percentilMedio"
                    ),
                    0
                )

        )


        diagnosticos.append({

            "nivel":
                "informativo",

            "tipo":
                "melhor_posicao_ranking",

            "mensagem":
                (
                    f"{melhor_percentil[0]} possui o "
                    "melhor percentil médio dos escalados: "
                    f"{melhor_percentil[1].get('percentilMedio')}."
                )

        })


        diagnosticos.append({

            "nivel":
                "atencao",

            "tipo":
                "pior_posicao_ranking",

            "mensagem":
                (
                    f"{pior_percentil[0]} possui o "
                    "menor percentil médio dos escalados: "
                    f"{pior_percentil[1].get('percentilMedio')}."
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
            "[ERRO] data/simulacao-times.json "
            "não encontrado ou vazio."
        )

        return


    rodadas = simulacao.get(
        "rodadas",
        []
    )


    rodadas_auditadas = []


    print(
        "============================================"
    )

    print(
        "AUDITORIA DA MÉTRICA TOP REAL"
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


        reais_por_posicao = (
            preparar_reais(
                jogadores_reais
            )
        )


        registro = {

            "rodada":
                rodada,

            "coldStart":
                rodada ==
                RODADA_COLD_START,

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

            registro[
                "estrategias"
            ].append(

                auditar_estrategia(

                    estrategia,

                    reais_por_posicao

                )

            )


        rodadas_auditadas.append(
            registro
        )


        print(
            f"[OK] Rodada {rodada:02d} | "
            f"Jogadores reais: "
            f"{len(jogadores_reais)} | "
            f"Estratégias: "
            f"{len(registro['estrategias'])}"
        )


    # ==================================================
    # RESUMOS
    # ==================================================

    resumo_completo = gerar_resumos(
        rodadas_auditadas,
        excluir_cold_start=False
    )


    resumo_sem_cold_start = gerar_resumos(
        rodadas_auditadas,
        excluir_cold_start=True
    )


    diagnosticos = gerar_diagnostico(
        resumo_sem_cold_start
    )


    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "auditoria_top_real_v1",

        "descricao":
            (
                "Auditoria científica da métrica "
                "de acerto dos melhores jogadores reais"
            ),

        "quantidadeRodadas":
            len(
                rodadas_auditadas
            ),

        "rodadaColdStart":
            RODADA_COLD_START,

        "metodologia": {

            "topN":
                (
                    "Compara os N jogadores escalados "
                    "da posição com os N maiores "
                    "pontuadores reais da posição."
                ),

            "top5":
                (
                    "Verifica se o escalado terminou "
                    "entre os cinco maiores pontuadores "
                    "reais da posição."
                ),

            "top10":
                (
                    "Verifica se o escalado terminou "
                    "entre os dez maiores pontuadores "
                    "reais da posição."
                ),

            "rankingRealMedio":
                (
                    "Posição média no ranking real "
                    "dos jogadores selecionados."
                ),

            "percentilMedio":
                (
                    "Percentil médio dos jogadores "
                    "escalados dentro de sua posição. "
                    "Quanto maior, melhor."
                ),

            "eficienciaCapturaPontos":
                (
                    "Razão entre os pontos reais "
                    "dos escalados e os pontos que "
                    "seriam obtidos escolhendo os "
                    "melhores jogadores reais da posição."
                )

        },

        "resumoCompleto":
            resumo_completo,

        "resumoSemColdStart":
            resumo_sem_cold_start,

        "diagnosticos":
            diagnosticos,

        "rodadas":
            rodadas_auditadas

    }


    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )


    # ==================================================
    # LOG RESUMIDO
    # ==================================================

    resumo_log = resumo_sem_cold_start.get(
        "geral",
        {}
    )


    print()

    print(
        "===== RESULTADO GLOBAL SEM COLD START ====="
    )


    print(
        "Escalados:",
        resumo_log.get(
            "escalados",
            0
        )
    )


    print(
        "Taxa identificação:",
        resumo_log.get(
            "taxaIdentificacao",
            0
        ),
        "%"
    )


    print(
        "Top N:",
        resumo_log.get(
            "topN",
            {}
        ).get(
            "taxa",
            0
        ),
        "%"
    )


    print(
        "Top 5:",
        resumo_log.get(
            "top5",
            {}
        ).get(
            "taxa",
            0
        ),
        "%"
    )


    print(
        "Top 10:",
        resumo_log.get(
            "top10",
            {}
        ).get(
            "taxa",
            0
        ),
        "%"
    )


    print(
        "Ranking real médio:",
        resumo_log.get(
            "rankingRealMedio",
            0
        )
    )


    print(
        "Percentil médio:",
        resumo_log.get(
            "percentilMedio",
            0
        )
    )


    print(
        "Eficiência captura de pontos:",
        resumo_log.get(
            "eficienciaCapturaPontos",
            0
        ),
        "%"
    )


    print()

    print(
        "===== RESULTADO POR POSIÇÃO ====="
    )


    for posicao in POSICOES:

        dados = (
            resumo_sem_cold_start
            .get(
                "posicoes",
                {}
            )
            .get(
                posicao,
                {}
            )
        )


        print(
            f"{posicao} | "
            f"TopN: "
            f"{dados.get('topN', {}).get('taxa', 0)}% | "
            f"Top5: "
            f"{dados.get('top5', {}).get('taxa', 0)}% | "
            f"Top10: "
            f"{dados.get('top10', {}).get('taxa', 0)}% | "
            f"Percentil: "
            f"{dados.get('percentilMedio', 0)} | "
            f"Eficiência: "
            f"{dados.get('eficienciaCapturaPontos', 0)}%"
        )


    print()

    print(
        "===== DIAGNÓSTICOS ====="
    )


    for diagnostico in diagnosticos:

        print(
            f"[{diagnostico.get('nivel', '-').upper()}]",
            diagnostico.get(
                "mensagem",
                ""
            )
        )


    print()

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
