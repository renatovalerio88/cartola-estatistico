"""
CARTOLA ESTATÍSTICO
Ranking Histórico das Estratégias - V3

Correções V3:
- rodada atual com mercado aberto não entra nas métricas reais;
- mantém somente rodadas encerradas no ranking;
- gera médias do campeonato, últimas 10, 5 e 3 rodadas;
- preserva ranking, consistência, capitão, cobertura, MAE e vitórias.
"""

from pathlib import Path
from statistics import mean, median, pstdev
import json
import math

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PASTA_DATA = BASE_DIR / "data"
ARQUIVO_ENTRADA = PASTA_DATA / "simulacao-times.json"
ARQUIVO_STATUS = PASTA_DATA / "api" / "status.json"
ARQUIVO_SAIDA = PASTA_DATA / "ranking-simulacao.json"


def carregar_json(caminho):
    if not caminho.exists():
        return None
    try:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except Exception as erro:
        print(f"[ERRO] Não foi possível ler {caminho}: {erro}")
        return None


def salvar_json(caminho, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def numero(valor, padrao=0.0):
    try:
        if valor is None:
            return padrao
        resultado = float(valor)
        return resultado if math.isfinite(resultado) else padrao
    except Exception:
        return padrao


def media(valores):
    return mean(valores) if valores else 0.0


def mediana(valores):
    return median(valores) if valores else 0.0


def desvio(valores):
    return pstdev(valores) if len(valores) > 1 else 0.0


def rodada_atual_aberta():
    status = carregar_json(ARQUIVO_STATUS)
    if not isinstance(status, dict):
        return None

    rodada = status.get("rodada_atual")
    mercado = status.get("status_mercado")
    bola_rolando = bool(status.get("bola_rolando", False))

    # Cartola: status_mercado=1 representa mercado aberto.
    # A rodada atual ainda não possui resultado final e não pode contaminar
    # backtests, médias, MAE ou ranking.
    if rodada is not None and numero(mercado) == 1 and not bola_rolando:
        try:
            return int(rodada)
        except Exception:
            return None

    return None


def filtrar_rodadas_validas(dados):
    rodada_excluida = rodada_atual_aberta()
    validas = []
    excluidas = []

    for rodada in dados.get("rodadas", []):
        numero_rodada = rodada.get("rodada")
        try:
            numero_rodada_int = int(numero_rodada)
        except Exception:
            numero_rodada_int = None

        if rodada_excluida is not None and numero_rodada_int == rodada_excluida:
            excluidas.append(numero_rodada_int)
            continue

        validas.append(rodada)

    copia = dict(dados)
    copia["rodadas"] = validas

    return copia, sorted(set(x for x in excluidas if x is not None))


def coletar_resultados(dados):
    estrategias = {}

    for rodada in dados.get("rodadas", []):
        numero_rodada = rodada.get("rodada")

        for estrategia in rodada.get("estrategias", []):
            nome = estrategia.get("nome")
            if not nome:
                continue

            estrategias.setdefault(nome, []).append({
                "rodada": numero_rodada,
                "perfil": estrategia.get("perfil"),
                "formacao": estrategia.get("formacao"),
                "pontos": numero(estrategia.get("pontuacaoComCapitao")),
                "pontosSemCapitao": numero(estrategia.get("pontuacaoSemCapitao")),
                "bonusCapitao": numero(estrategia.get("bonusCapitao")),
                "mae": numero(estrategia.get("maeJogadores")),
                "cobertura": numero(estrategia.get("coberturaResultadosPercentual")),
                "quantidadeTitulares": int(numero(estrategia.get("quantidadeTitulares"))),
                "jogadoresEncontrados": int(numero(estrategia.get("jogadoresEncontrados"))),
                "escalacaoCompleta": bool(estrategia.get("escalacaoCompleta", False)),
            })

    for nome in estrategias:
        estrategias[nome].sort(key=lambda x: numero(x.get("rodada")))

    return estrategias


def calcular_vitorias(dados):
    vitorias = {}
    empates = {}
    participacoes = {}

    for rodada in dados.get("rodadas", []):
        pontuacoes = []

        for estrategia in rodada.get("estrategias", []):
            nome = estrategia.get("nome")
            if not nome:
                continue

            pontos = numero(estrategia.get("pontuacaoComCapitao"))
            pontuacoes.append((nome, pontos))
            participacoes[nome] = participacoes.get(nome, 0) + 1
            vitorias.setdefault(nome, 0)
            empates.setdefault(nome, 0)

        if not pontuacoes:
            continue

        maior = max(pontos for _, pontos in pontuacoes)
        vencedores = [nome for nome, pontos in pontuacoes if abs(pontos - maior) < 0.001]

        if len(vencedores) == 1:
            vitorias[vencedores[0]] += 1
        else:
            for nome in vencedores:
                empates[nome] += 1

    return {
        "vitorias": vitorias,
        "empates": empates,
        "participacoes": participacoes,
    }


def obter_melhor_rodada(resultados):
    if not resultados:
        return None
    item = max(resultados, key=lambda x: numero(x.get("pontos")))
    return {"rodada": item.get("rodada"), "pontos": round(numero(item.get("pontos")), 2)}


def obter_pior_rodada(resultados):
    if not resultados:
        return None
    item = min(resultados, key=lambda x: numero(x.get("pontos")))
    return {"rodada": item.get("rodada"), "pontos": round(numero(item.get("pontos")), 2)}


def calcular_consistencia(media_pontos, desvio_pontos):
    if media_pontos <= 0:
        return 0.0
    cv = desvio_pontos / media_pontos
    return round(max(0.0, min(100.0, 100.0 - cv * 100.0)), 2)


def calcular_score_global(media_pontos, consistencia, cobertura, taxa_vitorias, mae):
    score = (
        media_pontos * 0.65
        + consistencia * 0.10
        + cobertura * 0.10
        + taxa_vitorias * 0.15
        - mae * 0.10
    )
    return round(score, 3)


def resumo_janela(resultados, tamanho=None):
    registros = resultados if tamanho is None else resultados[-tamanho:]
    pontos = [numero(item.get("pontos")) for item in registros]

    return {
        "quantidade": len(registros),
        "rodadas": [item.get("rodada") for item in registros],
        "media": round(media(pontos), 2),
        "mediana": round(mediana(pontos), 2),
        "total": round(sum(pontos), 2),
        "desvioPadrao": round(desvio(pontos), 2),
    }


def painel_temporal(resultados):
    return {
        "campeonato": resumo_janela(resultados),
        "ultimas10": resumo_janela(resultados, 10),
        "ultimas5": resumo_janela(resultados, 5),
        "ultimas3": resumo_janela(resultados, 3),
    }


def resumir_estrategia(nome, resultados, estatisticas_vitorias):
    pontos = [numero(item.get("pontos")) for item in resultados]
    pontos_sem_capitao = [numero(item.get("pontosSemCapitao")) for item in resultados]
    bonus_capitao = [numero(item.get("bonusCapitao")) for item in resultados]
    maes = [numero(item.get("mae")) for item in resultados]
    coberturas = [numero(item.get("cobertura")) for item in resultados]
    completos = [item for item in resultados if item.get("escalacaoCompleta")]

    media_pontos = media(pontos)
    mediana_pontos = mediana(pontos)
    desvio_pontos = desvio(pontos)
    media_sem_capitao = media(pontos_sem_capitao)
    media_bonus_capitao = media(bonus_capitao)
    mae_medio = media(maes)
    cobertura_media = media(coberturas)

    vitorias = estatisticas_vitorias["vitorias"].get(nome, 0)
    empates = estatisticas_vitorias["empates"].get(nome, 0)
    participacoes = estatisticas_vitorias["participacoes"].get(nome, 0)
    taxa_vitorias = (vitorias / participacoes * 100) if participacoes else 0.0
    consistencia = calcular_consistencia(media_pontos, desvio_pontos)
    score_global = calcular_score_global(
        media_pontos,
        consistencia,
        cobertura_media,
        taxa_vitorias,
        mae_medio,
    )

    return {
        "nome": nome,
        "perfil": resultados[0].get("perfil") if resultados else None,
        "formacao": resultados[0].get("formacao") if resultados else None,
        "rodadas": len(resultados),
        "pontosTotal": round(sum(pontos), 2),
        "mediaPontos": round(media_pontos, 2),
        "medianaPontos": round(mediana_pontos, 2),
        "desvioPadrao": round(desvio_pontos, 2),
        "consistencia": consistencia,
        "mediaSemCapitao": round(media_sem_capitao, 2),
        "mediaBonusCapitao": round(media_bonus_capitao, 2),
        "ganhoMedioCapitaoPercentual": round(
            (media_bonus_capitao / media_sem_capitao * 100) if media_sem_capitao else 0.0,
            2,
        ),
        "maeMedioJogadores": round(mae_medio, 3),
        "coberturaMediaPercentual": round(cobertura_media, 2),
        "escalacoesCompletas": len(completos),
        "taxaEscalacoesCompletas": round(
            (len(completos) / len(resultados) * 100) if resultados else 0.0,
            2,
        ),
        "vitorias": vitorias,
        "empatesNaLideranca": empates,
        "taxaVitorias": round(taxa_vitorias, 2),
        "melhorRodada": obter_melhor_rodada(resultados),
        "piorRodada": obter_pior_rodada(resultados),
        "desempenhoTemporal": painel_temporal(resultados),
        "scoreGlobal": score_global,
    }


def processar():
    print("==============================================")
    print("CARTOLA ESTATÍSTICO")
    print("RANKING HISTÓRICO DAS ESTRATÉGIAS V3")
    print("==============================================")

    dados_brutos = carregar_json(ARQUIVO_ENTRADA)
    if not isinstance(dados_brutos, dict):
        print("[ERRO] simulacao-times.json inválido.")
        salvar_json(ARQUIVO_SAIDA, {
            "modelo": "ranking_simulacao_v3",
            "erro": "simulacao_times_invalida",
            "ranking": [],
        })
        return

    dados, rodadas_excluidas = filtrar_rodadas_validas(dados_brutos)
    estrategias = coletar_resultados(dados)
    estatisticas_vitorias = calcular_vitorias(dados)

    ranking = [
        resumir_estrategia(nome, resultados, estatisticas_vitorias)
        for nome, resultados in estrategias.items()
    ]

    ranking.sort(
        key=lambda item: (
            numero(item.get("scoreGlobal")),
            numero(item.get("mediaPontos")),
            numero(item.get("pontosTotal")),
        ),
        reverse=True,
    )

    for indice, item in enumerate(ranking, start=1):
        item["posicao"] = indice

    melhor_estrategia = ranking[0]["nome"] if ranking else None
    cobertura_media = media([
        numero(item.get("coberturaMediaPercentual"))
        for item in ranking
    ])

    quantidade_rodadas = len(dados.get("rodadas", []))
    auditoria_simulacao = dados_brutos.get("auditoria", {})
    auditoria_aprovada = (
        bool(ranking)
        and quantidade_rodadas > 0
        and cobertura_media >= 90
        and auditoria_simulacao.get("aprovada", False)
    )

    painel = {
        item["nome"]: item["desempenhoTemporal"]
        for item in ranking
    }

    resultado = {
        "modelo": "ranking_simulacao_v3",
        "descricao": (
            "Ranking histórico das estratégias com exclusão automática de rodada "
            "atual ainda sem resultado final e painel temporal 3/5/10/campeonato."
        ),
        "fonte": "data/simulacao-times.json",
        "modeloSimulacao": dados_brutos.get("modelo"),
        "quantidadeRodadas": quantidade_rodadas,
        "rodadasExcluidasSemResultadoFinal": rodadas_excluidas,
        "melhorEstrategia": melhor_estrategia,
        "painelTemporal": painel,
        "criterioRanking": {
            "principal": "scoreGlobal",
            "desempate1": "mediaPontos",
            "desempate2": "pontosTotal",
            "componentesScore": {
                "mediaPontos": 0.65,
                "consistencia": 0.10,
                "cobertura": 0.10,
                "taxaVitorias": 0.15,
                "penalizacaoMae": 0.10,
            },
        },
        "ranking": ranking,
        "auditoria": {
            "rankingGerado": bool(ranking),
            "estrategiasEncontradas": len(ranking),
            "rodadasAvaliadas": quantidade_rodadas,
            "rodadasExcluidasSemResultadoFinal": rodadas_excluidas,
            "coberturaMediaPercentual": round(cobertura_media, 2),
            "simulacaoOrigemAprovada": auditoria_simulacao.get("aprovada", False),
            "aprovada": auditoria_aprovada,
        },
    }

    salvar_json(ARQUIVO_SAIDA, resultado)

    print()
    print("Rodadas válidas avaliadas:", quantidade_rodadas)
    print("Rodadas excluídas sem resultado final:", rodadas_excluidas)
    print("Estratégias:", len(ranking))
    print()

    for item in ranking:
        temporal = item["desempenhoTemporal"]
        print(
            f"#{item['posicao']} {item['nome']} | "
            f"Campeonato: {temporal['campeonato']['media']:.2f} | "
            f"Últimas 10: {temporal['ultimas10']['media']:.2f} | "
            f"Últimas 5: {temporal['ultimas5']['media']:.2f} | "
            f"Últimas 3: {temporal['ultimas3']['media']:.2f} | "
            f"Score: {item['scoreGlobal']:.3f}"
        )

    print()
    print("Melhor estratégia:", melhor_estrategia)
    print("Cobertura média:", round(cobertura_media, 2), "%")
    print("Auditoria:", "APROVADA" if auditoria_aprovada else "REPROVADA")
    print("Arquivo:", ARQUIVO_SAIDA)
    print("==============================================")


if __name__ == "__main__":
    processar()
