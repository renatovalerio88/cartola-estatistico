"""
CARTOLA ESTATÍSTICO
Torneio Científico de Capitães - V1

Objetivo:
- comparar vários modelos de capitão no mesmo histórico walk-forward;
- usar somente informações disponíveis antes de cada rodada;
- manter o capitão oficial intacto;
- medir impacto do capitão na pontuação total dos três perfis;
- reportar Campeonato / últimas 10 / 5 / 3 rodadas.
"""

from collections import defaultdict
from pathlib import Path
from statistics import mean
import json
import math

import analisar_capitao as base


BASE_DIR = Path(__file__).resolve().parent.parent.parent
PASTA_DATA = BASE_DIR / "data"
ARQUIVO_SAIDA = PASTA_DATA / "torneio-capitao.json"


MODELOS = {
    "Atual_Projecao": {
        "descricao": "Capitão atual: maior projeção do time.",
        "pesos": {"projecao": 1.0},
    },
    "V2_Balanceado": {
        "descricao": "Modelo V2 balanceando projeção, teto, momento, regularidade e explosão.",
        "pesos": {
            "projecao": 0.28,
            "teto": 0.18,
            "mediaRecente": 0.14,
            "regularidade": 0.10,
            "confianca": 0.10,
            "explosao": 0.08,
            "forma": 0.05,
            "potencialOfensivo": 0.05,
            "risco": -0.01,
            "volatilidade": -0.01,
        },
    },
    "Piso_Regularidade": {
        "descricao": "Prioriza produção recorrente, piso e confiança.",
        "pesos": {
            "piso": 0.24,
            "regularidade": 0.22,
            "mediaRecente": 0.20,
            "confianca": 0.16,
            "projecao": 0.13,
            "risco": -0.03,
            "volatilidade": -0.02,
        },
    },
    "Explosao_Teto": {
        "descricao": "Busca capitães capazes de produzir rodadas de teto alto.",
        "pesos": {
            "teto": 0.28,
            "explosao": 0.23,
            "projecao": 0.19,
            "mediaRecente": 0.14,
            "forma": 0.09,
            "potencialOfensivo": 0.07,
        },
    },
    "Momento_Recente": {
        "descricao": "Favorece forma recente e tendência positiva.",
        "pesos": {
            "mediaRecente": 0.31,
            "forma": 0.22,
            "tendencia": 0.18,
            "projecao": 0.14,
            "regularidade": 0.10,
            "confianca": 0.05,
        },
    },
    "Potencial_Ofensivo": {
        "descricao": "Aumenta o peso de teto, explosão e potencial ofensivo.",
        "pesos": {
            "potencialOfensivo": 0.31,
            "teto": 0.24,
            "explosao": 0.17,
            "projecao": 0.13,
            "mediaRecente": 0.10,
            "forma": 0.05,
        },
    },
    "Anti_Risco": {
        "descricao": "Evita capitães muito voláteis sem abrir mão de projeção.",
        "pesos": {
            "piso": 0.21,
            "regularidade": 0.20,
            "confianca": 0.18,
            "mediaRecente": 0.16,
            "projecao": 0.15,
            "risco": -0.06,
            "volatilidade": -0.04,
        },
    },
    "Posicional": {
        "descricao": "Pesos diferentes por posição para respeitar perfis de pontuação distintos.",
        "posicional": True,
    },
    "Ensemble": {
        "descricao": "Combina o consenso dos modelos experimentais anteriores.",
        "ensemble": True,
    },
}


PESOS_POSICAO = {
    "ATA": {
        "projecao": 0.20,
        "teto": 0.25,
        "explosao": 0.20,
        "potencialOfensivo": 0.15,
        "mediaRecente": 0.12,
        "forma": 0.08,
    },
    "MEI": {
        "projecao": 0.18,
        "mediaRecente": 0.20,
        "teto": 0.18,
        "regularidade": 0.15,
        "explosao": 0.12,
        "potencialOfensivo": 0.10,
        "forma": 0.07,
    },
    "LAT": {
        "piso": 0.20,
        "regularidade": 0.20,
        "mediaRecente": 0.18,
        "projecao": 0.16,
        "confianca": 0.12,
        "teto": 0.09,
        "risco": -0.05,
    },
    "ZAG": {
        "piso": 0.22,
        "regularidade": 0.22,
        "confianca": 0.18,
        "projecao": 0.16,
        "mediaRecente": 0.14,
        "risco": -0.05,
        "volatilidade": -0.03,
    },
    "GOL": {
        "regularidade": 0.23,
        "piso": 0.20,
        "confianca": 0.18,
        "mediaRecente": 0.17,
        "projecao": 0.14,
        "risco": -0.05,
        "volatilidade": -0.03,
    },
}


def numero(valor, padrao=0.0):
    try:
        if valor is None:
            return padrao
        n = float(valor)
        return n if math.isfinite(n) else padrao
    except Exception:
        return padrao


def salvar_json(caminho, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")


def media_segura(valores):
    valores = [numero(v, None) for v in valores]
    valores = [v for v in valores if v is not None and math.isfinite(v)]
    return mean(valores) if valores else 0.0


def arredondar(valor, casas=3):
    return round(numero(valor), casas)


def percentual(parte, total):
    return round(parte / total * 100.0, 2) if total else 0.0


def construir_candidatos(estrategia, indice_hist):
    nome = estrategia.get("nome") or estrategia.get("id") or "Sem nome"
    historico_por_id = indice_hist.get(str(nome).lower(), {})
    candidatos = []

    for jogador in estrategia.get("titulares", []):
        posicao = str(jogador.get("posicao") or "").upper()
        if posicao == "TEC":
            continue

        chave = base.id_jogador(jogador)
        origem = historico_por_id.get(chave, {}) if chave else {}
        componentes = base.derivar_componentes(jogador, origem)

        candidatos.append({
            "id": chave,
            "nome": base.nome_jogador(jogador),
            "posicao": posicao,
            "real": numero(jogador.get("pontuacaoReal"), 0),
            "componentes": componentes,
            "scores": {},
        })

    return candidatos


def limites_componentes(candidatos, componentes):
    limites = {}
    for componente in componentes:
        valores = [numero(c["componentes"].get(componente), None) for c in candidatos]
        valores = [v for v in valores if v is not None and math.isfinite(v)]
        limites[componente] = (min(valores), max(valores)) if valores else None
    return limites


def normalizado(valor, limite):
    if limite is None:
        return 0.5
    minimo, maximo = limite
    if maximo == minimo:
        return 0.5
    return max(0.0, min(1.0, (numero(valor) - minimo) / (maximo - minimo)))


def score_pesos(candidato, pesos, limites):
    soma = 0.0
    peso_total = 0.0

    for componente, peso in pesos.items():
        limite = limites.get(componente)
        if limite is None:
            continue
        norm = normalizado(candidato["componentes"].get(componente), limite)
        peso_abs = abs(peso)
        soma += (norm if peso >= 0 else 1.0 - norm) * peso_abs
        peso_total += peso_abs

    return soma / peso_total if peso_total else 0.0


def pontuar_modelos(candidatos):
    componentes = set()
    for dados in MODELOS.values():
        componentes.update(dados.get("pesos", {}).keys())
    for pesos in PESOS_POSICAO.values():
        componentes.update(pesos.keys())

    limites = limites_componentes(candidatos, componentes)

    modelos_base_ensemble = []

    for nome_modelo, configuracao in MODELOS.items():
        if configuracao.get("ensemble"):
            continue

        for candidato in candidatos:
            if configuracao.get("posicional"):
                pesos = PESOS_POSICAO.get(candidato["posicao"], MODELOS["V2_Balanceado"]["pesos"])
            else:
                pesos = configuracao.get("pesos", {})

            candidato["scores"][nome_modelo] = score_pesos(candidato, pesos, limites)

        if nome_modelo != "Atual_Projecao":
            modelos_base_ensemble.append(nome_modelo)

    for candidato in candidatos:
        candidato["scores"]["Ensemble"] = media_segura([
            candidato["scores"].get(nome)
            for nome in modelos_base_ensemble
        ])


def escolher_capitao(candidatos, modelo):
    if not candidatos:
        return None
    return max(candidatos, key=lambda c: c["scores"].get(modelo, -999))


def resumo_janela(rodadas, tamanho=None):
    lista = rodadas if tamanho is None else rodadas[-tamanho:]
    return {
        "quantidade": len(lista),
        "rodadas": [x["rodada"] for x in lista],
        "mediaCapitao": arredondar(media_segura([x["mediaCapitao"] for x in lista])),
        "mediaTime": arredondar(media_segura([x["mediaTime"] for x in lista])),
        "ganhoTimeVsAtual": arredondar(media_segura([x["ganhoTimeVsAtual"] for x in lista])),
    }


def painel_temporal(rodadas):
    return {
        "campeonato": resumo_janela(rodadas),
        "ultimas10": resumo_janela(rodadas, 10),
        "ultimas5": resumo_janela(rodadas, 5),
        "ultimas3": resumo_janela(rodadas, 3),
    }


def processar():
    simulacao = base.carregar_json(base.ARQUIVO_SIMULACAO)
    if not simulacao:
        raise SystemExit("[ERRO] data/simulacao-times.json não encontrado")

    rodada_aberta = base.rodada_aberta()
    avaliacoes = []

    print("=" * 64)
    print("TORNEIO CIENTÍFICO DE CAPITÃES V1")
    print("=" * 64)

    for rodada_dados in sorted(simulacao.get("rodadas", []), key=lambda x: numero(x.get("rodada"))):
        rodada = int(numero(rodada_dados.get("rodada"), 0))
        if rodada <= 0 or rodada == 2 or (rodada_aberta is not None and rodada == rodada_aberta):
            continue

        indice_hist, origem = base.indice_historico_rodada(rodada)
        if not origem.get("semVazamentoFuturo", False):
            continue

        for estrategia in rodada_dados.get("estrategias", []):
            candidatos = construir_candidatos(estrategia, indice_hist)
            if not candidatos:
                continue

            pontuar_modelos(candidatos)

            melhor_real = max(candidatos, key=lambda c: c["real"])
            capitao_atual = escolher_capitao(candidatos, "Atual_Projecao")
            pontuacao_time_atual = numero(estrategia.get("pontuacaoComCapitao"), 0)

            escolhas = {}
            for modelo in MODELOS:
                escolhido = escolher_capitao(candidatos, modelo)
                ganho_capitao = escolhido["real"] - capitao_atual["real"]
                escolhas[modelo] = {
                    "id": escolhido["id"],
                    "nome": escolhido["nome"],
                    "posicao": escolhido["posicao"],
                    "pontosCapitao": arredondar(escolhido["real"]),
                    "score": arredondar(escolhido["scores"].get(modelo), 4),
                    "ganhoCapitaoVsAtual": arredondar(ganho_capitao),
                    "pontuacaoTimeAjustada": arredondar(pontuacao_time_atual + ganho_capitao),
                    "escolheuMelhorReal": escolhido["id"] == melhor_real["id"],
                }

            avaliacoes.append({
                "rodada": rodada,
                "estrategia": estrategia.get("nome") or estrategia.get("id"),
                "dadosUtilizadosAteRodada": origem.get("dadosUtilizadosAteRodada"),
                "pontuacaoTimeAtual": arredondar(pontuacao_time_atual),
                "melhorCapitaoReal": {
                    "id": melhor_real["id"],
                    "nome": melhor_real["nome"],
                    "posicao": melhor_real["posicao"],
                    "pontos": arredondar(melhor_real["real"]),
                },
                "modelos": escolhas,
            })

    if not avaliacoes:
        raise SystemExit("[ERRO] nenhuma avaliação válida no torneio")

    baseline = "Atual_Projecao"
    ranking = []
    por_modelo_rodada = defaultdict(lambda: defaultdict(list))

    for avaliacao in avaliacoes:
        rodada = avaliacao["rodada"]
        for modelo, escolha in avaliacao["modelos"].items():
            por_modelo_rodada[modelo][rodada].append({
                "capitao": escolha["pontosCapitao"],
                "time": escolha["pontuacaoTimeAjustada"],
                "ganho": escolha["ganhoCapitaoVsAtual"],
            })

    for modelo, configuracao in MODELOS.items():
        escolhas = [a["modelos"][modelo] for a in avaliacoes]
        baseline_escolhas = [a["modelos"][baseline] for a in avaliacoes]

        vitorias = sum(1 for atual, base_atual in zip(escolhas, baseline_escolhas) if atual["pontosCapitao"] > base_atual["pontosCapitao"])
        derrotas = sum(1 for atual, base_atual in zip(escolhas, baseline_escolhas) if atual["pontosCapitao"] < base_atual["pontosCapitao"])
        empates = len(escolhas) - vitorias - derrotas
        acertos = sum(1 for x in escolhas if x["escolheuMelhorReal"])

        serie_rodadas = []
        for rodada in sorted(por_modelo_rodada[modelo]):
            itens = por_modelo_rodada[modelo][rodada]
            serie_rodadas.append({
                "rodada": rodada,
                "mediaCapitao": arredondar(media_segura([x["capitao"] for x in itens])),
                "mediaTime": arredondar(media_segura([x["time"] for x in itens])),
                "ganhoTimeVsAtual": arredondar(media_segura([x["ganho"] for x in itens])),
            })

        temporal = painel_temporal(serie_rodadas)
        media_capitao = media_segura([x["pontosCapitao"] for x in escolhas])
        media_time = media_segura([x["pontuacaoTimeAjustada"] for x in escolhas])
        ganho_medio = media_segura([x["ganhoCapitaoVsAtual"] for x in escolhas])

        # Score experimental privilegia ganho sustentável e desempenho recente.
        score = (
            ganho_medio * 2.0
            + temporal["ultimas10"]["ganhoTimeVsAtual"] * 1.5
            + temporal["ultimas5"]["ganhoTimeVsAtual"] * 1.5
            + temporal["ultimas3"]["ganhoTimeVsAtual"] * 1.0
            + percentual(vitorias, len(escolhas)) * 0.03
            + percentual(acertos, len(escolhas)) * 0.02
        )

        ranking.append({
            "modelo": modelo,
            "descricao": configuracao.get("descricao"),
            "avaliacoes": len(escolhas),
            "mediaPontosCapitao": arredondar(media_capitao),
            "mediaPontosTime": arredondar(media_time),
            "ganhoMedioTimeVsAtual": arredondar(ganho_medio),
            "vitoriasVsAtual": vitorias,
            "derrotasVsAtual": derrotas,
            "empatesVsAtual": empates,
            "taxaVitoriasVsAtual": percentual(vitorias, len(escolhas)),
            "acertosMelhorCapitaoReal": acertos,
            "taxaAcertoMelhorCapitaoReal": percentual(acertos, len(escolhas)),
            "desempenhoTemporal": temporal,
            "scoreExperimental": arredondar(score, 4),
        })

    ranking.sort(key=lambda x: (x["scoreExperimental"], x["ganhoMedioTimeVsAtual"], x["mediaPontosCapitao"]), reverse=True)
    for posicao, item in enumerate(ranking, start=1):
        item["posicao"] = posicao

    melhor = next((x for x in ranking if x["modelo"] != baseline), None)
    baseline_item = next((x for x in ranking if x["modelo"] == baseline), None)

    criterios = {
        "ganhoCampeonatoPositivo": bool(melhor and melhor["ganhoMedioTimeVsAtual"] > 0),
        "ganhoUltimas10Positivo": bool(melhor and melhor["desempenhoTemporal"]["ultimas10"]["ganhoTimeVsAtual"] > 0),
        "ganhoUltimas5Positivo": bool(melhor and melhor["desempenhoTemporal"]["ultimas5"]["ganhoTimeVsAtual"] > 0),
        "ganhoUltimas3NaoNegativo": bool(melhor and melhor["desempenhoTemporal"]["ultimas3"]["ganhoTimeVsAtual"] >= 0),
        "taxaVitoriasMinima": bool(melhor and melhor["taxaVitoriasVsAtual"] >= 25),
        "amostraMinima": len(avaliacoes) >= 45,
    }
    aprovada_proxima_etapa = all(criterios.values())

    resultado = {
        "modelo": "torneio_capitao_v1",
        "descricao": "Torneio walk-forward de oito alternativas de capitão contra o modelo atual.",
        "metodologia": {
            "semVazamentoFuturo": True,
            "tecnicoExcluido": True,
            "rodadaColdStartExcluida": 2,
            "rodadaAtualAbertaExcluida": rodada_aberta,
            "alteraCapitaoOficial": False,
            "modelosExperimentais": len(MODELOS) - 1,
        },
        "baseline": baseline_item,
        "melhorExperimental": melhor,
        "ranking": ranking,
        "criteriosProximaEtapa": criterios,
        "candidatoAprovadoParaProximaEtapa": aprovada_proxima_etapa,
        "decisao": (
            "TESTAR_VENCEDOR_NO_MOTOR_DE_ESCALACAO"
            if aprovada_proxima_etapa
            else "MANTER_CAPITAO_ATUAL_E_COLETAR_MAIS_EVIDENCIA"
        ),
        "avaliacoes": avaliacoes,
        "seguranca": {
            "promocaoAutomatica": False,
            "motorOficialAlterado": False,
        },
    }

    salvar_json(ARQUIVO_SAIDA, resultado)

    print(f"Avaliações: {len(avaliacoes)}")
    print("=" * 64)
    print("RANKING")
    print("=" * 64)
    for item in ranking:
        t = item["desempenhoTemporal"]
        print(
            f"{item['posicao']:02d}. {item['modelo']:<20} | "
            f"cap {item['mediaPontosCapitao']:.3f} | "
            f"ganho time {item['ganhoMedioTimeVsAtual']:+.3f} | "
            f"10 {t['ultimas10']['ganhoTimeVsAtual']:+.3f} | "
            f"5 {t['ultimas5']['ganhoTimeVsAtual']:+.3f} | "
            f"3 {t['ultimas3']['ganhoTimeVsAtual']:+.3f}"
        )
    print("=" * 64)
    print("Melhor experimental:", melhor["modelo"] if melhor else "nenhum")
    print("Decisão:", resultado["decisao"])
    print("Arquivo:", ARQUIVO_SAIDA)


if __name__ == "__main__":
    processar()
