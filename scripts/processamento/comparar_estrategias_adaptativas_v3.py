"""
=========================================================
CARTOLA ESTATÍSTICO
COMPARAÇÃO CIENTÍFICA
ESTRATÉGIAS ADAPTATIVAS V1 x V2 x V3

Versão:
comparacao_estrategias_adaptativas_v3

Entradas:
data/estrategia-adaptativa.json
data/estrategia-adaptativa-v2.json
data/estrategia-adaptativa-v3.json
data/simulacao-times.json

Saída:
data/comparacao-estrategias-adaptativas-v3.json

Objetivo:
Comparar cientificamente as três versões da estratégia
adaptativa contra:

- elas próprias;
- estratégias fixas;
- melhor estratégia fixa;
- oráculo histórico.

IMPORTANTE:

- não altera modelo oficial;
- não altera pesos;
- não altera escalações;
- não promove nenhum modelo automaticamente;
- somente compara resultados já produzidos;
- utiliza apenas rodadas comuns às três versões.

=========================================================
"""

import json
import math
import statistics

from collections import Counter
from pathlib import Path


# ======================================================
# CAMINHOS
# ======================================================

RAIZ = (
    Path(__file__)
    .resolve()
    .parents[2]
)

PASTA_DATA = (
    RAIZ /
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

ARQUIVO_V3 = (
    PASTA_DATA /
    "estrategia-adaptativa-v3.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "comparacao-estrategias-adaptativas-v3.json"
)


# ======================================================
# MODELOS
# ======================================================

MODELO_SAIDA = (
    "comparacao_estrategias_adaptativas_v3"
)

ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo",
]


# ======================================================
# CONFIGURAÇÕES
# ======================================================

MINIMO_RODADAS = 10

GANHO_RELEVANTE_PONTOS = 0.50

GANHO_FORTE_PONTOS = 1.00

TOLERANCIA_EMPATE = 0.01


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(
    caminho
):

    if not caminho.exists():

        return None

    try:

        with caminho.open(
            "r",
            encoding="utf-8"
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception as erro:

        print(
            "[ERRO] Falha ao ler:",
            caminho
        )

        print(
            "[ERRO]",
            erro
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

    with caminho.open(
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

        resultado = float(
            valor
        )

        if math.isfinite(
            resultado
        ):

            return resultado

    except (
        TypeError,
        ValueError
    ):

        pass

    return padrao


def inteiro(
    valor,
    padrao=0
):

    try:

        return int(
            numero(
                valor,
                padrao
            )
        )

    except Exception:

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


def media(
    valores
):

    valores = [
        numero(valor)
        for valor in valores
    ]

    if not valores:

        return 0.0

    return sum(
        valores
    ) / len(
        valores
    )


def mediana(
    valores
):

    valores = [
        numero(valor)
        for valor in valores
    ]

    if not valores:

        return 0.0

    return statistics.median(
        valores
    )


def desvio(
    valores
):

    valores = [
        numero(valor)
        for valor in valores
    ]

    if len(
        valores
    ) < 2:

        return 0.0

    return statistics.pstdev(
        valores
    )


def minimo(
    valores
):

    if not valores:

        return 0.0

    return min(
        numero(valor)
        for valor in valores
    )


def maximo(
    valores
):

    if not valores:

        return 0.0

    return max(
        numero(valor)
        for valor in valores
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

        return 0.0

    return (
        parte /
        total
    ) * 100


# ======================================================
# EXTRAÇÃO DAS RODADAS ADAPTATIVAS
# ======================================================

def extrair_lista_rodadas(
    dados
):

    if not isinstance(
        dados,
        dict
    ):

        return []

    for chave in [
        "rodadas",
        "resultados",
        "historico",
        "simulacoes",
    ]:

        valor = dados.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

    return []


def obter_numero_rodada(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return 0

    for chave in [
        "rodada",
        "numeroRodada",
        "numero_rodada",
    ]:

        if chave in registro:

            return inteiro(
                registro.get(
                    chave
                )
            )

    return 0


def obter_pontuacao_adaptativa(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return 0.0

    for chave in [
        "pontuacao",
        "pontos",
        "pontuacaoReal",
        "pontosReais",
        "totalReal",
    ]:

        if chave in registro:

            return numero(
                registro.get(
                    chave
                )
            )

    return 0.0


def obter_estrategia_escolhida(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return None

    for chave in [
        "estrategiaEscolhida",
        "estrategia",
        "perfilEscolhido",
        "perfil",
    ]:

        valor = registro.get(
            chave
        )

        if valor in ESTRATEGIAS:

            return valor

    return None


def obter_regime(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return None

    return registro.get(
        "regime"
    )


def normalizar_adaptativo(
    dados
):

    resultado = {}

    for registro in extrair_lista_rodadas(
        dados
    ):

        rodada = obter_numero_rodada(
            registro
        )

        if rodada <= 0:

            continue

        resultado[
            rodada
        ] = {

            "rodada":
                rodada,

            "pontuacao":
                obter_pontuacao_adaptativa(
                    registro
                ),

            "estrategiaEscolhida":
                obter_estrategia_escolhida(
                    registro
                ),

            "regime":
                obter_regime(
                    registro
                ),

            "melhorEstrategia":
                registro.get(
                    "melhorEstrategia"
                ),

            "pontuacaoOraculo":
                numero(
                    registro.get(
                        "pontuacaoOraculo"
                    )
                ),

            "perdaOraculo":
                numero(
                    registro.get(
                        "perdaOraculo"
                    )
                ),

            "acertouMelhorEstrategia":
                bool(
                    registro.get(
                        "acertouMelhorEstrategia",
                        False
                    )
                )

        }

    return resultado


# ======================================================
# SIMULAÇÃO FIXA
# ======================================================

def extrair_rodadas_simulacao(
    dados
):

    if isinstance(
        dados,
        list
    ):

        return dados

    if not isinstance(
        dados,
        dict
    ):

        return []

    for chave in [
        "rodadas",
        "resultados",
        "simulacoes",
        "historico",
    ]:

        valor = dados.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

    return []


def obter_times_simulacao(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return []

    for chave in [
        "times",
        "estrategias",
        "resultados",
        "escalacoes",
    ]:

        valor = registro.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

    return []


def obter_nome_time(
    time
):

    if not isinstance(
        time,
        dict
    ):

        return None

    for chave in [
        "estrategia",
        "perfil",
        "nome",
        "tipo",
    ]:

        valor = time.get(
            chave
        )

        if valor in ESTRATEGIAS:

            return valor

    return None


def obter_pontos_time(
    time
):

    if not isinstance(
        time,
        dict
    ):

        return 0.0

    for chave in [
        "pontuacaoReal",
        "pontuacao_real",
        "pontosReais",
        "pontos_reais",
        "pontos",
        "pontuacao",
        "totalReal",
        "total_real",
    ]:

        if chave in time:

            return numero(
                time.get(
                    chave
                )
            )

    return 0.0


def normalizar_simulacao(
    dados
):

    resultado = {}

    for registro in extrair_rodadas_simulacao(
        dados
    ):

        rodada = obter_numero_rodada(
            registro
        )

        if rodada <= 0:

            continue

        pontuacoes = {}

        for time in obter_times_simulacao(
            registro
        ):

            estrategia = obter_nome_time(
                time
            )

            if estrategia not in ESTRATEGIAS:

                continue

            pontuacoes[
                estrategia
            ] = obter_pontos_time(
                time
            )

        if len(
            pontuacoes
        ) != len(
            ESTRATEGIAS
        ):

            continue

        melhor = max(
            ESTRATEGIAS,
            key=lambda estrategia:
                pontuacoes[
                    estrategia
                ]
        )

        oraculo = max(
            pontuacoes.values()
        )

        resultado[
            rodada
        ] = {

            "rodada":
                rodada,

            "pontuacoes":
                pontuacoes,

            "melhorEstrategia":
                melhor,

            "oraculo":
                oraculo

        }

    return resultado


# ======================================================
# MÉTRICAS
# ======================================================

def calcular_metricas(
    valores
):

    return {

        "quantidade":
            len(
                valores
            ),

        "media":
            arredondar(
                media(
                    valores
                )
            ),

        "mediana":
            arredondar(
                mediana(
                    valores
                )
            ),

        "desvioPadrao":
            arredondar(
                desvio(
                    valores
                )
            ),

        "minimo":
            arredondar(
                minimo(
                    valores
                )
            ),

        "maximo":
            arredondar(
                maximo(
                    valores
                )
            ),

        "total":
            arredondar(
                sum(
                    numero(valor)
                    for valor in valores
                )
            )

    }


# ======================================================
# COMPARAÇÃO PAREADA
# ======================================================

def comparar_pareado(
    nome_a,
    pontos_a,
    nome_b,
    pontos_b
):

    vitorias_a = 0
    vitorias_b = 0
    empates = 0

    diferencas = []

    for a, b in zip(
        pontos_a,
        pontos_b
    ):

        a = numero(
            a
        )

        b = numero(
            b
        )

        diferenca = (
            b - a
        )

        diferencas.append(
            diferenca
        )

        if abs(
            diferenca
        ) <= TOLERANCIA_EMPATE:

            empates += 1

        elif diferenca > 0:

            vitorias_b += 1

        else:

            vitorias_a += 1

    total = len(
        diferencas
    )

    return {

        "modeloA":
            nome_a,

        "modeloB":
            nome_b,

        "rodadas":
            total,

        "vitoriasA":
            vitorias_a,

        "vitoriasB":
            vitorias_b,

        "empates":
            empates,

        "taxaVitoriasA":
            arredondar(
                percentual(
                    vitorias_a,
                    total
                )
            ),

        "taxaVitoriasB":
            arredondar(
                percentual(
                    vitorias_b,
                    total
                )
            ),

        "diferencaMediaBmenosA":
            arredondar(
                media(
                    diferencas
                )
            ),

        "medianaDiferencaBmenosA":
            arredondar(
                mediana(
                    diferencas
                )
            )

    }


# ======================================================
# GANHO
# ======================================================

def calcular_ganho(
    media_nova,
    media_referencia
):

    media_nova = numero(
        media_nova
    )

    media_referencia = numero(
        media_referencia
    )

    ganho = (
        media_nova -
        media_referencia
    )

    ganho_percentual = (

        (
            ganho /
            media_referencia
        ) * 100

        if media_referencia
        else 0.0
    )

    return {

        "pontosPorRodada":
            arredondar(
                ganho
            ),

        "percentual":
            arredondar(
                ganho_percentual
            )

    }


# ======================================================
# DECISÃO EXPERIMENTAL
# ======================================================

def definir_decisao(
    ganho_v3_v2,
    ganho_v3_fixa,
    taxa_vitorias_v3_v2,
    eficiencia_v3,
    eficiencia_v2,
    desvio_v3,
    desvio_v2,
    rodadas
):

    if rodadas < MINIMO_RODADAS:

        return {

            "decisao":
                "COMPARACAO_INCONCLUSIVA",

            "motivo":
                (
                    "Amostra insuficiente para avaliar "
                    "cientificamente a V3."
                ),

            "promocaoAutomatica":
                False

        }

    if (
        ganho_v3_v2 >= GANHO_FORTE_PONTOS
        and
        ganho_v3_fixa > 0
        and
        taxa_vitorias_v3_v2 >= 55
        and
        eficiencia_v3 > eficiencia_v2
    ):

        return {

            "decisao":
                "V3_FORTEMENTE_SUPERIOR",

            "motivo":
                (
                    "V3 apresentou ganho forte sobre V2, "
                    "superou a melhor estratégia fixa e "
                    "aumentou a eficiência contra o oráculo."
                ),

            "promocaoAutomatica":
                False

        }

    if (
        ganho_v3_v2 >= GANHO_RELEVANTE_PONTOS
        and
        ganho_v3_fixa > 0
        and
        eficiencia_v3 > eficiencia_v2
    ):

        return {

            "decisao":
                "V3_SUPERIOR",

            "motivo":
                (
                    "V3 apresentou ganho relevante sobre V2 "
                    "e superou a melhor estratégia fixa."
                ),

            "promocaoAutomatica":
                False

        }

    if (
        ganho_v3_v2 > 0
        and
        eficiencia_v3 > eficiencia_v2
    ):

        return {

            "decisao":
                "V3_PROMISSORA",

            "motivo":
                (
                    "V3 melhorou V2, mas ainda não apresentou "
                    "evidência suficiente para promoção."
                ),

            "promocaoAutomatica":
                False

        }

    if abs(
        ganho_v3_v2
    ) <= 0.05:

        return {

            "decisao":
                "V2_V3_EQUIVALENTES",

            "motivo":
                (
                    "V2 e V3 apresentaram desempenho médio "
                    "praticamente equivalente."
                ),

            "promocaoAutomatica":
                False

        }

    return {

        "decisao":
            "MANTER_V2",

        "motivo":
            (
                "V3 não apresentou evidência suficiente "
                "de superioridade sobre V2."
            ),

        "promocaoAutomatica":
            False

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
        "COMPARAÇÃO ADAPTATIVO V1 x V2 x V3"
    )

    print(
        "=============================================="
    )

    # ==================================================
    # CARREGAMENTO
    # ==================================================

    dados_v1 = carregar_json(
        ARQUIVO_V1
    )

    dados_v2 = carregar_json(
        ARQUIVO_V2
    )

    dados_v3 = carregar_json(
        ARQUIVO_V3
    )

    dados_simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    arquivos = {

        "v1":
            dados_v1 is not None,

        "v2":
            dados_v2 is not None,

        "v3":
            dados_v3 is not None,

        "simulacao":
            dados_simulacao is not None

    }

    faltantes = [
        nome
        for nome, existe
        in arquivos.items()
        if not existe
    ]

    if faltantes:

        print(
            "Arquivos ausentes:",
            faltantes
        )

        resultado = {

            "modelo":
                MODELO_SAIDA,

            "status":
                "inconclusivo",

            "arquivos":
                arquivos,

            "rodadasComuns":
                0,

            "decisao": {

                "decisao":
                    "COMPARACAO_INCONCLUSIVA",

                "motivo":
                    "Arquivos obrigatórios ausentes.",

                "promocaoAutomatica":
                    False

            }

        }

        salvar_json(
            ARQUIVO_SAIDA,
            resultado
        )

        return

    # ==================================================
    # NORMALIZAÇÃO
    # ==================================================

    v1 = normalizar_adaptativo(
        dados_v1
    )

    v2 = normalizar_adaptativo(
        dados_v2
    )

    v3 = normalizar_adaptativo(
        dados_v3
    )

    simulacao = normalizar_simulacao(
        dados_simulacao
    )

    rodadas_comuns = sorted(
        set(
            v1.keys()
        )
        &
        set(
            v2.keys()
        )
        &
        set(
            v3.keys()
        )
        &
        set(
            simulacao.keys()
        )
    )

    # ==================================================
    # SÉRIES
    # ==================================================

    pontos_v1 = []
    pontos_v2 = []
    pontos_v3 = []

    pontos_fixas = {
        estrategia: []
        for estrategia
        in ESTRATEGIAS
    }

    pontos_oraculo = []

    escolhas_v1 = Counter()
    escolhas_v2 = Counter()
    escolhas_v3 = Counter()

    regimes_v3 = Counter()

    detalhes = []

    for rodada in rodadas_comuns:

        registro_v1 = v1[
            rodada
        ]

        registro_v2 = v2[
            rodada
        ]

        registro_v3 = v3[
            rodada
        ]

        registro_simulacao = simulacao[
            rodada
        ]

        p1 = numero(
            registro_v1[
                "pontuacao"
            ]
        )

        p2 = numero(
            registro_v2[
                "pontuacao"
            ]
        )

        p3 = numero(
            registro_v3[
                "pontuacao"
            ]
        )

        oraculo = numero(
            registro_simulacao[
                "oraculo"
            ]
        )

        pontos_v1.append(
            p1
        )

        pontos_v2.append(
            p2
        )

        pontos_v3.append(
            p3
        )

        pontos_oraculo.append(
            oraculo
        )

        for estrategia in ESTRATEGIAS:

            pontos_fixas[
                estrategia
            ].append(

                numero(
                    registro_simulacao[
                        "pontuacoes"
                    ][
                        estrategia
                    ]
                )

            )

        escolha_v1 = registro_v1.get(
            "estrategiaEscolhida"
        )

        escolha_v2 = registro_v2.get(
            "estrategiaEscolhida"
        )

        escolha_v3 = registro_v3.get(
            "estrategiaEscolhida"
        )

        if escolha_v1:

            escolhas_v1[
                escolha_v1
            ] += 1

        if escolha_v2:

            escolhas_v2[
                escolha_v2
            ] += 1

        if escolha_v3:

            escolhas_v3[
                escolha_v3
            ] += 1

        regime_v3 = registro_v3.get(
            "regime"
        )

        regimes_v3[
            str(
                regime_v3
            )
        ] += 1

        melhor = registro_simulacao[
            "melhorEstrategia"
        ]

        detalhes.append(
            {

                "rodada":
                    rodada,

                "v1": {

                    "estrategia":
                        escolha_v1,

                    "pontuacao":
                        arredondar(
                            p1
                        )

                },

                "v2": {

                    "estrategia":
                        escolha_v2,

                    "pontuacao":
                        arredondar(
                            p2
                        )

                },

                "v3": {

                    "estrategia":
                        escolha_v3,

                    "regime":
                        regime_v3,

                    "pontuacao":
                        arredondar(
                            p3
                        )

                },

                "fixas":
                    {

                        estrategia:
                            arredondar(
                                registro_simulacao[
                                    "pontuacoes"
                                ][
                                    estrategia
                                ]
                            )

                        for estrategia
                        in ESTRATEGIAS

                    },

                "melhorEstrategia":
                    melhor,

                "oraculo":
                    arredondar(
                        oraculo
                    ),

                "perdaV1Oraculo":
                    arredondar(
                        oraculo - p1
                    ),

                "perdaV2Oraculo":
                    arredondar(
                        oraculo - p2
                    ),

                "perdaV3Oraculo":
                    arredondar(
                        oraculo - p3
                    )

            }
        )

    # ==================================================
    # MÉTRICAS
    # ==================================================

    metricas_v1 = calcular_metricas(
        pontos_v1
    )

    metricas_v2 = calcular_metricas(
        pontos_v2
    )

    metricas_v3 = calcular_metricas(
        pontos_v3
    )

    metricas_fixas = {

        estrategia:
            calcular_metricas(
                pontos
            )

        for estrategia, pontos
        in pontos_fixas.items()

    }

    metricas_oraculo = calcular_metricas(
        pontos_oraculo
    )

    melhor_fixa = max(
        ESTRATEGIAS,
        key=lambda estrategia:
            metricas_fixas[
                estrategia
            ][
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

    # ==================================================
    # GANHOS
    # ==================================================

    ganho_v2_v1 = calcular_ganho(
        metricas_v2[
            "media"
        ],
        metricas_v1[
            "media"
        ]
    )

    ganho_v3_v1 = calcular_ganho(
        metricas_v3[
            "media"
        ],
        metricas_v1[
            "media"
        ]
    )

    ganho_v3_v2 = calcular_ganho(
        metricas_v3[
            "media"
        ],
        metricas_v2[
            "media"
        ]
    )

    ganho_v1_fixa = calcular_ganho(
        metricas_v1[
            "media"
        ],
        media_melhor_fixa
    )

    ganho_v2_fixa = calcular_ganho(
        metricas_v2[
            "media"
        ],
        media_melhor_fixa
    )

    ganho_v3_fixa = calcular_ganho(
        metricas_v3[
            "media"
        ],
        media_melhor_fixa
    )

    # ==================================================
    # PAREADO
    # ==================================================

    pareado_v1_v2 = comparar_pareado(
        "V1",
        pontos_v1,
        "V2",
        pontos_v2
    )

    pareado_v1_v3 = comparar_pareado(
        "V1",
        pontos_v1,
        "V3",
        pontos_v3
    )

    pareado_v2_v3 = comparar_pareado(
        "V2",
        pontos_v2,
        "V3",
        pontos_v3
    )

    # ==================================================
    # ORÁCULO
    # ==================================================

    media_oraculo = numero(
        metricas_oraculo[
            "media"
        ]
    )

    eficiencia_v1 = percentual(
        metricas_v1[
            "media"
        ],
        media_oraculo
    )

    eficiencia_v2 = percentual(
        metricas_v2[
            "media"
        ],
        media_oraculo
    )

    eficiencia_v3 = percentual(
        metricas_v3[
            "media"
        ],
        media_oraculo
    )

    perda_v1 = (
        media_oraculo -
        numero(
            metricas_v1[
                "media"
            ]
        )
    )

    perda_v2 = (
        media_oraculo -
        numero(
            metricas_v2[
                "media"
            ]
        )
    )

    perda_v3 = (
        media_oraculo -
        numero(
            metricas_v3[
                "media"
            ]
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

    desvio_v3 = numero(
        metricas_v3[
            "desvioPadrao"
        ]
    )

    # ==================================================
    # DECISÃO
    # ==================================================

    decisao = definir_decisao(

        ganho_v3_v2[
            "pontosPorRodada"
        ],

        ganho_v3_fixa[
            "pontosPorRodada"
        ],

        pareado_v2_v3[
            "taxaVitoriasB"
        ],

        eficiencia_v3,

        eficiencia_v2,

        desvio_v3,

        desvio_v2,

        len(
            rodadas_comuns
        )

    )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            MODELO_SAIDA,

        "descricao":
            (
                "Comparação científica progressiva entre "
                "estratégias adaptativas V1, V2 e V3."
            ),

        "status":
            "experimental",

        "arquivos": {

            "v1":
                str(
                    ARQUIVO_V1.relative_to(
                        RAIZ
                    )
                ),

            "v2":
                str(
                    ARQUIVO_V2.relative_to(
                        RAIZ
                    )
                ),

            "v3":
                str(
                    ARQUIVO_V3.relative_to(
                        RAIZ
                    )
                ),

            "simulacao":
                str(
                    ARQUIVO_SIMULACAO.relative_to(
                        RAIZ
                    )
                )

        },

        "amostra": {

            "rodadasComuns":
                len(
                    rodadas_comuns
                ),

            "rodadas":
                rodadas_comuns,

            "minimoExigido":
                MINIMO_RODADAS,

            "amostraSuficiente":
                (
                    len(
                        rodadas_comuns
                    )
                    >=
                    MINIMO_RODADAS
                )

        },

        "metricas": {

            "adaptativoV1":
                metricas_v1,

            "adaptativoV2":
                metricas_v2,

            "adaptativoV3":
                metricas_v3,

            "estrategiasFixas":
                metricas_fixas,

            "melhorEstrategiaFixa":
                melhor_fixa,

            "oraculo":
                metricas_oraculo

        },

        "ganhos": {

            "v2VsV1":
                ganho_v2_v1,

            "v3VsV1":
                ganho_v3_v1,

            "v3VsV2":
                ganho_v3_v2,

            "v1VsMelhorFixa":
                ganho_v1_fixa,

            "v2VsMelhorFixa":
                ganho_v2_fixa,

            "v3VsMelhorFixa":
                ganho_v3_fixa

        },

        "comparacoesPareadas": {

            "v1VsV2":
                pareado_v1_v2,

            "v1VsV3":
                pareado_v1_v3,

            "v2VsV3":
                pareado_v2_v3

        },

        "oraculo": {

            "media":
                arredondar(
                    media_oraculo
                ),

            "v1": {

                "eficienciaPercentual":
                    arredondar(
                        eficiencia_v1
                    ),

                "perdaMedia":
                    arredondar(
                        perda_v1
                    )

            },

            "v2": {

                "eficienciaPercentual":
                    arredondar(
                        eficiencia_v2
                    ),

                "perdaMedia":
                    arredondar(
                        perda_v2
                    )

            },

            "v3": {

                "eficienciaPercentual":
                    arredondar(
                        eficiencia_v3
                    ),

                "perdaMedia":
                    arredondar(
                        perda_v3
                    )

            }

        },

        "estabilidade": {

            "desvioV1":
                arredondar(
                    desvio_v1
                ),

            "desvioV2":
                arredondar(
                    desvio_v2
                ),

            "desvioV3":
                arredondar(
                    desvio_v3
                ),

            "v3MaisEstavelQueV1":
                (
                    desvio_v3
                    <
                    desvio_v1
                ),

            "v3MaisEstavelQueV2":
                (
                    desvio_v3
                    <
                    desvio_v2
                )

        },

        "escolhas": {

            "v1": {

                estrategia:
                    escolhas_v1.get(
                        estrategia,
                        0
                    )

                for estrategia
                in ESTRATEGIAS

            },

            "v2": {

                estrategia:
                    escolhas_v2.get(
                        estrategia,
                        0
                    )

                for estrategia
                in ESTRATEGIAS

            },

            "v3": {

                estrategia:
                    escolhas_v3.get(
                        estrategia,
                        0
                    )

                for estrategia
                in ESTRATEGIAS

            }

        },

        "regimesV3":
            dict(
                regimes_v3
            ),

        "rodadas":
            detalhes,

        "decisao":
            decisao,

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraPesos":
                False,

            "alteraEscalacoes":
                False,

            "alteraEstrategiaOficial":
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
        "V1:",
        metricas_v1[
            "media"
        ]
    )

    print(
        "V2:",
        metricas_v2[
            "media"
        ]
    )

    print(
        "V3:",
        metricas_v3[
            "media"
        ]
    )

    print(
        melhor_fixa + ":",
        metricas_fixas[
            melhor_fixa
        ][
            "media"
        ]
    )

    print(
        "Oráculo:",
        metricas_oraculo[
            "media"
        ]
    )

    print()

    print(
        "GANHOS V3"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "V3 x V1:",
        ganho_v3_v1[
            "pontosPorRodada"
        ],
        "pontos/rodada",
        "|",
        ganho_v3_v1[
            "percentual"
        ],
        "%"
    )

    print(
        "V3 x V2:",
        ganho_v3_v2[
            "pontosPorRodada"
        ],
        "pontos/rodada",
        "|",
        ganho_v3_v2[
            "percentual"
        ],
        "%"
    )

    print(
        "V3 x melhor fixa:",
        ganho_v3_fixa[
            "pontosPorRodada"
        ],
        "pontos/rodada",
        "|",
        ganho_v3_fixa[
            "percentual"
        ],
        "%"
    )

    print()

    print(
        "PAREADO V2 x V3"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Vitórias V2:",
        pareado_v2_v3[
            "vitoriasA"
        ]
    )

    print(
        "Vitórias V3:",
        pareado_v2_v3[
            "vitoriasB"
        ]
    )

    print(
        "Empates:",
        pareado_v2_v3[
            "empates"
        ]
    )

    print(
        "Taxa vitórias V3:",
        pareado_v2_v3[
            "taxaVitoriasB"
        ],
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
            eficiencia_v1
        ),
        "%"
    )

    print(
        "Eficiência V2:",
        arredondar(
            eficiencia_v2
        ),
        "%"
    )

    print(
        "Eficiência V3:",
        arredondar(
            eficiencia_v3
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
        "Desvio V3:",
        arredondar(
            desvio_v3
        )
    )

    print()

    print(
        "ESCOLHAS V3"
    )

    print(
        "----------------------------------------------"
    )

    for estrategia in ESTRATEGIAS:

        print(
            estrategia,
            ":",
            escolhas_v3.get(
                estrategia,
                0
            )
        )

    print()

    print(
        "REGIMES V3"
    )

    print(
        "----------------------------------------------"
    )

    for regime, quantidade in regimes_v3.items():

        print(
            regime,
            ":",
            quantidade
        )

    print()

    print(
        "DECISÃO:",
        decisao[
            "decisao"
        ]
    )

    print(
        "Motivo:",
        decisao[
            "motivo"
        ]
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
