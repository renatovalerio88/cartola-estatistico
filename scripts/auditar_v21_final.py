#!/usr/bin/env python3
"""Auditoria final e não destrutiva do pacote Cartola Estatístico V2.1.

O script verifica apenas contratos e decisões já aprovadas. Ele não treina modelos,
não altera dados e não promove features experimentais.
"""

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

    # 1) Status e rodada atual.
    status = carregar_json("data/api/status.json")
    rodada = int(status.get("rodada_atual", 0) or 0)
    checar(1 <= rodada <= 38, f"rodada_atual inválida: {rodada}")
    checar(status.get("temporada") == 2026, "temporada diferente de 2026")

    # 2) Artefato V2 oficial.
    projecoes = carregar_json("data/modelagem/projecoes_v2_atual.json")
    checar(projecoes.get("versao") == "V2", "artefato atual não está marcado como V2")
    checar(projecoes.get("modelo") == "RandomForest", "modelo oficial não é RandomForest")
    checar(projecoes.get("antiLeakage") is True, "antiLeakage da V2 não está true")
    checar(int(projecoes.get("rodada", 0) or 0) == rodada, "rodada do artefato V2 diverge do status")
    checar(int(projecoes.get("jogadoresComProjecao", 0) or 0) >= 100, "menos de 100 atletas com projeção V2")

    predicoes = projecoes.get("predicoes") or {}
    checar(isinstance(predicoes, dict) and len(predicoes) >= 100, "predições V2 insuficientes")

    # 3) Histórico final com banco/Luxo/capitão, quando publicado.
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

    # 4) Histórico orientado à decisão.
    historico_js = carregar_texto("js/historico/cards.js") + carregar_texto("js/historico/graficos.js")
    historico_dados = carregar_texto("js/historico/dados.js")
    conjunto_historico = (historico_js + historico_dados).lower()
    checar("proje" in conjunto_historico and "real" in conjunto_historico, "Histórico não contém leitura Projeção x Real")
    checar("recomendado" in conjunto_historico, "Histórico não contempla estado do perfil Recomendado")

    # 5) Metodologia final deve refletir produção e reprovações.
    metodologia = carregar_texto("docs/metodologia.md").lower()
    obrigatorios = [
        "randomforest",
        "walk-forward",
        "anti-leakage",
        "capitão",
        "reserva de luxo",
        "c$ 200",
        "7 formações",
        "time recomendado",
        "expected scouts",
        "clima",
        "lateralidade",
        "consenso",
        "fallback",
    ]
    for termo in obrigatorios:
        checar(termo in metodologia, f"Metodologia final não documenta: {termo}")

    checar("não foi promovido" in metodologia or "não foi promovida" in metodologia, "Metodologia não distingue claramente experimentos reprovados")
    checar("upper-bound" in metodologia, "Gate temporal do clima não está documentado")

    # 6) Expected scouts não deve ser apresentado como feature oficial no frontend.
    index = carregar_texto("index.html").lower()
    checar("expected scouts" not in index, "Expected scouts reprovado apareceu no frontend principal")

    # 7) Time Recomendado não deve ser anunciado como quarto time oficial no HTML estático.
    # O Histórico pode citar o estado indisponível via JavaScript; aqui bloqueamos apenas promoção explícita no catálogo de times.
    trecho_times = index[index.find('id="times"'): index.find('id="metodologia"')]
    checar("recomendado" not in trecho_times, "Time Recomendado foi promovido na aba Times sem gate aprovado")

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
    print("Gate final estrutural: APROVADO")


if __name__ == "__main__":
    main()
