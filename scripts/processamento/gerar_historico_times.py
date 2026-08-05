from pathlib import Path
import json



ARQUIVO_ENTRADA = Path(
    "data/historico/simulacao_times.json"
)


ARQUIVO_SAIDA = Path(
    "data/historico/historico_times.json"
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



def numero(valor):

    try:

        return float(valor)

    except:

        return 0



def analisar_estrategia(rodadas, estrategia):

    pontos = []

    evolucao = []


    for rodada in rodadas:

        dados = (

            rodada
            .get("times", {})
            .get(estrategia, {})

        )


        valor = numero(

            dados.get(
                "pontos"
            )

        )


        pontos.append(
            valor
        )


        evolucao.append({

            "rodada":

                rodada.get(
                    "rodada"
                ),


            "pontos":

                valor

        })


    if not pontos:

        return {

            "total":0,
            "media":0,
            "melhorRodada":None,
            "piorRodada":None,
            "evolucao":[]

        }



    melhor = max(
        evolucao,
        key=lambda x:
            x["pontos"]
    )


    pior = min(
        evolucao,
        key=lambda x:
            x["pontos"]
    )



    return {

        "total":

            round(
                sum(pontos),
                2
            ),


        "media":

            round(
                sum(pontos) / len(pontos),
                2
            ),


        "rodadas":

            len(pontos),


        "melhorRodada":

            melhor,


        "piorRodada":

            pior,


        "evolucao":

            evolucao

    }



dados = carregar_json(
    ARQUIVO_ENTRADA
)



rodadas = dados.get(
    "rodadas",
    []
)



resultado = {


    "modelo":

        "historico_times_v1",


    "descricao":

        "Desempenho histórico das escalações sugeridas pelo modelo",


    "resumo": {},


    "estrategias": {}

}



estrategias = [

    "conservador",

    "equilibrado",

    "agressivo"

]



for estrategia in estrategias:


    resultado["estrategias"][estrategia] = (

        analisar_estrategia(

            rodadas,

            estrategia

        )

    )



ranking = sorted(

    [

        {

            "nome":

                nome,


            "total":

                dados["total"],


            "media":

                dados["media"]

        }

        for nome, dados

        in resultado["estrategias"].items()

    ],

    key=lambda x:

        x["total"],

    reverse=True

)



resultado["resumo"] = {


    "rodadasAnalisadas":

        len(
            rodadas
        ),


    "melhorEstrategia":

        ranking[0]

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
    "Histórico de times concluído."
)


print(

    "Rodadas analisadas:",

    len(
        rodadas
    )

)


for item in ranking:

    print(

        item["nome"],

        item["total"]

    )
