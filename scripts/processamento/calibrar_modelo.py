import json
from pathlib import Path

LABORATORIO = Path("data/laboratorio.json")

if not LABORATORIO.exists():
    print("Laboratório não encontrado.")
    exit()

with open(LABORATORIO, encoding="utf-8") as f:
    laboratorio = json.load(f)

mae = laboratorio.get("mae", 5)

pesos = {
    "score": 0.25,
    "media3": 0.20,
    "media5": 0.15,
    "mediaGeral": 0.10,
    "piso": 0.10,
    "teto": 0.20
}

# Ajuste simples inicial
if mae < 2.5:
    pesos["score"] += 0.02
    pesos["media3"] += 0.01

elif mae > 5:
    pesos["media3"] += 0.03
    pesos["media5"] += 0.02
    pesos["score"] -= 0.02

# Normalização
soma = sum(pesos.values())

for chave in pesos:
    pesos[chave] = round(pesos[chave] / soma, 4)

laboratorio["pesos"] = pesos

with open(
    LABORATORIO,
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        laboratorio,
        f,
        indent=2,
        ensure_ascii=False
    )

print("Modelo calibrado.")
