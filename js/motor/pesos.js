/* =========================================================
   CARTOLA ESTATÍSTICO
   Pesos especializados por posição
   ========================================================= */


/* =========================================================
   1. PESOS BASE
   ========================================================= */

const PESOS_BASE = {

  formaRecente: 15,
  mediaGeral: 7,
  mediana: 5,
  regularidade: 8,
  pontuacaoBasica: 7,
  scoutsOfensivos: 7,
  scoutsDefensivos: 5,
  casaFora: 5,
  forcaAdversario: 7,
  pontosCedidos: 7,
  chanceSG: 6,
  titularidade: 4,
  minutosEsperados: 3,
  bolaParada: 2,
  penaltis: 2,
  custoBeneficio: 4,
  tendenciaRecente: 3,
  riscoNegativar: 3

};


/* =========================================================
   2. PESOS DOS GOLEIROS
   ========================================================= */

const PESOS_GOLEIROS = {

  formaRecente: 13,
  mediaGeral: 6,
  mediana: 6,
  regularidade: 10,
  pontuacaoBasica: 9,
  scoutsOfensivos: 0,
  scoutsDefensivos: 13,
  casaFora: 5,
  forcaAdversario: 7,
  pontosCedidos: 6,
  chanceSG: 12,
  titularidade: 4,
  minutosEsperados: 3,
  bolaParada: 0,
  penaltis: 0,
  custoBeneficio: 3,
  tendenciaRecente: 2,
  riscoNegativar: 1

};


/* =========================================================
   3. PESOS DOS LATERAIS
   ========================================================= */

const PESOS_LATERAIS = {

  formaRecente: 13,
  mediaGeral: 6,
  mediana: 5,
  regularidade: 8,
  pontuacaoBasica: 10,
  scoutsOfensivos: 10,
  scoutsDefensivos: 8,
  casaFora: 5,
  forcaAdversario: 6,
  pontosCedidos: 8,
  chanceSG: 7,
  titularidade: 4,
  minutosEsperados: 3,
  bolaParada: 2,
  penaltis: 1,
  custoBeneficio: 2,
  tendenciaRecente: 1,
  riscoNegativar: 1

};


/* =========================================================
   4. PESOS DOS ZAGUEIROS
   ========================================================= */

const PESOS_ZAGUEIROS = {

  formaRecente: 12,
  mediaGeral: 6,
  mediana: 6,
  regularidade: 10,
  pontuacaoBasica: 9,
  scoutsOfensivos: 3,
  scoutsDefensivos: 12,
  casaFora: 5,
  forcaAdversario: 7,
  pontosCedidos: 7,
  chanceSG: 11,
  titularidade: 4,
  minutosEsperados: 3,
  bolaParada: 1,
  penaltis: 0,
  custoBeneficio: 2,
  tendenciaRecente: 1,
  riscoNegativar: 1

};


/* =========================================================
   5. PESOS DOS MEIAS
   ========================================================= */

const PESOS_MEIAS = {

  formaRecente: 14,
  mediaGeral: 7,
  mediana: 5,
  regularidade: 7,
  pontuacaoBasica: 9,
  scoutsOfensivos: 13,
  scoutsDefensivos: 6,
  casaFora: 5,
  forcaAdversario: 7,
  pontosCedidos: 8,
  chanceSG: 1,
  titularidade: 4,
  minutosEsperados: 3,
  bolaParada: 4,
  penaltis: 2,
  custoBeneficio: 2,
  tendenciaRecente: 2,
  riscoNegativar: 1

};

/* =========================================================
   6. PESOS DOS ATACANTES
   ========================================================= */

const PESOS_ATACANTES = {

  formaRecente: 15,
  mediaGeral: 7,
  mediana: 4,
  regularidade: 5,
  pontuacaoBasica: 6,
  scoutsOfensivos: 18,
  scoutsDefensivos: 1,
  casaFora: 6,
  forcaAdversario: 9,
  pontosCedidos: 8,
  chanceSG: 0,
  titularidade: 4,
  minutosEsperados: 3,
  bolaParada: 3,
  penaltis: 4,
  custoBeneficio: 3,
  tendenciaRecente: 3,
  riscoNegativar: 1

};


/* =========================================================
   7. PESOS DOS TREINADORES
   ========================================================= */

const PESOS_TREINADORES = {

  formaRecente: 13,
  mediaGeral: 8,
  mediana: 6,
  regularidade: 8,
  pontuacaoBasica: 4,
  scoutsOfensivos: 6,
  scoutsDefensivos: 8,
  casaFora: 8,
  forcaAdversario: 13,
  pontosCedidos: 5,
  chanceSG: 10,
  titularidade: 5,
  minutosEsperados: 0,
  bolaParada: 0,
  penaltis: 0,
  custoBeneficio: 3,
  tendenciaRecente: 2,
  riscoNegativar: 1

};


/* =========================================================
   8. MAPA DE PESOS
   ========================================================= */

const PESOS_POR_POSICAO = {

  GOL: PESOS_GOLEIROS,
  LAT: PESOS_LATERAIS,
  ZAG: PESOS_ZAGUEIROS,
  MEI: PESOS_MEIAS,
  ATA: PESOS_ATACANTES,
  TEC: PESOS_TREINADORES

};


let PESOS_DINAMICOS = {};


/* =========================================================
   9. NOMES DOS MOTORES
   ========================================================= */

const NOMES_MOTORES_POSICAO = {

  GOL: "Motor de Goleiros",
  LAT: "Motor de Laterais",
  ZAG: "Motor de Zagueiros",
  MEI: "Motor de Meias",
  ATA: "Motor de Atacantes",
  TEC: "Motor de Treinadores"

};


/* =========================================================
   10. OBTENÇÃO DOS PESOS
   ========================================================= */

function obterPesosPorPosicao(codigoPosicao) {

  const codigo =
    String(codigoPosicao || "")
      .toUpperCase()
      .trim();


  const pesos =
    PESOS_POR_POSICAO[codigo];


  if (!pesos) {

    return {
      ...PESOS_BASE
    };

  }


  const pesosFinais = {

    ...pesos,

    ...(PESOS_DINAMICOS[codigo] || {})

  };


  return normalizarPesos(
    pesosFinais
  );

}


/* =========================================================
   11. NORMALIZAÇÃO DOS PESOS
   ========================================================= */

function normalizarPesos(pesos) {

  const total =
    Object.values(pesos)
      .reduce(
        (soma, valor) =>
          soma + Number(valor || 0),
        0
      );


  if (
    total === 0 ||
    total === 100
  ) {

    return pesos;

  }


  const resultado = {};


  Object.keys(pesos)
    .forEach(chave => {

      resultado[chave] =
        Number(
          (
            pesos[chave] *
            100 /
            total
          ).toFixed(2)
        );

    });


  return resultado;

}


/* =========================================================
   12. NOME DO MOTOR
   ========================================================= */

function obterNomeMotorPosicao(
  codigoPosicao
) {

  const codigo =
    String(codigoPosicao || "")
      .toUpperCase();


  return (
    NOMES_MOTORES_POSICAO[codigo]
    ||
    "Motor Estatístico Geral"
  );

}


/* =========================================================
   13. VALIDAÇÃO
   ========================================================= */

function validarPerfilDePesos(
  codigoPosicao
) {

  const pesos =
    obterPesosPorPosicao(
      codigoPosicao
    );


  const total =
    Object.values(pesos)
      .reduce(
        (soma, valor) =>
          soma + Number(valor || 0),
        0
      );


  return {

    codigoPosicao,

    nomeMotor:
      obterNomeMotorPosicao(
        codigoPosicao
      ),

    total:
      Number(total.toFixed(2)),

    esperado: 100,

    valido:
      Math.abs(total - 100) < 0.1

  };

}


/* =========================================================
   14. TODOS OS PERFIS
   ========================================================= */

function validarTodosOsPerfisDePesos() {

  return Object.keys(
    PESOS_POR_POSICAO
  )
  .map(
    validarPerfilDePesos
  );

}


/* =========================================================
   15. RELATÓRIO
   ========================================================= */

function obterRelatorioPesos() {

  return Object.keys(
    PESOS_POR_POSICAO
  )
  .map(
    codigo => ({

      codigoPosicao:
        codigo,

      nomeMotor:
        obterNomeMotorPosicao(
          codigo
        ),

      validacao:
        validarPerfilDePesos(
          codigo
        ),

      pesos:
        obterPesosPorPosicao(
          codigo
        )

    })
  );

}


/* =========================================================
   16. PESOS DINÂMICOS
   ========================================================= */

async function carregarPesosDinamicos() {

  try {

    const resposta =
      await fetch(
        "data/pesos.json",
        {
          cache: "no-store"
        }
      );


    if (!resposta.ok) {

      console.warn(
        "pesos.json não encontrado. Usando pesos padrão."
      );

      return;

    }


    PESOS_DINAMICOS =
      await resposta.json();


    console.info(
      "Pesos dinâmicos carregados",
      PESOS_DINAMICOS
    );


  }
  catch (erro) {

    console.warn(
      "Erro ao carregar pesos dinâmicos",
      erro
    );


    PESOS_DINAMICOS = {};

  }

}


/* =========================================================
   17. VALIDAÇÃO AUTOMÁTICA
   ========================================================= */

const VALIDACAO_PESOS_POSICAO =
  validarTodosOsPerfisDePesos();


console.info(
  "Pesos por posição carregados:",
  obterRelatorioPesos()
);
