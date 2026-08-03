from pathlib import Path
import json
import math

PASTA_HISTORICO = Path("data/historico")
ARQUIVO_SAIDA = Path("data/laboratorio.json")

arquivos = sorted(
    PASTA_HISTORICO.glob("rodada-*.json")
)

erros = []
por_posicao = {}

top5 = 0
top10 = 0
rodadas = 0

for arquivo in arquivos:

    with open(
        arquivo,
        encoding="utf-8"
    ) as f:

        dados = json.load(f)

    rodadas += 1

    jogadores = dados["jogadores"]

    jogadores.sort(
        key=lambda x: x["projecao"],
        reverse=True
    )

    for indice, jogador in enumerate(jogadores):

        erro = abs(
            jogador["erro"]
        )

        erros.append(erro)

        posicao = jogador["posicao"]

        por_posicao.setdefault(
            posicao,
            []
        ).append(erro)

        if indice < 5 and erro <= 3:
            top5 += 1

        if indice < 10 and erro <= 3:
            top10 += 1


mae = round(
    sum(erros) / len(erros),
    2
)

rmse = round(
    math.sqrt(
        sum(
            e ** 2
            for e in erros
        ) / len(erros)
    ),
    2
)

media_posicao = {

    posicao: round(
        sum(lista) / len(lista),
        2
    )

    for posicao, lista
    in por_posicao.items()

}

melhor = min(
    media_posicao,
    key=media_posicao.get
)

pior = max(
    media_posicao,
    key=media_posicao.get
)

resultado = {

    "modelo": "1.0",

    "rodadas": rodadas,

    "mae": mae,

    "rmse": rmse,

    "top5": round(
        top5 * 100 / (rodadas * 5),
        2
    ),

    "top10": round(
        top10 * 100 / (rodadas * 10),
        2
    ),

    "melhorPosicao": melhor,

    "piorPosicao": pior,

    "erroPorPosicao":
        media_posicao

}

with open(
    ARQUIVO_SAIDA,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        resultado,
        f,
        indent=2,
        ensure_ascii=False
    )

print(
    "Laboratório estatístico gerado."
)
