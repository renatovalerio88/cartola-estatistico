"""
CARTOLA ESTATÍSTICO
Torneio Científico de Capitães - V2

Compara cinco famílias de pesos posicionais sem alterar o capitão oficial.
Cada família é avaliada no mesmo walk-forward do torneio V1.
"""

from copy import deepcopy
from pathlib import Path
import json

import torneio_capitao as torneio


BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARQUIVO_SAIDA = BASE_DIR / "data" / "torneio-capitao-v2.json"


PERFIS = {
    "Posicional_Equilibrado": {
        "descricao": "Perfil posicional original do torneio V1.",
        "multiplicadores": {},
    },
    "Posicional_Recente": {
        "descricao": "Aumenta forma, tendência e média recente.",
        "multiplicadores": {
            "mediaRecente": 1.45,
            "forma": 1.40,
            "tendencia": 1.35,
            "projecao": 0.90,
            "regularidade": 0.95,
        },
    },
    "Posicional_Explosivo": {
        "descricao": "Aumenta teto, explosão e potencial ofensivo.",
        "multiplicadores": {
            "teto": 1.45,
            "explosao": 1.45,
            "potencialOfensivo": 1.30,
            "piso": 0.80,
            "regularidade": 0.85,
        },
    },
    "Posicional_Seguro": {
        "descricao": "Aumenta piso, regularidade e confiança.",
        "multiplicadores": {
            "piso": 1.45,
            "regularidade": 1.40,
            "confianca": 1.30,
            "risco": 1.30,
            "volatilidade": 1.30,
            "teto": 0.85,
            "explosao": 0.80,
        },
    },
    "Posicional_Hibrido": {
        "descricao": "Mistura momento recente com potencial de explosão.",
        "multiplicadores": {
            "mediaRecente": 1.25,
            "forma": 1.20,
            "tendencia": 1.15,
            "teto": 1.20,
            "explosao": 1.15,
            "projecao": 0.95,
        },
    },
}


def ajustar_pesos(base_posicional, multiplicadores):
    resultado = {}
    for posicao, pesos in base_posicional.items():
        ajustados = {}
        for componente, peso in pesos.items():
            fator = multiplicadores.get(componente, 1.0)
            ajustados[componente] = peso * fator
        resultado[posicao] = ajustados
    return resultado


def ler_json(caminho):
    with open(caminho, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_json(caminho, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def score_perfil(item):
    temporal = item.get("desempenhoTemporal", {})
    ganho_campeonato = item.get("ganhoMedioTimeVsAtual", 0) or 0
    ganho10 = temporal.get("ultimas10", {}).get("ganhoTimeVsAtual", 0) or 0
    ganho5 = temporal.get("ultimas5", {}).get("ganhoTimeVsAtual", 0) or 0
    ganho3 = temporal.get("ultimas3", {}).get("ganhoTimeVsAtual", 0) or 0
    taxa = item.get("taxaVitoriasVsAtual", 0) or 0

    return round(
        ganho_campeonato * 2.0
        + ganho10 * 1.5
        + ganho5 * 1.8
        + ganho3 * 1.0
        + taxa * 0.03,
        4,
    )


def processar():
    modelos_originais = deepcopy(torneio.MODELOS)
    pesos_originais = deepcopy(torneio.PESOS_POSICAO)
    arquivo_original = torneio.ARQUIVO_SAIDA

    resultados = []

    try:
        for nome, configuracao in PERFIS.items():
            arquivo_temporario = BASE_DIR / "data" / f".tmp-{nome}.json"

            torneio.MODELOS = {
                "Atual_Projecao": deepcopy(modelos_originais["Atual_Projecao"]),
                "Posicional": {
                    "descricao": configuracao["descricao"],
                    "posicional": True,
                },
            }
            torneio.PESOS_POSICAO = ajustar_pesos(
                pesos_originais,
                configuracao["multiplicadores"],
            )
            torneio.ARQUIVO_SAIDA = arquivo_temporario

            print("=" * 64)
            print("PERFIL:", nome)
            print("=" * 64)
            torneio.processar()

            dados = ler_json(arquivo_temporario)
            candidato = dados.get("melhorExperimental") or {}
            candidato["perfil"] = nome
            candidato["descricaoPerfil"] = configuracao["descricao"]
            candidato["scorePerfilV2"] = score_perfil(candidato)
            resultados.append(candidato)

            if arquivo_temporario.exists():
                arquivo_temporario.unlink()

    finally:
        torneio.MODELOS = modelos_originais
        torneio.PESOS_POSICAO = pesos_originais
        torneio.ARQUIVO_SAIDA = arquivo_original

    resultados.sort(
        key=lambda x: (
            x.get("scorePerfilV2", -999),
            x.get("ganhoMedioTimeVsAtual", -999),
        ),
        reverse=True,
    )

    for indice, item in enumerate(resultados, start=1):
        item["posicaoV2"] = indice

    melhor = resultados[0] if resultados else {}
    temporal = melhor.get("desempenhoTemporal", {})

    criterios = {
        "ganhoCampeonatoPositivo": (melhor.get("ganhoMedioTimeVsAtual", 0) or 0) > 0,
        "ganhoUltimas10Positivo": (temporal.get("ultimas10", {}).get("ganhoTimeVsAtual", 0) or 0) > 0,
        "ganhoUltimas5Positivo": (temporal.get("ultimas5", {}).get("ganhoTimeVsAtual", 0) or 0) > 0,
        "ganhoUltimas3NaoNegativo": (temporal.get("ultimas3", {}).get("ganhoTimeVsAtual", 0) or 0) >= 0,
        "taxaVitorias25": (melhor.get("taxaVitoriasVsAtual", 0) or 0) >= 25,
        "maisVitoriasQueDerrotas": (melhor.get("vitoriasVsAtual", 0) or 0) > (melhor.get("derrotasVsAtual", 0) or 0),
    }

    aprovado = all(criterios.values())

    saida = {
        "modelo": "torneio_capitao_v2",
        "descricao": "Calibração de cinco famílias posicionais de capitão em walk-forward.",
        "perfisTestados": len(PERFIS),
        "ranking": resultados,
        "melhorPerfil": melhor,
        "criterios": criterios,
        "aprovadoParaProximaEtapa": aprovado,
        "decisao": (
            "TESTAR_PERFIL_VENCEDOR_INTEGRADO_AO_TIME"
            if aprovado
            else "MANTER_CAPITAO_OFICIAL_E_USAR_RESULTADO_COMO_EVIDENCIA"
        ),
        "seguranca": {
            "alteraCapitaoOficial": False,
            "promocaoAutomatica": False,
            "semVazamentoFuturo": True,
        },
    }

    salvar_json(ARQUIVO_SAIDA, saida)

    print("=" * 64)
    print("TORNEIO DE CAPITÃES V2 - RESULTADO")
    print("=" * 64)
    for item in resultados:
        t = item.get("desempenhoTemporal", {})
        print(
            f"{item['posicaoV2']:02d}. {item['perfil']:<24} | "
            f"camp {item.get('ganhoMedioTimeVsAtual', 0):+.3f} | "
            f"10 {t.get('ultimas10', {}).get('ganhoTimeVsAtual', 0):+.3f} | "
            f"5 {t.get('ultimas5', {}).get('ganhoTimeVsAtual', 0):+.3f} | "
            f"3 {t.get('ultimas3', {}).get('ganhoTimeVsAtual', 0):+.3f} | "
            f"vit {item.get('taxaVitoriasVsAtual', 0):.2f}%"
        )
    print("Melhor perfil:", melhor.get("perfil"))
    print("Decisão:", saida["decisao"])


if __name__ == "__main__":
    processar()
