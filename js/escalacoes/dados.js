/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento e montagem dos times sugeridos
   =========================================================

   Responsabilidades:

   - carregar Conservador, Equilibrado e Agressivo;
   - utilizar os jogadores já calculados pelo motor;
   - respeitar patrimônio definido pelo usuário;
   - preservar projeção original e calibrada;
   - consolidar projeção, piso, teto, confiança e risco;
   - comparar formações sem preferência artificial;
   - selecionar capitão;
   - montar banco dentro do saldo disponível;
   - consolidar custo total de titulares + banco;
   - selecionar Reserva de Luxo;
   - aplicar viabilidade/titularidade da rodada;
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


const FORMACOES_CANDIDATAS_ESCALACAO = [
  "4-4-2",
  "3-4-3",
  "4-3-3"
];


const FORMACOES_ESTRUTURA_ESCALACAO = {

  "4-4-2": {
    GOL: 1,
    LAT: 2,
    ZAG: 2,
    MEI: 4,
    ATA: 2,
    TEC: 1
  },

  "3-4-3": {
    GOL: 1,
    LAT: 0,
    ZAG: 3,
    MEI: 4,
    ATA: 3,
    TEC: 1
  },

  "4-3-3": {
    GOL: 1,
    LAT: 2,
    ZAG: 2,
    MEI: 3,
    ATA: 3,
    TEC: 1
  }

};


const ORDEM_POSICOES_ESCALACAO = [
  "GOL",
  "LAT",
  "ZAG",
  "MEI",
  "ATA",
  "TEC"
];


const LIMITE_JOGADORES_CLUBE_ESCALACAO = 3;


const estadoEscalacoes = {

  escalacoes: [],

  carregado: false,

  carregando: false,

  erro: null,

  patrimonioSelecionado: null

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
   VIABILIDADE DA RODADA
   ========================================================= */


function obterAnaliseViabilidadeEscalacao(
  jogador
) {

  if (!jogador) {
    return null;
  }


  if (
    jogador.viabilidade &&
    typeof jogador.viabilidade ===
      "object"
  ) {

    return jogador.viabilidade;

  }


  if (
    typeof MotorViabilidade !==
      "undefined" &&
    MotorViabilidade &&
    typeof MotorViabilidade.calcular ===
      "function"
  ) {

    try {

      return MotorViabilidade.calcular(
        jogador
      );

    } catch (erro) {

      console.warn(
        "Falha ao calcular viabilidade do jogador:",
        jogador?.id,
        erro
      );

    }

  }


  return null;

}


function jogadorElegivelRodadaEscalacao(
  jogador
) {

  const analise =
    obterAnaliseViabilidadeEscalacao(
      jogador
    );


  if (!analise) {
    return true;
  }


  return (
    analise.bloqueado !== true &&
    analise.elegivel !== false &&
    analise.classificacao !==
      "BLOQUEADO" &&
    analise.classificacao !==
      "EVITAR"
  );

}


function obterPesoViabilidadePerfilEscalacao(
  perfil
) {

  const nome =
    normalizarTextoEscalacao(
      perfil?.perfil ??
      perfil?.nome
    );


  if (
    nome.includes(
      "conserv"
    )
  ) {

    return 0.45;

  }


  if (
    nome.includes(
      "agress"
    )
  ) {

    return 0.18;

  }


  return 0.30;

}


function prepararJogadorViabilidadeEscalacao(
  jogador,
  perfil
) {

  const analise =
    obterAnaliseViabilidadeEscalacao(
      jogador
    );


  if (!analise) {

    return {
      ...jogador
    };

  }


  const scoreOriginal =
    numeroEscalacao(
      jogador?.score,
      obterProjecaoFinalEscalacao(
        jogador
      )
    );


  const fatorDisponibilidade =
    Math.max(
      0,
      Math.min(
        1,
        numeroEscalacao(
          analise.fatorDisponibilidade,
          numeroEscalacao(
            analise.titularidade,
            50
          ) / 100
        )
      )
    );


  const pesoViabilidade =
    obterPesoViabilidadePerfilEscalacao(
      perfil
    );


  const fatorPerfil =
    (
      1 -
      pesoViabilidade
    ) +
    (
      pesoViabilidade *
      fatorDisponibilidade
    );


  const scoreAjustado =
    scoreOriginal *
    fatorPerfil;


  return {

    ...jogador,

    scoreEstatistico:
      scoreOriginal,

    score:
      arredondarEscalacao(
        scoreAjustado,
        4
      ),

    viabilidade:
      analise,

    titularidade:
      numeroEscalacao(
        analise.titularidade,
        0
      ),

    riscoEscalacao:
      numeroEscalacao(
        analise.riscoEscalacao,
        0
      ),

    fatorDisponibilidade,

    projecaoViabilidade:
      numeroEscalacao(
        analise.projecaoAjustada,
        obterProjecaoFinalEscalacao(
          jogador
        )
      ),

    classificacaoViabilidade:
      analise.classificacao ??
      "MEDIA",

    elegivelRodada:
      analise.elegivel !== false,

    bloqueadoRodada:
      analise.bloqueado === true,

    motivosViabilidade:
      Array.isArray(
        analise.motivos
      )
        ? analise.motivos
        : [],

    alertasViabilidade:
      Array.isArray(
        analise.alertas
      )
        ? analise.alertas
        : [],

    justificativaViabilidade:
      analise.justificativa ??
      ""

  };

}


function prepararJogadoresViabilidadeEscalacao(
  jogadores,
  perfil
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const preparados =
    lista.map(
      jogador =>
        prepararJogadorViabilidadeEscalacao(
          jogador,
          perfil
        )
    );


  return preparados.filter(
    jogadorElegivelRodadaEscalacao
  );

}


function calcularResumoViabilidadeEscalacao(
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

    return {

      ativa: false,

      titularidadeMedia: 0,

      riscoEscalacaoMedio: 0,

      altaOuMuitoAlta: 0,

      baixa: 0,

      bloqueados: 0

    };

  }


  const analisados =
    jogadores.filter(
      jogador =>
        jogador?.viabilidade &&
        typeof jogador.viabilidade ===
          "object"
    );


  if (
    analisados.length === 0
  ) {

    return {

      ativa: false,

      titularidadeMedia: 0,

      riscoEscalacaoMedio: 0,

      altaOuMuitoAlta: 0,

      baixa: 0,

      bloqueados: 0

    };

  }


  const titularidadeMedia =
    calcularMediaEscalacao(
      analisados,
      jogador =>
        jogador?.viabilidade
          ?.titularidade
    );


  const riscoEscalacaoMedio =
    calcularMediaEscalacao(
      analisados,
      jogador =>
        jogador?.viabilidade
          ?.riscoEscalacao
    );


  const altaOuMuitoAlta =
    analisados.filter(
      jogador =>
        [
          "ALTA",
          "MUITO_ALTA"
        ].includes(
          jogador?.viabilidade
            ?.classificacao
        )
    ).length;


  const baixa =
    analisados.filter(
      jogador =>
        jogador?.viabilidade
          ?.classificacao ===
        "BAIXA"
    ).length;


  const bloqueados =
    analisados.filter(
      jogador =>
        jogador?.viabilidade
          ?.bloqueado ===
        true
    ).length;


  return {

    ativa: true,

    jogadoresAnalisados:
      analisados.length,

    titularidadeMedia:
      arredondarEscalacao(
        titularidadeMedia,
        1
      ),

    riscoEscalacaoMedio:
      arredondarEscalacao(
        riscoEscalacaoMedio,
        1
      ),

    altaOuMuitoAlta,

    baixa,

    bloqueados

  };

}


/* =========================================================
   PATRIMÔNIO
   ========================================================= */


function obterPatrimonioSelecionadoEscalacoes() {

  const patrimonio =
    Number(
      estadoEscalacoes
        .patrimonioSelecionado
    );


  if (
    Number.isFinite(
      patrimonio
    ) &&
    patrimonio > 0
  ) {

    return patrimonio;

  }


  return null;

}


function obterLimitePatrimonioEscalacao(
  perfil = null
) {

  const patrimonioSelecionado =
    obterPatrimonioSelecionadoEscalacoes();


  if (
    patrimonioSelecionado !== null
  ) {

    return patrimonioSelecionado;

  }


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


  return null;

}


async function definirPatrimonioEscalacoes(
  valor
) {

  const patrimonio =
    Number(valor);


  if (
    !Number.isFinite(
      patrimonio
    ) ||
    patrimonio <= 0
  ) {

    throw new Error(
      "Patrimônio inválido."
    );

  }


  estadoEscalacoes
    .patrimonioSelecionado =
      arredondarEscalacao(
        patrimonio
      );


  return carregarEscalacoes();

}


async function restaurarPatrimonioPadraoEscalacoes() {

  estadoEscalacoes
    .patrimonioSelecionado =
      null;


  return carregarEscalacoes();

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


/* =========================================================
   MONTAGEM DO BANCO COM ORÇAMENTO
   ========================================================= */


function montarBancoEscalacao(
  jogadores,
  titulares,
  limiteBanco = null
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


  const limite =
    Number(
      limiteBanco
    );


  const possuiLimite =
    Number.isFinite(
      limite
    ) &&
    limite >= 0;


  const candidatosPorPosicao =
    POSICOES_BANCO.map(
      posicao => {

        return candidatos
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

      }
    );


  if (
    candidatosPorPosicao.some(
      lista =>
        lista.length === 0
    )
  ) {

    return [];

  }


  if (!possuiLimite) {

    return candidatosPorPosicao.map(
      lista =>
        lista[0]
    );

  }


  const limiteCentavos =
    Math.max(
      0,
      Math.round(
        limite * 100
      )
    );


  let estados =
    new Map([
      [
        0,
        {
          custoCentavos: 0,
          nota: 0,
          projecao: 0,
          confianca: 0,
          jogadores: []
        }
      ]
    ]);


  candidatosPorPosicao.forEach(
    listaPosicao => {

      const proximos =
        new Map();


      estados.forEach(
        estado => {

          listaPosicao.forEach(
            jogador => {

              const preco =
                Math.max(
                  0,
                  numeroEscalacao(
                    jogador?.preco
                  )
                );


              const precoCentavos =
                Math.round(
                  preco * 100
                );


              const novoCusto =
                estado.custoCentavos +
                precoCentavos;


              if (
                novoCusto >
                limiteCentavos
              ) {

                return;

              }


              const candidato = {

                custoCentavos:
                  novoCusto,

                nota:
                  estado.nota +
                  obterNotaBancoEscalacao(
                    jogador
                  ),

                projecao:
                  estado.projecao +
                  obterProjecaoFinalEscalacao(
                    jogador
                  ),

                confianca:
                  estado.confianca +
                  numeroEscalacao(
                    jogador?.confianca
                  ),

                jogadores: [
                  ...estado.jogadores,
                  jogador
                ]

              };


              const atual =
                proximos.get(
                  novoCusto
                );


              const candidatoMelhor =
                !atual ||

                candidato.nota >
                  atual.nota +
                  0.000001 ||

                (
                  Math.abs(
                    candidato.nota -
                    atual.nota
                  ) <= 0.000001 &&

                  candidato.projecao >
                    atual.projecao +
                    0.000001
                ) ||

                (
                  Math.abs(
                    candidato.nota -
                    atual.nota
                  ) <= 0.000001 &&

                  Math.abs(
                    candidato.projecao -
                    atual.projecao
                  ) <= 0.000001 &&

                  candidato.confianca >
                    atual.confianca
                );


              if (
                candidatoMelhor
              ) {

                proximos.set(
                  novoCusto,
                  candidato
                );

              }

            }
          );

        }
      );


      estados =
        proximos;

    }
  );


  const solucoes =
    Array.from(
      estados.values()
    );


  if (
    solucoes.length === 0
  ) {

    return [];

  }


  solucoes.sort(
    (
      a,
      b
    ) => {

      if (
        Math.abs(
          b.nota -
          a.nota
        ) > 0.000001
      ) {

        return (
          b.nota -
          a.nota
        );

      }


      if (
        Math.abs(
          b.projecao -
          a.projecao
        ) > 0.000001
      ) {

        return (
          b.projecao -
          a.projecao
        );

      }


      if (
        Math.abs(
          b.confianca -
          a.confianca
        ) > 0.000001
      ) {

        return (
          b.confianca -
          a.confianca
        );

      }


      return (
        a.custoCentavos -
        b.custoCentavos
      );

    }
  );


  return (
    solucoes[0]
      ?.jogadores ??
    []
  );

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

          return (
            notaB -
            notaA
          );

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


  const formacao =
    escalacao.formacao ??
    perfil?.formacao ??
    "--";


  const textoViabilidade =
    escalacao.viabilidade?.ativa === true
      ? ` Titularidade média estimada em ${arredondarEscalacao(
          escalacao.viabilidade.titularidadeMedia,
          1
        )}% e risco médio de escalação de ${arredondarEscalacao(
          escalacao.viabilidade.riscoEscalacaoMedio,
          1
        )}%.`
      : "";


  if (
    nomePerfil.includes(
      "conserv"
    )
  ) {

    return (
      `Escalação ${formacao} escolhida automaticamente pelo motor, ` +
      `voltada à segurança, priorizando regularidade, confiança ` +
      `e proteção contra risco. Projeção total de ${projecao} pontos, ` +
      `piso de ${piso} e confiança média de ${confianca}%.` +
      textoViabilidade
    );

  }


  if (
    nomePerfil.includes(
      "agress"
    )
  ) {

    return (
      `Escalação ${formacao} escolhida automaticamente pelo motor, ` +
      `orientada ao maior potencial de pontuação, aceitando mais ` +
      `volatilidade para buscar teto. Projeção total de ${projecao} ` +
      `pontos e teto histórico agregado de ${teto}.` +
      textoViabilidade
    );

  }


  return (
    `Escalação ${formacao} escolhida automaticamente pelo motor, ` +
    `equilibrando projeção, segurança, teto e confiança. ` +
    `O objetivo é buscar boa pontuação sem elevar excessivamente ` +
    `o risco. Projeção total de ${projecao} pontos.` +
    textoViabilidade
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
    escalacao.viabilidade?.ativa === true
  ) {

    positivos.push(
      `Viabilidade da rodada aplicada: titularidade média estimada em ${arredondarEscalacao(
        escalacao.viabilidade.titularidadeMedia,
        1
      )}%.`
    );

  }


  if (
    escalacao.formacaoAutomatica ===
      true
  ) {

    positivos.push(
      `Formação ${escalacao.formacao} escolhida pelo motor ` +
      `após comparação automática entre as formações disponíveis.`
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
    escalacao.bancoCompleto ===
      false
  ) {

    atencao.push(
      "Patrimônio insuficiente para completar o banco com uma reserva por posição."
    );

  }


  if (
    escalacao.viabilidade?.ativa === true &&
    numeroEscalacao(
      escalacao.viabilidade.riscoEscalacaoMedio
    ) >= 40
  ) {

    atencao.push(
      `Risco médio de escalação na rodada em ${arredondarEscalacao(
        escalacao.viabilidade.riscoEscalacaoMedio,
        1
      )}%.`
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
   ESCOLHA AUTOMÁTICA DA FORMAÇÃO
   ========================================================= */

function obterNotaTitularEscalacao(
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


function calcularNotaFormacaoEscalacao(
  jogadores
) {

  return somarCampoEscalacao(
    jogadores,
    obterNotaTitularEscalacao
  );

}


function compararFormacoesEscalacao(
  opcaoA,
  opcaoB
) {

  if (
    opcaoA.completaTotal !==
    opcaoB.completaTotal
  ) {

    return opcaoB.completaTotal
      ? 1
      : -1;

  }


  if (
    opcaoA.completa !==
    opcaoB.completa
  ) {

    return opcaoB.completa
      ? 1
      : -1;

  }


  if (
    Math.abs(
      opcaoB.nota -
      opcaoA.nota
    ) > 0.000001
  ) {

    return (
      opcaoB.nota -
      opcaoA.nota
    );

  }


  if (
    Math.abs(
      opcaoB.projecao -
      opcaoA.projecao
    ) > 0.000001
  ) {

    return (
      opcaoB.projecao -
      opcaoA.projecao
    );

  }


  if (
    Math.abs(
      opcaoA.custoTotal -
      opcaoB.custoTotal
    ) > 0.000001
  ) {

    return (
      opcaoA.custoTotal -
      opcaoB.custoTotal
    );

  }


  return (
    FORMACOES_CANDIDATAS_ESCALACAO
      .indexOf(
        opcaoA.formacao
      ) -
    FORMACOES_CANDIDATAS_ESCALACAO
      .indexOf(
        opcaoB.formacao
      )
  );

}


/* =========================================================
   MONTAGEM FINANCEIRA PROTEGIDA
   ========================================================= */


function obterChaveClubeEscalacao(
  jogador
) {

  return normalizarTextoEscalacao(
    jogador?.siglaClube ??
    jogador?.clube ??
    jogador?.clubeNome ??
    jogador?.clubeId ??
    ""
  );

}


function contarClubesEscalacao(
  jogadores
) {

  const contagem =
    new Map();


  (
    Array.isArray(jogadores)
      ? jogadores
      : []
  ).forEach(
    jogador => {

      const clube =
        obterChaveClubeEscalacao(
          jogador
        );


      if (!clube) {
        return;
      }


      contagem.set(
        clube,
        (
          contagem.get(
            clube
          ) ??
          0
        ) + 1
      );

    }
  );


  return contagem;

}


function podeAdicionarClubeEscalacao(
  jogador,
  titulares
) {

  const clube =
    obterChaveClubeEscalacao(
      jogador
    );


  if (!clube) {
    return true;
  }


  const contagem =
    contarClubesEscalacao(
      titulares
    );


  return (
    (
      contagem.get(
        clube
      ) ??
      0
    ) <
    LIMITE_JOGADORES_CLUBE_ESCALACAO
  );

}


function compararCandidatosTitularesEscalacao(
  jogadorA,
  jogadorB
) {

  const notaA =
    obterNotaTitularEscalacao(
      jogadorA
    );


  const notaB =
    obterNotaTitularEscalacao(
      jogadorB
    );


  if (
    Math.abs(
      notaB -
      notaA
    ) >
    0.000001
  ) {

    return (
      notaB -
      notaA
    );

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
    ) >
    0.000001
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


function obterCandidatosLivresPorPosicaoEscalacao(
  jogadores,
  posicao,
  idsUsados
) {

  const usados =
    idsUsados instanceof Set
      ? idsUsados
      : new Set();


  return (
    Array.isArray(jogadores)
      ? jogadores
      : []
  )
    .filter(
      jogador => {

        const id =
          obterIdJogadorEscalacao(
            jogador
          );


        return (
          normalizarPosicaoEscalacao(
            jogador
          ) ===
          posicao &&
          (
            !id ||
            !usados.has(
              id
            )
          )
        );

      }
    );

}


function calcularReservaMinimaFuturaEscalacao(
  jogadores,
  formacao,
  titularesSimulados
) {

  const estrutura =
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ];


  if (!estrutura) {
    return null;
  }


  const titulares =
    Array.isArray(
      titularesSimulados
    )
      ? titularesSimulados
      : [];


  const idsUsados =
    new Set(
      titulares
        .map(
          obterIdJogadorEscalacao
        )
        .filter(
          Boolean
        )
    );


  const quantidadeAtual =
    {};


  titulares.forEach(
    jogador => {

      const posicao =
        normalizarPosicaoEscalacao(
          jogador
        );


      quantidadeAtual[
        posicao
      ] =
        (
          quantidadeAtual[
            posicao
          ] ??
          0
        ) + 1;

    }
  );


  let custoMinimo = 0;


  for (
    const posicao
    of ORDEM_POSICOES_ESCALACAO
  ) {

    const titularesNecessarios =
      numeroEscalacao(
        estrutura[
          posicao
        ],
        0
      );


    const titularesAtuais =
      numeroEscalacao(
        quantidadeAtual[
          posicao
        ],
        0
      );


    const faltamTitulares =
      Math.max(
        0,
        titularesNecessarios -
        titularesAtuais
      );


    const precisaReserva =
      POSICOES_BANCO.includes(
        posicao
      )
        ? 1
        : 0;


    const quantidadeNecessaria =
      faltamTitulares +
      precisaReserva;


    if (
      quantidadeNecessaria <= 0
    ) {

      continue;

    }


    const disponiveis =
      obterCandidatosLivresPorPosicaoEscalacao(
        jogadores,
        posicao,
        idsUsados
      )
        .sort(
          (
            jogadorA,
            jogadorB
          ) => {

            const precoA =
              numeroEscalacao(
                jogadorA?.preco
              );


            const precoB =
              numeroEscalacao(
                jogadorB?.preco
              );


            if (
              Math.abs(
                precoA -
                precoB
              ) >
              0.000001
            ) {

              return (
                precoA -
                precoB
              );

            }


            return compararCandidatosTitularesEscalacao(
              jogadorA,
              jogadorB
            );

          }
        );


    if (
      disponiveis.length <
      quantidadeNecessaria
    ) {

      return null;

    }


    custoMinimo +=
      disponiveis
        .slice(
          0,
          quantidadeNecessaria
        )
        .reduce(
          (
            total,
            jogador
          ) => {

            return (
              total +
              numeroEscalacao(
                jogador?.preco
              )
            );

          },
          0
        );

  }


  return arredondarEscalacao(
    custoMinimo,
    2
  );

}


function montarTitularesProtegidosEscalacao(
  jogadores,
  formacao,
  limitePatrimonio
) {

  const estrutura =
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ];


  if (!estrutura) {
    return [];
  }


  const limite =
    Number(
      limitePatrimonio
    );


  const possuiLimite =
    Number.isFinite(
      limite
    ) &&
    limite > 0;


  const titulares = [];

  let custoAtual = 0;


  for (
    const posicao
    of ORDEM_POSICOES_ESCALACAO
  ) {

    const quantidade =
      numeroEscalacao(
        estrutura[
          posicao
        ],
        0
      );


    if (
      quantidade <= 0
    ) {

      continue;

    }


    const ranking =
      (
        Array.isArray(jogadores)
          ? jogadores
          : []
      )
        .filter(
          jogador =>
            normalizarPosicaoEscalacao(
              jogador
            ) === posicao
        )
        .sort(
          compararCandidatosTitularesEscalacao
        );


    let escolhidosPosicao = 0;


    for (
      const jogador
      of ranking
    ) {

      if (
        escolhidosPosicao >=
        quantidade
      ) {

        break;

      }


      const id =
        obterIdJogadorEscalacao(
          jogador
        );


      const jaUsado =
        titulares.some(
          titular => {

            const idTitular =
              obterIdJogadorEscalacao(
                titular
              );


            return (
              id &&
              idTitular &&
              id ===
              idTitular
            );

          }
        );


      if (jaUsado) {
        continue;
      }


      if (
        !podeAdicionarClubeEscalacao(
          jogador,
          titulares
        )
      ) {

        continue;

      }


      const preco =
        Math.max(
          0,
          numeroEscalacao(
            jogador?.preco
          )
        );


      const novoCusto =
        custoAtual +
        preco;


      if (
        possuiLimite &&
        novoCusto >
        limite +
        0.000001
      ) {

        continue;

      }


      if (possuiLimite) {

        const simulados = [
          ...titulares,
          jogador
        ];


        const reservaFutura =
          calcularReservaMinimaFuturaEscalacao(
            jogadores,
            formacao,
            simulados
          );


        if (
          reservaFutura ===
          null
        ) {

          continue;

        }


        if (
          novoCusto +
          reservaFutura >
          limite +
          0.000001
        ) {

          continue;

        }

      }


      titulares.push(
        jogador
      );


      custoAtual =
        novoCusto;


      escolhidosPosicao += 1;

    }


    if (
      escolhidosPosicao <
      quantidade
    ) {

      return [];

    }

  }


  const quantidadeEsperada =
    Object.values(
      estrutura
    )
      .reduce(
        (
          total,
          quantidade
        ) =>
          total +
          numeroEscalacao(
            quantidade
          ),
        0
      );


  if (
    titulares.length !==
    quantidadeEsperada
  ) {

    return [];

  }


  return titulares;

}


/* =========================================================
   MONTA UMA OPÇÃO DE FORMAÇÃO
   ========================================================= */


function montarOpcaoFormacaoEscalacao(
  jogadores,
  perfil,
  formacao,
  limitePatrimonio
) {

  const titularesMotor =
    MotorEscalacao.montar(
      jogadores,
      formacao,
      limitePatrimonio ??
        Infinity,
      perfil?.perfil
    );


  let listaTitulares =
    Array.isArray(
      titularesMotor
    )
      ? titularesMotor
      : [];


  let custoTitulares =
    somarCampoEscalacao(
      listaTitulares,
      jogador =>
        jogador?.preco
    );


  let saldoParaBanco =
    limitePatrimonio !== null
      ? Math.max(
          0,
          limitePatrimonio -
          custoTitulares
        )
      : null;


  let banco =
    montarBancoEscalacao(
      jogadores,
      listaTitulares,
      saldoParaBanco
    );


  let custoBanco =
    somarCampoEscalacao(
      banco,
      jogador =>
        jogador?.preco
    );


  let completa =
    listaTitulares.length ===
    12;


  let bancoCompleto =
    banco.length ===
    POSICOES_BANCO.length;


  let custoTotal =
    custoTitulares +
    custoBanco;


  let dentroDoOrcamento =
    limitePatrimonio ===
      null ||
    custoTotal <=
      limitePatrimonio +
      0.001;


  if (
    !completa ||
    !bancoCompleto ||
    !dentroDoOrcamento
  ) {

    const titularesProtegidos =
      montarTitularesProtegidosEscalacao(
        jogadores,
        formacao,
        limitePatrimonio
      );


    if (
      titularesProtegidos.length ===
      12
    ) {

      listaTitulares =
        titularesProtegidos;


      custoTitulares =
        somarCampoEscalacao(
          listaTitulares,
          jogador =>
            jogador?.preco
        );


      saldoParaBanco =
        limitePatrimonio !== null
          ? Math.max(
              0,
              limitePatrimonio -
              custoTitulares
            )
          : null;


      banco =
        montarBancoEscalacao(
          jogadores,
          listaTitulares,
          saldoParaBanco
        );


      custoBanco =
        somarCampoEscalacao(
          banco,
          jogador =>
            jogador?.preco
        );


      completa =
        listaTitulares.length ===
        12;


      bancoCompleto =
        banco.length ===
        POSICOES_BANCO.length;


      custoTotal =
        custoTitulares +
        custoBanco;


      dentroDoOrcamento =
        limitePatrimonio ===
          null ||
        custoTotal <=
          limitePatrimonio +
          0.001;

    }

  }


  return {

    formacao,

    jogadores:
      listaTitulares,

    completa,

    bancoCompleto,

    completaTotal:
      completa &&
      bancoCompleto &&
      dentroDoOrcamento,

    banco,

    custoBanco,

    custoTotal,

    nota:
      calcularNotaFormacaoEscalacao(
        listaTitulares
      ),

    projecao:
      somarCampoEscalacao(
        listaTitulares,
        obterProjecaoFinalEscalacao
      ),

    custo:
      custoTitulares,

    dentroDoOrcamento

  };

}


/* =========================================================
   ESCOLHE A MELHOR FORMAÇÃO COMPLETA
   ========================================================= */


function escolherMelhorFormacaoEscalacao(
  jogadores,
  perfil,
  limitePatrimonio
) {

  const opcoes =
    FORMACOES_CANDIDATAS_ESCALACAO
      .map(
        formacao =>
          montarOpcaoFormacaoEscalacao(
            jogadores,
            perfil,
            formacao,
            limitePatrimonio
          )
      );


  const completas =
    opcoes
      .filter(
        opcao =>
          opcao.completaTotal ===
          true
      )
      .sort(
        compararFormacoesEscalacao
      );


  if (
    completas.length > 0
  ) {

    return completas[0];

  }


  return {

    formacao:
      perfil?.formacao ??
      null,

    jogadores: [],

    completa: false,

    bancoCompleto: false,

    completaTotal: false,

    banco: [],

    custoBanco: 0,

    custoTotal: 0,

    nota: 0,

    projecao: 0,

    custo: 0,

    dentroDoOrcamento: false,

    patrimonioInsuficiente: true

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


    const jogadoresOriginais =
      obterJogadoresCarregados();


    const escalacoes = [];


    for (
      const perfil
      of perfis
    ) {

      /*
       * A viabilidade é aplicada ANTES
       * da montagem do time.
       */

      const jogadores =
        prepararJogadoresViabilidadeEscalacao(
          jogadoresOriginais,
          perfil
        );


      const limitePatrimonio =
        obterLimitePatrimonioEscalacao(
          perfil
        );


      const melhorFormacao =
        escolherMelhorFormacaoEscalacao(
          jogadores,
          perfil,
          limitePatrimonio
        );


      /*
       * Nunca publicar escalação parcial.
       */

      if (
        melhorFormacao.completaTotal !==
        true
      ) {

        const patrimonioTexto =
          limitePatrimonio !== null
            ? `C$ ${arredondarEscalacao(
                limitePatrimonio,
                2
              )
                .toFixed(2)
                .replace(
                  ".",
                  ","
                )}`
            : "o patrimônio disponível";


        throw new Error(
          `Não foi possível montar uma escalação completa ` +
          `e viável com ${patrimonioTexto}. ` +
          `Aumente o patrimônio ou aguarde novas informações ` +
          `de titularidade da rodada.`
        );

      }


      const titulares =
        melhorFormacao.jogadores;


      const listaTitulares =
        Array.isArray(
          titulares
        )
          ? titulares
          : [];


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


      const resumoViabilidade =
        calcularResumoViabilidadeEscalacao(
          listaTitulares
        );


      const custoTitulares =
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


      const banco =
        Array.isArray(
          melhorFormacao.banco
        )
          ? melhorFormacao.banco
          : [];


      const custoBanco =
        somarCampoEscalacao(
          banco,
          jogador =>
            jogador?.preco
        );


      const custoTotal =
        custoTitulares +
        custoBanco;


      if (
        limitePatrimonio !== null &&
        custoTotal >
          limitePatrimonio +
          0.001
      ) {

        throw new Error(
          "Erro interno: escalação ultrapassou o patrimônio."
        );

      }


      const capitao =
        escolherCapitaoEscalacao(
          listaTitulares
        );


      const reservaLuxo =
        escolherReservaLuxoEscalacao(
          banco
        );


      const escalacao = {

        ...perfil,


        formacaoOriginal:
          perfil.formacao,


        formacao:
          melhorFormacao.formacao,


        formacaoAutomatica:
          true,


        notaFormacao:
          arredondarEscalacao(
            melhorFormacao.nota
          ),


        jogadores:
          listaTitulares,


        limitePatrimonio:
          limitePatrimonio !== null
            ? arredondarEscalacao(
                limitePatrimonio
              )
            : null,


        patrimonioPersonalizado:
          obterPatrimonioSelecionadoEscalacoes()
            !== null,


        custo:
          arredondarEscalacao(
            custoTotal
          ),


        custoTitulares:
          arredondarEscalacao(
            custoTitulares
          ),


        custoBanco:
          arredondarEscalacao(
            custoBanco
          ),


        custoTotal:
          arredondarEscalacao(
            custoTotal
          ),


        saldo:
          limitePatrimonio !== null
            ? arredondarEscalacao(
                limitePatrimonio -
                custoTotal
              )
            : null,


        dentroDoOrcamento:
          limitePatrimonio === null ||
          custoTotal <=
            limitePatrimonio +
            0.001,


        bancoCompleto:
          banco.length ===
          POSICOES_BANCO.length,


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


        viabilidade:
          resumoViabilidade,


        titularidadeMedia:
          resumoViabilidade
            .titularidadeMedia,


        riscoEscalacaoMedio:
          resumoViabilidade
            .riscoEscalacaoMedio,


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
        gerarPontosPositivosEscalacao(
          escalacao
        );


      escalacao.pontosAtencao =
        gerarPontosAtencaoEscalacao(
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

  if (
    !escalacao ||
    typeof escalacao !==
      "object"
  ) {

    return false;

  }


  const jogadores =
    Array.isArray(
      escalacao.jogadores
    )
      ? escalacao.jogadores
      : [];


  const banco =
    Array.isArray(
      escalacao.banco
    )
      ? escalacao.banco
      : [];


  if (
    jogadores.length !== 12
  ) {

    return false;

  }


  if (
    banco.length !==
    POSICOES_BANCO.length
  ) {

    return false;

  }


  if (
    escalacao.dentroDoOrcamento ===
    false
  ) {

    return false;

  }


  return true;

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


  const mensagemSegura =
    typeof escaparHtml ===
      "function"
      ? escaparHtml(
          mensagem
        )
      : String(
          mensagem ?? ""
        );


  container.innerHTML = `
    <div class="empty-state">
      <strong>
        Erro ao carregar escalações
      </strong>

      <p>
        ${mensagemSegura}
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


function escalacoesCarregando() {

  return estadoEscalacoes
    .carregando;

}


function obterErroEscalacoes() {

  return estadoEscalacoes
    .erro;

}


/* =========================================================
   CONSULTAS DE PATRIMÔNIO
   ========================================================= */


function obterPatrimonioAtualEscalacoes() {

  return obterPatrimonioSelecionadoEscalacoes();

}


function patrimonioPersonalizadoEscalacoes() {

  return (
    obterPatrimonioSelecionadoEscalacoes()
    !== null
  );

}


/* =========================================================
   CONSULTAS DE VIABILIDADE
   ========================================================= */


function obterResumoViabilidadeTime(
  idEscalacao
) {

  const escalacao =
    obterEscalacaoPorId(
      idEscalacao
    );


  if (!escalacao) {
    return null;
  }


  return (
    escalacao.viabilidade ??
    null
  );

}


function obterJogadoresComAlertaViabilidade(
  idEscalacao
) {

  const escalacao =
    obterEscalacaoPorId(
      idEscalacao
    );


  if (!escalacao) {
    return [];
  }


  const titulares =
    Array.isArray(
      escalacao.jogadores
    )
      ? escalacao.jogadores
      : [];


  return titulares.filter(
    jogador => {

      const viabilidade =
        jogador?.viabilidade;


      if (
        !viabilidade ||
        typeof viabilidade !==
          "object"
      ) {

        return false;

      }


      return (
        numeroEscalacao(
          viabilidade.riscoEscalacao
        ) >= 40 ||

        numeroEscalacao(
          viabilidade.titularidade,
          100
        ) < 60 ||

        [
          "BAIXA",
          "EVITAR",
          "BLOQUEADO"
        ].includes(
          viabilidade.classificacao
        )
      );

    }
  );

}


/* =========================================================
   DIAGNÓSTICO DA ESCALAÇÃO

   Útil para validar no console se o novo motor realmente
   está participando da montagem dos times.
   ========================================================= */


function diagnosticarEscalacao(
  idEscalacao
) {

  const escalacao =
    obterEscalacaoPorId(
      idEscalacao
    );


  if (!escalacao) {

    console.warn(
      "Escalação não encontrada:",
      idEscalacao
    );


    return null;

  }


  const titulares =
    Array.isArray(
      escalacao.jogadores
    )
      ? escalacao.jogadores
      : [];


  const diagnostico = {

    id:
      escalacao.id,


    perfil:
      escalacao.perfil ??
      escalacao.nome,


    formacao:
      escalacao.formacao,


    patrimonio:
      escalacao.limitePatrimonio,


    custoTotal:
      escalacao.custoTotal,


    saldo:
      escalacao.saldo,


    projecao:
      escalacao.projecao,


    titularidadeMedia:
      escalacao.titularidadeMedia,


    riscoEscalacaoMedio:
      escalacao.riscoEscalacaoMedio,


    jogadores:
      titulares.map(
        jogador => {

          return {

            id:
              jogador.id,


            nome:
              jogador.apelido ??
              jogador.nome,


            posicao:
              normalizarPosicaoEscalacao(
                jogador
              ),


            clube:
              jogador.siglaClube ??
              jogador.clube,


            preco:
              jogador.preco,


            projecao:
              obterProjecaoFinalEscalacao(
                jogador
              ),


            scoreEstatistico:
              jogador.scoreEstatistico ??
              jogador.score,


            scoreAjustado:
              jogador.score,


            titularidade:
              jogador.viabilidade
                ?.titularidade ??
              jogador.titularidade,


            riscoEscalacao:
              jogador.viabilidade
                ?.riscoEscalacao ??
              jogador.riscoEscalacao,


            classificacao:
              jogador.viabilidade
                ?.classificacao ??
              jogador.classificacaoViabilidade,


            elegivel:
              jogador.viabilidade
                ?.elegivel ??
              jogador.elegivelRodada,


            justificativa:
              jogador.viabilidade
                ?.justificativa ??
              jogador.justificativaViabilidade

          };

        }
      )

  };


  console.table(
    diagnostico.jogadores
  );


  console.log(
    "Diagnóstico da escalação:",
    diagnostico
  );


  return diagnostico;

}


/* =========================================================
   DIAGNÓSTICO DE TODAS AS ESCALAÇÕES
   ========================================================= */


function diagnosticarTodasEscalacoes() {

  const escalacoes =
    obterEscalacoesCarregadas();


  return escalacoes.map(
    escalacao =>
      diagnosticarEscalacao(
        escalacao.id
      )
  );

}


/* =========================================================
   EXPOSIÇÃO OPCIONAL PARA DEPURAÇÃO
   ========================================================= */


if (
  typeof window !==
  "undefined"
) {

  window.CartolaEscalacoes = {

    carregar:
      carregarEscalacoes,


    obterTodas:
      obterEscalacoesCarregadas,


    obterPorId:
      obterEscalacaoPorId,


    definirPatrimonio:
      definirPatrimonioEscalacoes,


    restaurarPatrimonio:
      restaurarPatrimonioPadraoEscalacoes,


    obterPatrimonio:
      obterPatrimonioAtualEscalacoes,


    obterResumoViabilidade:
      obterResumoViabilidadeTime,


    obterAlertasViabilidade:
      obterJogadoresComAlertaViabilidade,


    diagnosticar:
      diagnosticarEscalacao,


    diagnosticarTodas:
      diagnosticarTodasEscalacoes

  };

}

