from __future__ import annotations

import json
import math
import statistics
from collections import defaultdict
from pathlib import Path

PASTA_HISTORICO = Path("data/historico")
ARQUIVO_SAIDA = Path("data/torneio-selecao-jogadores.json")

FORMACAO_442 = {"GOL": 1, "LAT": 2, "ZAG": 2, "MEI": 4, "ATA": 2, "TEC": 1}
LIMIAR_EXPLOSAO = {"GOL": 12, "LAT": 15, "ZAG": 12, "MEI": 18, "ATA": 18, "TEC": 10}


def carregar_json(caminho: Path):
    with caminho.open(encoding="utf-8") as arquivo:
        return json.load(arquivo)


def numero(valor, padrao=0.0):
    try:
        n = float(valor)
        return n if math.isfinite(n) else padrao
    except (TypeError, ValueError):
        return padrao


def media(valores):
    valores = list(valores)
    return sum(valores) / len(valores) if valores else 0.0


def mediana(valores):
    valores = list(valores)
    return statistics.median(valores) if valores else 0.0


def desvio(valores):
    valores = list(valores)
    return statistics.pstdev(valores) if len(valores) >= 2 else 0.0


def quantil(valores, q):
    valores = sorted(valores)
    if not valores:
        return 0.0
    if len(valores) == 1:
        return valores[0]
    pos = (len(valores) - 1) * q
    base = int(math.floor(pos))
    topo = int(math.ceil(pos))
    if base == topo:
        return valores[base]
    frac = pos - base
    return valores[base] * (1 - frac) + valores[topo] * frac


def media_aparada(valores):
    valores = sorted(valores)
    if len(valores) <= 4:
        return media(valores)
    corte = max(1, int(len(valores) * 0.10))
    miolo = valores[corte:-corte] if len(valores) > corte * 2 else valores
    return media(miolo)


def ewm(valores, alpha=0.55):
    valores = list(valores)
    if not valores:
        return 0.0
    atual = valores[0]
    for valor in valores[1:]:
        atual = alpha * valor + (1 - alpha) * atual
    return atual


def calcular_tendencia(valores):
    if len(valores) < 4:
        return 0.0
    atual = media(valores[-3:])
    anterior = media(valores[-6:-3]) if len(valores) >= 6 else media(valores[:-3])
    return atual - anterior


def features_historicas(historico, posicao):
    ultimos = list(historico)
    media3 = media(ultimos[-3:])
    media5 = media(ultimos[-5:])
    mediana5 = mediana(ultimos[-5:])
    piso = quantil(ultimos[-8:], 0.25)
    teto = quantil(ultimos[-10:], 0.80)
    consistencia = max(0.0, 10.0 - desvio(ultimos[-8:]))
    tendencia = calcular_tendencia(ultimos)
    aparada = media_aparada(ultimos[-10:])
    exponencial = ewm(ultimos[-10:])
    limiar = LIMIAR_EXPLOSAO.get(posicao, 15)
    explosoes = sum(1 for valor in ultimos[-10:] if valor >= limiar)
    taxa_explosao = explosoes / min(10, len(ultimos)) if ultimos else 0.0
    return {
        "jogos": len(ultimos),
        "media3": media3,
        "media5": media5,
        "mediana5": mediana5,
        "piso": piso,
        "teto": teto,
        "consistencia": consistencia,
        "tendencia": tendencia,
        "aparada": aparada,
        "exponencial": exponencial,
        "bonusExplosao": taxa_explosao * 10.0,
    }


def pontuar_modelos(jogador, historico):
    proj = numero(jogador.get("projecao"))
    pos = str(jogador.get("posicao") or "OUT").upper()
    f = features_historicas(historico, pos)
    c = min(1.0, f["jogos"] / 5.0)

    forma = proj * 0.45 + c * (f["media3"] * 0.25 + f["media5"] * 0.20 + f["tendencia"] * 0.10) + proj * (1 - c) * 0.55
    piso_reg = proj * 0.35 + c * (f["mediana5"] * 0.25 + f["piso"] * 0.25 + f["consistencia"] * 0.15) + proj * (1 - c) * 0.65
    explosao = proj * 0.35 + c * (f["teto"] * 0.25 + f["media3"] * 0.20 + f["bonusExplosao"] * 0.20) + proj * (1 - c) * 0.65
    recencia = proj * 0.35 + f["exponencial"] * 0.65 * c + proj * 0.65 * (1 - c)
    anti_outlier = proj * 0.40 + c * (f["aparada"] * 0.30 + f["mediana5"] * 0.20 + f["piso"] * 0.10) + proj * (1 - c) * 0.60

    if pos in {"GOL", "LAT", "ZAG"}:
        posicional = proj * 0.35 + c * (f["mediana5"] * 0.25 + f["piso"] * 0.20 + f["media3"] * 0.10 + f["consistencia"] * 0.10) + proj * (1 - c) * 0.65
    elif pos == "ATA":
        posicional = proj * 0.35 + c * (f["media3"] * 0.20 + f["teto"] * 0.25 + f["bonusExplosao"] * 0.15 + f["tendencia"] * 0.05) + proj * (1 - c) * 0.65
    elif pos == "MEI":
        posicional = proj * 0.38 + c * (f["media3"] * 0.20 + f["mediana5"] * 0.17 + f["teto"] * 0.15 + f["piso"] * 0.10) + proj * (1 - c) * 0.62
    else:
        posicional = proj * 0.60 + f["media5"] * 0.40 * c + proj * 0.40 * (1 - c)

    basica = proj * 0.35 + c * (f["aparada"] * 0.25 + f["piso"] * 0.20 + f["consistencia"] * 0.20) + proj * (1 - c) * 0.65

    scores = {
        "Atual_Projecao": proj,
        "Forma_3_5": forma,
        "Piso_Regularidade": piso_reg,
        "Explosao_Teto": explosao,
        "Recencia_Exponencial": recencia,
        "Anti_Outlier": anti_outlier,
        "Posicional": posicional,
        "Basica_Consistente": basica,
    }
    scores["Ensemble"] = media([forma, piso_reg, explosao, recencia, anti_outlier, posicional, basica])
    return scores


def selecionar_time(candidatos, modelo):
    selecionados = []
    for posicao, quantidade in FORMACAO_442.items():
        lista = [j for j in candidatos if j["posicao"] == posicao]
        lista.sort(key=lambda x: (x["scores"][modelo], x["projecao"]), reverse=True)
        selecionados.extend(lista[:quantidade])
    if len(selecionados) != sum(FORMACAO_442.values()):
        return None
    elegiveis = [j for j in selecionados if j["posicao"] != "TEC"]
    capitao = max(elegiveis, key=lambda x: x["scores"][modelo]) if elegiveis else None
    total_sem_capitao = sum(j["real"] for j in selecionados)
    total = total_sem_capitao + (capitao["real"] if capitao else 0.0)
    return {"pontuacao": total, "pontuacaoSemCapitao": total_sem_capitao, "capitaoReal": capitao["real"] if capitao else 0.0}


def selecionar_perfeito(candidatos):
    selecionados = []
    for posicao, quantidade in FORMACAO_442.items():
        lista = sorted([j for j in candidatos if j["posicao"] == posicao], key=lambda x: x["real"], reverse=True)
        selecionados.extend(lista[:quantidade])
    if len(selecionados) != sum(FORMACAO_442.values()):
        return None
    elegiveis = [j for j in selecionados if j["posicao"] != "TEC"]
    capitao = max(elegiveis, key=lambda x: x["real"]) if elegiveis else None
    return sum(j["real"] for j in selecionados) + (capitao["real"] if capitao else 0.0)


def resumo_temporal(resultados):
    resultados = sorted(resultados, key=lambda x: x["rodada"])
    def janela(n=None):
        itens = resultados if n is None else resultados[-n:]
        pontos = [i["pontuacao"] for i in itens]
        captura = [i["pontuacao"] / i["perfeito"] * 100 for i in itens if i.get("perfeito") and i["perfeito"] > 0]
        return {
            "quantidade": len(itens),
            "rodadas": [i["rodada"] for i in itens],
            "media": round(media(pontos), 2),
            "mediana": round(mediana(pontos), 2),
            "melhor": round(max(pontos) if pontos else 0, 2),
            "capturaPerfeitoPct": round(media(captura), 2),
        }
    return {"campeonato": janela(), "ultimas10": janela(10), "ultimas5": janela(5), "ultimas3": janela(3)}


def main():
    arquivos = sorted(PASTA_HISTORICO.glob("rodada-*.json"))
    historico = defaultdict(list)
    resultados = defaultdict(list)

    for arquivo in arquivos:
        dados = carregar_json(arquivo)
        rodada = int(dados.get("rodada") or 0)
        candidatos = []
        for bruto in dados.get("jogadores") or []:
            atleta_id = str(bruto.get("id") or "").strip()
            posicao = str(bruto.get("posicao") or "OUT").upper()
            if not atleta_id or posicao not in FORMACAO_442 or bruto.get("real") is None:
                continue
            real = numero(bruto.get("real"), None)
            proj = numero(bruto.get("projecao"), None)
            if real is None or proj is None:
                continue
            candidatos.append({"id": atleta_id, "posicao": posicao, "real": real, "projecao": proj, "scores": pontuar_modelos(bruto, historico[atleta_id])})

        perfeito = selecionar_perfeito(candidatos)
        if perfeito is not None and candidatos:
            for modelo in candidatos[0]["scores"]:
                time = selecionar_time(candidatos, modelo)
                if time:
                    resultados[modelo].append({"rodada": rodada, "pontuacao": round(time["pontuacao"], 2), "perfeito": round(perfeito, 2)})

        for jogador in candidatos:
            historico[jogador["id"]].append(jogador["real"])

    baseline = {i["rodada"]: i["pontuacao"] for i in resultados.get("Atual_Projecao", [])}
    ranking = []
    for modelo, itens in resultados.items():
        temporal = resumo_temporal(itens)
        deltas = [i["pontuacao"] - baseline[i["rodada"]] for i in itens if i["rodada"] in baseline]
        vitorias = sum(1 for d in deltas if d > 0.01)
        derrotas = sum(1 for d in deltas if d < -0.01)
        ranking.append({
            "modelo": modelo,
            "ganhoMedioVsAtual": round(media(deltas), 2),
            "vitoriasVsAtual": vitorias,
            "derrotasVsAtual": derrotas,
            "empatesVsAtual": len(deltas) - vitorias - derrotas,
            "taxaVitoriasVsAtual": round(vitorias / len(deltas) * 100 if deltas else 0, 2),
            "desempenhoTemporal": temporal,
        })

    ranking.sort(key=lambda x: (x["desempenhoTemporal"]["ultimas5"]["media"], x["desempenhoTemporal"]["ultimas10"]["media"], x["desempenhoTemporal"]["campeonato"]["media"]), reverse=True)
    for pos, item in enumerate(ranking, 1):
        item["posicao"] = pos

    melhor = next((x for x in ranking if x["modelo"] != "Atual_Projecao"), None)
    saida = {
        "modelo": "torneio_selecao_jogadores_v1",
        "descricao": "Backtest walk-forward diagnóstico de alternativas de ranking dos 11 jogadores em formação 4-4-2.",
        "metodologia": {
            "semVazamentoFuturo": True,
            "formacao": "4-4-2",
            "capitaoIncluido": True,
            "orcamentoAplicado": False,
            "limiteClubeAplicado": False,
            "uso": "diagnóstico; não promove automaticamente o time oficial",
        },
        "baseline": next((x for x in ranking if x["modelo"] == "Atual_Projecao"), None),
        "melhorExperimental": melhor,
        "ranking": ranking,
    }
    ARQUIVO_SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=" * 72)
    print("TORNEIO DE SELEÇÃO DOS 11 JOGADORES V1")
    print("=" * 72)
    for item in ranking:
        t = item["desempenhoTemporal"]
        print(f'{item["posicao"]:>2}. {item["modelo"]:<22} | Camp {t["campeonato"]["media"]:>6.2f} | 10 {t["ultimas10"]["media"]:>6.2f} | 5 {t["ultimas5"]["media"]:>6.2f} | 3 {t["ultimas3"]["media"]:>6.2f} | Δ {item["ganhoMedioVsAtual"]:+.2f}')


if __name__ == "__main__":
    main()
