"""Gate final de integridade da rodada corrente e do site."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
SAIDA = DATA / "auditoria-validacao-final-r24.json"


def ler_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    status = ler_json(DATA / "api" / "status.json")
    rodada = int(status.get("rodada_atual") or 0)
    jogadores_path = DATA / "api" / f"rodada-{rodada:02d}" / "jogadores.json"
    jogadores = ler_json(jogadores_path) if jogadores_path.exists() else []
    capitao = ler_json(DATA / "validacao-integracao-capitao.json")
    motor = ler_json(DATA / "auditoria-bloco-final-motor.json")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    dados = (ROOT / "js" / "escalacoes" / "dados.js").read_text(encoding="utf-8")
    filtros = (ROOT / "js" / "escalacoes" / "filtros.js").read_text(encoding="utf-8")
    filtros_ui = (ROOT / "js" / "filtros-exclusao.js").read_text(encoding="utf-8")

    checks = {
        "rodadaCorrenteValida": rodada > 0,
        "baseRodadaPopulada": len(jogadores) >= 500,
        "capitaoCientificoAprovado": capitao.get("aprovado") is True,
        "motorFinalAprovado": motor.get("aprovado") is True,
        "patrimonioPadrao200": (
            "PATRIMONIO_PADRAO_ESCALACOES =\n  200" in dados
            or "PATRIMONIO_PADRAO_ESCALACOES = 200" in dados
        ),
        "paginasPrincipaisPresentes": all(
            texto in index
            for texto in ["Recomendações", "Times sugeridos", "Histórico", "Metodologia"]
        ),
        "moduloAnalisePresente": "js/analise.js" in index,
        "capitaoAntesEscalacoes": (
            index.find("js/capitao.js") >= 0
            and index.find("js/escalacoes/dados.js") >= 0
            and index.find("js/capitao.js") < index.find("js/escalacoes/dados.js")
        ),
        "filtrosUiPresentes": (
            "Aplicar filtros" in filtros_ui
            and "Limpar filtros" in filtros_ui
            and "cartola:filtros-aplicados" in filtros_ui
        ),
        "filtroTimesUsaEstadoExclusao": (
            "CartolaFiltrosExclusao" in filtros
            and "clubesExcluidos" in filtros
            and "jogadoresExcluidos" in filtros
        ),
        "filtroTimesRecalculoRobusto": (
            "window.recalcularEscalacoes =" in filtros
            and "EscalacoesDados.recarregar" in filtros
        ),
        "filtroTimesAutoAuditoria": (
            "auditarFiltrosNasEscalacoes" in filtros
            and "cartola:filtros-aplicados" in filtros
        ),
    }

    resultado = {
        "modelo": "auditoria_validacao_final_r24_v3",
        "rodada": rodada,
        "jogadoresRodada": len(jogadores),
        "aprovado": all(checks.values()),
        "checks": checks,
        "falhas": [nome for nome, ok in checks.items() if not ok],
    }

    SAIDA.write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(resultado, ensure_ascii=False, indent=2))

    if not resultado["aprovado"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
