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

        return json.load(
            arquivo
        )



def salvar_json(
    caminho,
    dados
):

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



def gerar_pesos():

    valores = [

        0.05,
        0.10,
        0.15,
        0.20,
        0.25,
        0.30,
        0.35,
        0.40

    ]


    modelos = []


    componentes = [

        "media3",

        "media5",

        "mediaGeral",

        "piso",

        "teto"

    ]



    for combinacao in itertools.product(
        valores,
        repeat=5
    ):


        if round(
            sum(combinacao),
            2
        ) != 1:

            continue



        modelos.append({

            componente:
                peso

            for componente, peso
            in zip(
                componentes,
                combinacao
            )

        })


    return modelos



def calcular_erro(
    pesos
):

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


            previsao = 0


            for componente, peso in pesos.items():


                previsao += (

                    jogador.get(
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
                    real -
                    previsao
                )

            )



    if not erros:

        return 999



    return round(

        sum(erros)
        /
        len(erros),

        3

    )



def executar():

    modelos = gerar_pesos()


    print(
        "Modelos testados:",
        len(modelos)
    )


    melhores = []


    for modelo in modelos:


        erro = calcular_erro(
            modelo
        )


        melhores.append({

            "pesos":
                modelo,

            "erro":
                erro

        })



    melhores.sort(

        key=lambda x:
            x["erro"]

    )


    vencedor = melhores[0]



    resultado = {

        "modelo":

            "v3_otimizado",


        "erro":

            vencedor["erro"],


        "pesos":

            vencedor["pesos"],


        "modelosTestados":

            len(modelos),


        "top3":

            melhores[:3]

    }



    salvar_json(

        ARQUIVO_SAIDA,

        resultado

    )



    print(
        "Melhor modelo:"
    )

    print(
        vencedor
    )



if __name__ == "__main__":

    executar()
