from pathlib import Path
import json
import statistics


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



# ======================================================
# FUNÇÕES ESTATÍSTICAS
# ======================================================


def media(valores):

    if not valores:
        return 0

    return sum(valores) / len(valores)



def media_ultimos(
    valores,
    quantidade
):

    valores = valores[-quantidade:]

    return media(
        valores
    )



def tendencia(
    valores
):

    if len(valores) < 2:

        return 0


    ultima = valores[-1]

    anterior = valores[-2]


    return ultima - anterior



def regularidade(
    valores
):

    if len(valores) < 2:

        return 0


    try:

        desvio = statistics.pstdev(
            valores
        )


        return max(
            0,
            10 - desvio
        )


    except:

        return 0



def calcular_projecao(
    historico
):


    pontos = [

        item.get(
            "pontos"
        )

        for item in historico

        if item.get(
            "pontos"
        ) is not None

    ]



    if not pontos:

        return 0



    media_recente = media_ultimos(
        pontos,
        3
    )


    media_geral = media(
        pontos
    )


    ajuste_tendencia = tendencia(
        pontos
    )



    projecao = (

        media_recente * 0.50

        +

        media_geral * 0.30

        +

        ajuste_tendencia * 0.20

    )


    return round(
        projecao,
        2
    )



# ======================================================
# BACKTEST PROGRESSIVO
# ======================================================


rodadas = {}



arquivos = sorted(
    PASTA_BASE.glob(
        "*.json"
    )
)



for arquivo in arquivos:


    jogador = carregar_json(
        arquivo
    )


    historico = jogador.get(
        "historico",
        []
    )


    historico = sorted(

        historico,

        key=lambda x:
            x.get(
                "rodada",
                0
            )

    )



    for indice in range(

        1,
        len(historico)

    ):


        treino = historico[:indice]


        rodada_real = historico[indice]



        projecao = calcular_projecao(
            treino
        )


        real = rodada_real.get(
            "pontos"
        )


        if real is None:

            continue



        erro = abs(

            real - projecao

        )


        rodada = rodada_real[
            "rodada"
        ]



        if rodada not in rodadas:

            rodadas[rodada] = []



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

            "projecao":
                projecao,

            "real":
                real,

            "erro":
                round(
                    erro,
                    2
                )

        })



# ======================================================
# SALVAR RESULTADOS
# ======================================================


for rodada, jogadores in rodadas.items():


    jogadores.sort(

        key=lambda x:
            x["projecao"],

        reverse=True

    )



    erros = [

        jogador["erro"]

        for jogador in jogadores

    ]



    erro_medio = round(

        sum(erros)
        /
        len(erros),

        2

    )



    acertos = len([

        erro

        for erro in erros

        if erro <= 3

    ])



    taxa_acerto = round(

        acertos * 100 / len(erros),

        2

    )



    salvar_json(

        PASTA_SAIDA /

        f"rodada-{rodada:02d}.json",

        {

            "rodada":
                rodada,

            "erroMedio":
                erro_medio,

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
