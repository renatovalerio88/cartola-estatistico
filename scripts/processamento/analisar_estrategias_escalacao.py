"""
=========================================================
CARTOLA ESTATÍSTICO
Análise Científica das Estratégias de Escalação

Versão:
analise_estrategias_escalacao_v1

Entradas:
data/ranking-simulacao.json
data/auditoria-simulacao-times.json
data/simulacao-times.json

Saída:
data/analise-estrategias-escalacao.json

Objetivo:
Determinar se existe evidência histórica suficiente para
considerar uma estratégia de escalação superior às demais.

Estratégias avaliadas:

- Conservador
- Equilibrado
- Agressivo

A análise NÃO altera automaticamente o modelo oficial.

Critérios:

1. auditoria científica aprovada;
2. quantidade mínima de rodadas;
3. pontuação média;
4. mediana;
5. consistência;
6. taxa de vitórias;
7. cobertura;
8. vantagem sobre a segunda colocada;
9. estabilidade da vantagem;
10. desempenho recente.

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

ARQUIVO_RANKING = (
    PASTA_DATA /
    "ranking-simulacao.json"
)

ARQUIVO_AUDITORIA = (
    PASTA_DATA /
    "auditoria-simulacao-times.json"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "analise-estrategias-escalacao.json"
)


ESTRATEGIAS_ESPERADAS = {
    "Conservador",
    "Equilibrado",
    "Agressivo"
}


MINIMO_RODADAS_ANALISE = 5

MINIMO_RODADAS_PROMOCAO = 10

MINIMO_VANTAGEM_MEDIA = 1.0

MINIMO_VANTAGEM_PERCENTUAL = 1.5

MINIMO_TAXA_VITORIAS = 40.0

MINIMO_COBERTURA = 90.0

MINIMO_ESTABILIDADE = 55.0

JANELA_RECENTE = 5


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
# RESULTADOS POR ESTRATÉGIA
# ======================================================

def coletar_historico(
    simulacao
):

    historico = {}

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        numero_rodada = rodada.get(
            "rodada"
        )

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if not nome:

                continue

            if nome not in historico:

                historico[
                    nome
                ] = []

            historico[
                nome
            ].append({

                "rodada":
                    numero_rodada,

                "pontos":
                    numero(
                        estrategia.get(
                            "pontuacaoComCapitao"
                        )
                    ),

                "pontosSemCapitao":
                    numero(
                        estrategia.get(
                            "pontuacaoSemCapitao"
                        )
                    ),

                "bonusCapitao":
                    numero(
                        estrategia.get(
                            "bonusCapitao"
                        )
                    ),

                "cobertura":
                    numero(
                        estrategia.get(
                            "coberturaResultadosPercentual"
                        )
                    ),

                "mae":
                    numero(
                        estrategia.get(
                            "maeJogadores"
                        )
                    )

            })

    for nome in historico:

        historico[
            nome
        ].sort(
            key=lambda item:
                numero(
                    item.get(
                        "rodada"
                    )
                )
        )

    return historico


# ======================================================
# RESULTADO DAS DISPUTAS POR RODADA
# ======================================================

def calcular_disputas(
    simulacao
):

    resultado = {}

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        estrategias = rodada.get(
            "estrategias",
            []
        )

        if not estrategias:

            continue

        valores = []

        for estrategia in estrategias:

            nome = estrategia.get(
                "nome"
            )

            if not nome:

                continue

            if nome not in resultado:

                resultado[
                    nome
                ] = {

                    "participacoes":
                        0,

                    "vitorias":
                        0,

                    "empates":
                        0,

                    "derrotas":
                        0

                }

            resultado[
                nome
            ][
                "participacoes"
            ] += 1

            valores.append({

                "nome":
                    nome,

                "pontos":
                    numero(
                        estrategia.get(
                            "pontuacaoComCapitao"
                        )
                    )

            })

        if not valores:

            continue

        maior = max(
            item[
                "pontos"
            ]
            for item in valores
        )

        vencedores = [

            item[
                "nome"
            ]

            for item in valores

            if abs(
                item[
                    "pontos"
                ] -
                maior
            ) < 0.001

        ]

        for item in valores:

            nome = item[
                "nome"
            ]

            if len(
                vencedores
            ) > 1 and nome in vencedores:

                resultado[
                    nome
                ][
                    "empates"
                ] += 1

            elif nome in vencedores:

                resultado[
                    nome
                ][
                    "vitorias"
                ] += 1

            else:

                resultado[
                    nome
                ][
                    "derrotas"
                ] += 1

    return resultado


# ======================================================
# DESEMPENHO RECENTE
# ======================================================

def analisar_recente(
    historico,
    janela=JANELA_RECENTE
):

    resultados = {}

    for nome, rodadas in historico.items():

        recentes = rodadas[
            -janela:
        ]

        pontos = [

            numero(
                item.get(
                    "pontos"
                )
            )

            for item in recentes

        ]

        resultados[
            nome
        ] = {

            "rodadas":
                [
                    item.get(
                        "rodada"
                    )
                    for item in recentes
                ],

            "quantidade":
                len(
                    recentes
                ),

            "media":
                round(
                    mean(
                        pontos
                    ),
                    2
                )
                if pontos
                else 0,

            "mediana":
                round(
                    median(
                        pontos
                    ),
                    2
                )
                if pontos
                else 0,

            "total":
                round(
                    sum(
                        pontos
                    ),
                    2
                )

        }

    return resultados


# ======================================================
# ESTABILIDADE DA LIDERANÇA
# ======================================================

def calcular_estabilidade(
    simulacao,
    lider
):

    comparacoes = 0

    superior = 0

    empatou = 0

    margens = []

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        estrategias = rodada.get(
            "estrategias",
            []
        )

        pontos = {

            item.get(
                "nome"
            ):
                numero(
                    item.get(
                        "pontuacaoComCapitao"
                    )
                )

            for item in estrategias

            if item.get(
                "nome"
            )

        }

        if lider not in pontos:

            continue

        adversarios = [

            valor

            for nome, valor in pontos.items()

            if nome != lider

        ]

        if not adversarios:

            continue

        melhor_adversario = max(
            adversarios
        )

        margem = (
            pontos[
                lider
            ] -
            melhor_adversario
        )

        margens.append(
            margem
        )

        comparacoes += 1

        if margem > 0.001:

            superior += 1

        elif abs(
            margem
        ) <= 0.001:

            empatou += 1

    taxa_superioridade = percentual(
        superior,
        comparacoes
    )

    taxa_nao_derrota = percentual(
        superior + empatou,
        comparacoes
    )

    margem_media = (

        mean(
            margens
        )

        if margens

        else 0

    )

    return {

        "comparacoes":
            comparacoes,

        "rodadasSuperior":
            superior,

        "rodadasEmpatado":
            empatou,

        "taxaSuperioridadePercentual":
            round(
                taxa_superioridade,
                2
            ),

        "taxaNaoDerrotaPercentual":
            round(
                taxa_nao_derrota,
                2
            ),

        "margemMediaContraMelhorAdversario":
            round(
                margem_media,
                2
            )

    }


# ======================================================
# COMPARAÇÃO DO PRIMEIRO COM O SEGUNDO
# ======================================================

def comparar_lideres(
    ranking
):

    lista = ranking.get(
        "ranking",
        []
    )

    if len(
        lista
    ) < 2:

        return None

    primeiro = lista[
        0
    ]

    segundo = lista[
        1
    ]

    media_primeiro = numero(
        primeiro.get(
            "mediaPontos"
        )
    )

    media_segundo = numero(
        segundo.get(
            "mediaPontos"
        )
    )

    diferenca = (
        media_primeiro -
        media_segundo
    )

    diferenca_percentual = percentual(
        diferenca,
        media_segundo
    )

    score_primeiro = numero(
        primeiro.get(
            "scoreGlobal"
        )
    )

    score_segundo = numero(
        segundo.get(
            "scoreGlobal"
        )
    )

    return {

        "lider":
            primeiro.get(
                "nome"
            ),

        "segundo":
            segundo.get(
                "nome"
            ),

        "mediaLider":
            round(
                media_primeiro,
                2
            ),

        "mediaSegundo":
            round(
                media_segundo,
                2
            ),

        "vantagemMedia":
            round(
                diferenca,
                2
            ),

        "vantagemMediaPercentual":
            round(
                diferenca_percentual,
                2
            ),

        "scoreLider":
            round(
                score_primeiro,
                3
            ),

        "scoreSegundo":
            round(
                score_segundo,
                3
            ),

        "vantagemScore":
            round(
                score_primeiro -
                score_segundo,
                3
            )

    }


# ======================================================
# SCORE DE CONFIANÇA
# ======================================================

def calcular_score_confianca(
    rodadas,
    cobertura,
    taxa_vitorias,
    estabilidade,
    vantagem_percentual,
    auditoria_aprovada
):

    score_amostra = min(
        100,
        (
            rodadas /
            MINIMO_RODADAS_PROMOCAO
        ) *
        100
    )

    score_cobertura = max(
        0,
        min(
            100,
            cobertura
        )
    )

    score_vitorias = max(
        0,
        min(
            100,
            taxa_vitorias
        )
    )

    score_estabilidade = max(
        0,
        min(
            100,
            estabilidade
        )
    )

    score_vantagem = min(
        100,
        max(
            0,
            (
                vantagem_percentual /
                5
            ) *
            100
        )
    )

    score = (

          score_amostra * 0.20
        + score_cobertura * 0.20
        + score_vitorias * 0.20
        + score_estabilidade * 0.25
        + score_vantagem * 0.15

    )

    if not auditoria_aprovada:

        score *= 0.50

    return round(
        score,
        2
    )


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
        "ANÁLISE DAS ESTRATÉGIAS DE ESCALAÇÃO"
    )

    print(
        "=============================================="
    )

    ranking = carregar_json(
        ARQUIVO_RANKING
    )

    auditoria = carregar_json(
        ARQUIVO_AUDITORIA
    )

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )


    if not isinstance(
        ranking,
        dict
    ):

        ranking = {}


    if not isinstance(
        auditoria,
        dict
    ):

        auditoria = {}


    if not isinstance(
        simulacao,
        dict
    ):

        simulacao = {}


    historico = coletar_historico(
        simulacao
    )

    disputas = calcular_disputas(
        simulacao
    )

    recente = analisar_recente(
        historico
    )

    comparacao = comparar_lideres(
        ranking
    )


    ranking_lista = ranking.get(
        "ranking",
        []
    )


    nomes_ranking = {

        item.get(
            "nome"
        )

        for item in ranking_lista

        if item.get(
            "nome"
        )

    }


    auditoria_aprovada = bool(

        auditoria.get(
            "decisao",
            {}
        ).get(
            "aprovada",
            False
        )

    )


    quantidade_rodadas = int(
        numero(
            ranking.get(
                "quantidadeRodadas"
            )
        )
    )


    # ==================================================
    # SEM DADOS SUFICIENTES
    # ==================================================

    if not ranking_lista:

        resultado = {

            "modelo":
                "analise_estrategias_escalacao_v1",

            "descricao":
                (
                    "Análise científica das estratégias "
                    "históricas de escalação."
                ),

            "status":
                "sem_dados",

            "decisao": {

                "decisao":
                    "AGUARDAR_DADOS",

                "estrategiaRecomendada":
                    None,

                "promover":
                    False

            }

        }

        salvar_json(
            ARQUIVO_SAIDA,
            resultado
        )

        print(
            "Nenhum ranking disponível."
        )

        print(
            "DECISÃO: AGUARDAR_DADOS"
        )

        return


    # ==================================================
    # LÍDER
    # ==================================================

    lider = ranking_lista[
        0
    ]

    nome_lider = lider.get(
        "nome"
    )


    estabilidade = calcular_estabilidade(
        simulacao,
        nome_lider
    )


    dados_disputa_lider = disputas.get(
        nome_lider,
        {}
    )


    participacoes = int(
        numero(
            dados_disputa_lider.get(
                "participacoes"
            )
        )
    )


    vitorias = int(
        numero(
            dados_disputa_lider.get(
                "vitorias"
            )
        )
    )


    taxa_vitorias = percentual(
        vitorias,
        participacoes
    )


    cobertura_lider = numero(
        lider.get(
            "coberturaMediaPercentual"
        )
    )


    vantagem_media = (

        numero(
            comparacao.get(
                "vantagemMedia"
            )
        )

        if comparacao

        else 0

    )


    vantagem_percentual = (

        numero(
            comparacao.get(
                "vantagemMediaPercentual"
            )
        )

        if comparacao

        else 0

    )


    taxa_estabilidade = numero(

        estabilidade.get(
            "taxaSuperioridadePercentual"
        )

    )


    score_confianca = calcular_score_confianca(

        quantidade_rodadas,

        cobertura_lider,

        taxa_vitorias,

        taxa_estabilidade,

        vantagem_percentual,

        auditoria_aprovada

    )


    # ==================================================
    # CRITÉRIOS
    # ==================================================

    criterios = {

        "auditoriaAprovada":
            auditoria_aprovada,

        "tresEstrategiasPresentes":
            nomes_ranking ==
            ESTRATEGIAS_ESPERADAS,

        "amostraMinimaAnalise":
            quantidade_rodadas >=
            MINIMO_RODADAS_ANALISE,

        "amostraMinimaPromocao":
            quantidade_rodadas >=
            MINIMO_RODADAS_PROMOCAO,

        "coberturaMinima":
            cobertura_lider >=
            MINIMO_COBERTURA,

        "vantagemMediaMinima":
            vantagem_media >=
            MINIMO_VANTAGEM_MEDIA,

        "vantagemPercentualMinima":
            vantagem_percentual >=
            MINIMO_VANTAGEM_PERCENTUAL,

        "taxaVitoriasMinima":
            taxa_vitorias >=
            MINIMO_TAXA_VITORIAS,

        "estabilidadeMinima":
            taxa_estabilidade >=
            MINIMO_ESTABILIDADE

    }


    criterios_promocao = [

        "auditoriaAprovada",

        "tresEstrategiasPresentes",

        "amostraMinimaPromocao",

        "coberturaMinima",

        "vantagemMediaMinima",

        "vantagemPercentualMinima",

        "taxaVitoriasMinima",

        "estabilidadeMinima"

    ]


    aprovados_promocao = [

        nome

        for nome in criterios_promocao

        if criterios.get(
            nome,
            False
        )

    ]


    falhas_promocao = [

        nome

        for nome in criterios_promocao

        if not criterios.get(
            nome,
            False
        )

    ]


    promover = (
        len(
            falhas_promocao
        ) == 0
    )


    # ==================================================
    # DECISÃO
    # ==================================================

    if not auditoria_aprovada:

        decisao = (
            "AGUARDAR_VALIDACAO_SIMULACAO"
        )

    elif quantidade_rodadas < MINIMO_RODADAS_ANALISE:

        decisao = (
            "AMOSTRA_INSUFICIENTE"
        )

    elif promover:

        decisao = (
            "ESTRATEGIA_CANDIDATA_PROMOCAO"
        )

    else:

        decisao = (
            "MANTER_ESTRATEGIAS_ATUAIS"
        )


    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            "analise_estrategias_escalacao_v1",

        "descricao":
            (
                "Avaliação histórica das estratégias "
                "Conservador, Equilibrado e Agressivo."
            ),

        "configuracao": {

            "minimoRodadasAnalise":
                MINIMO_RODADAS_ANALISE,

            "minimoRodadasPromocao":
                MINIMO_RODADAS_PROMOCAO,

            "minimoVantagemMedia":
                MINIMO_VANTAGEM_MEDIA,

            "minimoVantagemPercentual":
                MINIMO_VANTAGEM_PERCENTUAL,

            "minimoTaxaVitorias":
                MINIMO_TAXA_VITORIAS,

            "minimoCobertura":
                MINIMO_COBERTURA,

            "minimoEstabilidade":
                MINIMO_ESTABILIDADE,

            "janelaRecente":
                JANELA_RECENTE

        },

        "resumo": {

            "rodadas":
                quantidade_rodadas,

            "estrategias":
                len(
                    ranking_lista
                ),

            "lider":
                nome_lider,

            "mediaLider":
                lider.get(
                    "mediaPontos"
                ),

            "scoreGlobalLider":
                lider.get(
                    "scoreGlobal"
                ),

            "taxaVitoriasLider":
                round(
                    taxa_vitorias,
                    2
                ),

            "estabilidadeLider":
                round(
                    taxa_estabilidade,
                    2
                ),

            "coberturaLider":
                round(
                    cobertura_lider,
                    2
                ),

            "scoreConfianca":
                score_confianca

        },

        "comparacaoPrimeiroSegundo":
            comparacao,

        "estabilidadeLider":
            estabilidade,

        "desempenhoRecente":
            recente,

        "disputas":
            disputas,

        "ranking":
            ranking_lista,

        "criterios":
            criterios,

        "criteriosPromocao": {

            "aprovados":
                aprovados_promocao,

            "falhas":
                falhas_promocao

        },

        "decisao": {

            "decisao":
                decisao,

            "estrategiaRecomendada":
                (
                    nome_lider
                    if promover
                    else None
                ),

            "liderAtual":
                nome_lider,

            "promover":
                promover,

            "promocaoAutomatica":
                False,

            "scoreConfianca":
                score_confianca,

            "observacao":
                (
                    (
                        f"A estratégia {nome_lider} "
                        "atingiu todos os critérios "
                        "experimentais para promoção."
                    )
                    if promover
                    else
                    (
                        "Ainda não há evidência suficiente "
                        "para substituir automaticamente "
                        "as estratégias atuais."
                    )
                )

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraPerfilOficial":
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
        "Rodadas:",
        quantidade_rodadas
    )

    print(
        "Líder:",
        nome_lider
    )

    print(
        "Média:",
        lider.get(
            "mediaPontos"
        )
    )

    print(
        "Score global:",
        lider.get(
            "scoreGlobal"
        )
    )

    print(
        "Taxa de vitórias:",
        round(
            taxa_vitorias,
            2
        ),
        "%"
    )

    print(
        "Estabilidade:",
        round(
            taxa_estabilidade,
            2
        ),
        "%"
    )

    print(
        "Cobertura:",
        round(
            cobertura_lider,
            2
        ),
        "%"
    )

    if comparacao:

        print(
            "Segundo colocado:",
            comparacao.get(
                "segundo"
            )
        )

        print(
            "Vantagem média:",
            comparacao.get(
                "vantagemMedia"
            )
        )

        print(
            "Vantagem percentual:",
            comparacao.get(
                "vantagemMediaPercentual"
            ),
            "%"
        )

    print()

    print(
        "CRITÉRIOS DE PROMOÇÃO"
    )

    print(
        "----------------------------------------------"
    )

    for nome, aprovado in criterios.items():

        status = (
            "OK"
            if aprovado
            else
            "FALHA"
        )

        print(
            f"[{status}] {nome}"
        )

    print()

    print(
        "Score de confiança:",
        score_confianca,
        "%"
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
