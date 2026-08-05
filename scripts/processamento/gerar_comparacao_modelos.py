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



# ==================================================
# MODELO BASE
# ==================================================


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
                    float(erro)
                )
            )


    return media(
        erros
    )



# ==================================================
# EXPLOSÃO
# ==================================================


def carregar_modelo_explosao():


    caminhos = [

        "data/experimento-explosao.json",

        "data/explosoes.json"

    ]


    for caminho in caminhos:


        dados = carregar_json(
            caminho
        )


        if not dados:

            continue


        erro = dados.get(
            "erroMedioComExplosao"
        )


        if erro is not None:

            return {

                "disponivel": True,

                "mae": round(
                    erro,
                    3
                ),

                "fonte": caminho

            }


    return {

        "disponivel": False

    }



# ==================================================
# DIFERENCIAL
# ==================================================


def carregar_diferencial():


    caminhos = [

        "data/experimento-diferencial.json",

        "data/indice-diferencial.json"

    ]


    for caminho in caminhos:


        dados = carregar_json(
            caminho
        )


        if not dados:

            continue


        jogadores = dados.get(
            "jogadores",
            []
        )


        return {

            "disponivel": True,

            "jogadoresAnalisados":

                len(jogadores),

            "fonte":

                caminho,

            "tipo":

                "camada_estrategica"

        }


    return {

        "disponivel": False

    }



# ==================================================
# GERAR RESULTADO
# ==================================================


resultado = {

    "modelo":

        "comparacao_modelos_v4",


    "descricao":

        "Comparação científica entre versões do modelo",


    "modelos":

        [],


    "camadasEstrategicas":

        []

}



# -------------------------------
# BASE
# -------------------------------


mae_base = calcular_mae_base()


resultado["modelos"].append({

    "nome":

        "Modelo Base",


    "mae":

        mae_base,


    "melhoria":

        0,


    "tipo":

        "projecao"

})



# -------------------------------
# EXPLOSÃO
# -------------------------------


explosao = carregar_modelo_explosao()



if explosao["disponivel"]:


    resultado["modelos"].append({

        "nome":

            "Modelo + Explosão",


        "mae":

            explosao["mae"],


        "melhoria":

            round(

                mae_base - explosao["mae"],

                3

            ),


        "tipo":

            "projecao",


        "fonte":

            explosao["fonte"]

    })



# -------------------------------
# DIFERENCIAL
# -------------------------------


diferencial = carregar_diferencial()



resultado["camadasEstrategicas"].append({

    "nome":

        "Índice Diferencial",


    "status":

        "teste",


    "dados":

        diferencial

})



# -------------------------------
# RANKING
# -------------------------------


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



# ==================================================
# SALVAR
# ==================================================


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
