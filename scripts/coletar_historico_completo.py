"""
======================================================
CARTOLA ESTATÍSTICO

Coleta de dados públicos da rodada atual.

Gera:

data/api/status.json

data/api/rodada-XX/
    mercado.json
    partidas.json
    pontuados.json
    jogadores.json
    resumo.json

======================================================
"""

from __future__ import annotations

import json
import sys

from datetime import datetime
from pathlib import Path
from typing import Any

from urllib.error import (
    HTTPError,
    URLError,
)

from urllib.request import (
    Request,
    urlopen,
)


API_BASE = "https://api.cartolafc.globo.com"


PASTA_RAIZ = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)


PASTA_DADOS = (
    PASTA_RAIZ
    / "data"
    / "api"
)


CABECALHOS = {

    "User-Agent":
        (
            "Mozilla/5.0 "
            "(Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "Chrome/150 Safari/537.36"
        ),

    "Accept":
        "application/json",

}


POSICOES = {

    1: "GOL",

    2: "LAT",

    3: "ZAG",

    4: "MEI",

    5: "ATA",

    6: "TEC",

}


STATUS_PROVAVEL = 7


STATUS_INDISPONIVEIS = {
    2,
    3,
    5,
    6,
}


# ======================================================
# API
# ======================================================


def buscar_json(
    endpoint: str,
    obrigatorio: bool = True,
) -> Any:

    url = (
        f"{API_BASE}{endpoint}"
    )


    requisicao = Request(

        url,

        headers=CABECALHOS,

        method="GET",

    )


    mensagem = ""


    try:

        with urlopen(
            requisicao,
            timeout=30,
        ) as resposta:

            conteudo = (
                resposta
                .read()
                .decode(
                    "utf-8"
                )
            )


            return json.loads(
                conteudo
            )


    except HTTPError as erro:

        mensagem = (

            f"Erro HTTP {erro.code} "
            f"ao consultar {url}"

        )


    except URLError as erro:

        mensagem = (

            f"Erro de conexão "
            f"ao consultar {url}: "
            f"{erro.reason}"

        )


    except json.JSONDecodeError:

        mensagem = (

            f"A API retornou JSON "
            f"inválido em {url}"

        )


    if obrigatorio:

        raise RuntimeError(
            mensagem
        )


    print(
        f"AVISO: {mensagem}"
    )


    return None


# ======================================================
# ARQUIVOS
# ======================================================


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


    print(

        "Arquivo salvo: "
        f"{caminho.relative_to(PASTA_RAIZ)}"

    )


# ======================================================
# RODADA
# ======================================================


def obter_numero_rodada(
    status: dict[str, Any],
) -> int:

    rodada = (

        status.get(
            "rodada_atual"
        )

        or

        status.get(
            "rodada"
        )

    )


    try:

        return int(
            rodada
        )


    except (
        TypeError,
        ValueError,
    ) as erro:

        raise RuntimeError(

            "Não foi possível "
            "identificar a rodada atual."

        ) from erro


# ======================================================
# CLUBES
# ======================================================


def para_inteiro(
    valor: Any,
) -> int | None:

    try:

        return int(
            valor
        )

    except (
        TypeError,
        ValueError,
    ):

        return None


def indexar_clubes(
    mercado: dict[str, Any],
) -> dict[int, dict[str, Any]]:

    clubes = (
        mercado.get(
            "clubes",
            {},
        )
        or {}
    )


    resultado: dict[
        int,
        dict[str, Any]
    ] = {}


    if not isinstance(
        clubes,
        dict,
    ):

        return resultado


    for clube_id, clube in clubes.items():

        id_numerico = para_inteiro(
            clube_id
        )


        if (
            id_numerico is None
            or not isinstance(
                clube,
                dict,
            )
        ):

            continue


        resultado[
            id_numerico
        ] = clube


    return resultado


def indexar_posicoes(
    mercado: dict[str, Any],
) -> dict[int, dict[str, Any]]:

    posicoes = (
        mercado.get(
            "posicoes",
            {},
        )
        or {}
    )


    resultado: dict[
        int,
        dict[str, Any]
    ] = {}


    if not isinstance(
        posicoes,
        dict,
    ):

        return resultado


    for posicao_id, posicao in posicoes.items():

        id_numerico = para_inteiro(
            posicao_id
        )


        if (
            id_numerico is None
            or not isinstance(
                posicao,
                dict,
            )
        ):

            continue


        resultado[
            id_numerico
        ] = posicao


    return resultado


def obter_nome_clube(
    clube: dict[str, Any] | None,
) -> str:

    if not clube:

        return ""


    return str(

        clube.get(
            "nome"
        )

        or

        ""

    )


def obter_sigla_clube(
    clube: dict[str, Any] | None,
) -> str:

    if not clube:

        return ""


    return str(

        clube.get(
            "abreviacao"
        )

        or

        clube.get(
            "nome"
        )

        or

        ""

    )


# ======================================================
# PARTIDAS
# ======================================================


def extrair_lista_partidas(
    partidas: Any,
) -> list[dict[str, Any]]:

    if isinstance(
        partidas,
        list,
    ):

        return [

            partida

            for partida in partidas

            if isinstance(
                partida,
                dict,
            )

        ]


    if isinstance(
        partidas,
        dict,
    ):

        lista = partidas.get(
            "partidas"
        )


        if isinstance(
            lista,
            list,
        ):

            return [

                partida

                for partida in lista

                if isinstance(
                    partida,
                    dict,
                )

            ]


    return []


def obter_id_clube_casa(
    partida: dict[str, Any],
) -> int | None:

    return para_inteiro(

        partida.get(
            "clube_casa_id"
        )

        or

        partida.get(
            "clubeCasaId"
        )

        or

        partida.get(
            "mandante_id"
        )

    )


def obter_id_clube_visitante(
    partida: dict[str, Any],
) -> int | None:

    return para_inteiro(

        partida.get(
            "clube_visitante_id"
        )

        or

        partida.get(
            "clubeVisitanteId"
        )

        or

        partida.get(
            "visitante_id"
        )

    )


def obter_data_partida(
    partida: dict[str, Any],
) -> Any:

    return (

        partida.get(
            "partida_data"
        )

        or

        partida.get(
            "data"
        )

        or

        partida.get(
            "data_hora"
        )

        or

        partida.get(
            "inicio"
        )

    )


def criar_contexto_partidas(
    partidas: Any,
    clubes: dict[int, dict[str, Any]],
) -> dict[int, dict[str, Any]]:

    resultado: dict[
        int,
        dict[str, Any]
    ] = {}


    for partida in extrair_lista_partidas(
        partidas
    ):

        clube_casa_id = (
            obter_id_clube_casa(
                partida
            )
        )


        clube_visitante_id = (
            obter_id_clube_visitante(
                partida
            )
        )


        if (
            clube_casa_id is None
            or clube_visitante_id is None
        ):

            continue


        clube_casa = clubes.get(
            clube_casa_id,
            {},
        )


        clube_visitante = clubes.get(
            clube_visitante_id,
            {},
        )


        dados_comuns = {

            "partidaId":
                (
                    partida.get(
                        "partida_id"
                    )
                    or
                    partida.get(
                        "id"
                    )
                ),

            "local":
                (
                    partida.get(
                        "local"
                    )
                    or ""
                ),

            "dataPartida":
                obter_data_partida(
                    partida
                ),

            "partidaValida":
                partida.get(
                    "valida"
                ),

        }


        resultado[
            clube_casa_id
        ] = {

            **dados_comuns,

            "mando":
                "casa",

            "adversarioId":
                clube_visitante_id,

            "adversario":
                obter_nome_clube(
                    clube_visitante
                ),

            "siglaAdversario":
                obter_sigla_clube(
                    clube_visitante
                ),

        }


        resultado[
            clube_visitante_id
        ] = {

            **dados_comuns,

            "mando":
                "fora",

            "adversarioId":
                clube_casa_id,

            "adversario":
                obter_nome_clube(
                    clube_casa
                ),

            "siglaAdversario":
                obter_sigla_clube(
                    clube_casa
                ),

        }


    return resultado


# ======================================================
# PONTUADOS
# ======================================================


def indexar_pontuados(
    pontuados: Any,
) -> dict[Any, dict[str, Any]]:

    if not isinstance(
        pontuados,
        dict,
    ):

        return {}


    atletas = (
        pontuados.get(
            "atletas",
            {},
        )
        or {}
    )


    return (
        atletas
        if isinstance(
            atletas,
            dict,
        )
        else {}
    )


def obter_pontuacao_atleta(
    pontuacoes: dict[Any, dict[str, Any]],
    atleta_id: Any,
) -> dict[str, Any]:

    return (

        pontuacoes.get(
            str(
                atleta_id
            )
        )

        or

        pontuacoes.get(
            atleta_id
        )

        or

        {}

    )


# ======================================================
# TITULARIDADE
# ======================================================


def estimar_titularidade(
    status_id: Any,
) -> float | None:

    status = para_inteiro(
        status_id
    )


    if status == STATUS_PROVAVEL:

        return 95.0


    if status in STATUS_INDISPONIVEIS:

        return 10.0


    return None


def estimar_minutos(
    status_id: Any,
) -> float | None:

    status = para_inteiro(
        status_id
    )


    if status == STATUS_PROVAVEL:

        return 85.0


    if status in STATUS_INDISPONIVEIS:

        return 10.0


    return None


# ======================================================
# NORMALIZAÇÃO
# ======================================================


def normalizar_atletas(
    mercado: dict[str, Any],
    pontuados: dict[str, Any] | None,
    partidas: Any,
    rodada: int,
) -> list[dict[str, Any]]:

    atletas = (
        mercado.get(
            "atletas",
            [],
        )
        or []
    )


    clubes = indexar_clubes(
        mercado
    )


    posicoes_api = indexar_posicoes(
        mercado
    )


    contexto_partidas = (
        criar_contexto_partidas(
            partidas,
            clubes,
        )
    )


    pontuacoes = (
        indexar_pontuados(
            pontuados
        )
    )


    jogadores: list[
        dict[str, Any]
    ] = []


    for atleta in atletas:

        if not isinstance(
            atleta,
            dict,
        ):

            continue


        atleta_id = atleta.get(
            "atleta_id"
        )


        if atleta_id is None:

            continue


        posicao_id = para_inteiro(

            atleta.get(
                "posicao_id"
            )

        )


        clube_id = para_inteiro(

            atleta.get(
                "clube_id"
            )

        )


        clube = clubes.get(
            clube_id,
            {},
        )


        posicao_api = (
            posicoes_api.get(
                posicao_id,
                {},
            )
        )


        pontuacao = (
            obter_pontuacao_atleta(
                pontuacoes,
                atleta_id,
            )
        )


        contexto = (
            contexto_partidas.get(
                clube_id,
                {},
            )
        )


        codigo_posicao = (

            POSICOES.get(
                posicao_id
            )

            or

            str(
                posicao_api.get(
                    "abreviacao"
                )
                or ""
            ).upper()

        )


        status_id = atleta.get(
            "status_id"
        )


        scouts = (

            pontuacao.get(
                "scout"
            )

            or

            atleta.get(
                "scout"
            )

            or

            {}

        )


        jogador = {

            "id":
                atleta_id,

            "rodada":
                rodada,

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
                codigo_posicao,

            "posicaoId":
                posicao_id,

            "clubeId":
                clube_id,

            "clube":
                obter_nome_clube(
                    clube
                ),

            "siglaClube":
                obter_sigla_clube(
                    clube
                ),

            "statusId":
                status_id,

            "preco":
                atleta.get(
                    "preco_num"
                ),

            "variacao":
                atleta.get(
                    "variacao_num"
                ),

            "media":
                atleta.get(
                    "media_num"
                ),

            "jogos":
                atleta.get(
                    "jogos_num"
                ),

            "pontosUltimaRodada":
                atleta.get(
                    "pontos_num"
                ),

            "pontuacaoReal":
                (
                    pontuacao.get(
                        "pontuacao"
                    )
                    if pontuacao
                    else None
                ),

            "entrouEmCampo":
                (
                    pontuacao.get(
                        "entrou_em_campo"
                    )
                    if pontuacao
                    else None
                ),

            "scouts":
                scouts,

            "mando":
                contexto.get(
                    "mando"
                ),

            "adversarioId":
                contexto.get(
                    "adversarioId"
                ),

            "adversario":
                contexto.get(
                    "adversario"
                ),

            "siglaAdversario":
                contexto.get(
                    "siglaAdversario"
                ),

            "partidaId":
                contexto.get(
                    "partidaId"
                ),

            "partidaValida":
                contexto.get(
                    "partidaValida"
                ),

            "local":
                contexto.get(
                    "local"
                ),

            "dataPartida":
                contexto.get(
                    "dataPartida"
                ),

            "titularidade":
                estimar_titularidade(
                    status_id
                ),

            "minutosEsperados":
                estimar_minutos(
                    status_id
                ),

        }


        jogadores.append(
            jogador
        )


    return jogadores


# ======================================================
# RESUMO
# ======================================================


def criar_resumo(
    rodada: int,
    status: dict[str, Any],
    mercado: dict[str, Any],
    jogadores: list[dict[str, Any]],
) -> dict[str, Any]:

    pontuados = [

        jogador

        for jogador in jogadores

        if jogador.get(
            "pontuacaoReal"
        ) is not None

    ]


    com_confronto = [

        jogador

        for jogador in jogadores

        if jogador.get(
            "adversarioId"
        ) is not None

    ]


    return {

        "rodada":
            rodada,

        "coletadoEm":
            datetime.now()
            .isoformat(
                timespec="seconds"
            ),

        "statusMercado":
            status.get(
                "status_mercado"
            ),

        "quantidadeJogadores":
            len(
                mercado.get(
                    "atletas",
                    [],
                )
                or []
            ),

        "quantidadePontuados":
            len(
                pontuados
            ),

        "quantidadeComConfronto":
            len(
                com_confronto
            ),

        "dadosDemonstrativos":
            False,

    }


# ======================================================
# EXECUÇÃO
# ======================================================


def executar() -> None:

    print(
        "Iniciando coleta do Cartola..."
    )


    status = buscar_json(
        "/mercado/status"
    )


    rodada = obter_numero_rodada(
        status
    )


    pasta_rodada = (

        PASTA_DADOS
        /
        f"rodada-{rodada:02d}"

    )


    mercado = buscar_json(
        "/atletas/mercado"
    )


    partidas = buscar_json(

        f"/partidas/{rodada}",

        obrigatorio=False,

    )


    if partidas is None:

        partidas = buscar_json(

            "/partidas",

            obrigatorio=False,

        )


    pontuados = buscar_json(

        "/atletas/pontuados",

        obrigatorio=False,

    )


    jogadores = normalizar_atletas(

        mercado,

        pontuados,

        partidas,

        rodada,

    )


    resumo = criar_resumo(

        rodada,

        status,

        mercado,

        jogadores,

    )


    salvar_json(

        PASTA_DADOS
        / "status.json",

        status,

    )


    salvar_json(

        pasta_rodada
        / "mercado.json",

        mercado,

    )


    salvar_json(

        pasta_rodada
        / "partidas.json",

        partidas
        or {},

    )


    salvar_json(

        pasta_rodada
        / "pontuados.json",

        pontuados
        or {},

    )


    salvar_json(

        pasta_rodada
        / "jogadores.json",

        jogadores,

    )


    salvar_json(

        pasta_rodada
        / "resumo.json",

        resumo,

    )


    print(

        f"Coleta da rodada {rodada} concluída: "
        f"{len(jogadores)} jogadores."

    )


    print(

        "Jogadores com adversário/mando: "
        f"{resumo['quantidadeComConfronto']}"

    )


if __name__ == "__main__":

    try:

        executar()


    except Exception as erro:

        print(

            f"ERRO: {erro}",

            file=sys.stderr,

        )


        sys.exit(1)
