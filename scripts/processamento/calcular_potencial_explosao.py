from pathlib import Path
import json


PASTA_BASE = Path(
    "data/base-historica"
)

ARQUIVO_SAIDA = Path(
    "data/potencial-explosao.json"
)



def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def media(lista):

    if not lista:

        return 0

    return sum(lista) / len(lista)



def limitar(valor):

    return max(
        0,
        min(
            100,
            round(valor, 2)
        )
    )



def calcular_explosoes(historico):

    pontos = [

        x.get(
            "pontos",
            0
        )
        or 0

        for x in historico

    ]


    return len(

        [

            x

            for x in pontos

            if x >= 15

        ]

    )



def calcular_teto(historico):

    pontos = [

        x.get(
            "pontos",
            0
        )
        or 0

        for x in historico

    ]


    if not pontos:

        return 0


    return max(
        pontos
    )



def calcular_tendencia(historico):

    pontos = [

        x.get(
            "pontos",
            0
        )
        or 0

        for x in historico

    ]


    if len(pontos) < 6:

        return 0


    ultimos3 = media(
        pontos[-3:]
    )


    anteriores3 = media(
        pontos[-6:-3]
    )


    return ultimos3 - anteriores3



def calcular_nota(
    jogador
):

    historico = jogador.get(
        "historico",
        []
    )


    if not historico:

        return None



    explosoes = calcular_explosoes(
        historico
    )


    teto = calcular_teto(
        historico
    )


    tendencia = calcular_tendencia(
        historico
    )


    jogos = len(
        historico
    )


    # ================================
    # COMPONENTES
    # ================================


    fator_explosao = min(
        explosoes * 15,
        100
    )


    fator_teto = min(
        teto * 5,
        100
    )


    fator_tendencia = max(
        0,
        min(
            tendencia * 10 + 50,
            100
        )
    )


    fator_posicao = {

        "ATA": 90,

        "MEI": 80,

        "LAT": 60,

        "ZAG": 50,

        "GOL": 40,

        "TEC": 30

    }.get(

        jogador.get(
            "posicao"
        ),

        50

    )


    nota = (

        fator_explosao * 0.30

        +

        fator_teto * 0.25

        +

        fator_tendencia * 0.20

        +

        fator_posicao * 0.15

        +

        min(
            jogos * 5,
            100
        ) * 0.10

    )


    motivos = []


    if explosoes > 0:

        motivos.append(
            f"{explosoes} explosões históricas"
        )


    if teto >= 15:

        motivos.append(
            f"teto histórico {round(teto,1)}"
        )


    if tendencia > 0:

        motivos.append(
            "tendência positiva"
        )


    if jogador.get(
        "posicao"
    ) in [
        "ATA",
        "MEI"
    ]:

        motivos.append(
            "posição ofensiva"
        )



    return {

        "id":
            jogador.get(
                "id"
            ),

        "nome":
            jogador.get(
                "nome"
            ),

        "posicao":
            jogador.get(
                "posicao"
            ),

        "notaExplosao":
            limitar(
                nota
            ),

        "explosoes":
            explosoes,

        "teto":
            round(
                teto,
                2
            ),

        "tendencia":
            round(
                tendencia,
                2
            ),

        "motivos":
            motivos

    }



resultado = {

    "modelo":
        "potencial_explosao_v1",

    "jogadores":
        []

}



arquivos = sorted(

    PASTA_BASE.glob(
        "*.json"
    )

)



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    calculado = calcular_nota(
        jogador
    )


    if calculado:

        resultado[
            "jogadores"
        ].append(
            calculado
        )



resultado[
    "jogadores"
] = sorted(

    resultado[
        "jogadores"
    ],

    key=lambda x:
        x["notaExplosao"],

    reverse=True

)



with open(

    ARQUIVO_SAIDA,

    "w",

    encoding="utf-8"

) as arquivo:


    json.dump(

        resultado,

        arquivo,

        ensure_ascii=False,

        indent=2

    )



print(
    "Potencial de explosão calculado."
)

print(
    "Jogadores analisados:",
    len(
        resultado["jogadores"]
    )
)
