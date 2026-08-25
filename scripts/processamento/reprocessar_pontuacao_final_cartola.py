"""Reprocessa R1-R23 com capitão 1,5x, banco e Reserva de Luxo.

Camada V2.1 diagnóstica: não altera a V2 de produção. Usa somente escalações
pré-rodada já congeladas e resultados posteriores. R24 fica excluída.
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
    mapa = {"GOLEIRO":"GOL","LATERAL":"LAT","ZAGUEIRO":"ZAG","MEIA":"MEI","ATACANTE":"ATA","TECNICO":"TEC","TÉCNICO":"TEC"}
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
    com_pontos = sum(1 for j in xs if j.get("pontuacaoReal") is not None or j.get("pontos") is not None or j.get("pontuacao") is not None)
    com_atuacao = sum(1 for j in xs if j.get("entrouEmCampo") is not None or j.get("entrou_em_campo") is not None)
    return (com_pontos, com_atuacao, len(xs))


def resultado_rodada(r):
    # O arquivo data/historico/rodada-XX.json pode ser um snapshot pré-jogo e
    # conter projeções, não o resultado final. Escolhemos a fonte com maior
    # cobertura explícita de pontuação/atuação, priorizando API pós-rodada em empate.
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
        out[i] = {
            "pontos": None if pontos_raw is None else num(pontos_raw),
            "entrou": bool(entrou) if entrou is not None else (pontos_raw is not None),
            "entradaInferida": entrou is None and pontos_raw is not None,
        }
    return out


def avaliar(j, idx):
    r = idx.get(aid(j))
    return {
        "id": aid(j), "nome": j.get("nome") or j.get("apelido") or "",
        "posicao": pos(j), "projecao": round(num(j.get("projecao")), 2),
        "pontos": None if r is None else (None if r["pontos"] is None else round(r["pontos"], 2)),
        "entrou": False if r is None else r["entrou"],
        "entradaInferida": False if r is None else r["entradaInferida"],
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

    final = [dict(j) for j in titulares]
    substituicoes = []
    banco_por_pos = {j["posicao"]: j for j in banco if j["posicao"]}

    for i, t in enumerate(final):
        if t["posicao"] == "TEC" or t["entrou"]:
            continue
        reserva = banco_por_pos.get(t["posicao"])
        if reserva and reserva["entrou"] and reserva["pontos"] is not None and reserva["pontos"] > 0:
            final[i] = dict(reserva)
            substituicoes.append({"tipo":"banco", "sai":t["nome"], "entra":reserva["nome"], "posicao":t["posicao"], "ganho":round(reserva["pontos"],2)})

    luxo_aplicado = None
    luxo = next((j for j in banco if j["id"] == luxo_id), None) if luxo_id else None
    if luxo and luxo["entrou"] and luxo["pontos"] is not None:
        mesma = [(i,j) for i,j in enumerate(final) if j["posicao"] == luxo["posicao"] and j["entrou"]]
        orig = [j for j in titulares if j["posicao"] == luxo["posicao"]]
        todos_orig_jogaram = orig and all(j["entrou"] for j in orig)
        if todos_orig_jogaram and mesma:
            i, pior = min(mesma, key=lambda x: x[1]["pontos"] if x[1]["pontos"] is not None else 999)
            if pior["pontos"] is not None and luxo["pontos"] > pior["pontos"]:
                final[i] = dict(luxo)
                luxo_aplicado = {"sai":pior["nome"], "entra":luxo["nome"], "ganho":round(luxo["pontos"]-pior["pontos"],2)}

    base_original = sum(j["pontos"] or 0 for j in titulares if j["entrou"])
    base_final = sum(j["pontos"] or 0 for j in final if j["entrou"])
    cap = next((j for j in final if j["id"] == capitao_id), None)
    bonus_cap = round(0.5 * (cap["pontos"] or 0), 2) if cap and cap["entrou"] else 0.0

    return {
        "perfil": e.get("nome") or e.get("perfil"), "formacao": e.get("formacao"),
        "projecaoTitulares": round(sum(j["projecao"] for j in titulares),2),
        "pontuacaoTitularesOriginal": round(base_original,2),
        "pontuacaoAposBancoLuxo": round(base_final,2), "bonusCapitao15": bonus_cap,
        "pontuacaoFinalCartola": round(base_final + bonus_cap, 2),
        "titularesQueNaoAtuaram": [j["nome"] for j in titulares if j["posicao"] != "TEC" and not j["entrou"]],
        "substituicoesBanco": substituicoes, "reservaLuxoAplicada": luxo_aplicado,
        "reservaLuxoIdentificada": bool(luxo_id), "pontosRecuperadosBancoLuxo": round(base_final-base_original,2),
        "entradasInferidas": sum(1 for j in titulares+banco if j["entradaInferida"]), "jogadores": titulares,
    }


def main():
    rodadas = []
    fontes = {}
    for r in range(1, 24):
        esc = carregar(ESC / f"rodada-{r:02d}.json")
        if not esc:
            continue
        resultados, fonte, qualidade = resultado_rodada(r)
        idx = indice_resultado(resultados)
        if not idx:
            continue
        times = [simular(e, idx) for e in esc.get("estrategias", [])]
        if times:
            fontes[str(r)] = {"fonte": fonte, "qualidade": list(qualidade)}
            rodadas.append({"rodada":r, "fonteResultado":fonte, "times":times})

    todos = [t for r in rodadas for t in r["times"]]
    saida = {
        "modelo":"pontuacao_final_cartola_v21", "r24Excluida":True,
        "regras":{"capitao":"1,5x", "banco":"mesma posição; reserva atua e pontua > 0", "reservaLuxo":"aplicada apenas quando identificada no snapshot e regra é verificável"},
        "fontesResultado": fontes, "rodadas":rodadas,
        "resumo":{
            "rodadasProcessadas":len(rodadas), "timesProcessados":len(todos),
            "mediaTitularesOriginal":round(mean([t["pontuacaoTitularesOriginal"] for t in todos]),3) if todos else 0,
            "mediaFinalCartola":round(mean([t["pontuacaoFinalCartola"] for t in todos]),3) if todos else 0,
            "mediaRecuperadaBancoLuxo":round(mean([t["pontosRecuperadosBancoLuxo"] for t in todos]),3) if todos else 0,
            "timesComLuxoIdentificada":sum(t["reservaLuxoIdentificada"] for t in todos),
            "substituicoesBanco":sum(len(t["substituicoesBanco"]) for t in todos),
            "naoAtuacoesTitulares":sum(len(t["titularesQueNaoAtuaram"]) for t in todos),
            "entradasInferidas":sum(t["entradasInferidas"] for t in todos),
        },
        "gate":{"aptaParaRankingFinal": bool(todos) and all(t["entradasInferidas"] == 0 for t in todos), "motivo":"Exige flag de atuação explícita para todos os atletas usados; inferência por presença não é suficiente para promoção científica."}
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(saida["resumo"] | saida["gate"], ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
