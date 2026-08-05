from pathlib import Path
import json


ARQUIVO_SAIDA = Path(
    "data/comparacao-modelos.json"
)


PASTA_HISTORICO = Path(
    "data/historico"
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

        3

    )



def calcular_mae_base():

    erros = []


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


            erros.append(
                abs(
                    erro
                )
            )


    return media(
        erros
    )



def carregar_experimento(
    arquivo
):

    dados = carregar_json(
        Path(arquivo)
    )


    return {


        "erro":

            dados.get(
                "erroMedioComExplosao",
                0
            ),


        "melhorou":

            dados.get(
                "impacto",
                0
            )

    }



resultado = {


    "modelo":

        "comparacao_modelos_v1",


    "descricao":

        "Comparação científica entre versões",


    "modelos":

        []

}



# ================================
# MODELO BASE
# ================================


mae_base = calcular_mae_base()


resultado["modelos"].append({

    "nome":

        "Modelo Base",


    "mae":

        mae_base,


    "melhoria":

        0

})



# ================================
# MODELO EXPLOSÃO
# ================================


arquivo_explosao = Path(

    "data/experimento-explosao.json"

)



if arquivo_explosao.exists():


    explosao = carregar_json(
        arquivo_explosao
    )


    mae_explosao = explosao.get(

        "erroMedioComExplosao",

        mae_base

    )


    resultado["modelos"].append({

        "nome":

            "Modelo + Explosão",


        "mae":

            mae_explosao,


        "melhoria":

            round(

                mae_base - mae_explosao,

                3

            )

    })



# ================================
# MODELO DIFERENCIAL
# ================================


arquivo_diferencial = Path(

    "data/experimento-diferencial.json"

)



if arquivo_diferencial.exists():


    diferencial = carregar_json(
        arquivo_diferencial
    )


    mae_diferencial = diferencial.get(

        "erroMedioComDiferencial",

        mae_base

    )


    resultado["modelos"].append({

        "nome":

            "Modelo + Diferencial",


        "mae":

            mae_diferencial,


        "melhoria":

            round(

                mae_base - mae_diferencial,

                3

            )

    })



# ranking

resultado["ranking"] = sorted(

    resultado["modelos"],

    key=lambda x:

        x["mae"]

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
    "Comparação de modelos concluída."
)


for modelo in resultado["ranking"]:

    print(

        modelo["nome"],

        modelo["mae"]

    )
