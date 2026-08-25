"""Auditoria V2.1 das regras de pontuação final do Cartola.

Diagnóstico não promocional. Confere se a simulação histórica vigente
reproduz capitão 1,5x, substituição automática do banco e Reserva de Luxo.
R24 não é usada para ajuste retrospectivo.
"""
from __future__ import annotations

import json
from pathlib import Path
from statistics import mean

BASE = Path(__file__).resolve().parents[2]
ENTRADA = BASE / "data" / "simulacao-times.json"
SAIDA = BASE / "data" / "auditoria-regras-cartola.json"


def carregar(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main():
    dados = carregar(ENTRADA)
    metodologia = dados.get("metodologia", {})
    rodadas = [r for r in dados.get("rodadas", []) if int(r.get("rodada", 0)) <= 23]

    estrategias = []
    excesso_capitao = []
    for rodada in rodadas:
        for e in rodada.get("estrategias", []):
            bonus_atual = float(e.get("bonusCapitao") or 0)
            # simulacao_times_v3 soma 100% da pontuação do capitão ao total base.
            # No Cartola clássico o capitão vale 1,5x; portanto o bônus correto é 50%.
            excesso = bonus_atual * 0.5
            excesso_capitao.append(excesso)
            estrategias.append({
                "rodada": rodada.get("rodada"),
                "perfil": e.get("perfil") or e.get("nome"),
                "pontuacaoPublicada": e.get("pontuacaoComCapitao"),
                "bonusCapitaoPublicado": round(bonus_atual, 2),
                "bonusCapitaoCorretoEstimado": round(bonus_atual * 0.5, 2),
                "pontuacaoCorrigidaSomenteCapitao": round(float(e.get("pontuacaoComCapitao") or 0) - excesso, 2),
            })

    capitao_ok = metodologia.get("pontuacaoCapitaoDuplicada") is not True
    banco_ok = metodologia.get("bancoNaoSubstituiAutomaticamente") is not True
    luxo_ok = metodologia.get("reservaLuxoAvaliadaSeparadamente") is not True

    saida = {
        "modelo": "auditoria_regras_cartola_v21",
        "rodadasAuditadas": [r.get("rodada") for r in rodadas],
        "r24Excluida": True,
        "regrasOficiaisAlvo": {
            "capitao": "pontuacao final 1,5x (bonus de 50% sobre a pontuacao regular)",
            "banco": "reserva da mesma posicao substitui titular que nao entrou, apenas se reserva pontuar > 0",
            "reservaLuxo": "se todos os titulares da posicao jogarem, pode substituir o menor real se sua pontuacao for superior; se titular nao jogar, prevalece a regra normal do banco",
        },
        "diagnosticoImplementacaoAtual": {
            "capitaoConforme": capitao_ok,
            "bancoConforme": banco_ok,
            "reservaLuxoConforme": luxo_ok,
            "simulacaoHistoricaAptaComoPontuacaoFinalCartola": capitao_ok and banco_ok and luxo_ok,
        },
        "impactoCapitao": {
            "timesRodadaAuditados": len(excesso_capitao),
            "excessoMedioPontosPorTimeRodada": round(mean(excesso_capitao), 3) if excesso_capitao else 0,
            "excessoTotalPontos": round(sum(excesso_capitao), 2),
            "observacao": "Impacto isolado do multiplicador; banco e Reserva de Luxo ainda precisam ser reconstruidos antes de recalcular rankings finais.",
        },
        "amostraCorrecaoCapitao": estrategias,
        "decisao": "REPROCESSAR_PONTUACAO_FINAL" if not (capitao_ok and banco_ok and luxo_ok) else "REGRAS_CONFORMES",
        "proibicaoPromocao": not (capitao_ok and banco_ok and luxo_ok),
    }

    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "decisao": saida["decisao"],
        "timesRodadaAuditados": saida["impactoCapitao"]["timesRodadaAuditados"],
        "excessoMedioCapitao": saida["impactoCapitao"]["excessoMedioPontosPorTimeRodada"],
        "capitaoConforme": capitao_ok,
        "bancoConforme": banco_ok,
        "reservaLuxoConforme": luxo_ok,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
