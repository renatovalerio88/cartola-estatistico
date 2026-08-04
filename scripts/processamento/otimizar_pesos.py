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



# ======================================================
# MODELOS DE PROJEÇÃO
# ======================================================


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


    total = 0
    soma = 0


    for indice, valor in enumerate(
        pontos,
        start=1
    ):

        soma += indice

        total += (
            valor * indice
        )


    return total / soma



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



# ======================================================
# TESTE PROGRESSIVO
# ======================================================


def avaliar_jogador(
    historico
):

    resultados = {

        nome: []

        for nome in MODELOS

    }


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

        return resultados



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





# ======================================================
# PROCESSAMENTO
# ======================================================


estatisticas = {}



arquivos = sorted(

    PASTA_BASE.glob(
        "*.json"
    )

)



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    posicao = jogador.get(
        "posicao",
        "OUTROS"
    )


    historico = jogador.get(
        "historico",
        []
    )


    resultados = avaliar_jogador(
        historico
    )



    if posicao not in estatisticas:

        estatisticas[posicao] = {

            nome: []

            for nome in MODELOS

        }



    for modelo, erros in resultados.items():

        estatisticas[posicao][modelo].extend(
            erros
        )





# ======================================================
# ESCOLHE MELHOR MODELO POR POSIÇÃO
# ======================================================


resultado_final = {

    "posicoes": {}

}



for posicao, modelos in estatisticas.items():


    lista_modelos = []



    for nome, erros in modelos.items():


        if erros:

            erro_medio = round(

                sum(erros)
                /
                len(erros),

                2

            )

        else:

            erro_medio = 999



        lista_modelos.append({

            "modelo":
                nome,

            "erroMedio":
                erro_medio,

            "testes":
                len(erros)

        })



    lista_modelos.sort(

        key=lambda x:
            x["erroMedio"]

    )


    resultado_final["posicoes"][posicao] = {


        "melhorModelo":
            lista_modelos[0]["modelo"],


        "menorErro":
            lista_modelos[0]["erroMedio"],


        "modelosTestados":
            lista_modelos

    }





# ======================================================
# SALVAR
# ======================================================


with open(

    ARQUIVO_SAIDA,

    "w",

    encoding="utf-8"

) as arquivo:


    json.dump(

        resultado_final,

        arquivo,

        ensure_ascii=False,

        indent=2

    )



print(
    "Pesos otimizados por posição gerados."
)


for posicao, dados in resultado_final["posicoes"].items():

    print(

        posicao,

        "=>",

        dados["melhorModelo"],

        "erro:",

        dados["menorErro"]

    )
