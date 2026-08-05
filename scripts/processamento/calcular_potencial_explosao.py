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



def pontos_historico(historico):

    return [

        jogo.get(
            "pontos",
            0
        )
        or 0

        for jogo in historico

    ]



def limite_explosao(posicao):

    return {

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



def analisar_explosoes(
    historico,
    posicao
):

    pontos = pontos_historico(
        historico
    )


    limite = limite_explosao(
        posicao
    )


    explosoes = [

        p

        for p in pontos

        if p >= limite

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

    pontos = pontos_historico(
        historico
    )


    if len(pontos) < 6:

        return 0



    atual = media(
        pontos[-3:]
    )


    anterior = media(
        pontos[-6:-3]
    )


    return atual - anterior



def confianca(
    jogos
):

    if jogos >= 20:

        return 100


    if jogos >= 10:

        return 75


    if jogos >= 5:

        return 50


    return 25



def calcular_perfil(
    explosoes,
    tendencia
):


    if explosoes >= 3:

        if tendencia >= 0:

            return "Explosao_Comprovada"

        return "Explosao_Comprovada_EmQueda"



    if explosoes > 0:

        if tendencia > 0:

            return "Explosao_Em_Evolucao"

        return "Explosao_Ocasional"



    if tendencia > 5:

        return "Promessa"


    return "Baixo_Risco"



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


    pontos = pontos_historico(
        historico
    )


    jogos = len(
        pontos
    )


    explosao = analisar_explosoes(
        historico,
        posicao
    )


    teto = max(
        pontos
    )


    tendencia = calcular_tendencia(
        historico
    )


    confi = confianca(
        jogos
    )



    # ================================
    # COMPONENTES
    # ================================


    score_historico = min(

        explosao["taxa"] * 5,

        100

    )


    score_teto = min(

        teto * 3,

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

        score_historico * 0.40

        +

        score_teto * 0.20

        +

        score_tendencia * 0.20

        +

        score_posicao * 0.10

        +

        confi * 0.10

    )


    # Penalização para quem nunca explodiu

    if explosao["quantidade"] == 0:

        nota -= 10



    perfil = calcular_perfil(

        explosao["quantidade"],

        tendencia

    )



    motivos = []


    if explosao["quantidade"]:

        motivos.append(

            f'{explosao["quantidade"]} explosões históricas'

        )


    motivos.append(

        f'taxa {round(explosao["taxa"],2)}%'

    )


    if teto >= 15:

        motivos.append(

            f'teto {round(teto,2)}'

        )


    if tendencia > 0:

        motivos.append(

            "momento positivo"

        )


    if tendencia < 0:

        motivos.append(

            "momento em queda"

        )


    motivos.append(

        perfil

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


        "perfilExplosao":

            perfil,


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

            confi,


        "motivos":

            motivos

    }



resultado = {

    "modelo":

        "potencial_explosao_v3",


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
    "Potencial de explosão v3 calculado."
)

print(
    "Jogadores analisados:",
    len(
        resultado["jogadores"]
    )
)
