"""
=========================================================
CARTOLA ESTATÍSTICO
Promoção Controlada da Calibração

Versão:
promover_calibracao_v1

Objetivo:

Transformar a calibração candidata validada pelo
backtest A/B em uma configuração oficial de calibração.

REGRAS:

- Só promove se o backtest A/B recomendar promoção.
- GOL, LAT, ZAG, MEI e ATA podem receber calibração.
- TEC permanece no modelo original.
- Não altera pesos.
- Não altera arquivos históricos.
- Não altera escalações históricas.
- Não altera o motor original.
- Gera arquivo independente e reversível.

Entradas:

data/backtest-ab-calibracao.json
data/calibracao-posicoes-candidata.json

Saída:

data/calibracao-posicoes-oficial.json

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

PASTA_DATA = (
    BASE_DIR /
    "data"
)

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
# CONFIGURAÇÕES
# ======================================================

VERSAO = "calibracao_posicoes_oficial_v1"

POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
]

POSICOES_AUTORIZADAS = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA"
]

POSICOES_BLOQUEADAS = [
    "TEC"
]


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():

        print(
            f"[ERRO] Arquivo não encontrado: "
            f"{caminho}"
        )

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
            f"[ERRO] Falha ao carregar "
            f"{caminho}: {erro}"
        )

        return {}


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


def inteiro(
    valor,
    padrao=0
):

    try:

        if valor is None:
            return padrao

        return int(
            float(
                valor
            )
        )

    except Exception:

        return padrao


def agora():

    return datetime.now(
        ZoneInfo(
            "America/Sao_Paulo"
        )
    ).isoformat(
        timespec="seconds"
    )


# ======================================================
# LEITURA DA DECISÃO DO BACKTEST
# ======================================================

def extrair_decisao_backtest(
    backtest
):

    decisao_promocao = backtest.get(
        "decisaoPromocao",
        {}
    )

    decisao = (
        decisao_promocao.get(
            "decisao"
        )
        or
        backtest.get(
            "decisao"
        )
        or
        ""
    )

    promover = decisao_promocao.get(
        "promoverModeloB"
    )

    if promover is None:

        promover = (
            decisao
            ==
            "PROMOVER_CALIBRACAO"
        )

    return {
        "decisao":
            decisao,

        "promover":
            bool(
                promover
            )
    }


# ======================================================
# EXTRAÇÃO DAS POSIÇÕES
# ======================================================

def extrair_posicoes_candidatas(
    candidata
):

    if not isinstance(
        candidata,
        dict
    ):

        return {}

    for chave in [
        "posicoes",
        "calibracoes",
        "porPosicao",
        "ajustes"
    ]:

        valor = candidata.get(
            chave
        )

        if isinstance(
            valor,
            dict
        ):

            return valor

    # Compatibilidade caso o JSON tenha
    # GOL/LAT/ZAG/... diretamente na raiz.

    resultado = {}

    for posicao in POSICOES:

        valor = candidata.get(
            posicao
        )

        if isinstance(
            valor,
            dict
        ):

            resultado[
                posicao
            ] = valor

    return resultado


# ======================================================
# NORMALIZAÇÃO DA CALIBRAÇÃO
# ======================================================

def normalizar_calibracao(
    posicao,
    dados
):

    if not isinstance(
        dados,
        dict
    ):

        dados = {}

    fator = numero(
        dados.get(
            "fatorMultiplicativo",
            dados.get(
                "fator",
                1.0
            )
        ),
        1.0
    )

    correcao = numero(
        dados.get(
            "correcaoAditiva",
            dados.get(
                "correcao",
                dados.get(
                    "ajuste",
                    0.0
                )
            )
        ),
        0.0
    )

    amostras = inteiro(
        dados.get(
            "amostras",
            dados.get(
                "quantidade",
                0
            )
        ),
        0
    )

    confianca = (
        dados.get(
            "confianca"
        )
        or
        dados.get(
            "nivelConfianca"
        )
        or
        "nao_informada"
    )

    if posicao in POSICOES_BLOQUEADAS:

        return {
            "posicao":
                posicao,

            "ativa":
                False,

            "modelo":
                "original",

            "fatorMultiplicativo":
                1.0,

            "correcaoAditiva":
                0.0,

            "amostras":
                amostras,

            "confianca":
                confianca,

            "motivo":
                (
                    "Calibração não promovida para "
                    "esta posição porque o backtest "
                    "não demonstrou benefício."
                )
        }

    return {
        "posicao":
            posicao,

        "ativa":
            True,

        "modelo":
            "calibrado",

        "fatorMultiplicativo":
            round(
                fator,
                5
            ),

        "correcaoAditiva":
            round(
                correcao,
                5
            ),

        "amostras":
            amostras,

        "confianca":
            confianca,

        "motivo":
            (
                "Calibração promovida após validação "
                "favorável no backtest A/B progressivo."
            )
    }


# ======================================================
# VALIDAÇÃO DE SEGURANÇA
# ======================================================

def validar_backtest(
    backtest
):

    erros = []

    if not backtest:

        erros.append(
            "Backtest inexistente ou vazio."
        )

        return erros

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

    if not metodologia.get(
        "progressivo"
    ):

        erros.append(
            "Backtest não declarado como progressivo."
        )

    if not metodologia.get(
        "semVazamentoFuturo"
    ):

        erros.append(
            "Backtest não confirmou ausência de "
            "vazamento futuro."
        )

    quantidade_rodadas = inteiro(
        backtest.get(
            "quantidadeRodadasAvaliaveis"
        ),
        0
    )

    if quantidade_rodadas < 10:

        erros.append(
            "Quantidade insuficiente de rodadas "
            "avaliáveis."
        )

    quantidade_jogadores = inteiro(
        backtest.get(
            "quantidadeJogadoresAvaliados"
        ),
        0
    )

    if quantidade_jogadores <= 0:

        erros.append(
            "Backtest sem jogadores avaliados."
        )

    resumo = backtest.get(
        "resumoGlobal",
        {}
    )

    mae_a = numero(
        resumo.get(
            "maeA"
        ),
        0
    )

    mae_b = numero(
        resumo.get(
            "maeB"
        ),
        0
    )

    if mae_a <= 0:

        erros.append(
            "MAE do Modelo A inválido."
        )

    if mae_b <= 0:

        erros.append(
            "MAE do Modelo B inválido."
        )

    if (
        mae_a > 0
        and
        mae_b >= mae_a
    ):

        erros.append(
            "Modelo B não superou o Modelo A no MAE."
        )

    decisao = extrair_decisao_backtest(
        backtest
    )

    if not decisao.get(
        "promover"
    ):

        erros.append(
            "Backtest não autorizou promoção "
            "da calibração."
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

    backtest = carregar_json(
        ARQUIVO_BACKTEST
    )

    candidata = carregar_json(
        ARQUIVO_CANDIDATA
    )

    erros = validar_backtest(
        backtest
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
            "Nenhuma configuração oficial foi promovida."
        )

        print(
            "===================================================="
        )

        raise SystemExit(
            1
        )

    posicoes_candidatas = (
        extrair_posicoes_candidatas(
            candidata
        )
    )

    if not posicoes_candidatas:

        print(
            "[ERRO] Não foi possível localizar "
            "as calibrações por posição no arquivo "
            "candidato."
        )

        raise SystemExit(
            1
        )

    configuracoes = {}

    faltantes = []

    for posicao in POSICOES:

        dados = posicoes_candidatas.get(
            posicao
        )

        if (
            posicao
            in POSICOES_AUTORIZADAS
            and
            not isinstance(
                dados,
                dict
            )
        ):

            faltantes.append(
                posicao
            )

            continue

        configuracoes[
            posicao
        ] = normalizar_calibracao(
            posicao,
            dados or {}
        )

    if faltantes:

        print(
            "[ERRO] Calibrações candidatas "
            "não encontradas para:"
        )

        print(
            ", ".join(
                faltantes
            )
        )

        raise SystemExit(
            1
        )

    resumo_backtest = backtest.get(
        "resumoGlobal",
        {}
    )

    por_posicao_backtest = backtest.get(
        "porPosicao",
        {}
    )

    resultado = {
        "modelo":
            VERSAO,

        "geradoEm":
            agora(),

        "status":
            "ATIVA",

        "origem":
            {
                "backtest":
                    "data/backtest-ab-calibracao.json",

                "calibracaoCandidata":
                    (
                        "data/"
                        "calibracao-posicoes-candidata.json"
                    )
            },

        "validacao": {
            "backtestAprovado":
                True,

            "modeloVencedor":
                "B",

            "maeModeloA":
                numero(
                    resumo_backtest.get(
                        "maeA"
                    )
                ),

            "maeModeloB":
                numero(
                    resumo_backtest.get(
                        "maeB"
                    )
                ),

            "melhoraPercentual":
                numero(
                    resumo_backtest.get(
                        "melhoraPercentual"
                    )
                ),

            "viesModeloA":
                numero(
                    resumo_backtest.get(
                        "viesA"
                    )
                ),

            "viesModeloB":
                numero(
                    resumo_backtest.get(
                        "viesB"
                    )
                ),

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

            "semVazamentoFuturo":
                True
        },

        "politica": {
            "modo":
                "calibracao_hibrida_por_posicao",

            "posicoesCalibradas":
                POSICOES_AUTORIZADAS,

            "posicoesModeloOriginal":
                POSICOES_BLOQUEADAS,

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
            por_posicao_backtest,

        "seguranca": {
            "promocaoAutomaticaFutura":
                False,

            "arquivoIndependente":
                True,

            "modeloOriginalPreservado":
                True,

            "pesosOriginaisPreservados":
                True
        }
    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    print()

    print(
        "BACKTEST"
    )

    print(
        "----------------------------------------------------"
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

    print()

    print(
        "CONFIGURAÇÃO OFICIAL"
    )

    print(
        "----------------------------------------------------"
    )

    for posicao in POSICOES:

        dados = configuracoes[
            posicao
        ]

        status = (
            "CALIBRADO"
            if dados.get(
                "ativa"
            )
            else "ORIGINAL"
        )

        print(
            f"{posicao}: "
            f"{status} | "
            f"fator="
            f"{dados.get('fatorMultiplicativo')} | "
            f"aditivo="
            f"{dados.get('correcaoAditiva')}"
        )

    print()

    print(
        "DECISÃO: CALIBRAÇÃO PROMOVIDA"
    )

    print(
        "TEC: MODELO ORIGINAL PRESERVADO"
    )

    print(
        "Pesos alterados: NÃO"
    )

    print(
        "Motor original alterado: NÃO"
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
