"""
======================================================
CARTOLA ESTATÍSTICO

Coleta da rodada atual + contexto estatístico.

Gera:

data/api/status.json

data/api/rodada-XX/
    mercado.json
    partidas.json
    pontuados.json
    jogadores.json
    resumo.json

Contexto calculado usando APENAS rodadas anteriores:

- mando;
- adversário;
- força do adversário;
- pontos cedidos por posição;
- chance histórica de SG;
- titularidade estimada;
- minutos esperados.

======================================================
"""

from __future__ import annotations

import json
import math
import sys

from collections import defaultdict
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


API_BASE = (
    "https://api.cartolafc.globo.com"
)


PASTA_RAIZ = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)


PASTA_API = (
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


JANELA_CONTEXTO = 8

JANELA_FORMA_CLUBE = 6

JANELA_SG = 8


# ======================================================
# UTILITÁRIOS
# ======================================================


def para_inteiro(
    valor: Any,
) -> int | None:

    try:

        if valor is None:
            return None

        return int(
            valor
        )

    except (
        TypeError,
        ValueError,
    ):

        return None


def para_float(
    valor: Any,
) -> float | None:

    try:

        if (
            valor is None
            or valor == ""
        ):
            return None

        numero = float(
            valor
        )

        if not math.isfinite(
            numero
        ):
            return None

        return numero

    except (
        TypeError,
        ValueError,
    ):

        return None


def limitar(
    valor: float,
    minimo: float = 0.0,
    maximo: float = 100.0,
) -> float:

    return max(
        minimo,
        min(
            maximo,
            valor,
        ),
    )


def arredondar(
    valor: Any,
    casas: int = 2,
) -> float | None:

    numero = para_float(
        valor
    )

    if numero is None:
        return None

    return round(
        numero,
        casas,
    )


# ======================================================
# API
# ======================================================


def buscar_json(
    endpoint: str,
    obrigatorio: bool = True,
) -> Any:

    url = (
        API_BASE
        + endpoint
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
            f"JSON inválido em {url}"
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


def carregar_json_seguro(
    caminho: Path,
) -> Any:

    if not caminho.exists():

        return None


    try:

        return json.loads(
            caminho.read_text(
                encoding="utf-8"
            )
        )

    except Exception:

        return None


# ======================================================
# STATUS
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


    numero = para_inteiro(
        rodada
    )


    if numero is None:

        raise RuntimeError(
            "Não foi possível identificar a rodada atual."
        )


    return numero


# ======================================================
# CLUBES
# ======================================================


def indexar_clubes(
    mercado: dict[str, Any],
) -> dict[int, dict[str, Any]]:

    resultado: dict[
        int,
        dict[str, Any]
    ] = {}


    clubes = (
        mercado.get(
            "clubes",
            {},
        )
        or {}
    )


    if not isinstance(
        clubes,
        dict,
    ):

        return resultado


    for chave, clube in clubes.items():

        clube_id = para_inteiro(
            chave
        )


        if (
            clube_id is None
            or not isinstance(
                clube,
                dict,
            )
        ):

            continue


        resultado[
            clube_id
        ] = clube


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
        or ""
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
        or ""
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


def obter_placar_casa(
    partida: dict[str, Any],
) -> float | None:

    candidatos = [

        partida.get(
            "placar_oficial_mandante"
        ),

        partida.get(
            "placar_mandante"
        ),

        partida.get(
            "gols_mandante"
        ),

        partida.get(
            "placarCasa"
        ),

    ]


    for valor in candidatos:

        numero = para_float(
            valor
        )

        if numero is not None:
            return numero


    return None


def obter_placar_visitante(
    partida: dict[str, Any],
) -> float | None:

    candidatos = [

        partida.get(
            "placar_oficial_visitante"
        ),

        partida.get(
            "placar_visitante"
        ),

        partida.get(
            "gols_visitante"
        ),

        partida.get(
            "placarVisitante"
        ),

    ]


    for valor in candidatos:

        numero = para_float(
            valor
        )

        if numero is not None:
            return numero


    return None


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

        casa = obter_id_clube_casa(
            partida
        )

        visitante = obter_id_clube_visitante(
            partida
        )


        if (
            casa is None
            or visitante is None
        ):

            continue


        clube_casa = clubes.get(
            casa,
            {},
        )

        clube_visitante = clubes.get(
            visitante,
            {},
        )


        comuns = {

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
            casa
        ] = {

            **comuns,

            "mando":
                "casa",

            "adversarioId":
                visitante,

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
            visitante
        ] = {

            **comuns,

            "mando":
                "fora",

            "adversarioId":
                casa,

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
# HISTÓRICO DISPONÍVEL
# ======================================================


def obter_pastas_historicas(
    rodada_atual: int,
) -> list[tuple[int, Path]]:

    resultado = []


    for pasta in PASTA_API.glob(
        "rodada-*"
    ):

        if not pasta.is_dir():
            continue


        rodada = para_inteiro(
            pasta.name.replace(
                "rodada-",
                "",
            )
        )


        if (
            rodada is None
            or rodada >= rodada_atual
        ):

            continue


        resultado.append(
            (
                rodada,
                pasta,
            )
        )


    resultado.sort(
        key=lambda item:
            item[0]
    )


    return resultado


# ======================================================
# FORMA DOS CLUBES
# ======================================================


def montar_historico_partidas(
    rodada_atual: int,
) -> dict[int, list[dict[str, Any]]]:

    por_clube: dict[
        int,
        list[dict[str, Any]]
    ] = defaultdict(list)


    for rodada, pasta in obter_pastas_historicas(
        rodada_atual
    ):

        dados = carregar_json_seguro(
            pasta
            /
            "partidas.json"
        )


        for partida in extrair_lista_partidas(
            dados
        ):

            casa = obter_id_clube_casa(
                partida
            )

            visitante = obter_id_clube_visitante(
                partida
            )

            gols_casa = obter_placar_casa(
                partida
            )

            gols_visitante = obter_placar_visitante(
                partida
            )


            if (
                casa is None
                or visitante is None
                or gols_casa is None
                or gols_visitante is None
            ):

                continue


            if gols_casa > gols_visitante:

                pontos_casa = 3
                pontos_visitante = 0

            elif gols_casa < gols_visitante:

                pontos_casa = 0
                pontos_visitante = 3

            else:

                pontos_casa = 1
                pontos_visitante = 1


            por_clube[casa].append({

                "rodada":
                    rodada,

                "mando":
                    "casa",

                "adversarioId":
                    visitante,

                "golsPro":
                    gols_casa,

                "golsContra":
                    gols_visitante,

                "pontos":
                    pontos_casa,

                "sg":
                    gols_visitante == 0,

            })


            por_clube[visitante].append({

                "rodada":
                    rodada,

                "mando":
                    "fora",

                "adversarioId":
                    casa,

                "golsPro":
                    gols_visitante,

                "golsContra":
                    gols_casa,

                "pontos":
                    pontos_visitante,

                "sg":
                    gols_casa == 0,

            })


    return dict(
        por_clube
    )


def calcular_forca_clubes(
    historico_partidas: dict[
        int,
        list[dict[str, Any]]
    ],
) -> dict[int, float]:

    resultado: dict[
        int,
        float
    ] = {}


    for clube_id, jogos in historico_partidas.items():

        recentes = jogos[
            -JANELA_FORMA_CLUBE:
        ]


        if not recentes:

            continue


        pontos_possiveis = (
            len(recentes)
            * 3
        )


        pontos = sum(
            para_float(
                jogo.get(
                    "pontos"
                )
            )
            or 0
            for jogo in recentes
        )


        saldo_medio = sum(
            (
                para_float(
                    jogo.get(
                        "golsPro"
                    )
                )
                or 0
            )
            -
            (
                para_float(
                    jogo.get(
                        "golsContra"
                    )
                )
                or 0
            )
            for jogo in recentes
        ) / len(recentes)


        aproveitamento = (
            pontos
            /
            pontos_possiveis
            if pontos_possiveis > 0
            else 0.5
        )


        nota = (
            50
            +
            (
                aproveitamento
                -
                0.5
            )
            *
            70
            +
            saldo_medio
            *
            9
        )


        resultado[
            clube_id
        ] = limitar(
            nota
        )


    return resultado


# ======================================================
# PONTOS CEDIDOS POR POSIÇÃO
# ======================================================


def montar_pontos_cedidos(
    rodada_atual: int,
) -> dict[
    tuple[int, str],
    dict[str, Any]
]:

    por_chave: dict[
        tuple[int, str],
        list[tuple[int, float]]
    ] = defaultdict(list)


    for rodada, pasta in obter_pastas_historicas(
        rodada_atual
    ):

        jogadores = carregar_json_seguro(
            pasta
            /
            "jogadores.json"
        )


        if not isinstance(
            jogadores,
            list,
        ):

            continue


        totais_rodada: dict[
            tuple[int, str],
            float
        ] = defaultdict(float)


        for jogador in jogadores:

            if not isinstance(
                jogador,
                dict,
            ):

                continue


            adversario_id = para_inteiro(
                jogador.get(
                    "adversarioId"
                )
            )


            posicao = str(
                jogador.get(
                    "posicao"
                )
                or ""
            ).upper()


            pontos = para_float(
                jogador.get(
                    "pontuacaoReal"
                )
            )


            entrou = jogador.get(
                "entrouEmCampo"
            )


            if (
                adversario_id is None
                or not posicao
                or pontos is None
                or entrou is False
            ):

                continue


            totais_rodada[
                (
                    adversario_id,
                    posicao,
                )
            ] += pontos


        for chave, total in totais_rodada.items():

            por_chave[
                chave
            ].append(
                (
                    rodada,
                    total,
                )
            )


    resultado: dict[
        tuple[int, str],
        dict[str, Any]
    ] = {}


    for chave, registros in por_chave.items():

        recentes = registros[
            -JANELA_CONTEXTO:
        ]


        valores = [
            valor
            for _, valor in recentes
        ]


        if not valores:
            continue


        resultado[
            chave
        ] = {

            "media":
                sum(
                    valores
                )
                /
                len(
                    valores
                ),

            "amostra":
                len(
                    valores
                ),

        }


    return resultado


def normalizar_pontos_cedidos(
    dados: dict[
        tuple[int, str],
        dict[str, Any]
    ],
) -> dict[
    tuple[int, str],
    float
]:

    por_posicao: dict[
        str,
        list[
            tuple[
                tuple[int, str],
                float,
            ]
        ]
    ] = defaultdict(list)


    for chave, item in dados.items():

        media_valor = para_float(
            item.get(
                "media"
            )
        )


        if media_valor is None:
            continue


        por_posicao[
            chave[1]
        ].append(
            (
                chave,
                media_valor,
            )
        )


    resultado: dict[
        tuple[int, str],
        float
    ] = {}


    for posicao, itens in por_posicao.items():

        del posicao

        valores = [
            valor
            for _, valor in itens
        ]


        minimo = min(
            valores
        )

        maximo = max(
            valores
        )


        for chave, valor in itens:

            if maximo == minimo:

                nota = 50.0

            else:

                nota = (
                    (
                        valor
                        -
                        minimo
                    )
                    /
                    (
                        maximo
                        -
                        minimo
                    )
                ) * 100


            resultado[
                chave
            ] = limitar(
                nota
            )


    return resultado


# ======================================================
# CHANCE DE SG
# ======================================================


def calcular_chance_sg_clubes(
    historico_partidas: dict[
        int,
        list[dict[str, Any]]
    ],
) -> dict[int, float]:

    resultado: dict[
        int,
        float
    ] = {}


    for clube_id, jogos in historico_partidas.items():

        recentes = jogos[
            -JANELA_SG:
        ]


        if not recentes:
            continue


        limpos = sum(
            1
            for jogo in recentes
            if jogo.get(
                "sg"
            ) is True
        )


        resultado[
            clube_id
        ] = (
            limpos
            /
            len(
                recentes
            )
        ) * 100


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
# TITULARIDADE / MINUTOS
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
# NORMALIZAÇÃO DOS JOGADORES
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


    historico_partidas = (
        montar_historico_partidas(
            rodada
        )
    )


    forca_clubes = (
        calcular_forca_clubes(
            historico_partidas
        )
    )


    pontos_cedidos = (
        montar_pontos_cedidos(
            rodada
        )
    )


    notas_pontos_cedidos = (
        normalizar_pontos_cedidos(
            pontos_cedidos
        )
    )


    chance_sg_clubes = (
        calcular_chance_sg_clubes(
            historico_partidas
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


        adversario_id = para_inteiro(
            contexto.get(
                "adversarioId"
            )
        )


        posicao = (
            POSICOES.get(
                posicao_id,
                "",
            )
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


        forca_adversario_bruta = (
            forca_clubes.get(
                adversario_id
            )
            if adversario_id is not None
            else None
        )


        nota_forca_adversario = (
            (
                100
                -
                forca_adversario_bruta
            )
            if forca_adversario_bruta is not None
            else None
        )


        mando = contexto.get(
            "mando"
        )


        if (
            nota_forca_adversario
            is not None
        ):

            if mando == "casa":

                nota_forca_adversario += 5

            elif mando == "fora":

                nota_forca_adversario -= 5


            nota_forca_adversario = limitar(
                nota_forca_adversario
            )


        chave_pontos_cedidos = (
            (
                adversario_id,
                posicao,
            )
            if adversario_id is not None
            else None
        )


        pontos_cedidos_item = (
            pontos_cedidos.get(
                chave_pontos_cedidos
            )
            if chave_pontos_cedidos
            else None
        )


        nota_pontos_cedidos = (
            notas_pontos_cedidos.get(
                chave_pontos_cedidos
            )
            if chave_pontos_cedidos
            else None
        )


        chance_sg = (
            chance_sg_clubes.get(
                clube_id
            )
            if clube_id is not None
            else None
        )


        if chance_sg is not None:

            if mando == "casa":

                chance_sg += 5

            elif mando == "fora":

                chance_sg -= 5


            chance_sg = limitar(
                chance_sg
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
                posicao,

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

            # ==========================================
            # CONFRONTO
            # ==========================================

            "mando":
                mando,

            "adversarioId":
                adversario_id,

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

            # ==========================================
            # TITULARIDADE
            # ==========================================

            "titularidade":
                estimar_titularidade(
                    status_id
                ),

            "minutosEsperados":
                estimar_minutos(
                    status_id
                ),

            # ==========================================
            # CONTEXTO ESTATÍSTICO
            # ==========================================

            "forcaAdversarioIndice":
                arredondar(
                    forca_adversario_bruta
                ),

            "notaForcaAdversario":
                arredondar(
                    nota_forca_adversario
                ),

            "pontosCedidosMediaPosicao":
                arredondar(
                    (
                        pontos_cedidos_item
                        or {}
                    ).get(
                        "media"
                    )
                ),

            "pontosCedidosAmostra":
                (
                    pontos_cedidos_item
                    or {}
                ).get(
                    "amostra",
                    0,
                ),

            "pontosCedidosNota":
                arredondar(
                    nota_pontos_cedidos
                ),

            "chanceSG":
                arredondar(
                    chance_sg
                ),

            "contextoCalculadoAteRodada":
                max(
                    0,
                    rodada - 1,
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

    com_confronto = [

        jogador

        for jogador in jogadores

        if jogador.get(
            "adversarioId"
        ) is not None

    ]


    com_forca = [

        jogador

        for jogador in jogadores

        if jogador.get(
            "notaForcaAdversario"
        ) is not None

    ]


    com_pontos_cedidos = [

        jogador

        for jogador in jogadores

        if jogador.get(
            "pontosCedidosNota"
        ) is not None

    ]


    com_sg = [

        jogador

        for jogador in jogadores

        if jogador.get(
            "chanceSG"
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

        "quantidadeComConfronto":
            len(
                com_confronto
            ),

        "quantidadeComForcaAdversario":
            len(
                com_forca
            ),

        "quantidadeComPontosCedidos":
            len(
                com_pontos_cedidos
            ),

        "quantidadeComChanceSG":
            len(
                com_sg
            ),

        "contextoSomenteRodadasAnteriores":
            True,

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
        PASTA_API
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

        PASTA_API
        /
        "status.json",

        status,

    )


    salvar_json(

        pasta_rodada
        /
        "mercado.json",

        mercado,

    )


    salvar_json(

        pasta_rodada
        /
        "partidas.json",

        partidas
        or {},

    )


    salvar_json(

        pasta_rodada
        /
        "pontuados.json",

        pontuados
        or {},

    )


    salvar_json(

        pasta_rodada
        /
        "jogadores.json",

        jogadores,

    )


    salvar_json(

        pasta_rodada
        /
        "resumo.json",

        resumo,

    )


    print(
        ""
    )

    print(
        "============================================"
    )

    print(
        f"COLETA DA RODADA {rodada} CONCLUÍDA"
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
        "Com confronto:",
        resumo[
            "quantidadeComConfronto"
        ],
    )

    print(
        "Com força adversário:",
        resumo[
            "quantidadeComForcaAdversario"
        ],
    )

    print(
        "Com pontos cedidos:",
        resumo[
            "quantidadeComPontosCedidos"
        ],
    )

    print(
        "Com chance SG:",
        resumo[
            "quantidadeComChanceSG"
        ],
    )

    print(
        "Contexto calculado somente até R",
        rodada - 1,
    )

    print(
        "============================================"
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
