#!/usr/bin/env python3
"""Coleta clima histórico por partida para o laboratório V2.1.

Somente R1-R23. R24 é explicitamente excluída. Usa Open-Meteo Historical Weather API
com horário local da partida e variáveis horárias reproduzíveis.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
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


def fetch_weather(lat: float, lon: float, dt: datetime) -> dict[str, float] | None:
    day = dt.strftime("%Y-%m-%d")
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": day,
        "end_date": day,
        "hourly": ",".join(HOURLY),
        "timezone": "America/Sao_Paulo",
    }
    url = "https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(params)
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "cartola-estatistico-v21/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            hourly = data.get("hourly") if isinstance(data, dict) else None
            if not isinstance(hourly, dict):
                return None
            times = hourly.get("time") or []
            target = dt.strftime("%Y-%m-%dT%H:00")
            if target not in times:
                return None
            i = times.index(target)
            out: dict[str, float] = {}
            for key in HOURLY:
                vals = hourly.get(key) or []
                if i >= len(vals) or vals[i] is None:
                    return None
                out[key] = float(vals[i])
            return out
        except Exception as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    if last_error:
        print(f"WARN clima {day} {lat},{lon}: {last_error}")
    return None


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

    cache: dict[tuple[float, float, str], dict[str, float] | None] = {}
    registros: list[dict[str, Any]] = []
    sem_coord = 0
    sem_clima = 0

    for idx, jogo in enumerate(jogos, start=1):
        local = str(jogo.get("local") or "").strip()
        raw_dt = str(jogo.get("partida_data") or "").strip()
        if local not in VENUES or not raw_dt:
            sem_coord += 1
            continue
        try:
            dt = datetime.strptime(raw_dt, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            sem_clima += 1
            continue
        lat, lon = VENUES[local]
        key = (lat, lon, dt.strftime("%Y-%m-%dT%H"))
        if key not in cache:
            cache[key] = fetch_weather(lat, lon, dt)
            time.sleep(0.08)
        met = cache[key]
        if not met:
            sem_clima += 1
            continue
        registros.append({
            "rodada": int(jogo["rodada"]),
            "partidaId": jogo.get("partida_id"),
            "partidaEm": raw_dt,
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
        if idx % 25 == 0:
            print(f"processados {idx}/{len(jogos)}; clima {len(registros)}")

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
        "registrosClima": len(registros),
        "semCoordenadaOuData": sem_coord,
        "falhasClima": sem_clima,
        "coberturaPct": cobertura,
        "aptoParaBacktest": cobertura >= 90.0,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
