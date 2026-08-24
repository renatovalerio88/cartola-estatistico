#!/usr/bin/env python3
"""Coleta clima histórico por partida para o laboratório V2.1.

Somente R1-R23. R24 é explicitamente excluída. Usa Open-Meteo Historical Weather API
com horário local da partida e variáveis horárias reproduzíveis. As requisições são
agrupadas por estádio para reduzir fragilidade/rate-limit.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from auditar_contexto_externo_v21 import VENUES

BASE = Path(__file__).resolve().parent.parent
API = BASE / "data" / "api"
OUT_DIR = BASE / "data" / "contexto-externo"
OUT = OUT_DIR / "clima_historico_v21.json"
REPORT = BASE / "data" / "modelagem" / "clima_historico_v21.json"
CORTE = 23
HOURLY = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m"]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def partidas_de(d: Any) -> list[dict[str, Any]]:
    p = d.get("partidas") if isinstance(d, dict) else None
    return [x for x in p if isinstance(x, dict)] if isinstance(p, list) else []


def fetch_range(lat: float, lon: float, start: str, end: str) -> dict[str, dict[str, float]]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start,
        "end_date": end,
        "hourly": ",".join(HOURLY),
        "timezone": "America/Sao_Paulo",
    }
    url = "https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(params)
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "cartola-estatistico-v21/1.0"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            hourly = data.get("hourly") if isinstance(data, dict) else None
            if not isinstance(hourly, dict):
                raise RuntimeError("resposta sem hourly")
            times = hourly.get("time") or []
            out: dict[str, dict[str, float]] = {}
            for i, stamp in enumerate(times):
                row: dict[str, float] = {}
                ok = True
                for key in HOURLY:
                    vals = hourly.get(key) or []
                    if i >= len(vals) or vals[i] is None:
                        ok = False
                        break
                    row[key] = float(vals[i])
                if ok:
                    out[str(stamp)] = row
            return out
        except Exception as exc:
            last_error = exc
            time.sleep(2.0 * (attempt + 1))
    raise RuntimeError(f"Open-Meteo falhou para {lat},{lon} {start}..{end}: {last_error}")


def main() -> None:
    jogos: list[dict[str, Any]] = []
    for rodada in range(1, CORTE + 1):
        p = API / f"rodada-{rodada:02d}" / "partidas.json"
        if not p.exists():
            continue
        for partida in partidas_de(read_json(p)):
            x = dict(partida)
            x["rodada"] = rodada
            jogos.append(x)

    por_coord: dict[tuple[float, float], list[datetime]] = defaultdict(list)
    parseados: list[tuple[dict[str, Any], str, datetime, float, float]] = []
    sem_coord = 0
    for jogo in jogos:
        local = str(jogo.get("local") or "").strip()
        raw_dt = str(jogo.get("partida_data") or "").strip()
        if local not in VENUES or not raw_dt:
            sem_coord += 1
            continue
        try:
            dt = datetime.strptime(raw_dt, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            sem_coord += 1
            continue
        lat, lon = VENUES[local]
        por_coord[(lat, lon)].append(dt)
        parseados.append((jogo, local, dt, lat, lon))

    clima_por_coord: dict[tuple[float, float], dict[str, dict[str, float]]] = {}
    falhas_fontes = 0
    for idx, ((lat, lon), datas) in enumerate(sorted(por_coord.items()), start=1):
        start = min(datas).strftime("%Y-%m-%d")
        end = max(datas).strftime("%Y-%m-%d")
        try:
            clima_por_coord[(lat, lon)] = fetch_range(lat, lon, start, end)
        except Exception as exc:
            falhas_fontes += 1
            clima_por_coord[(lat, lon)] = {}
            print(f"WARN {exc}")
        print(f"estádio {idx}/{len(por_coord)}: {lat},{lon} {start}..{end}")
        time.sleep(0.15)

    registros: list[dict[str, Any]] = []
    sem_clima = 0
    for jogo, local, dt, lat, lon in parseados:
        stamp = dt.strftime("%Y-%m-%dT%H:00")
        met = clima_por_coord.get((lat, lon), {}).get(stamp)
        if not met:
            sem_clima += 1
            continue
        registros.append({
            "rodada": int(jogo["rodada"]),
            "partidaId": jogo.get("partida_id"),
            "partidaEm": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "local": local,
            "latitude": lat,
            "longitude": lon,
            "clubeCasaId": jogo.get("clube_casa_id"),
            "clubeVisitanteId": jogo.get("clube_visitante_id"),
            "temperaturaC": met["temperature_2m"],
            "umidadePct": met["relative_humidity_2m"],
            "precipitacaoMm": met["precipitation"],
            "ventoKmh": met["wind_speed_10m"],
            "fonte": "Open-Meteo Historical Weather API",
            "modeloTemporal": "historical_reanalysis",
        })

    cobertura = round(100.0 * len(registros) / len(jogos), 2) if jogos else 0.0
    payload = {
        "modelo": "clima_historico_v21",
        "rodadaMaximaUsada": CORTE,
        "r24Excluida": True,
        "antiLeakage": True,
        "fonte": "https://open-meteo.com/en/docs/historical-weather-api",
        "variaveis": HOURLY,
        "registros": registros,
    }
    report = {
        "modelo": "clima_historico_v21",
        "rodadaMaximaUsada": CORTE,
        "r24Excluida": True,
        "antiLeakage": True,
        "jogos": len(jogos),
        "estadiosConsultados": len(por_coord),
        "falhasFontes": falhas_fontes,
        "registrosClima": len(registros),
        "semCoordenadaOuData": sem_coord,
        "falhasClima": sem_clima,
        "coberturaPct": cobertura,
        "aptoParaBacktest": cobertura >= 90.0 and falhas_fontes <= 2,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
