"""Auditoria estática da integração final do capitão no frontend."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SAIDA = ROOT / "data" / "auditoria-integracao-frontend.json"


def texto(path):
    return (ROOT / path).read_text(encoding="utf-8")


def main():
    capitao = texto("js/capitao.js")
    dados = texto("js/escalacoes/dados.js")
    index = texto("index.html")
    validacao = json.loads(texto("data/validacao-integracao-capitao.json"))

    checks = {
        "validacaoCientificaAprovada": validacao.get("aprovado") is True,
        "modeloPosicionalPresente": 'modelo: "Posicional_Equilibrado"' in capitao,
        "seletorNormalizadoPresente": "function selecionar(jogadores)" in capitao,
        "integracaoTimesComFallback": "window.selecionarCapitaoEscalacao" in capitao and "fallback" in capitao.lower(),
        "timesPossuemSeletorCapitao": "selecionarCapitaoEscalacao" in dados,
        "motorCarregadoAntesEscalacoes": index.find('src="js/capitao.js"') >= 0 and index.find('src="js/capitao.js"') < index.find('src="js/escalacoes/dados.js"'),
        "formacoesSemViesExplicito": all(f in dados for f in ['"4-4-2"', '"3-4-3"', '"4-3-3"']),
        "patrimonioConfiguravel": "patrimonioSelecionado" in dados and "PATRIMONIO_PADRAO_ESCALACOES" in dados,
        "bancoImplementado": "banco" in dados.lower(),
        "reservaLuxoImplementada": "reservaLuxo" in dados,
        "titularidadeImplementada": "Titularidade" in dados,
        "adequacaoRodadaImplementada": "AdequacaoRodada" in dados or "Adequação" in dados,
    }
    aprovado = all(checks.values())
    saida = {"modelo": "auditoria_integracao_frontend_v1", "aprovado": aprovado, "checks": checks}
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(saida, ensure_ascii=False, indent=2))
    if not aprovado:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
