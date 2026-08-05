from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_ESCALACOES = Path(
    "data/escalacoes.json"
)

ARQUIVO_SAIDA = Path(
    "data/simulacao-times.json"
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



def normalizar_nome(nome):

    if not nome:

        return ""

    return (
        nome
        .lower()
        .strip()
    )



def carregar_pontuacoes_real(rodada):

    arquivo = (

        PASTA_HISTORICO /

        f"rodada-{rodada:02d}.json"

    )


    dados = carregar_json(
        arquivo
    )


    jogadores = {}


    for jogador in dados.get(
        "jogadores",
        []
    ):


        nome = normalizar_nome(

            jogador.get("nome")

            or jogador.get("apelido")

        )


        if not nome:

            continue


        jogadores[nome] = {


            "nome":

                jogador.get("nome")

                or jogador.get("apelido"),


            "pontos":

                jogador.get(

                    "pontuacaoReal",

                    jogador.get(

                        "pontos",

                        0

                    )

                )

        }


    return jogadores



def calcular_time(
    jogadores,
    pontuacoes
):

    pontos = 0

    detalhes = []


    for jogador in jogadores:


        nome = normalizar_nome(

            jogador.get("nome")

            or jogador.get("apelido")

        )


        dados = pontuacoes.get(

            nome,

            {}

        )


        valor = dados.get(

            "pontos",

            0

        )


        try:

            valor = float(
                valor
            )

        except:

            valor = 0



        pontos += valor


        detalhes.append({

            "nome":

                jogador.get(
                    "nome"
                ),


            "pontos":

                valor

        })



    return {


        "pontos":

            round(

                pontos,

                2

            ),


        "jogadores":

            detalhes

    }



def processar():


    escalacoes = carregar_json(

        ARQUIVO_ESCALACOES

    )


    resultado = {


        "modelo":

            "simulacao_times_v2",


        "descricao":

            "Avaliação histórica das escalações sugeridas pelo modelo",


        "rodadas":

            []

    }



    # aceita lista ou objeto

    if isinstance(

        escalacoes,

        list

    ):


        lista_rodadas = escalacoes



    else:


        lista_rodadas = escalacoes.get(

            "rodadas",

            []

        )



    for rodada_dados in lista_rodadas:


        rodada = rodada_dados.get(

            "rodada"

        )


        if not rodada:

            continue



        pontuacoes = carregar_pontuacoes_real(

            rodada

        )


        registro = {


            "rodada":

                rodada,


            "estrategias":

                []

        }



        for estrategia in rodada_dados.get(

            "estrategias",

            []

        ):



            nome = estrategia.get(

                "nome"

            )


            jogadores = estrategia.get(

                "titulares",

                []

            )


            calculo = calcular_time(

                jogadores,

                pontuacoes

            )


            registro["estrategias"].append({


                "nome":

                    nome,


                "pontos":

                    calculo["pontos"],


                "jogadores":

                    calculo["jogadores"]

            })



        resultado["rodadas"].append(

            registro

        )



    salvar_json(

        ARQUIVO_SAIDA,

        resultado

    )



    print(
        "Simulação histórica de times concluída."
    )


    print(

        "Rodadas processadas:",

        len(

            resultado["rodadas"]

        )

    )



if __name__ == "__main__":

    processar()
