from pathlib import Path
import json
import math


# ======================================================
# CARTOLA ESTATÍSTICO
#
# Laboratório Estatístico
#
# Analisa:
# - Erros do modelo
# - Precisão geral
# - Precisão por posição
# - Preparação para otimização de pesos
# ======================================================


PASTA_HISTORICO = Path(
    "data/historico"
)


PASTA_SAIDA = Path(
    "data/laboratorio"
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



arquivos = sorted(
    PASTA_HISTORICO.glob(
        "rodada-*.json"
    )
)



erros = []

por_posicao = {}

top5 = 0
top10 = 0

total_jogadores = 0
total_rodadas = 0



for arquivo in arquivos:


    dados = carregar_json(
        arquivo
    )


    total_rodadas += 1


    jogadores = dados.get(
        "jogadores",
        []
    )


    total_jogadores += len(
        jogadores
    )


    jogadores.sort(
        key=lambda x:
            x.get(
                "projecao",
                0
            ),
        reverse=True
    )


    for indice, jogador in enumerate(jogadores):


        erro = abs(
            jogador.get(
                "erro",
                0
            )
        )


        erros.append(
            erro
        )


        posicao = jogador.get(
            "posicao",
            "OUTROS"
        )


        if posicao not in por_posicao:

            por_posicao[posicao] = []


        por_posicao[posicao].append(
            erro
        )


        if indice < 5:

            if erro <= 3:

                top5 += 1


        if indice < 10:

            if erro <= 3:

                top10 += 1




# ======================================================
# MÉTRICAS GERAIS
# ======================================================


if erros:


    mae = round(
        sum(erros)
        /
        len(erros),
        2
    )


    rmse = round(

        math.sqrt(

            sum(
                erro ** 2
                for erro in erros
            )
            /
            len(erros)

        ),

        2
    )


else:


    mae = 0
    rmse = 0



melhores_posicoes = {}

for posicao, lista in por_posicao.items():

    melhores_posicoes[posicao] = {

        "quantidade":
            len(lista),

        "erroMedio":
            round(
                sum(lista)
                /
                len(lista),
                2
            )

    }



if melhores_posicoes:


    melhor = min(
        melhores_posicoes,
        key=lambda x:
            melhores_posicoes[x]["erroMedio"]
    )


    pior = max(
        melhores_posicoes,
        key=lambda x:
            melhores_posicoes[x]["erroMedio"]
    )


else:

    melhor = None
    pior = None




# ======================================================
# RESUMO
# ======================================================


resumo = {


    "modelo":
        "ponderado_atual",


    "rodadasAnalisadas":
        total_rodadas,


    "jogadoresAnalisados":
        total_jogadores,


    "mae":
        mae,


    "rmse":
        rmse,


    "top5":
        round(
            top5 /
            (total_rodadas * 5)
            * 100,
            2
        )
        if total_rodadas
        else 0,


    "top10":
        round(
            top10 /
            (total_rodadas * 10)
            * 100,
            2
        )
        if total_rodadas
        else 0,


    "melhorPosicao":
        melhor,


    "piorPosicao":
        pior

}



salvar_json(

    PASTA_SAIDA /
    "resumo.json",

    resumo

)



# ======================================================
# POSIÇÕES
# ======================================================


salvar_json(

    PASTA_SAIDA /
    "posicoes.json",

    melhores_posicoes

)



# ======================================================
# MODELOS
# ======================================================


modelos = {


    "modeloAtual": {

        "nome":
            "media_ponderada",

        "erroMedio":
            mae

    },


    "comparacoes": {


        "media_simples":
            None,


        "ultimas_3":
            None,


        "ultimas_5":
            None

    }

}



salvar_json(

    PASTA_SAIDA /
    "modelos.json",

    modelos

)



# ======================================================
# PESOS
# ======================================================


pesos = {


    "status":
        "aguardando_otimizacao",


    "modeloAtual": {


        "tipo":
            "media_ponderada"

    }

}



salvar_json(

    PASTA_SAIDA /
    "pesos.json",

    pesos

)



print(
    "Laboratório estatístico atualizado."
)
