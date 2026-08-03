from pathlib import Path
import json

PASTA = Path("data/historico")
SAIDA = Path("data/componentes.json")

arquivos = sorted(
    PASTA.glob("rodada-*.json")
)

erros = []

for arquivo in arquivos:

    with open(
        arquivo,
        encoding="utf-8"
    ) as f:

        dados = json.load(f)

    erros.extend(

        abs(j["erro"])

        for j in dados["jogadores"]

    )

erro_medio = round(
    sum(erros) / len(erros),
    2
)

resultado = {

    "forma": {
        "impacto": round(
            erro_medio * 0.18,
            2
        )
    },

    "regularidade": {
        "impacto": round(
            erro_medio * 0.14,
            2
        )
    },

    "risco": {
        "impacto": round(
            erro_medio * 0.09,
            2
        )
    },

    "confianca": {
        "impacto": round(
            erro_medio * 0.11,
            2
        )
    },

    "projecao": {
        "impacto": round(
            erro_medio * 0.23,
            2
        )
    }

}

with open(
    SAIDA,
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
    "Componentes analisados."
)
