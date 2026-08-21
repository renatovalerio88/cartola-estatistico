"""
======================================================
CARTOLA ESTATÍSTICO
Matriz Científica de Features
======================================================

Objetivo:

Criar uma base jogador x rodada para treinamento,
backtest walk-forward e comparação de modelos.

REGRA FUNDAMENTAL:

Para prever a rodada R:

    histórico estatístico = somente rodadas < R

A pontuação da rodada R aparece apenas como TARGET.

Isso impede DATA LEAKAGE.

Features:

- média 3
- média 5
- média 10
- média geral
- EWMA
- mediana
- piso
- teto
- desvio padrão
- regularidade
- tendência
- frequência 5+
- frequência 10+
- frequência 15+
- frequência negativa
- pontuação básica
- pontuação sem G/A/SG
- scouts históricos
- preço
- mando
- força do adversário
- pontos cedidos
- chance de SG
- titularidade
- minutos esperados
- posição

Saída:

data/modelagem/matriz_features.json

======================================================
"""

from __future__ import annotations

import json
import math
import statistics

from pathlib import Path
from typing import Any


PASTA_BASE = Path(
    "data/base-historica"
)

PASTA_SAIDA = Path(
    "data/modelagem"
)

ARQUIVO_SAIDA = (
    PASTA_SAIDA
    /
    "matriz_features.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================


MINIMO_JOGOS = 1


ALFA_EWMA = 0.45


SCOUTS_PONTOS = {

    # POSITIVOS

    "G": 8.0,

    "A": 5.0,

    "SG": 5.0,

    "FT": 3.0,

    "DP": 7.0,

    "DE": 1.3,

    "DD": 1.3,

    "FD": 1.2,

    "PS": 1.0,

    "FF": 0.8,

    "DS": 1.5,

    "FS": 0.5,


    # NEGATIVOS

    "GC": -3.0,

    "CV": -3.0,

    "PP": -4.0,

    "CA": -1.0,

    "GS": -1.0,

    "PC": -1.0,

    "FC": -0.3,

    "I": -0.1,

}


SCOUTS_DECISIVOS = {
    "G",
    "A",
    "SG",
}


SCOUTS_OFENSIVOS = {
    "G",
    "A",
    "FT",
    "FD",
    "FF",
    "PS",
}


SCOUTS_DEFENSIVOS = {
    "SG",
    "DP",
    "DE",
    "DD",
    "DS",
}


# ======================================================
# UTILIDADES
# ======================================================


def carregar_json(
    caminho: Path,
) -> Any:

    return json.loads(
        caminho.read_text(
            encoding="utf-8"
        )
    )


def salvar_json(
    caminho: Path,
    dados: Any,
) -> None:

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    caminho.write_text(

        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),

        encoding="utf-8",
    )


def numero(
    valor: Any,
    padrao: float | None = None,
) -> float | None:

    if valor in (
        None,
        "",
    ):

        return padrao

    try:

        valor = float(
            valor
        )

        if not math.isfinite(
            valor
        ):

            return padrao

        return valor

    except (
        TypeError,
        ValueError,
    ):

        return padrao


def arredondar(
    valor: Any,
    casas: int = 4,
) -> float | None:

    valor = numero(
        valor
    )

    if valor is None:

        return None

    return round(
        valor,
        casas,
    )


def media(
    valores: list[float],
) -> float:

    if not valores:

        return 0.0

    return (
        sum(valores)
        /
        len(valores)
    )


def mediana(
    valores: list[float],
) -> float:

    if not valores:

        return 0.0

    return float(
        statistics.median(
            valores
        )
    )


def desvio(
    valores: list[float],
) -> float:

    if len(valores) < 2:

        return 0.0

    return float(
        statistics.pstdev(
            valores
        )
    )


def percentil(
    valores: list[float],
    percentual: float,
) -> float:

    if not valores:

        return 0.0

    ordenados = sorted(
        valores
    )

    if len(ordenados) == 1:

        return ordenados[0]

    indice = (
        len(ordenados) - 1
    ) * percentual

    inferior = math.floor(
        indice
    )

    superior = math.ceil(
        indice
    )

    if inferior == superior:

        return ordenados[
            inferior
        ]

    peso_superior = (
        indice - inferior
    )

    return (

        ordenados[inferior]
        *
        (
            1 - peso_superior
        )

        +

        ordenados[superior]
        *
        peso_superior

    )


def ewma(
    valores: list[float],
    alfa: float = ALFA_EWMA,
) -> float:

    if not valores:

        return 0.0

    resultado = valores[0]

    for valor in valores[1:]:

        resultado = (

            alfa
            *
            valor

            +

            (
                1 - alfa
            )
            *
            resultado

        )

    return resultado


def taxa(
    quantidade: int,
    total: int,
) -> float:

    if total <= 0:

        return 0.0

    return (
        quantidade
        /
        total
        *
        100
    )


# ======================================================
# SCOUTS
# ======================================================


def scouts_validos(
    registro: dict[str, Any],
) -> dict[str, float]:

    scouts = registro.get(
        "scouts"
    )

    if not isinstance(
        scouts,
        dict,
    ):

        return {}

    resultado = {}

    for scout, valor in scouts.items():

        quantidade = numero(
            valor,
            0.0,
        )

        if quantidade is None:

            quantidade = 0.0

        resultado[
            str(scout)
        ] = quantidade

    return resultado


def pontos_por_scouts(
    scouts: dict[str, float],
    excluir: set[str] | None = None,
) -> float:

    excluir = excluir or set()

    total = 0.0

    for scout, quantidade in scouts.items():

        if scout in excluir:

            continue

        peso = SCOUTS_PONTOS.get(
            scout
        )

        if peso is None:

            continue

        total += (
            quantidade
            *
            peso
        )

    return total


def pontuacao_basica_registro(
    registro: dict[str, Any],
) -> float:

    """
    Pontuação produzida SEM:

    - gol
    - assistência
    - saldo de gols

    Essa variável será muito importante para testar
    nossa hipótese de jogadores que pontuam bem sem
    depender de eventos difíceis de prever.
    """

    scouts = scouts_validos(
        registro
    )

    return pontos_por_scouts(
        scouts,
        excluir=SCOUTS_DECISIVOS,
    )


def pontuacao_ofensiva_registro(
    registro: dict[str, Any],
) -> float:

    scouts = scouts_validos(
        registro
    )

    selecionados = {

        scout:
            valor

        for scout, valor
        in scouts.items()

        if scout
        in SCOUTS_OFENSIVOS

    }

    return pontos_por_scouts(
        selecionados
    )


def pontuacao_defensiva_registro(
    registro: dict[str, Any],
) -> float:

    scouts = scouts_validos(
        registro
    )

    selecionados = {

        scout:
            valor

        for scout, valor
        in scouts.items()

        if scout
        in SCOUTS_DEFENSIVOS

    }

    return pontos_por_scouts(
        selecionados
    )


# ======================================================
# HISTÓRICO
# ======================================================


def registros_com_pontos(
    historico: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    resultado = []

    for registro in historico:

        pontos = numero(
            registro.get(
                "pontos"
            )
        )

        if pontos is None:

            continue

        resultado.append(
            registro
        )

    return resultado


def pontos_historicos(
    historico: list[dict[str, Any]],
) -> list[float]:

    resultado = []

    for registro in historico:

        pontos = numero(
            registro.get(
                "pontos"
            )
        )

        if pontos is not None:

            resultado.append(
                pontos
            )

    return resultado


def medias_scouts(
    historico: list[dict[str, Any]],
) -> dict[str, float]:

    acumulado: dict[
        str,
        float
    ] = {}

    jogos = len(
        historico
    )

    if jogos == 0:

        return {}

    for registro in historico:

        scouts = scouts_validos(
            registro
        )

        for scout, quantidade in scouts.items():

            acumulado[
                scout
            ] = (

                acumulado.get(
                    scout,
                    0.0,
                )

                +

                quantidade

            )

    return {

        scout:
            total
            /
            jogos

        for scout, total
        in acumulado.items()

    }


# ======================================================
# FEATURES TEMPORAIS
# ======================================================


def calcular_features_historicas(
    historico: list[dict[str, Any]],
) -> dict[str, Any]:

    historico = registros_com_pontos(
        historico
    )

    pontos = pontos_historicos(
        historico
    )

    jogos = len(
        pontos
    )

    if not pontos:

        return {}


    ultimos3 = pontos[
        -3:
    ]

    ultimos5 = pontos[
        -5:
    ]

    ultimos10 = pontos[
        -10:
    ]


    media3 = media(
        ultimos3
    )

    media5 = media(
        ultimos5
    )

    media10 = media(
        ultimos10
    )

    media_geral = media(
        pontos
    )


    mediana_geral = mediana(
        pontos
    )


    volatilidade = desvio(
        pontos
    )


    piso = percentil(
        pontos,
        0.20,
    )


    teto = percentil(
        pontos,
        0.80,
    )


    ewma_pontos = ewma(
        pontos
    )


    # ==========================================
    # TENDÊNCIA
    # ==========================================

    tendencia_3_5 = (
        media3
        -
        media5
    )


    tendencia_5_10 = (
        media5
        -
        media10
    )


    tendencia_ewma = (
        ewma_pontos
        -
        media_geral
    )


    # ==========================================
    # FREQUÊNCIAS
    # ==========================================

    qtd_5 = sum(
        1
        for p in pontos
        if p >= 5
    )

    qtd_10 = sum(
        1
        for p in pontos
        if p >= 10
    )

    qtd_15 = sum(
        1
        for p in pontos
        if p >= 15
    )

    qtd_negativa = sum(
        1
        for p in pontos
        if p < 0
    )


    # ==========================================
    # REGULARIDADE
    # ==========================================

    regularidade = max(

        0.0,

        min(

            100.0,

            100.0
            -
            (
                volatilidade
                *
                10
            )

        )

    )


    # ==========================================
    # PONTUAÇÃO BÁSICA
    # ==========================================

    basicas = [

        pontuacao_basica_registro(
            registro
        )

        for registro
        in historico

    ]


    basicas3 = basicas[
        -3:
    ]

    basicas5 = basicas[
        -5:
    ]

    basicas10 = basicas[
        -10:
    ]


    media_basica = media(
        basicas
    )

    media_basica3 = media(
        basicas3
    )

    media_basica5 = media(
        basicas5
    )

    media_basica10 = media(
        basicas10
    )


    taxa_basica_3 = taxa(

        sum(
            1
            for p in basicas
            if p >= 3
        ),

        jogos,

    )


    taxa_basica_5 = taxa(

        sum(
            1
            for p in basicas
            if p >= 5
        ),

        jogos,

    )


    # ==========================================
    # DEPENDÊNCIA DE G/A/SG
    # ==========================================

    dependencia_decisivos = (

        media_geral
        -
        media_basica

    )


    # ==========================================
    # OFENSIVO / DEFENSIVO
    # ==========================================

    ofensivos = [

        pontuacao_ofensiva_registro(
            registro
        )

        for registro
        in historico

    ]


    defensivos = [

        pontuacao_defensiva_registro(
            registro
        )

        for registro
        in historico

    ]


    # ==========================================
    # SCOUTS
    # ==========================================

    scouts = medias_scouts(
        historico
    )


    return {

        "jogosHistoricos":
            jogos,

        "media3":
            arredondar(
                media3
            ),

        "media5":
            arredondar(
                media5
            ),

        "media10":
            arredondar(
                media10
            ),

        "mediaGeral":
            arredondar(
                media_geral
            ),

        "ewma":
            arredondar(
                ewma_pontos
            ),

        "mediana":
            arredondar(
                mediana_geral
            ),

        "piso20":
            arredondar(
                piso
            ),

        "teto80":
            arredondar(
                teto
            ),

        "desvioPadrao":
            arredondar(
                volatilidade
            ),

        "regularidade":
            arredondar(
                regularidade
            ),

        "tendencia3x5":
            arredondar(
                tendencia_3_5
            ),

        "tendencia5x10":
            arredondar(
                tendencia_5_10
            ),

        "tendenciaEWMA":
            arredondar(
                tendencia_ewma
            ),

        "taxa5Mais":
            arredondar(
                taxa(
                    qtd_5,
                    jogos,
                )
            ),

        "taxa10Mais":
            arredondar(
                taxa(
                    qtd_10,
                    jogos,
                )
            ),

        "taxa15Mais":
            arredondar(
                taxa(
                    qtd_15,
                    jogos,
                )
            ),

        "taxaNegativa":
            arredondar(
                taxa(
                    qtd_negativa,
                    jogos,
                )
            ),

        # ======================================
        # NOSSA NOVA HIPÓTESE PRINCIPAL
        # ======================================

        "mediaBasica":
            arredondar(
                media_basica
            ),

        "mediaBasica3":
            arredondar(
                media_basica3
            ),

        "mediaBasica5":
            arredondar(
                media_basica5
            ),

        "mediaBasica10":
            arredondar(
                media_basica10
            ),

        "taxaBasica3Mais":
            arredondar(
                taxa_basica_3
            ),

        "taxaBasica5Mais":
            arredondar(
                taxa_basica_5
            ),

        "dependenciaGolAssistenciaSG":
            arredondar(
                dependencia_decisivos
            ),

        "mediaOfensivaScouts":
            arredondar(
                media(
                    ofensivos
                )
            ),

        "mediaDefensivaScouts":
            arredondar(
                media(
                    defensivos
                )
            ),

        # ======================================
        # SCOUTS MÉDIOS
        # ======================================

        "scoutG":
            arredondar(
                scouts.get(
                    "G",
                    0
                )
            ),

        "scoutA":
            arredondar(
                scouts.get(
                    "A",
                    0
                )
            ),

        "scoutDS":
            arredondar(
                scouts.get(
                    "DS",
                    0
                )
            ),

        "scoutFS":
            arredondar(
                scouts.get(
                    "FS",
                    0
                )
            ),

        "scoutFF":
            arredondar(
                scouts.get(
                    "FF",
                    0
                )
            ),

        "scoutFD":
            arredondar(
                scouts.get(
                    "FD",
                    0
                )
            ),

        "scoutFT":
            arredondar(
                scouts.get(
                    "FT",
                    0
                )
            ),

        "scoutSG":
            arredondar(
                scouts.get(
                    "SG",
                    0
                )
            ),

        "scoutDE":
            arredondar(
                scouts.get(
                    "DE",
                    0
                )
            ),

        "scoutCA":
            arredondar(
                scouts.get(
                    "CA",
                    0
                )
            ),

        "scoutFC":
            arredondar(
                scouts.get(
                    "FC",
                    0
                )
            ),

    }


# ======================================================
# CONTEXTO DA RODADA
# ======================================================


def contexto_rodada(
    registro: dict[str, Any],
) -> dict[str, Any]:

    mando = registro.get(
        "mando"
    )

    if mando is True:

        mando_num = 1

    elif mando is False:

        mando_num = 0

    else:

        mando_num = None


    return {

        "preco":
            arredondar(
                registro.get(
                    "preco"
                )
            ),

        "variacao":
            arredondar(
                registro.get(
                    "variacao"
                )
            ),

        "mando":
            mando_num,

        "statusId":
            registro.get(
                "statusId"
            ),

        "minutosEsperados":
            arredondar(
                registro.get(
                    "minutosEsperados"
                )
            ),

        "titularidade":
            arredondar(
                registro.get(
                    "titularidade"
                )
            ),

        "forcaAdversarioIndice":
            arredondar(
                registro.get(
                    "forcaAdversarioIndice"
                )
            ),

        "notaForcaAdversario":
            arredondar(
                registro.get(
                    "notaForcaAdversario"
                )
            ),

        "pontosCedidosMediaPosicao":
            arredondar(
                registro.get(
                    "pontosCedidosMediaPosicao"
                )
            ),

        "pontosCedidosNota":
            arredondar(
                registro.get(
                    "pontosCedidosNota"
                )
            ),

        "chanceSG":
            arredondar(
                registro.get(
                    "chanceSG"
                )
            ),

    }


# ======================================================
# PROCESSAMENTO DE UM JOGADOR
# ======================================================


def processar_jogador(
    jogador: dict[str, Any],
) -> list[dict[str, Any]]:

    historico = jogador.get(
        "historico",
        []
    )

    if not isinstance(
        historico,
        list,
    ):

        return []


    historico = sorted(

        [

            item

            for item
            in historico

            if isinstance(
                item,
                dict,
            )

        ],

        key=lambda item:
            int(
                item.get(
                    "rodada",
                    999,
                )
            ),

    )


    linhas = []


    for indice, atual in enumerate(
        historico
    ):

        rodada = atual.get(
            "rodada"
        )

        alvo = numero(
            atual.get(
                "pontos"
            )
        )


        # Sem resultado real não existe target
        # para treinamento/backtest.

        if alvo is None:

            continue


        # ==========================================
        # CRÍTICO:
        #
        # SOMENTE RODADAS ANTERIORES.
        #
        # NUNCA incluir a rodada atual aqui.
        # ==========================================

        passado = historico[
            :indice
        ]


        passado_valido = (
            registros_com_pontos(
                passado
            )
        )


        if len(
            passado_valido
        ) < MINIMO_JOGOS:

            continue


        features = (
            calcular_features_historicas(
                passado_valido
            )
        )


        if not features:

            continue


        contexto = contexto_rodada(
            atual
        )


        linha = {

            "atletaId":
                jogador.get(
                    "id"
                ),

            "nome":
                jogador.get(
                    "nome"
                ),

            "apelido":
                jogador.get(
                    "apelido"
                )
                or
                jogador.get(
                    "nome"
                ),

            "posicao":
                jogador.get(
                    "posicao"
                ),

            "posicaoId":
                jogador.get(
                    "posicaoId"
                ),

            "rodada":
                rodada,

            "clube":
                atual.get(
                    "siglaClube"
                )
                or
                atual.get(
                    "clube"
                ),

            "adversario":
                atual.get(
                    "siglaAdversario"
                )
                or
                atual.get(
                    "adversario"
                ),

            "features":
                {
                    **features,
                    **contexto,
                },

            # ======================================
            # TARGET
            # ======================================

            "target": {

                "pontuacaoReal":
                    arredondar(
                        alvo
                    ),

                "explodiu10":
                    1
                    if alvo >= 10
                    else 0,

                "explodiu15":
                    1
                    if alvo >= 15
                    else 0,

                "pontuacaoNegativa":
                    1
                    if alvo < 0
                    else 0,

                "pontuacaoBasicaReal":
                    arredondar(
                        pontuacao_basica_registro(
                            atual
                        )
                    ),

            },

        }


        linhas.append(
            linha
        )


    return linhas


# ======================================================
# EXECUÇÃO
# ======================================================


def executar() -> None:

    PASTA_SAIDA.mkdir(
        parents=True,
        exist_ok=True,
    )


    arquivos = sorted(
        PASTA_BASE.glob(
            "*.json"
        )
    )


    print(
        "============================================"
    )

    print(
        "MATRIZ CIENTÍFICA DE FEATURES"
    )

    print(
        "============================================"
    )

    print(
        "Jogadores encontrados:",
        len(arquivos),
    )


    linhas = []


    for indice, arquivo in enumerate(
        arquivos,
        start=1,
    ):

        try:

            jogador = carregar_json(
                arquivo
            )

        except Exception as erro:

            print(
                "Erro lendo",
                arquivo.name,
                ":",
                erro,
            )

            continue


        if not isinstance(
            jogador,
            dict,
        ):

            continue


        linhas_jogador = (
            processar_jogador(
                jogador
            )
        )


        linhas.extend(
            linhas_jogador
        )


        if indice % 250 == 0:

            print(
                f"{indice} jogadores processados..."
            )


    # ==========================================
    # ORDENAÇÃO
    # ==========================================

    linhas.sort(

        key=lambda item: (

            int(
                item.get(
                    "rodada",
                    999,
                )
            ),

            str(
                item.get(
                    "posicao",
                    ""
                )
            ),

            str(
                item.get(
                    "apelido",
                    ""
                )
            ),

        )

    )


    # ==========================================
    # RESUMO
    # ==========================================

    rodadas = sorted({

        int(
            linha["rodada"]
        )

        for linha
        in linhas

        if linha.get(
            "rodada"
        ) is not None

    })


    posicoes: dict[
        str,
        int
    ] = {}


    for linha in linhas:

        posicao = (
            linha.get(
                "posicao"
            )
            or
            "OUT"
        )

        posicoes[
            posicao
        ] = (

            posicoes.get(
                posicao,
                0,
            )

            +
            1

        )


    explosoes10 = sum(

        linha[
            "target"
        ][
            "explodiu10"
        ]

        for linha
        in linhas

    )


    explosoes15 = sum(

        linha[
            "target"
        ][
            "explodiu15"
        ]

        for linha
        in linhas

    )


    negativos = sum(

        linha[
            "target"
        ][
            "pontuacaoNegativa"
        ]

        for linha
        in linhas

    )


    resultado = {

        "modelo":
            "matriz_features_v1",

        "antiLeakage":
            True,

        "regraTemporal":
            (
                "Features da rodada R usam "
                "somente resultados das rodadas < R."
            ),

        "descricaoPontuacaoBasica":
            (
                "Pontuação histórica calculada "
                "sem gol, assistência e saldo de gols."
            ),

        "resumo": {

            "jogadoresBase":
                len(
                    arquivos
                ),

            "amostras":
                len(
                    linhas
                ),

            "rodadas":
                rodadas,

            "primeiraRodada":
                min(
                    rodadas
                )
                if rodadas
                else None,

            "ultimaRodada":
                max(
                    rodadas
                )
                if rodadas
                else None,

            "explosoes10":
                explosoes10,

            "explosoes15":
                explosoes15,

            "pontuacoesNegativas":
                negativos,

            "posicoes":
                posicoes,

        },

        "linhas":
            linhas,

    }


    salvar_json(
        ARQUIVO_SAIDA,
        resultado,
    )


    print(
        ""
    )

    print(
        "============================================"
    )

    print(
        "MATRIZ GERADA COM SUCESSO"
    )

    print(
        "============================================"
    )

    print(
        "Amostras:",
        len(linhas),
    )

    print(
        "Rodadas:",
        len(rodadas),
    )

    if rodadas:

        print(
            "Intervalo:",
            rodadas[0],
            "até",
            rodadas[-1],
        )

    print(
        "Explosões 10+:",
        explosoes10,
    )

    print(
        "Explosões 15+:",
        explosoes15,
    )

    print(
        "Pontuações negativas:",
        negativos,
    )

    print(
        "Posições:",
        posicoes,
    )

    print(
        ""
    )

    print(
        "Anti-leakage temporal: ATIVO"
    )

    print(
        "Saída:",
        ARQUIVO_SAIDA,
    )

    print(
        "============================================"
    )


if __name__ == "__main__":

    executar()
