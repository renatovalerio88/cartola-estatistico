from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_SAIDA = Path(
    "data/historico/simulacao_times.json"
)


def carregar_json(caminho):

    if not caminho.exists():

        return {}

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def salvar_json(caminho, dados):

    caminho.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        caminho,
        "w",
        encoding="utf-8"
    ) as arquivo:

        json.dump(
            dados,
            arquivo,
            ensure_ascii=False,
            indent=2
        )



def numero(valor, padrao=0):

    try:

        valor = float(valor)

        return valor

    except:

        return padrao



def ordenar_conservador(jogadores):

    return sorted(

        jogadores,

        key=lambda x:

            (

                numero(
                    x.get("confianca")
                ),

                numero(
                    x.get("piso")
                ),

                numero(
                    x.get("projecao")
                )

            ),

        reverse=True

    )



def ordenar_equilibrado(jogadores):

    return sorted(

        jogadores,

        key=lambda x:

            (

                numero(
                    x.get("projecao")
                )
                * 0.5

                +

                numero(
                    x.get("teto")
                )
                * 0.3

                +

                numero(
                    x.get("confianca")
                )
                * 0.002

            ),

        reverse=True

    )



def ordenar_agressivo(jogadores):

    return sorted(

        jogadores,

        key=lambda x:

            (

                numero(
                    x.get("teto")
                )
                * 0.6

                +

                numero(
                    x.get("notaExplosao")
                )
                * 0.4

            ),

        reverse=True

    )



def montar_time(lista):

    posicoes = {

        "GOL": 1,
        "LAT": 2,
        "ZAG": 2,
        "MEI": 3,
        "ATA": 3,
        "TEC": 1

    }


    selecionados = []


    usados = {

        "GOL":0,
        "LAT":0,
        "ZAG":0,
        "MEI":0,
        "ATA":0,
        "TEC":0

    }


    for jogador in lista:


        posicao = jogador.get(
            "posicao"
        )


        if posicao not in posicoes:

            continue


        if usados[posicao] >= posicoes[posicao]:

            continue


        selecionados.append(
            jogador
        )


        usados[posicao] += 1


        if len(selecionados) == 12:

            break


    return selecionados



def pontuacao_time(time):

    pontos = 0


    for jogador in time:

        pontos += numero(

            jogador.get(
                "pontuacaoReal"
            )

        )


    return round(
        pontos,
        2
    )



def resumo_time(time):

    return {

        "pontos":

            pontuacao_time(
                time
            ),


        "jogadores":

            [

                {

                    "nome":

                        jogador.get(
                            "nome"
                        ),


                    "posicao":

                        jogador.get(
                            "posicao"
                        ),


                    "pontuacao":

                        jogador.get(
                            "pontuacaoReal",
                            0
                        )

                }

                for jogador in time

            ]

    }



resultado = {

    "modelo":

        "simulacao_times_v1",


    "descricao":

        "Simulação histórica das três estratégias de escalação",


    "rodadas":

        []

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


    jogadores = dados.get(
        "jogadores",
        []
    )


    if not jogadores:

        continue



    conservador = montar_time(

        ordenar_conservador(
            jogadores.copy()
        )

    )


    equilibrado = montar_time(

        ordenar_equilibrado(
            jogadores.copy()
        )

    )


    agressivo = montar_time(

        ordenar_agressivo(
            jogadores.copy()
        )

    )


    resultado["rodadas"].append({

        "rodada":

            dados.get(
                "rodada"
            ),


        "times": {


            "conservador":

                resumo_time(
                    conservador
                ),


            "equilibrado":

                resumo_time(
                    equilibrado
                ),


            "agressivo":

                resumo_time(
                    agressivo
                )

        }

    })



salvar_json(

    ARQUIVO_SAIDA,

    resultado

)



print(
    "Simulação histórica de times concluída."
)


print(

    "Rodadas analisadas:",

    len(
        resultado["rodadas"]
    )

)
