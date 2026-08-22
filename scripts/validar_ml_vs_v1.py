#!/usr/bin/env python3
"""Validação direta de modelos ML contra a projeção oficial V1.

A rodada R é prevista usando apenas linhas com rodada < R. O baseline é a
projeção registrada em data/historico/rodada-XX.json, isto é, a régua oficial
que realmente existia antes do resultado. Nenhuma promoção ocorre aqui.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, median

import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor

from benchmark_modelos import FEATURES_NUMERICAS, POSICOES, vetor_features

BASE = Path(__file__).resolve().parent.parent
MATRIZ = BASE / "data/modelagem/matriz_features.json"
HIST = BASE / "data/historico"
OUT = BASE / "data/modelagem/validacao_ml_vs_v1.json"
REPORT = BASE / "data/modelagem/validacao_ml_vs_v1.md"
MIN_RODADA = 5

FORMACOES = {
    "4-3-3": {"GOL":1,"LAT":2,"ZAG":2,"MEI":3,"ATA":3},
    "4-4-2": {"GOL":1,"LAT":2,"ZAG":2,"MEI":4,"ATA":2},
    "3-4-3": {"GOL":1,"LAT":2,"ZAG":1,"MEI":4,"ATA":3},
    "3-5-2": {"GOL":1,"LAT":2,"ZAG":1,"MEI":5,"ATA":2},
    "5-3-2": {"GOL":1,"LAT":2,"ZAG":3,"MEI":3,"ATA":2},
    "4-5-1": {"GOL":1,"LAT":2,"ZAG":2,"MEI":5,"ATA":1},
    "5-4-1": {"GOL":1,"LAT":2,"ZAG":3,"MEI":4,"ATA":1},
}


def num(v, default=None):
    try:
        x=float(v)
        return x if math.isfinite(x) else default
    except Exception:
        return default


def arred(v, n=3):
    return None if v is None else round(float(v), n)


def carregar_v1():
    mapa={}
    for p in sorted(HIST.glob("rodada-*.json")):
        try: d=json.loads(p.read_text(encoding="utf-8"))
        except Exception: continue
        rodada=int(d.get("rodada") or p.stem.split("-")[-1])
        for j in d.get("jogadores",[]):
            aid=str(j.get("id") or "")
            proj=num(j.get("projecao")); real=num(j.get("real"))
            pos=str(j.get("posicao") or "").upper()
            if aid and proj is not None and real is not None and pos in POSICOES:
                mapa[(rodada,aid)]={"v1":proj,"real":real,"posicao":pos}
    return mapa


def modelos():
    return {
        "Ridge": Pipeline([
            ("imputer",SimpleImputer(strategy="median")),
            ("scaler",StandardScaler()),
            ("model",Ridge(alpha=10.0)),
        ]),
        "RandomForest": Pipeline([
            ("imputer",SimpleImputer(strategy="median")),
            ("model",RandomForestRegressor(n_estimators=250,max_depth=8,min_samples_leaf=8,max_features=.70,random_state=42,n_jobs=-1)),
        ]),
    }


def mae(rows,key):
    return mean(abs(r[key]-r["real"]) for r in rows) if rows else None


def corr(rows,key):
    if len(rows)<3:return 0.0
    xs=np.array([r[key] for r in rows],dtype=float); ys=np.array([r["real"] for r in rows],dtype=float)
    if np.std(xs)<1e-12 or np.std(ys)<1e-12:return 0.0
    return float(np.corrcoef(xs,ys)[0,1])


def selecionar(rows,key):
    por={p:sorted([r for r in rows if r["posicao"]==p],key=lambda z:z[key],reverse=True) for p in POSICOES}
    opcoes=[]
    for nome,req in FORMACOES.items():
        xi=[]; valido=True
        for p,q in req.items():
            if len(por[p])<q:valido=False;break
            xi.extend(por[p][:q])
        if valido:opcoes.append((sum(r[key] for r in xi),nome,xi))
    if not opcoes:return None
    _,form,xi=max(opcoes,key=lambda x:x[0])
    tec=por["TEC"][0] if por["TEC"] else None
    cap=max(xi,key=lambda r:r[key])
    return {"formacao":form,"xi":xi,"tec":tec,"cap":cap,"realXI":sum(r["real"] for r in xi),"realTotal":sum(r["real"] for r in xi)+(tec["real"] if tec else 0)+cap["real"],"capReal":cap["real"]}


def top_pos(rows,key,k=5):
    total=0.0
    for p in POSICOES:
        total+=sum(r["real"] for r in sorted([x for x in rows if x["posicao"]==p],key=lambda z:z[key],reverse=True)[:k])
    return total


def executar():
    matriz=json.loads(MATRIZ.read_text(encoding="utf-8"))["linhas"]
    v1map=carregar_v1()
    por_rodada=defaultdict(list)
    for l in matriz:
        r=int(l.get("rodada") or 0); aid=str(l.get("atletaId") or "")
        info=v1map.get((r,aid))
        target=num((l.get("target") or {}).get("pontuacaoReal"))
        if r and aid and info and target is not None:
            por_rodada[r].append((l,info))

    rodadas=sorted(r for r in por_rodada if r>=MIN_RODADA)
    resultados={m:[] for m in modelos()}
    todas_pred={m:[] for m in modelos()}

    for rodada in rodadas:
        treino=[l for l in matriz if int(l.get("rodada") or 0)<rodada and num((l.get("target") or {}).get("pontuacaoReal")) is not None]
        teste=por_rodada[rodada]
        if len(treino)<150 or len(teste)<20:continue
        Xtr=np.array([vetor_features(l) for l in treino],dtype=float)
        ytr=np.array([num(l["target"]["pontuacaoReal"],0.0) for l in treino],dtype=float)
        Xte=np.array([vetor_features(l) for l,_ in teste],dtype=float)

        base=[]
        for l,info in teste:
            base.append({"id":str(l["atletaId"]),"posicao":info["posicao"],"real":info["real"],"v1":info["v1"]})
        esc_v1=selecionar(base,"v1")

        for nome,modelo in modelos().items():
            modelo.fit(Xtr,ytr); pred=modelo.predict(Xte)
            rows=[{**b,"ml":float(p)} for b,p in zip(base,pred)]
            esc_ml=selecionar(rows,"ml")
            if not esc_v1 or not esc_ml:continue
            m1,m2=mae(rows,"v1"),mae(rows,"ml")
            rr={
                "rodada":rodada,"n":len(rows),"maeV1":arred(m1),"maeML":arred(m2),
                "ganhoMaePct":arred((m1-m2)/m1*100 if m1 else 0,2),
                "corrV1":arred(corr(rows,"v1")),"corrML":arred(corr(rows,"ml")),
                "top5PosV1":arred(top_pos(rows,"v1"),2),"top5PosML":arred(top_pos(rows,"ml"),2),
                "formacaoV1":esc_v1["formacao"],"formacaoML":esc_ml["formacao"],
                "realXIV1":arred(esc_v1["realXI"],2),"realXIML":arred(esc_ml["realXI"],2),
                "ganhoXI":arred(esc_ml["realXI"]-esc_v1["realXI"],2),
                "realTimeV1":arred(esc_v1["realTotal"],2),"realTimeML":arred(esc_ml["realTotal"],2),
                "ganhoTime":arred(esc_ml["realTotal"]-esc_v1["realTotal"],2),
                "capV1":arred(esc_v1["capReal"],2),"capML":arred(esc_ml["capReal"],2),
                "ganhoCapitao":arred(esc_ml["capReal"]-esc_v1["capReal"],2),
            }
            resultados[nome].append(rr); todas_pred[nome].extend(rows)

    resumo={}
    for nome,itens in resultados.items():
        rows=todas_pred[nome]; ganhos=[x["ganhoTime"] for x in itens]; ganhos_xi=[x["ganhoXI"] for x in itens]
        if not itens:continue
        m1,m2=mae(rows,"v1"),mae(rows,"ml")
        resumo[nome]={
            "rodadas":len(itens),"nJogadores":len(rows),"maeV1":arred(m1),"maeML":arred(m2),
            "ganhoMaePct":arred((m1-m2)/m1*100 if m1 else 0,2),
            "correlacaoV1":arred(corr(rows,"v1")),"correlacaoML":arred(corr(rows,"ml")),
            "ganhoXIMedio":arred(mean(ganhos_xi),2),"medianaGanhoXI":arred(median(ganhos_xi),2),
            "ganhoTimeMedio":arred(mean(ganhos),2),"medianaGanhoTime":arred(median(ganhos),2),
            "taxaVitoriaTimePct":arred(100*sum(g>0.01 for g in ganhos)/len(ganhos),1),
            "taxaNaoPioraTimePct":arred(100*sum(g>=-0.01 for g in ganhos)/len(ganhos),1),
            "ganhoCapitaoMedio":arred(mean(x["ganhoCapitao"] for x in itens),2),
        }

    # Gate de promoção direta contra V1: melhora precisa aparecer na previsão E na decisão.
    gates={}
    for nome,r in resumo.items():
        gates[nome]={
            "maeMelhoraMin2pct":r["ganhoMaePct"]>=2.0,
            "xiGanhoMedioMin1pt":r["ganhoXIMedio"]>=1.0,
            "timeGanhoMedioMin1pt":r["ganhoTimeMedio"]>=1.0,
            "vitoriasTimeMin45pct":r["taxaVitoriaTimePct"]>=45.0,
            "naoPioraTimeMin60pct":r["taxaNaoPioraTimePct"]>=60.0,
        }

    aptos=[n for n,g in gates.items() if all(g.values())]
    vencedor=max(aptos,key=lambda n:(resumo[n]["ganhoTimeMedio"],resumo[n]["ganhoMaePct"])) if aptos else None
    saida={
        "modelo":"validacao_ml_vs_v1_v1","walkForward":True,"antiLeakage":True,
        "baseline":"projecao V1 registrada no historico antes de cada rodada",
        "rodadasTestadas":sorted({x["rodada"] for arr in resultados.values() for x in arr}),
        "resumo":resumo,"gates":gates,"candidatoApto":vencedor,
        "decisao":"APTO_PARA_TESTE_DE_PRODUCAO" if vencedor else "MANTER_V1",
        "detalheRodadas":resultados,
    }
    OUT.write_text(json.dumps(saida,ensure_ascii=False,indent=2),encoding="utf-8")

    linhas=["# Validação ML vs V1","","Walk-forward real; baseline = projeção V1 registrada antes da rodada.",""]
    for n,r in resumo.items():
        linhas += [f"## {n}",f"- MAE: {r['maeV1']:.3f} → {r['maeML']:.3f} ({r['ganhoMaePct']:+.2f}%)",f"- XI: {r['ganhoXIMedio']:+.2f} pts/rodada",f"- Time + técnico + capitão: {r['ganhoTimeMedio']:+.2f} pts/rodada",f"- Vitórias: {r['taxaVitoriaTimePct']:.1f}% | não piora: {r['taxaNaoPioraTimePct']:.1f}%",""]
    linhas += [f"Decisão: **{saida['decisao']}**",f"Candidato apto: **{vencedor or 'nenhum'}**"]
    REPORT.write_text("\n".join(linhas)+"\n",encoding="utf-8")
    print(json.dumps({"resumo":resumo,"gates":gates,"candidatoApto":vencedor,"decisao":saida["decisao"]},ensure_ascii=False,indent=2))

if __name__=="__main__":
    executar()
