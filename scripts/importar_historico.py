from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PASTA_API = Path("data/api")
PASTA_BASE = Path("data/base-historica")


def carregar_json(caminho: Path) -> Any:
    return json.loads(
        caminho.read_text(
            encoding="utf-8"
        )
    )


def salvar_json(
    caminho: Path,
    dados: Any,
) -> None:
    caminho.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    caminho.write_text(
        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def numero_rodada(
    pasta: Path,
) -> int:
    try:
        return int(
            pasta.name.replace(
                "rodada-",
                "",
            )
        )
    except ValueError:
        return 999


def normalizar_registro(
    atleta: dict[str, Any],
    rodada: int,
) -> dict[str, Any]:
    pontos = atleta.get(
        "pontuacaoReal"
    )

    return {
        "rodada": rodada,
        "pontos": (
            float(pontos)
            if pontos is not None
            else None
        ),
        "entrouEmCampo": atleta.get(
            "entrouEmCampo"
        ),
        "media": atleta.get(
            "media"
        ),
        "preco": atleta.get(
            "preco"
        ),
        "variacao": atleta.get(
            "variacao"
        ),
        "jogos": atleta.get(
            "jogos"
        ),
        "clubeId": atleta.get(
            "clubeId"
        ),
        "clube": atleta.get(
            "clube"
        ),
        "siglaClube": atleta.get(
            "siglaClube"
        ),
        "statusId": atleta.get(
            "statusId"
        ),
        "mando": atleta.get(
            "mando"
        ),
        "adversarioId": atleta.get(
            "adversarioId"
        ),
        "adversario": atleta.get(
            "adversario"
        ),
        "minutos": atleta.get(
            "minutos"
        ),
        "scouts": atleta.get(
            "scouts"
        ) or {},
    }


def executar() -> None:
    PASTA_BASE.mkdir(
        parents=True,
        exist_ok=True,
    )

    pastas_rodadas = sorted(
        PASTA_API.glob(
            "rodada-*"
        ),
        key=numero_rodada,
    )

    print(
        f"{len(pastas_rodadas)} "
        "rodada(s) encontrada(s)."
    )

    jogadores: dict[
        str,
        dict[str, Any]
    ] = {}

    for pasta_rodada in pastas_rodadas:
        arquivo_jogadores = (
            pasta_rodada /
            "jogadores.json"
        )

        if not arquivo_jogadores.exists():
            print(
                "Ignorando "
                f"{pasta_rodada.name}: "
                "jogadores.json não encontrado."
            )
            continue

        rodada = numero_rodada(
            pasta_rodada
        )

        dados = carregar_json(
            arquivo_jogadores
        )

        if not isinstance(dados, list):
            print(
                "Ignorando "
                f"{arquivo_jogadores}: "
                "conteúdo inválido."
            )
            continue

        print(
            f"Processando rodada {rodada}: "
            f"{len(dados)} jogador(es)."
        )

        for atleta in dados:
            if not isinstance(
                atleta,
                dict,
            ):
                continue

            atleta_id = atleta.get(
                "id"
            )

            if atleta_id is None:
                continue

            chave = str(
                atleta_id
            )

            if chave not in jogadores:
                jogadores[chave] = {
                    "id": atleta_id,
                    "nome": atleta.get(
                        "nome"
                    ),
                    "apelido": atleta.get(
                        "apelido"
                    ),
                    "foto": atleta.get(
                        "foto"
                    ),
                    "posicao": atleta.get(
                        "posicao"
                    ),
                    "posicaoId": atleta.get(
                        "posicaoId"
                    ),
                    "historico": [],
                }

            jogadores[chave][
                "nome"
            ] = (
                atleta.get("nome")
                or jogadores[chave].get(
                    "nome"
                )
            )

            jogadores[chave][
                "apelido"
            ] = (
                atleta.get("apelido")
                or jogadores[chave].get(
                    "apelido"
                )
            )

            jogadores[chave][
                "foto"
            ] = (
                atleta.get("foto")
                or jogadores[chave].get(
                    "foto"
                )
            )

            jogadores[chave][
                "posicao"
            ] = (
                atleta.get("posicao")
                or jogadores[chave].get(
                    "posicao"
                )
            )

            registro = normalizar_registro(
                atleta,
                rodada,
            )

            historico = jogadores[
                chave
            ]["historico"]

            historico = [
                item
                for item in historico
                if item.get("rodada")
                != rodada
            ]

            historico.append(
                registro
            )

            jogadores[chave][
                "historico"
            ] = historico

    for atleta in jogadores.values():
        atleta["historico"].sort(
            key=lambda item:
                int(
                    item.get(
                        "rodada",
                        999,
                    )
                )
        )

        atleta[
            "historicoPontuacoes"
        ] = [
            item["pontos"]
            for item in atleta["historico"]
            if item.get("pontos")
            is not None
        ]

        destino = (
            PASTA_BASE /
            f'{atleta["id"]}.json'
        )

        salvar_json(
            destino,
            atleta,
        )

    print(
        f"{len(jogadores)} "
        "jogador(es) exportado(s)."
    )


if __name__ == "__main__":
    executar()
