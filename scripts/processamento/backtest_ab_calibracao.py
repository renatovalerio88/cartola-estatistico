"""
=========================================================
CARTOLA ESTATÍSTICO
Backtest A/B Progressivo da Calibração por Posição

Versão:
backtest_ab_calibracao_v2

Objetivo:

Comparar:

MODELO A
Projeção histórica original.

MODELO B
Mesma projeção histórica, porém calibrada por posição
usando SOMENTE resultados disponíveis ANTES da rodada
que está sendo avaliada.

REGRA CIENTÍFICA FUNDAMENTAL:

Para avaliar a rodada R, a calibração é calculada
exclusivamente com rodadas anteriores a R.

Isso impede vazamento de informação futura.

Entradas:

data/simulacao-times.json
data/analise-simulacoes-historicas.json
data/calibracao-posicoes-candidata.json

Saída:

data/backtest-ab-calibracao.json

IMPORTANTE:

Este script NÃO altera o modelo oficial.
Este script NÃO altera pesos.
Este script NÃO altera escalações.

=========================================================
"""

from pathlib import Path
from statistics import mean

import json
import math


# ======================================================
# CONFIGURAÇÕES
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

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_ANALISE = (
    PASTA_DATA /
    "analise-simulacoes-historicas.json"
)

ARQUIVO_CALIBRACAO_REFERENCIA = (
    PASTA_DATA /
    "calibracao-posicoes-candidata.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "backtest-ab-calibracao.json"
)


POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
]


# ======================================================
# CONTROLE DO BACKTEST
# ======================================================

RODADA_COLD_START = 2

AMOSTRA_MINIMA_POSICAO = 20

AMOSTRA_CONFIAVEL = 60

AMOSTRA_FORTE = 120


# ======================================================
# LIMITES DA CALIBRAÇÃO
# ======================================================

CORRECAO_VIES_MINIMA = 0.20

CORRECAO_VIES_PADRAO = 0.35

CORRECAO_VIES_FORTE = 0.50

LIMITE_CORRECAO_ADITIVA = 1.50

FATOR_MULTIPLICATIVO_MINIMO = 0.88

FATOR_MULTIPLICATIVO_MAXIMO = 1.12

FATOR_FINAL_MINIMO = 0.85

FATOR_FINAL_MAXIMO = 1.15

MAE_BOM = 3.00

MAE_MODERADO = 4.50

MAE_ALTO = 6.00


# ======================================================
# CRITÉRIOS DE PROMOÇÃO
# ======================================================

MELHORA_MINIMA_PERCENTUAL = 1.00

MAX_POSICOES_PIORES = 2

TAXA_MINIMA_VITORIAS_B = 45.00

MIN_RODADAS_AVALIAVEIS_PROMOCAO = 10


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
            f"[AVISO] Falha ao carregar "
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


def arredondar(
    valor,
    casas=3
):

    return round(
        numero(
            valor,
            0
        ),
        casas
    )


def media_segura(
    valores
):

    validos = []

    for valor in valores:

        try:

            convertido = float(
                valor
            )

            if math.isfinite(
                convertido
            ):

                validos.append(
                    convertido
                )

        except Exception:
            pass

    if not validos:
        return 0.0

    return mean(
        validos
    )


def percentual(
    quantidade,
    total
):

    if not total:
        return 0.0

    return round(
        (
            numero(
                quantidade
            )
            /
            numero(
                total
            )
        )
        *
        100,
        2
    )


def limitar(
    valor,
    minimo,
    maximo
):

    return max(
        minimo,
        min(
            maximo,
            valor
        )
    )


# ======================================================
# COMPATIBILIDADE COM A SIMULAÇÃO ATUAL
# ======================================================

def extrair_rodadas(
    simulacao
):

    if isinstance(
        simulacao,
        list
    ):

        return simulacao

    if not isinstance(
        simulacao,
        dict
    ):

        return []

    for chave in [
        "rodadas",
        "resultados",
        "simulacoes"
    ]:

        valor = simulacao.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

    return []


def extrair_estrategias(
    rodada_dados
):

    if not isinstance(
        rodada_dados,
        dict
    ):

        return []

    valor = rodada_dados.get(
        "estrategias",
        []
    )

    if isinstance(
        valor,
        list
    ):

        return valor

    if isinstance(
        valor,
        dict
    ):

        resultado = []

        for (
            nome,
            estrategia
        ) in valor.items():

            if not isinstance(
                estrategia,
                dict
            ):

                continue

            copia = dict(
                estrategia
            )

            copia.setdefault(
                "nome",
                nome
            )

            resultado.append(
                copia
            )

        return resultado

    return []


def extrair_jogadores(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):

        return []

    for chave in [
        "jogadores",
        "titulares",
        "atletas"
    ]:

        valor = estrategia.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

    return []


def obter_nome_estrategia(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):

        return "Sem nome"

    return (
        estrategia.get(
            "nome"
        )
        or
        estrategia.get(
            "perfil"
        )
        or
        estrategia.get(
            "id"
        )
        or
        "Sem nome"
    )


def normalizar_posicao(
    valor
):

    if isinstance(
        valor,
        dict
    ):

        valor = (
            valor.get(
                "abreviacao"
            )
            or
            valor.get(
                "sigla"
            )
            or
            valor.get(
                "nome"
            )
        )

    if valor is None:
        return ""

    texto = (
        str(
            valor
        )
        .strip()
        .upper()
    )

    mapa = {
        "1": "GOL",
        "2": "LAT",
        "3": "ZAG",
        "4": "MEI",
        "5": "ATA",
        "6": "TEC",

        "GOLEIRO": "GOL",
        "GOL": "GOL",

        "LATERAL": "LAT",
        "LAT": "LAT",

        "ZAGUEIRO": "ZAG",
        "ZAG": "ZAG",

        "MEIA": "MEI",
        "MEI": "MEI",

        "ATACANTE": "ATA",
        "ATA": "ATA",

        "TECNICO": "TEC",
        "TÉCNICO": "TEC",
        "TEC": "TEC"
    }

    return mapa.get(
        texto,
        texto
    )


def obter_posicao(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return ""

    for chave in [
        "posicao",
        "posição",
        "posicaoId",
        "posicao_id"
    ]:

        if jogador.get(
            chave
        ) is not None:

            posicao = normalizar_posicao(
                jogador.get(
                    chave
                )
            )

            if posicao:
                return posicao

    return ""


def obter_projecao(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return 0.0

    for chave in [
        "projecao",
        "projeção",
        "score",
        "nota"
    ]:

        if jogador.get(
            chave
        ) is not None:

            return numero(
                jogador.get(
                    chave
                ),
                0
            )

    metricas = jogador.get(
        "metricas"
    )

    if isinstance(
        metricas,
        dict
    ):

        for chave in [
            "projecao",
            "score",
            "nota"
        ]:

            if metricas.get(
                chave
            ) is not None:

                return numero(
                    metricas.get(
                        chave
                    ),
                    0
                )

    return 0.0


def obter_pontuacao_real(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return 0.0

    for chave in [
        "pontuacaoReal",
        "pontuacao_real",
        "pontos",
        "pontuacao",
        "real",
        "scoreReal",
        "score_real"
    ]:

        if jogador.get(
            chave
        ) is not None:

            return numero(
                jogador.get(
                    chave
                ),
                0
            )

    resultado = jogador.get(
        "resultado"
    )

    if isinstance(
        resultado,
        dict
    ):

        for chave in [
            "pontuacaoReal",
            "pontuacao_real",
            "pontos",
            "pontuacao",
            "real"
        ]:

            if resultado.get(
                chave
            ) is not None:

                return numero(
                    resultado.get(
                        chave
                    ),
                    0
                )

    return 0.0


# ======================================================
# HISTÓRICO DE OBSERVAÇÕES
# ======================================================

def criar_historico_vazio():

    return {

        posicao: []

        for posicao
        in POSICOES
    }


def adicionar_observacao(
    historico,
    posicao,
    projecao,
    real,
    rodada,
    estrategia
):

    if posicao not in historico:
        return

    historico[
        posicao
    ].append({

        "rodada":
            rodada,

        "estrategia":
            estrategia,

        "projecao":
            numero(
                projecao,
                0
            ),

        "real":
            numero(
                real,
                0
            )
    })


# ======================================================
# CONFIANÇA DA AMOSTRA
# ======================================================

def calcular_confianca(
    quantidade
):

    quantidade = inteiro(
        quantidade,
        0
    )

    if quantidade < AMOSTRA_MINIMA_POSICAO:

        return {
            "nivel":
                "insuficiente",

            "fator":
                0.0
        }

    if quantidade < AMOSTRA_CONFIAVEL:

        return {
            "nivel":
                "baixa",

            "fator":
                0.40
        }

    if quantidade < AMOSTRA_FORTE:

        return {
            "nivel":
                "moderada",

            "fator":
                0.70
        }

    return {
        "nivel":
            "alta",

        "fator":
            1.0
    }


# ======================================================
# MÉTRICAS DO HISTÓRICO
# ======================================================

def calcular_metricas_historicas(
    observacoes
):

    if not observacoes:

        return {
            "amostras": 0,
            "mae": 0.0,
            "vies": 0.0,
            "mediaProjecao": 0.0,
            "mediaReal": 0.0
        }

    projecoes = [

        numero(
            item.get(
                "projecao"
            ),
            0
        )

        for item
        in observacoes
    ]

    reais = [

        numero(
            item.get(
                "real"
            ),
            0
        )

        for item
        in observacoes
    ]

    erros = [

        projecao - real

        for (
            projecao,
            real
        ) in zip(
            projecoes,
            reais
        )
    ]

    erros_absolutos = [

        abs(
            erro
        )

        for erro
        in erros
    ]

    return {
        "amostras":
            len(
                observacoes
            ),

        "mae":
            media_segura(
                erros_absolutos
            ),

        "vies":
            media_segura(
                erros
            ),

        "mediaProjecao":
            media_segura(
                projecoes
            ),

        "mediaReal":
            media_segura(
                reais
            )
    }


# ======================================================
# INTENSIDADE DE CORREÇÃO
# ======================================================

def intensidade_correcao_vies(
    vies
):

    absoluto = abs(
        numero(
            vies,
            0
        )
    )

    if absoluto < 0.50:
        return 0.0

    if absoluto < 1.50:
        return CORRECAO_VIES_MINIMA

    if absoluto < 2.50:
        return CORRECAO_VIES_PADRAO

    return CORRECAO_VIES_FORTE


# ======================================================
# CORREÇÃO ADITIVA
# ======================================================

def calcular_correcao_aditiva(
    vies,
    confianca
):

    vies = numero(
        vies,
        0
    )

    fator_confianca = numero(
        confianca.get(
            "fator"
        ),
        0
    )

    intensidade = (
        intensidade_correcao_vies(
            vies
        )
    )

    correcao = (
        -vies
        *
        intensidade
        *
        fator_confianca
    )

    return limitar(
        correcao,
        -LIMITE_CORRECAO_ADITIVA,
        LIMITE_CORRECAO_ADITIVA
    )


# ======================================================
# FATOR MULTIPLICATIVO
# ======================================================

def calcular_fator_multiplicativo(
    metricas,
    confianca
):

    media_projecao = numero(
        metricas.get(
            "mediaProjecao"
        ),
        0
    )

    media_real = numero(
        metricas.get(
            "mediaReal"
        ),
        0
    )

    fator_confianca = numero(
        confianca.get(
            "fator"
        ),
        0
    )

    if (
        media_projecao == 0
        or
        fator_confianca == 0
    ):

        return 1.0

    fator_bruto = (
        media_real
        /
        media_projecao
    )

    fator = (
        1.0
        +
        (
            fator_bruto
            -
            1.0
        )
        *
        0.35
        *
        fator_confianca
    )

    return limitar(
        fator,
        FATOR_MULTIPLICATIVO_MINIMO,
        FATOR_MULTIPLICATIVO_MAXIMO
    )


# ======================================================
# AJUSTE PELO MAE
# ======================================================

def calcular_ajuste_mae(
    mae,
    confianca
):

    mae = numero(
        mae,
        0
    )

    fator_confianca = numero(
        confianca.get(
            "fator"
        ),
        0
    )

    if fator_confianca == 0:
        return 0.0

    if mae <= MAE_BOM:

        ajuste = 0.005

    elif mae <= MAE_MODERADO:

        ajuste = 0.0

    elif mae <= MAE_ALTO:

        ajuste = -0.0125

    else:

        ajuste = -0.025

    return (
        ajuste
        *
        fator_confianca
    )


# ======================================================
# CALIBRAÇÃO PROGRESSIVA
# ======================================================

def gerar_calibracao_progressiva(
    observacoes
):

    metricas = (
        calcular_metricas_historicas(
            observacoes
        )
    )

    confianca = calcular_confianca(
        metricas.get(
            "amostras"
        )
    )

    if (
        confianca.get(
            "nivel"
        )
        ==
        "insuficiente"
    ):

        return {
            "aplicada":
                False,

            "amostras":
                metricas.get(
                    "amostras"
                ),

            "confianca":
                confianca.get(
                    "nivel"
                ),

            "fatorMultiplicativo":
                1.0,

            "correcaoAditiva":
                0.0,

            "metricasHistoricas": {
                "mae":
                    arredondar(
                        metricas.get(
                            "mae"
                        )
                    ),

                "vies":
                    arredondar(
                        metricas.get(
                            "vies"
                        )
                    ),

                "mediaProjecao":
                    arredondar(
                        metricas.get(
                            "mediaProjecao"
                        )
                    ),

                "mediaReal":
                    arredondar(
                        metricas.get(
                            "mediaReal"
                        )
                    )
            }
        }

    fator = calcular_fator_multiplicativo(
        metricas,
        confianca
    )

    ajuste_mae = calcular_ajuste_mae(
        metricas.get(
            "mae"
        ),
        confianca
    )

    fator_final = limitar(
        fator
        +
        ajuste_mae,
        FATOR_FINAL_MINIMO,
        FATOR_FINAL_MAXIMO
    )

    correcao_aditiva = (
        calcular_correcao_aditiva(
            metricas.get(
                "vies"
            ),
            confianca
        )
    )

    return {
        "aplicada":
            True,

        "amostras":
            metricas.get(
                "amostras"
            ),

        "confianca":
            confianca.get(
                "nivel"
            ),

        "fatorConfianca":
            confianca.get(
                "fator"
            ),

        "fatorMultiplicativo":
            arredondar(
                fator_final,
                5
            ),

        "correcaoAditiva":
            arredondar(
                correcao_aditiva,
                5
            ),

        "metricasHistoricas": {
            "mae":
                arredondar(
                    metricas.get(
                        "mae"
                    )
                ),

            "vies":
                arredondar(
                    metricas.get(
                        "vies"
                    )
                ),

            "mediaProjecao":
                arredondar(
                    metricas.get(
                        "mediaProjecao"
                    )
                ),

            "mediaReal":
                arredondar(
                    metricas.get(
                        "mediaReal"
                    )
                )
        }
    }


# ======================================================
# APLICAÇÃO DA CALIBRAÇÃO
# ======================================================

def aplicar_calibracao(
    projecao_original,
    calibracao
):

    projecao_original = numero(
        projecao_original,
        0
    )

    fator = numero(
        calibracao.get(
            "fatorMultiplicativo"
        ),
        1
    )

    aditivo = numero(
        calibracao.get(
            "correcaoAditiva"
        ),
        0
    )

    return (
        projecao_original
        *
        fator
    ) + aditivo


# ======================================================
# PROCESSAMENTO DE UM JOGADOR
# ======================================================

def comparar_jogador(
    jogador,
    calibracao
):

    projecao_a = obter_projecao(
        jogador
    )

    real = obter_pontuacao_real(
        jogador
    )

    projecao_b = aplicar_calibracao(
        projecao_a,
        calibracao
    )

    erro_a = (
        projecao_a
        -
        real
    )

    erro_b = (
        projecao_b
        -
        real
    )

    erro_absoluto_a = abs(
        erro_a
    )

    erro_absoluto_b = abs(
        erro_b
    )

    diferenca = (
        erro_absoluto_a
        -
        erro_absoluto_b
    )

    if erro_absoluto_b < erro_absoluto_a:

        vencedor = "B"

    elif erro_absoluto_a < erro_absoluto_b:

        vencedor = "A"

    else:

        vencedor = "EMPATE"

    return {
        "id":
            jogador.get(
                "id"
            ),

        "nome":
            jogador.get(
                "nome"
            ),

        "posicao":
            obter_posicao(
                jogador
            ),

        "real":
            arredondar(
                real
            ),

        "modeloA": {
            "projecao":
                arredondar(
                    projecao_a
                ),

            "erro":
                arredondar(
                    erro_a
                ),

            "erroAbsoluto":
                arredondar(
                    erro_absoluto_a
                )
        },

        "modeloB": {
            "projecao":
                arredondar(
                    projecao_b
                ),

            "erro":
                arredondar(
                    erro_b
                ),

            "erroAbsoluto":
                arredondar(
                    erro_absoluto_b
                )
        },

        "melhoraErroAbsoluto":
            arredondar(
                diferenca
            ),

        "vencedor":
            vencedor,

        "calibracaoAplicada":
            bool(
                calibracao.get(
                    "aplicada"
                )
            )
    }


# ======================================================
# RESUMO DAS COMPARAÇÕES
# ======================================================

def resumir_comparacoes(
    jogadores
):

    if not jogadores:

        return {
            "amostras": 0,
            "amostrasCalibradas": 0,
            "percentualCalibrado": 0.0,
            "maeA": 0.0,
            "maeB": 0.0,
            "viesA": 0.0,
            "viesB": 0.0,
            "melhoraAbsoluta": 0.0,
            "melhoraPercentual": 0.0,
            "vitoriasA": 0,
            "vitoriasB": 0,
            "empates": 0,
            "taxaVitoriasA": 0.0,
            "taxaVitoriasB": 0.0
        }

    erros_absolutos_a = [

        numero(
            jogador.get(
                "modeloA",
                {}
            ).get(
                "erroAbsoluto"
            )
        )

        for jogador
        in jogadores
    ]

    erros_absolutos_b = [

        numero(
            jogador.get(
                "modeloB",
                {}
            ).get(
                "erroAbsoluto"
            )
        )

        for jogador
        in jogadores
    ]

    erros_a = [

        numero(
            jogador.get(
                "modeloA",
                {}
            ).get(
                "erro"
            )
        )

        for jogador
        in jogadores
    ]

    erros_b = [

        numero(
            jogador.get(
                "modeloB",
                {}
            ).get(
                "erro"
            )
        )

        for jogador
        in jogadores
    ]

    mae_a = media_segura(
        erros_absolutos_a
    )

    mae_b = media_segura(
        erros_absolutos_b
    )

    melhora_absoluta = (
        mae_a
        -
        mae_b
    )

    if mae_a != 0:

        melhora_percentual = (
            melhora_absoluta
            /
            mae_a
            *
            100
        )

    else:

        melhora_percentual = 0.0

    vitorias_a = sum(
        1
        for jogador
        in jogadores
        if jogador.get(
            "vencedor"
        ) == "A"
    )

    vitorias_b = sum(
        1
        for jogador
        in jogadores
        if jogador.get(
            "vencedor"
        ) == "B"
    )

    empates = sum(
        1
        for jogador
        in jogadores
        if jogador.get(
            "vencedor"
        ) == "EMPATE"
    )

    calibrados = sum(
        1
        for jogador
        in jogadores
        if jogador.get(
            "calibracaoAplicada"
        )
    )

    return {
        "amostras":
            len(
                jogadores
            ),

        "amostrasCalibradas":
            calibrados,

        "percentualCalibrado":
            percentual(
                calibrados,
                len(
                    jogadores
                )
            ),

        "maeA":
            arredondar(
                mae_a
            ),

        "maeB":
            arredondar(
                mae_b
            ),

        "viesA":
            arredondar(
                media_segura(
                    erros_a
                )
            ),

        "viesB":
            arredondar(
                media_segura(
                    erros_b
                )
            ),

        "melhoraAbsoluta":
            arredondar(
                melhora_absoluta
            ),

        "melhoraPercentual":
            arredondar(
                melhora_percentual,
                2
            ),

        "vitoriasA":
            vitorias_a,

        "vitoriasB":
            vitorias_b,

        "empates":
            empates,

        "taxaVitoriasA":
            percentual(
                vitorias_a,
                len(
                    jogadores
                )
            ),

        "taxaVitoriasB":
            percentual(
                vitorias_b,
                len(
                    jogadores
                )
            )
    }


# ======================================================
# RESUMO POR POSIÇÃO
# ======================================================

def resumir_por_posicao(
    jogadores
):

    resultado = {}

    for posicao in POSICOES:

        selecionados = [

            jogador

            for jogador
            in jogadores

            if jogador.get(
                "posicao"
            ) == posicao
        ]

        resumo = resumir_comparacoes(
            selecionados
        )

        if (
            resumo.get(
                "maeB",
                0
            )
            <
            resumo.get(
                "maeA",
                0
            )
        ):

            vencedor = "B"

        elif (
            resumo.get(
                "maeA",
                0
            )
            <
            resumo.get(
                "maeB",
                0
            )
        ):

            vencedor = "A"

        else:

            vencedor = "EMPATE"

        resumo[
            "vencedor"
        ] = vencedor

        resultado[
            posicao
        ] = resumo

    return resultado


# ======================================================
# RESUMO POR ESTRATÉGIA
# ======================================================

def resumir_por_estrategia(
    jogadores
):

    grupos = {}

    for jogador in jogadores:

        estrategia = jogador.get(
            "_estrategia"
        )

        if not estrategia:
            continue

        grupos.setdefault(
            estrategia,
            []
        ).append(
            jogador
        )

    resultado = {}

    for (
        nome,
        registros
    ) in grupos.items():

        resumo = resumir_comparacoes(
            registros
        )

        if (
            resumo.get(
                "maeB",
                0
            )
            <
            resumo.get(
                "maeA",
                0
            )
        ):

            vencedor = "B"

        elif (
            resumo.get(
                "maeA",
                0
            )
            <
            resumo.get(
                "maeB",
                0
            )
        ):

            vencedor = "A"

        else:

            vencedor = "EMPATE"

        resumo[
            "vencedor"
        ] = vencedor

        resultado[
            nome
        ] = resumo

    return resultado


# ======================================================
# CRITÉRIO DE PROMOÇÃO
# ======================================================

def avaliar_promocao(
    resumo_global,
    resumo_posicoes,
    rodadas_avaliaveis,
    vitorias_rodada_a,
    vitorias_rodada_b,
    empates_rodada
):

    criterios = []

    melhora_percentual = numero(
        resumo_global.get(
            "melhoraPercentual"
        ),
        0
    )

    criterio_mae = (
        melhora_percentual
        >=
        MELHORA_MINIMA_PERCENTUAL
    )

    criterios.append({
        "criterio":
            "melhora_mae_global",

        "aprovado":
            criterio_mae,

        "valor":
            arredondar(
                melhora_percentual,
                2
            ),

        "minimo":
            MELHORA_MINIMA_PERCENTUAL
    })

    posicoes_piores = [

        posicao

        for (
            posicao,
            dados
        ) in resumo_posicoes.items()

        if (
            dados.get(
                "amostras",
                0
            ) > 0
            and
            dados.get(
                "vencedor"
            ) == "A"
        )
    ]

    criterio_posicoes = (
        len(
            posicoes_piores
        )
        <=
        MAX_POSICOES_PIORES
    )

    criterios.append({
        "criterio":
            "limite_posicoes_piores",

        "aprovado":
            criterio_posicoes,

        "posicoesPiores":
            posicoes_piores,

        "quantidade":
            len(
                posicoes_piores
            ),

        "maximo":
            MAX_POSICOES_PIORES
    })

    taxa_vitorias_b = percentual(
        vitorias_rodada_b,
        rodadas_avaliaveis
    )

    criterio_rodadas = (
        taxa_vitorias_b
        >=
        TAXA_MINIMA_VITORIAS_B
    )

    criterios.append({
        "criterio":
            "vitorias_por_rodada",

        "aprovado":
            criterio_rodadas,

        "vitoriasA":
            vitorias_rodada_a,

        "vitoriasB":
            vitorias_rodada_b,

        "empates":
            empates_rodada,

        "taxaVitoriasB":
            taxa_vitorias_b,

        "minimo":
            TAXA_MINIMA_VITORIAS_B
    })

    criterio_amostra = (
        rodadas_avaliaveis
        >=
        MIN_RODADAS_AVALIAVEIS_PROMOCAO
    )

    criterios.append({
        "criterio":
            "amostra_minima",

        "aprovado":
            criterio_amostra,

        "rodadas":
            rodadas_avaliaveis,

        "minimo":
            MIN_RODADAS_AVALIAVEIS_PROMOCAO
    })

    aprovados = sum(
        1
        for criterio
        in criterios
        if criterio.get(
            "aprovado"
        )
    )

    promocao = (
        aprovados
        ==
        len(
            criterios
        )
    )

    return {
        "promoverModeloB":
            promocao,

        "criteriosAprovados":
            aprovados,

        "totalCriterios":
            len(
                criterios
            ),

        "criterios":
            criterios,

        "decisao":
            (
                "PROMOVER_CALIBRACAO"
                if promocao
                else "MANTER_MODELO_ATUAL"
            ),

        "alteracaoAutomatica":
            False
    }


# ======================================================
# PROCESSAMENTO PRINCIPAL
# ======================================================

def processar():

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    analise = carregar_json(
        ARQUIVO_ANALISE
    )

    calibracao_referencia = carregar_json(
        ARQUIVO_CALIBRACAO_REFERENCIA
    )

    if not simulacao:

        print(
            "[ERRO] data/simulacao-times.json "
            "não encontrado."
        )

        raise SystemExit(
            1
        )

    rodadas = extrair_rodadas(
        simulacao
    )

    if not rodadas:

        print(
            "[ERRO] Simulação sem rodadas."
        )

        raise SystemExit(
            1
        )

    rodadas = sorted(
        rodadas,
        key=lambda item:
            inteiro(
                item.get(
                    "rodada"
                ),
                0
            )
    )

    historico = criar_historico_vazio()

    resultados_rodadas = []

    todos_jogadores_avaliados = []

    vitorias_rodada_a = 0
    vitorias_rodada_b = 0
    empates_rodada = 0

    print(
        "===================================================="
    )

    print(
        "BACKTEST A/B PROGRESSIVO DA CALIBRAÇÃO"
    )

    print(
        "===================================================="
    )

    for rodada_dados in rodadas:

        rodada = inteiro(
            rodada_dados.get(
                "rodada"
            ),
            0
        )

        if rodada <= 0:
            continue

        # =================================================
        # CALIBRAÇÃO COM SOMENTE O PASSADO
        # =================================================

        calibracoes_rodada = {}

        for posicao in POSICOES:

            calibracoes_rodada[
                posicao
            ] = (
                gerar_calibracao_progressiva(
                    historico[
                        posicao
                    ]
                )
            )

        jogadores_rodada = []

        estrategias_rodada = []

        estrategias = extrair_estrategias(
            rodada_dados
        )

        # =================================================
        # AVALIAÇÃO DA RODADA
        # =================================================

        for estrategia in estrategias:

            nome_estrategia = (
                obter_nome_estrategia(
                    estrategia
                )
            )

            comparacoes_estrategia = []

            jogadores = extrair_jogadores(
                estrategia
            )

            for jogador in jogadores:

                posicao = obter_posicao(
                    jogador
                )

                if posicao not in POSICOES:
                    continue

                calibracao = (
                    calibracoes_rodada[
                        posicao
                    ]
                )

                comparacao = comparar_jogador(
                    jogador,
                    calibracao
                )

                comparacao[
                    "_estrategia"
                ] = nome_estrategia

                comparacoes_estrategia.append(
                    comparacao
                )

                jogadores_rodada.append(
                    comparacao
                )

                if (
                    rodada
                    !=
                    RODADA_COLD_START
                ):

                    todos_jogadores_avaliados.append(
                        comparacao
                    )

            resumo_estrategia = (
                resumir_comparacoes(
                    comparacoes_estrategia
                )
            )

            estrategias_rodada.append({
                "nome":
                    nome_estrategia,

                "resumo":
                    resumo_estrategia,

                "jogadores":
                    comparacoes_estrategia
            })

        resumo_rodada = resumir_comparacoes(
            jogadores_rodada
        )

        # =================================================
        # VENCEDOR DA RODADA
        # =================================================

        if rodada != RODADA_COLD_START:

            mae_a = numero(
                resumo_rodada.get(
                    "maeA"
                ),
                0
            )

            mae_b = numero(
                resumo_rodada.get(
                    "maeB"
                ),
                0
            )

            if (
                resumo_rodada.get(
                    "amostras",
                    0
                ) == 0
            ):

                vencedor_rodada = (
                    "SEM_DADOS"
                )

            elif mae_b < mae_a:

                vencedor_rodada = "B"

                vitorias_rodada_b += 1

            elif mae_a < mae_b:

                vencedor_rodada = "A"

                vitorias_rodada_a += 1

            else:

                vencedor_rodada = "EMPATE"

                empates_rodada += 1

        else:

            vencedor_rodada = (
                "COLD_START"
            )

        resultados_rodadas.append({
            "rodada":
                rodada,

            "coldStart":
                rodada
                ==
                RODADA_COLD_START,

            "dadosUtilizadosSomenteAteRodada":
                rodada - 1,

            "semVazamentoFuturo":
                True,

            "quantidadeEstrategias":
                len(
                    estrategias
                ),

            "quantidadeJogadores":
                len(
                    jogadores_rodada
                ),

            "calibracoesUsadas":
                calibracoes_rodada,

            "resumo":
                resumo_rodada,

            "vencedor":
                vencedor_rodada,

            "estrategias":
                estrategias_rodada
        })

        print(
            f"Rodada {rodada:02d} | "
            f"Amostras: "
            f"{resumo_rodada.get('amostras', 0)} | "
            f"MAE A: "
            f"{resumo_rodada.get('maeA', 0)} | "
            f"MAE B: "
            f"{resumo_rodada.get('maeB', 0)} | "
            f"Melhora: "
            f"{resumo_rodada.get('melhoraPercentual', 0)}% | "
            f"Vencedor: "
            f"{vencedor_rodada}"
        )

        # =================================================
        # SOMENTE DEPOIS DA AVALIAÇÃO,
        # A RODADA ENTRA NO HISTÓRICO.
        # =================================================

        for estrategia in estrategias:

            nome_estrategia = (
                obter_nome_estrategia(
                    estrategia
                )
            )

            for jogador in extrair_jogadores(
                estrategia
            ):

                posicao = obter_posicao(
                    jogador
                )

                if posicao not in POSICOES:
                    continue

                adicionar_observacao(
                    historico,
                    posicao,
                    obter_projecao(
                        jogador
                    ),
                    obter_pontuacao_real(
                        jogador
                    ),
                    rodada,
                    nome_estrategia
                )

    # =====================================================
    # RESULTADOS GLOBAIS
    # =====================================================

    resumo_global = resumir_comparacoes(
        todos_jogadores_avaliados
    )

    resumo_posicoes = resumir_por_posicao(
        todos_jogadores_avaliados
    )

    resumo_estrategias = (
        resumir_por_estrategia(
            todos_jogadores_avaliados
        )
    )

    rodadas_avaliaveis = (
        vitorias_rodada_a
        +
        vitorias_rodada_b
        +
        empates_rodada
    )

    promocao = avaliar_promocao(
        resumo_global,
        resumo_posicoes,
        rodadas_avaliaveis,
        vitorias_rodada_a,
        vitorias_rodada_b,
        empates_rodada
    )

    reducao_vies = (
        abs(
            numero(
                resumo_global.get(
                    "viesA"
                ),
                0
            )
        )
        -
        abs(
            numero(
                resumo_global.get(
                    "viesB"
                ),
                0
            )
        )
    )

    # =====================================================
    # RESULTADO FINAL
    # =====================================================

    resultado = {
        "modelo":
            "backtest_ab_calibracao_v2",

        "descricao":
            (
                "Backtest A/B progressivo e sem "
                "vazamento futuro da calibração "
                "de projeções por posição."
            ),

        "modelos": {
            "A":
                "projecao_historica_original",

            "B":
                (
                    "projecao_historica_com_calibracao_"
                    "progressiva_por_posicao"
                )
        },

        "metodologia": {
            "progressivo":
                True,

            "semVazamentoFuturo":
                True,

            "regra":
                (
                    "A calibração utilizada na rodada R "
                    "é construída exclusivamente com "
                    "observações anteriores à rodada R."
                ),

            "rodadaColdStart":
                RODADA_COLD_START,

            "coldStartExcluidoDaDecisao":
                True,

            "amostraMinimaPosicao":
                AMOSTRA_MINIMA_POSICAO
        },

        "compatibilidadeDados": {
            "jogadoresAceitos": [
                "jogadores",
                "titulares",
                "atletas"
            ],

            "campoRealPrioritario":
                "pontuacaoReal",

            "camposReaisAlternativos": [
                "pontuacao_real",
                "pontos",
                "pontuacao",
                "real",
                "scoreReal"
            ]
        },

        "calibracaoGlobalReferencia": {
            "arquivoDisponivel":
                bool(
                    calibracao_referencia
                ),

            "utilizadaDiretamenteNoAB":
                False,

            "motivo":
                (
                    "A calibração de referência usa todo "
                    "o histórico e não pode ser aplicada "
                    "retroativamente sem causar data leakage."
                )
        },

        "analiseHistoricaDisponivel":
            bool(
                analise
            ),

        "quantidadeRodadasTotal":
            len(
                resultados_rodadas
            ),

        "quantidadeRodadasAvaliaveis":
            rodadas_avaliaveis,

        "quantidadeJogadoresAvaliados":
            len(
                todos_jogadores_avaliados
            ),

        "resumoGlobal":
            resumo_global,

        "reducaoAbsolutaVies":
            arredondar(
                reducao_vies
            ),

        "porPosicao":
            resumo_posicoes,

        "porEstrategia":
            resumo_estrategias,

        "rodadas": {
            "vitoriasA":
                vitorias_rodada_a,

            "vitoriasB":
                vitorias_rodada_b,

            "empates":
                empates_rodada,

            "taxaVitoriasA":
                percentual(
                    vitorias_rodada_a,
                    rodadas_avaliaveis
                ),

            "taxaVitoriasB":
                percentual(
                    vitorias_rodada_b,
                    rodadas_avaliaveis
                )
        },

        "decisaoPromocao":
            promocao,

        "resultadosRodada":
            resultados_rodadas,

        "seguranca": {
            "modeloOficialAlterado":
                False,

            "pesosOficiaisAlterados":
                False,

            "calibracaoPromovidaAutomaticamente":
                False,

            "necessitaValidacaoHumana":
                True
        }
    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    # =====================================================
    # LOG RESUMIDO
    # =====================================================

    print()

    print(
        "===================================================="
    )

    print(
        "RESULTADO FINAL DO BACKTEST A/B"
    )

    print(
        "===================================================="
    )

    print(
        "Rodadas avaliáveis:",
        rodadas_avaliaveis
    )

    print(
        "Jogadores avaliados:",
        len(
            todos_jogadores_avaliados
        )
    )

    print()

    print(
        "MODELO A - ORIGINAL"
    )

    print(
        "  MAE:",
        resumo_global.get(
            "maeA"
        )
    )

    print(
        "  Viés:",
        resumo_global.get(
            "viesA"
        )
    )

    print()

    print(
        "MODELO B - CALIBRADO"
    )

    print(
        "  MAE:",
        resumo_global.get(
            "maeB"
        )
    )

    print(
        "  Viés:",
        resumo_global.get(
            "viesB"
        )
    )

    print()

    print(
        "Melhora absoluta:",
        resumo_global.get(
            "melhoraAbsoluta"
        )
    )

    print(
        "Melhora percentual:",
        resumo_global.get(
            "melhoraPercentual"
        ),
        "%"
    )

    print(
        "Redução absoluta do viés:",
        arredondar(
            reducao_vies
        )
    )

    print()

    print(
        "===== RESULTADO POR RODADA ====="
    )

    print(
        "Vitórias A:",
        vitorias_rodada_a
    )

    print(
        "Vitórias B:",
        vitorias_rodada_b
    )

    print(
        "Empates:",
        empates_rodada
    )

    print(
        "Taxa de vitórias B:",
        percentual(
            vitorias_rodada_b,
            rodadas_avaliaveis
        ),
        "%"
    )

    print()

    print(
        "===== RESULTADO POR POSIÇÃO ====="
    )

    for posicao in POSICOES:

        dados = resumo_posicoes.get(
            posicao,
            {}
        )

        print(
            f"{posicao} | "
            f"Amostras: {dados.get('amostras', 0)} | "
            f"A: {dados.get('maeA', 0)} | "
            f"B: {dados.get('maeB', 0)} | "
            f"Melhora: "
            f"{dados.get('melhoraPercentual', 0)}% | "
            f"Vencedor: "
            f"{dados.get('vencedor')}"
        )

    print()

    print(
        "===== RESULTADO POR ESTRATÉGIA ====="
    )

    for (
        nome,
        dados
    ) in resumo_estrategias.items():

        print(
            f"{nome} | "
            f"Amostras: {dados.get('amostras', 0)} | "
            f"A: {dados.get('maeA', 0)} | "
            f"B: {dados.get('maeB', 0)} | "
            f"Melhora: "
            f"{dados.get('melhoraPercentual', 0)}% | "
            f"Vencedor: "
            f"{dados.get('vencedor')}"
        )

    print()

    print(
        "===== CRITÉRIOS DE PROMOÇÃO ====="
    )

    for criterio in promocao.get(
        "criterios",
        []
    ):

        simbolo = (
            "OK"
            if criterio.get(
                "aprovado"
            )
            else "FALHOU"
        )

        print(
            f"[{simbolo}] "
            f"{criterio.get('criterio')}"
        )

    print()

    print(
        "DECISÃO:",
        promocao.get(
            "decisao"
        )
    )

    print(
        "Promoção automática: NÃO"
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
