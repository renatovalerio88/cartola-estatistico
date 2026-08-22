"""Avalia conflitos defesa x ataque adversário nas escalações históricas.

Objetivo: medir prevalência e desempenho de escalações que combinam
GOL/LAT/ZAG de um clube com MEI/ATA do adversário. Não promove regra
automaticamente; apenas gera evidência para decidir entre baseline,
penalização ou bloqueio.
"""
from pathlib import Path
import json
from statistics import mean

ROOT = Path(__file__).resolve().parents[2]
SIMULACAO = ROOT / "data" / "simulacao-times.json"
API = ROOT / "data" / "api"
SAIDA = ROOT / "data" / "avaliacao-anti-conflito.json"

DEF = {"GOL", "LAT", "ZAG"}
ATAQUE = {"MEI", "ATA"}


def ler(path):
    return json.loads(path.read_text(encoding="utf-8"))


def pares_partidas(rodada):
    path = API / f"rodada-{rodada:02d}" / "partidas.json"
    if not path.exists():
        return set()
    dados = ler(path)
    pares = set()
    for p in dados.get("partidas", []):
        a = p.get("clube_casa_id") or p.get("clubeCasaId")
        b = p.get("clube_visitante_id") or p.get("clubeVisitanteId")
        if a and b:
            pares.add((str(a), str(b)))
            pares.add((str(b), str(a)))
    return pares


def conflitos(titulares, pares):
    defensores = [j for j in titulares if str(j.get("posicao", "")).upper() in DEF]
    ofensivos = [j for j in titulares if str(j.get("posicao", "")).upper() in ATAQUE]
    achados = []
    for d in defensores:
        cd = str(d.get("clube") or d.get("clubeId") or "")
        if not cd:
            continue
        for o in ofensivos:
            co = str(o.get("clube") or o.get("clubeId") or "")
            if co and (cd, co) in pares:
                achados.append({
                    "defensor": d.get("nome"), "posicaoDefensor": d.get("posicao"), "clubeDefensor": cd,
                    "ofensivo": o.get("nome"), "posicaoOfensivo": o.get("posicao"), "clubeOfensivo": co,
                })
    return achados


def resumo(valores):
    vals = [v for v in valores if isinstance(v, (int, float))]
    return {"amostras": len(vals), "media": round(mean(vals), 2) if vals else None}


def main():
    base = ler(SIMULACAO)
    registros = []
    for rodada in base.get("rodadas", []):
        num = int(rodada.get("rodada") or 0)
        pares = pares_partidas(num)
        if not pares:
            continue
        for e in rodada.get("estrategias", []):
            titulares = e.get("titulares") or []
            achados = conflitos(titulares, pares)
            pontos = e.get("pontuacaoComCapitao")
            registros.append({
                "rodada": num,
                "estrategia": e.get("nome") or e.get("id"),
                "conflitos": len(achados),
                "temConflito": bool(achados),
                "pontuacaoReal": pontos,
                "detalhes": achados,
            })

    com = [r["pontuacaoReal"] for r in registros if r["temConflito"]]
    sem = [r["pontuacaoReal"] for r in registros if not r["temConflito"]]
    media_com = resumo(com)
    media_sem = resumo(sem)
    diferenca = None
    if media_com["media"] is not None and media_sem["media"] is not None:
        diferenca = round(media_sem["media"] - media_com["media"], 2)

    # Regra conservadora: somente recomendar promoção automática se houver
    # amostra mínima dos dois grupos e vantagem clara dos times sem conflito.
    evidencia_suficiente = media_com["amostras"] >= 8 and media_sem["amostras"] >= 8
    favorece_anti = evidencia_suficiente and (diferenca or 0) >= 1.0

    resultado = {
        "modelo": "avaliacao_anti_conflito_v1",
        "definicao": "Conflito = GOL/LAT/ZAG de um clube junto com MEI/ATA do adversário na mesma escalação.",
        "metodologia": "Análise observacional das escalações históricas já geradas; não é reotimização causal.",
        "totalEscalacoes": len(registros),
        "comConflito": media_com,
        "semConflito": media_sem,
        "vantagemMediaSemConflito": diferenca,
        "evidenciaSuficiente": evidencia_suficiente,
        "favoreceAntiConflito": favorece_anti,
        "decisaoAutomatica": "TESTAR_PENALIZACAO_OU_BLOQUEIO" if favorece_anti else "NAO_PROMOVER_SEM_REOTIMIZACAO",
        "registros": registros,
    }
    SAIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in resultado.items() if k != "registros"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
