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
    "Atual_Projecao": {"descricao": "Capitão atual: maior projeção do time.", "pesos": {"projecao": 1.0}},
    "V2_Balanceado": {"descricao": "Modelo V2 balanceando projeção, teto, momento, regularidade e explosão.", "pesos": {"projecao": .28,"teto": .18,"mediaRecente": .14,"regularidade": .10,"confianca": .10,"explosao": .08,"forma": .05,"potencialOfensivo": .05,"risco": -.01,"volatilidade": -.01}},
    "Piso_Regularidade": {"descricao": "Prioriza produção recorrente, piso e confiança.", "pesos": {"piso": .24,"regularidade": .22,"mediaRecente": .20,"confianca": .16,"projecao": .13,"risco": -.03,"volatilidade": -.02}},
    "Explosao_Teto": {"descricao": "Busca capitães capazes de produzir rodadas de teto alto.", "pesos": {"teto": .28,"explosao": .23,"projecao": .19,"mediaRecente": .14,"forma": .09,"potencialOfensivo": .07}},
    "Momento_Recente": {"descricao": "Favorece forma recente e tendência positiva.", "pesos": {"mediaRecente": .31,"forma": .22,"tendencia": .18,"projecao": .14,"regularidade": .10,"confianca": .05}},
    "Potencial_Ofensivo": {"descricao": "Aumenta o peso de teto, explosão e potencial ofensivo.", "pesos": {"potencialOfensivo": .31,"teto": .24,"explosao": .17,"projecao": .13,"mediaRecente": .10,"forma": .05}},
    "Anti_Risco": {"descricao": "Evita capitães muito voláteis sem abrir mão de projeção.", "pesos": {"piso": .21,"regularidade": .20,"confianca": .18,"mediaRecente": .16,"projecao": .15,"risco": -.06,"volatilidade": -.04}},
    "Posicional": {"descricao": "Pesos diferentes por posição para respeitar perfis de pontuação distintos.", "posicional": True},
    "Ensemble": {"descricao": "Combina o consenso dos modelos experimentais anteriores.", "ensemble": True},
}

PESOS_POSICAO = {
    "ATA": {"projecao": .20,"teto": .25,"explosao": .20,"potencialOfensivo": .15,"mediaRecente": .12,"forma": .08},
    "MEI": {"projecao": .18,"mediaRecente": .20,"teto": .18,"regularidade": .15,"explosao": .12,"potencialOfensivo": .10,"forma": .07},
    "LAT": {"piso": .20,"regularidade": .20,"mediaRecente": .18,"projecao": .16,"confianca": .12,"teto": .09,"risco": -.05},
    "ZAG": {"piso": .22,"regularidade": .22,"confianca": .18,"projecao": .16,"mediaRecente": .14,"risco": -.05,"volatilidade": -.03},
    "GOL": {"regularidade": .23,"piso": .20,"confianca": .18,"mediaRecente": .17,"projecao": .14,"risco": -.05,"volatilidade": -.03},
}


def numero(valor, padrao=0.0):
    try:
        if valor is None: return padrao
        n = float(valor)
        return n if math.isfinite(n) else padrao
    except Exception: return padrao


def salvar_json(caminho, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")


def media_segura(valores):
    valores = [numero(v, None) for v in valores]
    valores = [v for v in valores if v is not None and math.isfinite(v)]
    return mean(valores) if valores else 0.0


def arredondar(valor, casas=3): return round(numero(valor), casas)
def percentual(parte, total): return round(parte / total * 100.0, 2) if total else 0.0


def construir_candidatos(estrategia, indice_hist):
    nome = estrategia.get("nome") or estrategia.get("id") or "Sem nome"
    historico_por_id = indice_hist.get(str(nome).lower(), {})
    candidatos = []
    for jogador in estrategia.get("titulares", []):
        posicao = str(jogador.get("posicao") or "").upper()
        if posicao == "TEC": continue
        chave = base.id_jogador(jogador)
        origem = historico_por_id.get(chave, {}) if chave else {}
        candidatos.append({"id": chave,"nome": base.nome_jogador(jogador),"posicao": posicao,"real": numero(jogador.get("pontuacaoReal"), 0),"componentes": base.derivar_componentes(jogador, origem),"scores": {}})
    return candidatos


def limites_componentes(candidatos, componentes):
    limites = {}
    for componente in componentes:
        valores = [numero(c["componentes"].get(componente), None) for c in candidatos]
        valores = [v for v in valores if v is not None and math.isfinite(v)]
        limites[componente] = (min(valores), max(valores)) if valores else None
    return limites


def normalizado(valor, limite):
    if limite is None: return .5
    minimo, maximo = limite
    if maximo == minimo: return .5
    return max(0., min(1., (numero(valor) - minimo) / (maximo - minimo)))


def score_pesos(candidato, pesos, limites):
    soma = peso_total = 0.
    for componente, peso in pesos.items():
        limite = limites.get(componente)
        if limite is None: continue
        norm = normalizado(candidato["componentes"].get(componente), limite)
        peso_abs = abs(peso)
        soma += (norm if peso >= 0 else 1. - norm) * peso_abs
        peso_total += peso_abs
    return soma / peso_total if peso_total else 0.


def pontuar_modelos(candidatos):
    componentes = set()
    for dados in MODELOS.values(): componentes.update(dados.get("pesos", {}).keys())
    for pesos in PESOS_POSICAO.values(): componentes.update(pesos.keys())
    limites = limites_componentes(candidatos, componentes)
    modelos_base_ensemble = []
    # Fallback independente do dicionário mutável MODELOS. Isso permite que
    # experimentos (V2) injetem apenas Atual_Projecao + Posicional sem KeyError.
    pesos_fallback = MODELOS.get("V2_Balanceado", {}).get("pesos", {"projecao": 1.0})
    for nome_modelo, configuracao in MODELOS.items():
        if configuracao.get("ensemble"): continue
        for candidato in candidatos:
            if configuracao.get("posicional"):
                pesos = PESOS_POSICAO.get(candidato["posicao"], pesos_fallback)
            else:
                pesos = configuracao.get("pesos", {})
            candidato["scores"][nome_modelo] = score_pesos(candidato, pesos, limites)
        if nome_modelo != "Atual_Projecao": modelos_base_ensemble.append(nome_modelo)
    # Ensemble só existe quando foi explicitamente incluído no experimento.
    if "Ensemble" in MODELOS:
        for candidato in candidatos:
            candidato["scores"]["Ensemble"] = media_segura([candidato["scores"].get(nome) for nome in modelos_base_ensemble])


def escolher_capitao(candidatos, modelo):
    return max(candidatos, key=lambda c: c["scores"].get(modelo, -999)) if candidatos else None


def resumo_janela(rodadas, tamanho=None):
    lista = rodadas if tamanho is None else rodadas[-tamanho:]
    return {"quantidade": len(lista),"rodadas": [x["rodada"] for x in lista],"mediaCapitao": arredondar(media_segura([x["mediaCapitao"] for x in lista])),"mediaTime": arredondar(media_segura([x["mediaTime"] for x in lista])),"ganhoTimeVsAtual": arredondar(media_segura([x["ganhoTimeVsAtual"] for x in lista]))}


def painel_temporal(rodadas):
    return {"campeonato": resumo_janela(rodadas),"ultimas10": resumo_janela(rodadas, 10),"ultimas5": resumo_janela(rodadas, 5),"ultimas3": resumo_janela(rodadas, 3)}


def processar():
    simulacao = base.carregar_json(base.ARQUIVO_SIMULACAO)
    if not simulacao: raise SystemExit("[ERRO] data/simulacao-times.json não encontrado")
    rodada_aberta = base.rodada_aberta()
    avaliacoes = []
    print("=" * 64); print("TORNEIO CIENTÍFICO DE CAPITÃES V1"); print("=" * 64)
    for rodada_dados in sorted(simulacao.get("rodadas", []), key=lambda x: numero(x.get("rodada"))):
        rodada = int(numero(rodada_dados.get("rodada"), 0))
        if rodada <= 0 or rodada == 2 or (rodada_aberta is not None and rodada == rodada_aberta): continue
        indice_hist, origem = base.indice_historico_rodada(rodada)
        if not origem.get("semVazamentoFuturo", False): continue
        for estrategia in rodada_dados.get("estrategias", []):
            candidatos = construir_candidatos(estrategia, indice_hist)
            if not candidatos: continue
            pontuar_modelos(candidatos)
            melhor_real = max(candidatos, key=lambda c: c["real"])
            capitao_atual = escolher_capitao(candidatos, "Atual_Projecao")
            pontuacao_time_atual = numero(estrategia.get("pontuacaoComCapitao"), 0)
            escolhas = {}
            for modelo in MODELOS:
                escolhido = escolher_capitao(candidatos, modelo)
                ganho_capitao = escolhido["real"] - capitao_atual["real"]
                escolhas[modelo] = {"id": escolhido["id"],"nome": escolhido["nome"],"posicao": escolhido["posicao"],"pontosCapitao": arredondar(escolhido["real"]),"score": arredondar(escolhido["scores"].get(modelo), 4),"ganhoCapitaoVsAtual": arredondar(ganho_capitao),"pontuacaoTimeAjustada": arredondar(pontuacao_time_atual + ganho_capitao),"escolheuMelhorReal": escolhido["id"] == melhor_real["id"]}
            avaliacoes.append({"rodada": rodada,"estrategia": estrategia.get("nome") or estrategia.get("id"),"dadosUtilizadosAteRodada": origem.get("dadosUtilizadosAteRodada"),"pontuacaoTimeAtual": arredondar(pontuacao_time_atual),"melhorCapitaoReal": {"id": melhor_real["id"],"nome": melhor_real["nome"],"posicao": melhor_real["posicao"],"pontos": arredondar(melhor_real["real"])},"modelos": escolhas})
    if not avaliacoes: raise SystemExit("[ERRO] nenhuma avaliação válida no torneio")
    baseline = "Atual_Projecao"
    ranking = []
    por_modelo_rodada = defaultdict(lambda: defaultdict(list))
    for avaliacao in avaliacoes:
        rodada = avaliacao["rodada"]
        for modelo, escolha in avaliacao["modelos"].items():
            por_modelo_rodada[modelo][rodada].append({"capitao": escolha["pontosCapitao"],"time": escolha["pontuacaoTimeAjustada"],"ganho": escolha["ganhoCapitaoVsAtual"],"acertou": escolha["escolheuMelhorReal"]})
    for modelo in MODELOS:
        rodadas_modelo = []
        vitorias = empates = derrotas = acertos = total_escolhas = 0
        for rodada in sorted(por_modelo_rodada[modelo]):
            itens = por_modelo_rodada[modelo][rodada]
            media_capitao = media_segura([x["capitao"] for x in itens]); media_time = media_segura([x["time"] for x in itens]); ganho = media_segura([x["ganho"] for x in itens])
            acertos += sum(1 for x in itens if x["acertou"]); total_escolhas += len(itens)
            if modelo != baseline:
                if ganho > .001: vitorias += 1
                elif ganho < -.001: derrotas += 1
                else: empates += 1
            rodadas_modelo.append({"rodada": rodada,"mediaCapitao": arredondar(media_capitao),"mediaTime": arredondar(media_time),"ganhoTimeVsAtual": arredondar(ganho)})
        ranking.append({"modelo": modelo,"descricao": MODELOS[modelo].get("descricao"),"rodadasAvaliadas": len(rodadas_modelo),"mediaCapitao": arredondar(media_segura([x["mediaCapitao"] for x in rodadas_modelo])),"mediaTime": arredondar(media_segura([x["mediaTime"] for x in rodadas_modelo])),"ganhoMedioTimeVsAtual": arredondar(media_segura([x["ganhoTimeVsAtual"] for x in rodadas_modelo])),"vitoriasVsAtual": vitorias,"empatesVsAtual": empates,"derrotasVsAtual": derrotas,"taxaVitoriasVsAtual": percentual(vitorias, vitorias + empates + derrotas),"taxaMelhorCapitaoReal": percentual(acertos, total_escolhas),"desempenhoTemporal": painel_temporal(rodadas_modelo)})
    ranking.sort(key=lambda x: (x["ganhoMedioTimeVsAtual"], x["taxaVitoriasVsAtual"], x["taxaMelhorCapitaoReal"]), reverse=True)
    for i, item in enumerate(ranking, 1): item["posicao"] = i
    experimentais = [x for x in ranking if x["modelo"] != baseline]
    melhor = experimentais[0] if experimentais else None
    saida = {"modelo": "torneio_capitao_v1","descricao": "Comparação walk-forward de modelos de capitão sem alterar o modelo oficial.","baseline": baseline,"avaliacoes": len(avaliacoes),"modelosTestados": len(MODELOS),"ranking": ranking,"melhorExperimental": melhor,"seguranca": {"alteraCapitaoOficial": False,"promocaoAutomatica": False,"semVazamentoFuturo": True}}
    salvar_json(ARQUIVO_SAIDA, saida)
    print("=" * 64); print("RESULTADO DO TORNEIO DE CAPITÃES"); print("=" * 64)
    for item in ranking:
        t = item["desempenhoTemporal"]
        print(f"{item['posicao']:02d}. {item['modelo']:<20} | camp {item['ganhoMedioTimeVsAtual']:+.3f} | 10 {t['ultimas10']['ganhoTimeVsAtual']:+.3f} | 5 {t['ultimas5']['ganhoTimeVsAtual']:+.3f} | 3 {t['ultimas3']['ganhoTimeVsAtual']:+.3f}")
    if melhor: print("Melhor experimental:", melhor["modelo"])


if __name__ == "__main__": processar()
