#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "js" / "escalacoes" / "monte-seu-time.js"
CAMPO = ROOT / "js" / "escalacoes" / "campo.js"
CSS = ROOT / "css" / "monte-seu-time.css"

falhas = []

def exigir(condicao, mensagem):
    if not condicao:
        falhas.append(mensagem)

js = JS.read_text(encoding="utf-8") if JS.exists() else ""
campo = CAMPO.read_text(encoding="utf-8") if CAMPO.exists() else ""
css = CSS.read_text(encoding="utf-8") if CSS.exists() else ""

exigir(bool(js), "Arquivo monte-seu-time.js ausente")
exigir(bool(css), "CSS do Monte seu time ausente")
exigir('CartolaCampoEscalacao' in js and '.campoHtml' in js, "Monte seu time não reutiliza o campo visual oficial")
exigir('obterJogadoresDisponiveisEscalacao' in js, "Monte seu time não consome o pool oficial")
exigir('calcularNotaJogadorEscalacao' in js, "Monte seu time não usa a nota oficial do motor")
exigir('jogadoresConflitamEscalacao' in js, "Regra anti-conflito não protegida")
exigir('respeitaLimiteClubesEscalacao' in js and ', 3' in js, "Limite de 3 atletas por clube não protegido")
exigir('montarBancoEscalacao' in js and 'selecionarReservaLuxoEscalacao' in js, "Banco/Reserva de Luxo não reutilizam o motor")
exigir('selecionarCapitaoEscalacao' in js, "Capitão não reutiliza o motor")
exigir('Math.min(200' in js or 'max="200"' in js, "Patrimônio máximo de C$ 200 não protegido")
for formacao in ("3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"):
    exigir(formacao in js, f"Formação {formacao} ausente")
exigir('travadoUsuario' in js and 'data-user-lock' in campo, "Identificação de escolhas do usuário ausente")
exigir('Completar com o modelo' in js, "CTA principal ausente")
exigir('@media(max-width:700px)' in css, "Gate responsivo mobile ausente")
exigir('expected scouts' not in js.lower() and 'expected_scouts' not in js.lower(), "Expected scouts experimental foi promovido indevidamente")
exigir('RandomForest' not in js and 'randomforest' not in js.lower(), "Modelo científico foi duplicado no frontend")
exigir('monte-seu-time.js' in campo, "Loader do Monte seu time não está ligado ao campo visual")

if falhas:
    print("❌ MONTE SEU TIME V2.1 — REPROVADO")
    for falha in falhas:
        print(f" - {falha}")
    sys.exit(1)

print("✅ MONTE SEU TIME V2.1 — APROVADO")
print(" - 7 formações protegidas")
print(" - escolhas fixas + patrimônio + limite por clube")
print(" - motor oficial reutilizado para ranking, banco, capitão e Reserva de Luxo")
print(" - campo visual reutilizado")
print(" - expected scouts permanece fora do frontend")
