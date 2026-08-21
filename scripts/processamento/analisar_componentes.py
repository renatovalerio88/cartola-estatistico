from pathlib import Path
import json
import math
from collections import defaultdict


# ==========================================================
# CARTOLA ESTATÍSTICO
# ANÁLISE DE COMPONENTES V4
# ==========================================================
#
# Este arquivo continua produzindo:
#
#   data/componentes.json
#
# mas agora:
#
# - mantém compatibilidade com o relatório antigo;
# - analisa componentes contra resultado real;
# - analisa erro por posição;
# - incorpora o diagnóstico de Pontuação Básica;
# - destaca últimas 5 e 10 rodadas;
# - NÃO altera os pesos do motor.
#
# ==========================================================


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_BACKTEST = Path(
    "data/backtest_cientifico.json"
)

ARQUIVO_SAIDA = Path(
    "data/componentes.json"
)


COMPONENTES = [

    "media3",

    "media5",

    "mediaGeral",

    "piso",

    "teto",

    "regularidade",

    "tendencia"
]


# ==========================================================
# UTILITÁRIOS
# ==========================================================

def carregar_json(
    caminho
):

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
    lista
):

    if not lista:

        return 0.0

    return sum(

        numero(
            x
        )

        for x in lista

    ) / len(
        lista
    )


def rmse(
    lista
):

    if not lista:

        return 0.0

    return math.sqrt(

        sum(

            numero(
                x
            ) ** 2

            for x in lista

        )

        /

        len(
            lista
        )

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

        for a, b
        in zip(
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
# ESTRUTURAS
# ==========================================================

componentes = {

    nome: {

        "valores":
            [],

        "reais":
            [],

        "erros":
            []

    }

    for nome
    in COMPONENTES

}


erros_globais = []


posicoes = defaultdict(
    lambda: {

        "erros":
            [],

        "reais":
            [],

        "projecoes":
            [],

        "quantidade10Mais":
            0,

        "quantidade15Mais":
            0

    }
)


rodadas_resumo = []


# ==========================================================
# LER HISTÓRICO DO MODELO
# ==========================================================

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


    jogadores = dados.get(
        "jogadores",
        []
    )


    if not isinstance(
        jogadores,
        list
    ):

        continue


    erros_rodada = []

    reais_rodada = []

    projecoes_rodada = []


    for jogador in jogadores:

        real = numero(
            jogador.get(
                "real"
            )
        )

        projecao = numero(
            jogador.get(
                "projecao"
            )
        )

        erro_assinado = (
            real
            -
            projecao
        )

        erro_absoluto = abs(
            erro_assinado
        )


        erros_globais.append(
            erro_absoluto
        )

        erros_rodada.append(
            erro_absoluto
        )

        reais_rodada.append(
            real
        )

        projecoes_rodada.append(
            projecao
        )


        posicao = str(

            jogador.get(
                "posicao",
                "OUT"
            )

        ).upper()


        posicoes[
            posicao
        ][
            "erros"
        ].append(
            erro_absoluto
        )

        posicoes[
            posicao
        ][
            "reais"
        ].append(
            real
        )

        posicoes[
            posicao
        ][
            "projecoes"
        ].append(
            projecao
        )


        if real >= 10:

            posicoes[
                posicao
            ][
                "quantidade10Mais"
            ] += 1


        if real >= 15:

            posicoes[
                posicao
            ][
                "quantidade15Mais"
            ] += 1


        for nome in COMPONENTES:

            valor = jogador.get(
                nome
            )

            if valor is None:

                continue

            componentes[
                nome
            ][
                "valores"
            ].append(
                numero(
                    valor
                )
            )

            componentes[
                nome
            ][
                "reais"
            ].append(
                real
            )

            componentes[
                nome
            ][
                "erros"
            ].append(
                erro_absoluto
            )


    rodadas_resumo.append({

        "rodada":
            rodada,

        "quantidade":
            len(
                jogadores
            ),

        "erroMedio":
            arredondar(
                media(
                    erros_rodada
                )
            ),

        "rmse":
            arredondar(
                rmse(
                    erros_rodada
                )
            ),

        "mediaReal":
            arredondar(
                media(
                    reais_rodada
                )
            ),

        "mediaProjetada":
            arredondar(
                media(
                    projecoes_rodada
                )
            ),

        "correlacao":
            arredondar(

                correlacao(

                    projecoes_rodada,

                    reais_rodada

                ),

                4

            )
    })


# ==========================================================
# RESULTADO PRINCIPAL
# ==========================================================

resultado = {

    "modelo":
        "laboratorio_componentes_v4",

    "descricao":

        (
            "Análise científica dos componentes do modelo "
            "e integração com o diagnóstico walk-forward "
            "de Pontuação Básica Sustentável."
        ),

    "amostras":
        len(
            erros_globais
        ),

    "rodadas":
        len(
            rodadas_resumo
        ),

    "erroMedio":
        arredondar(
            media(
                erros_globais
            )
        ),

    "rmse":
        arredondar(
            rmse(
                erros_globais
            )
        ),

    "componentes":
        {},

    "posicoes":
        {},

    "rankingComponentes":
        [],

    "desempenhoRecente":
        {},

    "pontuacaoBasica":
        {},

    "rodadasDetalhadas":
        rodadas_resumo
}


# ==========================================================
# COMPONENTES
# ==========================================================

for nome, dados in componentes.items():

    valores = dados[
        "valores"
    ]

    reais = dados[
        "reais"
    ]

    erros = dados[
        "erros"
    ]


    corr_real = correlacao(
        valores,
        reais
    )

    corr_erro = correlacao(
        valores,
        erros
    )


    resultado[
        "componentes"
    ][
        nome
    ] = {

        "media":
            arredondar(
                media(
                    valores
                )
            ),

        "quantidade":
            len(
                valores
            ),

        "correlacaoComReal":
            arredondar(
                corr_real,
                4
            ),

        "correlacaoComErro":
            arredondar(
                corr_erro,
                4
            )
    }


    resultado[
        "rankingComponentes"
    ].append({

        "componente":
            nome,

        "quantidade":
            len(
                valores
            ),

        "media":
            arredondar(
                media(
                    valores
                )
            ),

        "correlacaoComReal":
            arredondar(
                corr_real,
                4
            ),

        "forcaPreditivaAbsoluta":
            arredondar(
                abs(
                    corr_real
                ),
                4
            )
    })


# ==========================================================
# RANKING PELA FORÇA PREDITIVA
# ==========================================================

resultado[
    "rankingComponentes"
] = sorted(

    resultado[
        "rankingComponentes"
    ],

    key=lambda item:
        item[
            "forcaPreditivaAbsoluta"
        ],

    reverse=True

)


# ==========================================================
# POSIÇÕES
# ==========================================================

for posicao, dados in posicoes.items():

    quantidade = len(
        dados[
            "reais"
        ]
    )


    resultado[
        "posicoes"
    ][
        posicao
    ] = {

        "quantidade":
            quantidade,

        "erroMedio":
            arredondar(
                media(
                    dados[
                        "erros"
                    ]
                )
            ),

        "rmse":
            arredondar(
                rmse(
                    dados[
                        "erros"
                    ]
                )
            ),

        "mediaReal":
            arredondar(
                media(
                    dados[
                        "reais"
                    ]
                )
            ),

        "mediaProjetada":
            arredondar(
                media(
                    dados[
                        "projecoes"
                    ]
                )
            ),

        "correlacao":
            arredondar(

                correlacao(

                    dados[
                        "projecoes"
                    ],

                    dados[
                        "reais"
                    ]

                ),

                4

            ),

        "taxa10Mais":
            arredondar(

                (
                    dados[
                        "quantidade10Mais"
                    ]
                    /
                    quantidade
                    *
                    100
                )

                if quantidade

                else 0

            ),

        "taxa15Mais":
            arredondar(

                (
                    dados[
                        "quantidade15Mais"
                    ]
                    /
                    quantidade
                    *
                    100
                )

                if quantidade

                else 0

            )
    }


# ==========================================================
# ÚLTIMAS 5 / 10 RODADAS
# ==========================================================

def resumir_rodadas(
    lista
):

    if not lista:

        return {

            "rodadas":
                0,

            "erroMedio":
                0,

            "rmseMedio":
                0,

            "correlacaoMedia":
                0

        }

    return {

        "rodadas":
            len(
                lista
            ),

        "inicio":
            lista[
                0
            ][
                "rodada"
            ],

        "fim":
            lista[
                -1
            ][
                "rodada"
            ],

        "erroMedio":
            arredondar(

                media(

                    [
                        item[
                            "erroMedio"
                        ]

                        for item in lista
                    ]

                )

            ),

        "rmseMedio":
            arredondar(

                media(

                    [
                        item[
                            "rmse"
                        ]

                        for item in lista
                    ]

                )

            ),

        "correlacaoMedia":
            arredondar(

                media(

                    [
                        item[
                            "correlacao"
                        ]

                        for item in lista
                    ]

                ),

                4

            )
    }


resultado[
    "desempenhoRecente"
] = {

    "ultimas5":

        resumir_rodadas(
            rodadas_resumo[
                -5:
            ]
        ),

    "ultimas10":

        resumir_rodadas(
            rodadas_resumo[
                -10:
            ]
        )
}


# ==========================================================
# INCORPORAR BACKTEST DE PONTUAÇÃO BÁSICA
# ==========================================================

backtest = carregar_json(
    ARQUIVO_BACKTEST
)


if isinstance(
    backtest,
    dict
):

    resultado[
        "pontuacaoBasica"
    ] = {

        "modeloFonte":

            backtest.get(
                "modelo"
            ),

        "amostra":

            backtest.get(
                "amostra",
                {}
            ),

        "correlacoes":

            backtest.get(
                "correlacoes",
                {}
            ),

        "resumoGlobal":

            backtest.get(
                "resumoGlobal",
                {}
            ),

        "ultimas5Rodadas":

            backtest.get(
                "ultimas5Rodadas",
                {}
            ),

        "ultimas10Rodadas":

            backtest.get(
                "ultimas10Rodadas",
                {}
            ),

        "decisaoExperimental":

            backtest.get(
                "decisaoExperimental",
                {}
            )
    }


# ==========================================================
# HIPÓTESES AUTOMÁTICAS
# ==========================================================

hipoteses = []


pb = resultado.get(
    "pontuacaoBasica",
    {}
)


resumo_pb = pb.get(
    "resumoGlobal",
    {}
)


ganho_media = numero(
    resumo_pb.get(
        "ganhoMediaRealPB"
    )
)


ganho_top5 = numero(
    resumo_pb.get(
        "ganhoTaxaTop5PB"
    )
)


if ganho_media > 0:

    hipoteses.append({

        "tipo":
            "POSITIVA",

        "hipotese":
            "Pontuacao_Basica",

        "evidencia":

            (
                "Ranking experimental por PB obteve "
                f"{arredondar(ganho_media)} ponto(s) "
                "a mais por jogador selecionado."
            )
    })


if ganho_top5 > 0:

    hipoteses.append({

        "tipo":
            "POSITIVA",

        "hipotese":
            "Pontuacao_Basica_Top5",

        "evidencia":

            (
                "PB aumentou a taxa de acerto Top 5 em "
                f"{arredondar(ganho_top5)} ponto(s) "
                "percentual(is)."
            )
    })


if (
    ganho_media <= 0
    and
    ganho_top5 <= 0
):

    hipoteses.append({

        "tipo":
            "NEUTRA",

        "hipotese":
            "Pontuacao_Basica",

        "evidencia":

            (
                "A primeira versão do sinal PB ainda "
                "não superou o modelo atual. "
                "Não promover peso sem novos testes."
            )
    })


resultado[
    "hipoteses"
] = hipoteses


# ==========================================================
# RECOMENDAÇÃO CIENTÍFICA
# ==========================================================

resultado[
    "recomendacao"
] = {

    "alterarPesosAgora":
        False,

    "proximoPasso":

        (
            "Comparar PB3, PB5 e PB10 por posição, "
            "principalmente nas últimas 5 e 10 rodadas. "
            "Somente depois testar incorporação no motor."
        )
}


# ==========================================================
# SALVAR
# ==========================================================

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

        resultado,

        arquivo,

        ensure_ascii=False,

        indent=2

    )


# ==========================================================
# LOG DO ACTIONS
# ==========================================================

print()
print(
    "=============================================="
)
print(
    "ANÁLISE DE COMPONENTES V4"
)
print(
    "=============================================="
)
print()


print(
    "Amostras:",
    resultado[
        "amostras"
    ]
)

print(
    "Rodadas:",
    resultado[
        "rodadas"
    ]
)

print(
    "Erro médio:",
    resultado[
        "erroMedio"
    ]
)

print(
    "RMSE:",
    resultado[
        "rmse"
    ]
)

print()


print(
    "Últimas 5 rodadas:"
)

print(
    resultado[
        "desempenhoRecente"
    ][
        "ultimas5"
    ]
)

print()


print(
    "Últimas 10 rodadas:"
)

print(
    resultado[
        "desempenhoRecente"
    ][
        "ultimas10"
    ]
)

print()


if resultado[
    "pontuacaoBasica"
]:

    resumo = resultado[
        "pontuacaoBasica"
    ].get(
        "resumoGlobal",
        {}
    )

    print(
        "=============================================="
    )

    print(
        "PONTUAÇÃO BÁSICA"
    )

    print(
        "=============================================="
    )

    print()

    print(
        "Resumo:",
        resumo
    )

    print()

    print(
        "Decisão:",
        resultado[
            "pontuacaoBasica"
        ].get(
            "decisaoExperimental",
            {}
        ).get(
            "decisao"
        )
    )


print()
print(
    "Ranking dos componentes:"
)

for item in resultado[
    "rankingComponentes"
]:

    print(

        "-",

        item[
            "componente"
        ],

        "| correlação real:",

        item[
            "correlacaoComReal"
        ],

        "| força:",

        item[
            "forcaPreditivaAbsoluta"
        ]

    )


print()
print(
    "Componentes analisados com sucesso."
)
