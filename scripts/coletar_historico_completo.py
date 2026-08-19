"""
======================================================
CARTOLA ESTATÍSTICO

Coleta histórica completa + contexto progressivo.

REGRA CIENTÍFICA:

Ao gerar a Rodada N, todo contexto estatístico usa
APENAS rodadas anteriores a N.

Exemplo:

R02 -> usa até R01
R03 -> usa até R02
R10 -> usa até R09

Evita vazamento de dados futuros.

======================================================
"""

from __future__ import annotations

import json
import math
import sys

from collections import defaultdict
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
    /
    "data"
    /
    "api"
)


CABECALHOS = {

    "User-Agent":
        "Mozilla/5.0",

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


JANELA_FORMA = 6

JANELA_PONTOS_CEDIDOS = 8

JANELA_SG = 8


# ======================================================
# UTILITÁRIOS
# ======================================================


def inteiro(
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


def numero(
    valor: Any,
) -> float | None:

    try:

        if (
            valor is None
            or valor == ""
        ):

            return None


        convertido = float(
            valor
        )


        if not math.isfinite(
            convertido
        ):

            return None


        return convertido


    except (
        TypeError,
        ValueError,
    ):

        return None


def limitar(
    valor: float,
) -> float:

    return max(
        0.0,
        min(
            100.0,
            valor,
        ),
    )


def round_seguro(
    valor: Any,
    casas: int = 2,
) -> float | None:

    convertido = numero(
        valor
    )


    if convertido is None:

        return None


    return round(
        convertido,
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
        +
        endpoint
    )


    requisicao = Request(

        url,

        headers=CABECALHOS,

    )


    try:

        with urlopen(
            requisicao,
            timeout=30,
        ) as resposta:

            return json.loads(

                resposta
                .read()
                .decode(
                    "utf-8"
                )

            )


    except HTTPError as erro:

        mensagem = (
            f"Erro HTTP "
            f"{erro.code}: "
            f"{url}"
        )


    except URLError as erro:

        mensagem = (
            f"Erro conexão: "
            f"{erro.reason}"
        )


    except json.JSONDecodeError:

        mensagem = (
            f"JSON inválido: "
            f"{url}"
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


# ======================================================
# MERCADO HISTÓRICO
# ======================================================


def buscar_mercado_historico(
    rodada: int,
) -> dict[str, Any]:

    mercado = buscar_json(

        f"/atletas/mercado/{rodada}",

        obrigatorio=False,

    )


    if (

        isinstance(
            mercado,
            dict,
        )

        and

        isinstance(
            mercado.get(
                "atletas"
            ),
            list,
        )

        and

        mercado.get(
            "atletas"
        )

    ):

        return mercado


    print(

        f"Rodada {rodada}: "
        "mercado histórico indisponível. "
        "Não será usado mercado atual como fallback."

    )


    return {}


def buscar_pontuados_historico(
    rodada: int,
) -> dict[str, Any]:

    dados = buscar_json(

        f"/atletas/pontuados/{rodada}",

        obrigatorio=False,

    )


    return (
        dados
        if isinstance(
            dados,
            dict,
        )
        else {}
    )


# ======================================================
# CLUBES
# ======================================================


def indexar_clubes(
    mercado: dict[str, Any],
) -> dict[int, dict[str, Any]]:

    resultado = {}


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

        clube_id = inteiro(
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


def nome_clube(
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


def sigla_clube(
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


def extrair_partidas(
    dados: Any,
) -> list[dict[str, Any]]:

    if isinstance(
        dados,
        list,
    ):

        return [
            item
            for item in dados
            if isinstance(
                item,
                dict,
            )
        ]


    if isinstance(
        dados,
        dict,
    ):

        partidas = dados.get(
            "partidas"
        )


        if isinstance(
            partidas,
            list,
        ):

            return [
                item
                for item in partidas
                if isinstance(
                    item,
                    dict,
                )
            ]


    return []


def clube_casa(
    partida: dict[str, Any],
) -> int | None:

    return inteiro(

        partida.get(
            "clube_casa_id"
        )

        or

        partida.get(
            "clubeCasaId"
        )

    )


def clube_visitante(
    partida: dict[str, Any],
) -> int | None:

    return inteiro(

        partida.get(
            "clube_visitante_id"
        )

        or

        partida.get(
            "clubeVisitanteId"
        )

    )


def placar_casa(
    partida: dict[str, Any],
) -> float | None:

    for chave in [

        "placar_oficial_mandante",

        "placar_mandante",

        "gols_mandante",

        "placarCasa",

    ]:

        valor = numero(
            partida.get(
                chave
            )
        )


        if valor is not None:
            return valor


    return None


def placar_visitante(
    partida: dict[str, Any],
) -> float | None:

    for chave in [

        "placar_oficial_visitante",

        "placar_visitante",

        "gols_visitante",

        "placarVisitante",

    ]:

        valor = numero(
            partida.get(
                chave
            )
        )


        if valor is not None:
            return valor


    return None


def criar_contexto_partidas(
    partidas: Any,
    clubes: dict[int, dict[str, Any]],
) -> dict[int, dict[str, Any]]:

    resultado = {}


    for partida in extrair_partidas(
        partidas
    ):

        casa = clube_casa(
            partida
        )

        visitante = clube_visitante(
            partida
        )


        if (
            casa is None
            or visitante is None
        ):

            continue


        resultado[casa] = {

            "mando":
                "casa",

            "adversarioId":
                visitante,

            "adversario":
                nome_clube(
                    clubes.get(
                        visitante
                    )
                ),

            "siglaAdversario":
                sigla_clube(
                    clubes.get(
                        visitante
                    )
                ),

        }


        resultado[visitante] = {

            "mando":
                "fora",

            "adversarioId":
                casa,

            "adversario":
                nome_clube(
                    clubes.get(
                        casa
                    )
                ),

            "siglaAdversario":
                sigla_clube(
                    clubes.get(
                        casa
                    )
                ),

        }


    return resultado


# ======================================================
# ATLETAS
# ======================================================


def indexar_atletas_mercado(
    mercado: dict[str, Any],
) -> dict[str, dict[str, Any]]:

    resultado = {}


    atletas = (
        mercado.get(
            "atletas",
            [],
        )
        or []
    )


    if not isinstance(
        atletas,
        list,
    ):

        return resultado


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


        resultado[
            str(
                atleta_id
            )
        ] = atleta


    return resultado


def indexar_pontuados(
    pontuados: dict[str, Any],
) -> dict[str, dict[str, Any]]:

    resultado = {}


    atletas = (
        pontuados.get(
            "atletas",
            {},
        )
        or {}
    )


    if not isinstance(
        atletas,
        dict,
    ):

        return resultado


    for chave, valor in atletas.items():

        if not isinstance(
            valor,
            dict,
        ):

            continue


        atleta_id = (
            valor.get(
                "atleta_id"
            )
            or
            chave
        )


        resultado[
            str(
                atleta_id
            )
        ] = {

            **valor,

            "atleta_id":
                inteiro(
                    atleta_id
                )
                or
                atleta_id,

        }


    return resultado


# ======================================================
# NORMALIZAÇÃO BRUTA
# ======================================================


def normalizar_jogadores_brutos(
    mercado: dict[str, Any],
    pontuados: dict[str, Any],
    partidas: Any,
    rodada: int,
) -> list[dict[str, Any]]:

    clubes = indexar_clubes(
        mercado
    )


    mercado_atletas = (
        indexar_atletas_mercado(
            mercado
        )
    )


    pontuados_atletas = (
        indexar_pontuados(
            pontuados
        )
    )


    contexto = (
        criar_contexto_partidas(
            partidas,
            clubes,
        )
    )


    ids = set(
        mercado_atletas.keys()
    )

    ids.update(
        pontuados_atletas.keys()
    )


    jogadores = []


    for chave in ids:

        atleta = (
            mercado_atletas.get(
                chave,
                {}
            )
        )


        pontuado = (
            pontuados_atletas.get(
                chave,
                {}
            )
        )


        atleta_id = (
            atleta.get(
                "atleta_id"
            )
            or
            pontuado.get(
                "atleta_id"
            )
        )


        posicao_id = inteiro(

            atleta.get(
                "posicao_id"
            )

            or

            pontuado.get(
                "posicao_id"
            )

        )


        clube_id = inteiro(

            atleta.get(
                "clube_id"
            )

            or

            pontuado.get(
                "clube_id"
            )

        )


        contexto_clube = (
            contexto.get(
                clube_id,
                {},
            )
        )


        clube = clubes.get(
            clube_id,
            {},
        )


        jogadores.append({

            "id":
                atleta_id,

            "rodada":
                rodada,

            "nome":
                atleta.get(
                    "nome"
                )
                or
                pontuado.get(
                    "nome"
                ),

            "apelido":
                atleta.get(
                    "apelido"
                )
                or
                pontuado.get(
                    "apelido"
                ),

            "foto":
                atleta.get(
                    "foto"
                )
                or
                pontuado.get(
                    "foto"
                ),

            "posicao":
                POSICOES.get(
                    posicao_id,
                    "",
                ),

            "posicaoId":
                posicao_id,

            "clubeId":
                clube_id,

            "clube":
                nome_clube(
                    clube
                ),

            "siglaClube":
                sigla_clube(
                    clube
                ),

            "statusId":
                atleta.get(
                    "status_id"
                ),

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

            "pontuacaoReal":
                pontuado.get(
                    "pontuacao"
                ),

            "entrouEmCampo":
                pontuado.get(
                    "entrou_em_campo"
                ),

            "scouts":
                (
                    pontuado.get(
                        "scout"
                    )
                    or {}
                ),

            "mando":
                contexto_clube.get(
                    "mando"
                ),

            "adversarioId":
                contexto_clube.get(
                    "adversarioId"
                ),

            "adversario":
                contexto_clube.get(
                    "adversario"
                ),

            "siglaAdversario":
                contexto_clube.get(
                    "siglaAdversario"
                ),

        })


    return jogadores


# ======================================================
# CONTEXTO PROGRESSIVO
# ======================================================


def construir_contexto_progressivo(
    rodadas: dict[
        int,
        dict[str, Any]
    ],
    rodada_alvo: int,
) -> dict[str, Any]:

    historico_clubes: dict[
        int,
        list[dict[str, Any]]
    ] = defaultdict(list)


    cedidos: dict[
        tuple[int, str],
        list[float]
    ] = defaultdict(list)


    for rodada in sorted(
        rodadas
    ):

        if rodada >= rodada_alvo:
            break


        dados_rodada = rodadas[
            rodada
        ]


        for partida in extrair_partidas(
            dados_rodada.get(
                "partidas"
            )
        ):

            casa = clube_casa(
                partida
            )

            visitante = clube_visitante(
                partida
            )

            gc = placar_casa(
                partida
            )

            gv = placar_visitante(
                partida
            )


            if (
                casa is None
                or visitante is None
                or gc is None
                or gv is None
            ):

                continue


            if gc > gv:

                pc = 3
                pv = 0

            elif gc < gv:

                pc = 0
                pv = 3

            else:

                pc = 1
                pv = 1


            historico_clubes[
                casa
            ].append({

                "pontos":
                    pc,

                "golsPro":
                    gc,

                "golsContra":
                    gv,

                "sg":
                    gv == 0,

            })


            historico_clubes[
                visitante
            ].append({

                "pontos":
                    pv,

                "golsPro":
                    gv,

                "golsContra":
                    gc,

                "sg":
                    gc == 0,

            })


        totais = defaultdict(
            float
        )


        for jogador in dados_rodada.get(
            "jogadores",
            []
        ):

            adversario_id = inteiro(
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

            pontos = numero(
                jogador.get(
                    "pontuacaoReal"
                )
            )


            if (
                adversario_id is None
                or not posicao
                or pontos is None
                or jogador.get(
                    "entrouEmCampo"
                ) is False
            ):

                continue


            totais[
                (
                    adversario_id,
                    posicao,
                )
            ] += pontos


        for chave, valor in totais.items():

            cedidos[
                chave
            ].append(
                valor
            )


    forca = {}


    sg = {}


    for clube_id, jogos in historico_clubes.items():

        recentes = jogos[
            -JANELA_FORMA:
        ]


        if recentes:

            aproveitamento = (
                sum(
                    jogo[
                        "pontos"
                    ]
                    for jogo in recentes
                )
                /
                (
                    len(
                        recentes
                    )
                    *
                    3
                )
            )


            saldo = (
                sum(
                    jogo[
                        "golsPro"
                    ]
                    -
                    jogo[
                        "golsContra"
                    ]
                    for jogo in recentes
                )
                /
                len(
                    recentes
                )
            )


            forca[
                clube_id
            ] = limitar(

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
                saldo
                *
                9

            )


        recentes_sg = jogos[
            -JANELA_SG:
        ]


        if recentes_sg:

            sg[
                clube_id
            ] = (

                sum(
                    1
                    for jogo in recentes_sg
                    if jogo[
                        "sg"
                    ]
                )
                /
                len(
                    recentes_sg
                )

            ) * 100


    medias_cedidos = {}


    for chave, valores in cedidos.items():

        recentes = valores[
            -JANELA_PONTOS_CEDIDOS:
        ]


        if recentes:

            medias_cedidos[
                chave
            ] = sum(
                recentes
            ) / len(
                recentes
            )


    por_posicao = defaultdict(
        list
    )


    for chave, valor in medias_cedidos.items():

        por_posicao[
            chave[1]
        ].append(
            (
                chave,
                valor,
            )
        )


    notas_cedidos = {}


    for itens in por_posicao.values():

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

                nota = 50

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


            notas_cedidos[
                chave
            ] = limitar(
                nota
            )


    return {

        "forca":
            forca,

        "chanceSG":
            sg,

        "mediaCedidos":
            medias_cedidos,

        "notaCedidos":
            notas_cedidos,

    }


def enriquecer_rodada(
    rodadas: dict[
        int,
        dict[str, Any]
    ],
    rodada: int,
) -> None:

    contexto = (
        construir_contexto_progressivo(
            rodadas,
            rodada,
        )
    )


    for jogador in rodadas[
        rodada
    ][
        "jogadores"
    ]:

        clube_id = inteiro(
            jogador.get(
                "clubeId"
            )
        )


        adversario_id = inteiro(
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


        mando = jogador.get(
            "mando"
        )


        forca_adversario = (
            contexto[
                "forca"
            ].get(
                adversario_id
            )
            if adversario_id is not None
            else None
        )


        nota_forca = (
            (
                100
                -
                forca_adversario
            )
            if forca_adversario is not None
            else None
        )


        if nota_forca is not None:

            if mando == "casa":

                nota_forca += 5

            elif mando == "fora":

                nota_forca -= 5


            nota_forca = limitar(
                nota_forca
            )


        chave = (
            adversario_id,
            posicao,
        )


        chance_sg = (
            contexto[
                "chanceSG"
            ].get(
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


        jogador[
            "forcaAdversarioIndice"
        ] = round_seguro(
            forca_adversario
        )


        jogador[
            "notaForcaAdversario"
        ] = round_seguro(
            nota_forca
        )


        jogador[
            "pontosCedidosMediaPosicao"
        ] = round_seguro(
            contexto[
                "mediaCedidos"
            ].get(
                chave
            )
        )


        jogador[
            "pontosCedidosNota"
        ] = round_seguro(
            contexto[
                "notaCedidos"
            ].get(
                chave
            )
        )


        jogador[
            "chanceSG"
        ] = round_seguro(
            chance_sg
        )


        jogador[
            "contextoCalculadoAteRodada"
        ] = max(
            0,
            rodada - 1,
        )


# ======================================================
# COLETA BRUTA
# ======================================================


def coletar_rodada_bruta(
    rodada: int,
) -> dict[str, Any]:

    print(
        f"Coletando rodada {rodada}"
    )


    mercado = (
        buscar_mercado_historico(
            rodada
        )
    )


    partidas = (
        buscar_json(

            f"/partidas/{rodada}",

            obrigatorio=False,

        )
        or {}
    )


    pontuados = (
        buscar_pontuados_historico(
            rodada
        )
    )


    jogadores = (
        normalizar_jogadores_brutos(

            mercado,

            pontuados,

            partidas,

            rodada,

        )
    )


    return {

        "mercado":
            mercado,

        "partidas":
            partidas,

        "pontuados":
            pontuados,

        "jogadores":
            jogadores,

    }


# ======================================================
# EXECUÇÃO
# ======================================================


def executar() -> None:

    status = buscar_json(
        "/mercado/status"
    )


    rodada_atual = int(
        status.get(
            "rodada_atual",
            1,
        )
    )


    print(
        "Rodada atual:",
        rodada_atual,
    )


    rodadas: dict[
        int,
        dict[str, Any]
    ] = {}


    # ==========================================
    # 1. COLETA BRUTA
    # ==========================================

    for rodada in range(
        1,
        rodada_atual + 1,
    ):

        try:

            rodadas[
                rodada
            ] = (
                coletar_rodada_bruta(
                    rodada
                )
            )

        except Exception as erro:

            print(
                f"Falha rodada "
                f"{rodada}: "
                f"{erro}"
            )


    # ==========================================
    # 2. CONTEXTO PROGRESSIVO
    # ==========================================

    for rodada in sorted(
        rodadas
    ):

        enriquecer_rodada(
            rodadas,
            rodada,
        )


    # ==========================================
    # 3. SALVAR
    # ==========================================

    for rodada, dados in sorted(
        rodadas.items()
    ):

        pasta = (
            PASTA_API
            /
            f"rodada-{rodada:02d}"
        )


        salvar_json(
            pasta
            /
            "mercado.json",
            dados[
                "mercado"
            ],
        )


        salvar_json(
            pasta
            /
            "partidas.json",
            dados[
                "partidas"
            ],
        )


        salvar_json(
            pasta
            /
            "pontuados.json",
            dados[
                "pontuados"
            ],
        )


        salvar_json(
            pasta
            /
            "jogadores.json",
            dados[
                "jogadores"
            ],
        )


        contexto_ok = len([

            jogador

            for jogador in dados[
                "jogadores"
            ]

            if jogador.get(
                "notaForcaAdversario"
            ) is not None

        ])


        print(

            f"[OK] Rodada {rodada:02d} | "
            f"Jogadores: "
            f"{len(dados['jogadores'])} | "
            f"Contexto: {contexto_ok} | "
            f"dados até R{max(0, rodada - 1):02d}"

        )


    print(
        ""
    )

    print(
        "============================================"
    )

    print(
        "HISTÓRICO COMPLETO FINALIZADO"
    )

    print(
        "============================================"
    )

    print(
        "Rodadas:",
        len(
            rodadas
        ),
    )

    print(
        "Proteção contra vazamento futuro: ATIVA"
    )

    print(
        "============================================"
    )


if __name__ == "__main__":

    try:

        executar()


    except Exception as erro:

        print(

            "ERRO:",
            erro,

            file=sys.stderr,

        )


        sys.exit(1)
