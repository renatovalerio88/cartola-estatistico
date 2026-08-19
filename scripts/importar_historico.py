"""
======================================================
CARTOLA ESTATÍSTICO

Importação da base histórica individual.

Origem:

data/api/rodada-XX/jogadores.json

Destino:

data/base-historica/{atleta_id}.json

Preserva:

- pontuação;
- scouts;
- preço;
- clube;
- status;
- mando;
- adversário;
- força do adversário;
- pontos cedidos;
- chance de SG;
- contexto temporal usado na previsão.

======================================================
"""

from __future__ import annotations

import json

from pathlib import Path
from typing import Any


PASTA_API = Path(
    "data/api"
)


PASTA_BASE = Path(
    "data/base-historica"
)


def carregar_json(
    caminho: Path,
) -> Any:

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


def float_seguro(
    valor: Any,
) -> float | None:

    if (
        valor is None
        or valor == ""
    ):

        return None


    try:

        return float(
            valor
        )

    except (
        TypeError,
        ValueError,
    ):

        return None


def normalizar_registro(
    atleta: dict[str, Any],
    rodada: int,
) -> dict[str, Any]:

    pontos = atleta.get(
        "pontuacaoReal"
    )


    return {

        "rodada":
            rodada,

        "pontos":
            float_seguro(
                pontos
            ),

        "entrouEmCampo":
            atleta.get(
                "entrouEmCampo"
            ),

        "media":
            atleta.get(
                "media"
            ),

        "preco":
            atleta.get(
                "preco"
            ),

        "variacao":
            atleta.get(
                "variacao"
            ),

        "jogos":
            atleta.get(
                "jogos"
            ),

        "clubeId":
            atleta.get(
                "clubeId"
            ),

        "clube":
            atleta.get(
                "clube"
            ),

        "siglaClube":
            atleta.get(
                "siglaClube"
            ),

        "statusId":
            atleta.get(
                "statusId"
            ),

        "mando":
            atleta.get(
                "mando"
            ),

        "adversarioId":
            atleta.get(
                "adversarioId"
            ),

        "adversario":
            atleta.get(
                "adversario"
            ),

        "siglaAdversario":
            atleta.get(
                "siglaAdversario"
            ),

        "partidaId":
            atleta.get(
                "partidaId"
            ),

        "dataPartida":
            atleta.get(
                "dataPartida"
            ),

        "minutos":
            atleta.get(
                "minutos"
            ),

        "minutosEsperados":
            atleta.get(
                "minutosEsperados"
            ),

        "titularidade":
            atleta.get(
                "titularidade"
            ),

        "scouts":
            atleta.get(
                "scouts"
            )
            or {},

        # ==========================================
        # CONTEXTO ESTATÍSTICO
        # ==========================================

        "forcaAdversarioIndice":
            atleta.get(
                "forcaAdversarioIndice"
            ),

        "notaForcaAdversario":
            atleta.get(
                "notaForcaAdversario"
            ),

        "pontosCedidosMediaPosicao":
            atleta.get(
                "pontosCedidosMediaPosicao"
            ),

        "pontosCedidosAmostra":
            atleta.get(
                "pontosCedidosAmostra"
            ),

        "pontosCedidosNota":
            atleta.get(
                "pontosCedidosNota"
            ),

        "chanceSG":
            atleta.get(
                "chanceSG"
            ),

        "contextoCalculadoAteRodada":
            atleta.get(
                "contextoCalculadoAteRodada"
            ),

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
            pasta_rodada
            /
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


        if not isinstance(
            dados,
            list,
        ):

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

                jogadores[
                    chave
                ] = {

                    "id":
                        atleta_id,

                    "nome":
                        atleta.get(
                            "nome"
                        ),

                    "apelido":
                        atleta.get(
                            "apelido"
                        ),

                    "foto":
                        atleta.get(
                            "foto"
                        ),

                    "posicao":
                        atleta.get(
                            "posicao"
                        ),

                    "posicaoId":
                        atleta.get(
                            "posicaoId"
                        ),

                    "historico":
                        [],

                }


            # ==========================================
            # ATUALIZA IDENTIFICAÇÃO
            # ==========================================

            for campo in [

                "nome",

                "apelido",

                "foto",

                "posicao",

                "posicaoId",

            ]:

                valor = atleta.get(
                    campo
                )


                if valor not in (
                    None,
                    "",
                ):

                    jogadores[
                        chave
                    ][
                        campo
                    ] = valor


            registro = (
                normalizar_registro(
                    atleta,
                    rodada,
                )
            )


            historico = jogadores[
                chave
            ][
                "historico"
            ]


            historico = [

                item

                for item in historico

                if item.get(
                    "rodada"
                ) != rodada

            ]


            historico.append(
                registro
            )


            jogadores[
                chave
            ][
                "historico"
            ] = historico


    # ==========================================
    # EXPORTAÇÃO
    # ==========================================

    quantidade_registros = 0


    for atleta in jogadores.values():

        atleta[
            "historico"
        ].sort(

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

            item[
                "pontos"
            ]

            for item in atleta[
                "historico"
            ]

            if item.get(
                "pontos"
            ) is not None

        ]


        quantidade_registros += len(
            atleta[
                "historico"
            ]
        )


        destino = (
            PASTA_BASE
            /
            f'{atleta["id"]}.json'
        )


        salvar_json(
            destino,
            atleta,
        )


    print(
        ""
    )

    print(
        "============================================"
    )

    print(
        "BASE HISTÓRICA INDIVIDUAL ATUALIZADA"
    )

    print(
        "============================================"
    )

    print(
        "Jogadores:",
        len(
            jogadores
        ),
    )

    print(
        "Registros históricos:",
        quantidade_registros,
    )

    print(
        "Contexto progressivo preservado: SIM"
    )

    print(
        "============================================"
    )


if __name__ == "__main__":

    executar()
