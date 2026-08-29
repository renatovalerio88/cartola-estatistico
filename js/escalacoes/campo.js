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
  let agendamento = null;
  function carregarCss(){if(document.getElementById(CSS_ID))return;const link=document.createElement("link");link.id=CSS_ID;link.rel="stylesheet";link.href=CSS_PATH;document.head.appendChild(link)}
  function numero(valor,padrao=0){const n=Number(valor);return Number.isFinite(n)?n:padrao}
  function escapar(valor){return String(valor??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
  function nomeCurto(j){const a=String(j?.apelido||"").trim();if(a)return a;const n=String(j?.nome||"Jogador").trim(),p=n.split(/\s+/).filter(Boolean);return p.length<=2?n:`${p[0]} ${p[p.length-1]}`}
  function iniciais(j){return nomeCurto(j).split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase()}
  function projecao(j){const v=numero(j?.projecao,NaN);return Number.isFinite(v)?v.toFixed(1).replace(".",","):"--"}
  function preco(j){const v=numero(j?.preco,NaN);return Number.isFinite(v)?`C$ ${v.toFixed(2).replace(".",",")}`:"C$ --"}
  function fotoJogador(j){return j?.foto||j?.fotoUrl||j?.urlFoto||j?.imagem||""}
  function escudoClube(j){return j?.escudo||j?.escudoClube||j?.clubeEscudo||j?.urlEscudo||""}
  function posicao(j){return String(j?.posicao||"").toUpperCase()}
  function obterEscalacoes(){try{if(typeof window.EscalacoesDados!=="undefined"&&typeof window.EscalacoesDados?.obter==="function"){const d=window.EscalacoesDados.obter();if(Array.isArray(d))return d}if(typeof window.obterEscalacoesCarregadas==="function"){const d=window.obterEscalacoesCarregadas();if(Array.isArray(d))return d}}catch(e){console.warn("Campo visual: não foi possível obter escalações.",e)}return[]}
  function titularesDaEscalacao(e){const l=Array.isArray(e?.titulares)?e.titulares:(Array.isArray(e?.jogadores)?e.jogadores:[]);return l.filter(Boolean)}
  function ehCapitao(j,e){const i=e?.capitao?.id;return i!=null&&String(j?.id)===String(i)}
  function ehReservaLuxo(j,e){const i=e?.reservaLuxo?.id;return i!=null&&String(j?.id)===String(i)}
  function avatarHtml(j,pequeno=false){const f=fotoJogador(j),c=pequeno?"pitch-avatar small":"pitch-avatar";return f?`<span class="${c}"><img loading="lazy" decoding="async" src="${escapar(f)}" alt="" onerror="this.parentElement.classList.add('fallback');this.remove();"><b>${escapar(iniciais(j))}</b></span>`:`<span class="${c} fallback"><b>${escapar(iniciais(j))}</b></span>`}
  function clubeHtml(j){const e=escudoClube(j),s=j?.siglaClube||j?.clube||"--";return e?`<span class="pitch-club"><img loading="lazy" decoding="async" src="${escapar(e)}" alt=""><span>${escapar(s)}</span></span>`:`<span class="pitch-club"><span>${escapar(s)}</span></span>`}
  function jogadorCampoHtml(j,e){const c=ehCapitao(j,e),t=Boolean(j?.travadoUsuario),p=posicao(j);return `<article class="pitch-player" data-posicao="${escapar(p)}" data-user-lock="${t?"true":"false"}" title="${escapar(nomeCurto(j))} • ${escapar(p)} • ${escapar(preco(j))}"><div class="pitch-player-avatar-wrap">${avatarHtml(j)}${c?'<span class="pitch-captain" aria-label="Capitão">C</span>':""}${t?'<span class="monte-lock-badge" aria-label="Sua escolha" title="Sua escolha">🔒</span>':""}</div><strong>${escapar(nomeCurto(j))}</strong><span class="pitch-player-meta">${clubeHtml(j)} <b>${escapar(projecao(j))}</b></span></article>`}
  function linhaHtml(c,j,e,r){if(!j.length)return"";return `<div class="pitch-line ${c}" aria-label="${escapar(r)}">${j.map(x=>jogadorCampoHtml(x,e)).join("")}</div>`}
  function ordenarDefesa(j){const l=j.filter(x=>posicao(x)==="LAT"),z=j.filter(x=>posicao(x)==="ZAG");if(l.length>=2&&z.length)return[l[0],...z,l[1],...l.slice(2)];if(l.length===1&&z.length)return[l[0],...z];return j}
  function bancoHtml(e){const b=Array.isArray(e?.banco)?e.banco.filter(Boolean):[];if(!b.length)return"";return `<section class="pitch-bench" aria-label="Banco de reservas"><div class="pitch-bench-heading"><div><span>RESERVAS</span><strong>Banco de reservas</strong></div><small>★ Reserva de Luxo</small></div><div class="pitch-bench-list">${b.map(j=>`<article class="pitch-bench-player ${ehReservaLuxo(j,e)?"luxury":""}">${avatarHtml(j,true)}<div><span>${escapar(posicao(j))}</span><strong>${escapar(nomeCurto(j))}</strong><small>${escapar(j?.siglaClube||j?.clube||"--")} • ${escapar(projecao(j))} pts</small></div>${ehReservaLuxo(j,e)?'<b class="pitch-luxury" title="Reserva de Luxo">★</b>':""}</article>`).join("")}</div></section>`}
  function treinadorHtml(t){if(!t)return"";return `<aside class="pitch-coach"><span>🧠 TÉCNICO</span>${avatarHtml(t,true)}<div><strong>${escapar(nomeCurto(t))}</strong><small>${escapar(t?.siglaClube||t?.clube||"--")} • ${escapar(projecao(t))} pts</small></div></aside>`}
  function campoHtml(e){const t=titularesDaEscalacao(e),tec=t.find(j=>posicao(j)==="TEC")||e?.tecnico||null,j=t.filter(x=>posicao(x)!=="TEC"),a=j.filter(x=>posicao(x)==="ATA"),m=j.filter(x=>posicao(x)==="MEI"),d=ordenarDefesa(j.filter(x=>["LAT","ZAG"].includes(posicao(x)))),g=j.filter(x=>posicao(x)==="GOL");return `<section class="lineup-pitch-shell" data-lineup-pitch="true"><div class="lineup-pitch-toolbar"><div><span>CAMPO</span><strong>${escapar(e?.formacao||"Formação")}</strong></div><small>Projeção nos cards • toque/aponte para detalhes</small></div><div class="lineup-pitch" role="group" aria-label="Escalação em campo"><span class="pitch-center-line" aria-hidden="true"></span><span class="pitch-center-circle" aria-hidden="true"></span><span class="pitch-box pitch-box-top" aria-hidden="true"></span><span class="pitch-box pitch-box-bottom" aria-hidden="true"></span>${linhaHtml("attack",a,e,"Ataque")}${linhaHtml("midfield",m,e,"Meio-campo")}${linhaHtml("defense",d,e,"Defesa")}${linhaHtml("goalkeeper",g,e,"Goleiro")}</div>${treinadorHtml(tec)}${bancoHtml(e)}</section>`}
  function aplicarCampo(card,e){if(!card||!e)return;const ex=card.querySelector("[data-lineup-pitch='true']"),novo=campoHtml(e);if(ex){const w=document.createElement("div");w.innerHTML=novo.trim();ex.replaceWith(w.firstElementChild);return}const alvo=card.querySelector(".lineup-players-title")||card.querySelector(".lineup-players-list")||card.querySelector(".lineup-strategy-summary");if(!alvo)return;alvo.insertAdjacentHTML("beforebegin",novo);card.classList.add("has-visual-pitch")}
  function renderizar(){const c=document.querySelector(CONTAINER_SELECTOR);if(!c)return false;const cards=Array.from(c.querySelectorAll(CARD_SELECTOR)),e=obterEscalacoes();if(!cards.length||!e.length)return false;cards.forEach((card,i)=>aplicarCampo(card,e[i]));return true}
  function agendarRender(a=30){window.clearTimeout(agendamento);agendamento=window.setTimeout(renderizar,a)}
  function iniciar(){carregarCss();[0,120,350,800,1600,3000].forEach(ms=>window.setTimeout(renderizar,ms));window.addEventListener("cartola:escalacoes-atualizadas",()=>agendarRender(60));window.addEventListener("cartola:rodada-atualizada",()=>agendarRender(80));document.addEventListener("click",e=>{if(e.target.closest?.("#times, [data-tab='times'], [data-section='times']"))agendarRender(80)})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
  window.CartolaCampoEscalacao={renderizar,campoHtml,ordenarDefesa};
})();

/* Monte seu time — carregamento sob o mesmo componente visual */
(()=>{if(document.querySelector('script[data-cartola-monte="true"]'))return;const s=document.createElement("script");s.src="js/escalacoes/monte-seu-time.js";s.defer=true;s.dataset.cartolaMonte="true";document.head.appendChild(s)})();

/* Exclusões operacionais do Monte seu Time */
(()=>{if(document.querySelector('script[data-cartola-monte-exclusoes="true"]'))return;const s=document.createElement("script");s.src="js/escalacoes/monte-exclusoes.js";s.defer=true;s.dataset.cartolaMonteExclusoes="true";document.head.appendChild(s)})();

/* Polimento final V2.1 */
(()=>{if(document.querySelector('script[data-cartola-ux-polimento="true"]'))return;const s=document.createElement("script");s.src="js/ux-polimento-v21.js";s.defer=true;s.dataset.cartolaUxPolimento="true";document.head.appendChild(s)})();

/* Fechamento visual V2.4 */
(()=>{if(document.querySelector('script[data-cartola-ux-final-v23="true"]'))return;const s=document.createElement("script");s.src="js/ux-final-v23.js";s.defer=true;s.dataset.cartolaUxFinalV23="true";document.head.appendChild(s)})();