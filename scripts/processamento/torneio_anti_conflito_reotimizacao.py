"""Torneio walk-forward de anti-conflito por reotimização local.

Para cada escalação histórica já produzida sem vazamento futuro, tenta trocar
jogadores conflitantes por alternativas da mesma posição usando SOMENTE a
projeção disponível naquela rodada. O resultado real é consultado apenas após
a escolha, preservando a causalidade do backtest.

Modos:
- baseline: time histórico original;
- penalidade: remove conflito quando a melhor troca custa <= 1.5 pts projetados;
- bloqueio: busca remover todos os conflitos possíveis, mesmo com perda maior.
"""
from pathlib import Path
import json
from copy import deepcopy
from statistics import mean

ROOT = Path(__file__).resolve().parents[2]
HIST_ESC = ROOT / "data" / "historico-escalacoes"
HIST = ROOT / "data" / "historico"
API = ROOT / "data" / "api"
SAIDA = ROOT / "data" / "torneio-anti-conflito.json"
DEF = {"GOL", "LAT", "ZAG"}
ATAQUE = {"MEI", "ATA"}
MAX_CLUBE = 3
LIMITE_PERDA_PENALIDADE = 1.5


def ler(p): return json.loads(p.read_text(encoding="utf-8"))
def sid(v): return str(v) if v is not None else ""


def extrair_lista_jogadores(dados):
    if isinstance(dados, list): return dados
    for k in ("jogadores", "atletas"):
        if isinstance(dados.get(k), list): return dados[k]
    return []


def clube_obj(j):
    return j.get("clubeId") or j.get("clube_id") or j.get("clube") or j.get("siglaClube")


def mapa_clubes(rodada):
    p = API / f"rodada-{rodada:02d}" / "jogadores.json"
    if not p.exists(): return {}
    return {sid(j.get("id") or j.get("atletaId") or j.get("atleta_id")): clube_obj(j) for j in extrair_lista_jogadores(ler(p))}


def pares_partidas(rodada):
    p = API / f"rodada-{rodada:02d}" / "partidas.json"
    if not p.exists(): return set()
    d = ler(p); pares=set()
    for x in d.get("partidas", []):
        a=x.get("clube_casa_id") or x.get("clubeCasaId"); b=x.get("clube_visitante_id") or x.get("clubeVisitanteId")
        if a and b: pares |= {(sid(a),sid(b)),(sid(b),sid(a))}
    return pares


def universo(rodada, clubes):
    p=HIST / f"rodada-{rodada:02d}.json"
    if not p.exists(): return []
    out=[]
    for j in ler(p).get("jogadores", []):
        jid=sid(j.get("id")); pos=str(j.get("posicao") or "").upper(); proj=j.get("projecao"); real=j.get("real")
        if not jid or not pos or not isinstance(proj,(int,float)): continue
        out.append({"id":jid,"posicao":pos,"projecao":float(proj),"real":real,"clube":clubes.get(jid)})
    return out


def conflito(a,b,pares):
    ca,cb=sid(a.get("clube")),sid(b.get("clube")); pa,pb=a.get("posicao"),b.get("posicao")
    if not ca or not cb or (ca,cb) not in pares: return False
    return (pa in DEF and pb in ATAQUE) or (pb in DEF and pa in ATAQUE)


def conflitos(time,pares):
    return [(i,j) for i in range(len(time)) for j in range(i+1,len(time)) if conflito(time[i],time[j],pares)]


def limite_clube_ok(time):
    c={}
    for j in time:
        cl=sid(j.get("clube"))
        if cl: c[cl]=c.get(cl,0)+1
    return all(v<=MAX_CLUBE for v in c.values())


def pontos_reais(time):
    vals=[j.get("real") for j in time if j.get("posicao")!="TEC" and isinstance(j.get("real"),(int,float))]
    return sum(vals) if vals else None


def reotimizar(base, pool, pares, modo):
    time=deepcopy(base); usados={j["id"] for j in time}; tentativas=0
    while conflitos(time,pares) and tentativas<20:
        tentativas+=1
        atuais=conflitos(time,pares); melhor=None
        indices=set(i for par in atuais for i in par)
        for idx in indices:
            atual=time[idx]; pos=atual["posicao"]
            for cand in pool:
                if cand["id"] in usados or cand["posicao"]!=pos or not cand.get("clube"): continue
                novo=deepcopy(time); novo[idx]=cand
                if not limite_clube_ok(novo): continue
                antes=len(atuais); depois=len(conflitos(novo,pares))
                if depois>=antes: continue
                perda=float(atual.get("projecao") or 0)-float(cand.get("projecao") or 0)
                if modo=="penalidade" and perda>LIMITE_PERDA_PENALIDADE: continue
                chave=(depois, perda, -float(cand.get("projecao") or 0))
                if melhor is None or chave<melhor[0]: melhor=(chave,idx,cand)
        if melhor is None: break
        _,idx,cand=melhor; usados.discard(time[idx]["id"]); usados.add(cand["id"]); time[idx]=deepcopy(cand)
    return time


def main():
    indice=ler(HIST_ESC/"indice.json")
    rodadas=indice.get("rodadas",[])
    nums=[]
    for r in rodadas:
        n=r.get("rodada") if isinstance(r,dict) else r
        try: nums.append(int(n))
        except: pass
    registros=[]
    for rodada in nums:
        pe=HIST_ESC/f"rodada-{rodada:02d}.json"
        if not pe.exists(): continue
        clubes=mapa_clubes(rodada); pares=pares_partidas(rodada); pool=universo(rodada,clubes)
        if not clubes or not pares or not pool: continue
        hist=ler(pe)
        poolmap={j["id"]:j for j in pool}
        for est in hist.get("estrategias",[]):
            base=[]
            for j in est.get("titulares",[]):
                jid=sid(j.get("id")); cand=poolmap.get(jid)
                if cand: base.append(deepcopy(cand))
            if len(base)<8: continue
            for modo in ("baseline","penalidade","bloqueio"):
                time=base if modo=="baseline" else reotimizar(base,pool,pares,modo)
                registros.append({"rodada":rodada,"estrategia":est.get("nome") or est.get("id"),"modo":modo,
                    "conflitos":len(conflitos(time,pares)),"projecao":round(sum(j.get("projecao",0) for j in time),2),
                    "real":round(pontos_reais(time),2) if pontos_reais(time) is not None else None})
    resumos={}
    for modo in ("baseline","penalidade","bloqueio"):
        rs=[r for r in registros if r["modo"]==modo and isinstance(r["real"],(int,float))]
        resumos[modo]={"amostras":len(rs),"mediaReal":round(mean(r["real"] for r in rs),2) if rs else None,
                       "mediaProjecao":round(mean(r["projecao"] for r in rs),2) if rs else None,
                       "mediaConflitos":round(mean(r["conflitos"] for r in rs),2) if rs else None}
    base=resumos["baseline"]["mediaReal"]
    for modo in ("penalidade","bloqueio"):
        v=resumos[modo]["mediaReal"]; resumos[modo]["ganhoVsBaseline"]=round(v-base,2) if v is not None and base is not None else None
    ganhos=[(resumos[m].get("ganhoVsBaseline") or -999,m) for m in ("penalidade","bloqueio")]
    melhor=max(ganhos)
    promover=melhor[0]>0
    saida={"modelo":"torneio_anti_conflito_reotimizacao_v1","semVazamentoFuturo":True,
           "limitePerdaPenalidade":LIMITE_PERDA_PENALIDADE,"resumo":resumos,
           "melhorCandidato":melhor[1] if promover else "baseline",
           "ganhoMelhorCandidato":melhor[0] if promover else 0,
           "decisao":"PROMOVER_ANTI_CONFLITO" if promover else "MANTER_BASELINE",
           "registros":registros}
    SAIDA.write_text(json.dumps(saida,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in saida.items() if k!="registros"},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
