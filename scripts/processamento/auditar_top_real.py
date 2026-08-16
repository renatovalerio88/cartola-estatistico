"""
=========================================================
CARTOLA ESTATÍSTICO
AUDITORIA DA MÉTRICA TOP REAL

Versão:
auditoria_top_real_v2

Objetivo
---------------------------------------------------------
Auditar a qualidade real das escalações históricas
geradas pelo modelo.

A auditoria compara, rodada a rodada:

- jogadores efetivamente escalados;
- jogadores reais disponíveis na rodada;
- ranking real por posição;
- Top N;
- Top 5;
- Top 10;
- ranking real médio;
- percentil médio;
- eficiência de captura de pontos;
- desempenho por posição.

Fonte das escalações:
data/historico-escalacoes/rodada-XX.json

Fonte dos resultados reais:
data/historico/rodada-XX/jogadores.json
data/api/rodada-XX/jogadores.json

REGRA CIENTÍFICA
---------------------------------------------------------
A escalação da rodada R foi construída anteriormente
somente com dados disponíveis até R-1.

Esta auditoria usa o resultado real da rodada R apenas
para medir o desempenho posterior da recomendação.

Nenhuma informação futura é usada para montar o time.
=========================================================
"""

import json
import math

from collections import defaultdict
from pathlib import Path


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
    BASE_DIR
    / "data"
)

PASTA_HISTORICO_ESCALACOES = (
    PASTA_DATA
    / "historico-escalacoes"
)

PASTA_HISTORICO = (
    PASTA_DATA
    / "historico"
)

PASTA_API = (
    PASTA_DATA
    / "api"
)

ARQUIVO_SAIDA = (
    PASTA_DATA
    / "auditoria-top-real.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================

MODELO = (
    "auditoria_top_real_v2"
)

POSICOES = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC",
]

ESTRATEGIAS_VALIDAS = {
    "Conservador",
    "Equilibrado",
    "Agressivo",
}

TOP_5 = 5

TOP_10 = 10


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

    except Exception as erro:

        print(
            f"[AVISO] Falha ao carregar "
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

        if valor is None:
            return padrao

        valor = float(
            valor
        )

        if math.isfinite(
            valor
        ):

            return valor

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
            float(
                valor
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
        return 0.0

    return (
        parte
        /
        total
        *
        100
    )


def media(
    valores
):

    valores = [
        numero(
            valor
        )
        for valor in valores
    ]

    if not valores:
        return 0.0

    return (
        sum(
            valores
        )
        /
        len(
            valores
        )
    )


# ======================================================
# NORMALIZAÇÕES
# ======================================================

def normalizar_id(
    valor
):

    if valor is None:
        return ""

    try:

        numero_id = float(
            valor
        )

        if math.isfinite(
            numero_id
        ):

            if numero_id.is_integer():

                return str(
                    int(
                        numero_id
                    )
                )

    except Exception:

        pass

    return str(
        valor
    ).strip()


def normalizar_texto(
    valor
):

    if valor is None:
        return ""

    return str(
        valor
    ).strip()


def normalizar_posicao(
    valor
):

    if valor is None:
        return ""

    if isinstance(
        valor,
        dict
    ):

        for chave in [
            "abreviacao",
            "sigla",
            "nome",
        ]:

            if valor.get(
                chave
            ):

                valor = valor.get(
                    chave
                )

                break

    texto = (
        str(
            valor
        )
        .strip()
        .upper()
    )

    mapa = {
        "GOLEIRO":
            "GOL",

        "GOL":
            "GOL",

        "LATERAL":
            "LAT",

        "LAT":
            "LAT",

        "ZAGUEIRO":
            "ZAG",

        "ZAG":
            "ZAG",

        "MEIA":
            "MEI",

        "MEI":
            "MEI",

        "ATACANTE":
            "ATA",

        "ATA":
            "ATA",

        "TECNICO":
            "TEC",

        "TÉCNICO":
            "TEC",

        "TEC":
            "TEC",
    }

    if texto in mapa:

        return mapa[
            texto
        ]

    ids = {
        "1":
            "GOL",

        "2":
            "LAT",

        "3":
            "ZAG",

        "4":
            "MEI",

        "5":
            "ATA",

        "6":
            "TEC",
    }

    return ids.get(
        texto,
        texto
    )


# ======================================================
# EXTRAÇÃO DE JOGADORES
# ======================================================

def extrair_lista_jogadores(
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

    for chave in [
        "jogadores",
        "atletas",
        "pontuados",
        "resultados",
    ]:

        valor = dados.get(
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

            lista = []

            for (
                jogador_id,
                jogador
            ) in valor.items():

                if not isinstance(
                    jogador,
                    dict
                ):

                    continue

                copia = dict(
                    jogador
                )

                copia.setdefault(
                    "id",
                    jogador_id
                )

                lista.append(
                    copia
                )

            if lista:

                return lista

    return []


def obter_id(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return ""

    for chave in [
        "id",
        "atletaId",
        "atleta_id",
        "idAtleta",
        "id_atleta",
    ]:

        valor = jogador.get(
            chave
        )

        if valor is not None:

            return normalizar_id(
                valor
            )

    atleta = jogador.get(
        "atleta"
    )

    if isinstance(
        atleta,
        dict
    ):

        return obter_id(
            atleta
        )

    return ""


def obter_nome(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return ""

    for chave in [
        "nome",
        "apelido",
        "nomeAtleta",
        "nome_atleta",
    ]:

        valor = jogador.get(
            chave
        )

        if valor:

            return normalizar_texto(
                valor
            )

    return ""


def obter_posicao(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return ""

    for chave in [
        "posicao",
        "posição",
        "posicaoAbreviacao",
        "posicao_abreviacao",
        "posicaoId",
        "posicao_id",
    ]:

        valor = jogador.get(
            chave
        )

        if valor is not None:

            posicao = (
                normalizar_posicao(
                    valor
                )
            )

            if posicao:

                return posicao

    return ""


def obter_pontuacao_real(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return 0.0

    for chave in [
        "pontuacaoReal",
        "pontuacao_real",
        "pontos",
        "pontos_num",
        "pontuacao",
        "scoreReal",
        "score_real",
    ]:

        if jogador.get(
            chave
        ) is not None:

            return numero(
                jogador.get(
                    chave
                )
            )

    return 0.0


# ======================================================
# CARREGAMENTO DA BASE REAL
# ======================================================

def candidatos_jogadores_rodada(
    rodada
):

    return [
        (
            PASTA_HISTORICO
            /
            f"rodada-{rodada:02d}"
            /
            "jogadores.json"
        ),

        (
            PASTA_API
            /
            f"rodada-{rodada:02d}"
            /
            "jogadores.json"
        ),

        (
            PASTA_HISTORICO
            /
            f"rodada-{rodada:02d}.json"
        ),
    ]


def carregar_jogadores_reais(
    rodada
):

    for caminho in (
        candidatos_jogadores_rodada(
            rodada
        )
    ):

        dados = carregar_json(
            caminho
        )

        jogadores = (
            extrair_lista_jogadores(
                dados
            )
        )

        if jogadores:

            return jogadores

    return []


# ======================================================
# ESCALAÇÕES HISTÓRICAS
# ======================================================

def descobrir_rodadas(
):

    rodadas = []

    if not PASTA_HISTORICO_ESCALACOES.exists():

        return rodadas

    for caminho in (
        PASTA_HISTORICO_ESCALACOES
        .glob(
            "rodada-*.json"
        )
    ):

        nome = caminho.stem

        numero_texto = (
            nome.replace(
                "rodada-",
                ""
            )
        )

        try:

            rodada = int(
                numero_texto
            )

        except Exception:

            continue

        rodadas.append(
            rodada
        )

    return sorted(
        set(
            rodadas
        )
    )


def carregar_escalacao_rodada(
    rodada
):

    caminho = (
        PASTA_HISTORICO_ESCALACOES
        /
        f"rodada-{rodada:02d}.json"
    )

    dados = carregar_json(
        caminho
    )

    if not isinstance(
        dados,
        dict
    ):

        return None

    return dados


def extrair_estrategias(
    dados
):

    if not isinstance(
        dados,
        dict
    ):

        return []

    valor = dados.get(
        "estrategias"
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

        resultado = []

        for (
            nome,
            estrategia
        ) in valor.items():

            if not isinstance(
                estrategia,
                dict
            ):

                continue

            copia = dict(
                estrategia
            )

            copia.setdefault(
                "nome",
                nome
            )

            resultado.append(
                copia
            )

        return resultado

    return []


def obter_nome_estrategia(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):

        return ""

    for chave in [
        "nome",
        "perfil",
        "id",
    ]:

        valor = estrategia.get(
            chave
        )

        if not valor:
            continue

        texto = (
            str(
                valor
            )
            .strip()
            .lower()
        )

        mapa = {
            "conservador":
                "Conservador",

            "equilibrado":
                "Equilibrado",

            "agressivo":
                "Agressivo",
        }

        if texto in mapa:

            return mapa[
                texto
            ]

    return ""


def extrair_titulares(
    estrategia
):

    if not isinstance(
        estrategia,
        dict
    ):

        return []

    for chave in [
        "titulares",
        "jogadores",
        "atletas",
    ]:

        valor = estrategia.get(
            chave
        )

        if isinstance(
            valor,
            list
        ):

            return valor

    return []


# ======================================================
# COLD START
# ======================================================

def possui_historico(
    jogador
):

    if not isinstance(
        jogador,
        dict
    ):

        return False

    historico = jogador.get(
        "historico"
    )

    if not isinstance(
        historico,
        dict
    ):

        # Compatibilidade com arquivos antigos:
        # se não houver campo histórico, não excluímos.
        return True

    jogos = inteiro(
        historico.get(
            "jogos"
        )
    )

    return jogos > 0


# ======================================================
# BASE REAL NORMALIZADA
# ======================================================

def normalizar_base_real(
    jogadores
):

    resultado = []

    ids_vistos = set()

    for jogador in jogadores:

        jogador_id = obter_id(
            jogador
        )

        if not jogador_id:
            continue

        posicao = obter_posicao(
            jogador
        )

        if posicao not in POSICOES:
            continue

        chave = (
            jogador_id,
            posicao
        )

        if chave in ids_vistos:
            continue

        ids_vistos.add(
            chave
        )

        resultado.append(
            {
                "id":
                    jogador_id,

                "nome":
                    obter_nome(
                        jogador
                    ),

                "posicao":
                    posicao,

                "pontos":
                    obter_pontuacao_real(
                        jogador
                    ),
            }
        )

    return resultado


def indexar_base_real(
    jogadores
):

    return {
        jogador[
            "id"
        ]:
            jogador

        for jogador in jogadores
    }


# ======================================================
# RANKING REAL
# ======================================================

def montar_rankings_reais(
    jogadores
):

    rankings = {}

    for posicao in POSICOES:

        lista = [
            jogador
            for jogador in jogadores
            if jogador[
                "posicao"
            ] == posicao
        ]

        lista.sort(
            key=lambda jogador:
                (
                    jogador[
                        "pontos"
                    ],
                    jogador[
                        "id"
                    ]
                ),
            reverse=True
        )

        rankings[
            posicao
        ] = lista

    return rankings


def localizar_ranking(
    jogador_id,
    posicao,
    rankings
):

    lista = rankings.get(
        posicao,
        []
    )

    for indice, jogador in enumerate(
        lista,
        start=1
    ):

        if (
            jogador[
                "id"
            ]
            ==
            jogador_id
        ):

            return (
                indice,
                len(
                    lista
                )
            )

    return (
        None,
        len(
            lista
        )
    )


def calcular_percentil(
    ranking,
    quantidade
):

    if (
        ranking is None
        or
        quantidade <= 0
    ):

        return None

    if quantidade == 1:
        return 100.0

    return (
        (
            quantidade
            -
            ranking
        )
        /
        (
            quantidade
            -
            1
        )
        *
        100
    )


# ======================================================
# TOP N
# ======================================================

def quantidade_escalados_posicao(
    titulares,
    posicao
):

    return sum(
        1
        for jogador in titulares
        if obter_posicao(
            jogador
        ) == posicao
    )


def pertence_top_n(
    ranking,
    quantidade_escalados
):

    if ranking is None:
        return False

    if quantidade_escalados <= 0:
        return False

    return (
        ranking
        <=
        quantidade_escalados
    )


# ======================================================
# TIME PERFEITO
# ======================================================

def calcular_time_perfeito(
    rankings,
    titulares
):

    total = 0.0

    for posicao in POSICOES:

        quantidade = (
            quantidade_escalados_posicao(
                titulares,
                posicao
            )
        )

        if quantidade <= 0:
            continue

        melhores = (
            rankings.get(
                posicao,
                []
            )[
                :quantidade
            ]
        )

        total += sum(
            numero(
                jogador[
                    "pontos"
                ]
            )
            for jogador in melhores
        )

    return total


# ======================================================
# ACUMULADORES
# ======================================================

def novo_acumulador():

    return {
        "escalados":
            0,

        "identificados":
            0,

        "topN":
            0,

        "top5":
            0,

        "top10":
            0,

        "rankings":
            [],

        "percentis":
            [],

        "pontosEscalados":
            0.0,

        "pontosPerfeitos":
            0.0,
    }


def acumular_jogador(
    acumulador,
    identificado,
    ranking=None,
    percentil_real=None,
    top_n=False,
    top_5=False,
    top_10=False
):

    acumulador[
        "escalados"
    ] += 1

    if not identificado:
        return

    acumulador[
        "identificados"
    ] += 1

    if ranking is not None:

        acumulador[
            "rankings"
        ].append(
            ranking
        )

    if percentil_real is not None:

        acumulador[
            "percentis"
        ].append(
            percentil_real
        )

    if top_n:

        acumulador[
            "topN"
        ] += 1

    if top_5:

        acumulador[
            "top5"
        ] += 1

    if top_10:

        acumulador[
            "top10"
        ] += 1


def finalizar_acumulador(
    acumulador
):

    escalados = (
        acumulador[
            "escalados"
        ]
    )

    identificados = (
        acumulador[
            "identificados"
        ]
    )

    pontos_perfeitos = numero(
        acumulador[
            "pontosPerfeitos"
        ]
    )

    pontos_escalados = numero(
        acumulador[
            "pontosEscalados"
        ]
    )

    return {
        "escalados":
            escalados,

        "identificados":
            identificados,

        "taxaIdentificacaoPercentual":
            arredondar(
                percentual(
                    identificados,
                    escalados
                )
            ),

        "topNPercentual":
            arredondar(
                percentual(
                    acumulador[
                        "topN"
                    ],
                    identificados
                )
            ),

        "top5Percentual":
            arredondar(
                percentual(
                    acumulador[
                        "top5"
                    ],
                    identificados
                )
            ),

        "top10Percentual":
            arredondar(
                percentual(
                    acumulador[
                        "top10"
                    ],
                    identificados
                )
            ),

        "rankingRealMedio":
            arredondar(
                media(
                    acumulador[
                        "rankings"
                    ]
                )
            ),

        "percentilMedio":
            arredondar(
                media(
                    acumulador[
                        "percentis"
                    ]
                )
            ),

        "pontosEscalados":
            arredondar(
                pontos_escalados
            ),

        "pontosTimePerfeito":
            arredondar(
                pontos_perfeitos
            ),

        "eficienciaCapturaPercentual":
            arredondar(
                percentual(
                    pontos_escalados,
                    pontos_perfeitos
                )
            ),
    }


# ======================================================
# PROCESSAMENTO DE UMA ESTRATÉGIA
# ======================================================

def processar_estrategia(
    estrategia,
    base_real,
    rankings,
    acumulador_global,
    acumuladores_posicao
):

    titulares_originais = (
        extrair_titulares(
            estrategia
        )
    )

    # Retira apenas o cold start verdadeiro.
    titulares = [
        jogador
        for jogador in titulares_originais
        if possui_historico(
            jogador
        )
    ]

    if not titulares:
        return {
            "escalados":
                0,

            "identificados":
                0,

            "pontosEscalados":
                0.0,

            "pontosPerfeitos":
                0.0,
        }

    pontos_time = 0.0

    pontos_perfeito = (
        calcular_time_perfeito(
            rankings,
            titulares
        )
    )

    identificados = 0

    for jogador in titulares:

        jogador_id = obter_id(
            jogador
        )

        posicao = obter_posicao(
            jogador
        )

        if not jogador_id:
            continue

        if posicao not in POSICOES:
            continue

        real = base_real.get(
            jogador_id
        )

        identificado = (
            real is not None
        )

        quantidade_posicao = (
            quantidade_escalados_posicao(
                titulares,
                posicao
            )
        )

        ranking = None

        quantidade_ranking = 0

        percentil_real = None

        top_n = False

        top_5 = False

        top_10 = False

        if identificado:

            identificados += 1

            pontos_reais = numero(
                real.get(
                    "pontos"
                )
            )

            pontos_time += (
                pontos_reais
            )

            (
                ranking,
                quantidade_ranking
            ) = localizar_ranking(
                jogador_id,
                posicao,
                rankings
            )

            percentil_real = (
                calcular_percentil(
                    ranking,
                    quantidade_ranking
                )
            )

            top_n = pertence_top_n(
                ranking,
                quantidade_posicao
            )

            top_5 = (
                ranking is not None
                and
                ranking <= TOP_5
            )

            top_10 = (
                ranking is not None
                and
                ranking <= TOP_10
            )

        acumular_jogador(
            acumulador_global,
            identificado,
            ranking,
            percentil_real,
            top_n,
            top_5,
            top_10
        )

        acumular_jogador(
            acumuladores_posicao[
                posicao
            ],
            identificado,
            ranking,
            percentil_real,
            top_n,
            top_5,
            top_10
        )

    acumulador_global[
        "pontosEscalados"
    ] += pontos_time

    acumulador_global[
        "pontosPerfeitos"
    ] += pontos_perfeito

    for posicao in POSICOES:

        titulares_posicao = [
            jogador
            for jogador in titulares
            if obter_posicao(
                jogador
            ) == posicao
        ]

        if not titulares_posicao:
            continue

        quantidade = len(
            titulares_posicao
        )

        perfeito_posicao = sum(
            numero(
                jogador[
                    "pontos"
                ]
            )
            for jogador in (
                rankings.get(
                    posicao,
                    []
                )[
                    :quantidade
                ]
            )
        )

        pontos_posicao = 0.0

        for jogador in titulares_posicao:

            jogador_id = obter_id(
                jogador
            )

            real = base_real.get(
                jogador_id
            )

            if real:

                pontos_posicao += numero(
                    real.get(
                        "pontos"
                    )
                )

        acumuladores_posicao[
            posicao
        ][
            "pontosEscalados"
        ] += pontos_posicao

        acumuladores_posicao[
            posicao
        ][
            "pontosPerfeitos"
        ] += perfeito_posicao

    return {
        "escalados":
            len(
                titulares
            ),

        "identificados":
            identificados,

        "pontosEscalados":
            arredondar(
                pontos_time
            ),

        "pontosPerfeitos":
            arredondar(
                pontos_perfeito
            ),
    }


# ======================================================
# PROCESSAMENTO PRINCIPAL
# ======================================================

def processar():

    print(
        "============================================"
    )

    print(
        "AUDITORIA DA MÉTRICA TOP REAL"
    )

    print(
        "============================================"
    )

    rodadas = descobrir_rodadas()

    acumulador_global = (
        novo_acumulador()
    )

    acumuladores_posicao = {
        posicao:
            novo_acumulador()

        for posicao in POSICOES
    }

    detalhes_rodadas = []

    rodadas_validas = 0

    rodadas_ignoradas = []

    for rodada in rodadas:

        arquivo_escalacao = (
            carregar_escalacao_rodada(
                rodada
            )
        )

        jogadores_reais_brutos = (
            carregar_jogadores_reais(
                rodada
            )
        )

        jogadores_reais = (
            normalizar_base_real(
                jogadores_reais_brutos
            )
        )

        estrategias = (
            extrair_estrategias(
                arquivo_escalacao
            )
        )

        estrategias = [
            estrategia
            for estrategia in estrategias
            if obter_nome_estrategia(
                estrategia
            ) in ESTRATEGIAS_VALIDAS
        ]

        if (
            not jogadores_reais
            or
            not estrategias
        ):

            rodadas_ignoradas.append(
                rodada
            )

            print(
                f"[IGNORADA] Rodada "
                f"{rodada:02d}"
                f" | jogadores reais: "
                f"{len(jogadores_reais)}"
                f" | estratégias: "
                f"{len(estrategias)}"
            )

            continue

        rodadas_validas += 1

        base_real = (
            indexar_base_real(
                jogadores_reais
            )
        )

        rankings = (
            montar_rankings_reais(
                jogadores_reais
            )
        )

        detalhes_estrategias = []

        for estrategia in estrategias:

            nome = (
                obter_nome_estrategia(
                    estrategia
                )
            )

            resultado_estrategia = (
                processar_estrategia(
                    estrategia,
                    base_real,
                    rankings,
                    acumulador_global,
                    acumuladores_posicao
                )
            )

            resultado_estrategia[
                "nome"
            ] = nome

            detalhes_estrategias.append(
                resultado_estrategia
            )

        detalhes_rodadas.append(
            {
                "rodada":
                    rodada,

                "quantidadeJogadoresReais":
                    len(
                        jogadores_reais
                    ),

                "quantidadeEstrategias":
                    len(
                        estrategias
                    ),

                "estrategias":
                    detalhes_estrategias,
            }
        )

        print(
            f"[OK] Rodada "
            f"{rodada:02d}"
            f" | Jogadores reais: "
            f"{len(jogadores_reais)}"
            f" | Estratégias: "
            f"{len(estrategias)}"
        )

    # ==================================================
    # RESULTADOS
    # ==================================================

    resultado_global = (
        finalizar_acumulador(
            acumulador_global
        )
    )

    resultado_posicoes = {
        posicao:
            finalizar_acumulador(
                acumuladores_posicao[
                    posicao
                ]
            )

        for posicao in POSICOES
    }

    taxa_identificacao = numero(
        resultado_global[
            "taxaIdentificacaoPercentual"
        ]
    )

    top_n = numero(
        resultado_global[
            "topNPercentual"
        ]
    )

    top_5 = numero(
        resultado_global[
            "top5Percentual"
        ]
    )

    top_10 = numero(
        resultado_global[
            "top10Percentual"
        ]
    )

    percentil_medio = numero(
        resultado_global[
            "percentilMedio"
        ]
    )

    eficiencia = numero(
        resultado_global[
            "eficienciaCapturaPercentual"
        ]
    )

    diagnosticos = []

    # ==================================================
    # DIAGNÓSTICOS
    # ==================================================

    if (
        resultado_global[
            "escalados"
        ] == 0
    ):

        diagnosticos.append(
            {
                "nivel":
                    "CRITICO",

                "mensagem":
                    (
                        "Nenhum jogador histórico "
                        "elegível foi localizado após "
                        "a remoção do cold start."
                    ),
            }
        )

    elif taxa_identificacao < 95:

        diagnosticos.append(
            {
                "nivel":
                    "CRITICO",

                "mensagem":
                    (
                        "A taxa de identificação entre "
                        "jogadores escalados e base real "
                        f"é de apenas "
                        f"{arredondar(taxa_identificacao)}%. "
                        "A métrica Top Real não deve ser "
                        "usada para calibrar pesos antes "
                        "da correção."
                    ),
            }
        )

    else:

        diagnosticos.append(
            {
                "nivel":
                    "OK",

                "mensagem":
                    (
                        "A identificação entre as "
                        "escalações históricas e a base "
                        "real está em nível adequado: "
                        f"{arredondar(taxa_identificacao)}%."
                    ),
            }
        )

    diagnosticos.append(
        {
            "nivel":
                "INFORMATIVO",

            "mensagem":
                (
                    f"Top N exato: "
                    f"{arredondar(top_n)}%. "
                    f"Top 5: "
                    f"{arredondar(top_5)}%. "
                    f"Top 10: "
                    f"{arredondar(top_10)}%."
                ),
        }
    )

    diagnosticos.append(
        {
            "nivel":
                "INFORMATIVO",

            "mensagem":
                (
                    "O jogador escalado médio está "
                    f"no percentil "
                    f"{arredondar(percentil_medio)} "
                    "da sua posição."
                ),
        }
    )

    diagnosticos.append(
        {
            "nivel":
                "INFORMATIVO",

            "mensagem":
                (
                    "A eficiência global de captura "
                    "de pontos em relação ao time "
                    f"perfeito é "
                    f"{arredondar(eficiencia)}%."
                ),
        }
    )

    auditoria_valida = (
        resultado_global[
            "escalados"
        ] > 0
        and
        taxa_identificacao >= 95
    )

    saida = {
        "modelo":
            MODELO,

        "descricao":
            (
                "Auditoria da posição real dos jogadores "
                "escalados historicamente pelo modelo."
            ),

        "fonteEscalacoes":
            "data/historico-escalacoes",

        "rodadas": {
            "encontradas":
                rodadas,

            "validas":
                rodadas_validas,

            "ignoradas":
                rodadas_ignoradas,
        },

        "resultadoGlobalSemColdStart":
            resultado_global,

        "resultadoPorPosicao":
            resultado_posicoes,

        "detalhesRodadas":
            detalhes_rodadas,

        "diagnosticos":
            diagnosticos,

        "auditoria": {
            "aprovada":
                auditoria_valida,

            "taxaIdentificacaoMinima":
                95,

            "usaEscalacaoHistorica":
                True,

            "removeColdStart":
                True,

            "semVazamentoFuturo":
                True,
        },

        "seguranca": {
            "alteraModeloOficial":
                False,

            "alteraPesos":
                False,

            "alteraEscalacoes":
                False,

            "promocaoAutomatica":
                False,
        },
    }

    salvar_json(
        ARQUIVO_SAIDA,
        saida
    )

    # ==================================================
    # LOG FINAL
    # ==================================================

    print()

    print(
        "===== RESULTADO GLOBAL SEM COLD START ====="
    )

    print(
        "Escalados:",
        resultado_global[
            "escalados"
        ]
    )

    print(
        "Identificados:",
        resultado_global[
            "identificados"
        ]
    )

    print(
        "Taxa identificação:",
        resultado_global[
            "taxaIdentificacaoPercentual"
        ],
        "%"
    )

    print(
        "Top N:",
        resultado_global[
            "topNPercentual"
        ],
        "%"
    )

    print(
        "Top 5:",
        resultado_global[
            "top5Percentual"
        ],
        "%"
    )

    print(
        "Top 10:",
        resultado_global[
            "top10Percentual"
        ],
        "%"
    )

    print(
        "Ranking real médio:",
        resultado_global[
            "rankingRealMedio"
        ]
    )

    print(
        "Percentil médio:",
        resultado_global[
            "percentilMedio"
        ]
    )

    print(
        "Eficiência captura de pontos:",
        resultado_global[
            "eficienciaCapturaPercentual"
        ],
        "%"
    )

    print()

    print(
        "===== RESULTADO POR POSIÇÃO ====="
    )

    for posicao in POSICOES:

        dados = (
            resultado_posicoes[
                posicao
            ]
        )

        print(
            f"{posicao}"
            f" | Escalados: "
            f"{dados['escalados']}"
            f" | Identificados: "
            f"{dados['identificados']}"
            f" | TopN: "
            f"{dados['topNPercentual']}%"
            f" | Top5: "
            f"{dados['top5Percentual']}%"
            f" | Top10: "
            f"{dados['top10Percentual']}%"
            f" | Percentil: "
            f"{dados['percentilMedio']}"
            f" | Eficiência: "
            f"{dados['eficienciaCapturaPercentual']}%"
        )

    print()

    print(
        "===== DIAGNÓSTICOS ====="
    )

    for diagnostico in diagnosticos:

        print(
            f"[{diagnostico['nivel']}] "
            f"{diagnostico['mensagem']}"
        )

    print()

    print(
        "AUDITORIA:",
        (
            "APROVADA"
            if auditoria_valida
            else "REPROVADA"
        )
    )

    print(
        "Modelo oficial alterado: NÃO"
    )

    print(
        "Arquivo:"
    )

    print(
        ARQUIVO_SAIDA
    )

    print(
        "============================================"
    )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    processar()
