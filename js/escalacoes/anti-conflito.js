/* Cartola Estatístico — Anti-conflito de confronto
 * Candidato científico: não deve ser promovido sem backtest.
 */
const AntiConflitoEscalacao = (() => {
  "use strict";

  const POSICOES_DEFESA = new Set(["GOL", "LAT", "ZAG"]);
  const POSICOES_ATAQUE = new Set(["MEI", "ATA"]);

  function texto(v) { return String(v ?? "").trim().toUpperCase(); }
  function clube(j) { return texto(j?.siglaClube ?? j?.clubeSigla ?? j?.clube ?? j?.clubeId ?? j?.clube_id); }
  function posicao(j) { return texto(j?.posicao ?? j?.posicaoSigla ?? j?.posicaoAbreviacao); }
  function adversario(j) { return texto(j?.siglaAdversario ?? j?.adversarioSigla ?? j?.adversario ?? j?.clubeAdversario ?? j?.adversarioId); }

  function saoAdversarios(a, b) {
    const ca = clube(a);
    const cb = clube(b);
    if (!ca || !cb || ca === cb) return false;
    const aa = adversario(a);
    const ab = adversario(b);
    return aa === cb || ab === ca;
  }

  function ehConflito(a, b) {
    if (!saoAdversarios(a, b)) return false;
    const pa = posicao(a);
    const pb = posicao(b);
    return (
      (POSICOES_DEFESA.has(pa) && POSICOES_ATAQUE.has(pb)) ||
      (POSICOES_DEFESA.has(pb) && POSICOES_ATAQUE.has(pa))
    );
  }

  function listar(titulares) {
    const lista = Array.isArray(titulares) ? titulares : [];
    const conflitos = [];
    for (let i = 0; i < lista.length; i += 1) {
      for (let j = i + 1; j < lista.length; j += 1) {
        if (!ehConflito(lista[i], lista[j])) continue;
        conflitos.push({ a: lista[i], b: lista[j] });
      }
    }
    return conflitos;
  }

  function avaliar(titulares, modo = "penalidade", penalidadePorConflito = 1.5) {
    const conflitos = listar(titulares);
    return {
      modo,
      quantidade: conflitos.length,
      bloqueado: modo === "bloqueio" && conflitos.length > 0,
      penalidade: modo === "penalidade" ? conflitos.length * Number(penalidadePorConflito || 0) : 0,
      conflitos
    };
  }

  return { listar, avaliar, ehConflito };
})();

if (typeof window !== "undefined") window.AntiConflitoEscalacao = AntiConflitoEscalacao;
