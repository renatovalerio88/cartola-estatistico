from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
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

    return round(
        sum(lista) / len(lista),
        2
    )



def calcular_forma_anterior(
    historico,
    rodada
):

    jogos = [

        x

        for x in historico

        if x.get("rodada", 0) < rodada

    ]


    jogos.sort(
        key=lambda x:
            x["rodada"]
    )


    pontos = [

        x.get(
            "pontos",
            0
        )

        or 0

        for x in jogos

    ]


    return {

        "mediaGeral":
            media(
                pontos
            ),

        "media3":

            media(
                pontos[-3:]
            ),

        "media5":

            media(
                pontos[-5:]
            ),

        "jogosAntes":

            len(
                pontos
            )

    }



resultado = {

    "modelo":
        "analise_explosoes_v1",

    "totalExplosoes":
        0,

    "mais15":
        [],

    "mais20":
        [],

    "mais25":
        [],

    "padroes":
        {}

}



arquivos = sorted(

    Path(
        "data/base-historica"
    ).glob(
        "*.json"
    )

)



explosoes = []



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    historico = jogador.get(
        "historico",
        []
    )


    for jogo in historico:


        pontos = (
            jogo.get(
                "pontos",
                0
            )
            or 0
        )


        if pontos < 15:
            continue


        rodada = jogo.get(
            "rodada"
        )


        forma = calcular_forma_anterior(
            historico,
            rodada
        )


        explosao = {


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


            "rodada":
                rodada,


            "pontos":
                pontos,


            "mediaAntes":
                forma["mediaGeral"],


            "media3Antes":
                forma["media3"],


            "media5Antes":
                forma["media5"],


            "jogosAntes":
                forma["jogosAntes"]

        }


        explosoes.append(
            explosao
        )



resultado["totalExplosoes"] = len(
    explosoes
)



resultado["mais15"] = [

    x

    for x in explosoes

    if x["pontos"] >= 15

]



resultado["mais20"] = [

    x

    for x in explosoes

    if x["pontos"] >= 20

]



resultado["mais25"] = [

    x

    for x in explosoes

    if x["pontos"] >= 25

]



# ====================================
# PADRÕES
# ====================================


resultado["padroes"] = {


    "mediaAntes":

        media([

            x["mediaAntes"]

            for x in explosoes

        ]),


    "media3Antes":

        media([

            x["media3Antes"]

            for x in explosoes

        ]),


    "media5Antes":

        media([

            x["media5Antes"]

            for x in explosoes

        ]),


    "jogosAntes":

        media([

            x["jogosAntes"]

            for x in explosoes

        ])

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
    "Análise de explosões concluída."
)

print(
    "Explosões encontradas:",
    resultado["totalExplosoes"]
)
