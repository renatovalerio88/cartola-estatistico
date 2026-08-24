#!/usr/bin/env python3
"""Audita prontidão das fontes externas da V2.1 sem alterar produção.

Escopo: R1-R23 apenas. R24 fica explicitamente fora.
Famílias: clima, espacial/lateralidade e consenso pré-jogo.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

BASE = Path(__file__).resolve().parent.parent
API = BASE / "data" / "api"
OUT = BASE / "data" / "modelagem" / "auditoria_contexto_externo_v21.json"
OUT_MD = BASE / "data" / "modelagem" / "auditoria_contexto_externo_v21.md"
CORTE = 23

# Coordenadas aproximadas por estádio/cidade, suficientes para clima horário.
# O objetivo não é geolocalização de precisão, e sim resolver a célula meteorológica local.
VENUES = {
    "Maracanã": (-22.9122, -43.2302),
    "São Januário": (-22.8909, -43.2283),
    "Nilton Santos": (-22.8933, -43.2927),
    "Nilton Santos (Engenhão)": (-22.8933, -43.2927),
    "Morumbis": (-23.6000, -46.7200),
    "Neo Química Arena": (-23.5453, -46.4742),
    "Allianz Parque": (-23.5275, -46.6780),
    "Nubank Parque": (-23.52747, -46.67856),
    "Vila Belmiro": (-23.9511, -46.3388),
    "Arena MRV": (-19.9297, -44.0147),
    "Mineirão": (-19.8659, -43.9711),
    "Beira-Rio": (-30.0655, -51.2365),
    "Arena do Grêmio": (-29.9739, -51.1944),
    "Fonte Nova": (-12.9788, -38.5040),
    "Arena Fonte Nova": (-12.9788, -38.5040),
    "Casa de Apostas Arena Fonte Nova": (-12.9788, -38.5040),
    "Barradão": (-12.9191, -38.4270),
    "Arena da Baixada": (-25.4482, -49.2769),
    "Ligga Arena": (-25.4482, -49.2769),
    "Couto Pereira": (-25.4211, -49.2594),
    "Arena Castelão": (-3.8073, -38.5224),
    "Castelão": (-3.8073, -38.5224),
    "Ilha do Retiro": (-8.0627, -34.9029),
    "Arena Pernambuco": (-8.0407, -35.0082),
    "Mangueirão": (-1.3818, -48.4448),
    "Baenão": (-1.44515, -48.46608),
    "Maião": (-20.8109, -49.4906),
    "José Maria de Campos Maia": (-20.8109, -49.4906),
    "Arena Condá": (-27.1044, -52.6137),
    "Ressacada": (-27.6665, -48.5328),
    "Heriberto Hülse": (-28.6775, -49.3660),
    "Nabi Abi Chedid": (-22.9530, -46.5424),
    "Cícero de Souza Marques": (-22.95094, -46.53052),
    "Brinco de Ouro": (-22.9092, -47.0436),
    "Serra Dourada": (-16.6995, -49.2341),
    "Arena Barueri": (-23.51292, -46.89948),
    "Canindé": (-23.52059, -46.61885),
    "Mané Garrincha": (-15.78363, -47.89905),
}

SIDE_FIELDS = {"lado", "side", "corredor", "faixa", "posicaoDetalhada", "posicao_detalhada", "left", "right"}
SPATIAL_FIELDS = {"heatmap", "mapaCalor", "x", "y", "xg", "xa", "touches", "toques"}
PROXY_SCOUTS = {"DS", "FC", "FS", "FD", "FF", "FT", "G", "A", "SG", "DE"}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def partidas_de(d: Any) -> list[dict[str, Any]]:
    if isinstance(d, dict):
        p = d.get("partidas")
        return [x for x in p if isinstance(x, dict)] if isinstance(p, list) else []
    return []


def jogadores_de(d: Any) -> list[dict[str, Any]]:
    return [x for x in d if isinstance(x, dict)] if isinstance(d, list) else []


def pct(a: int, b: int) -> float:
    return round(100.0 * a / b, 2) if b else 0.0


def main() -> None:
    jogos: list[dict[str, Any]] = []
    jogadores: list[dict[str, Any]] = []
    rodadas_partidas = 0
    rodadas_jogadores = 0

    for r in range(1, CORTE + 1):
        rd = API / f"rodada-{r:02d}"
        p = rd / "partidas.json"
        j = rd / "jogadores.json"
        if p.exists():
            rodadas_partidas += 1
            for x in partidas_de(read_json(p)):
                y = dict(x)
                y["rodada"] = r
                jogos.append(y)
        if j.exists():
            rodadas_jogadores += 1
            for x in jogadores_de(read_json(j)):
                y = dict(x)
                y["rodada"] = r
                jogadores.append(y)

    com_data = sum(bool(x.get("partida_data")) for x in jogos)
    com_local = sum(bool(x.get("local")) for x in jogos)
    locais = Counter(str(x.get("local") or "").strip() for x in jogos if x.get("local"))
    com_coord = sum(1 for x in jogos if str(x.get("local") or "").strip() in VENUES)
    desconhecidos = sorted(
        ({"local": local, "jogos": n} for local, n in locais.items() if local not in VENUES),
        key=lambda x: (-x["jogos"], x["local"]),
    )
    clima_meta = pct(min(com_data, com_local), len(jogos))
    clima_coord = pct(com_coord, len(jogos))
    clima_apto = clima_meta >= 95.0 and clima_coord >= 95.0

    side_hits = 0
    spatial_hits = 0
    proxy_hits = 0
    proxy_total = 0
    campos_vistos: set[str] = set()
    scouts_vistos: Counter[str] = Counter()
    for j in jogadores:
        campos_vistos.update(str(k) for k in j.keys())
        if any(k in j and j.get(k) not in (None, "", []) for k in SIDE_FIELDS):
            side_hits += 1
        if any(k in j and j.get(k) not in (None, "", []) for k in SPATIAL_FIELDS):
            spatial_hits += 1
        sc = j.get("scouts") if isinstance(j.get("scouts"), dict) else {}
        if sc:
            proxy_total += 1
            achou = False
            for k in PROXY_SCOUTS:
                if k in sc:
                    scouts_vistos[k] += 1
                    achou = True
            if achou:
                proxy_hits += 1

    side_cov = pct(side_hits, len(jogadores))
    spatial_cov = pct(spatial_hits, len(jogadores))
    proxy_cov = pct(proxy_hits, proxy_total)
    if side_cov >= 60 or spatial_cov >= 60:
        spatial_decision = "DADO_ESPACIAL_DIRETO_APTO_TESTE"
    elif proxy_cov >= 70:
        spatial_decision = "APENAS_PROXY_REPRODUZIVEL_SEM_LADO"
    else:
        spatial_decision = "COBERTURA_ESPACIAL_INSUFICIENTE"

    consenso_path = BASE / "data" / "contexto-externo" / "consenso_pre_jogo.json"
    consenso_registros = 0
    consenso_validos = 0
    if consenso_path.exists():
        raw = read_json(consenso_path)
        itens = raw if isinstance(raw, list) else raw.get("registros", []) if isinstance(raw, dict) else []
        itens = [x for x in itens if isinstance(x, dict)]
        consenso_registros = len(itens)
        consenso_validos = sum(
            bool(x.get("publicadoEm")) and bool(x.get("partidaEm")) and str(x.get("publicadoEm")) < str(x.get("partidaEm"))
            for x in itens
        )
    consenso_cov_jogos = pct(consenso_validos, len(jogos))
    consenso_apto = consenso_cov_jogos >= 70.0

    saida = {
        "modelo": "auditoria_contexto_externo_v21",
        "rodadaMaximaUsada": CORTE,
        "r24Excluida": True,
        "antiLeakage": True,
        "amostra": {
            "rodadasPartidas": rodadas_partidas,
            "rodadasJogadores": rodadas_jogadores,
            "jogos": len(jogos),
            "jogadorRodada": len(jogadores),
        },
        "clima": {
            "jogosComData": com_data,
            "jogosComLocal": com_local,
            "jogosComCoordenadaResolvida": com_coord,
            "coberturaMetadadoPct": clima_meta,
            "coberturaCoordenadaPct": clima_coord,
            "locaisDesconhecidos": desconhecidos,
            "decisao": "APTO_PARA_COLETA_OPEN_METEO" if clima_apto else "PRECISA_COMPLETAR_MAPA_ESTADIOS",
        },
        "espacialLateralidade": {
            "coberturaCampoLadoPct": side_cov,
            "coberturaCampoEspacialPct": spatial_cov,
            "coberturaScoutsProxyPct": proxy_cov,
            "scoutsProxyVistos": dict(scouts_vistos),
            "camposLateraisDetectados": sorted(SIDE_FIELDS.intersection(campos_vistos)),
            "camposEspaciaisDetectados": sorted(SPATIAL_FIELDS.intersection(campos_vistos)),
            "decisao": spatial_decision,
            "observacao": "Proxy de scouts pode ser testado; heatmap/lado real só entra se houver fonte sustentável com identificação de corredor.",
        },
        "consensoPreJogo": {
            "arquivoCuradoExiste": consenso_path.exists(),
            "registros": consenso_registros,
            "registrosTimestampValidos": consenso_validos,
            "coberturaJogosPct": consenso_cov_jogos,
            "decisao": "APTO_PARA_BACKTEST" if consenso_apto else "SEM_COBERTURA_REPRODUZIVEL_PARA_PROMOCAO",
        },
        "gates": {
            "climaPronto": clima_apto,
            "espacialDiretoPronto": side_cov >= 60 or spatial_cov >= 60,
            "proxyEspacialPronto": proxy_cov >= 70,
            "consensoPronto": consenso_apto,
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [
        "# Auditoria de contexto externo V2.1",
        "",
        f"R24 excluída: **{saida['r24Excluida']}**",
        f"Jogos auditados: **{len(jogos)}**",
        f"Jogador-rodada: **{len(jogadores)}**",
        "",
        "| Família | Cobertura | Decisão |",
        "|---|---:|---|",
        f"| Clima - metadado | {clima_meta:.2f}% | {saida['clima']['decisao']} |",
        f"| Clima - coordenada | {clima_coord:.2f}% | {saida['clima']['decisao']} |",
        f"| Espacial/lado direto | {max(side_cov, spatial_cov):.2f}% | {spatial_decision} |",
        f"| Espacial por proxy | {proxy_cov:.2f}% | {spatial_decision} |",
        f"| Consenso pré-jogo | {consenso_cov_jogos:.2f}% | {saida['consensoPreJogo']['decisao']} |",
        "",
        "Nenhuma família é promovida por esta auditoria; ela apenas decide o próximo teste reproduzível.",
    ]
    OUT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps({"gates": saida["gates"], "clima": saida["clima"]["decisao"], "espacial": spatial_decision, "consenso": saida["consensoPreJogo"]["decisao"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
