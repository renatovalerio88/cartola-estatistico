"""
======================================================
CARTOLA ESTATÍSTICO
ESTRATÉGIA ADAPTATIVA V3
======================================================

Objetivo
------------------------------------------------------
Testar uma terceira versão da estratégia adaptativa,
mantendo V1 e V2 intactas como benchmarks.

A V3 utiliza exclusivamente informações disponíveis
ANTES da rodada que está sendo prevista.

Também possui validação defensiva da pontuação real
para impedir que mudanças de estrutura em
simulacao-times.json transformem silenciosamente
pontuações válidas em zero.
======================================================
"""

import json
import math
import statistics

from pathlib import Path
from collections import Counter


# ======================================================
# CAMINHOS
# ======================================================

RAIZ = Path(__file__).resolve().parents[2]

ARQUIVO_SIMULACAO = (
    RAIZ
    / "data"
    / "simulacao-times.json"
)

ARQUIVO_SAIDA = (
    RAIZ
    / "data"
    / "estrategia-adaptativa-v3.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================

VERSAO_MODELO = (
    "estrategia_adaptativa_v3"
)

ESTRATEGIAS = [
    "Conservador",
    "Equilibrado",
    "Agressivo",
]

MINIMO_HISTORICO_REGIME = 2

JANELA_RECENTE = 5

JANELA_REGIME = 8


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():
        return None

    with caminho.open(
        "r",
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )


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


def numero_ou_none(
    valor
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

    return None


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
        / len(valores)
    )


def mediana(
    valores
):

    valores = [
        numero(v)
        for v in valores
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
        numero(v)
        for v in valores
    ]

    if len(valores) < 2:
        return 0.0

    return statistics.pstdev(
        valores
    )


def arredondar(
    valor
):

    return round(
        numero(valor),
        2
    )


# ======================================================
# NORMALIZAÇÃO DA SIMULAÇÃO
# ======================================================

def extrair_rodadas(
    dados
):

    if not dados:
        return []

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

        if chave not in registro:
            continue

        try:

            return int(
                registro[chave]
            )

        except (
            TypeError,
            ValueError
        ):

            pass

    return 0


def obter_times(
    registro
):

    if not isinstance(
        registro,
        dict
    ):

        return []

    for chave in [
        "estrategias",
        "times",
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

            for nome, dados in valor.items():

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

                times.append(
                    copia
                )

            return times

    return []


def normalizar_nome_estrategia(
    valor
):

    if valor is None:
        return None

    texto = str(
        valor
    ).strip().lower()

    mapa = {
        "conservador": "Conservador",
        "equilibrado": "Equilibrado",
        "agressivo": "Agressivo",
    }

    return mapa.get(
        texto
    )


def obter_nome_estrategia(
    time
):

    if not isinstance(
        time,
        dict
    ):

        return None

    for chave in [
        "nome",
        "estrategia",
        "perfil",
        "tipo",
        "id",
    ]:

        estrategia = (
            normalizar_nome_estrategia(
                time.get(
                    chave
                )
            )
        )

        if estrategia in ESTRATEGIAS:
            return estrategia

    return None


# ======================================================
# PONTUAÇÃO REAL
# ======================================================

def obter_pontos_diretos(
    time
):

    """
    Primeira fonte:
    total já calculado pelo simulador.

    A estrutura histórica oficial utiliza principalmente:

        pontos

    Mantemos aliases para compatibilidade.
    """

    for chave in [
        "pontuacaoComCapitao",
        "pontosComCapitao",
        "pontuacaoRealComCapitao",
        "pontuacaoFinal",
        "pontos",
        "pontuacao",
        "pontuacaoReal",
        "pontuacao_real",
        "pontosReais",
        "pontos_reais",
        "totalReal",
        "total_real",
        "pontosTotal",
        "pontuacaoTotal",
    ]:

        if chave not in time:
            continue

        valor = numero_ou_none(
            time.get(
                chave
            )
        )

        if valor is not None:

            return valor

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

        valor = obter_pontos_diretos(
            container
        )

        if valor is not None:

            return valor

    return None


def obter_pontos_sem_capitao(
    time
):

    for chave in [
        "pontosSemCapitao",
        "pontos_sem_capitao",
        "pontuacaoSemCapitao",
        "pontuacao_sem_capitao",
    ]:

        if chave not in time:
            continue

        valor = numero_ou_none(
            time.get(
                chave
            )
        )

        if valor is not None:

            return valor

    return None


def obter_bonus_capitao(
    time
):

    for chave in [
        "bonusCapitao",
        "bonus_capitao",
        "bônusCapitao",
        "bonusDoCapitao",
    ]:

        if chave not in time:
            continue

        valor = numero_ou_none(
            time.get(
                chave
            )
        )

        if valor is not None:

            return valor

    return None


def obter_pontos_jogador(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return None

    for chave in [
        "pontos",
        "pontuacao",
        "pontuacaoReal",
        "pontuacao_real",
        "pontosReais",
        "pontos_reais",
    ]:

        if chave not in jogador:
            continue

        valor = numero_ou_none(
            jogador.get(
                chave
            )
        )

        if valor is not None:

            return valor

    return None


def calcular_pontos_pelos_jogadores(
    time
):

    jogadores = time.get(
        "jogadores"
    )

    if not isinstance(
        jogadores,
        list
    ):

        return None

    if not jogadores:
        return None

    total = 0.0

    encontrados = 0

    pontos_capitao = None

    for jogador in jogadores:

        pontos = obter_pontos_jogador(
            jogador
        )

        if pontos is None:
            continue

        total += pontos

        encontrados += 1

        if jogador.get(
            "capitao"
        ) is True:

            pontos_capitao = pontos

    if encontrados == 0:
        return None

    bonus = obter_bonus_capitao(
        time
    )

    if bonus is not None:

        total += bonus

    elif pontos_capitao is not None:

        # No Cartola o capitão recebe novamente
        # sua pontuação como bônus.
        total += pontos_capitao

    return total


def obter_pontuacao_real(
    time
):

    """
    Recuperação defensiva da pontuação.

    Ordem:

    1. total direto;
    2. pontosSemCapitao + bonusCapitao;
    3. soma dos jogadores + bônus do capitão.

    Se o total direto vier 0, mas uma reconstrução
    alternativa produzir valor diferente de zero,
    usamos a reconstrução.

    Isso evita a regressão observada em que todas
    as estratégias passaram a valer 0.0.
    """

    if not isinstance(
        time,
        dict
    ):

        return 0.0

    direto = obter_pontos_diretos(
        time
    )

    sem_capitao = (
        obter_pontos_sem_capitao(
            time
        )
    )

    bonus = obter_bonus_capitao(
        time
    )

    reconstruido_resumo = None

    if sem_capitao is not None:

        reconstruido_resumo = (
            sem_capitao
            +
            (
                bonus
                if bonus is not None
                else 0.0
            )
        )

    reconstruido_jogadores = (
        calcular_pontos_pelos_jogadores(
            time
        )
    )

    candidatos = [
        direto,
        reconstruido_resumo,
        reconstruido_jogadores,
    ]

    candidatos_validos = [
        valor
        for valor in candidatos
        if valor is not None
    ]

    if not candidatos_validos:
        return None

    # Se o valor direto existe e é diferente
    # de zero, ele continua sendo a fonte principal.

    if (
        direto is not None
        and
        abs(direto) > 0.000001
    ):

        return direto

    # Se o direto veio zerado, procuramos
    # evidência de pontuação real nas fontes
    # auxiliares.

    for valor in [
        reconstruido_resumo,
        reconstruido_jogadores,
    ]:

        if (
            valor is not None
            and
            abs(valor) > 0.000001
        ):

            return valor

    # Zero legítimo.

    return numero(
        direto,
        0.0
    )


def normalizar_rodadas(
    dados
):

    resultado = []

    rodadas = extrair_rodadas(
        dados
    )

    for registro in rodadas:

        rodada = obter_numero_rodada(
            registro
        )

        if rodada <= 0:
            continue

        times = obter_times(
            registro
        )

        pontuacoes = {}

        fontes = {}

        for time in times:

            estrategia = (
                obter_nome_estrategia(
                    time
                )
            )

            if estrategia not in ESTRATEGIAS:
                continue

            pontos = obter_pontuacao_real(
                time
            )

            if pontos is None:

                print(
                    f"[ALERTA] Rodada {rodada:02d}"
                    f" | {estrategia}: "
                    f"pontuação real não encontrada."
                )

                continue

            pontuacoes[
                estrategia
            ] = pontos

            fontes[
                estrategia
            ] = {
                "direto": obter_pontos_diretos(
                    time
                ),
                "pontosSemCapitao": (
                    obter_pontos_sem_capitao(
                        time
                    )
                ),
                "bonusCapitao": (
                    obter_bonus_capitao(
                        time
                    )
                ),
                "reconstruidoJogadores": (
                    calcular_pontos_pelos_jogadores(
                        time
                    )
                ),
                "utilizado": pontos,
            }

        if (
            len(pontuacoes)
            != len(ESTRATEGIAS)
        ):

            continue

        resultado.append(
            {
                "rodada": rodada,
                "pontuacoes": pontuacoes,
                "fontesPontuacao": fontes,
            }
        )

    resultado.sort(
        key=lambda item:
        item["rodada"]
    )

    return resultado


# ======================================================
# VALIDAÇÃO DA BASE
# ======================================================

def validar_pontuacoes(
    rodadas
):

    if not rodadas:

        raise RuntimeError(
            "Nenhuma rodada válida encontrada."
        )

    quantidade_valores = 0

    quantidade_zeros = 0

    quantidade_nao_zero = 0

    soma_absoluta = 0.0

    for rodada in rodadas:

        for estrategia in ESTRATEGIAS:

            valor = numero(
                rodada[
                    "pontuacoes"
                ][
                    estrategia
                ]
            )

            quantidade_valores += 1

            soma_absoluta += abs(
                valor
            )

            if abs(valor) <= 0.000001:

                quantidade_zeros += 1

            else:

                quantidade_nao_zero += 1

    if quantidade_valores == 0:

        raise RuntimeError(
            "Nenhuma pontuação encontrada "
            "na simulação."
        )

    if quantidade_nao_zero == 0:

        raise RuntimeError(
            "ERRO DE INTEGRIDADE: todas as "
            "pontuações das estratégias estão "
            "zeradas. O backtest V3 foi "
            "interrompido para impedir uma "
            "comparação científica inválida."
        )

    percentual_zero = (
        quantidade_zeros
        /
        quantidade_valores
        *
        100
    )

    media_absoluta = (
        soma_absoluta
        /
        quantidade_valores
    )

    return {
        "quantidadeValores": (
            quantidade_valores
        ),
        "quantidadeZeros": (
            quantidade_zeros
        ),
        "quantidadeNaoZero": (
            quantidade_nao_zero
        ),
        "percentualZeros": (
            arredondar(
                percentual_zero
            )
        ),
        "mediaAbsoluta": (
            arredondar(
                media_absoluta
            )
        ),
        "baseValida": True,
    }


# ======================================================
# MELHOR ESTRATÉGIA DA RODADA
# ======================================================

def melhor_estrategia_rodada(
    rodada
):

    pontuacoes = rodada[
        "pontuacoes"
    ]

    return max(
        ESTRATEGIAS,
        key=lambda estrategia:
        pontuacoes.get(
            estrategia,
            float("-inf")
        )
    )


def maior_pontuacao_rodada(
    rodada
):

    return max(
        rodada[
            "pontuacoes"
        ].values()
    )


# ======================================================
# REGIME DA RODADA
# ======================================================

def media_geral_rodada(
    rodada
):

    return media(
        rodada[
            "pontuacoes"
        ].values()
    )


def classificar_regime(
    historico
):

    if len(historico) < 3:
        return None

    janela = historico[
        -JANELA_REGIME:
    ]

    medias_rodadas = [
        media_geral_rodada(
            rodada
        )
        for rodada in janela
    ]

    if not medias_rodadas:
        return None

    media_base = media(
        medias_rodadas
    )

    ultima_media = (
        medias_rodadas[-1]
    )

    if ultima_media >= (
        media_base
        * 1.12
    ):

        return "alto"

    if ultima_media <= (
        media_base
        * 0.88
    ):

        return "baixo"

    return "medio"


# ======================================================
# HISTÓRICO POR ESTRATÉGIA
# ======================================================

def historico_estrategia(
    historico,
    estrategia
):

    return [
        numero(
            rodada[
                "pontuacoes"
            ].get(
                estrategia
            )
        )
        for rodada in historico
    ]


def vitorias_estrategia(
    historico,
    estrategia
):

    quantidade = 0

    for rodada in historico:

        if (
            melhor_estrategia_rodada(
                rodada
            )
            ==
            estrategia
        ):

            quantidade += 1

    return quantidade


def taxa_vitorias(
    historico,
    estrategia
):

    if not historico:
        return 0.0

    return (
        vitorias_estrategia(
            historico,
            estrategia
        )
        /
        len(historico)
    )


# ======================================================
# TENDÊNCIA
# ======================================================

def calcular_tendencia(
    valores
):

    if len(valores) < 3:
        return 0.0

    janela = valores[
        -JANELA_RECENTE:
    ]

    metade = max(
        1,
        len(janela) // 2
    )

    inicio = janela[
        :metade
    ]

    fim = janela[
        metade:
    ]

    if not fim:
        return 0.0

    return (
        media(fim)
        -
        media(inicio)
    )


# ======================================================
# DESEMPENHO POR REGIME
# ======================================================

def construir_historico_regimes(
    historico
):

    registros = []

    passado = []

    for rodada in historico:

        regime = classificar_regime(
            passado
        )

        registros.append(
            {
                "rodada": (
                    rodada["rodada"]
                ),
                "regime": regime,
                "pontuacoes": (
                    rodada[
                        "pontuacoes"
                    ]
                ),
            }
        )

        passado.append(
            rodada
        )

    return registros


def desempenho_no_regime(
    historico,
    regime,
    estrategia
):

    vazio = {
        "amostra": 0,
        "media": 0.0,
        "vitorias": 0,
        "taxaVitorias": 0.0,
    }

    if regime is None:
        return vazio

    registros = (
        construir_historico_regimes(
            historico
        )
    )

    filtrados = [
        registro
        for registro in registros
        if registro[
            "regime"
        ] == regime
    ]

    if not filtrados:
        return vazio

    pontos = [
        registro[
            "pontuacoes"
        ][
            estrategia
        ]
        for registro in filtrados
    ]

    vitorias = 0

    for registro in filtrados:

        melhor = max(
            ESTRATEGIAS,
            key=lambda e:
            registro[
                "pontuacoes"
            ][e]
        )

        if melhor == estrategia:
            vitorias += 1

    return {
        "amostra": len(
            filtrados
        ),
        "media": media(
            pontos
        ),
        "vitorias": vitorias,
        "taxaVitorias": (
            vitorias
            /
            len(filtrados)
        ),
    }


# ======================================================
# SCORE V3
# ======================================================

def calcular_score(
    historico,
    estrategia,
    regime
):

    valores = historico_estrategia(
        historico,
        estrategia
    )

    if not valores:

        return {
            "score": 0.0,
            "mediaHistorica": 0.0,
            "mediaRecente": 0.0,
            "mediana": 0.0,
            "desvio": 0.0,
            "taxaVitorias": 0.0,
            "tendencia": 0.0,
            "regime": regime,
            "mediaRegime": 0.0,
            "taxaVitoriasRegime": 0.0,
            "amostraRegime": 0,
        }

    media_historica = media(
        valores
    )

    recentes = valores[
        -JANELA_RECENTE:
    ]

    media_recente = media(
        recentes
    )

    mediana_historica = (
        mediana(
            valores
        )
    )

    volatilidade = desvio(
        valores
    )

    taxa = taxa_vitorias(
        historico,
        estrategia
    )

    tendencia = calcular_tendencia(
        valores
    )

    desempenho_regime = (
        desempenho_no_regime(
            historico,
            regime,
            estrategia
        )
    )

    media_regime = (
        desempenho_regime[
            "media"
        ]
    )

    taxa_regime = (
        desempenho_regime[
            "taxaVitorias"
        ]
    )

    amostra_regime = (
        desempenho_regime[
            "amostra"
        ]
    )

    score = 0.0

    score += (
        media_historica
        * 0.25
    )

    score += (
        media_recente
        * 0.30
    )

    score += (
        mediana_historica
        * 0.10
    )

    score += (
        taxa
        * 10.0
    )

    score += (
        tendencia
        * 0.25
    )

    score -= (
        volatilidade
        * 0.08
    )

    if (
        regime is not None
        and
        amostra_regime
        >=
        MINIMO_HISTORICO_REGIME
    ):

        score += (
            media_regime
            * 0.20
        )

        score += (
            taxa_regime
            * 8.0
        )

    if regime == "alto":

        if estrategia == "Agressivo":

            score += 1.50

        elif estrategia == "Equilibrado":

            score += 0.50

    elif regime == "baixo":

        if estrategia == "Conservador":

            score += 1.00

        elif estrategia == "Agressivo":

            score -= 0.50

    elif regime == "medio":

        if estrategia == "Equilibrado":

            score += 0.40

    return {
        "score": score,
        "mediaHistorica": (
            media_historica
        ),
        "mediaRecente": (
            media_recente
        ),
        "mediana": (
            mediana_historica
        ),
        "desvio": (
            volatilidade
        ),
        "taxaVitorias": taxa,
        "tendencia": tendencia,
        "regime": regime,
        "mediaRegime": (
            media_regime
        ),
        "taxaVitoriasRegime": (
            taxa_regime
        ),
        "amostraRegime": (
            amostra_regime
        ),
    }


# ======================================================
# ESCOLHA DA ESTRATÉGIA
# ======================================================

def escolher_estrategia(
    historico
):

    # Cold start seguro.

    if len(historico) < 3:

        return (
            "Equilibrado",
            None,
            {}
        )

    regime = classificar_regime(
        historico
    )

    scores = {}

    for estrategia in ESTRATEGIAS:

        scores[
            estrategia
        ] = calcular_score(
            historico,
            estrategia,
            regime
        )

    escolhida = max(
        ESTRATEGIAS,
        key=lambda estrategia:
        scores[
            estrategia
        ][
            "score"
        ]
    )

    return (
        escolhida,
        regime,
        scores
    )


# ======================================================
# BACKTEST PROGRESSIVO
# ======================================================

def executar_backtest(
    rodadas
):

    historico = []

    resultados = []

    for rodada in rodadas:

        numero_rodada = (
            rodada[
                "rodada"
            ]
        )

        (
            escolhida,
            regime,
            scores
        ) = escolher_estrategia(
            historico
        )

        pontuacao = numero(
            rodada[
                "pontuacoes"
            ].get(
                escolhida
            )
        )

        melhor = (
            melhor_estrategia_rodada(
                rodada
            )
        )

        teto = (
            maior_pontuacao_rodada(
                rodada
            )
        )

        acertou = (
            escolhida
            ==
            melhor
        )

        perda_oraculo = (
            teto
            -
            pontuacao
        )

        scores_resumidos = {}

        for (
            estrategia,
            dados
        ) in scores.items():

            scores_resumidos[
                estrategia
            ] = {
                "score": arredondar(
                    dados["score"]
                ),
                "mediaHistorica": arredondar(
                    dados[
                        "mediaHistorica"
                    ]
                ),
                "mediaRecente": arredondar(
                    dados[
                        "mediaRecente"
                    ]
                ),
                "mediana": arredondar(
                    dados[
                        "mediana"
                    ]
                ),
                "desvio": arredondar(
                    dados[
                        "desvio"
                    ]
                ),
                "taxaVitorias": arredondar(
                    dados[
                        "taxaVitorias"
                    ]
                    * 100
                ),
                "tendencia": arredondar(
                    dados[
                        "tendencia"
                    ]
                ),
                "mediaRegime": arredondar(
                    dados[
                        "mediaRegime"
                    ]
                ),
                "taxaVitoriasRegime": arredondar(
                    dados[
                        "taxaVitoriasRegime"
                    ]
                    * 100
                ),
                "amostraRegime": (
                    dados[
                        "amostraRegime"
                    ]
                ),
            }

        resultado = {
            "rodada": numero_rodada,
            "historicoDisponivel": (
                len(historico)
            ),
            "regime": regime,
            "estrategiaEscolhida": (
                escolhida
            ),
            "pontuacao": arredondar(
                pontuacao
            ),
            "melhorEstrategia": (
                melhor
            ),
            "pontuacaoOraculo": (
                arredondar(
                    teto
                )
            ),
            "perdaOraculo": (
                arredondar(
                    perda_oraculo
                )
            ),
            "acertouMelhorEstrategia": (
                acertou
            ),
            "semVazamentoFuturo": True,
            "pontuacoesEstrategias": {
                estrategia: arredondar(
                    rodada[
                        "pontuacoes"
                    ][
                        estrategia
                    ]
                )
                for estrategia
                in ESTRATEGIAS
            },
            "scores": (
                scores_resumidos
            ),
        }

        resultados.append(
            resultado
        )

        print(
            f"Rodada {numero_rodada:02d}"
            f" | histórico: {len(historico)}"
            f" | regime: {regime}"
            f" | escolha: {escolhida}"
            f" | pontos: {arredondar(pontuacao)}"
            f" | melhor: {melhor}"
            f" | teto: {arredondar(teto)}"
        )

        # A rodada entra no histórico somente
        # DEPOIS da decisão.

        historico.append(
            rodada
        )

    return resultados


# ======================================================
# MÉTRICAS
# ======================================================

def calcular_metricas(
    resultados,
    rodadas
):

    pontos_adaptativo = [
        r["pontuacao"]
        for r in resultados
    ]

    total_adaptativo = sum(
        pontos_adaptativo
    )

    media_adaptativo = media(
        pontos_adaptativo
    )

    mediana_adaptativo = (
        mediana(
            pontos_adaptativo
        )
    )

    desvio_adaptativo = (
        desvio(
            pontos_adaptativo
        )
    )

    acertos = sum(
        1
        for r in resultados
        if r[
            "acertouMelhorEstrategia"
        ]
    )

    taxa_acerto = (
        acertos
        /
        len(resultados)
        if resultados
        else 0.0
    )

    escolhas = Counter(
        r[
            "estrategiaEscolhida"
        ]
        for r in resultados
    )

    regimes = Counter(
        str(
            r["regime"]
        )
        for r in resultados
    )

    fixas = {}

    for estrategia in ESTRATEGIAS:

        valores = [
            numero(
                rodada[
                    "pontuacoes"
                ][
                    estrategia
                ]
            )
            for rodada in rodadas
        ]

        fixas[
            estrategia
        ] = {
            "media": arredondar(
                media(valores)
            ),
            "total": arredondar(
                sum(valores)
            ),
            "mediana": arredondar(
                mediana(valores)
            ),
            "desvio": arredondar(
                desvio(valores)
            ),
            "vitorias": sum(
                1
                for rodada
                in rodadas
                if (
                    melhor_estrategia_rodada(
                        rodada
                    )
                    ==
                    estrategia
                )
            ),
        }

    melhor_fixa = max(
        ESTRATEGIAS,
        key=lambda estrategia:
        fixas[
            estrategia
        ][
            "media"
        ]
    )

    media_melhor_fixa = (
        fixas[
            melhor_fixa
        ][
            "media"
        ]
    )

    ganho_melhor_fixa = (
        media_adaptativo
        -
        media_melhor_fixa
    )

    ganho_percentual = (
        ganho_melhor_fixa
        /
        media_melhor_fixa
        *
        100
        if media_melhor_fixa
        else 0.0
    )

    pontos_oraculo = [
        r[
            "pontuacaoOraculo"
        ]
        for r in resultados
    ]

    media_oraculo = media(
        pontos_oraculo
    )

    eficiencia_oraculo = (
        media_adaptativo
        /
        media_oraculo
        *
        100
        if media_oraculo
        else 0.0
    )

    return {
        "rodadas": len(
            resultados
        ),

        "adaptativoV3": {
            "media": arredondar(
                media_adaptativo
            ),
            "total": arredondar(
                total_adaptativo
            ),
            "mediana": arredondar(
                mediana_adaptativo
            ),
            "desvio": arredondar(
                desvio_adaptativo
            ),
            "acertos": acertos,
            "taxaAcerto": arredondar(
                taxa_acerto
                * 100
            ),
        },

        "estrategiasFixas": (
            fixas
        ),

        "melhorEstrategiaFixa": {
            "estrategia": (
                melhor_fixa
            ),
            "media": arredondar(
                media_melhor_fixa
            ),
        },

        "comparacaoMelhorFixa": {
            "ganhoPontosRodada": (
                arredondar(
                    ganho_melhor_fixa
                )
            ),
            "ganhoPercentual": (
                arredondar(
                    ganho_percentual
                )
            ),
        },

        "oraculo": {
            "media": arredondar(
                media_oraculo
            ),
            "eficienciaV3": (
                arredondar(
                    eficiencia_oraculo
                )
            ),
        },

        "escolhas": {
            estrategia:
            escolhas.get(
                estrategia,
                0
            )
            for estrategia
            in ESTRATEGIAS
        },

        "regimes": dict(
            regimes
        ),
    }


# ======================================================
# DECISÃO
# ======================================================

def definir_decisao(
    metricas
):

    adaptativo = (
        metricas[
            "adaptativoV3"
        ][
            "media"
        ]
    )

    melhor_fixa = (
        metricas[
            "melhorEstrategiaFixa"
        ][
            "media"
        ]
    )

    ganho = (
        adaptativo
        -
        melhor_fixa
    )

    if ganho > 0:

        return (
            "V3_SUPERA_MELHOR_FIXA_TESTE"
        )

    return (
        "MANTER_ESTRATEGIAS_FIXAS"
    )


# ======================================================
# MAIN
# ======================================================

def main():

    print(
        "=============================================="
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "ESTRATÉGIA ADAPTATIVA V3"
    )

    print(
        "=============================================="
    )

    dados = carregar_json(
        ARQUIVO_SIMULACAO
    )

    if dados is None:

        raise FileNotFoundError(
            f"Arquivo não encontrado: "
            f"{ARQUIVO_SIMULACAO}"
        )

    rodadas = normalizar_rodadas(
        dados
    )

    if not rodadas:

        raise RuntimeError(
            "Nenhuma rodada válida encontrada "
            "em simulacao-times.json."
        )

    validacao_base = (
        validar_pontuacoes(
            rodadas
        )
    )

    print(
        "VALIDAÇÃO DA BASE"
    )

    print(
        "----------------------------------------------"
    )

    print(
        "Rodadas válidas:",
        len(rodadas)
    )

    print(
        "Pontuações analisadas:",
        validacao_base[
            "quantidadeValores"
        ]
    )

    print(
        "Pontuações não zeradas:",
        validacao_base[
            "quantidadeNaoZero"
        ]
    )

    print(
        "Pontuações zeradas:",
        validacao_base[
            "quantidadeZeros"
        ]
    )

    print(
        "Percentual de zeros:",
        validacao_base[
            "percentualZeros"
        ],
        "%"
    )

    print(
        "Média absoluta:",
        validacao_base[
            "mediaAbsoluta"
        ]
    )

    print(
        "BASE: VALIDADA"
    )

    print(
        "=============================================="
    )

    resultados = executar_backtest(
        rodadas
    )

    metricas = calcular_metricas(
        resultados,
        rodadas
    )

    decisao = definir_decisao(
        metricas
    )

    saida = {
        "modelo": (
            VERSAO_MODELO
        ),
        "descricao": (
            "Estratégia adaptativa V3 com "
            "média histórica, desempenho recente, "
            "tendência, estabilidade e regime."
        ),
        "rodadas": (
            resultados
        ),
        "resumo": (
            metricas
        ),
        "decisao": (
            decisao
        ),
        "promocaoAutomatica": False,
        "validacaoBase": (
            validacao_base
        ),
        "auditoria": {
            "historicoProgressivo": True,
            "semVazamentoFuturo": True,
            "v1Preservada": True,
            "v2Preservada": True,
            "modeloExperimental": True,
            "pontuacoesValidadas": True,
            "bloqueiaBaseTotalmenteZerada": True,
        },
    }

    salvar_json(
        ARQUIVO_SAIDA,
        saida
    )

    resumo = (
        metricas[
            "adaptativoV3"
        ]
    )

    melhor_fixa = (
        metricas[
            "melhorEstrategiaFixa"
        ]
    )

    comparacao = (
        metricas[
            "comparacaoMelhorFixa"
        ]
    )

    oraculo = (
        metricas[
            "oraculo"
        ]
    )

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
        f"Rodadas: "
        f"{metricas['rodadas']}"
    )

    print(
        "ADAPTATIVO V3"
    )

    print(
        f"Média: "
        f"{resumo['media']}"
    )

    print(
        f"Total: "
        f"{resumo['total']}"
    )

    print(
        f"Mediana: "
        f"{resumo['mediana']}"
    )

    print(
        f"Desvio: "
        f"{resumo['desvio']}"
    )

    print(
        f"Taxa de acerto: "
        f"{resumo['taxaAcerto']} %"
    )

    print(
        "MELHOR FIXA:"
    )

    print(
        f"{melhor_fixa['estrategia']}"
        f" | Média: "
        f"{melhor_fixa['media']}"
    )

    print(
        "GANHO V3 VS MELHOR FIXA:"
    )

    print(
        f"{comparacao['ganhoPontosRodada']} "
        f"pontos/rodada"
    )

    print(
        f"{comparacao['ganhoPercentual']} %"
    )

    print(
        "ORÁCULO:"
    )

    print(
        f"Média: "
        f"{oraculo['media']}"
    )

    print(
        f"Eficiência V3: "
        f"{oraculo['eficienciaV3']} %"
    )

    print(
        "ESCOLHAS"
    )

    for estrategia in ESTRATEGIAS:

        print(
            estrategia,
            ":",
            metricas[
                "escolhas"
            ][
                estrategia
            ]
        )

    print(
        "REGIMES"
    )

    for (
        regime,
        quantidade
    ) in metricas[
        "regimes"
    ].items():

        print(
            regime,
            ":",
            quantidade
        )

    print(
        f"DECISÃO: "
        f"{decisao}"
    )

    print(
        "Promoção automática: NÃO"
    )

    print(
        f"Arquivo: "
        f"{ARQUIVO_SAIDA}"
    )

    print(
        "=============================================="
    )


if __name__ == "__main__":

    main()
