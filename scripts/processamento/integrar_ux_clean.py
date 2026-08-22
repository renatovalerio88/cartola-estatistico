"""Insere o módulo UX clean no index de forma idempotente."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
SCRIPT = '<script src="js/recomendacoes/ux-clean.js"></script>'

texto = INDEX.read_text(encoding="utf-8")
if SCRIPT in texto:
    print("UX clean já integrada.")
else:
    ancora = '<script src="js/recomendacoes/composicao-nota.js"></script>'
    if ancora not in texto:
        raise SystemExit("Âncora de composição da nota não encontrada")
    texto = texto.replace(ancora, ancora + "\n  " + SCRIPT, 1)
    INDEX.write_text(texto, encoding="utf-8")
    print("UX clean integrada ao index.")
