#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ux = (ROOT / "js/recomendacoes/ux-clean.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")

checks = {
    "script_carregado": 'js/recomendacoes/ux-clean.js' in index,
    "recomendacoes_sem_resumo": '#recomendacoes .hero-summary{display:none!important}' in ux,
    "recomendacoes_desktop_central": 'max-width:1180px' in ux and 'text-align:center' in ux,
    "composicao_nota_semantica": '✓ Favorável' in ux and '! Atenção' in ux and '↓ Desfavorável' in ux and 'Como chegou nisso?' in ux,
    "patrimonio_deduplicado": 'v21PatrimonioBox' in ux and 'lineup-budget-control' in ux,
    "patrimonio_mobile_compacto": '#times .lineup-budget-control{min-height:0!important' in ux,
    "limite_200": 'i.max="200"' in ux,
    "indice_explicado": 'Índice de escolha' in ux and 'não são pontos do Cartola' in ux and 'ce-choice-explainer' in ux,
    "projecoes_hierarquia": '#projecoes .v21-player' in ux and 'linear-gradient' in ux and 'max-width:1180px' in ux,
    "contraste_explorador": '#projecoes .v21-player' in ux and 'color:var(--text)!important' in ux,
    "historico_sem_laboratorio": 'Laboratório de capitão' in ux and 'Torneio de modelos experimentais' in ux,
    "historico_zeros_ocultos": 'Detalhamento em reprocessamento' in ux,
    "historico_mobile_cards": '#historico .history-table thead{display:none}' in ux and 'data-label' in ux,
    "historico_perfis": 'ce-history-profile-tabs' in ux and 'Perfil para comparar' in ux,
    "analise_decisao_primeiro": 'ce-analysis-decisions' in ux and 'Ver números técnicos dos clubes' in ux,
    "analise_insights": 'Ataque para priorizar' in ux and 'Defesa para priorizar' in ux and 'Como usar esta leitura' in ux,
    "metodologia_onboarding": 'Como usar o Cartola Estatístico' in ux and 'O que não foi promovido' in ux,
    "desktop_responsivo": '@media(min-width:1200px)' in ux and '@media(max-width:700px)' in ux,
    "mobile_sem_flicker": (
        'function selecionarJogador' in ux
        and 'sincronizarSelecao(g,l,true)' in ux
        and 'novoId===selecionado' in ux
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
