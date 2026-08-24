#!/usr/bin/env python3
"""Enriquece a matriz V2.1 com contexto Poisson usando o atleta+rodada.

Motivação: parte da base-histórica legada não preservou clubeId, embora os
arquivos data/api/rodada-XX/jogadores.json atuais tenham esse identificador.
O contexto Poisson existe por rodada+clubeId. Este passo recompõe o join sem
alterar dados de produção e sem usar informação futura.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

BASE = Path(__file__).resolve().parent.parent
MATRIZ = BASE / "data" / "modelagem" / "matriz_features.json"
POISSON = BASE / "data" / "modelagem" / "contexto_poisson.json"
API = BASE / "data" / "api"

MAPA = {
    "poissonLambdaGols": "lambdaGols",
    "poissonLambdaAdversario": "lambdaAdversario",
    "poissonChanceSG": "chanceSG",
    "poissonProbVitoria": "probabilidadeVitoria",
    "poissonProbEmpate": "probabilidadeEmpate",
    "poissonProbDerrota": "probabilidadeDerrota",
    "poissonSaldoEsperado": "saldoEsperado",
    "poissonNotaOfensiva": "notaOfensiva",
    "poissonNotaDefensiva": "notaDefensiva",
}


def ler(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def extrair_linhas(dados: Any) -> tuple[list[dict[str, Any]], str | None]:
    if isinstance(dados, list):
        return dados, None
    if isinstance(dados, dict):
        for chave in ("linhas", "amostras", "registros"):
            if isinstance(dados.get(chave), list):
                return dados[chave], chave
    raise SystemExit("Schema da matriz não reconhecido")


def main() -> None:
    matriz_raw = ler(MATRIZ)
    linhas, chave_linhas = extrair_linhas(matriz_raw)
    poisson = ler(POISSON)
    indice_poisson = poisson.get("indice") or {}
    if not indice_poisson:
        raise SystemExit("Índice Poisson vazio")

    # Índice atleta+rodada -> clubeId, reconstruído da camada API já persistida.
    clube_por_atleta_rodada: dict[tuple[int, str], str] = {}
    for pasta in sorted(API.glob("rodada-*")):
        try:
            rodada = int(pasta.name.split("-")[-1])
        except Exception:
            continue
        arq = pasta / "jogadores.json"
        if not arq.exists():
            continue
        try:
            jogadores = ler(arq)
        except Exception:
            continue
        if not isinstance(jogadores, list):
            continue
        for j in jogadores:
            if not isinstance(j, dict):
                continue
            atleta = j.get("id")
            clube = j.get("clubeId") or j.get("clube_id")
            if atleta is None or clube is None:
                continue
            clube_por_atleta_rodada[(rodada, str(atleta))] = str(clube)

    total = len(linhas)
    com_clube = 0
    com_poisson = 0
    preenchidos = 0

    for linha in linhas:
        if not isinstance(linha, dict):
            continue
        try:
            rodada = int(linha.get("rodada"))
        except Exception:
            continue
        atleta = linha.get("atletaId")
        clube = linha.get("clubeId") or clube_por_atleta_rodada.get((rodada, str(atleta)))
        if clube is None:
            continue
        com_clube += 1
        contexto = indice_poisson.get(f"{rodada}:{clube}")
        if not isinstance(contexto, dict):
            continue
        com_poisson += 1
        feats = linha.get("features")
        if not isinstance(feats, dict):
            feats = {}
            linha["features"] = feats
        for destino, origem in MAPA.items():
            valor = contexto.get(origem)
            if valor is not None:
                feats[destino] = valor
                preenchidos += 1
        if linha.get("clubeId") is None:
            linha["clubeId"] = clube

    cobertura = round(100.0 * com_poisson / max(1, total), 2)
    if cobertura < 50.0:
        raise SystemExit(
            f"Cobertura Poisson pós-join insuficiente: {com_poisson}/{total} ({cobertura}%)"
        )

    if chave_linhas is None:
        saida = linhas
    else:
        saida = matriz_raw
        saida[chave_linhas] = linhas
        if isinstance(saida, dict):
            saida.setdefault("enriquecimentoV21", {})
            saida["enriquecimentoV21"] = {
                "join": "atletaId+rodada -> clubeId -> contextoPoisson",
                "totalLinhas": total,
                "linhasComClube": com_clube,
                "linhasComPoisson": com_poisson,
                "coberturaPoissonPct": cobertura,
                "antiLeakage": True,
            }

    MATRIZ.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "totalLinhas": total,
        "linhasComClube": com_clube,
        "linhasComPoisson": com_poisson,
        "coberturaPoissonPct": cobertura,
        "camposPreenchidos": preenchidos,
        "antiLeakage": True,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
