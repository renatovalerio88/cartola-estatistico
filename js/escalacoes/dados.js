/* =========================================================
   CARTOLA ESTATÍSTICO
   Escalações — carregamento e montagem dos times sugeridos
   =========================================================

   Responsabilidades:

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
   - comparar formações sem preferência artificial;
   - selecionar capitão;
   - montar banco dentro do saldo disponível;
   - consolidar custo total de titulares + banco;
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


const FORMACOES_CANDIDATAS_ESCALACAO = [
  "4-4-2",
  "3-4-3",
  "4-3-3"
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


              if (candidatoMelhor) {

                proximos.set(
                  novoCusto,
                  candidato
                );

              }

            }
          );

        }
      );


      estados = proximos;

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
    (a, b) => {

      if (
        Math.abs(
          b.nota -
          a.nota
        ) > 0.000001
      ) {

        return b.nota - a.nota;

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


  return solucoes[0]
    .jogadores;

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


  const formacao =
    escalacao.formacao ??
    perfil?.formacao ??
    "--";


  if (
    nomePerfil.includes(
      "conserv"
    )
  ) {

    return (
      `Escalação ${formacao} escolhida automaticamente pelo motor, ` +
      `voltada à segurança, priorizando regularidade, confiança ` +
      `e proteção contra risco. Projeção total de ${projecao} pontos, ` +
      `piso de ${piso} e confiança média de ${confianca}%.`
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
      `pontos e teto histórico agregado de ${teto}.`
    );

  }


  return (
    `Escalação ${formacao} escolhida automaticamente pelo motor, ` +
    `equilibrando projeção, segurança, teto e confiança. ` +
    `O objetivo é buscar boa pontuação sem elevar excessivamente ` +
    `o risco. Projeção total de ${projecao} pontos.`
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

  /*
   * Primeiro, priorizamos a escalação completa no Cartola:
   * 12 titulares + 5 reservas dentro do patrimônio.
   */

  if (
    opcaoA.completaTotal !==
    opcaoB.completaTotal
  ) {

    return opcaoB.completaTotal
      ? 1
      : -1;

  }


  /*
   * Depois, uma escalação com os 12 titulares completos
   * vence uma escalação incompleta.
   */

  if (
    opcaoA.completa !==
    opcaoB.completa
  ) {

    return opcaoB.completa
      ? 1
      : -1;

  }


  /*
   * Critério principal:
   * soma do score calculado pelo motor.
   *
   * Como o score já reflete o perfil
   * Conservador / Equilibrado / Agressivo,
   * não é necessário criar bônus artificial
   * para nenhuma formação.
   */

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


  /*
   * Primeiro desempate:
   * maior projeção total.
   */

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


  /*
   * Segundo desempate:
   * menor custo total, incluindo banco.
   */

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


  /*
   * Empate absoluto:
   * mantém apenas uma ordem determinística.
   *
   * Isso NÃO representa bônus estatístico.
   */

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


function escolherMelhorFormacaoEscalacao(
  jogadores,
  perfil,
  limitePatrimonio
) {

  const opcoes =
    FORMACOES_CANDIDATAS_ESCALACAO
      .map(
        formacao => {

          const titulares =
            MotorEscalacao.montar(
              jogadores,
              formacao,
              limitePatrimonio ??
                Infinity,
              perfil?.perfil
            );


          const listaTitulares =
            Array.isArray(
              titulares
            )
              ? titulares
              : [];


          const custoTitulares =
            somarCampoEscalacao(
              listaTitulares,
              jogador =>
                jogador?.preco
            );


          const saldoParaBanco =
            limitePatrimonio !== null
              ? Math.max(
                  0,
                  limitePatrimonio -
                  custoTitulares
                )
              : null;


          const banco =
            montarBancoEscalacao(
              jogadores,
              listaTitulares,
              saldoParaBanco
            );


          const custoBanco =
            somarCampoEscalacao(
              banco,
              jogador =>
                jogador?.preco
            );


          return {

            formacao,

            jogadores:
              listaTitulares,

            completa:
              listaTitulares.length === 12,

            bancoCompleto:
              banco.length ===
              POSICOES_BANCO.length,

            completaTotal:
              listaTitulares.length === 12 &&
              banco.length ===
                POSICOES_BANCO.length,

            banco,

            custoBanco,

            custoTotal:
              custoTitulares +
              custoBanco,

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
              custoTitulares

          };

        }
      )
      .sort(
        compararFormacoesEscalacao
      );


  return (
    opcoes[0] ?? {

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

      custo: 0

    }
  );

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
         TITULARES + ESCOLHA DA FORMAÇÃO
         =================================================== */

      const melhorFormacao =
        escolherMelhorFormacaoEscalacao(
          jogadores,
          perfil,
          limitePatrimonio
        );


      const titulares =
        melhorFormacao.jogadores;


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


      /* ===================================================
         BANCO
         =================================================== */

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


        /*
         * A formação original continua registrada
         * para auditoria.
         */

        formacaoOriginal:
          perfil.formacao,


        /*
         * formacao passa a representar a formação
         * realmente escolhida pelo motor.
         */

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


        /*
         * Mantemos "custo" para compatibilidade com
         * os cards atuais. A partir daqui ele representa
         * o custo completo: titulares + banco.
         */

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
