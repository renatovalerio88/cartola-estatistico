"""Migração idempotente: altera o patrimônio padrão do frontend de C$ 120 para C$ 200."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARQUIVO = ROOT / "js" / "escalacoes" / "dados.js"

texto = ARQUIVO.read_text(encoding="utf-8")
original = texto
texto = texto.replace(
    "- usar C$ 120 apenas como patrimônio padrão inicial;",
    "- usar C$ 200 apenas como patrimônio padrão inicial;",
)
texto = texto.replace(
    "const PATRIMONIO_PADRAO_ESCALACOES =\n  120;",
    "const PATRIMONIO_PADRAO_ESCALACOES =\n  200;",
)

if "const PATRIMONIO_PADRAO_ESCALACOES =\n  200;" not in texto:
    raise SystemExit("Não foi possível confirmar PATRIMONIO_PADRAO_ESCALACOES = 200")
if "usar C$ 200 apenas como patrimônio padrão inicial" not in texto:
    raise SystemExit("Não foi possível confirmar documentação do patrimônio C$ 200")

if texto != original:
    ARQUIVO.write_text(texto, encoding="utf-8")
    print("Patrimônio padrão alterado para C$ 200.")
else:
    print("Patrimônio padrão já estava em C$ 200.")
