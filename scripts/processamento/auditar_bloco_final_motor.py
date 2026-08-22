"""Auditoria estática do bloco final do motor e frontend."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SAIDA = ROOT / "data" / "auditoria-bloco-final-motor.json"


def texto(path):
    return (ROOT / path).read_text(encoding="utf-8")


def main():
    dados = texto("js/escalacoes/dados.js")
    capitao = texto("js/capitao.js")
    index = texto("index.html")

    checks = {
        "correcaoRecursaoPatrimonio": (
            "definirPatrimonioInternoEscalacoes" in dados
            and "window.definirPatrimonioEscalacoes =\n    atualizarPatrimonioEscalacoes" in dados
        ),
        "patrimonioSemBanco": (
            "validarPatrimonioEscalacao" in dados
            and "custoTitulares <=" in dados
        ),
        "formacoesCompetemSemVies": (
            all(f'\"{f}\"' in dados for f in ["4-4-2", "3-4-3", "4-3-3"])
            and "Não existe bônus artificial para 4-3-3" in dados
        ),
        "bancoPorPosicao": "obterPosicoesBancoEscalacao" in dados,
        "reservaPrecoTitularMaisBarato": (
            "obterLimitePrecoReservaPosicaoEscalacao" in dados
            and "Math.min" in dados
        ),
        "reservaLuxo": "selecionarReservaLuxoEscalacao" in dados,
        "titularidade": "obterTitularidadeJogadorEscalacao" in dados,
        "adequacaoRodada": "obterAdequacaoRodadaEscalacao" in dados,
        "capitaoPosicional": (
            "Posicional_Equilibrado" in capitao
            and "MotorCapitao.selecionar" in capitao
        ),
        "capitaoAntesEscalacoes": (
            index.find('js/capitao.js') >= 0
            and index.find('js/escalacoes/dados.js') >= 0
            and index.find('js/capitao.js') < index.find('js/escalacoes/dados.js')
        ),
        "diagnosticoEscalacoes": "diagnosticarEscalacoes" in dados,
        "testeReservas": "testarRegraReservasEscalacoes" in dados,
    }

    resultado = {
        "modelo": "auditoria_bloco_final_motor_v1",
        "aprovado": all(checks.values()),
        "checks": checks,
        "falhas": [nome for nome, ok in checks.items() if not ok],
    }
    SAIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    if not resultado["aprovado"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
