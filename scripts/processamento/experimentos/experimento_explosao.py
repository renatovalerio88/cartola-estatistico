from pathlib import Path
import json


# ======================================================
# EXPERIMENTO EXPLOSÃO
#
# Objetivo:
# Comparar:
#
# 1) Modelo Base
# 2) Modelo Base + Índice de Explosão
#
# Sem alterar o modelo principal.
# Apenas medir impacto.
# ======================================================


PASTA_HISTORICO = Path(
    "data/historico"
)


ARQUIVO_EXPLOSOES = Path(
    "data/explosoes.json"
)


ARQUIVO_SAIDA = Path(
    "data/experimentos/experimento-explosao.json"
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



def media(lista):

    if not lista:
        return 0

    return round(
        sum(lista) / len(lista),
        3
    )



def calcular_erro(valor1, valor2):

    return abs(
        valor1 - valor2
    )



def carregar_jogadores_historico():

    jogadores = []


    for arquivo in sorted(
        PASTA_HISTORICO.glob(
            "rodada-*/jogadores.json"
        )
    ):

        dados = carregar_json(
            arquivo
        )


        rodada = dados.get(
            "rodada"
        )


        lista = dados.get(
            "jogadores",
            []
        )


        for jogador in lista:

            jogador["rodadaAnalise"] = rodada

            jogadores.append(
                jogador
            )


    return jogadores



def buscar_explosao(
    jogador_id,
    explosoes
):

    encontrados = [

        x

        for x in explosoes

        if x.get("id") == jogador_id

    ]


    if not encontrados:
        return None


    encontrados.sort(
        key=lambda x:
        x.get(
            "rodada",
            0
        )
    )


    return encontrados[-1]



def calcular_ajuste(
    explosao
):

    if not explosao:
        return 0


    pontos = explosao.get(
        "pontos",
        0
    )


    media_antes = explosao.get(
        "mediaAntes",
        0
    )


    diferenca = pontos - media_antes


    ajuste = (
        diferenca * 0.08
    )


    # limite para não distorcer
    ajuste = max(
        -2,
        min(
            ajuste,
            2
        )
    )


    return round(
        ajuste,
        2
    )



# ======================================================
# PROCESSAMENTO
# ======================================================


explosoes_json = carregar_json(
    ARQUIVO_EXPLOSOES
)


explosoes = explosoes_json.get(
    "mais15",
    []
)



jogadores = carregar_jogadores_historico()



erros_base = []

erros_explosao = []



melhorou = 0

piorou = 0



amostras = []



for jogador in jogadores:


    pontos_real = jogador.get(
        "pontuacaoReal"
    )


    if pontos_real is None:

        pontos_real = jogador.get(
            "pontos",
            0
        )


    projecao = jogador.get(
        "projecao",
        jogador.get(
            "media",
            0
        )
    )


    if projecao is None:
        continue



    erro_base = calcular_erro(
        projecao,
        pontos_real
    )



    explosao = buscar_explosao(
        jogador.get(
            "id"
        ),
        explosoes
    )


    ajuste = calcular_ajuste(
        explosao
    )


    nova_projecao = round(
        projecao + ajuste,
        2
    )


    erro_novo = calcular_erro(
        nova_projecao,
        pontos_real
    )



    erros_base.append(
        erro_base
    )


    erros_explosao.append(
        erro_novo
    )



    if erro_novo < erro_base:
        melhorou += 1


    elif erro_novo > erro_base:
        piorou += 1



    if ajuste != 0:

        amostras.append(

            {

                "rodada":
                    jogador.get(
                        "rodadaAnalise"
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
                    pontos_real,

                "erroOriginal":
                    round(
                        erro_base,
                        2
                    ),

                "erroComExplosao":
                    round(
                        erro_novo,
                        2
                    )

            }

        )



resultado = {


    "modelo":

        "experimento_explosao_v2",


    "descricao":

        "Comparação entre modelo base e ajuste de explosão histórica",



    "jogadoresAnalisados":

        len(
            erros_base
        ),



    "erroMedioOriginal":

        media(
            erros_base
        ),



    "erroMedioComExplosao":

        media(
            erros_explosao
        ),



    "melhorouEm":

        melhorou,



    "piorouEm":

        piorou,



    "impacto":

        round(

            media(erros_base)

            -

            media(erros_explosao),

            3

        ),



    "amostras":

        sorted(

            amostras,

            key=lambda x:

            abs(

                x["erroOriginal"]

                -

                x["erroComExplosao"]

            ),

            reverse=True

        )[:100]

}



ARQUIVO_SAIDA.parent.mkdir(
    parents=True,
    exist_ok=True
)



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
    "Jogadores analisados:",
    resultado["jogadoresAnalisados"]
)


print(
    "Erro base:",
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
