#!/usr/bin/env python3
"""Auditoria de elegibilidade Cartola para o histórico R1-R23.

Objetivos:
- reconstruir, por rodada, os clubes elegíveis a partir de partidas.json (valida=true);
- mapear atleta -> clubeId pelo snapshot data/api/rodada-XX/jogadores.json;
- verificar se data/historico/rodada-XX.json contém atletas de clubes sem jogo válido;
- medir impacto nas métricas de projeção e na seleção ingênua usada pelo backtest legado;
- excluir explicitamente R24 de qualquer ajuste retrospectivo.

O script é diagnóstico: contaminação encontrada NÃO quebra o workflow. Falha somente
quando a base é estruturalmente insuficiente para realizar a auditoria.
"""
from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean

BASE = Path(__file__).resolve().parent.parent
API = BASE / "data" / "api"
HIST = BASE / "data" / "historico"
OUT_JSON = BASE / "data" / "auditoria-elegibilidade-cartola-v21.json"
OUT_MD = BASE / "data" / "auditoria-elegibilidade-cartola-v21.md"
RODADAS = range(1, 24)  # R24 deliberadamente fora do ajuste retrospectivo
POSICOES = ("GOL", "LAT", "ZAG", "MEI", "ATA", "TEC")
FORMACOES = {
    "4-3-3": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 3, "ATA": 3},
    "4-4-2": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 4, "ATA": 2},
    "3-4-3": {"GOL": 1, "LAT": 2, "ZAG": 1, "MEI": 4, "ATA": 3},
    "3-5-2": {"GOL": 1, "LAT": 2, "ZAG": 1, "MEI": 5, "ATA": 2},
    "5-3-2": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 3, "ATA": 2},
    "4-5-1": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 5, "ATA": 1},
    "5-4-1": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 4, "ATA": 1},
}


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def pearson(rows):
    if len(rows) < 3:
        return None
    xs = [r["projecao"] for r in rows]
    ys = [r["real"] for r in rows]
    mx, my = mean(xs), mean(ys)
    vx = sum((x - mx) ** 2 for x in xs)
    vy = sum((y - my) ** 2 for y in ys)
    if vx <= 1e-12 or vy <= 1e-12:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / math.sqrt(vx * vy)


def metricas(rows):
    if not rows:
        return {"n": 0, "mae": None, "rmse": None, "corr": None, "top5Real": None, "top11Real": None}
    erros = [r["projecao"] - r["real"] for r in rows]
    ordem = sorted(rows, key=lambda r: r["projecao"], reverse=True)
    return {
        "n": len(rows),
        "mae": round(mean(abs(e) for e in erros), 4),
        "rmse": round(math.sqrt(mean(e * e for e in erros)), 4),
        "corr": None if pearson(rows) is None else round(pearson(rows), 4),
        "top5Real": round(sum(r["real"] for r in ordem[:5]), 2),
        "top11Real": round(sum(r["real"] for r in ordem[:11]), 2),
    }


def selecionar_xi(rows):
    """Replica de forma deliberadamente simples a seleção por projeção do backtest legado."""
    por_pos = {p: sorted([r for r in rows if r["posicao"] == p], key=lambda x: x["projecao"], reverse=True) for p in POSICOES}
    candidatos = []
    for nome, req in FORMACOES.items():
        xi = []
        ok = True
        for pos, qtd in req.items():
            if len(por_pos[pos]) < qtd:
                ok = False
                break
            xi.extend(por_pos[pos][:qtd])
        if ok:
            candidatos.append((sum(x["projecao"] for x in xi), nome, xi))
    if not candidatos:
        return None
    previsto, formacao, xi = max(candidatos, key=lambda t: t[0])
    tec = por_pos["TEC"][0] if por_pos["TEC"] else None
    return {
        "formacao": formacao,
        "projetadoXI": round(previsto, 2),
        "realXI": round(sum(x["real"] for x in xi), 2),
        "idsXI": [x["id"] for x in xi],
        "ineligiveisXI": [x["id"] for x in xi if not x["elegivel"]],
        "tecnicoId": tec["id"] if tec else None,
        "tecnicoElegivel": bool(tec and tec["elegivel"]),
    }


def clubes_elegiveis(partidas):
    ids = set()
    validas = []
    for p in partidas.get("partidas", []):
        if p.get("valida") is not True:
            continue
        casa = p.get("clube_casa_id")
        fora = p.get("clube_visitante_id")
        if casa is not None:
            ids.add(int(casa))
        if fora is not None:
            ids.add(int(fora))
        validas.append(p)
    return ids, validas


def auditar_rodada(n):
    d = API / f"rodada-{n:02d}"
    p_part = d / "partidas.json"
    p_jog = d / "jogadores.json"
    p_hist = HIST / f"rodada-{n:02d}.json"
    if not (p_part.exists() and p_jog.exists() and p_hist.exists()):
        return {"rodada": n, "auditavel": False, "faltando": [str(p.relative_to(BASE)) for p in (p_part, p_jog, p_hist) if not p.exists()]}

    partidas = load(p_part)
    jogadores_api = load(p_jog)
    hist = load(p_hist)
    elegiveis, validas = clubes_elegiveis(partidas)
    atleta_clube = {int(j["id"]): int(j["clubeId"]) for j in jogadores_api if j.get("id") is not None and j.get("clubeId") is not None}
    atleta_meta = {int(j["id"]): j for j in jogadores_api if j.get("id") is not None}

    rows = []
    sem_mapeamento = []
    for j in hist.get("jogadores", []):
        aid = j.get("id")
        pos = str(j.get("posicao") or "").upper()
        proj = num(j.get("projecao"))
        real = num(j.get("real"))
        if aid is None or proj is None or real is None or pos not in POSICOES:
            continue
        aid = int(aid)
        clube = atleta_clube.get(aid)
        if clube is None:
            sem_mapeamento.append(aid)
            continue
        meta = atleta_meta.get(aid, {})
        rows.append({
            "id": aid,
            "apelido": meta.get("apelido"),
            "posicao": pos,
            "clubeId": clube,
            "projecao": proj,
            "real": real,
            "entrouEmCampo": meta.get("entrouEmCampo"),
            "elegivel": clube in elegiveis,
        })

    ineligiveis = [r for r in rows if not r["elegivel"]]
    eleg = [r for r in rows if r["elegivel"]]
    sel_todos = selecionar_xi(rows)
    sel_eleg = selecionar_xi(eleg)
    por_clube = Counter(r["clubeId"] for r in ineligiveis)
    por_pos = Counter(r["posicao"] for r in ineligiveis)

    return {
        "rodada": n,
        "auditavel": True,
        "partidasValidas": len(validas),
        "clubesElegiveis": len(elegiveis),
        "jogadoresMapeados": len(rows),
        "semMapeamento": len(set(sem_mapeamento)),
        "ineligiveis": len(ineligiveis),
        "pctIneligiveis": round(100 * len(ineligiveis) / len(rows), 3) if rows else None,
        "ineligiveisPorPosicao": dict(sorted(por_pos.items())),
        "ineligiveisPorClube": {str(k): v for k, v in por_clube.most_common()},
        "amostraIneligiveis": [
            {k: r[k] for k in ("id", "apelido", "posicao", "clubeId", "projecao", "real", "entrouEmCampo")}
            for r in sorted(ineligiveis, key=lambda x: x["projecao"], reverse=True)[:12]
        ],
        "metricasTodos": metricas(rows),
        "metricasSomenteElegiveis": metricas(eleg),
        "selecaoLegadaTodos": sel_todos,
        "selecaoSomenteElegiveis": sel_eleg,
    }


def main():
    rodadas = [auditar_rodada(n) for n in RODADAS]
    auditaveis = [r for r in rodadas if r.get("auditavel")]
    if len(auditaveis) < 20:
        raise SystemExit(f"Base insuficiente: apenas {len(auditaveis)}/23 rodadas auditáveis")

    total_rows = sum(r["jogadoresMapeados"] for r in auditaveis)
    total_inel = sum(r["ineligiveis"] for r in auditaveis)
    rodadas_cont = [r for r in auditaveis if r["ineligiveis"] > 0]
    xi_cont = [r for r in auditaveis if r["selecaoLegadaTodos"] and r["selecaoLegadaTodos"]["ineligiveisXI"]]
    delta_real_xi = []
    for r in auditaveis:
        a, b = r["selecaoLegadaTodos"], r["selecaoSomenteElegiveis"]
        if a and b:
            delta_real_xi.append(b["realXI"] - a["realXI"])

    resumo = {
        "escopo": "R1-R23",
        "r24Excluida": True,
        "rodadasAuditaveis": len(auditaveis),
        "linhasMapeadas": total_rows,
        "linhasIneligiveis": total_inel,
        "pctLinhasIneligiveis": round(100 * total_inel / total_rows, 4) if total_rows else None,
        "rodadasComContaminacao": len(rodadas_cont),
        "rodadasXIContaminado": len(xi_cont),
        "deltaMedioRealXI_AposFiltro": round(mean(delta_real_xi), 3) if delta_real_xi else None,
        "decisao": "REPROCESSAR_BACKTEST_COM_GATE_ELEGIBILIDADE" if total_inel or xi_cont else "HISTORICO_SEM_CONTAMINACAO_DE_ELEGIBILIDADE",
    }
    payload = {"resumo": resumo, "rodadas": rodadas}
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    linhas = [
        "# Auditoria de elegibilidade Cartola — V2.1",
        "",
        "Escopo estrito: **R1–R23**. A R24 permanece excluída de ajuste retrospectivo.",
        "",
        "## Resumo",
        "",
        f"- Rodadas auditáveis: **{resumo['rodadasAuditaveis']}/23**",
        f"- Linhas históricas mapeadas: **{resumo['linhasMapeadas']}**",
        f"- Linhas de atletas sem partida válida: **{resumo['linhasIneligiveis']} ({resumo['pctLinhasIneligiveis']}%)**",
        f"- Rodadas com alguma contaminação: **{resumo['rodadasComContaminacao']}**",
        f"- Rodadas em que o XI legado selecionou atleta inelegível: **{resumo['rodadasXIContaminado']}**",
        f"- Delta médio do XI real ao filtrar elegibilidade: **{resumo['deltaMedioRealXI_AposFiltro']} pts**",
        f"- Decisão: **{resumo['decisao']}**",
        "",
        "## Por rodada",
        "",
        "| Rodada | Jogos válidos | Linhas | Inelegíveis | XI contaminado | MAE todos | MAE elegíveis |",
        "|---:|---:|---:|---:|:---:|---:|---:|",
    ]
    for r in rodadas:
        if not r.get("auditavel"):
            linhas.append(f"| R{r['rodada']} | — | — | — | — | — | — |")
            continue
        xi_bad = bool(r["selecaoLegadaTodos"] and r["selecaoLegadaTodos"]["ineligiveisXI"])
        linhas.append(
            f"| R{r['rodada']} | {r['partidasValidas']} | {r['jogadoresMapeados']} | {r['ineligiveis']} | {'SIM' if xi_bad else 'não'} | "
            f"{r['metricasTodos']['mae']} | {r['metricasSomenteElegiveis']['mae']} |"
        )
    linhas += [
        "",
        "## Interpretação",
        "",
        "O universo de seleção deve nascer das partidas marcadas como `valida=true` no snapshot oficial do Cartola. "
        "Atletas de clubes fora desse conjunto não podem participar de ranking, recomendações, capitão, banco ou escalação.",
        "",
        "Este relatório é diagnóstico e não promove modelo. Se houver contaminação, os backtests candidatos devem ser reexecutados "
        "com o mesmo gate de elegibilidade antes de qualquer decisão V2.1.",
    ]
    OUT_MD.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
