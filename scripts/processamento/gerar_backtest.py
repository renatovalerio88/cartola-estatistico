from pathlib import Path
import json


PASTA_BASE = Path(
    "data/base-historica"
)

PASTA_SAIDA = Path(
    "data/historico"
)


PASTA_SAIDA.mkdir(
    parents=True,
    exist_ok=True
)



def carregar_json(caminho):

    with open(
        caminho,
        "r",
        encoding="utf-8"
    ) as f:

        return json.load(f)



def salvar_json(
    caminho,
    dados
):

    with open(
        caminho,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            dados,
            f,
            ensure_ascii=False,
            indent=2
        )



arquivos = sorted(
    PASTA_BASE.glob("*.json")
)



rodadas = {}



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    historico = jogador.get(
        "historico",
        []
    )


    historico.sort(
        key=lambda x:
            x["rodada"]
    )



    for indice in range(
        1,
        len(historico)
    ):


        treino = historico[
            :indice
        ]


        rodada_prevista = historico[
            indice
        ]



        pesos = []

        for posicao, item in enumerate(
            treino
        ):

            pesos.append(
                posicao + 1
            )



        soma_pesos = sum(
            pesos
        )



        if soma_pesos == 0:

            continue



        projecao = sum(

            (
                item.get(
                    "pontos"
                )
                or 0
            )
            *
            peso

            for item, peso
            in zip(
                treino,
                pesos
            )

        ) / soma_pesos



        rodada = rodada_prevista[
            "rodada"
        ]



        if rodada not in rodadas:

            rodadas[rodada] = []



        real = rodada_prevista.get(
            "pontos"
        )



        if real is None:

            continue



        erro = (
            real
            -
            projecao
        )



        rodadas[rodada].append({

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


            "clube":

                jogador.get(
                    "clube"
                ),


            "preco":

                rodada_prevista.get(
                    "preco"
                ),


            "media":

                rodada_prevista.get(
                    "media"
                ),


            "jogos":

                rodada_prevista.get(
                    "jogos"
                ),


            "projecao":

                round(
                    projecao,
                    2
                ),


            "real":

                real,


            "erro":

                round(
                    erro,
                    2
                )

        })



for rodada, jogadores in rodadas.items():


    jogadores.sort(

        key=lambda x:

            x.get(
                "projecao",
                0
            ),

        reverse=True

    )



    erros = [

        abs(
            jogador["erro"]
        )

        for jogador in jogadores

    ]



    media_erro = round(

        sum(erros)
        /
        len(erros),

        2

    )



    maior_erro = round(

        max(erros),

        2

    )



    menor_erro = round(

        min(erros),

        2

    )



    acertos = len([

        erro

        for erro in erros

        if erro <= 3

    ])



    taxa_acerto = round(

        acertos
        *
        100
        /
        len(erros),

        2

    )



    salvar_json(

        PASTA_SAIDA
        /
        f"rodada-{rodada:02d}.json",


        {

            "rodada":

                rodada,


            "erroMedio":

                media_erro,


            "maiorErro":

                maior_erro,


            "menorErro":

                menor_erro,


            "taxaAcerto":

                taxa_acerto,


            "quantidade":

                len(jogadores),


            "jogadores":

                jogadores

        }

    )



print(
    f"{len(rodadas)} rodadas processadas."
)
