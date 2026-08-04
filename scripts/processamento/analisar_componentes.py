from pathlib import Path
import json
import math


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_SAIDA = Path(
    "data/componentes.json"
)


def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(arquivo)



def media(lista):

    if not lista:
        return 0

    return sum(lista) / len(lista)



def calcular_rmse(erros):

    if not erros:
        return 0

    return math.sqrt(
        sum(
            erro ** 2
            for erro in erros
        )
        /
        len(erros)
    )



def coletar_componentes():

    componentes = {

        "projecao": [],

        "real": [],

        "erro": [],

        "media3": [],

        "media5": [],

        "mediaGeral": [],

        "piso": [],

        "teto": [],

        "regularidade": [],

        "tendencia": []

    }


    arquivos = sorted(
        PASTA_HISTORICO.glob(
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


            componentes[
                "projecao"
            ].append(
                jogador.get(
                    "projecao",
                    0
                )
            )


            componentes[
                "real"
            ].append(
                jogador.get(
                    "real",
                    0
                )
            )


            componentes[
                "erro"
            ].append(
                abs(
                    jogador.get(
                        "erro",
                        0
                    )
                )
            )


            componentes[
                "media3"
            ].append(
                jogador.get(
                    "media3",
                    0
                )
            )


            componentes[
                "media5"
            ].append(
                jogador.get(
                    "media5",
                    0
                )
            )


            componentes[
                "mediaGeral"
            ].append(
                jogador.get(
                    "mediaGeral",
                    0
                )
            )


            componentes[
                "piso"
            ].append(
                jogador.get(
                    "piso",
                    0
                )
            )


            componentes[
                "teto"
            ].append(
                jogador.get(
                    "teto",
                    0
                )
            )


            componentes[
                "regularidade"
            ].append(
                jogador.get(
                    "regularidade",
                    0
                )
            )


            componentes[
                "tendencia"
            ].append(
                jogador.get(
                    "tendencia",
                    0
                )
            )


    return componentes



def avaliar():

    dados = coletar_componentes()


    erros = dados[
        "erro"
    ]


    resultado = {

        "modelo":

            "laboratorio_v2",


        "amostras":

            len(erros),


        "erroMedio":

            round(
                media(erros),
                2
            ),


        "rmse":

            round(
                calcular_rmse(erros),
                2
            ),


        "componentes": {},


        "posicoes": {}

    }


    for nome, valores in dados.items():


        if nome in (
            "erro",
            "projecao",
            "real"
        ):
            continue


        resultado[
            "componentes"
        ][nome] = {


            "media":

                round(
                    media(valores),
                    2
                ),


            "quantidade":

                len(valores)

        }



    arquivos = sorted(
        PASTA_HISTORICO.glob(
            "rodada-*.json"
        )
    )


    posicoes = {}


    for arquivo in arquivos:


        dados = carregar_json(
            arquivo
        )


        for jogador in dados.get(
            "jogadores",
            []
        ):


            posicao = jogador.get(
                "posicao",
                "OUT"
            )


            posicoes.setdefault(
                posicao,
                []
            ).append(
                abs(
                    jogador.get(
                        "erro",
                        0
                    )
                )
            )



    for posicao, erros_pos in posicoes.items():

        resultado[
            "posicoes"
        ][posicao] = {

            "quantidade":

                len(erros_pos),


            "erroMedio":

                round(
                    media(erros_pos),
                    2
                ),


            "rmse":

                round(
                    calcular_rmse(
                        erros_pos
                    ),
                    2
                )

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
        "Componentes analisados.",
        "Amostras:",
        len(erros)
    )



if __name__ == "__main__":

    avaliar()
