/* =========================================================
   CARTOLA ESTATÍSTICO V2.1
   Campo visual reutilizável para escalações
   ========================================================= */

(() => {
  "use strict";

  const CSS_ID = "cartola-lineup-pitch-css";
  const CSS_PATH = "css/campo-escalacoes.css";
  const CONTAINER_SELECTOR = "#suggestedLineupsGrid";
  const CARD_SELECTOR = ".suggested-lineup-card";

  function carregarCss() {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function numero(valor, padrao = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  }

  function escapar(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function nomeCurto(jogador) {
    const apelido = String(jogador?.apelido || "").trim();
    if (apelido) return apelido;
    const nome = String(jogador?.nome || "Jogador").trim();
    const partes = nome.split(/\s+/).filter(Boolean);
    if (partes.length <= 2) return nome;
    return `${partes[0]} ${partes[partes.length - 1]}`;
  }

  function iniciais(jogador) {
    return nomeCurto(jogador)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0])
      .join("")
      .toUpperCase();
  }

  function projecao(jogador) {
    const valor = numero(jogador?.projecao, NaN);
    return Number.isFinite(valor) ? valor.toFixed(1).replace(".", ",") : "--";
  }

  function preco(jogador) {
    const valor = numero(jogador?.preco, NaN);
    return Number.isFinite(valor) ? `C$ ${valor.toFixed(2).replace(".", ",")}` : "C$ --";
  }

  function fotoJogador(jogador) {
    return jogador?.foto || jogador?.fotoUrl || jogador?.urlFoto || jogador?.imagem || "";
  }

  function escudoClube(jogador) {
    return jogador?.escudo || jogador?.escudoClube || jogador?.clubeEscudo || jogador?.urlEscudo || "";
  }

  function posicao(jogador) {
    return String(jogador?.posicao || "").toUpperCase();
  }

  function obterEscalacoes() {
    try {
      if (typeof window.EscalacoesDados !== "undefined" &&
          typeof window.EscalacoesDados?.obter === "function") {
        const dados = window.EscalacoesDados.obter();
        if (Array.isArray(dados)) return dados;
      }

      if (typeof window.obterEscalacoesCarregadas === "function") {
        const dados = window.obterEscalacoesCarregadas();
        if (Array.isArray(dados)) return dados;
      }
    } catch (erro) {
      console.warn("Campo visual: não foi possível obter escalações.", erro);
    }
    return [];
  }

  function titularesDaEscalacao(escalacao) {
    const lista = Array.isArray(escalacao?.titulares)
      ? escalacao.titulares
      : (Array.isArray(escalacao?.jogadores) ? escalacao.jogadores : []);
    return lista.filter(Boolean);
  }

  function ehCapitao(jogador, escalacao) {
    const idCapitao = escalacao?.capitao?.id;
    return idCapitao != null && String(jogador?.id) === String(idCapitao);
  }

  function ehReservaLuxo(jogador, escalacao) {
    const idLuxo = escalacao?.reservaLuxo?.id;
    return idLuxo != null && String(jogador?.id) === String(idLuxo);
  }

  function avatarHtml(jogador, pequeno = false) {
    const foto = fotoJogador(jogador);
    const classe = pequeno ? " pitch-avatar small" : " pitch-avatar";
    if (foto) {
      return `<span class="${classe.trim()}"><img loading="lazy" decoding="async" src="${escapar(foto)}" alt="" onerror="this.parentElement.classList.add('fallback');this.remove();"><b>${escapar(iniciais(jogador))}</b></span>`;
    }
    return `<span class="${classe.trim()} fallback"><b>${escapar(iniciais(jogador))}</b></span>`;
  }

  function clubeHtml(jogador) {
    const escudo = escudoClube(jogador);
    const sigla = jogador?.siglaClube || jogador?.clube || "--";
    if (escudo) {
      return `<span class="pitch-club"><img loading="lazy" decoding="async" src="${escapar(escudo)}" alt=""><span>${escapar(sigla)}</span></span>`;
    }
    return `<span class="pitch-club"><span>${escapar(sigla)}</span></span>`;
  }

  function jogadorCampoHtml(jogador, escalacao) {
    const capitao = ehCapitao(jogador, escalacao);
    const travado = Boolean(jogador?.travadoUsuario);
    return `
      <article class="pitch-player" data-user-lock="${travado ? "true" : "false"}" title="${escapar(nomeCurto(jogador))} • ${escapar(posicao(jogador))} • ${escapar(preco(jogador))}">
        <div class="pitch-player-avatar-wrap">
          ${avatarHtml(jogador)}
          ${capitao ? '<span class="pitch-captain" aria-label="Capitão">C</span>' : ""}
          ${travado ? '<span class="monte-lock-badge" aria-label="Sua escolha" title="Sua escolha">🔒</span>' : ""}
        </div>
        <strong>${escapar(nomeCurto(jogador))}</strong>
        <span class="pitch-player-meta">${clubeHtml(jogador)} <b>${escapar(projecao(jogador))}</b></span>
      </article>`;
  }

  function linhaHtml(classe, jogadores, escalacao, rotulo) {
    if (!jogadores.length) return "";
    return `
      <div class="pitch-line ${classe}" aria-label="${escapar(rotulo)}">
        ${jogadores.map(jogador => jogadorCampoHtml(jogador, escalacao)).join("")}
      </div>`;
  }

  function bancoHtml(escalacao) {
    const banco = Array.isArray(escalacao?.banco) ? escalacao.banco.filter(Boolean) : [];
    if (!banco.length) return "";

    return `
      <section class="pitch-bench" aria-label="Banco de reservas">
        <div class="pitch-bench-heading">
          <div><span>RESERVAS</span><strong>Banco de reservas</strong></div>
          <small>★ Reserva de Luxo</small>
        </div>
        <div class="pitch-bench-list">
          ${banco.map(jogador => `
            <article class="pitch-bench-player ${ehReservaLuxo(jogador, escalacao) ? "luxury" : ""}">
              ${avatarHtml(jogador, true)}
              <div>
                <span>${escapar(posicao(jogador))}</span>
                <strong>${escapar(nomeCurto(jogador))}</strong>
                <small>${escapar(jogador?.siglaClube || jogador?.clube || "--")} • ${escapar(projecao(jogador))} pts</small>
              </div>
              ${ehReservaLuxo(jogador, escalacao) ? '<b class="pitch-luxury" title="Reserva de Luxo">★</b>' : ""}
            </article>`).join("")}
        </div>
      </section>`;
  }

  function treinadorHtml(treinador) {
    if (!treinador) return "";
    return `
      <aside class="pitch-coach">
        <span>🧠 TÉCNICO</span>
        ${avatarHtml(treinador, true)}
        <div>
          <strong>${escapar(nomeCurto(treinador))}</strong>
          <small>${escapar(treinador?.siglaClube || treinador?.clube || "--")} • ${escapar(projecao(treinador))} pts</small>
        </div>
      </aside>`;
  }

  function campoHtml(escalacao) {
    const titulares = titularesDaEscalacao(escalacao);
    const treinador = titulares.find(jogador => posicao(jogador) === "TEC") || escalacao?.tecnico || null;
    const jogadores = titulares.filter(jogador => posicao(jogador) !== "TEC");

    const ataque = jogadores.filter(jogador => posicao(jogador) === "ATA");
    const meio = jogadores.filter(jogador => posicao(jogador) === "MEI");
    const defesa = jogadores.filter(jogador => ["LAT", "ZAG"].includes(posicao(jogador)));
    const goleiro = jogadores.filter(jogador => posicao(jogador) === "GOL");

    return `
      <section class="lineup-pitch-shell" data-lineup-pitch="true">
        <div class="lineup-pitch-toolbar">
          <div>
            <span>CAMPO</span>
            <strong>${escapar(escalacao?.formacao || "Formação")}</strong>
          </div>
          <small>Projeção nos cards • toque/aponte para detalhes</small>
        </div>

        <div class="lineup-pitch" role="group" aria-label="Escalação em campo">
          <span class="pitch-center-line" aria-hidden="true"></span>
          <span class="pitch-center-circle" aria-hidden="true"></span>
          <span class="pitch-box pitch-box-top" aria-hidden="true"></span>
          <span class="pitch-box pitch-box-bottom" aria-hidden="true"></span>
          ${linhaHtml("attack", ataque, escalacao, "Ataque")}
          ${linhaHtml("midfield", meio, escalacao, "Meio-campo")}
          ${linhaHtml("defense", defesa, escalacao, "Defesa")}
          ${linhaHtml("goalkeeper", goleiro, escalacao, "Goleiro")}
        </div>

        ${treinadorHtml(treinador)}
        ${bancoHtml(escalacao)}
      </section>`;
  }

  function aplicarCampo(card, escalacao) {
    if (!card || !escalacao) return;

    const existente = card.querySelector("[data-lineup-pitch='true']");
    if (existente) existente.remove();

    const alvo = card.querySelector(".lineup-players-title") ||
      card.querySelector(".lineup-players-list") ||
      card.querySelector(".lineup-strategy-summary");

    if (!alvo) return;

    alvo.insertAdjacentHTML("beforebegin", campoHtml(escalacao));
    card.classList.add("has-visual-pitch");
  }

  function renderizar() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) return;

    const cards = Array.from(container.querySelectorAll(CARD_SELECTOR));
    const escalacoes = obterEscalacoes();
    if (!cards.length || !escalacoes.length) return;

    cards.forEach((card, indice) => {
      aplicarCampo(card, escalacoes[indice]);
    });
  }

  let agendamento = null;
  function agendarRender() {
    window.clearTimeout(agendamento);
    agendamento = window.setTimeout(renderizar, 30);
  }

  function observar() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) {
      window.setTimeout(observar, 250);
      return;
    }

    const observer = new MutationObserver(mudancas => {
      const mudouEstrutura = mudancas.some(mudanca => mudanca.type === "childList" && mudanca.addedNodes.length);
      if (mudouEstrutura) agendarRender();
    });

    observer.observe(container, { childList: true, subtree: true });
    agendarRender();
  }

  carregarCss();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observar, { once: true });
  } else {
    observar();
  }

  window.addEventListener("cartola:escalacoes-atualizadas", agendarRender);

  window.CartolaCampoEscalacao = {
    renderizar,
    campoHtml
  };
})();

/* =========================================================
   Monte seu time — carregamento sob o mesmo componente visual
   ========================================================= */
(() => {
  if (document.querySelector('script[data-cartola-monte="true"]')) return;
  const script = document.createElement("script");
  script.src = "js/escalacoes/monte-seu-time.js";
  script.defer = true;
  script.dataset.cartolaMonte = "true";
  document.head.appendChild(script);
})();

/* =========================================================
   Polimento final V2.1 — camada visual e análise orientada à decisão
   ========================================================= */
(() => {
  if (document.querySelector('script[data-cartola-ux-polimento="true"]')) return;
  const script = document.createElement("script");
  script.src = "js/ux-polimento-v21.js";
  script.defer = true;
  script.dataset.cartolaUxPolimento = "true";
  document.head.appendChild(script);
})();

/* =========================================================
   Fechamento visual V2.3 — correções finais desktop/mobile
   ========================================================= */
(() => {
  if (document.querySelector('script[data-cartola-ux-final-v23="true"]')) return;
  const script = document.createElement("script");
  script.src = "js/ux-final-v23.js";
  script.defer = true;
  script.dataset.cartolaUxFinalV23 = "true";
  document.head.appendChild(script);
})();
