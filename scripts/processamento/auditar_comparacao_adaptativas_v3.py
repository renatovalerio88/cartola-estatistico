"""
=========================================================
CARTOLA ESTATÍSTICO
AUDITORIA CIENTÍFICA
COMPARAÇÃO ADAPTATIVAS V1 x V2 x V3
=========================================================

Versão:
auditoria_comparacao_adaptativas_v3

Entradas:
data/estrategia-adaptativa.json
data/estrategia-adaptativa-v2.json
data/estrategia-adaptativa-v3.json
data/simulacao-times.json
data/comparacao-estrategias-adaptativas-v3.json

Saída:
data/auditoria-comparacao-adaptativas-v3.json

Objetivo:
Auditar de forma independente a comparação entre
V1, V2 e V3, incluindo:

- rodadas comuns;
- médias;
- desvios;
- estratégias fixas;
- melhor estratégia fixa;
- oráculo;
- ganhos;
- comparação pareada;
- eficiência;
- escolhas da V3;
- integridade das rodadas;
- segurança contra promoção automática.

Nenhuma lógica oficial é alterada.
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
    RAIZ
    / "data"
)

ARQUIVO_V1 = (
    PASTA_DATA
    / "estrategia-adaptativa.json"
)

ARQUIVO_V2 = (
    PASTA_DATA
    / "estrategia-adaptativa-v2.json"
)

ARQUIVO_V3 = (
    PASTA_DATA
    / "estrategia-adaptativa-v3.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA
    / "simulacao-times.json"
)

ARQUIVO_COMPARACAO = (
    PASTA_DATA
    / "comparacao-estrategias-adaptativas-v3.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA
    / "auditoria-comparacao-adaptativas-v3.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================

MODELO_AUDITORIA = (
    "auditoria_comparacao_adaptativas_v3"
)

MODELO_V3 = (
    "estrategia_adaptativa_v3"
)

MODELO_COMPARACAO = (
    "comparacao_estrategias_adaptativas_v3"
)

ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo",
]

MINIMO_RODADAS = 10

TOLERANCIA = 0.02

TOLERANCIA_EMPATE = 0.01


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

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

        valor = float(
            valor
        )

        if math.isfinite(
            valor
        ):

            return valor

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
        numero(v)
        for v in valores
    ]

    if not valores:
        return 0.0

    return (
        sum(valores)
        /
        len(valores)
    )


def desvio(
    valores
):

    valores = [
        numero(v)
        for v in valores
    ]

    if len(
        valores
    ) < 2:

        return 0.0

    return statistics.pstdev(
        valores
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
        parte
        /
        total
        *
        100
    )


def aproximadamente_igual(
    a,
    b,
    tolerancia=TOLERANCIA
):

    return abs(
        numero(a)
        -
        numero(b)
    ) <= tolerancia


# ======================================================
# TESTES
# ======================================================

def teste(
    nome,
    passou,
    nivel="CRITICO"
):

    return {
        "nome": nome,
        "passou": bool(
            passou
        ),
        "nivel": nivel,
    }


# ======================================================
# EXTRAÇÃO ADAPTATIVA
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


def obter_pontuacao_adaptativa(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return None

    for chave in [
        "pontuacao",
        "pontos",
        "pontuacaoAdaptativa",
        "pontosAdaptativo",
        "pontuacaoEstrategia",
        "pontosEstrategia",
        "pontuacaoReal",
        "pontosReais",
        "totalReal",
    ]:

        if chave not in registro:
            continue

        try:

            valor = float(
                registro.get(
                    chave
                )
            )

            if math.isfinite(
                valor
            ):

                return valor

        except Exception:

            pass

    return None


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
                registro.get(
                    "regime"
                ),

            "registro":
                registro,
        }

    return resultado


# ======================================================
# SIMULAÇÃO
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

        if isinstance(
            valor,
            dict
        ):

            times = []

            for (
                nome,
                dados_time
            ) in valor.items():

                if not isinstance(
                    dados_time,
                    dict
                ):

                    continue

                copia = dict(
                    dados_time
                )

                copia.setdefault(
                    "nome",
                    nome
                )

                times.append(
                    copia
                )

            return times

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
        "id",
    ]:

        valor = time.get(
            chave
        )

        if valor in ESTRATEGIAS:

            return valor

        if isinstance(
            valor,
            str
        ):

            normalizado = (
                valor
                .strip()
                .lower()
            )

            mapa = {
                "conservador":
                    "Conservador",

                "equilibrado":
                    "Equilibrado",

                "agressivo":
                    "Agressivo",
            }

            if normalizado in mapa:

                return mapa[
                    normalizado
                ]

    return None


def obter_pontos_time(
    time
):

    if not isinstance(
        time,
        dict
    ):

        return None

    for chave in [
        "pontuacaoComCapitao",
        "pontosComCapitao",
        "pontuacaoRealComCapitao",
        "pontuacaoFinal",
        "pontuacaoReal",
        "pontuacao_real",
        "pontosReais",
        "pontos_reais",
        "pontos",
        "pontuacao",
        "totalReal",
        "total_real",
        "pontosTotal",
        "pontuacaoTotal",
    ]:

        if chave not in time:
            continue

        try:

            valor = float(
                time.get(
                    chave
                )
            )

            if math.isfinite(
                valor
            ):

                return valor

        except Exception:

            pass

    for chave_container in [
        "resultado",
        "metricas",
    ]:

        container = time.get(
            chave_container
        )

        if not isinstance(
            container,
            dict
        ):

            continue

        valor = obter_pontos_time(
            container
        )

        if valor is not None:

            return valor

    pontos_sem_capitao = None

    bonus_capitao = None

    for chave in [
        "pontosSemCapitao",
        "pontuacaoSemCapitao",
    ]:

        if chave in time:

            try:

                pontos_sem_capitao = float(
                    time.get(
                        chave
                    )
                )

            except Exception:

                pass

    for chave in [
        "bonusCapitao",
        "bonus_capitao",
    ]:

        if chave in time:

            try:

                bonus_capitao = float(
                    time.get(
                        chave
                    )
                )

            except Exception:

                pass

    if pontos_sem_capitao is not None:

        return (
            pontos_sem_capitao
            +
            (
                bonus_capitao
                if bonus_capitao is not None
                else 0.0
            )
        )

    return None


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

            pontos = obter_pontos_time(
                time
            )

            if pontos is None:
                continue

            pontuacoes[
                estrategia
            ] = pontos

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
                oraculo,
        }

    return resultado


# ======================================================
# RECONSTRUÇÃO DAS SÉRIES
# ======================================================

def reconstruir_series(
    v1,
    v2,
    v3,
    simulacao,
    rodadas_comuns
):

    pontos_v1 = []

    pontos_v2 = []

    pontos_v3 = []

    pontos_fixas = {
        estrategia: []
        for estrategia
        in ESTRATEGIAS
    }

    pontos_oraculo = []

    escolhas_v3 = Counter()

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

        registro_sim = simulacao[
            rodada
        ]

        valores = {}

        for nome, registro in [
            ("v1", registro_v1),
            ("v2", registro_v2),
            ("v3", registro_v3),
        ]:

            pontuacao = registro.get(
                "pontuacao"
            )

            escolha = registro.get(
                "estrategiaEscolhida"
            )

            if (
                pontuacao is None
                or
                (
                    numero(
                        pontuacao
                    ) == 0
                    and
                    escolha in ESTRATEGIAS
                )
            ):

                if escolha in ESTRATEGIAS:

                    pontuacao = (
                        registro_sim[
                            "pontuacoes"
                        ].get(
                            escolha
                        )
                    )

            valores[
                nome
            ] = numero(
                pontuacao
            )

        pontos_v1.append(
            valores[
                "v1"
            ]
        )

        pontos_v2.append(
            valores[
                "v2"
            ]
        )

        pontos_v3.append(
            valores[
                "v3"
            ]
        )

        for estrategia in ESTRATEGIAS:

            pontos_fixas[
                estrategia
            ].append(
                numero(
                    registro_sim[
                        "pontuacoes"
                    ][
                        estrategia
                    ]
                )
            )

        pontos_oraculo.append(
            numero(
                registro_sim[
                    "oraculo"
                ]
            )
        )

        escolha_v3 = (
            registro_v3.get(
                "estrategiaEscolhida"
            )
        )

        if escolha_v3 in ESTRATEGIAS:

            escolhas_v3[
                escolha_v3
            ] += 1

        detalhes.append(
            {
                "rodada":
                    rodada,

                "v1":
                    valores["v1"],

                "v2":
                    valores["v2"],

                "v3":
                    valores["v3"],

                "fixas":
                    {
                        estrategia:
                            registro_sim[
                                "pontuacoes"
                            ][
                                estrategia
                            ]

                        for estrategia
                        in ESTRATEGIAS
                    },

                "oraculo":
                    registro_sim[
                        "oraculo"
                    ],

                "melhorEstrategia":
                    registro_sim[
                        "melhorEstrategia"
                    ],
            }
        )

    return {
        "v1":
            pontos_v1,

        "v2":
            pontos_v2,

        "v3":
            pontos_v3,

        "fixas":
            pontos_fixas,

        "oraculo":
            pontos_oraculo,

        "escolhasV3":
            escolhas_v3,

        "detalhes":
            detalhes,
    }


# ======================================================
# MÉTRICAS
# ======================================================

def metricas(
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

        "desvioPadrao":
            arredondar(
                desvio(
                    valores
                )
            ),

        "total":
            arredondar(
                sum(
                    numero(v)
                    for v in valores
                )
            ),
    }


def comparar_pareado(
    pontos_v2,
    pontos_v3
):

    vitorias_v2 = 0

    vitorias_v3 = 0

    empates = 0

    for p2, p3 in zip(
        pontos_v2,
        pontos_v3
    ):

        diferenca = (
            numero(p3)
            -
            numero(p2)
        )

        if abs(
            diferenca
        ) <= TOLERANCIA_EMPATE:

            empates += 1

        elif diferenca > 0:

            vitorias_v3 += 1

        else:

            vitorias_v2 += 1

    total = (
        vitorias_v2
        +
        vitorias_v3
        +
        empates
    )

    return {
        "vitoriasV2":
            vitorias_v2,

        "vitoriasV3":
            vitorias_v3,

        "empates":
            empates,

        "taxaV3":
            arredondar(
                percentual(
                    vitorias_v3,
                    total
                )
            ),
    }


# ======================================================
# AUDITORIA
# ======================================================

def processar():

    print(
        "=============================================="
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "AUDITORIA COMPARAÇÃO V1 x V2 x V3"
    )

    print(
        "=============================================="
    )

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

    comparacao = carregar_json(
        ARQUIVO_COMPARACAO
    )

    arquivos = {
        "v1":
            dados_v1 is not None,

        "v2":
            dados_v2 is not None,

        "v3":
            dados_v3 is not None,

        "simulacao":
            dados_simulacao is not None,

        "comparacao":
            comparacao is not None,
    }

    v1 = normalizar_adaptativo(
        dados_v1 or {}
    )

    v2 = normalizar_adaptativo(
        dados_v2 or {}
    )

    v3 = normalizar_adaptativo(
        dados_v3 or {}
    )

    simulacao = normalizar_simulacao(
        dados_simulacao or {}
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

    series = reconstruir_series(
        v1,
        v2,
        v3,
        simulacao,
        rodadas_comuns
    )

    metricas_v1 = metricas(
        series[
            "v1"
        ]
    )

    metricas_v2 = metricas(
        series[
            "v2"
        ]
    )

    metricas_v3 = metricas(
        series[
            "v3"
        ]
    )

    metricas_fixas = {
        estrategia:
            metricas(
                valores
            )

        for (
            estrategia,
            valores
        ) in series[
            "fixas"
        ].items()
    }

    metricas_oraculo = metricas(
        series[
            "oraculo"
        ]
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

    media_oraculo = numero(
        metricas_oraculo[
            "media"
        ]
    )

    ganho_v3_v1 = (
        metricas_v3[
            "media"
        ]
        -
        metricas_v1[
            "media"
        ]
    )

    ganho_v3_v2 = (
        metricas_v3[
            "media"
        ]
        -
        metricas_v2[
            "media"
        ]
    )

    ganho_v3_fixa = (
        metricas_v3[
            "media"
        ]
        -
        metricas_fixas[
            melhor_fixa
        ][
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

    pareado = comparar_pareado(
        series[
            "v2"
        ],
        series[
            "v3"
        ]
    )

    metricas_comp = (
        comparacao.get(
            "metricas",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    ganhos_comp = (
        comparacao.get(
            "ganhos",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    pareados_comp = (
        comparacao.get(
            "comparacoesPareadas",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    oraculo_comp = (
        comparacao.get(
            "oraculo",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    estabilidade_comp = (
        comparacao.get(
            "estabilidade",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    escolhas_comp = (
        comparacao.get(
            "escolhas",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    seguranca_comp = (
        comparacao.get(
            "seguranca",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    amostra_comp = (
        comparacao.get(
            "amostra",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    decisao_comp = (
        comparacao.get(
            "decisao",
            {}
        )
        if isinstance(
            comparacao,
            dict
        )
        else {}
    )

    testes = []

    # ==================================================
    # ARQUIVOS / VERSÕES
    # ==================================================

    testes.append(
        teste(
            "arquivo_v1_existe",
            arquivos["v1"]
        )
    )

    testes.append(
        teste(
            "arquivo_v2_existe",
            arquivos["v2"]
        )
    )

    testes.append(
        teste(
            "arquivo_v3_existe",
            arquivos["v3"]
        )
    )

    testes.append(
        teste(
            "arquivo_simulacao_existe",
            arquivos["simulacao"]
        )
    )

    testes.append(
        teste(
            "arquivo_comparacao_existe",
            arquivos["comparacao"]
        )
    )

    testes.append(
        teste(
            "versao_v3",
            (
                isinstance(
                    dados_v3,
                    dict
                )
                and
                dados_v3.get(
                    "modelo"
                )
                ==
                MODELO_V3
            )
        )
    )

    testes.append(
        teste(
            "versao_comparacao",
            (
                isinstance(
                    comparacao,
                    dict
                )
                and
                comparacao.get(
                    "modelo"
                )
                ==
                MODELO_COMPARACAO
            )
        )
    )

    # ==================================================
    # RODADAS
    # ==================================================

    rodadas_comp = (
        amostra_comp.get(
            "rodadas",
            []
        )
    )

    testes.append(
        teste(
            "rodadas_comuns_consistentes",
            (
                rodadas_comp
                ==
                rodadas_comuns
            )
        )
    )

    testes.append(
        teste(
            "quantidade_rodadas_consistente",
            (
                inteiro(
                    amostra_comp.get(
                        "rodadasComuns"
                    )
                )
                ==
                len(
                    rodadas_comuns
                )
            )
        )
    )

    testes.append(
        teste(
            "amostra_minima",
            (
                len(
                    rodadas_comuns
                )
                >=
                MINIMO_RODADAS
            )
        )
    )

    # ==================================================
    # MÉDIAS / DESVIOS
    # ==================================================

    comp_v1 = metricas_comp.get(
        "adaptativoV1",
        {}
    )

    comp_v2 = metricas_comp.get(
        "adaptativoV2",
        {}
    )

    comp_v3 = metricas_comp.get(
        "adaptativoV3",
        {}
    )

    testes.append(
        teste(
            "media_v1_consistente",
            aproximadamente_igual(
                comp_v1.get(
                    "media"
                ),
                metricas_v1[
                    "media"
                ]
            )
        )
    )

    testes.append(
        teste(
            "media_v2_consistente",
            aproximadamente_igual(
                comp_v2.get(
                    "media"
                ),
                metricas_v2[
                    "media"
                ]
            )
        )
    )

    testes.append(
        teste(
            "media_v3_consistente",
            aproximadamente_igual(
                comp_v3.get(
                    "media"
                ),
                metricas_v3[
                    "media"
                ]
            )
        )
    )

    testes.append(
        teste(
            "desvio_v1_consistente",
            aproximadamente_igual(
                comp_v1.get(
                    "desvioPadrao"
                ),
                metricas_v1[
                    "desvioPadrao"
                ]
            )
        )
    )

    testes.append(
        teste(
            "desvio_v2_consistente",
            aproximadamente_igual(
                comp_v2.get(
                    "desvioPadrao"
                ),
                metricas_v2[
                    "desvioPadrao"
                ]
            )
        )
    )

    testes.append(
        teste(
            "desvio_v3_consistente",
            aproximadamente_igual(
                comp_v3.get(
                    "desvioPadrao"
                ),
                metricas_v3[
                    "desvioPadrao"
                ]
            )
        )
    )

    # ==================================================
    # FIXAS / ORÁCULO
    # ==================================================

    fixas_comp = metricas_comp.get(
        "estrategiasFixas",
        {}
    )

    fixas_ok = True

    for estrategia in ESTRATEGIAS:

        if not aproximadamente_igual(
            fixas_comp.get(
                estrategia,
                {}
            ).get(
                "media"
            ),
            metricas_fixas[
                estrategia
            ][
                "media"
            ]
        ):

            fixas_ok = False

    testes.append(
        teste(
            "metricas_fixas_consistentes",
            fixas_ok
        )
    )

    testes.append(
        teste(
            "melhor_fixa_consistente",
            (
                metricas_comp.get(
                    "melhorEstrategiaFixa"
                )
                ==
                melhor_fixa
            )
        )
    )

    testes.append(
        teste(
            "media_oraculo_consistente",
            aproximadamente_igual(
                metricas_comp.get(
                    "oraculo",
                    {}
                ).get(
                    "media"
                ),
                media_oraculo
            )
        )
    )

    testes.append(
        teste(
            "oraculo_valido",
            (
                media_oraculo
                >
                max(
                    metricas_v1[
                        "media"
                    ],
                    metricas_v2[
                        "media"
                    ],
                    metricas_v3[
                        "media"
                    ],
                    metricas_fixas[
                        melhor_fixa
                    ][
                        "media"
                    ]
                )
            )
        )
    )

    # ==================================================
    # GANHOS
    # ==================================================

    testes.append(
        teste(
            "ganho_v3_v1_consistente",
            aproximadamente_igual(
                ganhos_comp.get(
                    "v3VsV1",
                    {}
                ).get(
                    "pontosPorRodada"
                ),
                ganho_v3_v1
            )
        )
    )

    testes.append(
        teste(
            "ganho_v3_v2_consistente",
            aproximadamente_igual(
                ganhos_comp.get(
                    "v3VsV2",
                    {}
                ).get(
                    "pontosPorRodada"
                ),
                ganho_v3_v2
            )
        )
    )

    testes.append(
        teste(
            "ganho_v3_fixa_consistente",
            aproximadamente_igual(
                ganhos_comp.get(
                    "v3VsMelhorFixa",
                    {}
                ).get(
                    "pontosPorRodada"
                ),
                ganho_v3_fixa
            )
        )
    )

    # ==================================================
    # PAREADO
    # ==================================================

    pareado_comp = pareados_comp.get(
        "v2VsV3",
        {}
    )

    testes.append(
        teste(
            "pareado_v2_v3_vitorias_v2",
            (
                inteiro(
                    pareado_comp.get(
                        "vitoriasA"
                    )
                )
                ==
                pareado[
                    "vitoriasV2"
                ]
            )
        )
    )

    testes.append(
        teste(
            "pareado_v2_v3_vitorias_v3",
            (
                inteiro(
                    pareado_comp.get(
                        "vitoriasB"
                    )
                )
                ==
                pareado[
                    "vitoriasV3"
                ]
            )
        )
    )

    testes.append(
        teste(
            "pareado_v2_v3_empates",
            (
                inteiro(
                    pareado_comp.get(
                        "empates"
                    )
                )
                ==
                pareado[
                    "empates"
                ]
            )
        )
    )

    testes.append(
        teste(
            "pareado_v2_v3_taxa",
            aproximadamente_igual(
                pareado_comp.get(
                    "taxaVitoriasB"
                ),
                pareado[
                    "taxaV3"
                ]
            )
        )
    )

    # ==================================================
    # EFICIÊNCIA
    # ==================================================

    testes.append(
        teste(
            "eficiencia_v1_consistente",
            aproximadamente_igual(
                oraculo_comp.get(
                    "v1",
                    {}
                ).get(
                    "eficienciaPercentual"
                ),
                eficiencia_v1
            )
        )
    )

    testes.append(
        teste(
            "eficiencia_v2_consistente",
            aproximadamente_igual(
                oraculo_comp.get(
                    "v2",
                    {}
                ).get(
                    "eficienciaPercentual"
                ),
                eficiencia_v2
            )
        )
    )

    testes.append(
        teste(
            "eficiencia_v3_consistente",
            aproximadamente_igual(
                oraculo_comp.get(
                    "v3",
                    {}
                ).get(
                    "eficienciaPercentual"
                ),
                eficiencia_v3
            )
        )
    )

    # ==================================================
    # ESCOLHAS V3
    # ==================================================

    escolhas_v3_comp = escolhas_comp.get(
        "v3",
        {}
    )

    escolhas_ok = True

    for estrategia in ESTRATEGIAS:

        if (
            inteiro(
                escolhas_v3_comp.get(
                    estrategia
                )
            )
            !=
            series[
                "escolhasV3"
            ].get(
                estrategia,
                0
            )
        ):

            escolhas_ok = False

    testes.append(
        teste(
            "escolhas_v3_consistentes",
            escolhas_ok
        )
    )

    testes.append(
        teste(
            "cobertura_escolhas_v3",
            (
                sum(
                    series[
                        "escolhasV3"
                    ].values()
                )
                ==
                len(
                    rodadas_comuns
                )
            )
        )
    )

    testes.append(
        teste(
            "estrategias_v3_validas",
            all(
                registro.get(
                    "estrategiaEscolhida"
                )
                in ESTRATEGIAS

                for registro
                in v3.values()
            )
        )
    )

    # ==================================================
    # SEGURANÇA V3
    # ==================================================

    auditoria_v3 = (
        dados_v3.get(
            "auditoria",
            {}
        )
        if isinstance(
            dados_v3,
            dict
        )
        else {}
    )

    testes.append(
        teste(
            "v3_sem_vazamento_declarado",
            (
                auditoria_v3.get(
                    "semVazamentoFuturo"
                )
                is True
            )
        )
    )

    testes.append(
        teste(
            "v3_historico_progressivo",
            (
                auditoria_v3.get(
                    "historicoProgressivo"
                )
                is True
            )
        )
    )

    testes.append(
        teste(
            "v3_auditoria_sem_vazamento",
            (
                auditoria_v3.get(
                    "semVazamentoFuturo"
                )
                is True
                and
                auditoria_v3.get(
                    "historicoProgressivo"
                )
                is True
            )
        )
    )

    # ==================================================
    # DETALHES DAS RODADAS
    # ==================================================

    detalhes_comp = comparacao.get(
        "rodadas",
        []
    )

    detalhes_ok = (
        len(
            detalhes_comp
        )
        ==
        len(
            rodadas_comuns
        )
    )

    if detalhes_ok:

        mapa_detalhes = {
            inteiro(
                item.get(
                    "rodada"
                )
            ):
                item

            for item
            in detalhes_comp

            if isinstance(
                item,
                dict
            )
        }

        for esperado in series[
            "detalhes"
        ]:

            rodada = esperado[
                "rodada"
            ]

            atual = mapa_detalhes.get(
                rodada
            )

            if not atual:

                detalhes_ok = False
                break

            for nome in [
                "v1",
                "v2",
                "v3",
            ]:

                if not aproximadamente_igual(
                    atual.get(
                        nome,
                        {}
                    ).get(
                        "pontuacao"
                    ),
                    esperado[
                        nome
                    ]
                ):

                    detalhes_ok = False
                    break

            if not detalhes_ok:
                break

            if not aproximadamente_igual(
                atual.get(
                    "oraculo"
                ),
                esperado[
                    "oraculo"
                ]
            ):

                detalhes_ok = False
                break

    testes.append(
        teste(
            "detalhes_rodadas_consistentes",
            detalhes_ok
        )
    )

    # ==================================================
    # SEGURANÇA DA COMPARAÇÃO
    # ==================================================

    testes.append(
        teste(
            "nao_altera_modelo_oficial",
            (
                seguranca_comp.get(
                    "alteraModeloOficial"
                )
                is False
            )
        )
    )

    testes.append(
        teste(
            "nao_altera_pesos",
            (
                seguranca_comp.get(
                    "alteraPesos"
                )
                is False
            )
        )
    )

    testes.append(
        teste(
            "nao_altera_escalacoes",
            (
                seguranca_comp.get(
                    "alteraEscalacoes"
                )
                is False
            )
        )
    )

    testes.append(
        teste(
            "nao_altera_estrategia_oficial",
            (
                seguranca_comp.get(
                    "alteraEstrategiaOficial"
                )
                is False
            )
        )
    )

    testes.append(
        teste(
            "promocao_automatica_bloqueada",
            (
                seguranca_comp.get(
                    "promocaoAutomatica"
                )
                is False
            )
        )
    )

    testes.append(
        teste(
            "decisao_sem_promocao_automatica",
            (
                decisao_comp.get(
                    "promocaoAutomatica"
                )
                is False
            )
        )
    )

    # ==================================================
    # RESULTADO DOS TESTES
    # ==================================================

    quantidade_testes = len(
        testes
    )

    aprovados = sum(
        1
        for item in testes
        if item[
            "passou"
        ]
    )

    falhas_criticas = sum(
        1
        for item in testes
        if (
            not item[
                "passou"
            ]
            and
            item[
                "nivel"
            ]
            ==
            "CRITICO"
        )
    )

    alertas = sum(
        1
        for item in testes
        if (
            not item[
                "passou"
            ]
            and
            item[
                "nivel"
            ]
            !=
            "CRITICO"
        )
    )

    score = percentual(
        aprovados,
        quantidade_testes
    )

    if falhas_criticas == 0:

        decisao_auditoria = (
            "COMPARACAO_V3_VALIDADA"
        )

    else:

        decisao_auditoria = (
            "COMPARACAO_V3_REPROVADA"
        )

    resultado = {
        "modelo":
            MODELO_AUDITORIA,

        "descricao":
            (
                "Auditoria independente da comparação "
                "científica V1 x V2 x V3."
            ),

        "rodadasAuditadas":
            len(
                rodadas_comuns
            ),

        "testes":
            testes,

        "resumo": {
            "quantidadeTestes":
                quantidade_testes,

            "aprovados":
                aprovados,

            "falhasCriticas":
                falhas_criticas,

            "alertas":
                alertas,

            "scoreQualidade":
                arredondar(
                    score
                ),
        },

        "resultados": {
            "v1":
                metricas_v1,

            "v2":
                metricas_v2,

            "v3":
                metricas_v3,

            "estrategiasFixas":
                metricas_fixas,

            "melhorEstrategiaFixa":
                melhor_fixa,

            "oraculo":
                metricas_oraculo,

            "ganhos": {
                "v3VsV1":
                    arredondar(
                        ganho_v3_v1
                    ),

                "v3VsV2":
                    arredondar(
                        ganho_v3_v2
                    ),

                "v3VsMelhorFixa":
                    arredondar(
                        ganho_v3_fixa
                    ),
            },

            "eficiencia": {
                "v1":
                    arredondar(
                        eficiencia_v1
                    ),

                "v2":
                    arredondar(
                        eficiencia_v2
                    ),

                "v3":
                    arredondar(
                        eficiencia_v3
                    ),
            },

            "pareadoV2V3":
                pareado,

            "escolhasV3": {
                estrategia:
                    series[
                        "escolhasV3"
                    ].get(
                        estrategia,
                        0
                    )

                for estrategia
                in ESTRATEGIAS
            },
        },

        "decisao":
            decisao_auditoria,

        "promocaoAutomatica":
            False,

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
                False,
        },
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
            rodadas_comuns
        )
    )

    print(
        "Testes:",
        quantidade_testes
    )

    print()

    print(
        "TESTES"
    )

    print(
        "----------------------------------------------"
    )

    for item in testes:

        status = (
            "OK"
            if item[
                "passou"
            ]
            else "FALHA"
        )

        print(
            f"[{status}] "
            f"{item['nome']} "
            f"({item['nivel']})"
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
        falhas_criticas
    )

    print(
        "Alertas:",
        alertas
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
        "Melhor fixa:",
        melhor_fixa,
        "|",
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
        "V3 x V1:",
        arredondar(
            ganho_v3_v1
        )
    )

    print(
        "V3 x V2:",
        arredondar(
            ganho_v3_v2
        )
    )

    print(
        "V3 x melhor fixa:",
        arredondar(
            ganho_v3_fixa
        )
    )

    print()

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
        "Desvio V1:",
        metricas_v1[
            "desvioPadrao"
        ]
    )

    print(
        "Desvio V2:",
        metricas_v2[
            "desvioPadrao"
        ]
    )

    print(
        "Desvio V3:",
        metricas_v3[
            "desvioPadrao"
        ]
    )

    print()

    print(
        "Pareado V2 x V3:"
    )

    print(
        "Vitórias V2:",
        pareado[
            "vitoriasV2"
        ]
    )

    print(
        "Vitórias V3:",
        pareado[
            "vitoriasV3"
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
        "Escolhas V3:"
    )

    for estrategia in ESTRATEGIAS:

        print(
            estrategia,
            ":",
            series[
                "escolhasV3"
            ].get(
                estrategia,
                0
            )
        )

    print()

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
