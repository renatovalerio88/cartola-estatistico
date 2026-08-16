"""
=========================================================
CARTOLA ESTATÍSTICO
Diagnóstico Científico do Modelo de Escalações

Objetivo:

Cruzar os resultados produzidos pelo laboratório e
identificar automaticamente:

- melhor estratégia histórica
- estratégia mais segura
- estratégia mais explosiva
- estratégia mais consistente
- impacto do cold start
- posições mais e menos previsíveis
- viés de projeção por posição
- qualidade da escolha do capitão
- evolução conforme cresce o histórico
- pontos fortes do modelo
- pontos de atenção
- recomendações para próximas calibrações

IMPORTANTE:

Este script NÃO altera pesos automaticamente.

Ele funciona como uma camada de diagnóstico científico.
As recomendações produzidas devem ser avaliadas antes
de qualquer alteração no motor estatístico.

Entradas:

data/ranking-simulacao.json
data/analise-simulacoes-historicas.json
data/backtest-inteligente.json
data/comparacao-modelos.json

Saída:

data/diagnostico-modelo-escalacoes.json

=========================================================
"""

from pathlib import Path
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


ARQUIVO_RANKING = (
    PASTA_DATA /
    "ranking-simulacao.json"
)


ARQUIVO_ANALISE = (
    PASTA_DATA /
    "analise-simulacoes-historicas.json"
)


ARQUIVO_BACKTEST = (
    PASTA_DATA /
    "backtest-inteligente.json"
)


ARQUIVO_COMPARACAO = (
    PASTA_DATA /
    "comparacao-modelos.json"
)


ARQUIVO_SAIDA = (
    PASTA_DATA /
    "diagnostico-modelo-escalacoes.json"
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
# LIMITES DE DIAGNÓSTICO
# ======================================================

LIMITE_VIES_BAIXO = 0.75

LIMITE_VIES_MODERADO = 1.50

LIMITE_MAE_BOM = 3.00

LIMITE_MAE_ATENCAO = 4.50

LIMITE_CAPITAO_BOM = 30.00

LIMITE_CAPITAO_ATENCAO = 20.00

LIMITE_TOP_REAL_BOM = 30.00

LIMITE_TOP_REAL_ATENCAO = 20.00


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
            f"[AVISO] Não foi possível carregar "
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
            valor
        )

    except Exception:

        return padrao


def arredondar(
    valor,
    casas=2
):

    return round(
        numero(
            valor,
            0
        ),
        casas
    )


def media(
    valores
):

    valores = [

        numero(
            valor,
            0
        )

        for valor
        in valores

    ]

    if not valores:

        return 0

    return (
        sum(
            valores
        ) /
        len(
            valores
        )
    )


def percentual_diferenca(
    atual,
    anterior
):

    atual = numero(
        atual,
        0
    )

    anterior = numero(
        anterior,
        0
    )

    if anterior == 0:

        return 0

    return (
        (
            atual -
            anterior
        ) /
        abs(
            anterior
        )
    ) * 100


# ======================================================
# CLASSIFICAÇÃO DE VIÉS
# ======================================================

def classificar_vies(
    vies
):

    vies = numero(
        vies,
        0
    )

    absoluto = abs(
        vies
    )

    if absoluto <= LIMITE_VIES_BAIXO:

        nivel = "baixo"

    elif absoluto <= LIMITE_VIES_MODERADO:

        nivel = "moderado"

    else:

        nivel = "alto"


    if vies > LIMITE_VIES_BAIXO:

        direcao = "superestimacao"

    elif vies < -LIMITE_VIES_BAIXO:

        direcao = "subestimacao"

    else:

        direcao = "equilibrado"


    return {

        "valor":
            arredondar(
                vies
            ),

        "nivel":
            nivel,

        "direcao":
            direcao

    }


# ======================================================
# CLASSIFICAÇÃO DE MAE
# ======================================================

def classificar_mae(
    mae
):

    mae = numero(
        mae,
        0
    )

    if mae <= LIMITE_MAE_BOM:

        return "bom"

    if mae <= LIMITE_MAE_ATENCAO:

        return "moderado"

    return "alto"


# ======================================================
# DIAGNÓSTICO DO RANKING
# ======================================================

def diagnosticar_ranking(
    ranking_dados
):

    ranking = ranking_dados.get(
        "ranking",
        []
    )


    ranking_sem_cold = ranking_dados.get(
        "rankingSemColdStart",
        []
    )


    resultado = {

        "melhorEstrategia":
            ranking_dados.get(
                "melhorEstrategia"
            ),

        "maisSegura":
            ranking_dados.get(
                "estrategiaMaisSegura"
            ),

        "maisExplosiva":
            ranking_dados.get(
                "estrategiaMaisExplosiva"
            ),

        "maisConsistente":
            ranking_dados.get(
                "estrategiaMaisConsistente"
            ),

        "destaques":
            ranking_dados.get(
                "destaques",
                {}
            ),

        "estrategias":
            [],

        "impactoColdStart":
            []

    }


    mapa_sem_cold = {

        item.get(
            "nome"
        ):
            item

        for item
        in ranking_sem_cold

        if item.get(
            "nome"
        )

    }


    for estrategia in ranking:

        nome = estrategia.get(
            "nome"
        )


        sem_cold = mapa_sem_cold.get(
            nome,
            {}
        )


        media_geral = numero(

            estrategia.get(
                "mediaPontos"
            ),

            0

        )


        media_sem_cold = numero(

            sem_cold.get(
                "mediaPontos"
            ),

            media_geral

        )


        impacto = (
            media_sem_cold -
            media_geral
        )


        resultado[
            "estrategias"
        ].append({

            "nome":
                nome,

            "posicao":
                estrategia.get(
                    "posicao"
                ),

            "pontosTotal":
                estrategia.get(
                    "pontosTotal"
                ),

            "media":
                arredondar(
                    media_geral
                ),

            "mediana":
                estrategia.get(
                    "medianaPontos"
                ),

            "volatilidade":
                estrategia.get(
                    "volatilidade"
                ),

            "consistencia":
                estrategia.get(
                    "consistencia"
                ),

            "vitorias":
                estrategia.get(
                    "vitorias"
                ),

            "taxaVitorias":
                estrategia.get(
                    "taxaVitorias"
                ),

            "melhorRodada":
                estrategia.get(
                    "melhorRodada"
                ),

            "piorRodada":
                estrategia.get(
                    "piorRodada"
                ),

            "faixasPontuacao":
                estrategia.get(
                    "faixasPontuacao",
                    {}
                ),

            "mediaSemColdStart":
                arredondar(
                    media_sem_cold
                ),

            "impactoColdStart":
                arredondar(
                    impacto
                )

        })


        resultado[
            "impactoColdStart"
        ].append({

            "nome":
                nome,

            "mediaCompleta":
                arredondar(
                    media_geral
                ),

            "mediaSemColdStart":
                arredondar(
                    media_sem_cold
                ),

            "diferenca":
                arredondar(
                    impacto
                ),

            "melhoraSemColdStart":
                impacto > 0

        })


    return resultado


# ======================================================
# DIAGNÓSTICO POR POSIÇÃO
# ======================================================

def diagnosticar_posicoes(
    analise
):

    desempenho = analise.get(
        "desempenhoPorPosicao",
        {}
    )


    resultado = []


    for posicao in POSICOES:

        dados = desempenho.get(
            posicao,
            {}
        )


        amostras = inteiro(
            dados.get(
                "amostras"
            ),
            0
        )


        mae = numero(
            dados.get(
                "mae"
            ),
            0
        )


        vies = numero(
            dados.get(
                "vies"
            ),
            0
        )


        taxa_top = numero(

            dados.get(
                "taxaAcertoTopReal"
            ),

            0

        )


        resultado.append({

            "posicao":
                posicao,

            "amostras":
                amostras,

            "mae":
                arredondar(
                    mae
                ),

            "classificacaoMae":
                (
                    classificar_mae(
                        mae
                    )

                    if amostras > 0

                    else "sem_dados"
                ),

            "vies":
                classificar_vies(
                    vies
                ),

            "mediaProjecao":
                dados.get(
                    "mediaProjecao",
                    0
                ),

            "mediaReal":
                dados.get(
                    "mediaReal",
                    0
                ),

            "taxaAcertoTopReal":
                arredondar(
                    taxa_top
                ),

            "acertosTopReal":
                dados.get(
                    "acertosTopReal",
                    0
                ),

            "totalEscalados":
                dados.get(
                    "totalEscalados",
                    0
                )

        })


    validas = [

        item

        for item
        in resultado

        if item.get(
            "amostras",
            0
        ) > 0

    ]


    melhor = None

    pior = None


    if validas:

        melhor = min(

            validas,

            key=lambda item:
                item[
                    "mae"
                ]

        )


        pior = max(

            validas,

            key=lambda item:
                item[
                    "mae"
                ]

        )


    return {

        "posicoes":
            resultado,

        "maisPrevisivel":
            melhor,

        "menosPrevisivel":
            pior

    }


# ======================================================
# DIAGNÓSTICO DO CAPITÃO
# ======================================================

def diagnosticar_capitao(
    analise
):

    resumo = analise.get(
        "resumoSemColdStart",
        []
    )


    if not resumo:

        resumo = analise.get(
            "resumoGeral",
            []
        )


    estrategias = []


    for estrategia in resumo:

        capitao = estrategia.get(
            "capitao",
            {}
        )


        taxa = numero(

            capitao.get(
                "taxaAcerto"
            ),

            0

        )


        pontos_perdidos = numero(

            capitao.get(
                "mediaPontosPerdidos"
            ),

            0

        )


        if taxa >= LIMITE_CAPITAO_BOM:

            classificacao = "bom"

        elif taxa >= LIMITE_CAPITAO_ATENCAO:

            classificacao = "moderado"

        else:

            classificacao = "atencao"


        estrategias.append({

            "nome":
                estrategia.get(
                    "nome"
                ),

            "rodadasAvaliadas":
                capitao.get(
                    "rodadasAvaliadas",
                    0
                ),

            "acertosMelhorDoTime":
                capitao.get(
                    "acertosMelhorDoTime",
                    0
                ),

            "taxaAcerto":
                arredondar(
                    taxa
                ),

            "mediaPontosPerdidos":
                arredondar(
                    pontos_perdidos
                ),

            "classificacao":
                classificacao

        })


    melhor = None


    if estrategias:

        melhor = max(

            estrategias,

            key=lambda item: (

                item[
                    "taxaAcerto"
                ],

                -item[
                    "mediaPontosPerdidos"
                ]

            )

        )


    return {

        "estrategias":
            estrategias,

        "melhorDesempenho":
            melhor

    }


# ======================================================
# EVOLUÇÃO POR HISTÓRICO DISPONÍVEL
# ======================================================

def diagnosticar_evolucao(
    analise
):

    evolucao = analise.get(
        "evolucaoPorQuantidadeHistorico",
        {}
    )


    faixas = [
        "01-03",
        "04-07",
        "08-12",
        "13+"
    ]


    resultado = []


    mapa_estrategias = {}


    for faixa in faixas:

        itens = evolucao.get(
            faixa,
            []
        )


        registro = {

            "faixa":
                faixa,

            "estrategias":
                []

        }


        for item in itens:

            nome = item.get(
                "nome"
            )


            dados = {

                "nome":
                    nome,

                "rodadas":
                    item.get(
                        "rodadas",
                        0
                    ),

                "mediaPontos":
                    arredondar(
                        item.get(
                            "mediaPontos",
                            0
                        )
                    ),

                "maeTimes":
                    arredondar(
                        item.get(
                            "maeTimes",
                            0
                        )
                    ),

                "maeJogadores":
                    arredondar(
                        item.get(
                            "maeJogadores",
                            0
                        )
                    )

            }


            registro[
                "estrategias"
            ].append(
                dados
            )


            if nome not in mapa_estrategias:

                mapa_estrategias[
                    nome
                ] = []


            mapa_estrategias[
                nome
            ].append({

                "faixa":
                    faixa,

                "mediaPontos":
                    dados[
                        "mediaPontos"
                    ],

                "maeJogadores":
                    dados[
                        "maeJogadores"
                    ]

            })


        resultado.append(
            registro
        )


    tendencias = []


    for (
        nome,
        historico
    ) in mapa_estrategias.items():


        if len(
            historico
        ) < 2:

            tendencias.append({

                "nome":
                    nome,

                "classificacao":
                    "dados_insuficientes"

            })

            continue


        primeiro = historico[
            0
        ]


        ultimo = historico[
            -1
        ]


        diferenca_media = (

            numero(
                ultimo.get(
                    "mediaPontos"
                ),
                0
            )

            -

            numero(
                primeiro.get(
                    "mediaPontos"
                ),
                0
            )

        )


        diferenca_mae = (

            numero(
                ultimo.get(
                    "maeJogadores"
                ),
                0
            )

            -

            numero(
                primeiro.get(
                    "maeJogadores"
                ),
                0
            )

        )


        melhorou_pontos = (
            diferenca_media > 0
        )


        melhorou_erro = (
            diferenca_mae < 0
        )


        if (
            melhorou_pontos
            and melhorou_erro
        ):

            classificacao = (
                "evolucao_clara"
            )

        elif (
            melhorou_pontos
            or melhorou_erro
        ):

            classificacao = (
                "evolucao_parcial"
            )

        else:

            classificacao = (
                "sem_evolucao"
            )


        tendencias.append({

            "nome":
                nome,

            "primeiraFaixa":
                primeiro.get(
                    "faixa"
                ),

            "ultimaFaixa":
                ultimo.get(
                    "faixa"
                ),

            "diferencaMediaPontos":
                arredondar(
                    diferenca_media
                ),

            "diferencaMaeJogadores":
                arredondar(
                    diferenca_mae
                ),

            "melhorouPontuacao":
                melhorou_pontos,

            "melhorouPrecisao":
                melhorou_erro,

            "classificacao":
                classificacao

        })


    return {

        "faixas":
            resultado,

        "tendencias":
            tendencias

    }


# ======================================================
# BACKTEST INTELIGENTE
# ======================================================

def diagnosticar_backtest(
    backtest
):

    rodadas = backtest.get(
        "rodadas",
        []
    )


    if not rodadas:

        return {

            "disponivel":
                False

        }


    erros = []


    taxas = []


    registros = []


    for item in rodadas:

        rodada = inteiro(
            item.get(
                "rodada"
            ),
            0
        )


        erro = numero(

            item.get(
                "erro"
            )

            if item.get(
                "erro"
            ) is not None

            else item.get(
                "erroMedio"
            ),

            0

        )


        taxa = numero(

            item.get(
                "taxaAcerto"
            )

            if item.get(
                "taxaAcerto"
            ) is not None

            else item.get(
                "acerto"
            ),

            0

        )


        erros.append(
            erro
        )


        taxas.append(
            taxa
        )


        registros.append({

            "rodada":
                rodada,

            "erro":
                arredondar(
                    erro
                ),

            "taxaAcerto":
                arredondar(
                    taxa
                )

        })


    melhor_erro = min(

        registros,

        key=lambda item:
            item[
                "erro"
            ]

    )


    melhor_acerto = max(

        registros,

        key=lambda item:
            item[
                "taxaAcerto"
            ]

    )


    return {

        "disponivel":
            True,

        "rodadas":
            len(
                registros
            ),

        "erroMedio":
            arredondar(
                media(
                    erros
                )
            ),

        "taxaAcertoMedia":
            arredondar(
                media(
                    taxas
                )
            ),

        "melhorErro":
            melhor_erro,

        "melhorTaxaAcerto":
            melhor_acerto

    }


# ======================================================
# COMPARAÇÃO DE MODELOS
# ======================================================

def diagnosticar_comparacao(
    comparacao
):

    modelos = comparacao.get(
        "modelos",
        []
    )


    normalizados = []


    if isinstance(
        modelos,
        list
    ):

        for modelo in modelos:

            if not isinstance(
                modelo,
                dict
            ):

                continue


            nome = (

                modelo.get(
                    "nome"
                )

                or modelo.get(
                    "modelo"
                )

                or modelo.get(
                    "id"
                )

                or "Modelo"

            )


            mae = numero(

                modelo.get(
                    "mae"
                )

                if modelo.get(
                    "mae"
                ) is not None

                else modelo.get(
                    "erroMedio"
                ),

                0

            )


            normalizados.append({

                "nome":
                    nome,

                "mae":
                    arredondar(
                        mae,
                        3
                    )

            })


    elif isinstance(
        modelos,
        dict
    ):

        for (
            nome,
            dados
        ) in modelos.items():


            if isinstance(
                dados,
                dict
            ):

                mae = numero(

                    dados.get(
                        "mae"
                    )

                    if dados.get(
                        "mae"
                    ) is not None

                    else dados.get(
                        "erroMedio"
                    ),

                    0

                )

            else:

                mae = numero(
                    dados,
                    0
                )


            normalizados.append({

                "nome":
                    nome,

                "mae":
                    arredondar(
                        mae,
                        3
                    )

            })


    normalizados.sort(

        key=lambda item:
            item[
                "mae"
            ]

    )


    return {

        "quantidadeModelos":
            len(
                normalizados
            ),

        "melhorModelo":

            (
                normalizados[
                    0
                ]

                if normalizados

                else None
            ),

        "modelos":
            normalizados

    }


# ======================================================
# PONTOS FORTES
# ======================================================

def gerar_pontos_fortes(
    ranking,
    posicoes,
    capitao,
    evolucao
):

    pontos = []


    melhor_estrategia = ranking.get(
        "melhorEstrategia"
    )


    if melhor_estrategia:

        pontos.append({

            "categoria":
                "estrategia",

            "titulo":
                "Estratégia histórica líder",

            "descricao":
                (
                    f"{melhor_estrategia} lidera "
                    "o ranking histórico das "
                    "estratégias simuladas."
                )

        })


    mais_consistente = ranking.get(
        "maisConsistente"
    )


    if mais_consistente:

        pontos.append({

            "categoria":
                "consistencia",

            "titulo":
                "Estratégia mais consistente",

            "descricao":
                (
                    f"{mais_consistente.get('nome')} "
                    f"apresenta consistência de "
                    f"{mais_consistente.get('consistencia')}%."
                )

        })


    previsivel = posicoes.get(
        "maisPrevisivel"
    )


    if previsivel:

        pontos.append({

            "categoria":
                "posicao",

            "titulo":
                "Posição mais previsível",

            "descricao":
                (
                    f"{previsivel.get('posicao')} "
                    f"apresenta o menor MAE: "
                    f"{previsivel.get('mae')}."
                )

        })


    melhor_capitao = capitao.get(
        "melhorDesempenho"
    )


    if (
        melhor_capitao
        and numero(
            melhor_capitao.get(
                "taxaAcerto"
            ),
            0
        ) >= LIMITE_CAPITAO_BOM
    ):

        pontos.append({

            "categoria":
                "capitao",

            "titulo":
                "Escolha de capitão eficiente",

            "descricao":
                (
                    f"{melhor_capitao.get('nome')} "
                    f"atingiu taxa de acerto de "
                    f"{melhor_capitao.get('taxaAcerto')}% "
                    "na escolha do melhor titular."
                )

        })


    tendencias = evolucao.get(
        "tendencias",
        []
    )


    evolucoes_claras = [

        item

        for item
        in tendencias

        if item.get(
            "classificacao"
        ) == "evolucao_clara"

    ]


    if evolucoes_claras:

        nomes = ", ".join(

            item.get(
                "nome",
                ""
            )

            for item
            in evolucoes_claras

        )


        pontos.append({

            "categoria":
                "aprendizado",

            "titulo":
                "Evolução com maior histórico",

            "descricao":
                (
                    "Pontuação e precisão melhoraram "
                    "simultaneamente com mais dados em: "
                    f"{nomes}."
                )

        })


    return pontos


# ======================================================
# PONTOS DE ATENÇÃO
# ======================================================

def gerar_pontos_atencao(
    posicoes,
    capitao,
    evolucao
):

    pontos = []


    pior = posicoes.get(
        "menosPrevisivel"
    )


    if pior:

        pontos.append({

            "categoria":
                "posicao",

            "prioridade":
                (
                    "alta"

                    if numero(
                        pior.get(
                            "mae"
                        ),
                        0
                    ) > LIMITE_MAE_ATENCAO

                    else "media"
                ),

            "titulo":
                "Posição com maior erro",

            "descricao":
                (
                    f"{pior.get('posicao')} possui "
                    f"MAE de {pior.get('mae')} e deve "
                    "ser priorizada na próxima análise "
                    "de pesos."
                )

        })


    for item in posicoes.get(
        "posicoes",
        []
    ):

        if item.get(
            "amostras",
            0
        ) <= 0:

            continue


        vies = item.get(
            "vies",
            {}
        )


        if vies.get(
            "nivel"
        ) == "alto":

            direcao = vies.get(
                "direcao"
            )


            pontos.append({

                "categoria":
                    "vies",

                "prioridade":
                    "alta",

                "titulo":
                    (
                        "Viés elevado em "
                        f"{item.get('posicao')}"
                    ),

                "descricao":
                    (
                        f"A posição {item.get('posicao')} "
                        f"apresenta {direcao} com viés "
                        f"médio de {vies.get('valor')}."
                    )

            })


        taxa_top = numero(

            item.get(
                "taxaAcertoTopReal"
            ),

            0

        )


        if (
            taxa_top <
            LIMITE_TOP_REAL_ATENCAO
        ):

            pontos.append({

                "categoria":
                    "ranking_posicao",

                "prioridade":
                    "media",

                "titulo":
                    (
                        "Baixo acerto dos melhores em "
                        f"{item.get('posicao')}"
                    ),

                "descricao":
                    (
                        f"A taxa de jogadores escalados "
                        f"entre os melhores reais de "
                        f"{item.get('posicao')} é "
                        f"{taxa_top}%."
                    )

            })


    for item in capitao.get(
        "estrategias",
        []
    ):

        taxa = numero(

            item.get(
                "taxaAcerto"
            ),

            0

        )


        if taxa < LIMITE_CAPITAO_ATENCAO:

            pontos.append({

                "categoria":
                    "capitao",

                "prioridade":
                    "alta",

                "titulo":
                    (
                        "Capitão precisa de revisão - "
                        f"{item.get('nome')}"
                    ),

                "descricao":
                    (
                        f"A taxa de acerto do capitão "
                        f"é {taxa}% e a perda média "
                        f"é {item.get('mediaPontosPerdidos')} "
                        "pontos."
                    )

            })


    for item in evolucao.get(
        "tendencias",
        []
    ):

        if item.get(
            "classificacao"
        ) == "sem_evolucao":

            pontos.append({

                "categoria":
                    "aprendizado",

                "prioridade":
                    "media",

                "titulo":
                    (
                        "Ausência de evolução - "
                        f"{item.get('nome')}"
                    ),

                "descricao":
                    (
                        "O aumento do histórico ainda "
                        "não produziu melhora simultânea "
                        "de pontuação e precisão."
                    )

            })


    return pontos


# ======================================================
# RECOMENDAÇÕES DE CALIBRAÇÃO
# ======================================================

def gerar_recomendacoes(
    ranking,
    posicoes,
    capitao,
    evolucao
):

    recomendacoes = []


    # --------------------------------------------------
    # POSIÇÕES
    # --------------------------------------------------

    for item in posicoes.get(
        "posicoes",
        []
    ):

        if item.get(
            "amostras",
            0
        ) <= 0:

            continue


        posicao = item.get(
            "posicao"
        )


        mae = numero(
            item.get(
                "mae"
            ),
            0
        )


        vies = item.get(
            "vies",
            {}
        )


        taxa_top = numero(

            item.get(
                "taxaAcertoTopReal"
            ),

            0

        )


        if mae > LIMITE_MAE_ATENCAO:

            recomendacoes.append({

                "prioridade":
                    "alta",

                "area":
                    "pesos_por_posicao",

                "posicao":
                    posicao,

                "acao":
                    "revisar",

                "motivo":
                    (
                        f"MAE elevado de {mae}."
                    ),

                "alteracaoAutomatica":
                    False

            })


        if vies.get(
            "direcao"
        ) == "superestimacao":

            recomendacoes.append({

                "prioridade":
                    (
                        "alta"

                        if vies.get(
                            "nivel"
                        ) == "alto"

                        else "media"
                    ),

                "area":
                    "calibracao_projecao",

                "posicao":
                    posicao,

                "acao":
                    "reduzir_superestimacao",

                "motivo":
                    (
                        f"Viés médio positivo de "
                        f"{vies.get('valor')}."
                    ),

                "alteracaoAutomatica":
                    False

            })


        elif vies.get(
            "direcao"
        ) == "subestimacao":

            recomendacoes.append({

                "prioridade":
                    (
                        "alta"

                        if vies.get(
                            "nivel"
                        ) == "alto"

                        else "media"
                    ),

                "area":
                    "calibracao_projecao",

                "posicao":
                    posicao,

                "acao":
                    "reduzir_subestimacao",

                "motivo":
                    (
                        f"Viés médio negativo de "
                        f"{vies.get('valor')}."
                    ),

                "alteracaoAutomatica":
                    False

            })


        if taxa_top < LIMITE_TOP_REAL_ATENCAO:

            recomendacoes.append({

                "prioridade":
                    "media",

                "area":
                    "ranking_jogadores",

                "posicao":
                    posicao,

                "acao":
                    "reavaliar_criterios_ranking",

                "motivo":
                    (
                        f"Apenas {taxa_top}% dos "
                        "escalados ficaram entre os "
                        "melhores reais da posição."
                    ),

                "alteracaoAutomatica":
                    False

            })


    # --------------------------------------------------
    # CAPITÃO
    # --------------------------------------------------

    taxas_capitao = [

        numero(
            item.get(
                "taxaAcerto"
            ),
            0
        )

        for item
        in capitao.get(
            "estrategias",
            []
        )

    ]


    if taxas_capitao:

        taxa_media = media(
            taxas_capitao
        )


        if taxa_media < LIMITE_CAPITAO_ATENCAO:

            recomendacoes.append({

                "prioridade":
                    "alta",

                "area":
                    "capitao",

                "acao":
                    "criar_score_especifico_capitao",

                "motivo":
                    (
                        "A taxa média de acerto do "
                        f"capitão é {arredondar(taxa_media)}%."
                    ),

                "alteracaoAutomatica":
                    False

            })


        elif taxa_media < LIMITE_CAPITAO_BOM:

            recomendacoes.append({

                "prioridade":
                    "media",

                "area":
                    "capitao",

                "acao":
                    "refinar_score_capitao",

                "motivo":
                    (
                        "A escolha do capitão apresenta "
                        "desempenho intermediário."
                    ),

                "alteracaoAutomatica":
                    False

            })


    # --------------------------------------------------
    # COLD START
    # --------------------------------------------------

    impactos = ranking.get(
        "impactoColdStart",
        []
    )


    impactos_relevantes = [

        item

        for item
        in impactos

        if abs(
            numero(
                item.get(
                    "diferenca"
                ),
                0
            )
        ) >= 2

    ]


    if impactos_relevantes:

        recomendacoes.append({

            "prioridade":
                "media",

            "area":
                "cold_start",

            "acao":
                "criar_regra_especifica_inicio_temporada",

            "motivo":
                (
                    "O desempenho muda de forma "
                    "relevante quando a rodada de "
                    "cold start é removida."
                ),

            "alteracaoAutomatica":
                False

        })


    # --------------------------------------------------
    # EVOLUÇÃO COM HISTÓRICO
    # --------------------------------------------------

    sem_evolucao = [

        item

        for item
        in evolucao.get(
            "tendencias",
            []
        )

        if item.get(
            "classificacao"
        ) == "sem_evolucao"

    ]


    if sem_evolucao:

        recomendacoes.append({

            "prioridade":
                "media",

            "area":
                "janela_historica",

            "acao":
                "testar_janelas_dinamicas",

            "motivo":
                (
                    "Mais histórico não está melhorando "
                    "automaticamente todos os perfis. "
                    "Testar peso maior para dados recentes."
                ),

            "alteracaoAutomatica":
                False

        })


    # --------------------------------------------------
    # ESTRATÉGIAS
    # --------------------------------------------------

    melhor = ranking.get(
        "melhorEstrategia"
    )


    mais_segura = ranking.get(
        "maisSegura",
        {}
    )


    mais_explosiva = ranking.get(
        "maisExplosiva",
        {}
    )


    if melhor:

        recomendacoes.append({

            "prioridade":
                "informativa",

            "area":
                "estrategias",

            "acao":
                "manter_comparacao_multiperfil",

            "motivo":
                (
                    f"{melhor} lidera atualmente, "
                    "mas os três perfis devem continuar "
                    "sendo testados para evitar otimização "
                    "prematura."
                ),

            "alteracaoAutomatica":
                False

        })


    if (
        mais_segura
        and mais_explosiva
        and mais_segura.get(
            "nome"
        ) != mais_explosiva.get(
            "nome"
        )
    ):

        recomendacoes.append({

            "prioridade":
                "informativa",

            "area":
                "estrategias",

            "acao":
                "preservar_perfis_distintos",

            "motivo":
                (
                    f"{mais_segura.get('nome')} aparece "
                    "como perfil mais seguro enquanto "
                    f"{mais_explosiva.get('nome')} aparece "
                    "como mais explosivo. A diferenciação "
                    "entre perfis está produzindo sinais "
                    "úteis."
                ),

            "alteracaoAutomatica":
                False

        })


    # --------------------------------------------------
    # ORDENAÇÃO
    # --------------------------------------------------

    ordem = {

        "alta": 0,

        "media": 1,

        "baixa": 2,

        "informativa": 3

    }


    recomendacoes.sort(

        key=lambda item:
            ordem.get(
                item.get(
                    "prioridade"
                ),
                99
            )

    )


    for indice, item in enumerate(
        recomendacoes,
        start=1
    ):

        item[
            "id"
        ] = indice


    return recomendacoes


# ======================================================
# RESUMO EXECUTIVO
# ======================================================

def gerar_resumo_executivo(
    ranking,
    posicoes,
    capitao,
    backtest,
    comparacao,
    recomendacoes
):

    prioridades_altas = [

        item

        for item
        in recomendacoes

        if item.get(
            "prioridade"
        ) == "alta"

    ]


    prioridades_medias = [

        item

        for item
        in recomendacoes

        if item.get(
            "prioridade"
        ) == "media"

    ]


    mais_previsivel = posicoes.get(
        "maisPrevisivel"
    )


    menos_previsivel = posicoes.get(
        "menosPrevisivel"
    )


    melhor_capitao = capitao.get(
        "melhorDesempenho"
    )


    return {

        "melhorEstrategia":
            ranking.get(
                "melhorEstrategia"
            ),

        "estrategiaMaisSegura":

            (
                ranking.get(
                    "maisSegura",
                    {}
                ).get(
                    "nome"
                )

                if ranking.get(
                    "maisSegura"
                )

                else None
            ),

        "estrategiaMaisExplosiva":

            (
                ranking.get(
                    "maisExplosiva",
                    {}
                ).get(
                    "nome"
                )

                if ranking.get(
                    "maisExplosiva"
                )

                else None
            ),

        "posicaoMaisPrevisivel":

            (
                mais_previsivel.get(
                    "posicao"
                )

                if mais_previsivel

                else None
            ),

        "posicaoMenosPrevisivel":

            (
                menos_previsivel.get(
                    "posicao"
                )

                if menos_previsivel

                else None
            ),

        "melhorEstrategiaCapitao":

            (
                melhor_capitao.get(
                    "nome"
                )

                if melhor_capitao

                else None
            ),

        "backtest": {

            "disponivel":
                backtest.get(
                    "disponivel",
                    False
                ),

            "erroMedio":
                backtest.get(
                    "erroMedio"
                ),

            "taxaAcertoMedia":
                backtest.get(
                    "taxaAcertoMedia"
                )

        },

        "melhorModeloComparacao":
            comparacao.get(
                "melhorModelo"
            ),

        "quantidadeRecomendacoes":
            len(
                recomendacoes
            ),

        "prioridadesAltas":
            len(
                prioridades_altas
            ),

        "prioridadesMedias":
            len(
                prioridades_medias
            ),

        "alteracaoAutomaticaPesos":
            False,

        "status":
            (
                "requer_atencao"

                if prioridades_altas

                else "monitoramento"
            )

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    ranking_dados = carregar_json(
        ARQUIVO_RANKING
    )


    analise = carregar_json(
        ARQUIVO_ANALISE
    )


    backtest_dados = carregar_json(
        ARQUIVO_BACKTEST
    )


    comparacao_dados = carregar_json(
        ARQUIVO_COMPARACAO
    )


    if not ranking_dados:

        print(
            "[ERRO] Ranking de simulação "
            "não encontrado."
        )

        return


    if not analise:

        print(
            "[ERRO] Análise das simulações "
            "não encontrada."
        )

        return


    ranking = diagnosticar_ranking(
        ranking_dados
    )


    posicoes = diagnosticar_posicoes(
        analise
    )


    capitao = diagnosticar_capitao(
        analise
    )


    evolucao = diagnosticar_evolucao(
        analise
    )


    backtest = diagnosticar_backtest(
        backtest_dados
    )


    comparacao = diagnosticar_comparacao(
        comparacao_dados
    )


    pontos_fortes = gerar_pontos_fortes(

        ranking,

        posicoes,

        capitao,

        evolucao

    )


    pontos_atencao = gerar_pontos_atencao(

        posicoes,

        capitao,

        evolucao

    )


    recomendacoes = gerar_recomendacoes(

        ranking,

        posicoes,

        capitao,

        evolucao

    )


    resumo = gerar_resumo_executivo(

        ranking,

        posicoes,

        capitao,

        backtest,

        comparacao,

        recomendacoes

    )


    resultado = {

        "modelo":
            "diagnostico_modelo_escalacoes_v1",

        "descricao":
            (
                "Diagnóstico científico automático "
                "do modelo histórico de escalações"
            ),

        "objetivo":
            (
                "Identificar oportunidades de melhoria "
                "sem alterar automaticamente os pesos "
                "do motor estatístico."
            ),

        "fontes": [

            "data/ranking-simulacao.json",

            "data/analise-simulacoes-historicas.json",

            "data/backtest-inteligente.json",

            "data/comparacao-modelos.json"

        ],

        "resumoExecutivo":
            resumo,

        "ranking":
            ranking,

        "posicoes":
            posicoes,

        "capitao":
            capitao,

        "evolucaoHistorico":
            evolucao,

        "backtestInteligente":
            backtest,

        "comparacaoModelos":
            comparacao,

        "pontosFortes":
            pontos_fortes,

        "pontosAtencao":
            pontos_atencao,

        "recomendacoesCalibracao":
            recomendacoes,

        "seguranca": {

            "pesosAlteradosAutomaticamente":
                False,

            "modeloAlteradoAutomaticamente":
                False,

            "necessitaValidacaoHumana":
                True

        }

    }


    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )


    # ==================================================
    # LOG RESUMIDO
    # ==================================================

    print(
        "===================================================="
    )

    print(
        "DIAGNÓSTICO CIENTÍFICO DO MODELO DE ESCALAÇÕES"
    )

    print(
        "===================================================="
    )


    print()


    print(
        "Melhor estratégia:",
        resumo.get(
            "melhorEstrategia"
        )
    )


    print(
        "Mais segura:",
        resumo.get(
            "estrategiaMaisSegura"
        )
    )


    print(
        "Mais explosiva:",
        resumo.get(
            "estrategiaMaisExplosiva"
        )
    )


    print(
        "Posição mais previsível:",
        resumo.get(
            "posicaoMaisPrevisivel"
        )
    )


    print(
        "Posição menos previsível:",
        resumo.get(
            "posicaoMenosPrevisivel"
        )
    )


    print()


    print(
        "===== PONTOS FORTES ====="
    )


    if not pontos_fortes:

        print(
            "Nenhum ponto forte classificado."
        )


    for item in pontos_fortes:

        print(
            "-",
            item.get(
                "descricao"
            )
        )


    print()


    print(
        "===== PONTOS DE ATENÇÃO ====="
    )


    if not pontos_atencao:

        print(
            "Nenhum ponto crítico detectado."
        )


    for item in pontos_atencao:

        print(
            f"[{item.get('prioridade', '-').upper()}]",
            item.get(
                "descricao"
            )
        )


    print()


    print(
        "===== RECOMENDAÇÕES ====="
    )


    if not recomendacoes:

        print(
            "Nenhuma recomendação gerada."
        )


    for item in recomendacoes:

        print(
            f"{item.get('id')}. "
            f"[{item.get('prioridade', '-').upper()}] "
            f"{item.get('area')} -> "
            f"{item.get('acao')}"
        )


        print(
            "   Motivo:",
            item.get(
                "motivo"
            )
        )


    print()


    print(
        "Prioridades altas:",
        resumo.get(
            "prioridadesAltas"
        )
    )


    print(
        "Prioridades médias:",
        resumo.get(
            "prioridadesMedias"
        )
    )


    print(
        "Alteração automática de pesos:",
        "NÃO"
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
