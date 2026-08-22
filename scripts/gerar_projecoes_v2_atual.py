#!/usr/bin/env python3
"""Gera as projeções oficiais da V2 para a rodada atual.

Usa o RandomForest aprovado pelo walk-forward e pelo gate de produção.
Treina exclusivamente com rodadas anteriores à rodada corrente e grava um
artefato simples consumível pelo frontend. Não altera os dados brutos da API.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np

from benchmark_modelos import criar_modelos, vetor_features
from gerar_matriz_features import calcular_features_historicas, registros_com_pontos

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
STATUS = DATA / "api" / "status.json"
BASE_HIST = DATA / "base-historica"
MATRIZ = DATA / "modelagem" / "matriz_features.json"
OUT = DATA / "modelagem" / "projecoes_v2_atual.json"
MODELO = "RandomForest"


def ler(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def num(v: Any, default: float = 0.0) -> float:
    try:
        x = float(v)
        return x if math.isfinite(x) else default
    except Exception:
        return default


def carregar_historico(atleta_id: Any, rodada: int) -> list[dict[str, Any]]:
    path = BASE_HIST / f"{atleta_id}.json"
    if not path.exists():
        return []
    try:
        historico = ler(path).get("historico", [])
    except Exception:
        return []
    return registros_com_pontos([
        r for r in historico
        if isinstance(r, dict) and int(r.get("rodada") or 999) < rodada
    ])


def contexto_atual(j: dict[str, Any]) -> dict[str, Any]:
    mando = j.get("mando")
    if isinstance(mando, str):
        mando = 1 if mando.strip().lower() in {"casa", "mandante", "home"} else 0
    elif mando is True:
        mando = 1
    elif mando is False:
        mando = 0
    else:
        mando = None
    return {
        "preco": j.get("preco"),
        "variacao": j.get("variacao"),
        "mando": mando,
        "statusId": j.get("statusId"),
        "minutosEsperados": j.get("minutosEsperados"),
        "titularidade": j.get("titularidade"),
        "forcaAdversarioIndice": j.get("forcaAdversarioIndice"),
        "notaForcaAdversario": j.get("notaForcaAdversario"),
        "pontosCedidosMediaPosicao": j.get("pontosCedidosMediaPosicao"),
        "pontosCedidosNota": j.get("pontosCedidosNota"),
        "chanceSG": j.get("chanceSG"),
    }


def main() -> None:
    status = ler(STATUS)
    rodada = int(status["rodada_atual"])
    jogadores_path = DATA / "api" / f"rodada-{rodada:02d}" / "jogadores.json"
    jogadores = ler(jogadores_path)
    matriz = ler(MATRIZ)
    if isinstance(matriz, dict):
        matriz = matriz.get("linhas") or matriz.get("amostras") or []

    treino = [l for l in matriz if int(l.get("rodada") or 999) < rodada]
    if len(treino) < 1000:
        raise SystemExit(f"Treino V2 insuficiente: {len(treino)}")

    X_treino = np.array([vetor_features(l) for l in treino], dtype=float)
    y_treino = np.array([num(l.get("target")) for l in treino], dtype=float)

    linhas = []
    for j in jogadores:
        hist = carregar_historico(j.get("id"), rodada)
        if not hist:
            continue
        feats = calcular_features_historicas(hist)
        if not feats:
            continue
        feats.update(contexto_atual(j))
        linhas.append({
            "id": j.get("id"),
            "apelido": j.get("apelido") or j.get("nome") or str(j.get("id")),
            "posicao": str(j.get("posicao") or "").upper(),
            "features": feats,
        })

    if len(linhas) < 100:
        raise SystemExit(f"Cobertura V2 insuficiente: {len(linhas)}")

    modelo = criar_modelos()[MODELO]
    modelo.fit(X_treino, y_treino)
    X_atual = np.array([vetor_features(l) for l in linhas], dtype=float)
    preds = modelo.predict(X_atual)

    predicoes = {
        str(linha["id"]): round(float(pred), 3)
        for linha, pred in zip(linhas, preds)
    }

    saida = {
        "versao": "V2",
        "modelo": MODELO,
        "rodada": rodada,
        "antiLeakage": all(int(l.get("rodada") or 999) < rodada for l in treino),
        "amostrasTreino": len(treino),
        "jogadoresComProjecao": len(predicoes),
        "predicoes": predicoes,
    }
    if not saida["antiLeakage"]:
        raise SystemExit("Vazamento temporal detectado na geração V2")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: saida[k] for k in ("versao", "modelo", "rodada", "antiLeakage", "amostrasTreino", "jogadoresComProjecao")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
