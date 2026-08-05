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



dados = carregar_json(
    ARQUIVO_ENTRADA
)



resumo = dados.get(
    "resumo",
    []
)



ranking = []



for posicao, item in enumerate(
    resumo,
    start=1
):

    ranking.append({

        "posicao":
            posicao,

        "estrategia":
            item.get(
                "nome"
            ),

        "pontosTotal":
            item.get(
                "pontosTotal",
                0
            ),

        "mediaRodada":
            item.get(
                "mediaRodada",
                0
            )

    })



resultado = {


    "modelo":

        "ranking_simulacao_v1",


    "descricao":

        "Ranking histórico das estratégias de escalação",


    "rodadasAnalisadas":

        len(
            dados.get(
                "times",
                []
            )
        ),


    "ranking":

        ranking,


    "melhorEstrategia":

        ranking[0]["estrategia"]
        if ranking
        else None

}



salvar_json(
    ARQUIVO_SAIDA,
    resultado
)



print(
    "Ranking da simulação concluído."
)


for item in ranking:

    print(
        item["posicao"],
        item["estrategia"],
        item["pontosTotal"]
    )
