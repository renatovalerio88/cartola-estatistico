"""
=========================================================
CARTOLA ESTATÍSTICO
Decisor Científico da Estratégia Adaptativa

Versão:
decisao_estrategia_adaptativa_v1

Entradas:
data/comparacao-estrategias-adaptativas.json
data/auditoria-comparacao-adaptativas.json

Saída:
data/decisao-estrategia-adaptativa.json

Objetivo:
Transformar a comparação científica V1 x V2 e sua
auditoria independente em uma recomendação final.

IMPORTANTE:

- não altera estratégia oficial;
- não altera projeções;
- não altera pesos;
- não promove V2 automaticamente;
- apenas produz uma recomendação científica auditável.

=========================================================
"""

import json
import math

from pathlib import Path


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

ARQUIVO_COMPARACAO = (
    PASTA_DATA /
    "comparacao-estrategias-adaptativas.json"
)

ARQUIVO_AUDITORIA = (
    PASTA_DATA /
    "auditoria-comparacao-adaptativas.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "decisao-estrategia-adaptativa.json"
)


MODELO_COMPARACAO = (
    "comparacao_estrategias_adaptativas_v1"
)

MODELO_AUDITORIA = (
    "auditoria_comparacao_adaptativas_v1"
)

MODELO_SAIDA = (
    "decisao_estrategia_adaptativa_v1"
)


MINIMO_RODADAS = 10

SCORE_AUDITORIA_MINIMO = 95.0

GANHO_MINIMO_V2_V1 = 0.50

GANHO_FORTE_V2_V1 = 1.00

GANHO_MINIMO_V2_FIXA = 0.00

TAXA_VITORIAS_PAREADAS_MINIMA = 55.0


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


def criterio(
    nome,
    passou,
    valor=None,
    limite=None,
    critico=True
):

    return {

        "nome":
            nome,

        "passou":
            bool(
                passou
            ),

        "valor":
            valor,

        "limite":
            limite,

        "nivel":
            (
                "CRITICO"
                if critico
                else "DESEJAVEL"
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
        "DECISÃO DA ESTRATÉGIA ADAPTATIVA"
    )

    print(
        "=============================================="
    )

    # ==================================================
    # CARREGAMENTO
    # ==================================================

    comparacao = carregar_json(
        ARQUIVO_COMPARACAO
    )

    auditoria = carregar_json(
        ARQUIVO_AUDITORIA
    )

    comparacao_existe = isinstance(
        comparacao,
        dict
    )

    auditoria_existe = isinstance(
        auditoria,
        dict
    )

    if not comparacao_existe:

        comparacao = {}

    if not auditoria_existe:

        auditoria = {}

    # ==================================================
    # VERSÕES
    # ==================================================

    versao_comparacao_ok = (
        comparacao.get(
            "modelo"
        )
        ==
        MODELO_COMPARACAO
    )

    versao_auditoria_ok = (
        auditoria.get(
            "modelo"
        )
        ==
        MODELO_AUDITORIA
    )

    # ==================================================
    # AMOSTRA
    # ==================================================

    amostra = comparacao.get(
        "amostra",
        {}
    )

    rodadas = inteiro(
        amostra.get(
            "rodadasComuns"
        )
    )

    amostra_suficiente = (
        rodadas
        >=
        MINIMO_RODADAS
    )

    # ==================================================
    # AUDITORIA
    # ==================================================

    resumo_auditoria = auditoria.get(
        "resumo",
        {}
    )

    decisao_auditoria_obj = auditoria.get(
        "decisao",
        {}
    )

    decisao_auditoria = (
        decisao_auditoria_obj.get(
            "decisao"
        )
    )

    auditoria_validada = (
        decisao_auditoria_obj.get(
            "validado"
        )
        is True
    )

    score_auditoria = numero(
        resumo_auditoria.get(
            "scoreQualidadePercentual"
        )
    )

    falhas_criticas = inteiro(
        resumo_auditoria.get(
            "falhasCriticas"
        )
    )

    alertas = inteiro(
        resumo_auditoria.get(
            "alertas"
        )
    )

    auditoria_sem_falhas = (
        falhas_criticas == 0
    )

    score_auditoria_suficiente = (
        score_auditoria
        >=
        SCORE_AUDITORIA_MINIMO
    )

    # ==================================================
    # MÉTRICAS
    # ==================================================

    metricas = comparacao.get(
        "metricas",
        {}
    )

    metricas_v1 = metricas.get(
        "adaptativoV1",
        {}
    )

    metricas_v2 = metricas.get(
        "adaptativoV2",
        {}
    )

    media_v1 = numero(
        metricas_v1.get(
            "media"
        )
    )

    media_v2 = numero(
        metricas_v2.get(
            "media"
        )
    )

    desvio_v1 = numero(
        metricas_v1.get(
            "desvioPadrao"
        )
    )

    desvio_v2 = numero(
        metricas_v2.get(
            "desvioPadrao"
        )
    )

    melhor_fixa = metricas.get(
        "melhorEstrategiaFixa"
    )

    metricas_fixas = metricas.get(
        "estrategiasFixas",
        {}
    )

    media_melhor_fixa = numero(
        metricas_fixas.get(
            melhor_fixa,
            {}
        ).get(
            "media"
        )
    )

    metricas_oraculo = metricas.get(
        "oraculo",
        {}
    )

    media_oraculo = numero(
        metricas_oraculo.get(
            "media"
        )
    )

    # ==================================================
    # GANHOS
    # ==================================================

    ganhos = comparacao.get(
        "ganhos",
        {}
    )

    ganho_v2_v1 = numero(
        ganhos.get(
            "v2VsV1",
            {}
        ).get(
            "pontosPorRodada"
        )
    )

    ganho_v2_v1_percentual = numero(
        ganhos.get(
            "v2VsV1",
            {}
        ).get(
            "percentual"
        )
    )

    ganho_v2_fixa = numero(
        ganhos.get(
            "v2VsMelhorFixa",
            {}
        ).get(
            "pontosPorRodada"
        )
    )

    ganho_v2_fixa_percentual = numero(
        ganhos.get(
            "v2VsMelhorFixa",
            {}
        ).get(
            "percentual"
        )
    )

    # ==================================================
    # COMPARAÇÃO PAREADA
    # ==================================================

    pareado = comparacao.get(
        "comparacaoPareadaV1V2",
        {}
    )

    vitorias_v1 = inteiro(
        pareado.get(
            "vitoriasV1"
        )
    )

    vitorias_v2 = inteiro(
        pareado.get(
            "vitoriasV2"
        )
    )

    empates = inteiro(
        pareado.get(
            "empates"
        )
    )

    total_pareado = inteiro(
        pareado.get(
            "rodadas"
        )
    )

    taxa_vitorias_v2 = numero(
        pareado.get(
            "taxaVitoriasV2"
        )
    )

    if taxa_vitorias_v2 == 0:

        taxa_vitorias_v2 = percentual(
            vitorias_v2,
            total_pareado
        )

    # ==================================================
    # ORÁCULO
    # ==================================================

    dados_oraculo = comparacao.get(
        "oraculo",
        {}
    )

    eficiencia_v1 = numero(
        dados_oraculo.get(
            "eficienciaV1Percentual"
        )
    )

    eficiencia_v2 = numero(
        dados_oraculo.get(
            "eficienciaV2Percentual"
        )
    )

    perda_oraculo_v1 = numero(
        dados_oraculo.get(
            "v1",
            {}
        ).get(
            "perdaMediaParaOraculo"
        )
    )

    perda_oraculo_v2 = numero(
        dados_oraculo.get(
            "v2",
            {}
        ).get(
            "perdaMediaParaOraculo"
        )
    )

    # ==================================================
    # ESTABILIDADE
    # ==================================================

    estabilidade = comparacao.get(
        "estabilidade",
        {}
    )

    v2_mais_estavel = (
        estabilidade.get(
            "v2MaisEstavel"
        )
        is True
    )

    # ==================================================
    # DECISÃO DA COMPARAÇÃO
    # ==================================================

    decisao_comparacao = (
        comparacao.get(
            "decisao",
            {}
        ).get(
            "decisao"
        )
    )

    # ==================================================
    # CRITÉRIOS
    # ==================================================

    criterios = []

    criterios.append(
        criterio(
            "arquivo_comparacao_existe",
            comparacao_existe,
            comparacao_existe,
            True,
            True
        )
    )

    criterios.append(
        criterio(
            "arquivo_auditoria_existe",
            auditoria_existe,
            auditoria_existe,
            True,
            True
        )
    )

    criterios.append(
        criterio(
            "versao_comparacao",
            versao_comparacao_ok,
            comparacao.get(
                "modelo"
            ),
            MODELO_COMPARACAO,
            True
        )
    )

    criterios.append(
        criterio(
            "versao_auditoria",
            versao_auditoria_ok,
            auditoria.get(
                "modelo"
            ),
            MODELO_AUDITORIA,
            True
        )
    )

    criterios.append(
        criterio(
            "amostra_minima",
            amostra_suficiente,
            rodadas,
            MINIMO_RODADAS,
            True
        )
    )

    criterios.append(
        criterio(
            "auditoria_validada",
            auditoria_validada,
            decisao_auditoria,
            "COMPARACAO_VALIDADA",
            True
        )
    )

    criterios.append(
        criterio(
            "auditoria_sem_falhas_criticas",
            auditoria_sem_falhas,
            falhas_criticas,
            0,
            True
        )
    )

    criterios.append(
        criterio(
            "score_auditoria",
            score_auditoria_suficiente,
            arredondar(
                score_auditoria
            ),
            SCORE_AUDITORIA_MINIMO,
            True
        )
    )

    criterios.append(
        criterio(
            "v2_supera_v1_media",
            ganho_v2_v1 > 0,
            arredondar(
                ganho_v2_v1
            ),
            "> 0",
            True
        )
    )

    criterios.append(
        criterio(
            "v2_ganho_minimo_v1",
            ganho_v2_v1
            >=
            GANHO_MINIMO_V2_V1,
            arredondar(
                ganho_v2_v1
            ),
            GANHO_MINIMO_V2_V1,
            True
        )
    )

    criterios.append(
        criterio(
            "v2_supera_melhor_fixa",
            ganho_v2_fixa
            >
            GANHO_MINIMO_V2_FIXA,
            arredondar(
                ganho_v2_fixa
            ),
            "> 0",
            True
        )
    )

    criterios.append(
        criterio(
            "v2_vence_maioria_pareada",
            taxa_vitorias_v2
            >=
            TAXA_VITORIAS_PAREADAS_MINIMA,
            arredondar(
                taxa_vitorias_v2
            ),
            TAXA_VITORIAS_PAREADAS_MINIMA,
            True
        )
    )

    criterios.append(
        criterio(
            "v2_mais_proximo_oraculo",
            perda_oraculo_v2
            <
            perda_oraculo_v1,
            arredondar(
                perda_oraculo_v2
            ),
            (
                f"< "
                f"{arredondar(perda_oraculo_v1)}"
            ),
            True
        )
    )

    criterios.append(
        criterio(
            "v2_mais_estavel",
            v2_mais_estavel,
            arredondar(
                desvio_v2
            ),
            (
                f"< "
                f"{arredondar(desvio_v1)}"
            ),
            False
        )
    )

    # ==================================================
    # CRITÉRIOS CRÍTICOS
    # ==================================================

    criticos = [

        item

        for item in criterios

        if item[
            "nivel"
        ] == "CRITICO"

    ]

    criticos_aprovados = [

        item

        for item in criticos

        if item[
            "passou"
        ]

    ]

    criticos_reprovados = [

        item

        for item in criticos

        if not item[
            "passou"
        ]

    ]

    desejaveis = [

        item

        for item in criterios

        if item[
            "nivel"
        ] == "DESEJAVEL"

    ]

    desejaveis_aprovados = [

        item

        for item in desejaveis

        if item[
            "passou"
        ]

    ]

    score_criterios = percentual(
        len(
            criticos_aprovados
        ),
        len(
            criticos
        )
    )

    # ==================================================
    # CLASSIFICAÇÃO DA EVIDÊNCIA
    # ==================================================

    evidencia_forte = (

        len(
            criticos_reprovados
        ) == 0

        and

        ganho_v2_v1
        >=
        GANHO_FORTE_V2_V1

        and

        taxa_vitorias_v2
        >=
        60.0

    )

    evidencia_suficiente = (

        len(
            criticos_reprovados
        ) == 0

        and

        ganho_v2_v1
        >=
        GANHO_MINIMO_V2_V1

    )

    # ==================================================
    # RECOMENDAÇÃO
    # ==================================================

    if not (
        comparacao_existe
        and
        auditoria_existe
        and
        versao_comparacao_ok
        and
        versao_auditoria_ok
    ):

        recomendacao = (
            "BLOQUEAR_DECISAO"
        )

        motivo = (
            "Entradas ausentes ou versões incompatíveis."
        )

    elif not auditoria_validada:

        recomendacao = (
            "BLOQUEAR_DECISAO"
        )

        motivo = (
            "A comparação V1 x V2 não foi validada "
            "pela auditoria independente."
        )

    elif falhas_criticas > 0:

        recomendacao = (
            "BLOQUEAR_DECISAO"
        )

        motivo = (
            "Existem falhas críticas na auditoria."
        )

    elif evidencia_forte:

        recomendacao = (
            "RECOMENDAR_V2_FORTE"
        )

        motivo = (
            "V2 passou por todos os critérios críticos "
            "e apresentou ganho forte sobre V1."
        )

    elif evidencia_suficiente:

        recomendacao = (
            "RECOMENDAR_V2"
        )

        motivo = (
            "V2 passou por todos os critérios críticos "
            "e apresentou ganho mínimo suficiente."
        )

    elif (
        ganho_v2_v1 > 0
        and
        ganho_v2_fixa > 0
    ):

        recomendacao = (
            "MANTER_V2_EM_TESTE"
        )

        motivo = (
            "V2 apresentou sinal positivo, mas ainda "
            "não atingiu todos os critérios de promoção."
        )

    elif abs(
        ganho_v2_v1
    ) <= 0.05:

        recomendacao = (
            "MANTER_V1"
        )

        motivo = (
            "V1 e V2 apresentaram desempenho equivalente; "
            "não há evidência para aumentar a complexidade."
        )

    else:

        recomendacao = (
            "MANTER_V1"
        )

        motivo = (
            "V2 não apresentou evidência suficiente "
            "de superioridade sobre V1."
        )

    # ==================================================
    # CONSISTÊNCIA COM COMPARAÇÃO
    # ==================================================

    decisoes_favoraveis_v2 = {

        "V2_FORTEMENTE_SUPERIOR",
        "V2_SUPERIOR",
        "V2_PROMISSOR"

    }

    comparacao_favoravel_v2 = (
        decisao_comparacao
        in
        decisoes_favoraveis_v2
    )

    recomendacao_favoravel_v2 = (
        recomendacao
        in
        {
            "RECOMENDAR_V2_FORTE",
            "RECOMENDAR_V2",
            "MANTER_V2_EM_TESTE"
        }
    )

    coerencia_decisao = (
        comparacao_favoravel_v2
        ==
        recomendacao_favoravel_v2
    )

    # ==================================================
    # RESULTADO
    # ==================================================

    resultado = {

        "modelo":
            MODELO_SAIDA,

        "descricao":
            (
                "Decisão científica consolidada sobre "
                "a estratégia adaptativa V1 e V2."
            ),

        "status":
            "experimental",

        "amostra": {

            "rodadas":
                rodadas,

            "minimoExigido":
                MINIMO_RODADAS,

            "suficiente":
                amostra_suficiente

        },

        "auditoria": {

            "decisao":
                decisao_auditoria,

            "validada":
                auditoria_validada,

            "scoreQualidade":
                arredondar(
                    score_auditoria
                ),

            "falhasCriticas":
                falhas_criticas,

            "alertas":
                alertas

        },

        "desempenho": {

            "v1": {

                "media":
                    arredondar(
                        media_v1
                    ),

                "desvioPadrao":
                    arredondar(
                        desvio_v1
                    ),

                "eficienciaOraculo":
                    arredondar(
                        eficiencia_v1
                    ),

                "perdaMediaOraculo":
                    arredondar(
                        perda_oraculo_v1
                    )

            },

            "v2": {

                "media":
                    arredondar(
                        media_v2
                    ),

                "desvioPadrao":
                    arredondar(
                        desvio_v2
                    ),

                "eficienciaOraculo":
                    arredondar(
                        eficiencia_v2
                    ),

                "perdaMediaOraculo":
                    arredondar(
                        perda_oraculo_v2
                    )

            },

            "melhorFixa": {

                "nome":
                    melhor_fixa,

                "media":
                    arredondar(
                        media_melhor_fixa
                    )

            },

            "oraculo": {

                "media":
                    arredondar(
                        media_oraculo
                    )

            }

        },

        "ganhosV2": {

            "vsV1": {

                "pontosPorRodada":
                    arredondar(
                        ganho_v2_v1
                    ),

                "percentual":
                    arredondar(
                        ganho_v2_v1_percentual
                    )

            },

            "vsMelhorFixa": {

                "pontosPorRodada":
                    arredondar(
                        ganho_v2_fixa
                    ),

                "percentual":
                    arredondar(
                        ganho_v2_fixa_percentual
                    )

            }

        },

        "comparacaoPareada": {

            "rodadas":
                total_pareado,

            "vitoriasV1":
                vitorias_v1,

            "vitoriasV2":
                vitorias_v2,

            "empates":
                empates,

            "taxaVitoriasV2":
                arredondar(
                    taxa_vitorias_v2
                )

        },

        "criterios":
            criterios,

        "resumoCriterios": {

            "criticos":
                len(
                    criticos
                ),

            "criticosAprovados":
                len(
                    criticos_aprovados
                ),

            "criticosReprovados":
                len(
                    criticos_reprovados
                ),

            "desejaveis":
                len(
                    desejaveis
                ),

            "desejaveisAprovados":
                len(
                    desejaveis_aprovados
                ),

            "scoreCriticosPercentual":
                arredondar(
                    score_criterios
                )

        },

        "evidencia": {

            "forte":
                evidencia_forte,

            "suficiente":
                evidencia_suficiente,

            "comparacaoFavoravelV2":
                comparacao_favoravel_v2,

            "coerenciaDecisao":
                coerencia_decisao

        },

        "decisaoComparacao":
            decisao_comparacao,

        "recomendacao": {

            "decisao":
                recomendacao,

            "motivo":
                motivo,

            "promoverAutomaticamente":
                False,

            "necessitaAprovacaoManual":
                True

        },

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraEstrategiaOficial":
                False,

            "alteraPesos":
                False,

            "alteraProjecoes":
                False,

            "alteraEscalacoes":
                False,

            "promocaoAutomatica":
                False

        },

        "proximoPasso": (
            "Integrar comparação, auditoria e decisão "
            "ao workflow e executar validação completa."
        )

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
        rodadas
    )

    print()

    print(
        "AUDITORIA"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Decisão:",
        decisao_auditoria
    )

    print(
        "Score:",
        arredondar(
            score_auditoria
        ),
        "%"
    )

    print(
        "Falhas críticas:",
        falhas_criticas
    )

    print()

    print(
        "DESEMPENHO"
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
        "GANHOS V2"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "V2 x V1:",
        arredondar(
            ganho_v2_v1
        ),
        "pontos/rodada"
    )

    print(
        "V2 x melhor fixa:",
        arredondar(
            ganho_v2_fixa
        ),
        "pontos/rodada"
    )

    print()

    print(
        "PAREADO"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Vitórias V1:",
        vitorias_v1
    )

    print(
        "Vitórias V2:",
        vitorias_v2
    )

    print(
        "Empates:",
        empates
    )

    print(
        "Taxa V2:",
        arredondar(
            taxa_vitorias_v2
        ),
        "%"
    )

    print()

    print(
        "CRITÉRIOS"
    )

    print(
        "----------------------------------------------"
    )

    for item in criterios:

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
        "Critérios críticos:",
        len(
            criticos
        )
    )

    print(
        "Aprovados:",
        len(
            criticos_aprovados
        )
    )

    print(
        "Reprovados:",
        len(
            criticos_reprovados
        )
    )

    print()

    print(
        "DECISÃO COMPARAÇÃO:",
        decisao_comparacao
    )

    print(
        "RECOMENDAÇÃO:",
        recomendacao
    )

    print(
        "Motivo:",
        motivo
    )

    print()

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
