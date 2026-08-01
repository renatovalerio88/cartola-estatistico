from pathlib import Path
import json

PASTA_API = Path("data/api")
PASTA_BASE = Path("data/base-historica")

PASTA_BASE.mkdir(parents=True, exist_ok=True)


def carregar_json(caminho):
    with open(caminho, "r", encoding="utf-8") as f:
        return json.load(f)


def salvar_json(caminho, dados):
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(
            dados,
            f,
            ensure_ascii=False,
            indent=2
        )


base = {}

rodadas = sorted(
    PASTA_API.glob("rodada-*")
)

print(f"{len(rodadas)} rodadas encontradas.")

for pasta in rodadas:

    arquivo = pasta / "jogadores.json"

    if not arquivo.exists():
        continue

    rodada = int(
        pasta.name.replace("rodada-", "")
    )

    jogadores = carregar_json(arquivo)

    print(
        f"Rodada {rodada}: {len(jogadores)} jogadores"
    )

    for jogador in jogadores:

        jogador_id = str(
            jogador["id"]
        )

        if jogador_id not in base:

            base[jogador_id] = {

                "id": jogador["id"],
                "nome": jogador["nome"],
                "posicao": jogador["posicao"],
                "clube": jogador["clube"],

                "historico": []

            }

        base[jogador_id]["historico"].append({

            "rodada": rodada,
            "preco": jogador.get("preco"),
            "media": jogador.get("media"),
            "pontos": jogador.get(
                "pontuacaoReal"
            ),
            "scouts": jogador.get(
                "scouts",
                {}
            )

        })


print(
    f"Consolidando {len(base)} jogadores..."
)

for jogador in base.values():

    jogador["historico"].sort(
        key=lambda x: x["rodada"]
    )

    caminho = (
        PASTA_BASE /
        f'{jogador["id"]}.json'
    )

    salvar_json(
        caminho,
        jogador
    )

print("Base histórica criada com sucesso.")
