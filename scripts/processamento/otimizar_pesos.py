from pathlib import Path
import json


PASTA_BASE = Path(
    "data/base-historica"
)

ARQUIVO_SAIDA = Path(
    "data/laboratorio/pesos.json"
)


ARQUIVO_SAIDA.parent.mkdir(
    parents=True,
    exist_ok=True
)


def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def media_simples(pontos):

    if not pontos:
        return 0

    return sum(pontos) / len(pontos)



def ultimas_3(pontos):

    pontos = pontos[-3:]

    if not pontos:
        return 0

    return sum(pontos) / len(pontos)



def ultimas_5(pontos):

    pontos = pontos[-5:]

    if not pontos:
        return 0

    return sum(pontos) / len(pontos)



def ponderada(pontos):

    if not pontos:
        return 0


    pesos = range(
        1,
        len(pontos) + 1
    )


    total = sum(pesos)


    return sum(
        ponto * peso
        for ponto, peso
        in zip(
            pontos,
            pesos
        )
    ) / total



MODELOS = {

    "media_simples":
        media_simples,

    "ultimas_3":
        ultimas_3,

    "ultimas_5":
        ultimas_5,

    "ponderada":
        ponderada

}



def calcular_erros():

    resultados = {

        nome: []

        for nome in MODELOS

    }


    arquivos = sorted(
        PASTA_BASE.glob(
            "*.json"
        )
    )


    for arquivo in arquivos:


        jogador = carregar_json(
            arquivo
        )


        historico = jogador.get(
            "historico",
            []
        )


        historico = sorted(
            historico,
            key=lambda x:
                x.get(
                    "rodada",
                    0
                )
        )


        pontos = []


        for item in historico:


            valor = item.get(
                "pontos"
            )


            if valor is not None:

                pontos.append(
                    float(valor)
                )



        if len(pontos) < 2:

            continue



        for indice in range(
            1,
            len(pontos)
        ):


            treino = pontos[:indice]

            real = pontos[indice]



            for nome, modelo in MODELOS.items():


                previsao = modelo(
                    treino
                )


                erro = abs(
                    real - previsao
                )


                resultados[nome].append(
                    erro
                )


    return resultados



def executar():


    resultados = calcular_erros()


    modelos = []


    for nome, erros in resultados.items():


        if erros:

            media = round(
                sum(erros)
                /
                len(erros),
                2
            )

        else:

            media = 999



        modelos.append({

            "modelo": nome,

            "erroMedio": media,

            "quantidadeTestes":
                len(erros)

        })



    modelos.sort(
        key=lambda x:
            x["erroMedio"]
    )


    resultado = {


        "melhorModelo":
            modelos[0]["modelo"]
            if modelos
            else None,


        "menorErro":
            modelos[0]["erroMedio"]
            if modelos
            else None,


        "modelosTestados":
            modelos

    }



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
        "Pesos otimizados gerados."
    )


    print(
        "Melhor modelo:",
        resultado["melhorModelo"]
    )


    print(
        "Erro:",
        resultado["menorErro"]
    )



if __name__ == "__main__":

    executar()
