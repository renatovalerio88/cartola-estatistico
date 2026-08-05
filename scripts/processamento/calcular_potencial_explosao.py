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



def limitar(valor):

    return max(
        0,
        min(
            100,
            round(valor, 2)
        )
    )



def media(lista):

    if not lista:

        return 0

    return sum(lista) / len(lista)



def get_pontos(historico):

    return [

        jogo.get(
            "pontos",
            0
        )
        or 0

        for jogo in historico

    ]



def calcular_explosoes(
    historico,
    posicao
):

    pontos = get_pontos(
        historico
    )


    limite = {

        "ATA": 18,

        "MEI": 18,

        "LAT": 15,

        "ZAG": 12,

        "GOL": 12,

        "TEC": 10

    }.get(

        posicao,

        15

    )


    explosoes = [

        x

        for x in pontos

        if x >= limite

    ]


    return {

        "quantidade":
            len(explosoes),

        "taxa":

            (
                len(explosoes)
                /
                len(pontos)
                *
                100
            )

            if pontos

            else 0,

        "maior":
            max(explosoes)
            if explosoes
            else 0

    }



def calcular_tendencia(
    historico
):

    pontos = get_pontos(
        historico
    )


    if len(pontos) < 6:

        return 0


    recente = media(
        pontos[-3:]
    )


    anterior = media(
        pontos[-6:-3]
    )


    return recente - anterior



def calcular_confianca(
    jogos
):

    if jogos >= 20:

        return 100


    if jogos >= 10:

        return 75


    if jogos >= 5:

        return 50


    return 25



def calcular_nota(
    jogador
):


    historico = jogador.get(
        "historico",
        []
    )


    if not historico:

        return None



    posicao = jogador.get(
        "posicao",
        "OUT"
    )


    jogos = len(
        historico
    )


    explosao = calcular_explosoes(
        historico,
        posicao
    )


    pontos = get_pontos(
        historico
    )


    teto = max(
        pontos
    )


    tendencia = calcular_tendencia(
        historico
    )


    confianca = calcular_confianca(
        jogos
    )



    # ==========================
    # COMPONENTES DA NOTA
    # ==========================


    score_explosao = min(
        explosao["taxa"] * 4,
        100
    )


    score_teto = min(
        teto * 4,
        100
    )


    score_tendencia = max(
        0,
        min(
            tendencia * 8 + 50,
            100
        )
    )


    score_posicao = {

        "ATA": 90,

        "MEI": 85,

        "LAT": 65,

        "ZAG": 55,

        "GOL": 45,

        "TEC": 35

    }.get(

        posicao,

        50

    )



    nota = (

        score_explosao * 0.30

        +

        score_teto * 0.25

        +

        score_tendencia * 0.20

        +

        score_posicao * 0.15

        +

        confianca * 0.10

    )



    motivos = []


    if explosao["quantidade"]:

        motivos.append(

            f'{explosao["quantidade"]} explosões'

        )


    motivos.append(

        f'taxa explosão {round(explosao["taxa"],1)}%'

    )


    if teto >= 15:

        motivos.append(

            f'teto {round(teto,1)}'

        )


    if tendencia > 0:

        motivos.append(

            "momento positivo"

        )


    motivos.append(

        f'confiança {confianca}%'

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

            posicao,


        "notaExplosao":

            limitar(
                nota
            ),


        "explosoes":

            explosao["quantidade"],


        "taxaExplosao":

            round(
                explosao["taxa"],
                2
            ),


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


        "jogos":

            jogos,


        "confianca":

            confianca,


        "motivos":

            motivos

    }



resultado = {

    "modelo":

        "potencial_explosao_v2",


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

        resultado["jogadores"].append(
            calculado
        )



resultado["jogadores"] = sorted(

    resultado["jogadores"],

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
    "Potencial de explosão v2 calculado."
)

print(
    "Jogadores analisados:",
    len(
        resultado["jogadores"]
    )
)
