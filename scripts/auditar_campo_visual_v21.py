#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "js" / "escalacoes" / "campo.js"
CSS = ROOT / "css" / "campo-escalacoes.css"
UI = ROOT / "js" / "ui.js"

falhas = []

for arquivo in (JS, CSS, UI):
    if not arquivo.exists():
        falhas.append(f"Arquivo ausente: {arquivo.relative_to(ROOT)}")

if falhas:
    print("\n".join(f"ERRO: {f}" for f in falhas))
    sys.exit(1)

js = JS.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")
ui = UI.read_text(encoding="utf-8")

checks = {
    "campo reutilizável exposto": "window.CartolaCampoEscalacao" in js,
    "consome escalações existentes": "obterEscalacoesCarregadas" in js,
    "não duplica motor": "MotorEscalacao" not in js and "otimizar" not in js.lower(),
    "titulares em campo": "lineup-pitch" in js and "pitch-line" in js,
    "capitão identificado": "pitch-captain" in js,
    "técnico identificado": "pitch-coach" in js,
    "banco visível": "pitch-bench" in js,
    "reserva de luxo identificada": "pitch-luxury" in js,
    "imagens lazy": 'loading=\"lazy\"' in js,
    "fallback sem foto": "fallback" in js and "iniciais" in js,
    "mobile responsivo": "@media (max-width: 700px)" in css,
    "banco rolável no mobile": "overflow-x: auto" in css,
    "sem overflow obrigatório do campo": "overflow-x: auto" not in css.split(".lineup-pitch {", 1)[1].split("}", 1)[0],
    "loader desacoplado": "js/escalacoes/campo.js" in ui,
}

for nome, ok in checks.items():
    print(f"{'OK' if ok else 'ERRO'}: {nome}")
    if not ok:
        falhas.append(nome)

if falhas:
    print(f"\nCampo visual V2.1 REPROVADO: {len(falhas)} falha(s).")
    sys.exit(1)

print(f"\nCampo visual V2.1 APROVADO: {len(checks)} verificações.")
