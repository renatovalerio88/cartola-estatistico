/* =========================================================
   CARTOLA ESTATÍSTICO
   Calculadora dos 18 critérios estatísticos
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


  function numero(valor, padrao = 0) {
    const convertido = Number(valor);

    return Number.isFinite(convertido)
      ? convertido
      : padrao;
  }


  function limitar(valor, minimo = 0, maximo = 100) {
    return Math.min(
      maximo,
      Math.max(minimo, numero(valor))
    );
  }


  function prepararHistorico(valores) {
    if (!Array.isArray(valores)) {
      return [];
    }

    return valores
      .map(Number)
      .filter(Number.isFinite);
  }


  function media(valores) {
    const lista = prepararHistorico(valores);

    if (!lista.length) {
      return 0;
    }

    return lista.reduce(
      (total, valor) => total + valor,
      0
    ) / lista.length;
  }


  function mediana(valores) {
    const lista = prepararHistorico(valores)
      .sort((a, b) => a - b);

    if (!lista.length) {
      return 0;
    }

    const meio = Math.floor(lista.length / 2);

    if (lista.length % 2 === 0) {
      return (
        lista[meio - 1] +
        lista[meio]
      ) / 2;
    }

    return lista[meio];
  }


  function desvioPadrao(valores) {
    const lista = prepararHistorico(valores);

    if (!lista.length) {
      return 0;
    }

    const valorMedio = media(lista);

    const variancia = lista.reduce(
      (total, valor) =>
        total + ((valor - valorMedio) ** 2),
      0
    ) / lista.length;

    return Math.sqrt(variancia);
  }


  function normalizar(valor, minimo, maximo) {
    const numeroValor = numero(valor);
    const numeroMinimo = numero(minimo);
    const numeroMaximo = numero(maximo);

    if (numeroMaximo === numeroMinimo) {
      return 50;
    }

    return limitar(
      (
        (numeroValor - numeroMinimo) /
        (numeroMaximo - numeroMinimo)
      ) * 100
    );
  }


  function calcularFormaRecente(historico) {
    const lista = prepararHistorico(historico);

    if (!lista.length) {
      return 50;
    }

    const ultimasCinco = lista.slice(-5);
    const mediaRecente = media(ultimasCinco);

    return normalizar(
      mediaRecente,
      -2,
      15
    );
  }


  function calcularMediaGeral(historico) {
    return normalizar(
      media(historico),
      -2,
      15
    );
  }


  function calcularNotaMediana(historico) {
    return normalizar(
      mediana(historico),
      -2,
      15
    );
  }


  function calcularRegularidade(historico) {
    const lista = prepararHistorico(historico);

    if (!lista.length) {
      return 50;
    }

    const valorMedio = Math.abs(media(lista));
    const desvio = desvioPadrao(lista);

    if (valorMedio === 0) {
      return desvio === 0
        ? 100
        : 0;
    }

    const coeficienteVariacao =
      desvio / valorMedio;

    return limitar(
      100 -
      (coeficienteVariacao * 70)
    );
  }


  function calcularTendenciaRecente(historico) {
    const lista = prepararHistorico(historico);

    if (lista.length < 2) {
      return 50;
    }

    const tamanho = Math.max(
      1,
      Math.floor(lista.length / 2)
    );

    const inicio = lista.slice(0, tamanho);
    const fim = lista.slice(-tamanho);

    const diferenca =
      media(fim) -
      media(inicio);

    return limitar(
      50 + (diferenca * 8)
    );
  }


  function calcularProtecaoNegativacao(historico) {
    const lista = prepararHistorico(historico);

    if (!lista.length) {
      return 50;
    }

    const negativas = lista.filter(
      valor => valor < 0
    ).length;

    const percentualNegativo =
      negativas / lista.length;

    return limitar(
      100 -
      (percentualNegativo * 100)
    );
  }


  function calcularPontuacaoBasica(jogador) {
    const scouts = jogador?.scouts || {};
    const posicao = String(
      jogador?.posicao || ""
    ).toUpperCase();

    let valor = 0;

    if (posicao === "GOL") {
      valor =
        numero(scouts.defesas) * 1.3 +
        numero(scouts.defesasDificeis) * 2;
    }

    if (posicao === "LAT") {
      valor =
        numero(scouts.desarmes) * 1.4 +
        numero(scouts.cruzamentos) * 0.35 +
        numero(scouts.faltasSofridas) * 0.5;
    }

    if (posicao === "ZAG") {
      valor =
        numero(scouts.desarmes) * 1.5 +
        numero(scouts.cortes) * 0.25;
    }

    if (posicao === "MEI") {
      valor =
        numero(scouts.desarmes) * 1.2 +
        numero(scouts.finalizacoes) * 0.5 +
        numero(scouts.faltasSofridas) * 0.5;
    }

    if (posicao === "ATA") {
      valor =
        numero(scouts.finalizacoes) * 0.7 +
        numero(scouts.finalizacoesNoAlvo) * 1 +
        numero(scouts.faltasSofridas) * 0.5;
    }

    if (posicao === "TEC") {
      valor =
        numero(scouts.favoritismo) / 10;
    }

    return normalizar(
      valor,
      0,
      12
    );
  }


  function calcularScoutsOfensivos(jogador) {
    const scouts = jogador?.scouts || {};

    const valor =
      numero(scouts.gols) * 8 +
      numero(scouts.assistencias) * 5 +
      numero(scouts.finalizacoes) * 0.7 +
      numero(scouts.finalizacoesNoAlvo) * 1.2 +
      numero(scouts.forcaAtaque) / 12;

    return normalizar(
      valor,
      0,
      12
    );
  }


  function calcularScoutsDefensivos(jogador) {
    const scouts = jogador?.scouts || {};

    const valor =
      numero(scouts.desarmes) * 1.5 +
      numero(scouts.cortes) * 0.3 +
      numero(scouts.defesas) * 1.3 +
      numero(scouts.defesasDificeis) * 2 +
      numero(scouts.forcaDefesa) / 12;

    return normalizar(
      valor,
      0,
      12
    );
  }


  function calcularCasaFora(jogador) {
    const mando = String(
      jogador?.mando || ""
    ).toLowerCase();

    if (mando === "casa") {
      return 70;
    }

    if (mando === "fora") {
      return 45;
    }

    return 50;
  }


  function calcularForcaAdversario(jogador) {
    if (
      Number.isFinite(
        Number(jogador?.notaForcaAdversario)
      )
    ) {
      return limitar(
        jogador.notaForcaAdversario
      );
    }

    const componentes =
      jogador?.componentes || {};

    return limitar(
      componentes.Confronto ??
      componentes.confronto ??
      50
    );
  }


  function calcularPontosCedidos(jogador) {
    if (
      Number.isFinite(
        Number(jogador?.pontosCedidosNota)
      )
    ) {
      return limitar(
        jogador.pontosCedidosNota
      );
    }

    return calcularForcaAdversario(
      jogador
    );
  }


  function calcularChanceSG(jogador) {
    return limitar(
      jogador?.chanceSG
    );
  }


  function calcularTitularidade(jogador) {
    return limitar(
      jogador?.titularidade ?? 50
    );
  }


  function calcularMinutosEsperados(jogador) {
    const minutos = numero(
      jogador?.minutosEsperados,
      45
    );

    return limitar(
      (minutos / 90) * 100
    );
  }


  function calcularBolaParada(jogador) {
    return jogador?.cobraBolaParada
      ? 100
      : 0;
  }


  function calcularPenaltis(jogador) {
    return jogador?.cobraPenalti
      ? 100
      : 0;
  }


  function calcularCustoBeneficio(jogador) {
    const projecao = numero(
      jogador?.projecao
    );

    const preco = numero(
      jogador?.preco
    );

    if (preco <= 0) {
      return 0;
    }

    return normalizar(
      projecao / preco,
      0,
      1.5
    );
  }


  function calcularNotasJogador(jogador) {
    const posicao = String(
      jogador?.posicao || ""
    )
      .toUpperCase()
      .trim();

    if (!POSICOES_VALIDAS.includes(posicao)) {
      return {
        erro: "Posição inválida.",
        posicao,
        notas: {}
      };
    }

    const historico =
      jogador?.historicoPontuacoes ||
      jogador?.pontuacoes ||
      [];

    return {
      erro: null,

      posicao,

      notas: {
        formaRecente:
          calcularFormaRecente(historico),

        mediaGeral:
          calcularMediaGeral(historico),

        mediana:
          calcularNotaMediana(historico),

        regularidade:
          calcularRegularidade(historico),

        pontuacaoBasica:
          calcularPontuacaoBasica(jogador),

        scoutsOfensivos:
          calcularScoutsOfensivos(jogador),

        scoutsDefensivos:
          calcularScoutsDefensivos(jogador),

        casaFora:
          calcularCasaFora(jogador),

        forcaAdversario:
          calcularForcaAdversario(jogador),

        pontosCedidos:
          calcularPontosCedidos(jogador),

        chanceSG:
          calcularChanceSG(jogador),

        titularidade:
          calcularTitularidade(jogador),

        minutosEsperados:
          calcularMinutosEsperados(jogador),

        bolaParada:
          calcularBolaParada(jogador),

        penaltis:
          calcularPenaltis(jogador),

        custoBeneficio:
          calcularCustoBeneficio(jogador),

        tendenciaRecente:
          calcularTendenciaRecente(historico),

        riscoNegativar:
          calcularProtecaoNegativacao(historico)
      }
    };
  }


  function analisarJogador(jogador) {
    const calculo =
      calcularNotasJogador(jogador);

    if (calculo.erro) {
      return {
        ...jogador,
        erroCalculadora: calculo.erro
      };
    }

    if (
      typeof executarMotorEstatistico !==
      "function"
    ) {
      return {
        ...jogador,
        notasCriterios: calculo.notas,
        erroCalculadora:
          "Motor estatístico não carregado."
      };
    }

    const resultadoMotor =
      executarMotorEstatistico({
        jogadorId: jogador.id,
        posicao: calculo.posicao,
        notas: calculo.notas
      });

     const jogadorCompleto = {

    ...jogador,

    ...calculo.notas

};

jogadorCompleto.score =
    MotorScore.calcular(
        jogadorCompleto
    );

const pisoTeto =
    MotorPisoTeto.calcular(
        jogadorCompleto.historico || []
    );

jogadorCompleto.piso =
    pisoTeto.piso;

jogadorCompleto.teto =
    pisoTeto.teto;

jogadorCompleto.confianca =
    MotorConfianca.calcular(
        jogadorCompleto
    );

jogadorCompleto.risco =
    MotorRisco.calcular(
        jogadorCompleto
    );

jogadorCompleto.projecao =
    MotorProjecao.calcular(
        jogadorCompleto
    );

   return {
   
       ...jogadorCompleto,
   
       notasCriterios:
           calculo.notas,
   
       notaCalculada:
           resultadoMotor.notaFinal,

      classificacaoCalculada:
        resultadoMotor.classificacao,

      contribuicoesCalculadas:
        resultadoMotor.contribuicoes,

      pesosAplicados:
        resultadoMotor.pesosAplicados,

      explicacaoCalculada:
        resultadoMotor.explicacao,

      erroCalculadora:
        resultadoMotor.erro
    };
  }


  function analisarListaJogadores(jogadores) {
    if (!Array.isArray(jogadores)) {
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
