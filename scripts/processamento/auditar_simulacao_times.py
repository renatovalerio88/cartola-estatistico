"""
CARTOLA ESTATÍSTICO
Auditoria Científica da Simulação de Times - V2

Compatível com simulacao_times_v3 e ranking_simulacao_v3.
Preserva a validação estrutural e remove a falsa reprovação
causada apenas pela evolução da versão do ranking.
"""

from pathlib import Path
from statistics import mean
import json
import math

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PASTA_DATA = BASE_DIR / "data"
PASTA_ESCALACOES = PASTA_DATA / "historico-escalacoes"
ARQUIVO_SIMULACAO = PASTA_DATA / "simulacao-times.json"
ARQUIVO_RANKING = PASTA_DATA / "ranking-simulacao.json"
ARQUIVO_SAIDA = PASTA_DATA / "auditoria-simulacao-times.json"

ESTRATEGIAS_ESPERADAS = {"Conservador", "Equilibrado", "Agressivo"}
MINIMO_RODADAS = 5
COBERTURA_MINIMA = 90.0
COBERTURA_IDEAL = 98.0


def carregar_json(caminho):
    if not caminho.exists():
        return None
    try:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except Exception as erro:
        print(f"[ERRO] Falha ao ler {caminho}: {erro}")
        return None


def salvar_json(caminho, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def numero(valor, padrao=0.0):
    try:
        if valor is None:
            return padrao
        n = float(valor)
        return n if math.isfinite(n) else padrao
    except Exception:
        return padrao


def teste(nome, aprovado, detalhes=None, critico=True):
    return {
        "teste": nome,
        "aprovado": bool(aprovado),
        "critico": bool(critico),
        "detalhes": detalhes,
    }


def auditar_rodadas(simulacao):
    rodadas = simulacao.get("rodadas", [])
    coberturas = []
    estrategias_encontradas = set()
    problemas = []
    quantidade_times = 0
    times_completos = 0
    capitaes = 0
    capitaes_validos = 0
    sem_vazamento = 0
    origem_aprovada = 0

    for rodada in rodadas:
        r = rodada.get("rodada")
        dados_ate = rodada.get("dadosUtilizadosAteRodada")
        temporal_ok = (
            rodada.get("semVazamentoFuturo", False)
            and r is not None
            and dados_ate is not None
            and numero(dados_ate, -999) < numero(r, -999)
        )
        if temporal_ok:
            sem_vazamento += 1
        else:
            problemas.append({
                "rodada": r,
                "tipo": "possivel_vazamento_futuro",
                "dadosUtilizadosAteRodada": dados_ate,
            })

        if rodada.get("auditoriaEscalacaoAprovada", False):
            origem_aprovada += 1

        nomes_rodada = set()
        for estrategia in rodada.get("estrategias", []):
            quantidade_times += 1
            nome = estrategia.get("nome")
            if nome:
                nomes_rodada.add(nome)
                estrategias_encontradas.add(nome)

            qtd = int(numero(
                estrategia.get("quantidadeTitulares", len(estrategia.get("titulares", [])))
            ))
            if qtd == 12:
                times_completos += 1
            else:
                problemas.append({
                    "rodada": r,
                    "estrategia": nome,
                    "tipo": "quantidade_titulares_invalida",
                    "quantidade": qtd,
                })

            cobertura = numero(estrategia.get("coberturaResultadosPercentual"), 0)
            coberturas.append(cobertura)

            capitao = estrategia.get("capitao")
            if isinstance(capitao, dict):
                capitaes += 1
                if capitao.get("encontrado", False):
                    capitaes_validos += 1

        faltantes = ESTRATEGIAS_ESPERADAS - nomes_rodada
        if faltantes:
            problemas.append({
                "rodada": r,
                "tipo": "estrategias_ausentes",
                "estrategias": sorted(faltantes),
            })

    total_rodadas = len(rodadas)
    cobertura_media = mean(coberturas) if coberturas else 0.0

    def pct(parte, total):
        return round((parte / total * 100), 2) if total else 0.0

    return {
        "quantidadeRodadas": total_rodadas,
        "quantidadeTimes": quantidade_times,
        "estrategiasEncontradas": sorted(estrategias_encontradas),
        "coberturaMediaPercentual": round(cobertura_media, 2),
        "taxaTimesCompletosPercentual": pct(times_completos, quantidade_times),
        "taxaCapitaesValidosPercentual": pct(capitaes_validos, capitaes),
        "taxaSemVazamentoPercentual": pct(sem_vazamento, total_rodadas),
        "taxaAuditoriaOrigemPercentual": pct(origem_aprovada, total_rodadas),
        "problemas": problemas,
    }


def auditar_arquivos_historicos(simulacao):
    rodadas = simulacao.get("rodadasProcessadas")
    if not isinstance(rodadas, list) or not rodadas:
        rodadas = [r.get("rodada") for r in simulacao.get("rodadas", [])]

    existentes, ausentes, invalidos = [], [], []
    for rodada in rodadas:
        try:
            r = int(rodada)
        except Exception:
            invalidos.append(rodada)
            continue
        caminho = PASTA_ESCALACOES / f"rodada-{r:02d}.json"
        dados = carregar_json(caminho)
        if isinstance(dados, dict):
            existentes.append(r)
        elif caminho.exists():
            invalidos.append(r)
        else:
            ausentes.append(r)

    return {
        "esperados": len(rodadas),
        "existentes": len(existentes),
        "rodadasExistentes": existentes,
        "rodadasAusentes": ausentes,
        "rodadasInvalidas": invalidos,
    }


def auditar_ranking(simulacao, ranking):
    lista = ranking.get("ranking", [])
    nomes_ranking = {x.get("nome") for x in lista if x.get("nome")}
    nomes_simulacao = {
        e.get("nome")
        for r in simulacao.get("rodadas", [])
        for e in r.get("estrategias", [])
        if e.get("nome")
    }
    melhor = ranking.get("melhorEstrategia")
    primeiro = lista[0].get("nome") if lista else None
    posicoes_validas = all(
        item.get("posicao") == indice
        for indice, item in enumerate(lista, start=1)
    )
    return {
        "estrategiasSimulacao": sorted(nomes_simulacao),
        "estrategiasRanking": sorted(nomes_ranking),
        "mesmasEstrategias": nomes_ranking == nomes_simulacao,
        "melhorEstrategia": melhor,
        "primeiroRanking": primeiro,
        "melhorEstrategiaConsistente": melhor == primeiro,
        "posicoesRankingValidas": posicoes_validas,
    }


def processar():
    print("==============================================")
    print("CARTOLA ESTATÍSTICO")
    print("AUDITORIA CIENTÍFICA DA SIMULAÇÃO V2")
    print("==============================================")

    simulacao = carregar_json(ARQUIVO_SIMULACAO) or {}
    ranking = carregar_json(ARQUIVO_RANKING) or {}

    auditoria_rodadas = auditar_rodadas(simulacao)
    auditoria_arquivos = auditar_arquivos_historicos(simulacao)
    auditoria_ranking = auditar_ranking(simulacao, ranking)

    cobertura = auditoria_rodadas["coberturaMediaPercentual"]
    testes = [
        teste("simulacao_existe", bool(simulacao), simulacao.get("modelo")),
        teste("versao_simulacao", simulacao.get("modelo") == "simulacao_times_v3", simulacao.get("modelo")),
        teste("ranking_existe", bool(ranking), ranking.get("modelo")),
        teste(
            "versao_ranking",
            ranking.get("modelo") in {"ranking_simulacao_v2", "ranking_simulacao_v3"},
            ranking.get("modelo"),
        ),
        teste("amostra_minima", auditoria_rodadas["quantidadeRodadas"] >= MINIMO_RODADAS),
        teste("estrategias_completas", set(auditoria_rodadas["estrategiasEncontradas"]) == ESTRATEGIAS_ESPERADAS),
        teste("arquivos_historicos_presentes", not auditoria_arquivos["rodadasAusentes"] and not auditoria_arquivos["rodadasInvalidas"]),
        teste("sem_vazamento_futuro", auditoria_rodadas["taxaSemVazamentoPercentual"] == 100.0),
        teste("auditoria_origem", auditoria_rodadas["taxaAuditoriaOrigemPercentual"] == 100.0),
        teste("times_completos", auditoria_rodadas["taxaTimesCompletosPercentual"] == 100.0),
        teste("cobertura_resultados", cobertura >= COBERTURA_MINIMA),
        teste("cobertura_ideal", cobertura >= COBERTURA_IDEAL, critico=False),
        teste("capitaes_validos", auditoria_rodadas["taxaCapitaesValidosPercentual"] >= COBERTURA_MINIMA),
        teste("ranking_mesmas_estrategias", auditoria_ranking["mesmasEstrategias"]),
        teste("ranking_posicoes_validas", auditoria_ranking["posicoesRankingValidas"]),
        teste("ranking_melhor_consistente", auditoria_ranking["melhorEstrategiaConsistente"]),
        teste("auditoria_interna_simulacao", simulacao.get("auditoria", {}).get("aprovada", False)),
        teste("auditoria_interna_ranking", ranking.get("auditoria", {}).get("aprovada", False)),
    ]

    falhas_criticas = [t for t in testes if t["critico"] and not t["aprovado"]]
    alertas = [t for t in testes if not t["critico"] and not t["aprovado"]]
    pesos = [2 if t["critico"] else 1 for t in testes]
    pontos = [peso if t["aprovado"] else 0 for t, peso in zip(testes, pesos)]
    score = round(sum(pontos) / sum(pesos) * 100, 2) if pesos else 0.0
    aprovado = not falhas_criticas

    resultado = {
        "modelo": "auditoria_simulacao_times_v2",
        "descricao": "Auditoria científica compatível com ranking histórico V3.",
        "configuracao": {
            "minimoRodadas": MINIMO_RODADAS,
            "coberturaMinima": COBERTURA_MINIMA,
            "coberturaIdeal": COBERTURA_IDEAL,
            "estrategiasEsperadas": sorted(ESTRATEGIAS_ESPERADAS),
        },
        "resumo": {
            "rodadas": auditoria_rodadas["quantidadeRodadas"],
            "timesAvaliados": auditoria_rodadas["quantidadeTimes"],
            "coberturaMediaPercentual": cobertura,
            "taxaTimesCompletosPercentual": auditoria_rodadas["taxaTimesCompletosPercentual"],
            "taxaCapitaesValidosPercentual": auditoria_rodadas["taxaCapitaesValidosPercentual"],
            "taxaSemVazamentoPercentual": auditoria_rodadas["taxaSemVazamentoPercentual"],
            "scoreQualidade": score,
            "testes": len(testes),
            "falhasCriticas": len(falhas_criticas),
            "alertas": len(alertas),
        },
        "rodadas": auditoria_rodadas,
        "arquivosHistoricos": auditoria_arquivos,
        "ranking": auditoria_ranking,
        "testes": testes,
        "falhasCriticas": falhas_criticas,
        "alertas": alertas,
        "decisao": {
            "aprovada": aprovado,
            "decisao": "SIMULACAO_VALIDADA" if aprovado else "SIMULACAO_NAO_VALIDADA",
            "podeUsarRankingParaEvoluirModelo": aprovado,
        },
    }

    salvar_json(ARQUIVO_SAIDA, resultado)

    print("Rodadas:", auditoria_rodadas["quantidadeRodadas"])
    print("Times avaliados:", auditoria_rodadas["quantidadeTimes"])
    print("Cobertura:", cobertura, "%")
    print("Times completos:", auditoria_rodadas["taxaTimesCompletosPercentual"], "%")
    print("Sem vazamento:", auditoria_rodadas["taxaSemVazamentoPercentual"], "%")
    print("Capitães válidos:", auditoria_rodadas["taxaCapitaesValidosPercentual"], "%")
    print("TESTES")
    print("----------------------------------------------")
    for item in testes:
        status = "OK" if item["aprovado"] else "FALHA"
        tipo = "CRÍTICO" if item["critico"] else "ALERTA"
        print(f"[{status}] {item['teste']} ({tipo})")
    print("Score de qualidade:", score, "%")
    print("Falhas críticas:", len(falhas_criticas))
    print("Alertas:", len(alertas))
    print("DECISÃO:", resultado["decisao"]["decisao"])
    print("Arquivo:", ARQUIVO_SAIDA)
    print("==============================================")


if __name__ == "__main__":
    processar()
