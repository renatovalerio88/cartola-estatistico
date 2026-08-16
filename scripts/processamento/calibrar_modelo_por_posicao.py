"""
=========================================================
CARTOLA ESTATÍSTICO
Calibração Científica por Posição

Objetivo:

Criar uma versão CANDIDATA de calibração da projeção
para cada posição do Cartola FC.

O script analisa o desempenho histórico do modelo e
procura corrigir principalmente:

- superestimação
- subestimação
- erro absoluto elevado
- baixa quantidade de dados
- instabilidade por posição

IMPORTANTE:

Este script NÃO altera:

- pesos oficiais
- motor oficial
- projeções atuais
- escalações oficiais

Ele apenas gera parâmetros candidatos que serão
posteriormente submetidos a backtest A/B.

Entradas principais:

data/analise-simulacoes-historicas.json
data/auditoria-top-real.json

Entrada auxiliar:

data/backtest-inteligente.json

Saída:

data/calibracao-posicoes-candidata.json

=========================================================
"""

from pathlib import Path
import json
import math
from statistics import mean


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


ARQUIVO_ANALISE = (
    PASTA_DATA /
    "analise-simulacoes-historicas.json"
)


ARQUIVO_AUDITORIA = (
    PASTA_DATA /
    "auditoria-top-real.json"
)


ARQUIVO_BACKTEST = (
    PASTA_DATA /
    "backtest-inteligente.json"
)


ARQUIVO_SAIDA = (
    PASTA_DATA /
    "calibracao-posicoes-candidata.json"
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
# PARÂMETROS DE SEGURANÇA
# ======================================================

AMOSTRA_MINIMA = 20

AMOSTRA_CONFIAVEL = 60

AMOSTRA_FORTE = 120


# Quanto do viés histórico será corrigido.

CORRECAO_VIES_MINIMA = 0.20

CORRECAO_VIES_PADRAO = 0.35

CORRECAO_VIES_FORTE = 0.50


# Limite absoluto da correção aditiva.

LIMITE_CORRECAO_ADITIVA = 1.50


# Limites do fator multiplicativo.

FATOR_MINIMO = 0.88

FATOR_MAXIMO = 1.12


# Fator final nunca poderá sair destes limites.

FATOR_FINAL_MINIMO = 0.85

FATOR_FINAL_MAXIMO = 1.15


# Influência máxima da qualidade do ranking.

AJUSTE_RANKING_MAXIMO = 0.03


# Influência máxima do MAE.

AJUSTE_MAE_MAXIMO = 0.025


# Faixas de MAE.

MAE_BOM = 3.00

MAE_MODERADO = 4.50

MAE_ALTO = 6.00


# Percentil considerado bom.

PERCENTIL_BOM = 70.0

PERCENTIL_MODERADO = 55.0


# Eficiência de captura considerada boa.

EFICIENCIA_BOA = 70.0

EFICIENCIA_MODERADA = 55.0


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
    casas=4
):

    return round(
        numero(
            valor,
            0
        ),
        casas
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


def media_segura(
    valores
):

    valores_validos = []

    for valor in valores:

        try:

            valor = float(
                valor
            )

            if math.isfinite(
                valor
            ):

                valores_validos.append(
                    valor
                )

        except Exception:

            pass


    if not valores_validos:

        return 0


    return mean(
        valores_validos
    )


# ======================================================
# EXTRAÇÃO DA ANÁLISE POR POSIÇÃO
# ======================================================

def obter_dados_posicao_analise(
    analise,
    posicao
):

    desempenho = analise.get(
        "desempenhoPorPosicao",
        {}
    )


    dados = desempenho.get(
        posicao,
        {}
    )


    return {

        "amostras":
            inteiro(
                dados.get(
                    "amostras"
                ),
                0
            ),

        "mae":
            numero(
                dados.get(
                    "mae"
                ),
                0
            ),

        "vies":
            numero(
                dados.get(
                    "vies"
                ),
                0
            ),

        "mediaProjecao":
            numero(
                dados.get(
                    "mediaProjecao"
                ),
                0
            ),

        "mediaReal":
            numero(
                dados.get(
                    "mediaReal"
                ),
                0
            ),

        "taxaAcertoTopReal":
            numero(
                dados.get(
                    "taxaAcertoTopReal"
                ),
                0
            ),

        "acertosTopReal":
            inteiro(
                dados.get(
                    "acertosTopReal"
                ),
                0
            ),

        "totalEscalados":
            inteiro(
                dados.get(
                    "totalEscalados"
                ),
                0
            )

    }


# ======================================================
# EXTRAÇÃO DA AUDITORIA TOP REAL
# ======================================================

def obter_dados_posicao_auditoria(
    auditoria,
    posicao
):

    resumo = auditoria.get(
        "resumoSemColdStart",
        {}
    )


    posicoes = resumo.get(
        "posicoes",
        {}
    )


    dados = posicoes.get(
        posicao,
        {}
    )


    return {

        "escalados":
            inteiro(
                dados.get(
                    "escalados"
                ),
                0
            ),

        "identificados":
            inteiro(
                dados.get(
                    "identificados"
                ),
                0
            ),

        "taxaIdentificacao":
            numero(
                dados.get(
                    "taxaIdentificacao"
                ),
                0
            ),

        "topN":
            numero(
                dados.get(
                    "topN",
                    {}
                ).get(
                    "taxa"
                ),
                0
            ),

        "top5":
            numero(
                dados.get(
                    "top5",
                    {}
                ).get(
                    "taxa"
                ),
                0
            ),

        "top10":
            numero(
                dados.get(
                    "top10",
                    {}
                ).get(
                    "taxa"
                ),
                0
            ),

        "rankingRealMedio":
            numero(
                dados.get(
                    "rankingRealMedio"
                ),
                0
            ),

        "percentilMedio":
            numero(
                dados.get(
                    "percentilMedio"
                ),
                0
            ),

        "eficienciaCapturaPontos":
            numero(
                dados.get(
                    "eficienciaCapturaPontos"
                ),
                0
            )

    }


# ======================================================
# CONFIANÇA DA AMOSTRA
# ======================================================

def calcular_confianca_amostra(
    amostras
):

    amostras = inteiro(
        amostras,
        0
    )


    if amostras < AMOSTRA_MINIMA:

        return {

            "nivel":
                "insuficiente",

            "fator":
                0.0

        }


    if amostras < AMOSTRA_CONFIAVEL:

        return {

            "nivel":
                "baixa",

            "fator":
                0.40

        }


    if amostras < AMOSTRA_FORTE:

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
# INTENSIDADE DE CORREÇÃO DO VIÉS
# ======================================================

def calcular_intensidade_vies(
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
    confianca_amostra
):

    vies = numero(
        vies,
        0
    )


    fator_amostra = numero(
        confianca_amostra.get(
            "fator"
        ),
        0
    )


    intensidade = (
        calcular_intensidade_vies(
            vies
        )
    )


    correcao = (

        -vies *
        intensidade *
        fator_amostra

    )


    return limitar(

        correcao,

        -LIMITE_CORRECAO_ADITIVA,

        LIMITE_CORRECAO_ADITIVA

    )


# ======================================================
# FATOR MULTIPLICATIVO PELO VIÉS
# ======================================================

def calcular_fator_vies(
    media_projecao,
    media_real,
    confianca_amostra
):

    media_projecao = numero(
        media_projecao,
        0
    )


    media_real = numero(
        media_real,
        0
    )


    fator_amostra = numero(
        confianca_amostra.get(
            "fator"
        ),
        0
    )


    if (
        media_projecao == 0
        or fator_amostra == 0
    ):

        return 1.0


    fator_bruto = (
        media_real /
        media_projecao
    )


    # Não usamos 100% da razão histórica.
    # Aproximamos gradualmente de 1.

    fator_suavizado = (

        1.0 +

        (
            fator_bruto -
            1.0
        )

        *

        0.35

        *

        fator_amostra

    )


    return limitar(

        fator_suavizado,

        FATOR_MINIMO,

        FATOR_MAXIMO

    )


# ======================================================
# AJUSTE PELO MAE
# ======================================================

def calcular_ajuste_mae(
    mae,
    confianca_amostra
):

    mae = numero(
        mae,
        0
    )


    fator_amostra = numero(
        confianca_amostra.get(
            "fator"
        ),
        0
    )


    if fator_amostra == 0:

        return 0


    if mae <= MAE_BOM:

        ajuste = 0.005


    elif mae <= MAE_MODERADO:

        ajuste = 0


    elif mae <= MAE_ALTO:

        ajuste = -0.0125


    else:

        ajuste = -AJUSTE_MAE_MAXIMO


    return (
        ajuste *
        fator_amostra
    )


# ======================================================
# AJUSTE PELA QUALIDADE DO RANKING
# ======================================================

def calcular_ajuste_ranking(
    auditoria_posicao,
    confianca_amostra
):

    fator_amostra = numero(
        confianca_amostra.get(
            "fator"
        ),
        0
    )


    if fator_amostra == 0:

        return 0


    taxa_identificacao = numero(

        auditoria_posicao.get(
            "taxaIdentificacao"
        ),

        0

    )


    # Se não conseguimos identificar corretamente
    # os jogadores, não usamos a auditoria para calibrar.

    if taxa_identificacao < 95:

        return 0


    percentil = numero(

        auditoria_posicao.get(
            "percentilMedio"
        ),

        0

    )


    eficiencia = numero(

        auditoria_posicao.get(
            "eficienciaCapturaPontos"
        ),

        0

    )


    sinais = []


    # --------------------------------------
    # Percentil
    # --------------------------------------

    if percentil >= PERCENTIL_BOM:

        sinais.append(
            1
        )


    elif percentil >= PERCENTIL_MODERADO:

        sinais.append(
            0
        )


    else:

        sinais.append(
            -1
        )


    # --------------------------------------
    # Eficiência
    # --------------------------------------

    if eficiencia >= EFICIENCIA_BOA:

        sinais.append(
            1
        )


    elif eficiencia >= EFICIENCIA_MODERADA:

        sinais.append(
            0
        )


    else:

        sinais.append(
            -1
        )


    sinal_medio = media_segura(
        sinais
    )


    ajuste = (

        sinal_medio *
        AJUSTE_RANKING_MAXIMO *
        fator_amostra

    )


    return limitar(

        ajuste,

        -AJUSTE_RANKING_MAXIMO,

        AJUSTE_RANKING_MAXIMO

    )


# ======================================================
# CLASSIFICAÇÃO DO VIÉS
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


    if absoluto < 0.50:

        intensidade = "baixo"


    elif absoluto < 1.50:

        intensidade = "moderado"


    elif absoluto < 2.50:

        intensidade = "alto"


    else:

        intensidade = "muito_alto"


    if vies > 0.50:

        direcao = "superestimacao"


    elif vies < -0.50:

        direcao = "subestimacao"


    else:

        direcao = "equilibrado"


    return {

        "direcao":
            direcao,

        "intensidade":
            intensidade,

        "valor":
            arredondar(
                vies,
                3
            )

    }


# ======================================================
# CLASSIFICAÇÃO DO MAE
# ======================================================

def classificar_mae(
    mae
):

    mae = numero(
        mae,
        0
    )


    if mae <= MAE_BOM:

        return "bom"


    if mae <= MAE_MODERADO:

        return "moderado"


    if mae <= MAE_ALTO:

        return "alto"


    return "muito_alto"


# ======================================================
# PRIORIDADE
# ======================================================

def calcular_prioridade(
    mae,
    vies,
    confianca_amostra
):

    nivel_amostra = (
        confianca_amostra.get(
            "nivel"
        )
    )


    if nivel_amostra == "insuficiente":

        return "aguardar_dados"


    mae = numero(
        mae,
        0
    )


    vies_abs = abs(
        numero(
            vies,
            0
        )
    )


    if (
        mae > MAE_ALTO
        or vies_abs >= 2.50
    ):

        return "alta"


    if (
        mae > MAE_MODERADO
        or vies_abs >= 1.50
    ):

        return "media"


    return "baixa"


# ======================================================
# CALIBRAÇÃO DE UMA POSIÇÃO
# ======================================================

def calibrar_posicao(
    posicao,
    dados_analise,
    dados_auditoria
):

    amostras = dados_analise.get(
        "amostras",
        0
    )


    mae = dados_analise.get(
        "mae",
        0
    )


    vies = dados_analise.get(
        "vies",
        0
    )


    media_projecao = dados_analise.get(
        "mediaProjecao",
        0
    )


    media_real = dados_analise.get(
        "mediaReal",
        0
    )


    confianca = calcular_confianca_amostra(
        amostras
    )


    # --------------------------------------
    # Correção aditiva
    # --------------------------------------

    correcao_aditiva = (
        calcular_correcao_aditiva(

            vies,

            confianca

        )
    )


    # --------------------------------------
    # Fator pelo viés
    # --------------------------------------

    fator_vies = (
        calcular_fator_vies(

            media_projecao,

            media_real,

            confianca

        )
    )


    # --------------------------------------
    # Ajuste pelo MAE
    # --------------------------------------

    ajuste_mae = (
        calcular_ajuste_mae(

            mae,

            confianca

        )
    )


    # --------------------------------------
    # Ajuste pela qualidade do ranking
    # --------------------------------------

    ajuste_ranking = (
        calcular_ajuste_ranking(

            dados_auditoria,

            confianca

        )
    )


    # --------------------------------------
    # Fator final
    # --------------------------------------

    fator_final = (

        fator_vies +
        ajuste_mae +
        ajuste_ranking

    )


    fator_final = limitar(

        fator_final,

        FATOR_FINAL_MINIMO,

        FATOR_FINAL_MAXIMO

    )


    # --------------------------------------
    # Segurança
    # --------------------------------------

    aplicar = (

        confianca.get(
            "nivel"
        )
        != "insuficiente"

    )


    if not aplicar:

        fator_final = 1.0

        correcao_aditiva = 0


    prioridade = calcular_prioridade(

        mae,

        vies,

        confianca

    )


    # --------------------------------------
    # Explicação
    # --------------------------------------

    motivos = []


    classificacao_vies = (
        classificar_vies(
            vies
        )
    )


    classificacao_erro = (
        classificar_mae(
            mae
        )
    )


    if classificacao_vies[
        "direcao"
    ] == "superestimacao":

        motivos.append(
            (
                f"A projeção histórica está "
                f"superestimando {posicao} "
                f"em {arredondar(vies, 2)} pontos."
            )
        )


    elif classificacao_vies[
        "direcao"
    ] == "subestimacao":

        motivos.append(
            (
                f"A projeção histórica está "
                f"subestimando {posicao} "
                f"em {arredondar(abs(vies), 2)} pontos."
            )
        )


    else:

        motivos.append(
            (
                f"O viés histórico de {posicao} "
                "está próximo do equilíbrio."
            )
        )


    motivos.append(
        (
            f"MAE da posição: "
            f"{arredondar(mae, 2)} "
            f"({classificacao_erro})."
        )
    )


    if dados_auditoria.get(
        "taxaIdentificacao",
        0
    ) >= 95:

        motivos.append(
            (
                "Auditoria Top Real válida: "
                f"percentil médio "
                f"{arredondar(dados_auditoria.get('percentilMedio'), 2)} "
                f"e eficiência de captura "
                f"{arredondar(dados_auditoria.get('eficienciaCapturaPontos'), 2)}%."
            )
        )


    else:

        motivos.append(
            (
                "Auditoria Top Real não utilizada "
                "na calibração por baixa taxa de "
                "identificação dos atletas."
            )
        )


    if not aplicar:

        motivos.append(
            (
                "Amostra insuficiente. "
                "Nenhuma correção será aplicada "
                "nesta posição."
            )
        )


    return {

        "posicao":
            posicao,

        "aplicarNoTesteAB":
            aplicar,

        "prioridade":
            prioridade,

        "amostra": {

            "quantidade":
                amostras,

            "nivelConfianca":
                confianca.get(
                    "nivel"
                ),

            "fatorConfianca":
                arredondar(
                    confianca.get(
                        "fator"
                    ),
                    3
                )

        },

        "diagnostico": {

            "mae":
                arredondar(
                    mae,
                    3
                ),

            "classificacaoMae":
                classificacao_erro,

            "vies":
                classificacao_vies,

            "mediaProjecao":
                arredondar(
                    media_projecao,
                    3
                ),

            "mediaReal":
                arredondar(
                    media_real,
                    3
                )

        },

        "auditoriaRanking": {

            "taxaIdentificacao":
                arredondar(
                    dados_auditoria.get(
                        "taxaIdentificacao"
                    ),
                    2
                ),

            "topN":
                arredondar(
                    dados_auditoria.get(
                        "topN"
                    ),
                    2
                ),

            "top5":
                arredondar(
                    dados_auditoria.get(
                        "top5"
                    ),
                    2
                ),

            "top10":
                arredondar(
                    dados_auditoria.get(
                        "top10"
                    ),
                    2
                ),

            "percentilMedio":
                arredondar(
                    dados_auditoria.get(
                        "percentilMedio"
                    ),
                    2
                ),

            "eficienciaCapturaPontos":
                arredondar(
                    dados_auditoria.get(
                        "eficienciaCapturaPontos"
                    ),
                    2
                )

        },

        "calibracaoCandidata": {

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

            "componentes": {

                "fatorVies":
                    arredondar(
                        fator_vies,
                        5
                    ),

                "ajusteMae":
                    arredondar(
                        ajuste_mae,
                        5
                    ),

                "ajusteRanking":
                    arredondar(
                        ajuste_ranking,
                        5
                    )

            },

            "formulaTeste":
                (
                    "projecao_calibrada = "
                    "(projecao_original * "
                    "fatorMultiplicativo) + "
                    "correcaoAditiva"
                )

        },

        "motivos":
            motivos

    }


# ======================================================
# BACKTEST INTELIGENTE - RESUMO AUXILIAR
# ======================================================

def resumir_backtest(
    backtest
):

    rodadas = backtest.get(
        "rodadas",
        []
    )


    if not rodadas:

        return {

            "disponivel":
                False,

            "rodadas":
                0,

            "erroMedio":
                0,

            "taxaAcertoMedia":
                0

        }


    erros = []

    acertos = []


    for rodada in rodadas:

        erro = (

            rodada.get(
                "erro"
            )

            if rodada.get(
                "erro"
            ) is not None

            else rodada.get(
                "erroMedio"
            )

        )


        taxa = (

            rodada.get(
                "taxaAcerto"
            )

            if rodada.get(
                "taxaAcerto"
            ) is not None

            else rodada.get(
                "acerto"
            )

        )


        if erro is not None:

            erros.append(
                numero(
                    erro,
                    0
                )
            )


        if taxa is not None:

            acertos.append(
                numero(
                    taxa,
                    0
                )
            )


    return {

        "disponivel":
            True,

        "rodadas":
            len(
                rodadas
            ),

        "erroMedio":
            arredondar(
                media_segura(
                    erros
                ),
                3
            ),

        "taxaAcertoMedia":
            arredondar(
                media_segura(
                    acertos
                ),
                2
            )

    }


# ======================================================
# RESUMO DA CALIBRAÇÃO
# ======================================================

def gerar_resumo(
    calibracoes
):

    aplicaveis = [

        item

        for item
        in calibracoes

        if item.get(
            "aplicarNoTesteAB"
        )

    ]


    prioridades_altas = [

        item.get(
            "posicao"
        )

        for item
        in calibracoes

        if item.get(
            "prioridade"
        ) == "alta"

    ]


    prioridades_medias = [

        item.get(
            "posicao"
        )

        for item
        in calibracoes

        if item.get(
            "prioridade"
        ) == "media"

    ]


    reducoes = []


    aumentos = []


    neutras = []


    for item in calibracoes:

        posicao = item.get(
            "posicao"
        )


        calibracao = item.get(
            "calibracaoCandidata",
            {}
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


        efeito = (
            fator -
            1
        )


        if (
            efeito < -0.005
            or aditivo < -0.05
        ):

            reducoes.append(
                posicao
            )


        elif (
            efeito > 0.005
            or aditivo > 0.05
        ):

            aumentos.append(
                posicao
            )


        else:

            neutras.append(
                posicao
            )


    return {

        "posicoesAnalisadas":
            len(
                calibracoes
            ),

        "posicoesAplicaveisTesteAB":
            len(
                aplicaveis
            ),

        "prioridadeAlta":
            prioridades_altas,

        "prioridadeMedia":
            prioridades_medias,

        "tendenciaReducaoProjecao":
            reducoes,

        "tendenciaAumentoProjecao":
            aumentos,

        "tendenciaNeutra":
            neutras,

        "modeloOficialAlterado":
            False,

        "proximoPasso":
            "backtest_ab"

    }


# ======================================================
# VALIDAÇÃO DOS FATORES
# ======================================================

def validar_calibracoes(
    calibracoes
):

    problemas = []


    for item in calibracoes:

        posicao = item.get(
            "posicao"
        )


        calibracao = item.get(
            "calibracaoCandidata",
            {}
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


        if not (
            FATOR_FINAL_MINIMO
            <= fator
            <= FATOR_FINAL_MAXIMO
        ):

            problemas.append(
                (
                    f"{posicao}: fator "
                    f"{fator} fora do limite."
                )
            )


        if abs(
            aditivo
        ) > LIMITE_CORRECAO_ADITIVA:

            problemas.append(
                (
                    f"{posicao}: correção "
                    f"{aditivo} fora do limite."
                )
            )


    return problemas


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    analise = carregar_json(
        ARQUIVO_ANALISE
    )


    auditoria = carregar_json(
        ARQUIVO_AUDITORIA
    )


    backtest = carregar_json(
        ARQUIVO_BACKTEST
    )


    if not analise:

        print(
            "[ERRO] Arquivo de análise histórica "
            "não encontrado."
        )

        raise SystemExit(
            1
        )


    if not auditoria:

        print(
            "[ERRO] Auditoria Top Real "
            "não encontrada."
        )

        print(
            "Execute auditar_top_real.py "
            "antes deste script."
        )

        raise SystemExit(
            1
        )


    calibracoes = []


    for posicao in POSICOES:

        dados_analise = (
            obter_dados_posicao_analise(
                analise,
                posicao
            )
        )


        dados_auditoria = (
            obter_dados_posicao_auditoria(
                auditoria,
                posicao
            )
        )


        calibracao = calibrar_posicao(

            posicao,

            dados_analise,

            dados_auditoria

        )


        calibracoes.append(
            calibracao
        )


    problemas = validar_calibracoes(
        calibracoes
    )


    if problemas:

        print(
            "[ERRO] Calibração candidata inválida."
        )


        for problema in problemas:

            print(
                "-",
                problema
            )


        raise SystemExit(
            1
        )


    resumo = gerar_resumo(
        calibracoes
    )


    resumo_backtest = resumir_backtest(
        backtest
    )


    resultado = {

        "modelo":
            "calibracao_posicoes_candidata_v1",

        "descricao":
            (
                "Parâmetros candidatos de calibração "
                "por posição para avaliação A/B"
            ),

        "status":
            "candidata_nao_promovida",

        "objetivo":
            (
                "Reduzir viés e erro por posição "
                "sem modificar o modelo oficial "
                "antes de validação histórica."
            ),

        "metodologia": {

            "amostraMinima":
                AMOSTRA_MINIMA,

            "amostraConfiavel":
                AMOSTRA_CONFIAVEL,

            "amostraForte":
                AMOSTRA_FORTE,

            "fatorFinalMinimo":
                FATOR_FINAL_MINIMO,

            "fatorFinalMaximo":
                FATOR_FINAL_MAXIMO,

            "correcaoAditivaMaxima":
                LIMITE_CORRECAO_ADITIVA,

            "formula":
                (
                    "projecao_calibrada = "
                    "(projecao_original * fator) "
                    "+ correcao_aditiva"
                ),

            "observacao":
                (
                    "A calibração usa somente uma fração "
                    "do viés observado e possui limites "
                    "de segurança contra sobreajuste."
                )

        },

        "backtestAtualReferencia":
            resumo_backtest,

        "resumo":
            resumo,

        "posicoes":
            calibracoes,

        "seguranca": {

            "alteraModeloOficial":
                False,

            "alteraPesosOficiais":
                False,

            "alteraEscalacoesOficiais":
                False,

            "necessitaBacktestAB":
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
    # LOG
    # ==================================================

    print(
        "===================================================="
    )

    print(
        "CALIBRAÇÃO CANDIDATA POR POSIÇÃO"
    )

    print(
        "===================================================="
    )


    print()


    for item in calibracoes:

        posicao = item.get(
            "posicao"
        )


        diagnostico = item.get(
            "diagnostico",
            {}
        )


        calibracao = item.get(
            "calibracaoCandidata",
            {}
        )


        print(
            f"{posicao}"
        )


        print(
            "  Amostras:",
            item.get(
                "amostra",
                {}
            ).get(
                "quantidade"
            )
        )


        print(
            "  Confiança:",
            item.get(
                "amostra",
                {}
            ).get(
                "nivelConfianca"
            )
        )


        print(
            "  MAE:",
            diagnostico.get(
                "mae"
            )
        )


        print(
            "  Viés:",
            diagnostico.get(
                "vies",
                {}
            ).get(
                "valor"
            )
        )


        print(
            "  Direção:",
            diagnostico.get(
                "vies",
                {}
            ).get(
                "direcao"
            )
        )


        print(
            "  Fator candidato:",
            calibracao.get(
                "fatorMultiplicativo"
            )
        )


        print(
            "  Correção aditiva:",
            calibracao.get(
                "correcaoAditiva"
            )
        )


        print(
            "  Prioridade:",
            item.get(
                "prioridade"
            )
        )


        print(
            "  Testar A/B:",
            item.get(
                "aplicarNoTesteAB"
            )
        )


        print()


    print(
        "===== RESUMO ====="
    )


    print(
        "Posições analisadas:",
        resumo.get(
            "posicoesAnalisadas"
        )
    )


    print(
        "Posições no A/B:",
        resumo.get(
            "posicoesAplicaveisTesteAB"
        )
    )


    print(
        "Prioridade alta:",
        resumo.get(
            "prioridadeAlta"
        )
    )


    print(
        "Prioridade média:",
        resumo.get(
            "prioridadeMedia"
        )
    )


    print(
        "Tendência de redução:",
        resumo.get(
            "tendenciaReducaoProjecao"
        )
    )


    print(
        "Tendência de aumento:",
        resumo.get(
            "tendenciaAumentoProjecao"
        )
    )


    print()


    print(
        "Modelo oficial alterado: NÃO"
    )


    print(
        "Próximo passo: BACKTEST A/B"
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
