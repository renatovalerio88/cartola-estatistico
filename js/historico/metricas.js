/* =========================================================
   CARTOLA ESTATÍSTICO
   Histórico — métricas do backtest
   ========================================================= */


/* =========================================================
   UTILITÁRIOS
   ========================================================= */


function numeroMetricaHistorico(
  valor
) {

  const numero =
    Number(valor);


  return Number.isFinite(
    numero
  )
    ? numero
    : null;

}


/* =========================================================
   MÉDIA
   ========================================================= */


function mediaHistorico(
  valores
) {

  const validos =
    valores.filter(
      valor =>
        Number.isFinite(
          Number(valor)
        )
    );


  if (
    validos.length === 0
  ) {

    return null;

  }


  return validos.reduce(
    (
      total,
      valor
    ) =>
      total +
      Number(valor),
    0
  ) /
  validos.length;

}


/* =========================================================
   CORRELAÇÃO DE PEARSON
   ========================================================= */


function correlacaoHistorico(
  pares
) {

  const validos =
    pares.filter(
      item =>
        Number.isFinite(
          Number(
            item.projecao
          )
        ) &&
        Number.isFinite(
          Number(
            item.real
          )
        )
    );


  if (
    validos.length < 2
  ) {

    return null;

  }


  const xs =
    validos.map(
      item =>
        Number(
          item.projecao
        )
    );


  const ys =
    validos.map(
      item =>
        Number(
          item.real
        )
    );


  const mediaX =
    mediaHistorico(
      xs
    );


  const mediaY =
    mediaHistorico(
      ys
    );


  let numerador = 0;

  let somaX = 0;

  let somaY = 0;


  for (
    let i = 0;
    i < validos.length;
    i += 1
  ) {

    const dx =
      xs[i] -
      mediaX;


    const dy =
      ys[i] -
      mediaY;


    numerador +=
      dx *
      dy;


    somaX +=
      dx *
      dx;


    somaY +=
      dy *
      dy;

  }


  const denominador =
    Math.sqrt(
      somaX *
      somaY
    );


  if (
    denominador === 0
  ) {

    return null;

  }


  return (
    numerador /
    denominador
  );

}


/* =========================================================
   TOP 5
   ========================================================= */


function calcularTop5Historico(
  jogadores
) {

  const validos =
    jogadores.filter(
      jogador =>
        Number.isFinite(
          Number(
            jogador.projecao
          )
        ) &&
        Number.isFinite(
          Number(
            jogador.real
          )
        )
    );


  if (
    validos.length === 0
  ) {

    return {

      acertos: 0,

      total: 0

    };

  }


  const projetados =
    [
      ...validos
    ]
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b.projecao
          )
          -
          Number(
            a.projecao
          )
      )
      .slice(
        0,
        5
      );


  const reais =
    [
      ...validos
    ]
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b.real
          )
          -
          Number(
            a.real
          )
      )
      .slice(
        0,
        5
      );


  const idsReais =
    new Set(

      reais.map(
        jogador =>
          String(
            jogador.id
          )
      )

    );


  const acertos =
    projetados.filter(
      jogador =>
        idsReais.has(
          String(
            jogador.id
          )
        )
    ).length;


  return {

    acertos,

    total:
      Math.min(
        5,
        validos.length
      )

  };

}


/* =========================================================
   CAPITÃO
   ========================================================= */


function calcularCapitaoHistorico(
  jogadores
) {

  const marcados =
    jogadores.filter(
      jogador =>
        jogador.capitao ===
        true
    );


  if (
    marcados.length > 0
  ) {

    const capitao =
      marcados[0];


    return {

      jogador:
        capitao,

      acertou:
        capitao.capitaoAcertou ===
        true

    };

  }


  const validos =
    jogadores.filter(
      jogador =>
        Number.isFinite(
          Number(
            jogador.projecao
          )
        ) &&
        Number.isFinite(
          Number(
            jogador.real
          )
        )
    );


  if (
    validos.length === 0
  ) {

    return null;

  }


  const projetado =
    [
      ...validos
    ].sort(
      (
        a,
        b
      ) =>
        Number(
          b.projecao
        )
        -
        Number(
          a.projecao
        )
    )[0];


  const melhorReal =
    [
      ...validos
    ].sort(
      (
        a,
        b
      ) =>
        Number(
          b.real
        )
        -
        Number(
          a.real
        )
    )[0];


  return {

    jogador:
      projetado,

    acertou:
      String(
        projetado.id
      ) ===
      String(
        melhorReal.id
      )

  };

}


/* =========================================================
   MÉTRICAS COMPLETAS
   ========================================================= */


function calcularMetricasHistorico(
  jogadores,
  metricasOriginais = {}
) {

  const lista =
    Array.isArray(
      jogadores
    )
      ? jogadores
      : [];


  const validos =
    lista.filter(
      jogador =>
        Number.isFinite(
          Number(
            jogador.projecao
          )
        ) &&
        Number.isFinite(
          Number(
            jogador.real
          )
        )
    );


  const erros =
    validos.map(
      jogador =>
        Math.abs(
          Number(
            jogador.projecao
          )
          -
          Number(
            jogador.real
          )
        )
    );


  const vies =
    validos.map(
      jogador =>
        Number(
          jogador.projecao
        )
        -
        Number(
          jogador.real
        )
    );


  const top5 =
    calcularTop5Historico(
      validos
    );


  const capitao =
    calcularCapitaoHistorico(
      validos
    );


  const erroMedioCalculado =
    mediaHistorico(
      erros
    );


  const viesCalculado =
    mediaHistorico(
      vies
    );


  const correlacaoCalculada =
    correlacaoHistorico(
      validos
    );


  const erroMedioOrigem =
    numeroMetricaHistorico(

      metricasOriginais.erroMedio

      ??

      metricasOriginais.mae

    );


  const correlacaoOrigem =
    numeroMetricaHistorico(

      metricasOriginais.correlacao

      ??

      metricasOriginais.pearson

    );


  return {

    quantidade:
      validos.length,

    erroMedio:
      erroMedioOrigem
      ??
      erroMedioCalculado,

    mae:
      erroMedioOrigem
      ??
      erroMedioCalculado,

    vies:
      numeroMetricaHistorico(
        metricasOriginais.vies
      )
      ??
      viesCalculado,

    correlacao:
      correlacaoOrigem
      ??
      correlacaoCalculada,

    top5: {

      acertos:
        numeroMetricaHistorico(
          metricasOriginais
            ?.top5
            ?.acertos
        )
        ??
        (
          typeof metricasOriginais.top5 ===
            "string"

            ? Number(
                String(
                  metricasOriginais.top5
                ).split(
                  "/"
                )[0]
              )

            : null
        )
        ??
        top5.acertos,

      total:
        numeroMetricaHistorico(
          metricasOriginais
            ?.top5
            ?.total
        )
        ??
        top5.total

    },

    capitao: {

      jogador:
        capitao?.jogador
        ??
        null,

      acertou:
        (
          metricasOriginais.capitao ===
          "Acertou"
        )
        ||
        metricasOriginais
          ?.capitao
          ?.acertou ===
          true
        ||
        capitao?.acertou ===
        true

    }

  };

}


/* =========================================================
   API
   ========================================================= */


const HistoricoMetricas = {

  calcular:
    calcularMetricasHistorico,

  media:
    mediaHistorico,

  correlacao:
    correlacaoHistorico

};


if (
  typeof window !==
  "undefined"
) {

  window.HistoricoMetricas =
    HistoricoMetricas;


  window.calcularMetricasHistorico =
    calcularMetricasHistorico;

}
