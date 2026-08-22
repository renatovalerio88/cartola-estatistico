#!/usr/bin/env python3
"""Backtest Progressivo V2 do Cartola Estatístico.

Objetivos:
- walk-forward verdadeiro: rodada N usa somente dados de rodadas < N;
- V1 congelada como baseline;
- testar uma família de calibradores conservadores sem alterar produção;
- escolher o desafiante de cada rodada apenas pelo histórico já conhecido;
- medir erro, ranking, escalação válida, treinador e capitão;
- aplicar gate robusto antes de qualquer promoção.
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
MIN_HISTORICO_ESCOLHA = 3

FORMACOES = {
    "4-3-3": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 3, "ATA": 3},
    "4-4-2": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 4, "ATA": 2},
    "3-4-3": {"GOL": 1, "LAT": 2, "ZAG": 1, "MEI": 4, "ATA": 3},
    "3-5-2": {"GOL": 1, "LAT": 2, "ZAG": 1, "MEI": 5, "ATA": 2},
    "5-3-2": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 3, "ATA": 2},
    "4-5-1": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 5, "ATA": 1},
    "5-4-1": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 4, "ATA": 1},
}

# Configurações fixas e conservadoras. Nenhuma é escolhida olhando o futuro.
CANDIDATOS = {
    "pos_shrink_15_all": {"tipo": "pos", "shrink": 0.15, "janela": None},
    "pos_shrink_30_all": {"tipo": "pos", "shrink": 0.30, "janela": None},
    "pos_shrink_45_all": {"tipo": "pos", "shrink": 0.45, "janela": None},
    "pos_shrink_30_10r": {"tipo": "pos", "shrink": 0.30, "janela": 10},
    "pos_shrink_45_10r": {"tipo": "pos", "shrink": 0.45, "janela": 10},
    "pos_shrink_30_5r": {"tipo": "pos", "shrink": 0.30, "janela": 5},
    "bias_pos_all": {"tipo": "bias", "shrink": 0.35, "janela": None},
    "bias_pos_10r": {"tipo": "bias", "shrink": 0.35, "janela": 10},
    "global_shrink_30": {"tipo": "global", "shrink": 0.30, "janela": None},
}


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def arred(v, n=3):
    return None if v is None else round(v, n)


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
            jogadores.append({
                "id": j.get("id"),
                "posicao": pos,
                "projecao": p,
                "real": r,
            })
        if len(jogadores) < 20:
            continue
        nao_zero = sum(abs(j["real"]) > 1e-9 for j in jogadores)
        if nao_zero / len(jogadores) < 0.10:
            continue
        rodadas.append((n, jogadores))
    return sorted(rodadas)


def limitar_treino(treino, janela):
    if janela is None:
        return treino
    return treino[-janela:]


def pares_treino(treino):
    por_pos = defaultdict(list)
    global_ = []
    for _, js in treino:
        for j in js:
            par = (j["projecao"], j["real"])
            por_pos[j["posicao"]].append(par)
            global_.append(par)
    return por_pos, global_


def fit_linear(pares, shrink):
    """y=a+b*x; slope sofre shrinkage em direção a 1 para reduzir overfit."""
    if len(pares) < 30:
        return 0.0, 1.0
    xs = [x for x, _ in pares]
    ys = [y for _, y in pares]
    mx, my = mean(xs), mean(ys)
    var = sum((x - mx) ** 2 for x in xs)
    if var <= 1e-9:
        return max(-2.5, min(2.5, my - mx)), 1.0
    cov = sum((x - mx) * (y - my) for x, y in pares)
    slope_ols = max(0.35, min(1.75, cov / var))
    b = (1.0 - shrink) + shrink * slope_ols
    a = max(-2.5, min(2.5, my - b * mx))
    return a, b


def fit_bias(pares, shrink):
    if len(pares) < 20:
        return 0.0, 1.0
    erro_medio = mean(y - x for x, y in pares)
    a = max(-2.0, min(2.0, erro_medio * shrink))
    return a, 1.0


def calibradores(treino, cfg):
    treino = limitar_treino(treino, cfg.get("janela"))
    por_pos, global_ = pares_treino(treino)
    shrink = cfg["shrink"]
    tipo = cfg["tipo"]

    if tipo == "bias":
        ag, bg = fit_bias(global_, shrink)
    else:
        ag, bg = fit_linear(global_, shrink)

    result = {"GLOBAL": (ag, bg)}
    for pos in POSICOES:
        pares = por_pos[pos]
        if tipo == "global":
            result[pos] = (ag, bg)
        elif tipo == "bias":
            result[pos] = fit_bias(pares, shrink) if len(pares) >= 20 else (ag, bg)
        else:
            result[pos] = fit_linear(pares, shrink) if len(pares) >= 30 else (ag, bg)
    return result


def aplicar(rows, cal, chave):
    saida = []
    for j in rows:
        a, b = cal[j["posicao"]]
        saida.append({**j, chave: a + b * j["projecao"]})
    return saida


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


def selecionar_escalacao(rows, key):
    """Seleciona a formação válida com maior soma prevista; retorna XI e treinador."""
    por_pos = {p: sorted([r for r in rows if r["posicao"] == p], key=lambda z: z[key], reverse=True) for p in POSICOES}
    melhores = []
    for formacao, req in FORMACOES.items():
        escolhidos = []
        valido = True
        for pos, qtd in req.items():
            if len(por_pos[pos]) < qtd:
                valido = False
                break
            escolhidos.extend(por_pos[pos][:qtd])
        if valido:
            previsto = sum(x[key] for x in escolhidos)
            melhores.append((previsto, formacao, escolhidos))
    if not melhores:
        return None
    _, formacao, xi = max(melhores, key=lambda x: x[0])
    tecnico = por_pos["TEC"][0] if por_pos["TEC"] else None
    capitao = max(xi, key=lambda z: z[key]) if xi else None
    return {
        "formacao": formacao,
        "xi": xi,
        "tecnico": tecnico,
        "capitao": capitao,
        "realXI": sum(x["real"] for x in xi),
        "realTecnico": tecnico["real"] if tecnico else 0.0,
        "realCapitaoBonus": capitao["real"] if capitao else 0.0,
        "realTotalComCapitao": sum(x["real"] for x in xi) + (tecnico["real"] if tecnico else 0.0) + (capitao["real"] if capitao else 0.0),
    }


def metricas_modelo(rows, key):
    esc = selecionar_escalacao(rows, key)
    return {
        "mae": mae(rows, key),
        "rmse": rmse(rows, key),
        "corr": corr(rows, key),
        "top5": top_real(rows, key, 5),
        "top11Livre": top_real(rows, key, 11),
        "escalacao": esc,
    }


def score_historico(resultados):
    """Score usado para escolher o candidato da próxima rodada usando apenas passado."""
    if not resultados:
        return -1e9
    # Prioridade para pontuação real do time; MAE funciona como desempate/estabilidade.
    ganho_time = mean(r["ganhoTime"] for r in resultados)
    ganho_xi = mean(r["ganhoXI"] for r in resultados)
    ganho_mae = mean(r["ganhoMaePct"] for r in resultados)
    vitorias_time = 100 * sum(r["ganhoTime"] > 0 for r in resultados) / len(resultados)
    return ganho_time * 4.0 + ganho_xi * 1.5 + ganho_mae * 0.20 + vitorias_time * 0.02


def escolher_candidato(historico_candidatos):
    elegiveis = {k: v for k, v in historico_candidatos.items() if len(v) >= MIN_HISTORICO_ESCOLHA}
    if not elegiveis:
        return "pos_shrink_30_all"
    return max(elegiveis, key=lambda nome: score_historico(elegiveis[nome]))


def comparar_rodada(rows_base, rows_cand, key_cand):
    b = metricas_modelo(rows_base, "v1")
    c = metricas_modelo(rows_cand, key_cand)
    eb, ec = b["escalacao"], c["escalacao"]
    m1, m2 = b["mae"], c["mae"]
    return {
        "maeV1": m1,
        "maeV2": m2,
        "ganhoMaePct": (m1 - m2) / m1 * 100 if m1 else 0.0,
        "rmseV1": b["rmse"],
        "rmseV2": c["rmse"],
        "corrV1": b["corr"],
        "corrV2": c["corr"],
        "top5V1": b["top5"],
        "top5V2": c["top5"],
        "top11LivreV1": b["top11Livre"],
        "top11LivreV2": c["top11Livre"],
        "formacaoV1": eb["formacao"] if eb else None,
        "formacaoV2": ec["formacao"] if ec else None,
        "realXIV1": eb["realXI"] if eb else 0.0,
        "realXIV2": ec["realXI"] if ec else 0.0,
        "ganhoXI": (ec["realXI"] - eb["realXI"]) if eb and ec else 0.0,
        "realTimeV1": eb["realTotalComCapitao"] if eb else 0.0,
        "realTimeV2": ec["realTotalComCapitao"] if ec else 0.0,
        "ganhoTime": (ec["realTotalComCapitao"] - eb["realTotalComCapitao"]) if eb and ec else 0.0,
        "capitaoRealV1": eb["capitao"]["real"] if eb and eb["capitao"] else 0.0,
        "capitaoRealV2": ec["capitao"]["real"] if ec and ec["capitao"] else 0.0,
        "ganhoCapitao": ((ec["capitao"]["real"] if ec and ec["capitao"] else 0.0) - (eb["capitao"]["real"] if eb and eb["capitao"] else 0.0)),
    }


def executar():
    rodadas = carregar_rodadas()
    testes = []
    agregados = []
    historico_candidatos = defaultdict(list)
    uso_candidatos = defaultdict(int)

    for idx in range(MIN_TREINO, len(rodadas)):
        alvo_n, alvo_js = rodadas[idx]
        treino = rodadas[:idx]
        rows_base = [{**j, "v1": j["projecao"]} for j in alvo_js]

        rodada_por_candidato = {}
        previsoes_por_candidato = {}
        calibradores_por_candidato = {}

        for nome, cfg in CANDIDATOS.items():
            cal = calibradores(treino, cfg)
            chave = f"cand_{nome}"
            rows_cand = aplicar(rows_base, cal, chave)
            comp = comparar_rodada(rows_base, rows_cand, chave)
            rodada_por_candidato[nome] = comp
            previsoes_por_candidato[nome] = rows_cand
            calibradores_por_candidato[nome] = cal

        # A escolha ocorre ANTES de adicionar os resultados da rodada corrente ao histórico.
        escolhido = escolher_candidato(historico_candidatos)
        uso_candidatos[escolhido] += 1
        comp = rodada_por_candidato[escolhido]
        rows_escolhido = previsoes_por_candidato[escolhido]
        chave_escolhido = f"cand_{escolhido}"

        posicoes = {}
        for pos in POSICOES:
            rp = [r for r in rows_escolhido if r["posicao"] == pos]
            if not rp:
                continue
            p1, p2 = mae(rp, "v1"), mae(rp, chave_escolhido)
            posicoes[pos] = {
                "n": len(rp),
                "maeV1": arred(p1),
                "maeV2": arred(p2),
                "ganhoPct": arred((p1 - p2) / p1 * 100 if p1 else 0, 2),
            }

        testes.append({
            "rodada": alvo_n,
            "treinoAte": rodadas[idx - 1][0],
            "n": len(rows_escolhido),
            "candidatoEscolhidoSemFuturo": escolhido,
            "maeV1": arred(comp["maeV1"]),
            "maeV2": arred(comp["maeV2"]),
            "ganhoMaePct": arred(comp["ganhoMaePct"], 2),
            "rmseV1": arred(comp["rmseV1"]),
            "rmseV2": arred(comp["rmseV2"]),
            "correlacaoV1": arred(comp["corrV1"]),
            "correlacaoV2": arred(comp["corrV2"]),
            "top5RealV1": arred(comp["top5V1"], 2),
            "top5RealV2": arred(comp["top5V2"], 2),
            "top11LivreV1": arred(comp["top11LivreV1"], 2),
            "top11LivreV2": arred(comp["top11LivreV2"], 2),
            "formacaoV1": comp["formacaoV1"],
            "formacaoV2": comp["formacaoV2"],
            "realXIV1": arred(comp["realXIV1"], 2),
            "realXIV2": arred(comp["realXIV2"], 2),
            "ganhoXI": arred(comp["ganhoXI"], 2),
            "realTimeComCapitaoV1": arred(comp["realTimeV1"], 2),
            "realTimeComCapitaoV2": arred(comp["realTimeV2"], 2),
            "ganhoTime": arred(comp["ganhoTime"], 2),
            "capitaoRealV1": arred(comp["capitaoRealV1"], 2),
            "capitaoRealV2": arred(comp["capitaoRealV2"], 2),
            "ganhoCapitao": arred(comp["ganhoCapitao"], 2),
            "posicoes": posicoes,
            "placarCandidatosAntesDaRodada": {
                nome: arred(score_historico(hist), 3) if hist else None
                for nome, hist in historico_candidatos.items()
            },
        })

        # Só agora a rodada corrente pode alimentar a escolha das futuras.
        for nome, r in rodada_por_candidato.items():
            historico_candidatos[nome].append(r)

        agregados.extend([
            {**r, "v2": r[chave_escolhido]}
            for r in rows_escolhido
        ])

    if not testes:
        raise SystemExit("Sem rodadas suficientes para backtest walk-forward")

    m1, m2 = mae(agregados, "v1"), mae(agregados, "v2")
    ganho_mae = (m1 - m2) / m1 * 100 if m1 else 0.0
    ganhos_xi = [x["ganhoXI"] for x in testes]
    ganhos_time = [x["ganhoTime"] for x in testes]
    ganhos_cap = [x["ganhoCapitao"] for x in testes]
    vitorias_mae = 100 * sum(x["maeV2"] < x["maeV1"] for x in testes) / len(testes)
    vitorias_time = 100 * sum(x["ganhoTime"] > 0 for x in testes) / len(testes)
    empates_time = 100 * sum(abs(x["ganhoTime"]) < 1e-9 for x in testes) / len(testes)

    pos_resumo = {}
    piora_max = 0.0
    for pos in POSICOES:
        rp = [r for r in agregados if r["posicao"] == pos]
        if not rp:
            continue
        p1, p2 = mae(rp, "v1"), mae(rp, "v2")
        delta = (p1 - p2) / p1 * 100 if p1 else 0
        piora_max = max(piora_max, -delta)
        pos_resumo[pos] = {
            "n": len(rp),
            "maeV1": arred(p1),
            "maeV2": arred(p2),
            "ganhoPct": arred(delta, 2),
        }

    ranking_candidatos = []
    for nome, hist in historico_candidatos.items():
        ranking_candidatos.append({
            "modelo": nome,
            "scoreHistorico": arred(score_historico(hist), 3),
            "ganhoTimeMedio": arred(mean(x["ganhoTime"] for x in hist), 2),
            "ganhoXIMedio": arred(mean(x["ganhoXI"] for x in hist), 2),
            "ganhoMaePctMedio": arred(mean(x["ganhoMaePct"] for x in hist), 2),
            "taxaVitoriaTimePct": arred(100 * sum(x["ganhoTime"] > 0 for x in hist) / len(hist), 1),
        })
    ranking_candidatos.sort(key=lambda x: x["scoreHistorico"], reverse=True)

    ganho_time_medio = mean(ganhos_time)
    ganho_xi_medio = mean(ganhos_xi)
    ganho_cap_medio = mean(ganhos_cap)

    # Gate deliberadamente exigente: precisão e decisão de escalação precisam melhorar juntas.
    gate = {
        "maeMelhoraMin1pct": ganho_mae >= 1.0,
        "timeComCapitaoGanhoMedioMin1pt": ganho_time_medio >= 1.0,
        "xiGanhoMedioNaoNegativo": ganho_xi_medio >= 0.0,
        "vitoriasTimeMin40pct": vitorias_time >= 40.0,
        "vitoriasOuEmpatesTimeMin70pct": (vitorias_time + empates_time) >= 70.0,
        "nenhumaPosicaoPioraMais3pct": piora_max <= 3.0,
    }
    passou = all(gate.values())

    resultado = {
        "modelo": "backtest_progressivo_v2",
        "versaoExperimento": 2,
        "baseline": "V1 congelada em main antes deste experimento",
        "metodo": "walk-forward com torneio adaptativo: rodada N usa apenas rodadas < N para calibrar e para escolher o desafiante",
        "observacao": "Nenhum candidato altera produção automaticamente.",
        "formacoesTestadas": list(FORMACOES),
        "candidatos": CANDIDATOS,
        "rodadasDisponiveisFechadas": [n for n, _ in rodadas],
        "rodadasTestadas": [x["rodada"] for x in testes],
        "resumo": {
            "nJogadores": len(agregados),
            "nRodadas": len(testes),
            "maeV1": arred(m1),
            "maeV2": arred(m2),
            "ganhoMaePct": arred(ganho_mae, 2),
            "ganhoXIMedio": arred(ganho_xi_medio, 2),
            "medianaGanhoXI": arred(median(ganhos_xi), 2),
            "ganhoTimeComCapitaoMedio": arred(ganho_time_medio, 2),
            "medianaGanhoTimeComCapitao": arred(median(ganhos_time), 2),
            "ganhoCapitaoMedio": arred(ganho_cap_medio, 2),
            "taxaRodadasV2MelhorMaePct": arred(vitorias_mae, 1),
            "taxaVitoriaTimePct": arred(vitorias_time, 1),
            "taxaEmpateTimePct": arred(empates_time, 1),
            "usoCandidatos": dict(uso_candidatos),
            "porPosicao": pos_resumo,
        },
        "rankingCandidatosExperimental": ranking_candidatos,
        "gatePromocao": gate,
        "decisao": "CANDIDATO_APTO_PARA_PROXIMO_TESTE" if passou else "MANTER_V1",
        "rodadas": testes,
    }
    OUT.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")

    linhas = [
        "# Backtest Progressivo V2 — torneio adaptativo",
        "",
        "Baseline: **V1 congelada**. Nenhuma mudança de produção é feita por este teste.",
        "",
        f"- Rodadas testadas: {len(testes)}",
        f"- Jogadores avaliados: {len(agregados)}",
        f"- MAE V1: {m1:.3f}",
        f"- MAE V2 adaptativa: {m2:.3f}",
        f"- Melhora de MAE: {ganho_mae:.2f}%",
        f"- Ganho médio XI válido: {ganho_xi_medio:+.2f} pts/rodada",
        f"- Ganho médio time + treinador + capitão: {ganho_time_medio:+.2f} pts/rodada",
        f"- Ganho médio do capitão: {ganho_cap_medio:+.2f} pts/rodada",
        f"- Vitórias do time: {vitorias_time:.1f}%",
        f"- Empates do time: {empates_time:.1f}%",
        f"- Decisão: **{resultado['decisao']}**",
        "",
        "## Ranking experimental dos candidatos",
        "",
        "|Modelo|Ganho time|Ganho XI|Ganho MAE|Vitórias time|Score|",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for r in ranking_candidatos:
        linhas.append(f"|{r['modelo']}|{r['ganhoTimeMedio']:+.2f}|{r['ganhoXIMedio']:+.2f}|{r['ganhoMaePctMedio']:+.2f}%|{r['taxaVitoriaTimePct']:.1f}%|{r['scoreHistorico']:.3f}|")
    linhas += ["", "## Por posição", "", "|Posição|MAE V1|MAE V2|Ganho %|", "|---|---:|---:|---:|"]
    for pos, r in pos_resumo.items():
        linhas.append(f"|{pos}|{r['maeV1']:.3f}|{r['maeV2']:.3f}|{r['ganhoPct']:+.2f}%|")
    linhas += ["", "## Gate experimental", ""]
    for nome, ok in gate.items():
        linhas.append(f"- {'✅' if ok else '❌'} {nome}")
    REPORT.write_text("\n".join(linhas) + "\n", encoding="utf-8")

    print(json.dumps(resultado["resumo"], ensure_ascii=False, indent=2))
    print("TOP_CANDIDATOS:")
    print(json.dumps(ranking_candidatos[:5], ensure_ascii=False, indent=2))
    print("DECISAO:", resultado["decisao"])


if __name__ == "__main__":
    executar()
