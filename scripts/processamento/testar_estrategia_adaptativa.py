"""
=========================================================
CARTOLA ESTATÍSTICO
Backtest da Estratégia Adaptativa

Versão:
estrategia_adaptativa_v1

Entrada:
data/simulacao-times.json

Saída:
data/estrategia-adaptativa.json

Objetivo:
Testar uma estratégia dinâmica capaz de escolher entre:

- Conservador
- Equilibrado
- Agressivo

A escolha da estratégia para uma rodada utiliza SOMENTE
informações disponíveis nas rodadas anteriores.

Isso permite comparar:

1. estratégia adaptativa;
2. Conservador fixo;
3. Equilibrado fixo;
4. Agressivo fixo;
5. melhor estratégia possível da rodada (oráculo).

IMPORTANTE:

O oráculo é apenas referência teórica.
Ele conhece o resultado da rodada e nunca pode ser usado
para escolher a estratégia real.

O modelo adaptativo não altera o sistema oficial.

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

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "estrategia-adaptativa.json"
)


ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo"
]


MINIMO_HISTORICO = 3

JANELA_RECENTE = 5

TOLERANCIA_EMPATE = 0.001


# ======================================================
# PESOS DA DECISÃO ADAPTATIVA
# ======================================================

PESO_MEDIA_GERAL = 0.30

PESO_MEDIA_RECENTE = 0.30

PESO_MEDIANA = 0.15

PESO_TAXA_VITORIAS = 0.15

PESO_ESTABILIDADE = 0.10


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
            f"[ERRO] Falha ao ler "
            f"{caminho}: {erro}"
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


# ======================================================
# LEITURA SEGURA DAS PONTUAÇÕES
# ======================================================

def obter_primeiro_numero(
    dados,
    campos,
    padrao=None
):

    if not isinstance(
        dados,
        dict
    ):
        return padrao

    for campo in campos:

        if campo not in dados:
            continue

        valor = dados.get(
            campo
        )

        if valor is None:
            continue

        try:

            resultado = float(
                valor
            )

            if math.isfinite(
                resultado
            ):
                return resultado

        except Exception:
            continue

    return padrao


def obter_pontuacao_com_capitao(
    estrategia
):

    """
    Lê a pontuação real da estratégia de forma tolerante
    às diferentes versões do simulacao-times.json.

    A prioridade continua sendo pontuacaoComCapitao.

    Os campos alternativos existem apenas para impedir que
    uma mudança de estrutura do JSON transforme uma
    pontuação válida em zero.
    """

    if not isinstance(
        estrategia,
        dict
    ):
        return None

    valor = obter_primeiro_numero(
        estrategia,
        [
            "pontuacaoComCapitao",
            "pontosComCapitao",
            "pontuacaoRealComCapitao",
            "pontuacaoFinal",
            "pontos",
            "pontuacaoReal",
            "pontuacao"
        ],
        None
    )

    if valor is not None:
        return valor

    resultado = estrategia.get(
        "resultado"
    )

    valor = obter_primeiro_numero(
        resultado,
        [
            "pontuacaoComCapitao",
            "pontosComCapitao",
            "pontuacaoRealComCapitao",
            "pontuacaoFinal",
            "pontos",
            "pontuacaoReal",
            "pontuacao"
        ],
        None
    )

    if valor is not None:
        return valor

    metricas = estrategia.get(
        "metricas"
    )

    valor = obter_primeiro_numero(
        metricas,
        [
            "pontuacaoComCapitao",
            "pontosComCapitao",
            "pontuacaoRealComCapitao",
            "pontuacaoFinal",
            "pontos",
            "pontuacaoReal",
            "pontuacao"
        ],
        None
    )

    return valor


def obter_pontuacao_sem_capitao(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):
        return None

    valor = obter_primeiro_numero(
        estrategia,
        [
            "pontuacaoSemCapitao",
            "pontosSemCapitao"
        ],
        None
    )

    if valor is not None:
        return valor

    resultado = estrategia.get(
        "resultado"
    )

    valor = obter_primeiro_numero(
        resultado,
        [
            "pontuacaoSemCapitao",
            "pontosSemCapitao"
        ],
        None
    )

    if valor is not None:
        return valor

    return obter_pontuacao_com_capitao(
        estrategia
    )


def obter_bonus_capitao(
    estrategia,
    pontos_com_capitao=None,
    pontos_sem_capitao=None
):

    if not isinstance(
        estrategia,
        dict
    ):
        return 0.0

    valor = obter_primeiro_numero(
        estrategia,
        [
            "bonusCapitao",
            "bonus_capitao"
        ],
        None
    )

    if valor is None:

        resultado = estrategia.get(
            "resultado"
        )

        valor = obter_primeiro_numero(
            resultado,
            [
                "bonusCapitao",
                "bonus_capitao"
            ],
            None
        )

    if valor is not None:
        return valor

    if (
        pontos_com_capitao is not None
        and
        pontos_sem_capitao is not None
    ):

        return (
            pontos_com_capitao -
            pontos_sem_capitao
        )

    return 0.0


def obter_cobertura(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):
        return 0.0

    valor = obter_primeiro_numero(
        estrategia,
        [
            "coberturaResultadosPercentual",
            "coberturaPercentual",
            "cobertura"
        ],
        None
    )

    if valor is not None:
        return valor

    auditoria = estrategia.get(
        "auditoria"
    )

    valor = obter_primeiro_numero(
        auditoria,
        [
            "coberturaResultadosPercentual",
            "coberturaPercentual",
            "cobertura"
        ],
        None
    )

    if valor is not None:
        return valor

    return 0.0


def obter_mae(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):
        return 0.0

    valor = obter_primeiro_numero(
        estrategia,
        [
            "maeJogadores",
            "mae"
        ],
        None
    )

    if valor is not None:
        return valor

    metricas = estrategia.get(
        "metricas"
    )

    valor = obter_primeiro_numero(
        metricas,
        [
            "maeJogadores",
            "mae"
        ],
        None
    )

    if valor is not None:
        return valor

    return 0.0


# ======================================================
# NORMALIZAÇÃO DAS RODADAS
# ======================================================

def carregar_rodadas(
    simulacao
):

    rodadas = []

    if not isinstance(
        simulacao,
        dict
    ):
        return rodadas

    rodadas_brutas = simulacao.get(
        "rodadas",
        []
    )

    if not isinstance(
        rodadas_brutas,
        list
    ):
        return rodadas

    for rodada in rodadas_brutas:

        if not isinstance(
            rodada,
            dict
        ):
            continue

        numero_rodada = rodada.get(
            "rodada"
        )

        if numero_rodada is None:
            continue

        estrategias = {}

        estrategias_brutas = rodada.get(
            "estrategias",
            []
        )

        if isinstance(
            estrategias_brutas,
            dict
        ):

            estrategias_iteraveis = []

            for nome, dados in (
                estrategias_brutas.items()
            ):

                if not isinstance(
                    dados,
                    dict
                ):
                    continue

                copia = dict(
                    dados
                )

                copia.setdefault(
                    "nome",
                    nome
                )

                estrategias_iteraveis.append(
                    copia
                )

        elif isinstance(
            estrategias_brutas,
            list
        ):

            estrategias_iteraveis = (
                estrategias_brutas
            )

        else:

            estrategias_iteraveis = []

        for estrategia in estrategias_iteraveis:

            if not isinstance(
                estrategia,
                dict
            ):
                continue

            nome = estrategia.get(
                "nome"
            )

            if nome not in ESTRATEGIAS:
                continue

            pontos = (
                obter_pontuacao_com_capitao(
                    estrategia
                )
            )

            # --------------------------------------------------
            # PROTEÇÃO PRINCIPAL
            #
            # Pontuação ausente não pode virar 0 silenciosamente.
            # A estratégia é ignorada nesta rodada caso nenhum
            # campo válido de pontuação seja encontrado.
            # --------------------------------------------------

            if pontos is None:

                print(
                    f"[ALERTA] Rodada "
                    f"{numero_rodada} | "
                    f"{nome}: pontuação não encontrada."
                )

                continue

            pontos_sem_capitao = (
                obter_pontuacao_sem_capitao(
                    estrategia
                )
            )

            if pontos_sem_capitao is None:
                pontos_sem_capitao = pontos

            bonus_capitao = (
                obter_bonus_capitao(
                    estrategia,
                    pontos,
                    pontos_sem_capitao
                )
            )

            estrategias[
                nome
            ] = {

                "pontos":
                    pontos,

                "pontosSemCapitao":
                    pontos_sem_capitao,

                "bonusCapitao":
                    bonus_capitao,

                "cobertura":
                    obter_cobertura(
                        estrategia
                    ),

                "mae":
                    obter_mae(
                        estrategia
                    )

            }

        if estrategias:

            try:

                rodada_normalizada = int(
                    numero_rodada
                )

            except Exception:

                rodada_normalizada = int(
                    numero(
                        numero_rodada
                    )
                )

            rodadas.append({

                "rodada":
                    rodada_normalizada,

                "estrategias":
                    estrategias

            })

    rodadas.sort(
        key=lambda item:
            item[
                "rodada"
            ]
    )

    return rodadas


# ======================================================
# HISTÓRICO ANTERIOR
# ======================================================

def obter_historico_anterior(
    rodadas,
    indice_atual
):

    return rodadas[
        :indice_atual
    ]


def pontos_historicos(
    historico,
    estrategia
):

    pontos = []

    for rodada in historico:

        dados = rodada.get(
            "estrategias",
            {}
        ).get(
            estrategia
        )

        if dados is None:
            continue

        pontos.append(
            numero(
                dados.get(
                    "pontos"
                )
            )
        )

    return pontos


# ======================================================
# VITÓRIAS HISTÓRICAS
# ======================================================

def calcular_vitorias_historicas(
    historico
):

    resultado = {

        nome: {

            "participacoes":
                0,

            "vitorias":
                0,

            "empates":
                0

        }

        for nome in ESTRATEGIAS

    }

    for rodada in historico:

        estrategias = rodada.get(
            "estrategias",
            {}
        )

        candidatos = []

        for nome in ESTRATEGIAS:

            if nome not in estrategias:
                continue

            resultado[
                nome
            ][
                "participacoes"
            ] += 1

            candidatos.append({

                "nome":
                    nome,

                "pontos":
                    numero(
                        estrategias[
                            nome
                        ].get(
                            "pontos"
                        )
                    )

            })

        if not candidatos:
            continue

        maior = max(

            item[
                "pontos"
            ]

            for item in candidatos

        )

        vencedores = [

            item[
                "nome"
            ]

            for item in candidatos

            if abs(

                item[
                    "pontos"
                ] -
                maior

            ) <= TOLERANCIA_EMPATE

        ]

        for nome in vencedores:

            if len(
                vencedores
            ) == 1:

                resultado[
                    nome
                ][
                    "vitorias"
                ] += 1

            else:

                resultado[
                    nome
                ][
                    "empates"
                ] += 1

    return resultado


# ======================================================
# NORMALIZAÇÃO RELATIVA
# ======================================================

def normalizar_valores(
    valores
):

    if not valores:
        return {}

    minimo = min(
        valores.values()
    )

    maximo = max(
        valores.values()
    )

    amplitude = (
        maximo -
        minimo
    )

    if abs(
        amplitude
    ) <= TOLERANCIA_EMPATE:

        return {

            nome:
                50.0

            for nome in valores

        }

    return {

        nome:

            (
                (
                    valor -
                    minimo
                )
                /
                amplitude
            )
            *
            100

        for nome, valor
        in valores.items()

    }


# ======================================================
# MÉTRICAS HISTÓRICAS
# ======================================================

def calcular_metricas(
    historico
):

    vitorias = (
        calcular_vitorias_historicas(
            historico
        )
    )

    metricas = {}

    for estrategia in ESTRATEGIAS:

        pontos = pontos_historicos(
            historico,
            estrategia
        )

        recentes = pontos[
            -JANELA_RECENTE:
        ]

        participacoes = numero(

            vitorias.get(
                estrategia,
                {}
            ).get(
                "participacoes"
            )

        )

        quantidade_vitorias = numero(

            vitorias.get(
                estrategia,
                {}
            ).get(
                "vitorias"
            )

        )

        media_geral = (

            mean(
                pontos
            )

            if pontos

            else 0

        )

        media_recente = (

            mean(
                recentes
            )

            if recentes

            else 0

        )

        mediana_geral = (

            median(
                pontos
            )

            if pontos

            else 0

        )

        desvio = (

            pstdev(
                pontos
            )

            if len(
                pontos
            ) >= 2

            else 0

        )

        taxa_vitorias = percentual(
            quantidade_vitorias,
            participacoes
        )

        # Quanto menor a volatilidade,
        # maior a estabilidade.

        estabilidade = max(

            0,

            100 -
            (
                desvio *
                8
            )

        )

        metricas[
            estrategia
        ] = {

            "amostra":
                len(
                    pontos
                ),

            "mediaGeral":
                media_geral,

            "mediaRecente":
                media_recente,

            "mediana":
                mediana_geral,

            "desvioPadrao":
                desvio,

            "taxaVitorias":
                taxa_vitorias,

            "estabilidade":
                estabilidade

        }

    return metricas


# ======================================================
# SCORE ADAPTATIVO
# ======================================================

def calcular_scores(
    metricas
):

    medias_gerais = {

        nome:
            dados[
                "mediaGeral"
            ]

        for nome, dados
        in metricas.items()

    }

    medias_recentes = {

        nome:
            dados[
                "mediaRecente"
            ]

        for nome, dados
        in metricas.items()

    }

    medianas = {

        nome:
            dados[
                "mediana"
            ]

        for nome, dados
        in metricas.items()

    }

    taxas_vitorias = {

        nome:
            dados[
                "taxaVitorias"
            ]

        for nome, dados
        in metricas.items()

    }

    estabilidades = {

        nome:
            dados[
                "estabilidade"
            ]

        for nome, dados
        in metricas.items()

    }

    normal_media = normalizar_valores(
        medias_gerais
    )

    normal_recente = normalizar_valores(
        medias_recentes
    )

    normal_mediana = normalizar_valores(
        medianas
    )

    normal_vitorias = normalizar_valores(
        taxas_vitorias
    )

    normal_estabilidade = normalizar_valores(
        estabilidades
    )

    scores = {}

    for nome in ESTRATEGIAS:

        componentes = {

            "mediaGeral":
                numero(
                    normal_media.get(
                        nome
                    )
                ),

            "mediaRecente":
                numero(
                    normal_recente.get(
                        nome
                    )
                ),

            "mediana":
                numero(
                    normal_mediana.get(
                        nome
                    )
                ),

            "taxaVitorias":
                numero(
                    normal_vitorias.get(
                        nome
                    )
                ),

            "estabilidade":
                numero(
                    normal_estabilidade.get(
                        nome
                    )
                )

        }

        score = (

              componentes[
                  "mediaGeral"
              ]
              *
              PESO_MEDIA_GERAL

            + componentes[
                  "mediaRecente"
              ]
              *
              PESO_MEDIA_RECENTE

            + componentes[
                  "mediana"
              ]
              *
              PESO_MEDIANA

            + componentes[
                  "taxaVitorias"
              ]
              *
              PESO_TAXA_VITORIAS

            + componentes[
                  "estabilidade"
              ]
              *
              PESO_ESTABILIDADE

        )

        scores[
            nome
        ] = {

            "score":
                score,

            "componentes":
                componentes

        }

    return scores


# ======================================================
# ESCOLHA ADAPTATIVA
# ======================================================

def escolher_estrategia(
    historico
):

    if len(
        historico
    ) < MINIMO_HISTORICO:

        return {

            "estrategia":
                "Equilibrado",

            "motivo":
                "cold_start",

            "metricas":
                {},

            "scores":
                {}

        }

    metricas = calcular_metricas(
        historico
    )

    scores = calcular_scores(
        metricas
    )

    ranking = sorted(

        ESTRATEGIAS,

        key=lambda nome: (

            numero(
                scores.get(
                    nome,
                    {}
                ).get(
                    "score"
                )
            ),

            numero(
                metricas.get(
                    nome,
                    {}
                ).get(
                    "mediaRecente"
                )
            ),

            numero(
                metricas.get(
                    nome,
                    {}
                ).get(
                    "mediaGeral"
                )
            )

        ),

        reverse=True

    )

    escolhida = ranking[
        0
    ]

    return {

        "estrategia":
            escolhida,

        "motivo":
            "score_historico",

        "metricas":
            metricas,

        "scores":
            scores,

        "ranking":
            ranking

    }


# ======================================================
# MELHOR ESTRATÉGIA DA RODADA
#
# Apenas referência teórica.
# Usa o resultado da própria rodada.
# Nunca participa da escolha adaptativa.
# ======================================================

def obter_oraculo(
    rodada
):

    estrategias = rodada.get(
        "estrategias",
        {}
    )

    if not estrategias:
        return None

    return max(

        estrategias.keys(),

        key=lambda nome:
            numero(
                estrategias[
                    nome
                ].get(
                    "pontos"
                )
            )

    )


# ======================================================
# RESUMO DE UMA ESTRATÉGIA FIXA
# ======================================================

def resumir_fixa(
    rodadas,
    estrategia
):

    pontos = []

    vitorias = 0

    for rodada in rodadas:

        estrategias = rodada.get(
            "estrategias",
            {}
        )

        if estrategia not in estrategias:
            continue

        valor = numero(
            estrategias[
                estrategia
            ].get(
                "pontos"
            )
        )

        pontos.append(
            valor
        )

        maior = max(

            numero(
                item.get(
                    "pontos"
                )
            )

            for item
            in estrategias.values()

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

                mean(
                    pontos
                )

                if pontos

                else 0

            ),

        "mediana":
            arredondar(

                median(
                    pontos
                )

                if pontos

                else 0

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
        "BACKTEST DA ESTRATÉGIA ADAPTATIVA"
    )

    print(
        "=============================================="
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    if not isinstance(
        simulacao,
        dict
    ):
        simulacao = {}

    rodadas = carregar_rodadas(
        simulacao
    )

    if not rodadas:

        resultado = {

            "modelo":
                "estrategia_adaptativa_v1",

            "status":
                "sem_dados",

            "rodadas":
                []

        }

        salvar_json(
            ARQUIVO_SAIDA,
            resultado
        )

        print(
            "Nenhuma rodada encontrada."
        )

        return

    resultados = []

    pontos_adaptativo = []

    pontos_oraculo = []

    acertos_oraculo = 0

    escolhas = {

        nome: 0

        for nome in ESTRATEGIAS

    }

    # ==================================================
    # BACKTEST PROGRESSIVO
    # ==================================================

    for indice, rodada in enumerate(
        rodadas
    ):

        historico = (
            obter_historico_anterior(
                rodadas,
                indice
            )
        )

        decisao_escolha = escolher_estrategia(
            historico
        )

        escolhida = decisao_escolha.get(
            "estrategia"
        )

        estrategias_rodada = rodada.get(
            "estrategias",
            {}
        )

        if escolhida not in estrategias_rodada:
            continue

        pontos_escolhida = numero(

            estrategias_rodada[
                escolhida
            ].get(
                "pontos"
            )

        )

        oraculo = obter_oraculo(
            rodada
        )

        pontos_melhor = (

            numero(

                estrategias_rodada[
                    oraculo
                ].get(
                    "pontos"
                )

            )

            if oraculo

            else 0

        )

        perda_oraculo = (
            pontos_melhor -
            pontos_escolhida
        )

        acertou_melhor = (

            abs(
                perda_oraculo
            )
            <=
            TOLERANCIA_EMPATE

        )

        if acertou_melhor:
            acertos_oraculo += 1

        escolhas[
            escolhida
        ] = (
            escolhas.get(
                escolhida,
                0
            )
            +
            1
        )

        pontos_adaptativo.append(
            pontos_escolhida
        )

        pontos_oraculo.append(
            pontos_melhor
        )

        scores_resumidos = {}

        for nome, dados_score in (
            decisao_escolha.get(
                "scores",
                {}
            ).items()
        ):

            scores_resumidos[
                nome
            ] = arredondar(
                dados_score.get(
                    "score"
                ),
                3
            )

        resultados.append({

            "rodada":
                rodada.get(
                    "rodada"
                ),

            "quantidadeRodadasAnteriores":
                len(
                    historico
                ),

            "estrategiaEscolhida":
                escolhida,

            "motivoEscolha":
                decisao_escolha.get(
                    "motivo"
                ),

            "rankingAntesRodada":
                decisao_escolha.get(
                    "ranking",
                    []
                ),

            "scoresAntesRodada":
                scores_resumidos,

            "pontosAdaptativo":
                arredondar(
                    pontos_escolhida
                ),

            "melhorEstrategiaReal":
                oraculo,

            "pontosMelhorEstrategia":
                arredondar(
                    pontos_melhor
                ),

            "perdaParaOraculo":
                arredondar(
                    perda_oraculo
                ),

            "acertouMelhorEstrategia":
                acertou_melhor

        })

        print(

            f"Rodada "
            f"{rodada.get('rodada'):02d}"

            f" | histórico: "
            f"{len(historico)}"

            f" | escolha: "
            f"{escolhida}"

            f" | pontos: "
            f"{arredondar(pontos_escolhida)}"

            f" | melhor: "
            f"{oraculo}"

            f" | teto: "
            f"{arredondar(pontos_melhor)}"

        )

    # ==================================================
    # ESTRATÉGIAS FIXAS
    # ==================================================

    fixas = {

        nome:
            resumir_fixa(
                rodadas,
                nome
            )

        for nome in ESTRATEGIAS

    }

    # ==================================================
    # MELHOR ESTRATÉGIA FIXA
    # ==================================================

    melhor_fixa = max(

        ESTRATEGIAS,

        key=lambda nome:
            numero(
                fixas[
                    nome
                ].get(
                    "media"
                )
            )

    )

    media_adaptativo = (

        mean(
            pontos_adaptativo
        )

        if pontos_adaptativo

        else 0

    )

    total_adaptativo = sum(
        pontos_adaptativo
    )

    mediana_adaptativo = (

        median(
            pontos_adaptativo
        )

        if pontos_adaptativo

        else 0

    )

    media_oraculo = (

        mean(
            pontos_oraculo
        )

        if pontos_oraculo

        else 0

    )

    total_oraculo = sum(
        pontos_oraculo
    )

    media_melhor_fixa = numero(

        fixas[
            melhor_fixa
        ].get(
            "media"
        )

    )

    total_melhor_fixa = numero(

        fixas[
            melhor_fixa
        ].get(
            "total"
        )

    )

    ganho_media_vs_fixa = (
        media_adaptativo -
        media_melhor_fixa
    )

    ganho_total_vs_fixa = (
        total_adaptativo -
        total_melhor_fixa
    )

    ganho_percentual_vs_fixa = percentual(
        ganho_media_vs_fixa,
        media_melhor_fixa
    )

    eficiencia_oraculo = percentual(
        media_adaptativo,
        media_oraculo
    )

    taxa_acerto_melhor = percentual(
        acertos_oraculo,
        len(
            resultados
        )
    )

    # ==================================================
    # DECISÃO EXPERIMENTAL
    # ==================================================

    adaptativo_superou_fixa = (
        ganho_media_vs_fixa > 0
    )

    adaptativo_superou_fixa_1pct = (
        ganho_percentual_vs_fixa >= 1.0
    )

    amostra_suficiente = (
        len(
            resultados
        ) >= 10
    )

    if (
        adaptativo_superou_fixa
        and
        adaptativo_superou_fixa_1pct
        and
        amostra_suficiente
    ):

        decisao_final = (
            "ADAPTATIVO_CANDIDATO"
        )

    elif (
        adaptativo_superou_fixa
        and
        amostra_suficiente
    ):

        decisao_final = (
            "ADAPTATIVO_PROMISSORIO"
        )

    else:

        decisao_final = (
            "MANTER_ESTRATEGIAS_FIXAS"
        )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "estrategia_adaptativa_v1",

        "descricao":
            (
                "Backtest progressivo de uma estratégia "
                "que escolhe Conservador, Equilibrado ou "
                "Agressivo utilizando exclusivamente "
                "rodadas anteriores."
            ),

        "metodologia": {

            "semVazamentoFuturo":
                True,

            "minimoHistorico":
                MINIMO_HISTORICO,

            "estrategiaColdStart":
                "Equilibrado",

            "janelaRecente":
                JANELA_RECENTE,

            "pesos": {

                "mediaGeral":
                    PESO_MEDIA_GERAL,

                "mediaRecente":
                    PESO_MEDIA_RECENTE,

                "mediana":
                    PESO_MEDIANA,

                "taxaVitorias":
                    PESO_TAXA_VITORIAS,

                "estabilidade":
                    PESO_ESTABILIDADE

            },

            "observacaoOraculo":
                (
                    "O oráculo conhece o resultado da rodada "
                    "e é utilizado somente como referência "
                    "teórica de desempenho máximo."
                )

        },

        "resumo": {

            "rodadas":
                len(
                    resultados
                ),

            "adaptativo": {

                "total":
                    arredondar(
                        total_adaptativo
                    ),

                "media":
                    arredondar(
                        media_adaptativo
                    ),

                "mediana":
                    arredondar(
                        mediana_adaptativo
                    ),

                "acertosMelhorEstrategia":
                    acertos_oraculo,

                "taxaAcertoMelhorEstrategia":
                    arredondar(
                        taxa_acerto_melhor
                    )

            },

            "melhorEstrategiaFixa":
                melhor_fixa,

            "melhorFixa":
                fixas[
                    melhor_fixa
                ],

            "comparacaoAdaptativoVsMelhorFixa": {

                "ganhoMedia":
                    arredondar(
                        ganho_media_vs_fixa
                    ),

                "ganhoTotal":
                    arredondar(
                        ganho_total_vs_fixa
                    ),

                "ganhoPercentual":
                    arredondar(
                        ganho_percentual_vs_fixa
                    )

            },

            "oraculo": {

                "total":
                    arredondar(
                        total_oraculo
                    ),

                "media":
                    arredondar(
                        media_oraculo
                    ),

                "eficienciaAdaptativoPercentual":
                    arredondar(
                        eficiencia_oraculo
                    )

            },

            "escolhasAdaptativo":
                escolhas

        },

        "estrategiasFixas":
            fixas,

        "rodadas":
            resultados,

        "criterios": {

            "semVazamentoFuturo":
                True,

            "amostraSuficiente":
                amostra_suficiente,

            "superouMelhorFixa":
                adaptativo_superou_fixa,

            "superouMelhorFixaEm1Percentual":
                adaptativo_superou_fixa_1pct

        },

        "decisao": {

            "decisao":
                decisao_final,

            "promover":
                False,

            "promocaoAutomatica":
                False,

            "observacao":
                (
                    "Resultado experimental. "
                    "Nenhuma estratégia oficial foi alterada."
                )

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraEstrategiasOficiais":
                False,

            "usaResultadoRodadaNaEscolha":
                False,

            "usaSomenteRodadasAnteriores":
                True,

            "promocaoAutomatica":
                False

        }

    }

    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )

    # ==================================================
    # LOG FINAL
    # ==================================================

    print()

    print(
        "=============================================="
    )

    print(
        "RESULTADO FINAL"
    )

    print(
        "=============================================="
    )

    print(
        "Rodadas:",
        len(
            resultados
        )
    )

    print()

    print(
        "ADAPTATIVO"
    )

    print(
        "Média:",
        arredondar(
            media_adaptativo
        )
    )

    print(
        "Total:",
        arredondar(
            total_adaptativo
        )
    )

    print(
        "Mediana:",
        arredondar(
            mediana_adaptativo
        )
    )

    print()

    print(
        "ESTRATÉGIAS FIXAS"
    )

    for nome in ESTRATEGIAS:

        print(

            nome,

            "| Média:",

            fixas[
                nome
            ][
                "media"
            ],

            "| Total:",

            fixas[
                nome
            ][
                "total"
            ],

            "| Vitórias:",

            fixas[
                nome
            ][
                "vitoriasRodada"
            ]

        )

    print()

    print(
        "Melhor fixa:",
        melhor_fixa
    )

    print(
        "Ganho adaptativo vs melhor fixa:",
        arredondar(
            ganho_media_vs_fixa
        ),
        "pontos/rodada"
    )

    print(
        "Ganho percentual:",
        arredondar(
            ganho_percentual_vs_fixa
        ),
        "%"
    )

    print()

    print(
        "ORÁCULO"
    )

    print(
        "Média máxima teórica:",
        arredondar(
            media_oraculo
        )
    )

    print(
        "Eficiência adaptativo:",
        arredondar(
            eficiencia_oraculo
        ),
        "%"
    )

    print(
        "Taxa de acerto da melhor estratégia:",
        arredondar(
            taxa_acerto_melhor
        ),
        "%"
    )

    print()

    print(
        "Escolhas:"
    )

    for nome in ESTRATEGIAS:

        print(
            nome,
            ":",
            escolhas.get(
                nome,
                0
            )
        )

    print()

    print(
        "DECISÃO:",
        decisao_final
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
