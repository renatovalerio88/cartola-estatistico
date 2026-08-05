from pathlib import Path
import json



ARQUIVO_MODELO = Path(
    "data/historico/historico_modelo.json"
)


ARQUIVO_DETALHADO = Path(
    "data/historico/historico_detalhado.json"
)


ARQUIVO_TIMES = Path(
    "data/historico/historico_times.json"
)


ARQUIVO_SAIDA = Path(
    "data/historico/graficos_historico.json"
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



modelo = carregar_json(
    ARQUIVO_MODELO
)


detalhado = carregar_json(
    ARQUIVO_DETALHADO
)


times = carregar_json(
    ARQUIVO_TIMES
)



resultado = {

    "modelo":

        "graficos_historico_v1",


    "descricao":

        "Dados preparados para gráficos da aba histórico",


    "evolucaoModelo":

        [],


    "porPosicao":

        {},


    "times":

        {}

}



# ======================================
# EVOLUÇÃO DO MODELO
# ======================================


for rodada in modelo.get(
    "rodadas",
    []
):


    resultado["evolucaoModelo"].append({

        "rodada":

            rodada.get(
                "rodada"
            ),


        "erroMedio":

            rodada.get(
                "erro"
            ),


        "taxaAcerto":

            rodada.get(
                "taxaAcerto"
            )

    })



# ======================================
# EVOLUÇÃO POR POSIÇÃO
# ======================================


posicoes = {}



for rodada in detalhado.get(
    "rodadas",
    []
):


    numero_rodada = rodada.get(
        "rodada"
    )


    for posicao, dados in rodada.get(
        "posicoes",
        {}
    ).items():


        if posicao not in posicoes:

            posicoes[posicao] = []



        posicoes[posicao].append({

            "rodada":

                numero_rodada,


            "erroMedio":

                dados.get(
                    "mae"
                ),


            "quantidade":

                dados.get(
                    "quantidade"
                )

        })



resultado["porPosicao"] = posicoes



# ======================================
# EVOLUÇÃO DOS TIMES
# ======================================


for estrategia, dados in times.get(
    "estrategias",
    {}
).items():


    resultado["times"][estrategia] = {

        "total":

            dados.get(
                "total"
            ),


        "media":

            dados.get(
                "media"
            ),


        "evolucao":

            dados.get(
                "evolucao",
                []
            )

    }



salvar_json(

    ARQUIVO_SAIDA,

    resultado

)



print(
    "Dados dos gráficos históricos gerados."
)


print(

    "Evolução modelo:",

    len(
        resultado["evolucaoModelo"]
    ),

    "rodadas"

)


print(

    "Posições:",

    len(
        resultado["porPosicao"]
    )

)


print(

    "Estratégias:",

    len(
        resultado["times"]
    )

)
