"""
======================================================
CARTOLA ESTATÍSTICO
ESTRATÉGIA ADAPTATIVA V3
======================================================

Objetivo
------------------------------------------------------
Testar uma terceira versão da estratégia adaptativa,
mantendo V1 e V2 intactas como benchmarks.

Princípios da V3:

1. Nunca utilizar dados da rodada que está sendo prevista
   para escolher a estratégia.

2. Trabalhar exclusivamente com histórico anterior.

3. Considerar:
   - média recente;
   - média histórica;
   - taxa de vitórias;
   - tendência;
   - estabilidade;
   - comportamento por regime;
   - desempenho recente por regime.

4. Permitir efetivamente a escolha da estratégia
   Agressivo quando houver evidência histórica.

5. Preservar cold start seguro.

6. Não promover automaticamente nenhum modelo.

======================================================
"""

import json
import math
import statistics
from pathlib import Path
from collections import Counter, defaultdict


# ======================================================
# CAMINHOS
# ======================================================

RAIZ = Path(__file__).resolve().parents[2]

ARQUIVO_SIMULACAO = RAIZ / "data" / "simulacao-times.json"

ARQUIVO_SAIDA = RAIZ / "data" / "estrategia-adaptativa-v3.json"


# ======================================================
# CONFIGURAÇÕES
# ======================================================

VERSAO_MODELO = "estrategia_adaptativa_v3"

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

        return json.load(arquivo)


def salvar_json(caminho, dados):

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


def numero(valor, padrao=0.0):

    try:

        valor = float(valor)

        if math.isfinite(valor):
            return valor

    except (TypeError, ValueError):
        pass

    return padrao


def media(valores):

    valores = [
        numero(v)
        for v in valores
    ]

    if not valores:
        return 0.0

    return sum(valores) / len(valores)


def mediana(valores):

    valores = [
        numero(v)
        for v in valores
    ]

    if not valores:
        return 0.0

    return statistics.median(valores)


def desvio(valores):

    valores = [
        numero(v)
        for v in valores
    ]

    if len(valores) < 2:
        return 0.0

    return statistics.pstdev(valores)


def arredondar(valor):

    return round(
        numero(valor),
        2
    )


# ======================================================
# NORMALIZAÇÃO DA SIMULAÇÃO
# ======================================================

def extrair_rodadas(dados):

    if not dados:
        return []

    if isinstance(dados, list):
        return dados

    if not isinstance(dados, dict):
        return []

    for chave in [
        "rodadas",
        "resultados",
        "simulacoes",
        "historico",
    ]:

        valor = dados.get(chave)

        if isinstance(valor, list):
            return valor

    return []


def obter_numero_rodada(registro):

    if not isinstance(registro, dict):
        return 0

    for chave in [
        "rodada",
        "numeroRodada",
        "numero_rodada",
    ]:

        if chave in registro:

            try:
                return int(registro[chave])

            except (TypeError, ValueError):
                pass

    return 0


def obter_times(registro):

    if not isinstance(registro, dict):
        return []

    for chave in [
        "times",
        "estrategias",
        "resultados",
        "escalacoes",
    ]:

        valor = registro.get(chave)

        if isinstance(valor, list):
            return valor

    return []


def obter_nome_estrategia(time):

    if not isinstance(time, dict):
        return None

    for chave in [
        "estrategia",
        "perfil",
        "nome",
        "tipo",
    ]:

        valor = time.get(chave)

        if valor in ESTRATEGIAS:
            return valor

    return None


def obter_pontuacao_real(time):

    if not isinstance(time, dict):
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
                time[chave]
            )

    return 0.0


def normalizar_rodadas(dados):

    resultado = []

    rodadas = extrair_rodadas(dados)

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

        for time in times:

            estrategia = obter_nome_estrategia(
                time
            )

            if estrategia not in ESTRATEGIAS:
                continue

            pontuacoes[estrategia] = (
                obter_pontuacao_real(
                    time
                )
            )

        if len(pontuacoes) != len(ESTRATEGIAS):
            continue

        resultado.append(
            {
                "rodada": rodada,
                "pontuacoes": pontuacoes,
            }
        )

    resultado.sort(
        key=lambda item: item["rodada"]
    )

    return resultado


# ======================================================
# MELHOR ESTRATÉGIA DA RODADA
# ======================================================

def melhor_estrategia_rodada(rodada):

    pontuacoes = rodada["pontuacoes"]

    return max(
        ESTRATEGIAS,
        key=lambda estrategia:
            pontuacoes.get(
                estrategia,
                float("-inf")
            )
    )


def maior_pontuacao_rodada(rodada):

    return max(
        rodada["pontuacoes"].values()
    )


# ======================================================
# REGIME DA RODADA
# ======================================================

def media_geral_rodada(rodada):

    return media(
        rodada["pontuacoes"].values()
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
        media_geral_rodada(r)
        for r in janela
    ]

    if not medias_rodadas:
        return None

    media_base = media(
        medias_rodadas
    )

    ultima_media = medias_rodadas[-1]

    if ultima_media >= (
        media_base * 1.12
    ):
        return "alto"

    if ultima_media <= (
        media_base * 0.88
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
            rodada["pontuacoes"].get(
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
            == estrategia
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
        / len(historico)
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
                "rodada": rodada["rodada"],
                "regime": regime,
                "pontuacoes": rodada["pontuacoes"],
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

    if regime is None:
        return {
            "amostra": 0,
            "media": 0.0,
            "vitorias": 0,
            "taxaVitorias": 0.0,
        }

    registros = (
        construir_historico_regimes(
            historico
        )
    )

    filtrados = [
        registro
        for registro in registros
        if registro["regime"] == regime
    ]

    if not filtrados:
        return {
            "amostra": 0,
            "media": 0.0,
            "vitorias": 0,
            "taxaVitorias": 0.0,
        }

    pontos = [
        registro["pontuacoes"][
            estrategia
        ]
        for registro in filtrados
    ]

    vitorias = 0

    for registro in filtrados:

        melhor = max(
            ESTRATEGIAS,
            key=lambda e:
                registro["pontuacoes"][e]
        )

        if melhor == estrategia:
            vitorias += 1

    return {
        "amostra": len(filtrados),
        "media": media(pontos),
        "vitorias": vitorias,
        "taxaVitorias": (
            vitorias
            / len(filtrados)
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

    mediana_historica = mediana(
        valores
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

    media_regime = desempenho_regime[
        "media"
    ]

    taxa_regime = desempenho_regime[
        "taxaVitorias"
    ]

    amostra_regime = desempenho_regime[
        "amostra"
    ]

    # ==================================================
    # SCORE BASE
    # ==================================================
    #
    # A V3 aumenta a importância de:
    #
    # - desempenho recente;
    # - tendência;
    # - desempenho específico no regime.
    #
    # Ao mesmo tempo reduz o excesso de preferência
    # automática pelo perfil Conservador.
    #
    # ==================================================

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

    # Penalização de volatilidade moderada.
    #
    # Não penalizamos demais o Agressivo porque
    # justamente queremos permitir que ele apareça
    # quando a recompensa histórica compensar o risco.

    score -= (
        volatilidade
        * 0.08
    )

    # ==================================================
    # COMPONENTE DE REGIME
    # ==================================================

    if (
        regime is not None
        and
        amostra_regime
        >= MINIMO_HISTORICO_REGIME
    ):

        score += (
            media_regime
            * 0.20
        )

        score += (
            taxa_regime
            * 8.0
        )

    # ==================================================
    # AJUSTES COMPORTAMENTAIS V3
    # ==================================================

    #
    # REGIME ALTO
    #
    # Quando o ambiente recente apresenta pontuações
    # elevadas, permitimos maior exposição ao teto.
    #

    if regime == "alto":

        if estrategia == "Agressivo":

            score += 1.50

        elif estrategia == "Equilibrado":

            score += 0.50

    #
    # REGIME BAIXO
    #
    # Em ambiente de pontuação baixa priorizamos
    # proteção.
    #

    elif regime == "baixo":

        if estrategia == "Conservador":

            score += 1.00

        elif estrategia == "Agressivo":

            score -= 0.50

    #
    # REGIME MÉDIO
    #
    # Evitamos preferência artificial.
    #

    elif regime == "medio":

        if estrategia == "Equilibrado":

            score += 0.40

    return {
        "score": score,
        "mediaHistorica": media_historica,
        "mediaRecente": media_recente,
        "mediana": mediana_historica,
        "desvio": volatilidade,
        "taxaVitorias": taxa,
        "tendencia": tendencia,
        "regime": regime,
        "mediaRegime": media_regime,
        "taxaVitoriasRegime": taxa_regime,
        "amostraRegime": amostra_regime,
    }


# ======================================================
# ESCOLHA DA ESTRATÉGIA
# ======================================================

def escolher_estrategia(
    historico
):

    #
    # COLD START
    #
    # Mesma filosofia das versões anteriores:
    # não inventar inteligência quando ainda não
    # existe histórico suficiente.
    #

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

        scores[estrategia] = (
            calcular_score(
                historico,
                estrategia,
                regime
            )
        )

    escolhida = max(
        ESTRATEGIAS,
        key=lambda estrategia:
            scores[estrategia]["score"]
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

        numero_rodada = rodada[
            "rodada"
        ]

        (
            escolhida,
            regime,
            scores
        ) = escolher_estrategia(
            historico
        )

        pontuacao = numero(
            rodada["pontuacoes"].get(
                escolhida
            )
        )

        melhor = melhor_estrategia_rodada(
            rodada
        )

        teto = maior_pontuacao_rodada(
            rodada
        )

        acertou = (
            escolhida == melhor
        )

        perda_oraculo = (
            teto - pontuacao
        )

        scores_resumidos = {}

        for estrategia, dados in scores.items():

            scores_resumidos[
                estrategia
            ] = {
                "score": arredondar(
                    dados["score"]
                ),
                "mediaHistorica": arredondar(
                    dados["mediaHistorica"]
                ),
                "mediaRecente": arredondar(
                    dados["mediaRecente"]
                ),
                "mediana": arredondar(
                    dados["mediana"]
                ),
                "desvio": arredondar(
                    dados["desvio"]
                ),
                "taxaVitorias": arredondar(
                    dados["taxaVitorias"]
                    * 100
                ),
                "tendencia": arredondar(
                    dados["tendencia"]
                ),
                "mediaRegime": arredondar(
                    dados["mediaRegime"]
                ),
                "taxaVitoriasRegime": arredondar(
                    dados["taxaVitoriasRegime"]
                    * 100
                ),
                "amostraRegime": dados[
                    "amostraRegime"
                ],
            }

        resultado = {
            "rodada": numero_rodada,
            "historicoDisponivel": len(
                historico
            ),
            "regime": regime,
            "estrategiaEscolhida": escolhida,
            "pontuacao": arredondar(
                pontuacao
            ),
            "melhorEstrategia": melhor,
            "pontuacaoOraculo": arredondar(
                teto
            ),
            "perdaOraculo": arredondar(
                perda_oraculo
            ),
            "acertouMelhorEstrategia": acertou,
            "semVazamentoFuturo": True,
            "scores": scores_resumidos,
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

        #
        # IMPORTANTE:
        #
        # A rodada só entra no histórico DEPOIS
        # da decisão.
        #
        # Isso impede vazamento futuro.
        #

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

    mediana_adaptativo = mediana(
        pontos_adaptativo
    )

    desvio_adaptativo = desvio(
        pontos_adaptativo
    )

    acertos = sum(
        1
        for r in resultados
        if r["acertouMelhorEstrategia"]
    )

    taxa_acerto = (
        acertos
        / len(resultados)
        if resultados
        else 0.0
    )

    escolhas = Counter(
        r["estrategiaEscolhida"]
        for r in resultados
    )

    regimes = Counter(
        str(r["regime"])
        for r in resultados
    )

    fixas = {}

    for estrategia in ESTRATEGIAS:

        valores = [
            numero(
                rodada["pontuacoes"][
                    estrategia
                ]
            )
            for rodada in rodadas
        ]

        fixas[estrategia] = {
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
                for rodada in rodadas
                if (
                    melhor_estrategia_rodada(
                        rodada
                    )
                    == estrategia
                )
            ),
        }

    melhor_fixa = max(
        ESTRATEGIAS,
        key=lambda estrategia:
            fixas[estrategia]["media"]
    )

    media_melhor_fixa = (
        fixas[
            melhor_fixa
        ]["media"]
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
        * 100

        if media_melhor_fixa
        else 0.0
    )

    pontos_oraculo = [
        r["pontuacaoOraculo"]
        for r in resultados
    ]

    media_oraculo = media(
        pontos_oraculo
    )

    eficiencia_oraculo = (

        media_adaptativo
        /
        media_oraculo
        * 100

        if media_oraculo
        else 0.0
    )

    return {
        "rodadas": len(resultados),

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
                taxa_acerto * 100
            ),
        },

        "estrategiasFixas": fixas,

        "melhorEstrategiaFixa": {
            "estrategia": melhor_fixa,
            "media": arredondar(
                media_melhor_fixa
            ),
        },

        "comparacaoMelhorFixa": {
            "ganhoPontosRodada": arredondar(
                ganho_melhor_fixa
            ),
            "ganhoPercentual": arredondar(
                ganho_percentual
            ),
        },

        "oraculo": {
            "media": arredondar(
                media_oraculo
            ),
            "eficienciaV3": arredondar(
                eficiencia_oraculo
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
        ]["media"]
    )

    melhor_fixa = (
        metricas[
            "melhorEstrategiaFixa"
        ]["media"]
    )

    ganho = (
        adaptativo
        -
        melhor_fixa
    )

    #
    # A V3 é apenas experimental.
    #
    # Mesmo se superar a fixa, NÃO haverá promoção
    # automática nesta etapa.
    #

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
        "modelo": VERSAO_MODELO,
        "descricao": (
            "Estratégia adaptativa V3 com "
            "média histórica, desempenho recente, "
            "tendência, estabilidade e regime."
        ),
        "rodadas": resultados,
        "resumo": metricas,
        "decisao": decisao,
        "promocaoAutomatica": False,
        "auditoria": {
            "historicoProgressivo": True,
            "semVazamentoFuturo": True,
            "v1Preservada": True,
            "v2Preservada": True,
            "modeloExperimental": True,
        },
    }

    salvar_json(
        ARQUIVO_SAIDA,
        saida
    )

    resumo = metricas[
        "adaptativoV3"
    ]

    melhor_fixa = metricas[
        "melhorEstrategiaFixa"
    ]

    comparacao = metricas[
        "comparacaoMelhorFixa"
    ]

    oraculo = metricas[
        "oraculo"
    ]

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
            ][estrategia]
        )

    print(
        "REGIMES"
    )

    for regime, quantidade in (
        metricas["regimes"].items()
    ):

        print(
            regime,
            ":",
            quantidade
        )

    print(
        f"DECISÃO: {decisao}"
    )

    print(
        "Promoção automática: NÃO"
    )

    print(
        f"Arquivo: {ARQUIVO_SAIDA}"
    )

    print(
        "=============================================="
    )


if __name__ == "__main__":

    main()
