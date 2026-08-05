from pathlib import Path
import json


ARQUIVO_EXPLOSAO = Path(
    "data/potencial-explosao.json"
)


ARQUIVO_SAIDA = Path(
    "data/indice-diferencial.json"
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



def calcular_indice(
    jogador
):

    explosoes = jogador.get(
        "explosoes",
        0
    )


    taxa = jogador.get(
        "taxaExplosao",
        0
    )


    teto = jogador.get(
        "teto",
        0
    )


    tendencia = jogador.get(
        "tendencia",
        0
    )


    confianca = jogador.get(
        "confianca",
        0
    )


    posicao = jogador.get(
        "posicao",
        "OUT"
    )


    # =================================
    # COMPONENTES
    # =================================


    historico = min(

        explosoes * 12,

        100

    )


    taxa_score = min(

        taxa * 5,

        100

    )


    teto_score = min(

        teto * 4,

        100

    )


    tendencia_score = max(

        0,

        min(

            tendencia * 5 + 50,

            100

        )

    )


    confianca_score = confianca



    # jogadores ofensivos têm maior
    # chance de explosão

    posicao_score = {

        "ATA": 90,

        "MEI": 85,

        "LAT": 70,

        "ZAG": 55,

        "GOL": 45,

        "TEC": 35

    }.get(

        posicao,

        50

    )



    indice = (

        historico * 0.30

        +

        taxa_score * 0.20

        +

        teto_score * 0.20

        +

        tendencia_score * 0.15

        +

        posicao_score * 0.10

        +

        confianca_score * 0.05

    )



    perfil = jogador.get(
        "perfilExplosao",
        ""
    )


    motivos = []


    if explosoes > 0:

        motivos.append(

            f"{explosoes} explosões históricas"

        )


    if teto >= 15:

        motivos.append(

            f"teto {round(teto,2)}"

        )


    if tendencia > 0:

        motivos.append(

            "momento positivo"

        )


    if tendencia < 0:

        motivos.append(

            "momento em queda"

        )


    if perfil:

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


        "indiceDiferencial":

            limitar(
                indice
            ),


        "perfilExplosao":

            perfil,


        "explosoes":

            explosoes,


        "teto":

            teto,


        "tendencia":

            tendencia,


        "motivos":

            motivos

    }



dados = carregar_json(

    ARQUIVO_EXPLOSAO

)



resultado = {


    "modelo":

        "indice_diferencial_v1",


    "descricao":

        "Camada estratégica sem alterar projeção base",


    "jogadores":

        []

}



for jogador in dados.get(
    "jogadores",
    []
):


    resultado["jogadores"].append(

        calcular_indice(
            jogador
        )

    )



resultado["jogadores"] = sorted(

    resultado["jogadores"],

    key=lambda x:

        x["indiceDiferencial"],

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
    "Índice diferencial calculado."
)

print(
    "Jogadores:",
    len(
        resultado["jogadores"]
    )
)
