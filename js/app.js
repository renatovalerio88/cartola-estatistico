/* =========================================================
   CARTOLA ESTATÍSTICO
   Inicialização principal da aplicação
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  inicializarAplicacao
);


async function inicializarAplicacao() {
  configurarInterface();

  await Promise.all([
    carregarConfiguracao(),
    carregarJogadores(),
    carregarEscalacoes()
  ]);

  console.info(
    "Cartola Estatístico inicializado com sucesso."
  );
}
