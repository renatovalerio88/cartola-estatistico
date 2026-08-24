/* =========================================================
   CARTOLA ESTATÍSTICO — V2.1
   Explorador de projeções + patrimônio configurável
   ========================================================= */

(function () {
  "use strict";

  const MAX_PATRIMONIO = 200;
  const MIN_PATRIMONIO = 1;
  const ID_ABA = "projecoes";

  function numero(valor, padrao = null) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  }

  function esc(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function nome(j) {
    return String(j?.apelido || j?.nome || "Jogador").trim();
  }

  function clube(j) {
    return String(j?.siglaClube || j?.clubeSigla || j?.clube || "--").trim().toUpperCase();
  }

  function posicao(j) {
    return String(j?.posicao || j?.posicaoSigla || "--").trim().toUpperCase();
  }

  function preco(j) {
    return numero(j?.preco ?? j?.preco_num ?? j?.valor, null);
  }

  function projecao(j) {
    const candidatos = [
      j?.projecao,
      j?.projecaoCalibrada,
      j?.projecaoOriginal,
      j?.pontuacaoProjetada,
      j?.score,
      j?.media3,
      j?.media5,
      j?.mediaGeral,
      j?.media
    ];
    for (const valor of candidatos) {
      const n = numero(valor, null);
      if (n !== null) return n;
    }
    return 0;
  }

  function fmt(valor, casas = 1, sufixo = "") {
    const n = numero(valor, null);
    return n === null ? "--" : `${n.toFixed(casas).replace(".", ",")}${sufixo}`;
  }

  function adversario(j) {
    return String(
      j?.siglaAdversario || j?.adversarioSigla || j?.adversario || j?.clubeAdversario || "--"
    ).trim().toUpperCase();
  }

  function mando(j) {
    const valor = j?.mando ?? j?.mandante ?? j?.ehMandante;
    if (valor === true || valor === 1 || String(valor).toLowerCase() === "casa") return "Casa";
    if (valor === false || valor === 0 || String(valor).toLowerCase() === "fora") return "Fora";
    return "--";
  }

  function status(j) {
    const texto = j?.status || j?.statusNome || j?.status_nome;
    if (texto) return String(texto);
    const id = numero(j?.statusId ?? j?.status_id, null);
    if (id === 7) return "Provável";
    if ([2, 3, 5, 6].includes(id)) return "Atenção";
    return "Não informado";
  }

  function riscoTexto(j) {
    const risco = numero(j?.risco ?? j?.volatilidade ?? j?.desvioPadrao, null);
    if (risco === null) return "--";
    if (risco <= 30) return `Baixo (${fmt(risco, 0, "%")})`;
    if (risco <= 60) return `Médio (${fmt(risco, 0, "%")})`;
    return `Alto (${fmt(risco, 0, "%")})`;
  }

  function confianca(j) {
    let n = numero(j?.confianca ?? j?.confiancaPercentual ?? j?.confidence, null);
    if (n === null) return null;
    if (n >= 0 && n <= 1) n *= 100;
    return Math.max(0, Math.min(100, n));
  }

  function explosao(j) {
    const campos = [
      j?.probExplosao10,
      j?.probabilidade10Mais,
      j?.probabilidadeExplosao,
      j?.explosao10,
      j?.prob10
    ];
    for (let valor of campos) {
      let n = numero(valor, null);
      if (n === null) continue;
      if (n >= 0 && n <= 1) n *= 100;
      return Math.max(0, Math.min(100, n));
    }
    return null;
  }

  function obterJogadoresExplorador() {
    try {
      if (typeof window.obterJogadoresCarregados === "function") {
        const lista = window.obterJogadoresCarregados();
        if (Array.isArray(lista)) return lista;
      }
      if (typeof obterJogadoresCarregados === "function") {
        const lista = obterJogadoresCarregados();
        if (Array.isArray(lista)) return lista;
      }
      if (typeof estadoRecomendacoes !== "undefined" && Array.isArray(estadoRecomendacoes?.jogadores)) {
        return estadoRecomendacoes.jogadores.map(j => ({ ...j }));
      }
    } catch (erro) {
      console.warn("Explorador: falha ao obter jogadores.", erro);
    }
    return [];
  }

  function fatores(j) {
    const favoraveis = [];
    const atencao = [];
    const p = projecao(j);
    const conf = confianca(j);
    const teto = numero(j?.teto ?? j?.projecaoTeto ?? j?.tetoProjetado, null);
    const piso = numero(j?.piso ?? j?.projecaoPiso ?? j?.pisoProjetado, null);
    const media3 = numero(j?.media3, null);
    const media5 = numero(j?.media5, null);
    const expl = explosao(j);
    const stat = status(j);

    if (conf !== null && conf >= 75) favoraveis.push(`Confiança calculada alta (${fmt(conf, 0, "%")}).`);
    if (teto !== null && teto >= p + 3) favoraveis.push(`Teto estimado (${fmt(teto)}) acima da projeção central.`);
    if (media3 !== null && media5 !== null && media3 > media5 + 1) favoraveis.push("Média das últimas 3 acima da janela de 5 rodadas.");
    if (expl !== null && expl >= 20) favoraveis.push(`Camada de explosão 10+ indica ${fmt(expl, 0, "%")}.`);
    if (/prov/i.test(stat)) favoraveis.push("Status atual marcado como provável.");

    if (conf !== null && conf < 55) atencao.push(`Confiança calculada baixa (${fmt(conf, 0, "%")}).`);
    if (piso !== null && piso < 0) atencao.push(`Piso estimado negativo (${fmt(piso)}).`);
    if (!/prov/i.test(stat) && stat !== "Não informado") atencao.push(`Status exige atenção: ${stat}.`);
    const risco = numero(j?.risco ?? j?.volatilidade ?? j?.desvioPadrao, null);
    if (risco !== null && risco > 60) atencao.push("Risco/volatilidade acima de 60%.");

    if (!favoraveis.length) favoraveis.push("Sem fator adicional aprovado forte; a projeção central é a principal referência disponível.");
    if (!atencao.length) atencao.push("Nenhum alerta estrutural forte identificado nos campos disponíveis.");
    return { favoraveis, atencao };
  }

  function injetarEstilos() {
    if (document.getElementById("exploradorV21Styles")) return;
    const style = document.createElement("style");
    style.id = "exploradorV21Styles";
    style.textContent = `
      .v21-toolbar{display:grid;grid-template-columns:minmax(220px,1.7fr) minmax(160px,.8fr);gap:12px;margin:18px 0 22px}.v21-toolbar input,.v21-toolbar select,.v21-budget input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--border-color,#d8dedb);border-radius:10px;background:var(--card-bg,#fff);color:inherit}.v21-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.v21-player{border:1px solid var(--border-color,#d8dedb);border-radius:14px;padding:16px;background:var(--card-bg,#fff);cursor:pointer}.v21-player:hover{transform:translateY(-1px)}.v21-player-head{display:flex;justify-content:space-between;gap:12px}.v21-player h3{margin:0 0 4px}.v21-proj{font-size:1.35rem;font-weight:800}.v21-meta{opacity:.75;font-size:.9rem}.v21-details{margin-top:14px;padding-top:14px;border-top:1px solid var(--border-color,#d8dedb)}.v21-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.v21-kpi{padding:9px;border-radius:9px;background:rgba(127,127,127,.08)}.v21-kpi span{display:block;font-size:.76rem;opacity:.7}.v21-kpi strong{display:block;margin-top:3px}.v21-list{margin:8px 0 0;padding-left:18px}.v21-budget{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:10px;align-items:end;margin:0 0 20px;padding:14px;border:1px solid var(--border-color,#d8dedb);border-radius:12px;background:var(--card-bg,#fff)}.v21-budget label{font-size:.85rem;font-weight:700}.v21-budget button{padding:11px 14px;border:0;border-radius:9px;cursor:pointer;font-weight:700}.v21-budget-note{grid-column:1/-1;font-size:.8rem;opacity:.72}.v21-empty{padding:28px;text-align:center;opacity:.75}.v21-badge{display:inline-block;padding:4px 7px;border-radius:999px;background:rgba(127,127,127,.11);font-size:.75rem;margin-right:5px}@media(max-width:720px){.v21-toolbar{grid-template-columns:1fr}.v21-budget{grid-template-columns:1fr 1fr}.v21-budget label,.v21-budget-note{grid-column:1/-1}.v21-kpis{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(style);
  }

  function injetarAba() {
    if (document.getElementById(ID_ABA)) return;
    const menu = document.querySelector(".menu");
    const historicoBtn = menu?.querySelector('[data-tab="historico"]');
    if (menu) {
      const botao = document.createElement("button");
      botao.className = "menu-item";
      botao.type = "button";
      botao.dataset.tab = ID_ABA;
      botao.innerHTML = '<span class="menu-icon">⌕</span><span>Projeções</span>';
      if (historicoBtn) menu.insertBefore(botao, historicoBtn); else menu.appendChild(botao);
      botao.addEventListener("click", () => {
        setTimeout(() => {
          const titulo = document.getElementById("pageTitle");
          if (titulo) titulo.textContent = "Projeções";
          renderExplorador();
        }, 0);
      });
    }

    const main = document.querySelector("main.content");
    const historico = document.getElementById("historico");
    if (!main) return;
    const secao = document.createElement("section");
    secao.className = "tab-content";
    secao.id = ID_ABA;
    secao.innerHTML = `
      <div class="section-header"><div><p class="section-label">PRÓXIMA RODADA</p><h2>Explorador de jogadores e clubes</h2><p>Consulte a projeção vigente e os dados que sustentam a leitura do modelo. Campos experimentais só aparecem quando disponíveis.</p></div></div>
      <div class="v21-toolbar"><input id="v21BuscaJogador" type="search" placeholder="Buscar jogador..." autocomplete="off"><select id="v21FiltroClube"><option value="">Todos os clubes</option></select></div>
      <div id="v21ResumoExplorador" class="v21-meta"></div>
      <div id="v21GridExplorador" class="v21-grid"></div>`;
    if (historico) main.insertBefore(secao, historico); else main.appendChild(secao);

    document.getElementById("v21BuscaJogador")?.addEventListener("input", renderExplorador);
    document.getElementById("v21FiltroClube")?.addEventListener("change", renderExplorador);
  }

  function injetarPatrimonio() {
    if (document.getElementById("v21PatrimonioBox")) return;
    const times = document.getElementById("times");
    const grade = document.getElementById("suggestedLineupsGrid");
    if (!times || !grade) return;
    const box = document.createElement("div");
    box.id = "v21PatrimonioBox";
    box.className = "v21-budget";
    box.innerHTML = `
      <label>Patrimônio disponível (C$)<input id="v21Patrimonio" type="number" min="${MIN_PATRIMONIO}" max="${MAX_PATRIMONIO}" step="0.1" value="${MAX_PATRIMONIO}"></label>
      <button type="button" id="v21AplicarPatrimonio">Reconstruir times</button>
      <button type="button" id="v21ResetPatrimonio">C$ 200</button>
      <div class="v21-budget-note">O valor é aplicado aos titulares e técnico. O teto operacional é C$ 200; os times são reconstruídos para o patrimônio informado.</div>`;
    times.insertBefore(box, grade);

    const input = document.getElementById("v21Patrimonio");
    try {
      const atual = window.CartolaEscalacoes?.obterPatrimonio?.();
      if (numero(atual, null) !== null) input.value = String(Math.min(MAX_PATRIMONIO, Math.max(MIN_PATRIMONIO, atual)));
    } catch (_) {}

    async function aplicar(valor) {
      const normalizado = Math.min(MAX_PATRIMONIO, Math.max(MIN_PATRIMONIO, numero(valor, MAX_PATRIMONIO)));
      input.value = String(normalizado);
      try {
        if (window.CartolaEscalacoes?.definirPatrimonio) {
          await window.CartolaEscalacoes.definirPatrimonio(normalizado);
        } else if (typeof window.definirPatrimonioEscalacoes === "function") {
          await window.definirPatrimonioEscalacoes(normalizado);
        }
      } catch (erro) {
        console.error("Falha ao reconstruir times com novo patrimônio:", erro);
      }
    }

    document.getElementById("v21AplicarPatrimonio")?.addEventListener("click", () => aplicar(input.value));
    document.getElementById("v21ResetPatrimonio")?.addEventListener("click", () => aplicar(MAX_PATRIMONIO));
    input?.addEventListener("keydown", evento => { if (evento.key === "Enter") aplicar(input.value); });
  }

  function atualizarClubes(jogadores) {
    const select = document.getElementById("v21FiltroClube");
    if (!select || select.dataset.preenchido === "1") return;
    const clubes = [...new Set(jogadores.map(clube).filter(c => c && c !== "--"))].sort();
    clubes.forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      select.appendChild(option);
    });
    select.dataset.preenchido = "1";
  }

  function cardJogador(j) {
    const id = String(j?.id ?? j?.atletaId ?? nome(j));
    const conf = confianca(j);
    const expl = explosao(j);
    const piso = numero(j?.piso ?? j?.projecaoPiso ?? j?.pisoProjetado, null);
    const teto = numero(j?.teto ?? j?.projecaoTeto ?? j?.tetoProjetado, null);
    const p = preco(j);
    const baseV1 = numero(j?.projecaoV1 ?? j?.projecaoOriginal, null);
    const fat = fatores(j);
    const media3 = numero(j?.media3, null);
    const media5 = numero(j?.media5, null);
    const mediaGeral = numero(j?.mediaGeral ?? j?.media, null);

    return `<article class="v21-player" data-v21-player="${esc(id)}">
      <div class="v21-player-head"><div><h3>${esc(nome(j))}</h3><div class="v21-meta"><span class="v21-badge">${esc(posicao(j))}</span><span class="v21-badge">${esc(clube(j))}</span>${status(j) ? `<span class="v21-badge">${esc(status(j))}</span>` : ""}</div></div><div class="v21-proj">${fmt(projecao(j))}<small> pts</small></div></div>
      <div class="v21-meta" style="margin-top:10px">vs ${esc(adversario(j))} · ${esc(mando(j))} · ${p === null ? "C$ --" : `C$ ${fmt(p,2)}`}</div>
      <div class="v21-details" hidden>
        <div class="v21-kpis">
          <div class="v21-kpi"><span>Piso</span><strong>${fmt(piso)}</strong></div><div class="v21-kpi"><span>Projeção</span><strong>${fmt(projecao(j))}</strong></div><div class="v21-kpi"><span>Teto</span><strong>${fmt(teto)}</strong></div>
          <div class="v21-kpi"><span>Confiança</span><strong>${fmt(conf,0,"%")}</strong></div><div class="v21-kpi"><span>Risco</span><strong>${esc(riscoTexto(j))}</strong></div><div class="v21-kpi"><span>Explosão 10+</span><strong>${expl === null ? "--" : fmt(expl,0,"%")}</strong></div>
          <div class="v21-kpi"><span>Média 3</span><strong>${fmt(media3)}</strong></div><div class="v21-kpi"><span>Média 5</span><strong>${fmt(media5)}</strong></div><div class="v21-kpi"><span>Média geral</span><strong>${fmt(mediaGeral)}</strong></div>
        </div>
        ${baseV1 === null ? "" : `<div class="v21-meta">Baseline/fallback disponível: ${fmt(baseV1)} pts.</div>`}
        <strong>Fatores favoráveis observáveis</strong><ul class="v21-list">${fat.favoraveis.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <strong style="display:block;margin-top:10px">Pontos de atenção</strong><ul class="v21-list">${fat.atencao.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="v21-meta" style="margin-top:12px">As explicações descrevem sinais disponíveis no dado; não são apresentadas como causalidade do RandomForest. Clima, lateralidade e consenso só serão exibidos quando houver fonte e gate aprovados.</div>
      </div>
    </article>`;
  }

  function renderExplorador() {
    const grid = document.getElementById("v21GridExplorador");
    const resumo = document.getElementById("v21ResumoExplorador");
    if (!grid) return;
    const todos = obterJogadoresExplorador();
    atualizarClubes(todos);
    const termo = String(document.getElementById("v21BuscaJogador")?.value || "").trim().toLowerCase();
    const filtroClube = String(document.getElementById("v21FiltroClube")?.value || "").toUpperCase();
    const lista = todos
      .filter(j => !termo || nome(j).toLowerCase().includes(termo))
      .filter(j => !filtroClube || clube(j) === filtroClube)
      .sort((a,b) => projecao(b) - projecao(a));

    if (resumo) resumo.textContent = `${lista.length} atleta(s) · ordenados pela projeção vigente da rodada.`;
    if (!lista.length) {
      grid.innerHTML = '<div class="v21-empty">Nenhum jogador encontrado com os filtros atuais.</div>';
      return;
    }
    grid.innerHTML = lista.map(cardJogador).join("");
    grid.querySelectorAll(".v21-player").forEach(card => {
      card.addEventListener("click", () => {
        const detalhes = card.querySelector(".v21-details");
        if (detalhes) detalhes.hidden = !detalhes.hidden;
      });
    });
  }

  function iniciar() {
    injetarEstilos();
    injetarAba();
    injetarPatrimonio();
    setTimeout(renderExplorador, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }

  window.CartolaExploradorV21 = { render: renderExplorador, maxPatrimonio: MAX_PATRIMONIO };
})();
