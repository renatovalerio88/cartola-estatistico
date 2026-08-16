"""
=========================================================
CARTOLA ESTATÍSTICO
Auditoria Científica da Simulação de Times

Versão:
auditoria_simulacao_times_v1

Entrada:
data/simulacao-times.json
data/ranking-simulacao.json
data/historico-escalacoes/

Saída:
data/auditoria-simulacao-times.json

Objetivo:
Validar cientificamente a camada de backtest de
escalações antes que seus resultados sejam utilizados
para alterar estratégias do modelo oficial.

A auditoria verifica:

1. existência das rodadas históricas;
2. ausência de vazamento futuro;
3. cobertura dos resultados reais;
4. quantidade correta de titulares;
5. consistência das três estratégias;
6. correspondência entre simulação e ranking;
7. integridade do capitão;
8. presença de dados suficientes;
9. qualidade geral da simulação.

=========================================================
"""

import json
import math

from pathlib import Path
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

PASTA_ESCALACOES = (
    PASTA_DATA /
    "historico-escalacoes"
)

ARQUIVO_SIMULACAO = (
    PASTA_DATA /
    "simulacao-times.json"
)

ARQUIVO_RANKING = (
    PASTA_DATA /
    "ranking-simulacao.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "auditoria-simulacao-times.json"
)


ESTRATEGIAS_ESPERADAS = {
    "Conservador",
    "Equilibrado",
    "Agressivo"
}


MINIMO_RODADAS = 5

COBERTURA_MINIMA = 90.0

COBERTURA_IDEAL = 98.0


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


# ======================================================
# RESULTADO DE TESTE
# ======================================================

def teste(
    nome,
    aprovado,
    detalhes=None,
    critico=True
):

    return {

        "teste":
            nome,

        "aprovado":
            bool(
                aprovado
            ),

        "critico":
            bool(
                critico
            ),

        "detalhes":
            detalhes

    }


# ======================================================
# AUDITORIA DAS RODADAS
# ======================================================

def auditar_rodadas(
    simulacao
):

    rodadas = simulacao.get(
        "rodadas",
        []
    )

    problemas = []

    coberturas = []

    estrategias_encontradas = set()

    quantidade_times = 0

    quantidade_times_completos = 0

    quantidade_capitaes_validos = 0

    quantidade_capitaes = 0

    rodadas_sem_vazamento = 0

    rodadas_auditoria_origem = 0


    for rodada in rodadas:

        numero_rodada = rodada.get(
            "rodada"
        )

        dados_ate = rodada.get(
            "dadosUtilizadosAteRodada"
        )

        sem_vazamento = rodada.get(
            "semVazamentoFuturo",
            False
        )

        if (
            sem_vazamento
            and
            dados_ate is not None
            and
            numero_rodada is not None
            and
            numero(
                dados_ate,
                -999
            ) < numero(
                numero_rodada,
                -999
            )
        ):

            rodadas_sem_vazamento += 1

        else:

            problemas.append({

                "rodada":
                    numero_rodada,

                "tipo":
                    "possivel_vazamento_futuro",

                "dadosUtilizadosAteRodada":
                    dados_ate,

                "semVazamentoFuturo":
                    sem_vazamento

            })


        if rodada.get(
            "auditoriaEscalacaoAprovada",
            False
        ):

            rodadas_auditoria_origem += 1


        estrategias = rodada.get(
            "estrategias",
            []
        )

        nomes_rodada = set()


        for estrategia in estrategias:

            quantidade_times += 1

            nome = estrategia.get(
                "nome"
            )

            if nome:

                estrategias_encontradas.add(
                    nome
                )

                nomes_rodada.add(
                    nome
                )


            titulares = estrategia.get(
                "titulares",
                []
            )

            quantidade_titulares = int(
                numero(
                    estrategia.get(
                        "quantidadeTitulares",
                        len(
                            titulares
                        )
                    )
                )
            )

            escalacao_completa = bool(
                estrategia.get(
                    "escalacaoCompleta",
                    False
                )
            )


            # Cartola:
            # 11 atletas de linha/goleiro + técnico = 12.
            if quantidade_titulares == 12:

                quantidade_times_completos += 1

            else:

                problemas.append({

                    "rodada":
                        numero_rodada,

                    "estrategia":
                        nome,

                    "tipo":
                        "quantidade_titulares_invalida",

                    "quantidade":
                        quantidade_titulares,

                    "escalacaoCompletaInformada":
                        escalacao_completa

                })


            cobertura = numero(
                estrategia.get(
                    "coberturaResultadosPercentual"
                ),
                0
            )

            coberturas.append(
                cobertura
            )

            if cobertura < COBERTURA_MINIMA:

                problemas.append({

                    "rodada":
                        numero_rodada,

                    "estrategia":
                        nome,

                    "tipo":
                        "cobertura_baixa",

                    "cobertura":
                        cobertura

                })


            capitao = estrategia.get(
                "capitao"
            )

            if capitao is not None:

                quantidade_capitaes += 1

                if capitao.get(
                    "encontrado",
                    False
                ):

                    quantidade_capitaes_validos += 1

                else:

                    problemas.append({

                        "rodada":
                            numero_rodada,

                        "estrategia":
                            nome,

                        "tipo":
                            "capitao_sem_resultado"

                    })


        faltantes = (
            ESTRATEGIAS_ESPERADAS -
            nomes_rodada
        )

        if faltantes:

            problemas.append({

                "rodada":
                    numero_rodada,

                "tipo":
                    "estrategias_ausentes",

                "estrategias":
                    sorted(
                        faltantes
                    )

            })


    cobertura_media = (

        mean(
            coberturas
        )

        if coberturas

        else 0

    )


    taxa_times_completos = (

        (
            quantidade_times_completos /
            quantidade_times
        ) *
        100

        if quantidade_times

        else 0

    )


    taxa_capitaes_validos = (

        (
            quantidade_capitaes_validos /
            quantidade_capitaes
        ) *
        100

        if quantidade_capitaes

        else 0

    )


    taxa_sem_vazamento = (

        (
            rodadas_sem_vazamento /
            len(
                rodadas
            )
        ) *
        100

        if rodadas

        else 0

    )


    taxa_auditoria_origem = (

        (
            rodadas_auditoria_origem /
            len(
                rodadas
            )
        ) *
        100

        if rodadas

        else 0

    )


    return {

        "quantidadeRodadas":
            len(
                rodadas
            ),

        "quantidadeTimes":
            quantidade_times,

        "estrategiasEncontradas":
            sorted(
                estrategias_encontradas
            ),

        "coberturaMediaPercentual":
            round(
                cobertura_media,
                2
            ),

        "taxaTimesCompletosPercentual":
            round(
                taxa_times_completos,
                2
            ),

        "taxaCapitaesValidosPercentual":
            round(
                taxa_capitaes_validos,
                2
            ),

        "taxaSemVazamentoPercentual":
            round(
                taxa_sem_vazamento,
                2
            ),

        "taxaAuditoriaOrigemPercentual":
            round(
                taxa_auditoria_origem,
                2
            ),

        "problemas":
            problemas

    }


# ======================================================
# AUDITORIA DOS ARQUIVOS HISTÓRICOS
# ======================================================

def auditar_arquivos_historicos(
    simulacao
):

    rodadas = simulacao.get(
        "rodadasProcessadas",
        []
    )

    existentes = []

    ausentes = []

    invalidos = []

    for rodada in rodadas:

        try:

            numero_rodada = int(
                rodada
            )

        except Exception:

            invalidos.append(
                rodada
            )

            continue

        caminho = (

            PASTA_ESCALACOES /
            f"rodada-{numero_rodada:02d}.json"

        )

        if caminho.exists():

            dados = carregar_json(
                caminho
            )

            if isinstance(
                dados,
                dict
            ):

                existentes.append(
                    numero_rodada
                )

            else:

                invalidos.append(
                    numero_rodada
                )

        else:

            ausentes.append(
                numero_rodada
            )


    return {

        "esperados":
            len(
                rodadas
            ),

        "existentes":
            len(
                existentes
            ),

        "rodadasExistentes":
            existentes,

        "rodadasAusentes":
            ausentes,

        "rodadasInvalidas":
            invalidos

    }


# ======================================================
# AUDITORIA DO RANKING
# ======================================================

def auditar_ranking(
    simulacao,
    ranking
):

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

    nomes_simulacao = set()

    for rodada in simulacao.get(
        "rodadas",
        []
    ):

        for estrategia in rodada.get(
            "estrategias",
            []
        ):

            nome = estrategia.get(
                "nome"
            )

            if nome:

                nomes_simulacao.add(
                    nome
                )


    mesma_lista = (
        nomes_ranking ==
        nomes_simulacao
    )


    melhor = ranking.get(
        "melhorEstrategia"
    )

    primeiro = (

        ranking_lista[
            0
        ].get(
            "nome"
        )

        if ranking_lista

        else None

    )


    melhor_consistente = (
        melhor ==
        primeiro
    )


    posicoes_validas = True

    for indice, item in enumerate(
        ranking_lista,
        start=1
    ):

        if item.get(
            "posicao"
        ) != indice:

            posicoes_validas = False

            break


    return {

        "estrategiasSimulacao":
            sorted(
                nomes_simulacao
            ),

        "estrategiasRanking":
            sorted(
                nomes_ranking
            ),

        "mesmasEstrategias":
            mesma_lista,

        "melhorEstrategia":
            melhor,

        "primeiroRanking":
            primeiro,

        "melhorEstrategiaConsistente":
            melhor_consistente,

        "posicoesRankingValidas":
            posicoes_validas

    }


# ======================================================
# TESTES CIENTÍFICOS
# ======================================================

def gerar_testes(
    simulacao,
    ranking,
    auditoria_rodadas,
    auditoria_arquivos,
    auditoria_ranking
):

    quantidade_rodadas = (
        auditoria_rodadas[
            "quantidadeRodadas"
        ]
    )

    cobertura = (
        auditoria_rodadas[
            "coberturaMediaPercentual"
        ]
    )

    times_completos = (
        auditoria_rodadas[
            "taxaTimesCompletosPercentual"
        ]
    )

    capitaes_validos = (
        auditoria_rodadas[
            "taxaCapitaesValidosPercentual"
        ]
    )

    sem_vazamento = (
        auditoria_rodadas[
            "taxaSemVazamentoPercentual"
        ]
    )

    auditoria_origem = (
        auditoria_rodadas[
            "taxaAuditoriaOrigemPercentual"
        ]
    )


    testes = [

        teste(
            "simulacao_existe",
            isinstance(
                simulacao,
                dict
            ),
            simulacao.get(
                "modelo"
            )
        ),

        teste(
            "versao_simulacao",
            simulacao.get(
                "modelo"
            ) == "simulacao_times_v3",
            simulacao.get(
                "modelo"
            )
        ),

        teste(
            "ranking_existe",
            isinstance(
                ranking,
                dict
            ),
            ranking.get(
                "modelo"
            )
        ),

        teste(
            "versao_ranking",
            ranking.get(
                "modelo"
            ) == "ranking_simulacao_v2",
            ranking.get(
                "modelo"
            )
        ),

        teste(
            "amostra_minima",
            quantidade_rodadas >= MINIMO_RODADAS,
            {
                "rodadas":
                    quantidade_rodadas,

                "minimo":
                    MINIMO_RODADAS
            }
        ),

        teste(
            "estrategias_completas",
            set(
                auditoria_rodadas[
                    "estrategiasEncontradas"
                ]
            ) == ESTRATEGIAS_ESPERADAS,
            auditoria_rodadas[
                "estrategiasEncontradas"
            ]
        ),

        teste(
            "arquivos_historicos_presentes",
            (
                not auditoria_arquivos[
                    "rodadasAusentes"
                ]
                and
                not auditoria_arquivos[
                    "rodadasInvalidas"
                ]
            ),
            auditoria_arquivos
        ),

        teste(
            "sem_vazamento_futuro",
            sem_vazamento == 100.0,
            {
                "taxa":
                    sem_vazamento
            }
        ),

        teste(
            "auditoria_origem",
            auditoria_origem == 100.0,
            {
                "taxa":
                    auditoria_origem
            }
        ),

        teste(
            "times_completos",
            times_completos == 100.0,
            {
                "taxa":
                    times_completos
            }
        ),

        teste(
            "cobertura_resultados",
            cobertura >= COBERTURA_MINIMA,
            {
                "cobertura":
                    cobertura,

                "minimo":
                    COBERTURA_MINIMA
            }
        ),

        teste(
            "cobertura_ideal",
            cobertura >= COBERTURA_IDEAL,
            {
                "cobertura":
                    cobertura,

                "ideal":
                    COBERTURA_IDEAL
            },
            critico=False
        ),

        teste(
            "capitaes_validos",
            capitaes_validos >= COBERTURA_MINIMA,
            {
                "taxa":
                    capitaes_validos
            }
        ),

        teste(
            "ranking_mesmas_estrategias",
            auditoria_ranking[
                "mesmasEstrategias"
            ],
            auditoria_ranking
        ),

        teste(
            "ranking_posicoes_validas",
            auditoria_ranking[
                "posicoesRankingValidas"
            ],
            auditoria_ranking
        ),

        teste(
            "ranking_melhor_consistente",
            auditoria_ranking[
                "melhorEstrategiaConsistente"
            ],
            auditoria_ranking
        ),

        teste(
            "auditoria_interna_simulacao",
            simulacao.get(
                "auditoria",
                {}
            ).get(
                "aprovada",
                False
            ),
            simulacao.get(
                "auditoria",
                {}
            )
        ),

        teste(
            "auditoria_interna_ranking",
            ranking.get(
                "auditoria",
                {}
            ).get(
                "aprovada",
                False
            ),
            ranking.get(
                "auditoria",
                {}
            )
        )

    ]

    return testes


# ======================================================
# SCORE DE QUALIDADE
# ======================================================

def calcular_score(
    testes
):

    if not testes:

        return 0

    pesos = []

    pontos = []

    for item in testes:

        peso = (
            2
            if item.get(
                "critico",
                True
            )
            else
            1
        )

        pesos.append(
            peso
        )

        pontos.append(

            peso

            if item.get(
                "aprovado",
                False
            )

            else 0

        )

    total_pesos = sum(
        pesos
    )

    if total_pesos <= 0:

        return 0

    return round(

        (
            sum(
                pontos
            ) /
            total_pesos
        ) *
        100,

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
        "AUDITORIA CIENTÍFICA DA SIMULAÇÃO"
    )

    print(
        "=============================================="
    )


    simulacao = carregar_json(
        ARQUIVO_SIMULACAO
    )

    ranking = carregar_json(
        ARQUIVO_RANKING
    )


    if not isinstance(
        simulacao,
        dict
    ):

        simulacao = {}


    if not isinstance(
        ranking,
        dict
    ):

        ranking = {}


    auditoria_rodadas = (
        auditar_rodadas(
            simulacao
        )
    )

    auditoria_arquivos = (
        auditar_arquivos_historicos(
            simulacao
        )
    )

    auditoria_ranking = (
        auditar_ranking(
            simulacao,
            ranking
        )
    )


    testes = gerar_testes(

        simulacao,

        ranking,

        auditoria_rodadas,

        auditoria_arquivos,

        auditoria_ranking

    )


    testes_criticos = [

        item

        for item in testes

        if item.get(
            "critico",
            True
        )

    ]


    falhas_criticas = [

        item

        for item in testes_criticos

        if not item.get(
            "aprovado",
            False
        )

    ]


    alertas = [

        item

        for item in testes

        if (
            not item.get(
                "critico",
                True
            )
            and
            not item.get(
                "aprovado",
                False
            )
        )

    ]


    score = calcular_score(
        testes
    )


    aprovado = (
        len(
            falhas_criticas
        ) == 0
    )


    if aprovado:

        decisao = (
            "SIMULACAO_VALIDADA"
        )

    else:

        decisao = (
            "SIMULACAO_NAO_VALIDADA"
        )


    resultado = {

        "modelo":
            "auditoria_simulacao_times_v1",

        "descricao":
            (
                "Auditoria científica da camada de "
                "simulação histórica de escalações."
            ),

        "configuracao": {

            "minimoRodadas":
                MINIMO_RODADAS,

            "coberturaMinima":
                COBERTURA_MINIMA,

            "coberturaIdeal":
                COBERTURA_IDEAL,

            "estrategiasEsperadas":
                sorted(
                    ESTRATEGIAS_ESPERADAS
                )

        },

        "fontes": {

            "simulacao":
                "data/simulacao-times.json",

            "ranking":
                "data/ranking-simulacao.json",

            "historicoEscalacoes":
                "data/historico-escalacoes"

        },

        "resumo": {

            "rodadas":
                auditoria_rodadas[
                    "quantidadeRodadas"
                ],

            "timesAvaliados":
                auditoria_rodadas[
                    "quantidadeTimes"
                ],

            "coberturaMediaPercentual":
                auditoria_rodadas[
                    "coberturaMediaPercentual"
                ],

            "taxaTimesCompletosPercentual":
                auditoria_rodadas[
                    "taxaTimesCompletosPercentual"
                ],

            "taxaCapitaesValidosPercentual":
                auditoria_rodadas[
                    "taxaCapitaesValidosPercentual"
                ],

            "taxaSemVazamentoPercentual":
                auditoria_rodadas[
                    "taxaSemVazamentoPercentual"
                ],

            "scoreQualidade":
                score,

            "testes":
                len(
                    testes
                ),

            "falhasCriticas":
                len(
                    falhas_criticas
                ),

            "alertas":
                len(
                    alertas
                )

        },

        "rodadas":
            auditoria_rodadas,

        "arquivosHistoricos":
            auditoria_arquivos,

        "ranking":
            auditoria_ranking,

        "testes":
            testes,

        "falhasCriticas":
            falhas_criticas,

        "alertas":
            alertas,

        "decisao": {

            "aprovada":
                aprovado,

            "decisao":
                decisao,

            "podeUsarRankingParaEvoluirModelo":
                aprovado,

            "observacao":
                (
                    "Ranking histórico liberado para "
                    "análise estratégica."
                    if aprovado
                    else
                    "Corrigir falhas críticas antes de "
                    "usar o ranking para alterar o modelo."
                )

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
        auditoria_rodadas[
            "quantidadeRodadas"
        ]
    )

    print(
        "Times avaliados:",
        auditoria_rodadas[
            "quantidadeTimes"
        ]
    )

    print(
        "Cobertura:",
        auditoria_rodadas[
            "coberturaMediaPercentual"
        ],
        "%"
    )

    print(
        "Times completos:",
        auditoria_rodadas[
            "taxaTimesCompletosPercentual"
        ],
        "%"
    )

    print(
        "Sem vazamento:",
        auditoria_rodadas[
            "taxaSemVazamentoPercentual"
        ],
        "%"
    )

    print(
        "Capitães válidos:",
        auditoria_rodadas[
            "taxaCapitaesValidosPercentual"
        ],
        "%"
    )

    print()

    print(
        "TESTES"
    )

    print(
        "----------------------------------------------"
    )

    for item in testes:

        status = (
            "OK"
            if item[
                "aprovado"
            ]
            else
            "FALHA"
        )

        tipo = (
            "CRÍTICO"
            if item[
                "critico"
            ]
            else
            "ALERTA"
        )

        print(
            f"[{status}] "
            f"{item['teste']} "
            f"({tipo})"
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

    print()

    print(
        "DECISÃO:",
        decisao
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
