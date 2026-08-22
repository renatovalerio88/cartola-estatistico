"""Auditoria estrutural completa do frontend antes do fechamento do projeto."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
SAIDA = DATA / "auditoria-site-completo.json"


def texto(path):
    return (ROOT / path).read_text(encoding="utf-8")


def main():
    index = texto("index.html")
    css = texto("css/style.css")
    filtros = texto("js/escalacoes/filtros.js")
    dados = texto("js/escalacoes/dados.js")
    capitao = texto("js/capitao.js")

    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', index)
    scripts_locais = [s.split("?")[0] for s in scripts if not s.startswith(("http://", "https://"))]
    scripts_ausentes = [s for s in scripts_locais if not (ROOT / s).exists()]

    ids_tabs = re.findall(r'<section[^>]+id=["\']([^"\']+)["\']', index)
    tabs_esperadas = ["recomendacoes", "times", "historico", "metodologia", "analise"]

    checks = {
        "scriptsReferenciadosExistem": not scripts_ausentes,
        "abasPrincipaisExistem": all(tab in ids_tabs for tab in tabs_esperadas),
        "layoutResponsivoPresente": "@media" in css,
        "modoMobilePresente": "mobile-menu-button" in css and "mobileMenuButton" in index,
        "patrimonioPadrao200": "PATRIMONIO_PADRAO_ESCALACOES" in dados and "200" in dados,
        "tresFormacoes": all(f in dados for f in ["4-4-2", "3-4-3", "4-3-3"]),
        "capitaoPosicional": "Posicional_Equilibrado" in capitao,
        "filtroClubesJogadores": "clubesExcluidos" in filtros and "jogadoresExcluidos" in filtros,
        "filtroRecalculaMotorCorreto": "window.recalcularEscalacoes =" in filtros and "EscalacoesDados.recarregar" in filtros,
        "filtroAuditaResultado": "auditarFiltrosNasEscalacoes" in filtros,
        "historicoCarregado": "js/historico/" in index,
        "analiseRodadaCarregada": "js/analise.js" in index,
        "recomendacoesCarregadas": "js/recomendacoes/" in index,
        "escalacoesCarregadas": "js/escalacoes/" in index,
    }

    resultado = {
        "modelo": "auditoria_site_completo_v1",
        "aprovado": all(checks.values()),
        "checks": checks,
        "scriptsReferenciados": len(scripts_locais),
        "scriptsAusentes": scripts_ausentes,
        "abasEncontradas": ids_tabs,
        "falhas": [nome for nome, ok in checks.items() if not ok],
    }

    SAIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    if not resultado["aprovado"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
