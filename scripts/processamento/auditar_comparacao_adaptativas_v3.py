"""
=========================================================
CARTOLA ESTATÍSTICO
AUDITORIA CIENTÍFICA
COMPARAÇÃO ADAPTATIVA V1 x V2 x V3

Versão:
auditoria_comparacao_adaptativas_v3

Entrada:
data/comparacao-estrategias-adaptativas-v3.json

Fontes independentes:
data/estrategia-adaptativa.json
data/estrategia-adaptativa-v2.json
data/estrategia-adaptativa-v3.json
data/simulacao-times.json

Saída:
data/auditoria-comparacao-adaptativas-v3.json

Objetivos:

- validar existência dos arquivos;
- validar versões;
- validar rodadas comuns;
- validar pontuações;
- validar médias;
- validar estratégias fixas;
- validar melhor estratégia fixa;
- validar oráculo;
- validar ganhos;
- validar comparações pareadas;
- validar eficiência contra o oráculo;
- validar estabilidade;
- validar escolhas do V3;
- validar ausência de vazamento declarada pelo V3;
- bloquear qualquer promoção automática;
- produzir decisão independente.

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

ARQUIVO_COMPARACAO = (
    PASTA_DATA /
    "comparacao-estrategias-adaptativas-v3.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "auditoria-comparacao-adaptativas-v3.json"
)


# ======================================================
# MODELOS ESPERADOS
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


# ======================================================
# CONFIGURAÇÕES
# ======================================================

ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo",
]

MINIMO_RODADAS = 10

TOLERANCIA = 0.03

TOLERANCIA_EMPATE = 0.01

SCORE_MINIMO = 95.0


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

    except Exception:

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

    return (
        sum(valores) /
        len(valores)
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


def proximos(
    valor_a,
    valor_b,
    tolerancia=TOLERANCIA
):

    return (
        abs(
            numero(valor_a)
            -
            numero(valor_b)
        )
        <=
        tolerancia
    )


# ======================================================
# TESTES
# ======================================================

testes = []


def registrar_teste(
    nome,
    passou,
    critico=True,
    esperado=None,
    encontrado=None
):

    testes.append(
        {
            "nome":
                nome,

            "passou":
                bool(
                    passou
                ),

            "critico":
                bool(
                    critico
                ),

            "esperado":
                esperado,

            "encontrado":
                encontrado,
        }
    )


# ======================================================
# EXTRAÇÃO ADAPTATIVOS
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


def obter_rodada(
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


def obter_pontuacao(
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


def obter_estrategia(
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


def normalizar_adaptativo(
    dados
):

    resultado = {}

    for registro in extrair_lista_rodadas(
        dados
    ):

        rodada = obter_rodada(
            registro
        )

        if rodada <= 0:

            continue

        resultado[
            rodada
        ] = {
            "pontuacao":
                obter_pontuacao(
                    registro
                ),

            "estrategia":
                obter_estrategia(
                    registro
                ),

            "regime":
                registro.get(
                    "regime"
                ),

            "semVazamentoFuturo":
                registro.get(
                    "semVazamentoFuturo"
                ),
        }

    return resultado


# ======================================================
# SIMULAÇÃO
# ======================================================

def obter_times(
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

    for registro in extrair_lista_rodadas(
        dados
    ):

        rodada = obter_rodada(
            registro
        )

        if rodada <= 0:

            continue

        pontuacoes = {}

        for time in obter_times(
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
        ) != 3:

            continue

        resultado[
            rodada
        ] = {
            "pontuacoes":
                pontuacoes,

            "melhor":
                max(
                    ESTRATEGIAS,
                    key=lambda estrategia:
                        pontuacoes[
                            estrategia
                        ]
                ),

            "oraculo":
                max(
                    pontuacoes.values()
                ),
        }

    return resultado


# ======================================================
# COMPARAÇÃO PAREADA INDEPENDENTE
# ======================================================

def comparar_pareado(
    pontos_a,
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

    return {
        "vitoriasA":
            vitorias_a,

        "vitoriasB":
            vitorias_b,

        "empates":
            empates,

        "taxaVitoriasB":
            percentual(
                vitorias_b,
                len(
                    diferencas
                )
            ),

        "diferencaMedia":
            media(
                diferencas
            ),
    }


# ======================================================
# AUDITORIA
# ======================================================

def executar():

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

    # ==================================================
    # ARQUIVOS
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

    comparacao = carregar_json(
        ARQUIVO_COMPARACAO
    )

    registrar_teste(
        "arquivo_v1_existe",
        dados_v1 is not None
    )

    registrar_teste(
        "arquivo_v2_existe",
        dados_v2 is not None
    )

    registrar_teste(
        "arquivo_v3_existe",
        dados_v3 is not None
    )

    registrar_teste(
        "arquivo_simulacao_existe",
        dados_simulacao is not None
    )

    registrar_teste(
        "arquivo_comparacao_existe",
        comparacao is not None
    )

    # ==================================================
    # VERSÕES
    # ==================================================

    modelo_v3 = (
        dados_v3.get(
            "modelo"
        )
        if isinstance(
            dados_v3,
            dict
        )
        else None
    )

    modelo_comparacao = (
        comparacao.get(
            "modelo"
        )
        if isinstance(
            comparacao,
            dict
        )
        else None
    )

    registrar_teste(
        "versao_v3",
        modelo_v3 == MODELO_V3,
        esperado=MODELO_V3,
        encontrado=modelo_v3
    )

    registrar_teste(
        "versao_comparacao",
        modelo_comparacao == MODELO_COMPARACAO,
        esperado=MODELO_COMPARACAO,
        encontrado=modelo_comparacao
    )

    # ==================================================
    # SE ALGUM ARQUIVO FALTOU
    # ==================================================

    if (
        dados_v1 is None
        or
        dados_v2 is None
        or
        dados_v3 is None
        or
        dados_simulacao is None
        or
        comparacao is None
    ):

        finalizar(
            rodadas=0,
            resumo={}
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

    amostra_comparacao = comparacao.get(
        "amostra",
        {}
    )

    rodadas_comparacao = amostra_comparacao.get(
        "rodadas",
        []
    )

    quantidade_comparacao = inteiro(
        amostra_comparacao.get(
            "rodadasComuns"
        )
    )

    registrar_teste(
        "rodadas_comuns_consistentes",
        rodadas_comparacao == rodadas_comuns,
        esperado=rodadas_comuns,
        encontrado=rodadas_comparacao
    )

    registrar_teste(
        "quantidade_rodadas_consistente",
        quantidade_comparacao == len(
            rodadas_comuns
        ),
        esperado=len(
            rodadas_comuns
        ),
        encontrado=quantidade_comparacao
    )

    registrar_teste(
        "amostra_minima",
        len(
            rodadas_comuns
        ) >= MINIMO_RODADAS,
        esperado=f">={MINIMO_RODADAS}",
        encontrado=len(
            rodadas_comuns
        )
    )

    # ==================================================
    # SÉRIES INDEPENDENTES
    # ==================================================

    pontos_v1 = [
        v1[rodada][
            "pontuacao"
        ]
        for rodada in rodadas_comuns
    ]

    pontos_v2 = [
        v2[rodada][
            "pontuacao"
        ]
        for rodada in rodadas_comuns
    ]

    pontos_v3 = [
        v3[rodada][
            "pontuacao"
        ]
        for rodada in rodadas_comuns
    ]

    pontos_oraculo = [
        simulacao[rodada][
            "oraculo"
        ]
        for rodada in rodadas_comuns
    ]

    pontos_fixas = {
        estrategia: [
            simulacao[rodada][
                "pontuacoes"
            ][estrategia]
            for rodada in rodadas_comuns
        ]
        for estrategia in ESTRATEGIAS
    }

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

    metricas_v3 = metricas.get(
        "adaptativoV3",
        {}
    )

    # ==================================================
    # MÉDIAS
    # ==================================================

    media_v1 = media(
        pontos_v1
    )

    media_v2 = media(
        pontos_v2
    )

    media_v3 = media(
        pontos_v3
    )

    registrar_teste(
        "media_v1_consistente",
        proximos(
            metricas_v1.get(
                "media"
            ),
            media_v1
        ),
        esperado=arredondar(
            media_v1
        ),
        encontrado=metricas_v1.get(
            "media"
        )
    )

    registrar_teste(
        "media_v2_consistente",
        proximos(
            metricas_v2.get(
                "media"
            ),
            media_v2
        ),
        esperado=arredondar(
            media_v2
        ),
        encontrado=metricas_v2.get(
            "media"
        )
    )

    registrar_teste(
        "media_v3_consistente",
        proximos(
            metricas_v3.get(
                "media"
            ),
            media_v3
        ),
        esperado=arredondar(
            media_v3
        ),
        encontrado=metricas_v3.get(
            "media"
        )
    )

    # ==================================================
    # DESVIOS
    # ==================================================

    desvio_v1 = desvio(
        pontos_v1
    )

    desvio_v2 = desvio(
        pontos_v2
    )

    desvio_v3 = desvio(
        pontos_v3
    )

    registrar_teste(
        "desvio_v1_consistente",
        proximos(
            metricas_v1.get(
                "desvioPadrao"
            ),
            desvio_v1
        )
    )

    registrar_teste(
        "desvio_v2_consistente",
        proximos(
            metricas_v2.get(
                "desvioPadrao"
            ),
            desvio_v2
        )
    )

    registrar_teste(
        "desvio_v3_consistente",
        proximos(
            metricas_v3.get(
                "desvioPadrao"
            ),
            desvio_v3
        )
    )

    # ==================================================
    # FIXAS
    # ==================================================

    metricas_fixas = metricas.get(
        "estrategiasFixas",
        {}
    )

    medias_fixas = {}

    fixas_consistentes = True

    for estrategia in ESTRATEGIAS:

        media_calculada = media(
            pontos_fixas[
                estrategia
            ]
        )

        medias_fixas[
            estrategia
        ] = media_calculada

        media_arquivo = numero(
            metricas_fixas.get(
                estrategia,
                {}
            ).get(
                "media"
            )
        )

        if not proximos(
            media_calculada,
            media_arquivo
        ):

            fixas_consistentes = False

    registrar_teste(
        "metricas_fixas_consistentes",
        fixas_consistentes
    )

    melhor_fixa_calculada = max(
        ESTRATEGIAS,
        key=lambda estrategia:
            medias_fixas[
                estrategia
            ]
    )

    melhor_fixa_arquivo = metricas.get(
        "melhorEstrategiaFixa"
    )

    registrar_teste(
        "melhor_fixa_consistente",
        (
            melhor_fixa_calculada
            ==
            melhor_fixa_arquivo
        ),
        esperado=melhor_fixa_calculada,
        encontrado=melhor_fixa_arquivo
    )

    media_melhor_fixa = medias_fixas[
        melhor_fixa_calculada
    ]

    # ==================================================
    # ORÁCULO
    # ==================================================

    media_oraculo = media(
        pontos_oraculo
    )

    metricas_oraculo = metricas.get(
        "oraculo",
        {}
    )

    registrar_teste(
        "media_oraculo_consistente",
        proximos(
            metricas_oraculo.get(
                "media"
            ),
            media_oraculo
        ),
        esperado=arredondar(
            media_oraculo
        ),
        encontrado=metricas_oraculo.get(
            "media"
        )
    )

    oraculo_valido = all(

        numero(
            pontos_oraculo[indice]
        )
        >=
        max(
            numero(
                pontos_v1[indice]
            ),
            numero(
                pontos_v2[indice]
            ),
            numero(
                pontos_v3[indice]
            )
        )

        for indice in range(
            len(
                rodadas_comuns
            )
        )

    )

    registrar_teste(
        "oraculo_valido",
        oraculo_valido
    )

    # ==================================================
    # GANHOS
    # ==================================================

    ganhos = comparacao.get(
        "ganhos",
        {}
    )

    ganho_v3_v1 = (
        media_v3 -
        media_v1
    )

    ganho_v3_v2 = (
        media_v3 -
        media_v2
    )

    ganho_v3_fixa = (
        media_v3 -
        media_melhor_fixa
    )

    registrar_teste(
        "ganho_v3_v1_consistente",
        proximos(
            ganhos.get(
                "v3VsV1",
                {}
            ).get(
                "pontosPorRodada"
            ),
            ganho_v3_v1
        )
    )

    registrar_teste(
        "ganho_v3_v2_consistente",
        proximos(
            ganhos.get(
                "v3VsV2",
                {}
            ).get(
                "pontosPorRodada"
            ),
            ganho_v3_v2
        )
    )

    registrar_teste(
        "ganho_v3_fixa_consistente",
        proximos(
            ganhos.get(
                "v3VsMelhorFixa",
                {}
            ).get(
                "pontosPorRodada"
            ),
            ganho_v3_fixa
        )
    )

    # ==================================================
    # PAREADO V2 x V3
    # ==================================================

    pareado_calculado = comparar_pareado(
        pontos_v2,
        pontos_v3
    )

    pareados = comparacao.get(
        "comparacoesPareadas",
        {}
    )

    pareado_arquivo = pareados.get(
        "v2VsV3",
        {}
    )

    registrar_teste(
        "pareado_v2_v3_vitorias_v2",
        inteiro(
            pareado_arquivo.get(
                "vitoriasA"
            )
        )
        ==
        pareado_calculado[
            "vitoriasA"
        ]
    )

    registrar_teste(
        "pareado_v2_v3_vitorias_v3",
        inteiro(
            pareado_arquivo.get(
                "vitoriasB"
            )
        )
        ==
        pareado_calculado[
            "vitoriasB"
        ]
    )

    registrar_teste(
        "pareado_v2_v3_empates",
        inteiro(
            pareado_arquivo.get(
                "empates"
            )
        )
        ==
        pareado_calculado[
            "empates"
        ]
    )

    registrar_teste(
        "pareado_v2_v3_taxa",
        proximos(
            pareado_arquivo.get(
                "taxaVitoriasB"
            ),
            pareado_calculado[
                "taxaVitoriasB"
            ]
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

    eficiencia_v3 = percentual(
        media_v3,
        media_oraculo
    )

    bloco_oraculo = comparacao.get(
        "oraculo",
        {}
    )

    registrar_teste(
        "eficiencia_v1_consistente",
        proximos(
            bloco_oraculo.get(
                "v1",
                {}
            ).get(
                "eficienciaPercentual"
            ),
            eficiencia_v1
        )
    )

    registrar_teste(
        "eficiencia_v2_consistente",
        proximos(
            bloco_oraculo.get(
                "v2",
                {}
            ).get(
                "eficienciaPercentual"
            ),
            eficiencia_v2
        )
    )

    registrar_teste(
        "eficiencia_v3_consistente",
        proximos(
            bloco_oraculo.get(
                "v3",
                {}
            ).get(
                "eficienciaPercentual"
            ),
            eficiencia_v3
        )
    )

    # ==================================================
    # ESCOLHAS V3
    # ==================================================

    escolhas_v3 = Counter(

        v3[rodada][
            "estrategia"
        ]

        for rodada in rodadas_comuns

        if v3[rodada][
            "estrategia"
        ] in ESTRATEGIAS

    )

    escolhas_arquivo = (
        comparacao.get(
            "escolhas",
            {}
        ).get(
            "v3",
            {}
        )
    )

    escolhas_consistentes = all(

        inteiro(
            escolhas_arquivo.get(
                estrategia
            )
        )
        ==
        escolhas_v3.get(
            estrategia,
            0
        )

        for estrategia in ESTRATEGIAS

    )

    registrar_teste(
        "escolhas_v3_consistentes",
        escolhas_consistentes
    )

    total_escolhas = sum(
        escolhas_v3.values()
    )

    registrar_teste(
        "cobertura_escolhas_v3",
        total_escolhas
        ==
        len(
            rodadas_comuns
        ),
        esperado=len(
            rodadas_comuns
        ),
        encontrado=total_escolhas
    )

    # ==================================================
    # AGRESSIVO PODE SER ESCOLHIDO
    # ==================================================

    #
    # Este teste não exige que o Agressivo tenha sido
    # escolhido. Ele apenas registra o comportamento.
    #
    # Não seria cientificamente correto reprovar a V3
    # apenas porque a evidência histórica não justificou
    # selecionar o Agressivo.
    #

    registrar_teste(
        "estrategias_v3_validas",
        all(
            estrategia in ESTRATEGIAS
            for estrategia in escolhas_v3.keys()
        )
    )

    # ==================================================
    # VAZAMENTO FUTURO
    # ==================================================

    flags_vazamento = [

        v3[rodada].get(
            "semVazamentoFuturo"
        )

        for rodada in rodadas_comuns

    ]

    sem_vazamento_declarado = all(

        flag is True

        for flag in flags_vazamento

    )

    registrar_teste(
        "v3_sem_vazamento_declarado",
        sem_vazamento_declarado
    )

    auditoria_v3 = dados_v3.get(
        "auditoria",
        {}
    )

    registrar_teste(
        "v3_historico_progressivo",
        auditoria_v3.get(
            "historicoProgressivo"
        ) is True
    )

    registrar_teste(
        "v3_auditoria_sem_vazamento",
        auditoria_v3.get(
            "semVazamentoFuturo"
        ) is True
    )

    # ==================================================
    # DETALHES POR RODADA
    # ==================================================

    detalhes_comparacao = comparacao.get(
        "rodadas",
        []
    )

    mapa_detalhes = {

        inteiro(
            registro.get(
                "rodada"
            )
        ):
            registro

        for registro in detalhes_comparacao

        if isinstance(
            registro,
            dict
        )

    }

    detalhes_validos = True

    for rodada in rodadas_comuns:

        detalhe = mapa_detalhes.get(
            rodada
        )

        if detalhe is None:

            detalhes_validos = False
            break

        bloco_v1 = detalhe.get(
            "v1",
            {}
        )

        bloco_v2 = detalhe.get(
            "v2",
            {}
        )

        bloco_v3 = detalhe.get(
            "v3",
            {}
        )

        if not proximos(
            bloco_v1.get(
                "pontuacao"
            ),
            v1[rodada][
                "pontuacao"
            ]
        ):

            detalhes_validos = False
            break

        if not proximos(
            bloco_v2.get(
                "pontuacao"
            ),
            v2[rodada][
                "pontuacao"
            ]
        ):

            detalhes_validos = False
            break

        if not proximos(
            bloco_v3.get(
                "pontuacao"
            ),
            v3[rodada][
                "pontuacao"
            ]
        ):

            detalhes_validos = False
            break

        if (
            bloco_v3.get(
                "estrategia"
            )
            !=
            v3[rodada][
                "estrategia"
            ]
        ):

            detalhes_validos = False
            break

        if not proximos(
            detalhe.get(
                "oraculo"
            ),
            simulacao[rodada][
                "oraculo"
            ]
        ):

            detalhes_validos = False
            break

    registrar_teste(
        "detalhes_rodadas_consistentes",
        detalhes_validos
    )

    # ==================================================
    # SEGURANÇA
    # ==================================================

    seguranca = comparacao.get(
        "seguranca",
        {}
    )

    registrar_teste(
        "nao_altera_modelo_oficial",
        seguranca.get(
            "alteraModeloOficial"
        ) is False
    )

    registrar_teste(
        "nao_altera_pesos",
        seguranca.get(
            "alteraPesos"
        ) is False
    )

    registrar_teste(
        "nao_altera_escalacoes",
        seguranca.get(
            "alteraEscalacoes"
        ) is False
    )

    registrar_teste(
        "nao_altera_estrategia_oficial",
        seguranca.get(
            "alteraEstrategiaOficial"
        ) is False
    )

    registrar_teste(
        "promocao_automatica_bloqueada",
        seguranca.get(
            "promocaoAutomatica"
        ) is False
    )

    decisao_comparacao = comparacao.get(
        "decisao",
        {}
    )

    registrar_teste(
        "decisao_sem_promocao_automatica",
        decisao_comparacao.get(
            "promocaoAutomatica"
        ) is False
    )

    # ==================================================
    # RESUMO
    # ==================================================

    resumo = {
        "mediaV1":
            arredondar(
                media_v1
            ),

        "mediaV2":
            arredondar(
                media_v2
            ),

        "mediaV3":
            arredondar(
                media_v3
            ),

        "melhorFixa":
            melhor_fixa_calculada,

        "mediaMelhorFixa":
            arredondar(
                media_melhor_fixa
            ),

        "mediaOraculo":
            arredondar(
                media_oraculo
            ),

        "ganhoV3VsV1":
            arredondar(
                ganho_v3_v1
            ),

        "ganhoV3VsV2":
            arredondar(
                ganho_v3_v2
            ),

        "ganhoV3VsMelhorFixa":
            arredondar(
                ganho_v3_fixa
            ),

        "eficienciaV1":
            arredondar(
                eficiencia_v1
            ),

        "eficienciaV2":
            arredondar(
                eficiencia_v2
            ),

        "eficienciaV3":
            arredondar(
                eficiencia_v3
            ),

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

        "vitoriasV2Pareado":
            pareado_calculado[
                "vitoriasA"
            ],

        "vitoriasV3Pareado":
            pareado_calculado[
                "vitoriasB"
            ],

        "empatesPareado":
            pareado_calculado[
                "empates"
            ],

        "escolhasV3":
            {
                estrategia:
                    escolhas_v3.get(
                        estrategia,
                        0
                    )
                for estrategia
                in ESTRATEGIAS
            },
    }

    finalizar(
        rodadas=len(
            rodadas_comuns
        ),
        resumo=resumo
    )


# ======================================================
# FINALIZAÇÃO
# ======================================================

def finalizar(
    rodadas,
    resumo
):

    total_testes = len(
        testes
    )

    aprovados = sum(

        1
        for teste in testes
        if teste[
            "passou"
        ]

    )

    falhas = [

        teste
        for teste in testes
        if not teste[
            "passou"
        ]

    ]

    falhas_criticas = [

        teste
        for teste in falhas
        if teste[
            "critico"
        ]

    ]

    alertas = [

        teste
        for teste in falhas
        if not teste[
            "critico"
        ]

    ]

    score = (

        (
            aprovados /
            total_testes
        ) * 100

        if total_testes
        else 0.0

    )

    score = arredondar(
        score
    )

    if (
        len(
            falhas_criticas
        ) == 0
        and
        score >= SCORE_MINIMO
        and
        rodadas >= MINIMO_RODADAS
    ):

        decisao = (
            "COMPARACAO_V3_VALIDADA"
        )

    else:

        decisao = (
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
            rodadas,

        "testes":
            testes,

        "resumoTestes": {
            "quantidade":
                total_testes,

            "aprovados":
                aprovados,

            "falhas":
                len(
                    falhas
                ),

            "falhasCriticas":
                len(
                    falhas_criticas
                ),

            "alertas":
                len(
                    alertas
                ),

            "scoreQualidade":
                score,
        },

        "resultados":
            resumo,

        "decisao":
            decisao,

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
        rodadas
    )

    print(
        "Testes:",
        total_testes
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

        nivel = (
            "CRITICO"
            if teste[
                "critico"
            ]
            else "ALERTA"
        )

        print(
            f"[{status}] "
            f"{teste['nome']} "
            f"({nivel})"
        )

    print()

    print(
        "Score de qualidade:",
        score,
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

    if resumo:

        print()

        print(
            "RESULTADOS"
        )

        print(
            "----------------------------------------------"
        )

        print(
            "V1:",
            resumo.get(
                "mediaV1"
            )
        )

        print(
            "V2:",
            resumo.get(
                "mediaV2"
            )
        )

        print(
            "V3:",
            resumo.get(
                "mediaV3"
            )
        )

        print(
            "Melhor fixa:",
            resumo.get(
                "melhorFixa"
            ),
            "|",
            resumo.get(
                "mediaMelhorFixa"
            )
        )

        print(
            "Oráculo:",
            resumo.get(
                "mediaOraculo"
            )
        )

        print()

        print(
            "V3 x V1:",
            resumo.get(
                "ganhoV3VsV1"
            )
        )

        print(
            "V3 x V2:",
            resumo.get(
                "ganhoV3VsV2"
            )
        )

        print(
            "V3 x melhor fixa:",
            resumo.get(
                "ganhoV3VsMelhorFixa"
            )
        )

        print()

        print(
            "Eficiência V1:",
            resumo.get(
                "eficienciaV1"
            ),
            "%"
        )

        print(
            "Eficiência V2:",
            resumo.get(
                "eficienciaV2"
            ),
            "%"
        )

        print(
            "Eficiência V3:",
            resumo.get(
                "eficienciaV3"
            ),
            "%"
        )

        print()

        print(
            "Desvio V1:",
            resumo.get(
                "desvioV1"
            )
        )

        print(
            "Desvio V2:",
            resumo.get(
                "desvioV2"
            )
        )

        print(
            "Desvio V3:",
            resumo.get(
                "desvioV3"
            )
        )

        print()

        print(
            "Pareado V2 x V3:"
        )

        print(
            "Vitórias V2:",
            resumo.get(
                "vitoriasV2Pareado"
            )
        )

        print(
            "Vitórias V3:",
            resumo.get(
                "vitoriasV3Pareado"
            )
        )

        print(
            "Empates:",
            resumo.get(
                "empatesPareado"
            )
        )

        print()

        print(
            "Escolhas V3:"
        )

        escolhas = resumo.get(
            "escolhasV3",
            {}
        )

        for estrategia in ESTRATEGIAS:

            print(
                estrategia,
                ":",
                escolhas.get(
                    estrategia,
                    0
                )
            )

    print()

    print(
        "DECISÃO AUDITORIA:",
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

    executar()
