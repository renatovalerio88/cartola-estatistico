"""
=========================================================
CARTOLA ESTATÍSTICO
Auditoria da Comparação das Estratégias Adaptativas

Versão:
auditoria_comparacao_adaptativas_v1

Entradas:
data/estrategia-adaptativa.json
data/estrategia-adaptativa-v2.json
data/comparacao-estrategias-adaptativas.json
data/simulacao-times.json

Saída:
data/auditoria-comparacao-adaptativas.json

Objetivo:
Auditar cientificamente a comparação V1 x V2 antes
de qualquer decisão sobre evolução da estratégia.

Validações:

1. arquivos existem;
2. versões são compatíveis;
3. mesmas rodadas foram utilizadas;
4. pontuações V1 conferem;
5. pontuações V2 conferem;
6. pontuações das estratégias fixas conferem;
7. oráculo confere;
8. médias e totais conferem;
9. comparação pareada confere;
10. ganhos V2 x V1 conferem;
11. ganhos V2 x melhor fixa conferem;
12. estabilidade confere;
13. eficiência contra oráculo confere;
14. decisão publicada é reproduzível;
15. promoção automática continua desativada.

Nenhuma estratégia oficial é alterada.

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

ARQUIVO_COMPARACAO = (
    PASTA_DATA /
    "comparacao-estrategias-adaptativas.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "auditoria-comparacao-adaptativas.json"
)


MODELO_V1 = (
    "estrategia_adaptativa_v1"
)

MODELO_V2 = (
    "estrategia_adaptativa_v2"
)

MODELO_COMPARACAO = (
    "comparacao_estrategias_adaptativas_v1"
)

MODELO_AUDITORIA = (
    "auditoria_comparacao_adaptativas_v1"
)


ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo"
]


MINIMO_RODADAS = 10

TOLERANCIA = 0.02

TOLERANCIA_EMPATE = 0.05

GANHO_MINIMO_PROMISSOR = 0.50

GANHO_MINIMO_FORTE = 1.00


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

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


def aproximadamente_igual(
    a,
    b,
    tolerancia=TOLERANCIA
):

    return abs(
        numero(a) -
        numero(b)
    ) <= tolerancia


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


def criar_teste(
    nome,
    passou,
    critico=True,
    detalhes=None
):

    return {

        "nome":
            nome,

        "passou":
            bool(
                passou
            ),

        "nivel":
            (
                "CRITICO"
                if critico
                else "ALERTA"
            ),

        "detalhes":
            detalhes

    }


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

        estrategias = {}

        for estrategia in item.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if nome not in ESTRATEGIAS:

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
            ESTRATEGIAS
        ):

            resultado[
                int(
                    numero(
                        rodada
                    )
                )
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


def metricas_conferem(
    esperado,
    encontrado
):

    campos = [

        "rodadas",
        "total",
        "media",
        "mediana",
        "desvioPadrao",
        "minimo",
        "maximo"

    ]

    falhas = []

    for campo in campos:

        if not aproximadamente_igual(

            esperado.get(
                campo
            ),

            encontrado.get(
                campo
            )

        ):

            falhas.append({

                "campo":
                    campo,

                "esperado":
                    esperado.get(
                        campo
                    ),

                "encontrado":
                    encontrado.get(
                        campo
                    )

            })

    return (
        len(
            falhas
        ) == 0,
        falhas
    )


# ======================================================
# COMPARAÇÃO PAREADA
# ======================================================

def calcular_pareado(
    pontos_v1,
    pontos_v2
):

    vitorias_v1 = 0
    vitorias_v2 = 0
    empates = 0

    diferencas = []

    for a, b in zip(
        pontos_v1,
        pontos_v2
    ):

        diferenca = (
            b -
            a
        )

        diferencas.append(
            diferenca
        )

        if (
            diferenca
            >
            TOLERANCIA_EMPATE
        ):

            vitorias_v2 += 1

        elif (
            diferenca
            <
            -TOLERANCIA_EMPATE
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
# COMPARAÇÃO DE DICIONÁRIOS NUMÉRICOS
# ======================================================

def comparar_campos(
    esperado,
    encontrado,
    campos
):

    falhas = []

    for campo in campos:

        valor_esperado = esperado.get(
            campo
        )

        valor_encontrado = encontrado.get(
            campo
        )

        if not aproximadamente_igual(
            valor_esperado,
            valor_encontrado
        ):

            falhas.append({

                "campo":
                    campo,

                "esperado":
                    valor_esperado,

                "encontrado":
                    valor_encontrado

            })

    return falhas


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
        "AUDITORIA COMPARAÇÃO V1 x V2"
    )

    print(
        "=============================================="
    )

    testes = []

    # ==================================================
    # CARREGAMENTO
    # ==================================================

    v1 = carregar_json(
        ARQUIVO_V1
    )

    v2 = carregar_json(
        ARQUIVO_V2
    )

    comparacao = carregar_json(
        ARQUIVO_COMPARACAO
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    arquivos = {

        "v1":
            isinstance(
                v1,
                dict
            ),

        "v2":
            isinstance(
                v2,
                dict
            ),

        "comparacao":
            isinstance(
                comparacao,
                dict
            ),

        "simulacao":
            isinstance(
                simulacao,
                dict
            )

    }

    for nome, existe in arquivos.items():

        testes.append(
            criar_teste(
                f"arquivo_{nome}_existe",
                existe,
                True
            )
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
        comparacao,
        dict
    ):

        comparacao = {}

    if not isinstance(
        simulacao,
        dict
    ):

        simulacao = {}

    # ==================================================
    # VERSÕES
    # ==================================================

    versoes = {

        "v1":
            (
                v1.get(
                    "modelo"
                )
                ==
                MODELO_V1
            ),

        "v2":
            (
                v2.get(
                    "modelo"
                )
                ==
                MODELO_V2
            ),

        "comparacao":
            (
                comparacao.get(
                    "modelo"
                )
                ==
                MODELO_COMPARACAO
            )

    }

    for nome, correta in versoes.items():

        testes.append(
            criar_teste(
                f"versao_{nome}",
                correta,
                True
            )
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

    rodadas_esperadas = sorted(

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

    rodadas_publicadas = (
        comparacao.get(
            "amostra",
            {}
        ).get(
            "rodadas",
            []
        )
    )

    rodadas_publicadas = [

        int(
            numero(
                rodada
            )
        )

        for rodada
        in rodadas_publicadas

    ]

    testes.append(
        criar_teste(
            "rodadas_comuns_consistentes",
            rodadas_publicadas
            ==
            rodadas_esperadas,
            True,
            {
                "esperadas":
                    rodadas_esperadas,

                "publicadas":
                    rodadas_publicadas
            }
        )
    )

    quantidade_publicada = int(
        numero(
            comparacao.get(
                "amostra",
                {}
            ).get(
                "rodadasComuns"
            )
        )
    )

    testes.append(
        criar_teste(
            "quantidade_rodadas_consistente",
            quantidade_publicada
            ==
            len(
                rodadas_esperadas
            ),
            True,
            {
                "esperado":
                    len(
                        rodadas_esperadas
                    ),

                "encontrado":
                    quantidade_publicada
            }
        )
    )

    testes.append(
        criar_teste(
            "amostra_minima",
            len(
                rodadas_esperadas
            )
            >=
            MINIMO_RODADAS,
            True
        )
    )

    # ==================================================
    # PONTUAÇÕES V1 E V2 CONTRA SIMULAÇÃO
    # ==================================================

    falhas_v1 = []
    falhas_v2 = []

    for rodada in rodadas_esperadas:

        estrategia_v1 = (
            dados_v1[
                rodada
            ][
                "estrategia"
            ]
        )

        estrategia_v2 = (
            dados_v2[
                rodada
            ][
                "estrategia"
            ]
        )

        if (
            estrategia_v1
            not in
            ESTRATEGIAS
        ):

            falhas_v1.append({

                "rodada":
                    rodada,

                "motivo":
                    "estrategia_invalida",

                "estrategia":
                    estrategia_v1

            })

        else:

            esperado_v1 = numero(
                dados_simulacao[
                    rodada
                ][
                    estrategia_v1
                ]
            )

            encontrado_v1 = numero(
                dados_v1[
                    rodada
                ][
                    "pontos"
                ]
            )

            if not aproximadamente_igual(
                esperado_v1,
                encontrado_v1
            ):

                falhas_v1.append({

                    "rodada":
                        rodada,

                    "esperado":
                        arredondar(
                            esperado_v1
                        ),

                    "encontrado":
                        arredondar(
                            encontrado_v1
                        )

                })

        if (
            estrategia_v2
            not in
            ESTRATEGIAS
        ):

            falhas_v2.append({

                "rodada":
                    rodada,

                "motivo":
                    "estrategia_invalida",

                "estrategia":
                    estrategia_v2

            })

        else:

            esperado_v2 = numero(
                dados_simulacao[
                    rodada
                ][
                    estrategia_v2
                ]
            )

            encontrado_v2 = numero(
                dados_v2[
                    rodada
                ][
                    "pontos"
                ]
            )

            if not aproximadamente_igual(
                esperado_v2,
                encontrado_v2
            ):

                falhas_v2.append({

                    "rodada":
                        rodada,

                    "esperado":
                        arredondar(
                            esperado_v2
                        ),

                    "encontrado":
                        arredondar(
                            encontrado_v2
                        )

                })

    testes.append(
        criar_teste(
            "pontuacoes_v1_consistentes",
            len(
                falhas_v1
            ) == 0,
            True,
            falhas_v1
        )
    )

    testes.append(
        criar_teste(
            "pontuacoes_v2_consistentes",
            len(
                falhas_v2
            ) == 0,
            True,
            falhas_v2
        )
    )

    # ==================================================
    # RECONSTRUÇÃO DAS SÉRIES
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
        in rodadas_esperadas

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
        in rodadas_esperadas

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
            in rodadas_esperadas

        ]

        for nome
        in ESTRATEGIAS

    }

    pontos_oraculo = [

        max(
            dados_simulacao[
                rodada
            ].values()
        )

        for rodada
        in rodadas_esperadas

    ]

    # ==================================================
    # MÉTRICAS PUBLICADAS
    # ==================================================

    metricas_publicadas = comparacao.get(
        "metricas",
        {}
    )

    esperado_v1 = calcular_metricas(
        pontos_v1
    )

    encontrado_v1 = metricas_publicadas.get(
        "adaptativoV1",
        {}
    )

    ok, falhas = metricas_conferem(
        esperado_v1,
        encontrado_v1
    )

    testes.append(
        criar_teste(
            "metricas_v1_consistentes",
            ok,
            True,
            falhas
        )
    )

    esperado_v2 = calcular_metricas(
        pontos_v2
    )

    encontrado_v2 = metricas_publicadas.get(
        "adaptativoV2",
        {}
    )

    ok, falhas = metricas_conferem(
        esperado_v2,
        encontrado_v2
    )

    testes.append(
        criar_teste(
            "metricas_v2_consistentes",
            ok,
            True,
            falhas
        )
    )

    metricas_fixas_calculadas = {}

    falhas_fixas = []

    for nome in ESTRATEGIAS:

        esperado = calcular_metricas(
            pontos_fixas[
                nome
            ]
        )

        metricas_fixas_calculadas[
            nome
        ] = esperado

        encontrado = (
            metricas_publicadas
            .get(
                "estrategiasFixas",
                {}
            )
            .get(
                nome,
                {}
            )
        )

        ok, falhas = metricas_conferem(
            esperado,
            encontrado
        )

        if not ok:

            falhas_fixas.append({

                "estrategia":
                    nome,

                "falhas":
                    falhas

            })

    testes.append(
        criar_teste(
            "metricas_fixas_consistentes",
            len(
                falhas_fixas
            ) == 0,
            True,
            falhas_fixas
        )
    )

    esperado_oraculo = calcular_metricas(
        pontos_oraculo
    )

    encontrado_oraculo = (
        metricas_publicadas.get(
            "oraculo",
            {}
        )
    )

    ok, falhas = metricas_conferem(
        esperado_oraculo,
        encontrado_oraculo
    )

    testes.append(
        criar_teste(
            "metricas_oraculo_consistentes",
            ok,
            True,
            falhas
        )
    )

    # ==================================================
    # MELHOR ESTRATÉGIA FIXA
    # ==================================================

    melhor_fixa = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                metricas_fixas_calculadas[
                    nome
                ][
                    "media"
                ]
            )

    )

    melhor_fixa_publicada = (
        metricas_publicadas.get(
            "melhorEstrategiaFixa"
        )
    )

    testes.append(
        criar_teste(
            "melhor_fixa_consistente",
            melhor_fixa
            ==
            melhor_fixa_publicada,
            True,
            {
                "esperada":
                    melhor_fixa,

                "publicada":
                    melhor_fixa_publicada
            }
        )
    )

    # ==================================================
    # COMPARAÇÃO PAREADA
    # ==================================================

    pareado_esperado = calcular_pareado(
        pontos_v1,
        pontos_v2
    )

    pareado_publicado = comparacao.get(
        "comparacaoPareadaV1V2",
        {}
    )

    campos_pareados = [

        "rodadas",
        "vitoriasV1",
        "vitoriasV2",
        "empates",
        "taxaVitoriasV1",
        "taxaVitoriasV2",
        "diferencaMediaV2MenosV1",
        "diferencaMedianaV2MenosV1",
        "desvioDiferencas",
        "rodadasV2Melhor",
        "rodadasV1Melhor"

    ]

    falhas_pareado = comparar_campos(
        pareado_esperado,
        pareado_publicado,
        campos_pareados
    )

    testes.append(
        criar_teste(
            "comparacao_pareada_consistente",
            len(
                falhas_pareado
            ) == 0,
            True,
            falhas_pareado
        )
    )

    # ==================================================
    # GANHOS
    # ==================================================

    media_v1 = numero(
        esperado_v1[
            "media"
        ]
    )

    media_v2 = numero(
        esperado_v2[
            "media"
        ]
    )

    media_fixa = numero(
        metricas_fixas_calculadas[
            melhor_fixa
        ][
            "media"
        ]
    )

    media_oraculo = numero(
        esperado_oraculo[
            "media"
        ]
    )

    ganho_v2_v1 = (
        media_v2 -
        media_v1
    )

    ganho_v2_v1_pct = percentual(
        ganho_v2_v1,
        media_v1
    )

    ganho_v2_fixa = (
        media_v2 -
        media_fixa
    )

    ganho_v2_fixa_pct = percentual(
        ganho_v2_fixa,
        media_fixa
    )

    ganho_v1_fixa = (
        media_v1 -
        media_fixa
    )

    ganhos_publicados = comparacao.get(
        "ganhos",
        {}
    )

    falhas_ganhos = []

    v2_v1_publicado = ganhos_publicados.get(
        "v2VsV1",
        {}
    )

    if not aproximadamente_igual(
        v2_v1_publicado.get(
            "pontosPorRodada"
        ),
        ganho_v2_v1
    ):

        falhas_ganhos.append(
            "v2VsV1.pontosPorRodada"
        )

    if not aproximadamente_igual(
        v2_v1_publicado.get(
            "percentual"
        ),
        ganho_v2_v1_pct
    ):

        falhas_ganhos.append(
            "v2VsV1.percentual"
        )

    v2_fixa_publicado = ganhos_publicados.get(
        "v2VsMelhorFixa",
        {}
    )

    if (
        v2_fixa_publicado.get(
            "estrategia"
        )
        !=
        melhor_fixa
    ):

        falhas_ganhos.append(
            "v2VsMelhorFixa.estrategia"
        )

    if not aproximadamente_igual(
        v2_fixa_publicado.get(
            "pontosPorRodada"
        ),
        ganho_v2_fixa
    ):

        falhas_ganhos.append(
            "v2VsMelhorFixa.pontosPorRodada"
        )

    if not aproximadamente_igual(
        v2_fixa_publicado.get(
            "percentual"
        ),
        ganho_v2_fixa_pct
    ):

        falhas_ganhos.append(
            "v2VsMelhorFixa.percentual"
        )

    v1_fixa_publicado = ganhos_publicados.get(
        "v1VsMelhorFixa",
        {}
    )

    if not aproximadamente_igual(
        v1_fixa_publicado.get(
            "pontosPorRodada"
        ),
        ganho_v1_fixa
    ):

        falhas_ganhos.append(
            "v1VsMelhorFixa.pontosPorRodada"
        )

    testes.append(
        criar_teste(
            "ganhos_consistentes",
            len(
                falhas_ganhos
            ) == 0,
            True,
            falhas_ganhos
        )
    )

    # ==================================================
    # ESTABILIDADE
    # ==================================================

    desvio_v1 = numero(
        esperado_v1[
            "desvioPadrao"
        ]
    )

    desvio_v2 = numero(
        esperado_v2[
            "desvioPadrao"
        ]
    )

    v2_mais_estavel = (
        desvio_v2
        <
        desvio_v1
    )

    estabilidade_publicada = comparacao.get(
        "estabilidade",
        {}
    )

    estabilidade_ok = (

        aproximadamente_igual(
            estabilidade_publicada.get(
                "desvioPadraoV1"
            ),
            desvio_v1
        )

        and

        aproximadamente_igual(
            estabilidade_publicada.get(
                "desvioPadraoV2"
            ),
            desvio_v2
        )

        and

        (
            estabilidade_publicada.get(
                "v2MaisEstavel"
            )
            is v2_mais_estavel
        )

    )

    testes.append(
        criar_teste(
            "estabilidade_consistente",
            estabilidade_ok,
            True
        )
    )

    # ==================================================
    # EFICIÊNCIA CONTRA ORÁCULO
    # ==================================================

    eficiencia_v1 = percentual(
        media_v1,
        media_oraculo
    )

    eficiencia_v2 = percentual(
        media_v2,
        media_oraculo
    )

    oraculo_publicado = comparacao.get(
        "oraculo",
        {}
    )

    eficiencia_ok = (

        aproximadamente_igual(
            oraculo_publicado.get(
                "eficienciaV1Percentual"
            ),
            eficiencia_v1
        )

        and

        aproximadamente_igual(
            oraculo_publicado.get(
                "eficienciaV2Percentual"
            ),
            eficiencia_v2
        )

    )

    testes.append(
        criar_teste(
            "eficiencia_oraculo_consistente",
            eficiencia_ok,
            True
        )
    )

    # ==================================================
    # REPRODUÇÃO DA DECISÃO
    # ==================================================

    amostra_suficiente = (
        len(
            rodadas_esperadas
        )
        >=
        MINIMO_RODADAS
    )

    v2_supera_v1 = (
        ganho_v2_v1 > 0
    )

    v2_supera_fixa = (
        ganho_v2_fixa > 0
    )

    v2_vitorias_pareadas = (

        pareado_esperado[
            "vitoriasV2"
        ]
        >
        pareado_esperado[
            "vitoriasV1"
        ]

    )

    perdas_v1 = [

        oraculo -
        v1_pontos

        for oraculo, v1_pontos
        in zip(
            pontos_oraculo,
            pontos_v1
        )

    ]

    perdas_v2 = [

        oraculo -
        v2_pontos

        for oraculo, v2_pontos
        in zip(
            pontos_oraculo,
            pontos_v2
        )

    ]

    perda_media_v1 = media_segura(
        perdas_v1
    )

    perda_media_v2 = media_segura(
        perdas_v2
    )

    v2_oraculo_melhor = (
        perda_media_v2
        <
        perda_media_v1
    )

    ganho_promissor = (
        ganho_v2_v1
        >=
        GANHO_MINIMO_PROMISSOR
    )

    ganho_forte = (
        ganho_v2_v1
        >=
        GANHO_MINIMO_FORTE
    )

    entradas_validas = (

        versoes[
            "v1"
        ]

        and

        versoes[
            "v2"
        ]

        and

        amostra_suficiente

    )

    if not entradas_validas:

        decisao_esperada = (
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

        decisao_esperada = (
            "V2_FORTEMENTE_SUPERIOR"
        )

    elif (
        ganho_promissor
        and
        v2_supera_fixa
        and
        v2_vitorias_pareadas
    ):

        decisao_esperada = (
            "V2_SUPERIOR"
        )

    elif (
        v2_supera_v1
        and
        v2_supera_fixa
    ):

        decisao_esperada = (
            "V2_PROMISSOR"
        )

    elif (
        abs(
            ganho_v2_v1
        )
        <=
        TOLERANCIA_EMPATE
    ):

        decisao_esperada = (
            "V1_V2_EQUIVALENTES"
        )

    elif ganho_v2_v1 < 0:

        decisao_esperada = (
            "V1_SUPERIOR_A_V2"
        )

    else:

        decisao_esperada = (
            "MANTER_TESTES"
        )

    decisao_publicada = (
        comparacao.get(
            "decisao",
            {}
        ).get(
            "decisao"
        )
    )

    testes.append(
        criar_teste(
            "decisao_reproduzivel",
            decisao_esperada
            ==
            decisao_publicada,
            True,
            {
                "esperada":
                    decisao_esperada,

                "publicada":
                    decisao_publicada
            }
        )
    )

    # ==================================================
    # SEGURANÇA
    # ==================================================

    seguranca = comparacao.get(
        "seguranca",
        {}
    )

    decisao_obj = comparacao.get(
        "decisao",
        {}
    )

    seguranca_ok = (

        seguranca.get(
            "alteraModeloOficial"
        )
        is False

        and

        seguranca.get(
            "alteraEstrategiasOficiais"
        )
        is False

        and

        seguranca.get(
            "alteraPesos"
        )
        is False

        and

        seguranca.get(
            "promocaoAutomatica"
        )
        is False

        and

        decisao_obj.get(
            "promoverV2"
        )
        is False

        and

        decisao_obj.get(
            "promocaoAutomatica"
        )
        is False

    )

    testes.append(
        criar_teste(
            "seguranca_promocao",
            seguranca_ok,
            True
        )
    )

    # ==================================================
    # RESULTADO FINAL
    # ==================================================

    falhas_criticas = [

        teste

        for teste in testes

        if (
            teste[
                "nivel"
            ]
            ==
            "CRITICO"

            and

            not teste[
                "passou"
            ]
        )

    ]

    alertas = [

        teste

        for teste in testes

        if (
            teste[
                "nivel"
            ]
            ==
            "ALERTA"

            and

            not teste[
                "passou"
            ]
        )

    ]

    aprovados = sum(

        1

        for teste in testes

        if teste[
            "passou"
        ]

    )

    score = percentual(
        aprovados,
        len(
            testes
        )
    )

    if falhas_criticas:

        decisao_auditoria = (
            "COMPARACAO_REPROVADA"
        )

    elif alertas:

        decisao_auditoria = (
            "COMPARACAO_VALIDADA_COM_ALERTAS"
        )

    else:

        decisao_auditoria = (
            "COMPARACAO_VALIDADA"
        )

    resultado = {

        "modelo":
            MODELO_AUDITORIA,

        "descricao":
            (
                "Auditoria científica da comparação "
                "pareada entre Adaptativo V1 e V2."
            ),

        "resumo": {

            "rodadasAuditadas":
                len(
                    rodadas_esperadas
                ),

            "testes":
                len(
                    testes
                ),

            "testesAprovados":
                aprovados,

            "falhasCriticas":
                len(
                    falhas_criticas
                ),

            "alertas":
                len(
                    alertas
                ),

            "scoreQualidadePercentual":
                arredondar(
                    score
                ),

            "mediaV1":
                arredondar(
                    media_v1
                ),

            "mediaV2":
                arredondar(
                    media_v2
                ),

            "melhorEstrategiaFixa":
                melhor_fixa,

            "mediaMelhorFixa":
                arredondar(
                    media_fixa
                ),

            "ganhoV2VsV1":
                arredondar(
                    ganho_v2_v1
                ),

            "ganhoV2VsMelhorFixa":
                arredondar(
                    ganho_v2_fixa
                ),

            "eficienciaV1Oraculo":
                arredondar(
                    eficiencia_v1
                ),

            "eficienciaV2Oraculo":
                arredondar(
                    eficiencia_v2
                )

        },

        "testes":
            testes,

        "falhasCriticas":
            falhas_criticas,

        "alertas":
            alertas,

        "decisaoComparacao": {

            "publicada":
                decisao_publicada,

            "recalculada":
                decisao_esperada

        },

        "decisao": {

            "decisao":
                decisao_auditoria,

            "validado":
                len(
                    falhas_criticas
                ) == 0,

            "promoverV2":
                False,

            "promocaoAutomatica":
                False

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraEstrategiasOficiais":
                False,

            "alteraPesos":
                False,

            "alteraProjecoes":
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
        "Rodadas auditadas:",
        len(
            rodadas_esperadas
        )
    )

    print(
        "Testes:",
        len(
            testes
        )
    )

    print()

    print(
        "TESTES"
    )

    print(
        "----------------------------------------------"
    )

    for teste in testes:

        status = (
            "OK"
            if teste[
                "passou"
            ]
            else "FALHA"
        )

        print(

            f"[{status}] "
            f"{teste['nome']} "
            f"({teste['nivel']})"

        )

    print()

    print(
        "Score de qualidade:",
        arredondar(
            score
        ),
        "%"
    )

    print(
        "Falhas críticas:",
        len(
            falhas_criticas
        )
    )

    print(
        "Alertas:",
        len(
            alertas
        )
    )

    print()

    print(
        "RESULTADOS"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "V1:",
        arredondar(
            media_v1
        )
    )

    print(
        "V2:",
        arredondar(
            media_v2
        )
    )

    print(
        "Melhor fixa:",
        melhor_fixa,
        "|",
        arredondar(
            media_fixa
        )
    )

    print(
        "Ganho V2 x V1:",
        arredondar(
            ganho_v2_v1
        )
    )

    print(
        "Ganho V2 x fixa:",
        arredondar(
            ganho_v2_fixa
        )
    )

    print()

    print(
        "Decisão comparação:",
        decisao_esperada
    )

    print(
        "DECISÃO AUDITORIA:",
        decisao_auditoria
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
