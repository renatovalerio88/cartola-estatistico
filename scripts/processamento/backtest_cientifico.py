import json
from pathlib import Path

PASTA = Path("data/historico")

rodadas = sorted(PASTA.glob("rodada-*.json"))

resultado = []

for indice in range(1, len(rodadas)):

    treino = rodadas[:indice]

    teste = rodadas[indice]

    resultado.append({

        "treino": len(treino),

        "teste": teste.name

    })

saida = {

    "experimentos": resultado

}

with open(

    "data/backtest_cientifico.json",

    "w",

    encoding="utf-8"

) as f:

    json.dump(

        saida,

        f,

        indent=2,

        ensure_ascii=False

    )

print(

    "Backtest científico criado."

)
