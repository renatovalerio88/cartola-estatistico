from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
)


ARQUIVO_BACKTEST = Path(
    "data/backtest-inteligente.json"
)


ARQUIVO_LABORATORIO = Path(
    "data/laboratorio.json"
)


ARQUIVO_ERROS = Path(
    "data/analise-erros.json"
)


ARQUIVO_MODELO = Path(
    "data/modelo-calibrado.json"
)


ARQUIVO_SAIDA = Path(
    "data/historico-modelo.json"
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

        "historico_modelo_v1",


    "resumo":

        {},


    "rodadas":

        [],


    "evolucao":

        [],


    "posicoes":

        {},


    "versoes":

        []

}



# =====================================
# BACKTEST POR RODADA
# =====================================


backtest = carregar_json(
    ARQUIVO_BACKTEST
)



for rodada in backtest.get(
    "rodadas",
    []
):


    resultado["rodadas"].append({

        "rodada":

            rodada.get(
                "rodada"
            ),

        "erro":

            rodada.get(
                "erro"
            ),

        "taxaAcerto":

            rodada.get(
                "taxaAcerto"
            )

    })



resultado["rodadas"] = sorted(

    resultado["rodadas"],

    key=lambda x:

        x["rodada"]

)



# =====================================
# EVOLUÇÃO DO MODELO
# =====================================


for item in resultado["rodadas"]:


    resultado["evolucao"].append({

        "rodada":

            item["rodada"],

        "mae":

            item["erro"]

    })



# =====================================
# RESUMO GERAL
# =====================================


resultado["resumo"] = {


    "rodadasAnalisadas":

        len(
            resultado["rodadas"]
        ),


    "erroMedio":

        media([

            x["erro"]

            for x in resultado["rodadas"]

        ]),


    "melhorRodada":

        min(

            resultado["rodadas"],

            key=lambda x:

                x["erro"]

        )

        if resultado["rodadas"]

        else None,



    "piorRodada":

        max(

            resultado["rodadas"],

            key=lambda x:

                x["erro"]

        )

        if resultado["rodadas"]

        else None

}



# =====================================
# POSIÇÕES
# =====================================


analise_erros = carregar_json(
    ARQUIVO_ERROS
)



resultado["posicoes"] = analise_erros.get(

    "porPosicao",

    {}

)



# =====================================
# VERSÕES DO MODELO
# =====================================


laboratorio = carregar_json(
    ARQUIVO_LABORATORIO
)


modelo = carregar_json(
    ARQUIVO_MODELO
)



resultado["versoes"] = [


    {

        "nome":

            "Modelo Base",

        "versao":

            "1.0",

        "mae":

            laboratorio.get(
                "mae"
            )

    },


    {

        "nome":

            "Modelo Calibrado",

        "versao":

            modelo.get(
                "versao"
            ),

        "pesos":

            modelo.get(
                "pesos"
            )

    }


]



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
    "Histórico do modelo gerado."
)


print(
    "Rodadas:",
    len(
        resultado["rodadas"]
    )
)
