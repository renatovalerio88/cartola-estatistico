/* =========================================================
   CARTOLA ESTATÍSTICO
   Calculadora integrada do modelo estatístico
   ========================================================= */

const CalculadoraEstatistica = (() => {

  const POSICOES_VALIDAS = [
    "GOL",
    "LAT",
    "ZAG",
    "MEI",
    "ATA",
    "TEC"
  ];


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function numero(valor, padrao = 0) {
    const convertido = Number(valor);

    return Number.isFinite(convertido)
      ? convertido
      : padrao;
  }


  function limitar(
    valor,
    minimo = 0,
    maximo = 100
  ) {
    return Math.min(
      maximo,
      Math.max(
        minimo,
        numero(valor)
      )
    );
  }


  function arredondar(
    valor,
    casas = 2
  ) {
    return Number(
      numero(valor).toFixed(casas)
    );
  }


  function obterHistoricoRegistros(
    jogador
  ) {
    if (
      Array.isArray(jogador?.historico)
    ) {
      return jogador.historico
        .filter(
          registro =>
            registro &&
            typeof registro === "object"
        )
        .sort(
          (registroA, registroB) =>
            numero(registroA.rodada) -
            numero(registroB.rodada)
        );
    }

    return [];
  }


  function obterHistoricoPontuacoes(
    jogador
  ) {
    const historicoDireto =
      jogador?.historicoPontuacoes ||
      jogador?.pontuacoes ||
      jogador?.pontuacoesRecentes;

    if (
      Array.isArray(historicoDireto) &&
      historicoDireto.length
    ) {
      return historicoDireto
        .map(Number)
        .filter(Number.isFinite);
    }

    return obterHistoricoRegistros(
      jogador
    )
      .map(
        registro =>
          Number(registro.pontuacao ?? registro.pontos)
      )
      .filter(Number.isFinite);
  }


  function media(valores) {
    if (
      !Array.isArray(valores) ||
      valores.length === 0
    ) {
      return 0;
    }

    return valores.reduce(
      (total, valor) =>
        total + numero(valor),
      0
    ) / valores.length;
  }


  function mediana(valores) {
    if (
      !Array.isArray(valores) ||
      valores.length === 0
    ) {
      return 0;
    }

    const ordenados = valores
      .map(Number)
      .filter(Number.isFinite)
      .sort(
        (valorA, valorB) =>
          valorA - valorB
      );

    if (!ordenados.length) {
      return 0;
    }

    const meio =
      Math.floor(
        ordenados.length / 2
      );

    if (
      ordenados.length % 2 === 0
    ) {
      return (
        ordenados[meio - 1] +
        ordenados[meio]
      ) / 2;
    }

    return ordenados[meio];
  }


  function desvioPadrao(valores) {
    if (
      !Array.isArray(valores) ||
      valores.length === 0
    ) {
      return 0;
    }

    const valorMedio =
      media(valores);

    const variancia =
      valores.reduce(
        (total, valor) =>
          total +
          (
            numero(valor) -
            valorMedio
          ) ** 2,
        0
      ) / valores.length;

    return Math.sqrt(
      variancia
    );
  }


  function normalizar(
    valor,
    minimo,
    maximo
  ) {
    const limiteMinimo =
      numero(minimo);

    const limiteMaximo =
      numero(maximo);

    if (
      limiteMaximo ===
      limiteMinimo
    ) {
      return 50;
    }

    return limitar(
      (
        (
          numero(valor) -
          limiteMinimo
        ) /
        (
          limiteMaximo -
          limiteMinimo
        )
      ) * 100
    );
  }


  /* =======================================================
     MÉTRICAS HISTÓRICAS
     ======================================================= */

  function calcularFormaRecente(
    historico
  ) {
    if (!historico.length) {
      return 50;
    }

    const ultimosCinco =
      historico.slice(-5);

    const pesosRecentes =
      [1, 1.15, 1.3, 1.5, 1.75]
        .slice(
          -ultimosCinco.length
        );

    const somaPesos =
      pesosRecentes.reduce(
        (total, peso) =>
          total + peso,
        0
      );

    const mediaPonderada =
      ultimosCinco.reduce(
        (total, pontuacao, indice) =>
          total +
          numero(pontuacao) *
          pesosRecentes[indice],
        0
      ) / somaPesos;

    return normalizar(
      mediaPonderada,
      -2,
      15
    );
  }


  function calcularMediaGeral(
    historico
  ) {
    if (!historico.length) {
      return 50;
    }

    return normalizar(
      media(historico),
      -2,
      15
    );
  }


  function calcularNotaMediana(
    historico
  ) {
    if (!historico.length) {
      return 50;
    }

    return normalizar(
      mediana(historico),
      -2,
      15
    );
  }


  function calcularRegularidade(
    historico
  ) {
    if (!historico.length) {
      return 50;
    }

    const valorMedio =
      Math.abs(
        media(historico)
      );

    const desvio =
      desvioPadrao(historico);

    if (valorMedio === 0) {
      return desvio === 0
        ? 100
        : 0;
    }

    const coeficienteVariacao =
      desvio /
      valorMedio;

    return limitar(
      100 -
      coeficienteVariacao * 70
    );
  }


  function calcularTendenciaRecente(
    historico
  ) {
    if (historico.length < 2) {
      return 50;
    }

    const recentes =
      historico.slice(-6);

    const tamanhoMetade =
      Math.max(
        1,
        Math.floor(
          recentes.length / 2
        )
      );

    const inicio =
      recentes.slice(
        0,
        tamanhoMetade
      );

    const fim =
      recentes.slice(
        -tamanhoMetade
      );

    const diferenca =
      media(fim) -
      media(inicio);

    return limitar(
      50 +
      diferenca * 8
    );
  }


  function calcularProtecaoNegativacao(
    historico
  ) {
    if (!historico.length) {
      return 50;
    }

    const negativas =
      historico.filter(
        pontuacao =>
          pontuacao < 0
      ).length;

    return limitar(
      100 -
      (
        negativas /
        historico.length
      ) * 100
    );
  }


  /* =======================================================
     SCOUTS E CONTEXTO DA RODADA
     ======================================================= */

  function calcularPontuacaoBasica(
    jogador
  ) {
    const scouts =
      jogador?.scouts || {};

    const posicao =
      String(
        jogador?.posicao || ""
      ).toUpperCase();

    let valor = 0;

    if (posicao === "GOL") {
      valor =
        numero(
          scouts.defesas ??
          scouts.DE
        ) * 1.3 +
        numero(
          scouts.defesasDificeis ??
          scouts.DD
        ) * 2;
    }

    if (posicao === "LAT") {
      valor =
        numero(
          scouts.desarmes ??
          scouts.DS
        ) * 1.4 +
        numero(
          scouts.cruzamentos
        ) * 0.35 +
        numero(
          scouts.faltasSofridas ??
          scouts.FS
        ) * 0.5;
    }

    if (posicao === "ZAG") {
      valor =
        numero(
          scouts.desarmes ??
          scouts.DS
        ) * 1.5 +
        numero(
          scouts.cortes
        ) * 0.25;
    }

    if (posicao === "MEI") {
      valor =
        numero(
          scouts.desarmes ??
          scouts.DS
        ) * 1.2 +
        numero(
          scouts.finalizacoes
        ) * 0.5 +
        numero(
          scouts.faltasSofridas ??
          scouts.FS
        ) * 0.5;
    }

    if (posicao === "ATA") {
      valor =
        numero(
          scouts.finalizacoes
        ) * 0.7 +
        numero(
          scouts.finalizacoesNoAlvo ??
          scouts.FD
        ) +
        numero(
          scouts.faltasSofridas ??
          scouts.FS
        ) * 0.5;
    }

    if (posicao === "TEC") {
      valor =
        numero(
          scouts.favoritismo
        ) / 10;
    }

    return normalizar(
      valor,
      0,
      12
    );
  }


  function calcularScoutsOfensivos(
    jogador
  ) {
    const scouts =
      jogador?.scouts || {};

    const valor =
      numero(
        scouts.gols ??
        scouts.G
      ) * 8 +
      numero(
        scouts.assistencias ??
        scouts.A
      ) * 5 +
      numero(
        scouts.finalizacoes
      ) * 0.7 +
      numero(
        scouts.finalizacoesNoAlvo ??
        scouts.FD
      ) * 1.2 +
      numero(
        scouts.forcaAtaque
      ) / 12;

    return normalizar(
      valor,
      0,
      12
    );
  }


  function calcularScoutsDefensivos(
    jogador
  ) {
    const scouts =
      jogador?.scouts || {};

    const valor =
      numero(
        scouts.desarmes ??
        scouts.DS
      ) * 1.5 +
      numero(
        scouts.cortes
      ) * 0.3 +
      numero(
        scouts.defesas ??
        scouts.DE
      ) * 1.3 +
      numero(
        scouts.defesasDificeis ??
        scouts.DD
      ) * 2 +
      numero(
        scouts.forcaDefesa
      ) / 12;

    return normalizar(
      valor,
      0,
      12
    );
  }


  function calcularCasaFora(
    jogador
  ) {
    const mando =
      String(
        jogador?.mando || ""
      ).toLowerCase();

    if (
      mando === "casa" ||
      mando === "mandante"
    ) {
      return 70;
    }

    if (
      mando === "fora" ||
      mando === "visitante"
    ) {
      return 45;
    }

    return 50;
  }


  function calcularForcaAdversario(
    jogador
  ) {
    const notaInformada =
      Number(
        jogador
          ?.notaForcaAdversario
      );

    if (
      Number.isFinite(
        notaInformada
      )
    ) {
      return limitar(
        notaInformada
      );
    }

    const componentes =
      jogador?.componentes || {};

    return limitar(
      componentes.forcaAdversario ??
      componentes.Confronto ??
      componentes.confronto ??
      jogador?.notaConfronto ??
      50
    );
  }


  function calcularPontosCedidos(
    jogador
  ) {
    const notaInformada =
      Number(
        jogador
          ?.pontosCedidosNota ??
        jogador
          ?.notaPontosCedidos
      );

    if (
      Number.isFinite(
        notaInformada
      )
    ) {
      return limitar(
        notaInformada
      );
    }

    return 50;
  }


  function calcularChanceSG(
    jogador
  ) {
    return limitar(
      jogador?.chanceSG ?? 50
    );
  }


  function calcularTitularidade(
    jogador
  ) {
    if (
      jogador?.statusId === 7
    ) {
      return 95;
    }

    return limitar(
      jogador?.titularidade ??
      50
    );
  }


  function calcularMinutosEsperados(
    jogador
  ) {
    const minutos =
      numero(
        jogador
          ?.minutosEsperados,
        jogador?.statusId === 7
          ? 85
          : 45
      );

    return limitar(
      minutos /
      90 *
      100
    );
  }


  function calcularBolaParada(
    jogador
  ) {
    return jogador?.cobraBolaParada
      ? 100
      : 0;
  }


  function calcularPenaltis(
    jogador
  ) {
    return jogador?.cobraPenalti
      ? 100
      : 0;
  }


  function calcularCustoBeneficio(
    jogador,
    mediaHistorica
  ) {
    const preco =
      numero(
        jogador?.preco
      );

    if (preco <= 0) {
      return 0;
    }

    return normalizar(
      numero(mediaHistorica) /
      preco,
      0,
      1.5
    );
  }


  /* =======================================================
     CÁLCULO DOS 18 CRITÉRIOS
     ======================================================= */

  function calcularNotasJogador(
    jogador
  ) {
    const posicao =
      String(
        jogador?.posicao || ""
      )
        .toUpperCase()
        .trim();

    if (
      !POSICOES_VALIDAS.includes(
        posicao
      )
    ) {
      return {
        erro:
          "Posição inválida.",
        posicao,
        notas: {},
        historicoPontuacoes: []
      };
    }

    const historicoPontuacoes =
      obterHistoricoPontuacoes(
        jogador
      );

    const mediaHistorica =
      media(
        historicoPontuacoes
      );

    return {
      erro: null,

      posicao,

      historicoPontuacoes,

      mediaHistorica,

      notas: {
        formaRecente:
          calcularFormaRecente(
            historicoPontuacoes
          ),

        mediaGeral:
          calcularMediaGeral(
            historicoPontuacoes
          ),

        mediana:
          calcularNotaMediana(
            historicoPontuacoes
          ),

        regularidade:
          calcularRegularidade(
            historicoPontuacoes
          ),

        pontuacaoBasica:
          calcularPontuacaoBasica(
            jogador
          ),

        scoutsOfensivos:
          calcularScoutsOfensivos(
            jogador
          ),

        scoutsDefensivos:
          calcularScoutsDefensivos(
            jogador
          ),

        casaFora:
          calcularCasaFora(
            jogador
          ),

        forcaAdversario:
          calcularForcaAdversario(
            jogador
          ),

        pontosCedidos:
          calcularPontosCedidos(
            jogador
          ),

        chanceSG:
          calcularChanceSG(
            jogador
          ),

        titularidade:
          calcularTitularidade(
            jogador
          ),

        minutosEsperados:
          calcularMinutosEsperados(
            jogador
          ),

        bolaParada:
          calcularBolaParada(
            jogador
          ),

        penaltis:
          calcularPenaltis(
            jogador
          ),

        custoBeneficio:
          calcularCustoBeneficio(
            jogador,
            mediaHistorica
          ),

        tendenciaRecente:
          calcularTendenciaRecente(
            historicoPontuacoes
          ),

        riscoNegativar:
          calcularProtecaoNegativacao(
            historicoPontuacoes
          )
      }
    };
  }


  /* =======================================================
     INTEGRAÇÃO DOS MOTORES
     ======================================================= */

  function analisarJogador(
    jogador
  ) {
    const calculo =
      calcularNotasJogador(
        jogador
      );

    if (calculo.erro) {
      return {
        ...jogador,
        erroCalculadora:
          calculo.erro
      };
    }

    if (
      typeof executarMotorEstatistico !==
      "function"
    ) {
      return {
        ...jogador,

        notasCriterios:
          calculo.notas,

        erroCalculadora:
          "Motor estatístico não carregado."
      };
    }

    const resultadoMotor =
      executarMotorEstatistico({
        jogadorId:
          jogador.id,

        posicao:
          calculo.posicao,

        notas:
          calculo.notas
      });

    const historico =
      obterHistoricoRegistros(
        jogador
      );

    const jogadorCompleto = {
      ...jogador,

      historico,

      historicoPontuacoes:
        calculo.historicoPontuacoes,

      ...calculo.notas
    };


    /* SCORE */

    const score =
      typeof MotorScore !==
        "undefined"
        ? MotorScore.calcular(
            jogadorCompleto
          )
        : resultadoMotor.notaFinal;

    jogadorCompleto.score =
      arredondar(score);


    /* FORMA */

    const formaMedia =
      typeof MotorForma !==
        "undefined"
        ? MotorForma.mediaRecente(
            calculo.historicoPontuacoes
          )
        : calculo.mediaHistorica;

    const tendenciaForma =
      typeof MotorForma !==
        "undefined"
        ? MotorForma.tendencia(
            calculo.historicoPontuacoes
          )
        : 0;

    const fase =
      typeof MotorForma !==
        "undefined"
        ? MotorForma.fase(
            historico
          )
        : "Sem histórico";

    jogadorCompleto.mediaRecente =
      arredondar(
        formaMedia
      );

    jogadorCompleto.tendencia =
      arredondar(
        tendenciaForma
      );

    jogadorCompleto.fase =
      fase;


    /* REGULARIDADE */

    const regularidadeHistorica =
      typeof MotorRegularidade !==
        "undefined"
        ? MotorRegularidade.calcular(
            calculo.historicoPontuacoes
          )
        : {
            media:
              calculo.mediaHistorica,

            desvio:
              desvioPadrao(
                calculo
                  .historicoPontuacoes
              ),

            regularidade:
              calculo
                .notas
                .regularidade
          };

    jogadorCompleto.mediaGeral =
      arredondar(
        regularidadeHistorica.media
      );

    jogadorCompleto.desvioPadrao =
      arredondar(
        regularidadeHistorica.desvio
      );

    jogadorCompleto.regularidade =
      arredondar(
        regularidadeHistorica
          .regularidade,
        1
      );


    /* PISO E TETO */

    const pisoTeto =
      typeof MotorPisoTeto !==
        "undefined"
        ? MotorPisoTeto.calcular(
            calculo.historicoPontuacoes
          )
        : {
            piso:
              calculo.historicoPontuacoes
                .length
                ? Math.min(
                    ...calculo
                      .historicoPontuacoes
                  )
                : 0,

            teto:
              calculo.historicoPontuacoes
                .length
                ? Math.max(
                    ...calculo
                      .historicoPontuacoes
                  )
                : 0
          };

    jogadorCompleto.piso =
      arredondar(
        pisoTeto.piso
      );

    jogadorCompleto.teto =
      arredondar(
        pisoTeto.teto
      );


    /* RISCO */

    jogadorCompleto.riscoNegativar =
      arredondar(
        100 -
        calculo.notas
          .riscoNegativar,
        1
      );

    jogadorCompleto.risco =
      typeof MotorRisco !==
        "undefined"
        ? MotorRisco.calcular(
            jogadorCompleto
          )
        : jogadorCompleto
            .riscoNegativar;

    jogadorCompleto.risco =
      arredondar(
        jogadorCompleto.risco,
        1
      );

    jogadorCompleto.riscoTexto =
      typeof MotorRisco !==
        "undefined"
        ? MotorRisco.nivel(
            jogadorCompleto.risco
          )
        : "Não calculado";


    /* CONFIANÇA */

    jogadorCompleto.confianca =
      typeof MotorConfianca !==
        "undefined"
        ? MotorConfianca.calcular(
            jogadorCompleto
          )
        : 50;

    jogadorCompleto.confianca =
      arredondar(
        jogadorCompleto.confianca,
        1
      );

    jogadorCompleto
      .confiancaNumerica =
        jogadorCompleto.confianca;


    /* PROJEÇÃO */

    if (
      typeof MotorProjecao !==
      "undefined"
    ) {
      const dadosProjecao = {
          ...jogadorCompleto,
      
          score: jogadorCompleto.score,
      
          media3:
              jogadorCompleto.mediaRecente,
      
          media5:
              jogadorCompleto.mediaRecente
      };
      
      const resultadoProjecao =
          MotorProjecao.calcular(
              dadosProjecao
          );
      
      if (
          resultadoProjecao &&
          typeof resultadoProjecao === "object"
      ) {
      
          Object.assign(
              jogadorCompleto,
              resultadoProjecao
          );
      
      } else {
      
          jogadorCompleto.projecao =
              Number(resultadoProjecao) || 0;
      
      }
    } else {
      jogadorCompleto.projecao =
        arredondar(
          calculo.mediaHistorica
        );
    }

    jogadorCompleto.projecao =
      arredondar(
        jogadorCompleto.projecao
      );

     /* PROBABILIDADES */

      if (
        typeof MotorProbabilidade !==
        "undefined"
      ) {
      
        const probabilidades =
          MotorProbabilidade.calcular(
            historico
          );
      
        jogadorCompleto.chance5 =
          probabilidades.chance5;
      
        jogadorCompleto.chance10 =
          probabilidades.chance10;
      
        jogadorCompleto.chance15 =
          probabilidades.chance15;
      
        jogadorCompleto.chanceNegativar =
          probabilidades.chanceNegativar;
      
      }


    /* CUSTO-BENEFÍCIO FINAL */

    const preco =
      numero(
        jogadorCompleto.preco
      );

    jogadorCompleto
      .custoBeneficio =
        preco > 0
          ? arredondar(
              jogadorCompleto
                .projecao /
              preco,
              2
            )
          : 0;


    return {
      ...jogadorCompleto,

      notasCriterios:
        calculo.notas,

      notaCalculada:
        resultadoMotor.notaFinal,

      notaFinal:
        resultadoMotor.notaFinal,

      notaModelo:
        resultadoMotor.notaFinal,

      classificacaoCalculada:
        resultadoMotor.classificacao,

      contribuicoesCalculadas:
        resultadoMotor.contribuicoes,

      pesosAplicados:
        resultadoMotor.pesosAplicados,

      explicacaoCalculada:
        resultadoMotor.explicacao,

      calculadoPeloMotor: true,

      erroCalculadora:
        resultadoMotor.erro
    };
  }


  function analisarListaJogadores(
    jogadores
  ) {
    if (
      !Array.isArray(jogadores)
    ) {
      return [];
    }

    return jogadores.map(
      analisarJogador
    );
  }


  return {
    calcularNotasJogador,
    analisarJogador,
    analisarListaJogadores
  };

})();
