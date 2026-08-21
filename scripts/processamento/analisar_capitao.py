"""
CARTOLA ESTATÍSTICO
Análise Científica de Capitão - V2

Modelo A: maior projeção da escalação.
Modelo B: score de capitão usando somente informações disponíveis
antes da rodada, provenientes de data/historico-escalacoes/rodada-XX.json.

A rodada atual ainda aberta não entra na decisão.
O script é experimental e não altera o capitão oficial automaticamente.
"""

from pathlib import Path
from statistics import mean
import json
import math

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PASTA_DATA = BASE_DIR / "data"
PASTA_ESCALACOES = PASTA_DATA / "historico-escalacoes"
ARQUIVO_SIMULACAO = PASTA_DATA / "simulacao-times.json"
ARQUIVO_STATUS = PASTA_DATA / "api" / "status.json"
ARQUIVO_SAIDA = PASTA_DATA / "analise-capitao.json"

PESOS_CAPITAO = {
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
}


def carregar_json(caminho):
    if not caminho.exists():
        return {}
    try:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except Exception as erro:
        print(f"[AVISO] Falha ao ler {caminho}: {erro}")
        return {}


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


def arredondar(valor, casas=3):
    return round(numero(valor), casas)


def percentual(parte, total):
    return round(parte / total * 100, 2) if total else 0.0


def media_segura(valores):
    valores = [numero(v, None) for v in valores]
    valores = [v for v in valores if v is not None and math.isfinite(v)]
    return mean(valores) if valores else 0.0


def rodada_aberta():
    status = carregar_json(ARQUIVO_STATUS)
    if not status:
        return None
    if numero(status.get("status_mercado")) == 1 and not status.get("bola_rolando", False):
        try:
            return int(status.get("rodada_atual"))
        except Exception:
            return None
    return None


def id_jogador(jogador):
    valor = jogador.get("id") or jogador.get("atletaId") or jogador.get("atleta_id")
    return str(valor) if valor is not None else None


def nome_jogador(jogador):
    return jogador.get("nome") or jogador.get("apelido") or jogador.get("nomeAtleta") or ""


def indice_historico_rodada(rodada):
    caminho = PASTA_ESCALACOES / f"rodada-{rodada:02d}.json"
    dados = carregar_json(caminho)
    indice = {}

    for estrategia in dados.get("estrategias", []):
        nome = estrategia.get("nome") or estrategia.get("id")
        if not nome:
            continue
        por_id = {}
        for jogador in estrategia.get("titulares", []):
            chave = id_jogador(jogador)
            if chave:
                por_id[chave] = jogador
        indice[str(nome).lower()] = por_id

    return indice, dados


def derivar_componentes(jogador, origem_historica):
    historico = origem_historica.get("historico", {}) if origem_historica else {}

    projecao = numero(jogador.get("projecao"), 0)
    jogos = numero(historico.get("jogos"), 0)
    media_geral = numero(historico.get("media"), 0)
    media3 = numero(historico.get("media3"), media_geral)
    media5 = numero(historico.get("media5"), media_geral)
    piso = numero(historico.get("piso"), media_geral)
    teto = numero(historico.get("teto"), media_geral)
    regularidade = numero(historico.get("regularidade"), 0)
    volatilidade = numero(historico.get("volatilidade"), 0)
    tendencia = numero(historico.get("tendencia"), media3 - media5)

    media_recente = media3 * 0.60 + media5 * 0.40
    confianca_amostra = min(100.0, jogos * 5.0)
    confianca = max(0.0, min(100.0, confianca_amostra * 0.55 + regularidade * 0.45))

    amplitude = max(0.0, teto - media_geral)
    explosao = max(0.0, min(100.0, amplitude * 5.0 + max(0.0, media3 - media_geral) * 4.0))
    forma = max(0.0, min(100.0, 50.0 + tendencia * 7.0))

    posicao = str(jogador.get("posicao") or "").upper()
    fator_posicao = {
        "ATA": 1.00,
        "MEI": 0.95,
        "LAT": 0.80,
        "ZAG": 0.55,
        "GOL": 0.45,
        "TEC": 0.00,
    }.get(posicao, 0.60)
    potencial_ofensivo = max(0.0, min(100.0, (media_recente * 7.0 + teto * 2.0) * fator_posicao))

    risco = max(0.0, min(100.0, (100.0 - regularidade) * 0.55 + volatilidade * 5.0 * 0.45))

    return {
        "projecao": projecao,
        "teto": teto,
        "mediaRecente": media_recente,
        "regularidade": regularidade,
        "confianca": confianca,
        "explosao": explosao,
        "forma": forma,
        "potencialOfensivo": potencial_ofensivo,
        "risco": risco,
        "volatilidade": volatilidade,
        "jogos": jogos,
        "media3": media3,
        "media5": media5,
        "piso": piso,
        "tendencia": tendencia,
    }


def normalizar_candidatos(candidatos):
    limites = {}
    for componente in PESOS_CAPITAO:
        valores = [c["componentes"].get(componente) for c in candidatos]
        valores = [numero(v) for v in valores if v is not None]
        limites[componente] = (min(valores), max(valores)) if valores else None

    for candidato in candidatos:
        soma = 0.0
        peso_usado = 0.0
        detalhamento = {}

        for componente, peso in PESOS_CAPITAO.items():
            limites_comp = limites.get(componente)
            valor = candidato["componentes"].get(componente)
            if limites_comp is None or valor is None:
                continue

            minimo, maximo = limites_comp
            norm = 0.5 if maximo == minimo else (numero(valor) - minimo) / (maximo - minimo)
            norm = max(0.0, min(1.0, norm))
            peso_abs = abs(peso)
            contribuicao = norm * peso_abs if peso >= 0 else (1.0 - norm) * peso_abs
            soma += contribuicao
            peso_usado += peso_abs
            detalhamento[componente] = {
                "valor": arredondar(valor),
                "normalizado": arredondar(norm, 4),
                "peso": peso,
                "contribuicao": arredondar(contribuicao, 5),
            }

        candidato["scoreCapitao"] = arredondar((soma / peso_usado * 100.0) if peso_usado else 0.0)
        candidato["coberturaScore"] = arredondar(
            peso_usado / sum(abs(p) for p in PESOS_CAPITAO.values()) * 100.0 if peso_usado else 0.0,
            2,
        )
        candidato["componentesScore"] = detalhamento


def analisar_estrategia(rodada, estrategia, indice_hist):
    nome = estrategia.get("nome") or estrategia.get("id") or "Sem nome"
    historico_por_id = indice_hist.get(str(nome).lower(), {})
    candidatos = []

    for jogador in estrategia.get("titulares", []):
        if str(jogador.get("posicao") or "").upper() == "TEC":
            continue
        chave = id_jogador(jogador)
        origem = historico_por_id.get(chave, {}) if chave else {}
        componentes = derivar_componentes(jogador, origem)
        candidatos.append({
            "jogador": jogador,
            "componentes": componentes,
            "real": numero(jogador.get("pontuacaoReal"), 0),
            "projecao": numero(jogador.get("projecao"), 0),
        })

    if not candidatos:
        return None

    normalizar_candidatos(candidatos)
    capitao_a = max(candidatos, key=lambda c: c["projecao"])
    capitao_b = max(candidatos, key=lambda c: c["scoreCapitao"])
    capitao_real = max(candidatos, key=lambda c: c["real"])

    pontos_a = capitao_a["real"]
    pontos_b = capitao_b["real"]
    vencedor = "B" if pontos_b > pontos_a else "A" if pontos_a > pontos_b else "EMPATE"

    def formatar(c):
        j = c["jogador"]
        return {
            "id": id_jogador(j),
            "nome": nome_jogador(j),
            "posicao": j.get("posicao"),
            "projecao": arredondar(c["projecao"]),
            "real": arredondar(c["real"]),
            "scoreCapitao": arredondar(c["scoreCapitao"]),
            "coberturaScore": arredondar(c["coberturaScore"], 2),
            "componentesScore": c["componentesScore"],
        }

    return {
        "estrategia": nome,
        "quantidadeJogadores": len(candidatos),
        "modeloA": formatar(capitao_a),
        "modeloB": formatar(capitao_b),
        "melhorCapitaoReal": formatar(capitao_real),
        "resultado": {
            "vencedor": vencedor,
            "pontosCapitaoA": arredondar(pontos_a),
            "pontosCapitaoB": arredondar(pontos_b),
            "melhorPontuacaoReal": arredondar(capitao_real["real"]),
            "ganhoBvsA": arredondar(pontos_b - pontos_a),
            "AEscolheuMelhorReal": id_jogador(capitao_a["jogador"]) == id_jogador(capitao_real["jogador"]),
            "BEscolheuMelhorReal": id_jogador(capitao_b["jogador"]) == id_jogador(capitao_real["jogador"]),
        },
    }


def gerar_resumo(registros):
    itens = [
        e
        for r in registros
        if not r.get("excluidaDaDecisao", False)
        for e in r.get("estrategias", [])
    ]
    if not itens:
        return {"avaliacoes": 0}

    vitorias_a = sum(1 for x in itens if x["resultado"]["vencedor"] == "A")
    vitorias_b = sum(1 for x in itens if x["resultado"]["vencedor"] == "B")
    empates = sum(1 for x in itens if x["resultado"]["vencedor"] == "EMPATE")
    pontos_a = [x["resultado"]["pontosCapitaoA"] for x in itens]
    pontos_b = [x["resultado"]["pontosCapitaoB"] for x in itens]
    ganhos = [x["resultado"]["ganhoBvsA"] for x in itens]
    acertos_a = sum(1 for x in itens if x["resultado"]["AEscolheuMelhorReal"])
    acertos_b = sum(1 for x in itens if x["resultado"]["BEscolheuMelhorReal"])

    return {
        "avaliacoes": len(itens),
        "vitoriasA": vitorias_a,
        "vitoriasB": vitorias_b,
        "empates": empates,
        "taxaVitoriasA": percentual(vitorias_a, len(itens)),
        "taxaVitoriasB": percentual(vitorias_b, len(itens)),
        "mediaPontosA": arredondar(media_segura(pontos_a)),
        "mediaPontosB": arredondar(media_segura(pontos_b)),
        "ganhoMedioBvsA": arredondar(media_segura(ganhos)),
        "acertoMelhorRealA": {"quantidade": acertos_a, "taxa": percentual(acertos_a, len(itens))},
        "acertoMelhorRealB": {"quantidade": acertos_b, "taxa": percentual(acertos_b, len(itens))},
    }


def calcular_cobertura_componentes(registros):
    resultado = {}
    itens = [e for r in registros for e in r.get("estrategias", [])]
    for componente, peso in PESOS_CAPITAO.items():
        disponivel = sum(
            1
            for e in itens
            if componente in e.get("modeloB", {}).get("componentesScore", {})
        )
        resultado[componente] = {
            "peso": peso,
            "disponivel": disponivel,
            "total": len(itens),
            "cobertura": percentual(disponivel, len(itens)),
        }
    return resultado


def avaliar_formula(resumo):
    avaliacoes = int(numero(resumo.get("avaliacoes"), 0))
    ganho = numero(resumo.get("ganhoMedioBvsA"), 0)
    taxa_b = numero(resumo.get("taxaVitoriasB"), 0)
    acerto_a = numero(resumo.get("acertoMelhorRealA", {}).get("taxa"), 0)
    acerto_b = numero(resumo.get("acertoMelhorRealB", {}).get("taxa"), 0)

    criterios = [
        {"criterio": "amostra", "aprovado": avaliacoes >= 20, "valor": avaliacoes},
        {"criterio": "ganho_medio", "aprovado": ganho > 0, "valor": ganho},
        {"criterio": "taxa_vitorias_b", "aprovado": taxa_b >= 40, "valor": taxa_b},
        {"criterio": "acerto_melhor_capitao_real", "aprovado": acerto_b >= acerto_a, "modeloA": acerto_a, "modeloB": acerto_b},
    ]
    aprovada = all(c["aprovado"] for c in criterios)
    return {
        "formulaCandidataAprovada": aprovada,
        "criteriosAprovados": sum(1 for c in criterios if c["aprovado"]),
        "totalCriterios": len(criterios),
        "criterios": criterios,
        "decisao": "FORMULA_CANDIDATA_APROVADA_PARA_PROXIMA_ETAPA" if aprovada else "MANTER_CAPITAO_ATUAL",
        "promocaoAutomatica": False,
    }


def processar():
    simulacao = carregar_json(ARQUIVO_SIMULACAO)
    if not simulacao:
        raise SystemExit("[ERRO] data/simulacao-times.json não encontrado")

    aberta = rodada_aberta()
    resultados = []

    print("====================================================")
    print("ANÁLISE CIENTÍFICA DE CAPITÃO V2")
    print("====================================================")

    for rodada_dados in sorted(simulacao.get("rodadas", []), key=lambda x: numero(x.get("rodada"))):
        rodada = int(numero(rodada_dados.get("rodada"), 0))
        if rodada <= 0:
            continue

        indice_hist, origem = indice_historico_rodada(rodada)
        estrategias = []
        for estrategia in rodada_dados.get("estrategias", []):
            analise = analisar_estrategia(rodada, estrategia, indice_hist)
            if analise:
                estrategias.append(analise)

        if not estrategias:
            continue

        excluir = rodada == 2 or (aberta is not None and rodada == aberta)
        resultados.append({
            "rodada": rodada,
            "dadosUtilizadosAteRodada": origem.get("dadosUtilizadosAteRodada"),
            "semVazamentoFuturo": origem.get("semVazamentoFuturo", False),
            "excluidaDaDecisao": excluir,
            "motivoExclusao": "cold_start" if rodada == 2 else "rodada_aberta" if excluir else None,
            "estrategias": estrategias,
        })

        for e in estrategias:
            print(
                f"Rodada {rodada:02d} | {e['estrategia']} | "
                f"A: {e['resultado']['pontosCapitaoA']} | "
                f"B: {e['resultado']['pontosCapitaoB']} | "
                f"Vencedor: {e['resultado']['vencedor']}"
            )

    resumo = gerar_resumo(resultados)
    cobertura = calcular_cobertura_componentes(resultados)
    decisao = avaliar_formula(resumo)

    resultado_final = {
        "modelo": "analise_capitao_v2",
        "descricao": "Capitão V2 com histórico progressivo sem vazamento futuro.",
        "modelos": {
            "A": "maior_projecao_original",
            "B": "score_capitao_historico_v2",
        },
        "pesosCandidatos": PESOS_CAPITAO,
        "metodologia": {
            "fonteHistorica": "data/historico-escalacoes/rodada-XX.json",
            "usaSomenteDadosAnterioresARodada": True,
            "tecnicoExcluidoDosCandidatos": True,
            "rodadaAtualAbertaExcluidaDaDecisao": True,
            "coldStartExcluidoDaDecisao": True,
        },
        "resumo": resumo,
        "coberturaComponentes": cobertura,
        "decisaoExperimental": decisao,
        "rodadas": resultados,
        "seguranca": {
            "alteraMotorOficial": False,
            "alteraCapitaoOficial": False,
            "alteraPesosOficiais": False,
            "promocaoAutomatica": False,
            "necessitaValidacaoHumana": True,
        },
    }

    salvar_json(ARQUIVO_SAIDA, resultado_final)

    print("====================================================")
    print("RESULTADO DA ANÁLISE DE CAPITÃO V2")
    print("====================================================")
    print("Avaliações:", resumo.get("avaliacoes", 0))
    print("Vitórias Modelo A:", resumo.get("vitoriasA", 0))
    print("Vitórias Modelo B:", resumo.get("vitoriasB", 0))
    print("Empates:", resumo.get("empates", 0))
    print("Taxa vitórias B:", resumo.get("taxaVitoriasB", 0), "%")
    print("Média pontos capitão A:", resumo.get("mediaPontosA", 0))
    print("Média pontos capitão B:", resumo.get("mediaPontosB", 0))
    print("Ganho médio B vs A:", resumo.get("ganhoMedioBvsA", 0))
    print("Acerto melhor capitão real A:", resumo.get("acertoMelhorRealA", {}).get("taxa", 0), "%")
    print("Acerto melhor capitão real B:", resumo.get("acertoMelhorRealB", {}).get("taxa", 0), "%")
    print("===== COBERTURA DOS COMPONENTES =====")
    for componente, dados in cobertura.items():
        print(f"{componente}: {dados['cobertura']}%")
    print("===== DECISÃO =====")
    for criterio in decisao.get("criterios", []):
        print(f"[{'OK' if criterio['aprovado'] else 'FALHOU'}] {criterio['criterio']}")
    print("DECISÃO:", decisao.get("decisao"))
    print("Capitão oficial alterado: NÃO")
    print("Arquivo:", ARQUIVO_SAIDA)
    print("====================================================")


if __name__ == "__main__":
    processar()
