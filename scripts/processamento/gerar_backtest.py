from pathlib import Path
import json
import statistics


PASTA_BASE = Path(
    "data/base-historica"
)

PASTA_SAIDA = Path(
    "data/historico"
)


PASTA_SAIDA.mkdir(
    parents=True,
    exist_ok=True
)



def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def salvar_json(
    caminho,
    dados
):

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



def media(lista):

    if not lista:
        return 0

    return sum(lista) / len(lista)



def ultimos(lista, quantidade):

    return lista[-quantidade:]



def calcular_componentes(historico):

    pontos = [

        item.get("pontos")

        for item in historico

        if item.get("pontos") is not None

    ]


    if not pontos:

        return {

            "media3": 0,
            "media5": 0,
            "mediaGeral": 0,
            "piso": 0,
            "teto": 0,
            "regularidade": 0,
            "tendencia": 0

        }


    media3 = media(
        ultimos(
            pontos,
            3
        )
    )


    media5 = media(
        ultimos(
            pontos,
            5
        )
    )


    mediaGeral = media(
        pontos
    )


    piso = min(
        pontos
    )


    teto = max(
        pontos
    )


    regularidade = 0

    if len(pontos) > 1:

        regularidade = max(
            0,
            10 -
            statistics.pstdev(
                pontos
            )
        )


    tendencia = 0

    if len(pontos) >= 2:

        tendencia = (
            pontos[-1]
            -
            pontos[-2]
        )


    return {

        "media3":
            round(media3,2),

        "media5":
            round(media5,2),

        "mediaGeral":
            round(mediaGeral,2),

        "piso":
            round(piso,2),

        "teto":
            round(teto,2),

        "regularidade":
            round(regularidade,2),

        "tendencia":
            round(tendencia,2)

    }



def calcular_projecao(componentes):


    base = (

        componentes["media3"] * 0.35

        +

        componentes["media5"] * 0.25

        +

        componentes["mediaGeral"] * 0.20

    )


    ajuste_tendencia = (

        componentes["tendencia"]
        *
        0.10

    )


    fator_regularidade = (

        0.95

        +

        (
            componentes["regularidade"]
            /
            100
        )

    )


    projecao = (

        base
        +
        ajuste_tendencia

    ) * fator_regularidade



    return round(
        projecao,
        2
    )



rodadas = {}



arquivos = sorted(
    PASTA_BASE.glob(
        "*.json"
    )
)



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    historico = jogador.get(
        "historico",
        []
    )


    historico.sort(
        key=lambda x:
            x.get(
                "rodada",
                0
            )
    )



    for indice in range(
        1,
        len(historico)
    ):


        treino = historico[:indice]


        real = historico[indice].get(
            "pontos"
        )


        rodada = historico[indice].get(
            "rodada"
        )


        if real is None:

            continue



        componentes = calcular_componentes(
            treino
        )


        projecao = calcular_projecao(
            componentes
        )


        erro = abs(
            real - projecao
        )



        rodadas.setdefault(
            rodada,
            []
        ).append({

            "id":
                jogador.get(
                    "id"
                ),

            "nome":
                jogador.get(
                    "nome"
                ),

            "posicao":
                jogador.get(
                    "posicao"
                ),

            "projecao":
                projecao,

            "real":
                real,

            "erro":
                round(
                    erro,
                    2
                ),

            **componentes

        })



for rodada, jogadores in rodadas.items():


    jogadores.sort(

        key=lambda x:
            x["projecao"],

        reverse=True

    )


    erros = [

        jogador["erro"]

        for jogador in jogadores

    ]



    salvar_json(

        PASTA_SAIDA /
        f"rodada-{rodada:02d}.json",

        {

            "rodada":
                rodada,

            "erroMedio":
                round(
                    media(erros),
                    2
                ),

            "taxaAcerto":
                round(

                    len(
                        [
                            erro
                            for erro in erros
                            if erro <= 3
                        ]
                    )
                    *
                    100
                    /
                    len(erros),

                    2

                ),

            "quantidade":
                len(jogadores),

            "jogadores":
                jogadores

        }

    )



print(
    f"{len(rodadas)} rodadas processadas."
)
