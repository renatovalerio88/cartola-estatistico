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
        return json.load(arquivo)



def media(lista):

    if not lista:
        return 0

    return round(
        sum(lista) / len(lista),
        3
    )



def calcular_mae_base():

    erros = []

    for arquivo in sorted(
        PASTA_HISTORICO.glob(
            "rodada-*.json"
        )
    ):

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

            if erro is not None:

                erros.append(
                    abs(erro)
                )

    return media(erros)



def calcular_mae_experimento(
    arquivo
):

    dados = carregar_json(
        Path(arquivo)
    )

    erros = []

    jogadores = dados.get(
        "jogadores",
        []
    )


    for jogador in jogadores:

        erro = jogador.get(
            "erro"
        )

        if erro is not None:

            erros.append(
                abs(erro)
            )


    return media(erros)



resultado = {

    "modelo":

        "comparacao_modelos_v3",

    "descricao":

        "Comparação científica entre versões do modelo",

    "modelos":

        []

}



# ============================
# MODELO BASE
# ============================

mae_base = calcular_mae_base()


resultado["modelos"].append({

    "nome":

        "Modelo Base",

    "mae":

        mae_base,

    "melhoria":

        0,

    "fonte":

        "historico"

})



# ============================
# EXPLOSÃO
# ============================

arquivo_explosao = Path(

    "data/explosoes.json"

)


if arquivo_explosao.exists():


    mae = calcular_mae_experimento(
        arquivo_explosao
    )


    if mae > 0:

        resultado["modelos"].append({

            "nome":

                "Modelo + Explosão",

            "mae":

                mae,

            "melhoria":

                round(
                    mae_base - mae,
                    3
                ),

            "fonte":

                "explosoes"

        })



# ============================
# DIFERENCIAL
# ============================

arquivo_diferencial = Path(

    "data/indice-diferencial.json"

)


if arquivo_diferencial.exists():


    mae = calcular_mae_experimento(
        arquivo_diferencial
    )


    if mae > 0:

        resultado["modelos"].append({

            "nome":

                "Modelo + Diferencial",

            "mae":

                mae,

            "melhoria":

                round(
                    mae_base - mae,
                    3
                ),

            "fonte":

                "indice-diferencial"

        })



# ranking

resultado["ranking"] = sorted(

    resultado["modelos"],

    key=lambda x:

        x["mae"]

)



resultado["melhorModelo"] = (

    resultado["ranking"][0]["nome"]

    if resultado["ranking"]

    else None

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
