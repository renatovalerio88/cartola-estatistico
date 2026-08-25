"""Reprocessa rodadas oficialmente encerradas com capitão 1,5x, banco e Reserva de Luxo.

Camada V2.1 diagnóstica e de apoio ao Histórico do site. Usa somente escalações
pré-rodada já congeladas e resultados posteriores. A rodada corrente só entra
quando houver resultado pós-rodada explícito e suficiente; com mercado aberto,
a rodada-alvo fica automaticamente fora do retrospectivo.
"""
from __future__ import annotations

import json
from pathlib import Path
from statistics import mean

BASE = Path(__file__).resolve().parents[2]
ESC = BASE / "data" / "historico-escalacoes"
HIST = BASE / "data" / "historico"
API = BASE / "data" / "api"
SAIDA = BASE / "data" / "pontuacao-final-cartola-v21.json"
MIN_COBERTURA_RESULTADO = 100


def carregar(p: Path):
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def lista(d):
    if isinstance(d, list):
        return d
    if not isinstance(d, dict):
        return []
    for k in ("jogadores", "atletas", "pontuados"):
        v = d.get(k)
        if isinstance(v, list):
            return v
        if isinstance(v, dict):
            return [dict(x, id=x.get("id", atleta_id)) for atleta_id, x in v.items() if isinstance(x, dict)]
    return []


def aid(j):
    for k in ("id", "atletaId", "atleta_id"):
        if j.get(k) is not None:
            return str(j[k])
    return ""


def pos(j):
    p = str(j.get("posicao") or j.get("posicaoNome") or "").upper()
    mapa = {
        "GOLEIRO": "GOL",
        "LATERAL": "LAT",
        "ZAGUEIRO": "ZAG",
        "MEIA": "MEI",
        "ATACANTE": "ATA",
        "TECNICO": "TEC",
        "TÉCNICO": "TEC",
    }
    return mapa.get(p, p)


def num(v):
    try:
        return float(v)
    except Exception:
        return 0.0


def qualidade_resultado(xs):
    """Prefere snapshot pós-rodada com pontuação real e atuação explícita."""
    if not xs:
        return (-1, -1, -1)
    com_pontos = sum(
        1 for j in xs
        if j.get("pontuacaoReal") is not None
        or j.get("pontos") is not None
        or j.get("pontuacao") is not None
    )
    com_atuacao = sum(
        1 for j in xs
        if j.get("entrouEmCampo") is not None
        or j.get("entrou_em_campo") is not None
    )
    return (com_pontos, com_atuacao, len(xs))


def resultado_completo(qualidade):
    if not qualidade:
        return False
    com_pontos, com_atuacao, _ = qualidade
    return com_pontos >= MIN_COBERTURA_RESULTADO and com_atuacao >= MIN_COBERTURA_RESULTADO


def resultado_rodada(r):
    # data/historico/rodada-XX.json pode ser snapshot pré-jogo. Escolhemos a
    # fonte com maior cobertura explícita de pontuação/atuação, priorizando API
    # pós-rodada em empate.
    caminhos = [
        API / f"rodada-{r:02d}" / "jogadores.json",
        API / f"rodada-{r:02d}" / "pontuados.json",
        HIST / f"rodada-{r:02d}" / "jogadores.json",
        HIST / f"rodada-{r:02d}.json",
    ]
    candidatos = []
    for prioridade, p in enumerate(caminhos):
        xs = lista(carregar(p))
        if xs:
            candidatos.append((qualidade_resultado(xs), -prioridade, p, xs))
    if not candidatos:
        return [], None, None
    qualidade, _, fonte, xs = max(candidatos, key=lambda x: (x[0], x[1]))
    return xs, str(fonte.relative_to(BASE)), qualidade


def indice_resultado(xs):
    out = {}
    for j in xs:
        i = aid(j)
        if not i:
            continue
        entrou = j.get("entrouEmCampo")
        if entrou is None:
            entrou = j.get("entrou_em_campo")
        pontos_raw = j.get("pontuacaoReal", j.get("pontos", j.get("pontuacao")))
        scouts = j.get("scouts") if isinstance(j.get("scouts"), dict) else {}
        out[i] = {
            "pontos": None if pontos_raw is None else num(pontos_raw),
            "entrou": bool(entrou) if entrou is not None else (pontos_raw is not None),
            "entradaInferida": entrou is None and pontos_raw is not None,
            "clube": j.get("clube") or j.get("siglaClube") or j.get("clubeSigla") or "",
            "scouts": scouts,
        }
    return out


def resumo_scouts(scouts):
    if not scouts:
        return ""
    nomes = {
        "G": "gol",
        "A": "assistência",
        "SG": "SG",
        "DS": "desarme",
        "FD": "finalização defendida",
        "FF": "finalização para fora",
        "FT": "finalização na trave",
        "CA": "cartão amarelo",
        "CV": "cartão vermelho",
        "GS": "gol sofrido",
        "PS": "pênalti sofrido",
        "PE": "pênalti perdido",
        "DE": "defesa",
        "DP": "defesa de pênalti",
    }
    partes = []
    for chave, rotulo in nomes.items():
        valor = scouts.get(chave)
        if valor in (None, 0, 0.0):
            continue
        try:
            n = float(valor)
            txt = str(int(n)) if n.is_integer() else f"{n:.1f}"
        except Exception:
            txt = str(valor)
        partes.append(f"{txt} {rotulo}")
    return ", ".join(partes[:4])


def leitura_jogador(projecao, pontos, entrou, scouts):
    if not entrou:
        return "Não entrou em campo"
    if pontos is None:
        return "Resultado indisponível"
    dif = pontos - projecao
    fatos = resumo_scouts(scouts)
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
    return f"{base} · {fatos}" if fatos else base


def avaliar(j, idx):
    r = idx.get(aid(j))
    projecao = round(num(j.get("projecao")), 2)
    pontos = None if r is None else (None if r["pontos"] is None else round(r["pontos"], 2))
    entrou = False if r is None else r["entrou"]
    scouts = {} if r is None else r.get("scouts", {})
    clube = (
        j.get("clube")
        or j.get("siglaClube")
        or ("" if r is None else r.get("clube"))
        or ""
    )
    diferenca = None if pontos is None else round(pontos - projecao, 2)
    return {
        "id": aid(j),
        "nome": j.get("nome") or j.get("apelido") or "",
        "posicao": pos(j),
        "clube": clube,
        "projecao": projecao,
        "pontos": pontos,
        "diferenca": diferenca,
        "entrou": entrou,
        "entradaInferida": False if r is None else r["entradaInferida"],
        "scouts": scouts,
        "leitura": leitura_jogador(projecao, pontos, entrou, scouts),
    }


def escolher_luxo(e):
    luxo = e.get("reservaLuxo") or e.get("reserva_de_luxo")
    if isinstance(luxo, dict):
        return luxo
    if isinstance(luxo, str):
        for j in e.get("banco", []):
            if aid(j) == luxo:
                return j
    return None


def simular(e, idx):
    titulares = [avaliar(j, idx) for j in e.get("titulares", [])]
    banco = [avaliar(j, idx) for j in e.get("banco", [])]
    capitao_id = aid(e.get("capitao") or {})
    luxo_raw = escolher_luxo(e)
    luxo_id = aid(luxo_raw or {})

    for j in titulares:
        j["capitao"] = j["id"] == capitao_id
        j["substituido"] = False
        j["reservaLuxoEntrou"] = False

    final = [dict(j) for j in titulares]
    substituicoes = []
    banco_por_pos = {j["posicao"]: j for j in banco if j["posicao"]}

    for i, t in enumerate(final):
        if t["posicao"] == "TEC" or t["entrou"]:
            continue
        reserva = banco_por_pos.get(t["posicao"])
        if reserva and reserva["entrou"] and reserva["pontos"] is not None and reserva["pontos"] > 0:
            final[i] = dict(reserva)
            substituicoes.append({
                "tipo": "banco",
                "sai": t["nome"],
                "entra": reserva["nome"],
                "posicao": t["posicao"],
                "ganho": round(reserva["pontos"], 2),
            })
            for original in titulares:
                if original["id"] == t["id"]:
                    original["substituido"] = True
                    original["leitura"] = f"Não atuou · reserva {reserva['nome']} entrou"

    luxo_aplicado = None
    luxo = next((j for j in banco if j["id"] == luxo_id), None) if luxo_id else None
    if luxo and luxo["entrou"] and luxo["pontos"] is not None:
        mesma = [(i, j) for i, j in enumerate(final) if j["posicao"] == luxo["posicao"] and j["entrou"]]
        orig = [j for j in titulares if j["posicao"] == luxo["posicao"]]
        todos_orig_jogaram = orig and all(j["entrou"] for j in orig)
        if todos_orig_jogaram and mesma:
            i, pior = min(mesma, key=lambda x: x[1]["pontos"] if x[1]["pontos"] is not None else 999)
            if pior["pontos"] is not None and luxo["pontos"] > pior["pontos"]:
                final[i] = dict(luxo)
                luxo_aplicado = {
                    "sai": pior["nome"],
                    "entra": luxo["nome"],
                    "ganho": round(luxo["pontos"] - pior["pontos"], 2),
                }
                for original in titulares:
                    if original["id"] == pior["id"]:
                        original["reservaLuxoEntrou"] = True
                        original["leitura"] += f" · Reserva de Luxo {luxo['nome']} ganhou {luxo_aplicado['ganho']:.1f} pt"

    base_original = sum(j["pontos"] or 0 for j in titulares if j["entrou"])
    base_final = sum(j["pontos"] or 0 for j in final if j["entrou"])
    cap_original = next((j for j in titulares if j["id"] == capitao_id), None)
    cap_final = next((j for j in final if j["id"] == capitao_id), None)
    bonus_cap = round(0.5 * (cap_final["pontos"] or 0), 2) if cap_final and cap_final["entrou"] else 0.0
    bonus_cap_proj = round(0.5 * (cap_original["projecao"] or 0), 2) if cap_original else 0.0
    projecao_titulares = round(sum(j["projecao"] for j in titulares), 2)
    projecao_final = round(projecao_titulares + bonus_cap_proj, 2)
    pontuacao_final = round(base_final + bonus_cap, 2)

    return {
        "perfil": e.get("nome") or e.get("perfil"),
        "formacao": e.get("formacao"),
        "projecaoTitulares": projecao_titulares,
        "bonusCapitaoProjetado15": bonus_cap_proj,
        "projecaoFinalPreJogo": projecao_final,
        "pontuacaoTitularesOriginal": round(base_original, 2),
        "pontuacaoAposBancoLuxo": round(base_final, 2),
        "bonusCapitao15": bonus_cap,
        "pontuacaoFinalCartola": pontuacao_final,
        "erroAbsolutoFinal": round(abs(pontuacao_final - projecao_final), 2),
        "capitao": cap_original["nome"] if cap_original else None,
        "titularesQueNaoAtuaram": [j["nome"] for j in titulares if j["posicao"] != "TEC" and not j["entrou"]],
        "substituicoesBanco": substituicoes,
        "reservaLuxoAplicada": luxo_aplicado,
        "reservaLuxoIdentificada": bool(luxo_id),
        "pontosRecuperadosBancoLuxo": round(base_final - base_original, 2),
        "entradasInferidas": sum(1 for j in titulares + banco if j["entradaInferida"]),
        "jogadores": titulares,
    }


def limite_retrospectivo():
    status = carregar(API / "status.json") or {}
    atual = int(status.get("rodada_atual") or 0)
    mercado = int(status.get("status_mercado") or 0)
    bola = bool(status.get("bola_rolando"))

    # Mercado aberto: a rodada atual é a rodada-alvo e jamais entra no treino.
    # Mercado fechado/sem jogo: permitimos testar a rodada atual, mas ela só é
    # processada se houver snapshot pós-rodada completo.
    limite = atual if mercado == 2 and not bola else max(0, atual - 1)
    return limite, {
        "rodadaAtual": atual,
        "statusMercado": mercado,
        "bolaRolando": bola,
    }


def main():
    limite, status_meta = limite_retrospectivo()
    rodadas = []
    fontes = {}
    ignoradas_incompletas = []

    for r in range(1, limite + 1):
        esc = carregar(ESC / f"rodada-{r:02d}.json")
        if not esc:
            continue
        resultados, fonte, qualidade = resultado_rodada(r)
        if not resultado_completo(qualidade):
            ignoradas_incompletas.append({
                "rodada": r,
                "fonte": fonte,
                "qualidade": list(qualidade) if qualidade else None,
            })
            continue
        idx = indice_resultado(resultados)
        if not idx:
            continue
        times = [simular(e, idx) for e in esc.get("estrategias", [])]
        if times:
            fontes[str(r)] = {"fonte": fonte, "qualidade": list(qualidade)}
            rodadas.append({"rodada": r, "fonteResultado": fonte, "times": times})

    todos = [t for r in rodadas for t in r["times"]]
    processadas = [int(r["rodada"]) for r in rodadas]
    ultima_processada = max(processadas, default=0)
    rodada_atual_incluida = bool(status_meta["rodadaAtual"] and status_meta["rodadaAtual"] in processadas)

    perfis = {}
    for perfil in ("Conservador", "Equilibrado", "Agressivo"):
        itens = [t for t in todos if t["perfil"] == perfil]
        if not itens:
            continue
        perfis[perfil] = {
            "rodadas": len(itens),
            "mediaProjetada": round(mean(t["projecaoFinalPreJogo"] for t in itens), 3),
            "mediaReal": round(mean(t["pontuacaoFinalCartola"] for t in itens), 3),
            "maeTime": round(mean(t["erroAbsolutoFinal"] for t in itens), 3),
            "mediaBancoLuxo": round(mean(t["pontosRecuperadosBancoLuxo"] for t in itens), 3),
        }

    saida = {
        "modelo": "pontuacao_final_cartola_v21",
        "politicaRetrospectiva": "somente rodadas com resultado pós-rodada explícito; rodada-alvo de mercado aberto fica fora automaticamente",
        "statusColeta": status_meta,
        "rodadaMaximaCandidata": limite,
        "rodadaMaximaProcessada": ultima_processada,
        "rodadaAtualIncluida": rodada_atual_incluida,
        "rodadasIgnoradasPorResultadoIncompleto": ignoradas_incompletas,
        "regras": {
            "capitao": "1,5x",
            "banco": "mesma posição; reserva atua e pontua > 0",
            "reservaLuxo": "aplicada apenas quando identificada no snapshot e regra é verificável",
        },
        "fontesResultado": fontes,
        "rodadas": rodadas,
        "resumoPorPerfil": perfis,
        "resumo": {
            "rodadasProcessadas": len(rodadas),
            "timesProcessados": len(todos),
            "mediaTitularesOriginal": round(mean([t["pontuacaoTitularesOriginal"] for t in todos]), 3) if todos else 0,
            "mediaFinalCartola": round(mean([t["pontuacaoFinalCartola"] for t in todos]), 3) if todos else 0,
            "mediaRecuperadaBancoLuxo": round(mean([t["pontosRecuperadosBancoLuxo"] for t in todos]), 3) if todos else 0,
            "timesComLuxoIdentificada": sum(t["reservaLuxoIdentificada"] for t in todos),
            "substituicoesBanco": sum(len(t["substituicoesBanco"]) for t in todos),
            "naoAtuacoesTitulares": sum(len(t["titularesQueNaoAtuaram"]) for t in todos),
            "entradasInferidas": sum(t["entradasInferidas"] for t in todos),
        },
        "gate": {
            "aptaParaRankingFinal": bool(todos) and all(t["entradasInferidas"] == 0 for t in todos),
            "motivo": "Exige flag de atuação explícita para todos os atletas usados; inferência por presença não é suficiente para promoção científica.",
        },
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(saida["statusColeta"] | saida["resumo"] | saida["gate"] | {
        "rodadaMaximaCandidata": saida["rodadaMaximaCandidata"],
        "rodadaMaximaProcessada": saida["rodadaMaximaProcessada"],
        "rodadaAtualIncluida": saida["rodadaAtualIncluida"],
        "resumoPorPerfil": saida["resumoPorPerfil"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
