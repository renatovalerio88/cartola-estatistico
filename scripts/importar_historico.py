from pathlib import Path
import json

PASTA_API = Path("data/api")
PASTA_BASE = Path("data/base-historica")

PASTA_BASE.mkdir(
    parents=True,
    exist_ok=True,
)

rodadas = sorted(
    PASTA_API.glob("rodada-*")
)

print(f"{len(rodadas)} rodadas encontradas.")

jogadores = {}

for pasta in rodadas:

    arquivo = pasta / "jogadores.json"

    if not arquivo.exists():
        continue

    dados = json.loads(
        arquivo.read_text(
            encoding="utf-8"
        )
    )

    for atleta in dados:

        atleta_id = str(
            atleta["id"]
        )

        if atleta_id not in jogadores:

            jogadores[atleta_id] = {
                "id": atleta["id"],
                "nome": atleta["nome"],
                "apelido": atleta["apelido"],
                "posicao": atleta["posicao"],
                "historico": []
            }

        jogadores[atleta_id]["historico"].append({

            "rodada":
                atleta["rodada"],

            "pontos":
                atleta["pontuacaoReal"],

            "media":
                atleta["media"],

            "preco":
                atleta["preco"],

            "scouts":
                atleta["scouts"]

        })

for atleta_id, atleta in jogadores.items():

    destino = (
        PASTA_BASE /
        f"{atleta_id}.json"
    )

    destino.write_text(
        json.dumps(
            atleta,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

print(
    f"{len(jogadores)} jogadores exportados."
)
