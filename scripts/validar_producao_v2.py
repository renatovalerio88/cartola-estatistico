#!/usr/bin/env python3
"""Gate de produção do Cartola Estatístico V2.

Treina os candidatos aprovados no walk-forward somente com rodadas anteriores
à rodada atual, gera previsões para o mercado atual e valida se o modelo pode
ser usado pelo pipeline real sem quebrar orçamento, titularidade, formações,
concentração por clube, técnico e capitão.

Este script NÃO altera o motor oficial e NÃO sobrescreve data/jogadores.json ou
data/escalacoes.json. Ele apenas produz um artefato de validação.
"""
from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np

from benchmark_modelos import FEATURES_NUMERICAS, POSICOES, criar_modelos, vetor_features
from gerar_matriz_features import calcular_features_historicas, registros_com_pontos

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
MATRIZ = DATA / "modelagem" / "matriz_features.json"
VALIDACAO = DATA / "modelagem" / "validacao_ml_vs_v1.json"
STATUS = DATA / "api" / "status.json"
BASE_HIST = DATA / "base-historica"
OUT = DATA / "modelagem" / "validacao_producao_v2.json"
OUT_MD = DATA / "modelagem" / "validacao_producao_v2.md"

FORMACOES = {
    "4-3-3": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 3, "ATA": 3},
    "4-4-2": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 4, "ATA": 2},
    "3-4-3": {"GOL": 1, "LAT": 2, "ZAG": 1, "MEI": 4, "ATA": 3},
    "3-5-2": {"GOL": 1, "LAT": 2, "ZAG": 1, "MEI": 5, "ATA": 2},
    "5-3-2": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 3, "ATA": 2},
    "4-5-1": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 5, "ATA": 1},
    "5-4-1": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 4, "ATA": 1},
}
ORCAMENTO = 120.0
MAX_CLUBE = 3
MIN_TITULARIDADE = 70.0
MIN_MINUTOS = 60.0
STATUS_PROVAVEL = 7


def ler(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def num(v: Any, default: float = 0.0) -> float:
    try:
        x = float(v)
        return x if math.isfinite(x) else default
    except Exception:
        return default


def contexto_atual(j: dict[str, Any]) -> dict[str, Any]:
    mando = j.get("mando")
    if isinstance(mando, str):
        mando_n = 1 if mando.strip().lower() in {"casa", "mandante", "home"} else 0
    elif mando is True:
        mando_n = 1
    elif mando is False:
        mando_n = 0
    else:
        mando_n = None
    return {
        "preco": j.get("preco"),
        "variacao": j.get("variacao"),
        "mando": mando_n,
        "statusId": j.get("statusId"),
        "minutosEsperados": j.get("minutosEsperados"),
        "titularidade": j.get("titularidade"),
        "forcaAdversarioIndice": j.get("forcaAdversarioIndice"),
        "notaForcaAdversario": j.get("notaForcaAdversario"),
        "pontosCedidosMediaPosicao": j.get("pontosCedidosMediaPosicao"),
        "pontosCedidosNota": j.get("pontosCedidosNota"),
        "chanceSG": j.get("chanceSG"),
    }


def carregar_historico(atleta_id: Any, rodada: int) -> list[dict[str, Any]]:
    p = BASE_HIST / f"{atleta_id}.json"
    if not p.exists():
        return []
    try:
        hist = ler(p).get("historico", [])
    except Exception:
        return []
    return registros_com_pontos([
        r for r in hist
        if isinstance(r, dict) and int(r.get("rodada") or 999) < rodada
    ])


def montar_linhas_atuais(jogadores: list[dict[str, Any]], rodada: int) -> list[dict[str, Any]]:
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
            "clube": j.get("siglaClube") or j.get("clube") or "",
            "preco": num(j.get("preco")),
            "statusId": j.get("statusId"),
            "titularidade": num(j.get("titularidade")),
            "minutosEsperados": num(j.get("minutosEsperados")),
            "features": feats,
        })
    return linhas


def treino_antes_da_rodada(matriz: list[dict[str, Any]], rodada: int):
    linhas = [l for l in matriz if int(l.get("rodada") or 999) < rodada]
    X = np.array([vetor_features(l) for l in linhas], dtype=float)
    y = np.array([num(l.get("target")) for l in linhas], dtype=float)
    return linhas, X, y


def prever(modelo, linhas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    X = np.array([vetor_features(l) for l in linhas], dtype=float)
    pred = modelo.predict(X)
    saida = []
    for l, p in zip(linhas, pred):
        novo = dict(l)
        novo["projecaoV2"] = round(float(p), 3)
        saida.append(novo)
    return saida


def elegivel(j: dict[str, Any]) -> bool:
    return (
        j.get("posicao") in POSICOES
        and int(j.get("statusId") or 0) == STATUS_PROVAVEL
        and num(j.get("titularidade")) >= MIN_TITULARIDADE
        and num(j.get("minutosEsperados")) >= MIN_MINUTOS
        and num(j.get("preco")) > 0
    )


def montar_time(candidatos: list[dict[str, Any]], formacao: dict[str, int]):
    # Busca gulosa com múltiplos pesos de custo. O objetivo do gate é provar
    # existência/compatibilidade de time válido, não substituir o otimizador oficial.
    melhores = None
    for penalidade in (0.0, 0.08, 0.15, 0.25, 0.40, 0.60, 0.90):
        escolhidos = []
        clubes = Counter()
        falhou = False
        for pos, qtd in formacao.items():
            pool = [j for j in candidatos if j["posicao"] == pos]
            pool.sort(key=lambda j: j["projecaoV2"] - penalidade * j["preco"], reverse=True)
            for _ in range(qtd):
                opcoes = [j for j in pool if j not in escolhidos and clubes[j["clube"]] < MAX_CLUBE]
                if not opcoes:
                    falhou = True
                    break
                pick = opcoes[0]
                escolhidos.append(pick)
                clubes[pick["clube"]] += 1
            if falhou:
                break
        if falhou:
            continue
        tecnicos = [j for j in candidatos if j["posicao"] == "TEC" and clubes[j["clube"]] < MAX_CLUBE]
        tecnicos.sort(key=lambda j: j["projecaoV2"] - penalidade * j["preco"], reverse=True)
        if not tecnicos:
            continue
        time = escolhidos + [tecnicos[0]]
        custo = sum(j["preco"] for j in time)
        if custo <= ORCAMENTO + 1e-9:
            pts = sum(j["projecaoV2"] for j in time)
            capitao = max(escolhidos, key=lambda j: j["projecaoV2"])
            candidato = {
                "custo": round(custo, 2),
                "projecao": round(pts + capitao["projecaoV2"], 2),
                "capitao": capitao["apelido"],
                "maxClube": max(Counter(j["clube"] for j in time).values()),
                "jogadores": [{
                    "id": j["id"], "apelido": j["apelido"], "posicao": j["posicao"],
                    "clube": j["clube"], "preco": j["preco"], "projecaoV2": j["projecaoV2"],
                } for j in time],
            }
            if melhores is None or candidato["projecao"] > melhores["projecao"]:
                melhores = candidato
    return melhores


def main() -> None:
    status = ler(STATUS)
    rodada = int(status["rodada_atual"])
    atual_path = DATA / "api" / f"rodada-{rodada:02d}" / "jogadores.json"
    if not atual_path.exists():
        raise SystemExit(f"Mercado atual ausente: {atual_path}")

    validacao = ler(VALIDACAO)
    if validacao.get("decisao") != "APTO_PARA_TESTE_DE_PRODUCAO":
        raise SystemExit("Gate científico anterior ainda não aprovou candidato para produção")

    candidato = validacao.get("candidatoApto")
    if candidato not in {"RandomForest", "Ridge"}:
        raise SystemExit(f"Candidato inesperado: {candidato}")

    matriz = ler(MATRIZ)
    if isinstance(matriz, dict):
        matriz = matriz.get("linhas") or matriz.get("amostras") or []
    atuais = montar_linhas_atuais(ler(atual_path), rodada)
    treino, X, y = treino_antes_da_rodada(matriz, rodada)
    if len(treino) < 1000:
        raise SystemExit(f"Treino insuficiente: {len(treino)}")
    if len(atuais) < 100:
        raise SystemExit(f"Cobertura atual insuficiente: {len(atuais)}")

    modelos = criar_modelos()
    if candidato not in modelos:
        raise SystemExit(f"Modelo {candidato} indisponível")
    modelo = modelos[candidato]
    modelo.fit(X, y)
    previstos = prever(modelo, atuais)
    elegiveis = [j for j in previstos if elegivel(j)]

    cobertura_pos = {p: sum(j["posicao"] == p for j in elegiveis) for p in POSICOES}
    times = {nome: montar_time(elegiveis, esquema) for nome, esquema in FORMACOES.items()}
    validos = {nome: t for nome, t in times.items() if t is not None}

    faltantes_features = {}
    for nome in FEATURES_NUMERICAS:
        faltantes_features[nome] = round(100 * sum(
            1 for l in atuais if l["features"].get(nome) is None
        ) / max(1, len(atuais)), 1)

    gates = {
        "candidatoAprovadoNoWalkForward": True,
        "treinoSomentePassado": all(int(l.get("rodada") or 999) < rodada for l in treino),
        "coberturaAtualMin100": len(atuais) >= 100,
        "elegiveisMin60": len(elegiveis) >= 60,
        "todasPosicoesCobertas": all(cobertura_pos[p] >= ({"GOL":2,"LAT":4,"ZAG":4,"MEI":8,"ATA":6,"TEC":2}[p]) for p in POSICOES),
        "formacoesValidasMin5": len(validos) >= 5,
        "orcamentoRespeitado": all(t["custo"] <= ORCAMENTO for t in validos.values()),
        "concentracaoRespeitada": all(t["maxClube"] <= MAX_CLUBE for t in validos.values()),
        "capitaoValido": all(bool(t["capitao"]) for t in validos.values()),
    }
    aprovado = all(gates.values())

    saida = {
        "modelo": "gate_producao_v2",
        "rodada": rodada,
        "candidato": candidato,
        "baselinePreservada": True,
        "antiLeakage": gates["treinoSomentePassado"],
        "amostrasTreino": len(treino),
        "jogadoresMercadoComHistorico": len(atuais),
        "jogadoresElegiveis": len(elegiveis),
        "coberturaPosicao": cobertura_pos,
        "missingFeaturesPct": faltantes_features,
        "formacoesValidas": list(validos),
        "times": validos,
        "gates": gates,
        "decisao": "APTO_PARA_INTEGRACAO_V2" if aprovado else "MANTER_V1",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    linhas_md = [
        "# Gate de Produção V2", "", f"Rodada: {rodada}", f"Candidato: {candidato}",
        f"Treino: {len(treino)} amostras", f"Mercado com histórico: {len(atuais)}",
        f"Elegíveis: {len(elegiveis)}", f"Formações válidas: {len(validos)}/{len(FORMACOES)}", "",
        "## Gates", *[f"- {'✅' if ok else '❌'} {k}" for k, ok in gates.items()], "",
        f"## Decisão: {saida['decisao']}",
    ]
    OUT_MD.write_text("\n".join(linhas_md) + "\n", encoding="utf-8")
    print(json.dumps({k: saida[k] for k in (
        "rodada","candidato","amostrasTreino","jogadoresMercadoComHistorico",
        "jogadoresElegiveis","coberturaPosicao","formacoesValidas","gates","decisao"
    )}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
