"""
CARTOLA ESTATÍSTICO
Validação de integração do Capitão Posicional Equilibrado.

Não altera o modelo oficial. Reexecuta o walk-forward usando o vencedor
científico do Torneio V2 e gera um artefato simples de aceite/rejeição.
"""
from pathlib import Path
from copy import deepcopy
import json
import torneio_capitao as torneio

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SAIDA = BASE_DIR / "data" / "validacao-integracao-capitao.json"


def processar():
    modelos_originais = deepcopy(torneio.MODELOS)
    arquivo_original = torneio.ARQUIVO_SAIDA
    temporario = BASE_DIR / "data" / ".tmp-integracao-capitao.json"
    try:
        torneio.MODELOS = {
            "Atual_Projecao": deepcopy(modelos_originais["Atual_Projecao"]),
            "Posicional": {
                "descricao": "Posicional_Equilibrado vencedor do Torneio V2",
                "posicional": True,
            },
        }
        torneio.ARQUIVO_SAIDA = temporario
        torneio.processar()
        dados = json.loads(temporario.read_text(encoding="utf-8"))
        candidato = dados.get("melhorExperimental") or {}
        temporal = candidato.get("desempenhoTemporal", {})
        criterios = {
            "ganhoCampeonatoPositivo": (candidato.get("ganhoMedioTimeVsAtual") or 0) > 0,
            "ganhoUltimas10Positivo": (temporal.get("ultimas10", {}).get("ganhoTimeVsAtual") or 0) > 0,
            "ganhoUltimas5Positivo": (temporal.get("ultimas5", {}).get("ganhoTimeVsAtual") or 0) > 0,
            "ganhoUltimas3NaoNegativo": (temporal.get("ultimas3", {}).get("ganhoTimeVsAtual") or 0) >= 0,
            "maisVitoriasQueDerrotas": (candidato.get("vitoriasVsAtual") or 0) > (candidato.get("derrotasVsAtual") or 0),
        }
        aprovado = all(criterios.values())
        saida = {
            "modelo": "validacao_integracao_capitao_posicional_equilibrado",
            "baseline": "Atual_Projecao",
            "candidato": candidato,
            "criterios": criterios,
            "aprovado": aprovado,
            "decisao": "APROVAR_INTEGRACAO" if aprovado else "MANTER_CAPITAO_ATUAL",
            "seguranca": {"semVazamentoFuturo": True, "alteraModeloOficial": False},
        }
        SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"aprovado": aprovado, "decisao": saida["decisao"], "criterios": criterios}, ensure_ascii=False, indent=2))
        if not aprovado:
            raise SystemExit(2)
    finally:
        torneio.MODELOS = modelos_originais
        torneio.ARQUIVO_SAIDA = arquivo_original
        if temporario.exists():
            temporario.unlink()


if __name__ == "__main__":
    processar()
