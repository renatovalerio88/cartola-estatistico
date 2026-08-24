#!/usr/bin/env python3
"""Experimento científico V2.1: contexto, explosão, posições e recência.

Este script é estritamente diagnóstico. Ele NÃO altera o motor oficial.

Objetivos do primeiro pacote V2.1:
- comparar RandomForest V2 base x V2 com contexto Poisson;
- testar regressão específica para LAT/ATA/GOL;
- treinar classificador separado de explosão 10+;
- testar recência adaptativa sem promover recência pura;
- preservar walk-forward real e excluir explicitamente a R24 deste diagnóstico.

Entrada:
    data/modelagem/matriz_features.json
    data/api/status.json

Saída:
    data/modelagem/experimento_v21_contexto_explosao.json
    data/modelagem/experimento_v21_contexto_explosao.md
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, roc_auc_score

BASE = Path(__file__).resolve().parent.parent
MATRIZ = BASE / "data" / "modelagem" / "matriz_features.json"
STATUS = BASE / "data" / "api" / "status.json"
OUT_JSON = BASE / "data" / "modelagem" / "experimento_v21_contexto_explosao.json"
OUT_MD = BASE / "data" / "modelagem" / "experimento_v21_contexto_explosao.md"

MIN_TREINO = 400
MIN_RODADAS_TREINO = 3
POSICOES_FOCO = {"LAT", "ATA", "GOL"}

FEATURES_BASE = [
    "jogosHistoricos",
    "media3", "media5", "media10", "mediaGeral", "ewma", "mediana",
    "piso20", "teto80", "desvioPadrao", "regularidade",
    "tendencia3x5", "tendencia5x10", "tendenciaEWMA",
    "taxa5Mais", "taxa10Mais", "taxa15Mais", "taxaNegativa",
    "mediaBasica", "mediaBasica3", "mediaBasica5", "mediaBasica10",
    "taxaBasica3Mais", "taxaBasica5Mais", "dependenciaGolAssistenciaSG",
    "mediaOfensivaScouts", "mediaDefensivaScouts",
    "scoutG", "scoutA", "scoutDS", "scoutFS", "scoutFF", "scoutFD",
    "scoutFT", "scoutSG", "scoutDE", "scoutCA", "scoutFC",
    "preco", "variacao", "mando", "statusId", "minutosEsperados",
    "titularidade", "forcaAdversarioIndice", "notaForcaAdversario",
    "pontosCedidosMediaPosicao", "pontosCedidosNota", "chanceSG",
]

FEATURES_POISSON = [
    "poissonLambdaGols",
    "poissonLambdaAdversario",
    "poissonChanceSG",
    "poissonProbVitoria",
    "poissonProbEmpate",
    "poissonProbDerrota",
    "poissonSaldoEsperado",
    "poissonNotaOfensiva",
    "poissonNotaDefensiva",
]

FEATURES_RECENCIA = [
    "media3", "media5", "media10", "ewma",
    "tendencia3x5", "tendencia5x10", "tendenciaEWMA",
]


def ler(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def num(v: Any, default: float = 0.0) -> float:
    try:
        x = float(v)
        return x if math.isfinite(x) else default
    except Exception:
        return default


def extrair_linhas(dados: Any) -> list[dict[str, Any]]:
    if isinstance(dados, list):
        return [x for x in dados if isinstance(x, dict)]
    if isinstance(dados, dict):
        for chave in ("linhas", "amostras", "registros"):
            valor = dados.get(chave)
            if isinstance(valor, list):
                return [x for x in valor if isinstance(x, dict)]
    return []


def alvo(linha: dict[str, Any], chave: str = "pontuacaoReal") -> float:
    target = linha.get("target")
    if isinstance(target, dict):
        return num(target.get(chave))
    return num(target)


def feature(linha: dict[str, Any], nome: str) -> float:
    feats = linha.get("features")
    if not isinstance(feats, dict):
        return 0.0
    return num(feats.get(nome))


def vetor(linha: dict[str, Any], nomes: list[str]) -> list[float]:
    return [feature(linha, n) for n in nomes]


def modelo_regressor(seed: int = 42) -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=260,
        max_depth=11,
        min_samples_leaf=7,
        max_features=0.75,
        random_state=seed,
        n_jobs=-1,
    )


def modelo_classificador(seed: int = 42) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=280,
        max_depth=10,
        min_samples_leaf=8,
        max_features=0.75,
        class_weight="balanced_subsample",
        random_state=seed,
        n_jobs=-1,
    )


def corr(a: list[float], b: list[float]) -> float:
    if len(a) < 3 or len(a) != len(b):
        return 0.0
    aa = np.asarray(a, dtype=float)
    bb = np.asarray(b, dtype=float)
    if np.std(aa) < 1e-12 or np.std(bb) < 1e-12:
        return 0.0
    return float(np.corrcoef(aa, bb)[0, 1])


def resumo_reg(reais: list[float], preds: list[float]) -> dict[str, float]:
    if not reais:
        return {"n": 0, "mae": 0.0, "rmse": 0.0, "correlacao": 0.0}
    return {
        "n": len(reais),
        "mae": round(float(mean_absolute_error(reais, preds)), 4),
        "rmse": round(float(mean_squared_error(reais, preds) ** 0.5), 4),
        "correlacao": round(corr(reais, preds), 4),
    }


def top_por_posicao(linhas: list[dict[str, Any]], preds: list[float], k: int = 5) -> dict[str, Any]:
    por_pos: dict[str, list[tuple[dict[str, Any], float]]] = defaultdict(list)
    for linha, pred in zip(linhas, preds):
        pos = str(linha.get("posicao") or "OUT").upper()
        por_pos[pos].append((linha, float(pred)))

    selecionados = 0
    soma_real = 0.0
    explosoes = 0
    top5_reais = 0
    detalhes = {}

    for pos, itens in sorted(por_pos.items()):
        if not itens:
            continue
        previstos = sorted(itens, key=lambda x: x[1], reverse=True)[:k]
        reais_ord = sorted(itens, key=lambda x: alvo(x[0]), reverse=True)[:k]
        ids_reais = {x[0].get("atletaId") for x in reais_ord}
        acertos = sum(1 for x in previstos if x[0].get("atletaId") in ids_reais)
        reais_sel = [alvo(x[0]) for x in previstos]
        exp_sel = sum(1 for r in reais_sel if r >= 10)
        selecionados += len(previstos)
        soma_real += sum(reais_sel)
        explosoes += exp_sel
        top5_reais += acertos
        detalhes[pos] = {
            "selecionados": len(previstos),
            "mediaReal": round(mean(reais_sel), 4) if reais_sel else 0.0,
            "explosoes10": exp_sel,
            "acertosTop5": acertos,
        }

    return {
        "selecionados": selecionados,
        "mediaRealSelecionados": round(soma_real / selecionados, 4) if selecionados else 0.0,
        "taxaExplosao10": round(100.0 * explosoes / selecionados, 2) if selecionados else 0.0,
        "taxaAcertoTop5": round(100.0 * top5_reais / selecionados, 2) if selecionados else 0.0,
        "porPosicao": detalhes,
    }


def metricas_explosao(reais_bin: list[int], probs: list[float]) -> dict[str, float]:
    if not reais_bin:
        return {"n": 0}
    y = np.asarray(reais_bin, dtype=int)
    p = np.asarray(probs, dtype=float)
    auc = 0.0
    if len(set(y.tolist())) > 1:
        auc = float(roc_auc_score(y, p))
    corte = float(np.quantile(p, 0.90))
    mask = p >= corte
    precision_top10 = float(y[mask].mean()) if mask.any() else 0.0
    base = float(y.mean())
    recall_top10 = float(y[mask].sum() / max(1, y.sum()))
    lift = precision_top10 / base if base > 0 else 0.0
    return {
        "n": int(len(y)),
        "prevalencia10Mais": round(base * 100.0, 2),
        "auc": round(auc, 4),
        "precisionTop10Pct": round(precision_top10 * 100.0, 2),
        "recallTop10Pct": round(recall_top10 * 100.0, 2),
        "liftTop10": round(lift, 3),
    }


def cobertura_features(linhas: list[dict[str, Any]], nomes: list[str]) -> dict[str, float]:
    saida = {}
    total = max(1, len(linhas))
    for nome in nomes:
        preenchidos = 0
        for linha in linhas:
            feats = linha.get("features") if isinstance(linha.get("features"), dict) else {}
            if feats.get(nome) is not None:
                preenchidos += 1
        saida[nome] = round(100.0 * preenchidos / total, 2)
    return saida


def main() -> None:
    status = ler(STATUS)
    rodada_atual = int(status.get("rodada_atual") or 24)
    rodada_corte = min(23, rodada_atual - 1)
    linhas = [
        l for l in extrair_linhas(ler(MATRIZ))
        if 2 <= int(l.get("rodada") or 999) <= rodada_corte
        and str(l.get("posicao") or "").upper() in {"GOL", "LAT", "ZAG", "MEI", "ATA", "TEC"}
    ]
    if len(linhas) < 1000:
        raise SystemExit(f"Amostra R1-R23 insuficiente: {len(linhas)}")

    rodadas = sorted({int(l["rodada"]) for l in linhas})
    resultados = {
        "base": {"reais": [], "preds": []},
        "contexto": {"reais": [], "preds": []},
        "posicional": {"reais": [], "preds": []},
        "recenciaAdaptativa": {"reais": [], "preds": []},
    }
    explosao_y: list[int] = []
    explosao_p: list[float] = []
    por_rodada = []

    for rodada in rodadas:
        treino = [l for l in linhas if int(l.get("rodada") or 999) < rodada]
        teste = [l for l in linhas if int(l.get("rodada") or -1) == rodada]
        if len(treino) < MIN_TREINO or len({int(l["rodada"]) for l in treino}) < MIN_RODADAS_TREINO:
            continue

        y_treino = np.asarray([alvo(l) for l in treino], dtype=float)
        y_teste = [alvo(l) for l in teste]

        base = modelo_regressor(42 + rodada)
        base.fit(np.asarray([vetor(l, FEATURES_BASE) for l in treino], dtype=float), y_treino)
        p_base = base.predict(np.asarray([vetor(l, FEATURES_BASE) for l in teste], dtype=float))

        contexto = modelo_regressor(142 + rodada)
        nomes_contexto = FEATURES_BASE + FEATURES_POISSON
        contexto.fit(np.asarray([vetor(l, nomes_contexto) for l in treino], dtype=float), y_treino)
        p_ctx = contexto.predict(np.asarray([vetor(l, nomes_contexto) for l in teste], dtype=float))

        p_pos = np.asarray(p_ctx, dtype=float).copy()
        for pos in POSICOES_FOCO:
            tr_idx = [i for i, l in enumerate(treino) if str(l.get("posicao") or "").upper() == pos]
            te_idx = [i for i, l in enumerate(teste) if str(l.get("posicao") or "").upper() == pos]
            if len(tr_idx) < 180 or not te_idx:
                continue
            model_pos = modelo_regressor(242 + rodada + len(pos))
            model_pos.fit(
                np.asarray([vetor(treino[i], nomes_contexto) for i in tr_idx], dtype=float),
                y_treino[tr_idx],
            )
            pp = model_pos.predict(np.asarray([vetor(teste[i], nomes_contexto) for i in te_idx], dtype=float))
            for local, valor in zip(te_idx, pp):
                p_pos[local] = valor

        # Recência adaptativa: só mistura quando há sinal coerente de aceleração.
        p_rec = np.asarray(p_ctx, dtype=float).copy()
        for i, linha in enumerate(teste):
            m3 = feature(linha, "media3")
            m10 = feature(linha, "media10")
            ew = feature(linha, "ewma")
            tendencia = feature(linha, "tendenciaEWMA")
            if abs(tendencia) >= 0.75 and feature(linha, "jogosHistoricos") >= 5:
                rec = 0.50 * m3 + 0.30 * ew + 0.20 * m10
                p_rec[i] = 0.85 * p_ctx[i] + 0.15 * rec

        clf = modelo_classificador(342 + rodada)
        y_exp_tr = np.asarray([int(alvo(l, "explodiu10")) for l in treino], dtype=int)
        if len(set(y_exp_tr.tolist())) > 1:
            clf.fit(np.asarray([vetor(l, nomes_contexto) for l in treino], dtype=float), y_exp_tr)
            p_exp = clf.predict_proba(np.asarray([vetor(l, nomes_contexto) for l in teste], dtype=float))[:, 1]
        else:
            p_exp = np.zeros(len(teste), dtype=float)

        y_exp_te = [int(alvo(l, "explodiu10")) for l in teste]
        explosao_y.extend(y_exp_te)
        explosao_p.extend([float(x) for x in p_exp])

        for chave, preds in (
            ("base", p_base),
            ("contexto", p_ctx),
            ("posicional", p_pos),
            ("recenciaAdaptativa", p_rec),
        ):
            resultados[chave]["reais"].extend(y_teste)
            resultados[chave]["preds"].extend([float(x) for x in preds])

        por_rodada.append({
            "rodada": rodada,
            "n": len(teste),
            "base": resumo_reg(y_teste, [float(x) for x in p_base]),
            "contexto": resumo_reg(y_teste, [float(x) for x in p_ctx]),
            "posicional": resumo_reg(y_teste, [float(x) for x in p_pos]),
            "recenciaAdaptativa": resumo_reg(y_teste, [float(x) for x in p_rec]),
            "topBase": top_por_posicao(teste, [float(x) for x in p_base]),
            "topContexto": top_por_posicao(teste, [float(x) for x in p_ctx]),
            "topPosicional": top_por_posicao(teste, [float(x) for x in p_pos]),
        })

    resumo = {}
    for chave, dados in resultados.items():
        resumo[chave] = resumo_reg(dados["reais"], dados["preds"])

    base_mae = resumo["base"]["mae"]
    for chave in ("contexto", "posicional", "recenciaAdaptativa"):
        mae_alt = resumo[chave]["mae"]
        resumo[chave]["ganhoMaePctVsBase"] = round(100.0 * (base_mae - mae_alt) / base_mae, 3) if base_mae else 0.0

    vitorias_ctx = sum(1 for r in por_rodada if r["contexto"]["mae"] < r["base"]["mae"])
    vitorias_pos = sum(1 for r in por_rodada if r["posicional"]["mae"] < r["contexto"]["mae"])
    vitorias_rec = sum(1 for r in por_rodada if r["recenciaAdaptativa"]["mae"] < r["contexto"]["mae"])
    n_rod = len(por_rodada)

    cobertura = cobertura_features(linhas, FEATURES_POISSON)
    cobertura_min_poisson = min(cobertura.values()) if cobertura else 0.0

    gates = {
        "antiLeakage": all(r["rodada"] <= rodada_corte for r in por_rodada),
        "r24Excluida": rodada_corte <= 23 and all(r["rodada"] != 24 for r in por_rodada),
        "amostraSuficiente": len(resultados["base"]["reais"]) >= 2000,
        "contextoCoberturaMin50": cobertura_min_poisson >= 50.0,
        "contextoMaeMelhora": resumo["contexto"]["mae"] < resumo["base"]["mae"],
        "contextoVenceMaioriaRodadas": vitorias_ctx > n_rod / 2 if n_rod else False,
        "explosaoAucMin055": metricas_explosao(explosao_y, explosao_p).get("auc", 0) >= 0.55,
        "explosaoLiftMin125": metricas_explosao(explosao_y, explosao_p).get("liftTop10", 0) >= 1.25,
    }

    decisao_contexto = "APTO_PARA_PROXIMO_TESTE" if (
        gates["contextoCoberturaMin50"]
        and gates["contextoMaeMelhora"]
        and gates["contextoVenceMaioriaRodadas"]
    ) else "MANTER_V2_BASE"

    saida = {
        "experimento": "v21_contexto_explosao_posicoes_recencia",
        "uso": "diagnostico; nenhuma promoção automática",
        "walkForward": True,
        "antiLeakage": True,
        "rodadaAtualObservada": rodada_atual,
        "rodadaCorteDiagnostico": rodada_corte,
        "r24Excluida": True,
        "amostrasAvaliadas": len(resultados["base"]["reais"]),
        "rodadasAvaliadas": n_rod,
        "coberturaPoissonPct": cobertura,
        "resumo": resumo,
        "explosao10": metricas_explosao(explosao_y, explosao_p),
        "vitoriasPorRodada": {
            "contextoVsBase": vitorias_ctx,
            "posicionalVsContexto": vitorias_pos,
            "recenciaAdaptativaVsContexto": vitorias_rec,
        },
        "gates": gates,
        "decisaoContexto": decisao_contexto,
        "porRodada": por_rodada,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    linhas_md = [
        "# Experimento V2.1 — contexto, explosão, posições e recência",
        "",
        f"- Rodadas avaliadas: {n_rod}",
        f"- Amostras: {saida['amostrasAvaliadas']}",
        f"- Corte: R{rodada_corte} (R24 explicitamente excluída)",
        f"- MAE base: {resumo['base']['mae']}",
        f"- MAE contexto: {resumo['contexto']['mae']}",
        f"- MAE posicional: {resumo['posicional']['mae']}",
        f"- MAE recência adaptativa: {resumo['recenciaAdaptativa']['mae']}",
        f"- Explosão 10+ AUC: {saida['explosao10'].get('auc', 0)}",
        f"- Explosão 10+ lift top decil: {saida['explosao10'].get('liftTop10', 0)}",
        f"- Decisão contexto: {decisao_contexto}",
        "",
        "## Gates",
    ]
    linhas_md.extend(f"- {k}: {'OK' if v else 'NÃO'}" for k, v in gates.items())
    OUT_MD.write_text("\n".join(linhas_md) + "\n", encoding="utf-8")

    print(json.dumps({
        "rodadasAvaliadas": n_rod,
        "amostras": saida["amostrasAvaliadas"],
        "resumo": resumo,
        "explosao10": saida["explosao10"],
        "vitoriasPorRodada": saida["vitoriasPorRodada"],
        "gates": gates,
        "decisaoContexto": decisao_contexto,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
