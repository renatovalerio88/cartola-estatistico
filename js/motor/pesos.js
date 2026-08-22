/* =========================================================
   CARTOLA ESTATÍSTICO
   Pesos especializados por posição
   =========================================================
   Regra estrutural:
   - critérios sem relação com a posição recebem peso ZERO;
   - os pesos úteis são normalizados para 100;
   - pesos dinâmicos não podem reativar critério inelegível.
   ========================================================= */

const PESOS_BASE = {
  formaRecente: 15, mediaGeral: 7, mediana: 5, regularidade: 8,
  pontuacaoBasica: 7, scoutsOfensivos: 7, scoutsDefensivos: 5,
  casaFora: 5, forcaAdversario: 7, pontosCedidos: 7, chanceSG: 6,
  titularidade: 4, minutosEsperados: 3, bolaParada: 2, penaltis: 2,
  custoBeneficio: 4, tendenciaRecente: 3, riscoNegativar: 3
};

const PESOS_GOLEIROS = {
  formaRecente: 13, mediaGeral: 6, mediana: 6, regularidade: 10,
  pontuacaoBasica: 9, scoutsOfensivos: 0, scoutsDefensivos: 13,
  casaFora: 5, forcaAdversario: 7, pontosCedidos: 6, chanceSG: 12,
  titularidade: 4, minutosEsperados: 3, bolaParada: 0, penaltis: 0,
  custoBeneficio: 3, tendenciaRecente: 2, riscoNegativar: 1
};

const PESOS_LATERAIS = {
  formaRecente: 13, mediaGeral: 6, mediana: 5, regularidade: 8,
  pontuacaoBasica: 10, scoutsOfensivos: 10, scoutsDefensivos: 8,
  casaFora: 5, forcaAdversario: 6, pontosCedidos: 8, chanceSG: 7,
  titularidade: 4, minutosEsperados: 3, bolaParada: 2, penaltis: 1,
  custoBeneficio: 2, tendenciaRecente: 1, riscoNegativar: 1
};

const PESOS_ZAGUEIROS = {
  formaRecente: 12, mediaGeral: 6, mediana: 6, regularidade: 10,
  pontuacaoBasica: 9, scoutsOfensivos: 3, scoutsDefensivos: 12,
  casaFora: 5, forcaAdversario: 7, pontosCedidos: 7, chanceSG: 11,
  titularidade: 4, minutosEsperados: 3, bolaParada: 1, penaltis: 0,
  custoBeneficio: 2, tendenciaRecente: 1, riscoNegativar: 1
};

const PESOS_MEIAS = {
  formaRecente: 14, mediaGeral: 7, mediana: 5, regularidade: 7,
  pontuacaoBasica: 9, scoutsOfensivos: 13, scoutsDefensivos: 6,
  casaFora: 5, forcaAdversario: 7, pontosCedidos: 8, chanceSG: 0,
  titularidade: 4, minutosEsperados: 3, bolaParada: 4, penaltis: 2,
  custoBeneficio: 2, tendenciaRecente: 2, riscoNegativar: 1
};

const PESOS_ATACANTES = {
  formaRecente: 15, mediaGeral: 7, mediana: 4, regularidade: 5,
  pontuacaoBasica: 6, scoutsOfensivos: 18, scoutsDefensivos: 0,
  casaFora: 6, forcaAdversario: 9, pontosCedidos: 8, chanceSG: 0,
  titularidade: 4, minutosEsperados: 3, bolaParada: 3, penaltis: 4,
  custoBeneficio: 3, tendenciaRecente: 3, riscoNegativar: 1
};

const PESOS_TREINADORES = {
  formaRecente: 13, mediaGeral: 8, mediana: 6, regularidade: 8,
  pontuacaoBasica: 4, scoutsOfensivos: 0, scoutsDefensivos: 0,
  casaFora: 8, forcaAdversario: 13, pontosCedidos: 5, chanceSG: 10,
  titularidade: 5, minutosEsperados: 0, bolaParada: 0, penaltis: 0,
  custoBeneficio: 3, tendenciaRecente: 2, riscoNegativar: 1
};

const PESOS_POR_POSICAO = {
  GOL: PESOS_GOLEIROS, LAT: PESOS_LATERAIS, ZAG: PESOS_ZAGUEIROS,
  MEI: PESOS_MEIAS, ATA: PESOS_ATACANTES, TEC: PESOS_TREINADORES
};

/* Critérios impossíveis/sem valor de decisão por posição. */
const CRITERIOS_INELEGIVEIS_POR_POSICAO = {
  GOL: new Set(["scoutsOfensivos", "bolaParada", "penaltis"]),
  LAT: new Set([]),
  ZAG: new Set(["penaltis"]),
  MEI: new Set(["chanceSG"]),
  ATA: new Set(["scoutsDefensivos", "chanceSG"]),
  TEC: new Set(["scoutsOfensivos", "scoutsDefensivos", "minutosEsperados", "bolaParada", "penaltis"])
};

let PESOS_DINAMICOS = {};

const NOMES_MOTORES_POSICAO = {
  GOL: "Motor de Goleiros", LAT: "Motor de Laterais", ZAG: "Motor de Zagueiros",
  MEI: "Motor de Meias", ATA: "Motor de Atacantes", TEC: "Motor de Treinadores"
};

function normalizarCodigoPosicao(codigoPosicao) {
  return String(codigoPosicao || "").toUpperCase().trim();
}

function criterioElegivelParaPosicao(codigoPosicao, criterio) {
  const codigo = normalizarCodigoPosicao(codigoPosicao);
  const bloqueados = CRITERIOS_INELEGIVEIS_POR_POSICAO[codigo];
  return !bloqueados || !bloqueados.has(criterio);
}

function obterPesosPorPosicao(codigoPosicao) {
  const codigo = normalizarCodigoPosicao(codigoPosicao);
  const pesos = PESOS_POR_POSICAO[codigo];
  if (!pesos) return { ...PESOS_BASE };

  const dinamicos = PESOS_DINAMICOS[codigo] || {};
  const pesosFinais = { ...pesos };

  Object.keys(pesosFinais).forEach(criterio => {
    if (!criterioElegivelParaPosicao(codigo, criterio)) {
      pesosFinais[criterio] = 0;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(dinamicos, criterio)) {
      pesosFinais[criterio] = Number(dinamicos[criterio] || 0);
    }
  });

  return normalizarPesos(pesosFinais);
}

function normalizarPesos(pesos) {
  const total = Object.values(pesos).reduce((soma, valor) => soma + Number(valor || 0), 0);
  if (total === 0 || total === 100) return pesos;
  const resultado = {};
  Object.keys(pesos).forEach(chave => {
    resultado[chave] = Number((Number(pesos[chave] || 0) * 100 / total).toFixed(2));
  });
  return resultado;
}

function obterNomeMotorPosicao(codigoPosicao) {
  const codigo = normalizarCodigoPosicao(codigoPosicao);
  return NOMES_MOTORES_POSICAO[codigo] || "Motor Estatístico Geral";
}

function validarPerfilDePesos(codigoPosicao) {
  const pesos = obterPesosPorPosicao(codigoPosicao);
  const total = Object.values(pesos).reduce((soma, valor) => soma + Number(valor || 0), 0);
  const inelegiveisAtivos = Object.entries(pesos)
    .filter(([criterio, peso]) => !criterioElegivelParaPosicao(codigoPosicao, criterio) && Number(peso || 0) !== 0)
    .map(([criterio]) => criterio);
  return {
    codigoPosicao,
    nomeMotor: obterNomeMotorPosicao(codigoPosicao),
    total: Number(total.toFixed(2)),
    esperado: 100,
    inelegiveisAtivos,
    valido: Math.abs(total - 100) < 0.1 && inelegiveisAtivos.length === 0
  };
}

function validarTodosOsPerfisDePesos() {
  return Object.keys(PESOS_POR_POSICAO).map(validarPerfilDePesos);
}

function obterRelatorioPesos() {
  return Object.keys(PESOS_POR_POSICAO).map(codigo => ({
    codigoPosicao: codigo,
    nomeMotor: obterNomeMotorPosicao(codigo),
    validacao: validarPerfilDePesos(codigo),
    pesos: obterPesosPorPosicao(codigo)
  }));
}

async function carregarPesosDinamicos() {
  try {
    const resposta = await fetch("data/pesos.json", { cache: "no-store" });
    if (!resposta.ok) {
      console.warn("pesos.json não encontrado. Usando pesos padrão.");
      return;
    }
    PESOS_DINAMICOS = await resposta.json();
    console.info("Pesos dinâmicos carregados", PESOS_DINAMICOS);
  } catch (erro) {
    console.warn("Erro ao carregar pesos dinâmicos", erro);
    PESOS_DINAMICOS = {};
  }
}

const VALIDACAO_PESOS_POSICAO = validarTodosOsPerfisDePesos();
console.info("Pesos por posição carregados:", obterRelatorioPesos());
