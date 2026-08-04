from pathlib import Path
import json
import itertools


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_SAIDA = Path(
    "data/pesos.json"
)


def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(arquivo)



def calcular_erro(modelo):

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

            valores = {

                "media3":
                    jogador.get(
                        "media3",
                        0
                    ),

                "media5":
                    jogador.get(
                        "media5",
                        0
                    ),

                "mediaGeral":
                    jogador.get(
                        "mediaGeral",
                        0
                    ),

                "piso":
                    jogador.get(
                        "piso",
                        0
                    ),

                "teto":
                    jogador.get(
                        "teto",
                        0
                    ),

                "projecao":
                    jogador.get(
                        "projecao",
                        0
                    )

            }


            previsao = 0


            for componente, peso in modelo.items():

                previsao += (
                    valores.get(
                        componente,
                        0
                    )
                    *
                    peso
                )


            real = jogador.get(
                "real",
                0
            )


            erros.append(
                abs(
                    real - previsao
                )
            )


    if not erros:

        return 999


    return round(
        sum(erros) / len(erros),
        2
    )



def gerar_modelos():

    componentes = [

        "media3",

        "media5",

        "mediaGeral",

        "piso",

        "teto"

    ]


    modelos = []


    combinações = [

        {
            "media3":0.40,
            "media5":0.25,
            "mediaGeral":0.15,
            "piso":0.10,
            "teto":0.10
        },

        {
            "media3":0.30,
            "media5":0.30,
            "mediaGeral":0.20,
            "piso":0.10,
            "teto":0.10
        },

        {
            "media3":0.25,
            "media5":0.25,
            "mediaGeral":0.20,
            "piso":0.15,
            "teto":0.15
        },

        {
            "media3":0.35,
            "media5":0.20,
            "mediaGeral":0.15,
            "piso":0.10,
            "teto":0.20
        }

    ]


    modelos.extend(
        combinações
    )


    return modelos



def executar():

    modelos = gerar_modelos()


    resultados = []


    for modelo in modelos:

        erro = calcular_erro(
            modelo
        )


        resultados.append({

            "modelo":
                modelo,

            "erro":
                erro

        })


    resultados.sort(
        key=lambda x:
            x["erro"]
    )


    melhor = resultados[0]


    pesos = {

        "modelo":
            "v2_otimizado",


        "erro":
            melhor["erro"],


        "pesos":

            melhor["modelo"],


        "modelosTestados":

            len(resultados)

    }


    with open(
        ARQUIVO_SAIDA,
        "w",
        encoding="utf-8"
    ) as arquivo:


        json.dump(
            pesos,
            arquivo,
            ensure_ascii=False,
            indent=2
        )


    print(
        "Pesos otimizados gerados."
    )

    print(
        "Melhor modelo:",
        melhor["modelo"]
    )

    print(
        "Erro:",
        melhor["erro"]
    )



if __name__ == "__main__":

    executar()
