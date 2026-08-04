from pathlib import Path
import json
from itertools import product


PASTA_HISTORICO = Path(
    "data/historico"
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
    ) as f:

        return json.load(f)



def calcular_erro(
    jogadores,
    pesos
):

    erros = []


    for jogador in jogadores:

        historico = jogador.get(
            "historico",
            []
        )


        if not historico:
            continue


        pontos = [

            item.get(
                "pontos"
            )

            for item in historico

            if item.get(
                "pontos"
            ) is not None

        ]


        if len(pontos) < 2:
            continue


        treino = pontos[:-1]

        real = pontos[-1]


        soma_peso = 0
        projecao = 0


        for indice, valor in enumerate(
            treino
        ):

            peso = indice + 1

            soma_peso += peso

            projecao += (
                valor * peso
            )


        if soma_peso == 0:
            continue


        projecao /= soma_peso


        erro = abs(
            real - projecao
        )


        erros.append(
            erro
        )


    if not erros:

        return 999


    return round(
        sum(erros) / len(erros),
        2
    )



# =====================================
# CARREGAR HISTÓRICO
# =====================================


arquivos = sorted(
    PASTA_HISTORICO.glob(
        "rodada-*.json"
    )
)


base = []


for arquivo in arquivos:

    dados = carregar_json(
        arquivo
    )

    base.extend(
        dados.get(
            "jogadores",
            []
        )
    )



# =====================================
# MODELOS TESTADOS
# =====================================


modelos = {

    "conservador": {

        "formaRecente":10,
        "mediaGeral":10,
        "regularidade":10,
        "pontuacaoBasica":10

    },


    "forma": {

        "formaRecente":25,
        "mediaGeral":5,
        "regularidade":10,
        "pontuacaoBasica":5

    },


    "equilibrado": {

        "formaRecente":15,
        "mediaGeral":10,
        "regularidade":10,
        "pontuacaoBasica":10

    },


    "historico": {

        "formaRecente":5,
        "mediaGeral":25,
        "regularidade":10,
        "pontuacaoBasica":5

    }


}



resultado = {

    "modeloEscolhido": None,

    "menorErro": None,

    "modelosTestados": []

}



melhor_erro = 999



for nome, pesos in modelos.items():


    erro = calcular_erro(
        base,
        pesos
    )


    resultado["modelosTestados"].append({

        "modelo": nome,

        "erro": erro,

        "pesos": pesos

    })


    if erro < melhor_erro:

        melhor_erro = erro

        resultado["modeloEscolhido"] = nome

        resultado["menorErro"] = erro



# =====================================
# SALVAR
# =====================================


with open(
    ARQUIVO_SAIDA,
    "w",
    encoding="utf-8"
) as f:


    json.dump(

        resultado,

        f,

        ensure_ascii=False,

        indent=2

    )


print(
    "Pesos otimizados gerados."
)

print(
    "Melhor modelo:",
    resultado["modeloEscolhido"]
)

print(
    "Erro:",
    resultado["menorErro"]
)
