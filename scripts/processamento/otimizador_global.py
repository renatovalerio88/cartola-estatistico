"""
=========================================================
CARTOLA ESTATÍSTICO
Otimizador Global de Escalações
=========================================================

Versão:
otimizador_global_v1

OBJETIVO
---------------------------------------------------------
Encontrar a combinação global de jogadores que maximiza
a pontuação projetada respeitando simultaneamente:

- formação;
- patrimônio;
- limite de jogadores por clube;
- posições;
- quantidade exata de atletas;
- treinador.

DIFERENÇA PARA O MÉTODO GREEDY
---------------------------------------------------------
O método greedy escolhe o melhor jogador disponível
posição por posição.

Isso não garante a melhor combinação total.

Exemplo:

Atacante A:
projeção 9.0
preço 20

Atacante B:
projeção 8.0
preço 10

Escolher B pode liberar 10 cartoletas para melhorar
dois outros setores e gerar um time total melhor.

Este módulo procura a solução GLOBAL.

MÉTODO
---------------------------------------------------------
Usa programação linear inteira mista (MILP) através do
scipy.optimize.milp.

scikit-learn já depende de scipy, portanto essa biblioteca
fará parte do ambiente científico do projeto.

FALLBACK
---------------------------------------------------------
Se scipy/milp não estiver disponível, o módulo NÃO inventa
resultado.

Retorna status informando que o otimizador exato não está
disponível.

IMPORTANTE
---------------------------------------------------------
Este módulo não conhece pontuação real futura.

Ele recebe candidatos e uma nota/projeção já calculada.

Portanto pode ser usado:

- no histórico walk-forward;
- na rodada atual;
- com baseline;
- com Ridge;
- com XGBoost;
- com ensemble futuro.

=========================================================
"""

from __future__ import annotations

import math

from collections import defaultdict
from typing import Any


# =========================================================
# SCIPY / MILP
# =========================================================

SCIPY_MILP_OK = False
SCIPY_ERRO = None


try:

    import numpy as np

    from scipy.optimize import (
        milp,
        LinearConstraint,
        Bounds,
    )

    SCIPY_MILP_OK = True

except Exception as erro:

    SCIPY_ERRO = str(
        erro
    )


# =========================================================
# REGRAS
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

        if jogador.get(
            campo
        ) is not None:

            return max(

                0.0,

                numero(
                    jogador.get(
                        campo
                    )
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
# SANITIZAÇÃO
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
# DIAGNÓSTICO DA BASE
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
# MATRIZ DE RESTRIÇÕES
# =========================================================

def criar_restricoes(
    candidatos,
    formacao,
    patrimonio,
    limite_clube,
):

    estrutura = FORMACOES[
        formacao
    ]


    n = len(
        candidatos
    )


    linhas = []

    limites_inferiores = []

    limites_superiores = []


    # =====================================================
    # 1. QUANTIDADE EXATA POR POSIÇÃO
    # =====================================================

    for posicao in POSICOES:

        quantidade = estrutura.get(
            posicao,
            0
        )


        linha = [

            1.0

            if jogador[
                "_otimizadorPosicao"
            ] == posicao

            else 0.0

            for jogador
            in candidatos

        ]


        linhas.append(
            linha
        )

        limites_inferiores.append(
            float(
                quantidade
            )
        )

        limites_superiores.append(
            float(
                quantidade
            )
        )


    # =====================================================
    # 2. PATRIMÔNIO
    # =====================================================

    if patrimonio is not None:

        linha_preco = [

            jogador[
                "_otimizadorPreco"
            ]

            for jogador
            in candidatos

        ]


        linhas.append(
            linha_preco
        )

        limites_inferiores.append(
            -np.inf
        )

        limites_superiores.append(
            float(
                patrimonio
            )
        )


    # =====================================================
    # 3. LIMITE POR CLUBE
    # =====================================================

    if limite_clube is not None:

        clubes = sorted({

            jogador[
                "_otimizadorClube"
            ]

            for jogador
            in candidatos

            if jogador[
                "_otimizadorClube"
            ]

        })


        for clube in clubes:

            linha_clube = [

                1.0

                if jogador[
                    "_otimizadorClube"
                ] == clube

                else 0.0

                for jogador
                in candidatos

            ]


            linhas.append(
                linha_clube
            )

            limites_inferiores.append(
                -np.inf
            )

            limites_superiores.append(
                float(
                    limite_clube
                )
            )


    matriz = np.asarray(
        linhas,
        dtype=float,
    )


    inferior = np.asarray(
        limites_inferiores,
        dtype=float,
    )


    superior = np.asarray(
        limites_superiores,
        dtype=float,
    )


    return LinearConstraint(
        matriz,
        inferior,
        superior,
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


    if not SCIPY_MILP_OK:

        return {

            "sucesso":
                False,

            "status":
                "SCIPY_MILP_INDISPONIVEL",

            "erro":
                SCIPY_ERRO,

            "formacao":
                formacao,

            "diagnostico":
                diagnostico,
        }


    if not preparados:

        return {

            "sucesso":
                False,

            "status":
                "SEM_CANDIDATOS",

            "formacao":
                formacao,
        }


    # =====================================================
    # OBJETIVO
    #
    # scipy.optimize.milp MINIMIZA.
    #
    # Para maximizar score:
    #
    # minimizamos -score.
    # =====================================================

    objetivo = np.asarray(

        [

            -jogador[
                "_otimizadorScore"
            ]

            for jogador
            in preparados

        ],

        dtype=float,
    )


    integrality = np.ones(
        len(
            preparados
        ),
        dtype=int,
    )


    bounds = Bounds(

        np.zeros(
            len(
                preparados
            )
        ),

        np.ones(
            len(
                preparados
            )
        ),
    )


    restricoes = criar_restricoes(

        preparados,
        formacao,
        patrimonio,
        limite_clube,
    )


    try:

        resultado = milp(

            c=objetivo,

            integrality=integrality,

            bounds=bounds,

            constraints=restricoes,

            options={
                "disp": False,
            },
        )

    except Exception as erro:

        return {

            "sucesso":
                False,

            "status":
                "ERRO_MILP",

            "erro":
                str(
                    erro
                ),

            "formacao":
                formacao,

            "diagnostico":
                diagnostico,
        }


    if (
        resultado.x is None
        or
        not resultado.success
    ):

        return {

            "sucesso":
                False,

            "status":
                "SEM_SOLUCAO_OTIMA",

            "mensagem":
                str(
                    resultado.message
                ),

            "formacao":
                formacao,

            "patrimonio":
                patrimonio,

            "custoMinimoTeorico":
                custo_minimo,

            "diagnostico":
                diagnostico,
        }


    escolhidos = [

        jogador

        for indice, jogador
        in enumerate(
            preparados
        )

        if resultado.x[
            indice
        ] >= 0.5

    ]


    estrutura = FORMACOES[
        formacao
    ]


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


        lista = sorted(

            lista,

            key=lambda jogador:
                jogador[
                    "_otimizadorScore"
                ],

            reverse=True,
        )


        por_posicao[
            posicao
        ] = lista


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


    auditoria = {

        "quantidadeEsperada":
            quantidade_esperada,

        "quantidadeObtida":
            len(
                escolhidos
            ),

        "quantidadeCorreta":
            (
                len(
                    escolhidos
                )
                ==
                quantidade_esperada
            ),

        "patrimonioRespeitado":
            (
                True

                if patrimonio is None

                else
                custo_total <=
                patrimonio +
                0.000001
            ),

        "limiteClubeRespeitado":
            (
                True

                if limite_clube is None

                else all(

                    quantidade <=
                    limite_clube

                    for quantidade
                    in clubes.values()

                )
            ),
    }


    auditoria[
        "aprovada"
    ] = all(
        auditoria[
            chave
        ]

        for chave in (
            "quantidadeCorreta",
            "patrimonioRespeitado",
            "limiteClubeRespeitado",
        )
    )


    return {

        "sucesso":
            True,

        "status":
            "OTIMO_ENCONTRADO",

        "motor":
            "scipy.optimize.milp",

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
                    patrimonio -
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

        "resultadoSolver": {

            "success":
                bool(
                    resultado.success
                ),

            "status":
                int(
                    resultado.status
                ),

            "message":
                str(
                    resultado.message
                ),

            "fun":
                (
                    round(
                        float(
                            resultado.fun
                        ),
                        6
                    )

                    if resultado.fun
                    is not None

                    else None
                ),
        },
    }


# =========================================================
# COMPARAÇÃO ENTRE FORMAÇÕES
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


    melhor = max(

        validos,

        key=lambda resultado:
            numero(
                resultado.get(
                    "scoreTotal"
                )
            )
    )


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
# TESTE RÁPIDO DO MÓDULO
# =========================================================

def status_otimizador():

    return {

        "modelo":
            "otimizador_global_v1",

        "scipyMilpDisponivel":
            SCIPY_MILP_OK,

        "erroImportacao":
            SCIPY_ERRO,

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


if __name__ == "__main__":

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "OTIMIZADOR GLOBAL V1"
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
