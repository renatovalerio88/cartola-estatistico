from pathlib import Path
import json


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

ARQUIVO_EXPLOSAO = Path(
    "data/experimentos/explosao-v1.json"
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

        "historico_modelo_v2",



    "metricaOficial": {


        "tipo":

            "backtest_progressivo",


        "descricao":

            "Modelo treinado apenas com dados anteriores à rodada prevista"

    },



    "resumo": {},



    "rodadas": [],



    "evolucao": [],



    "posicoes": {},



    "versoes": [],



    "experimentos": []

}



# =====================================
# BACKTEST OFICIAL
# =====================================


backtest = carregar_json(
    ARQUIVO_BACKTEST
)



rodadas = backtest.get(
    "rodadas",
    []
)



for rodada in rodadas:


    item = {


        "rodada":

            rodada.get(
                "rodada"
            ),


        "mae":

            rodada.get(
                "erro"
            ),


        "taxaAcerto":

            rodada.get(
                "taxaAcerto"
            )

    }


    resultado["rodadas"].append(
        item
    )


    resultado["evolucao"].append({

        "rodada":

            item["rodada"],


        "mae":

            item["mae"]

    })



resultado["resumo"] = {


    "rodadasAnalisadas":

        len(
            rodadas
        ),


    "mae":

        media([

            x.get(
                "mae",
                0
            )

            for x in rodadas

        ]),


    "melhorRodada":

        min(

            rodadas,

            key=lambda x:

                x.get(
                    "erro",
                    999
                )

        )

        if rodadas

        else None,



    "piorRodada":

        max(

            rodadas,

            key=lambda x:

                x.get(
                    "erro",
                    0
                )

        )

        if rodadas

        else None

}



# =====================================
# ANÁLISE POR POSIÇÃO
# =====================================


erros = carregar_json(
    ARQUIVO_ERROS
)



resultado["posicoes"] = erros.get(

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

            "Modelo Laboratório Inicial",


        "versao":

            laboratorio.get(
                "modelo",
                "1.0"
            ),


        "mae":

            laboratorio.get(
                "mae"
            ),


        "observacao":

            "Primeiro modelo validado"

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
                "pesos",
                {}

            ),


        "observacao":

            "Pesos ajustados pelo histórico"

    }

]



# =====================================
# EXPERIMENTOS
# =====================================


explosao = carregar_json(
    ARQUIVO_EXPLOSAO
)



if explosao:


    resultado["experimentos"].append({

        "nome":

            "Índice Explosão",


        "tipo":

            "camada estratégica",


        "resultado":

            "não incorporado na projeção",


        "erroOriginal":

            explosao.get(
                "erroMedioOriginal"
            ),


        "erroComExplosao":

            explosao.get(
                "erroMedioComExplosao"
            ),


        "impacto":

            explosao.get(
                "impacto"
            ),


        "decisao":

            "usar futuramente em capitão e diferenciais"

    })



# =====================================
# SALVAR
# =====================================


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
    "Histórico do modelo v2 gerado."
)

print(
    "Rodadas:",
    len(
        resultado["rodadas"]
    )
)

print(
    "MAE oficial:",
    resultado["resumo"]["mae"]
)
