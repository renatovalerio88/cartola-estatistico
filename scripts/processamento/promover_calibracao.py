"""
=========================================================
CARTOLA ESTATÍSTICO
Promoção Controlada da Calibração

Versão:
promover_calibracao_v2

Objetivo:
Promover para uso oficial somente as calibrações por
posição que foram aprovadas pelo backtest A/B.

Política oficial:
- GOL: calibrado
- LAT: calibrado
- ZAG: calibrado
- MEI: calibrado
- ATA: calibrado
- TEC: modelo original preservado

Entradas:
data/backtest-ab-calibracao.json
data/calibracao-posicoes-candidata.json

Saída:
data/calibracao-posicoes-oficial.json

O script:
- não altera pesos;
- não altera histórico;
- não altera escalações históricas;
- não altera o motor base;
- gera configuração independente e reversível.
=========================================================
"""

from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

import json
import math


# ======================================================
# DIRETÓRIOS
# ======================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
    .parent
)

PASTA_DATA = BASE_DIR / "data"

ARQUIVO_BACKTEST = (
    PASTA_DATA /
    "backtest-ab-calibracao.json"
)

ARQUIVO_CANDIDATA = (
    PASTA_DATA /
    "calibracao-posicoes-candidata.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "calibracao-posicoes-oficial.json"
)


# ======================================================
# CONFIGURAÇÃO
# ======================================================

VERSAO = "calibracao_posicoes_oficial_v2"

POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC",
]

POSICOES_CALIBRADAS = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
]

POSICOES_ORIGINAIS = [
    "TEC",
]


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():

        raise FileNotFoundError(
            f"Arquivo não encontrado: {caminho}"
        )

    with open(
        caminho,
        "r",
        encoding="utf-8"
    ) as arquivo:

        return json.load(arquivo)


def salvar_json(
    caminho,
    dados
):

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

        resultado = float(valor)

        if math.isfinite(resultado):
            return resultado

    except Exception:
        pass

    return padrao


def inteiro(
    valor,
    padrao=0
):

    try:

        if valor is None:
            return padrao

        return int(float(valor))

    except Exception:
        return padrao


def agora():

    return datetime.now(
        ZoneInfo("America/Sao_Paulo")
    ).isoformat(
        timespec="seconds"
    )


# ======================================================
# DECISÃO DO BACKTEST
# ======================================================

def extrair_decisao_backtest(backtest):

    bloco = backtest.get(
        "decisaoPromocao",
        {}
    )

    if not isinstance(bloco, dict):
        bloco = {}

    decisao = (
        bloco.get("decisao")
        or
        backtest.get("decisao")
        or
        ""
    )

    promover = bloco.get(
        "promoverModeloB"
    )

    if promover is None:

        promover = (
            decisao
            ==
            "PROMOVER_CALIBRACAO"
        )

    return {
        "decisao": decisao,
        "promover": bool(promover),
    }


# ======================================================
# EXTRAÇÃO DAS CALIBRAÇÕES
# ======================================================

def extrair_posicoes_candidatas(candidata):

    """
    Estrutura real:

    {
        "posicoes": [
            {
                "posicao": "GOL",
                ...
                "calibracaoCandidata": {
                    "fatorMultiplicativo": ...,
                    "correcaoAditiva": ...
                }
            }
        ]
    }

    Converte a lista para:

    {
        "GOL": {...},
        "LAT": {...}
    }
    """

    resultado = {}

    posicoes = candidata.get(
        "posicoes",
        []
    )

    if not isinstance(
        posicoes,
        list
    ):

        return resultado

    for item in posicoes:

        if not isinstance(
            item,
            dict
        ):
            continue

        posicao = str(
            item.get(
                "posicao",
                ""
            )
        ).upper().strip()

        if posicao not in POSICOES:
            continue

        resultado[posicao] = item

    return resultado


# ======================================================
# NORMALIZAÇÃO
# ======================================================

def criar_configuracao_calibrada(
    posicao,
    item
):

    calibracao = item.get(
        "calibracaoCandidata",
        {}
    )

    if not isinstance(
        calibracao,
        dict
    ):

        calibracao = {}

    amostra = item.get(
        "amostra",
        {}
    )

    if not isinstance(
        amostra,
        dict
    ):

        amostra = {}

    diagnostico = item.get(
        "diagnostico",
        {}
    )

    if not isinstance(
        diagnostico,
        dict
    ):

        diagnostico = {}

    fator = numero(
        calibracao.get(
            "fatorMultiplicativo"
        ),
        1.0
    )

    correcao = numero(
        calibracao.get(
            "correcaoAditiva"
        ),
        0.0
    )

    quantidade = inteiro(
        amostra.get(
            "quantidade"
        ),
        0
    )

    confianca = (
        amostra.get(
            "nivelConfianca"
        )
        or
        "nao_informada"
    )

    return {
        "posicao": posicao,

        "ativa": True,

        "modelo": "calibrado",

        "fatorMultiplicativo": round(
            fator,
            5
        ),

        "correcaoAditiva": round(
            correcao,
            5
        ),

        "formula": (
            "projecao_calibrada = "
            "(projecao_original * "
            "fatorMultiplicativo) + "
            "correcaoAditiva"
        ),

        "amostra": {
            "quantidade": quantidade,

            "nivelConfianca":
                confianca,

            "fatorConfianca":
                numero(
                    amostra.get(
                        "fatorConfianca"
                    ),
                    0
                )
        },

        "prioridade":
            item.get(
                "prioridade",
                "nao_informada"
            ),

        "diagnosticoOriginal":
            diagnostico,

        "motivos":
            item.get(
                "motivos",
                []
            ),

        "origem":
            "calibracaoCandidata",

        "motivoPromocao":
            (
                "Posição beneficiada pela "
                "calibração no backtest A/B."
            )
    }


def criar_configuracao_original(
    posicao,
    item
):

    amostra = item.get(
        "amostra",
        {}
    )

    if not isinstance(
        amostra,
        dict
    ):
        amostra = {}

    diagnostico = item.get(
        "diagnostico",
        {}
    )

    if not isinstance(
        diagnostico,
        dict
    ):
        diagnostico = {}

    calibracao_candidata = item.get(
        "calibracaoCandidata",
        {}
    )

    if not isinstance(
        calibracao_candidata,
        dict
    ):
        calibracao_candidata = {}

    return {
        "posicao": posicao,

        "ativa": False,

        "modelo": "original",

        "fatorMultiplicativo": 1.0,

        "correcaoAditiva": 0.0,

        "formula": "projecao_final = projecao_original",

        "amostra": {
            "quantidade":
                inteiro(
                    amostra.get(
                        "quantidade"
                    )
                ),

            "nivelConfianca":
                amostra.get(
                    "nivelConfianca",
                    "nao_informada"
                ),

            "fatorConfianca":
                numero(
                    amostra.get(
                        "fatorConfianca"
                    )
                )
        },

        "prioridade":
            item.get(
                "prioridade",
                "nao_informada"
            ),

        "diagnosticoOriginal":
            diagnostico,

        "calibracaoCandidataDescartada":
            {
                "fatorMultiplicativo":
                    numero(
                        calibracao_candidata.get(
                            "fatorMultiplicativo"
                        ),
                        1.0
                    ),

                "correcaoAditiva":
                    numero(
                        calibracao_candidata.get(
                            "correcaoAditiva"
                        ),
                        0.0
                    )
            },

        "origem":
            "modelo_original",

        "motivoPreservacao":
            (
                "A calibração candidata de TEC "
                "não foi promovida. O backtest "
                "por posição indicou piora em "
                "relação ao modelo original."
            )
    }


# ======================================================
# VALIDAÇÃO DA CANDIDATA
# ======================================================

def validar_candidata(
    candidata,
    posicoes
):

    erros = []

    modelo = str(
        candidata.get(
            "modelo",
            ""
        )
    )

    if (
        modelo
        !=
        "calibracao_posicoes_candidata_v1"
    ):

        erros.append(
            "Versão da calibração candidata "
            "não reconhecida."
        )

    for posicao in POSICOES:

        if posicao not in posicoes:

            erros.append(
                f"Posição ausente na candidata: "
                f"{posicao}"
            )

    for posicao in POSICOES_CALIBRADAS:

        item = posicoes.get(
            posicao,
            {}
        )

        calibracao = item.get(
            "calibracaoCandidata",
            {}
        )

        if not isinstance(
            calibracao,
            dict
        ):

            erros.append(
                f"Calibração inválida para "
                f"{posicao}."
            )

            continue

        fator = numero(
            calibracao.get(
                "fatorMultiplicativo"
            ),
            0
        )

        if fator <= 0:

            erros.append(
                f"Fator inválido para "
                f"{posicao}."
            )

    return erros


# ======================================================
# VALIDAÇÃO DO BACKTEST
# ======================================================

def validar_backtest(backtest):

    erros = []

    if not isinstance(
        backtest,
        dict
    ):

        return [
            "Backtest inválido."
        ]

    modelo = str(
        backtest.get(
            "modelo",
            ""
        )
    )

    if not modelo.startswith(
        "backtest_ab_calibracao"
    ):

        erros.append(
            "Versão do backtest não reconhecida."
        )

    metodologia = backtest.get(
        "metodologia",
        {}
    )

    if not isinstance(
        metodologia,
        dict
    ):

        metodologia = {}

    if not metodologia.get(
        "progressivo"
    ):

        erros.append(
            "Backtest não está marcado como "
            "progressivo."
        )

    if not metodologia.get(
        "semVazamentoFuturo"
    ):

        erros.append(
            "Backtest não confirmou ausência "
            "de vazamento futuro."
        )

    rodadas = inteiro(
        backtest.get(
            "quantidadeRodadasAvaliaveis"
        ),
        0
    )

    jogadores = inteiro(
        backtest.get(
            "quantidadeJogadoresAvaliados"
        ),
        0
    )

    if rodadas < 10:

        erros.append(
            "Amostra de rodadas insuficiente."
        )

    if jogadores <= 0:

        erros.append(
            "Nenhum jogador avaliado."
        )

    resumo = backtest.get(
        "resumoGlobal",
        {}
    )

    if not isinstance(
        resumo,
        dict
    ):

        resumo = {}

    mae_a = numero(
        resumo.get(
            "maeA"
        )
    )

    mae_b = numero(
        resumo.get(
            "maeB"
        )
    )

    if mae_a <= 0:

        erros.append(
            "MAE A inválido."
        )

    if mae_b <= 0:

        erros.append(
            "MAE B inválido."
        )

    if (
        mae_a > 0
        and
        mae_b >= mae_a
    ):

        erros.append(
            "Modelo B não superou o Modelo A."
        )

    decisao = extrair_decisao_backtest(
        backtest
    )

    if not decisao[
        "promover"
    ]:

        erros.append(
            "Backtest não autorizou a promoção."
        )

    return erros


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    print(
        "===================================================="
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "PROMOÇÃO CONTROLADA DA CALIBRAÇÃO"
    )

    print(
        "===================================================="
    )

    candidata = carregar_json(
        ARQUIVO_CANDIDATA
    )

    backtest = carregar_json(
        ARQUIVO_BACKTEST
    )

    posicoes = extrair_posicoes_candidatas(
        candidata
    )

    erros = []

    erros.extend(
        validar_candidata(
            candidata,
            posicoes
        )
    )

    erros.extend(
        validar_backtest(
            backtest
        )
    )

    if erros:

        print()

        print(
            "PROMOÇÃO BLOQUEADA"
        )

        print(
            "----------------------------------------------------"
        )

        for erro in erros:

            print(
                "[FALHA]",
                erro
            )

        print()

        print(
            "Arquivo oficial não foi gerado."
        )

        print(
            "===================================================="
        )

        raise SystemExit(1)

    configuracoes = {}

    for posicao in POSICOES:

        item = posicoes[
            posicao
        ]

        if (
            posicao
            in POSICOES_CALIBRADAS
        ):

            configuracoes[
                posicao
            ] = (
                criar_configuracao_calibrada(
                    posicao,
                    item
                )
            )

        else:

            configuracoes[
                posicao
            ] = (
                criar_configuracao_original(
                    posicao,
                    item
                )
            )

    resumo = backtest.get(
        "resumoGlobal",
        {}
    )

    por_posicao = backtest.get(
        "porPosicao",
        {}
    )

    decisao = extrair_decisao_backtest(
        backtest
    )

    resultado = {
        "modelo":
            VERSAO,

        "geradoEm":
            agora(),

        "status":
            "ATIVA",

        "descricao":
            (
                "Configuração oficial de "
                "calibração por posição "
                "promovida após backtest A/B."
            ),

        "modeloBase":
            "A",

        "modeloPromovido":
            "B",

        "origem": {
            "calibracaoCandidata":
                (
                    "data/"
                    "calibracao-posicoes-candidata.json"
                ),

            "backtest":
                (
                    "data/"
                    "backtest-ab-calibracao.json"
                )
        },

        "validacao": {
            "decisaoBacktest":
                decisao[
                    "decisao"
                ],

            "promocaoAutorizada":
                True,

            "rodadasAvaliaveis":
                inteiro(
                    backtest.get(
                        "quantidadeRodadasAvaliaveis"
                    )
                ),

            "jogadoresAvaliados":
                inteiro(
                    backtest.get(
                        "quantidadeJogadoresAvaliados"
                    )
                ),

            "maeModeloA":
                numero(
                    resumo.get(
                        "maeA"
                    )
                ),

            "maeModeloB":
                numero(
                    resumo.get(
                        "maeB"
                    )
                ),

            "melhoraPercentual":
                numero(
                    resumo.get(
                        "melhoraPercentual"
                    )
                ),

            "viesModeloA":
                numero(
                    resumo.get(
                        "viesA"
                    )
                ),

            "viesModeloB":
                numero(
                    resumo.get(
                        "viesB"
                    )
                ),

            "semVazamentoFuturo":
                True
        },

        "politica": {
            "tipo":
                "hibrida_por_posicao",

            "posicoesCalibradas":
                POSICOES_CALIBRADAS,

            "posicoesModeloOriginal":
                POSICOES_ORIGINAIS,

            "alterarPesos":
                False,

            "alterarMotorBase":
                False,

            "alterarHistorico":
                False,

            "alterarEscalacoesHistoricas":
                False,

            "reversivel":
                True
        },

        "posicoes":
            configuracoes,

        "resultadoBacktestPorPosicao":
            por_posicao,

        "seguranca": {
            "modeloOriginalPreservado":
                True,

            "pesosOriginaisPreservados":
                True,

            "promocaoAutomaticaFutura":
                False,

            "arquivoIndependente":
                True
        }
    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    print()

    print(
        "BACKTEST A/B"
    )

    print(
        "----------------------------------------------------"
    )

    print(
        "Rodadas:",
        resultado[
            "validacao"
        ][
            "rodadasAvaliaveis"
        ]
    )

    print(
        "Jogadores:",
        resultado[
            "validacao"
        ][
            "jogadoresAvaliados"
        ]
    )

    print(
        "MAE A:",
        resultado[
            "validacao"
        ][
            "maeModeloA"
        ]
    )

    print(
        "MAE B:",
        resultado[
            "validacao"
        ][
            "maeModeloB"
        ]
    )

    print(
        "Melhora:",
        resultado[
            "validacao"
        ][
            "melhoraPercentual"
        ],
        "%"
    )

    print(
        "Viés A:",
        resultado[
            "validacao"
        ][
            "viesModeloA"
        ]
    )

    print(
        "Viés B:",
        resultado[
            "validacao"
        ][
            "viesModeloB"
        ]
    )

    print()

    print(
        "CONFIGURAÇÃO PROMOVIDA"
    )

    print(
        "----------------------------------------------------"
    )

    for posicao in POSICOES:

        configuracao = configuracoes[
            posicao
        ]

        if configuracao[
            "ativa"
        ]:

            print(
                f"{posicao}: CALIBRADO | "
                f"fator="
                f"{configuracao['fatorMultiplicativo']} | "
                f"aditivo="
                f"{configuracao['correcaoAditiva']}"
            )

        else:

            print(
                f"{posicao}: ORIGINAL | "
                f"fator=1.0 | "
                f"aditivo=0.0"
            )

    print()

    print(
        "DECISÃO: CALIBRAÇÃO PROMOVIDA"
    )

    print(
        "GOL/LAT/ZAG/MEI/ATA: MODELO B"
    )

    print(
        "TEC: MODELO ORIGINAL"
    )

    print(
        "Pesos alterados: NÃO"
    )

    print(
        "Motor base alterado: NÃO"
    )

    print(
        "Histórico alterado: NÃO"
    )

    print()

    print(
        "Arquivo:"
    )

    print(
        ARQUIVO_SAIDA
    )

    print(
        "===================================================="
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
