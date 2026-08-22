"""Promove anti-conflito no motor de Times Sugeridos somente se o torneio aprovar."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
ARQ = ROOT / "js" / "escalacoes" / "dados.js"
TORNEIO = ROOT / "data" / "torneio-anti-conflito.json"
MARCADOR = "ANTI-CONFLITO VALIDADO V1"


def main():
    torneio = json.loads(TORNEIO.read_text(encoding="utf-8"))
    if torneio.get("decisao") != "PROMOVER_ANTI_CONFLITO":
        print("Anti-conflito não aprovado; nenhuma alteração produtiva aplicada.")
        return

    texto = ARQ.read_text(encoding="utf-8")
    if MARCADOR in texto:
        print("Anti-conflito já integrado.")
        return

    ancora = "/* =========================================================\n   SELEÇÃO INICIAL DE TITULARES\n   ========================================================= */"
    if ancora not in texto:
        raise SystemExit("Âncora de seleção de titulares não encontrada")

    bloco = r'''
/* =========================================================
   ANTI-CONFLITO VALIDADO V1
   =========================================================
   Evita GOL/LAT/ZAG de um clube junto com MEI/ATA do
   adversário na mesma escalação. Regra promovida após
   torneio walk-forward reotimizado (baseline x penalidade
   x bloqueio). Não bloqueia MEI x MEI ou ATA x ATA.
   ========================================================= */

function obterAdversarioJogadorEscalacao(jogador) {
  return String(
    jogador?.siglaAdversario ??
    jogador?.adversarioSigla ??
    jogador?.adversario ??
    jogador?.clubeAdversario ??
    jogador?.adversarioId ??
    ""
  ).trim().toUpperCase();
}

function ehPosicaoDefensivaEscalacao(posicao) {
  return ["GOL", "LAT", "ZAG"].includes(String(posicao || "").toUpperCase());
}

function ehPosicaoOfensivaEscalacao(posicao) {
  return ["MEI", "ATA"].includes(String(posicao || "").toUpperCase());
}

function jogadoresConflitamEscalacao(a, b) {
  const clubeA = obterClubeJogadorEscalacao(a);
  const clubeB = obterClubeJogadorEscalacao(b);
  const advA = obterAdversarioJogadorEscalacao(a);
  const advB = obterAdversarioJogadorEscalacao(b);
  if (!clubeA || !clubeB || clubeA === clubeB) return false;
  const adversarios = advA === clubeB || advB === clubeA;
  if (!adversarios) return false;
  const posA = obterPosicaoJogadorEscalacao(a);
  const posB = obterPosicaoJogadorEscalacao(b);
  return (
    (ehPosicaoDefensivaEscalacao(posA) && ehPosicaoOfensivaEscalacao(posB)) ||
    (ehPosicaoDefensivaEscalacao(posB) && ehPosicaoOfensivaEscalacao(posA))
  );
}

function contarConflitosEscalacao(titulares) {
  let total = 0;
  for (let i = 0; i < titulares.length; i += 1) {
    for (let j = i + 1; j < titulares.length; j += 1) {
      if (jogadoresConflitamEscalacao(titulares[i], titulares[j])) total += 1;
    }
  }
  return total;
}

function respeitaLimiteClubesEscalacao(titulares, limite = 3) {
  const mapa = new Map();
  titulares.forEach(jogador => {
    const clube = obterClubeJogadorEscalacao(jogador);
    if (!clube) return;
    mapa.set(clube, (mapa.get(clube) || 0) + 1);
  });
  return [...mapa.values()].every(qtd => qtd <= limite);
}

function resolverConflitosEscalacao(titularesOriginais, grupos, perfil, patrimonio) {
  let titulares = titularesOriginais.map(copiarJogadorEscalacao);
  let ciclos = 0;

  while (contarConflitosEscalacao(titulares) > 0 && ciclos < 20) {
    ciclos += 1;
    const conflitosAntes = contarConflitosEscalacao(titulares);
    const idsAtuais = new Set(titulares.map(j => String(obterIdJogadorEscalacao(j))));
    let melhorTroca = null;

    titulares.forEach((titular, indice) => {
      const posicao = obterPosicaoJogadorEscalacao(titular);
      (grupos[posicao] || []).forEach(candidato => {
        const id = String(obterIdJogadorEscalacao(candidato));
        if (idsAtuais.has(id)) return;
        const teste = titulares.map(copiarJogadorEscalacao);
        teste[indice] = copiarJogadorEscalacao(candidato);
        if (calcularCustoListaEscalacao(teste) > patrimonio) return;
        if (!respeitaLimiteClubesEscalacao(teste, 3)) return;
        const conflitosDepois = contarConflitosEscalacao(teste);
        if (conflitosDepois >= conflitosAntes) return;

        const perdaNota =
          calcularNotaJogadorEscalacao(titular, perfil) -
          calcularNotaJogadorEscalacao(candidato, perfil);

        const troca = { indice, candidato, conflitosDepois, perdaNota };
        if (
          !melhorTroca ||
          troca.conflitosDepois < melhorTroca.conflitosDepois ||
          (
            troca.conflitosDepois === melhorTroca.conflitosDepois &&
            troca.perdaNota < melhorTroca.perdaNota
          )
        ) melhorTroca = troca;
      });
    });

    if (!melhorTroca) break;
    titulares[melhorTroca.indice] = copiarJogadorEscalacao(melhorTroca.candidato);
  }

  return titulares;
}

'''
    texto = texto.replace(ancora, bloco + ancora, 1)

    antigo = '''  const custo =\n    calcularCustoListaEscalacao(\n      melhorados\n    );\n\n\n  if (\n    custo >\n    patrimonio\n  ) {\n\n    return null;\n\n  }\n\n\n  return melhorados;'''
    novo = '''  const semConflitos =\n    resolverConflitosEscalacao(\n      melhorados,\n      grupos,\n      perfil,\n      patrimonio\n    );\n\n\n  const custo =\n    calcularCustoListaEscalacao(\n      semConflitos\n    );\n\n\n  if (\n    custo >\n    patrimonio\n  ) {\n\n    return null;\n\n  }\n\n\n  return semConflitos;'''
    if antigo not in texto:
        raise SystemExit("Trecho de retorno dos titulares não encontrado")
    texto = texto.replace(antigo, novo, 1)

    ARQ.write_text(texto, encoding="utf-8")
    print("Anti-conflito promovido no motor de Times Sugeridos.")


if __name__ == "__main__":
    main()
