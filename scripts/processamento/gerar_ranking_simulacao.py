from pathlib import Path
import json


ARQUIVO_ENTRADA = Path(
    "data/simulacao-times.json"
)


ARQUIVO_SAIDA = Path(
    "data/ranking-simulacao.json"
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



def salvar_json(caminho, dados):

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

    return round(

        sum(lista) / len(lista),

        2

    )



def processar():

    dados = carregar_json(
        ARQUIVO_ENTRADA
    )


    estrategias = {}



    for rodada in dados.get(
        "rodadas",
        []
    ):


        numero_rodada = rodada.get(
            "rodada"
        )


        for estrategia in rodada.get(
            "estrategias",
            []
        ):


            nome = estrategia.get(
                "nome"
            )


            pontos = estrategia.get(
                "pontos",
                0
            )


            if nome not in estrategias:

                estrategias[nome] = []



            estrategias[nome].append({

                "rodada":

                    numero_rodada,


                "pontos":

                    pontos

            })



    ranking = []



    for nome, resultados in estrategias.items():


        pontos = [

            x["pontos"]

            for x in resultados

        ]



        melhor = max(

            resultados,

            key=lambda x:

                x["pontos"]

        )


        pior = min(

            resultados,

            key=lambda x:

                x["pontos"]

        )



        ranking.append({


            "nome":

                nome,


            "rodadas":

                len(
                    resultados
                ),


            "pontosTotal":

                round(

                    sum(
                        pontos
                    ),

                    2

                ),


            "mediaPontos":

                media(
                    pontos
                ),


            "melhorRodada":

            {

                "rodada":

                    melhor["rodada"],


                "pontos":

                    melhor["pontos"]

            },


            "piorRodada":

            {

                "rodada":

                    pior["rodada"],


                "pontos":

                    pior["pontos"]

            }

        })



    ranking = sorted(

        ranking,

        key=lambda x:

            x["pontosTotal"],

        reverse=True

    )



    for indice, item in enumerate(

        ranking,

        start=1

    ):

        item["posicao"] = indice



    resultado = {


        "modelo":

            "ranking_simulacao_v1",


        "descricao":

            "Ranking histórico das estratégias de escalação",


        "melhorEstrategia":

            ranking[0]["nome"]

            if ranking

            else None,


        "ranking":

            ranking

    }



    salvar_json(

        ARQUIVO_SAIDA,

        resultado

    )


    print(
        "Ranking de simulação gerado."
    )


    print(
        "Estratégias:",
        len(
            ranking
        )
    )


    if ranking:

        print(

            "Melhor:",

            ranking[0]["nome"],

            ranking[0]["pontosTotal"]

        )



if __name__ == "__main__":

    processar()
