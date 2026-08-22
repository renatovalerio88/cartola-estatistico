"""Gate estrutural final do Cartola Estatístico V1."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]

def ler(p):
    return (ROOT / p).read_text(encoding="utf-8")

def jler(p):
    return json.loads(ler(p))

cfg = jler("data/configuracao.json")
pesos = ler("js/motor/pesos.js")
esc = ler("js/escalacoes/dados.js")
ux = ler("js/recomendacoes/ux-clean.js")
index = ler("index.html")

checks = {
    "versaoV1": cfg.get("versao") == "1.0.0",
    "patrimonio200Config": cfg.get("limitePatrimonio") == 200,
    "patrimonio200Motor": "PATRIMONIO_PADRAO_ESCALACOES =\n  200" in esc,
    "criteriosPorPosicao": "CRITERIOS_INELEGIVEIS_POR_POSICAO" in pesos,
    "antiConflitoProducao": "ANTI-CONFLITO VALIDADO V1" in esc,
    "uxClean": "ce-clean-detail" in ux and "js/recomendacoes/ux-clean.js" in index,
    "formacao433Compete": '"4-3-3"' in esc,
    "semPreferenciaArtificial": "comparar formações sem preferência artificial" in esc,
    "banco": "montar banco" in esc.lower(),
    "reservaLuxo": "Reserva de Luxo" in esc,
    "capitao": "selecionar capitão" in esc.lower(),
}

for arquivo in ["data/auditoria-criterios-por-posicao.json", "data/auditoria-ux-clean.json"]:
    try:
        checks[f"{arquivo}Aprovada"] = bool(jler(arquivo).get("aprovado"))
    except Exception:
        checks[f"{arquivo}Aprovada"] = False

out = {
    "modelo": "gate_final_v1",
    "versao": cfg.get("versao"),
    "aprovado": all(checks.values()),
    "checks": checks,
    "falhas": [k for k,v in checks.items() if not v]
}
(ROOT / "data/auditoria-v1-final.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=2))
raise SystemExit(0 if out["aprovado"] else 1)
