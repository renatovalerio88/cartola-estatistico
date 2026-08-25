"""Calibra projeções dos perfis e testa um Time Recomendado sem leakage.

Entrada: data/pontuacao-final-cartola-v21.json, gerada pela reconstrução oficial
com banco, Reserva de Luxo e capitão 1,5x.

Objetivos:
1) medir a super/subestimação das projeções de Conservador/Equilibrado/Agressivo;
2) testar uma calibração multiplicativa walk-forward usando apenas rodadas anteriores;
3) testar políticas de escolha do perfil recomendado usando apenas desempenho passado;
4) bloquear promoção se não houver ganho consistente global e recente.

Este script é laboratório. Não altera V2/V1 nem frontend.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from statistics import mean, median, pstdev

BASE = Path(__file__).resolve().parents[2]
ENTRADA = BASE / "data" / "pontuacao-final-cartola-v21.json"
SAIDA = BASE / "data" / "laboratorio" / "calibracao-perfis-v21.json"
PERFIS = ("Conservador", "Equilibrado", "Agressivo")
MIN_TREINO = 5


def carregar():
    dados = json.loads(ENTRADA.read_text(encoding="utf-8"))
    if not dados.get("gate", {}).get("aptaParaRankingFinal"):
        raise SystemExit("Gate de pontuação final não aprovado; calibração bloqueada.")
    return dados


def clip(v, lo, hi):
    return max(lo, min(hi, v))


def fator_robusto(passado):
    """Razão real/projeção robusta, calculada apenas em rodadas anteriores."""
    razoes = []
    for x in passado:
        p = float(x["projecao"])
        r = float(x["real"])
        if p > 1:
            razoes.append(r / p)
    if not razoes:
        return 1.0
    return clip(float(median(razoes)), 0.45, 1.10)


def serie_por_perfil(dados):
    out = {p: [] for p in PERFIS}
    for rodada in sorted(dados.get("rodadas", []), key=lambda x: int(x["rodada"])):
        r = int(rodada["rodada"])
        por_nome = {t.get("perfil"): t for t in rodada.get("times", [])}
        for perfil in PERFIS:
            t = por_nome.get(perfil)
            if not t:
                continue
            out[perfil].append({
                "rodada": r,
                "projecao": float(t["projecaoFinalPreJogo"]),
                "real": float(t["pontuacaoFinalCartola"]),
            })
    return out


def calibrar_perfis(series):
    resumo = {}
    detalhes = {}
    for perfil, itens in series.items():
        avaliados = []
        for i in range(MIN_TREINO, len(itens)):
            atual = itens[i]
            passado = itens[:i]
            fator = fator_robusto(passado)
            calibrada = atual["projecao"] * fator
            avaliados.append({
                "rodada": atual["rodada"],
                "fator": round(fator, 4),
                "projecaoOriginal": round(atual["projecao"], 2),
                "projecaoCalibrada": round(calibrada, 2),
                "real": round(atual["real"], 2),
                "erroOriginal": round(abs(atual["real"] - atual["projecao"]), 2),
                "erroCalibrado": round(abs(atual["real"] - calibrada), 2),
            })
        if not avaliados:
            continue
        mae0 = mean(x["erroOriginal"] for x in avaliados)
        mae1 = mean(x["erroCalibrado"] for x in avaliados)
        ult = avaliados[-5:]
        rec0 = mean(x["erroOriginal"] for x in ult)
        rec1 = mean(x["erroCalibrado"] for x in ult)
        ganho = 100 * (mae0 - mae1) / mae0 if mae0 else 0
        gate = mae1 <= mae0 * 0.92 and rec1 <= rec0 * 1.02
        resumo[perfil] = {
            "rodadasAvaliadas": len(avaliados),
            "maeOriginal": round(mae0, 3),
            "maeCalibrado": round(mae1, 3),
            "ganhoMaePct": round(ganho, 2),
            "maeOriginalUltimas5": round(rec0, 3),
            "maeCalibradoUltimas5": round(rec1, 3),
            "fatorAtual": round(fator_robusto(itens), 4),
            "gateCalibracao": bool(gate),
        }
        detalhes[perfil] = avaliados
    return resumo, detalhes


def valor_ewma(xs, alpha=0.4):
    valor = float(xs[0])
    for x in xs[1:]:
        valor = alpha * float(x) + (1 - alpha) * valor
    return valor


def score_politica(passado, politica):
    reais = [float(x["real"]) for x in passado]
    if not reais:
        return -1e9
    if politica == "cumulativo":
        return mean(reais)
    if politica.startswith("janela"):
        n = int(politica.replace("janela", ""))
        return mean(reais[-n:])
    if politica == "ewma":
        return valor_ewma(reais)
    if politica == "consistencia5":
        xs = reais[-5:]
        return mean(xs) - 0.25 * (pstdev(xs) if len(xs) > 1 else 0)
    raise ValueError(politica)


def testar_recomendado(series):
    mapas = {p: {x["rodada"]: x for x in xs} for p, xs in series.items()}
    rodadas_comuns = sorted(set.intersection(*(set(m.keys()) for m in mapas.values())))
    politicas = ("cumulativo", "janela3", "janela5", "janela8", "ewma", "consistencia5")
    resultados = {}

    for politica in politicas:
        escolhas = []
        for idx in range(MIN_TREINO, len(rodadas_comuns)):
            r = rodadas_comuns[idx]
            anteriores = rodadas_comuns[:idx]
            scores = {}
            for p in PERFIS:
                passado = [mapas[p][rr] for rr in anteriores]
                scores[p] = score_politica(passado, politica)
            escolhido = max(PERFIS, key=lambda p: (scores[p], p == "Conservador", p))
            atual = mapas[escolhido][r]
            fator = fator_robusto([mapas[escolhido][rr] for rr in anteriores])
            escolhas.append({
                "rodada": r,
                "perfil": escolhido,
                "real": round(atual["real"], 2),
                "projecaoCalibrada": round(atual["projecao"] * fator, 2),
            })
        resultados[politica] = escolhas

    if not resultados:
        return {}, None, None

    eval_rodadas = [x["rodada"] for x in next(iter(resultados.values()))]
    estaticos = {}
    for p in PERFIS:
        vals = [mapas[p][r]["real"] for r in eval_rodadas]
        estaticos[p] = {
            "mediaReal": round(mean(vals), 3),
            "mediaRealUltimas5": round(mean(vals[-5:]), 3),
        }
    melhor_estatico = max(PERFIS, key=lambda p: estaticos[p]["mediaReal"])

    sumarios = {}
    for politica, escolhas in resultados.items():
        vals = [x["real"] for x in escolhas]
        base_vals = [mapas[melhor_estatico][x["rodada"]]["real"] for x in escolhas]
        vitorias = sum(v > b for v, b in zip(vals, base_vals))
        empates = sum(abs(v - b) < 1e-9 for v, b in zip(vals, base_vals))
        media_real = mean(vals)
        media_base = mean(base_vals)
        rec = mean(vals[-5:])
        rec_base = mean(base_vals[-5:])
        gate = (
            media_real >= media_base + 0.5
            and rec >= rec_base - 0.5
            and vitorias >= math.ceil(len(vals) * 0.50)
        )
        sumarios[politica] = {
            "rodadas": len(vals),
            "mediaReal": round(media_real, 3),
            "melhorEstatico": melhor_estatico,
            "mediaMelhorEstatico": round(media_base, 3),
            "deltaMedia": round(media_real - media_base, 3),
            "mediaUltimas5": round(rec, 3),
            "mediaEstaticoUltimas5": round(rec_base, 3),
            "deltaUltimas5": round(rec - rec_base, 3),
            "vitoriasVsEstatico": vitorias,
            "empatesVsEstatico": empates,
            "taxaVitoriasPct": round(100 * vitorias / len(vals), 2) if vals else 0,
            "gateRecomendado": bool(gate),
        }

    vencedor = max(sumarios, key=lambda k: (sumarios[k]["gateRecomendado"], sumarios[k]["deltaMedia"], sumarios[k]["deltaUltimas5"]))
    return {
        "estaticos": estaticos,
        "melhorEstatico": melhor_estatico,
        "politicas": sumarios,
        "detalhes": resultados,
    }, vencedor, sumarios[vencedor]


def main():
    dados = carregar()
    series = serie_por_perfil(dados)
    calib_resumo, calib_detalhes = calibrar_perfis(series)
    recomendado, politica_vencedora, gate_vencedor = testar_recomendado(series)

    aprovadas = [p for p, x in calib_resumo.items() if x["gateCalibracao"]]
    recomendar = bool(gate_vencedor and gate_vencedor["gateRecomendado"])
    saida = {
        "experimento": "calibracao_perfis_recomendado_v21",
        "antiLeakage": True,
        "regraTemporal": "cada rodada usa somente resultados de rodadas anteriores",
        "rodadaMaximaFonte": dados.get("rodadaMaximaProcessada"),
        "calibracao": {
            "metodo": "mediana walk-forward da razão real/projeção, limitada entre 0.45 e 1.10",
            "minTreino": MIN_TREINO,
            "resumo": calib_resumo,
            "detalhes": calib_detalhes,
            "perfisAprovados": aprovadas,
            "gate": "MAE global melhora >=8% e MAE últimas5 não piora >2%",
        },
        "recomendado": recomendado,
        "politicaVencedora": politica_vencedora,
        "gatePoliticaVencedora": gate_vencedor,
        "promocao": {
            "calibracaoProjecoesApta": len(aprovadas) == len(PERFIS),
            "timeRecomendadoApto": recomendar,
            "regra": "Time Recomendado só entra se superar melhor perfil estático em média >=0,5 pt, não regredir >0,5 pt nas últimas5 e vencer >=50% das rodadas avaliadas.",
        },
    }
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "rodadaMaximaFonte": saida["rodadaMaximaFonte"],
        "calibracao": calib_resumo,
        "politicaVencedora": politica_vencedora,
        "gatePoliticaVencedora": gate_vencedor,
        "promocao": saida["promocao"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
