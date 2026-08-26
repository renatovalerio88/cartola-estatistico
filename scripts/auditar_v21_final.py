#!/usr/bin/env python3
"""Auditoria final e não destrutiva do pacote Cartola Estatístico V2.1."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def carregar_json(caminho: str):
    path = ROOT / caminho
    if not path.exists():
        raise AssertionError(f"Arquivo obrigatório ausente: {caminho}")
    return json.loads(path.read_text(encoding="utf-8"))


def carregar_texto(caminho: str) -> str:
    path = ROOT / caminho
    if not path.exists():
        raise AssertionError(f"Arquivo obrigatório ausente: {caminho}")
    return path.read_text(encoding="utf-8")


def main() -> None:
    erros: list[str] = []
    avisos: list[str] = []

    def checar(condicao: bool, mensagem: str) -> None:
        if not condicao:
            erros.append(mensagem)

    status = carregar_json("data/api/status.json")
    rodada = int(status.get("rodada_atual", 0) or 0)
    checar(1 <= rodada <= 38, f"rodada_atual inválida: {rodada}")
    checar(status.get("temporada") == 2026, "temporada diferente de 2026")

    projecoes = carregar_json("data/modelagem/projecoes_v2_atual.json")
    checar(projecoes.get("versao") == "V2", "artefato atual não está marcado como V2")
    checar(projecoes.get("modelo") == "RandomForest", "modelo oficial não é RandomForest")
    checar(projecoes.get("antiLeakage") is True, "antiLeakage da V2 não está true")
    checar(int(projecoes.get("rodada", 0) or 0) == rodada, "rodada do artefato V2 diverge do status")
    checar(int(projecoes.get("jogadoresComProjecao", 0) or 0) >= 100, "menos de 100 atletas com projeção V2")
    predicoes = projecoes.get("predicoes") or {}
    checar(isinstance(predicoes, dict) and len(predicoes) >= 100, "predições V2 insuficientes")

    historico_path = ROOT / "data/pontuacao-final-cartola-v21.json"
    if historico_path.exists():
        historico = json.loads(historico_path.read_text(encoding="utf-8"))
        gate = historico.get("gate") or historico.get("resumo") or {}
        texto_historico = json.dumps(historico, ensure_ascii=False)
        checar("capitao" in texto_historico.lower(), "histórico final não registra capitão")
        checar("reserva" in texto_historico.lower() or "banco" in texto_historico.lower(), "histórico final não registra banco/Reserva")
        if isinstance(gate, dict):
            inferidas = gate.get("entradasInferidas")
            if inferidas is not None:
                checar(int(inferidas) == 0, f"histórico final ainda possui {inferidas} atuações inferidas")
    else:
        avisos.append("data/pontuacao-final-cartola-v21.json ainda não está persistido nesta árvore")

    historico_js = carregar_texto("js/historico/cards.js") + carregar_texto("js/historico/graficos.js")
    historico_dados = carregar_texto("js/historico/dados.js")
    conjunto_historico = (historico_js + historico_dados).lower()
    checar("proje" in conjunto_historico and "real" in conjunto_historico, "Histórico não contém leitura Projeção x Real")
    checar("recomendado" in conjunto_historico, "Histórico não contempla estado do perfil Recomendado")

    metodologia = carregar_texto("docs/metodologia.md").lower()
    obrigatorios = ["randomforest", "walk-forward", "anti-leakage", "capitão", "reserva de luxo", "c$ 200", "7 formações", "time recomendado", "expected scouts", "clima", "lateralidade", "consenso", "fallback"]
    for termo in obrigatorios:
        checar(termo in metodologia, f"Metodologia final não documenta: {termo}")
    checar("não foi promovido" in metodologia or "não foi promovida" in metodologia, "Metodologia não distingue claramente experimentos reprovados")
    checar("upper-bound" in metodologia, "Gate temporal do clima não está documentado")

    index = carregar_texto("index.html").lower()
    ux = carregar_texto("js/recomendacoes/ux-clean.js").lower()
    checar("expected scouts" not in index, "Expected scouts reprovado apareceu no frontend principal")
    trecho_times = index[index.find('id="times"'): index.find('id="metodologia"')]
    checar("recomendado" not in trecho_times, "Time Recomendado foi promovido na aba Times sem gate aprovado")

    # Gate público: aceita a nomenclatura final orientada a decisão sem relaxar ciência.
    checar("function metodologia" in ux or "aplicarmetodologiafinal" in ux, "Frontend não aplica a metodologia pública final da V2.1")
    checar("randomforest v2" in ux, "Metodologia pública não identifica RandomForest V2")
    checar("time recomendado: não superou" in ux, "Frontend não informa reprovação do Time Recomendado")
    checar("expected scouts" in ux and "gate" in ux, "Frontend não informa reprovação de expected scouts")
    checar("clima observado" in ux and ("não produção" in ux or "upper-bound" in ux), "Frontend não preserva o gate temporal do clima")
    checar(("melhor cenário ofensivo" in ux and "melhor cenário defensivo" in ux) or ("ataque para priorizar" in ux and "defesa para priorizar" in ux), "Análise da Rodada não está orientada a conclusões")
    checar("ver índices técnicos da rodada" in ux or "ver dados que sustentam os insights" in ux, "Análise da Rodada não deixa índices técnicos sob demanda")
    checar("#recomendacoes .hero-summary{display:none" in ux, "Cards de topo pouco acionáveis voltaram às Recomendações")

    print("=== AUDITORIA FINAL V2.1 ===")
    print(f"Rodada atual: {rodada}")
    print(f"Jogadores com projeção V2: {projecoes.get('jogadoresComProjecao')}")
    print(f"Avisos: {len(avisos)}")
    for aviso in avisos:
        print(f"AVISO: {aviso}")

    if erros:
        print(f"Falhas: {len(erros)}")
        for erro in erros:
            print(f"ERRO: {erro}")
        raise SystemExit(1)

    print("Falhas: 0")
    print("Gate final estrutural + UX: APROVADO")


if __name__ == "__main__":
    main()
