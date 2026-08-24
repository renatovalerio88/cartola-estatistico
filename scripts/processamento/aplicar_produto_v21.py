#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
DADOS = ROOT / "js" / "escalacoes" / "dados.js"

SCRIPT_TAG = '  <script src="js/explorador-v21.js"></script>\n\n'
APP_TAG = '  <script src="js/app.js"></script>'

OLD_FORMACOES = '''const FORMACOES_CANDIDATAS_ESCALACAO = [
  "4-4-2",
  "3-4-3",
  "4-3-3"
];'''

NEW_FORMACOES = '''const FORMACOES_CANDIDATAS_ESCALACAO = [
  "3-4-3",
  "3-5-2",
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "5-3-2",
  "5-4-1"
];'''

OLD_ESTRUTURA = '''const FORMACOES_ESTRUTURA_ESCALACAO = {

  "4-4-2": {
    GOL: 1,
    LAT: 2,
    ZAG: 2,
    MEI: 4,
    ATA: 2,
    TEC: 1
  },

  "3-4-3": {
    GOL: 1,
    LAT: 0,
    ZAG: 3,
    MEI: 4,
    ATA: 3,
    TEC: 1
  },

  "4-3-3": {
    GOL: 1,
    LAT: 2,
    ZAG: 2,
    MEI: 3,
    ATA: 3,
    TEC: 1
  }

};'''

NEW_ESTRUTURA = '''const FORMACOES_ESTRUTURA_ESCALACAO = {

  "3-4-3": { GOL: 1, LAT: 0, ZAG: 3, MEI: 4, ATA: 3, TEC: 1 },
  "3-5-2": { GOL: 1, LAT: 0, ZAG: 3, MEI: 5, ATA: 2, TEC: 1 },
  "4-3-3": { GOL: 1, LAT: 2, ZAG: 2, MEI: 3, ATA: 3, TEC: 1 },
  "4-4-2": { GOL: 1, LAT: 2, ZAG: 2, MEI: 4, ATA: 2, TEC: 1 },
  "4-5-1": { GOL: 1, LAT: 2, ZAG: 2, MEI: 5, ATA: 1, TEC: 1 },
  "5-3-2": { GOL: 1, LAT: 2, ZAG: 3, MEI: 3, ATA: 2, TEC: 1 },
  "5-4-1": { GOL: 1, LAT: 2, ZAG: 3, MEI: 4, ATA: 1, TEC: 1 }

};'''

OLD_PATRIMONIO = '''  /*
   * Não existe teto artificial de 120.
   * 120 é somente o valor padrão.
   */

  return arredondarEscalacao(
    patrimonio,
    2
  );'''

NEW_PATRIMONIO = '''  /*
   * V2.1: patrimônio é configurável pelo usuário,
   * com teto operacional explícito de C$ 200.
   */

  return arredondarEscalacao(
    Math.min(
      200,
      Math.max(1, patrimonio)
    ),
    2
  );'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: esperado 1 marcador antigo, encontrado {count}")
    return text.replace(old, new, 1)


def main() -> None:
    index = INDEX.read_text(encoding="utf-8")
    if 'js/explorador-v21.js' not in index:
        if index.count(APP_TAG) != 1:
            raise RuntimeError("index.html: marcador js/app.js ausente ou duplicado")
        index = index.replace(APP_TAG, SCRIPT_TAG + APP_TAG, 1)
        INDEX.write_text(index, encoding="utf-8")

    dados = DADOS.read_text(encoding="utf-8")
    dados = replace_once(dados, OLD_FORMACOES, NEW_FORMACOES, "formações candidatas")
    dados = replace_once(dados, OLD_ESTRUTURA, NEW_ESTRUTURA, "estruturas de formação")
    dados = replace_once(dados, OLD_PATRIMONIO, NEW_PATRIMONIO, "patrimônio")
    DADOS.write_text(dados, encoding="utf-8")

    assert 'js/explorador-v21.js' in INDEX.read_text(encoding="utf-8")
    final = DADOS.read_text(encoding="utf-8")
    for formacao in ("3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"):
        assert formacao in final
    assert "Math.min(\n      200" in final
    print("Produto V2.1 aplicado/validado com sucesso.")


if __name__ == "__main__":
    main()
