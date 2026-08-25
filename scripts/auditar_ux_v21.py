#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ux = (ROOT / "js/recomendacoes/ux-clean.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")

checks = {
    "script_carregado": 'js/recomendacoes/ux-clean.js' in index,
    "recomendacoes_sem_resumo": '#recomendacoes .hero-summary{display:none!important}' in ux,
    "patrimonio_deduplicado": 'v21PatrimonioBox' in ux and 'lineup-budget-control' in ux,
    "limite_200": 'input.max = "200"' in ux,
    "indice_explicado": 'Índice de escolha' in ux and 'não são pontos do Cartola' in ux,
    "contraste_explorador": '#projecoes .v21-player' in ux and 'color:var(--text)!important' in ux,
    "historico_sem_laboratorio": 'Laboratório de capitão' in ux and 'Torneio de modelos experimentais' in ux,
    "historico_zeros_ocultos": 'Detalhamento em reprocessamento' in ux,
    "analise_decisao_primeiro": 'Conclusão primeiro' in ux and 'Ver números técnicos dos clubes' in ux,
    "desktop_responsivo": '@media(min-width:1200px)' in ux and '@media(max-width:700px)' in ux,
}

falhas = [nome for nome, ok in checks.items() if not ok]
for nome, ok in checks.items():
    print(f"{'OK' if ok else 'FALHA'} - {nome}")

if falhas:
    raise SystemExit(f"Auditoria UX V2.1 reprovada: {', '.join(falhas)}")

print(f"Auditoria UX V2.1 aprovada: {len(checks)}/{len(checks)} gates verdes.")
