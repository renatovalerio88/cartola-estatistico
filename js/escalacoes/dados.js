/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento e montagem dos times sugeridos
   =========================================================

   Responsabilidades:

   - carregar Conservador, Equilibrado e Agressivo;
   - utilizar os jogadores já calculados pelo motor;
   - respeitar o limite de patrimônio;
   - preservar projeção original e calibrada;
   - consolidar projeção, piso, teto, confiança e risco;
   - selecionar capitão;
   - montar banco;
   - selecionar Reserva de Luxo;
   - gerar justificativas automáticas;
   - manter compatibilidade com os cards atuais.

   IMPORTANTE:

   A calibração NÃO é aplicada novamente aqui.

   MotorProjecao já entrega:

   - projecaoOriginal
   - projecaoCalibrada
   - projecao

   ========================================================= */


const CAMINHO_ESCALACOES =
  "data/escalacoes.json";


const POSICOES_BANCO = [
  "GOL",
  "LAT",
  "ZAG",
  "MEI",
  "ATA"
];


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

  const convertido =
    Number(valor);


  return Number.isFinite(
    convertido
  )
    ? convertido
    : padrao;

}


function arredondarEscalacao(
  valor,
  casas = 2
) {

  return Number(
    numeroEscalacao(
      valor
    ).toFixed(
      casas
    )
  );

}


function normalizarTextoEscalacao(
  valor
) {

  return String(
    valor ?? ""
  )
    .trim()
    .toLowerCase();

}


function normalizarPosicaoEscalacao(
  jogador
) {

  return String(
    jogador?.posicao ??
    jogador?.posicaoAbreviacao ??
    ""
  )
    .trim()
    .toUpperCase();

}


function obterIdJogadorEscalacao(
  jogador
) {

  return String(
    jogador?.id ??
    jogador?.atletaId ??
    jogador?.atleta_id ??
    ""
  );

}


/* =========================================================
   LIMITE DE PATRIMÔNIO
   ========================================================= */


function obterLimitePatrimonioEscalacao(
  perfil = null
) {

  /*
   * 1. Caso algum perfil possua limite específico,
   *    ele tem prioridade.
   */

  const limitePerfil =
    Number(
      perfil?.limitePatrimonio
    );


  if (
    Number.isFinite(
      limitePerfil
    ) &&
    limitePerfil > 0
  ) {

    return limitePerfil;

  }


  /*
   * 2. Utiliza data/configuracao.json, que já foi
   *    carregado pelo ui.js antes das escalações.
   */

  const configuracao =
    typeof obterConfiguracaoAtual ===
      "function"
      ? obterConfiguracaoAtual()
      : null;


  const limiteConfiguracao =
    Number(
      configuracao?.limitePatrimonio
    );


  if (
    Number.isFinite(
      limiteConfiguracao
    ) &&
    limiteConfiguracao > 0
  ) {

    return limiteConfiguracao;

  }


  /*
   * 3. Sem limite conhecido, o motor continua
   *    funcionando sem bloqueio de orçamento.
   */

  return null;

}


/* =========================================================
   PROJEÇÕES
   ========================================================= */


function obterProjecaoFinalEscalacao(
  jogador
) {

  if (!jogador) {
    return 0;
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


  const original =
    Number(
      jogador.projecaoOriginal
    );


  return Number.isFinite(
    original
  )
    ? original
    : 0;

}


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


  return obterProjecaoFinalEscalacao(
    jogador
  );

}


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
   SOMA E MÉDIA
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
      total,
      jogador
    ) => {

      return (
        total +
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


function calcularMediaEscalacao(
  jogadores,
  funcao
) {

  if (
    !Array.isArray(
      jogadores
    ) ||
    jogadores.length === 0
  ) {

    return 0;

  }


  return (
    somarCampoEscalacao(
      jogadores,
      funcao
    ) /
    jogadores.length
  );

}


/* =========================================================
   CALIBRAÇÃO — RESUMO
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


  return (
    jogador.calibracaoPosicao
    ?.aplicada === true
  );

}


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
      ? (
          diferenca /
          projecaoOriginal
        ) * 100
      : 0;


  const jogadoresCalibrados =
    jogadores.filter(
      jogadorPossuiCalibracao
    );


  return {

    ativa:
      jogadoresCalibrados.length > 0,

    jogadoresTitulares:
      jogadores.length,

    jogadoresCalibrados:
      jogadoresCalibrados.length,

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
      )

  };

}


/* =========================================================
   BANCO
   ========================================================= */


function obterNotaBancoEscalacao(
  jogador
) {

  const score =
    Number(
      jogador?.score
    );


  if (
    Number.isFinite(
      score
    )
  ) {

    return score;

  }


  return obterProjecaoFinalEscalacao(
    jogador
  );

}


function compararCandidatosBancoEscalacao(
  jogadorA,
  jogadorB
) {

  const notaA =
    obterNotaBancoEscalacao(
      jogadorA
    );


  const notaB =
    obterNotaBancoEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      notaB -
      notaA
    ) > 0.000001
  ) {

    return notaB - notaA;

  }


  const projecaoA =
    obterProjecaoFinalEscalacao(
      jogadorA
    );


  const projecaoB =
    obterProjecaoFinalEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      projecaoB -
      projecaoA
    ) > 0.000001
  ) {

    return (
      projecaoB -
      projecaoA
    );

  }


  return (
    numeroEscalacao(
      jogadorB?.confianca
    ) -
    numeroEscalacao(
      jogadorA?.confianca
    )
  );

}


function montarBancoEscalacao(
  jogadores,
  titulares
) {

  const candidatos =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const listaTitulares =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  const idsTitulares =
    new Set(
      listaTitulares
        .map(
          obterIdJogadorEscalacao
        )
        .filter(
          Boolean
        )
    );


  const banco = [];


  POSICOES_BANCO.forEach(
    posicao => {

      const candidatosPosicao =
        candidatos
          .filter(
            jogador => {

              const id =
                obterIdJogadorEscalacao(
                  jogador
                );


              if (
                id &&
                idsTitulares.has(
                  id
                )
              ) {

                return false;

              }


              return (
                normalizarPosicaoEscalacao(
                  jogador
                ) ===
                posicao
              );

            }
          )
          .sort(
            compararCandidatosBancoEscalacao
          );


      if (
        candidatosPosicao.length
      ) {

        banco.push(
          candidatosPosicao[0]
        );

      }

    }
  );


  return banco;

}


/* =========================================================
   RESERVA DE LUXO
   ========================================================= */


function obterNotaReservaLuxoEscalacao(
  jogador
) {

  if (
    typeof MotorReservaLuxo !==
      "undefined" &&
    MotorReservaLuxo &&
    typeof MotorReservaLuxo.calcular ===
      "function"
  ) {

    const resultado =
      MotorReservaLuxo.calcular(
        jogador
      );


    if (
      typeof resultado ===
        "number"
    ) {

      return numeroEscalacao(
        resultado
      );

    }


    if (
      resultado &&
      typeof resultado ===
        "object"
    ) {

      return numeroEscalacao(
        resultado.score ??
        resultado.nota ??
        resultado.valor,
        obterNotaBancoEscalacao(
          jogador
        )
      );

    }

  }


  return obterNotaBancoEscalacao(
    jogador
  );

}


function escolherReservaLuxoEscalacao(
  banco
) {

  if (
    !Array.isArray(
      banco
    ) ||
    banco.length === 0
  ) {

    return null;

  }


  return banco
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

        const notaA =
          obterNotaReservaLuxoEscalacao(
            jogadorA
          );


        const notaB =
          obterNotaReservaLuxoEscalacao(
            jogadorB
          );


        if (
          Math.abs(
            notaB -
            notaA
          ) >
          0.000001
        ) {

          return notaB - notaA;

        }


        return compararCandidatosBancoEscalacao(
          jogadorA,
          jogadorB
        );

      }
    )[0];

}


/* =========================================================
   CAPITÃO
   ========================================================= */


function escolherCapitaoEscalacao(
  titulares
) {

  const jogadores =
    Array.isArray(
      titulares
    )
      ? titulares
      : [];


  if (
    jogadores.length === 0
  ) {

    return null;

  }


  if (
    typeof MotorCapitao !==
      "undefined" &&
    MotorCapitao &&
    typeof MotorCapitao.calcular ===
      "function"
  ) {

    return jogadores
      .slice()
      .sort(
        (
          jogadorA,
          jogadorB
        ) => {

          return (
            numeroEscalacao(
              MotorCapitao.calcular(
                jogadorB
              )
            ) -
            numeroEscalacao(
              MotorCapitao.calcular(
                jogadorA
              )
            )
          );

        }
      )[0];

  }


  return jogadores
    .slice()
    .sort(
      (
        jogadorA,
        jogadorB
      ) => {

        return (
          obterProjecaoFinalEscalacao(
            jogadorB
          ) -
          obterProjecaoFinalEscalacao(
            jogadorA
          )
        );

      }
    )[0];

}


/* =========================================================
   JUSTIFICATIVA DA ESTRATÉGIA
   ========================================================= */


function gerarJustificativaEstrategia(
  perfil,
  escalacao
) {

  const nomePerfil =
    normalizarTextoEscalacao(
      perfil?.perfil ??
      perfil?.nome
    );


  const projecao =
    arredondarEscalacao(
      escalacao.projecao,
      1
    );


  const piso =
    arredondarEscalacao(
      escalacao.piso,
      1
    );


  const teto =
    arredondarEscalacao(
      escalacao.teto,
      1
    );


  const confianca =
    arredondarEscalacao(
      escalacao.confianca,
      1
    );


  if (
    nomePerfil.includes(
      "conserv"
    )
  ) {

    return (
      `Escalação voltada à segurança, priorizando ` +
      `regularidade, confiança e proteção contra risco. ` +
      `Projeção total de ${projecao} pontos, ` +
      `piso de ${piso} e confiança média de ${confianca}%.`
    );

  }


  if (
    nomePerfil.includes(
      "agress"
    )
  ) {

    return (
      `Escalação orientada ao maior potencial de pontuação, ` +
      `aceitando mais volatilidade para buscar teto. ` +
      `Projeção total de ${projecao} pontos e ` +
      `teto histórico agregado de ${teto}.`
    );

  }


  return (
    `Escalação equilibrada entre projeção, segurança, ` +
    `teto e confiança. O objetivo é buscar boa pontuação ` +
    `sem elevar excessivamente o risco. ` +
    `Projeção total de ${projecao} pontos.`
  );

}


/* =========================================================
   JUSTIFICATIVA DO CAPITÃO
   ========================================================= */


function gerarJustificativaCapitao(
  capitao
) {

  if (!capitao) {

    return (
      "Nenhum capitão pôde ser selecionado."
    );

  }


  const projecao =
    arredondarEscalacao(
      obterProjecaoFinalEscalacao(
        capitao
      ),
      1
    );


  const teto =
    arredondarEscalacao(
      capitao.teto,
      1
    );


  const confianca =
    arredondarEscalacao(
      capitao.confianca,
      1
    );


  return (
    `Escolhido pelo motor de capitão considerando ` +
    `projeção de ${projecao} pontos, ` +
    `teto de ${teto} e ` +
    `confiança de ${confianca}%.`
  );

}


/* =========================================================
   JUSTIFICATIVA DO BANCO
   ========================================================= */


function gerarJustificativaBanco(
  banco
) {

  const quantidade =
    Array.isArray(
      banco
    )
      ? banco.length
      : 0;


  if (
    quantidade === 0
  ) {

    return (
      "Não foi possível montar o banco."
    );

  }


  return (
    `Banco formado pelas melhores alternativas disponíveis ` +
    `fora dos titulares, buscando uma opção para cada posição ` +
    `de linha necessária. Foram selecionados ${quantidade} reservas.`
  );

}


/* =========================================================
   JUSTIFICATIVA DA RESERVA DE LUXO
   ========================================================= */


function gerarJustificativaReservaLuxo(
  jogador
) {

  if (!jogador) {

    return (
      "Não foi possível selecionar a Reserva de Luxo."
    );

  }


  const projecao =
    arredondarEscalacao(
      obterProjecaoFinalEscalacao(
        jogador
      ),
      1
    );


  const confianca =
    arredondarEscalacao(
      jogador.confianca,
      1
    );


  return (
    `Melhor opção do banco segundo o motor de Reserva de Luxo, ` +
    `com projeção de ${projecao} pontos e ` +
    `confiança de ${confianca}%.`
  );

}


/* =========================================================
   PONTOS POSITIVOS
   ========================================================= */


function gerarPontosPositivosEscalacao(
  escalacao
) {

  const positivos = [];


  if (
    numeroEscalacao(
      escalacao.confianca
    ) >= 60
  ) {

    positivos.push(
      `Confiança média de ${arredondarEscalacao(
        escalacao.confianca,
        1
      )}%.`
    );

  }


  if (
    numeroEscalacao(
      escalacao.projecao
    ) > 0
  ) {

    positivos.push(
      `Projeção conjunta de ${arredondarEscalacao(
        escalacao.projecao,
        1
      )} pontos.`
    );

  }


  if (
    escalacao.calibracao
      ?.ativa
  ) {

    positivos.push(
      `${escalacao.calibracao.jogadoresCalibrados} ` +
      `titulares passaram pela calibração oficial por posição.`
    );

  }


  if (
    positivos.length === 0
  ) {

    positivos.push(
      "Escalação montada integralmente pelo motor estatístico."
    );

  }


  return positivos;

}


/* =========================================================
   PONTOS DE ATENÇÃO
   ========================================================= */


function gerarPontosAtencaoEscalacao(
  escalacao
) {

  const atencao = [];


  const custo =
    numeroEscalacao(
      escalacao.custo
    );


  const limite =
    numeroEscalacao(
      escalacao.limitePatrimonio
    );


  if (
    limite > 0 &&
    custo >=
      limite * 0.95
  ) {

    atencao.push(
      "Escalação utiliza quase todo o patrimônio disponível."
    );

  }


  if (
    numeroEscalacao(
      escalacao.risco
    ) >= 55
  ) {

    atencao.push(
      `Risco médio elevado (${arredondarEscalacao(
        escalacao.risco,
        1
      )}).`
    );

  }


  if (
    numeroEscalacao(
      escalacao.piso
    ) <= 0
  ) {

    atencao.push(
      "Há exposição histórica a pontuações baixas ou negativas."
    );

  }


  if (
    atencao.length === 0
  ) {

    atencao.push(
      "Nenhum alerta crítico identificado pelo motor nesta montagem."
    );

  }


  return atencao;

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
      const perfil
      of perfis
    ) {

      /* ===================================================
         LIMITE DE PATRIMÔNIO
         =================================================== */

      const limitePatrimonio =
        obterLimitePatrimonioEscalacao(
          perfil
        );


      /* ===================================================
         TITULARES
         =================================================== */

      const titulares =
        MotorEscalacao.montar(
          jogadores,
          perfil.formacao,
          limitePatrimonio ??
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
         MÉTRICAS
         =================================================== */

      const projecao =
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


      const custo =
        somarCampoEscalacao(
          listaTitulares,
          jogador =>
            jogador?.preco
        );


      const piso =
        somarCampoEscalacao(
          listaTitulares,
          jogador =>
            jogador?.piso
        );


      const teto =
        somarCampoEscalacao(
          listaTitulares,
          jogador =>
            jogador?.teto
        );


      const confianca =
        calcularMediaEscalacao(
          listaTitulares,
          jogador =>
            jogador?.confianca
        );


      const risco =
        calcularMediaEscalacao(
          listaTitulares,
          jogador =>
            jogador?.risco
        );


      /* ===================================================
         BANCO
         =================================================== */

      const banco =
        montarBancoEscalacao(
          jogadores,
          listaTitulares
        );


      /* ===================================================
         CAPITÃO
         =================================================== */

      const capitao =
        escolherCapitaoEscalacao(
          listaTitulares
        );


      /* ===================================================
         RESERVA DE LUXO
         =================================================== */

      const reservaLuxo =
        escolherReservaLuxoEscalacao(
          banco
        );


      /* ===================================================
         OBJETO FINAL
         =================================================== */

      const escalacao = {

        ...perfil,


        jogadores:
          listaTitulares,


        limitePatrimonio:
          limitePatrimonio !== null
            ? arredondarEscalacao(
                limitePatrimonio
              )
            : null,


        custo:
          arredondarEscalacao(
            custo
          ),


        saldo:
          limitePatrimonio !== null
            ? arredondarEscalacao(
                limitePatrimonio -
                custo
              )
            : null,


        projecao:
          arredondarEscalacao(
            projecao
          ),


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


        piso:
          arredondarEscalacao(
            piso
          ),


        teto:
          arredondarEscalacao(
            teto
          ),


        confianca:
          arredondarEscalacao(
            confianca,
            1
          ),


        risco:
          arredondarEscalacao(
            risco,
            1
          ),


        capitao,


        banco,


        reservaLuxo

      };


      /* ===================================================
         JUSTIFICATIVAS
         =================================================== */

      escalacao.justificativa =
        gerarJustificativaEstrategia(
          perfil,
          escalacao
        );


      escalacao.justificativaCapitao =
        gerarJustificativaCapitao(
          capitao
        );


      escalacao.justificativaBanco =
        gerarJustificativaBanco(
          banco
        );


      escalacao.justificativaReservaLuxo =
        gerarJustificativaReservaLuxo(
          reservaLuxo
        );


      escalacao.pontosPositivos =
        Array.isArray(
          perfil.pontosPositivos
        ) &&
        perfil.pontosPositivos.length
          ? perfil.pontosPositivos
          : gerarPontosPositivosEscalacao(
              escalacao
            );


      escalacao.pontosAtencao =
        Array.isArray(
          perfil.pontosAtencao
        ) &&
        perfil.pontosAtencao.length
          ? perfil.pontosAtencao
          : gerarPontosAtencaoEscalacao(
              escalacao
            );


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


  } catch (erro) {

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

  return Boolean(
    escalacao &&
    escalacao.id &&
    escalacao.nome
  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */


function iniciarEscalacoes() {

  if (
    estadoEscalacoes.carregado &&
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


  container.innerHTML = `
    <div class="empty-state">
      <strong>
        Carregando escalações...
      </strong>
    </div>
  `;

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


  container.innerHTML = `
    <div class="empty-state">
      <strong>
        Erro ao carregar escalações
      </strong>

      <p>
        ${escaparHtml(
          mensagem
        )}
      </p>
    </div>
  `;

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


  container.innerHTML = `
    <div class="empty-state">
      Nenhuma escalação disponível.
    </div>
  `;

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
          ) ===
          String(
            id
          )
      ) ||
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
