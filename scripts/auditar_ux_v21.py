#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ux = (ROOT / "js/recomendacoes/ux-clean.js").read_text(encoding="utf-8")
ux_final = (ROOT / "js/ux-final-v23.js").read_text(encoding="utf-8")
monte = (ROOT / "js/escalacoes/monte-seu-time.js").read_text(encoding="utf-8")
campo = (ROOT / "js/escalacoes/campo.js").read_text(encoding="utf-8")
historico = (ROOT / "js/historico/cards.js").read_text(encoding="utf-8")
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
    "historico_v21_filtra_anomalias": (
        'function rodadaConfiavel(item)' in historico
        and 'const invalidos = itensOriginais.filter(item => !rodadaConfiavel(item));' in historico
        and 'const itens = itensOriginais.filter(rodadaConfiavel);' in historico
        and 'não altera a escala nem a leitura do gráfico' in historico
    ),
    "historico_v21_rotulos_grafico": (
        'history-point-proj' in historico
        and 'history-point-real' in historico
        and 'valores rotulados em cada ponto' in historico
        and '<title>R${item.rodada}: ${n(valor)} pts</title>' in historico
    ),
    "historico_v21_mobile_legivel": (
        '.history-v21-table thead{display:none}' in historico
        and 'content:attr(data-label)' in historico
        and 'data-label="Projeção"' in historico
        and 'data-label="Leitura"' in historico
    ),
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
    "monte_busca_assincrona": (
        'async function completarTitulares()' in monte
        and 'await cederThread()' in monte
        and 'const LARGURA = 48' in monte
        and 'const CANDIDATOS_POR_SLOT = 18' in monte
    ),
    "monte_sem_clique_concorrente": (
        'processando: false' in monte
        and 'if (estado.processando) return;' in monte
        and 'definirProcessando(true)' in monte
        and 'definirProcessando(false)' in monte
    ),
    "monte_travas_respeitadas": (
        'const conflitosFixos = contarConflitosLista(fixos)' in monte
        and 'if (conflitosTotais > conflitosFixos)' in monte
        and 'o modelo não criará novos conflitos' in monte
    ),
    "monte_indice_cacheado": (
        'function construirIndiceBusca()' in monte
        and 'function candidatosBusca(' in monte
        and 'function menorCustoRestante(indice' in monte
    ),
    "v24_ranking_independente_selecao": (
        'data-ux-rank="1"' in ux_final
        and 'is-active:not([data-ux-rank="1"])' in ux_final
        and 'jogadoresDaPosicao' in ux_final
        and 'garantirRecomendacoes' in ux_final
    ),
    "v24_recomendacoes_mobile_compactas": (
        'data-ux-v24-mobile-extra' in ux_final
        and '.slice(3)' in ux_final
        and 'ce-v24-tech-toggle' in ux_final
        and 'data-ux-v24-tech-collapsed' in ux_final
    ),
    "v24_patrimonio_sem_vazio": (
        '#times .lineup-budget-control{' in ux_final
        and 'display:flex!important;flex-direction:column!important' in ux_final
        and '.lineup-budget-copy' in ux_final
        and '.lineup-budget-actions' in ux_final
        and 'position:static!important' in ux_final
        and 'flex:0 0 auto!important' in ux_final
    ),
    "v24_defesa_compartilhada_semantica": (
        'function ordenarDefesa(jogadores)' in campo
        and 'return [lat[0], ...zag, lat[1], ...lat.slice(2)]' in campo
        and 'data-posicao=' in campo
        and '#times .pitch-line.defense' in ux_final
        and '#monte-seu-time .pitch-line.defense' in ux_final
        and 'data.uxV24DefenseOrder' not in ux_final
    ),
    "v24_defesa_builder_estavel": (
        'function ordenarDefesa(' in ux_final
        and 'ordem = [lat[0], ...zag, lat[1]' in ux_final
        and '#monte-seu-time .monte-line.defense' in ux_final
        and 'linha.dataset.uxV24DefenseStable = "1"' in ux_final
        and 'linha.dataset.uxV24DefenseOrder = ordem.map(obterPosicao).join("|")' in ux_final
    ),
    "v24_historico_cores_e_mobile": (
        'const ORANGE = "#d9822b"' in ux_final
        and 'const GREEN = "#53d891"' in ux_final
        and 'history-v21-chart' in ux_final
        and 'min-width:860px' in ux_final
        and 'historyRound' in ux_final
        and 'historyPosition' in ux_final
    ),
    "v24_analise_sem_bloco_antigo": (
        'function ajustarAnalise()' in ux_final
        and 'leitura dos confrontos' in ux_final
        and 'leitura rapida para a rodada' in ux_final
        and 'data-ux-v24-old-reading' in ux_final
    ),
    "v24_analise_com_adversario": (
        '["onde atacar", "onde buscar seguranca", "onde ter cautela"]' in ux_final
        and 'small.textContent = `${sigla} x ${adv}' in ux_final
    ),
    "v24_sem_observer_continuo": (
        'MutationObserver' not in ux_final
        and 'MutationObserver' not in campo
        and '[0, 120, 450, 1000, 2200].forEach' in ux_final
        and '[0, 120, 350, 800, 1600, 3000].forEach' in campo
        and 'cartola:escalacoes-atualizadas' in campo
        and 'cartola:rodada-atualizada' in campo
    ),
}

# Gate estrutural explícito: o campo de quatro defensores precisa ter laterais nas pontas.
# O renderer compartilhado monta [LAT, ZAG..., LAT], e a camada final aplica a mesma
# semântica no builder e em qualquer campo já existente no DOM.
checks["v24_ordem_lat_zag_zag_lat"] = (
    '[lat[0], ...zag, lat[1]' in campo
    and '[lat[0], ...zag, lat[1]' in ux_final
    and '#times .pitch-line.defense' in ux_final
    and '#monte-seu-time .monte-line.defense' in ux_final
    and 'uxV24DefenseOrder' in ux_final
)

falhas = [nome for nome, ok in checks.items() if not ok]
for nome, ok in checks.items():
    print(f"{'OK' if ok else 'FALHA'} - {nome}")

if falhas:
    raise SystemExit(f"Auditoria UX V2.1 reprovada: {', '.join(falhas)}")

print(f"Auditoria UX V2.1 aprovada: {len(checks)}/{len(checks)} gates verdes.")
