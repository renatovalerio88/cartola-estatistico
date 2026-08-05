from pathlib import Path
import json


PASTA_BASE = Path(
    "data/base-historica"
)


ARQUIVO_SAIDA = Path(
    "data/explosoes.json"
)



def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def media(lista):

    if not lista:

        return 0

    return sum(lista) / len(lista)



def calcular_explosao(jogador):

    historico = jogador.get(
        "historico",
        []
    )


    if len(historico) < 3:

        return None



    pontos = [

        item.get(
            "pontos",
            0
        ) or 0

        for item in historico

    ]



    media_geral = media(
        pontos
    )


    ultimos3 = media(
        pontos[-3:]
    )


    ultimos5 = media(
        pontos[-5:]
    )



    maiores = [

        ponto

        for ponto in pontos

        if ponto >= 15

    ]


    explosoes = len(
        maiores
    )



    jogos = len(
        pontos
    )



    posicao = jogador.get(
        "posicao",
        ""
    )



    score = 0



    # ==================================
    # POSIÇÃO OFENSIVA
    # ==================================

    if posicao == "ATA":

        score += 25


    elif posicao == "MEI":

        score += 20


    elif posicao == "LAT":

        score += 10


    elif posicao == "ZAG":

        score += 5



    # ==================================
    # HISTÓRICO DE EXPLOSÕES
    # ==================================

    score += min(
        explosoes * 10,
        30
    )



    # ==================================
    # MOMENTO
    # ==================================

    if ultimos3 > media_geral:

        score += 15


    if ultimos5 > media_geral:

        score += 10



    # ==================================
    # REGULARIDADE DE JOGOS
    # ==================================

    if jogos >= 10:

        score += 10



    # ==================================
    # PENALIZAÇÃO
    # ==================================

    if media_geral < 1:

        score -= 10



    score = max(
        0,
        min(
            100,
            score
        )
    )



    return {

        "id":

            jogador.get(
                "id"
            ),


        "nome":

            jogador.get(
                "nome"
            ),


        "posicao":

            posicao,


        "media":

            round(
                media_geral,
                2
            ),


        "media3":

            round(
                ultimos3,
                2
            ),


        "media5":

            round(
                ultimos5,
                2
            ),


        "explosoes":

            explosoes,


        "jogos":

            jogos,


        "riscoExplosao":

            round(
                score,
                2
            )

    }



resultado = {

    "modelo":

        "explosao_v1",


    "jogadores":

        [],


    "resumo":

        {}

}



arquivos = sorted(

    PASTA_BASE.glob(
        "*.json"
    )

)



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    explosao = calcular_explosao(
        jogador
    )


    if explosao:

        resultado[
            "jogadores"
        ].append(
            explosao
        )



resultado[
    "jogadores"
] = sorted(

    resultado[
        "jogadores"
    ],

    key=lambda x:

        x["riscoExplosao"],

    reverse=True

)



total = len(
    resultado[
        "jogadores"
    ]
)



alto = len(

    [

        j

        for j in resultado["jogadores"]

        if j["riscoExplosao"] >= 70

    ]

)



medio = len(

    [

        j

        for j in resultado["jogadores"]

        if 40 <= j["riscoExplosao"] < 70

    ]

)



resultado[
    "resumo"
] = {


    "totalJogadores":

        total,


    "altoRisco":

        alto,


    "medioRisco":

        medio,


    "baixoRisco":

        total - alto - medio

}



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



print(
    "Banco de explosões criado."
)


print(
    "Jogadores analisados:",
    total
)


print(
    "Alto risco:",
    alto
)
