from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
)


ARQUIVO_SAIDA = Path(
    "data/historico-modelo-detalhado.json"
)



def carregar_json(caminho):

    if not caminho.exists():

        return {}

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



resultado = {


    "modelo":

        "historico_detalhado_v1",


    "rodadas": []

}



arquivos = sorted(

    PASTA_HISTORICO.glob(

        "rodada-*.json"

    )

)



for arquivo in arquivos:


    dados = carregar_json(
        arquivo
    )


    rodada = dados.get(
        "rodada"
    )


    jogadores = dados.get(
        "jogadores",
        []
    )


    if not jogadores:

        continue



    erros = []



    por_posicao = {}



    maiores_erros = []



    melhores_acertos = []



    for jogador in jogadores:


        erro = jogador.get(
            "erro"
        )


        if erro is None:

            continue



        erro_abs = abs(
            erro
        )


        erros.append(
            erro_abs
        )



        posicao = jogador.get(
            "posicao",
            "OUT"
        )



        if posicao not in por_posicao:

            por_posicao[posicao] = []



        por_posicao[posicao].append(
            erro_abs
        )



        registro = {


            "nome":

                jogador.get(
                    "nome"
                ),


            "posicao":

                posicao,


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

        }



        maiores_erros.append(
            registro
        )



        melhores_acertos.append(
            registro
        )



    rodada_json = {


        "rodada":

            rodada,


        "mae":

            media(
                erros
            ),


        "quantidadeJogadores":

            len(
                erros
            ),



        "posicoes":

            {},



        "maioresErros":

            [],



        "melhoresAcertos":

            []

    }



    for posicao, valores in por_posicao.items():

        rodada_json["posicoes"][posicao] = {


            "quantidade":

                len(
                    valores
                ),


            "mae":

                media(
                    valores
                )

        }



    rodada_json["maioresErros"] = sorted(

        maiores_erros,

        key=lambda x:

            abs(
                x["erro"]
            ),

        reverse=True

    )[:10]



    rodada_json["melhoresAcertos"] = sorted(

        melhores_acertos,

        key=lambda x:

            abs(
                x["erro"]
            )

    )[:10]



    resultado["rodadas"].append(

        rodada_json

    )



resultado["rodadas"] = sorted(

    resultado["rodadas"],

    key=lambda x:

        x["rodada"]

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



print(
    "Histórico detalhado gerado."
)

print(
    "Rodadas:",
    len(
        resultado["rodadas"]
    )
)
