from pathlib import Path
import json

PASTA_BASE = Path("data/base-historica")
PASTA_SAIDA = Path("data/historico")

PASTA_SAIDA.mkdir(
    parents=True,
    exist_ok=True
)


def carregar_json(caminho):
    with open(
        caminho,
        "r",
        encoding="utf-8"
    ) as f:
        return json.load(f)


def salvar_json(caminho, dados):
    with open(
        caminho,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            dados,
            f,
            ensure_ascii=False,
            indent=2
        )


arquivos = sorted(
    PASTA_BASE.glob("*.json")
)

rodadas = {}

for arquivo in arquivos:

    jogador = carregar_json(arquivo)

    historico = jogador.get(
        "historico",
        []
    )

    historico.sort(
        key=lambda x: x["rodada"]
    )

    for indice in range(
        1,
        len(historico)
    ):

        treino = historico[:indice]

        rodada_prevista = historico[indice]

        media = sum(
            item.get("pontos") or 0
            for item in treino
        ) / len(treino)

        rodada = rodada_prevista["rodada"]

        if rodada not in rodadas:

            rodadas[rodada] = []

        erro = (
            rodada_prevista.get("pontos") or 0
        ) - media

        rodadas[rodada].append({

            "id": jogador["id"],

            "nome": jogador["nome"],

            "posicao": jogador["posicao"],

            "projecao": round(
                media,
                2
            ),

            "real": rodada_prevista.get(
                "pontos"
            ),

            "erro": round(
                erro,
                2
            )

        })

for rodada, jogadores in rodadas.items():

    jogadores.sort(
        key=lambda x: x["projecao"],
        reverse=True
    )

    erros = [
        abs(j["erro"])
        for j in jogadores
    ]

    media_erro = round(
        sum(erros) / len(erros),
        2
    )

    salvar_json(

        PASTA_SAIDA /
        f"rodada-{rodada:02d}.json",

        {

            "rodada": rodada,

            "erroMedio": media_erro,

            "quantidade": len(
                jogadores
            ),

            "jogadores": jogadores

        }

    )

print(
    f"{len(rodadas)} rodadas processadas."
)
