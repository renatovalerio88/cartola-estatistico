from pathlib import Path
import json


ARQUIVO = Path(
    "data/escalacoes.json"
)



def carregar_json(caminho):

    if not caminho.exists():

        print(
            "Arquivo não encontrado:",
            caminho
        )

        return None


    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def analisar(dados):

    print("\n==============================")
    print(" DIAGNÓSTICO ESCALAÇÕES")
    print("==============================\n")


    print(
        "Tipo:",
        type(dados).__name__
    )


    if isinstance(dados, dict):

        print(
            "Chaves principais:"
        )

        for chave in dados.keys():

            print(
                "-",
                chave
            )


    elif isinstance(dados, list):

        print(
            "Quantidade registros:",
            len(dados)
        )



    print("\nPrimeiro registro:\n")


    if isinstance(dados, list):

        if dados:

            primeiro = dados[0]

            print(
                json.dumps(
                    primeiro,
                    ensure_ascii=False,
                    indent=2
                )[:3000]
            )

        else:

            print(
                "Lista vazia"
            )


    elif isinstance(dados, dict):

        print(
            json.dumps(
                dados,
                ensure_ascii=False,
                indent=2
            )[:3000]
        )



def procurar_estruturas(dados):

    print("\n==============================")
    print(" BUSCA DE ESCALAÇÕES")
    print("==============================\n")


    rodadas = []


    if isinstance(dados, dict):

        rodadas = dados.get(
            "rodadas",
            []
        )


    elif isinstance(dados, list):

        rodadas = dados



    print(
        "Rodadas encontradas:",
        len(rodadas)
    )


    if not rodadas:

        print(
            "Nenhuma rodada encontrada."
        )

        return



    for rodada in rodadas[:3]:

        print("\nRegistro:")


        if isinstance(
            rodada,
            dict
        ):

            print(
                "Campos:",
                list(
                    rodada.keys()
                )
            )


            estrategias = rodada.get(
                "estrategias",
                []
            )


            print(
                "Estratégias:",
                len(
                    estrategias
                )
            )


            if estrategias:

                print(
                    "Primeira estratégia:"
                )


                print(
                    json.dumps(
                        estrategias[0],
                        ensure_ascii=False,
                        indent=2
                    )[:1500]
                )



if __name__ == "__main__":


    dados = carregar_json(
        ARQUIVO
    )


    if dados is not None:

        analisar(
            dados
        )

        procurar_estruturas(
            dados
        )
