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



def carregar_explosao():


    arquivos = [

        Path(
            "data/experimento-explosao.json"
        ),

        Path(
            "data/explosoes.json"
        )

    ]


    for arquivo in arquivos:


        if arquivo.exists():


            dados = carregar_json(
                arquivo
            )


            valor = dados.get(
                "erroMedioComExplosao"
            )


            if valor is not None:

                return round(
                    valor,
                    3
                )


    return None



def analisar_indice_diferencial():


    arquivo = Path(
        "data/indice-diferencial.json"
    )


    if not arquivo.exists():

        return {

            "disponivel": False

        }


    dados = carregar_json(
        arquivo
    )


    jogadores = dados.get(
        "jogadores",
        []
    )


    return {

        "disponivel": True,

        "jogadoresAnalisados":

            len(jogadores),

        "tipo":

            "camada estrategica"

    }



resultado = {


    "modelo":

        "comparacao_modelos_v4",


    "descricao":

        "Comparação científica entre versões do modelo",


    "modelos":

        []

}



# =================================
# MODELO BASE
# =================================


mae_base = calcular_mae_base()



resultado["modelos"].append({

    "nome":

        "Modelo Base",

    "mae":

        mae_base,

    "melhoria":

        0,

    "tipo":

        "projecao",

    "fonte":

        "historico"

})



# =================================
# EXPLOSÃO
# =================================


mae_explosao = carregar_explosao()



if mae_explosao is not None:


    resultado["modelos"].append({

        "nome":

            "Modelo + Explosão",

        "mae":

            mae_explosao,

        "melhoria":

            round(

                mae_base - mae_explosao,

                3

            ),

        "tipo":

            "projecao",

        "fonte":

            "experimento_explosao"

    })



# =================================
# ÍNDICE DIFERENCIAL
# =================================


diferencial = analisar_indice_diferencial()



resultado["camadasEstrategicas"] = [


    {

        "nome":

            "Índice Diferencial",


        "status":

            "teste",


        "dados":

            diferencial

    }


]



# =================================
# RANKING
# =================================


resultado["ranking"] = sorted(


    [

        modelo

        for modelo in resultado["modelos"]

        if modelo.get(
            "mae"
        )

        is not None

    ],


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
