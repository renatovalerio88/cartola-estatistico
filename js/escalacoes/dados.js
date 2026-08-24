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
   - montar banco sem consumir patrimônio, seguindo o limite de preço por posição;
   - consolidar custo dos titulares separadamente do custo informativo do banco;
   - selecionar Reserva de Luxo;
   - aplicar viabilidade/titularidade da rodada;
   - aplicar adequação contextual à rodada;
   - usar C$ 200 apenas como patrimônio padrão inicial;
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
  "3-4-3",
  "3-5-2",
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "5-3-2",
  "5-4-1"
];


const FORMACOES_ESTRUTURA_ESCALACAO = {

  "3-4-3": { GOL: 1, LAT: 0, ZAG: 3, MEI: 4, ATA: 3, TEC: 1 },
  "3-5-2": { GOL: 1, LAT: 0, ZAG: 3, MEI: 5, ATA: 2, TEC: 1 },
  "4-3-3": { GOL: 1, LAT: 2, ZAG: 2, MEI: 3, ATA: 3, TEC: 1 },
  "4-4-2": { GOL: 1, LAT: 2, ZAG: 2, MEI: 4, ATA: 2, TEC: 1 },
  "4-5-1": { GOL: 1, LAT: 2, ZAG: 2, MEI: 5, ATA: 1, TEC: 1 },
  "5-3-2": { GOL: 1, LAT: 2, ZAG: 3, MEI: 3, ATA: 2, TEC: 1 },
  "5-4-1": { GOL: 1, LAT: 2, ZAG: 3, MEI: 4, ATA: 1, TEC: 1 }

};


const PERFIS_ESCALACAO_PADRAO = [

  {
    nome: "Conservador",
    chave: "conservador",
    estrategia: "Segurança",
    descricao:
      "Prioriza jogadores regulares, com bom piso, alta confiança, provável titularidade e menor risco de pontuação negativa."
  },

  {
    nome: "Equilibrado",
    chave: "equilibrado",
    estrategia: "Equilíbrio",
    descricao:
      "Combina segurança, projeção, teto, custo-benefício e exposição moderada aos clubes favoritos."
  },

  {
    nome: "Agressivo",
    chave: "agressivo",
    estrategia: "Teto",
    descricao:
      "Busca jogadores de alto teto, diferenciais, bolas paradas e confrontos com maior possibilidade de pontuação elevada."
  }

];


const PATRIMONIO_PADRAO_ESCALACOES =
  200;


const estadoEscalacoes = {

  perfis: [],

  jogadores: [],

  escalacoes: [],

  carregado: false,

  carregando: false,

  erro: null,

  patrimonioSelecionado: null,

  ultimaAtualizacao: null

};


/* =========================================================
   UTILITÁRIOS NUMÉRICOS
   ========================================================= */


function numeroEscalacao(
  valor,
  padrao = 0
) {

  const numero =
    Number(valor);


  return Number.isFinite(numero)
    ? numero
    : padrao;

}


function limitarEscalacao(
  valor,
  minimo,
  maximo
) {

  return Math.max(
    minimo,
    Math.min(
      maximo,
      valor
    )
  );

}


function arredondarEscalacao(
  valor,
  casas = 2
) {

  const fator =
    10 ** casas;


  return (
    Math.round(
      (
        numeroEscalacao(valor) +
        Number.EPSILON
      ) * fator
    ) / fator
  );

}


function normalizarTextoEscalacao(
  valor
) {

  return String(
    valor ?? ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );

}


function copiarJogadorEscalacao(
  jogador
) {

  if (
    !jogador ||
    typeof jogador !==
      "object"
  ) {

    return jogador;

  }


  return {

    ...jogador,

    scouts: {
      ...(jogador.scouts || {})
    },

    historico:
      Array.isArray(
        jogador.historico
      )
        ? jogador.historico.map(
            item => ({
              ...item,
              scouts: {
                ...(item?.scouts || {})
              }
            })
          )
        : jogador.historico

  };

}


function copiarEscalacao(
  escalacao
) {

  if (
    !escalacao ||
    typeof escalacao !==
      "object"
  ) {

    return escalacao;

  }


  const titulares =
    Array.isArray(
      escalacao.titulares
    )
      ? escalacao.titulares.map(
          copiarJogadorEscalacao
        )
      : [];


  const jogadores =
    Array.isArray(
      escalacao.jogadores
    )
      ? escalacao.jogadores.map(
          copiarJogadorEscalacao
        )
      : titulares.map(
          copiarJogadorEscalacao
        );


  const banco =
    Array.isArray(
      escalacao.banco
    )
      ? escalacao.banco.map(
          copiarJogadorEscalacao
        )
      : [];


  return {

    ...escalacao,

    titulares,

    jogadores,

    banco,

    capitao:
      escalacao.capitao
        ? copiarJogadorEscalacao(
            escalacao.capitao
          )
        : null,

    reservaLuxo:
      escalacao.reservaLuxo
        ? copiarJogadorEscalacao(
            escalacao.reservaLuxo
          )
        : null,

    pontosPositivos:
      Array.isArray(
        escalacao.pontosPositivos
      )
        ? [
            ...escalacao.pontosPositivos
          ]
        : [],

    pontosAtencao:
      Array.isArray(
        escalacao.pontosAtencao
      )
        ? [
            ...escalacao.pontosAtencao
          ]
        : []

  };

}


/* =========================================================
   IDENTIFICAÇÃO
   ========================================================= */


function obterIdJogadorEscalacao(
  jogador
) {

  return (
    jogador?.id ??
    jogador?.atletaId ??
    jogador?.atleta_id ??
    jogador?.slug ??
    jogador?.nome ??
    jogador?.apelido ??
    null
  );

}


function obterNomeJogadorEscalacao(
  jogador
) {

  return String(
    jogador?.apelido ??
    jogador?.nome ??
    "Jogador"
  );

}


function obterPosicaoJogadorEscalacao(
  jogador
) {

  const posicao =
    jogador?.posicao ??
    jogador?.posicaoSigla ??
    jogador?.posicao_sigla ??
    jogador?.posicaoAbreviacao ??
    "";


  return String(
    posicao
  )
    .trim()
    .toUpperCase();

}


function obterClubeJogadorEscalacao(
  jogador
) {

  return String(
    jogador?.siglaClube ??
    jogador?.clubeSigla ??
    jogador?.clube ??
    ""
  )
    .trim()
    .toUpperCase();

}


/* =========================================================
   PREÇO
   ========================================================= */


function obterPrecoJogadorEscalacao(
  jogador
) {

  return Math.max(
    0,
    numeroEscalacao(
      jogador?.preco ??
      jogador?.preco_num ??
      jogador?.precoCartola ??
      jogador?.valor ??
      0
    )
  );

}


/* =========================================================
   PROJEÇÃO
   ========================================================= */


function obterProjecaoJogadorEscalacao(
  jogador
) {

  const candidatos = [

    jogador?.projecao,

    jogador?.projecaoCalibrada,

    jogador?.projecaoOriginal,

    jogador?.score,

    jogador?.pontuacaoProjetada,

    jogador?.media3,

    jogador?.media5,

    jogador?.mediaGeral,

    jogador?.media

  ];


  for (
    const candidato of candidatos
  ) {

    const valor =
      Number(candidato);


    if (
      Number.isFinite(valor)
    ) {

      return valor;

    }

  }


  return 0;

}


function obterPisoJogadorEscalacao(
  jogador
) {

  return numeroEscalacao(
    jogador?.piso ??
    jogador?.projecaoPiso ??
    jogador?.pisoProjetado ??
    0
  );

}


function obterTetoJogadorEscalacao(
  jogador
) {

  const teto =
    numeroEscalacao(
      jogador?.teto ??
      jogador?.projecaoTeto ??
      jogador?.tetoProjetado,
      NaN
    );


  if (
    Number.isFinite(teto)
  ) {

    return teto;

  }


  return obterProjecaoJogadorEscalacao(
    jogador
  );

}


function obterConfiancaJogadorEscalacao(
  jogador
) {

  let confianca =
    numeroEscalacao(
      jogador?.confianca ??
      jogador?.confiancaPercentual ??
      jogador?.confidence ??
      50
    );


  if (
    confianca >= 0 &&
    confianca <= 1
  ) {

    confianca *= 100;

  }


  return limitarEscalacao(
    confianca,
    0,
    100
  );

}


function obterRiscoJogadorEscalacao(
  jogador
) {

  return Math.max(
    0,
    numeroEscalacao(
      jogador?.risco ??
      jogador?.volatilidade ??
      jogador?.desvioPadrao ??
      0
    )
  );

}


/* =========================================================
   TITULARIDADE
   ========================================================= */


function obterTitularidadeJogadorEscalacao(
  jogador
) {

  const candidatos = [

    jogador?.titularidade,

    jogador?.probabilidadeTitular,

    jogador?.probTitular,

    jogador?.chanceTitular,

    jogador?.titularidadeEstimada

  ];


  for (
    const candidato of candidatos
  ) {

    const valor =
      Number(candidato);


    if (
      !Number.isFinite(valor)
    ) {

      continue;

    }


    if (
      valor >= 0 &&
      valor <= 1
    ) {

      return limitarEscalacao(
        valor * 100,
        0,
        100
      );

    }


    return limitarEscalacao(
      valor,
      0,
      100
    );

  }


  const statusId =
    numeroEscalacao(
      jogador?.statusId ??
      jogador?.status_id,
      0
    );


  /*
   * Status 7 costuma representar
   * provável no mercado do Cartola.
   */

  if (
    statusId === 7
  ) {

    return 95;

  }


  if (
    statusId === 2 ||
    statusId === 3
  ) {

    return 15;

  }


  return 75;

}


/* =========================================================
   ADEQUAÇÃO À RODADA
   ========================================================= */


function obterAdequacaoRodadaEscalacao(
  jogador
) {

  const candidatos = [

    jogador?.adequacaoRodada,

    jogador?.adequacao,

    jogador?.notaConfronto,

    jogador?.forcaConfronto,

    jogador?.matchupScore

  ];


  for (
    const candidato of candidatos
  ) {

    const valor =
      Number(candidato);


    if (
      !Number.isFinite(valor)
    ) {

      continue;

    }


    if (
      valor >= 0 &&
      valor <= 1
    ) {

      return limitarEscalacao(
        valor * 100,
        0,
        100
      );

    }


    return limitarEscalacao(
      valor,
      0,
      100
    );

  }


  return 50;

}


/* =========================================================
   DISPONIBILIDADE
   ========================================================= */


function jogadorDisponivelEscalacao(
  jogador
) {

  if (!jogador) {

    return false;

  }


  const posicao =
    obterPosicaoJogadorEscalacao(
      jogador
    );


  if (!posicao) {

    return false;

  }


  const statusId =
    numeroEscalacao(
      jogador?.statusId ??
      jogador?.status_id,
      0
    );


  /*
   * Evita atletas explicitamente
   * indisponíveis.
   *
   * Não bloqueamos status desconhecido,
   * porque parte da base histórica não
   * possui status completo.
   */

  if (
    statusId === 2 ||
    statusId === 3 ||
    statusId === 5 ||
    statusId === 6
  ) {

    return false;

  }


  if (
    jogador?.disponivel === false ||
    jogador?.ativo === false
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   PERFIL
   ========================================================= */


function normalizarPerfilEscalacao(
  perfil,
  indice = 0
) {

  const base =
    PERFIS_ESCALACAO_PADRAO[
      indice
    ] ??
    PERFIS_ESCALACAO_PADRAO[1];


  if (
    typeof perfil ===
      "string"
  ) {

    return {

      ...base,

      nome:
        perfil,

      chave:
        normalizarTextoEscalacao(
          perfil
        )

    };

  }


  if (
    !perfil ||
    typeof perfil !==
      "object"
  ) {

    return {
      ...base
    };

  }


  const nome =
    perfil.nome ??
    perfil.perfil ??
    perfil.titulo ??
    base.nome;


  return {

    ...base,

    ...perfil,

    nome,

    chave:
      perfil.chave ??
      normalizarTextoEscalacao(
        nome
      ),

    estrategia:
      perfil.estrategia ??
      base.estrategia,

    descricao:
      perfil.descricao ??
      base.descricao

  };

}


function normalizarPerfisEscalacao(
  dados
) {

  let perfis = [];


  if (
    Array.isArray(dados)
  ) {

    perfis =
      dados;

  } else if (
    Array.isArray(
      dados?.perfis
    )
  ) {

    perfis =
      dados.perfis;

  } else if (
    dados?.perfis &&
    typeof dados.perfis ===
      "object"
  ) {

    perfis =
      Object.entries(
        dados.perfis
      )
        .map(
          ([nome, valor]) => {

            if (
              valor &&
              typeof valor ===
                "object"
            ) {

              return {
                nome,
                ...valor
              };

            }


            return {
              nome
            };

          }
        );

  }


  const resultado =
    PERFIS_ESCALACAO_PADRAO.map(
      (
        perfilPadrao,
        indice
      ) => {

        const encontrado =
          perfis.find(
            perfil => {

              const nome =
                typeof perfil ===
                  "string"
                  ? perfil
                  : (
                      perfil?.nome ??
                      perfil?.perfil ??
                      perfil?.titulo ??
                      ""
                    );


              return (
                normalizarTextoEscalacao(
                  nome
                ) ===
                normalizarTextoEscalacao(
                  perfilPadrao.nome
                )
              );

            }
          );


        return normalizarPerfilEscalacao(
          encontrado ??
          perfilPadrao,
          indice
        );

      }
    );


  return resultado;

}


/* =========================================================
   JOGADORES DISPONÍVEIS
   ========================================================= */


function obterJogadoresDisponiveisEscalacao() {

  let jogadores = [];


  if (
    typeof obterJogadoresCarregados ===
      "function"
  ) {

    try {

      jogadores =
        obterJogadoresCarregados();

    } catch (erro) {

      console.warn(
        "Não foi possível obter jogadores por obterJogadoresCarregados().",
        erro
      );

    }

  }


  if (
    !Array.isArray(jogadores) ||
    jogadores.length === 0
  ) {

    if (
      typeof estadoRecomendacoes !==
        "undefined" &&
      Array.isArray(
        estadoRecomendacoes?.jogadores
      )
    ) {

      jogadores =
        estadoRecomendacoes.jogadores;

    }

  }


  if (
    !Array.isArray(jogadores)
  ) {

    return [];

  }


  return jogadores
    .filter(
      jogadorDisponivelEscalacao
    )
    .map(
      copiarJogadorEscalacao
    );

}


/* =========================================================
   PATRIMÔNIO
   ========================================================= */


function normalizarPatrimonioEscalacoes(
  valor
) {

  const patrimonio =
    Number(
      String(
        valor ?? ""
      )
        .replace(
          ",",
          "."
        )
    );


  if (
    !Number.isFinite(
      patrimonio
    ) ||
    patrimonio <= 0
  ) {

    return null;

  }


  /*
   * V2.1: patrimônio é configurável pelo usuário,
   * com teto operacional explícito de C$ 200.
   */

  return arredondarEscalacao(
    Math.min(
      200,
      Math.max(1, patrimonio)
    ),
    2
  );

}


function obterPatrimonioAtualEscalacoes() {

  const selecionado =
    normalizarPatrimonioEscalacoes(
      estadoEscalacoes
        .patrimonioSelecionado
    );


  if (
    selecionado !== null
  ) {

    return selecionado;

  }


  return PATRIMONIO_PADRAO_ESCALACOES;

}


/* =========================================================
   PESOS POR PERFIL
   ========================================================= */


function obterPesosPerfilEscalacao(
  perfil
) {

  const chave =
    normalizarTextoEscalacao(
      perfil?.chave ??
      perfil?.nome ??
      perfil
    );


  if (
    chave.includes(
      "conserv"
    )
  ) {

    return {

      projecao: 0.26,

      piso: 0.24,

      teto: 0.06,

      confianca: 0.18,

      titularidade: 0.14,

      adequacao: 0.08,

      risco: -0.12,

      custoBeneficio: 0.06

    };

  }


  if (
    chave.includes(
      "agress"
    )
  ) {

    return {

      projecao: 0.30,

      piso: 0.05,

      teto: 0.27,

      confianca: 0.08,

      titularidade: 0.09,

      adequacao: 0.12,

      risco: 0.02,

      custoBeneficio: 0.05

    };

  }


  return {

    projecao: 0.32,

    piso: 0.14,

    teto: 0.14,

    confianca: 0.13,

    titularidade: 0.11,

    adequacao: 0.10,

    risco: -0.05,

    custoBeneficio: 0.07

  };

}


/* =========================================================
   NOTA DO JOGADOR
   ========================================================= */


function calcularCustoBeneficioEscalacao(
  jogador
) {

  const preco =
    obterPrecoJogadorEscalacao(
      jogador
    );


  const projecao =
    obterProjecaoJogadorEscalacao(
      jogador
    );


  if (
    preco <= 0
  ) {

    return projecao;

  }


  return projecao / preco;

}


function calcularNotaJogadorEscalacao(
  jogador,
  perfil
) {

  const pesos =
    obterPesosPerfilEscalacao(
      perfil
    );


  const projecao =
    obterProjecaoJogadorEscalacao(
      jogador
    );


  const piso =
    obterPisoJogadorEscalacao(
      jogador
    );


  const teto =
    obterTetoJogadorEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaJogadorEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeJogadorEscalacao(
      jogador
    );


  const adequacao =
    obterAdequacaoRodadaEscalacao(
      jogador
    );


  const risco =
    obterRiscoJogadorEscalacao(
      jogador
    );


  const custoBeneficio =
    calcularCustoBeneficioEscalacao(
      jogador
    );


  const nota =
    (
      projecao *
        pesos.projecao
    ) +
    (
      piso *
        pesos.piso
    ) +
    (
      teto *
        pesos.teto
    ) +
    (
      (
        confianca /
        10
      ) *
        pesos.confianca
    ) +
    (
      (
        titularidade /
        10
      ) *
        pesos.titularidade
    ) +
    (
      (
        adequacao /
        10
      ) *
        pesos.adequacao
    ) +
    (
      risco *
        pesos.risco
    ) +
    (
      custoBeneficio *
        pesos.custoBeneficio
    );


  return numeroEscalacao(
    nota
  );

}


/* =========================================================
   ORDENAÇÃO
   ========================================================= */


function ordenarJogadoresPerfilEscalacao(
  jogadores,
  perfil
) {

  return [
    ...jogadores
  ]
    .sort(
      (a, b) => {

        const notaA =
          calcularNotaJogadorEscalacao(
            a,
            perfil
          );


        const notaB =
          calcularNotaJogadorEscalacao(
            b,
            perfil
          );


        if (
          notaB !== notaA
        ) {

          return notaB - notaA;

        }


        const projecaoA =
          obterProjecaoJogadorEscalacao(
            a
          );


        const projecaoB =
          obterProjecaoJogadorEscalacao(
            b
          );


        if (
          projecaoB !==
          projecaoA
        ) {

          return (
            projecaoB -
            projecaoA
          );

        }


        return (
          obterPrecoJogadorEscalacao(
            a
          ) -
          obterPrecoJogadorEscalacao(
            b
          )
        );

      }
    );

}


/* =========================================================
   AGRUPAMENTO POR POSIÇÃO
   ========================================================= */


function agruparJogadoresPorPosicaoEscalacao(
  jogadores
) {

  const grupos = {

    GOL: [],

    LAT: [],

    ZAG: [],

    MEI: [],

    ATA: [],

    TEC: []

  };


  jogadores.forEach(
    jogador => {

      const posicao =
        obterPosicaoJogadorEscalacao(
          jogador
        );


      if (
        Array.isArray(
          grupos[posicao]
        )
      ) {

        grupos[posicao].push(
          jogador
        );

      }

    }
  );


  return grupos;

}


/* =========================================================
   VALIDAÇÃO DE FORMAÇÃO
   ========================================================= */


function obterEstruturaFormacaoEscalacao(
  formacao
) {

  return (
    FORMACOES_ESTRUTURA_ESCALACAO[
      formacao
    ] ??
    null
  );

}


function formacaoPossivelEscalacao(
  formacao,
  grupos
) {

  const estrutura =
    obterEstruturaFormacaoEscalacao(
      formacao
    );


  if (!estrutura) {

    return false;

  }


  return Object.entries(
    estrutura
  )
    .every(
      ([posicao, quantidade]) => {

        return (
          (
            grupos[posicao]
              ?.length ??
            0
          ) >= quantidade
        );

      }
    );

}


/* =========================================================
   CUSTO
   ========================================================= */


function calcularCustoListaEscalacao(
  jogadores
) {

  return arredondarEscalacao(
    jogadores.reduce(
      (
        total,
        jogador
      ) => {

        return (
          total +
          obterPrecoJogadorEscalacao(
            jogador
          )
        );

      },
      0
    ),
    2
  );

}



/* =========================================================
   ANTI-CONFLITO VALIDADO V1
   =========================================================
   Evita GOL/LAT/ZAG de um clube junto com MEI/ATA do
   adversário na mesma escalação. Regra promovida após
   torneio walk-forward reotimizado (baseline x penalidade
   x bloqueio). Não bloqueia MEI x MEI ou ATA x ATA.
   ========================================================= */

function obterAdversarioJogadorEscalacao(jogador) {
  return String(
    jogador?.siglaAdversario ??
    jogador?.adversarioSigla ??
    jogador?.adversario ??
    jogador?.clubeAdversario ??
    jogador?.adversarioId ??
    ""
  ).trim().toUpperCase();
}

function ehPosicaoDefensivaEscalacao(posicao) {
  return ["GOL", "LAT", "ZAG"].includes(String(posicao || "").toUpperCase());
}

function ehPosicaoOfensivaEscalacao(posicao) {
  return ["MEI", "ATA"].includes(String(posicao || "").toUpperCase());
}

function jogadoresConflitamEscalacao(a, b) {
  const clubeA = obterClubeJogadorEscalacao(a);
  const clubeB = obterClubeJogadorEscalacao(b);
  const advA = obterAdversarioJogadorEscalacao(a);
  const advB = obterAdversarioJogadorEscalacao(b);
  if (!clubeA || !clubeB || clubeA === clubeB) return false;
  const adversarios = advA === clubeB || advB === clubeA;
  if (!adversarios) return false;
  const posA = obterPosicaoJogadorEscalacao(a);
  const posB = obterPosicaoJogadorEscalacao(b);
  return (
    (ehPosicaoDefensivaEscalacao(posA) && ehPosicaoOfensivaEscalacao(posB)) ||
    (ehPosicaoDefensivaEscalacao(posB) && ehPosicaoOfensivaEscalacao(posA))
  );
}

function contarConflitosEscalacao(titulares) {
  let total = 0;
  for (let i = 0; i < titulares.length; i += 1) {
    for (let j = i + 1; j < titulares.length; j += 1) {
      if (jogadoresConflitamEscalacao(titulares[i], titulares[j])) total += 1;
    }
  }
  return total;
}

function respeitaLimiteClubesEscalacao(titulares, limite = 3) {
  const mapa = new Map();
  titulares.forEach(jogador => {
    const clube = obterClubeJogadorEscalacao(jogador);
    if (!clube) return;
    mapa.set(clube, (mapa.get(clube) || 0) + 1);
  });
  return [...mapa.values()].every(qtd => qtd <= limite);
}

function resolverConflitosEscalacao(titularesOriginais, grupos, perfil, patrimonio) {
  let titulares = titularesOriginais.map(copiarJogadorEscalacao);
  let ciclos = 0;

  while (contarConflitosEscalacao(titulares) > 0 && ciclos < 20) {
    ciclos += 1;
    const conflitosAntes = contarConflitosEscalacao(titulares);
    const idsAtuais = new Set(titulares.map(j => String(obterIdJogadorEscalacao(j))));
    let melhorTroca = null;

    titulares.forEach((titular, indice) => {
      const posicao = obterPosicaoJogadorEscalacao(titular);
      (grupos[posicao] || []).forEach(candidato => {
        const id = String(obterIdJogadorEscalacao(candidato));
        if (idsAtuais.has(id)) return;
        const teste = titulares.map(copiarJogadorEscalacao);
        teste[indice] = copiarJogadorEscalacao(candidato);
        if (calcularCustoListaEscalacao(teste) > patrimonio) return;
        if (!respeitaLimiteClubesEscalacao(teste, 3)) return;
        const conflitosDepois = contarConflitosEscalacao(teste);
        if (conflitosDepois >= conflitosAntes) return;

        const perdaNota =
          calcularNotaJogadorEscalacao(titular, perfil) -
          calcularNotaJogadorEscalacao(candidato, perfil);

        const troca = { indice, candidato, conflitosDepois, perdaNota };
        if (
          !melhorTroca ||
          troca.conflitosDepois < melhorTroca.conflitosDepois ||
          (
            troca.conflitosDepois === melhorTroca.conflitosDepois &&
            troca.perdaNota < melhorTroca.perdaNota
          )
        ) melhorTroca = troca;
      });
    });

    if (!melhorTroca) break;
    titulares[melhorTroca.indice] = copiarJogadorEscalacao(melhorTroca.candidato);
  }

  return titulares;
}

/* =========================================================
   SELEÇÃO INICIAL DE TITULARES
   ========================================================= */


function selecionarTitularesIniciaisEscalacao(
  grupos,
  estrutura,
  perfil
) {

  const titulares = [];


  Object.entries(
    estrutura
  )
    .forEach(
      ([posicao, quantidade]) => {

        if (
          quantidade <= 0
        ) {

          return;

        }


        const ordenados =
          ordenarJogadoresPerfilEscalacao(
            grupos[posicao] ?? [],
            perfil
          );


        titulares.push(
          ...ordenados
            .slice(
              0,
              quantidade
            )
            .map(
              copiarJogadorEscalacao
            )
        );

      }
    );


  return titulares;

}


/* =========================================================
   OTIMIZAÇÃO POR PATRIMÔNIO
   ========================================================= */


function obterJogadoresForaDaEscalacao(
  jogadores,
  titulares
) {

  const idsTitulares =
    new Set(
      titulares.map(
        jogador =>
          String(
            obterIdJogadorEscalacao(
              jogador
            )
          )
      )
    );


  return jogadores.filter(
    jogador => {

      return !idsTitulares.has(
        String(
          obterIdJogadorEscalacao(
            jogador
          )
        )
      );

    }
  );

}


function encontrarSubstituicaoEconomicaEscalacao(
  titulares,
  grupos,
  perfil
) {

  let melhorTroca =
    null;


  titulares.forEach(
    titular => {

      const posicao =
        obterPosicaoJogadorEscalacao(
          titular
        );


      const precoTitular =
        obterPrecoJogadorEscalacao(
          titular
        );


      const idTitular =
        String(
          obterIdJogadorEscalacao(
            titular
          )
        );


      const idsAtuais =
        new Set(
          titulares.map(
            jogador =>
              String(
                obterIdJogadorEscalacao(
                  jogador
                )
              )
          )
        );


      const candidatos =
        (
          grupos[posicao] ??
          []
        )
          .filter(
            candidato => {

              const id =
                String(
                  obterIdJogadorEscalacao(
                    candidato
                  )
                );


              if (
                id === idTitular ||
                idsAtuais.has(id)
              ) {

                return false;

              }


              return (
                obterPrecoJogadorEscalacao(
                  candidato
                ) <
                precoTitular
              );

            }
          );


      candidatos.forEach(
        candidato => {

          const economia =
            precoTitular -
            obterPrecoJogadorEscalacao(
              candidato
            );


          if (
            economia <= 0
          ) {

            return;

          }


          const perdaNota =
            calcularNotaJogadorEscalacao(
              titular,
              perfil
            ) -
            calcularNotaJogadorEscalacao(
              candidato,
              perfil
            );


          const eficiencia =
            perdaNota /
            economia;


          const troca = {

            titular,

            candidato,

            economia,

            perdaNota,

            eficiencia

          };


          if (
            !melhorTroca
          ) {

            melhorTroca =
              troca;

            return;

          }


          if (
            troca.eficiencia <
            melhorTroca.eficiencia
          ) {

            melhorTroca =
              troca;

            return;

          }


          if (
            troca.eficiencia ===
              melhorTroca.eficiencia &&
            troca.economia >
              melhorTroca.economia
          ) {

            melhorTroca =
              troca;

          }

        }
      );

    }
  );


  return melhorTroca;

}


function ajustarTitularesAoPatrimonioEscalacao(
  titularesOriginais,
  grupos,
  perfil,
  patrimonio
) {

  let titulares =
    titularesOriginais.map(
      copiarJogadorEscalacao
    );


  let custo =
    calcularCustoListaEscalacao(
      titulares
    );


  let seguranca =
    0;


  while (
    custo >
      patrimonio &&
    seguranca <
      100
  ) {

    seguranca += 1;


    const troca =
      encontrarSubstituicaoEconomicaEscalacao(
        titulares,
        grupos,
        perfil
      );


    if (!troca) {

      return null;

    }


    const idTitular =
      String(
        obterIdJogadorEscalacao(
          troca.titular
        )
      );


    titulares =
      titulares.map(
        jogador => {

          if (
            String(
              obterIdJogadorEscalacao(
                jogador
              )
            ) ===
            idTitular
          ) {

            return copiarJogadorEscalacao(
              troca.candidato
            );

          }


          return jogador;

        }
      );


    custo =
      calcularCustoListaEscalacao(
        titulares
      );

  }


  if (
    custo >
    patrimonio
  ) {

    return null;

  }


  return titulares;

}


/* =========================================================
   TENTATIVA DE MELHORIA DO TIME
   ========================================================= */


function melhorarTitularesComSaldoEscalacao(
  titularesOriginais,
  grupos,
  perfil,
  patrimonio
) {

  let titulares =
    titularesOriginais.map(
      copiarJogadorEscalacao
    );


  let alterou =
    true;


  let ciclos =
    0;


  while (
    alterou &&
    ciclos <
      25
  ) {

    ciclos += 1;

    alterou =
      false;


    const custoAtual =
      calcularCustoListaEscalacao(
        titulares
      );


    const idsAtuais =
      new Set(
        titulares.map(
          jogador =>
            String(
              obterIdJogadorEscalacao(
                jogador
              )
            )
        )
      );


    let melhorMelhoria =
      null;


    titulares.forEach(
      titular => {

        const posicao =
          obterPosicaoJogadorEscalacao(
            titular
          );


        const notaAtual =
          calcularNotaJogadorEscalacao(
            titular,
            perfil
          );


        const precoAtual =
          obterPrecoJogadorEscalacao(
            titular
          );


        (
          grupos[posicao] ??
          []
        )
          .forEach(
            candidato => {

              const idCandidato =
                String(
                  obterIdJogadorEscalacao(
                    candidato
                  )
                );


              if (
                idsAtuais.has(
                  idCandidato
                )
              ) {

                return;

              }


              const notaNova =
                calcularNotaJogadorEscalacao(
                  candidato,
                  perfil
                );


              if (
                notaNova <=
                notaAtual
              ) {

                return;

              }


              const precoNovo =
                obterPrecoJogadorEscalacao(
                  candidato
                );


              const novoCusto =
                custoAtual -
                precoAtual +
                precoNovo;


              if (
                novoCusto >
                patrimonio
              ) {

                return;

              }


              const ganho =
                notaNova -
                notaAtual;


              const aumentoCusto =
                Math.max(
                  0.01,
                  precoNovo -
                  precoAtual
                );


              const eficiencia =
                ganho /
                aumentoCusto;


              const melhoria = {

                titular,

                candidato,

                ganho,

                novoCusto,

                eficiencia

              };


              if (
                !melhorMelhoria ||
                melhoria.ganho >
                  melhorMelhoria.ganho ||
                (
                  melhoria.ganho ===
                    melhorMelhoria.ganho &&
                  melhoria.eficiencia >
                    melhorMelhoria.eficiencia
                )
              ) {

                melhorMelhoria =
                  melhoria;

              }

            }
          );

      }
    );


    if (
      melhorMelhoria
    ) {

      const idTitular =
        String(
          obterIdJogadorEscalacao(
            melhorMelhoria.titular
          )
        );


      titulares =
        titulares.map(
          jogador => {

            if (
              String(
                obterIdJogadorEscalacao(
                  jogador
                )
              ) ===
              idTitular
            ) {

              return copiarJogadorEscalacao(
                melhorMelhoria.candidato
              );

            }


            return jogador;

          }
        );


      alterou =
        true;

    }

  }


  return titulares;

}


/* =========================================================
   MONTA TITULARES
   ========================================================= */


function montarTitularesFormacaoEscalacao(
  jogadores,
  formacao,
  perfil,
  patrimonio
) {

  const grupos =
    agruparJogadoresPorPosicaoEscalacao(
      jogadores
    );


  const estrutura =
    obterEstruturaFormacaoEscalacao(
      formacao
    );


  if (
    !estrutura ||
    !formacaoPossivelEscalacao(
      formacao,
      grupos
    )
  ) {

    return null;

  }


  const iniciais =
    selecionarTitularesIniciaisEscalacao(
      grupos,
      estrutura,
      perfil
    );


  const ajustados =
    ajustarTitularesAoPatrimonioEscalacao(
      iniciais,
      grupos,
      perfil,
      patrimonio
    );


  if (!ajustados) {

    return null;

  }


  const melhorados =
    melhorarTitularesComSaldoEscalacao(
      ajustados,
      grupos,
      perfil,
      patrimonio
    );


  const semConflitos =
    resolverConflitosEscalacao(
      melhorados,
      grupos,
      perfil,
      patrimonio
    );


  const custo =
    calcularCustoListaEscalacao(
      semConflitos
    );


  if (
    custo >
    patrimonio
  ) {

    return null;

  }


  return semConflitos;

}


/* =========================================================
   MÉTRICAS DA ESCALAÇÃO
   ========================================================= */


function somarMetricaEscalacao(
  jogadores,
  obterValor
) {

  return jogadores.reduce(
    (
      total,
      jogador
    ) => {

      return (
        total +
        numeroEscalacao(
          obterValor(
            jogador
          )
        )
      );

    },
    0
  );

}


function calcularProjecaoEscalacao(
  titulares
) {

  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterProjecaoJogadorEscalacao
    ),
    1
  );

}


function calcularPisoEscalacao(
  titulares
) {

  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterPisoJogadorEscalacao
    ),
    1
  );

}


function calcularTetoEscalacao(
  titulares
) {

  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterTetoJogadorEscalacao
    ),
    1
  );

}


function calcularConfiancaEscalacao(
  titulares
) {

  if (
    titulares.length === 0
  ) {

    return 0;

  }


  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterConfiancaJogadorEscalacao
    ) /
    titulares.length,
    0
  );

}


function calcularRiscoEscalacao(
  titulares
) {

  if (
    titulares.length === 0
  ) {

    return 0;

  }


  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterRiscoJogadorEscalacao
    ) /
    titulares.length,
    1
  );

}


function calcularTitularidadeMediaEscalacao(
  titulares
) {

  if (
    titulares.length === 0
  ) {

    return 0;

  }


  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterTitularidadeJogadorEscalacao
    ) /
    titulares.length,
    0
  );

}


function calcularAdequacaoMediaEscalacao(
  titulares
) {

  if (
    titulares.length === 0
  ) {

    return 0;

  }


  return arredondarEscalacao(
    somarMetricaEscalacao(
      titulares,
      obterAdequacaoRodadaEscalacao
    ) /
    titulares.length,
    0
  );

}


/* =========================================================
   NOTA DA ESCALAÇÃO
   ========================================================= */


function calcularNotaEscalacao(
  titulares,
  perfil
) {

  return titulares.reduce(
    (
      total,
      jogador
    ) => {

      return (
        total +
        calcularNotaJogadorEscalacao(
          jogador,
          perfil
        )
      );

    },
    0
  );

}


/* =========================================================
   CAPITÃO
   ========================================================= */


function calcularNotaCapitaoEscalacao(
  jogador,
  perfil
) {

  const chave =
    normalizarTextoEscalacao(
      perfil?.chave ??
      perfil?.nome
    );


  const projecao =
    obterProjecaoJogadorEscalacao(
      jogador
    );


  const piso =
    obterPisoJogadorEscalacao(
      jogador
    );


  const teto =
    obterTetoJogadorEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaJogadorEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeJogadorEscalacao(
      jogador
    );


  const adequacao =
    obterAdequacaoRodadaEscalacao(
      jogador
    );


  const risco =
    obterRiscoJogadorEscalacao(
      jogador
    );


  if (
    chave.includes(
      "conserv"
    )
  ) {

    return (
      projecao * 0.30 +
      piso * 0.25 +
      teto * 0.10 +
      confianca * 0.08 +
      titularidade * 0.08 +
      adequacao * 0.05 -
      risco * 0.12
    );

  }


  if (
    chave.includes(
      "agress"
    )
  ) {

    return (
      projecao * 0.32 +
      teto * 0.34 +
      piso * 0.04 +
      confianca * 0.05 +
      titularidade * 0.05 +
      adequacao * 0.12 +
      risco * 0.02
    );

  }


  return (
    projecao * 0.36 +
    piso * 0.12 +
    teto * 0.22 +
    confianca * 0.07 +
    titularidade * 0.07 +
    adequacao * 0.10 -
    risco * 0.05
  );

}


function selecionarCapitaoEscalacao(
  titulares,
  perfil
) {

  if (
    !Array.isArray(
      titulares
    ) ||
    titulares.length === 0
  ) {

    return null;

  }


  const candidatos =
    titulares.filter(
      jogador => {

        return (
          obterPosicaoJogadorEscalacao(
            jogador
          ) !==
          "TEC"
        );

      }
    );


  if (
    candidatos.length === 0
  ) {

    return null;

  }


  const ordenados =
    [
      ...candidatos
    ]
      .sort(
        (a, b) => {

          return (
            calcularNotaCapitaoEscalacao(
              b,
              perfil
            ) -
            calcularNotaCapitaoEscalacao(
              a,
              perfil
            )
          );

        }
      );


  const capitao =
    copiarJogadorEscalacao(
      ordenados[0]
    );


  capitao.justificativaCapitao =
    gerarJustificativaCapitaoEscalacao(
      capitao
    );


  return capitao;

}


function gerarJustificativaCapitaoEscalacao(
  jogador
) {

  const projecao =
    arredondarEscalacao(
      obterProjecaoJogadorEscalacao(
        jogador
      ),
      1
    );


  const teto =
    arredondarEscalacao(
      obterTetoJogadorEscalacao(
        jogador
      ),
      1
    );


  const confianca =
    arredondarEscalacao(
      obterConfiancaJogadorEscalacao(
        jogador
      ),
      0
    );


  const titularidade =
    arredondarEscalacao(
      obterTitularidadeJogadorEscalacao(
        jogador
      ),
      0
    );


  const adequacao =
    arredondarEscalacao(
      obterAdequacaoRodadaEscalacao(
        jogador
      ),
      0
    );


  return (
    `Escolhido como capitão por combinar projeção de ${projecao} pontos, ` +
    `teto de ${teto}, confiança de ${confianca}%, ` +
    `titularidade estimada em ${titularidade}%` +
    (
      adequacao > 50
        ? ", boa adequação ao confronto da rodada."
        : "."
    )
  );

}


/* =========================================================
   BANCO — REGRA DE PREÇO
   ========================================================= */


/*
 * REGRA:
 *
 * O banco NÃO consome patrimônio.
 *
 * Para cada posição existente entre os titulares,
 * o preço máximo permitido para o reserva é o preço
 * do TITULAR MAIS BARATO daquela mesma posição.
 *
 * Exemplo:
 *
 * LAT titulares:
 * C$ 10,00
 * C$ 7,00
 *
 * Reserva LAT:
 * preço máximo = C$ 7,00.
 *
 * O técnico não possui reserva.
 *
 * Se a formação não possui determinada posição,
 * como LAT na 3-4-3, não criamos reserva artificial
 * daquela posição.
 */


function obterLimitePrecoReservaPosicaoEscalacao(
  titulares,
  posicao
) {

  const titularesPosicao =
    titulares.filter(
      jogador => {

        return (
          obterPosicaoJogadorEscalacao(
            jogador
          ) ===
          posicao
        );

      }
    );


  if (
    titularesPosicao.length === 0
  ) {

    return null;

  }


  const precos =
    titularesPosicao
      .map(
        obterPrecoJogadorEscalacao
      )
      .filter(
        preco =>
          Number.isFinite(preco) &&
          preco >= 0
      );


  if (
    precos.length === 0
  ) {

    return null;

  }


  return Math.min(
    ...precos
  );

}


/* =========================================================
   BANCO — POSIÇÕES NECESSÁRIAS
   ========================================================= */


function obterPosicoesBancoEscalacao(
  titulares
) {

  const posicoesTitulares =
    new Set(
      titulares
        .map(
          obterPosicaoJogadorEscalacao
        )
        .filter(
          posicao =>
            posicao &&
            posicao !==
              "TEC"
        )
    );


  return POSICOES_BANCO.filter(
    posicao =>
      posicoesTitulares.has(
        posicao
      )
  );

}


/* =========================================================
   BANCO — NOTA DO RESERVA
   ========================================================= */


function calcularNotaReservaEscalacao(
  jogador,
  perfil
) {

  const notaPerfil =
    calcularNotaJogadorEscalacao(
      jogador,
      perfil
    );


  const titularidade =
    obterTitularidadeJogadorEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaJogadorEscalacao(
      jogador
    );


  const projecao =
    obterProjecaoJogadorEscalacao(
      jogador
    );


  const piso =
    obterPisoJogadorEscalacao(
      jogador
    );


  /*
   * Para o banco valorizamos:
   *
   * - qualidade estatística;
   * - chance real de jogar;
   * - segurança;
   *
   * Não escolhemos simplesmente
   * o jogador mais barato.
   */

  return (
    notaPerfil +
    projecao * 0.18 +
    piso * 0.08 +
    titularidade * 0.035 +
    confianca * 0.02
  );

}


/* =========================================================
   BANCO — CANDIDATOS
   ========================================================= */


function obterCandidatosReservaPosicaoEscalacao(
  jogadores,
  titulares,
  posicao,
  perfil
) {

  const limitePreco =
    obterLimitePrecoReservaPosicaoEscalacao(
      titulares,
      posicao
    );


  if (
    limitePreco === null
  ) {

    return [];

  }


  const idsTitulares =
    new Set(
      titulares.map(
        jogador =>
          String(
            obterIdJogadorEscalacao(
              jogador
            )
          )
      )
    );


  return jogadores
    .filter(
      jogador => {

        if (
          obterPosicaoJogadorEscalacao(
            jogador
          ) !==
          posicao
        ) {

          return false;

        }


        const id =
          String(
            obterIdJogadorEscalacao(
              jogador
            )
          );


        if (
          idsTitulares.has(id)
        ) {

          return false;

        }


        const preco =
          obterPrecoJogadorEscalacao(
            jogador
          );


        /*
         * Igual ou menor que o
         * titular mais barato.
         */

        if (
          preco >
          limitePreco
        ) {

          return false;

        }


        return jogadorDisponivelEscalacao(
          jogador
        );

      }
    )
    .sort(
      (a, b) => {

        const notaA =
          calcularNotaReservaEscalacao(
            a,
            perfil
          );


        const notaB =
          calcularNotaReservaEscalacao(
            b,
            perfil
          );


        if (
          notaB !== notaA
        ) {

          return notaB - notaA;

        }


        return (
          obterPrecoJogadorEscalacao(
            b
          ) -
          obterPrecoJogadorEscalacao(
            a
          )
        );

      }
    );

}


/* =========================================================
   BANCO — MONTAGEM
   ========================================================= */


function montarBancoEscalacao(
  jogadores,
  titulares,
  perfil
) {

  const banco = [];


  const posicoes =
    obterPosicoesBancoEscalacao(
      titulares
    );


  const idsUtilizados =
    new Set(
      titulares.map(
        jogador =>
          String(
            obterIdJogadorEscalacao(
              jogador
            )
          )
      )
    );


  posicoes.forEach(
    posicao => {

      const candidatos =
        obterCandidatosReservaPosicaoEscalacao(
          jogadores,
          titulares,
          posicao,
          perfil
        )
          .filter(
            jogador => {

              return !idsUtilizados.has(
                String(
                  obterIdJogadorEscalacao(
                    jogador
                  )
                )
              );

            }
          );


      if (
        candidatos.length === 0
      ) {

        return;

      }


      const reserva =
        copiarJogadorEscalacao(
          candidatos[0]
        );


      reserva.limitePrecoReserva =
        obterLimitePrecoReservaPosicaoEscalacao(
          titulares,
          posicao
        );


      reserva.justificativaReserva =
        gerarJustificativaReservaEscalacao(
          reserva,
          posicao,
          reserva.limitePrecoReserva
        );


      banco.push(
        reserva
      );


      idsUtilizados.add(
        String(
          obterIdJogadorEscalacao(
            reserva
          )
        )
      );

    }
  );


  return banco;

}


function gerarJustificativaReservaEscalacao(
  jogador,
  posicao,
  limitePreco
) {

  const projecao =
    arredondarEscalacao(
      obterProjecaoJogadorEscalacao(
        jogador
      ),
      1
    );


  const preco =
    arredondarEscalacao(
      obterPrecoJogadorEscalacao(
        jogador
      ),
      2
    );


  const titularidade =
    arredondarEscalacao(
      obterTitularidadeJogadorEscalacao(
        jogador
      ),
      0
    );


  return (
    `Reserva de ${posicao} selecionado com projeção de ${projecao} pontos, ` +
    `titularidade estimada em ${titularidade}% e preço de C$ ${preco.toFixed(2)}, ` +
    `respeitando o limite de C$ ${numeroEscalacao(limitePreco).toFixed(2)} ` +
    `definido pelo titular mais barato da posição.`
  );

}


/* =========================================================
   VALIDAÇÃO DO BANCO
   ========================================================= */


function validarBancoEscalacao(
  banco,
  titulares
) {

  const posicoesNecessarias =
    obterPosicoesBancoEscalacao(
      titulares
    );


  const posicoesBanco =
    banco.map(
      obterPosicaoJogadorEscalacao
    );


  const todasPosicoesPresentes =
    posicoesNecessarias.every(
      posicao =>
        posicoesBanco.includes(
          posicao
        )
    );


  if (
    !todasPosicoesPresentes
  ) {

    return false;

  }


  return banco.every(
    reserva => {

      const posicao =
        obterPosicaoJogadorEscalacao(
          reserva
        );


      const limite =
        obterLimitePrecoReservaPosicaoEscalacao(
          titulares,
          posicao
        );


      if (
        limite === null
      ) {

        return false;

      }


      return (
        obterPrecoJogadorEscalacao(
          reserva
        ) <=
        limite
      );

    }
  );

}


/* =========================================================
   RESERVA DE LUXO
   ========================================================= */


function calcularNotaReservaLuxoEscalacao(
  jogador,
  perfil
) {

  const projecao =
    obterProjecaoJogadorEscalacao(
      jogador
    );


  const piso =
    obterPisoJogadorEscalacao(
      jogador
    );


  const teto =
    obterTetoJogadorEscalacao(
      jogador
    );


  const confianca =
    obterConfiancaJogadorEscalacao(
      jogador
    );


  const titularidade =
    obterTitularidadeJogadorEscalacao(
      jogador
    );


  const adequacao =
    obterAdequacaoRodadaEscalacao(
      jogador
    );


  const risco =
    obterRiscoJogadorEscalacao(
      jogador
    );


  return (
    calcularNotaJogadorEscalacao(
      jogador,
      perfil
    ) * 0.35 +
    projecao * 0.28 +
    piso * 0.10 +
    teto * 0.15 +
    confianca * 0.025 +
    titularidade * 0.03 +
    adequacao * 0.025 -
    risco * 0.04
  );

}


function selecionarReservaLuxoEscalacao(
  banco,
  perfil
) {

  if (
    !Array.isArray(
      banco
    ) ||
    banco.length === 0
  ) {

    return null;

  }


  const ordenados =
    [
      ...banco
    ]
      .sort(
        (a, b) => {

          return (
            calcularNotaReservaLuxoEscalacao(
              b,
              perfil
            ) -
            calcularNotaReservaLuxoEscalacao(
              a,
              perfil
            )
          );

        }
      );


  const reserva =
    copiarJogadorEscalacao(
      ordenados[0]
    );


  reserva.justificativaReservaLuxo =
    gerarJustificativaReservaLuxoEscalacao(
      reserva
    );


  return reserva;

}


function gerarJustificativaReservaLuxoEscalacao(
  jogador
) {

  const projecao =
    arredondarEscalacao(
      obterProjecaoJogadorEscalacao(
        jogador
      ),
      1
    );


  const piso =
    arredondarEscalacao(
      obterPisoJogadorEscalacao(
        jogador
      ),
      1
    );


  const confianca =
    arredondarEscalacao(
      obterConfiancaJogadorEscalacao(
        jogador
      ),
      0
    );


  const titularidade =
    arredondarEscalacao(
      obterTitularidadeJogadorEscalacao(
        jogador
      ),
      0
    );


  const adequacao =
    arredondarEscalacao(
      obterAdequacaoRodadaEscalacao(
        jogador
      ),
      0
    );


  return (
    `Reserva de Luxo escolhida pela combinação de projeção de ${projecao} pontos, ` +
    `piso de ${piso}, confiança de ${confianca}%, ` +
    `titularidade estimada em ${titularidade}%` +
    (
      adequacao > 50
        ? ", boa adequação à rodada."
        : "."
    )
  );

}

/* =========================================================
   JUSTIFICATIVA DO JOGADOR TITULAR
   ========================================================= */


function gerarJustificativaJogadorEscalacao(
  jogador,
  perfil
) {

  const projecao =
    arredondarEscalacao(
      obterProjecaoJogadorEscalacao(
        jogador
      ),
      1
    );


  const piso =
    arredondarEscalacao(
      obterPisoJogadorEscalacao(
        jogador
      ),
      1
    );


  const teto =
    arredondarEscalacao(
      obterTetoJogadorEscalacao(
        jogador
      ),
      1
    );


  const confianca =
    arredondarEscalacao(
      obterConfiancaJogadorEscalacao(
        jogador
      ),
      0
    );


  const titularidade =
    arredondarEscalacao(
      obterTitularidadeJogadorEscalacao(
        jogador
      ),
      0
    );


  const adequacao =
    arredondarEscalacao(
      obterAdequacaoRodadaEscalacao(
        jogador
      ),
      0
    );


  const risco =
    arredondarEscalacao(
      obterRiscoJogadorEscalacao(
        jogador
      ),
      1
    );


  const chavePerfil =
    normalizarTextoEscalacao(
      perfil?.chave ??
      perfil?.nome
    );


  const motivos = [];


  if (
    projecao >= 6
  ) {

    motivos.push(
      `boa projeção (${projecao})`
    );

  }


  if (
    piso >= 3
  ) {

    motivos.push(
      `piso interessante (${piso})`
    );

  }


  if (
    teto >= 10
  ) {

    motivos.push(
      `teto elevado (${teto})`
    );

  }


  if (
    confianca >= 70
  ) {

    motivos.push(
      `confiança de ${confianca}%`
    );

  }


  if (
    titularidade >= 80
  ) {

    motivos.push(
      `alta chance de titularidade (${titularidade}%)`
    );

  }


  if (
    adequacao >= 60
  ) {

    motivos.push(
      `boa adequação à rodada`
    );

  }


  if (
    chavePerfil.includes(
      "conserv"
    ) &&
    risco <= 4
  ) {

    motivos.push(
      `risco controlado`
    );

  }


  if (
    chavePerfil.includes(
      "agress"
    ) &&
    teto >= 8
  ) {

    motivos.push(
      `potencial de explosão`
    );

  }


  if (
    motivos.length === 0
  ) {

    motivos.push(
      `melhor combinação estatística disponível para a posição`
    );

  }


  return (
    `Selecionado pelo modelo ${perfil?.nome ?? ""}: ` +
    motivos
      .slice(
        0,
        4
      )
      .join(", ") +
    "."
  );

}


/* =========================================================
   ENRIQUECIMENTO DOS TITULARES
   ========================================================= */


function enriquecerTitularesEscalacao(
  titulares,
  perfil
) {

  return titulares.map(
    jogador => {

      const copia =
        copiarJogadorEscalacao(
          jogador
        );


      copia.notaEscalacao =
        arredondarEscalacao(
          calcularNotaJogadorEscalacao(
            copia,
            perfil
          ),
          3
        );


      copia.justificativa =
        gerarJustificativaJogadorEscalacao(
          copia,
          perfil
        );


      return copia;

    }
  );

}


/* =========================================================
   VALIDAÇÃO DOS TITULARES
   ========================================================= */


function validarQuantidadeTitularesEscalacao(
  titulares,
  formacao
) {

  const estrutura =
    obterEstruturaFormacaoEscalacao(
      formacao
    );


  if (
    !estrutura ||
    !Array.isArray(
      titulares
    )
  ) {

    return false;

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

    return false;

  }


  return Object.entries(
    estrutura
  )
    .every(
      ([posicao, quantidade]) => {

        const encontrados =
          titulares.filter(
            jogador =>
              obterPosicaoJogadorEscalacao(
                jogador
              ) ===
              posicao
          )
            .length;


        return (
          encontrados ===
          quantidade
        );

      }
    );

}


/* =========================================================
   VALIDAÇÃO DE JOGADORES REPETIDOS
   ========================================================= */


function validarJogadoresUnicosEscalacao(
  titulares,
  banco = []
) {

  const todos = [
    ...titulares,
    ...banco
  ];


  const ids =
    todos.map(
      jogador =>
        String(
          obterIdJogadorEscalacao(
            jogador
          )
        )
    );


  return (
    new Set(
      ids
    ).size ===
    ids.length
  );

}


/* =========================================================
   VALIDAÇÃO DO PATRIMÔNIO
   ========================================================= */


function validarPatrimonioEscalacao(
  titulares,
  patrimonio
) {

  /*
   * IMPORTANTE:
   *
   * O patrimônio é validado SOMENTE
   * sobre titulares + técnico.
   *
   * Banco não entra nessa conta.
   */

  const custoTitulares =
    calcularCustoListaEscalacao(
      titulares
    );


  return (
    custoTitulares <=
    patrimonio + 0.001
  );

}


/* =========================================================
   VALIDAÇÃO COMPLETA DA ESCALAÇÃO
   ========================================================= */


function validarEscalacaoMontada(
  escalacao
) {

  if (
    !escalacao ||
    typeof escalacao !==
      "object"
  ) {

    return false;

  }


  const titulares =
    Array.isArray(
      escalacao.titulares
    )
      ? escalacao.titulares
      : [];


  const banco =
    Array.isArray(
      escalacao.banco
    )
      ? escalacao.banco
      : [];


  if (
    !validarQuantidadeTitularesEscalacao(
      titulares,
      escalacao.formacao
    )
  ) {

    return false;

  }


  if (
    !validarPatrimonioEscalacao(
      titulares,
      escalacao.limitePatrimonio
    )
  ) {

    return false;

  }


  if (
    !validarJogadoresUnicosEscalacao(
      titulares,
      banco
    )
  ) {

    return false;

  }


  if (
    !validarBancoEscalacao(
      banco,
      titulares
    )
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   PONTOS POSITIVOS DA ESCALAÇÃO
   ========================================================= */


function gerarPontosPositivosEscalacao(
  escalacao
) {

  const pontos = [];


  if (
    escalacao.confianca >=
    70
  ) {

    pontos.push(
      "Alta confiança média"
    );

  }


  if (
    escalacao.titularidadeMedia >=
    85
  ) {

    pontos.push(
      "Boa segurança de titularidade"
    );

  }


  if (
    escalacao.adequacaoMedia >=
    60
  ) {

    pontos.push(
      "Boa adequação à rodada"
    );

  }


  if (
    escalacao.saldo >=
    0
  ) {

    pontos.push(
      "Dentro do patrimônio informado"
    );

  }


  if (
    escalacao.bancoCompleto
  ) {

    pontos.push(
      "Banco completo para a formação"
    );

  }


  if (
    escalacao.teto >
    escalacao.projecao * 1.3
  ) {

    pontos.push(
      "Bom potencial de teto"
    );

  }


  return pontos;

}


/* =========================================================
   PONTOS DE ATENÇÃO
   ========================================================= */


function gerarPontosAtencaoEscalacao(
  escalacao
) {

  const pontos = [];


  if (
    escalacao.confianca <
    60
  ) {

    pontos.push(
      "Confiança média abaixo do ideal"
    );

  }


  if (
    escalacao.titularidadeMedia <
    75
  ) {

    pontos.push(
      "Há jogadores com maior risco de não iniciar"
    );

  }


  if (
    escalacao.risco >=
    6
  ) {

    pontos.push(
      "Escalação com volatilidade elevada"
    );

  }


  if (
    !escalacao.bancoCompleto
  ) {

    pontos.push(
      "Não foi possível preencher todo o banco respeitando a regra de preço"
    );

  }


  if (
    escalacao.saldo <
    0
  ) {

    pontos.push(
      "Escalação acima do patrimônio"
    );

  }


  return pontos;

}


/* =========================================================
   DESCRIÇÃO DA ESTRATÉGIA
   ========================================================= */


function gerarDescricaoEscalacao(
  perfil,
  formacao,
  patrimonio
) {

  const chave =
    normalizarTextoEscalacao(
      perfil?.chave ??
      perfil?.nome
    );


  if (
    chave.includes(
      "conserv"
    )
  ) {

    return (
      `Formação ${formacao} escolhida pelo perfil Conservador, ` +
      `priorizando segurança, piso, confiança e titularidade, ` +
      `com patrimônio de C$ ${numeroEscalacao(patrimonio).toFixed(2)}.`
    );

  }


  if (
    chave.includes(
      "agress"
    )
  ) {

    return (
      `Formação ${formacao} escolhida pelo perfil Agressivo, ` +
      `priorizando projeção, teto e potencial de explosão, ` +
      `com patrimônio de C$ ${numeroEscalacao(patrimonio).toFixed(2)}.`
    );

  }


  return (
    `Formação ${formacao} escolhida pelo perfil Equilibrado, ` +
    `combinando projeção, segurança, teto e custo-benefício, ` +
    `com patrimônio de C$ ${numeroEscalacao(patrimonio).toFixed(2)}.`
  );

}


/* =========================================================
   MONTA UMA FORMAÇÃO COMPLETA
   ========================================================= */


function montarFormacaoEscalacao(
  jogadores,
  perfil,
  formacao,
  patrimonio
) {

  const titularesBrutos =
    montarTitularesFormacaoEscalacao(
      jogadores,
      formacao,
      perfil,
      patrimonio
    );


  if (
    !Array.isArray(
      titularesBrutos
    ) ||
    titularesBrutos.length === 0
  ) {

    return null;

  }


  if (
    !validarQuantidadeTitularesEscalacao(
      titularesBrutos,
      formacao
    )
  ) {

    return null;

  }


  const titulares =
    enriquecerTitularesEscalacao(
      titularesBrutos,
      perfil
    );


  const custoTitulares =
    calcularCustoListaEscalacao(
      titulares
    );


  if (
    custoTitulares >
    patrimonio
  ) {

    return null;

  }


  /*
   * O banco é montado DEPOIS dos titulares.
   *
   * Ele NÃO recebe saldo de patrimônio,
   * porque não consome cartoletas.
   */

  const banco =
    montarBancoEscalacao(
      jogadores,
      titulares,
      perfil
    );


  const custoBanco =
    calcularCustoListaEscalacao(
      banco
    );


  const posicoesBanco =
    obterPosicoesBancoEscalacao(
      titulares
    );


  const bancoCompleto =
    (
      banco.length ===
      posicoesBanco.length
    ) &&
    validarBancoEscalacao(
      banco,
      titulares
    );


  const capitao =
    selecionarCapitaoEscalacao(
      titulares,
      perfil
    );


  const reservaLuxo =
    selecionarReservaLuxoEscalacao(
      banco,
      perfil
    );


  const projecao =
    calcularProjecaoEscalacao(
      titulares
    );


  const piso =
    calcularPisoEscalacao(
      titulares
    );


  const teto =
    calcularTetoEscalacao(
      titulares
    );


  const confianca =
    calcularConfiancaEscalacao(
      titulares
    );


  const risco =
    calcularRiscoEscalacao(
      titulares
    );


  const titularidadeMedia =
    calcularTitularidadeMediaEscalacao(
      titulares
    );


  const adequacaoMedia =
    calcularAdequacaoMediaEscalacao(
      titulares
    );


  const notaModelo =
    arredondarEscalacao(
      calcularNotaEscalacao(
        titulares,
        perfil
      ),
      3
    );


  /*
   * custoTotal é mantido por compatibilidade
   * visual, mas NÃO é usado para validar
   * patrimônio.
   */

  const custoTotal =
    arredondarEscalacao(
      custoTitulares +
      custoBanco,
      2
    );


  const saldo =
    arredondarEscalacao(
      patrimonio -
      custoTitulares,
      2
    );


  const escalacao = {

    perfil:
      perfil.nome,

    perfilChave:
      perfil.chave,

    estrategia:
      perfil.estrategia,

    descricaoPerfil:
      perfil.descricao,

    formacao,

    titulares,

    jogadores:
      titulares.map(
        copiarJogadorEscalacao
      ),

    banco,

    capitao,

    reservaLuxo,

    projecao,

    projecaoTotal:
      projecao,

    piso,

    teto,

    confianca,

    risco,

    titularidadeMedia,

    adequacaoMedia,

    notaModelo,

    limitePatrimonio:
      arredondarEscalacao(
        patrimonio,
        2
      ),

    patrimonio:
      arredondarEscalacao(
        patrimonio,
        2
      ),

    custo:
      custoTitulares,

    custoTitulares,

    custoBanco,

    custoTotal,

    /*
     * saldo considera apenas o custo
     * dos titulares + técnico.
     */

    saldo,

    bancoCompleto,

    quantidadeReservas:
      banco.length,

    quantidadeReservasEsperada:
      posicoesBanco.length,

    posicoesBanco:
      [
        ...posicoesBanco
      ],

    descricao:
      gerarDescricaoEscalacao(
        perfil,
        formacao,
        patrimonio
      ),

    pontosPositivos: [],

    pontosAtencao: []

  };


  escalacao.pontosPositivos =
    gerarPontosPositivosEscalacao(
      escalacao
    );


  escalacao.pontosAtencao =
    gerarPontosAtencaoEscalacao(
      escalacao
    );


  return escalacao;

}


/* =========================================================
   COMPARAÇÃO ENTRE FORMAÇÕES
   ========================================================= */


function calcularNotaComparacaoFormacaoEscalacao(
  escalacao,
  perfil
) {

  if (!escalacao) {

    return -Infinity;

  }


  const chave =
    normalizarTextoEscalacao(
      perfil?.chave ??
      perfil?.nome
    );


  let nota =
    numeroEscalacao(
      escalacao.notaModelo
    );


  /*
   * Não existe bônus artificial para 4-3-3.
   *
   * A formação compete normalmente.
   */

  if (
    chave.includes(
      "conserv"
    )
  ) {

    nota +=
      escalacao.piso *
      0.08;


    nota +=
      escalacao.confianca *
      0.015;


    nota +=
      escalacao.titularidadeMedia *
      0.012;


    nota -=
      escalacao.risco *
      0.10;

  } else if (
    chave.includes(
      "agress"
    )
  ) {

    nota +=
      escalacao.teto *
      0.10;


    nota +=
      escalacao.projecao *
      0.06;


    nota +=
      escalacao.adequacaoMedia *
      0.010;

  } else {

    nota +=
      escalacao.projecao *
      0.07;


    nota +=
      escalacao.piso *
      0.04;


    nota +=
      escalacao.teto *
      0.04;


    nota +=
      escalacao.confianca *
      0.010;

  }


  /*
   * Banco incompleto recebe pequena
   * penalização, mas não invalida
   * automaticamente uma formação.
   *
   * Isso é importante caso o mercado
   * não ofereça reserva elegível dentro
   * da regra de preço.
   */

  if (
    !escalacao.bancoCompleto
  ) {

    nota -= 2;

  }


  return nota;

}


/* =========================================================
   ESCOLHA DA MELHOR FORMAÇÃO
   ========================================================= */


function escolherMelhorFormacaoEscalacao(
  jogadores,
  perfil,
  patrimonio
) {

  const candidatas = [];


  FORMACOES_CANDIDATAS_ESCALACAO
    .forEach(
      formacao => {

        const escalacao =
          montarFormacaoEscalacao(
            jogadores,
            perfil,
            formacao,
            patrimonio
          );


        if (!escalacao) {

          return;

        }


        escalacao.notaComparacaoFormacao =
          arredondarEscalacao(
            calcularNotaComparacaoFormacaoEscalacao(
              escalacao,
              perfil
            ),
            3
          );


        candidatas.push(
          escalacao
        );

      }
    );


  if (
    candidatas.length === 0
  ) {

    return null;

  }


  candidatas.sort(
    (a, b) => {

      if (
        b.notaComparacaoFormacao !==
        a.notaComparacaoFormacao
      ) {

        return (
          b.notaComparacaoFormacao -
          a.notaComparacaoFormacao
        );

      }


      if (
        b.projecao !==
        a.projecao
      ) {

        return (
          b.projecao -
          a.projecao
        );

      }


      if (
        b.teto !==
        a.teto
      ) {

        return (
          b.teto -
          a.teto
        );

      }


      return (
        a.custoTitulares -
        b.custoTitulares
      );

    }
  );


  const melhor =
    candidatas[0];


  melhor.formacoesAvaliadas =
    candidatas.map(
      candidata => ({
        formacao:
          candidata.formacao,
        nota:
          candidata.notaComparacaoFormacao,
        projecao:
          candidata.projecao,
        custoTitulares:
          candidata.custoTitulares,
        bancoCompleto:
          candidata.bancoCompleto
      })
    );


  return melhor;

}


/* =========================================================
   MONTA ESCALAÇÃO DE UM PERFIL
   ========================================================= */


function montarEscalacaoPerfil(
  jogadores,
  perfil,
  patrimonio
) {

  const escalacao =
    escolherMelhorFormacaoEscalacao(
      jogadores,
      perfil,
      patrimonio
    );


  if (!escalacao) {

    return null;

  }


  /*
   * Validação final.
   *
   * Não usamos custoTotal porque
   * custoBanco é apenas informativo.
   */

  if (
    !validarPatrimonioEscalacao(
      escalacao.titulares,
      patrimonio
    )
  ) {

    console.warn(
      `Escalação ${perfil.nome} descartada: titulares acima do patrimônio.`
    );


    return null;

  }


  return escalacao;

}


/* =========================================================
   MONTA TODOS OS PERFIS
   ========================================================= */


function montarTodasEscalacoes(
  jogadores,
  perfis,
  patrimonio
) {

  const resultado = [];


  perfis.forEach(
    perfil => {

      try {

        const escalacao =
          montarEscalacaoPerfil(
            jogadores,
            perfil,
            patrimonio
          );


        if (
          escalacao
        ) {

          resultado.push(
            escalacao
          );

        } else {

          console.warn(
            `Não foi possível montar a escalação do perfil ${perfil.nome} com patrimônio C$ ${numeroEscalacao(patrimonio).toFixed(2)}.`
          );

        }

      } catch (erro) {

        console.error(
          `Erro ao montar escalação ${perfil.nome}:`,
          erro
        );

      }

    }
  );


  return resultado;

}


/* =========================================================
   CARREGAMENTO DOS PERFIS
   ========================================================= */


async function carregarPerfisEscalacao() {

  try {

    const resposta =
      await fetch(
        CAMINHO_ESCALACOES,
        {
          cache: "no-store"
        }
      );


    if (
      !resposta.ok
    ) {

      throw new Error(
        `Erro HTTP ${resposta.status}`
      );

    }


    const dados =
      await resposta.json();


    return normalizarPerfisEscalacao(
      dados
    );

  } catch (erro) {

    console.warn(
      "Não foi possível carregar data/escalacoes.json. Usando perfis padrão.",
      erro
    );


    return PERFIS_ESCALACAO_PADRAO.map(
      (
        perfil,
        indice
      ) =>
        normalizarPerfilEscalacao(
          perfil,
          indice
        )
    );

  }

}


/* =========================================================
   RENDERIZAÇÃO
   ========================================================= */


function renderizarEscalacoesCarregadas() {

  /*
   * API atual dos cards.
   *
   * Essa foi a chamada confirmada
   * manualmente no navegador.
   */

  if (
    typeof window !==
      "undefined" &&
    window.CartolaEscalacoesCards &&
    typeof window
      .CartolaEscalacoesCards
      .renderizar ===
      "function"
  ) {

    window
      .CartolaEscalacoesCards
      .renderizar();


    return true;

  }


  /*
   * Compatibilidade com versões anteriores.
   */

  if (
    typeof EscalacoesCards !==
      "undefined" &&
    EscalacoesCards &&
    typeof EscalacoesCards.render ===
      "function"
  ) {

    EscalacoesCards.render(
      estadoEscalacoes.escalacoes
    );


    return true;

  }


  if (
    typeof renderizarEscalacoes ===
      "function"
  ) {

    renderizarEscalacoes(
      estadoEscalacoes.escalacoes
    );


    return true;

  }


  if (
    typeof renderEscalacoes ===
      "function"
  ) {

    renderEscalacoes(
      estadoEscalacoes.escalacoes
    );


    return true;

  }


  /*
   * Caso cards.js ainda não esteja disponível,
   * fazemos somente uma tentativa posterior.
   *
   * Não chamamos carregarEscalacoes() aqui.
   */

  if (
    typeof window !==
      "undefined"
  ) {

    window.setTimeout(
      () => {

        if (
          window.CartolaEscalacoesCards &&
          typeof window
            .CartolaEscalacoesCards
            .renderizar ===
            "function"
        ) {

          window
            .CartolaEscalacoesCards
            .renderizar();

        }

      },
      0
    );

  }


  return false;

}


/* =========================================================
   EVENTO DE ATUALIZAÇÃO
   ========================================================= */


function dispararEventoEscalacoesAtualizadas() {

  if (
    typeof window ===
      "undefined" ||
    typeof CustomEvent ===
      "undefined"
  ) {

    return;

  }


  try {

    window.dispatchEvent(
      new CustomEvent(
        "cartola:escalacoes-atualizadas",
        {
          detail: {

            escalacoes:
              obterEscalacoes(),

            patrimonio:
              obterPatrimonioAtualEscalacoes()

          }
        }
      )
    );

  } catch (erro) {

    console.warn(
      "Não foi possível disparar evento de atualização das escalações.",
      erro
    );

  }

}


/* =========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================= */


async function carregarEscalacoes() {

  /*
   * Evita duas montagens simultâneas.
   */

  if (
    estadoEscalacoes.carregando
  ) {

    return obterEscalacoes();

  }


  estadoEscalacoes.carregando =
    true;


  estadoEscalacoes.erro =
    null;


  const inicio =
    (
      typeof performance !==
        "undefined" &&
      typeof performance.now ===
        "function"
    )
      ? performance.now()
      : Date.now();


  try {

    const jogadores =
      obterJogadoresDisponiveisEscalacao();


    if (
      !Array.isArray(
        jogadores
      ) ||
      jogadores.length === 0
    ) {

      estadoEscalacoes.jogadores =
        [];


      estadoEscalacoes.escalacoes =
        [];


      estadoEscalacoes.carregado =
        false;


      estadoEscalacoes.erro =
        "Nenhum jogador disponível para montar as escalações.";


      console.warn(
        estadoEscalacoes.erro
      );


      return [];

    }


    let perfis =
      estadoEscalacoes.perfis;


    if (
      !Array.isArray(
        perfis
      ) ||
      perfis.length === 0
    ) {

      perfis =
        await carregarPerfisEscalacao();

    }


    const patrimonio =
      obterPatrimonioAtualEscalacoes();


    const escalacoes =
      montarTodasEscalacoes(
        jogadores,
        perfis,
        patrimonio
      );


    estadoEscalacoes.perfis =
      perfis;


    estadoEscalacoes.jogadores =
      jogadores;


    estadoEscalacoes.escalacoes =
      escalacoes;


    estadoEscalacoes.carregado =
      escalacoes.length > 0;


    estadoEscalacoes.carregando =
      false;


    estadoEscalacoes.ultimaAtualizacao =
      new Date()
        .toISOString();


    const fim =
      (
        typeof performance !==
          "undefined" &&
        typeof performance.now ===
          "function"
      )
        ? performance.now()
        : Date.now();


    const tempoMs =
      arredondarEscalacao(
        fim -
        inicio,
        1
      );


    console.info(
      "Escalações carregadas:",
      {

        perfis:
          perfis.length,

        jogadores:
          jogadores.length,

        escalacoes:
          escalacoes.length,

        patrimonioSelecionado:
          estadoEscalacoes
            .patrimonioSelecionado,

        patrimonioUtilizado:
          patrimonio,

        tempoMs

      }
    );


    /*
     * Primeiro salvamos todo o estado.
     *
     * Só depois avisamos a interface.
     */

    dispararEventoEscalacoesAtualizadas();


    renderizarEscalacoesCarregadas();


    return obterEscalacoes();

  } catch (erro) {

    estadoEscalacoes.carregando =
      false;


    estadoEscalacoes.carregado =
      false;


    estadoEscalacoes.erro =
      erro?.message ??
      String(erro);


    console.error(
      "Erro ao carregar escalações:",
      erro
    );


    return [];

  }

}


/* =========================================================
   RECARREGAMENTO
   ========================================================= */


async function recarregarEscalacoes() {

  estadoEscalacoes.carregado =
    false;


  estadoEscalacoes.erro =
    null;


  return carregarEscalacoes();

}


/* =========================================================
   PATRIMÔNIO — FUNÇÃO INTERNA
   ========================================================= */


/*
 * IMPORTANTE:
 *
 * Esta função possui nome diferente da API pública.
 *
 * Isso elimina definitivamente a recursão:
 *
 * atualizarPatrimonioEscalacoes()
 * -> definirPatrimonioInternoEscalacoes()
 * -> carregarEscalacoes()
 *
 * Nunca:
 *
 * atualizarPatrimonioEscalacoes()
 * -> atualizarPatrimonioEscalacoes()
 */


async function definirPatrimonioInternoEscalacoes(
  valor
) {

  const patrimonio =
    normalizarPatrimonioEscalacoes(
      valor
    );


  if (
    patrimonio === null
  ) {

    throw new Error(
      "Patrimônio inválido."
    );

  }


  estadoEscalacoes
    .patrimonioSelecionado =
      patrimonio;


  estadoEscalacoes.carregado =
    false;


  estadoEscalacoes.erro =
    null;


  return carregarEscalacoes();

}


/* =========================================================
   RESTAURA PATRIMÔNIO — FUNÇÃO INTERNA
   ========================================================= */


async function restaurarPatrimonioInternoEscalacoes() {

  estadoEscalacoes
    .patrimonioSelecionado =
      null;


  estadoEscalacoes.carregado =
    false;


  estadoEscalacoes.erro =
    null;


  return carregarEscalacoes();

}


/* =========================================================
   API PÚBLICA DE PATRIMÔNIO
   ========================================================= */


async function atualizarPatrimonioEscalacoes(
  valor
) {

  /*
   * Aqui está a correção do
   * Maximum call stack size exceeded.
   *
   * Não chamamos uma função global
   * chamada definirPatrimonioEscalacoes.
   *
   * Chamamos diretamente a função
   * interna, que nunca é sobrescrita
   * pelo window.
   */

  const resultado =
    await definirPatrimonioInternoEscalacoes(
      valor
    );


  /*
   * carregarEscalacoes() já dispara
   * atualização e renderização.
   *
   * Portanto não iniciamos uma segunda
   * montagem aqui.
   */

  return resultado;

}


async function resetarPatrimonioEscalacoes() {

  return restaurarPatrimonioInternoEscalacoes();

}

/* =========================================================
   GETTERS
   ========================================================= */


function obterEscalacoes() {

  return (
    Array.isArray(
      estadoEscalacoes.escalacoes
    )
      ? estadoEscalacoes.escalacoes.map(
          copiarEscalacao
        )
      : []
  );

}


function obterEstadoEscalacoes() {

  return {

    carregado:
      estadoEscalacoes.carregado,

    carregando:
      estadoEscalacoes.carregando,

    erro:
      estadoEscalacoes.erro,

    patrimonioSelecionado:
      estadoEscalacoes
        .patrimonioSelecionado,

    patrimonioAtual:
      obterPatrimonioAtualEscalacoes(),

    quantidadePerfis:
      Array.isArray(
        estadoEscalacoes.perfis
      )
        ? estadoEscalacoes.perfis.length
        : 0,

    quantidadeJogadores:
      Array.isArray(
        estadoEscalacoes.jogadores
      )
        ? estadoEscalacoes.jogadores.length
        : 0,

    quantidadeEscalacoes:
      Array.isArray(
        estadoEscalacoes.escalacoes
      )
        ? estadoEscalacoes.escalacoes.length
        : 0,

    ultimaAtualizacao:
      estadoEscalacoes
        .ultimaAtualizacao,

    escalacoes:
      obterEscalacoes()

  };

}


function obterEscalacaoPorPerfil(
  perfil
) {

  const chave =
    normalizarTextoEscalacao(
      perfil
    );


  if (!chave) {

    return null;

  }


  const encontrada =
    estadoEscalacoes
      .escalacoes
      .find(
        escalacao => {

          const nome =
            normalizarTextoEscalacao(
              escalacao?.perfil ??
              escalacao?.nome
            );


          const chavePerfil =
            normalizarTextoEscalacao(
              escalacao?.perfilChave
            );


          return (
            nome === chave ||
            chavePerfil === chave
          );

        }
      );


  return encontrada
    ? copiarEscalacao(
        encontrada
      )
    : null;

}


/* =========================================================
   RESUMO
   ========================================================= */


function obterResumoEscalacoes() {

  return estadoEscalacoes
    .escalacoes
    .map(
      escalacao => {

        return {

          perfil:
            escalacao.perfil,

          formacao:
            escalacao.formacao,

          titulares:
            Array.isArray(
              escalacao.titulares
            )
              ? escalacao.titulares.length
              : 0,

          banco:
            Array.isArray(
              escalacao.banco
            )
              ? escalacao.banco.length
              : 0,

          bancoCompleto:
            Boolean(
              escalacao.bancoCompleto
            ),

          posicoesBanco:
            Array.isArray(
              escalacao.posicoesBanco
            )
              ? [
                  ...escalacao.posicoesBanco
                ]
              : [],

          patrimonio:
            numeroEscalacao(
              escalacao
                .limitePatrimonio
            ),

          custoTitulares:
            numeroEscalacao(
              escalacao
                .custoTitulares
            ),

          custoBanco:
            numeroEscalacao(
              escalacao
                .custoBanco
            ),

          saldo:
            numeroEscalacao(
              escalacao.saldo
            ),

          projecao:
            numeroEscalacao(
              escalacao.projecao
            ),

          piso:
            numeroEscalacao(
              escalacao.piso
            ),

          teto:
            numeroEscalacao(
              escalacao.teto
            ),

          confianca:
            numeroEscalacao(
              escalacao.confianca
            ),

          capitao:
            escalacao.capitao
              ? (
                  escalacao.capitao
                    .apelido ??
                  escalacao.capitao
                    .nome ??
                  null
                )
              : null,

          reservaLuxo:
            escalacao.reservaLuxo
              ? (
                  escalacao.reservaLuxo
                    .apelido ??
                  escalacao.reservaLuxo
                    .nome ??
                  null
                )
              : null

        };

      }
    );

}


/* =========================================================
   DIAGNÓSTICO DO BANCO
   ========================================================= */


function diagnosticarBancoEscalacao(
  escalacao
) {

  const titulares =
    Array.isArray(
      escalacao?.titulares
    )
      ? escalacao.titulares
      : [];


  const banco =
    Array.isArray(
      escalacao?.banco
    )
      ? escalacao.banco
      : [];


  const posicoesEsperadas =
    obterPosicoesBancoEscalacao(
      titulares
    );


  return posicoesEsperadas.map(
    posicao => {

      const titularesPosicao =
        titulares.filter(
          jogador =>
            obterPosicaoJogadorEscalacao(
              jogador
            ) ===
            posicao
        );


      const reserva =
        banco.find(
          jogador =>
            obterPosicaoJogadorEscalacao(
              jogador
            ) ===
            posicao
        ) ?? null;


      const limitePreco =
        obterLimitePrecoReservaPosicaoEscalacao(
          titulares,
          posicao
        );


      const precosTitulares =
        titularesPosicao.map(
          jogador => ({
            nome:
              obterNomeJogadorEscalacao(
                jogador
              ),
            preco:
              obterPrecoJogadorEscalacao(
                jogador
              )
          })
        );


      return {

        posicao,

        titulares:
          precosTitulares,

        titularMaisBarato:
          limitePreco,

        reserva:
          reserva
            ? obterNomeJogadorEscalacao(
                reserva
              )
            : null,

        precoReserva:
          reserva
            ? obterPrecoJogadorEscalacao(
                reserva
              )
            : null,

        respeitaPreco:
          Boolean(
            reserva &&
            limitePreco !== null &&
            obterPrecoJogadorEscalacao(
              reserva
            ) <=
            limitePreco
          )

      };

    }
  );

}


/* =========================================================
   DIAGNÓSTICO GERAL
   ========================================================= */


function diagnosticarEscalacoes() {

  const escalacoes =
    obterEscalacoes();


  const diagnostico = {

    carregado:
      estadoEscalacoes.carregado,

    carregando:
      estadoEscalacoes.carregando,

    erro:
      estadoEscalacoes.erro,

    patrimonioSelecionado:
      estadoEscalacoes
        .patrimonioSelecionado,

    patrimonioAtual:
      obterPatrimonioAtualEscalacoes(),

    quantidadeJogadores:
      Array.isArray(
        estadoEscalacoes.jogadores
      )
        ? estadoEscalacoes.jogadores.length
        : 0,

    quantidadePerfis:
      Array.isArray(
        estadoEscalacoes.perfis
      )
        ? estadoEscalacoes.perfis.length
        : 0,

    quantidadeEscalacoes:
      escalacoes.length,

    escalacoes:
      escalacoes.map(
        escalacao => {

          const titulares =
            Array.isArray(
              escalacao.titulares
            )
              ? escalacao.titulares
              : [];


          const banco =
            Array.isArray(
              escalacao.banco
            )
              ? escalacao.banco
              : [];


          return {

            perfil:
              escalacao.perfil,

            formacao:
              escalacao.formacao,

            titulares:
              titulares.length,

            banco:
              banco.length,

            bancoCompleto:
              escalacao.bancoCompleto,

            posicoesBanco:
              escalacao.posicoesBanco,

            custoTitulares:
              escalacao.custoTitulares,

            custoBanco:
              escalacao.custoBanco,

            /*
             * O campo abaixo é somente
             * informativo.
             *
             * NÃO valida patrimônio.
             */

            custoInformativoTitularesMaisBanco:
              escalacao.custoTotal,

            limitePatrimonio:
              escalacao
                .limitePatrimonio,

            saldo:
              escalacao.saldo,

            projecao:
              escalacao.projecao,

            capitao:
              escalacao.capitao
                ?.apelido ??
              escalacao.capitao
                ?.nome ??
              null,

            reservaLuxo:
              escalacao.reservaLuxo
                ?.apelido ??
              escalacao.reservaLuxo
                ?.nome ??
              null,

            bancoDetalhado:
              diagnosticarBancoEscalacao(
                escalacao
              )

          };

        }
      )

  };


  try {

    console.table(
      diagnostico
        .escalacoes
        .map(
          escalacao => ({
            perfil:
              escalacao.perfil,
            formacao:
              escalacao.formacao,
            titulares:
              escalacao.titulares,
            banco:
              escalacao.banco,
            bancoCompleto:
              escalacao.bancoCompleto,
            custoTitulares:
              escalacao.custoTitulares,
            patrimonio:
              escalacao.limitePatrimonio,
            saldo:
              escalacao.saldo,
            projecao:
              escalacao.projecao
          })
        )
    );

  } catch (erro) {

    /*
     * console.table não é obrigatório.
     */

  }


  console.info(
    "Diagnóstico completo das escalações:",
    diagnostico
  );


  return diagnostico;

}


/* =========================================================
   TESTE DA REGRA DOS RESERVAS
   ========================================================= */


function testarRegraReservasEscalacoes() {

  const resultados = [];


  estadoEscalacoes
    .escalacoes
    .forEach(
      escalacao => {

        const detalhes =
          diagnosticarBancoEscalacao(
            escalacao
          );


        detalhes.forEach(
          detalhe => {

            resultados.push({

              perfil:
                escalacao.perfil,

              formacao:
                escalacao.formacao,

              posicao:
                detalhe.posicao,

              titularMaisBarato:
                detalhe
                  .titularMaisBarato,

              reserva:
                detalhe.reserva,

              precoReserva:
                detalhe.precoReserva,

              valido:
                detalhe.respeitaPreco

            });

          }
        );

      }
    );


  try {

    console.table(
      resultados
    );

  } catch (erro) {

    /*
     * Apenas diagnóstico.
     */

  }


  return resultados;

}


/* =========================================================
   API PÚBLICA
   ========================================================= */


const EscalacoesDados = {

  carregar:
    carregarEscalacoes,

  recarregar:
    recarregarEscalacoes,

  obter:
    obterEscalacoes,

  obterEstado:
    obterEstadoEscalacoes,

  obterPorPerfil:
    obterEscalacaoPorPerfil,

  obterResumo:
    obterResumoEscalacoes,

  obterPatrimonio:
    obterPatrimonioAtualEscalacoes,

  definirPatrimonio:
    atualizarPatrimonioEscalacoes,

  restaurarPatrimonio:
    resetarPatrimonioEscalacoes,

  diagnosticar:
    diagnosticarEscalacoes,

  testarReservas:
    testarRegraReservasEscalacoes

};


/* =========================================================
   COMPATIBILIDADE GLOBAL
   ========================================================= */


if (
  typeof window !==
    "undefined"
) {

  window.EscalacoesDados =
    EscalacoesDados;


  window.carregarEscalacoes =
    carregarEscalacoes;


  window.recarregarEscalacoes =
    recarregarEscalacoes;


  window.obterEscalacoes =
    obterEscalacoes;


  window.obterEstadoEscalacoes =
    obterEstadoEscalacoes;


  window.obterEscalacaoPorPerfil =
    obterEscalacaoPorPerfil;


  window.obterPatrimonioAtualEscalacoes =
    obterPatrimonioAtualEscalacoes;


  /*
   * IMPORTANTE:
   *
   * A função global aponta para
   * atualizarPatrimonioEscalacoes().
   *
   * Essa função, por sua vez,
   * chama definirPatrimonioInternoEscalacoes().
   *
   * Portanto NÃO existe mais:
   *
   * window.definirPatrimonioEscalacoes
   *   -> atualizarPatrimonioEscalacoes
   *   -> definirPatrimonioEscalacoes
   *   -> atualizarPatrimonioEscalacoes
   *
   * O ciclo foi eliminado.
   */

  window.definirPatrimonioEscalacoes =
    atualizarPatrimonioEscalacoes;


  window.restaurarPatrimonioPadraoEscalacoes =
    resetarPatrimonioEscalacoes;


  window.diagnosticarEscalacoes =
    diagnosticarEscalacoes;


  window.testarRegraReservasEscalacoes =
    testarRegraReservasEscalacoes;

}


/* =========================================================
   FIM
   ========================================================= */
