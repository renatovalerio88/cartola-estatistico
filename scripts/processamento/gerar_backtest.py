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
# COMPONENTES ESTATÍSTICOS
# ======================================================


def media(valores):

    if not valores:

        return 0


    return sum(valores) / len(valores)



def ultimos(valores, quantidade):

    return valores[-quantidade:]



def calcular_media3(valores):

    return media(
        ultimos(
            valores,
            3
        )
    )



def calcular_media5(valores):

    return media(
        ultimos(
            valores,
            5
        )
    )



def calcular_media_geral(valores):

    return media(
        valores
    )



def calcular_tendencia(valores):

    if len(valores) < 2:

        return 0


    return valores[-1] - valores[-2]



def calcular_piso(valores):

    if not valores:

        return 0


    return min(
        valores
    )



def calcular_teto(valores):

    if not valores:

        return 0


    return max(
        valores
    )



def calcular_regularidade(valores):

    if len(valores) < 2:

        return 0


    desvio = statistics.pstdev(
        valores
    )


    return max(
        0,
        10 - desvio
    )



# ======================================================
# MOTOR DE PROJEÇÃO BACKTEST
# ======================================================


def projetar(historico):


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

        return {

            "projecao": 0,

            "media3": 0,

            "media5": 0,

            "mediaGeral": 0,

            "piso": 0,

            "teto": 0,

            "regularidade": 0,

            "tendencia": 0

        }



    media3 = calcular_media3(
        pontos
    )


    media5 = calcular_media5(
        pontos
    )


    mediaGeral = calcular_media_geral(
        pontos
    )


    piso = calcular_piso(
        pontos
    )


    teto = calcular_teto(
        pontos
    )


    regularidade = calcular_regularidade(
        pontos
    )


    tendencia = calcular_tendencia(
        pontos
    )



    projecao = (

        media3 * 0.30

        +

        media5 * 0.25

        +

        mediaGeral * 0.20

        +

        tendencia * 0.15

        +

        regularidade * 0.10

    )



    return {

        "projecao":
            round(
                projecao,
                2
            ),

        "media3":
            round(
                media3,
                2
            ),

        "media5":
            round(
                media5,
                2
            ),

        "mediaGeral":
            round(
                mediaGeral,
                2
            ),

        "piso":
            round(
                piso,
                2
            ),

        "teto":
            round(
                teto,
                2
            ),

        "regularidade":
            round(
                regularidade,
                2
            ),

        "tendencia":
            round(
                tendencia,
                2
            )

    }



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


        resultado_real = historico[indice]



        dados_projecao = projetar(
            treino
        )



        real = resultado_real.get(
            "pontos"
        )


        if real is None:

            continue



        erro = abs(

            real -
            dados_projecao["projecao"]

        )



        rodada = resultado_real.get(
            "rodada"
        )



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
                dados_projecao["projecao"],

            "real":
                real,

            "erro":
                round(
                    erro,
                    2
                ),


            "media3":
                dados_projecao["media3"],

            "media5":
                dados_projecao["media5"],

            "mediaGeral":
                dados_projecao["mediaGeral"],

            "piso":
                dados_projecao["piso"],

            "teto":
                dados_projecao["teto"],

            "regularidade":
                dados_projecao["regularidade"],

            "tendencia":
                dados_projecao["tendencia"]

        })



# ======================================================
# GERAR ARQUIVOS
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



    salvar_json(

        PASTA_SAIDA /

        f"rodada-{rodada:02d}.json",

        {

            "rodada":
                rodada,

            "erroMedio":
                round(
                    media(erros),
                    2
                ),

            "taxaAcerto":

                round(

                    len(
                        [
                            erro
                            for erro in erros
                            if erro <= 3
                        ]
                    )
                    *
                    100
                    /
                    len(erros),

                    2

                )
                if erros
                else 0,


            "quantidade":
                len(jogadores),


            "jogadores":
                jogadores

        }

    )



print(

    f"{len(rodadas)} rodadas processadas."

)
