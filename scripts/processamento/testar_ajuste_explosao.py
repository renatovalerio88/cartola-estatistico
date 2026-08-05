from pathlib import Path
import json


PASTA_HISTORICO = Path(
    "data/historico"
)

ARQUIVO_EXPLOSOES = Path(
    "data/explosoes.json"
)

ARQUIVO_SAIDA = Path(
    "data/teste_explosao.json"
)



def carregar_json(caminho):

    with open(
        caminho,
        encoding="utf-8"
    ) as arquivo:

        return json.load(
            arquivo
        )



def salvar_json(
    caminho,
    dados
):

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



# ==========================================
# CARREGA EXPLOSÕES IDENTIFICADAS
# ==========================================

explosoes = carregar_json(
    ARQUIVO_EXPLOSOES
)


ids_explosao = set()


for jogador in explosoes.get(
    "jogadores",
    []
):

    ids_explosao.add(
        jogador.get(
            "id"
        )
    )



print(
    "Jogadores explosão:",
    len(ids_explosao)
)



# ==========================================
# COMPARAÇÃO MODELO ATUAL
# VS
# MODELO COM AJUSTE
# ==========================================


erro_atual = []

erro_ajustado = []


ajuste_explosao = 1.5



arquivos = sorted(
    PASTA_HISTORICO.glob(
        "rodada-*.json"
    )
)



amostras = 0



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


        if projecao is None or real is None:
            continue



        erro_atual.append(

            abs(
                real - projecao
            )

        )



        nova_projecao = projecao



        if jogador.get(
            "id"
        ) in ids_explosao:


            nova_projecao += ajuste_explosao



        erro_ajustado.append(

            abs(
                real - nova_projecao
            )

        )


        amostras += 1




def media(lista):

    if not lista:
        return 0

    return sum(lista) / len(lista)



resultado = {


    "modelo":

        "teste_explosao_v1",


    "amostras":

        amostras,


    "ajusteAplicado":

        ajuste_explosao,


    "modeloAtual":

        {

            "MAE":

                round(
                    media(
                        erro_atual
                    ),
                    3
                )

        },


    "modeloExplosao":

        {

            "MAE":

                round(
                    media(
                        erro_ajustado
                    ),
                    3
                )

        },


    "melhora":

        round(

            media(
                erro_atual
            )
            -
            media(
                erro_ajustado
            ),

            3

        )

}



salvar_json(
    ARQUIVO_SAIDA,
    resultado
)



print(
    "Teste explosão concluído."
)

print(
    resultado
)
