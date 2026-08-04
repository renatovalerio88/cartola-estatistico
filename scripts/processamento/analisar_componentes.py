from pathlib import Path
import json


PASTA = Path("data/historico")
SAIDA = Path("data/componentes.json")


arquivos = sorted(
    PASTA.glob("rodada-*.json")
)


erros = []


for arquivo in arquivos:

    with open(
        arquivo,
        encoding="utf-8"
    ) as f:

        dados = json.load(f)


    jogadores = (
        dados.get("jogadores", [])
    )


    for jogador in jogadores:

        erro = jogador.get(
            "erro"
        )


        if erro is not None:

            erros.append(
                abs(float(erro))
            )



# =========================================================
# PROTEÇÃO PARA AUSÊNCIA DE HISTÓRICO
# =========================================================

if erros:

    erro_medio = round(
        sum(erros) / len(erros),
        2
    )

else:

    erro_medio = 0



resultado = {

    "amostra": {

        "rodadasAnalisadas":
            len(arquivos),

        "jogadoresAnalisados":
            len(erros)

    },


    "erroMedio":
        erro_medio,


    "forma": {

        "impacto":
            round(
                erro_medio * 0.18,
                2
            )

    },


    "regularidade": {

        "impacto":
            round(
                erro_medio * 0.14,
                2
            )

    },


    "risco": {

        "impacto":
            round(
                erro_medio * 0.09,
                2
            )

    },


    "confianca": {

        "impacto":
            round(
                erro_medio * 0.11,
                2
            )

    },


    "projecao": {

        "impacto":
            round(
                erro_medio * 0.23,
                2
            )

    }

}



SAIDA.parent.mkdir(
    parents=True,
    exist_ok=True
)


with open(
    SAIDA,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        resultado,
        f,
        indent=2,
        ensure_ascii=False
    )



print(
    "Componentes analisados.",
    f"Erro médio: {erro_medio}",
    f"Amostras: {len(erros)}"
)
