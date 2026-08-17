"""
=========================================================
CARTOLA ESTATÍSTICO
GERADOR DE BASE PARA OTIMIZAÇÃO POR PATRIMÔNIO
=========================================================

Objetivo:

Preparar os dados necessários para que o SITE consiga
montar uma escalação dinamicamente de acordo com o
patrimônio informado pelo usuário.

Exemplo:

Patrimônio informado:
C$ 143,72

O site poderá montar:

- Conservador
- Equilibrado
- Agressivo

respeitando EXATAMENTE o orçamento disponível.

IMPORTANTE:

Este script NÃO faz backtest histórico.

Ele trabalha SOMENTE com a rodada atual/próxima rodada
disponível na API.

O processamento pesado fica no GitHub Actions.

O navegador recebe uma base já preparada e executa
apenas a otimização final para o patrimônio informado.

Gera:

data/otimizador-rodada.json

=========================================================
"""

from __future__ import annotations

import json
import math

from pathlib import Path
from statistics import mean
from typing import Any


# ======================================================
# CAMINHOS
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

PASTA_API = (
    PASTA_DATA /
    "api"
)

PASTA_BASE_HISTORICA = (
    PASTA_DATA /
    "base-historica"
)

ARQUIVO_STATUS = (
    PASTA_API /
    "status.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "otimizador-rodada.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================

VERSAO = (
    "otimizador_rodada_v1"
)

LIMITE_JOGADORES_CLUBE = 3

QUANTIDADE_MINIMA_HISTORICO = 1

ULTIMOS_JOGOS_FORMA = 5


# ======================================================
# POSIÇÕES
# ======================================================

POSICOES_POR_ID = {

    1:
        "GOL",

    2:
        "LAT",

    3:
        "ZAG",

    4:
        "MEI",

    5:
        "ATA",

    6:
        "TEC",

}


# ======================================================
# FORMAÇÕES
# ======================================================

FORMACOES = {

    "3-4-3": {

        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 3,
        "TEC": 1,

    },

    "3-5-2": {

        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 5,
        "ATA": 2,
        "TEC": 1,

    },

    "4-3-3": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 3,
        "ATA": 3,
        "TEC": 1,

    },

    "4-4-2": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 4,
        "ATA": 2,
        "TEC": 1,

    },

    "4-5-1": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 5,
        "ATA": 1,
        "TEC": 1,

    },

    "5-3-2": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 3,
        "MEI": 3,
        "ATA": 2,
        "TEC": 1,

    },

    "5-4-1": {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 1,
        "TEC": 1,

    },

}


# ======================================================
# ESTRATÉGIAS
# ======================================================

ESTRATEGIAS = {

    "conservador": {

        "nome":
            "Conservador",

        "formacaoPreferida":
            "4-4-2",

        "pesoProjecao":
            0.40,

        "pesoMedia":
            0.20,

        "pesoForma":
            0.15,

        "pesoRegularidade":
            0.20,

        "pesoCustoBeneficio":
            0.05,

        "pesoExplosao":
            0.00,

        "pesoDiferencial":
            0.00,

    },

    "equilibrado": {

        "nome":
            "Equilibrado",

        "formacaoPreferida":
            "3-4-3",

        "pesoProjecao":
            0.45,

        "pesoMedia":
            0.15,

        "pesoForma":
            0.15,

        "pesoRegularidade":
            0.10,

        "pesoCustoBeneficio":
            0.05,

        "pesoExplosao":
            0.05,

        "pesoDiferencial":
            0.05,

    },

    "agressivo": {

        "nome":
            "Agressivo",

        "formacaoPreferida":
            "3-4-3",

        "pesoProjecao":
            0.40,

        "pesoMedia":
            0.10,

        "pesoForma":
            0.10,

        "pesoRegularidade":
            0.00,

        "pesoCustoBeneficio":
            0.05,

        "pesoExplosao":
            0.20,

        "pesoDiferencial":
            0.15,

    },

}


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(
    caminho: Path,
):

    if not caminho.exists():

        return None

    try:

        with open(
            caminho,
            "r",
            encoding="utf-8",
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception as erro:

        print(
            "[ERRO] Não foi possível carregar:",
            caminho,
        )

        print(
            "       ",
            erro,
        )

        return None


def salvar_json(
    caminho: Path,
    dados,
):

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        caminho,
        "w",
        encoding="utf-8",
    ) as arquivo:

        json.dump(
            dados,
            arquivo,
            ensure_ascii=False,
            indent=2,
        )


def numero(
    valor: Any,
    padrao: float = 0.0,
) -> float:

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
    valor: Any,
    padrao: int = 0,
) -> int:

    try:

        return int(
            valor
        )

    except Exception:

        return padrao


def arredondar(
    valor: Any,
    casas: int = 2,
) -> float:

    return round(
        numero(
            valor
        ),
        casas,
    )


def limitar(
    valor,
    minimo,
    maximo,
):

    return max(
        minimo,
        min(
            maximo,
            valor,
        ),
    )


# ======================================================
# STATUS
# ======================================================

def carregar_status():

    dados = carregar_json(
        ARQUIVO_STATUS
    )

    if not isinstance(
        dados,
        dict,
    ):

        raise RuntimeError(
            "data/api/status.json "
            "não encontrado ou inválido."
        )

    rodada = inteiro(
        dados.get(
            "rodada_atual"
        )
        or dados.get(
            "rodadaAtual"
        )
        or dados.get(
            "rodada"
        )
    )

    if rodada <= 0:

        raise RuntimeError(
            "Não foi possível determinar "
            "a rodada atual."
        )

    return (
        dados,
        rodada,
    )


# ======================================================
# LOCALIZAR JOGADORES DA RODADA
# ======================================================

def localizar_arquivo_jogadores(
    rodada,
):

    candidatos = [

        (
            PASTA_API /
            f"rodada-{rodada:02d}" /
            "jogadores.json"
        ),

        (
            PASTA_API /
            f"rodada-{rodada}" /
            "jogadores.json"
        ),

    ]

    for caminho in candidatos:

        if caminho.exists():

            return caminho

    return None


def carregar_jogadores_rodada(
    rodada,
):

    caminho = localizar_arquivo_jogadores(
        rodada
    )

    if caminho is None:

        raise RuntimeError(
            (
                "jogadores.json não encontrado "
                f"para a rodada {rodada}."
            )
        )

    dados = carregar_json(
        caminho
    )

    if isinstance(
        dados,
        list,
    ):

        return (
            dados,
            caminho,
        )

    if isinstance(
        dados,
        dict,
    ):

        jogadores = (
            dados.get(
                "jogadores"
            )
            or dados.get(
                "atletas"
            )
        )

        if isinstance(
            jogadores,
            list,
        ):

            return (
                jogadores,
                caminho,
            )

    raise RuntimeError(
        (
            "Formato inválido em "
            f"{caminho}"
        )
    )


# ======================================================
# POSIÇÃO
# ======================================================

def obter_posicao(
    jogador,
):

    valor = (
        jogador.get(
            "posicao"
        )
        or jogador.get(
            "posicaoAbreviacao"
        )
        or jogador.get(
            "posicao_abreviacao"
        )
    )

    if valor:

        texto = (
            str(valor)
            .strip()
            .upper()
        )

        if texto in {
            "GOL",
            "LAT",
            "ZAG",
            "MEI",
            "ATA",
            "TEC",
        }:

            return texto

    posicao_id = inteiro(
        jogador.get(
            "posicaoId"
        )
        or jogador.get(
            "posicao_id"
        )
    )

    return POSICOES_POR_ID.get(
        posicao_id,
        "",
    )


# ======================================================
# HISTÓRICO
# ======================================================

def carregar_historico(
    jogador_id,
):

    if jogador_id is None:

        return []

    caminho = (
        PASTA_BASE_HISTORICA /
        f"{jogador_id}.json"
    )

    dados = carregar_json(
        caminho
    )

    if not isinstance(
        dados,
        dict,
    ):

        return []

    historico = dados.get(
        "historico",
        []
    )

    if not isinstance(
        historico,
        list,
    ):

        return []

    return historico


def obter_pontos_historicos(
    historico,
):

    pontos = []

    for registro in historico:

        if not isinstance(
            registro,
            dict,
        ):

            continue

        valor = (
            registro.get(
                "pontos"
            )
        )

        if valor is None:

            valor = (
                registro.get(
                    "pontuacao"
                )
            )

        if valor is None:

            valor = (
                registro.get(
                    "pontuacaoReal"
                )
            )

        if valor is None:

            continue

        pontos.append(
            numero(
                valor
            )
        )

    return pontos


# ======================================================
# MÉTRICAS
# ======================================================

def calcular_media(
    valores,
):

    if not valores:

        return 0.0

    return mean(
        valores
    )


def calcular_desvio(
    valores,
):

    if len(
        valores
    ) < 2:

        return 0.0

    media_valores = calcular_media(
        valores
    )

    variancia = sum(

        (
            valor -
            media_valores
        ) ** 2

        for valor in valores

    ) / len(
        valores
    )

    return math.sqrt(
        variancia
    )


def calcular_regularidade(
    valores,
):

    if not valores:

        return 0.0

    media_valores = calcular_media(
        valores
    )

    if media_valores == 0:

        return 0.0

    desvio = calcular_desvio(
        valores
    )

    regularidade = (

        100.0 -

        (
            desvio /
            abs(
                media_valores
            )
        ) *
        100.0

    )

    return limitar(
        regularidade,
        0.0,
        100.0,
    )


def calcular_forma(
    valores,
):

    if not valores:

        return 0.0

    ultimos = valores[
        -ULTIMOS_JOGOS_FORMA:
    ]

    return calcular_media(
        ultimos
    )


def calcular_tendencia(
    valores,
):

    ultimos = valores[
        -ULTIMOS_JOGOS_FORMA:
    ]

    if len(
        ultimos
    ) < 2:

        return 0.0

    return (
        ultimos[-1] -
        ultimos[0]
    )


# ======================================================
# PROJEÇÃO
# ======================================================

def obter_projecao(
    jogador,
    media_historica,
    forma,
):

    candidatos = [

        jogador.get(
            "projecao"
        ),

        jogador.get(
            "score"
        ),

        jogador.get(
            "pontuacaoProjetada"
        ),

        jogador.get(
            "media"
        ),

    ]

    for valor in candidatos:

        if valor is None:
            continue

        valor_numero = numero(
            valor
        )

        if valor_numero != 0:

            return valor_numero

    if forma != 0:

        return forma

    return media_historica


# ======================================================
# EXPLOSÃO
# ======================================================

def obter_explosao(
    jogador,
):

    candidatos = [

        jogador.get(
            "notaExplosao"
        ),

        jogador.get(
            "potencialExplosao"
        ),

        jogador.get(
            "indiceExplosao"
        ),

    ]

    for valor in candidatos:

        if valor is not None:

            return limitar(
                numero(
                    valor
                ),
                0.0,
                100.0,
            )

    return 0.0


# ======================================================
# DIFERENCIAL
# ======================================================

def obter_diferencial(
    jogador,
):

    candidatos = [

        jogador.get(
            "indiceDiferencial"
        ),

        jogador.get(
            "diferencial"
        ),

    ]

    for valor in candidatos:

        if valor is not None:

            return limitar(
                numero(
                    valor
                ),
                0.0,
                100.0,
            )

    return 0.0


# ======================================================
# NORMALIZAÇÃO DAS MÉTRICAS
# ======================================================

def normalizar_pontuacao(
    valor,
):

    return limitar(
        (
            numero(
                valor
            ) /
            15.0
        ) *
        100.0,
        0.0,
        100.0,
    )


def calcular_custo_beneficio(
    projecao,
    preco,
):

    if preco <= 0:

        return 0.0

    indice = (
        projecao /
        preco
    )

    return limitar(
        indice *
        50.0,
        0.0,
        100.0,
    )


# ======================================================
# SCORE POR ESTRATÉGIA
# ======================================================

def calcular_score_estrategia(
    estrategia,
    projecao,
    media_historica,
    forma,
    regularidade,
    preco,
    explosao,
    diferencial,
):

    config = ESTRATEGIAS[
        estrategia
    ]

    projecao_normalizada = (
        normalizar_pontuacao(
            projecao
        )
    )

    media_normalizada = (
        normalizar_pontuacao(
            media_historica
        )
    )

    forma_normalizada = (
        normalizar_pontuacao(
            forma
        )
    )

    custo_beneficio = (
        calcular_custo_beneficio(
            projecao,
            preco,
        )
    )

    score = (

        projecao_normalizada *
        config[
            "pesoProjecao"
        ]

        +

        media_normalizada *
        config[
            "pesoMedia"
        ]

        +

        forma_normalizada *
        config[
            "pesoForma"
        ]

        +

        regularidade *
        config[
            "pesoRegularidade"
        ]

        +

        custo_beneficio *
        config[
            "pesoCustoBeneficio"
        ]

        +

        explosao *
        config[
            "pesoExplosao"
        ]

        +

        diferencial *
        config[
            "pesoDiferencial"
        ]

    )

    return limitar(
        score,
        0.0,
        100.0,
    )


# ======================================================
# JOGADOR
# ======================================================

def preparar_jogador(
    jogador,
):

    jogador_id = (
        jogador.get(
            "id"
        )
        or jogador.get(
            "atletaId"
        )
        or jogador.get(
            "atleta_id"
        )
    )

    posicao = obter_posicao(
        jogador
    )

    if not posicao:

        return None

    preco = numero(
        jogador.get(
            "preco"
        )
        or jogador.get(
            "preco_num"
        )
    )

    if preco <= 0:

        return None

    historico = carregar_historico(
        jogador_id
    )

    pontos = obter_pontos_historicos(
        historico
    )

    media_historica = calcular_media(
        pontos
    )

    forma = calcular_forma(
        pontos
    )

    tendencia = calcular_tendencia(
        pontos
    )

    regularidade = calcular_regularidade(
        pontos
    )

    projecao = obter_projecao(
        jogador,
        media_historica,
        forma,
    )

    explosao = obter_explosao(
        jogador
    )

    diferencial = obter_diferencial(
        jogador
    )

    scores = {}

    for estrategia in ESTRATEGIAS:

        scores[
            estrategia
        ] = arredondar(

            calcular_score_estrategia(

                estrategia,

                projecao,

                media_historica,

                forma,

                regularidade,

                preco,

                explosao,

                diferencial,

            ),

            4,

        )

    status_id = inteiro(
        jogador.get(
            "statusId"
        )
        or jogador.get(
            "status_id"
        )
    )

    return {

        "id":
            jogador_id,

        "nome":
            jogador.get(
                "nome"
            )
            or "",

        "apelido":
            jogador.get(
                "apelido"
            )
            or jogador.get(
                "nome"
            )
            or "",

        "foto":
            jogador.get(
                "foto"
            ),

        "posicao":
            posicao,

        "posicaoId":
            inteiro(
                jogador.get(
                    "posicaoId"
                )
                or jogador.get(
                    "posicao_id"
                )
            ),

        "clubeId":
            jogador.get(
                "clubeId"
            )
            or jogador.get(
                "clube_id"
            ),

        "clube":
            jogador.get(
                "clube"
            )
            or "",

        "siglaClube":
            jogador.get(
                "siglaClube"
            )
            or "",

        "statusId":
            status_id,

        "preco":
            arredondar(
                preco
            ),

        "media":
            arredondar(
                numero(
                    jogador.get(
                        "media"
                    )
                )
            ),

        "jogos":
            inteiro(
                jogador.get(
                    "jogos"
                )
            ),

        "projecao":
            arredondar(
                projecao
            ),

        "mediaHistorica":
            arredondar(
                media_historica
            ),

        "forma":
            arredondar(
                forma
            ),

        "tendencia":
            arredondar(
                tendencia
            ),

        "regularidade":
            arredondar(
                regularidade
            ),

        "explosao":
            arredondar(
                explosao
            ),

        "diferencial":
            arredondar(
                diferencial
            ),

        "quantidadeHistorico":
            len(
                pontos
            ),

        "scores":
            scores,

    }


# ======================================================
# AUDITORIA DA BASE
# ======================================================

def auditar_base(
    jogadores,
):

    por_posicao = {

        posicao:
            0

        for posicao in [
            "GOL",
            "LAT",
            "ZAG",
            "MEI",
            "ATA",
            "TEC",
        ]

    }

    com_historico = 0

    sem_historico = 0

    precos_validos = 0

    scores_validos = 0

    for jogador in jogadores:

        posicao = jogador.get(
            "posicao"
        )

        if posicao in por_posicao:

            por_posicao[
                posicao
            ] += 1

        if inteiro(
            jogador.get(
                "quantidadeHistorico"
            )
        ) >= QUANTIDADE_MINIMA_HISTORICO:

            com_historico += 1

        else:

            sem_historico += 1

        if numero(
            jogador.get(
                "preco"
            )
        ) > 0:

            precos_validos += 1

        scores = jogador.get(
            "scores",
            {}
        )

        if (
            isinstance(
                scores,
                dict,
            )
            and
            all(
                estrategia in scores
                for estrategia in ESTRATEGIAS
            )
        ):

            scores_validos += 1

    posicoes_suficientes = all(
        por_posicao[
            posicao
        ] > 0
        for posicao in por_posicao
    )

    aprovada = (

        bool(
            jogadores
        )

        and

        posicoes_suficientes

        and

        precos_validos ==
        len(
            jogadores
        )

        and

        scores_validos ==
        len(
            jogadores
        )

    )

    return {

        "aprovada":
            aprovada,

        "quantidadeJogadores":
            len(
                jogadores
            ),

        "porPosicao":
            por_posicao,

        "comHistorico":
            com_historico,

        "semHistorico":
            sem_historico,

        "precosValidos":
            precos_validos,

        "scoresValidos":
            scores_validos,

        "posicoesSuficientes":
            posicoes_suficientes,

    }


# ======================================================
# PROCESSAMENTO
# ======================================================

def executar():

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "BASE DO OTIMIZADOR POR PATRIMÔNIO V1"
    )

    print(
        "============================================"
    )

    status, rodada = carregar_status()

    jogadores_brutos, arquivo_origem = (
        carregar_jogadores_rodada(
            rodada
        )
    )

    print(
        "Rodada:",
        rodada,
    )

    print(
        "Arquivo:",
        arquivo_origem,
    )

    print(
        "Jogadores recebidos:",
        len(
            jogadores_brutos
        ),
    )

    jogadores = []

    ignorados = 0

    for jogador in jogadores_brutos:

        if not isinstance(
            jogador,
            dict,
        ):

            ignorados += 1
            continue

        preparado = preparar_jogador(
            jogador
        )

        if preparado is None:

            ignorados += 1
            continue

        jogadores.append(
            preparado
        )

    # ==================================================
    # ORDENAÇÃO
    # ==================================================

    jogadores.sort(

        key=lambda item: (

            item.get(
                "posicao",
                "",
            ),

            -numero(
                item.get(
                    "scores",
                    {}
                ).get(
                    "equilibrado"
                )
            ),

            -numero(
                item.get(
                    "projecao"
                )
            ),

        )

    )

    # ==================================================
    # AUDITORIA
    # ==================================================

    auditoria = auditar_base(
        jogadores
    )

    # ==================================================
    # SAÍDA
    # ==================================================

    saida = {

        "modelo":
            VERSAO,

        "descricao":
            (
                "Base otimizada para montagem "
                "dinâmica de escalações conforme "
                "o patrimônio informado no site."
            ),

        "rodada":
            rodada,

        "statusMercado":
            status.get(
                "status_mercado"
            )
            or status.get(
                "statusMercado"
            ),

        "mercadoAberto":
            status.get(
                "mercado_aberto"
            )
            if "mercado_aberto" in status
            else status.get(
                "mercadoAberto"
            ),

        "limiteJogadoresClube":
            LIMITE_JOGADORES_CLUBE,

        "quantidadeTitulares":
            12,

        "patrimonio": {

            "tipo":
                "dinamico",

            "casasDecimais":
                2,

            "exemplo":
                143.72,

            "arredondamentoFaixa":
                False,

            "descricao":
                (
                    "O valor informado pelo usuário "
                    "é utilizado exatamente como "
                    "limite máximo da escalação."
                ),

        },

        "formacoes":
            FORMACOES,

        "estrategias":
            ESTRATEGIAS,

        "quantidadeJogadoresOriginais":
            len(
                jogadores_brutos
            ),

        "quantidadeJogadoresDisponiveis":
            len(
                jogadores
            ),

        "quantidadeIgnorados":
            ignorados,

        "jogadores":
            jogadores,

        "auditoria":
            auditoria,

        "seguranca": {

            "usaHistoricoFuturo":
                False,

            "executaBacktestPatrimonio":
                False,

            "alteraModeloOficial":
                False,

            "alteraPesosOficiais":
                False,

            "alteraHistorico":
                False,

            "patrimonioSomenteProximaRodada":
                True,

        },

    }

    salvar_json(
        ARQUIVO_SAIDA,
        saida,
    )

    # ==================================================
    # LOG
    # ==================================================

    print()

    print(
        "============================================"
    )

    print(
        "BASE DO OTIMIZADOR GERADA"
    )

    print(
        "============================================"
    )

    print(
        "Rodada:",
        rodada,
    )

    print(
        "Jogadores válidos:",
        len(
            jogadores
        ),
    )

    print(
        "Jogadores ignorados:",
        ignorados,
    )

    print(
        "Por posição:",
        auditoria.get(
            "porPosicao"
        ),
    )

    print(
        "Com histórico:",
        auditoria.get(
            "comHistorico"
        ),
    )

    print(
        "Sem histórico:",
        auditoria.get(
            "semHistorico"
        ),
    )

    print(
        "Auditoria:",
        (
            "APROVADA"
            if auditoria.get(
                "aprovada"
            )
            else
            "REPROVADA"
        ),
    )

    print(
        "Arquivo:",
        ARQUIVO_SAIDA,
    )

    print(
        "============================================"
    )

    if not auditoria.get(
        "aprovada"
    ):

        raise SystemExit(
            1
        )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    executar()
