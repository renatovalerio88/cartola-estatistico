"""
=========================================================
CARTOLA ESTATÍSTICO
Comparação Científica das Estratégias Adaptativas

Versão:
comparacao_estrategias_adaptativas_v1

Entradas:
data/estrategia-adaptativa.json
data/estrategia-adaptativa-v2.json
data/simulacao-times.json

Saída:
data/comparacao-estrategias-adaptativas.json

Objetivo:
Comparar cientificamente:

- Estratégia Adaptativa V1
- Estratégia Adaptativa V2
- Conservador
- Equilibrado
- Agressivo
- Oráculo histórico

A comparação utiliza somente as rodadas comuns entre
V1 e V2 para impedir diferenças artificiais de amostra.

Nenhuma estratégia é promovida automaticamente.

=========================================================
"""

import json
import math

from pathlib import Path
from statistics import mean, median, pstdev


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

ARQUIVO_V1 = (
    PASTA_DATA /
    "estrategia-adaptativa.json"
)

ARQUIVO_V2 = (
    PASTA_DATA /
    "estrategia-adaptativa-v2.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "comparacao-estrategias-adaptativas.json"
)


ESTRATEGIAS_FIXAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo"
]


VERSAO_V1 = (
    "estrategia_adaptativa_v1"
)

VERSAO_V2 = (
    "estrategia_adaptativa_v2"
)

VERSAO_SAIDA = (
    "comparacao_estrategias_adaptativas_v1"
)


MINIMO_RODADAS = 10

TOLERANCIA = 0.001

LIMITE_EMPATE_PONTOS = 0.05

GANHO_MINIMO_PROMISSOR = 0.50

GANHO_MINIMO_FORTE = 1.00


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(
    caminho
):

    if not caminho.exists():

        return None

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
            f"[ERRO] Falha ao ler {caminho}: {erro}"
        )

        return None


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


def arredondar(
    valor,
    casas=2
):

    return round(
        numero(
            valor
        ),
        casas
    )


def percentual(
    parte,
    total
):

    parte = numero(
        parte
    )

    total = numero(
        total
    )

    if total == 0:

        return 0

    return (
        parte /
        total
    ) * 100


def media_segura(
    valores
):

    if not valores:

        return 0

    return mean(
        valores
    )


def mediana_segura(
    valores
):

    if not valores:

        return 0

    return median(
        valores
    )


def desvio_seguro(
    valores
):

    if len(
        valores
    ) < 2:

        return 0

    return pstdev(
        valores
    )


# ======================================================
# NORMALIZAÇÃO DOS ADAPTATIVOS
# ======================================================

def normalizar_adaptativo(
    dados
):

    resultado = {}

    if not isinstance(
        dados,
        dict
    ):

        return resultado

    for item in dados.get(
        "rodadas",
        []
    ):

        rodada = item.get(
            "rodada"
        )

        if rodada is None:

            continue

        rodada = int(
            numero(
                rodada
            )
        )

        resultado[
            rodada
        ] = {

            "estrategia":
                item.get(
                    "estrategiaEscolhida"
                ),

            "pontos":
                numero(
                    item.get(
                        "pontosAdaptativo"
                    )
                ),

            "melhorEstrategiaReal":
                item.get(
                    "melhorEstrategiaReal"
                ),

            "pontosOraculo":
                numero(
                    item.get(
                        "pontosMelhorEstrategia"
                    )
                )

        }

    return resultado


# ======================================================
# NORMALIZAÇÃO DA SIMULAÇÃO
# ======================================================

def normalizar_simulacao(
    dados
):

    resultado = {}

    if not isinstance(
        dados,
        dict
    ):

        return resultado

    for item in dados.get(
        "rodadas",
        []
    ):

        rodada = item.get(
            "rodada"
        )

        if rodada is None:

            continue

        rodada = int(
            numero(
                rodada
            )
        )

        estrategias = {}

        for estrategia in item.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if nome not in ESTRATEGIAS_FIXAS:

                continue

            estrategias[
                nome
            ] = numero(
                estrategia.get(
                    "pontuacaoComCapitao"
                )
            )

        if len(
            estrategias
        ) == len(
            ESTRATEGIAS_FIXAS
        ):

            resultado[
                rodada
            ] = estrategias

    return resultado


# ======================================================
# MÉTRICAS
# ======================================================

def calcular_metricas(
    valores
):

    if not valores:

        return {

            "rodadas": 0,
            "total": 0,
            "media": 0,
            "mediana": 0,
            "desvioPadrao": 0,
            "minimo": 0,
            "maximo": 0

        }

    return {

        "rodadas":
            len(
                valores
            ),

        "total":
            arredondar(
                sum(
                    valores
                )
            ),

        "media":
            arredondar(
                media_segura(
                    valores
                )
            ),

        "mediana":
            arredondar(
                mediana_segura(
                    valores
                )
            ),

        "desvioPadrao":
            arredondar(
                desvio_seguro(
                    valores
                )
            ),

        "minimo":
            arredondar(
                min(
                    valores
                )
            ),

        "maximo":
            arredondar(
                max(
                    valores
                )
            )

    }


# ======================================================
# COMPARAÇÃO PAREADA V1 x V2
# ======================================================

def comparar_pareado(
    valores_v1,
    valores_v2
):

    vitorias_v1 = 0
    vitorias_v2 = 0
    empates = 0

    diferencas = []

    for pontos_v1, pontos_v2 in zip(
        valores_v1,
        valores_v2
    ):

        diferenca = (
            pontos_v2 -
            pontos_v1
        )

        diferencas.append(
            diferenca
        )

        if (
            diferenca
            >
            LIMITE_EMPATE_PONTOS
        ):

            vitorias_v2 += 1

        elif (
            diferenca
            <
            -LIMITE_EMPATE_PONTOS
        ):

            vitorias_v1 += 1

        else:

            empates += 1

    total = len(
        diferencas
    )

    return {

        "rodadas":
            total,

        "vitoriasV1":
            vitorias_v1,

        "vitoriasV2":
            vitorias_v2,

        "empates":
            empates,

        "taxaVitoriasV1":
            arredondar(
                percentual(
                    vitorias_v1,
                    total
                )
            ),

        "taxaVitoriasV2":
            arredondar(
                percentual(
                    vitorias_v2,
                    total
                )
            ),

        "diferencaMediaV2MenosV1":
            arredondar(
                media_segura(
                    diferencas
                )
            ),

        "diferencaMedianaV2MenosV1":
            arredondar(
                mediana_segura(
                    diferencas
                )
            ),

        "desvioDiferencas":
            arredondar(
                desvio_seguro(
                    diferencas
                )
            ),

        "rodadasV2Melhor":
            sum(
                1
                for valor
                in diferencas
                if valor > 0
            ),

        "rodadasV1Melhor":
            sum(
                1
                for valor
                in diferencas
                if valor < 0
            )

    }


# ======================================================
# ESCOLHAS
# ======================================================

def contar_escolhas(
    dados,
    rodadas
):

    resultado = {

        nome: 0

        for nome
        in ESTRATEGIAS_FIXAS

    }

    invalidas = 0

    for rodada in rodadas:

        nome = dados[
            rodada
        ][
            "estrategia"
        ]

        if nome in resultado:

            resultado[
                nome
            ] += 1

        else:

            invalidas += 1

    return {

        "estrategias":
            resultado,

        "invalidas":
            invalidas

    }


# ======================================================
# ACERTO DO ORÁCULO
# ======================================================

def calcular_acertos_oraculo(
    dados,
    rodadas
):

    acertos = 0

    perdas = []

    for rodada in rodadas:

        pontos = numero(
            dados[
                rodada
            ][
                "pontos"
            ]
        )

        pontos_oraculo = numero(
            dados[
                rodada
            ][
                "pontosOraculo"
            ]
        )

        perda = (
            pontos_oraculo -
            pontos
        )

        perdas.append(
            perda
        )

        if abs(
            perda
        ) <= TOLERANCIA:

            acertos += 1

    return {

        "acertos":
            acertos,

        "taxaAcerto":
            arredondar(
                percentual(
                    acertos,
                    len(
                        rodadas
                    )
                )
            ),

        "perdaMediaParaOraculo":
            arredondar(
                media_segura(
                    perdas
                )
            ),

        "perdaMedianaParaOraculo":
            arredondar(
                mediana_segura(
                    perdas
                )
            )

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    print(
        "=============================================="
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "COMPARAÇÃO ADAPTATIVO V1 x V2"
    )

    print(
        "=============================================="
    )

    v1 = carregar_json(
        ARQUIVO_V1
    )

    v2 = carregar_json(
        ARQUIVO_V2
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    if not isinstance(
        v1,
        dict
    ):

        v1 = {}

    if not isinstance(
        v2,
        dict
    ):

        v2 = {}

    if not isinstance(
        simulacao,
        dict
    ):

        simulacao = {}

    # ==================================================
    # VERSÕES
    # ==================================================

    versao_v1_correta = (
        v1.get(
            "modelo"
        )
        ==
        VERSAO_V1
    )

    versao_v2_correta = (
        v2.get(
            "modelo"
        )
        ==
        VERSAO_V2
    )

    # ==================================================
    # NORMALIZAÇÃO
    # ==================================================

    dados_v1 = normalizar_adaptativo(
        v1
    )

    dados_v2 = normalizar_adaptativo(
        v2
    )

    dados_simulacao = normalizar_simulacao(
        simulacao
    )

    rodadas_comuns = sorted(

        set(
            dados_v1.keys()
        )

        &

        set(
            dados_v2.keys()
        )

        &

        set(
            dados_simulacao.keys()
        )

    )

    # ==================================================
    # DADOS PAREADOS
    # ==================================================

    pontos_v1 = [

        numero(
            dados_v1[
                rodada
            ][
                "pontos"
            ]
        )

        for rodada
        in rodadas_comuns

    ]

    pontos_v2 = [

        numero(
            dados_v2[
                rodada
            ][
                "pontos"
            ]
        )

        for rodada
        in rodadas_comuns

    ]

    pontos_fixas = {

        nome: [

            numero(
                dados_simulacao[
                    rodada
                ][
                    nome
                ]
            )

            for rodada
            in rodadas_comuns

        ]

        for nome
        in ESTRATEGIAS_FIXAS

    }

    pontos_oraculo = [

        max(
            dados_simulacao[
                rodada
            ].values()
        )

        for rodada
        in rodadas_comuns

    ]

    # ==================================================
    # MÉTRICAS
    # ==================================================

    metricas_v1 = calcular_metricas(
        pontos_v1
    )

    metricas_v2 = calcular_metricas(
        pontos_v2
    )

    metricas_fixas = {

        nome:
            calcular_metricas(
                valores
            )

        for nome, valores
        in pontos_fixas.items()

    }

    metricas_oraculo = calcular_metricas(
        pontos_oraculo
    )

    melhor_fixa = max(

        ESTRATEGIAS_FIXAS,

        key=lambda nome:
            numero(
                metricas_fixas[
                    nome
                ][
                    "media"
                ]
            )

    )

    # ==================================================
    # PAREADO
    # ==================================================

    pareado = comparar_pareado(
        pontos_v1,
        pontos_v2
    )

    # ==================================================
    # ESCOLHAS
    # ==================================================

    escolhas_v1 = contar_escolhas(
        dados_v1,
        rodadas_comuns
    )

    escolhas_v2 = contar_escolhas(
        dados_v2,
        rodadas_comuns
    )

    # ==================================================
    # ORÁCULO
    # ==================================================

    oraculo_v1 = calcular_acertos_oraculo(
        dados_v1,
        rodadas_comuns
    )

    oraculo_v2 = calcular_acertos_oraculo(
        dados_v2,
        rodadas_comuns
    )

    # ==================================================
    # GANHOS
    # ==================================================

    media_v1 = numero(
        metricas_v1[
            "media"
        ]
    )

    media_v2 = numero(
        metricas_v2[
            "media"
        ]
    )

    media_melhor_fixa = numero(
        metricas_fixas[
            melhor_fixa
        ][
            "media"
        ]
    )

    media_oraculo = numero(
        metricas_oraculo[
            "media"
        ]
    )

    ganho_v2_vs_v1 = (
        media_v2 -
        media_v1
    )

    ganho_v2_vs_v1_percentual = (
        percentual(
            ganho_v2_vs_v1,
            media_v1
        )
    )

    ganho_v2_vs_fixa = (
        media_v2 -
        media_melhor_fixa
    )

    ganho_v2_vs_fixa_percentual = (
        percentual(
            ganho_v2_vs_fixa,
            media_melhor_fixa
        )
    )

    ganho_v1_vs_fixa = (
        media_v1 -
        media_melhor_fixa
    )

    eficiencia_v1_oraculo = (
        percentual(
            media_v1,
            media_oraculo
        )
    )

    eficiencia_v2_oraculo = (
        percentual(
            media_v2,
            media_oraculo
        )
    )

    # ==================================================
    # ESTABILIDADE
    # ==================================================

    desvio_v1 = numero(
        metricas_v1[
            "desvioPadrao"
        ]
    )

    desvio_v2 = numero(
        metricas_v2[
            "desvioPadrao"
        ]
    )

    v2_mais_estavel = (
        desvio_v2
        <
        desvio_v1
    )

    # ==================================================
    # CRITÉRIOS
    # ==================================================

    amostra_suficiente = (
        len(
            rodadas_comuns
        )
        >=
        MINIMO_RODADAS
    )

    v2_supera_v1 = (
        ganho_v2_vs_v1
        >
        0
    )

    v2_supera_fixa = (
        ganho_v2_vs_fixa
        >
        0
    )

    v2_vitorias_pareadas = (
        pareado[
            "vitoriasV2"
        ]
        >
        pareado[
            "vitoriasV1"
        ]
    )

    v2_oraculo_melhor = (
        oraculo_v2[
            "perdaMediaParaOraculo"
        ]
        <
        oraculo_v1[
            "perdaMediaParaOraculo"
        ]
    )

    ganho_promissor = (
        ganho_v2_vs_v1
        >=
        GANHO_MINIMO_PROMISSOR
    )

    ganho_forte = (
        ganho_v2_vs_v1
        >=
        GANHO_MINIMO_FORTE
    )

    # ==================================================
    # DECISÃO
    # ==================================================

    if not (
        versao_v1_correta
        and
        versao_v2_correta
        and
        amostra_suficiente
    ):

        decisao = (
            "COMPARACAO_INCONCLUSIVA"
        )

    elif (
        ganho_forte
        and
        v2_supera_fixa
        and
        v2_vitorias_pareadas
        and
        v2_oraculo_melhor
    ):

        decisao = (
            "V2_FORTEMENTE_SUPERIOR"
        )

    elif (
        ganho_promissor
        and
        v2_supera_fixa
        and
        v2_vitorias_pareadas
    ):

        decisao = (
            "V2_SUPERIOR"
        )

    elif (
        v2_supera_v1
        and
        v2_supera_fixa
    ):

        decisao = (
            "V2_PROMISSOR"
        )

    elif (
        abs(
            ganho_v2_vs_v1
        )
        <=
        LIMITE_EMPATE_PONTOS
    ):

        decisao = (
            "V1_V2_EQUIVALENTES"
        )

    elif (
        ganho_v2_vs_v1
        < 0
    ):

        decisao = (
            "V1_SUPERIOR_A_V2"
        )

    else:

        decisao = (
            "MANTER_TESTES"
        )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            VERSAO_SAIDA,

        "descricao":
            (
                "Comparação pareada entre as estratégias "
                "adaptativas V1 e V2, estratégias fixas "
                "e oráculo histórico."
            ),

        "amostra": {

            "rodadasComuns":
                len(
                    rodadas_comuns
                ),

            "rodadas":
                rodadas_comuns,

            "amostraMinima":
                MINIMO_RODADAS,

            "amostraSuficiente":
                amostra_suficiente

        },

        "validacaoEntradas": {

            "versaoV1Correta":
                versao_v1_correta,

            "versaoV2Correta":
                versao_v2_correta,

            "modeloV1":
                v1.get(
                    "modelo"
                ),

            "modeloV2":
                v2.get(
                    "modelo"
                )

        },

        "metricas": {

            "adaptativoV1":
                metricas_v1,

            "adaptativoV2":
                metricas_v2,

            "estrategiasFixas":
                metricas_fixas,

            "melhorEstrategiaFixa":
                melhor_fixa,

            "oraculo":
                metricas_oraculo

        },

        "comparacaoPareadaV1V2":
            pareado,

        "escolhas": {

            "v1":
                escolhas_v1,

            "v2":
                escolhas_v2

        },

        "oraculo": {

            "v1":
                oraculo_v1,

            "v2":
                oraculo_v2,

            "eficienciaV1Percentual":
                arredondar(
                    eficiencia_v1_oraculo
                ),

            "eficienciaV2Percentual":
                arredondar(
                    eficiencia_v2_oraculo
                )

        },

        "ganhos": {

            "v2VsV1": {

                "pontosPorRodada":
                    arredondar(
                        ganho_v2_vs_v1
                    ),

                "percentual":
                    arredondar(
                        ganho_v2_vs_v1_percentual
                    )

            },

            "v2VsMelhorFixa": {

                "estrategia":
                    melhor_fixa,

                "pontosPorRodada":
                    arredondar(
                        ganho_v2_vs_fixa
                    ),

                "percentual":
                    arredondar(
                        ganho_v2_vs_fixa_percentual
                    )

            },

            "v1VsMelhorFixa": {

                "estrategia":
                    melhor_fixa,

                "pontosPorRodada":
                    arredondar(
                        ganho_v1_vs_fixa
                    )

            }

        },

        "estabilidade": {

            "desvioPadraoV1":
                arredondar(
                    desvio_v1
                ),

            "desvioPadraoV2":
                arredondar(
                    desvio_v2
                ),

            "v2MaisEstavel":
                v2_mais_estavel

        },

        "criterios": {

            "amostraSuficiente":
                amostra_suficiente,

            "v2SuperaV1":
                v2_supera_v1,

            "v2SuperaMelhorFixa":
                v2_supera_fixa,

            "v2TemMaisVitoriasPareadas":
                v2_vitorias_pareadas,

            "v2MaisProximoOraculo":
                v2_oraculo_melhor,

            "v2MaisEstavel":
                v2_mais_estavel,

            "ganhoMinimoPromissor":
                ganho_promissor,

            "ganhoForte":
                ganho_forte

        },

        "decisao": {

            "decisao":
                decisao,

            "promoverV2":
                False,

            "promocaoAutomatica":
                False,

            "observacao":
                (
                    "Resultado experimental. A comparação "
                    "não altera nenhuma estratégia oficial."
                )

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraEstrategiasOficiais":
                False,

            "alteraPesos":
                False,

            "promocaoAutomatica":
                False

        }

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    # ==================================================
    # LOG
    # ==================================================

    print()

    print(
        "Rodadas comuns:",
        len(
            rodadas_comuns
        )
    )

    print()

    print(
        "MÉDIAS"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Adaptativo V1:",
        arredondar(
            media_v1
        )
    )

    print(
        "Adaptativo V2:",
        arredondar(
            media_v2
        )
    )

    print(
        melhor_fixa + ":",
        arredondar(
            media_melhor_fixa
        )
    )

    print(
        "Oráculo:",
        arredondar(
            media_oraculo
        )
    )

    print()

    print(
        "V2 x V1"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Ganho V2:",
        arredondar(
            ganho_v2_vs_v1
        ),
        "pontos/rodada"
    )

    print(
        "Ganho percentual:",
        arredondar(
            ganho_v2_vs_v1_percentual
        ),
        "%"
    )

    print(
        "Vitórias V1:",
        pareado[
            "vitoriasV1"
        ]
    )

    print(
        "Vitórias V2:",
        pareado[
            "vitoriasV2"
        ]
    )

    print(
        "Empates:",
        pareado[
            "empates"
        ]
    )

    print()

    print(
        "V2 x MELHOR FIXA"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Melhor fixa:",
        melhor_fixa
    )

    print(
        "Ganho:",
        arredondar(
            ganho_v2_vs_fixa
        ),
        "pontos/rodada"
    )

    print(
        "Ganho percentual:",
        arredondar(
            ganho_v2_vs_fixa_percentual
        ),
        "%"
    )

    print()

    print(
        "ORÁCULO"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Eficiência V1:",
        arredondar(
            eficiencia_v1_oraculo
        ),
        "%"
    )

    print(
        "Eficiência V2:",
        arredondar(
            eficiencia_v2_oraculo
        ),
        "%"
    )

    print()

    print(
        "ESTABILIDADE"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Desvio V1:",
        arredondar(
            desvio_v1
        )
    )

    print(
        "Desvio V2:",
        arredondar(
            desvio_v2
        )
    )

    print(
        "V2 mais estável:",
        (
            "SIM"
            if v2_mais_estavel
            else "NÃO"
        )
    )

    print()

    print(
        "DECISÃO:",
        decisao
    )

    print(
        "Promoção automática: NÃO"
    )

    print()

    print(
        "Arquivo:",
        ARQUIVO_SAIDA
    )

    print(
        "=============================================="
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
