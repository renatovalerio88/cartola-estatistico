#!/usr/bin/env python3
"""V2.1: meta-seletor walk-forward de regime para contexto/explosão/capitão.

Consome o experimento de seleção já calculado em walk-forward e decide, em cada
rodada, qual estratégia usar olhando SOMENTE resultados de rodadas anteriores.
Não altera produção e exclui explicitamente R24.
"""
from __future__ import annotations

import json
from pathlib import Path
from statistics import mean
from typing import Callable

BASE = Path(__file__).resolve().parent.parent
INP = BASE / "data" / "modelagem" / "experimento_v21_selecao_capitao.json"
OUT = BASE / "data" / "modelagem" / "experimento_v21_regime_contexto.json"
OUT_MD = BASE / "data" / "modelagem" / "experimento_v21_regime_contexto.md"

ESTRATEGIAS = {
    "base": "pontosBase",
    "contexto": "pontosContexto",
    "explosao": "pontosExplosao",
    "final": "pontosExplosaoCapitaoContextual",
}
MIN_HIST = 3


def ler(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def media(xs):
    return mean(xs) if xs else 0.0


def pontos(r, estrategia):
    return float(r[ESTRATEGIAS[estrategia]])


def historico(anteriores, estrategia, janela=None):
    dados = anteriores[-janela:] if janela else anteriores
    return [pontos(r, estrategia) for r in dados]


def ganhos(anteriores, estrategia, janela=None):
    dados = anteriores[-janela:] if janela else anteriores
    return [pontos(r, estrategia) - pontos(r, "base") for r in dados]


def champion(anteriores, janela=None):
    if len(anteriores) < MIN_HIST:
        return "base"
    return max(ESTRATEGIAS, key=lambda e: media(historico(anteriores, e, janela)))


def ewma_score(anteriores, estrategia, alpha=0.5):
    vals = historico(anteriores, estrategia)
    if not vals:
        return 0.0
    s = vals[0]
    for v in vals[1:]:
        s = alpha * v + (1-alpha) * s
    return s


def ewma_champion(anteriores):
    if len(anteriores) < MIN_HIST:
        return "base"
    return max(ESTRATEGIAS, key=lambda e: ewma_score(anteriores, e, 0.5))


def gate_contexto(anteriores, janela=5):
    if len(anteriores) < MIN_HIST:
        return "base"
    gs = ganhos(anteriores, "contexto", janela)
    wins = sum(g > 0 for g in gs)
    taxa = wins / len(gs) if gs else 0.0
    return "contexto" if media(gs) > 1.5 and taxa >= 0.60 else "base"


def gate_final(anteriores, janela=5):
    if len(anteriores) < MIN_HIST:
        return "base"
    candidatos = []
    for e in ("contexto", "explosao", "final"):
        gs = ganhos(anteriores, e, janela)
        taxa = sum(g > 0 for g in gs) / len(gs) if gs else 0.0
        if media(gs) > 1.0 and taxa >= 0.60:
            candidatos.append((media(gs), e))
    return max(candidatos)[1] if candidatos else "base"


POLITICAS: dict[str, Callable] = {
    "champion_cumulativo": lambda h: champion(h, None),
    "champion_3r": lambda h: champion(h, 3),
    "champion_5r": lambda h: champion(h, 5),
    "champion_8r": lambda h: champion(h, 8),
    "champion_ewma": ewma_champion,
    "gate_contexto_5r": gate_contexto,
    "gate_multimodelo_5r": gate_final,
}


def avaliar(rodadas, fn):
    usados = []
    pts = []
    ganhos_base = []
    for i, r in enumerate(rodadas):
        ant = rodadas[:i]
        e = fn(ant)
        p = pontos(r, e)
        b = pontos(r, "base")
        usados.append({"rodada": int(r["rodada"]), "estrategia": e, "pontos": round(p,2), "base": round(b,2), "ganho": round(p-b,2)})
        pts.append(p)
        ganhos_base.append(p-b)
    ult5 = ganhos_base[-5:] if len(ganhos_base) >= 5 else ganhos_base
    ult8 = ganhos_base[-8:] if len(ganhos_base) >= 8 else ganhos_base
    return {
        "media": round(media(pts),3),
        "ganhoMedioVsBase": round(media(ganhos_base),3),
        "vitoriasVsBase": sum(g > 0 for g in ganhos_base),
        "empatesVsBase": sum(abs(g) < 1e-9 for g in ganhos_base),
        "derrotasVsBase": sum(g < 0 for g in ganhos_base),
        "ganhoUltimas5": round(media(ult5),3),
        "ganhoUltimas8": round(media(ult8),3),
        "escolhas": usados,
    }


def main():
    d = ler(INP)
    assert d.get("walkForward") is True
    assert d.get("antiLeakage") is True
    assert d.get("r24Excluida") is True
    rodadas = sorted(d.get("porRodada", []), key=lambda x: int(x["rodada"]))
    rodadas = [r for r in rodadas if int(r["rodada"]) <= 23]
    assert len(rodadas) >= 15

    base_media = round(media([pontos(r, "base") for r in rodadas]),3)
    resultados = {nome: avaliar(rodadas, fn) for nome, fn in POLITICAS.items()}

    ranking = sorted(
        ({"politica": k, **{x:v for x,v in val.items() if x != "escolhas"}} for k,val in resultados.items()),
        key=lambda x: (x["ganhoMedioVsBase"], x["ganhoUltimas5"], x["ganhoUltimas8"]),
        reverse=True,
    )
    melhor = ranking[0]
    # Gate propositalmente exigente: ganho global, recente e maioria de vitórias.
    gates = {
        "antiLeakage": True,
        "r24Excluida": True,
        "ganhoGlobalPositivo": melhor["ganhoMedioVsBase"] > 1.0,
        "ganhoUltimas5NaoNegativo": melhor["ganhoUltimas5"] >= 0.0,
        "ganhoUltimas8Positivo": melhor["ganhoUltimas8"] > 0.0,
        "maioriaVitorias": melhor["vitoriasVsBase"] > melhor["derrotasVsBase"],
    }
    apto = all(gates.values())
    out = {
        "experimento": "v21_regime_contexto_adaptativo",
        "walkForward": True,
        "antiLeakage": True,
        "r24Excluida": True,
        "rodadasAvaliadas": len(rodadas),
        "mediaBase": base_media,
        "politicas": resultados,
        "ranking": ranking,
        "melhorPolitica": melhor["politica"],
        "gates": gates,
        "decisao": "CANDIDATO_REGIME_APTO_PARA_PROXIMO_GATE" if apto else "MANTER_V2_SEM_META_REGIME",
        "nota": "Escolha da estratégia em cada rodada usa exclusivamente resultados anteriores; nenhuma política usa R24.",
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    linhas = [
        "# Experimento V2.1 — regime adaptativo de contexto",
        "",
        f"- Rodadas: {len(rodadas)}",
        f"- Média base: {base_media:.3f}",
        f"- Melhor política: **{melhor['politica']}**",
        f"- Ganho médio vs base: **{melhor['ganhoMedioVsBase']:+.3f}**",
        f"- Ganho últimas 5: **{melhor['ganhoUltimas5']:+.3f}**",
        f"- Ganho últimas 8: **{melhor['ganhoUltimas8']:+.3f}**",
        f"- Decisão: **{out['decisao']}**",
        "",
        "## Ranking",
    ]
    for r in ranking:
        linhas.append(f"- {r['politica']}: {r['ganhoMedioVsBase']:+.3f} global | {r['ganhoUltimas5']:+.3f} 5r | {r['vitoriasVsBase']}V/{r['derrotasVsBase']}D")
    OUT_MD.write_text("\n".join(linhas)+"\n", encoding="utf-8")
    print(json.dumps({"melhor": melhor, "gates": gates, "decisao": out["decisao"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
