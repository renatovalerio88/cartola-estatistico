#!/usr/bin/env python3
"""Backtest Progressivo V2 do Cartola Estatístico.

Princípio central: para avaliar a rodada N, qualquer calibração usa SOMENTE
rodadas anteriores a N. A V1 permanece baseline imutável; este script apenas
mede um candidato simples de calibração e nunca promove mudanças em produção.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, median

BASE = Path(__file__).resolve().parent.parent
HIST = BASE / "data" / "historico"
OUT = BASE / "data" / "backtest-progressivo-v2.json"
REPORT = BASE / "data" / "backtest-progressivo-v2.md"
POSICOES = ("GOL", "LAT", "ZAG", "MEI", "ATA", "TEC")
MIN_TREINO = 2


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def carregar_rodadas():
    rodadas = []
    for arq in sorted(HIST.glob("rodada-*.json")):
        try:
            dados = json.loads(arq.read_text(encoding="utf-8"))
        except Exception:
            continue
        n = int(dados.get("rodada") or arq.stem.split("-")[-1])
        jogadores = []
        for j in dados.get("jogadores", []):
            p = num(j.get("projecao"))
            r = num(j.get("real"))
            pos = str(j.get("posicao") or "").upper()
            if p is None or r is None or pos not in POSICOES:
                continue
            jogadores.append({"id": j.get("id"), "posicao": pos, "projecao": p, "real": r})
        if len(jogadores) < 20:
            continue
        # Rodada aberta costuma aparecer com massa de zeros. Não a tratamos como verdade final.
        nao_zero = sum(abs(j["real"]) > 1e-9 for j in jogadores)
        if nao_zero / len(jogadores) < 0.10:
            continue
        rodadas.append((n, jogadores))
    return sorted(rodadas)


def fit_linear(pares):
    """Regressão y=a+b*x com shrinkage conservador do slope para 1."""
    if len(pares) < 30:
        return 0.0, 1.0
    xs = [x for x, _ in pares]
    ys = [y for _, y in pares]
    mx, my = mean(xs), mean(ys)
    var = sum((x - mx) ** 2 for x in xs)
    if var <= 1e-9:
        return my - mx, 1.0
    cov = sum((x - mx) * (y - my) for x, y in pares)
    slope_ols = cov / var
    # Evita calibração agressiva/overfit: 70% baseline slope 1, 30% OLS.
    b = 0.70 + 0.30 * max(0.40, min(1.60, slope_ols))
    a = my - b * mx
    # Intercepto também limitado para não distorcer escala.
    a = max(-2.5, min(2.5, a))
    return a, b


def calibradores(treino):
    por_pos = defaultdict(list)
    global_ = []
    for _, js in treino:
        for j in js:
            par = (j["projecao"], j["real"])
            por_pos[j["posicao"]].append(par)
            global_.append(par)
    ag, bg = fit_linear(global_)
    result = {"GLOBAL": (ag, bg)}
    for pos in POSICOES:
        pares = por_pos[pos]
        result[pos] = fit_linear(pares) if len(pares) >= 30 else (ag, bg)
    return result


def mae(rows, key):
    return mean(abs(x[key] - x["real"]) for x in rows) if rows else None


def rmse(rows, key):
    return math.sqrt(mean((x[key] - x["real"]) ** 2 for x in rows)) if rows else None


def corr(rows, key):
    if len(rows) < 3:
        return None
    xs = [x[key] for x in rows]
    ys = [x["real"] for x in rows]
    mx, my = mean(xs), mean(ys)
    vx = sum((x - mx) ** 2 for x in xs)
    vy = sum((y - my) ** 2 for y in ys)
    if vx <= 1e-12 or vy <= 1e-12:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / math.sqrt(vx * vy)


def top_real(rows, key, k):
    return sum(x["real"] for x in sorted(rows, key=lambda z: z[key], reverse=True)[:k])


def arred(v, n=3):
    return None if v is None else round(v, n)


def executar():
    rodadas = carregar_rodadas()
    testes = []
    agregados = []

    for idx in range(MIN_TREINO, len(rodadas)):
        alvo_n, alvo_js = rodadas[idx]
        treino = rodadas[:idx]
        cal = calibradores(treino)
        rows = []
        for j in alvo_js:
            a, b = cal[j["posicao"]]
            cand = a + b * j["projecao"]
            rows.append({**j, "v1": j["projecao"], "v2": cand})
        if not rows:
            continue
        m1, m2 = mae(rows, "v1"), mae(rows, "v2")
        t11_1, t11_2 = top_real(rows, "v1", 11), top_real(rows, "v2", 11)
        posicoes = {}
        for pos in POSICOES:
            rp = [r for r in rows if r["posicao"] == pos]
            if not rp:
                continue
            posicoes[pos] = {
                "n": len(rp),
                "maeV1": arred(mae(rp, "v1")),
                "maeV2": arred(mae(rp, "v2")),
            }
        testes.append({
            "rodada": alvo_n,
            "treinoAte": rodadas[idx - 1][0],
            "n": len(rows),
            "maeV1": arred(m1),
            "maeV2": arred(m2),
            "ganhoMaePct": arred((m1 - m2) / m1 * 100 if m1 else 0, 2),
            "rmseV1": arred(rmse(rows, "v1")),
            "rmseV2": arred(rmse(rows, "v2")),
            "correlacaoV1": arred(corr(rows, "v1")),
            "correlacaoV2": arred(corr(rows, "v2")),
            "top5RealV1": arred(top_real(rows, "v1", 5), 2),
            "top5RealV2": arred(top_real(rows, "v2", 5), 2),
            "top11RealV1": arred(t11_1, 2),
            "top11RealV2": arred(t11_2, 2),
            "ganhoTop11": arred(t11_2 - t11_1, 2),
            "calibradores": {p: {"a": arred(a), "b": arred(b)} for p, (a, b) in cal.items()},
            "posicoes": posicoes,
        })
        agregados.extend(rows)

    if not testes:
        raise SystemExit("Sem rodadas suficientes para backtest walk-forward")

    m1, m2 = mae(agregados, "v1"), mae(agregados, "v2")
    ganhos11 = [x["ganhoTop11"] for x in testes]
    vitorias = sum(x["maeV2"] < x["maeV1"] for x in testes)
    pos_resumo = {}
    piora_max = 0.0
    for pos in POSICOES:
        rp = [r for r in agregados if r["posicao"] == pos]
        if not rp:
            continue
        p1, p2 = mae(rp, "v1"), mae(rp, "v2")
        delta = (p1 - p2) / p1 * 100 if p1 else 0
        piora_max = max(piora_max, -delta)
        pos_resumo[pos] = {"n": len(rp), "maeV1": arred(p1), "maeV2": arred(p2), "ganhoPct": arred(delta, 2)}

    ganho_mae = (m1 - m2) / m1 * 100 if m1 else 0
    ganho11 = mean(ganhos11)
    taxa_vitoria = 100 * vitorias / len(testes)

    gate = {
        "maeMelhoraMin2pct": ganho_mae >= 2.0,
        "top11GanhoMedioMin1_5": ganho11 >= 1.5,
        "vitoriasRodadasMin55pct": taxa_vitoria >= 55.0,
        "nenhumaPosicaoPioraMais5pct": piora_max <= 5.0,
    }
    passou = all(gate.values())
    resultado = {
        "modelo": "backtest_progressivo_v2",
        "baseline": "V1 congelada em main antes deste experimento",
        "metodo": "walk-forward: rodada N usa somente rodadas < N para calibrar",
        "observacao": "V2 é apenas candidata experimental; este arquivo não altera pesos nem produção.",
        "rodadasDisponiveisFechadas": [n for n, _ in rodadas],
        "rodadasTestadas": [x["rodada"] for x in testes],
        "resumo": {
            "nJogadores": len(agregados),
            "nRodadas": len(testes),
            "maeV1": arred(m1),
            "maeV2": arred(m2),
            "ganhoMaePct": arred(ganho_mae, 2),
            "ganhoTop11Medio": arred(ganho11, 2),
            "medianaGanhoTop11": arred(median(ganhos11), 2),
            "taxaRodadasV2MelhorMaePct": arred(taxa_vitoria, 1),
            "porPosicao": pos_resumo,
        },
        "gatePromocao": gate,
        "decisao": "CANDIDATO_APTO_PARA_PROXIMO_TESTE" if passou else "MANTER_V1",
        "rodadas": testes,
    }
    OUT.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")

    linhas = [
        "# Backtest Progressivo V2",
        "",
        "Baseline: **V1 congelada**. Nenhuma mudança de produção é feita por este teste.",
        "",
        f"- Rodadas testadas: {len(testes)}",
        f"- Jogadores avaliados: {len(agregados)}",
        f"- MAE V1: {m1:.3f}",
        f"- MAE V2 candidata: {m2:.3f}",
        f"- Melhora de MAE: {ganho_mae:.2f}%",
        f"- Ganho médio Top 11: {ganho11:+.2f} pts/rodada",
        f"- Rodadas com MAE melhor: {taxa_vitoria:.1f}%",
        f"- Decisão: **{resultado['decisao']}**",
        "",
        "## Por posição",
        "",
        "|Posição|MAE V1|MAE V2|Ganho %|",
        "|---|---:|---:|---:|",
    ]
    for pos, r in pos_resumo.items():
        linhas.append(f"|{pos}|{r['maeV1']:.3f}|{r['maeV2']:.3f}|{r['ganhoPct']:+.2f}%|")
    linhas += ["", "## Gate experimental", ""]
    for nome, ok in gate.items():
        linhas.append(f"- {'✅' if ok else '❌'} {nome}")
    REPORT.write_text("\n".join(linhas) + "\n", encoding="utf-8")

    print(json.dumps(resultado["resumo"], ensure_ascii=False, indent=2))
    print("DECISAO:", resultado["decisao"])


if __name__ == "__main__":
    executar()
