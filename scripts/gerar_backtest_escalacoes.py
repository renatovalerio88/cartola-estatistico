"""
=========================================================
CARTOLA ESTATÍSTICO
Laboratório de Backtest de Escalações

Objetivo:
Comparar versões do modelo:

1 - Modelo Base
2 - Modelo + Explosão
3 - Modelo + Diferencial
4 - Modelo Completo

Gera:
data/historico/escalacoes.json

=========================================================
"""

import json
import os
from pathlib import Path
from statistics import mean


# ======================================================
# CONFIGURAÇÕES
# ======================================================

BASE_DIR = Path(__file__).resolve().parent.parent

PASTA_HISTORICO = BASE_DIR / "data" / "historico"

PASTA_SAIDA = BASE_DIR / "data" / "historico"

ARQUIVO_SAIDA = PASTA_SAIDA / "escalacoes.json"


MODELOS = [
    "base",
    "explosao",
    "diferencial",
    "completo"
]


# ======================================================
# UTILIDADES
# ======================================================

def carregar_json(caminho):

    if not caminho.exists():
        return None

    try:
        with open(
            caminho,
            "r",
            encoding="utf-8"
        ) as arquivo:

            return json.load(arquivo)

    except Exception:

        return None



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



# ======================================================
# LEITURA DOS JOGADORES
# ======================================================

def carregar_jogadores_rodada(rodada):

    pasta = (
        PASTA_HISTORICO /
        f"rodada-{rodada:02d}"
    )


    arquivo = pasta / "jogadores.json"


    dados = carregar_json(arquivo)


    if not dados:
        return []


    if isinstance(dados, list):
        return dados


    return dados.get(
        "jogadores",
        []
    )



# ======================================================
# NORMALIZAÇÃO
# ======================================================

def obter_pontos(jogador):

    valores = [

        jogador.get(
            "pontuacaoReal"
        ),

        jogador.get(
            "pontos"
        ),

        jogador.get(
            "pontuacao"
        ),

        jogador.get(
            "real"
        )

    ]


    for valor in valores:

        try:

            if valor is not None:
                return float(valor)

        except:

            pass


    return 0



def obter_projecao(jogador):

    valores = [

        jogador.get(
            "projecao"
        ),

        jogador.get(
            "score"
        ),

        jogador.get(
            "mediaGeral"
        )

    ]


    for valor in valores:

        try:

            if valor is not None:
                return float(valor)

        except:

            pass


    return 0



# ======================================================
# RANKING DOS MODELOS
# ======================================================

def calcular_nota_modelo(
    jogador,
    modelo
):

    base = obter_projecao(
        jogador
    )


    explosao = float(
        jogador.get(
            "notaExplosao",
            0
        )
        or 0
    )


    diferencial = float(
        jogador.get(
            "indiceDiferencial",
            0
        )
        or 0
    )


    if modelo == "base":

        return base


    if modelo == "explosao":

        return (
            base +
            (explosao / 100)
        )


    if modelo == "diferencial":

        return (
            base +
            (diferencial / 100)
        )


    if modelo == "completo":

        return (
            base +
            (explosao / 150) +
            (diferencial / 150)
        )


    return base



# ======================================================
# MONTAGEM TIME SIMULADO
# ======================================================

def montar_time(
    jogadores,
    modelo
):

    ranking = sorted(
        jogadores,
        key=lambda x:
            calcular_nota_modelo(
                x,
                modelo
            ),
        reverse=True
    )


    titulares = ranking[:11]


    pontos = sum(
        obter_pontos(j)
        for j in titulares
    )


    return {

        "jogadores": [

            {
                "nome":
                    j.get(
                        "nome",
                        ""
                    ),

                "posicao":
                    j.get(
                        "posicao",
                        ""
                    ),

                "projecao":
                    round(
                        calcular_nota_modelo(
                            j,
                            modelo
                        ),
                        2
                    ),

                "real":
                    obter_pontos(j)

            }

            for j in titulares

        ],

        "pontuacao":

            round(
                pontos,
                2
            )

    }



# ======================================================
# PROCESSAMENTO
# ======================================================

def gerar():

    resultado = {

        "modelo":
            "backtest_escalacoes_v1",

        "descricao":
            "Comparação histórica das versões do modelo",

        "rodadas": []

    }


    rodadas_processadas = []


    for rodada in range(2, 23):


        jogadores = carregar_jogadores_rodada(
            rodada
        )


        if not jogadores:
            continue


        dados_rodada = {

            "rodada":
                rodada,

            "modelos": {}

        }


        for modelo in MODELOS:


            time = montar_time(
                jogadores,
                modelo
            )


            dados_rodada["modelos"][modelo] = time



        resultado["rodadas"].append(
            dados_rodada
        )


        rodadas_processadas.append(
            rodada
        )



    # ==================================================
    # RESUMO
    # ==================================================

    resumo = {}


    for modelo in MODELOS:


        pontuacoes = []


        for rodada in resultado["rodadas"]:


            valor = (
                rodada["modelos"]
                [modelo]
                ["pontuacao"]
            )


            pontuacoes.append(
                valor
            )


        resumo[modelo] = {

            "media":

                round(
                    mean(pontuacoes),
                    2
                )
                if pontuacoes
                else 0,


            "total":

                round(
                    sum(pontuacoes),
                    2
                ),


            "melhorRodada":

                max(
                    pontuacoes
                )
                if pontuacoes
                else 0

        }



    resultado["resumo"] = resumo


    resultado["rodadasProcessadas"] = (
        rodadas_processadas
    )


    salvar_json(
        ARQUIVO_SAIDA,
        resultado
    )


    print(
        "================================="
    )

    print(
        "BACKTEST FINALIZADO"
    )

    print(
        f"Rodadas: {rodadas_processadas}"
    )

    print(
        f"Arquivo: {ARQUIVO_SAIDA}"
    )

    print(
        "================================="
    )



# ======================================================
# EXECUÇÃO
# ======================================================

if __name__ == "__main__":

    gerar()
