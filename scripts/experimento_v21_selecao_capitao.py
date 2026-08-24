#!/usr/bin/env python3
"""Experimento V2.1: seleção dos 11, formação dinâmica e capitão contextual.

Usa apenas R1-R23, com walk-forward real. O objetivo é testar se a camada de
contexto Poisson + probabilidade de explosão 10+ melhora a PONTUAÇÃO DO TIME,
não apenas o MAE individual.

Nenhuma alteração de produção é feita por este script.
"""
from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path
from statistics import mean, median
from typing import Any

import numpy as np

from experimento_v21_contexto_explosao import (
    FEATURES_BASE,
    FEATURES_POISSON,
    extrair_linhas,
    feature,
    ler,
    modelo_classificador,
    modelo_regressor,
    alvo,
    vetor,
)

BASE = Path(__file__).resolve().parent.parent
MATRIZ = BASE / "data" / "modelagem" / "matriz_features.json"
STATUS = BASE / "data" / "api" / "status.json"
OUT = BASE / "data" / "modelagem" / "experimento_v21_selecao_capitao.json"
OUT_MD = BASE / "data" / "modelagem" / "experimento_v21_selecao_capitao.md"

MIN_TREINO = 400
LIMITE_CLUBE = 3

FORMACOES = {
    "4-3-3": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 3, "ATA": 3},
    "4-4-2": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 4, "ATA": 2},
    "3-4-3": {"GOL": 1, "LAT": 0, "ZAG": 3, "MEI": 4, "ATA": 3},
    "3-5-2": {"GOL": 1, "LAT": 0, "ZAG": 3, "MEI": 5, "ATA": 2},
    "5-3-2": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 3, "ATA": 2},
    "4-5-1": {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 5, "ATA": 1},
    "5-4-1": {"GOL": 1, "LAT": 2, "ZAG": 3, "MEI": 4, "ATA": 1},
}


def clube(linha: dict[str, Any]) -> str:
    valor = linha.get("clubeId") or linha.get("clube") or "SEM_CLUBE"
    return str(valor)


def selecionar_formacao(
    linhas: list[dict[str, Any]],
    scores: list[float],
    formacao: dict[str, int],
) -> list[int] | None:
    """Seleção gulosa por posição respeitando máximo de 3 por clube."""
    escolhidos: list[int] = []
    clubes = Counter()
    por_pos: dict[str, list[int]] = {}
    for pos in formacao:
        indices = [
            i for i, l in enumerate(linhas)
            if str(l.get("posicao") or "").upper() == pos
        ]
        por_pos[pos] = sorted(indices, key=lambda i: scores[i], reverse=True)

    # Preenche posições mais escassas primeiro para reduzir bloqueios.
    ordem = sorted(formacao, key=lambda p: len(por_pos.get(p, [])))
    for pos in ordem:
        qtd = int(formacao[pos])
        if qtd <= 0:
            continue
        candidatos = por_pos.get(pos, [])
        for _ in range(qtd):
            escolhido = None
            for i in candidatos:
                if i in escolhidos:
                    continue
                c = clube(linhas[i])
                if c != "SEM_CLUBE" and clubes[c] >= LIMITE_CLUBE:
                    continue
                escolhido = i
                break
            if escolhido is None:
                return None
            escolhidos.append(escolhido)
            c = clube(linhas[escolhido])
            if c != "SEM_CLUBE":
                clubes[c] += 1
    return escolhidos


def selecionar_tecnico(linhas: list[dict[str, Any]], scores: list[float], escolhidos: list[int]) -> int | None:
    clubes = Counter(clube(linhas[i]) for i in escolhidos if clube(linhas[i]) != "SEM_CLUBE")
    candidatos = sorted(
        [i for i, l in enumerate(linhas) if str(l.get("posicao") or "").upper() == "TEC"],
        key=lambda i: scores[i], reverse=True,
    )
    for i in candidatos:
        c = clube(linhas[i])
        if c != "SEM_CLUBE" and clubes[c] >= LIMITE_CLUBE:
            continue
        return i
    return None


def melhor_time(
    linhas: list[dict[str, Any]],
    scores: list[float],
) -> tuple[list[int], str] | None:
    melhor = None
    for nome, f in FORMACOES.items():
        idx = selecionar_formacao(linhas, scores, f)
        if idx is None:
            continue
        tec = selecionar_tecnico(linhas, scores, idx)
        if tec is None:
            continue
        completo = idx + [tec]
        score = sum(scores[i] for i in completo)
        if melhor is None or score > melhor[0]:
            melhor = (score, completo, nome)
    if melhor is None:
        return None
    return melhor[1], melhor[2]


def pontos_time(linhas: list[dict[str, Any]], idx: list[int], capitao: int) -> float:
    base = sum(alvo(linhas[i]) for i in idx)
    bonus = alvo(linhas[capitao])
    return float(base + bonus)


def resumo(valores: list[float]) -> dict[str, float]:
    if not valores:
        return {"n": 0, "media": 0.0, "mediana": 0.0, "desvio": 0.0}
    arr = np.asarray(valores, dtype=float)
    return {
        "n": len(valores),
        "media": round(float(np.mean(arr)), 3),
        "mediana": round(float(np.median(arr)), 3),
        "desvio": round(float(np.std(arr)), 3),
    }


def main() -> None:
    status = ler(STATUS)
    rodada_atual = int(status.get("rodada_atual") or 24)
    corte = min(23, rodada_atual - 1)
    linhas = [
        l for l in extrair_linhas(ler(MATRIZ))
        if 2 <= int(l.get("rodada") or 999) <= corte
        and str(l.get("posicao") or "").upper() in {"GOL", "LAT", "ZAG", "MEI", "ATA", "TEC"}
    ]
    rodadas = sorted({int(l["rodada"]) for l in linhas})
    nomes_ctx = FEATURES_BASE + FEATURES_POISSON

    pontos_base: list[float] = []
    pontos_ctx: list[float] = []
    pontos_exp: list[float] = []
    pontos_exp_cap: list[float] = []
    rodada_resultados = []
    formacoes_base = Counter()
    formacoes_exp = Counter()

    for rodada in rodadas:
        treino = [l for l in linhas if int(l.get("rodada") or 999) < rodada]
        teste = [l for l in linhas if int(l.get("rodada") or -1) == rodada]
        if len(treino) < MIN_TREINO or len(teste) < 60:
            continue

        ytr = np.asarray([alvo(l) for l in treino], dtype=float)
        reg_base = modelo_regressor(1000 + rodada)
        reg_ctx = modelo_regressor(2000 + rodada)
        reg_base.fit(np.asarray([vetor(l, FEATURES_BASE) for l in treino], dtype=float), ytr)
        reg_ctx.fit(np.asarray([vetor(l, nomes_ctx) for l in treino], dtype=float), ytr)

        p_base = np.asarray(reg_base.predict(np.asarray([vetor(l, FEATURES_BASE) for l in teste], dtype=float)), dtype=float)
        p_ctx = np.asarray(reg_ctx.predict(np.asarray([vetor(l, nomes_ctx) for l in teste], dtype=float)), dtype=float)

        yexp = np.asarray([int(alvo(l, "explodiu10")) for l in treino], dtype=int)
        clf = modelo_classificador(3000 + rodada)
        clf.fit(np.asarray([vetor(l, nomes_ctx) for l in treino], dtype=float), yexp)
        p10 = np.asarray(clf.predict_proba(np.asarray([vetor(l, nomes_ctx) for l in teste], dtype=float))[:, 1], dtype=float)

        # Score de seleção: projeção média permanece dominante; explosão apenas desempata/eleva teto.
        prevalencia = max(0.01, float(yexp.mean()))
        p10_centrada = np.clip((p10 - prevalencia) / max(prevalencia, 0.05), -1.0, 2.0)
        score_exp = p_ctx + 0.85 * p10_centrada

        time_base = melhor_time(teste, p_base.tolist())
        time_ctx = melhor_time(teste, p_ctx.tolist())
        time_exp = melhor_time(teste, score_exp.tolist())
        if not time_base or not time_ctx or not time_exp:
            continue

        idx_base, f_base = time_base
        idx_ctx, f_ctx = time_ctx
        idx_exp, f_exp = time_exp

        cap_base = max(idx_base, key=lambda i: p_base[i])
        cap_ctx = max(idx_ctx, key=lambda i: p_ctx[i])
        cap_exp_projecao = max(idx_exp, key=lambda i: score_exp[i])

        # Capitão contextual: projeção + probabilidade de explosão + segurança contra baixa expectativa.
        cap_score = {
            i: 0.65 * p_ctx[i] + 3.0 * p10[i] + 0.15 * feature(teste[i], "piso20")
            for i in idx_exp
        }
        cap_exp_contextual = max(idx_exp, key=lambda i: cap_score[i])

        pb = pontos_time(teste, idx_base, cap_base)
        pc = pontos_time(teste, idx_ctx, cap_ctx)
        pe = pontos_time(teste, idx_exp, cap_exp_projecao)
        pec = pontos_time(teste, idx_exp, cap_exp_contextual)

        pontos_base.append(pb)
        pontos_ctx.append(pc)
        pontos_exp.append(pe)
        pontos_exp_cap.append(pec)
        formacoes_base[f_base] += 1
        formacoes_exp[f_exp] += 1

        rodada_resultados.append({
            "rodada": rodada,
            "formacaoBase": f_base,
            "formacaoExplosao": f_exp,
            "pontosBase": round(pb, 2),
            "pontosContexto": round(pc, 2),
            "pontosExplosao": round(pe, 2),
            "pontosExplosaoCapitaoContextual": round(pec, 2),
            "ganhoContextoVsBase": round(pc - pb, 2),
            "ganhoExplosaoVsBase": round(pe - pb, 2),
            "ganhoFinalVsBase": round(pec - pb, 2),
            "capitaoBaseReal": round(alvo(teste[cap_base]), 2),
            "capitaoContextualReal": round(alvo(teste[cap_exp_contextual]), 2),
        })

    if len(rodada_resultados) < 10:
        raise SystemExit(f"Poucas rodadas válidas: {len(rodada_resultados)}")

    ganhos_ctx = [c - b for c, b in zip(pontos_ctx, pontos_base)]
    ganhos_exp = [e - b for e, b in zip(pontos_exp, pontos_base)]
    ganhos_final = [e - b for e, b in zip(pontos_exp_cap, pontos_base)]

    v_ctx = sum(1 for x in ganhos_ctx if x > 0.01)
    v_exp = sum(1 for x in ganhos_exp if x > 0.01)
    v_final = sum(1 for x in ganhos_final if x > 0.01)
    n = len(rodada_resultados)

    # Janela recente para evitar promover algo que só funcionou no começo.
    ult5 = rodada_resultados[-5:]
    ganho_ult5 = mean(r["ganhoFinalVsBase"] for r in ult5)

    gates = {
        "antiLeakage": True,
        "r24Excluida": all(r["rodada"] <= 23 for r in rodada_resultados),
        "rodadasSuficientes": n >= 15,
        "ganhoMedioFinalPositivo": mean(ganhos_final) > 0.5,
        "vitoriasFinalMaioria": v_final > n / 2,
        "ultimas5NaoNegativas": ganho_ult5 >= 0,
    }

    decisao = "APTO_PARA_GATE_OPERACIONAL" if all(gates.values()) else "MANTER_SELECAO_V2_ATUAL"

    saida = {
        "experimento": "v21_selecao_formacao_capitao",
        "walkForward": True,
        "antiLeakage": True,
        "rodadaCorte": corte,
        "r24Excluida": True,
        "restricoes": {
            "formacoes": list(FORMACOES),
            "limiteClube": LIMITE_CLUBE,
            "tecnicoIncluido": True,
            "capitaoIncluido": True,
            "orcamentoHistorico": "não aplicado: preço histórico tem cobertura insuficiente na camada legada; gate operacional atual continua obrigatório",
        },
        "rodadasAvaliadas": n,
        "resumo": {
            "base": resumo(pontos_base),
            "contexto": resumo(pontos_ctx),
            "explosao": resumo(pontos_exp),
            "explosaoCapitaoContextual": resumo(pontos_exp_cap),
            "ganhoMedioContextoVsBase": round(mean(ganhos_ctx), 3),
            "ganhoMedioExplosaoVsBase": round(mean(ganhos_exp), 3),
            "ganhoMedioFinalVsBase": round(mean(ganhos_final), 3),
            "vitoriasContextoVsBase": v_ctx,
            "vitoriasExplosaoVsBase": v_exp,
            "vitoriasFinalVsBase": v_final,
            "taxaVitoriasFinalPct": round(100.0 * v_final / n, 2),
            "ganhoMedioUltimas5": round(ganho_ult5, 3),
        },
        "formacoes": {
            "base": dict(formacoes_base),
            "explosao": dict(formacoes_exp),
        },
        "gates": gates,
        "decisao": decisao,
        "porRodada": rodada_resultados,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    md = [
        "# Experimento V2.1 — seleção, formação e capitão",
        "",
        f"- Rodadas avaliadas: {n}",
        f"- Média base: {saida['resumo']['base']['media']}",
        f"- Média contexto: {saida['resumo']['contexto']['media']}",
        f"- Média explosão: {saida['resumo']['explosao']['media']}",
        f"- Média final com capitão contextual: {saida['resumo']['explosaoCapitaoContextual']['media']}",
        f"- Ganho médio final vs base: {saida['resumo']['ganhoMedioFinalVsBase']}",
        f"- Vitórias final vs base: {v_final}/{n}",
        f"- Ganho médio últimas 5: {saida['resumo']['ganhoMedioUltimas5']}",
        f"- Decisão: {decisao}",
        "",
        "## Gates",
    ]
    md.extend(f"- {k}: {'OK' if v else 'NÃO'}" for k, v in gates.items())
    OUT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({
        "rodadasAvaliadas": n,
        "resumo": saida["resumo"],
        "formacoes": saida["formacoes"],
        "gates": gates,
        "decisao": decisao,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
