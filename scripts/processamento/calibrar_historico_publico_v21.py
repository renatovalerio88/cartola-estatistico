"""Aplica ao Histórico público somente calibrações que passam o gate V2.1.

A calibração é multiplicativa e estritamente walk-forward: em cada rodada o fator
usa apenas resultados de rodadas anteriores do mesmo perfil. O script preserva
os valores originais para auditoria e nunca cria Time Recomendado.
"""
from __future__ import annotations

import json
from pathlib import Path
from statistics import mean, median

BASE = Path(__file__).resolve().parents[2]
ARQUIVO = BASE / "data" / "pontuacao-final-cartola-v21.json"
PERFIS = ("Conservador", "Equilibrado", "Agressivo")
MIN_TREINO = 5


def clip(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def fator_robusto(passado: list[dict]) -> float:
    razoes = []
    for x in passado:
        proj = float(x["projecaoOriginal"])
        real = float(x["real"])
        if proj > 1:
            razoes.append(real / proj)
    if not razoes:
        return 1.0
    return clip(float(median(razoes)), 0.45, 1.10)


def classificar_leitura(j: dict) -> str:
    if j.get("entrou") is False:
        return "Não entrou em campo"
    pontos = j.get("pontos")
    proj = j.get("projecao")
    if pontos is None or proj is None:
        return j.get("leituraOriginal") or "Resultado indisponível"
    dif = float(pontos) - float(proj)
    if dif >= 5:
        base = "Superou bastante a projeção"
    elif dif >= 2:
        base = "Superou a projeção"
    elif dif <= -5:
        base = "Ficou bastante abaixo da projeção"
    elif dif <= -2:
        base = "Ficou abaixo da projeção"
    else:
        base = "Ficou próximo da projeção"
    scouts = j.get("scouts") if isinstance(j.get("scouts"), dict) else {}
    nomes = {
        "G": "gol", "A": "assistência", "SG": "SG", "DS": "desarme",
        "FD": "finalização defendida", "FF": "finalização para fora",
        "FT": "finalização na trave", "CA": "cartão amarelo",
        "CV": "cartão vermelho", "GS": "gol sofrido", "DE": "defesa",
        "DP": "defesa de pênalti",
    }
    fatos = []
    for chave, rotulo in nomes.items():
        valor = scouts.get(chave)
        if valor in (None, 0, 0.0):
            continue
        try:
            n = float(valor)
            txt = str(int(n)) if n.is_integer() else f"{n:.1f}"
        except Exception:
            txt = str(valor)
        fatos.append(f"{txt} {rotulo}")
        if len(fatos) == 3:
            break
    return f"{base} · {', '.join(fatos)}" if fatos else base


def montar_series(dados: dict) -> dict[str, list[dict]]:
    series = {p: [] for p in PERFIS}
    for rodada in sorted(dados.get("rodadas", []), key=lambda x: int(x["rodada"])):
        r = int(rodada["rodada"])
        for time in rodada.get("times", []):
            perfil = time.get("perfil")
            if perfil not in series:
                continue
            series[perfil].append({
                "rodada": r,
                "time": time,
                "projecaoOriginal": float(time.get("projecaoFinalPreJogo", 0) or 0),
                "real": float(time.get("pontuacaoFinalCartola", 0) or 0),
            })
    return series


def avaliar_gate(itens: list[dict]) -> dict:
    avaliados = []
    for i in range(MIN_TREINO, len(itens)):
        atual = itens[i]
        passado = itens[:i]
        fator = fator_robusto(passado)
        original = atual["projecaoOriginal"]
        calibrada = original * fator
        real = atual["real"]
        avaliados.append({
            "rodada": atual["rodada"],
            "fator": fator,
            "erroOriginal": abs(real - original),
            "erroCalibrado": abs(real - calibrada),
        })
    if not avaliados:
        return {"aprovado": False, "motivo": "histórico insuficiente"}
    mae0 = mean(x["erroOriginal"] for x in avaliados)
    mae1 = mean(x["erroCalibrado"] for x in avaliados)
    ult = avaliados[-5:]
    rec0 = mean(x["erroOriginal"] for x in ult)
    rec1 = mean(x["erroCalibrado"] for x in ult)
    ganho = 100 * (mae0 - mae1) / mae0 if mae0 else 0.0
    gate = mae1 <= mae0 * 0.92 and rec1 <= rec0 * 1.02
    return {
        "aprovado": bool(gate),
        "rodadasAvaliadas": len(avaliados),
        "maeOriginal": round(mae0, 3),
        "maeCalibrado": round(mae1, 3),
        "ganhoMaePct": round(ganho, 2),
        "maeOriginalUltimas5": round(rec0, 3),
        "maeCalibradoUltimas5": round(rec1, 3),
        "fatorAtual": round(fator_robusto(itens), 4),
        "regra": "MAE global melhora >=8% e últimas5 não pioram >2%",
    }


def aplicar_time(time: dict, fator: float, aplicado: bool) -> None:
    original_time = float(time.get("projecaoFinalPreJogo", 0) or 0)
    time["projecaoFinalPreJogoOriginal"] = round(original_time, 2)
    time["fatorCalibracao"] = round(fator, 4)
    time["calibracaoAplicada"] = bool(aplicado)

    for j in time.get("jogadores", []):
        original = float(j.get("projecao", 0) or 0)
        j["projecaoOriginal"] = round(original, 2)
        j["leituraOriginal"] = j.get("leitura")
        nova = original * fator if aplicado else original
        j["projecao"] = round(nova, 2)
        if j.get("pontos") is not None:
            j["diferenca"] = round(float(j["pontos"]) - nova, 2)
        j["leitura"] = classificar_leitura(j)

    proj_titulares = sum(float(j.get("projecao", 0) or 0) for j in time.get("jogadores", []))
    capitao = next((j for j in time.get("jogadores", []) if j.get("capitao")), None)
    bonus = 0.5 * float(capitao.get("projecao", 0) or 0) if capitao else 0.0
    nova_time = proj_titulares + bonus
    time["projecaoTitularesOriginal"] = time.get("projecaoTitulares")
    time["bonusCapitaoProjetado15Original"] = time.get("bonusCapitaoProjetado15")
    time["projecaoTitulares"] = round(proj_titulares, 2)
    time["bonusCapitaoProjetado15"] = round(bonus, 2)
    time["projecaoFinalPreJogo"] = round(nova_time, 2)
    time["erroAbsolutoFinalOriginal"] = time.get("erroAbsolutoFinal")
    time["erroAbsolutoFinal"] = round(abs(float(time.get("pontuacaoFinalCartola", 0) or 0) - nova_time), 2)


def main() -> None:
    dados = json.loads(ARQUIVO.read_text(encoding="utf-8"))
    if not dados.get("gate", {}).get("aptaParaRankingFinal"):
        raise SystemExit("Histórico base sem gate científico; calibração bloqueada")

    series = montar_series(dados)
    gates = {perfil: avaliar_gate(itens) for perfil, itens in series.items()}
    aprovados = [perfil for perfil, gate in gates.items() if gate.get("aprovado")]

    for perfil, itens in series.items():
        for i, item in enumerate(itens):
            aplicar = perfil in aprovados and i >= MIN_TREINO
            fator = fator_robusto(itens[:i]) if aplicar else 1.0
            aplicar_time(item["time"], fator, aplicar)

    dados["calibracaoHistorico"] = {
        "antiLeakage": True,
        "metodo": "mediana walk-forward da razão real/projeção, limitada entre 0.45 e 1.10",
        "minTreino": MIN_TREINO,
        "perfisAprovados": aprovados,
        "perfisSemAjuste": [p for p in PERFIS if p not in aprovados],
        "gates": gates,
        "timeRecomendadoPromovido": False,
        "observacao": "A calibração ajusta apenas a leitura histórica de perfis que passaram o gate; não altera o RandomForest V2 nem cria Time Recomendado.",
    }

    perfis_resumo = {}
    for perfil, itens in series.items():
        times = [x["time"] for x in itens]
        perfis_resumo[perfil] = {
            "rodadas": len(times),
            "mediaProjetada": round(mean(float(t["projecaoFinalPreJogo"]) for t in times), 3),
            "mediaReal": round(mean(float(t["pontuacaoFinalCartola"]) for t in times), 3),
            "maeTime": round(mean(float(t["erroAbsolutoFinal"]) for t in times), 3),
            "calibracaoAprovada": perfil in aprovados,
        }
    dados["resumoPorPerfilCalibrado"] = perfis_resumo

    ARQUIVO.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "perfisAprovados": aprovados,
        "gates": gates,
        "resumoPorPerfilCalibrado": perfis_resumo,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
