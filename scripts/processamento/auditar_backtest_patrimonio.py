"""
=========================================================
CARTOLA ESTATÍSTICO
Auditoria do Backtest de Patrimônio

Versão:
auditar_backtest_patrimonio_v1

Objetivo:

Auditar o arquivo:

data/backtest-patrimonio.json

Valida:

- existência e estrutura do backtest;
- patrimônios testados;
- estratégias esperadas;
- quantidade de titulares;
- presença do técnico;
- formação válida;
- limite máximo de 3 jogadores por clube;
- custo <= patrimônio;
- saldo consistente;
- auditoria produzida pelo otimizador;
- cobertura dos resultados reais;
- regra temporal R utiliza dados até R-1;
- quantidade de rodadas;
- quantidade de testes;
- consistência dos resumos;
- segurança experimental.

Gera:

data/auditoria-backtest-patrimonio.json

Este script NÃO altera:

- modelo oficial;
- pesos;
- projeções;
- estratégias;
- escalações do site.

=========================================================
"""

from __future__ import annotations

import json
import math

from collections import Counter
from pathlib import Path
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

ARQUIVO_BACKTEST = (
    PASTA_DATA /
    "backtest-patrimonio.json"
)

ARQUIVO_SAIDA = (
    PASTA_DATA /
    "auditoria-backtest-patrimonio.json"
)


# ======================================================
# CONFIGURAÇÕES
# ======================================================

PATRIMONIOS_ESPERADOS = [
    100.0,
    110.0,
    120.0,
    130.0,
    140.0,
    150.0,
    175.0,
    200.0,
]

ESTRATEGIAS_ESPERADAS = [
    "conservador",
    "equilibrado",
    "agressivo",
]

FORMACOES_VALIDAS = {
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

QUANTIDADE_TITULARES = 12

LIMITE_JOGADORES_CLUBE = 3

COBERTURA_MINIMA_RESULTADO = 90.0

TOLERANCIA_FINANCEIRA = 0.02


# ======================================================
# UTILIDADES
# ======================================================

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
            "[ERRO] Falha ao carregar:",
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


def normalizar_texto(
    valor: Any,
) -> str:

    if valor is None:
        return ""

    return (
        str(valor)
        .strip()
    )


def normalizar_posicao(
    jogador,
) -> str:

    if not isinstance(
        jogador,
        dict,
    ):

        return ""

    valor = (
        jogador.get("posicao")
        or jogador.get("posicaoAbreviacao")
        or jogador.get("posicao_abreviacao")
        or ""
    )

    return (
        str(valor)
        .strip()
        .upper()
    )


def obter_id_jogador(
    jogador,
):

    if not isinstance(
        jogador,
        dict,
    ):

        return None

    return (
        jogador.get("id")
        or jogador.get("atletaId")
        or jogador.get("atleta_id")
    )


def obter_clube_id(
    jogador,
):

    if not isinstance(
        jogador,
        dict,
    ):

        return None

    valor = (
        jogador.get("clubeId")
        or jogador.get("clube_id")
        or jogador.get("clube")
        or jogador.get("siglaClube")
    )

    if valor is None:
        return None

    return str(
        valor
    )


def adicionar_falha(
    falhas,
    codigo,
    mensagem,
    critica=True,
    contexto=None,
):

    item = {
        "codigo":
            codigo,
        "mensagem":
            mensagem,
        "critica":
            bool(
                critica
            ),
    }

    if contexto is not None:

        item[
            "contexto"
        ] = contexto

    falhas.append(
        item
    )


# ======================================================
# VALIDAÇÃO DE FORMAÇÃO
# ======================================================

def contar_posicoes(
    titulares,
):

    contador = Counter()

    for jogador in titulares:

        posicao = normalizar_posicao(
            jogador
        )

        if posicao:

            contador[
                posicao
            ] += 1

    return dict(
        contador
    )


def validar_formacao(
    formacao,
    titulares,
):

    problemas = []

    if formacao not in FORMACOES_VALIDAS:

        problemas.append(
            (
                "formacao_invalida",
                (
                    "Formação não reconhecida: "
                    f"{formacao}"
                ),
            )
        )

        return problemas

    esperado = FORMACOES_VALIDAS[
        formacao
    ]

    encontrado = contar_posicoes(
        titulares
    )

    for posicao, quantidade in (
        esperado.items()
    ):

        atual = inteiro(
            encontrado.get(
                posicao,
                0
            )
        )

        if atual != quantidade:

            problemas.append(
                (
                    "formacao_posicoes_incorreta",
                    (
                        f"{formacao}: "
                        f"{posicao} esperado "
                        f"{quantidade}, "
                        f"encontrado {atual}."
                    ),
                )
            )

    posicoes_validas = set(
        esperado.keys()
    )

    for posicao, quantidade in (
        encontrado.items()
    ):

        if (
            posicao not in posicoes_validas
            and quantidade > 0
        ):

            problemas.append(
                (
                    "posicao_desconhecida",
                    (
                        "Posição não prevista "
                        f"na formação: {posicao}"
                    ),
                )
            )

    return problemas


# ======================================================
# VALIDAÇÃO DOS CLUBES
# ======================================================

def validar_limite_clubes(
    titulares,
):

    contador = Counter()

    for jogador in titulares:

        clube = obter_clube_id(
            jogador
        )

        if clube is None:
            continue

        contador[
            clube
        ] += 1

    excedidos = {

        clube:
            quantidade

        for clube, quantidade
        in contador.items()

        if quantidade >
        LIMITE_JOGADORES_CLUBE
    }

    return excedidos


# ======================================================
# VALIDAÇÃO DOS IDs
# ======================================================

def validar_ids_duplicados(
    titulares,
):

    ids = []

    for jogador in titulares:

        jogador_id = obter_id_jogador(
            jogador
        )

        if jogador_id is None:
            continue

        ids.append(
            str(
                jogador_id
            )
        )

    contador = Counter(
        ids
    )

    return [

        jogador_id

        for jogador_id, quantidade
        in contador.items()

        if quantidade > 1

    ]


# ======================================================
# VALIDAÇÃO FINANCEIRA
# ======================================================

def validar_financas(
    dados,
    patrimonio,
):

    problemas = []

    custo = numero(
        dados.get(
            "custo"
        )
    )

    saldo = numero(
        dados.get(
            "saldo"
        )
    )

    if custo < 0:

        problemas.append(
            (
                "custo_negativo",
                (
                    "Custo da escalação "
                    "é negativo."
                ),
            )
        )

    if (
        custo -
        patrimonio
        >
        TOLERANCIA_FINANCEIRA
    ):

        problemas.append(
            (
                "orcamento_estourado",
                (
                    f"Custo C$ {custo:.2f} "
                    f"supera patrimônio "
                    f"C$ {patrimonio:.2f}."
                ),
            )
        )

    saldo_calculado = (
        patrimonio -
        custo
    )

    if abs(
        saldo -
        saldo_calculado
    ) > TOLERANCIA_FINANCEIRA:

        problemas.append(
            (
                "saldo_inconsistente",
                (
                    f"Saldo informado "
                    f"C$ {saldo:.2f}; "
                    f"esperado "
                    f"C$ {saldo_calculado:.2f}."
                ),
            )
        )

    return problemas


# ======================================================
# VALIDAÇÃO DA COBERTURA REAL
# ======================================================

def validar_resultado_real(
    dados,
):

    problemas = []

    resultado = dados.get(
        "resultadoReal"
    )

    if not isinstance(
        resultado,
        dict,
    ):

        problemas.append(
            (
                "resultado_real_ausente",
                (
                    "resultadoReal não foi "
                    "gerado."
                ),
            )
        )

        return problemas

    cobertura = numero(
        resultado.get(
            "cobertura"
        )
    )

    cobertura_atletas = numero(
        resultado.get(
            "coberturaAtletas"
        )
    )

    encontrados = inteiro(
        resultado.get(
            "jogadoresEncontrados"
        )
    )

    esperados = inteiro(
        resultado.get(
            "jogadoresEsperados"
        )
    )

    if esperados != QUANTIDADE_TITULARES:

        problemas.append(
            (
                "resultado_quantidade_incorreta",
                (
                    "Resultado real esperava "
                    f"{esperados} jogadores; "
                    f"deveria esperar "
                    f"{QUANTIDADE_TITULARES}."
                ),
            )
        )

    if cobertura < COBERTURA_MINIMA_RESULTADO:

        problemas.append(
            (
                "cobertura_real_baixa",
                (
                    f"Cobertura real "
                    f"{cobertura:.2f}% abaixo "
                    f"do mínimo de "
                    f"{COBERTURA_MINIMA_RESULTADO:.2f}%."
                ),
            )
        )

    if cobertura_atletas < COBERTURA_MINIMA_RESULTADO:

        problemas.append(
            (
                "cobertura_atletas_baixa",
                (
                    f"Cobertura dos atletas "
                    f"{cobertura_atletas:.2f}% "
                    "abaixo do mínimo."
                ),
            )
        )

    if encontrados <= 0:

        problemas.append(
            (
                "nenhum_resultado_encontrado",
                (
                    "Nenhuma pontuação real "
                    "foi encontrada."
                ),
            )
        )

    return problemas


# ======================================================
# AUDITORIA INTERNA DO OTIMIZADOR
# ======================================================

def validar_auditoria_otimizador(
    dados,
):

    problemas = []

    auditoria = dados.get(
        "auditoria"
    )

    if not isinstance(
        auditoria,
        dict,
    ):

        problemas.append(
            (
                "auditoria_otimizador_ausente",
                (
                    "Auditoria do otimizador "
                    "não encontrada."
                ),
            )
        )

        return problemas

    if not auditoria.get(
        "aprovada"
    ):

        problemas.append(
            (
                "auditoria_otimizador_reprovada",
                (
                    "O próprio otimizador "
                    "reprovou a escalação."
                ),
            )
        )

    return problemas


# ======================================================
# AUDITORIA DE UM TESTE
# ======================================================

def auditar_teste(
    rodada,
    patrimonio,
    estrategia,
    dados,
):

    falhas = []

    if not isinstance(
        dados,
        dict,
    ):

        adicionar_falha(
            falhas,
            "teste_invalido",
            "Teste não possui estrutura válida.",
            True,
        )

        return {
            "aprovada":
                False,
            "falhas":
                falhas,
        }

    titulares = dados.get(
        "titulares",
        []
    )

    if not isinstance(
        titulares,
        list,
    ):

        titulares = []

    contexto = {
        "rodada":
            rodada,
        "patrimonio":
            patrimonio,
        "estrategia":
            estrategia,
    }

    # ==================================================
    # QUANTIDADE
    # ==================================================

    if len(
        titulares
    ) != QUANTIDADE_TITULARES:

        adicionar_falha(
            falhas,
            "quantidade_titulares_incorreta",
            (
                f"Encontrados {len(titulares)} "
                "titulares; esperado "
                f"{QUANTIDADE_TITULARES}."
            ),
            True,
            contexto,
        )

    # ==================================================
    # TÉCNICO
    # ==================================================

    tecnicos = [

        jogador

        for jogador in titulares

        if normalizar_posicao(
            jogador
        ) == "TEC"

    ]

    if len(
        tecnicos
    ) != 1:

        adicionar_falha(
            falhas,
            "quantidade_tecnicos_incorreta",
            (
                f"Encontrados {len(tecnicos)} "
                "técnicos; esperado 1."
            ),
            True,
            contexto,
        )

    # ==================================================
    # DUPLICIDADE
    # ==================================================

    duplicados = validar_ids_duplicados(
        titulares
    )

    if duplicados:

        adicionar_falha(
            falhas,
            "jogadores_duplicados",
            (
                "Jogadores duplicados: "
                f"{duplicados}"
            ),
            True,
            contexto,
        )

    # ==================================================
    # FORMAÇÃO
    # ==================================================

    formacao = normalizar_texto(
        dados.get(
            "formacao"
        )
    )

    problemas_formacao = (
        validar_formacao(
            formacao,
            titulares,
        )
    )

    for codigo, mensagem in (
        problemas_formacao
    ):

        adicionar_falha(
            falhas,
            codigo,
            mensagem,
            True,
            contexto,
        )

    # ==================================================
    # CLUBES
    # ==================================================

    excedidos = validar_limite_clubes(
        titulares
    )

    if excedidos:

        adicionar_falha(
            falhas,
            "limite_clube_excedido",
            (
                "Limite de "
                f"{LIMITE_JOGADORES_CLUBE} "
                "jogadores por clube excedido: "
                f"{excedidos}"
            ),
            True,
            contexto,
        )

    # ==================================================
    # FINANÇAS
    # ==================================================

    problemas_financas = validar_financas(
        dados,
        patrimonio,
    )

    for codigo, mensagem in (
        problemas_financas
    ):

        adicionar_falha(
            falhas,
            codigo,
            mensagem,
            True,
            contexto,
        )

    # ==================================================
    # AUDITORIA DO OTIMIZADOR
    # ==================================================

    problemas_otimizador = (
        validar_auditoria_otimizador(
            dados
        )
    )

    for codigo, mensagem in (
        problemas_otimizador
    ):

        adicionar_falha(
            falhas,
            codigo,
            mensagem,
            True,
            contexto,
        )

    # ==================================================
    # RESULTADO REAL
    # ==================================================

    problemas_resultado = (
        validar_resultado_real(
            dados
        )
    )

    for codigo, mensagem in (
        problemas_resultado
    ):

        adicionar_falha(
            falhas,
            codigo,
            mensagem,
            True,
            contexto,
        )

    return {

        "aprovada":
            len(
                falhas
            ) == 0,

        "rodada":
            rodada,

        "patrimonio":
            patrimonio,

        "estrategia":
            estrategia,

        "formacao":
            formacao,

        "quantidadeTitulares":
            len(
                titulares
            ),

        "custo":
            arredondar(
                dados.get(
                    "custo"
                )
            ),

        "saldo":
            arredondar(
                dados.get(
                    "saldo"
                )
            ),

        "pontuacaoReal":
            arredondar(
                (
                    dados
                    .get(
                        "resultadoReal",
                        {}
                    )
                    .get(
                        "pontuacaoReal"
                    )
                )
            ),

        "coberturaReal":
            arredondar(
                (
                    dados
                    .get(
                        "resultadoReal",
                        {}
                    )
                    .get(
                        "cobertura"
                    )
                )
            ),

        "falhas":
            falhas,

    }


# ======================================================
# AUDITORIA DA REGRA TEMPORAL
# ======================================================

def auditar_regra_temporal(
    rodada,
    dados_rodada,
):

    esperado = (
        rodada - 1
    )

    encontrado = inteiro(
        dados_rodada.get(
            "dadosDisponiveisAte"
        ),
        -999,
    )

    return (
        encontrado ==
        esperado
    )


# ======================================================
# AUDITORIA DO RESUMO
# ======================================================

def auditar_resumo(
    dados,
    quantidade_rodadas,
):

    falhas = []

    resumo = dados.get(
        "resumoPorPatrimonio"
    )

    if not isinstance(
        resumo,
        dict,
    ):

        adicionar_falha(
            falhas,
            "resumo_patrimonio_ausente",
            (
                "resumoPorPatrimonio "
                "não encontrado."
            ),
            True,
        )

        return falhas

    for patrimonio in PATRIMONIOS_ESPERADOS:

        chave = (
            f"{patrimonio:.2f}"
        )

        item = resumo.get(
            chave
        )

        if not isinstance(
            item,
            dict,
        ):

            adicionar_falha(
                falhas,
                "patrimonio_resumo_ausente",
                (
                    "Patrimônio ausente "
                    f"no resumo: {chave}"
                ),
                True,
            )

            continue

        estrategias = item.get(
            "estrategias"
        )

        if not isinstance(
            estrategias,
            dict,
        ):

            adicionar_falha(
                falhas,
                "estrategias_resumo_ausentes",
                (
                    "Estratégias ausentes "
                    f"no patrimônio {chave}."
                ),
                True,
            )

            continue

        for estrategia in (
            ESTRATEGIAS_ESPERADAS
        ):

            dados_estrategia = (
                estrategias.get(
                    estrategia
                )
            )

            if not isinstance(
                dados_estrategia,
                dict,
            ):

                adicionar_falha(
                    falhas,
                    "estrategia_resumo_ausente",
                    (
                        f"{estrategia} ausente "
                        f"no patrimônio {chave}."
                    ),
                    True,
                )

                continue

            rodadas_geradas = inteiro(
                dados_estrategia.get(
                    "rodadasGeradas"
                )
            )

            if (
                quantidade_rodadas > 0
                and
                rodadas_geradas !=
                quantidade_rodadas
            ):

                adicionar_falha(
                    falhas,
                    "rodadas_resumo_inconsistentes",
                    (
                        f"{chave} / "
                        f"{estrategia}: "
                        f"rodadasGeradas="
                        f"{rodadas_geradas}; "
                        f"esperado="
                        f"{quantidade_rodadas}."
                    ),
                    True,
                )

    return falhas


# ======================================================
# SEGURANÇA EXPERIMENTAL
# ======================================================

def auditar_seguranca(
    dados,
):

    falhas = []

    seguranca = dados.get(
        "seguranca"
    )

    if not isinstance(
        seguranca,
        dict,
    ):

        adicionar_falha(
            falhas,
            "seguranca_ausente",
            (
                "Bloco de segurança "
                "não encontrado."
            ),
            True,
        )

        return falhas

    campos_false = [
        "alteraModeloOficial",
        "alteraPesos",
        "alteraProjecoes",
        "alteraEstrategiaOficial",
        "alteraEscalacoesSite",
        "promocaoAutomatica",
    ]

    for campo in campos_false:

        if seguranca.get(
            campo
        ) is not False:

            adicionar_falha(
                falhas,
                "seguranca_invalida",
                (
                    f"{campo} deveria "
                    "ser false."
                ),
                True,
            )

    return falhas


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
        "AUDITORIA DO BACKTEST DE PATRIMÔNIO V1"
    )

    print(
        "============================================"
    )

    print(
        "Arquivo:",
        ARQUIVO_BACKTEST,
    )

    print(
        "============================================"
    )

    dados = carregar_json(
        ARQUIVO_BACKTEST
    )

    if not isinstance(
        dados,
        dict,
    ):

        print(
            "[ERRO] backtest-patrimonio.json "
            "não encontrado ou inválido."
        )

        saida = {

            "modelo":
                "auditoria_backtest_patrimonio_v1",

            "aprovada":
                False,

            "falhasCriticas":
                1,

            "falhas": [
                {
                    "codigo":
                        "arquivo_backtest_invalido",
                    "mensagem":
                        (
                            "data/backtest-patrimonio.json "
                            "não encontrado ou inválido."
                        ),
                    "critica":
                        True,
                }
            ],

        }

        salvar_json(
            ARQUIVO_SAIDA,
            saida,
        )

        raise SystemExit(
            1
        )

    falhas_globais = []

    resultados_testes = []

    rodadas = dados.get(
        "rodadas",
        []
    )

    if not isinstance(
        rodadas,
        list,
    ):

        rodadas = []

    if not rodadas:

        adicionar_falha(
            falhas_globais,
            "rodadas_ausentes",
            (
                "Nenhuma rodada disponível "
                "para auditoria."
            ),
            True,
        )

    # ==================================================
    # PATRIMÔNIOS DECLARADOS
    # ==================================================

    patrimonios_declarados = [

        numero(
            valor
        )

        for valor in dados.get(
            "patrimonios",
            []
        )

    ]

    if patrimonios_declarados != (
        PATRIMONIOS_ESPERADOS
    ):

        adicionar_falha(
            falhas_globais,
            "patrimonios_incorretos",
            (
                "Lista de patrimônios "
                "difere da esperada."
            ),
            True,
            {
                "esperado":
                    PATRIMONIOS_ESPERADOS,
                "encontrado":
                    patrimonios_declarados,
            },
        )

    # ==================================================
    # ESTRATÉGIAS DECLARADAS
    # ==================================================

    estrategias_declaradas = (
        dados.get(
            "estrategias",
            []
        )
    )

    if estrategias_declaradas != (
        ESTRATEGIAS_ESPERADAS
    ):

        adicionar_falha(
            falhas_globais,
            "estrategias_incorretas",
            (
                "Lista de estratégias "
                "difere da esperada."
            ),
            True,
            {
                "esperado":
                    ESTRATEGIAS_ESPERADAS,
                "encontrado":
                    estrategias_declaradas,
            },
        )

    # ==================================================
    # RODADAS
    # ==================================================

    testes_esperados = (
        len(
            rodadas
        )
        *
        len(
            PATRIMONIOS_ESPERADOS
        )
        *
        len(
            ESTRATEGIAS_ESPERADAS
        )
    )

    testes_encontrados = 0

    testes_aprovados = 0

    testes_reprovados = 0

    rodadas_temporais_aprovadas = 0

    rodadas_com_erro = set()

    falhas_por_codigo = Counter()

    for dados_rodada in rodadas:

        if not isinstance(
            dados_rodada,
            dict,
        ):

            adicionar_falha(
                falhas_globais,
                "rodada_invalida",
                (
                    "Registro de rodada "
                    "não é um objeto."
                ),
                True,
            )

            continue

        rodada = inteiro(
            dados_rodada.get(
                "rodada"
            )
        )

        temporal_ok = (
            auditar_regra_temporal(
                rodada,
                dados_rodada,
            )
        )

        if temporal_ok:

            rodadas_temporais_aprovadas += 1

        else:

            rodadas_com_erro.add(
                rodada
            )

            adicionar_falha(
                falhas_globais,
                "regra_temporal_incorreta",
                (
                    f"Rodada {rodada:02d}: "
                    "dadosDisponiveisAte deveria "
                    f"ser {rodada - 1}."
                ),
                True,
            )

        testes = dados_rodada.get(
            "testes",
            {}
        )

        if not isinstance(
            testes,
            dict,
        ):

            testes = {}

        for patrimonio in (
            PATRIMONIOS_ESPERADOS
        ):

            chave = (
                f"{patrimonio:.2f}"
            )

            dados_patrimonio = testes.get(
                chave
            )

            if not isinstance(
                dados_patrimonio,
                dict,
            ):

                rodadas_com_erro.add(
                    rodada
                )

                adicionar_falha(
                    falhas_globais,
                    "patrimonio_rodada_ausente",
                    (
                        f"R{rodada:02d}: "
                        f"patrimônio {chave} "
                        "não encontrado."
                    ),
                    True,
                )

                continue

            estrategias = (
                dados_patrimonio.get(
                    "estrategias",
                    {}
                )
            )

            if not isinstance(
                estrategias,
                dict,
            ):

                estrategias = {}

            for estrategia in (
                ESTRATEGIAS_ESPERADAS
            ):

                dados_teste = (
                    estrategias.get(
                        estrategia
                    )
                )

                if not isinstance(
                    dados_teste,
                    dict,
                ):

                    rodadas_com_erro.add(
                        rodada
                    )

                    adicionar_falha(
                        falhas_globais,
                        "teste_ausente",
                        (
                            f"R{rodada:02d} | "
                            f"C$ {patrimonio:.2f} | "
                            f"{estrategia}: "
                            "teste ausente."
                        ),
                        True,
                    )

                    continue

                testes_encontrados += 1

                auditoria = auditar_teste(
                    rodada,
                    patrimonio,
                    estrategia,
                    dados_teste,
                )

                resultados_testes.append(
                    auditoria
                )

                if auditoria[
                    "aprovada"
                ]:

                    testes_aprovados += 1

                else:

                    testes_reprovados += 1

                    rodadas_com_erro.add(
                        rodada
                    )

                    for falha in auditoria[
                        "falhas"
                    ]:

                        falhas_por_codigo[
                            falha.get(
                                "codigo",
                                "desconhecido",
                            )
                        ] += 1

    # ==================================================
    # RESUMO
    # ==================================================

    falhas_resumo = auditar_resumo(
        dados,
        len(
            rodadas
        ),
    )

    falhas_globais.extend(
        falhas_resumo
    )

    # ==================================================
    # SEGURANÇA
    # ==================================================

    falhas_seguranca = (
        auditar_seguranca(
            dados
        )
    )

    falhas_globais.extend(
        falhas_seguranca
    )

    # ==================================================
    # CONSISTÊNCIA DOS CONTADORES
    # ==================================================

    quantidade_declarada = inteiro(
        dados.get(
            "quantidadeTestes"
        )
    )

    aprovados_declarados = inteiro(
        dados.get(
            "quantidadeTestesAprovados"
        )
    )

    if quantidade_declarada != (
        testes_esperados
    ):

        adicionar_falha(
            falhas_globais,
            "quantidade_testes_inconsistente",
            (
                "quantidadeTestes="
                f"{quantidade_declarada}; "
                f"esperado={testes_esperados}."
            ),
            True,
        )

    if aprovados_declarados > (
        quantidade_declarada
    ):

        adicionar_falha(
            falhas_globais,
            "aprovados_maior_que_total",
            (
                "quantidadeTestesAprovados "
                "é maior que quantidadeTestes."
            ),
            True,
        )

    # ==================================================
    # CONTAGEM GLOBAL DE FALHAS
    # ==================================================

    falhas_testes = sum(
        len(
            item.get(
                "falhas",
                []
            )
        )
        for item in resultados_testes
    )

    falhas_globais_quantidade = len(
        falhas_globais
    )

    falhas_totais = (
        falhas_testes +
        falhas_globais_quantidade
    )

    falhas_criticas_globais = sum(
        1
        for falha in falhas_globais
        if falha.get(
            "critica"
        )
    )

    falhas_criticas_testes = sum(

        1

        for item in resultados_testes

        for falha in item.get(
            "falhas",
            []
        )

        if falha.get(
            "critica"
        )

    )

    falhas_criticas = (
        falhas_criticas_globais +
        falhas_criticas_testes
    )

    # ==================================================
    # COBERTURA
    # ==================================================

    cobertura_testes = (

        (
            testes_encontrados /
            testes_esperados *
            100
        )

        if testes_esperados
        else 0

    )

    taxa_aprovacao = (

        (
            testes_aprovados /
            testes_encontrados *
            100
        )

        if testes_encontrados
        else 0

    )

    taxa_temporal = (

        (
            rodadas_temporais_aprovadas /
            len(rodadas) *
            100
        )

        if rodadas
        else 0

    )

    # ==================================================
    # DECISÃO
    # ==================================================

    aprovada = (

        bool(
            rodadas
        )

        and

        testes_encontrados ==
        testes_esperados

        and

        testes_reprovados == 0

        and

        falhas_criticas == 0

        and

        rodadas_temporais_aprovadas ==
        len(
            rodadas
        )

    )

    if aprovada:

        decisao = (
            "BACKTEST_PATRIMONIO_APROVADO"
        )

    else:

        decisao = (
            "BACKTEST_PATRIMONIO_REPROVADO"
        )

    # ==================================================
    # SAÍDA
    # ==================================================

    saida = {

        "modelo":
            "auditoria_backtest_patrimonio_v1",

        "arquivoAuditado":
            str(
                ARQUIVO_BACKTEST
            ),

        "configuracao": {

            "patrimoniosEsperados":
                PATRIMONIOS_ESPERADOS,

            "estrategiasEsperadas":
                ESTRATEGIAS_ESPERADAS,

            "quantidadeTitulares":
                QUANTIDADE_TITULARES,

            "limiteJogadoresClube":
                LIMITE_JOGADORES_CLUBE,

            "coberturaMinimaResultado":
                COBERTURA_MINIMA_RESULTADO,

        },

        "resumo": {

            "rodadas":
                len(
                    rodadas
                ),

            "testesEsperados":
                testes_esperados,

            "testesEncontrados":
                testes_encontrados,

            "testesAprovados":
                testes_aprovados,

            "testesReprovados":
                testes_reprovados,

            "coberturaTestesPercentual":
                arredondar(
                    cobertura_testes
                ),

            "taxaAprovacaoPercentual":
                arredondar(
                    taxa_aprovacao
                ),

            "rodadasRegraTemporalOK":
                rodadas_temporais_aprovadas,

            "taxaRegraTemporalPercentual":
                arredondar(
                    taxa_temporal
                ),

            "falhas":
                falhas_totais,

            "falhasCriticas":
                falhas_criticas,

            "rodadasComErro":
                sorted(
                    rodadas_com_erro
                ),

        },

        "falhasPorCodigo":
            dict(
                falhas_por_codigo
            ),

        "falhasGlobais":
            falhas_globais,

        "testes":
            resultados_testes,

        "decisao": {

            "aprovada":
                aprovada,

            "decisao":
                decisao,

            "podeAvancarIntegracaoSite":
                aprovada,

            "alteraModeloOficial":
                False,

            "promocaoAutomatica":
                False,

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
        "RESUMO DA AUDITORIA"
    )

    print(
        "============================================"
    )

    print(
        "Rodadas:",
        len(
            rodadas
        ),
    )

    print(
        "Testes esperados:",
        testes_esperados,
    )

    print(
        "Testes encontrados:",
        testes_encontrados,
    )

    print(
        "Testes aprovados:",
        testes_aprovados,
    )

    print(
        "Testes reprovados:",
        testes_reprovados,
    )

    print(
        "Cobertura dos testes:",
        f"{cobertura_testes:.2f}%",
    )

    print(
        "Taxa de aprovação:",
        f"{taxa_aprovacao:.2f}%",
    )

    print(
        "Regra temporal:",
        (
            f"{rodadas_temporais_aprovadas}/"
            f"{len(rodadas)}"
        ),
    )

    print(
        "Falhas:",
        falhas_totais,
    )

    print(
        "Falhas críticas:",
        falhas_criticas,
    )

    print(
        "Rodadas com erro:",
        sorted(
            rodadas_com_erro
        ),
    )

    if falhas_por_codigo:

        print()

        print(
            "FALHAS POR TIPO"
        )

        print(
            "--------------------------------------------"
        )

        for codigo, quantidade in (
            falhas_por_codigo.most_common()
        ):

            print(
                codigo,
                ":",
                quantidade,
            )

    print()

    print(
        "Decisão:",
        decisao,
    )

    print(
        "Arquivo:",
        ARQUIVO_SAIDA,
    )

    print(
        "============================================"
    )

    if not aprovada:

        raise SystemExit(
            1
        )


# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    executar()
