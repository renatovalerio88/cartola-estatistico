from pathlib import Path
import json

PASTA = Path("data/historico")
SAIDA = Path("data/backtest-inteligente.json")

arquivos = sorted(
    PASTA.glob("rodada-*.json")
)

resultado = {

    "rodadas": [],

    "erroMedioGeral": 0,

    "melhorRodada": None,

    "piorRodada": None

}

erros = []

for arquivo in arquivos:

    with open(
        arquivo,
        encoding="utf-8"
    ) as f:

        dados = json.load(f)

    erro = dados["erroMedio"]

    erros.append(erro)

    resultado["rodadas"].append({

        "rodada":
            dados["rodada"],

        "erro":
            erro,

        "taxaAcerto":
            dados.get(
                "taxaAcerto",
                0
            )

    })

if erros:

    resultado["erroMedioGeral"] = round(
        sum(erros) / len(erros),
        2
    )

    melhor = min(erros)

    pior = max(erros)

    resultado["melhorRodada"] = {

        "erro": melhor,

        "rodada":

        resultado["rodadas"][
            erros.index(melhor)
        ]["rodada"]

    }

    resultado["piorRodada"] = {

        "erro": pior,

        "rodada":

        resultado["rodadas"][
            erros.index(pior)
        ]["rodada"]

    }

with open(
    SAIDA,
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
    "Backtest inteligente gerado."
)
