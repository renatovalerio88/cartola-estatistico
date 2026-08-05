from pathlib import Path
import json


ARQUIVO_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_EXPLOSAO = Path(
    "data/potencial-explosao.json"
)

ARQUIVO_SAIDA = Path(
    "data/experimentos/explosao-v1.json"
)


ARQUIVO_SAIDA.parent.mkdir(
    parents=True,
    exist_ok=True
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
            valor
        )
    )



def calcular_ajuste_explosao(
    nota
):

    """
    Transformação conservadora.

    Nota explosão 100:
        +1.5 pontos

    Nota explosão 50:
        +0.5 pontos

    Nota explosão 0:
        0 pontos
    """

    return round(

        (nota / 100) * 1.5,

        2

    )



# =====================================
# CARREGA POTENCIAL EXPLOSÃO
# =====================================


dados_explosao = carregar_json(
    ARQUIVO_EXPLOSAO
)


mapa_explosao = {

    jogador["id"]:

        jogador

    for jogador

    in dados_explosao.get(
        "jogadores",
        []
    )

}



resultados = []


erros_normal = []

erros_explosao = []


arquivos = sorted(

    ARQUIVO_HISTORICO.glob(
        "rodada-*.json"
    )

)



for arquivo in arquivos:


    dados = carregar_json(
        arquivo
    )


    for jogador in dados.get(
        "jogadores",
        []
    ):


        projecao = jogador.get(
            "projecao",
            0
        )


        real = jogador.get(
            "real",
            0
        )


        if real is None:

            continue



        erro_normal = abs(

            real - projecao

        )


        explosao = mapa_explosao.get(

            jogador.get(
                "id"
            )

        )



        ajuste = 0


        if explosao:

            ajuste = calcular_ajuste_explosao(

                explosao.get(
                    "notaExplosao",
                    0
                )

            )



        nova_projecao = round(

            projecao + ajuste,

            2

        )



        erro_com_explosao = abs(

            real - nova_projecao

        )



        erros_normal.append(
            erro_normal
        )


        erros_explosao.append(
            erro_com_explosao
        )



        resultados.append({

            "rodada":

                dados.get(
                    "rodada"
                ),

            "nome":

                jogador.get(
                    "nome"
                ),

            "projecaoOriginal":

                projecao,

            "ajusteExplosao":

                ajuste,

            "novaProjecao":

                nova_projecao,

            "real":

                real,

            "erroOriginal":

                round(
                    erro_normal,
                    2
                ),

            "erroComExplosao":

                round(
                    erro_com_explosao,
                    2
                )

        })



def media(lista):

    if not lista:

        return 0

    return round(

        sum(lista) / len(lista),

        3

    )



melhorias = [

    x

    for x in resultados

    if x["erroComExplosao"]

    <

    x["erroOriginal"]

]



resultado = {


    "modelo":

        "experimento_explosao_v1",


    "jogadoresAnalisados":

        len(
            resultados
        ),


    "erroMedioOriginal":

        media(
            erros_normal
        ),


    "erroMedioComExplosao":

        media(
            erros_explosao
        ),


    "melhorouEm":

        len(
            melhorias
        ),


    "impacto":

        round(

            media(
                erros_normal
            )

            -

            media(
                erros_explosao
            ),

            3

        ),


    "amostras":

        resultados[:100]

}



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
    "Experimento explosão concluído."
)

print(
    "Erro original:",
    resultado["erroMedioOriginal"]
)

print(
    "Erro com explosão:",
    resultado["erroMedioComExplosao"]
)

print(
    "Impacto:",
    resultado["impacto"]
)
