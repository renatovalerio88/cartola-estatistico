/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento dos dados
   =========================================================

   Responsabilidades:

   - carregar os perfis de escalação;
   - montar Conservador, Equilibrado e Agressivo;
   - consolidar métricas dos titulares;
   - preservar projeção original;
   - utilizar projeção calibrada quando disponível;
   - registrar impacto da calibração;
   - selecionar capitão;
   - selecionar Reserva de Luxo.

   IMPORTANTE:

   A calibração NÃO é aplicada novamente neste arquivo.

   MotorProjecao é responsável por calcular:

   projecaoOriginal
   projecaoCalibrada
   projecao

   Aqui apenas consumimos esses valores.

   ========================================================= */


const CAMINHO_ESCALACOES =
  "data/escalacoes.json";


const estadoEscalacoes = {

  escalacoes: [],

  carregado: false,

  carregando: false,

  erro: null

};


/* =========================================================
   UTILIDADES
   ========================================================= */


function numeroEscalacao(
  valor,
  padrao = 0
) {

  const numero =
    Number(
      valor
    );


  return Number.isFinite(
    numero
  )
    ? numero
    : padrao;

}


function arredondarEscalacao(
  valor,
  casas = 2
) {

  const numero =
    numeroEscalacao(
      valor
    );


  const fator =
    Math.pow(
      10,
      casas
    );


  return (
    Math.round(
      numero * fator
    ) / fator
  );

}


/* =========================================================
   PROJEÇÃO DO JOGADOR
   ========================================================= */


function obterProjecaoFinalEscalacao(
  jogador
) {

  if (!jogador) {

    return 0;

  }


  const calibrada =
    Number(
      jogador.projecaoCalibrada
    );


  if (
    Number.isFinite(
      calibrada
    )
  ) {

    return calibrada;

  }


  const projecao =
    Number(
      jogador.projecao
    );


  if (
    Number.isFinite(
      projecao
    )
  ) {

    return projecao;

  }


  const original =
    Number(
      jogador.projecaoOriginal
    );


  if (
    Number.isFinite(
      original
    )
  ) {

    return original;

  }


  return 0;

}


/* =========================================================
   PROJEÇÃO ORIGINAL
   ========================================================= */


function obterProjecaoOriginalEscalacao(
  jogador
) {

  if (!jogador) {

    return 0;

  }


  const original =
    Number(
      jogador.projecaoOriginal
    );


  if (
    Number.isFinite(
      original
    )
  ) {

    return original;

  }


  const projecao =
    Number(
      jogador.projecao
    );


  if (
    Number.isFinite(
      projecao
    )
  ) {

    return projecao;

  }


  const calibrada =
    Number(
      jogador.projecaoCalibrada
    );


  if (
    Number.isFinite(
      calibrada
    )
  ) {

    return calibrada;

  }


  return 0;

}


/* =========================================================
   PROJEÇÃO CALIBRADA
   ========================================================= */


function obterProjecaoCalibradaEscalacao(
  jogador
) {

  if (!jogador) {

    return 0;

  }


  const calibrada =
    Number(
      jogador.projecaoCalibrada
    );


  if (
    Number.isFinite(
      calibrada
    )
  ) {

    return calibrada;

  }


  return obterProjecaoFinalEscalacao(
    jogador
  );

}


/* =========================================================
   CALIBRAÇÃO APLICADA
   ========================================================= */


function jogadorPossuiCalibracao(
  jogador
) {

  if (!jogador) {

    return false;

  }


  if (
    jogador.calibracaoAplicada ===
    true
  ) {

    return true;

  }


  if (
    jogador.calibracaoPosicao
    &&
    jogador.calibracaoPosicao.aplicada ===
    true
  ) {

    return true;

  }


  const original =
    Number(
      jogador.projecaoOriginal
    );


  const calibrada =
    Number(
      jogador.projecaoCalibrada
    );


  if (
    Number.isFinite(
      original
    )
    &&
    Number.isFinite(
      calibrada
    )
  ) {

    return (
      Math.abs(
        calibrada -
        original
      ) > 0.000001
    );

  }


  return false;

}


/* =========================================================
   SOMATÓRIO
   ========================================================= */


function somarCampoEscalacao(
  jogadores,
  funcao
) {

  if (
    !Array.isArray(
      jogadores
    )
  ) {

    return 0;

  }


  return jogadores.reduce(

    (
      soma,
      jogador
    ) => {

      return (
        soma +
        numeroEscalacao(
          funcao(
            jogador
          )
        )
      );

    },

    0

  );

}


/* =========================================================
   MÉDIA
   ========================================================= */


function calcularMediaEscalacao(
  jogadores,
  funcao
) {

  if (
    !Array.isArray(
      jogadores
    )
    ||
    jogadores.length === 0
  ) {

    return 0;

  }


  const total =
    somarCampoEscalacao(
      jogadores,
      funcao
    );


  return (
    total /
    jogadores.length
  );

}


/* =========================================================
   RESUMO DA CALIBRAÇÃO
   ========================================================= */


function calcularResumoCalibracaoEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  const projecaoOriginal =
    somarCampoEscalacao(

      jogadores,

      obterProjecaoOriginalEscalacao

    );


  const projecaoCalibrada =
    somarCampoEscalacao(

      jogadores,

      obterProjecaoCalibradaEscalacao

    );


  const diferenca =

    projecaoCalibrada -
    projecaoOriginal;


  const percentual =

    projecaoOriginal !== 0

      ?

      (
        diferenca /
        projecaoOriginal
      ) * 100

      :

      0;


  const calibrados =
    jogadores.filter(
      jogadorPossuiCalibracao
    );


  const porPosicao = {};


  calibrados.forEach(
    jogador => {

      const posicao =

        jogador?.calibracaoPosicao
          ?.posicao

        ||

        jogador?.posicao

        ||

        "DESCONHECIDA";


      if (
        !porPosicao[
          posicao
        ]
      ) {

        porPosicao[
          posicao
        ] = {

          jogadores:
            0,

          projecaoOriginal:
            0,

          projecaoCalibrada:
            0,

          diferenca:
            0

        };

      }


      const registro =
        porPosicao[
          posicao
        ];


      const original =
        obterProjecaoOriginalEscalacao(
          jogador
        );


      const calibrada =
        obterProjecaoCalibradaEscalacao(
          jogador
        );


      registro.jogadores +=
        1;


      registro.projecaoOriginal +=
        original;


      registro.projecaoCalibrada +=
        calibrada;


      registro.diferenca +=
        calibrada -
        original;

    }
  );


  Object.keys(
    porPosicao
  ).forEach(
    posicao => {

      const registro =
        porPosicao[
          posicao
        ];


      registro.projecaoOriginal =
        arredondarEscalacao(
          registro.projecaoOriginal
        );


      registro.projecaoCalibrada =
        arredondarEscalacao(
          registro.projecaoCalibrada
        );


      registro.diferenca =
        arredondarEscalacao(
          registro.diferenca
        );

    }
  );


  return {

    ativa:
      calibrados.length > 0,

    jogadoresTitulares:
      jogadores.length,

    jogadoresCalibrados:
      calibrados.length,

    projecaoOriginal:
      arredondarEscalacao(
        projecaoOriginal
      ),

    projecaoCalibrada:
      arredondarEscalacao(
        projecaoCalibrada
      ),

    diferenca:
      arredondarEscalacao(
        diferenca
      ),

    percentual:
      arredondarEscalacao(
        percentual
      ),

    porPosicao

  };

}


/* =========================================================
   CARREGAMENTO
   ========================================================= */


async function carregarEscalacoes() {

  estadoEscalacoes.carregando =
    true;


  estadoEscalacoes.carregado =
    false;


  estadoEscalacoes.erro =
    null;


  exibirCarregamentoEscalacoes();


  try {


    const resposta =
      await fetch(

        CAMINHO_ESCALACOES,

        {
          cache:
            "no-store"
        }

      );


    if (
      !resposta.ok
    ) {

      throw new Error(

        `Erro HTTP ${resposta.status}`

      );

    }


    const perfis =
      await resposta.json();


    if (
      !Array.isArray(
        perfis
      )
    ) {

      throw new Error(

        "Arquivo de perfis inválido."

      );

    }


    const jogadores =
      obterJogadoresCarregados();


    const escalacoes = [];


    for (
      const perfil of perfis
    ) {


      /* ===================================================
         MONTAGEM DOS TITULARES
         =================================================== */


      const titulares =
        MotorEscalacao.montar(

          jogadores,

          perfil.formacao,

          Infinity,

          perfil.perfil

        );


      const listaTitulares =
        Array.isArray(
          titulares
        )
          ? titulares
          : [];


      /* ===================================================
         PROJEÇÕES
         =================================================== */


      const projecaoFinal =
        somarCampoEscalacao(

          listaTitulares,

          obterProjecaoFinalEscalacao

        );


      const projecaoOriginal =
        somarCampoEscalacao(

          listaTitulares,

          obterProjecaoOriginalEscalacao

        );


      const projecaoCalibrada =
        somarCampoEscalacao(

          listaTitulares,

          obterProjecaoCalibradaEscalacao

        );


      const resumoCalibracao =
        calcularResumoCalibracaoEscalacao(

          listaTitulares

        );


      /* ===================================================
         ESCALAÇÃO
         =================================================== */


      const escalacao = {


        ...perfil,


        jogadores:
          listaTitulares,


        /* ===============================================
           CUSTO
           =============================================== */


        custo:
          arredondarEscalacao(

            somarCampoEscalacao(

              listaTitulares,

              jogador =>
                jogador?.preco

            )

          ),


        /* ===============================================
           PROJEÇÃO OFICIAL UTILIZADA
           =============================================== */


        projecao:
          arredondarEscalacao(
            projecaoFinal
          ),


        /* ===============================================
           AUDITORIA A/B
           =============================================== */


        projecaoOriginal:
          arredondarEscalacao(
            projecaoOriginal
          ),


        projecaoCalibrada:
          arredondarEscalacao(
            projecaoCalibrada
          ),


        impactoCalibracao:
          arredondarEscalacao(

            projecaoCalibrada -
            projecaoOriginal

          ),


        percentualCalibracao:
          resumoCalibracao
            .percentual,


        calibracao:
          resumoCalibracao,


        /* ===============================================
           PISO
           =============================================== */


        piso:
          arredondarEscalacao(

            somarCampoEscalacao(

              listaTitulares,

              jogador =>
                jogador?.piso

            )

          ),


        /* ===============================================
           TETO
           =============================================== */


        teto:
          arredondarEscalacao(

            somarCampoEscalacao(

              listaTitulares,

              jogador =>
                jogador?.teto

            )

          ),


        /* ===============================================
           CONFIANÇA
           =============================================== */


        confianca:
          arredondarEscalacao(

            calcularMediaEscalacao(

              listaTitulares,

              jogador =>
                jogador?.confianca

            )

          ),


        /* ===============================================
           RISCO
           =============================================== */


        risco:
          arredondarEscalacao(

            calcularMediaEscalacao(

              listaTitulares,

              jogador =>
                jogador?.risco

            )

          ),


        /* ===============================================
           BANCO
           =============================================== */


        banco: []

      };


      /* ===================================================
         CAPITÃO
         =================================================== */


      if (
        typeof MotorCapitao !==
        "undefined"
        &&
        MotorCapitao
        &&
        typeof MotorCapitao.calcular ===
        "function"
        &&
        listaTitulares.length
      ) {


        escalacao.capitao =
          listaTitulares
            .slice()
            .sort(

              (
                a,
                b
              ) =>

                numeroEscalacao(
                  MotorCapitao.calcular(
                    b
                  )
                )

                -

                numeroEscalacao(
                  MotorCapitao.calcular(
                    a
                  )
                )

            )[0];

      }


      /* ===================================================
         RESERVA DE LUXO
         =================================================== */


      if (
        typeof MotorReservaLuxo !==
        "undefined"
        &&
        MotorReservaLuxo
        &&
        typeof MotorReservaLuxo.calcular ===
        "function"
        &&
        listaTitulares.length
      ) {


        escalacao.reservaLuxo =
          listaTitulares
            .slice()
            .sort(

              (
                a,
                b
              ) =>

                numeroEscalacao(
                  MotorReservaLuxo.calcular(
                    b
                  )
                )

                -

                numeroEscalacao(
                  MotorReservaLuxo.calcular(
                    a
                  )
                )

            )[0];

      }


      escalacoes.push(
        escalacao
      );

    }


    estadoEscalacoes.escalacoes =
      escalacoes;


    estadoEscalacoes.carregado =
      true;


    estadoEscalacoes.carregando =
      false;


    iniciarEscalacoes();


    return escalacoes;


  } catch (
    erro
  ) {


    console.error(

      "Erro ao carregar escalações:",

      erro

    );


    estadoEscalacoes.escalacoes =
      [];


    estadoEscalacoes.carregado =
      false;


    estadoEscalacoes.carregando =
      false;


    estadoEscalacoes.erro =
      erro.message;


    exibirErroEscalacoes(
      erro.message
    );


    return [];

  }

}


/* =========================================================
   VALIDAÇÃO
   ========================================================= */


function validarEscalacao(
  escalacao
) {

  return !!(

    escalacao

    &&

    escalacao.id

    &&

    escalacao.nome

  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */


function iniciarEscalacoes() {

  if (

    estadoEscalacoes.carregado

    &&

    typeof exibirEscalacoes ===
      "function"

  ) {

    exibirEscalacoes();

  }

}


/* =========================================================
   CONTAINER
   ========================================================= */


function obterContainerEscalacoes() {

  const secao =
    document.getElementById(
      "times"
    );


  if (!secao) {

    return null;

  }


  let container =
    document.getElementById(
      "suggestedLineupsGrid"
    );


  if (container) {

    return container;

  }


  container =
    document.createElement(
      "div"
    );


  container.id =
    "suggestedLineupsGrid";


  container.className =
    "suggested-lineups-grid";


  secao.appendChild(
    container
  );


  return container;

}


/* =========================================================
   CARREGAMENTO VISUAL
   ========================================================= */


function exibirCarregamentoEscalacoes() {

  const container =
    obterContainerEscalacoes();


  if (!container) {

    return;

  }


  container.innerHTML =
    `<div class="empty-state">
      <strong>Carregando escalações...</strong>
    </div>`;

}


/* =========================================================
   ERRO VISUAL
   ========================================================= */


function exibirErroEscalacoes(
  mensagem = ""
) {

  const container =
    obterContainerEscalacoes();


  if (!container) {

    return;

  }


  container.innerHTML =
    `<div class="empty-state">
      <strong>Erro ao carregar escalações</strong>
      <p>${escaparHtml(mensagem)}</p>
    </div>`;

}


/* =========================================================
   SEM ESCALAÇÕES
   ========================================================= */


function exibirSemEscalacoes() {

  const container =
    obterContainerEscalacoes();


  if (!container) {

    return;

  }


  container.innerHTML =
    `<div class="empty-state">
      Nenhuma escalação disponível.
    </div>`;

}


/* =========================================================
   CONSULTAS
   ========================================================= */


function obterEscalacoesCarregadas() {

  return [
    ...estadoEscalacoes.escalacoes
  ];

}


function obterEscalacaoPorId(
  id
) {

  return (
    estadoEscalacoes
      .escalacoes
      .find(

        escalacao =>

          String(
            escalacao.id
          )

          ===

          String(
            id
          )

      )

    ||

    null
  );

}


function escalacoesCarregadas() {

  return estadoEscalacoes
    .carregado;

}


function obterErroEscalacoes() {

  return estadoEscalacoes
    .erro;

}
