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
}
