from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
idx=(ROOT/'index.html').read_text(encoding='utf-8')
ux=(ROOT/'js/recomendacoes/ux-clean.js').read_text(encoding='utf-8')
checks={
 'scriptCarregado':'js/recomendacoes/ux-clean.js' in idx,
 'painelUnico':'ce-clean-detail' in ux,
 'seletorJogadores':'data-ce-player' in ux,
 'criteriosPorPosicao':'INELEGIVEIS_VISUAIS' in ux,
 'responsivo':'@media(max-width:700px)' in ux,
}
out={'modelo':'auditoria_ux_clean_v1','aprovado':all(checks.values()),'checks':checks,'falhas':[k for k,v in checks.items() if not v]}
(ROOT/'data/auditoria-ux-clean.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
raise SystemExit(0 if out['aprovado'] else 1)
