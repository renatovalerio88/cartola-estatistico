"""
=========================================================
CARTOLA ESTATÍSTICO
Diagnóstico das Escalações Históricas

Objetivo:
- validar a camada data/historico-escalacoes
- verificar rodadas disponíveis
- verificar estratégias por rodada
- validar quantidade de titulares
- validar auditorias
- detectar arquivos ausentes ou estruturas inválidas

Estrutura esperada:

data/
└── historico-escalacoes/
    ├── indice.json
    ├── rodada-02.json
    ├── rodada-03.json
    ├── rodada-04.json
    └── ...

Cada arquivo rodada-XX.json deve conter
as estratégias:

- conservador
- equilibrado
- agressivo

=========================================================
"""

from pathlib import Path
import json
import re


# ======================================================
# CONFIGURAÇÕES
# ======================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent

PASTA_HISTORICO = (
    BASE_DIR
    / "data"
    / "historico-escalacoes"
)

ESTRATEGIAS_ESPERADAS = [
    "conservador",
    "equilibrado",
    "agressivo",
]


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

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
            f"[ERRO] Falha ao ler {caminho}: "
            f"{erro}"
        )

        return None


def numero_rodada(caminho):

    nome = caminho.stem

    correspondencia = re.fullmatch(
        r"rodada-(\d+)",
        nome,
    )

    if not correspondencia:

        return 999

    try:

        return int(
            correspondencia.group(1)
        )

    except Exception:

        return 999


# ======================================================
# LOCALIZAÇÃO DAS RODADAS
# ======================================================

def localizar_rodadas():

    if not PASTA_HISTORICO.exists():

        return []

    arquivos = [
        arquivo
        for arquivo in PASTA_HISTORICO.glob(
            "rodada-*.json"
        )
        if (
            arquivo.is_file()
            and numero_rodada(arquivo) != 999
        )
    ]

    return sorted(
        arquivos,
        key=numero_rodada,
    )


# ======================================================
# EXTRAÇÃO DAS ESTRATÉGIAS
# ======================================================

def obter_estrategias(dados):

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

        resultado = {}

        for chave, valor in (
            estrategias.items()
        ):

            nome = str(
                chave
            ).strip().lower()

            resultado[
                nome
            ] = valor

        return resultado

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

            nome = (
                item.get("id")
                or item.get("estrategia")
                or item.get("perfil")
                or item.get("nome")
            )

            if not nome:

                continue

            nome = str(
                nome
            ).strip().lower()

            resultado[
                nome
            ] = item

        return resultado

    return {}


# ======================================================
# EXTRAÇÃO DOS TITULARES
# ======================================================

def obter_titulares(dados):

    if not isinstance(
        dados,
        dict,
    ):

        return []

    candidatos = [
        dados.get(
            "titulares"
        ),
        dados.get(
            "jogadores"
        ),
        dados.get(
            "escalacao"
        ),
    ]

    for candidato in candidatos:

        if isinstance(
            candidato,
            list,
        ):

            return candidato

    time = dados.get(
        "time"
    )

    if isinstance(
        time,
        dict,
    ):

        for chave in [
            "titulares",
            "jogadores",
            "escalacao",
        ]:

            candidato = time.get(
                chave
            )

            if isinstance(
                candidato,
                list,
            ):

                return candidato

    return []


# ======================================================
# AUDITORIA
# ======================================================

def obter_auditoria(dados):

    if not isinstance(
        dados,
        dict,
    ):

        return None

    auditoria = dados.get(
        "auditoria"
    )

    if isinstance(
        auditoria,
        dict,
    ):

        return auditoria

    return None


def auditoria_aprovada(dados):

    if not isinstance(
        dados,
        dict,
    ):

        return None

    auditoria = obter_auditoria(
        dados
    )

    if auditoria is None:

        valores_diretos = [
            dados.get(
                "auditoriaAprovada"
            ),
            dados.get(
                "aprovada"
            ),
            dados.get(
                "aprovado"
            ),
            dados.get(
                "valida"
            ),
            dados.get(
                "valido"
            ),
        ]

        for valor in (
            valores_diretos
        ):

            if isinstance(
                valor,
                bool,
            ):

                return valor

        return None

    valores = [
        auditoria.get(
            "aprovada"
        ),
        auditoria.get(
            "aprovado"
        ),
        auditoria.get(
            "valida"
        ),
        auditoria.get(
            "valido"
        ),
    ]

    for valor in valores:

        if isinstance(
            valor,
            bool,
        ):

            return valor

    status = str(
        auditoria.get(
            "status",
            "",
        )
    ).strip().lower()

    if status in [
        "aprovada",
        "aprovado",
        "ok",
        "válida",
        "valida",
        "válido",
        "valido",
    ]:

        return True

    if status in [
        "reprovada",
        "reprovado",
        "erro",
        "inválida",
        "invalida",
        "inválido",
        "invalido",
    ]:

        return False

    return None


# ======================================================
# DIAGNÓSTICO DE UMA ESTRATÉGIA
# ======================================================

def diagnosticar_estrategia(
    rodada,
    estrategia,
    dados,
    arquivo,
):

    resultado = {
        "rodada": rodada,
        "estrategia": estrategia,
        "arquivo": str(
            arquivo.relative_to(
                BASE_DIR
            )
        ),
        "existe": (
            dados is not None
        ),
        "valido": False,
        "titulares": 0,
        "auditoria": None,
        "problemas": [],
    }

    if dados is None:

        resultado[
            "problemas"
        ].append(
            "estratégia não encontrada"
        )

        return resultado

    if not isinstance(
        dados,
        dict,
    ):

        resultado[
            "problemas"
        ].append(
            "estrutura da estratégia "
            "não é objeto"
        )

        return resultado

    titulares = obter_titulares(
        dados
    )

    resultado[
        "titulares"
    ] = len(
        titulares
    )

    if len(
        titulares
    ) != 11:

        resultado[
            "problemas"
        ].append(
            f"quantidade de titulares = "
            f"{len(titulares)}"
        )

    auditoria = auditoria_aprovada(
        dados
    )

    resultado[
        "auditoria"
    ] = auditoria

    if auditoria is False:

        resultado[
            "problemas"
        ].append(
            "auditoria reprovada"
        )

    resultado[
        "valido"
    ] = (
        len(
            titulares
        ) == 11
        and auditoria is not False
    )

    return resultado


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

    if dados is None:

        for estrategia in (
            ESTRATEGIAS_ESPERADAS
        ):

            resultados.append(
                {
                    "rodada": rodada,
                    "estrategia": estrategia,
                    "arquivo": str(
                        arquivo.relative_to(
                            BASE_DIR
                        )
                    ),
                    "existe": False,
                    "valido": False,
                    "titulares": 0,
                    "auditoria": None,
                    "problemas": [
                        "arquivo ausente "
                        "ou JSON inválido"
                    ],
                }
            )

        return resultados

    if not isinstance(
        dados,
        dict,
    ):

        for estrategia in (
            ESTRATEGIAS_ESPERADAS
        ):

            resultados.append(
                {
                    "rodada": rodada,
                    "estrategia": estrategia,
                    "arquivo": str(
                        arquivo.relative_to(
                            BASE_DIR
                        )
                    ),
                    "existe": True,
                    "valido": False,
                    "titulares": 0,
                    "auditoria": None,
                    "problemas": [
                        "estrutura principal "
                        "não é objeto"
                    ],
                }
            )

        return resultados

    estrategias = obter_estrategias(
        dados
    )

    for estrategia in (
        ESTRATEGIAS_ESPERADAS
    ):

        dados_estrategia = (
            estrategias.get(
                estrategia
            )
        )

        resultado = (
            diagnosticar_estrategia(
                rodada,
                estrategia,
                dados_estrategia,
                arquivo,
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

    rodada = resultado[
        "rodada"
    ]

    estrategia = resultado[
        "estrategia"
    ]

    titulares = resultado[
        "titulares"
    ]

    auditoria = resultado[
        "auditoria"
    ]

    valido = resultado[
        "valido"
    ]

    if auditoria is True:

        texto_auditoria = (
            "OK"
        )

    elif auditoria is False:

        texto_auditoria = (
            "REPROVADA"
        )

    else:

        texto_auditoria = (
            "N/D"
        )

    status = (
        "OK"
        if valido
        else "ERRO"
    )

    print(
        f"[{status}] "
        f"R{rodada:02d} | "
        f"{estrategia.capitalize():11} | "
        f"Titulares: {titulares:2d} | "
        f"Auditoria: {texto_auditoria}"
    )

    for problema in resultado[
        "problemas"
    ]:

        print(
            f"       -> {problema}"
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
        "DIAGNÓSTICO DAS ESCALAÇÕES HISTÓRICAS V3"
    )

    print(
        "============================================"
    )

    print(
        f"Pasta: {PASTA_HISTORICO}"
    )

    print(
        "============================================"
    )

    rodadas = localizar_rodadas()

    if not rodadas:

        print(
            "[ERRO] Nenhuma rodada histórica encontrada."
        )

        print(
            "Esperado:"
        )

        print(
            "data/historico-escalacoes/"
            "rodada-02.json"
        )

        print(
            "data/historico-escalacoes/"
            "rodada-03.json"
        )

        print(
            "..."
        )

        print(
            "============================================"
        )

        raise SystemExit(
            1
        )

    numeros = [
        numero_rodada(
            arquivo
        )
        for arquivo in rodadas
    ]

    print(
        f"Rodadas encontradas: {numeros}"
    )

    print(
        f"Total de rodadas: "
        f"{len(rodadas)}"
    )

    print(
        "============================================"
    )

    resultados = []

    for arquivo in rodadas:

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

    total = len(
        resultados
    )

    aprovadas = sum(
        1
        for resultado in resultados
        if resultado[
            "valido"
        ]
    )

    reprovadas = (
        total
        - aprovadas
    )

    rodadas_com_erro = sorted(
        {
            resultado[
                "rodada"
            ]
            for resultado in resultados
            if not resultado[
                "valido"
            ]
        }
    )

    cobertura = (
        (
            aprovadas
            / total
        ) * 100
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
        f"{len(rodadas)}"
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

    if reprovadas:

        print(
            "AUDITORIA GLOBAL: REPROVADA"
        )

        print(
            "============================================"
        )

        raise SystemExit(
            1
        )

    print(
        "AUDITORIA GLOBAL: APROVADA"
    )

    print(
        "============================================"
    )


# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":

    executar()
