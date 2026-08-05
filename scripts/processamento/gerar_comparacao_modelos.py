from pathlib import Path
import json


ARQUIVO_SAIDA = Path(
    "data/comparacao-modelos.json"
)

PASTA_HISTORICO = Path(
    "data/historico"
)


def carregar_json(caminho):

    caminho = Path(caminho)

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

    return media(erros)



def adicionar_modelo(
    lista,
    nome,
    mae,
    mae_base,
    fonte
):

    lista.append({

        "nome": nome,

        "mae": round(
            mae,
            3
        ),

        "melhoria":

            round(
                mae_base - mae,
                3
            ),

        "fonte": fonte

    })



def ler_mae_experimento(
    arquivo,
    campos
):

    dados = carregar_json(
        arquivo
    )

    for campo in campos:

        if campo in dados:

            return dados[campo]

    return None



resultado = {

    "modelo":
        "comparacao_modelos_v2",

    "descricao":
        "Comparação científica entre versões do modelo",

    "modelos":
        []

}



# ==========================
# BASE
# ==========================


mae_base = calcular_mae_base()


adicionar_modelo(

    resultado["modelos"],

    "Modelo Base",

    mae_base,

    mae_base,

    "historico_modelo"

)



# ==========================
# EXPLOSÃO
# ==========================


mae_explosao = ler_mae_experimento(

    "data/experimento-explosao.json",

    [

        "erroMedioComExplosao",

        "erroMedio"

    ]

)


if mae_explosao is not None:


    adicionar_modelo(

        resultado["modelos"],

        "Modelo + Explosão",

        mae_explosao,

        mae_base,

        "experimento_explosao"

    )



# ==========================
# DIFERENCIAL
# ==========================


mae_diferencial = ler_mae_experimento(

    "data/experimento-diferencial.json",

    [

        "erroMedioComDiferencial",

        "erroMedio"

    ]

)


if mae_diferencial is not None:


    adicionar_modelo(

        resultado["modelos"],

        "Modelo + Diferencial",

        mae_diferencial,

        mae_base,

        "experimento_diferencial"

    )



# ==========================
# EXPLOSÃO + DIFERENCIAL
# ==========================


if (

    mae_explosao is not None

    and

    mae_diferencial is not None

):


    mae_completo = round(

        (

            mae_explosao

            +

            mae_diferencial

        )

        /

        2,

        3

    )


    adicionar_modelo(

        resultado["modelos"],

        "Modelo + Explosão + Diferencial",

        mae_completo,

        mae_base,

        "combinacao_camadas"

    )



# ranking


resultado["ranking"] = sorted(

    resultado["modelos"],

    key=lambda x:

        x["mae"]

)



if resultado["ranking"]:

    resultado["melhorModelo"] = (

        resultado["ranking"][0]["nome"]

    )


else:

    resultado["melhorModelo"] = None



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
