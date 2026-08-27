/* =========================================================
   CARTOLA ESTATÍSTICO V2.1 — Monte seu time
   Camada de restrições sobre o motor oficial de escalação.
   Não replica projeção, pesos ou regras científicas.
   ========================================================= */

(() => {
  "use strict";

  const CSS_ID = "cartola-monte-seu-time-css";
  const CSS_PATH = "css/monte-seu-time.css";
  const ABA_ID = "monte-seu-time";
  const FORMACOES = ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"];
  const PERFIS = {
    conservador: { nome: "Conservador", chave: "conservador", estrategia: "Segurança" },
    equilibrado: { nome: "Equilibrado", chave: "equilibrado", estrategia: "Equilíbrio" },
    agressivo: { nome: "Agressivo", chave: "agressivo", estrategia: "Teto" }
  };

  const estado = {
    patrimonio: 120,
    formacao: "4-3-3",
    perfil: "equilibrado",
    travas: new Map(),
    resultado: null,
    pickerSlot: null,
    pickerBusca: ""
  };

  function carregarCss() {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function esc(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function numero(valor, padrao = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  }

  function motorPronto() {
    const obrigatorias = [
      "obterJogadoresDisponiveisEscalacao",
      "obterEstruturaFormacaoEscalacao",
      "obterPosicaoJogadorEscalacao",
      "obterIdJogadorEscalacao",
      "obterNomeJogadorEscalacao",
      "obterClubeJogadorEscalacao",
      "obterPrecoJogadorEscalacao",
      "obterProjecaoJogadorEscalacao",
      "calcularNotaJogadorEscalacao",
      "jogadoresConflitamEscalacao",
      "respeitaLimiteClubesEscalacao",
      "enriquecerTitularesEscalacao",
      "montarBancoEscalacao",
      "selecionarCapitaoEscalacao",
      "selecionarReservaLuxoEscalacao"
    ];
    return obrigatorias.every(nome => typeof window[nome] === "function" || typeof globalThis[nome] === "function");
  }

  function fn(nome) {
    const f = window[nome] || globalThis[nome];
    if (typeof f !== "function") throw new Error(`Motor indisponível: ${nome}`);
    return f;
  }

  function pool() {
    try {
      const lista = fn("obterJogadoresDisponiveisEscalacao")();
      return Array.isArray(lista) ? lista.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function idJogador(j) { return String(fn("obterIdJogadorEscalacao")(j)); }
  function posJogador(j) { return String(fn("obterPosicaoJogadorEscalacao")(j) || "").toUpperCase(); }
  function nomeJogador(j) { return String(fn("obterNomeJogadorEscalacao")(j) || "Jogador"); }
  function clubeJogador(j) { return String(fn("obterClubeJogadorEscalacao")(j) || "--"); }
  function precoJogador(j) { return numero(fn("obterPrecoJogadorEscalacao")(j)); }
  function projJogador(j) { return numero(fn("obterProjecaoJogadorEscalacao")(j)); }
  function perfilAtual() { return PERFIS[estado.perfil] || PERFIS.equilibrado; }

  function estrutura() {
    try { return fn("obterEstruturaFormacaoEscalacao")(estado.formacao) || {}; }
    catch (_) { return {}; }
  }

  function slotsDaFormacao() {
    const e = estrutura();
    const slots = [];
    ["GOL", "LAT", "ZAG", "MEI", "ATA", "TEC"].forEach(pos => {
      for (let i = 0; i < numero(e[pos]); i += 1) slots.push({ chave: `${pos}-${i + 1}`, posicao: pos, indice: i + 1 });
    });
    return slots;
  }

  function reconciliarTravas() {
    const validas = new Set(slotsDaFormacao().map(s => s.chave));
    [...estado.travas.keys()].forEach(chave => { if (!validas.has(chave)) estado.travas.delete(chave); });
    estado.resultado = null;
  }

  function custo(lista) { return lista.reduce((s, j) => s + precoJogador(j), 0); }
  function score(j) { return numero(fn("calcularNotaJogadorEscalacao")(j, perfilAtual()), -9999); }

  function conflitoComLista(jogador, lista) {
    return lista.some(outro => fn("jogadoresConflitamEscalacao")(jogador, outro));
  }

  function limiteClubesOk(lista) { return Boolean(fn("respeitaLimiteClubesEscalacao")(lista, 3)); }

  function candidatosPosicao(posicao, usados = new Set()) {
    return pool()
      .filter(j => posJogador(j) === posicao && !usados.has(idJogador(j)))
      .sort((a, b) => score(b) - score(a) || projJogador(b) - projJogador(a) || precoJogador(a) - precoJogador(b));
  }

  function validarTravas() {
    const e = estrutura();
    const travados = [...estado.travas.values()];
    const ids = travados.map(idJogador);
    if (new Set(ids).size !== ids.length) return "O mesmo jogador foi escolhido em mais de uma posição.";
    if (custo(travados) > estado.patrimonio + 0.001) return "Suas escolhas fixas já ultrapassam o patrimônio informado.";
    if (!limiteClubesOk(travados)) return "Suas escolhas fixas ultrapassam o limite de 3 atletas do mesmo clube.";
    for (let i = 0; i < travados.length; i += 1) {
      for (let j = i + 1; j < travados.length; j += 1) {
        if (fn("jogadoresConflitamEscalacao")(travados[i], travados[j])) return "Há conflito entre uma peça defensiva e um atacante/meia do adversário nas escolhas fixas.";
      }
    }
    const contagem = {};
    travados.forEach(j => { const p = posJogador(j); contagem[p] = (contagem[p] || 0) + 1; });
    for (const [p, q] of Object.entries(contagem)) if (q > numero(e[p])) return `Há jogadores demais de ${p} para a formação ${estado.formacao}.`;
    return "";
  }

  function menorCustoRestante(slots, usados) {
    let total = 0;
    for (const slot of slots) {
      const precos = candidatosPosicao(slot.posicao, usados).slice(0, 30).map(precoJogador);
      if (!precos.length) return Infinity;
      total += Math.min(...precos);
    }
    return total;
  }

  function completarTitulares() {
    const erro = validarTravas();
    if (erro) throw new Error(erro);

    const todosSlots = slotsDaFormacao();
    const travadosPorChave = estado.travas;
    const slotsRestantes = todosSlots.filter(s => !travadosPorChave.has(s.chave));
    const fixos = todosSlots.filter(s => travadosPorChave.has(s.chave)).map(s => travadosPorChave.get(s.chave));
    const idsFixos = new Set(fixos.map(idJogador));

    slotsRestantes.sort((a, b) => candidatosPosicao(a.posicao, idsFixos).length - candidatosPosicao(b.posicao, idsFixos).length);

    let feixe = [{ jogadores: [...fixos], score: fixos.reduce((s, j) => s + score(j), 0), custo: custo(fixos) }];
    const LARGURA = 140;
    const CANDIDATOS_POR_SLOT = 22;

    slotsRestantes.forEach((slot, indice) => {
      const proximos = [];
      for (const estadoBusca of feixe) {
        const usados = new Set(estadoBusca.jogadores.map(idJogador));
        const candidatos = candidatosPosicao(slot.posicao, usados).slice(0, CANDIDATOS_POR_SLOT);
        for (const candidato of candidatos) {
          if (conflitoComLista(candidato, estadoBusca.jogadores)) continue;
          const novaLista = [...estadoBusca.jogadores, candidato];
          if (!limiteClubesOk(novaLista)) continue;
          const novoCusto = estadoBusca.custo + precoJogador(candidato);
          if (novoCusto > estado.patrimonio + 0.001) continue;
          const faltantes = slotsRestantes.slice(indice + 1);
          const idsNovos = new Set(novaLista.map(idJogador));
          if (novoCusto + menorCustoRestante(faltantes, idsNovos) > estado.patrimonio + 0.001) continue;
          proximos.push({ jogadores: novaLista, score: estadoBusca.score + score(candidato), custo: novoCusto });
        }
      }
      proximos.sort((a, b) => b.score - a.score || a.custo - b.custo);
      feixe = proximos.slice(0, LARGURA);
      if (!feixe.length) throw new Error("Não encontrei combinação viável com essas escolhas, formação e patrimônio. Tente liberar uma escolha ou aumentar as cartoletas.");
    });

    const melhor = feixe[0];
    if (!melhor) throw new Error("Não foi possível completar o time.");
    const idsTravados = new Set(fixos.map(idJogador));
    const enriquecidos = fn("enriquecerTitularesEscalacao")(melhor.jogadores, perfilAtual()).map(j => ({ ...j, travadoUsuario: idsTravados.has(idJogador(j)) }));
    return enriquecidos;
  }

  function montarResultado() {
    const titulares = completarTitulares();
    if (!fn("validarQuantidadeTitularesEscalacao")(titulares, estado.formacao)) throw new Error("A formação final ficou inconsistente e foi bloqueada pelo gate de quantidade.");
    if (!limiteClubesOk(titulares)) throw new Error("A escalação final violou o limite por clube e foi bloqueada.");
    if (typeof window.contarConflitosEscalacao === "function" && window.contarConflitosEscalacao(titulares) > 0) throw new Error("A escalação final contém conflito ataque × defesa e foi bloqueada.");

    const banco = fn("montarBancoEscalacao")(pool(), titulares, perfilAtual());
    const posicoesBanco = fn("obterPosicoesBancoEscalacao")(titulares);
    const bancoCompleto = banco.length === posicoesBanco.length && fn("validarBancoEscalacao")(banco, titulares);
    const capitao = fn("selecionarCapitaoEscalacao")(titulares, perfilAtual());
    const reservaLuxo = fn("selecionarReservaLuxoEscalacao")(banco, perfilAtual());
    const custoTitulares = numero(fn("calcularCustoListaEscalacao")(titulares));

    const escalacao = {
      perfil: `${perfilAtual().nome} personalizado`, perfilChave: perfilAtual().chave,
      estrategia: perfilAtual().estrategia, formacao: estado.formacao,
      titulares, jogadores: titulares.map(j => ({ ...j })), banco, capitao, reservaLuxo,
      projecao: numero(fn("calcularProjecaoEscalacao")(titulares)),
      piso: numero(fn("calcularPisoEscalacao")(titulares)), teto: numero(fn("calcularTetoEscalacao")(titulares)),
      confianca: numero(fn("calcularConfiancaEscalacao")(titulares)), risco: numero(fn("calcularRiscoEscalacao")(titulares)),
      titularidadeMedia: numero(fn("calcularTitularidadeMediaEscalacao")(titulares)), adequacaoMedia: numero(fn("calcularAdequacaoMediaEscalacao")(titulares)),
      notaModelo: numero(fn("calcularNotaEscalacao")(titulares, perfilAtual())),
      limitePatrimonio: estado.patrimonio, patrimonio: estado.patrimonio,
      custo: custoTitulares, custoTitulares, custoBanco: numero(fn("calcularCustoListaEscalacao")(banco)),
      saldo: Math.round((estado.patrimonio - custoTitulares) * 100) / 100,
      bancoCompleto, quantidadeReservas: banco.length, quantidadeReservasEsperada: posicoesBanco.length, posicoesBanco,
      descricao: `Você fixou ${estado.travas.size} escolha(s); o motor ${perfilAtual().nome} completou o restante respeitando as regras vigentes.`,
      pontosPositivos: [], pontosAtencao: [], origem: "monte-seu-time-v21"
    };
    escalacao.pontosPositivos = fn("gerarPontosPositivosEscalacao")(escalacao);
    escalacao.pontosAtencao = fn("gerarPontosAtencaoEscalacao")(escalacao);
    return escalacao;
  }

  function slotsPorLinha() {
    const slots = slotsDaFormacao();
    return {
      attack: slots.filter(s => s.posicao === "ATA"),
      midfield: slots.filter(s => s.posicao === "MEI"),
      defense: slots.filter(s => ["LAT", "ZAG"].includes(s.posicao)),
      goalkeeper: slots.filter(s => s.posicao === "GOL"),
      coach: slots.filter(s => s.posicao === "TEC")
    };
  }

  function slotHtml(slot) {
    const j = estado.travas.get(slot.chave);
    return `<button type="button" class="monte-slot ${j ? "is-locked" : ""}" data-monte-slot="${esc(slot.chave)}" data-pos="${esc(slot.posicao)}">
      <span class="monte-slot-icon">${j ? "🔒" : "+"}</span>
      <strong>${esc(j ? nomeJogador(j) : slot.posicao)}</strong>
      <small>${j ? `${esc(clubeJogador(j))} • ${projJogador(j).toFixed(1)} pts` : "Escolher jogador"}</small>
    </button>`;
  }

  function linhaHtml(classe, slots) {
    if (!slots.length) return "";
    return `<div class="monte-line ${classe}">${slots.map(slotHtml).join("")}</div>`;
  }

  function renderResumo() {
    const root = document.getElementById(ABA_ID); if (!root) return;
    const travados = [...estado.travas.values()];
    const custoTravado = custo(travados);
    const el = root.querySelector("[data-monte-summary]");
    if (!el) return;
    el.innerHTML = `<div class="monte-summary-row"><span>Escolhas fixas</span><strong>${travados.length}</strong></div>
      <div class="monte-summary-row"><span>Custo já comprometido</span><strong>C$ ${custoTravado.toFixed(2)}</strong></div>
      <div class="monte-summary-row"><span>Disponível</span><strong>C$ ${Math.max(0, estado.patrimonio - custoTravado).toFixed(2)}</strong></div>
      <div class="monte-summary-note">🔒 Sua escolha fica intocável. O modelo completa somente as vagas livres.</div>`;
  }

  function renderCampoBuilder() {
    const root = document.getElementById(ABA_ID); if (!root) return;
    const alvo = root.querySelector("[data-monte-builder]"); if (!alvo) return;
    const linhas = slotsPorLinha();
    alvo.innerHTML = `<div class="monte-builder-toolbar"><div><span class="monte-kicker">SEU RASCUNHO</span><strong>${esc(estado.formacao)} • ${esc(perfilAtual().nome)}</strong></div><small>Toque em uma posição para fixar alguém</small></div>
      <div class="monte-builder-pitch"><span class="monte-builder-circle"></span>${linhaHtml("attack", linhas.attack)}${linhaHtml("midfield", linhas.midfield)}${linhaHtml("defense", linhas.defense)}${linhaHtml("goalkeeper", linhas.goalkeeper)}</div>
      <div class="monte-coach-zone"><span>🧠 TÉCNICO</span>${linhas.coach.map(slotHtml).join("")}</div>
      <div class="monte-actions"><button class="monte-primary" type="button" data-monte-completar>✨ Completar com o modelo</button><button class="monte-secondary" type="button" data-monte-limpar>Limpar escolhas</button><span class="monte-message" data-monte-message>Você pode travar nenhum, um ou vários nomes antes de completar.</span></div>`;
    renderResumo();
  }

  function renderResultado() {
    const root = document.getElementById(ABA_ID); if (!root) return;
    const alvo = root.querySelector("[data-monte-result]"); if (!alvo) return;
    if (!estado.resultado) { alvo.innerHTML = ""; return; }
    const campo = window.CartolaCampoEscalacao?.campoHtml;
    if (typeof campo !== "function") { alvo.innerHTML = '<div class="monte-card">Campo visual ainda carregando.</div>'; return; }
    const r = estado.resultado;
    alvo.innerHTML = `<div class="monte-result-head"><div><span class="monte-kicker">TIME COMPLETADO</span><h3>${esc(r.formacao)} • ${esc(r.perfil)}</h3><p>C$ ${r.custoTitulares.toFixed(2)} usados • C$ ${r.saldo.toFixed(2)} de saldo • ${r.projecao.toFixed(1)} pts projetados</p></div><span class="monte-legend">🔒 sua escolha • demais: modelo</span></div>${campo(r)}`;
    alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function mensagem(texto, tipo = "") {
    const el = document.querySelector(`#${ABA_ID} [data-monte-message]`); if (!el) return;
    el.textContent = texto; el.className = `monte-message ${tipo}`.trim();
  }

  function abrirPicker(chave) {
    estado.pickerSlot = chave; estado.pickerBusca = "";
    renderPicker();
  }

  function fecharPicker() {
    document.querySelector(".monte-picker-backdrop")?.remove(); estado.pickerSlot = null;
  }

  function renderPicker() {
    document.querySelector(".monte-picker-backdrop")?.remove();
    const slot = slotsDaFormacao().find(s => s.chave === estado.pickerSlot); if (!slot) return;
    const usados = new Set([...estado.travas.entries()].filter(([k]) => k !== slot.chave).map(([, j]) => idJogador(j)));
    const busca = normalizar(estado.pickerBusca);
    const lista = candidatosPosicao(slot.posicao, usados).filter(j => !busca || normalizar(`${nomeJogador(j)} ${clubeJogador(j)}`).includes(busca)).slice(0, 100);
    const atual = estado.travas.get(slot.chave);
    const wrap = document.createElement("div"); wrap.className = "monte-picker-backdrop";
    wrap.innerHTML = `<section class="monte-picker" role="dialog" aria-modal="true"><div class="monte-picker-head"><div><span class="monte-kicker">${esc(slot.posicao)}</span><strong>Quem você não quer abrir mão?</strong></div><button class="monte-picker-close" type="button" data-picker-close>×</button></div><div class="monte-picker-search"><input type="search" placeholder="Buscar jogador ou clube" value="${esc(estado.pickerBusca)}" data-picker-search></div><div class="monte-picker-list">${atual ? `<button class="monte-option" data-picker-remove type="button"><span><strong>Remover ${esc(nomeJogador(atual))}</strong><small>Deixar esta vaga livre para o modelo</small></span><span class="monte-option-score">×</span></button>` : ""}${lista.map(j => `<button class="monte-option" type="button" data-picker-player="${esc(idJogador(j))}"><span><strong>${esc(nomeJogador(j))}</strong><small>${esc(clubeJogador(j))} • C$ ${precoJogador(j).toFixed(2)}</small></span><span class="monte-option-score"><b>${projJogador(j).toFixed(1)} pts</b><span>projeção</span></span></button>`).join("") || '<div class="monte-summary-note">Nenhum jogador encontrado.</div>'}</div></section>`;
    document.body.appendChild(wrap);
    const input = wrap.querySelector("[data-picker-search]");
    input?.focus();
    input?.addEventListener("input", e => { estado.pickerBusca = e.target.value; window.clearTimeout(window.__monteBusca); window.__monteBusca = window.setTimeout(renderPicker, 120); });
    wrap.addEventListener("click", e => {
      if (e.target === wrap || e.target.closest("[data-picker-close]")) return fecharPicker();
      if (e.target.closest("[data-picker-remove]")) { estado.travas.delete(slot.chave); estado.resultado = null; fecharPicker(); renderCampoBuilder(); renderResultado(); return; }
      const botao = e.target.closest("[data-picker-player]"); if (!botao) return;
      const escolhido = pool().find(j => idJogador(j) === botao.dataset.pickerPlayer); if (!escolhido) return;
      estado.travas.set(slot.chave, escolhido); estado.resultado = null; fecharPicker(); renderCampoBuilder(); renderResultado();
    });
  }

  function instalarAba() {
    if (document.getElementById(ABA_ID)) return;
    const times = document.getElementById("times"); if (!times) return;
    const secao = document.createElement("section"); secao.id = ABA_ID; secao.className = "tab-content";
    secao.innerHTML = `<div class="monte-hero"><article class="monte-card"><span class="monte-kicker">MONTE DO SEU JEITO</span><h2>Você escolhe as certezas. O modelo completa o resto.</h2><p>Informe seu patrimônio e formação. Toque no campo para travar os jogadores ou técnico de que você não quer abrir mão.</p><div class="monte-controls"><div class="monte-field"><label>Patrimônio</label><input type="number" min="40" max="200" step="0.1" value="${estado.patrimonio}" data-monte-patrimonio></div><div class="monte-field"><label>Formação</label><select data-monte-formacao>${FORMACOES.map(f => `<option ${f === estado.formacao ? "selected" : ""}>${f}</option>`).join("")}</select></div><div class="monte-field"><label>Estilo do modelo</label><select data-monte-perfil><option value="conservador">Conservador</option><option value="equilibrado" selected>Equilibrado</option><option value="agressivo">Agressivo</option></select></div></div></article><aside class="monte-card monte-summary" data-monte-summary></aside></div><section class="monte-builder-shell" data-monte-builder></section><section class="monte-result" data-monte-result></section>`;
    times.insertAdjacentElement("afterend", secao);

    const botaoTimes = document.querySelector('.menu-item[data-tab="times"]');
    if (botaoTimes && !document.querySelector(`.menu-item[data-tab="${ABA_ID}"]`)) {
      const botao = document.createElement("button"); botao.className = "menu-item"; botao.type = "button"; botao.dataset.tab = ABA_ID; botao.innerHTML = '<span class="menu-icon">⚽</span><span>Monte seu time</span>';
      botaoTimes.insertAdjacentElement("afterend", botao);
      botao.addEventListener("click", () => ativarAba(botao));
    }

    secao.addEventListener("click", e => {
      const slot = e.target.closest("[data-monte-slot]"); if (slot) return abrirPicker(slot.dataset.monteSlot);
      if (e.target.closest("[data-monte-limpar]")) { estado.travas.clear(); estado.resultado = null; renderCampoBuilder(); renderResultado(); mensagem("Escolhas liberadas. O modelo pode preencher todas as posições."); return; }
      if (e.target.closest("[data-monte-completar]")) {
        try { estado.resultado = montarResultado(); renderResultado(); mensagem(`Time completado com ${estado.travas.size} escolha(s) fixa(s).`, "success"); }
        catch (erro) { estado.resultado = null; renderResultado(); mensagem(erro?.message || String(erro), "error"); }
      }
    });
    secao.querySelector("[data-monte-patrimonio]")?.addEventListener("change", e => { estado.patrimonio = Math.max(40, Math.min(200, numero(e.target.value, 120))); e.target.value = estado.patrimonio; estado.resultado = null; renderResumo(); renderResultado(); });
    secao.querySelector("[data-monte-formacao]")?.addEventListener("change", e => { estado.formacao = FORMACOES.includes(e.target.value) ? e.target.value : "4-3-3"; reconciliarTravas(); renderCampoBuilder(); renderResultado(); });
    secao.querySelector("[data-monte-perfil]")?.addEventListener("change", e => { estado.perfil = PERFIS[e.target.value] ? e.target.value : "equilibrado"; estado.resultado = null; renderCampoBuilder(); renderResultado(); });

    document.addEventListener("click", e => {
      const item = e.target.closest(".menu-item"); if (item && item.dataset.tab !== ABA_ID) secao.classList.remove("active");
    }, true);

    renderCampoBuilder();
  }

  function ativarAba(botao) {
    document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    botao?.classList.add("active"); document.getElementById(ABA_ID)?.classList.add("active");
    const titulo = document.getElementById("pageTitle"); if (titulo) titulo.textContent = "Monte seu time";
    if (typeof window.fecharMenuCelular === "function") window.fecharMenuCelular();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function iniciar() {
    carregarCss();
    let tentativas = 0;
    const timer = window.setInterval(() => {
      tentativas += 1;
      if (motorPronto() && document.getElementById("times")) { window.clearInterval(timer); instalarAba(); }
      else if (tentativas > 80) { window.clearInterval(timer); console.warn("Monte seu time: motor não ficou disponível a tempo."); }
    }, 125);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true }); else iniciar();

  window.CartolaMonteSeuTime = { montarResultado, estado };
})();
