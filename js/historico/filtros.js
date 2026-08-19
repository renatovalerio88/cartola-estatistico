/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — filtros
   ========================================================= */


const POSICOES_FILTRO_HISTORICO = [

  {
    id: "TODOS",
    nome: "Todas"
  },

  {
    id: "GOL",
    nome: "Goleiros"
  },

  {
    id: "LAT",
    nome: "Laterais"
  },

  {
    id: "ZAG",
    nome: "Zagueiros"
  },

  {
    id: "MEI",
    nome: "Meias"
  },

  {
    id: "ATA",
    nome: "Atacantes"
  },

  {
    id: "TEC",
    nome: "Treinadores"
  }

];


/* =========================================================
   CRIA FILTROS
   ========================================================= */


function criarFiltrosHistorico() {

  const selectRodada =
    document.getElementById(
      "historyRound"
    );


  const selectPosicao =
    document.getElementById(
      "historyPosition"
    );


  if (
    !selectRodada ||
    !selectPosicao
  ) {

    return;

  }


  const estado =
    typeof HistoricoDados !==
      "undefined"

      ? HistoricoDados
          .obterEstado()

      : null;


  const rodadas =
    estado
      ?.rodadasDisponiveis
    ||
    [];


  selectRodada.innerHTML =
    "";


  rodadas

    .slice()

    .sort(
      (
        a,
        b
      ) =>
        b -
        a
    )

    .forEach(
      rodada => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          String(
            rodada
          );


        option.textContent =
          `Rodada ${rodada}`;


        if (
          Number(
            estado.rodadaSelecionada
          ) ===
          Number(
            rodada
          )
        ) {

          option.selected =
            true;

        }


        selectRodada
          .appendChild(
            option
          );

      }
    );


  selectPosicao.innerHTML =
    "";


  POSICOES_FILTRO_HISTORICO
    .forEach(
      posicao => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          posicao.id;


        option.textContent =
          posicao.nome;


        if (
          posicao.id ===
          estado
            ?.posicaoSelecionada
        ) {

          option.selected =
            true;

        }


        selectPosicao
          .appendChild(
            option
          );

      }
    );


  selectRodada.onchange =
    async () => {

      if (
        typeof HistoricoDados ===
          "undefined"
      ) {

        return;

      }


      await HistoricoDados
        .selecionarRodada(
          selectRodada.value
        );


      if (
        typeof renderizarHistorico ===
          "function"
      ) {

        renderizarHistorico();

      }

    };


  selectPosicao.onchange =
    () => {

      if (
        typeof HistoricoDados ===
          "undefined"
      ) {

        return;

      }


      HistoricoDados
        .selecionarPosicao(
          selectPosicao.value
        );


      if (
        typeof renderizarHistorico ===
          "function"
      ) {

        renderizarHistorico();

      }

    };

}


/* =========================================================
   API
   ========================================================= */


const HistoricoFiltros = {

  criar:
    criarFiltrosHistorico

};


if (
  typeof window !==
  "undefined"
) {

  window.HistoricoFiltros =
    HistoricoFiltros;


  window.criarFiltrosHistorico =
    criarFiltrosHistorico;

}
