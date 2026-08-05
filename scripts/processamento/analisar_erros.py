from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_SAIDA = Path(
    "data/analise-erros.json"
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



def faixa_preco(preco):

    if preco is None:

        return "sem_preco"


    if preco < 5:

        return "0-5"


    if preco < 10:

        return "5-10"


    if preco < 15:

        return "10-15"


    return "15+"



resultado = {


    "modelo":

        "diagnostico_erros_v1",


    "totalJogadores":

        0,


    "erroMedio":

        0,


    "porPosicao":

        {},


    "porPreco":

        {},


    "maioresErros":

        [],


    "tendenciaErro":

        {

            "superestimou": 0,

            "subestimou": 0

        }

}



erros_gerais = []



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


        erro = jogador.get(
            "erro"
        )


        if erro is None:

            continue



        erro_abs = abs(
            erro
        )


        erros_gerais.append(
            erro_abs
        )


        resultado[
            "totalJogadores"
        ] += 1



        posicao = jogador.get(
            "posicao",
            "OUT"
        )


        resultado[
            "porPosicao"
        ].setdefault(

            posicao,

            []

        )


        resultado[
            "porPosicao"
        ][posicao].append(
            erro_abs
        )



        preco = faixa_preco(
            jogador.get(
                "preco"
            )
        )


        resultado[
            "porPreco"
        ].setdefault(

            preco,

            []

        )


        resultado[
            "porPreco"
        ][preco].append(
            erro_abs
        )



        if erro > 0:

            resultado[
                "tendenciaErro"
            ][
                "subestimou"
            ] += 1


        elif erro < 0:

            resultado[
                "tendenciaErro"
            ][
                "superestimou"
            ] += 1



        resultado[
            "maioresErros"
        ].append({

            "nome":

                jogador.get(
                    "nome"
                ),

            "posicao":

                posicao,

            "rodada":

                dados.get(
                    "rodada"
                ),

            "projecao":

                jogador.get(
                    "projecao"
                ),

            "real":

                jogador.get(
                    "real"
                ),

            "erro":

                erro

        })



resultado[
    "erroMedio"
] = round(

    media(
        erros_gerais
    ),

    2

)



for posicao, valores in resultado[
    "porPosicao"
].items():

    resultado[
        "porPosicao"
    ][posicao] = {

        "quantidade":

            len(valores),

        "erroMedio":

            round(
                media(valores),
                2
            )

    }



for preco, valores in resultado[
    "porPreco"
].items():

    resultado[
        "porPreco"
    ][preco] = {

        "quantidade":

            len(valores),

        "erroMedio":

            round(
                media(valores),
                2
            )

    }



resultado[
    "maioresErros"
] = sorted(

    resultado[
        "maioresErros"
    ],

    key=lambda x:
        abs(
            x["erro"]
        ),

    reverse=True

)[:20]



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
    "Análise de erros concluída."
)

print(
    "Jogadores analisados:",
    resultado["totalJogadores"]
)

print(
    "Erro médio:",
    resultado["erroMedio"]
)
