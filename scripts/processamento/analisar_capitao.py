"""
=========================================================
CARTOLA ESTATÍSTICO
Análise Científica de Capitão

Objetivo:

Avaliar historicamente se um score específico para
capitão pode superar o critério simples de escolher
o jogador de maior projeção.

MODELO A
Capitão escolhido pela maior projeção original.

MODELO B
Capitão escolhido por um score específico de capitão.

O score de capitão considera, quando disponíveis:

- projeção
- teto
- confiança
- potencial de explosão
- forma recente
- média recente
- regularidade
- potencial ofensivo
- risco
- volatilidade

IMPORTANTE:

Este script é apenas experimental.

NÃO altera:
- motor oficial
- pesos oficiais
- escalações oficiais
- capitão oficial
- Reserva de Luxo

Entrada principal:

data/simulacao-times.json

Entradas auxiliares opcionais:

data/historico/escalacoes.json
data/backtest-ab-calibracao.json

Saída:

data/analise-capitao.json

=========================================================
"""

from pathlib import Path
from statistics import mean
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


ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)


ARQUIVO_HISTORICO_ESCALACOES = (
    PASTA_DATA /
    "historico" /
    "escalacoes.json"
)


ARQUIVO_BACKTEST_AB = (
    PASTA_DATA /
    "backtest-ab-calibracao.json"
)


ARQUIVO_SAIDA = (
    PASTA_DATA /
    "analise-capitao.json"
)


RODADA_COLD_START = 2


# ======================================================
# PESOS DO SCORE DE CAPITÃO
# ======================================================

PESOS_CAPITAO = {

    "projecao":
        0.32,

    "teto":
        0.18,

    "confianca":
        0.12,

    "explosao":
        0.12,

    "forma":
        0.08,

    "mediaRecente":
        0.06,

    "regularidade":
        0.05,

    "potencialOfensivo":
        0.04,

    "risco":
        -0.02,

    "volatilidade":
        -0.01

}


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
    casas=3
):

    return round(
        numero(
            valor,
            0
        ),
        casas
    )


def media_segura(
    valores
):

    validos = []


    for valor in valores:

        try:

            valor = float(
                valor
            )

            if math.isfinite(
                valor
            ):

                validos.append(
                    valor
                )

        except Exception:

            pass


    if not validos:

        return 0


    return mean(
        validos
    )


def percentual(
    quantidade,
    total
):

    if not total:

        return 0


    return round(
        (
            quantidade /
            total
        ) * 100,
        2
    )


def normalizar_texto(valor):

    if valor is None:

        return ""

    return (
        str(
            valor
        )
        .strip()
        .lower()
    )


# ======================================================
# IDENTIFICAÇÃO DO JOGADOR
# ======================================================

def obter_id_jogador(
    jogador
):

    possibilidades = [

        jogador.get(
            "id"
        ),

        jogador.get(
            "atletaId"
        ),

        jogador.get(
            "atleta_id"
        ),

        jogador.get(
            "atleta"
        )

    ]


    for valor in possibilidades:

        if valor is not None:

            return str(
                valor
            )


    return None


def obter_nome_jogador(
    jogador
):

    return (

        jogador.get(
            "nome"
        )

        or jogador.get(
            "apelido"
        )

        or jogador.get(
            "nomeAtleta"
        )

        or ""

    )


def chave_jogador(
    jogador
):

    identificador = obter_id_jogador(
        jogador
    )


    if identificador:

        return (
            "id:",
            identificador
        )


    nome = normalizar_texto(
        obter_nome_jogador(
            jogador
        )
    )


    posicao = normalizar_texto(
        jogador.get(
            "posicao"
        )
    )


    if nome:

        return (
            "nome:",
            nome,
            posicao
        )


    return None


# ======================================================
# LEITURA DE CAMPOS
# ======================================================

def primeiro_numero(
    jogador,
    campos
):

    for campo in campos:

        valor = jogador.get(
            campo
        )


        if valor is None:

            continue


        try:

            valor = float(
                valor
            )

            if math.isfinite(
                valor
            ):

                return valor

        except Exception:

            pass


    return None


def obter_projecao(
    jogador
):

    valor = primeiro_numero(

        jogador,

        [
            "projecao",
            "score",
            "pontuacaoProjetada",
            "projecaoFinal"
        ]

    )


    if valor is None:

        return 0


    return valor


def obter_real(
    jogador
):

    valor = primeiro_numero(

        jogador,

        [
            "pontos",
            "pontuacaoReal",
            "real",
            "pontuacao"
        ]

    )


    if valor is None:

        return 0


    return valor


# ======================================================
# ÍNDICE AUXILIAR DO HISTÓRICO
# ======================================================

def extrair_rodadas_historico(
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


    rodadas = dados.get(
        "rodadas"
    )


    if isinstance(
        rodadas,
        list
    ):

        return rodadas


    return []


def extrair_jogadores_estrutura(
    estrutura
):

    jogadores = []


    if isinstance(
        estrutura,
        list
    ):

        for item in estrutura:

            if isinstance(
                item,
                dict
            ):

                jogadores.append(
                    item
                )


        return jogadores


    if not isinstance(
        estrutura,
        dict
    ):

        return jogadores


    campos_lista = [

        "jogadores",
        "titulares",
        "atletas",
        "time"
    ]


    for campo in campos_lista:

        lista = estrutura.get(
            campo
        )


        if isinstance(
            lista,
            list
        ):

            for item in lista:

                if isinstance(
                    item,
                    dict
                ):

                    jogadores.append(
                        item
                    )


    estrategias = estrutura.get(
        "estrategias"
    )


    if isinstance(
        estrategias,
        list
    ):

        for estrategia in estrategias:

            jogadores.extend(
                extrair_jogadores_estrutura(
                    estrategia
                )
            )


    modelos = estrutura.get(
        "modelos"
    )


    if isinstance(
        modelos,
        dict
    ):

        for modelo in modelos.values():

            jogadores.extend(
                extrair_jogadores_estrutura(
                    modelo
                )
            )


    return jogadores


def construir_indice_historico(
    dados
):

    indice = {}


    rodadas = extrair_rodadas_historico(
        dados
    )


    for rodada_dados in rodadas:

        rodada = inteiro(

            rodada_dados.get(
                "rodada"
            ),

            0

        )


        if rodada <= 0:

            continue


        if rodada not in indice:

            indice[
                rodada
            ] = {}


        jogadores = (
            extrair_jogadores_estrutura(
                rodada_dados
            )
        )


        for jogador in jogadores:

            chave = chave_jogador(
                jogador
            )


            if not chave:

                continue


            atual = indice[
                rodada
            ].get(
                chave,
                {}
            )


            combinado = dict(
                atual
            )


            for (
                campo,
                valor
            ) in jogador.items():

                if valor is not None:

                    combinado[
                        campo
                    ] = valor


            indice[
                rodada
            ][
                chave
            ] = combinado


    return indice


# ======================================================
# COMPLEMENTO DOS DADOS DO JOGADOR
# ======================================================

def complementar_jogador(
    jogador,
    rodada,
    indice_historico
):

    combinado = dict(
        jogador
    )


    chave = chave_jogador(
        jogador
    )


    if not chave:

        return combinado


    historico_rodada = (
        indice_historico.get(
            rodada,
            {}
        )
    )


    auxiliar = historico_rodada.get(
        chave
    )


    if not auxiliar:

        return combinado


    for (
        campo,
        valor
    ) in auxiliar.items():

        if (
            combinado.get(
                campo
            )
            is None
        ):

            combinado[
                campo
            ] = valor


    return combinado


# ======================================================
# COMPONENTES DO SCORE
# ======================================================

def extrair_componentes(
    jogador
):

    return {

        "projecao":

            primeiro_numero(

                jogador,

                [
                    "projecao",
                    "score",
                    "pontuacaoProjetada",
                    "projecaoFinal"
                ]

            ),

        "teto":

            primeiro_numero(

                jogador,

                [
                    "teto",
                    "ceiling"
                ]

            ),

        "confianca":

            primeiro_numero(

                jogador,

                [
                    "confianca",
                    "confidence"
                ]

            ),

        "explosao":

            primeiro_numero(

                jogador,

                [
                    "notaExplosao",
                    "potencialExplosao",
                    "explosao"
                ]

            ),

        "forma":

            primeiro_numero(

                jogador,

                [
                    "forma",
                    "notaForma"
                ]

            ),

        "mediaRecente":

            primeiro_numero(

                jogador,

                [
                    "mediaRecente",
                    "media5",
                    "media3"
                ]

            ),

        "regularidade":

            primeiro_numero(

                jogador,

                [
                    "regularidade"
                ]

            ),

        "potencialOfensivo":

            primeiro_numero(

                jogador,

                [
                    "potencialOfensivo",
                    "ofensivo",
                    "notaOfensiva"
                ]

            ),

        "risco":

            primeiro_numero(

                jogador,

                [
                    "risco"
                ]

            ),

        "volatilidade":

            primeiro_numero(

                jogador,

                [
                    "volatilidade",
                    "desvio"
                ]

            )

    }


# ======================================================
# NORMALIZAÇÃO DOS COMPONENTES
# ======================================================

def normalizar_componentes_time(
    jogadores
):

    componentes_jogadores = []


    for jogador in jogadores:

        componentes_jogadores.append(
            extrair_componentes(
                jogador
            )
        )


    limites = {}


    for componente in PESOS_CAPITAO:

        valores = [

            dados.get(
                componente
            )

            for dados
            in componentes_jogadores

            if dados.get(
                componente
            )
            is not None

        ]


        if valores:

            limites[
                componente
            ] = {

                "min":
                    min(
                        valores
                    ),

                "max":
                    max(
                        valores
                    )

            }


        else:

            limites[
                componente
            ] = None


    return (
        componentes_jogadores,
        limites
    )


def normalizar_valor(
    valor,
    limites
):

    if (
        valor is None
        or limites is None
    ):

        return None


    minimo = numero(
        limites.get(
            "min"
        ),
        0
    )


    maximo = numero(
        limites.get(
            "max"
        ),
        0
    )


    if maximo == minimo:

        return 0.5


    resultado = (

        (
            numero(
                valor,
                minimo
            )
            -
            minimo
        )

        /

        (
            maximo -
            minimo
        )

    )


    return max(
        0,
        min(
            1,
            resultado
        )
    )


# ======================================================
# SCORE DE CAPITÃO
# ======================================================

def calcular_score_capitao(
    componentes,
    limites
):

    soma = 0

    peso_disponivel = 0

    componentes_usados = {}


    for (
        componente,
        peso
    ) in PESOS_CAPITAO.items():

        valor = componentes.get(
            componente
        )


        normalizado = normalizar_valor(

            valor,

            limites.get(
                componente
            )

        )


        if normalizado is None:

            continue


        peso_absoluto = abs(
            peso
        )


        if peso >= 0:

            contribuicao = (
                normalizado *
                peso_absoluto
            )


        else:

            contribuicao = (
                (
                    1 -
                    normalizado
                )
                *
                peso_absoluto
            )


        soma += contribuicao

        peso_disponivel += (
            peso_absoluto
        )


        componentes_usados[
            componente
        ] = {

            "valor":
                arredondar(
                    valor
                ),

            "normalizado":
                arredondar(
                    normalizado,
                    4
                ),

            "peso":
                peso,

            "contribuicao":
                arredondar(
                    contribuicao,
                    5
                )

        }


    if peso_disponivel == 0:

        return {

            "score":
                0,

            "cobertura":
                0,

            "componentes":
                {}

        }


    score = (
        soma /
        peso_disponivel
    ) * 100


    peso_total = sum(

        abs(
            peso
        )

        for peso
        in PESOS_CAPITAO.values()

    )


    cobertura = (

        peso_disponivel /
        peso_total

    ) * 100


    return {

        "score":
            arredondar(
                score,
                3
            ),

        "cobertura":
            arredondar(
                cobertura,
                2
            ),

        "componentes":
            componentes_usados

    }


# ======================================================
# PREPARAÇÃO DO TIME
# ======================================================

def preparar_time(
    jogadores,
    rodada,
    indice_historico
):

    preparados = []


    for jogador in jogadores:

        if not isinstance(
            jogador,
            dict
        ):

            continue


        combinado = complementar_jogador(

            jogador,

            rodada,

            indice_historico

        )


        preparados.append(
            combinado
        )


    return preparados


# ======================================================
# ESCOLHA DO CAPITÃO
# ======================================================

def escolher_capitaes(
    jogadores
):

    if not jogadores:

        return None


    (
        componentes,
        limites
    ) = normalizar_componentes_time(
        jogadores
    )


    candidatos = []


    for (
        jogador,
        dados_componentes
    ) in zip(
        jogadores,
        componentes
    ):

        resultado_score = (
            calcular_score_capitao(

                dados_componentes,

                limites

            )
        )


        candidatos.append({

            "jogador":
                jogador,

            "projecao":
                obter_projecao(
                    jogador
                ),

            "real":
                obter_real(
                    jogador
                ),

            "scoreCapitao":
                resultado_score.get(
                    "score"
                ),

            "coberturaScore":
                resultado_score.get(
                    "cobertura"
                ),

            "componentes":
                resultado_score.get(
                    "componentes"
                )

        })


    capitao_a = max(

        candidatos,

        key=lambda item:
            item.get(
                "projecao",
                0
            )

    )


    capitao_b = max(

        candidatos,

        key=lambda item:
            item.get(
                "scoreCapitao",
                0
            )

    )


    capitao_real = max(

        candidatos,

        key=lambda item:
            item.get(
                "real",
                0
            )

    )


    return {

        "A":
            capitao_a,

        "B":
            capitao_b,

        "real":
            capitao_real,

        "candidatos":
            candidatos

    }


# ======================================================
# FORMATAÇÃO DO CAPITÃO
# ======================================================

def formatar_capitao(
    candidato
):

    jogador = candidato.get(
        "jogador",
        {}
    )


    return {

        "id":
            obter_id_jogador(
                jogador
            ),

        "nome":
            obter_nome_jogador(
                jogador
            ),

        "posicao":
            jogador.get(
                "posicao"
            ),

        "projecao":
            arredondar(
                candidato.get(
                    "projecao"
                )
            ),

        "real":
            arredondar(
                candidato.get(
                    "real"
                )
            ),

        "scoreCapitao":
            arredondar(
                candidato.get(
                    "scoreCapitao"
                )
            ),

        "coberturaScore":
            arredondar(
                candidato.get(
                    "coberturaScore"
                ),
                2
            ),

        "componentesScore":
            candidato.get(
                "componentes",
                {}
            )

    }


# ======================================================
# COMPARAÇÃO DE UMA ESTRATÉGIA
# ======================================================

def analisar_estrategia(
    rodada,
    estrategia,
    indice_historico
):

    nome = (

        estrategia.get(
            "nome"
        )

        or estrategia.get(
            "id"
        )

        or "Sem nome"

    )


    jogadores = estrategia.get(
        "jogadores"
    )


    if not isinstance(
        jogadores,
        list
    ):

        jogadores = estrategia.get(
            "titulares",
            []
        )


    jogadores = preparar_time(

        jogadores,

        rodada,

        indice_historico

    )


    if not jogadores:

        return None


    escolha = escolher_capitaes(
        jogadores
    )


    if not escolha:

        return None


    capitao_a = escolha[
        "A"
    ]


    capitao_b = escolha[
        "B"
    ]


    capitao_real = escolha[
        "real"
    ]


    pontos_a = numero(
        capitao_a.get(
            "real"
        ),
        0
    )


    pontos_b = numero(
        capitao_b.get(
            "real"
        ),
        0
    )


    melhor_real = numero(
        capitao_real.get(
            "real"
        ),
        0
    )


    if pontos_b > pontos_a:

        vencedor = "B"


    elif pontos_a > pontos_b:

        vencedor = "A"


    else:

        vencedor = "EMPATE"


    chave_a = chave_jogador(
        capitao_a.get(
            "jogador",
            {}
        )
    )


    chave_b = chave_jogador(
        capitao_b.get(
            "jogador",
            {}
        )
    )


    chave_real = chave_jogador(
        capitao_real.get(
            "jogador",
            {}
        )
    )


    acertou_a = (
        chave_a is not None
        and chave_a == chave_real
    )


    acertou_b = (
        chave_b is not None
        and chave_b == chave_real
    )


    perda_a = (
        melhor_real -
        pontos_a
    )


    perda_b = (
        melhor_real -
        pontos_b
    )


    return {

        "estrategia":
            nome,

        "quantidadeJogadores":
            len(
                jogadores
            ),

        "modeloA":
            formatar_capitao(
                capitao_a
            ),

        "modeloB":
            formatar_capitao(
                capitao_b
            ),

        "melhorCapitaoReal":
            formatar_capitao(
                capitao_real
            ),

        "resultado": {

            "vencedor":
                vencedor,

            "pontosCapitaoA":
                arredondar(
                    pontos_a
                ),

            "pontosCapitaoB":
                arredondar(
                    pontos_b
                ),

            "melhorPontuacaoReal":
                arredondar(
                    melhor_real
                ),

            "ganhoBvsA":
                arredondar(
                    pontos_b -
                    pontos_a
                ),

            "perdaAParaOtimo":
                arredondar(
                    perda_a
                ),

            "perdaBParaOtimo":
                arredondar(
                    perda_b
                ),

            "AEscolheuMelhorReal":
                acertou_a,

            "BEscolheuMelhorReal":
                acertou_b

        }

    }


# ======================================================
# RESUMO DOS RESULTADOS
# ======================================================

def gerar_resumo(
    registros
):

    validos = [

        registro

        for registro
        in registros

        if not registro.get(
            "coldStart"
        )

    ]


    resultados = []


    for rodada in validos:

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            resultados.append(
                estrategia
            )


    if not resultados:

        return {

            "avaliacoes":
                0,

            "vitoriasA":
                0,

            "vitoriasB":
                0,

            "empates":
                0,

            "taxaVitoriasB":
                0,

            "mediaPontosA":
                0,

            "mediaPontosB":
                0,

            "ganhoMedioBvsA":
                0,

            "acertoMelhorRealA":
                0,

            "acertoMelhorRealB":
                0

        }


    vitorias_a = sum(

        1

        for item
        in resultados

        if item.get(
            "resultado",
            {}
        ).get(
            "vencedor"
        ) == "A"

    )


    vitorias_b = sum(

        1

        for item
        in resultados

        if item.get(
            "resultado",
            {}
        ).get(
            "vencedor"
        ) == "B"

    )


    empates = sum(

        1

        for item
        in resultados

        if item.get(
            "resultado",
            {}
        ).get(
            "vencedor"
        ) == "EMPATE"

    )


    pontos_a = [

        numero(

            item.get(
                "resultado",
                {}
            ).get(
                "pontosCapitaoA"
            ),

            0

        )

        for item
        in resultados

    ]


    pontos_b = [

        numero(

            item.get(
                "resultado",
                {}
            ).get(
                "pontosCapitaoB"
            ),

            0

        )

        for item
        in resultados

    ]


    ganhos = [

        numero(

            item.get(
                "resultado",
                {}
            ).get(
                "ganhoBvsA"
            ),

            0

        )

        for item
        in resultados

    ]


    acertos_a = sum(

        1

        for item
        in resultados

        if item.get(
            "resultado",
            {}
        ).get(
            "AEscolheuMelhorReal"
        )

    )


    acertos_b = sum(

        1

        for item
        in resultados

        if item.get(
            "resultado",
            {}
        ).get(
            "BEscolheuMelhorReal"
        )

    )


    return {

        "avaliacoes":
            len(
                resultados
            ),

        "vitoriasA":
            vitorias_a,

        "vitoriasB":
            vitorias_b,

        "empates":
            empates,

        "taxaVitoriasA":
            percentual(
                vitorias_a,
                len(
                    resultados
                )
            ),

        "taxaVitoriasB":
            percentual(
                vitorias_b,
                len(
                    resultados
                )
            ),

        "mediaPontosA":
            arredondar(
                media_segura(
                    pontos_a
                )
            ),

        "mediaPontosB":
            arredondar(
                media_segura(
                    pontos_b
                )
            ),

        "ganhoMedioBvsA":
            arredondar(
                media_segura(
                    ganhos
                )
            ),

        "acertoMelhorRealA": {

            "quantidade":
                acertos_a,

            "taxa":
                percentual(
                    acertos_a,
                    len(
                        resultados
                    )
                )

        },

        "acertoMelhorRealB": {

            "quantidade":
                acertos_b,

            "taxa":
                percentual(
                    acertos_b,
                    len(
                        resultados
                    )
                )

        }

    }


# ======================================================
# RESUMO POR ESTRATÉGIA
# ======================================================

def gerar_resumo_por_estrategia(
    registros
):

    grupos = {}


    for rodada in registros:

        if rodada.get(
            "coldStart"
        ):

            continue


        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "estrategia"
            )


            if nome not in grupos:

                grupos[
                    nome
                ] = []


            grupos[
                nome
            ].append(
                estrategia
            )


    resultado = {}


    for (
        nome,
        itens
    ) in grupos.items():

        vitorias_a = sum(

            1

            for item
            in itens

            if item.get(
                "resultado",
                {}
            ).get(
                "vencedor"
            ) == "A"

        )


        vitorias_b = sum(

            1

            for item
            in itens

            if item.get(
                "resultado",
                {}
            ).get(
                "vencedor"
            ) == "B"

        )


        empates = sum(

            1

            for item
            in itens

            if item.get(
                "resultado",
                {}
            ).get(
                "vencedor"
            ) == "EMPATE"

        )


        ganhos = [

            numero(

                item.get(
                    "resultado",
                    {}
                ).get(
                    "ganhoBvsA"
                ),

                0

            )

            for item
            in itens

        ]


        acertos_a = sum(

            1

            for item
            in itens

            if item.get(
                "resultado",
                {}
            ).get(
                "AEscolheuMelhorReal"
            )

        )


        acertos_b = sum(

            1

            for item
            in itens

            if item.get(
                "resultado",
                {}
            ).get(
                "BEscolheuMelhorReal"
            )

        )


        resultado[
            nome
        ] = {

            "avaliacoes":
                len(
                    itens
                ),

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
                        itens
                    )
                ),

            "ganhoMedioBvsA":
                arredondar(
                    media_segura(
                        ganhos
                    )
                ),

            "taxaAcertoMelhorRealA":
                percentual(
                    acertos_a,
                    len(
                        itens
                    )
                ),

            "taxaAcertoMelhorRealB":
                percentual(
                    acertos_b,
                    len(
                        itens
                    )
                )

        }


    return resultado


# ======================================================
# COBERTURA DOS COMPONENTES
# ======================================================

def calcular_cobertura_componentes(
    registros
):

    coberturas = {}


    for componente in PESOS_CAPITAO:

        coberturas[
            componente
        ] = {

            "disponivel":
                0,

            "total":
                0

        }


    for rodada in registros:

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            modelo_b = estrategia.get(
                "modeloB",
                {}
            )


            componentes = modelo_b.get(
                "componentesScore",
                {}
            )


            for componente in PESOS_CAPITAO:

                coberturas[
                    componente
                ][
                    "total"
                ] += 1


                if componente in componentes:

                    coberturas[
                        componente
                    ][
                        "disponivel"
                    ] += 1


    resultado = {}


    for (
        componente,
        dados
    ) in coberturas.items():

        resultado[
            componente
        ] = {

            "peso":
                PESOS_CAPITAO[
                    componente
                ],

            "disponivel":
                dados[
                    "disponivel"
                ],

            "total":
                dados[
                    "total"
                ],

            "cobertura":
                percentual(
                    dados[
                        "disponivel"
                    ],
                    dados[
                        "total"
                    ]
                )

        }


    return resultado


# ======================================================
# DECISÃO EXPERIMENTAL
# ======================================================

def avaliar_formula(
    resumo
):

    avaliacoes = inteiro(
        resumo.get(
            "avaliacoes"
        ),
        0
    )


    ganho_medio = numero(
        resumo.get(
            "ganhoMedioBvsA"
        ),
        0
    )


    taxa_b = numero(
        resumo.get(
            "taxaVitoriasB"
        ),
        0
    )


    taxa_acerto_a = numero(

        resumo.get(
            "acertoMelhorRealA",
            {}
        ).get(
            "taxa"
        ),

        0

    )


    taxa_acerto_b = numero(

        resumo.get(
            "acertoMelhorRealB",
            {}
        ).get(
            "taxa"
        ),

        0

    )


    criterios = [

        {

            "criterio":
                "amostra",

            "aprovado":
                avaliacoes >= 20,

            "valor":
                avaliacoes,

            "minimo":
                20

        },

        {

            "criterio":
                "ganho_medio",

            "aprovado":
                ganho_medio > 0,

            "valor":
                arredondar(
                    ganho_medio
                ),

            "minimo":
                "> 0"

        },

        {

            "criterio":
                "taxa_vitorias_b",

            "aprovado":
                taxa_b >= 40,

            "valor":
                arredondar(
                    taxa_b,
                    2
                ),

            "minimo":
                40

        },

        {

            "criterio":
                "acerto_melhor_capitao_real",

            "aprovado":
                taxa_acerto_b >=
                taxa_acerto_a,

            "modeloA":
                arredondar(
                    taxa_acerto_a,
                    2
                ),

            "modeloB":
                arredondar(
                    taxa_acerto_b,
                    2
                )

        }

    ]


    aprovados = sum(

        1

        for criterio
        in criterios

        if criterio.get(
            "aprovado"
        )

    )


    aprovada = (
        aprovados ==
        len(
            criterios
        )
    )


    return {

        "formulaCandidataAprovada":
            aprovada,

        "criteriosAprovados":
            aprovados,

        "totalCriterios":
            len(
                criterios
            ),

        "criterios":
            criterios,

        "decisao":
            (
                "FORMULA_CANDIDATA_APROVADA_PARA_PROXIMA_ETAPA"

                if aprovada

                else "MANTER_CAPITAO_ATUAL"
            ),

        "promocaoAutomatica":
            False

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def processar():

    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )


    historico_escalacoes = carregar_json(
        ARQUIVO_HISTORICO_ESCALACOES
    )


    backtest_ab = carregar_json(
        ARQUIVO_BACKTEST_AB
    )


    if not simulacao:

        print(
            "[ERRO] data/simulacao-times.json "
            "não encontrado."
        )

        raise SystemExit(
            1
        )


    rodadas = simulacao.get(
        "rodadas",
        []
    )


    if not rodadas:

        print(
            "[ERRO] simulacao-times.json "
            "não possui rodadas."
        )

        raise SystemExit(
            1
        )


    indice_historico = (
        construir_indice_historico(
            historico_escalacoes
        )
    )


    rodadas = sorted(

        rodadas,

        key=lambda item:
            inteiro(
                item.get(
                    "rodada"
                ),
                0
            )

    )


    resultados = []


    print(
        "===================================================="
    )

    print(
        "ANÁLISE CIENTÍFICA DE CAPITÃO"
    )

    print(
        "===================================================="
    )


    for rodada_dados in rodadas:

        rodada = inteiro(

            rodada_dados.get(
                "rodada"
            ),

            0

        )


        if rodada <= 0:

            continue


        estrategias_resultado = []


        for estrategia in rodada_dados.get(
            "estrategias",
            []
        ):

            analise = analisar_estrategia(

                rodada,

                estrategia,

                indice_historico

            )


            if analise:

                estrategias_resultado.append(
                    analise
                )


        if not estrategias_resultado:

            continue


        registro = {

            "rodada":
                rodada,

            "coldStart":
                rodada ==
                RODADA_COLD_START,

            "estrategias":
                estrategias_resultado

        }


        resultados.append(
            registro
        )


        for estrategia in estrategias_resultado:

            resultado = estrategia.get(
                "resultado",
                {}
            )


            print(
                f"Rodada {rodada:02d} | "
                f"{estrategia.get('estrategia')} | "
                f"A: "
                f"{resultado.get('pontosCapitaoA')} | "
                f"B: "
                f"{resultado.get('pontosCapitaoB')} | "
                f"Vencedor: "
                f"{resultado.get('vencedor')}"
            )


    resumo = gerar_resumo(
        resultados
    )


    por_estrategia = (
        gerar_resumo_por_estrategia(
            resultados
        )
    )


    cobertura = (
        calcular_cobertura_componentes(
            resultados
        )
    )


    decisao = avaliar_formula(
        resumo
    )


    resultado_final = {

        "modelo":
            "analise_capitao_v1",

        "descricao":
            (
                "Comparação histórica entre capitão "
                "por projeção e score específico "
                "experimental de capitão."
            ),

        "modelos": {

            "A":
                "maior_projecao_original",

            "B":
                "score_cientifico_capitao"

        },

        "pesosCandidatos":
            PESOS_CAPITAO,

        "metodologia": {

            "normalizacao":
                (
                    "min-max entre os jogadores "
                    "da própria escalação"
                ),

            "componentesAusentes":
                (
                    "Componentes inexistentes não "
                    "recebem valor artificial e seus "
                    "pesos são removidos do denominador."
                ),

            "riscoEVolatilidade":
                (
                    "São componentes negativos: "
                    "quanto menores, maior a contribuição "
                    "para o score de capitão."
                ),

            "coldStart":
                RODADA_COLD_START,

            "coldStartExcluidoDaDecisao":
                True

        },

        "fontes": {

            "simulacaoTimes":
                True,

            "historicoEscalacoes":
                bool(
                    historico_escalacoes
                ),

            "backtestABDisponivel":
                bool(
                    backtest_ab
                ),

            "backtestABUsadoParaEscolherCapitao":
                False

        },

        "resumo":
            resumo,

        "porEstrategia":
            por_estrategia,

        "coberturaComponentes":
            cobertura,

        "decisaoExperimental":
            decisao,

        "rodadas":
            resultados,

        "seguranca": {

            "alteraMotorOficial":
                False,

            "alteraCapitaoOficial":
                False,

            "alteraPesosOficiais":
                False,

            "promocaoAutomatica":
                False,

            "necessitaValidacaoHumana":
                True

        }

    }


    salvar_json(
        ARQUIVO_SAIDA,
        resultado_final
    )


    print()

    print(
        "===================================================="
    )

    print(
        "RESULTADO DA ANÁLISE DE CAPITÃO"
    )

    print(
        "===================================================="
    )


    print(
        "Avaliações:",
        resumo.get(
            "avaliacoes"
        )
    )


    print(
        "Vitórias Modelo A:",
        resumo.get(
            "vitoriasA"
        )
    )


    print(
        "Vitórias Modelo B:",
        resumo.get(
            "vitoriasB"
        )
    )


    print(
        "Empates:",
        resumo.get(
            "empates"
        )
    )


    print(
        "Taxa vitórias B:",
        resumo.get(
            "taxaVitoriasB"
        ),
        "%"
    )


    print(
        "Média pontos capitão A:",
        resumo.get(
            "mediaPontosA"
        )
    )


    print(
        "Média pontos capitão B:",
        resumo.get(
            "mediaPontosB"
        )
    )


    print(
        "Ganho médio B vs A:",
        resumo.get(
            "ganhoMedioBvsA"
        )
    )


    print(
        "Acerto melhor capitão real A:",
        resumo.get(
            "acertoMelhorRealA",
            {}
        ).get(
            "taxa"
        ),
        "%"
    )


    print(
        "Acerto melhor capitão real B:",
        resumo.get(
            "acertoMelhorRealB",
            {}
        ).get(
            "taxa"
        ),
        "%"
    )


    print()


    print(
        "===== COBERTURA DOS COMPONENTES ====="
    )


    for (
        componente,
        dados
    ) in cobertura.items():

        print(
            f"{componente}: "
            f"{dados.get('cobertura')}%"
        )


    print()


    print(
        "===== DECISÃO ====="
    )


    for criterio in decisao.get(
        "criterios",
        []
    ):

        status = (

            "OK"

            if criterio.get(
                "aprovado"
            )

            else "FALHOU"

        )


        print(
            f"[{status}] "
            f"{criterio.get('criterio')}"
        )


    print()


    print(
        "DECISÃO:",
        decisao.get(
            "decisao"
        )
    )


    print(
        "Capitão oficial alterado: NÃO"
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
