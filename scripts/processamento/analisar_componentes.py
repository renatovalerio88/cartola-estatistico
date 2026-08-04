from pathlib import Path
import json
import math


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_SAIDA = Path(
    "data/componentes.json"
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



def rmse(lista):

    if not lista:

        return 0

    return math.sqrt(
        sum(
            x ** 2
            for x in lista
        )
        /
        len(lista)
    )



componentes = {

    "media3": [],

    "media5": [],

    "mediaGeral": [],

    "piso": [],

    "teto": [],

    "regularidade": [],

    "tendencia": []

}



erros = []

posicoes = {}



arquivos = sorted(

    PASTA_HISTORICO.glob(
        "rodada-*.json"
    )

)



for arquivo in arquivos:


    dados = carregar_json(
        arquivo
    )


    for jogador in dados.get(
        "jogadores",
        []
    ):


        erro = abs(

            jogador.get(
                "erro",
                0
            )

        )


        erros.append(
            erro
        )



        for nome in componentes:


            valor = jogador.get(
                nome
            )


            if valor is not None:

                componentes[
                    nome
                ].append(
                    valor
                )



        posicao = jogador.get(
            "posicao",
            "OUT"
        )


        posicoes.setdefault(
            posicao,
            []
        ).append(
            erro
        )



resultado = {


    "modelo":

        "laboratorio_v3",


    "amostras":

        len(erros),


    "erroMedio":

        round(
            media(erros),
            2
        ),


    "rmse":

        round(
            rmse(erros),
            2
        ),


    "componentes":

        {},


    "posicoes":

        {}

}



for nome, valores in componentes.items():


    resultado[
        "componentes"
    ][nome] = {


        "media":

            round(
                media(valores),
                2
            ),


        "quantidade":

            len(valores)

    }



for posicao, valores in posicoes.items():


    resultado[
        "posicoes"
    ][posicao] = {


        "quantidade":

            len(valores),


        "erroMedio":

            round(
                media(valores),
                2
            ),


        "rmse":

            round(
                rmse(valores),
                2
            )

    }



# Ranking dos componentes
# baseado na estabilidade dos dados


ranking = []


for nome, valores in componentes.items():


    ranking.append({

        "componente":

            nome,

        "media":

            round(
                media(valores),
                2
            ),

        "quantidade":

            len(valores)

    })



ranking.sort(

    key=lambda x:
        x["media"]

)



resultado[
    "rankingComponentes"
] = ranking



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
    "Componentes analisados."
)

print(
    "Amostras:",
    len(erros)
)
