from pathlib import Path
import json



ARQUIVO_MODELO = Path(
    "data/historico/historico_modelo.json"
)

ARQUIVO_DETALHADO = Path(
    "data/historico/historico_detalhado.json"
)

ARQUIVO_TIMES = Path(
    "data/historico/historico_times.json"
)

ARQUIVO_SAIDA = Path(
    "data/historico/relatorio_historico.json"
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



def arredondar(valor):

    try:

        return round(
            float(valor),
            2
        )

    except:

        return 0



modelo = carregar_json(
    ARQUIVO_MODELO
)

detalhado = carregar_json(
    ARQUIVO_DETALHADO
)

times = carregar_json(
    ARQUIVO_TIMES
)



resultado = {

    "modelo":

        "relatorio_historico_v1",


    "descricao":

        "Resumo executivo do laboratório estatístico",


    "resumoModelo": {},


    "analisePosicoes": {},


    "estrategiasTimes": {},


    "insights": []

}



# ======================================
# RESUMO DO MODELO
# ======================================


resumo = modelo.get(
    "resumo",
    {}
)


resultado["resumoModelo"] = {

    "rodadasAnalisadas":

        resumo.get(
            "rodadasAnalisadas",
            0
        ),


    "erroMedio":

        resumo.get(
            "erroMedio",
            0
        ),


    "melhorRodada":

        resumo.get(
            "melhorRodada"
        ),


    "piorRodada":

        resumo.get(
            "piorRodada"
        )

}



# ======================================
# ANÁLISE POR POSIÇÃO
# ======================================


posicoes = modelo.get(
    "posicoes",
    {}
)



melhor_posicao = None
pior_posicao = None



for posicao, dados in posicoes.items():

    erro = arredondar(

        dados.get(
            "erroMedio"
        )

    )


    resultado["analisePosicoes"][posicao] = {

        "quantidade":

            dados.get(
                "quantidade",
                0
            ),


        "erroMedio":

            erro

    }


    if melhor_posicao is None:

        melhor_posicao = {

            "posicao": posicao,
            "erroMedio": erro

        }


        pior_posicao = {

            "posicao": posicao,
            "erroMedio": erro

        }


    else:

        if erro < melhor_posicao["erroMedio"]:

            melhor_posicao = {

                "posicao": posicao,
                "erroMedio": erro

            }


        if erro > pior_posicao["erroMedio"]:

            pior_posicao = {

                "posicao": posicao,
                "erroMedio": erro

            }



resultado["analisePosicoes"]["melhor"] = melhor_posicao

resultado["analisePosicoes"]["pior"] = pior_posicao



# ======================================
# ESTRATÉGIAS DE TIMES
# ======================================


ranking_times = []



for nome, dados in times.get(
    "estrategias",
    {}
).items():


    resumo_time = {

        "nome":

            nome,


        "total":

            dados.get(
                "total",
                0
            ),


        "media":

            dados.get(
                "media",
                0
            )

    }


    ranking_times.append(
        resumo_time
    )


    resultado["estrategiasTimes"][nome] = resumo_time



ranking_times = sorted(

    ranking_times,

    key=lambda x:

        x["total"],

    reverse=True

)



resultado["rankingTimes"] = ranking_times



# ======================================
# INSIGHTS AUTOMÁTICOS
# ======================================


if melhor_posicao:

    resultado["insights"].append(

        "A posição com melhor desempenho histórico foi "
        + melhor_posicao["posicao"]

    )



if pior_posicao:

    resultado["insights"].append(

        "A posição que merece maior ajuste estatístico é "
        + pior_posicao["posicao"]

    )



if ranking_times:

    resultado["insights"].append(

        "A melhor estratégia histórica de escalação foi "
        + ranking_times[0]["nome"]

    )



if resumo.get("melhorRodada"):

    resultado["insights"].append(

        "A melhor rodada do modelo foi a "
        + str(
            resumo["melhorRodada"].get(
                "rodada"
            )
        )

    )



salvar_json(

    ARQUIVO_SAIDA,

    resultado

)



print(
    "Relatório histórico gerado."
)


print(

    "Insights:",

    len(
        resultado["insights"]
    )

)
