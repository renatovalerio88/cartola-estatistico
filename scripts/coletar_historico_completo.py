"""
======================================================
CARTOLA ESTATÍSTICO

Coleta histórica completa das rodadas

Gera:

data/api/rodada-XX/
    jogadores.json
    partidas.json
    pontuados.json
    mercado.json

======================================================
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


API_BASE = "https://api.cartolafc.globo.com"


PASTA_RAIZ = Path(__file__).resolve().parent.parent

PASTA_API = (
    PASTA_RAIZ
    /
    "data"
    /
    "api"
)


CABECALHOS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}


POSICOES = {
    1: "GOL",
    2: "LAT",
    3: "ZAG",
    4: "MEI",
    5: "ATA",
    6: "TEC",
}



def buscar_json(endpoint: str) -> Any:

    url = API_BASE + endpoint

    requisicao = Request(
        url,
        headers=CABECALHOS
    )

    try:

        with urlopen(
            requisicao,
            timeout=30
        ) as resposta:

            return json.loads(
                resposta.read()
                .decode("utf-8")
            )

    except HTTPError as erro:

        raise RuntimeError(
            f"Erro HTTP {erro.code}: {url}"
        )

    except URLError as erro:

        raise RuntimeError(
            f"Erro conexão: {erro.reason}"
        )



def salvar_json(
    caminho: Path,
    dados: Any
):

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    caminho.write_text(

        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2
        ),

        encoding="utf-8"
    )



def buscar_mercado_historico(
    rodada:int
):

    try:

        return buscar_json(
            f"/atletas/mercado/{rodada}"
        )

    except Exception:

        print(
            f"Mercado histórico indisponível rodada {rodada}. "
            "Usando mercado atual."
        )

        return buscar_json(
            "/atletas/mercado"
        )



def buscar_pontuados_historico(
    rodada:int
):

    try:

        return buscar_json(
            f"/atletas/pontuados/{rodada}"
        )

    except Exception:

        return buscar_json(
            "/atletas/pontuados"
        )



def indexar_clubes(
    mercado
):

    clubes = {}

    if not isinstance(
        mercado,
        dict
    ):
        return clubes


    lista = mercado.get(
        "clubes"
    )


    if not isinstance(
        lista,
        dict
    ):
        return clubes


    for chave, valor in lista.items():

        try:

            clubes[
                int(chave)
            ] = valor

        except:

            continue


    return clubes



def normalizar_jogadores(
    mercado,
    pontuados,
    rodada
):

    clubes = indexar_clubes(
        mercado
    )


    pontuacoes = {}

    if isinstance(
        pontuados,
        dict
    ):

        pontuacoes = (
            pontuados.get(
                "atletas",
                {}
            )
            or {}
        )


    jogadores = []


    atletas = []

    if isinstance(
        mercado,
        dict
    ):

        atletas = (
            mercado.get(
                "atletas",
                []
            )
            or []
        )


    for atleta in atletas:

        atleta_id = atleta.get(
            "atleta_id"
        )


        if atleta_id is None:
            continue


        pontuacao = (
            pontuacoes.get(
                str(atleta_id),
                {}
            )
            or {}
        )


        clube = (
            clubes.get(
                atleta.get(
                    "clube_id"
                ),
                {}
            )
            or {}
        )


        jogadores.append({

            "id": atleta_id,

            "rodada": rodada,

            "nome": atleta.get(
                "nome"
            ),

            "apelido": atleta.get(
                "apelido"
            ),

            "foto": atleta.get(
                "foto"
            ),

            "posicao": POSICOES.get(
                atleta.get(
                    "posicao_id"
                ),
                ""
            ),

            "posicaoId":
                atleta.get(
                    "posicao_id"
                ),

            "clube":
                clube.get(
                    "nome",
                    ""
                ),

            "siglaClube":
                clube.get(
                    "abreviacao",
                    ""
                ),

            "preco":
                atleta.get(
                    "preco_num"
                ),

            "media":
                atleta.get(
                    "media_num"
                ),

            "jogos":
                atleta.get(
                    "jogos_num"
                ),

            "pontuacaoReal":
                pontuacao.get(
                    "pontuacao"
                ),

            "entrouEmCampo":
                pontuacao.get(
                    "entrou_em_campo"
                ),

            "scouts":
                pontuacao.get(
                    "scout",
                    {}
                )

        })


    return jogadores



def coletar_rodada(
    rodada:int
):

    print(
        f"Coletando rodada {rodada}"
    )


    pasta = (
        PASTA_API
        /
        f"rodada-{rodada:02d}"
    )


    mercado = buscar_mercado_historico(
        rodada
    )


    partidas = buscar_json(
        f"/partidas/{rodada}"
    )


    pontuados = buscar_pontuados_historico(
        rodada
    )


    jogadores = normalizar_jogadores(
        mercado,
        pontuados,
        rodada
    )


    salvar_json(
        pasta / "mercado.json",
        mercado
    )

    salvar_json(
        pasta / "partidas.json",
        partidas
    )

    salvar_json(
        pasta / "pontuados.json",
        pontuados
    )

    salvar_json(
        pasta / "jogadores.json",
        jogadores
    )


    print(
        f"Rodada {rodada}: "
        f"{len(jogadores)} jogadores"
    )



def executar():

    status = buscar_json(
        "/mercado/status"
    )


    rodada_atual = int(
        status.get(
            "rodada_atual",
            1
        )
    )


    print(
        "Rodada atual:",
        rodada_atual
    )


    for rodada in range(
        1,
        rodada_atual + 1
    ):

        try:

            coletar_rodada(
                rodada
            )

        except Exception as erro:

            print(
                f"Falha rodada {rodada}: {erro}"
            )


    print(
        "Histórico completo finalizado."
    )



if __name__ == "__main__":

    try:

        executar()

    except Exception as erro:

        print(
            "ERRO:",
            erro,
            file=sys.stderr
        )

        sys.exit(1)
