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
    "analise_decisao_primeiro": 'ce-analysis-decisions' in ux and 'Ver números técnicos dos clubes' in ux,
    "desktop_responsivo": '@media(min-width:1200px)' in ux and '@media(max-width:700px)' in ux,
    # Evita a regressão que fazia a lista inteira de Recomendações ser recriada a
    # cada clique/mutação no mobile. A seleção deve atualizar somente estado +
    # detalhe; mutações internas do shell não podem disparar nova renderização.
    "mobile_sem_flicker": (
        'function selecionarJogador' in ux
        and 'sincronizarSelecao(grade, lista, true)' in ux
        and 'novoId === selecionado' in ux
        and '#playersGrid .ce-clean-recs' in ux
        and 'return !alvo?.closest?.("#playersGrid .ce-clean-recs")' in ux
        and 'transition:none!important' in ux
    ),
}

falhas = [nome for nome, ok in checks.items() if not ok]
for nome, ok in checks.items():
    print(f"{'OK' if ok else 'FALHA'} - {nome}")

if falhas:
    raise SystemExit(f"Auditoria UX V2.1 reprovada: {', '.join(falhas)}")

print(f"Auditoria UX V2.1 aprovada: {len(checks)}/{len(checks)} gates verdes.")
