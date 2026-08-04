from pathlib import Path
import json
from datetime import datetime


ARQUIVO_PESOS = Path(
    "data/pesos.json"
)

ARQUIVO_COMPONENTES = Path(
    "data/componentes.json"
)

ARQUIVO_SAIDA = Path(
    "data/modelo-calibrado.json"
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



def salvar_json(
    caminho,
    dados
):

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



def normalizar_pesos(pesos):

    total = sum(
        pesos.values()
    )


    if total == 0:

        return pesos


    return {

        chave:
            round(
                valor / total,
                4
            )

        for chave, valor
        in pesos.items()

    }



def extrair_pesos():

    dados = carregar_json(
        ARQUIVO_PESOS
    )


    pesos = dados.get(
        "pesos",
        {}
    )


    if not pesos:

        pesos = {

            "media3": 0.30,

            "media5": 0.25,

            "mediaGeral": 0.20,

            "piso": 0.10,

            "teto": 0.15

        }


    return normalizar_pesos(
        pesos
    )



def analisar_componentes():

    dados = carregar_json(
        ARQUIVO_COMPONENTES
    )


    componentes = dados.get(
        "componentes",
        {}
    )


    ranking = []


    for nome, valor in componentes.items():


        ranking.append({

            "componente":
                nome,

            "media":
                valor.get(
                    "media",
                    0
                ),

            "quantidade":
                valor.get(
                    "quantidade",
                    0
                )

        })


    ranking.sort(

        key=lambda x:
            x["media"]

    )


    return ranking



def executar():

    pesos = extrair_pesos()


    componentes = analisar_componentes()


    modelo = {


        "versao":
            "2.0",


        "dataCalibracao":
            datetime.now()
            .strftime(
                "%Y-%m-%d %H:%M:%S"
            ),


        "modelo":

            "estatistico_hibrido",


        "pesos":

            pesos,


        "componentesMelhores":

            componentes[:3],


        "origem":

            "backtest_historico"


    }


    salvar_json(

        ARQUIVO_SAIDA,

        modelo

    )


    print(
        "Modelo calibrado."
    )


    print(
        "Versão:",
        modelo["versao"]
    )


    print(
        "Pesos:",
        pesos
    )



if __name__ == "__main__":

    executar()
