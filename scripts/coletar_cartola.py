"""
Cartola Estatístico
Coleta dados públicos da rodada atual do Cartola.

Arquivos gerados:
data/api/status.json
data/api/rodada-XX/mercado.json
data/api/rodada-XX/partidas.json
data/api/rodada-XX/pontuados.json
data/api/rodada-XX/jogadores.json
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_BASE = "https://api.cartolafc.globo.com"

PASTA_RAIZ = Path(__file__).resolve().parent.parent
PASTA_DADOS = PASTA_RAIZ / "data" / "api"

CABECALHOS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/150 Safari/537.36"
    ),
    "Accept": "application/json",
}


POSICOES = {
    1: "GOL",
    2: "LAT",
    3: "ZAG",
    4: "MEI",
    5: "ATA",
    6: "TEC",
}


def buscar_json(endpoint: str, obrigatorio: bool = True) -> Any:
    url = f"{API_BASE}{endpoint}"

    requisicao = Request(
        url,
        headers=CABECALHOS,
        method="GET",
    )

    try:
        with urlopen(requisicao, timeout=30) as resposta:
            conteudo = resposta.read().decode("utf-8")
            return json.loads(conteudo)

    except HTTPError as erro:
        mensagem = (
            f"Erro HTTP {erro.code} ao consultar {url}"
        )

    except URLError as erro:
        mensagem = (
            f"Erro de conexão ao consultar {url}: "
            f"{erro.reason}"
        )

    except json.JSONDecodeError:
        mensagem = (
            f"A API retornou JSON inválido em {url}"
        )

    if obrigatorio:
        raise RuntimeError(mensagem)

    print(f"AVISO: {mensagem}")
    return None


def salvar_json(
    caminho: Path,
    dados: Any,
) -> None:
    caminho.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    caminho.write_text(
        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Arquivo salvo: {caminho.relative_to(PASTA_RAIZ)}")


def obter_numero_rodada(
    status: dict[str, Any],
) -> int:
    rodada = status.get("rodada_atual")

    if rodada is None:
        rodada = status.get("rodada")

    try:
        return int(rodada)
    except (TypeError, ValueError) as erro:
        raise RuntimeError(
            "Não foi possível identificar a rodada atual."
        ) from erro


def indexar_clubes(
    mercado: dict[str, Any],
) -> dict[int, dict[str, Any]]:
    clubes = mercado.get("clubes", {})

    resultado: dict[int, dict[str, Any]] = {}

    for clube_id, clube in clubes.items():
        try:
            chave = int(clube_id)
        except (TypeError, ValueError):
            continue

        resultado[chave] = clube

    return resultado


def indexar_posicoes(
    mercado: dict[str, Any],
) -> dict[int, dict[str, Any]]:
    posicoes = mercado.get("posicoes", {})

    resultado: dict[int, dict[str, Any]] = {}

    for posicao_id, posicao in posicoes.items():
        try:
            chave = int(posicao_id)
        except (TypeError, ValueError):
            continue

        resultado[chave] = posicao

    return resultado


def obter_apelido_clube(
    clube: dict[str, Any] | None,
) -> str:
    if not clube:
        return ""

    return str(
        clube.get("abreviacao")
        or clube.get("nome")
        or ""
    )


def normalizar_atletas(
    mercado: dict[str, Any],
    pontuados: dict[str, Any] | None,
    rodada: int,
) -> list[dict[str, Any]]:
    atletas = mercado.get("atletas", [])
    clubes = indexar_clubes(mercado)
    posicoes_api = indexar_posicoes(mercado)

    pontuacoes: dict[str, Any] = {}

    if isinstance(pontuados, dict):
        pontuacoes = pontuados.get("atletas", {}) or {}

    jogadores: list[dict[str, Any]] = []

    for atleta in atletas:
        atleta_id = atleta.get("atleta_id")
        posicao_id = atleta.get("posicao_id")
        clube_id = atleta.get("clube_id")

        clube = clubes.get(clube_id)
        posicao_api = posicoes_api.get(posicao_id, {})

        pontuacao = (
            pontuacoes.get(str(atleta_id))
            or pontuacoes.get(atleta_id)
            or {}
        )

        codigo_posicao = (
            POSICOES.get(posicao_id)
            or str(
                posicao_api.get("abreviacao")
                or ""
            ).upper()
        )

        jogador = {
            "id": atleta_id,
            "rodada": rodada,
            "nome": atleta.get("nome"),
            "apelido": atleta.get("apelido"),
            "foto": atleta.get("foto"),
            "posicao": codigo_posicao,
            "posicaoId": posicao_id,
            "clubeId": clube_id,
            "clube": (
                clube.get("nome")
                if clube
                else ""
            ),
            "siglaClube": obter_apelido_clube(clube),
            "statusId": atleta.get("status_id"),
            "preco": atleta.get("preco_num"),
            "variacao": atleta.get("variacao_num"),
            "media": atleta.get("media_num"),
            "jogos": atleta.get("jogos_num"),
            "pontosUltimaRodada": atleta.get("pontos_num"),
            "pontuacaoReal": pontuacao.get("pontuacao"),
            "entrouEmCampo": pontuacao.get("entrou_em_campo"),
            "scouts": pontuacao.get("scout", {}),
        }

        jogadores.append(jogador)

    return jogadores


def criar_resumo(
    rodada: int,
    status: dict[str, Any],
    mercado: dict[str, Any],
    jogadores: list[dict[str, Any]],
) -> dict[str, Any]:
    pontuados = [
        jogador
        for jogador in jogadores
        if jogador.get("pontuacaoReal") is not None
    ]

    return {
        "rodada": rodada,
        "coletadoEm": datetime.now().isoformat(
            timespec="seconds"
        ),
        "statusMercado": status.get("status_mercado"),
        "quantidadeJogadores": len(
            mercado.get("atletas", [])
        ),
        "quantidadePontuados": len(pontuados),
        "dadosDemonstrativos": False,
    }


def executar() -> None:
    print("Iniciando coleta do Cartola...")

    status = buscar_json(
        "/mercado/status"
    )

    rodada = obter_numero_rodada(status)

    pasta_rodada = (
        PASTA_DADOS
        / f"rodada-{rodada:02d}"
    )

    mercado = buscar_json(
        "/atletas/mercado"
    )

    partidas = buscar_json(
        f"/partidas/{rodada}",
        obrigatorio=False,
    )

    if partidas is None:
        partidas = buscar_json(
            "/partidas",
            obrigatorio=False,
        )

    pontuados = buscar_json(
        "/atletas/pontuados",
        obrigatorio=False,
    )

    jogadores = normalizar_atletas(
        mercado=mercado,
        pontuados=pontuados,
        rodada=rodada,
    )

    resumo = criar_resumo(
        rodada=rodada,
        status=status,
        mercado=mercado,
        jogadores=jogadores,
    )

    salvar_json(
        PASTA_DADOS / "status.json",
        status,
    )

    salvar_json(
        pasta_rodada / "mercado.json",
        mercado,
    )

    salvar_json(
        pasta_rodada / "partidas.json",
        partidas or {},
    )

    salvar_json(
        pasta_rodada / "pontuados.json",
        pontuados or {},
    )

    salvar_json(
        pasta_rodada / "jogadores.json",
        jogadores,
    )

    salvar_json(
        pasta_rodada / "resumo.json",
        resumo,
    )

    print(
        f"Coleta da rodada {rodada} concluída: "
        f"{len(jogadores)} jogadores."
    )


if __name__ == "__main__":
    try:
        executar()

    except Exception as erro:
        print(
            f"ERRO: {erro}",
            file=sys.stderr,
        )
        sys.exit(1)
