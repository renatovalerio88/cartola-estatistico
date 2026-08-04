from urllib.request import urlopen
import json


urls = [
    "https://api.cartolafc.globo.com/atletas/pontuados/1",
    "https://api.cartolafc.globo.com/atletas/pontuados?rodada=1",
    "https://api.cartolafc.globo.com/mercado/status"
]


for url in urls:

    print("\nTESTANDO:")
    print(url)

    try:
        resposta = urlopen(
            url,
            timeout=20
        )

        dados = json.loads(
            resposta.read()
            .decode("utf-8")
        )

        print(
            type(dados)
        )

        if isinstance(dados, dict):
            print(
                list(dados.keys())[:10]
            )

    except Exception as erro:
        print(
            "ERRO:",
            erro
        )
