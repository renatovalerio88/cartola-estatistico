#!/usr/bin/env python3
"""Diagnóstico walk-forward de expected scouts para a V2.1.

Objetivo
-------
Testar se estimativas simples, explicáveis e estritamente pré-rodada de scouts
podem ser usadas apenas como camada auxiliar de explicabilidade no site.

Regras científicas
------------------
* Nenhum resultado da rodada alvo participa da estimativa.
* A estimativa do atleta usa apenas suas rodadas anteriores.
* Quando há pouca amostra individual, há shrinkage para a média da posição.
* O baseline de comparação usa somente a média histórica da posição.
* O experimento NÃO decompõe a projeção do RandomForest e NÃO altera V2/V1.
* Promoção só é permitida se houver ganho de MAE global e estabilidade por scout.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
DATA_API = ROOT / "data" / "api"
OUT = ROOT / "data" / "laboratorio" / "expected-scouts-v21.json"

# Scouts úteis para explicação ao usuário. Não tentamos prever toda a súmula.
SCOUTS = ("DS", "FS", "FD", "FF", "G", "A", "SG", "DE")
MIN_RODADA_ALVO = 6
JANELA_JOGADOR = 5
JANELA_POSICAO = 5
MIN_AMOSTRA_SCOUT = 80


def numero(v, padrao=0.0):
    try:
        x = float(v)
        return x if math.isfinite(x) else padrao
    except (TypeError, ValueError):
        return padrao


def carregar_rodadas():
    rodadas = {}
    for pasta in sorted(DATA_API.glob("rodada-*")):
        try:
            rodada = int(pasta.name.split("-")[-1])
        except ValueError:
            continue
        arquivo = pasta / "jogadores.json"
        if not arquivo.exists():
            continue
        try:
            jogadores = json.loads(arquivo.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(jogadores, list):
            continue

        # Resultado fechado só entra se houver atuação explícita e scouts reais.
        validos = [
            j for j in jogadores
            if j.get("entrouEmCampo") is True
            and isinstance(j.get("scouts"), dict)
            and j.get("pontuacaoReal") is not None
        ]
        if validos:
            rodadas[rodada] = validos
    return rodadas


def chave_posicao(j):
    return str(j.get("posicao") or j.get("posicaoId") or "?").upper()


def historico_antes(rodadas, rodada_alvo):
    por_atleta = defaultdict(list)
    por_posicao = defaultdict(list)
    for r in sorted(k for k in rodadas if k < rodada_alvo):
        for j in rodadas[r]:
            aid = j.get("id")
            pos = chave_posicao(j)
            scouts = j.get("scouts") or {}
            registro = {s: numero(scouts.get(s), 0.0) for s in SCOUTS}
            registro["rodada"] = r
            if aid is not None:
                por_atleta[aid].append(registro)
            por_posicao[pos].append(registro)
    return por_atleta, por_posicao


def media_janela(registros, scout, janela):
    if not registros:
        return 0.0
    ultimos = registros[-janela:]
    return mean(numero(x.get(scout), 0.0) for x in ultimos)


def prever_scout(h_atleta, h_pos, scout):
    # Baseline: média recente da posição.
    base_pos = media_janela(h_pos, scout, JANELA_POSICAO * 40)
    if not h_atleta:
        return base_pos, base_pos

    recentes = h_atleta[-JANELA_JOGADOR:]
    media_atleta = mean(numero(x.get(scout), 0.0) for x in recentes)

    # Shrinkage transparente: quanto mais jogos recentes, mais peso individual.
    peso_individual = min(0.75, len(recentes) / (JANELA_JOGADOR + 1.0))
    estimativa = peso_individual * media_atleta + (1.0 - peso_individual) * base_pos
    return estimativa, base_pos


def main():
    rodadas = carregar_rodadas()
    fechadas = sorted(rodadas)
    avaliacoes = {s: {"modelo": [], "baseline": []} for s in SCOUTS}
    por_rodada = []

    for alvo in fechadas:
        if alvo < MIN_RODADA_ALVO:
            continue
        anteriores = [r for r in fechadas if r < alvo]
        if len(anteriores) < 4:
            continue

        h_atleta, h_pos = historico_antes(rodadas, alvo)
        erros_rodada_modelo = []
        erros_rodada_base = []
        n = 0

        for j in rodadas[alvo]:
            aid = j.get("id")
            pos = chave_posicao(j)
            reais = j.get("scouts") or {}
            for scout in SCOUTS:
                real = numero(reais.get(scout), 0.0)
                pred, base = prever_scout(h_atleta.get(aid, []), h_pos.get(pos, []), scout)
                em = abs(pred - real)
                eb = abs(base - real)
                avaliacoes[scout]["modelo"].append(em)
                avaliacoes[scout]["baseline"].append(eb)
                erros_rodada_modelo.append(em)
                erros_rodada_base.append(eb)
                n += 1

        if n:
            mae_m = mean(erros_rodada_modelo)
            mae_b = mean(erros_rodada_base)
            ganho = (mae_b - mae_m) / mae_b * 100 if mae_b > 0 else 0.0
            por_rodada.append({
                "rodada": alvo,
                "amostrasScout": n,
                "maeModelo": round(mae_m, 4),
                "maeBaseline": round(mae_b, 4),
                "ganhoPct": round(ganho, 2),
            })

    resumo = {}
    scouts_aprovados = []
    for scout in SCOUTS:
        m = avaliacoes[scout]["modelo"]
        b = avaliacoes[scout]["baseline"]
        if not m or not b:
            continue
        mae_m = mean(m)
        mae_b = mean(b)
        ganho = (mae_b - mae_m) / mae_b * 100 if mae_b > 0 else 0.0
        aprovado = len(m) >= MIN_AMOSTRA_SCOUT and ganho >= 3.0
        if aprovado:
            scouts_aprovados.append(scout)
        resumo[scout] = {
            "amostras": len(m),
            "maeModelo": round(mae_m, 4),
            "maeBaseline": round(mae_b, 4),
            "ganhoPct": round(ganho, 2),
            "aprovado": aprovado,
        }

    todas_m = [e for s in SCOUTS for e in avaliacoes[s]["modelo"]]
    todas_b = [e for s in SCOUTS for e in avaliacoes[s]["baseline"]]
    mae_global_m = mean(todas_m) if todas_m else 0.0
    mae_global_b = mean(todas_b) if todas_b else 0.0
    ganho_global = ((mae_global_b - mae_global_m) / mae_global_b * 100) if mae_global_b else 0.0

    rodadas_positivas = sum(1 for r in por_rodada if r["ganhoPct"] > 0)
    estabilidade = rodadas_positivas / len(por_rodada) if por_rodada else 0.0

    # Gate deliberadamente conservador: expected scouts só aparece como auxílio
    # se melhorar o baseline global e em quantidade relevante de scouts/rodadas.
    apto = (
        ganho_global >= 3.0
        and len(scouts_aprovados) >= 3
        and estabilidade >= 0.55
    )

    saida = {
        "versao": "V2.1-diagnostico-expected-scouts",
        "antiLeakage": True,
        "uso": "explicabilidade_auxiliar",
        "naoDecompoeRandomForest": True,
        "rodadasFechadasEncontradas": fechadas,
        "rodadasAvaliadas": [r["rodada"] for r in por_rodada],
        "scouts": resumo,
        "scoutsAprovados": scouts_aprovados,
        "maeGlobalModelo": round(mae_global_m, 4),
        "maeGlobalBaseline": round(mae_global_b, 4),
        "ganhoGlobalPct": round(ganho_global, 2),
        "estabilidadeRodadas": round(estabilidade, 4),
        "aptoParaExplicabilidade": apto,
        "porRodada": por_rodada,
        "regraPromocao": {
            "ganhoGlobalMinPct": 3.0,
            "scoutsAprovadosMin": 3,
            "estabilidadeMin": 0.55,
            "observacao": "Mesmo aprovado, expected scouts é uma camada auxiliar e nunca uma decomposição causal da projeção V2.",
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== EXPECTED SCOUTS V2.1 ===")
    print(f"Rodadas fechadas: {fechadas}")
    print(f"Rodadas avaliadas: {len(por_rodada)}")
    print(f"MAE modelo: {mae_global_m:.4f}")
    print(f"MAE baseline: {mae_global_b:.4f}")
    print(f"Ganho global: {ganho_global:.2f}%")
    print(f"Scouts aprovados: {scouts_aprovados}")
    print(f"Estabilidade: {estabilidade:.1%}")
    print(f"APTO PARA EXPLICABILIDADE: {apto}")


if __name__ == "__main__":
    main()
