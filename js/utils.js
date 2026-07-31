/* =========================================================
   CARTOLA ESTATÍSTICO
   Funções utilitárias compartilhadas
   ========================================================= */


/* =========================================================
   FORMATAÇÃO DE VALORES
   ========================================================= */

function formatarPontos(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "--";
  }

  return `${numero.toFixed(1)} pts`;
}


function formatarCartoletas(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "C$ --";
  }

  return `C$ ${numero.toFixed(2)}`;
}


function formatarPorcentagem(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "--";
  }

  return `${Math.round(numero)}%`;
}


function formatarDecimal(
  valor,
  casasDecimais = 1
) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "--";
  }

  return numero.toFixed(casasDecimais);
}


/* =========================================================
   CONVERSÃO E LIMITES
   ========================================================= */

function numeroSeguro(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return numero;
}


function limitarValor(
  valor,
  minimo,
  maximo
) {
  return Math.min(
    Math.max(
      numeroSeguro(valor),
      minimo
    ),
    maximo
  );
}


/* =========================================================
   NORMALIZAÇÃO DE TEXTO
   ========================================================= */

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}


/* =========================================================
   SEGURANÇA DE HTML
   ========================================================= */

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   ALTERAÇÃO DE TEXTO NO HTML
   ========================================================= */

function definirTextoElemento(
  idElemento,
  texto
) {
  const elemento =
    document.getElementById(idElemento);

  if (!elemento) {
    return;
  }

  elemento.textContent = texto;
}


/* =========================================================
   CLASSIFICAÇÃO DE RISCO
   ========================================================= */

function obterClasseRisco(risco) {
  const riscoNormalizado =
    normalizarTexto(risco);

  if (
    riscoNormalizado === "baixo" ||
    riscoNormalizado === "baixa"
  ) {
    return "risk-low";
  }

  if (
    riscoNormalizado === "alto" ||
    riscoNormalizado === "alta"
  ) {
    return "risk-high";
  }

  return "risk-medium";
}


/* =========================================================
   CLASSIFICAÇÃO DE CONFIANÇA
   ========================================================= */

function obterClasseConfianca(
  confianca
) {
  const confiancaNormalizada =
    normalizarTexto(confianca);

  if (
    confiancaNormalizada === "alta" ||
    confiancaNormalizada === "alto"
  ) {
    return "confidence-high";
  }

  if (
    confiancaNormalizada === "baixa" ||
    confiancaNormalizada === "baixo"
  ) {
    return "confidence-low";
  }

  return "confidence-medium";
}


function obterClasseConfiancaNumerica(
  valor
) {
  const numero =
    numeroSeguro(valor);

  if (numero >= 85) {
    return "confidence-high";
  }

  if (numero < 70) {
    return "confidence-low";
  }

  return "confidence-medium";
}


/* =========================================================
   LISTAS HTML
   ========================================================= */

function criarItensLista(
  itens,
  textoAlternativo
) {
  if (
    !Array.isArray(itens) ||
    itens.length === 0
  ) {
    return `
      <li>
        ${escaparHtml(textoAlternativo)}
      </li>
    `;
  }

  return itens
    .map(
      (item) => `
        <li>
          ${escaparHtml(item)}
        </li>
      `
    )
    .join("");
}


/* =========================================================
   BARRA VISUAL
   ========================================================= */

function criarBarraIndicador(
  rotulo,
  valor,
  classe
) {
  const valorSeguro =
    limitarValor(
      valor,
      0,
      100
    );

  return `
    <div class="indicator-line">

      <div class="indicator-label">

        <span>
          ${escaparHtml(rotulo)}
        </span>

        <strong>
          ${formatarPorcentagem(
            valorSeguro
          )}
        </strong>

      </div>

      <div class="indicator-track">

        <div
          class="
            indicator-fill
            ${escaparHtml(classe)}
          "
          style="
            width: ${valorSeguro}%;
          "
        >
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   BUSCA DE POSIÇÃO
   ========================================================= */

function obterNomePosicao(
  codigoPosicao,
  singular = false
) {
  const posicoes = {
    GOL: {
      singular: "Goleiro",
      plural: "Goleiros"
    },

    LAT: {
      singular: "Lateral",
      plural: "Laterais"
    },

    ZAG: {
      singular: "Zagueiro",
      plural: "Zagueiros"
    },

    MEI: {
      singular: "Meia",
      plural: "Meias"
    },

    ATA: {
      singular: "Atacante",
      plural: "Atacantes"
    },

    TEC: {
      singular: "Treinador",
      plural: "Treinadores"
    }
  };

  const posicao =
    posicoes[codigoPosicao];

  if (!posicao) {
    return codigoPosicao || "Posição";
  }

  return singular
    ? posicao.singular
    : posicao.plural;
}


/* =========================================================
   ORDEM DAS POSIÇÕES
   ========================================================= */

function obterOrdemPosicao(
  codigoPosicao
) {
  const ordem = {
    GOL: 1,
    LAT: 2,
    ZAG: 3,
    MEI: 4,
    ATA: 5,
    TEC: 6
  };

  return ordem[codigoPosicao] || 99;
}


/* =========================================================
   ORDENAÇÃO DE JOGADORES DE UMA ESCALAÇÃO
   ========================================================= */

function compararJogadoresEscalacao(
  jogadorA,
  jogadorB
) {
  const diferencaPosicao =
    obterOrdemPosicao(
      jogadorA.posicao
    ) -
    obterOrdemPosicao(
      jogadorB.posicao
    );

  if (diferencaPosicao !== 0) {
    return diferencaPosicao;
  }

  return (
    numeroSeguro(
      jogadorB.projecao
    ) -
    numeroSeguro(
      jogadorA.projecao
    )
  );
}


/* =========================================================
   VALIDAÇÃO DE ARRAYS E OBJETOS
   ========================================================= */

function ehListaValida(valor) {
  return (
    Array.isArray(valor) &&
    valor.length > 0
  );
}


function ehObjetoValido(valor) {
  return Boolean(
    valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}
