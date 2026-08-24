#!/usr/bin/env python3
"""Ablação walk-forward das famílias de contexto da V2.1.

Diagnóstico apenas. Não altera produção. R24 é explicitamente excluída.
"""
from __future__ import annotations

import json, math
from collections import defaultdict
from pathlib import Path
from statistics import mean
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

BASE = Path(__file__).resolve().parent.parent
MATRIZ = BASE / "data/modelagem/matriz_features.json"
STATUS = BASE / "data/api/status.json"
OUT = BASE / "data/modelagem/experimento_v21_ablacao_contexto.json"
OUT_MD = BASE / "data/modelagem/experimento_v21_ablacao_contexto.md"

MIN_TREINO = 400
POSICOES = {"GOL","LAT","ZAG","MEI","ATA","TEC"}

CORE = [
    "jogosHistoricos","media3","media5","media10","mediaGeral","ewma","mediana",
    "piso20","teto80","desvioPadrao","regularidade","tendencia3x5","tendencia5x10","tendenciaEWMA",
    "taxa5Mais","taxa10Mais","taxa15Mais","taxaNegativa","mediaBasica","mediaBasica3","mediaBasica5","mediaBasica10",
    "taxaBasica3Mais","taxaBasica5Mais","dependenciaGolAssistenciaSG","mediaOfensivaScouts","mediaDefensivaScouts",
    "scoutG","scoutA","scoutDS","scoutFS","scoutFF","scoutFD","scoutFT","scoutSG","scoutDE","scoutCA","scoutFC",
    "preco","variacao","statusId","minutosEsperados","titularidade"
]
GRUPOS = {
    "core": [],
    "mando": ["mando"],
    "forca_adversario": ["forcaAdversarioIndice","notaForcaAdversario"],
    "cedidos_posicao": ["pontosCedidosMediaPosicao","pontosCedidosNota"],
    "chance_sg": ["chanceSG"],
    "poisson_ofensivo": ["poissonLambdaGols","poissonProbVitoria","poissonSaldoEsperado","poissonNotaOfensiva"],
    "poisson_defensivo": ["poissonLambdaAdversario","poissonChanceSG","poissonProbDerrota","poissonNotaDefensiva"],
    "poisson_resultado": ["poissonProbVitoria","poissonProbEmpate","poissonProbDerrota","poissonSaldoEsperado"],
    "contexto_legado": ["mando","forcaAdversarioIndice","notaForcaAdversario","pontosCedidosMediaPosicao","pontosCedidosNota","chanceSG"],
    "contexto_completo": [
        "mando","forcaAdversarioIndice","notaForcaAdversario","pontosCedidosMediaPosicao","pontosCedidosNota","chanceSG",
        "poissonLambdaGols","poissonLambdaAdversario","poissonChanceSG","poissonProbVitoria","poissonProbEmpate","poissonProbDerrota",
        "poissonSaldoEsperado","poissonNotaOfensiva","poissonNotaDefensiva"
    ],
}

def ler(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))

def num(v, d=0.0):
    try:
        x=float(v); return x if math.isfinite(x) else d
    except Exception: return d

def linhas(d):
    if isinstance(d,list): return [x for x in d if isinstance(x,dict)]
    if isinstance(d,dict):
        for k in ("linhas","amostras","registros"):
            if isinstance(d.get(k),list): return [x for x in d[k] if isinstance(x,dict)]
    return []

def alvo(l):
    t=l.get("target")
    return num(t.get("pontuacaoReal")) if isinstance(t,dict) else num(t)

def feat(l,n):
    f=l.get("features") if isinstance(l.get("features"),dict) else {}
    return num(f.get(n))

def vetor(l, nomes): return [feat(l,n) for n in nomes]

def modelo(seed):
    return RandomForestRegressor(n_estimators=240,max_depth=11,min_samples_leaf=7,max_features=0.75,random_state=seed,n_jobs=-1)

def corr(a,b):
    if len(a)<3: return 0.0
    aa=np.asarray(a,float); bb=np.asarray(b,float)
    if np.std(aa)<1e-12 or np.std(bb)<1e-12: return 0.0
    return float(np.corrcoef(aa,bb)[0,1])

def top5_metric(test,preds):
    por=defaultdict(list)
    for l,p in zip(test,preds): por[str(l.get("posicao")).upper()].append((l,float(p)))
    sel=[]; ac=0; total=0
    for itens in por.values():
        prev=sorted(itens,key=lambda x:x[1],reverse=True)[:5]
        real=sorted(itens,key=lambda x:alvo(x[0]),reverse=True)[:5]
        ids={x[0].get("atletaId") for x in real}
        ac += sum(1 for x in prev if x[0].get("atletaId") in ids)
        total += len(prev); sel += [alvo(x[0]) for x in prev]
    return {"taxaAcertoTop5":100*ac/max(1,total),"mediaRealSelecionados":mean(sel) if sel else 0.0}

def resumo(reais,preds):
    return {"n":len(reais),"mae":float(mean_absolute_error(reais,preds)),"rmse":float(mean_squared_error(reais,preds)**0.5),"correlacao":corr(reais,preds)}

def main():
    status=ler(STATUS); rodada_atual=int(status.get("rodada_atual") or 24); corte=min(23,rodada_atual-1)
    base=[l for l in linhas(ler(MATRIZ)) if 2<=int(l.get("rodada") or 999)<=corte and str(l.get("posicao") or "").upper() in POSICOES]
    if len(base)<1000: raise SystemExit(f"Amostra insuficiente: {len(base)}")
    rodadas=sorted({int(l["rodada"]) for l in base})
    acumul={k:{"reais":[],"preds":[],"rodadas":[]} for k in GRUPOS}
    for r in rodadas:
        treino=[l for l in base if int(l["rodada"])<r]
        teste=[l for l in base if int(l["rodada"])==r]
        if len(treino)<MIN_TREINO or len(teste)<20: continue
        ytr=[alvo(l) for l in treino]; yte=[alvo(l) for l in teste]
        for i,(nome,extra) in enumerate(GRUPOS.items()):
            feats=CORE+extra
            m=modelo(1000+r*17+i)
            m.fit([vetor(l,feats) for l in treino],ytr)
            pred=m.predict([vetor(l,feats) for l in teste]).tolist()
            met=resumo(yte,pred); met.update(top5_metric(teste,pred)); met["rodada"]=r
            acumul[nome]["reais"] += yte; acumul[nome]["preds"] += pred; acumul[nome]["rodadas"].append(met)
    saida={"modelo":"experimento_v21_ablacao_contexto","walkForward":True,"antiLeakage":True,"rodadaMaximaUsada":corte,"r24Excluida":corte<=23,"amostra":len(base),"familias":{}}
    for nome,d in acumul.items():
        g=resumo(d["reais"],d["preds"]); rs=d["rodadas"]
        g["mediaRealSelecionados"] = mean(x["mediaRealSelecionados"] for x in rs) if rs else 0.0
        g["taxaAcertoTop5"] = mean(x["taxaAcertoTop5"] for x in rs) if rs else 0.0
        g["ultimas5"]={k:mean(x[k] for x in rs[-5:]) for k in ("mae","mediaRealSelecionados","taxaAcertoTop5")} if len(rs)>=5 else {}
        g["rodadas"]=rs; saida["familias"][nome]=g
    core=saida["familias"]["core"]
    ranking=[]
    for nome,g in saida["familias"].items():
        ranking.append({"familia":nome,"mae":g["mae"],"deltaMaeVsCore":core["mae"]-g["mae"],"mediaRealSelecionados":g["mediaRealSelecionados"],"deltaSelecaoVsCore":g["mediaRealSelecionados"]-core["mediaRealSelecionados"],"top5":g["taxaAcertoTop5"],"ultimas5DeltaSelecao":g.get("ultimas5",{}).get("mediaRealSelecionados",0)-core.get("ultimas5",{}).get("mediaRealSelecionados",0)})
    ranking.sort(key=lambda x:(x["deltaSelecaoVsCore"],x["deltaMaeVsCore"]),reverse=True); saida["ranking"]=ranking
    vencedores=[x for x in ranking if x["familia"]!="core" and x["deltaMaeVsCore"]>0 and x["deltaSelecaoVsCore"]>0 and x["ultimas5DeltaSelecao"]>=0]
    saida["melhorEstavel"]=vencedores[0] if vencedores else None
    saida["decisao"]="FAMILIA_CONTEXTO_APTA_PROXIMO_TESTE" if vencedores else "MANTER_V2_SEM_PROMOCAO_CONTEXTO"
    OUT.write_text(json.dumps(saida,ensure_ascii=False,indent=2),encoding="utf-8")
    md=["# Ablação de contexto V2.1","",f"Decisão: **{saida['decisao']}**","", "| Família | Δ MAE vs core | Δ seleção | Δ seleção últimas 5 |", "|---|---:|---:|---:|"]
    for x in ranking: md.append(f"| {x['familia']} | {x['deltaMaeVsCore']:.4f} | {x['deltaSelecaoVsCore']:.3f} | {x['ultimas5DeltaSelecao']:.3f} |")
    OUT_MD.write_text("\n".join(md)+"\n",encoding="utf-8")
    print(json.dumps({"decisao":saida["decisao"],"melhorEstavel":saida["melhorEstavel"],"top3":ranking[:3]},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
