from pathlib import Path
import json


PASTA_HISTORICO = Path("data/historico")

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
        return json.load(arquivo)



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



def classificar_jogadores(jogadores):

    ordenados = sorted(
        jogadores,
        key=lambda x: x.get(
            "projecao",
            0
        ),
        reverse=True
    )

    return ordenados



def montar_time(jogadores, estrategia):

    if estrategia == "Conservador":

        filtro = jogadores[:]

        filtro.sort(
            key=lambda x:
            x.get(
                "risco",
                50
            )
        )


    elif estrategia == "Agressivo":

        filtro = jogadores[:]

        filtro.sort(
            key=lambda x:
            x.get(
                "teto",
                0
            ),
            reverse=True
        )


    else:

        filtro = jogadores



    return filtro[:11]



def pontuacao_real(time):

    total = 0

    jogadores = []

    for jogador in time:

        pontos = jogador.get(
            "pontuacaoReal",
            jogador.get(
                "pontos",
                0
            )
        )

        total += pontos


        jogadores.append({

            "nome":
                jogador.get(
                    "nome"
                ),

            "pontos":
                pontos

        })


    return round(
        total,
        2
    ), jogadores



resultado = {


    "modelo":

        "simulacao_times_v1",


    "descricao":

        "Simulação histórica das escalações recomendadas",


    "estrategias": [

        "Conservador",
        "Equilibrado",
        "Agressivo"

    ],


    "times": []

}



totais = {}



for estrategia in resultado["estrategias"]:

    totais[estrategia] = 0



for arquivo in sorted(
    PASTA_HISTORICO.glob(
        "rodada-*.json"
    )
):


    dados = carregar_json(
        arquivo
    )


    rodada = dados.get(
        "rodada"
    )


    jogadores = dados.get(
        "jogadores",
        []
    )


    jogadores = classificar_jogadores(
        jogadores
    )


    registro = {

        "rodada":
            rodada,

        "estrategias":
            []

    }



    for estrategia in resultado["estrategias"]:


        time = montar_time(
            jogadores,
            estrategia
        )


        pontos, lista = pontuacao_real(
            time
        )


        totais[estrategia] += pontos



        registro["estrategias"].append({

            "nome":
                estrategia,

            "pontos":
                pontos,

            "jogadores":
                lista

        })



    resultado["times"].append(
        registro
    )



resultado["resumo"] = []



for nome, total in totais.items():

    resultado["resumo"].append({

        "nome":
            nome,

        "pontosTotal":
            round(
                total,
                2
            ),

        "mediaRodada":
            round(
                total /
                len(resultado["times"])
                if resultado["times"]
                else 0,
                2
            )

    })



resultado["resumo"] = sorted(
    resultado["resumo"],
    key=lambda x:
    x["pontosTotal"],
    reverse=True
)



salvar_json(
    ARQUIVO_SAIDA,
    resultado
)



print(
    "Simulação de times concluída."
)


for item in resultado["resumo"]:

    print(
        item["nome"],
        item["pontosTotal"]
    )
