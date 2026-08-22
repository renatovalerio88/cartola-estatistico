"""Impede critérios incompatíveis de voltarem à nota por posição."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[2]
texto = (ROOT / "js/motor/pesos.js").read_text(encoding="utf-8")

regras = {
    "GOL": ["scoutsOfensivos", "bolaParada", "penaltis"],
    "MEI": ["chanceSG"],
    "ATA": ["scoutsDefensivos", "chanceSG"],
    "ZAG": ["penaltis"],
    "TEC": ["scoutsOfensivos", "scoutsDefensivos", "minutosEsperados", "bolaParada", "penaltis"],
}

checks = {
    "mapaInelegiveisExiste": "CRITERIOS_INELEGIVEIS_POR_POSICAO" in texto,
    "guardDinamicoExiste": "criterioElegivelParaPosicao" in texto,
}

for posicao, criterios in regras.items():
    bloco = re.search(rf"{posicao}: new Set\(\[(.*?)\]\)", texto, re.S)
    conteudo = bloco.group(1) if bloco else ""
    for criterio in criterios:
        checks[f"{posicao}_{criterio}_bloqueado"] = f'"{criterio}"' in conteudo

resultado = {
    "modelo": "auditoria_criterios_por_posicao_v1",
    "aprovado": all(checks.values()),
    "checks": checks,
    "falhas": [k for k, v in checks.items() if not v],
}
saida = ROOT / "data/auditoria-criterios-por-posicao.json"
saida.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(resultado, ensure_ascii=False, indent=2))
if not resultado["aprovado"]:
    raise SystemExit(1)
