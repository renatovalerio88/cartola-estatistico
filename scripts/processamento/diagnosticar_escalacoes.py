"""
=========================================================
CARTOLA ESTATÍSTICO
Diagnóstico das Escalações Históricas

Versão:
diagnostico_escalacoes_v4

Objetivo:
- validar data/historico-escalacoes
- verificar rodadas disponíveis
- validar as 3 estratégias por rodada
- validar formação
- validar titulares
- validar técnico
- validar capitão
- validar banco
- validar Reserva de Luxo
- validar auditoria interna
- validar regra temporal
- detectar estruturas inválidas

IMPORTANTE:

No Cartola, a escalação completa possui:

11 atletas de linha/goleiro
+
1 técnico

Portanto:

12 integrantes no campo "titulares".

=========================================================
"""

from pathlib import Path
import json
import re


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

PASTA_HISTORICO = (
    BASE_DIR
    / "data"
    / "historico-escalacoes"
)

ARQUIVO_INDICE = (
    PASTA_HISTORICO
    / "indice.json"
)


ESTRATEGIAS_ESPERADAS = [
    "conservador",
    "equilibrado",
    "agressivo",
]


FORMACOES = {

    "4-4-2": {
        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 4,
        "ATA": 2,
        "TEC": 1,
    },

    "3-4-3": {
        "GOL": 1,
        "LAT": 0,
        "ZAG": 3,
        "MEI": 4,
        "ATA": 3,
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

}


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
            encoding="utf-8",
        ) as arquivo:

            return json.load(
                arquivo
            )

    except Exception as erro:

        print(
            f"[ERRO] "
            f"Falha ao ler "
            f"{caminho}: "
            f"{erro}"
        )

        return None


def numero_rodada(
    caminho
):

    correspondencia = (
        re.fullmatch(
            r"rodada-(\d+)",
            caminho.stem,
        )
    )

    if not correspondencia:

        return None

    try:

        return int(
            correspondencia.group(1)
        )

    except Exception:

        return None


def texto(
    valor
):

    if valor is None:

        return ""

    return (
        str(valor)
        .strip()
    )


def normalizar(
    valor
):

    return (
        texto(valor)
        .lower()
    )


# ======================================================
# LOCALIZAÇÃO DAS RODADAS
# ======================================================

def localizar_rodadas():

    if not PASTA_HISTORICO.exists():

        return []

    arquivos = []

    for arquivo in (
        PASTA_HISTORICO.glob(
            "rodada-*.json"
        )
    ):

        if not arquivo.is_file():

            continue

        rodada = numero_rodada(
            arquivo
        )

        if rodada is None:

            continue

        arquivos.append(
            arquivo
        )

    return sorted(
        arquivos,
        key=lambda caminho:
            numero_rodada(
                caminho
            )
    )


# ======================================================
# ÍNDICE
# ======================================================

def diagnosticar_indice():

    resultado = {
        "valido": True,
        "problemas": [],
        "dados": None,
    }

    dados = carregar_json(
        ARQUIVO_INDICE
    )

    resultado[
        "dados"
    ] = dados

    if not isinstance(
        dados,
        dict,
    ):

        resultado[
            "valido"
        ] = False

        resultado[
            "problemas"
        ].append(
            "indice.json ausente "
            "ou inválido"
        )

        return resultado

    rodadas = dados.get(
        "rodadasProcessadas"
    )

    if not isinstance(
        rodadas,
        list,
    ):

        resultado[
            "valido"
        ] = False

        resultado[
            "problemas"
        ].append(
            "rodadasProcessadas "
            "não encontrada"
        )

    quantidade = dados.get(
        "quantidadeRodadas"
    )

    if (
        isinstance(
            rodadas,
            list,
        )
        and quantidade != len(
            rodadas
        )
    ):

        resultado[
            "valido"
        ] = False

        resultado[
            "problemas"
        ].append(
            "quantidadeRodadas "
            "diverge de "
            "rodadasProcessadas"
        )

    auditoria_global = (
        dados.get(
            "auditoriaGlobalAprovada"
        )
    )

    if auditoria_global is False:

        resultado[
            "valido"
        ] = False

        resultado[
            "problemas"
        ].append(
            "auditoria global "
            "do índice reprovada"
        )

    return resultado


# ======================================================
# ESTRATÉGIAS
# ======================================================

def obter_estrategias(
    dados
):

    if not isinstance(
        dados,
        dict,
    ):

        return {}

    estrategias = dados.get(
        "estrategias"
    )

    if isinstance(
        estrategias,
        dict,
    ):

        return {
            normalizar(chave):
                valor
            for chave, valor
            in estrategias.items()
        }

    if isinstance(
        estrategias,
        list,
    ):

        resultado = {}

        for item in estrategias:

            if not isinstance(
                item,
                dict,
            ):

                continue

            identificador = (
                item.get("id")
                or item.get("perfil")
                or item.get(
                    "estrategia"
                )
            )

            if not identificador:

                continue

            resultado[
                normalizar(
                    identificador
                )
            ] = item

        return resultado

    return {}


# ======================================================
# AUDITORIA
# ======================================================

def auditoria_aprovada(
    dados
):

    if not isinstance(
        dados,
        dict,
    ):

        return None

    auditoria = dados.get(
        "auditoria"
    )

    if not isinstance(
        auditoria,
        dict,
    ):

        return None

    valor = auditoria.get(
        "aprovada"
    )

    if isinstance(
        valor,
        bool,
    ):

        return valor

    return None


# ======================================================
# FORMAÇÃO
# ======================================================

def quantidade_esperada(
    estrategia
):

    if not isinstance(
        estrategia,
        dict,
    ):

        return 0

    informada = (
        estrategia.get(
            "quantidadeEsperada"
        )
    )

    try:

        informada = int(
            informada
        )

        if informada > 0:

            return informada

    except Exception:

        pass

    formacao = texto(
        estrategia.get(
            "formacao"
        )
    )

    estrutura = FORMACOES.get(
        formacao
    )

    if not estrutura:

        return 0

    return sum(
        estrutura.values()
    )


def contar_posicoes(
    titulares
):

    resultado = {
        "GOL": 0,
        "LAT": 0,
        "ZAG": 0,
        "MEI": 0,
        "ATA": 0,
        "TEC": 0,
    }

    for jogador in titulares:

        if not isinstance(
            jogador,
            dict,
        ):

            continue

        posicao = texto(
            jogador.get(
                "posicao"
            )
        ).upper()

        if posicao in resultado:

            resultado[
                posicao
            ] += 1

    return resultado


# ======================================================
# CAPITÃO
# ======================================================

def validar_capitao(
    estrategia,
    titulares
):

    capitao = estrategia.get(
        "capitao"
    )

    if not isinstance(
        capitao,
        dict,
    ):

        return False

    capitao_id = (
        capitao.get(
            "id"
        )
    )

    if capitao_id is None:

        return False

    for jogador in titulares:

        if not isinstance(
            jogador,
            dict,
        ):

            continue

        if str(
            jogador.get(
                "id"
            )
        ) == str(
            capitao_id
        ):

            return (
                texto(
                    jogador.get(
                        "posicao"
                    )
                ).upper()
                != "TEC"
            )

    return False


# ======================================================
# BANCO
# ======================================================

def validar_banco(
    estrategia,
    titulares
):

    banco = estrategia.get(
        "banco"
    )

    if not isinstance(
        banco,
        list,
    ):

        return False

    if len(
        banco
    ) == 0:

        return False

    ids_titulares = {
        str(
            jogador.get(
                "id"
            )
        )
        for jogador in titulares
        if isinstance(
            jogador,
            dict,
        )
    }

    ids_banco = []

    for jogador in banco:

        if not isinstance(
            jogador,
            dict,
        ):

            return False

        jogador_id = jogador.get(
            "id"
        )

        if jogador_id is None:

            return False

        jogador_id = str(
            jogador_id
        )

        if jogador_id in (
            ids_titulares
        ):

            return False

        ids_banco.append(
            jogador_id
        )

    return (
        len(ids_banco)
        ==
        len(set(ids_banco))
    )


# ======================================================
# RESERVA DE LUXO
# ======================================================

def validar_reserva_luxo(
    estrategia
):

    reserva = estrategia.get(
        "reservaLuxo"
    )

    banco = estrategia.get(
        "banco"
    )

    if not isinstance(
        reserva,
        dict,
    ):

        return False

    if not isinstance(
        banco,
        list,
    ):

        return False

    reserva_id = reserva.get(
        "id"
    )

    if reserva_id is None:

        return False

    return any(

        isinstance(
            jogador,
            dict,
        )

        and

        str(
            jogador.get(
                "id"
            )
        ) == str(
            reserva_id
        )

        for jogador in banco

    )


# ======================================================
# VAZAMENTO FUTURO
# ======================================================

def possui_resultado_real(
    jogador
):

    if not isinstance(
        jogador,
        dict,
    ):

        return False

    campos_proibidos = {
        "pontuacaoReal",
        "resultadoReal",
        "pontuacaoDaRodada",
        "real",
    }

    return any(
        campo in jogador
        for campo
        in campos_proibidos
    )


def validar_sem_vazamento(
    estrategia
):

    jogadores = []

    titulares = estrategia.get(
        "titulares",
        []
    )

    banco = estrategia.get(
        "banco",
        []
    )

    if isinstance(
        titulares,
        list,
    ):

        jogadores.extend(
            titulares
        )

    if isinstance(
        banco,
        list,
    ):

        jogadores.extend(
            banco
        )

    capitao = estrategia.get(
        "capitao"
    )

    if isinstance(
        capitao,
        dict,
    ):

        jogadores.append(
            capitao
        )

    reserva = estrategia.get(
        "reservaLuxo"
    )

    if isinstance(
        reserva,
        dict,
    ):

        jogadores.append(
            reserva
        )

    return not any(
        possui_resultado_real(
            jogador
        )
        for jogador
        in jogadores
    )


# ======================================================
# DIAGNÓSTICO DA ESTRATÉGIA
# ======================================================

def diagnosticar_estrategia(
    rodada,
    estrategia_id,
    estrategia,
):

    problemas = []

    if not isinstance(
        estrategia,
        dict,
    ):

        return {
            "rodada": rodada,
            "estrategia":
                estrategia_id,
            "valido": False,
            "titulares": 0,
            "esperados": 0,
            "auditoria": None,
            "problemas": [
                "estratégia ausente"
            ],
        }

    titulares = estrategia.get(
        "titulares"
    )

    if not isinstance(
        titulares,
        list,
    ):

        titulares = []

        problemas.append(
            "titulares ausentes"
        )

    esperados = quantidade_esperada(
        estrategia
    )

    quantidade = len(
        titulares
    )

    if esperados <= 0:

        problemas.append(
            "formação inválida"
        )

    elif quantidade != esperados:

        problemas.append(
            f"titulares = "
            f"{quantidade}; "
            f"esperado = "
            f"{esperados}"
        )

    formacao = texto(
        estrategia.get(
            "formacao"
        )
    )

    estrutura = FORMACOES.get(
        formacao
    )

    if estrutura:

        contagem = contar_posicoes(
            titulares
        )

        for (
            posicao,
            quantidade_posicao
        ) in estrutura.items():

            encontrados = (
                contagem.get(
                    posicao,
                    0
                )
            )

            if (
                encontrados
                != quantidade_posicao
            ):

                problemas.append(
                    f"{posicao}: "
                    f"{encontrados}/"
                    f"{quantidade_posicao}"
                )

    ids = [

        str(
            jogador.get(
                "id"
            )
        )

        for jogador in titulares

        if (
            isinstance(
                jogador,
                dict,
            )
            and jogador.get(
                "id"
            ) is not None
        )

    ]

    if len(ids) != quantidade:

        problemas.append(
            "titular sem ID"
        )

    if len(
        ids
    ) != len(
        set(ids)
    ):

        problemas.append(
            "titular duplicado"
        )

    if not validar_capitao(
        estrategia,
        titulares,
    ):

        problemas.append(
            "capitão inválido"
        )

    if not validar_banco(
        estrategia,
        titulares,
    ):

        problemas.append(
            "banco inválido"
        )

    if not validar_reserva_luxo(
        estrategia
    ):

        problemas.append(
            "Reserva de Luxo inválida"
        )

    if not validar_sem_vazamento(
        estrategia
    ):

        problemas.append(
            "possível vazamento "
            "de resultado real"
        )

    auditoria = (
        auditoria_aprovada(
            estrategia
        )
    )

    if auditoria is False:

        problemas.append(
            "auditoria interna "
            "reprovada"
        )

    valido = (
        len(
            problemas
        ) == 0
    )

    return {
        "rodada": rodada,
        "estrategia":
            estrategia_id,
        "valido":
            valido,
        "titulares":
            quantidade,
        "esperados":
            esperados,
        "auditoria":
            auditoria,
        "problemas":
            problemas,
    }


# ======================================================
# DIAGNÓSTICO DA RODADA
# ======================================================

def diagnosticar_rodada(
    arquivo
):

    rodada = numero_rodada(
        arquivo
    )

    dados = carregar_json(
        arquivo
    )

    resultados = []

    if not isinstance(
        dados,
        dict,
    ):

        for estrategia in (
            ESTRATEGIAS_ESPERADAS
        ):

            resultados.append({
                "rodada":
                    rodada,
                "estrategia":
                    estrategia,
                "valido":
                    False,
                "titulares":
                    0,
                "esperados":
                    0,
                "auditoria":
                    None,
                "problemas": [
                    "arquivo da rodada "
                    "inválido"
                ],
            })

        return resultados

    rodada_interna = dados.get(
        "rodada"
    )

    try:

        rodada_interna = int(
            rodada_interna
        )

    except Exception:

        rodada_interna = None

    if (
        rodada_interna
        != rodada
    ):

        print(
            f"[AVISO] "
            f"R{rodada:02d}: "
            f"campo rodada interno "
            f"= {rodada_interna}"
        )

    limite_historico = dados.get(
        "dadosUtilizadosAteRodada"
    )

    esperado_limite = (
        rodada - 1
    )

    if (
        limite_historico
        != esperado_limite
    ):

        print(
            f"[AVISO] "
            f"R{rodada:02d}: "
            f"histórico encerra em "
            f"R{limite_historico}; "
            f"esperado R"
            f"{esperado_limite:02d}"
        )

    estrategias = obter_estrategias(
        dados
    )

    for estrategia_id in (
        ESTRATEGIAS_ESPERADAS
    ):

        resultado = (
            diagnosticar_estrategia(

                rodada,

                estrategia_id,

                estrategias.get(
                    estrategia_id
                ),

            )
        )

        resultados.append(
            resultado
        )

    return resultados


# ======================================================
# IMPRESSÃO
# ======================================================

def imprimir_resultado(
    resultado
):

    status = (
        "OK"
        if resultado[
            "valido"
        ]
        else "ERRO"
    )

    auditoria = resultado[
        "auditoria"
    ]

    if auditoria is True:

        texto_auditoria = "OK"

    elif auditoria is False:

        texto_auditoria = (
            "REPROVADA"
        )

    else:

        texto_auditoria = "N/D"

    print(

        f"[{status}] "

        f"R"
        f"{resultado['rodada']:02d}"

        f" | "

        f"{resultado['estrategia'].capitalize():11}"

        f" | Titulares: "
        f"{resultado['titulares']}/"
        f"{resultado['esperados']}"

        f" | Auditoria: "
        f"{texto_auditoria}"

    )

    for problema in (
        resultado[
            "problemas"
        ]
    ):

        print(
            f"       -> "
            f"{problema}"
        )


# ======================================================
# EXECUÇÃO
# ======================================================

def executar():

    print(
        "============================================"
    )

    print(
        "CARTOLA ESTATÍSTICO"
    )

    print(
        "DIAGNÓSTICO DAS ESCALAÇÕES HISTÓRICAS V4"
    )

    print(
        "============================================"
    )

    print(
        f"Pasta: "
        f"{PASTA_HISTORICO}"
    )

    print(
        "Regra de escalação: "
        "11 atletas + 1 técnico "
        "= 12 titulares"
    )

    print(
        "============================================"
    )

    # ==================================================
    # ÍNDICE
    # ==================================================

    resultado_indice = (
        diagnosticar_indice()
    )

    if resultado_indice[
        "valido"
    ]:

        print(
            "[OK] indice.json"
        )

    else:

        print(
            "[ERRO] indice.json"
        )

        for problema in (
            resultado_indice[
                "problemas"
            ]
        ):

            print(
                f"       -> "
                f"{problema}"
            )

    print(
        "============================================"
    )

    # ==================================================
    # RODADAS
    # ==================================================

    arquivos = localizar_rodadas()

    if not arquivos:

        print(
            "[ERRO] "
            "Nenhuma rodada histórica "
            "encontrada."
        )

        raise SystemExit(
            1
        )

    numeros = [

        numero_rodada(
            arquivo
        )

        for arquivo in arquivos

    ]

    print(
        f"Rodadas encontradas: "
        f"{numeros}"
    )

    print(
        f"Total de rodadas: "
        f"{len(arquivos)}"
    )

    print(
        "============================================"
    )

    resultados = []

    for arquivo in arquivos:

        resultados_rodada = (
            diagnosticar_rodada(
                arquivo
            )
        )

        resultados.extend(
            resultados_rodada
        )

        for resultado in (
            resultados_rodada
        ):

            imprimir_resultado(
                resultado
            )

    # ==================================================
    # RESUMO
    # ==================================================

    total = len(
        resultados
    )

    aprovadas = sum(

        1

        for resultado
        in resultados

        if resultado[
            "valido"
        ]

    )

    reprovadas = (
        total
        -
        aprovadas
    )

    rodadas_com_erro = sorted({

        resultado[
            "rodada"
        ]

        for resultado
        in resultados

        if not resultado[
            "valido"
        ]

    })

    cobertura = (

        (
            aprovadas
            /
            total
        )
        *
        100

        if total

        else 0

    )

    print(
        "============================================"
    )

    print(
        "RESUMO DO DIAGNÓSTICO"
    )

    print(
        "============================================"
    )

    print(
        f"Rodadas analisadas: "
        f"{len(arquivos)}"
    )

    print(
        f"Escalações esperadas: "
        f"{total}"
    )

    print(
        f"Escalações aprovadas: "
        f"{aprovadas}"
    )

    print(
        f"Escalações reprovadas: "
        f"{reprovadas}"
    )

    print(
        f"Cobertura válida: "
        f"{round(cobertura, 2)}%"
    )

    print(
        f"Rodadas com erro: "
        f"{rodadas_com_erro}"
    )

    print(
        "============================================"
    )

    # ==================================================
    # RESULTADO FINAL
    # ==================================================

    indice_ok = (
        resultado_indice[
            "valido"
        ]
    )

    if (
        reprovadas > 0
        or not indice_ok
    ):

        print(
            "AUDITORIA GLOBAL: "
            "REPROVADA"
        )

        print(
            "============================================"
        )

        raise SystemExit(
            1
        )

    print(
        "AUDITORIA GLOBAL: "
        "APROVADA"
    )

    print(
        "============================================"
    )


# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":

    executar()
