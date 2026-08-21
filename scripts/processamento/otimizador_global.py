"""
=========================================================
CARTOLA ESTATÍSTICO
Otimizador Global de Escalações V2
=========================================================

OBJETIVO
---------------------------------------------------------
Encontrar a combinação global de jogadores que maximiza
a pontuação projetada respeitando simultaneamente:

- formação;
- patrimônio;
- limite de jogadores por clube;
- quantidade exata por posição;
- quantidade total correta de atletas.

MÉTODO
---------------------------------------------------------
Programação Linear Inteira Mista (MILP)

Solver utilizado:

PuLP + CBC

VANTAGEM
---------------------------------------------------------
Diferente do método greedy, o otimizador avalia o time
inteiro ao mesmo tempo.

Exemplo:

Jogador A:
projeção 10
preço 20

Jogador B:
projeção 9
preço 10

Pode ser melhor escolher B se isso liberar orçamento para
ganhar muitos pontos em outras posições.

IMPORTANTE
---------------------------------------------------------
O módulo NÃO usa pontuação real futura.

Ele recebe candidatos já calculados e maximiza apenas
o campo de score informado.

Pode ser usado em:

- histórico walk-forward;
- rodada atual;
- baseline;
- modelos estatísticos;
- machine learning;
- ensemble futuro.

=========================================================
"""

from __future__ import annotations

import math

from collections import defaultdict
from typing import Any


# =========================================================
# PULP
# =========================================================

PULP_OK = False
PULP_ERRO = None


try:

    import pulp

    PULP_OK = True

except Exception as erro:

    PULP_ERRO = str(
        erro
    )


# =========================================================
# FORMAÇÕES
# =========================================================

FORMACOES = {

    "4-4-2": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 4,
        "ATA": 2,
        "TEC": 1,
    },

    "4-3-3": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 3,
        "ATA": 3,
        "TEC": 1,
    },

    "3-4-3": {
        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 3,
        "TEC": 1,
    },

    "3-5-2": {
        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 5,
        "ATA": 2,
        "TEC": 1,
    },

    "4-5-1": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 5,
        "ATA": 1,
        "TEC": 1,
    },

    "5-3-2": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 3,
        "MEI": 3,
        "ATA": 2,
        "TEC": 1,
    },

    "5-4-1": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 1,
        "TEC": 1,
    },
}


POSICOES = (
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC",
)


# =========================================================
# UTILIDADES
# =========================================================

def numero(
    valor: Any,
    padrao: float = 0.0,
) -> float:

    try:

        if valor is None:

            return padrao

        resultado = float(
            valor
        )

        if math.isfinite(
            resultado
        ):

            return resultado

    except Exception:

        pass

    return padrao


def normalizar_texto(
    valor: Any,
) -> str:

    if valor is None:

        return ""

    return (
        str(
            valor
        )
        .strip()
        .upper()
    )


def obter_id(
    jogador: dict[str, Any],
) -> str:

    for campo in (
        "id",
        "atletaId",
        "atleta_id",
    ):

        valor = jogador.get(
            campo
        )

        if valor is not None:

            return str(
                valor
            )

    return ""


def obter_posicao(
    jogador: dict[str, Any],
) -> str:

    return normalizar_texto(

        jogador.get(
            "posicao"
        )
    )


def obter_clube(
    jogador: dict[str, Any],
) -> str:

    return normalizar_texto(

        jogador.get(
            "clube"
        )

        or

        jogador.get(
            "siglaClube"
        )
    )


def obter_preco(
    jogador: dict[str, Any],
) -> float:

    for campo in (
        "preco",
        "precoNum",
        "preco_num",
    ):

        valor = jogador.get(
            campo
        )

        if valor is not None:

            return max(
                0.0,
                numero(
                    valor
                )
            )

    return 0.0


def obter_score(
    jogador: dict[str, Any],
    campo_score: str,
) -> float:

    return numero(

        jogador.get(
            campo_score
        )
    )


# =========================================================
# PREPARAÇÃO
# =========================================================

def preparar_candidatos(
    candidatos: list[dict[str, Any]],
    campo_score: str,
) -> list[dict[str, Any]]:

    resultado = []

    ids_usados = set()


    for candidato in candidatos:

        if not isinstance(
            candidato,
            dict,
        ):

            continue


        jogador_id = obter_id(
            candidato
        )


        if not jogador_id:

            continue


        if jogador_id in ids_usados:

            continue


        posicao = obter_posicao(
            candidato
        )


        if posicao not in POSICOES:

            continue


        score = obter_score(
            candidato,
            campo_score,
        )


        preco = obter_preco(
            candidato
        )


        copia = dict(
            candidato
        )


        copia[
            "_otimizadorId"
        ] = jogador_id

        copia[
            "_otimizadorPosicao"
        ] = posicao

        copia[
            "_otimizadorClube"
        ] = obter_clube(
            candidato
        )

        copia[
            "_otimizadorPreco"
        ] = preco

        copia[
            "_otimizadorScore"
        ] = score


        resultado.append(
            copia
        )


        ids_usados.add(
            jogador_id
        )


    return resultado


# =========================================================
# DIAGNÓSTICO
# =========================================================

def diagnosticar_base(
    candidatos,
    formacao,
):

    estrutura = FORMACOES.get(
        formacao,
        {}
    )


    quantidade = defaultdict(
        int
    )


    precos = defaultdict(
        list
    )


    for jogador in candidatos:

        posicao = jogador[
            "_otimizadorPosicao"
        ]

        quantidade[
            posicao
        ] += 1

        precos[
            posicao
        ].append(
            jogador[
                "_otimizadorPreco"
            ]
        )


    posicoes = {}

    viavel_quantidade = True


    for posicao in POSICOES:

        necessario = estrutura.get(
            posicao,
            0
        )

        disponivel = quantidade.get(
            posicao,
            0
        )


        if disponivel < necessario:

            viavel_quantidade = False


        posicoes[
            posicao
        ] = {

            "necessario":
                necessario,

            "disponivel":
                disponivel,

            "precoMinimo":

                round(
                    min(
                        precos[
                            posicao
                        ]
                    ),
                    2
                )

                if precos.get(
                    posicao
                )

                else None,
        }


    return {

        "quantidadeCandidatos":
            len(
                candidatos
            ),

        "formacao":
            formacao,

        "posicoes":
            posicoes,

        "viavelPorQuantidade":
            viavel_quantidade,
    }


# =========================================================
# CUSTO MÍNIMO TEÓRICO
# =========================================================

def calcular_custo_minimo_teorico(
    candidatos,
    formacao,
):

    estrutura = FORMACOES.get(
        formacao
    )


    if not estrutura:

        return None


    custo = 0.0


    for posicao, quantidade in (
        estrutura.items()
    ):

        if quantidade <= 0:

            continue


        precos = sorted(

            jogador[
                "_otimizadorPreco"
            ]

            for jogador in candidatos

            if jogador[
                "_otimizadorPosicao"
            ] == posicao
        )


        if len(
            precos
        ) < quantidade:

            return None


        custo += sum(
            precos[
                :quantidade
            ]
        )


    return round(
        custo,
        2
    )


# =========================================================
# OTIMIZAÇÃO DE UMA FORMAÇÃO
# =========================================================

def otimizar_formacao(
    candidatos: list[dict[str, Any]],
    formacao: str,
    patrimonio: float | None,
    campo_score: str = "nota",
    limite_clube: int | None = 3,
) -> dict[str, Any]:

    formacao = normalizar_texto(
        formacao
    )


    if formacao not in FORMACOES:

        return {

            "sucesso":
                False,

            "status":
                "FORMACAO_INVALIDA",

            "formacao":
                formacao,
        }


    preparados = preparar_candidatos(
        candidatos,
        campo_score,
    )


    diagnostico = diagnosticar_base(
        preparados,
        formacao,
    )


    custo_minimo = calcular_custo_minimo_teorico(
        preparados,
        formacao,
    )


    if not diagnostico[
        "viavelPorQuantidade"
    ]:

        return {

            "sucesso":
                False,

            "status":
                "CANDIDATOS_INSUFICIENTES",

            "formacao":
                formacao,

            "diagnostico":
                diagnostico,

            "custoMinimoTeorico":
                custo_minimo,
        }


    if (
        patrimonio is not None
        and
        custo_minimo is not None
        and
        custo_minimo >
        patrimonio + 0.000001
    ):

        return {

            "sucesso":
                False,

            "status":
                "PATRIMONIO_INSUFICIENTE",

            "formacao":
                formacao,

            "patrimonio":
                patrimonio,

            "custoMinimoTeorico":
                custo_minimo,

            "diagnostico":
                diagnostico,
        }


    if not PULP_OK:

        return {

            "sucesso":
                False,

            "status":
                "PULP_INDISPONIVEL",

            "erro":
                PULP_ERRO,

            "formacao":
                formacao,

            "diagnostico":
                diagnostico,
        }


    # =====================================================
    # MODELO
    # =====================================================

    problema = pulp.LpProblem(

        name=(
            f"cartola_"
            f"{formacao}"
        ),

        sense=pulp.LpMaximize,
    )


    # =====================================================
    # VARIÁVEIS BINÁRIAS
    # =====================================================

    variaveis = {}


    for indice, jogador in enumerate(
        preparados
    ):

        variaveis[
            indice
        ] = pulp.LpVariable(

            name=(
                f"x_{indice}"
            ),

            lowBound=0,

            upBound=1,

            cat=pulp.LpBinary,
        )


    # =====================================================
    # OBJETIVO
    # =====================================================

    problema += pulp.lpSum(

        jogador[
            "_otimizadorScore"
        ]
        *
        variaveis[
            indice
        ]

        for indice, jogador
        in enumerate(
            preparados
        )
    )


    # =====================================================
    # RESTRIÇÕES POR POSIÇÃO
    # =====================================================

    estrutura = FORMACOES[
        formacao
    ]


    for posicao in POSICOES:

        quantidade = estrutura.get(
            posicao,
            0
        )


        problema += (

            pulp.lpSum(

                variaveis[
                    indice
                ]

                for indice, jogador
                in enumerate(
                    preparados
                )

                if jogador[
                    "_otimizadorPosicao"
                ] == posicao

            )

            ==

            quantidade

        )


    # =====================================================
    # PATRIMÔNIO
    # =====================================================

    if patrimonio is not None:

        problema += (

            pulp.lpSum(

                jogador[
                    "_otimizadorPreco"
                ]
                *
                variaveis[
                    indice
                ]

                for indice, jogador
                in enumerate(
                    preparados
                )

            )

            <=

            float(
                patrimonio
            )

        )


    # =====================================================
    # LIMITE DE JOGADORES POR CLUBE
    # =====================================================

    if limite_clube is not None:

        clubes = sorted({

            jogador[
                "_otimizadorClube"
            ]

            for jogador
            in preparados

            if jogador[
                "_otimizadorClube"
            ]

        })


        for clube in clubes:

            problema += (

                pulp.lpSum(

                    variaveis[
                        indice
                    ]

                    for indice, jogador
                    in enumerate(
                        preparados
                    )

                    if jogador[
                        "_otimizadorClube"
                    ] == clube

                )

                <=

                int(
                    limite_clube
                )

            )


    # =====================================================
    # SOLVER
    # =====================================================

    try:

        solver = pulp.PULP_CBC_CMD(

            msg=False,

            timeLimit=30,
        )


        problema.solve(
            solver
        )


    except Exception as erro:

        return {

            "sucesso":
                False,

            "status":
                "ERRO_SOLVER",

            "erro":
                str(
                    erro
                ),

            "formacao":
                formacao,

            "diagnostico":
                diagnostico,
        }


    status_solver = pulp.LpStatus.get(

        problema.status,

        str(
            problema.status
        ),
    )


    if status_solver != "Optimal":

        return {

            "sucesso":
                False,

            "status":
                "SEM_SOLUCAO_OTIMA",

            "statusSolver":
                status_solver,

            "formacao":
                formacao,

            "patrimonio":
                patrimonio,

            "custoMinimoTeorico":
                custo_minimo,

            "diagnostico":
                diagnostico,
        }


    # =====================================================
    # RECUPERAR ESCOLHIDOS
    # =====================================================

    escolhidos = []


    for indice, jogador in enumerate(
        preparados
    ):

        valor = pulp.value(

            variaveis[
                indice
            ]
        )


        if (
            valor is not None
            and
            valor >= 0.5
        ):

            escolhidos.append(
                jogador
            )


    # =====================================================
    # RESULTADOS
    # =====================================================

    quantidade_esperada = sum(
        estrutura.values()
    )


    custo_total = sum(

        jogador[
            "_otimizadorPreco"
        ]

        for jogador
        in escolhidos

    )


    score_total = sum(

        jogador[
            "_otimizadorScore"
        ]

        for jogador
        in escolhidos

    )


    # =====================================================
    # POSIÇÕES
    # =====================================================

    por_posicao = {}


    for posicao in POSICOES:

        lista = [

            jogador

            for jogador
            in escolhidos

            if jogador[
                "_otimizadorPosicao"
            ] == posicao

        ]


        lista.sort(

            key=lambda jogador:
                jogador[
                    "_otimizadorScore"
                ],

            reverse=True,
        )


        por_posicao[
            posicao
        ] = lista


    # =====================================================
    # CLUBES
    # =====================================================

    clubes = defaultdict(
        int
    )


    for jogador in escolhidos:

        clube = jogador[
            "_otimizadorClube"
        ]


        if clube:

            clubes[
                clube
            ] += 1


    # =====================================================
    # AUDITORIA
    # =====================================================

    quantidade_correta = (

        len(
            escolhidos
        )

        ==

        quantidade_esperada

    )


    patrimonio_respeitado = (

        True

        if patrimonio is None

        else

        custo_total
        <=
        patrimonio + 0.000001

    )


    limite_clube_respeitado = (

        True

        if limite_clube is None

        else

        all(

            quantidade
            <=
            limite_clube

            for quantidade
            in clubes.values()
        )

    )


    posicoes_corretas = True


    for posicao, quantidade in (
        estrutura.items()
    ):

        encontrados = len(

            por_posicao.get(
                posicao,
                []
            )
        )


        if encontrados != quantidade:

            posicoes_corretas = False

            break


    auditoria = {

        "quantidadeEsperada":
            quantidade_esperada,

        "quantidadeObtida":
            len(
                escolhidos
            ),

        "quantidadeCorreta":
            quantidade_correta,

        "posicoesCorretas":
            posicoes_corretas,

        "patrimonioRespeitado":
            patrimonio_respeitado,

        "limiteClubeRespeitado":
            limite_clube_respeitado,
    }


    auditoria[
        "aprovada"
    ] = all([

        quantidade_correta,

        posicoes_corretas,

        patrimonio_respeitado,

        limite_clube_respeitado,
    ])


    # =====================================================
    # OBJETIVO DO SOLVER
    # =====================================================

    valor_objetivo = pulp.value(

        problema.objective
    )


    return {

        "sucesso":
            True,

        "status":
            "OTIMO_ENCONTRADO",

        "motor":
            "PuLP_CBC_MILP",

        "statusSolver":
            status_solver,

        "formacao":
            formacao,

        "campoScore":
            campo_score,

        "patrimonio":
            patrimonio,

        "limiteClube":
            limite_clube,

        "custoMinimoTeorico":
            custo_minimo,

        "custoTotal":
            round(
                custo_total,
                2
            ),

        "saldo":
            (

                round(
                    patrimonio
                    -
                    custo_total,
                    2
                )

                if patrimonio is not None

                else None

            ),

        "scoreTotal":
            round(
                score_total,
                4
            ),

        "valorObjetivoSolver":
            (

                round(
                    numero(
                        valor_objetivo
                    ),
                    4
                )

                if valor_objetivo
                is not None

                else None

            ),

        "quantidade":
            len(
                escolhidos
            ),

        "jogadores":
            escolhidos,

        "porPosicao":
            por_posicao,

        "clubes":
            dict(
                clubes
            ),

        "auditoria":
            auditoria,

        "diagnostico":
            diagnostico,
    }


# =========================================================
# MÚLTIPLAS FORMAÇÕES
# =========================================================

def otimizar_multiplas_formacoes(
    candidatos: list[dict[str, Any]],
    patrimonio: float | None,
    campo_score: str = "nota",
    limite_clube: int | None = 3,
    formacoes: list[str] | None = None,
) -> dict[str, Any]:

    if formacoes is None:

        formacoes = list(
            FORMACOES.keys()
        )


    resultados = []


    for formacao in formacoes:

        resultado = otimizar_formacao(

            candidatos=candidatos,

            formacao=formacao,

            patrimonio=patrimonio,

            campo_score=campo_score,

            limite_clube=limite_clube,
        )


        resultados.append(
            resultado
        )


    validos = [

        resultado

        for resultado
        in resultados

        if (
            resultado.get(
                "sucesso"
            )

            and

            resultado.get(
                "auditoria",
                {}
            ).get(
                "aprovada"
            )
        )

    ]


    if not validos:

        return {

            "sucesso":
                False,

            "status":
                "NENHUMA_FORMACAO_VIAVEL",

            "campoScore":
                campo_score,

            "patrimonio":
                patrimonio,

            "resultados":
                resultados,
        }


    ranking = sorted(

        validos,

        key=lambda resultado:
            numero(
                resultado.get(
                    "scoreTotal"
                )
            ),

        reverse=True,
    )


    melhor = ranking[
        0
    ]


    return {

        "sucesso":
            True,

        "status":
            "OTIMO_GLOBAL_ENCONTRADO",

        "campoScore":
            campo_score,

        "patrimonio":
            patrimonio,

        "melhorFormacao":
            melhor[
                "formacao"
            ],

        "melhorScore":
            melhor[
                "scoreTotal"
            ],

        "melhorTime":
            melhor,

        "rankingFormacoes": [

            {

                "formacao":
                    resultado[
                        "formacao"
                    ],

                "scoreTotal":
                    resultado[
                        "scoreTotal"
                    ],

                "custoTotal":
                    resultado[
                        "custoTotal"
                    ],

                "saldo":
                    resultado[
                        "saldo"
                    ],

            }

            for resultado
            in ranking
        ],

        "resultados":
            resultados,
    }


# =========================================================
# STATUS
# =========================================================

def status_otimizador():

    solver_disponivel = False


    if PULP_OK:

        try:

            solver = pulp.PULP_CBC_CMD(
                msg=False
            )

            solver_disponivel = (
                solver.available()
                is not False
            )

        except Exception:

            solver_disponivel = False


    return {

        "modelo":
            "otimizador_global_v2_pulp",

        "pulpDisponivel":
            PULP_OK,

        "cbcDisponivel":
            bool(
                solver_disponivel
            ),

        "erroImportacao":
            PULP_ERRO,

        "formacoesDisponiveis":
            list(
                FORMACOES.keys()
            ),

        "restricoes": {

            "formacao":
                True,

            "patrimonio":
                True,

            "limiteClube":
                True,

            "posicoes":
                True,

            "quantidadeExata":
                True,
        },
    }


# =========================================================
# EXECUÇÃO DIRETA
# =========================================================

if __name__ == "__main__":

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "OTIMIZADOR GLOBAL V2 - PULP"
    )

    print(
        "============================================"
    )

    print(
        status_otimizador()
    )

    print(
        "============================================"
    )
