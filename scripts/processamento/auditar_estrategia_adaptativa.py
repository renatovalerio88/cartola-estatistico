"""
=========================================================
CARTOLA ESTATÍSTICO
Auditoria Científica da Estratégia Adaptativa

Versão:
auditoria_estrategia_adaptativa_v1

Entradas:
data/estrategia-adaptativa.json
data/simulacao-times.json

Saída:
data/auditoria-estrategia-adaptativa.json

Objetivo:
Validar cientificamente o backtest da estratégia
adaptativa antes que seus resultados possam ser usados
para qualquer evolução do modelo.

Testes principais:

1. arquivos necessários existem;
2. versões esperadas estão corretas;
3. existe amostra mínima;
4. somente estratégias válidas são escolhidas;
5. não existe vazamento de informação futura;
6. histórico usado cresce progressivamente;
7. pontuação adaptativa confere com a simulação;
8. melhor estratégia real confere com a simulação;
9. pontuação do oráculo confere;
10. perda para o oráculo confere;
11. acerto do oráculo confere;
12. totais e médias conferem;
13. contagem das escolhas confere;
14. estratégias fixas conferem;
15. comparação contra a melhor estratégia fixa confere;
16. eficiência contra o oráculo confere;
17. flags de segurança permanecem ativas.

IMPORTANTE:

Esta auditoria não promove automaticamente nenhuma
estratégia e não altera o modelo oficial.

=========================================================
"""

import json
import math

from pathlib import Path
from statistics import mean, median


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

ARQUIVO_ADAPTATIVO = (
    PASTA_DATA /
    "estrategia-adaptativa.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "auditoria-estrategia-adaptativa.json"
)


VERSAO_ADAPTATIVO = (
    "estrategia_adaptativa_v1"
)

VERSAO_AUDITORIA = (
    "auditoria_estrategia_adaptativa_v1"
)


ESTRATEGIAS = [

    "Conservador",
    "Equilibrado",
    "Agressivo"

]


MINIMO_RODADAS = 10

TOLERANCIA = 0.02

TOLERANCIA_EMPATE = 0.001


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


# ======================================================
# REGISTRO DOS TESTES
# ======================================================

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
# NORMALIZAÇÃO DA SIMULAÇÃO
# ======================================================

def normalizar_simulacao(
    simulacao
):

    resultado = {}

    if not isinstance(
        simulacao,
        dict
    ):

        return resultado

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        numero_rodada = rodada.get(
            "rodada"
        )

        if numero_rodada is None:

            continue

        estrategias = {}

        for estrategia in rodada.get(
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

        if estrategias:

            resultado[
                int(
                    numero_rodada
                )
            ] = estrategias

    return resultado


# ======================================================
# MELHOR ESTRATÉGIA REAL
# ======================================================

def obter_melhor_real(
    estrategias
):

    if not estrategias:

        return (
            None,
            0
        )

    maior = max(
        estrategias.values()
    )

    vencedores = [

        nome

        for nome, pontos
        in estrategias.items()

        if abs(
            pontos -
            maior
        ) <= TOLERANCIA_EMPATE

    ]

    # A estratégia adaptativa v1 utiliza max()
    # sobre a ordem original das estratégias.
    # Em caso de empate, reproduzimos a mesma regra.

    for nome in ESTRATEGIAS:

        if nome in vencedores:

            return (
                nome,
                maior
            )

    return (
        vencedores[
            0
        ],
        maior
    )


# ======================================================
# RESUMO FIXO CALCULADO PELA AUDITORIA
# ======================================================

def resumir_estrategia_fixa(
    simulacao_normalizada,
    estrategia
):

    pontos = []

    vitorias = 0

    for numero_rodada in sorted(
        simulacao_normalizada.keys()
    ):

        estrategias = (
            simulacao_normalizada[
                numero_rodada
            ]
        )

        if estrategia not in estrategias:

            continue

        valor = numero(
            estrategias[
                estrategia
            ]
        )

        pontos.append(
            valor
        )

        maior = max(
            estrategias.values()
        )

        if abs(
            valor -
            maior
        ) <= TOLERANCIA_EMPATE:

            vitorias += 1

    return {

        "rodadas":
            len(
                pontos
            ),

        "total":
            arredondar(
                sum(
                    pontos
                )
            ),

        "media":
            arredondar(
                media_segura(
                    pontos
                )
            ),

        "mediana":
            arredondar(
                mediana_segura(
                    pontos
                )
            ),

        "vitoriasRodada":
            vitorias,

        "taxaVitoriasPercentual":
            arredondar(
                percentual(
                    vitorias,
                    len(
                        pontos
                    )
                )
            )

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
        "AUDITORIA DA ESTRATÉGIA ADAPTATIVA"
    )

    print(
        "=============================================="
    )

    testes = []

    # ==================================================
    # EXISTÊNCIA DOS ARQUIVOS
    # ==================================================

    adaptativo = carregar_json(
        ARQUIVO_ADAPTATIVO
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    adaptativo_existe = isinstance(
        adaptativo,
        dict
    )

    simulacao_existe = isinstance(
        simulacao,
        dict
    )

    testes.append(
        criar_teste(
            "adaptativo_existe",
            adaptativo_existe,
            True
        )
    )

    testes.append(
        criar_teste(
            "simulacao_existe",
            simulacao_existe,
            True
        )
    )

    if not adaptativo_existe:

        adaptativo = {}

    if not simulacao_existe:

        simulacao = {}

    # ==================================================
    # VERSÃO
    # ==================================================

    versao_correta = (
        adaptativo.get(
            "modelo"
        )
        ==
        VERSAO_ADAPTATIVO
    )

    testes.append(
        criar_teste(
            "versao_adaptativo",
            versao_correta,
            True,
            {
                "esperada":
                    VERSAO_ADAPTATIVO,

                "encontrada":
                    adaptativo.get(
                        "modelo"
                    )
            }
        )
    )

    # ==================================================
    # NORMALIZAÇÃO
    # ==================================================

    simulacao_normalizada = (
        normalizar_simulacao(
            simulacao
        )
    )

    rodadas_adaptativas = (
        adaptativo.get(
            "rodadas",
            []
        )
    )

    if not isinstance(
        rodadas_adaptativas,
        list
    ):

        rodadas_adaptativas = []

    # ==================================================
    # AMOSTRA
    # ==================================================

    amostra_suficiente = (
        len(
            rodadas_adaptativas
        )
        >=
        MINIMO_RODADAS
    )

    testes.append(
        criar_teste(
            "amostra_minima",
            amostra_suficiente,
            True,
            {
                "rodadas":
                    len(
                        rodadas_adaptativas
                    ),

                "minimo":
                    MINIMO_RODADAS
            }
        )
    )

    # ==================================================
    # ESTRATÉGIAS VÁLIDAS
    # ==================================================

    escolhas_invalidas = []

    for item in rodadas_adaptativas:

        escolhida = item.get(
            "estrategiaEscolhida"
        )

        if escolhida not in ESTRATEGIAS:

            escolhas_invalidas.append({

                "rodada":
                    item.get(
                        "rodada"
                    ),

                "estrategia":
                    escolhida

            })

    testes.append(
        criar_teste(
            "estrategias_escolhidas_validas",
            len(
                escolhas_invalidas
            ) == 0,
            True,
            escolhas_invalidas
        )
    )

    # ==================================================
    # RODADAS EXISTEM NA SIMULAÇÃO
    # ==================================================

    rodadas_ausentes = []

    for item in rodadas_adaptativas:

        rodada = int(
            numero(
                item.get(
                    "rodada"
                )
            )
        )

        if rodada not in simulacao_normalizada:

            rodadas_ausentes.append(
                rodada
            )

    testes.append(
        criar_teste(
            "rodadas_presentes_simulacao",
            len(
                rodadas_ausentes
            ) == 0,
            True,
            rodadas_ausentes
        )
    )

    # ==================================================
    # HISTÓRICO PROGRESSIVO
    # ==================================================

    falhas_historico = []

    for indice, item in enumerate(
        rodadas_adaptativas
    ):

        informado = int(
            numero(
                item.get(
                    "quantidadeRodadasAnteriores"
                )
            )
        )

        esperado = indice

        if informado != esperado:

            falhas_historico.append({

                "rodada":
                    item.get(
                        "rodada"
                    ),

                "esperado":
                    esperado,

                "encontrado":
                    informado

            })

    testes.append(
        criar_teste(
            "historico_progressivo",
            len(
                falhas_historico
            ) == 0,
            True,
            falhas_historico
        )
    )

    # ==================================================
    # ORDEM CRONOLÓGICA
    # ==================================================

    numeros_rodadas = [

        int(
            numero(
                item.get(
                    "rodada"
                )
            )
        )

        for item in rodadas_adaptativas

    ]

    ordem_correta = (
        numeros_rodadas
        ==
        sorted(
            numeros_rodadas
        )
    )

    sem_duplicatas = (
        len(
            numeros_rodadas
        )
        ==
        len(
            set(
                numeros_rodadas
            )
        )
    )

    testes.append(
        criar_teste(
            "ordem_cronologica",
            ordem_correta,
            True,
            numeros_rodadas
        )
    )

    testes.append(
        criar_teste(
            "rodadas_sem_duplicidade",
            sem_duplicatas,
            True
        )
    )

    # ==================================================
    # COLD START
    # ==================================================

    minimo_historico = int(
        numero(
            adaptativo.get(
                "metodologia",
                {}
            ).get(
                "minimoHistorico"
            ),
            3
        )
    )

    estrategia_cold_start = (
        adaptativo.get(
            "metodologia",
            {}
        ).get(
            "estrategiaColdStart",
            "Equilibrado"
        )
    )

    falhas_cold_start = []

    for item in rodadas_adaptativas:

        quantidade_anterior = int(
            numero(
                item.get(
                    "quantidadeRodadasAnteriores"
                )
            )
        )

        if (
            quantidade_anterior
            <
            minimo_historico
        ):

            if (
                item.get(
                    "estrategiaEscolhida"
                )
                !=
                estrategia_cold_start
            ):

                falhas_cold_start.append({

                    "rodada":
                        item.get(
                            "rodada"
                        ),

                    "esperado":
                        estrategia_cold_start,

                    "encontrado":
                        item.get(
                            "estrategiaEscolhida"
                        )

                })

            if (
                item.get(
                    "motivoEscolha"
                )
                !=
                "cold_start"
            ):

                falhas_cold_start.append({

                    "rodada":
                        item.get(
                            "rodada"
                        ),

                    "motivoEsperado":
                        "cold_start",

                    "motivoEncontrado":
                        item.get(
                            "motivoEscolha"
                        )

                })

    testes.append(
        criar_teste(
            "cold_start_consistente",
            len(
                falhas_cold_start
            ) == 0,
            True,
            falhas_cold_start
        )
    )

    # ==================================================
    # AUSÊNCIA DE VAZAMENTO FUTURO
    # ==================================================

    seguranca = adaptativo.get(
        "seguranca",
        {}
    )

    metodologia = adaptativo.get(
        "metodologia",
        {}
    )

    sem_vazamento_flags = (

        metodologia.get(
            "semVazamentoFuturo"
        )
        is True

        and

        seguranca.get(
            "usaResultadoRodadaNaEscolha"
        )
        is False

        and

        seguranca.get(
            "usaSomenteRodadasAnteriores"
        )
        is True

    )

    testes.append(
        criar_teste(
            "flags_sem_vazamento",
            sem_vazamento_flags,
            True,
            {
                "metodologiaSemVazamento":
                    metodologia.get(
                        "semVazamentoFuturo"
                    ),

                "usaResultadoRodadaNaEscolha":
                    seguranca.get(
                        "usaResultadoRodadaNaEscolha"
                    ),

                "usaSomenteRodadasAnteriores":
                    seguranca.get(
                        "usaSomenteRodadasAnteriores"
                    )
            }
        )
    )

    # ==================================================
    # PONTUAÇÃO ADAPTATIVA
    # ==================================================

    falhas_pontuacao = []

    for item in rodadas_adaptativas:

        rodada = int(
            numero(
                item.get(
                    "rodada"
                )
            )
        )

        escolhida = item.get(
            "estrategiaEscolhida"
        )

        estrategias = simulacao_normalizada.get(
            rodada,
            {}
        )

        if escolhida not in estrategias:

            continue

        esperado = numero(
            estrategias[
                escolhida
            ]
        )

        encontrado = numero(
            item.get(
                "pontosAdaptativo"
            )
        )

        if not aproximadamente_igual(
            esperado,
            encontrado
        ):

            falhas_pontuacao.append({

                "rodada":
                    rodada,

                "estrategia":
                    escolhida,

                "esperado":
                    arredondar(
                        esperado
                    ),

                "encontrado":
                    arredondar(
                        encontrado
                    )

            })

    testes.append(
        criar_teste(
            "pontuacao_adaptativa_consistente",
            len(
                falhas_pontuacao
            ) == 0,
            True,
            falhas_pontuacao
        )
    )

    # ==================================================
    # ORÁCULO
    # ==================================================

    falhas_oraculo = []

    for item in rodadas_adaptativas:

        rodada = int(
            numero(
                item.get(
                    "rodada"
                )
            )
        )

        estrategias = simulacao_normalizada.get(
            rodada,
            {}
        )

        if not estrategias:

            continue

        melhor_real, pontos_melhor = (
            obter_melhor_real(
                estrategias
            )
        )

        informado_melhor = item.get(
            "melhorEstrategiaReal"
        )

        informado_pontos = numero(
            item.get(
                "pontosMelhorEstrategia"
            )
        )

        if (
            informado_melhor
            !=
            melhor_real
        ):

            falhas_oraculo.append({

                "rodada":
                    rodada,

                "campo":
                    "melhorEstrategiaReal",

                "esperado":
                    melhor_real,

                "encontrado":
                    informado_melhor

            })

        if not aproximadamente_igual(
            informado_pontos,
            pontos_melhor
        ):

            falhas_oraculo.append({

                "rodada":
                    rodada,

                "campo":
                    "pontosMelhorEstrategia",

                "esperado":
                    arredondar(
                        pontos_melhor
                    ),

                "encontrado":
                    arredondar(
                        informado_pontos
                    )

            })

    testes.append(
        criar_teste(
            "oraculo_consistente",
            len(
                falhas_oraculo
            ) == 0,
            True,
            falhas_oraculo
        )
    )

    # ==================================================
    # PERDA PARA ORÁCULO
    # ==================================================

    falhas_perda = []

    for item in rodadas_adaptativas:

        pontos_adaptativo = numero(
            item.get(
                "pontosAdaptativo"
            )
        )

        pontos_melhor = numero(
            item.get(
                "pontosMelhorEstrategia"
            )
        )

        perda_esperada = (
            pontos_melhor -
            pontos_adaptativo
        )

        perda_informada = numero(
            item.get(
                "perdaParaOraculo"
            )
        )

        if not aproximadamente_igual(
            perda_esperada,
            perda_informada
        ):

            falhas_perda.append({

                "rodada":
                    item.get(
                        "rodada"
                    ),

                "esperado":
                    arredondar(
                        perda_esperada
                    ),

                "encontrado":
                    arredondar(
                        perda_informada
                    )

            })

    testes.append(
        criar_teste(
            "perda_oraculo_consistente",
            len(
                falhas_perda
            ) == 0,
            True,
            falhas_perda
        )
    )

    # ==================================================
    # ACERTO MELHOR ESTRATÉGIA
    # ==================================================

    falhas_acerto = []

    for item in rodadas_adaptativas:

        perda = numero(
            item.get(
                "perdaParaOraculo"
            )
        )

        esperado = (
            abs(
                perda
            )
            <=
            TOLERANCIA
        )

        informado = (
            item.get(
                "acertouMelhorEstrategia"
            )
            is True
        )

        if esperado != informado:

            falhas_acerto.append({

                "rodada":
                    item.get(
                        "rodada"
                    ),

                "esperado":
                    esperado,

                "encontrado":
                    informado

            })

    testes.append(
        criar_teste(
            "acerto_melhor_consistente",
            len(
                falhas_acerto
            ) == 0,
            True,
            falhas_acerto
        )
    )

    # ==================================================
    # RECONSTRUÇÃO DOS RESULTADOS ADAPTATIVOS
    # ==================================================

    pontos_adaptativo = [

        numero(
            item.get(
                "pontosAdaptativo"
            )
        )

        for item in rodadas_adaptativas

    ]

    pontos_oraculo = [

        numero(
            item.get(
                "pontosMelhorEstrategia"
            )
        )

        for item in rodadas_adaptativas

    ]

    acertos_oraculo = sum(

        1

        for item in rodadas_adaptativas

        if item.get(
            "acertouMelhorEstrategia"
        )
        is True

    )

    resumo = adaptativo.get(
        "resumo",
        {}
    )

    resumo_adaptativo = resumo.get(
        "adaptativo",
        {}
    )

    resumo_oraculo = resumo.get(
        "oraculo",
        {}
    )

    total_calculado = sum(
        pontos_adaptativo
    )

    media_calculada = media_segura(
        pontos_adaptativo
    )

    mediana_calculada = mediana_segura(
        pontos_adaptativo
    )

    resumo_adaptativo_consistente = (

        aproximadamente_igual(
            resumo_adaptativo.get(
                "total"
            ),
            total_calculado
        )

        and

        aproximadamente_igual(
            resumo_adaptativo.get(
                "media"
            ),
            media_calculada
        )

        and

        aproximadamente_igual(
            resumo_adaptativo.get(
                "mediana"
            ),
            mediana_calculada
        )

        and

        int(
            numero(
                resumo_adaptativo.get(
                    "acertosMelhorEstrategia"
                )
            )
        )
        ==
        acertos_oraculo

    )

    testes.append(
        criar_teste(
            "resumo_adaptativo_consistente",
            resumo_adaptativo_consistente,
            True,
            {
                "totalCalculado":
                    arredondar(
                        total_calculado
                    ),

                "mediaCalculada":
                    arredondar(
                        media_calculada
                    ),

                "medianaCalculada":
                    arredondar(
                        mediana_calculada
                    ),

                "acertosCalculados":
                    acertos_oraculo
            }
        )
    )

    # ==================================================
    # TAXA DE ACERTO
    # ==================================================

    taxa_acerto_calculada = percentual(
        acertos_oraculo,
        len(
            rodadas_adaptativas
        )
    )

    taxa_acerto_consistente = (
        aproximadamente_igual(
            resumo_adaptativo.get(
                "taxaAcertoMelhorEstrategia"
            ),
            taxa_acerto_calculada
        )
    )

    testes.append(
        criar_teste(
            "taxa_acerto_consistente",
            taxa_acerto_consistente,
            True,
            {
                "calculada":
                    arredondar(
                        taxa_acerto_calculada
                    ),

                "informada":
                    resumo_adaptativo.get(
                        "taxaAcertoMelhorEstrategia"
                    )
            }
        )
    )

    # ==================================================
    # CONTAGEM DAS ESCOLHAS
    # ==================================================

    escolhas_calculadas = {

        nome: 0

        for nome in ESTRATEGIAS

    }

    for item in rodadas_adaptativas:

        nome = item.get(
            "estrategiaEscolhida"
        )

        if nome in escolhas_calculadas:

            escolhas_calculadas[
                nome
            ] += 1

    escolhas_informadas = resumo.get(
        "escolhasAdaptativo",
        {}
    )

    escolhas_consistentes = all(

        int(
            numero(
                escolhas_informadas.get(
                    nome
                )
            )
        )
        ==
        escolhas_calculadas[
            nome
        ]

        for nome in ESTRATEGIAS

    )

    testes.append(
        criar_teste(
            "contagem_escolhas_consistente",
            escolhas_consistentes,
            True,
            {
                "calculadas":
                    escolhas_calculadas,

                "informadas":
                    escolhas_informadas
            }
        )
    )

    # ==================================================
    # ESTRATÉGIAS FIXAS
    # ==================================================

    fixas_calculadas = {

        nome:
            resumir_estrategia_fixa(
                simulacao_normalizada,
                nome
            )

        for nome in ESTRATEGIAS

    }

    fixas_informadas = adaptativo.get(
        "estrategiasFixas",
        {}
    )

    falhas_fixas = []

    for nome in ESTRATEGIAS:

        calculada = fixas_calculadas[
            nome
        ]

        informada = fixas_informadas.get(
            nome,
            {}
        )

        campos_numericos = [

            "rodadas",
            "total",
            "media",
            "mediana",
            "vitoriasRodada",
            "taxaVitoriasPercentual"

        ]

        for campo in campos_numericos:

            if not aproximadamente_igual(
                calculada.get(
                    campo
                ),
                informada.get(
                    campo
                )
            ):

                falhas_fixas.append({

                    "estrategia":
                        nome,

                    "campo":
                        campo,

                    "esperado":
                        calculada.get(
                            campo
                        ),

                    "encontrado":
                        informada.get(
                            campo
                        )

                })

    testes.append(
        criar_teste(
            "estrategias_fixas_consistentes",
            len(
                falhas_fixas
            ) == 0,
            True,
            falhas_fixas
        )
    )

    # ==================================================
    # MELHOR ESTRATÉGIA FIXA
    # ==================================================

    melhor_fixa_calculada = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                fixas_calculadas[
                    nome
                ][
                    "media"
                ]
            )

    )

    melhor_fixa_informada = resumo.get(
        "melhorEstrategiaFixa"
    )

    testes.append(
        criar_teste(
            "melhor_estrategia_fixa_consistente",
            melhor_fixa_calculada
            ==
            melhor_fixa_informada,
            True,
            {
                "calculada":
                    melhor_fixa_calculada,

                "informada":
                    melhor_fixa_informada
            }
        )
    )

    # ==================================================
    # COMPARAÇÃO ADAPTATIVO VS MELHOR FIXA
    # ==================================================

    melhor_fixa = fixas_calculadas[
        melhor_fixa_calculada
    ]

    media_melhor_fixa = numero(
        melhor_fixa.get(
            "media"
        )
    )

    total_melhor_fixa = numero(
        melhor_fixa.get(
            "total"
        )
    )

    ganho_media = (
        media_calculada -
        media_melhor_fixa
    )

    ganho_total = (
        total_calculado -
        total_melhor_fixa
    )

    ganho_percentual = percentual(
        ganho_media,
        media_melhor_fixa
    )

    comparacao = resumo.get(
        "comparacaoAdaptativoVsMelhorFixa",
        {}
    )

    comparacao_consistente = (

        aproximadamente_igual(
            comparacao.get(
                "ganhoMedia"
            ),
            ganho_media
        )

        and

        aproximadamente_igual(
            comparacao.get(
                "ganhoTotal"
            ),
            ganho_total
        )

        and

        aproximadamente_igual(
            comparacao.get(
                "ganhoPercentual"
            ),
            ganho_percentual
        )

    )

    testes.append(
        criar_teste(
            "comparacao_melhor_fixa_consistente",
            comparacao_consistente,
            True,
            {
                "ganhoMediaCalculado":
                    arredondar(
                        ganho_media
                    ),

                "ganhoTotalCalculado":
                    arredondar(
                        ganho_total
                    ),

                "ganhoPercentualCalculado":
                    arredondar(
                        ganho_percentual
                    )
            }
        )
    )

    # ==================================================
    # ORÁCULO RESUMIDO
    # ==================================================

    total_oraculo = sum(
        pontos_oraculo
    )

    media_oraculo = media_segura(
        pontos_oraculo
    )

    eficiencia_oraculo = percentual(
        media_calculada,
        media_oraculo
    )

    oraculo_consistente = (

        aproximadamente_igual(
            resumo_oraculo.get(
                "total"
            ),
            total_oraculo
        )

        and

        aproximadamente_igual(
            resumo_oraculo.get(
                "media"
            ),
            media_oraculo
        )

        and

        aproximadamente_igual(
            resumo_oraculo.get(
                "eficienciaAdaptativoPercentual"
            ),
            eficiencia_oraculo
        )

    )

    testes.append(
        criar_teste(
            "resumo_oraculo_consistente",
            oraculo_consistente,
            True,
            {
                "totalCalculado":
                    arredondar(
                        total_oraculo
                    ),

                "mediaCalculada":
                    arredondar(
                        media_oraculo
                    ),

                "eficienciaCalculada":
                    arredondar(
                        eficiencia_oraculo
                    )
            }
        )
    )

    # ==================================================
    # SEGURANÇA
    # ==================================================

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
            "promocaoAutomatica"
        )
        is False

    )

    testes.append(
        criar_teste(
            "seguranca_modelo_oficial",
            seguranca_ok,
            True,
            seguranca
        )
    )

    # ==================================================
    # PROMOÇÃO AUTOMÁTICA
    # ==================================================

    decisao = adaptativo.get(
        "decisao",
        {}
    )

    promocao_automatica_desativada = (

        decisao.get(
            "promocaoAutomatica"
        )
        is False

        and

        decisao.get(
            "promover"
        )
        is False

    )

    testes.append(
        criar_teste(
            "promocao_automatica_desativada",
            promocao_automatica_desativada,
            True,
            decisao
        )
    )

    # ==================================================
    # RESULTADO DA AUDITORIA
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

    testes_aprovados = sum(

        1

        for teste in testes

        if teste[
            "passou"
        ]

    )

    score_qualidade = percentual(
        testes_aprovados,
        len(
            testes
        )
    )

    if falhas_criticas:

        decisao_auditoria = (
            "ESTRATEGIA_ADAPTATIVA_REPROVADA"
        )

    elif alertas:

        decisao_auditoria = (
            "ESTRATEGIA_ADAPTATIVA_VALIDADA_COM_ALERTAS"
        )

    else:

        decisao_auditoria = (
            "ESTRATEGIA_ADAPTATIVA_VALIDADA"
        )

    # ==================================================
    # SAÍDA
    # ==================================================

    resultado = {

        "modelo":
            VERSAO_AUDITORIA,

        "descricao":
            (
                "Auditoria científica do backtest "
                "progressivo da estratégia adaptativa."
            ),

        "resumo": {

            "rodadasAuditadas":
                len(
                    rodadas_adaptativas
                ),

            "testes":
                len(
                    testes
                ),

            "testesAprovados":
                testes_aprovados,

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
                    score_qualidade
                ),

            "melhorEstrategiaFixa":
                melhor_fixa_calculada,

            "mediaAdaptativo":
                arredondar(
                    media_calculada
                ),

            "mediaMelhorFixa":
                arredondar(
                    media_melhor_fixa
                ),

            "ganhoAdaptativoVsMelhorFixa":
                arredondar(
                    ganho_media
                ),

            "ganhoPercentualAdaptativoVsMelhorFixa":
                arredondar(
                    ganho_percentual
                ),

            "mediaOraculo":
                arredondar(
                    media_oraculo
                ),

            "eficienciaVsOraculoPercentual":
                arredondar(
                    eficiencia_oraculo
                )

        },

        "testes":
            testes,

        "falhasCriticas":
            falhas_criticas,

        "alertas":
            alertas,

        "decisao": {

            "decisao":
                decisao_auditoria,

            "validado":
                len(
                    falhas_criticas
                ) == 0,

            "promover":
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
            rodadas_adaptativas
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
            score_qualidade
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
        "COMPARAÇÃO"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Adaptativo:",
        arredondar(
            media_calculada
        )
    )

    print(
        "Melhor fixa:",
        melhor_fixa_calculada,
        "|",
        arredondar(
            media_melhor_fixa
        )
    )

    print(
        "Ganho:",
        arredondar(
            ganho_media
        ),
        "pontos/rodada"
    )

    print(
        "Ganho percentual:",
        arredondar(
            ganho_percentual
        ),
        "%"
    )

    print(
        "Oráculo:",
        arredondar(
            media_oraculo
        )
    )

    print(
        "Eficiência vs oráculo:",
        arredondar(
            eficiencia_oraculo
        ),
        "%"
    )

    print()

    print(
        "DECISÃO:",
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
