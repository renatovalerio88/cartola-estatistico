#!/usr/bin/env python3
"""Auditoria estática/operacional da integração frontend V2.

Valida que o site só consuma o RandomForest V2 quando:
- a rodada do artefato coincide com status.json;
- antiLeakage está ativo;
- a distribuição não é degenerada;
- há cobertura real dos jogadores da rodada;
- o bootstrap mantém fallback explícito para V1;
- capitao.js continua carregado antes de dados.js/app.js.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from statistics import pstdev

ROOT = Path(__file__).resolve().parents[1]
STATUS = ROOT / "data/api/status.json"
ARTEFATO = ROOT / "data/modelagem/projecoes_v2_atual.json"
CAPITAO = ROOT / "js/capitao.js"
INDEX = ROOT / "index.html"

MIN_PREDICOES = 100
MIN_UNICOS = 20
MIN_DESVIO = 0.10
MIN_COBERTURA_MERCADO = 0.60


def carregar_json(caminho: Path):
    with caminho.open("r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def falhar(mensagem: str) -> None:
    raise SystemExit(f"[FALHA] {mensagem}")


def main() -> None:
    status = carregar_json(STATUS)
    artefato = carregar_json(ARTEFATO)

    rodada = int(status.get("rodada_atual") or 0)
    if rodada <= 0:
        falhar("rodada_atual inválida em status.json")

    if str(artefato.get("versao", "")).upper() != "V2":
        falhar("artefato não declara versao=V2")

    if artefato.get("modelo") != "RandomForest":
        falhar(f"modelo inesperado: {artefato.get('modelo')!r}")

    if artefato.get("antiLeakage") is not True:
        falhar("antiLeakage não está aprovado")

    if int(artefato.get("rodada") or 0) != rodada:
        falhar(
            f"artefato da rodada {artefato.get('rodada')} não corresponde à rodada atual {rodada}"
        )

    predicoes = artefato.get("predicoes")
    if not isinstance(predicoes, dict):
        falhar("campo predicoes ausente/inválido")

    valores = []
    for valor in predicoes.values():
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            continue
        if math.isfinite(numero):
            valores.append(numero)

    if len(valores) < MIN_PREDICOES:
        falhar(f"somente {len(valores)} predições numéricas")

    unicos = len({round(v, 4) for v in valores})
    if unicos < MIN_UNICOS:
        falhar(f"distribuição degenerada: {unicos} valores únicos")

    desvio = pstdev(valores)
    if desvio < MIN_DESVIO:
        falhar(f"desvio das predições muito baixo: {desvio:.4f}")

    if all(v == 0 for v in valores):
        falhar("todas as predições são zero")

    caminho_jogadores = ROOT / f"data/api/rodada-{rodada:02d}/jogadores.json"
    jogadores = carregar_json(caminho_jogadores)
    if not isinstance(jogadores, list) or not jogadores:
        falhar("lista de jogadores da rodada está vazia/inválida")

    ids_mercado = {
        str(j.get("id") or j.get("atletaId") or j.get("atleta_id"))
        for j in jogadores
        if (j.get("id") or j.get("atletaId") or j.get("atleta_id")) is not None
    }
    ids_pred = set(map(str, predicoes.keys()))
    cobertura = len(ids_mercado & ids_pred)
    proporcao = cobertura / max(1, len(ids_mercado))

    if cobertura < MIN_PREDICOES:
        falhar(f"cobertura real insuficiente: {cobertura} jogadores")

    if proporcao < MIN_COBERTURA_MERCADO:
        falhar(
            f"cobertura do mercado abaixo de {MIN_COBERTURA_MERCADO:.0%}: {proporcao:.1%}"
        )

    codigo = CAPITAO.read_text(encoding="utf-8")
    marcadores = [
        "CartolaProjecaoV2Frontend",
        "projecaoV1",
        "projecaoV2",
        "anti-leakage",
        "fallback V1",
        "carregarComV2",
        "cartola:v2-aplicada",
    ]
    faltantes = [m for m in marcadores if m not in codigo]
    if faltantes:
        falhar("marcadores ausentes no bootstrap: " + ", ".join(faltantes))

    index = INDEX.read_text(encoding="utf-8")
    ordem = [
        'src="js/capitao.js"',
        'src="js/recomendacoes/dados.js"',
        'src="js/app.js"',
    ]
    posicoes = [index.find(item) for item in ordem]
    if any(pos < 0 for pos in posicoes):
        falhar("scripts essenciais não encontrados no index.html")
    if posicoes != sorted(posicoes):
        falhar("ordem dos scripts impede o bootstrap V2 antes do app")

    stats = artefato.get("estatisticasPredicoes") or {}
    print("[OK] Integração frontend V2 apta")
    print(f"Rodada: {rodada}")
    print(f"Modelo: {artefato['modelo']}")
    print(f"Predições: {len(valores)}")
    print(f"Cobertura mercado: {cobertura}/{len(ids_mercado)} ({proporcao:.1%})")
    print(f"Média: {sum(valores)/len(valores):.4f}")
    print(f"Desvio: {desvio:.4f}")
    print(f"Únicos: {unicos}")
    if stats:
        print(f"Estatísticas publicadas: {stats}")
    print("Fallback V1: preservado")


if __name__ == "__main__":
    main()
