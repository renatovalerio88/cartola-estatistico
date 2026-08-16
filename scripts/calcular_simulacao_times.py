"""
=========================================================
CARTOLA ESTATÍSTICO
Simulação Histórica de Times

Consome:
data/historico-escalacoes/rodada-XX.json

Gera:
data/simulacao-times.json

Objetivo:
Avaliar a pontuação REAL que as estratégias:

- Conservador
- Equilibrado
- Agressivo

teriam feito em cada rodada.

=========================================================
"""

from pathlib import Path
import json
import math


# ======================================================
# CONFIGURAÇÕES
# ======================================================

BASE_DIR = Path(
    __file__
).resolve().parent.parent


PASTA_HISTORICO_ESCALACOES = (

    BASE_DIR /
    "data" /
    "historico-escalacoes"

)


ARQUIVO_SAIDA = (

    BASE_DIR /
    "data" /
    "simulacao-times.json"

)


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():
        return {}

    try:

        with open(
            caminho,
            "r",
            encoding="utf-8"
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception as erro:

        print(
            f"[AVISO] Erro ao carregar "
            f"{caminho}: {erro}"
        )

        return {}


def salvar_json(caminho, dados):

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        caminho,
        "w",
        encoding="utf-8"
    ) as arquivo:

        json.dump(
            dados,
            arquivo,
            ensure_ascii=False,
            indent=2
        )


def numero(
    valor,
    padrao=0.0
):

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


# ======================================================
# CÁLCULO DO TIME
# ======================================================

def calcular_time(
    estrategia
):

    titulares = estrategia.get(
        "titulares",
        []
    )

    capitao = estrategia.get(
        "capitao"
    )

    capitao_id = None

    if isinstance(
        capitao,
        dict
    ):

        capitao_id = str(
            capitao.get("id")
        )

    pontos_base = 0

    bonus_capitao = 0

    detalhes = []

    for jogador in titulares:

        pontos = numero(
            jogador.get(
                "pontuacaoReal"
            ),
            0
        )

        jogador_id = str(
            jogador.get("id")
        )

        eh_capitao = (
            capitao_id is not None
            and jogador_id == capitao_id
        )

        pontos_base += pontos

        if eh_capitao:

            # No Cartola o capitão dobra
            # a pontuação do atleta.
            bonus_capitao += pontos

        detalhes.append({

            "id":
                jogador.get("id"),

            "nome":
                jogador.get("nome"),

            "posicao":
                jogador.get("posicao"),

            "clube":
                jogador.get("clube"),

            "projecao":
                numero(
                    jogador.get(
                        "projecao"
                    ),
                    0
                ),

            "pontos":
                round(
                    pontos,
                    2
                ),

            "capitao":
                eh_capitao

        })

    pontuacao_total = (
        pontos_base +
        bonus_capitao
    )

    return {

        "pontosSemCapitao":
            round(
                pontos_base,
                2
            ),

        "bonusCapitao":
            round(
                bonus_capitao,
                2
            ),

        "pontos":
            round(
                pontuacao_total,
                2
            ),

        "quantidadeJogadores":
            len(titulares),

        "jogadores":
            detalhes

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    resultado = {

        "modelo":
            "simulacao_times_v3",

        "descricao":
            (
                "Avaliação histórica das escalações "
                "sugeridas pelo modelo"
            ),

        "fonte":
            "data/historico-escalacoes",

        "rodadas":
            []

    }

    if not (
        PASTA_HISTORICO_ESCALACOES.exists()
    ):

        print(
            "Pasta de histórico de escalações "
            "não encontrada:"
        )

        print(
            PASTA_HISTORICO_ESCALACOES
        )

        salvar_json(
            ARQUIVO_SAIDA,
            resultado
        )

        return

    arquivos = sorted(

        PASTA_HISTORICO_ESCALACOES.glob(
            "rodada-*.json"
        )

    )

    for arquivo in arquivos:

        dados = carregar_json(
            arquivo
        )

        rodada = dados.get(
            "rodada"
        )

        if rodada is None:
            continue

        registro = {

            "rodada":
                rodada,

            "dadosUtilizadosAteRodada":
                dados.get(
                    "dadosUtilizadosAteRodada"
                ),

            "semVazamentoFuturo":
                dados.get(
                    "semVazamentoFuturo",
                    False
                ),

            "estrategias":
                []

        }

        for estrategia in dados.get(
            "estrategias",
            []
        ):

            calculo = calcular_time(
                estrategia
            )

            registro[
                "estrategias"
            ].append({

                "id":
                    estrategia.get(
                        "id"
                    ),

                "nome":
                    estrategia.get(
                        "nome"
                    ),

                "perfil":
                    estrategia.get(
                        "perfil"
                    ),

                "formacao":
                    estrategia.get(
                        "formacao"
                    ),

                "escalaçãoCompleta":
                    estrategia.get(
                        "escalaçãoCompleta",
                        False
                    ),

                "pontosSemCapitao":
                    calculo[
                        "pontosSemCapitao"
                    ],

                "bonusCapitao":
                    calculo[
                        "bonusCapitao"
                    ],

                "pontos":
                    calculo[
                        "pontos"
                    ],

                "quantidadeJogadores":
                    calculo[
                        "quantidadeJogadores"
                    ],

                "capitao":
                    estrategia.get(
                        "capitao"
                    ),

                "jogadores":
                    calculo[
                        "jogadores"
                    ]

            })

        if registro[
            "estrategias"
        ]:

            resultado[
                "rodadas"
            ].append(
                registro
            )

    # ==================================================
    # RESUMO
    # ==================================================

    resultado[
        "quantidadeRodadas"
    ] = len(
        resultado["rodadas"]
    )

    resultado[
        "rodadasProcessadas"
    ] = [

        item["rodada"]

        for item in resultado[
            "rodadas"
        ]

    ]

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    print(
        "============================================"
    )

    print(
        "SIMULAÇÃO HISTÓRICA DE TIMES CONCLUÍDA"
    )

    print(
        "Rodadas processadas:",
        resultado[
            "quantidadeRodadas"
        ]
    )

    print(
        "Arquivo:",
        ARQUIVO_SAIDA
    )

    print(
        "============================================"
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
