"""
=========================================================
CARTOLA ESTATÍSTICO
Modelo Probabilístico de Confrontos - Poisson
=========================================================

OBJETIVO
---------------------------------------------------------
Transformar o contexto da partida em probabilidades úteis
para o modelo do Cartola.

Calcula, para cada clube/rodada:

- gols esperados do clube;
- gols esperados do adversário;
- probabilidade de marcar 0, 1, 2, 3+ gols;
- probabilidade de sofrer 0 gols;
- probabilidade de vitória;
- probabilidade de empate;
- probabilidade de derrota;
- expectativa de saldo de gols;
- nota ofensiva do confronto;
- nota defensiva do confronto;
- chance de SG estimada.

IMPORTANTE
---------------------------------------------------------
O modelo é WALK-FORWARD.

Para estimar a rodada R, usa somente partidas anteriores
à rodada R.

Isso evita leakage.

ENTRADA
---------------------------------------------------------
data/api/rodada-XX/partidas.json

SAÍDA
---------------------------------------------------------
data/modelagem/contexto_poisson.json

OBSERVAÇÃO
---------------------------------------------------------
Esta é uma camada experimental.

Ela NÃO altera automaticamente o motor oficial.

=========================================================
"""

from __future__ import annotations

import json
import math

from pathlib import Path
from collections import defaultdict
from typing import Any


# =========================================================
# CAMINHOS
# =========================================================

PASTA_API = Path(
    "data/api"
)

ARQUIVO_SAIDA = Path(
    "data/modelagem/contexto_poisson.json"
)


# =========================================================
# CONFIGURAÇÃO
# =========================================================

MEDIA_GOLS_PADRAO = 1.30

PESO_RECORRENCIA = 0.65

PESO_HISTORICO = 0.35

FATOR_MANDO = 1.08

FATOR_VISITANTE = 0.92

MIN_JOGOS_CLUBE = 3

MAX_GOLS_POISSON = 7


# =========================================================
# UTILITÁRIOS
# =========================================================

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


def numero(
    valor,
    padrao=0.0,
):

    try:

        if valor is None:

            return padrao

        valor = float(
            valor
        )

        if math.isfinite(
            valor
        ):

            return valor

    except Exception:

        pass

    return padrao


def limitar(
    valor,
    minimo,
    maximo,
):

    return max(
        minimo,
        min(
            maximo,
            valor,
        ),
    )


def media(
    valores,
):

    valores = list(
        valores
    )

    if not valores:

        return 0.0

    return (
        sum(
            valores
        )
        /
        len(
            valores
        )
    )


def media_ponderada_recente(
    valores,
):

    valores = list(
        valores
    )

    if not valores:

        return None


    if len(
        valores
    ) <= 5:

        return media(
            valores
        )


    recentes = valores[
        -5:
    ]

    antigos = valores[
        :-5
    ]


    media_recente = media(
        recentes
    )

    media_antiga = media(
        antigos
    )


    return (

        media_recente
        *
        PESO_RECORRENCIA

        +

        media_antiga
        *
        PESO_HISTORICO

    )


def arredondar(
    valor,
    casas=4,
):

    return round(
        numero(
            valor
        ),
        casas,
    )


# =========================================================
# NORMALIZAÇÃO DE CLUBES
# =========================================================

def clube_id(
    valor,
):

    if isinstance(
        valor,
        dict,
    ):

        for chave in (
            "id",
            "clube_id",
            "clubeId",
        ):

            if chave in valor:

                return str(
                    valor[
                        chave
                    ]
                )


    if valor is None:

        return None


    return str(
        valor
    )


def obter_clube_casa(
    partida,
):

    for chave in (

        "clube_casa_id",

        "clubeCasaId",

        "clube_casa",

        "mandante_id",

        "mandante",

    ):

        if chave in partida:

            valor = clube_id(
                partida[
                    chave
                ]
            )

            if valor:

                return valor


    return None


def obter_clube_visitante(
    partida,
):

    for chave in (

        "clube_visitante_id",

        "clubeVisitanteId",

        "clube_visitante",

        "visitante_id",

        "visitante",

    ):

        if chave in partida:

            valor = clube_id(
                partida[
                    chave
                ]
            )

            if valor:

                return valor


    return None


# =========================================================
# PLACAR
# =========================================================

def obter_gols_casa(
    partida,
):

    for chave in (

        "placar_oficial_mandante",

        "placarMandante",

        "gols_mandante",

        "golsMandante",

    ):

        if partida.get(
            chave
        ) is not None:

            return numero(
                partida[
                    chave
                ]
            )


    return None


def obter_gols_visitante(
    partida,
):

    for chave in (

        "placar_oficial_visitante",

        "placarVisitante",

        "gols_visitante",

        "golsVisitante",

    ):

        if partida.get(
            chave
        ) is not None:

            return numero(
                partida[
                    chave
                ]
            )


    return None


# =========================================================
# EXTRAÇÃO DAS PARTIDAS
# =========================================================

def extrair_lista_partidas(
    dados,
):

    if isinstance(
        dados,
        list,
    ):

        return dados


    if not isinstance(
        dados,
        dict,
    ):

        return []


    for chave in (

        "partidas",

        "matches",

        "jogos",

    ):

        valor = dados.get(
            chave
        )

        if isinstance(
            valor,
            list,
        ):

            return valor


    return []


def numero_rodada_pasta(
    pasta,
):

    nome = pasta.name

    try:

        return int(
            nome.split(
                "-"
            )[-1]
        )

    except Exception:

        return None


def carregar_partidas():

    resultado = {}


    pastas = sorted(
        PASTA_API.glob(
            "rodada-*"
        )
    )


    for pasta in pastas:

        rodada = numero_rodada_pasta(
            pasta
        )


        if rodada is None:

            continue


        arquivo = (
            pasta
            /
            "partidas.json"
        )


        if not arquivo.exists():

            continue


        try:

            dados = carregar_json(
                arquivo
            )

        except Exception as erro:

            print(
                "[AVISO] Falha lendo",
                arquivo,
                ":",
                erro,
            )

            continue


        partidas = extrair_lista_partidas(
            dados
        )


        if partidas:

            resultado[
                rodada
            ] = partidas


    return resultado


# =========================================================
# HISTÓRICO DOS CLUBES
# =========================================================

def construir_historico_ate(
    partidas_por_rodada,
    rodada_limite,
):

    historico = defaultdict(
        lambda: {
            "golsFeitos": [],
            "golsSofridos": [],
            "golsFeitosCasa": [],
            "golsSofridosCasa": [],
            "golsFeitosFora": [],
            "golsSofridosFora": [],
        }
    )


    todos_gols = []


    for rodada in sorted(
        partidas_por_rodada
    ):

        if rodada >= rodada_limite:

            break


        for partida in (
            partidas_por_rodada[
                rodada
            ]
        ):

            casa = obter_clube_casa(
                partida
            )

            visitante = (
                obter_clube_visitante(
                    partida
                )
            )


            gols_casa = obter_gols_casa(
                partida
            )

            gols_visitante = (
                obter_gols_visitante(
                    partida
                )
            )


            if (
                casa is None
                or
                visitante is None
                or
                gols_casa is None
                or
                gols_visitante is None
            ):

                continue


            historico[
                casa
            ][
                "golsFeitos"
            ].append(
                gols_casa
            )

            historico[
                casa
            ][
                "golsSofridos"
            ].append(
                gols_visitante
            )

            historico[
                casa
            ][
                "golsFeitosCasa"
            ].append(
                gols_casa
            )

            historico[
                casa
            ][
                "golsSofridosCasa"
            ].append(
                gols_visitante
            )


            historico[
                visitante
            ][
                "golsFeitos"
            ].append(
                gols_visitante
            )

            historico[
                visitante
            ][
                "golsSofridos"
            ].append(
                gols_casa
            )

            historico[
                visitante
            ][
                "golsFeitosFora"
            ].append(
                gols_visitante
            )

            historico[
                visitante
            ][
                "golsSofridosFora"
            ].append(
                gols_casa
            )


            todos_gols.extend([
                gols_casa,
                gols_visitante,
            ])


    media_liga = (

        media(
            todos_gols
        )

        if todos_gols

        else MEDIA_GOLS_PADRAO

    )


    return (
        historico,
        media_liga,
    )


# =========================================================
# FORÇA OFENSIVA / DEFENSIVA
# =========================================================

def media_clube(
    valores,
    media_liga,
):

    if not valores:

        return media_liga


    valor = media_ponderada_recente(
        valores
    )


    jogos = len(
        valores
    )


    if jogos >= MIN_JOGOS_CLUBE:

        return valor


    # Shrinkage para média da liga quando
    # ainda temos poucos jogos.

    peso_clube = (
        jogos
        /
        MIN_JOGOS_CLUBE
    )


    return (

        valor
        *
        peso_clube

        +

        media_liga
        *
        (
            1 -
            peso_clube
        )

    )


def forcas_clube(
    historico_clube,
    media_liga,
    mando,
):

    if not historico_clube:

        return {
            "ataque": 1.0,
            "defesa": 1.0,
            "golsFeitos": media_liga,
            "golsSofridos": media_liga,
            "jogos": 0,
        }


    if mando:

        gols_feitos_contexto = (
            historico_clube.get(
                "golsFeitosCasa"
            )
        )

        gols_sofridos_contexto = (
            historico_clube.get(
                "golsSofridosCasa"
            )
        )

    else:

        gols_feitos_contexto = (
            historico_clube.get(
                "golsFeitosFora"
            )
        )

        gols_sofridos_contexto = (
            historico_clube.get(
                "golsSofridosFora"
            )
        )


    # Se houver poucos jogos casa/fora,
    # usa também histórico geral.

    if len(
        gols_feitos_contexto
    ) < 2:

        gols_feitos_contexto = (
            historico_clube.get(
                "golsFeitos",
                []
            )
        )


    if len(
        gols_sofridos_contexto
    ) < 2:

        gols_sofridos_contexto = (
            historico_clube.get(
                "golsSofridos",
                []
            )
        )


    gols_feitos = media_clube(
        gols_feitos_contexto,
        media_liga,
    )

    gols_sofridos = media_clube(
        gols_sofridos_contexto,
        media_liga,
    )


    ataque = (

        gols_feitos
        /
        media_liga

        if media_liga > 0

        else 1.0

    )


    # Defesa > 1 significa que o clube
    # costuma CONCEDER mais gols.

    defesa = (

        gols_sofridos
        /
        media_liga

        if media_liga > 0

        else 1.0

    )


    jogos = len(
        historico_clube.get(
            "golsFeitos",
            []
        )
    )


    return {

        "ataque":
            limitar(
                ataque,
                0.35,
                2.50,
            ),

        "defesa":
            limitar(
                defesa,
                0.35,
                2.50,
            ),

        "golsFeitos":
            gols_feitos,

        "golsSofridos":
            gols_sofridos,

        "jogos":
            jogos,
    }


# =========================================================
# POISSON
# =========================================================

def poisson(
    gols,
    lambda_,
):

    return (

        math.exp(
            -lambda_
        )

        *
        (
            lambda_
            ** gols
        )

        /
        math.factorial(
            gols
        )

    )


def distribuicao_poisson(
    lambda_,
):

    distribuicao = {}


    for gols in range(
        MAX_GOLS_POISSON + 1
    ):

        distribuicao[
            gols
        ] = poisson(
            gols,
            lambda_,
        )


    return distribuicao


def probabilidades_resultado(
    lambda_casa,
    lambda_visitante,
):

    dist_casa = distribuicao_poisson(
        lambda_casa
    )

    dist_visitante = (
        distribuicao_poisson(
            lambda_visitante
        )
    )


    vitoria_casa = 0.0

    empate = 0.0

    vitoria_visitante = 0.0


    for gols_casa, prob_casa in (
        dist_casa.items()
    ):

        for gols_visitante, prob_visitante in (
            dist_visitante.items()
        ):

            prob = (
                prob_casa
                *
                prob_visitante
            )


            if gols_casa > gols_visitante:

                vitoria_casa += prob

            elif gols_casa == gols_visitante:

                empate += prob

            else:

                vitoria_visitante += prob


    total = (
        vitoria_casa
        +
        empate
        +
        vitoria_visitante
    )


    if total > 0:

        vitoria_casa /= total

        empate /= total

        vitoria_visitante /= total


    return {

        "casa":
            vitoria_casa,

        "empate":
            empate,

        "visitante":
            vitoria_visitante,
    }


# =========================================================
# NOTAS
# =========================================================

def nota_ofensiva(
    lambda_gols,
):

    # Aproximadamente:
    #
    # 0.5 gol esperado -> nota baixa
    # 1.3 -> média
    # 2.2+ -> confronto ofensivo excelente

    nota = (

        (
            lambda_gols - 0.40
        )
        /
        2.00
        *
        100

    )


    return limitar(
        nota,
        0,
        100,
    )


def nota_defensiva(
    chance_sg,
):

    # chance SG já está entre 0 e 1.

    return limitar(
        chance_sg * 100,
        0,
        100,
    )


# =========================================================
# ANÁLISE DA PARTIDA
# =========================================================

def analisar_partida(
    rodada,
    partida,
    historico,
    media_liga,
):

    casa = obter_clube_casa(
        partida
    )

    visitante = obter_clube_visitante(
        partida
    )


    if (
        casa is None
        or
        visitante is None
    ):

        return []


    forca_casa = forcas_clube(

        historico.get(
            casa
        ),

        media_liga,

        True,
    )


    forca_visitante = forcas_clube(

        historico.get(
            visitante
        ),

        media_liga,

        False,
    )


    lambda_casa = (

        media_liga

        *
        forca_casa[
            "ataque"
        ]

        *
        forca_visitante[
            "defesa"
        ]

        *
        FATOR_MANDO

    )


    lambda_visitante = (

        media_liga

        *
        forca_visitante[
            "ataque"
        ]

        *
        forca_casa[
            "defesa"
        ]

        *
        FATOR_VISITANTE

    )


    lambda_casa = limitar(
        lambda_casa,
        0.15,
        3.80,
    )

    lambda_visitante = limitar(
        lambda_visitante,
        0.15,
        3.80,
    )


    resultado = probabilidades_resultado(
        lambda_casa,
        lambda_visitante,
    )


    chance_sg_casa = poisson(
        0,
        lambda_visitante,
    )

    chance_sg_visitante = poisson(
        0,
        lambda_casa,
    )


    prob_casa_0 = poisson(
        0,
        lambda_casa,
    )

    prob_casa_1 = poisson(
        1,
        lambda_casa,
    )

    prob_casa_2 = poisson(
        2,
        lambda_casa,
    )

    prob_casa_3mais = max(
        0,
        1
        -
        prob_casa_0
        -
        prob_casa_1
        -
        prob_casa_2,
    )


    prob_visitante_0 = poisson(
        0,
        lambda_visitante,
    )

    prob_visitante_1 = poisson(
        1,
        lambda_visitante,
    )

    prob_visitante_2 = poisson(
        2,
        lambda_visitante,
    )

    prob_visitante_3mais = max(
        0,
        1
        -
        prob_visitante_0
        -
        prob_visitante_1
        -
        prob_visitante_2,
    )


    registro_casa = {

        "rodada":
            rodada,

        "clubeId":
            casa,

        "adversarioId":
            visitante,

        "mando":
            1,

        "lambdaGols":
            arredondar(
                lambda_casa
            ),

        "lambdaAdversario":
            arredondar(
                lambda_visitante
            ),

        "chanceSG":
            arredondar(
                chance_sg_casa * 100
            ),

        "probabilidadeVitoria":
            arredondar(
                resultado[
                    "casa"
                ] * 100
            ),

        "probabilidadeEmpate":
            arredondar(
                resultado[
                    "empate"
                ] * 100
            ),

        "probabilidadeDerrota":
            arredondar(
                resultado[
                    "visitante"
                ] * 100
            ),

        "probGol0":
            arredondar(
                prob_casa_0 * 100
            ),

        "probGol1":
            arredondar(
                prob_casa_1 * 100
            ),

        "probGol2":
            arredondar(
                prob_casa_2 * 100
            ),

        "probGol3Mais":
            arredondar(
                prob_casa_3mais * 100
            ),

        "saldoEsperado":
            arredondar(
                lambda_casa
                -
                lambda_visitante
            ),

        "notaOfensiva":
            arredondar(
                nota_ofensiva(
                    lambda_casa
                )
            ),

        "notaDefensiva":
            arredondar(
                nota_defensiva(
                    chance_sg_casa
                )
            ),

        "forcaAtaque":
            arredondar(
                forca_casa[
                    "ataque"
                ]
            ),

        "fragilidadeDefensiva":
            arredondar(
                forca_casa[
                    "defesa"
                ]
            ),

        "jogosHistoricos":
            forca_casa[
                "jogos"
            ],
    }


    registro_visitante = {

        "rodada":
            rodada,

        "clubeId":
            visitante,

        "adversarioId":
            casa,

        "mando":
            0,

        "lambdaGols":
            arredondar(
                lambda_visitante
            ),

        "lambdaAdversario":
            arredondar(
                lambda_casa
            ),

        "chanceSG":
            arredondar(
                chance_sg_visitante * 100
            ),

        "probabilidadeVitoria":
            arredondar(
                resultado[
                    "visitante"
                ] * 100
            ),

        "probabilidadeEmpate":
            arredondar(
                resultado[
                    "empate"
                ] * 100
            ),

        "probabilidadeDerrota":
            arredondar(
                resultado[
                    "casa"
                ] * 100
            ),

        "probGol0":
            arredondar(
                prob_visitante_0 * 100
            ),

        "probGol1":
            arredondar(
                prob_visitante_1 * 100
            ),

        "probGol2":
            arredondar(
                prob_visitante_2 * 100
            ),

        "probGol3Mais":
            arredondar(
                prob_visitante_3mais * 100
            ),

        "saldoEsperado":
            arredondar(
                lambda_visitante
                -
                lambda_casa
            ),

        "notaOfensiva":
            arredondar(
                nota_ofensiva(
                    lambda_visitante
                )
            ),

        "notaDefensiva":
            arredondar(
                nota_defensiva(
                    chance_sg_visitante
                )
            ),

        "forcaAtaque":
            arredondar(
                forca_visitante[
                    "ataque"
                ]
            ),

        "fragilidadeDefensiva":
            arredondar(
                forca_visitante[
                    "defesa"
                ]
            ),

        "jogosHistoricos":
            forca_visitante[
                "jogos"
            ],
    }


    return [
        registro_casa,
        registro_visitante,
    ]


# =========================================================
# EXECUÇÃO WALK-FORWARD
# =========================================================

def executar():

    print(
        ""
    )

    print(
        "=============================================="
    )

    print(
        "MODELO POISSON DE CONFRONTOS"
    )

    print(
        "=============================================="
    )


    partidas_por_rodada = carregar_partidas()


    if not partidas_por_rodada:

        raise RuntimeError(
            "Nenhum arquivo partidas.json encontrado."
        )


    rodadas = sorted(
        partidas_por_rodada
    )


    print(
        "Rodadas encontradas:",
        len(
            rodadas
        ),
    )


    registros = []

    resumo_rodadas = {}


    for rodada in rodadas:

        historico, media_liga = (
            construir_historico_ate(
                partidas_por_rodada,
                rodada,
            )
        )


        registros_rodada = []


        for partida in (
            partidas_por_rodada[
                rodada
            ]
        ):

            registros_partida = (
                analisar_partida(
                    rodada,
                    partida,
                    historico,
                    media_liga,
                )
            )


            registros_rodada.extend(
                registros_partida
            )


        registros.extend(
            registros_rodada
        )


        if registros_rodada:

            resumo_rodadas[
                str(
                    rodada
                )
            ] = {

                "clubes":
                    len(
                        registros_rodada
                    ),

                "mediaGolsLigaHistorica":
                    arredondar(
                        media_liga
                    ),

                "mediaChanceSG":
                    arredondar(

                        media(

                            item[
                                "chanceSG"
                            ]

                            for item
                            in registros_rodada

                        )

                    ),

                "mediaLambdaGols":
                    arredondar(

                        media(

                            item[
                                "lambdaGols"
                            ]

                            for item
                            in registros_rodada

                        )

                    ),
            }


        print(
            "Rodada",
            rodada,
            "| clubes:",
            len(
                registros_rodada
            ),
            "| média histórica gols:",
            round(
                media_liga,
                3,
            ),
        )


    # =====================================================
    # ÍNDICE PARA CONSUMO FUTURO
    # =====================================================

    indice = {}


    for item in registros:

        chave = (
            f'{item["rodada"]}:'
            f'{item["clubeId"]}'
        )

        indice[
            chave
        ] = item


    saida = {

        "modelo":
            "poisson_confrontos_v1",

        "metodologia":
            "walk_forward",

        "antiLeakage":
            True,

        "parametros": {

            "mediaGolsPadrao":
                MEDIA_GOLS_PADRAO,

            "pesoRecencia":
                PESO_RECORRENCIA,

            "pesoHistorico":
                PESO_HISTORICO,

            "fatorMando":
                FATOR_MANDO,

            "fatorVisitante":
                FATOR_VISITANTE,

            "minJogosClube":
                MIN_JOGOS_CLUBE,
        },

        "rodadas":
            resumo_rodadas,

        "registros":
            registros,

        "indice":
            indice,

        "quantidadeRegistros":
            len(
                registros
            ),

        "observacao":

            (
                "Camada probabilística experimental. "
                "Não promover automaticamente ao motor "
                "antes do backtest."
            ),
    }


    salvar_json(
        ARQUIVO_SAIDA,
        saida,
    )


    print(
        ""
    )

    print(
        "=============================================="
    )

    print(
        "POISSON CONCLUÍDO"
    )

    print(
        "Registros:",
        len(
            registros
        ),
    )

    print(
        "Arquivo:",
        ARQUIVO_SAIDA,
    )

    print(
        "=============================================="
    )


if __name__ == "__main__":

    executar()
