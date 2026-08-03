from pathlib import Path
import json

PASTA_HISTORICO = Path("data/historico")
ARQUIVO_SAIDA = Path("data/pesos.json")


def carregar_json(caminho):
    with open(
        caminho,
        "r",
        encoding="utf-8"
    ) as f:
        return json.load(f)


arquivos = sorted(
    PASTA_HISTORICO.glob("rodada-*.json")
)

estatisticas = {}

for arquivo in arquivos:

    dados = carregar_json(arquivo)

    for jogador in dados["jogadores"]:

        posicao = jogador["posicao"]

        if posicao not in estatisticas:

            estatisticas[posicao] = {
                "erros": []
            }

        estatisticas[posicao][
            "erros"
        ].append(
            abs(jogador["erro"])
        )

pesos = {}

for posicao, dados in estatisticas.items():

    erro = sum(
        dados["erros"]
    ) / len(
        dados["erros"]
    )

    fator = max(
        0.80,
        min(
            1.20,
            10 / max(erro, 1)
        )
    )

    pesos[posicao] = {

        "formaRecente":
            round(15 * fator, 2),

        "mediaGeral":
            round(7 * fator, 2),

        "regularidade":
            round(8 * fator, 2),

        "pontuacaoBasica":
            round(7 * fator, 2)

    }

with open(
    ARQUIVO_SAIDA,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        pesos,
        f,
        indent=2,
        ensure_ascii=False
    )

print(
    "Pesos otimizados gerados."
)
