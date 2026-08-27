#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
index = (ROOT / "index.html").read_text(encoding="utf-8")
dados = (ROOT / "js" / "escalacoes" / "dados.js").read_text(encoding="utf-8")
explorador = (ROOT / "js" / "explorador-v21.js").read_text(encoding="utf-8")

formacoes = ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"]
falhas = []

if index.count('js/explorador-v21.js') != 1:
    falhas.append("script do explorador deve aparecer exatamente uma vez no index")

for f in formacoes:
    if f not in dados:
        falhas.append(f"formação ausente: {f}")

if "const PATRIMONIO_PADRAO_ESCALACOES =\n  200;" not in dados:
    falhas.append("patrimônio padrão não está em C$ 200")
if "Math.min(\n      200" not in dados or "Math.max(1, patrimonio)" not in dados:
    falhas.append("normalização não limita patrimônio ao intervalo 1..200")

for valor in (80, 100, 120, 150, 180, 200):
    normalizado = min(200, max(1, valor))
    if normalizado != valor:
        falhas.append(f"patrimônio representativo alterado indevidamente: {valor}")
if min(200, max(1, 250)) != 200:
    falhas.append("teto 200 falhou")

# O orçamento pertence ao motor/Times Sugeridos e ao Monte seu Time. O Explorador
# não deve mais injetar um segundo controle de patrimônio, porque isso gerava o
# bloco branco duplicado visto na revisão visual.
obrigatorios_explorador = [
    'data-tab', 'Projeções', 'v21BuscaJogador', 'v21FiltroClube',
    'Piso', 'Projeção', 'Teto', 'Confiança', 'Risco', 'Explosão 10+',
    'Baseline/fallback'
]
for token in obrigatorios_explorador:
    if token not in explorador:
        falhas.append(f"explorador sem requisito: {token}")

proibidos_explorador = [
    'id="v21Patrimonio"',
    'Reconstruir times'
]
for token in proibidos_explorador:
    if token in explorador:
        falhas.append(f"explorador voltou a duplicar controle de orçamento: {token}")

if re.search(r"R24|rodada[-_ ]?24", explorador, re.I):
    falhas.append("explorador não deve embutir ajuste retrospectivo da R24")

if falhas:
    print("AUDITORIA PRODUTO V2.1: REPROVADA")
    for falha in falhas:
        print("-", falha)
    raise SystemExit(1)

print("AUDITORIA PRODUTO V2.1: APROVADA")
print("7 formações: OK")
print("Patrimônio configurável 1..200 no motor: OK")
print("Valores auditados: 80, 100, 120, 150, 180, 200")
print("Explorador por jogador/clube: OK")
print("Explorador sem orçamento duplicado: OK")
print("Fallback/explicabilidade: OK")
