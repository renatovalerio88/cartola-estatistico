/* =========================================================
   CARTOLA ESTATÍSTICO
   Pesos especializados por posição
   ========================================================= */


/* =========================================================
   1. PESOS BASE
   Usados como referência e fallback.
   A soma deve ser igual a 100.
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
   Prioriza SG, defesas, regularidade e confronto.
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
   Equilibra desarmes, apoio ofensivo e SG.
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
   Prioriza SG, desarmes e estabilidade.
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
   Prioriza criação, finalizações e pontuação básica.
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
   Prioriza scouts ofensivos, teto e confronto.
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
   Prioriza favoritismo, defesa e chance de vitória.
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
   8. MAPA DE PESOS POR POSIÇÃO
   ========================================================= */

const PESOS_POR_POSICAO = {
  GOL: PESOS_GOLEIROS,
  LAT: PESOS_LATERAIS,
  ZAG: PESOS_ZAGUEIROS,
  MEI: PESOS_MEIAS,
  ATA: PESOS_ATACANTES,
  TEC: PESOS_TREINADORES
};


/* =========================================================
   9. NOMES DOS PERFIS
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

function obterPesosPorPosicao(
  codigoPosicao
) {
  const codigo =
    String(
      codigoPosicao || ""
    )
      .toUpperCase()
      .trim();

  const pesos =
    PESOS_POR_POSICAO[codigo];

  if (!pesos) {
    return {
      ...PESOS_BASE
    };
  }

  return {
    ...pesos
  };
}


/* =========================================================
   11. NOME DO MOTOR DA POSIÇÃO
   ========================================================= */

function obterNomeMotorPosicao(
  codigoPosicao
) {
  const codigo =
    String(
      codigoPosicao || ""
    )
      .toUpperCase()
      .trim();

  return (
    NOMES_MOTORES_POSICAO[codigo] ||
    "Motor Estatístico Geral"
  );
}


/* =========================================================
   12. SOMA DOS PESOS
   ========================================================= */

function somarPesosDoPerfil(
  pesos
) {
  if (!ehObjetoValido(pesos)) {
    return 0;
  }

  return Object.values(pesos)
    .reduce(
      (total, peso) =>
        total +
        numeroSeguro(peso),
      0
    );
}


/* =========================================================
   13. VALIDAÇÃO DE UM PERFIL
   ========================================================= */

function validarPerfilDePesos(
  codigoPosicao
) {
  const pesos =
    obterPesosPorPosicao(
      codigoPosicao
    );

  const total =
    somarPesosDoPerfil(
      pesos
    );

  const valido =
    total === 100;

  if (!valido) {
    console.error(
      `Erro nos pesos de ${codigoPosicao}: ` +
      `o total é ${total}, mas deveria ser 100.`
    );
  }

  return {
    codigoPosicao,
    nomeMotor:
      obterNomeMotorPosicao(
        codigoPosicao
      ),
    total,
    esperado: 100,
    valido
  };
}


/* =========================================================
   14. VALIDAÇÃO DE TODOS OS PERFIS
   ========================================================= */

function validarTodosOsPerfisDePesos() {
  return Object.keys(
    PESOS_POR_POSICAO
  ).map(
    validarPerfilDePesos
  );
}


/* =========================================================
   15. CRITÉRIOS MAIS IMPORTANTES
   ========================================================= */

function obterMaioresPesosDaPosicao(
  codigoPosicao,
  quantidade = 5
) {
  const pesos =
    obterPesosPorPosicao(
      codigoPosicao
    );

  return Object.entries(pesos)
    .map(
      ([criterio, peso]) => ({
        criterio,
        nome:
          typeof NOMES_CRITERIOS !==
          "undefined"
            ? (
                NOMES_CRITERIOS[
                  criterio
                ] || criterio
              )
            : criterio,
        peso
      })
    )
    .sort(
      (itemA, itemB) =>
        itemB.peso -
        itemA.peso
    )
    .slice(
      0,
      quantidade
    );
}


/* =========================================================
   16. RELATÓRIO DOS PESOS
   ========================================================= */

function obterRelatorioPesos() {
  return Object.keys(
    PESOS_POR_POSICAO
  ).map(
    (codigoPosicao) => ({
      codigoPosicao,

      nomeMotor:
        obterNomeMotorPosicao(
          codigoPosicao
        ),

      validacao:
        validarPerfilDePesos(
          codigoPosicao
        ),

      maioresPesos:
        obterMaioresPesosDaPosicao(
          codigoPosicao,
          5
        ),

      pesos:
        obterPesosPorPosicao(
          codigoPosicao
        )
    })
  );
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
