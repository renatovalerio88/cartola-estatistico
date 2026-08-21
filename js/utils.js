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


/* =========================================================
   EXPERIÊNCIA DE PRODUTO / MARKETING
   Mantém dados dinâmicos: nada de números hardcoded.
   ========================================================= */

function instalarExperienciaProdutoCartola() {
  if (document.getElementById("ceProductExperienceStyle")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "ceProductExperienceStyle";
  style.textContent = `
    .ce-proof-strip {
      margin: 0 0 22px;
      padding: 15px 17px;
      border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
      border-radius: 16px;
      display: grid;
      grid-template-columns: minmax(220px,1.35fr) repeat(4,minmax(105px,.55fr));
      gap: 10px;
      background: linear-gradient(135deg,color-mix(in srgb,var(--surface) 93%,var(--primary)),var(--surface));
      box-shadow: var(--shadow-small);
    }
    .ce-proof-copy { padding: 6px 8px; }
    .ce-proof-copy strong { display:block; font-size:15px; }
    .ce-proof-copy small { display:block; margin-top:5px; color:var(--text-soft); line-height:1.45; }
    .ce-proof-metric { padding:10px 12px; border:1px solid var(--border); border-radius:12px; background:var(--surface); }
    .ce-proof-metric span { display:block; color:var(--text-soft); font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
    .ce-proof-metric b { display:block; margin-top:5px; color:var(--primary); font-size:20px; }
    .ce-proof-metric small { display:block; margin-top:2px; color:var(--text-soft); font-size:9px; }

    .ce-round-banner {
      margin: 0 0 18px;
      padding: 16px 18px;
      border-radius: 16px;
      color: #f5fff8;
      background: radial-gradient(circle at top right,rgba(197,163,77,.23),transparent 34%),linear-gradient(135deg,#0d2d1d,#16452e);
      display:flex; align-items:center; justify-content:space-between; gap:16px;
      box-shadow:0 14px 34px rgba(9,39,24,.18);
    }
    .ce-round-banner strong { display:block; font-size:17px; }
    .ce-round-banner p { margin:5px 0 0; color:#c5d9cb; font-size:11px; line-height:1.45; }
    .ce-round-chip { white-space:nowrap; padding:8px 11px; border-radius:999px; background:rgba(255,255,255,.10); font-size:10px; font-weight:800; }

    .ce-method-flow-premium {
      margin: 22px 0 28px;
      padding: 20px;
      border:1px solid var(--border);
      border-radius:20px;
      background:var(--surface);
      box-shadow:var(--shadow-medium);
    }
    .ce-method-flow-head { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; margin-bottom:17px; }
    .ce-method-flow-head h3 { margin:4px 0 0; font-size:20px; }
    .ce-method-flow-head p { max-width:680px; margin:6px 0 0; color:var(--text-soft); font-size:12px; line-height:1.5; }
    .ce-method-badge { padding:7px 10px; border-radius:999px; background:var(--primary-light); color:var(--primary); font-size:10px; font-weight:900; }
    .ce-method-flow-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:9px; }
    .ce-method-node { position:relative; min-height:125px; padding:13px; border:1px solid var(--border); border-radius:14px; background:var(--surface-soft-2); }
    .ce-method-node em { width:27px; height:27px; border-radius:9px; display:grid; place-items:center; font-style:normal; font-size:10px; font-weight:900; color:#fff; background:var(--primary); }
    .ce-method-node strong { display:block; margin-top:10px; font-size:12px; }
    .ce-method-node small { display:block; margin-top:5px; color:var(--text-soft); font-size:10px; line-height:1.4; }
    .ce-method-node::after { content:'→'; position:absolute; right:-9px; top:50%; transform:translateY(-50%); color:var(--primary); font-weight:900; z-index:2; }
    .ce-method-node:nth-child(5)::after,.ce-method-node:nth-child(10)::after { display:none; }
    .ce-method-example { margin-top:14px; padding:13px 15px; border-left:3px solid var(--gold); border-radius:10px; background:var(--surface-soft); color:var(--text-soft); font-size:11px; line-height:1.55; }
    .ce-method-example strong { color:var(--text); }

    .sidebar-info strong::after { content:' • validado por backtest'; color:#d9bc68; font-size:9px; font-weight:700; }

    @media (max-width:1050px) {
      .ce-proof-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .ce-proof-copy { grid-column:1/-1; }
      .ce-method-flow-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .ce-method-node::after { display:none; }
    }
    @media (max-width:620px) {
      .ce-proof-strip,.ce-method-flow-grid { grid-template-columns:1fr; }
      .ce-round-banner,.ce-method-flow-head { display:block; }
      .ce-round-chip,.ce-method-badge { display:inline-block; margin-top:10px; }
    }
  `;
  document.head.appendChild(style);

  const sidebar = document.querySelector(".sidebar-info p");
  if (sidebar) {
    sidebar.textContent = "Projeções recalculadas a cada rodada, comparadas com resultados reais e promovidas somente quando o backtest comprova melhora.";
  }

  instalarBannerRodadaProduto();
  instalarFluxoMetodologiaProduto();
  carregarProvaHistoricaProduto();
}


async function instalarBannerRodadaProduto() {
  const secao = document.getElementById("times");
  if (!secao || document.getElementById("ceRoundBanner")) return;

  let status = {};
  try {
    const resposta = await fetch("data/api/status.json", { cache: "no-store" });
    if (resposta.ok) status = await resposta.json();
  } catch (_) {}

  const rodada = Number(status?.rodada_atual) || "--";
  const mercado = Number(status?.status_mercado) === 1 ? "Mercado aberto" : Number(status?.status_mercado) === 2 ? "Mercado fechado" : "Dados atualizados";

  const banner = document.createElement("section");
  banner.id = "ceRoundBanner";
  banner.className = "ce-round-banner";
  banner.innerHTML = `
    <div>
      <strong>Escalações inteligentes para a Rodada ${escaparHtml(rodada)}</strong>
      <p>Três estratégias, formação otimizada, patrimônio ajustável, capitão, banco e justificativas. O modelo oficial usa apenas calibrações já validadas.</p>
    </div>
    <span class="ce-round-chip">${escaparHtml(mercado)} • R${escaparHtml(rodada)}</span>
  `;

  const cabecalho = secao.querySelector(".section-header");
  if (cabecalho) cabecalho.insertAdjacentElement("afterend", banner);
  else secao.prepend(banner);
}


function instalarFluxoMetodologiaProduto() {
  const secao = document.getElementById("metodologia");
  if (!secao || document.getElementById("ceMethodFlowPremium")) return;

  const bloco = document.createElement("section");
  bloco.id = "ceMethodFlowPremium";
  bloco.className = "ce-method-flow-premium";

  const etapas = [
    ["01", "Dados oficiais", "Mercado, jogadores, preços, status e partidas."],
    ["02", "Histórico", "Pontuações reais, scouts e comportamento por rodada."],
    ["03", "Forma 3/5/10", "Momento recente sem abandonar a amostra longa."],
    ["04", "Piso e regularidade", "Valoriza produção recorrente sem depender de gol."],
    ["05", "Teto e explosão", "Mede capacidade de produzir rodadas acima da curva."],
    ["06", "Contexto", "Mando, força do rival, pontos cedidos e perfil do jogo."],
    ["07", "Poisson / SG", "Probabilidade de placar e chance de defesa zerada."],
    ["08", "Projeção calibrada", "Pesos por posição testados em walk-forward."],
    ["09", "MILP", "Busca a melhor combinação respeitando formação e patrimônio."],
    ["10", "Backtest", "Compara com o real e só promove o que comprovar ganho."],
  ];

  bloco.innerHTML = `
    <div class="ce-method-flow-head">
      <div>
        <span class="section-label">DO DADO À ESCALAÇÃO</span>
        <h3>Um motor em 10 etapas — simples de entender, difícil de replicar</h3>
        <p>Cada recomendação percorre uma cadeia de dados, estatística, contexto e otimização. A saída não é um palpite isolado: é a combinação que sobrevive aos filtros e aos testes históricos.</p>
      </div>
      <span class="ce-method-badge">Walk-forward • sem olhar o futuro</span>
    </div>
    <div class="ce-method-flow-grid">
      ${etapas.map(([n,t,d]) => `<article class="ce-method-node"><em>${n}</em><strong>${escaparHtml(t)}</strong><small>${escaparHtml(d)}</small></article>`).join("")}
    </div>
    <div class="ce-method-example"><strong>Exemplo rápido:</strong> dois meias podem projetar 7 pontos. Se um produz 5–6 pontos com desarmes e finalizações mesmo sem gol, enquanto o outro depende de assistência, o primeiro tende a ganhar piso e confiança. Se o segundo enfrenta uma defesa frágil e tem teto histórico alto, pode aparecer melhor no perfil agressivo. A escalação final combina esses sinais com orçamento, formação e risco.</div>
  `;

  const intro = secao.querySelector(".methodology-intro");
  if (intro) intro.insertAdjacentElement("afterend", bloco);
  else secao.prepend(bloco);
}


async function carregarProvaHistoricaProduto() {
  const secao = document.getElementById("recomendacoes");
  if (!secao || document.getElementById("ceProofStrip")) return;

  try {
    const resposta = await fetch("data/ranking-simulacao.json", { cache: "no-store" });
    if (!resposta.ok) return;
    const dados = await resposta.json();
    const melhorNome = dados?.melhorEstrategia || "Conservador";
    const painel = dados?.painelTemporal?.[melhorNome] || {};

    const fmt = valor => {
      const n = Number(valor);
      return Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "--";
    };

    const strip = document.createElement("section");
    strip.id = "ceProofStrip";
    strip.className = "ce-proof-strip";
    strip.innerHTML = `
      <div class="ce-proof-copy">
        <strong>O modelo aprende com o que realmente aconteceu</strong>
        <small>Desempenho do perfil histórico líder (${escaparHtml(melhorNome)}). Rodadas sem resultado final são excluídas automaticamente das médias.</small>
      </div>
      <div class="ce-proof-metric"><span>Campeonato</span><b>${fmt(painel?.campeonato?.media)}</b><small>média por rodada</small></div>
      <div class="ce-proof-metric"><span>Últimas 10</span><b>${fmt(painel?.ultimas10?.media)}</b><small>média recente</small></div>
      <div class="ce-proof-metric"><span>Últimas 5</span><b>${fmt(painel?.ultimas5?.media)}</b><small>janela de evolução</small></div>
      <div class="ce-proof-metric"><span>Últimas 3</span><b>${fmt(painel?.ultimas3?.media)}</b><small>momento atual</small></div>
    `;

    const hero = secao.querySelector(".hero");
    if (hero) hero.insertAdjacentElement("afterend", strip);
    else secao.prepend(strip);
  } catch (_) {}
}


if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(instalarExperienciaProdutoCartola, 50);
  });
}
