/* =========================================================
   CARTOLA ESTATÍSTICO — UX FINAL V1
   Composição da nota + camada de clareza do site
   ========================================================= */
(function () {
  "use strict";

  const NOMES = {
    formaRecente: "Forma recente",
    mediaGeral: "Média geral",
    mediana: "Mediana",
    regularidade: "Regularidade",
    pontuacaoBasica: "Pontuação recorrente",
    scoutsOfensivos: "Participação ofensiva",
    scoutsDefensivos: "Participação defensiva",
    casaFora: "Mando de campo",
    forcaAdversario: "Dificuldade do confronto",
    pontosCedidos: "Pontos cedidos à posição",
    chanceSG: "Chance de saldo de gols",
    titularidade: "Chance de começar jogando",
    minutosEsperados: "Minutos esperados",
    bolaParada: "Participação em bolas paradas",
    penaltis: "Chance de cobrar pênalti",
    custoBeneficio: "Custo-benefício",
    tendenciaRecente: "Tendência recente",
    riscoNegativar: "Proteção contra pontuação negativa"
  };

  const ORDEM = Object.keys(NOMES);

  /* Critérios que realmente fazem sentido para cada posição.
     SG é exclusivo de GOL/LAT/ZAG. Scouts ofensivos não entram para GOL. */
  const CRITERIOS_POSICAO = {
    GOL: ["formaRecente","mediaGeral","mediana","regularidade","pontuacaoBasica","scoutsDefensivos","casaFora","forcaAdversario","pontosCedidos","chanceSG","titularidade","minutosEsperados","custoBeneficio","tendenciaRecente","riscoNegativar"],
    LAT: ["formaRecente","mediaGeral","mediana","regularidade","pontuacaoBasica","scoutsOfensivos","scoutsDefensivos","casaFora","forcaAdversario","pontosCedidos","chanceSG","titularidade","minutosEsperados","bolaParada","penaltis","custoBeneficio","tendenciaRecente","riscoNegativar"],
    ZAG: ["formaRecente","mediaGeral","mediana","regularidade","pontuacaoBasica","scoutsOfensivos","scoutsDefensivos","casaFora","forcaAdversario","pontosCedidos","chanceSG","titularidade","minutosEsperados","bolaParada","penaltis","custoBeneficio","tendenciaRecente","riscoNegativar"],
    MEI: ["formaRecente","mediaGeral","mediana","regularidade","pontuacaoBasica","scoutsOfensivos","scoutsDefensivos","casaFora","forcaAdversario","pontosCedidos","titularidade","minutosEsperados","bolaParada","penaltis","custoBeneficio","tendenciaRecente","riscoNegativar"],
    ATA: ["formaRecente","mediaGeral","mediana","regularidade","pontuacaoBasica","scoutsOfensivos","casaFora","forcaAdversario","pontosCedidos","titularidade","minutosEsperados","bolaParada","penaltis","custoBeneficio","tendenciaRecente","riscoNegativar"],
    TEC: ["formaRecente","mediaGeral","mediana","regularidade","casaFora","forcaAdversario","custoBeneficio","tendenciaRecente"]
  };

  const EXPLICACOES = {
    formaRecente: "Resume o momento do atleta nas rodadas mais recentes.",
    mediaGeral: "Mostra o nível de pontuação sustentado no campeonato.",
    mediana: "Reduz o efeito de uma atuação excepcional e mostra a pontuação mais típica.",
    regularidade: "Mede quanto o atleta consegue repetir boas pontuações sem oscilar demais.",
    pontuacaoBasica: "Valoriza pontos que podem aparecer mesmo sem gol ou assistência.",
    scoutsOfensivos: "Considera ações ofensivas que geram pontos e aumentam o potencial de teto.",
    scoutsDefensivos: "Considera ações defensivas que geram pontos para esta posição.",
    casaFora: "Ajusta a leitura conforme o atleta joga em casa ou fora.",
    forcaAdversario: "Compara o atleta com a dificuldade real do adversário desta rodada.",
    pontosCedidos: "Mostra quanto o adversário costuma permitir para atletas desta posição.",
    chanceSG: "Estima a chance de a defesa terminar sem sofrer gol; só vale para posições que pontuam por SG.",
    titularidade: "Estima a segurança de o atleta iniciar a partida.",
    minutosEsperados: "Estima quanto tempo o atleta tende a permanecer em campo.",
    bolaParada: "Valoriza quem participa de faltas, escanteios e outras bolas paradas.",
    penaltis: "Valoriza cobradores prováveis quando esse fator é aplicável.",
    custoBeneficio: "Compara o potencial de pontuação com o preço do atleta.",
    tendenciaRecente: "Identifica se o desempenho recente está melhorando, estável ou piorando.",
    riscoNegativar: "Premia atletas menos dependentes de eventos raros e com menor risco de pontuação ruim."
  };

  function n(v, p = null) {
    if (v === null || v === undefined || v === "") return p;
    const x = Number(v);
    return Number.isFinite(x) ? x : p;
  }

  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function posicao(j) {
    const bruto = String(j?.posicao ?? j?.posicaoAbreviacao ?? j?.posicao?.abreviacao ?? "").toUpperCase();
    if (bruto.includes("GOL")) return "GOL";
    if (bruto.includes("LAT")) return "LAT";
    if (bruto.includes("ZAG")) return "ZAG";
    if (bruto.includes("MEI")) return "MEI";
    if (bruto.includes("ATA")) return "ATA";
    if (bruto.includes("TEC")) return "TEC";
    return bruto || "MEI";
  }

  function resultado(j) {
    if (j?.contribuicoesCalculadas && typeof j.contribuicoesCalculadas === "object") {
      return {
        notaFinal: n(j.notaFinal ?? j.notaCalculada ?? j.score, 0),
        notas: j.notasCriterios ?? j.notas ?? {},
        pesosAplicados: j.pesosAplicados ?? {},
        contribuicoes: j.contribuicoesCalculadas
      };
    }
    try {
      if (typeof window.calcularNotaJogadorComMotor === "function") {
        const r = window.calcularNotaJogadorComMotor(j);
        if (r && typeof r === "object") return r;
      }
    } catch (_) {}
    if (j?.contribuicoes) return { notaFinal:n(j.notaFinal ?? j.nota ?? j.score,0), notas:j.notas ?? {}, pesosAplicados:j.pesosAplicados ?? {}, contribuicoes:j.contribuicoes };
    return null;
  }

  function item(chave, r, j) {
    const bruto = r?.contribuicoes?.[chave];
    const notaFallback = r?.notas?.[chave] ?? j?.notasCriterios?.[chave];
    const pesoFallback = r?.pesosAplicados?.[chave] ?? j?.pesosAplicados?.[chave];
    if (bruto && typeof bruto === "object") {
      return { chave, nome:NOMES[chave] ?? bruto.nome ?? chave, nota:n(bruto.nota, n(notaFallback)), peso:n(bruto.peso,n(pesoFallback)), contribuicao:n(bruto.contribuicao), disponivel:bruto.disponivel !== false && bruto.temDados !== false };
    }
    const nota = n(notaFallback), peso = n(pesoFallback);
    return { chave, nome:NOMES[chave] ?? chave, nota, peso, contribuicao:nota !== null && peso !== null ? nota*peso/100 : null, disponivel:nota !== null };
  }

  function faixa(v) {
    if (v >= 80) return ["Muito favorável","Sinal forte a favor desta escolha."];
    if (v >= 65) return ["Favorável","O indicador ajuda a recomendação."];
    if (v >= 45) return ["Neutro","Não muda muito a decisão nesta rodada."];
    if (v >= 30) return ["Atenção","O indicador pede cautela."];
    return ["Desfavorável","É um ponto de risco para esta escolha."];
  }

  function htmlItem(i) {
    const nota = Math.max(0,Math.min(100,n(i.nota,0)));
    const [rotulo, leitura] = faixa(nota);
    return `<div class="component-row component-explained">
      <div class="component-label"><span><b>${esc(i.nome)}</b><small>${esc(EXPLICACOES[i.chave] || leitura)}</small></span><strong>${esc(rotulo)}</strong></div>
      <div class="component-track"><div class="component-fill" style="width:${nota}%"></div></div>
      <small class="component-human-reading">${esc(leitura)} <button type="button" class="component-tech-toggle" aria-label="Ver cálculo técnico">ver cálculo</button><span class="component-tech-detail" hidden>Nota ${Math.round(nota)}/100${i.peso !== null ? ` • peso ${n(i.peso,0).toFixed(1)}%` : ""}${i.contribuicao !== null ? ` • contribuição ${n(i.contribuicao,0).toFixed(2)}` : ""}</span></small>
    </div>`;
  }

  function criarComposicao(j, recebido = null) {
    const r = recebido?.contribuicoes ? recebido : resultado(j);
    if (!r) return `<div class="components-empty"><strong>Análise detalhada ainda não disponível</strong><p>Os dados necessários para explicar esta nota ainda não foram processados.</p></div>`;
    const p = posicao(j);
    const permitidos = CRITERIOS_POSICAO[p] || ORDEM;
    const itens = permitidos.map(c => item(c,r,j)).filter(x => x.disponivel && x.nota !== null && n(x.peso,0) > 0);
    if (!itens.length) return `<div class="components-empty"><strong>Análise detalhada ainda não disponível</strong><p>O modelo não recebeu dados suficientes para decompor esta nota com segurança.</p></div>`;
    return `<div class="components-summary components-summary-human"><strong>Como interpretar esta nota</strong><p>O modelo compara apenas fatores relevantes para <b>${esc(p)}</b>. As barras abaixo mostram se cada fator ajuda ou prejudica a escolha. Os números técnicos ficam ocultos para facilitar a leitura.</p><small>${itens.length} fatores relevantes com dados disponíveis</small></div>${itens.map(htmlItem).join("")}`;
  }

  window.obterResultadoMotorJogador = resultado;
  window.criarComponentesNotaJogador = criarComposicao;
  window.CartolaComposicaoNota = { obterResultado:resultado, criarHtml:criarComposicao, obterTodosComponentes:(r,j) => (CRITERIOS_POSICAO[posicao(j)] || ORDEM).map(c=>item(c,r,j)).filter(x=>x.disponivel) };

  /* ---------------- UX GLOBAL: linguagem de produto ---------------- */
  function melhorarSidebar() {
    const box = document.querySelector(".sidebar-info");
    if (!box || box.dataset.uxFinal) return;
    box.dataset.uxFinal = "1";
    box.innerHTML = `<strong>Modelo validado por backtest</strong><p>As recomendações são recalculadas a cada rodada. Mudanças no modelo só entram em produção quando testes históricos indicam ganho consistente.</p>`;
  }

  function melhorarMetodologia() {
    const tab = document.getElementById("metodologia");
    if (!tab || tab.dataset.uxFinal) return;
    tab.dataset.uxFinal = "1";
    const notice = tab.querySelector(".methodology-notice");
    if (notice) notice.innerHTML = `<div class="methodology-notice-icon">✓</div><div><strong>Pesos por posição, validados por backtest</strong><p>O modelo não usa a mesma fórmula para todos. Goleiros, laterais, zagueiros, meias, atacantes e treinadores recebem critérios compatíveis com a forma como cada posição pontua no Cartola. Ajustes só são promovidos quando o backtest walk-forward comprova melhora.</p></div>`;
    tab.querySelectorAll("h3").forEach(h => { if (/Pesos iniciais do MVP/i.test(h.textContent)) h.textContent = "Como os pesos são usados em cada posição"; });
    tab.querySelectorAll("p,small,strong").forEach(el => {
      if (/primeira versão|proposta inicial/i.test(el.textContent || "")) el.textContent = "Os pesos atuais são específicos por posição e permanecem sujeitos a nova calibração apenas quando os testes históricos comprovarem ganho.";
    });
  }

  function melhorarAnalise() {
    const tab = document.getElementById("analise");
    if (!tab || !tab.children.length) return;
    /* Evita repetir blocos equivalentes: preserva o primeiro resumo e a primeira leitura dos jogos. */
    const titulos = [...tab.querySelectorAll("h2,h3")];
    let viuJogos = false, viuClubes = false;
    titulos.forEach(t => {
      const txt = (t.textContent || "").trim().toLowerCase();
      if (txt.includes("leitura dos jogos")) {
        if (viuJogos) t.closest("section,div")?.setAttribute("hidden","");
        viuJogos = true;
      }
      if (txt.includes("força dos clubes")) {
        if (viuClubes) t.closest("section,div")?.setAttribute("hidden","");
        viuClubes = true;
      }
    });
    if (!tab.querySelector(".analysis-human-intro")) {
      const alvo = tab.querySelector(".section-header") || tab.firstElementChild;
      const box = document.createElement("div");
      box.className = "methodology-notice analysis-human-intro";
      box.innerHTML = `<div class="methodology-notice-icon">✓</div><div><strong>O que procurar nesta rodada</strong><p>Use esta tela para responder três perguntas: quais ataques têm o melhor cenário, quais defesas têm maior chance de SG e quais confrontos merecem cautela. Os índices técnicos aparecem como apoio — a decisão principal está descrita em português simples.</p></div>`;
      alvo?.insertAdjacentElement("afterend",box);
    }
  }

  async function melhorarHistorico() {
    const tab = document.getElementById("historico");
    if (!tab) return;
    try {
      const status = await fetch("data/api/status.json",{cache:"no-store"}).then(r=>r.ok?r.json():null);
      const aberta = Number(status?.status_mercado ?? status?.statusMercado) === 1;
      const rodada = Number(status?.rodada_atual ?? status?.rodadaAtual ?? status?.rodada);
      if (!aberta || !rodada) return;
      const seletor = tab.querySelector("select");
      const selecionada = Number((seletor?.value || "").match(/\d+/)?.[0]);
      if (selecionada !== rodada) return;
      const metricas = [...tab.querySelectorAll(".metric-card,.history-metric-card,.summary-card")];
      metricas.forEach(card => {
        const txt = (card.textContent || "").toLowerCase();
        if (/erro médio|top 5|correlação|capitão/.test(txt)) card.style.display = "none";
      });
      if (!tab.querySelector(".round-open-notice")) {
        const notice = document.createElement("div");
        notice.className = "methodology-notice round-open-notice";
        notice.innerHTML = `<div class="methodology-notice-icon">i</div><div><strong>Rodada ${rodada} em andamento</strong><p>Esta rodada ainda não possui resultado final. MAE, correlação, Top 5 e acerto de capitão só serão calculados depois do fechamento e não entram nas médias históricas enquanto estiver aberta.</p></div>`;
        const tabela = tab.querySelector("table")?.parentElement;
        (tabela || tab).prepend(notice);
        if (tabela) tabela.querySelector("table")?.setAttribute("hidden","");
      }
    } catch (_) {}
  }

  function ligarCalculos() {
    document.addEventListener("click", e => {
      const b = e.target.closest(".component-tech-toggle");
      if (!b) return;
      const d = b.parentElement?.querySelector(".component-tech-detail");
      if (!d) return;
      d.hidden = !d.hidden;
      b.textContent = d.hidden ? "ver cálculo" : "ocultar cálculo";
    });
  }

  function aplicar() {
    melhorarSidebar();
    melhorarMetodologia();
    melhorarAnalise();
    melhorarHistorico();
  }

  ligarCalculos();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicar); else aplicar();
  const observer = new MutationObserver(() => { clearTimeout(window.__uxFinalTimer); window.__uxFinalTimer = setTimeout(aplicar,120); });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  console.info("Cartola Estatístico — UX final V1 carregada: critérios por posição e leitura simplificada.");
})();