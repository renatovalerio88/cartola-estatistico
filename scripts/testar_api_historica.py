from urllib.request import urlopen
import json

urls = [

"https://api.cartolafc.globo.com/atletas/pontuados/1",

"https://api.cartolafc.globo.com/atletas/pontuados?rodada=1",

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
        )

        print(
            "OK",
            type(dados)
        )

        if isinstance(dados, dict):
            print(
                list(dados.keys())
            )

    except Exception as erro:

        print(
            "ERRO:",
            erro
        )
