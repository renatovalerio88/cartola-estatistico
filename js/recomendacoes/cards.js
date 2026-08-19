/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — cards dos jogadores

   Responsabilidades:

   - renderizar ranking por posição;
   - exibir contexto da rodada;
   - exibir projeção, piso e teto;
   - exibir confiança, risco e custo-benefício;
   - gerar justificativas de apoio quando necessário;
   - gerar pontos de atenção;
   - exibir composição da nota sem poluição;
   - preparar integração com filtros de clubes/jogadores.

   ========================================================= */


/* =========================================================
   1. EXIBIÇÃO DOS JOGADORES DA POSIÇÃO
   ========================================================= */


function exibirJogadoresDaPosicao() {

  const grade =
    document.getElementById(
      "playersGrid"
    );


  if (!grade) {

    return;

  }


  if (
    typeof recomendacoesCarregadas === "function" &&
    !recomendacoesCarregadas()
  ) {

    return;

  }


  const posicaoAtiva =
    typeof obterPosicaoAtiva === "function"
      ? obterPosicaoAtiva()
      : "GOL";


  const jogadores =
    typeof obterJogadoresDaPosicao === "function"
      ? obterJogadoresDaPosicao(
          posicaoAtiva
        )
      : [];


  if (
    !Array.isArray(jogadores) ||
    jogadores.length === 0
  ) {

    exibirPosicaoSemJogadores();

    return;

  }


  grade.innerHTML = "";


  jogadores.forEach(
    (
      jogador,
      indice
    ) => {

      const card =
        criarCardJogador(
          jogador,
          indice + 1
        );


      grade.appendChild(
        card
      );

    }
  );


  configurarBotoesAnaliseJogador();

}


/* =========================================================
   2. ESTADO SEM JOGADORES
   ========================================================= */


function exibirPosicaoSemJogadores() {

  const grade =
    document.getElementById(
      "playersGrid"
    );


  if (!grade) {

    return;

  }


  grade.innerHTML = `

    <div class="empty-state">

      <strong>
        Nenhum jogador disponível
      </strong>

      <p>
        Não encontramos atletas elegíveis para esta posição
        com os filtros e critérios atuais.
      </p>

    </div>

  `;

}


/* =========================================================
   3. UTILITÁRIOS LOCAIS
   ========================================================= */


function numeroSeguroRecomendacao(
  valor,
  padrao = 0
) {

  const numero =
    Number(valor);


  return Number.isFinite(
    numero
  )
    ? numero
    : padrao;

}


function possuiNumeroRecomendacao(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return false;

  }


  return Number.isFinite(
    Number(valor)
  );

}


function limitarRecomendacao(
  valor,
  minimo = 0,
  maximo = 100
) {

  const numero =
    numeroSeguroRecomendacao(
      valor,
      minimo
    );


  return Math.max(
    minimo,
    Math.min(
      maximo,
      numero
    )
  );

}


function escaparHtmlRecomendacao(
  valor
) {

  if (
    typeof escaparHtml === "function"
  ) {

    return escaparHtml(
      valor
    );

  }


  return String(
    valor ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function normalizarTextoRecomendacao(
  valor
) {

  return String(
    valor ?? ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();

}


function formatarPontosRecomendacao(
  valor
) {

  if (
    typeof formatarPontos === "function"
  ) {

    return formatarPontos(
      valor
    );

  }


  if (
    !possuiNumeroRecomendacao(
      valor
    )
  ) {

    return "--";

  }


  return (
    `${Number(valor).toFixed(1)} pts`
  );

}


function formatarCartoletasRecomendacao(
  valor
) {

  if (
    typeof formatarCartoletas === "function"
  ) {

    return formatarCartoletas(
      valor
    );

  }


  if (
    !possuiNumeroRecomendacao(
      valor
    )
  ) {

    return "C$ --";

  }


  return (
    `C$ ${Number(valor).toFixed(2)}`
  );

}


function formatarDecimalRecomendacao(
  valor,
  casas = 1
) {

  if (
    typeof formatarDecimal === "function"
  ) {

    return formatarDecimal(
      valor,
      casas
    );

  }


  if (
    !possuiNumeroRecomendacao(
      valor
    )
  ) {

    return "--";

  }


  return Number(valor)
    .toFixed(
      casas
    );

}


function formatarPorcentagemRecomendacao(
  valor
) {

  if (
    typeof formatarPorcentagem === "function"
  ) {

    return formatarPorcentagem(
      valor
    );

  }


  if (
    !possuiNumeroRecomendacao(
      valor
    )
  ) {

    return "--";

  }


  return (
    `${Math.round(
      Number(valor)
    )}%`
  );

}


/* =========================================================
   4. NOME CURTO
   ========================================================= */


function obterNomeCurtoRecomendacao(
  jogador
) {

  if (!jogador) {

    return "Jogador";

  }


  const apelido =
    String(
      jogador.apelido ||
      ""
    ).trim();


  if (apelido) {

    return apelido;

  }


  const nome =
    String(
      jogador.nome ||
      ""
    ).trim();


  if (!nome) {

    return "Jogador";

  }


  const partes =
    nome
      .split(
        /\s+/
      )
      .filter(Boolean);


  if (
    partes.length <= 2
  ) {

    return nome;

  }


  return (
    `${partes[0]} ` +
    `${partes[
      partes.length - 1
    ]}`
  );

}


/* =========================================================
   5. POSIÇÃO
   ========================================================= */


function obterNomePosicaoRecomendacao(
  codigo
) {

  if (
    typeof obterNomePosicao === "function"
  ) {

    return obterNomePosicao(
      codigo,
      true
    );

  }


  const mapa = {

    GOL:
      "Goleiro",

    LAT:
      "Lateral",

    ZAG:
      "Zagueiro",

    MEI:
      "Meia",

    ATA:
      "Atacante",

    TEC:
      "Treinador"

  };


  return (
    mapa[
      String(
        codigo || ""
      ).toUpperCase()
    ]
    ||
    String(
      codigo || ""
    )
  );

}


/* =========================================================
   6. MANDO
   ========================================================= */


function obterTextoMandoJogador(
  jogador
) {

  const mando =
    normalizarTextoRecomendacao(
      jogador?.mando
    );


  if (
    mando === "casa" ||
    mando === "mandante"
  ) {

    return "Casa";

  }


  if (
    mando === "fora" ||
    mando === "visitante"
  ) {

    return "Fora";

  }


  if (
    jogador?.ehMandante === true
  ) {

    return "Casa";

  }


  if (
    jogador?.ehMandante === false
  ) {

    return "Fora";

  }


  return null;

}


/* =========================================================
   7. ADVERSÁRIO
   ========================================================= */


function obterTextoAdversarioJogador(
  jogador
) {

  const adversario =

    jogador?.siglaAdversario

    ||

    jogador?.adversario

    ||

    jogador?.adversarioSigla

    ||

    jogador?.nomeAdversario

    ||

    "";


  const texto =
    String(
      adversario
    ).trim();


  return (
    texto ||
    null
  );

}


/* =========================================================
   8. LINHA DO CONFRONTO
   ========================================================= */


function criarContextoConfrontoHtml(
  jogador
) {

  const clube =

    jogador?.siglaClube

    ||

    jogador?.clube

    ||

    "--";


  const mando =
    obterTextoMandoJogador(
      jogador
    );


  const adversario =
    obterTextoAdversarioJogador(
      jogador
    );


  const partes = [

    escaparHtmlRecomendacao(
      clube
    )

  ];


  if (mando) {

    partes.push(
      escaparHtmlRecomendacao(
        mando
      )
    );

  }


  if (adversario) {

    partes.push(

      `x ${escaparHtmlRecomendacao(
        adversario
      )}`

    );

  }


  if (
    partes.length === 1
  ) {

    partes.push(
      "Confronto aguardando confirmação"
    );

  }


  return partes.join(
    " • "
  );

}


/* =========================================================
   9. PROJEÇÃO / PISO / TETO COERENTES
   ========================================================= */


function obterMetricasCoerentesJogador(
  jogador
) {

  const projecaoOriginal =
    numeroSeguroRecomendacao(
      jogador?.projecao
    );


  const pisoOriginal =
    possuiNumeroRecomendacao(
      jogador?.piso
    )
      ? Number(
          jogador.piso
        )
      : projecaoOriginal;


  const tetoOriginal =
    possuiNumeroRecomendacao(
      jogador?.teto
    )
      ? Number(
          jogador.teto
        )
      : projecaoOriginal;


  const piso =
    Math.min(
      pisoOriginal,
      projecaoOriginal,
      tetoOriginal
    );


  const teto =
    Math.max(
      pisoOriginal,
      projecaoOriginal,
      tetoOriginal
    );


  const projecao =
    Math.max(
      piso,
      Math.min(
        teto,
        projecaoOriginal
      )
    );


  return {

    projecao,

    piso,

    teto,

    houveCorrecaoVisual:
      (
        piso !== pisoOriginal ||
        teto !== tetoOriginal ||
        projecao !== projecaoOriginal
      )

  };

}


/* =========================================================
   10. CONFIANÇA
   ========================================================= */


function obterClasseConfiancaRecomendacao(
  valor
) {

  if (
    typeof obterClasseConfianca === "function"
  ) {

    return obterClasseConfianca(
      valor
    );

  }


  const numero =
    numeroSeguroRecomendacao(
      valor
    );


  if (
    numero >= 80
  ) {

    return "high";

  }


  if (
    numero >= 60
  ) {

    return "medium";

  }


  return "low";

}


/* =========================================================
   11. RISCO
   ========================================================= */


function obterClasseRiscoRecomendacao(
  valor
) {

  if (
    typeof obterClasseRisco === "function"
  ) {

    return obterClasseRisco(
      valor
    );

  }


  const texto =
    normalizarTextoRecomendacao(
      valor
    );


  if (
    texto.includes(
      "baixo"
    )
  ) {

    return "low";

  }


  if (
    texto.includes(
      "alto"
    )
  ) {

    return "high";

  }


  const numero =
    Number(valor);


  if (
    Number.isFinite(
      numero
    )
  ) {

    if (
      numero <= 30
    ) {

      return "low";

    }


    if (
      numero >= 60
    ) {

      return "high";

    }

  }


  return "medium";

}


/* =========================================================
   12. TEXTO DO RISCO
   ========================================================= */


function obterTextoRiscoJogador(
  jogador
) {

  const valor =
    jogador?.risco;


  if (
    typeof valor === "string" &&
    valor.trim() &&
    !Number.isFinite(
      Number(valor)
    )
  ) {

    return valor;

  }


  const numero =
    Number(valor);


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "Não informado";

  }


  if (
    numero <= 30
  ) {

    return "Baixo";

  }


  if (
    numero <= 60
  ) {

    return "Médio";

  }


  return "Alto";

}


/* =========================================================
   13. BARRA
   ========================================================= */


function criarBarraIndicadorRecomendacao(
  titulo,
  valor,
  classe = ""
) {

  const numero =
    limitarRecomendacao(
      valor,
      0,
      100
    );


  return `

    <div
      class="
        player-indicator
        ${escaparHtmlRecomendacao(
          classe
        )}
      "
    >

      <div
        class="player-indicator-label"
      >

        <span>
          ${escaparHtmlRecomendacao(
            titulo
          )}
        </span>

        <strong>
          ${Math.round(
            numero
          )}%
        </strong>

      </div>


      <div
        class="player-indicator-track"
      >

        <span
          style="
            width:
            ${numero}%;
          "
        ></span>

      </div>

    </div>

  `;

}


/* =========================================================
   14. RESULTADO DO MOTOR
   ========================================================= */


function obterResultadoMotorJogador(
  jogador
) {

  if (
    typeof calcularNotaJogadorComMotor !==
      "function"
  ) {

    return null;

  }


  try {

    return calcularNotaJogadorComMotor(
      jogador
    );


  } catch (erro) {

    console.warn(

      "Não foi possível executar o motor para o jogador:",

      jogador?.nome,

      erro

    );


    return null;

  }

}


/* =========================================================
   15. NOTA EXIBIDA
   ========================================================= */


function obterNotaExibicaoJogador(
  jogador,
  resultadoMotor
) {

  const candidatos = [

    jogador?.notaFinal,

    jogador?.nota,

    jogador?.score,

    resultadoMotor?.notaFinal

  ];


  for (
    const candidato
    of candidatos
  ) {

    const valor =
      Number(
        candidato
      );


    if (
      Number.isFinite(
        valor
      )
    ) {

      return valor;

    }

  }


  return 0;

}


/* =========================================================
   16. COMPONENTE DISPONÍVEL
   ========================================================= */


function componentePossuiDados(
  item
) {

  if (!item) {

    return false;

  }


  if (
    item.disponivel === false
  ) {

    return false;

  }


  if (
    item.temDados === false
  ) {

    return false;

  }


  const nota =
    Number(
      item.nota
    );


  if (
    Number.isFinite(
      nota
    ) &&
    nota !== 0
  ) {

    return true;

  }


  const valorOriginal =
    item.valorOriginal;


  if (
    valorOriginal !== null &&
    valorOriginal !== undefined &&
    valorOriginal !== ""
  ) {

    return true;

  }


  const contribuicao =
    Number(
      item.contribuicao
    );


  return (
    Number.isFinite(
      contribuicao
    ) &&
    contribuicao !== 0
  );

}


/* =========================================================
   17. JUSTIFICATIVAS AUTOMÁTICAS
   ========================================================= */


function gerarJustificativasJogador(
  jogador,
  resultadoMotor
) {

  const prontas =
    Array.isArray(
      jogador?.justificativas
    )
      ? jogador.justificativas
          .filter(Boolean)
      : [];


  if (
    prontas.length > 0
  ) {

    return prontas;

  }


  const itens = [];


  const projecao =
    numeroSeguroRecomendacao(
      jogador?.projecao
    );


  const regularidade =
    numeroSeguroRecomendacao(
      jogador?.regularidade
    );


  const confianca =
    numeroSeguroRecomendacao(

      jogador?.confiancaNumerica

      ??

      jogador?.confianca

    );


  const titularidade =
    numeroSeguroRecomendacao(
      jogador?.titularidade
    );


  const chanceSG =
    Number(
      jogador?.chanceSG
    );


  const pontosCedidos =
    Number(
      jogador?.pontosCedidosNota
    );


  const custoBeneficio =
    Number(
      jogador?.custoBeneficio
    );


  if (
    projecao >= 8
  ) {

    itens.push(

      `Boa projeção para a rodada: ` +
      `${formatarPontosRecomendacao(
        projecao
      )}.`

    );

  }


  if (
    regularidade >= 70
  ) {

    itens.push(

      `Boa regularidade recente ` +
      `(${Math.round(
        regularidade
      )}%).`

    );

  }


  if (
    confianca >= 85
  ) {

    itens.push(

      `Alta confiança estatística ` +
      `(${Math.round(
        confianca
      )}%).`

    );

  }


  if (
    titularidade >= 90
  ) {

    itens.push(

      `Alta probabilidade de começar jogando ` +
      `(${Math.round(
        titularidade
      )}%).`

    );

  }


  if (
    Number.isFinite(
      chanceSG
    ) &&
    chanceSG >= 50 &&
    ["GOL", "LAT", "ZAG"].includes(
      String(
        jogador?.posicao || ""
      ).toUpperCase()
    )
  ) {

    itens.push(

      `Boa perspectiva defensiva: ` +
      `${Math.round(
        chanceSG
      )}% de chance estimada de SG.`

    );

  }


  if (
    Number.isFinite(
      pontosCedidos
    ) &&
    pontosCedidos >= 65
  ) {

    itens.push(
      "Adversário costuma ceder boa pontuação para a posição."
    );

  }


  if (
    Number.isFinite(
      custoBeneficio
    ) &&
    custoBeneficio >= 1
  ) {

    itens.push(

      `Bom custo-benefício para o preço atual ` +
      `(${formatarDecimalRecomendacao(
        custoBeneficio,
        2
      )}).`

    );

  }


  const pontosMotor =
    resultadoMotor
      ?.explicacao
      ?.pontosFortes;


  if (
    itens.length < 3 &&
    Array.isArray(
      pontosMotor
    )
  ) {

    pontosMotor
      .filter(Boolean)
      .forEach(
        texto => {

          if (
            itens.length >= 4
          ) {

            return;

          }


          if (
            !itens.includes(
              texto
            )
          ) {

            itens.push(
              texto
            );

          }

        }
      );

  }


  if (
    itens.length === 0
  ) {

    itens.push(
      "Boa combinação entre projeção, confiança e desempenho estatístico."
    );

  }


  return itens.slice(
    0,
    4
  );

}


/* =========================================================
   18. PONTOS DE ATENÇÃO AUTOMÁTICOS
   ========================================================= */


function gerarPontosAtencaoJogador(
  jogador,
  metricas
) {

  const prontos =
    Array.isArray(
      jogador?.pontosAtencao
    )
      ? jogador.pontosAtencao
          .filter(Boolean)
      : [];


  if (
    prontos.length > 0
  ) {

    return prontos;

  }


  const itens = [];


  const regularidade =
    numeroSeguroRecomendacao(
      jogador?.regularidade
    );


  const titularidade =
    numeroSeguroRecomendacao(
      jogador?.titularidade
    );


  const risco =
    Number(
      jogador?.risco
    );


  const minutos =
    Number(
      jogador?.minutosEsperados
    );


  const contextoMando =
    obterTextoMandoJogador(
      jogador
    );


  const adversario =
    obterTextoAdversarioJogador(
      jogador
    );


  if (
    regularidade > 0 &&
    regularidade < 35
  ) {

    itens.push(
      "Baixa regularidade recente: pontuação pode oscilar bastante."
    );

  }


  if (
    titularidade > 0 &&
    titularidade < 80
  ) {

    itens.push(
      "Titularidade abaixo do nível ideal para uma escolha segura."
    );

  }


  if (
    Number.isFinite(
      risco
    ) &&
    risco >= 50
  ) {

    itens.push(
      "Risco estatístico elevado para a rodada."
    );

  }


  if (
    Number.isFinite(
      minutos
    ) &&
    minutos > 0 &&
    minutos < 70
  ) {

    itens.push(
      "Possibilidade de tempo reduzido em campo."
    );

  }


  if (
    metricas.piso < 0
  ) {

    itens.push(
      "O cenário de piso ainda admite pontuação negativa."
    );

  }


  if (
    !contextoMando ||
    !adversario
  ) {

    itens.push(
      "Contexto completo do confronto ainda não está disponível."
    );

  }


  if (
    itens.length === 0
  ) {

    itens.push(
      "Nenhum alerta estatístico relevante identificado neste momento."
    );

  }


  return itens.slice(
    0,
    4
  );

}


/* =========================================================
   19. ITENS DE LISTA
   ========================================================= */


function criarItensListaRecomendacao(
  itens
) {

  if (
    !Array.isArray(
      itens
    ) ||
    itens.length === 0
  ) {

    return `
      <li>
        Informação ainda não disponível.
      </li>
    `;

  }


  return itens
    .filter(Boolean)
    .map(
      item => `

        <li>
          ${escaparHtmlRecomendacao(
            item
          )}
        </li>

      `
    )
    .join("");

}


/* =========================================================
   20. MOTIVO PRINCIPAL
   ========================================================= */


function obterMotivoPrincipal(
  jogador,
  resultadoMotor = null
) {

  const justificativas =
    gerarJustificativasJogador(

      jogador,

      resultadoMotor

    );


  if (
    justificativas.length > 0
  ) {

    return justificativas[0];

  }


  return (
    "Boa combinação entre projeção, " +
    "regularidade e confiança."
  );

}


/* =========================================================
   21. ETIQUETAS ESPECIAIS
   ========================================================= */


function criarEtiquetasEspeciaisJogador(
  jogador
) {

  const etiquetas = [];


  if (
    jogador?.cobraPenalti === true
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          Pênaltis
        </span>
      `
    );

  }


  if (
    jogador?.cobraBolaParada === true
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          Bola parada
        </span>
      `
    );

  }


  if (
    possuiNumeroRecomendacao(
      jogador?.minutosEsperados
    ) &&
    Number(
      jogador.minutosEsperados
    ) >= 85
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          90 minutos prováveis
        </span>
      `
    );

  }


  const posicao =
    String(
      jogador?.posicao || ""
    ).toUpperCase();


  if (
    ["GOL", "LAT", "ZAG"].includes(
      posicao
    ) &&
    possuiNumeroRecomendacao(
      jogador?.chanceSG
    ) &&
    Number(
      jogador.chanceSG
    ) >= 45
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          Boa chance de SG
        </span>
      `
    );

  }


  if (
    possuiNumeroRecomendacao(
      jogador?.regularidade
    ) &&
    Number(
      jogador.regularidade
    ) >= 75
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          Alta regularidade
        </span>
      `
    );

  }


  if (
    possuiNumeroRecomendacao(
      jogador?.custoBeneficio
    ) &&
    Number(
      jogador.custoBeneficio
    ) >= 1
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          Bom custo-benefício
        </span>
      `
    );

  }


  if (
    possuiNumeroRecomendacao(
      jogador?.pontosCedidosNota
    ) &&
    Number(
      jogador.pontosCedidosNota
    ) >= 70
  ) {

    etiquetas.push(
      `
        <span class="special-tag">
          Confronto favorável
        </span>
      `
    );

  }


  return etiquetas.join("");

}


/* =========================================================
   22. RESUMO DO MOTOR
   ========================================================= */


function criarResumoMotorHtml(
  jogador,
  resultadoMotor
) {

  if (
    !resultadoMotor ||
    resultadoMotor.erro
  ) {

    return "";

  }


  const notaMotor =
    numeroSeguroRecomendacao(
      resultadoMotor.notaFinal
    );


  const classificacao =

    resultadoMotor.classificacao

    ||

    (
      typeof classificarNotaFinal ===
        "function"

        ? classificarNotaFinal(
            notaMotor
          )

        : obterClassificacaoNotaRecomendacao(
            notaMotor
          )
    );


  const justificativas =
    gerarJustificativasJogador(

      jogador,

      resultadoMotor

    );


  const pontosHtml =
    justificativas
      .slice(
        0,
        3
      )
      .map(
        item => `

          <li>
            ${escaparHtmlRecomendacao(
              item
            )}
          </li>

        `
      )
      .join("");


  return `

    <div
      class="
        player-analysis-box
        positive
      "
    >

      <h4>

        <span>
          ∑
        </span>

        Leitura do Motor Estatístico

      </h4>


      <p>

        Nota calculada pelo motor:

        <strong>
          ${formatarDecimalRecomendacao(
            notaMotor,
            1
          )}
        </strong>

        •

        Classificação:

        <strong>
          ${escaparHtmlRecomendacao(
            classificacao
          )}
        </strong>

      </p>


      <ul>
        ${pontosHtml}
      </ul>

    </div>

  `;

}


/* =========================================================
   23. CLASSIFICAÇÃO DE APOIO
   ========================================================= */


function obterClassificacaoNotaRecomendacao(
  nota
) {

  const numero =
    numeroSeguroRecomendacao(
      nota
    );


  if (
    numero >= 75
  ) {

    return "Muito alta";

  }


  if (
    numero >= 60
  ) {

    return "Alta";

  }


  if (
    numero >= 45
  ) {

    return "Boa";

  }


  if (
    numero >= 30
  ) {

    return "Moderada";

  }


  return "Baixa";

}


/* =========================================================
   24. COMPONENTES DA NOTA
   ========================================================= */


function criarComponentesNotaJogador(
  jogador,
  resultadoMotor = null
) {

  const resultado =
    resultadoMotor
    ||
    obterResultadoMotorJogador(
      jogador
    );


  if (
    ehObjetoValidoRecomendacao(
      resultado?.contribuicoes
    )
  ) {

    return criarComponentesMotor(
      resultado.contribuicoes
    );

  }


  const componentesJson =
    jogador?.componentes;


  if (
    ehObjetoValidoRecomendacao(
      componentesJson
    )
  ) {

    return criarComponentesPorObjeto(
      componentesJson
    );

  }


  return `

    <div class="components-empty">

      <strong>
        Componentes ainda não disponíveis
      </strong>

      <p>
        O jogador possui projeção calculada, mas a decomposição
        detalhada dessa nota não foi informada pela fonte atual.
      </p>

    </div>

  `;

}


/* =========================================================
   25. OBJETO VÁLIDO
   ========================================================= */


function ehObjetoValidoRecomendacao(
  objeto
) {

  return (

    objeto &&
    typeof objeto ===
      "object" &&
    !Array.isArray(
      objeto
    ) &&
    Object.keys(
      objeto
    ).length > 0

  );

}


/* =========================================================
   26. COMPONENTES DO JSON
   ========================================================= */


function criarComponentesPorObjeto(
  componentes
) {

  const entradas =
    Object.entries(
      componentes
    )
      .filter(
        (
          [
            ,
            valor
          ]
        ) =>
          possuiNumeroRecomendacao(
            valor
          ) &&
          Number(
            valor
          ) !== 0
      );


  if (
    entradas.length === 0
  ) {

    return `

      <div class="components-empty">

        <p>
          Nenhum componente detalhado disponível.
        </p>

      </div>

    `;

  }


  return entradas
    .map(
      (
        [
          rotulo,
          valor
        ]
      ) => {

        const valorSeguro =
          limitarRecomendacao(
            valor,
            0,
            100
          );


        return `

          <div class="component-row">

            <div class="component-label">

              <span>
                ${escaparHtmlRecomendacao(
                  rotulo
                )}
              </span>

              <strong>
                ${Math.round(
                  valorSeguro
                )}
              </strong>

            </div>


            <div class="component-track">

              <div
                class="component-fill"
                style="
                  width:
                  ${valorSeguro}%;
                "
              ></div>

            </div>

          </div>

        `;

      }
    )
    .join("");

}


/* =========================================================
   27. COMPONENTES DO MOTOR
   ========================================================= */


function criarComponentesMotor(
  contribuicoes
) {

  const componentes =
    Object.values(
      contribuicoes
    )
      .filter(
        componentePossuiDados
      )
      .sort(
        (
          itemA,
          itemB
        ) =>
          Math.abs(
            numeroSeguroRecomendacao(
              itemB.contribuicao
            )
          )
          -
          Math.abs(
            numeroSeguroRecomendacao(
              itemA.contribuicao
            )
          )
      );


  if (
    componentes.length === 0
  ) {

    return `

      <div class="components-empty">

        <strong>
          Critérios aguardando dados
        </strong>

        <p>
          O motor não recebeu valores suficientes para
          decompor a nota deste jogador.
        </p>

      </div>

    `;

  }


  const principais =
    componentes.slice(
      0,
      10
    );


  const html =
    principais
      .map(
        item => {

          const nota =
            limitarRecomendacao(
              item.nota,
              0,
              100
            );


          const peso =
            numeroSeguroRecomendacao(
              item.peso
            );


          const contribuicao =
            numeroSeguroRecomendacao(
              item.contribuicao
            );


          return `

            <div class="component-row">

              <div class="component-label">

                <span>

                  ${escaparHtmlRecomendacao(

                    item.nome

                    ||

                    item.criterio

                    ||

                    "Critério"

                  )}

                  <small>

                    Peso:

                    ${formatarDecimalRecomendacao(
                      peso,
                      0
                    )}%

                    •

                    contribuição:

                    ${formatarDecimalRecomendacao(
                      contribuicao,
                      2
                    )}

                  </small>

                </span>


                <strong>
                  ${Math.round(
                    nota
                  )}
                </strong>

              </div>


              <div class="component-track">

                <div
                  class="component-fill"
                  style="
                    width:
                    ${nota}%;
                  "
                ></div>

              </div>

            </div>

          `;

        }
      )
      .join("");


  const omitidos =
    componentes.length -
    principais.length;


  return (

    html

    +

    (
      omitidos > 0

        ? `

          <p class="components-note">

            ${omitidos}
            critério(s) secundário(s)
            foram ocultados para facilitar a leitura.

          </p>

        `

        : ""

    )

  );

}


/* =========================================================
   28. CRIAÇÃO DO CARD
   ========================================================= */


function criarCardJogador(
  jogador,
  colocacao
) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "player-card";


  card.dataset.playerId =
    String(
      jogador?.id ?? ""
    );


  card.dataset.clubId =
    String(
      jogador?.clubeId ?? ""
    );


  card.dataset.club =
    String(

      jogador?.siglaClube

      ||

      jogador?.clube

      ||

      ""

    );


  const resultadoMotor =
    obterResultadoMotorJogador(
      jogador
    );


  const metricas =
    obterMetricasCoerentesJogador(
      jogador
    );


  const classeConfianca =
    obterClasseConfiancaRecomendacao(

      jogador?.confiancaNumerica

      ??

      jogador?.confianca

    );


  const classeRisco =
    obterClasseRiscoRecomendacao(
      jogador?.risco
    );


  const textoRisco =
    obterTextoRiscoJogador(
      jogador
    );


  const motivoPrincipal =
    obterMotivoPrincipal(
      jogador,
      resultadoMotor
    );


  const justificativas =
    gerarJustificativasJogador(

      jogador,

      resultadoMotor

    );


  const pontosAtencao =
    gerarPontosAtencaoJogador(

      jogador,

      metricas

    );


  const componentes =
    criarComponentesNotaJogador(

      jogador,

      resultadoMotor

    );


  const etiquetas =
    criarEtiquetasEspeciaisJogador(
      jogador
    );


  const idDetalhes =
    `player-details-${jogador.id}`;


  const notaExibida =
    obterNotaExibicaoJogador(

      jogador,

      resultadoMotor

    );


  const confiancaNumero =
    numeroSeguroRecomendacao(

      jogador?.confiancaNumerica

      ??

      jogador?.confianca

    );


  const regularidade =
    numeroSeguroRecomendacao(
      jogador?.regularidade
    );


  card.innerHTML = `

    <div class="player-card-header">

      <div class="player-main-info">

        <div class="player-ranking">
          ${colocacao}
        </div>


        <div>

          <span class="player-position">

            ${escaparHtmlRecomendacao(
              obterNomePosicaoRecomendacao(
                jogador?.posicao
              )
            )}

          </span>


          <h3>

            ${escaparHtmlRecomendacao(
              obterNomeCurtoRecomendacao(
                jogador
              )
            )}

          </h3>


          <p class="player-club">

            ${criarContextoConfrontoHtml(
              jogador
            )}

          </p>

        </div>

      </div>


      <div class="player-price">

        <span>
          Preço
        </span>

        <strong>

          ${formatarCartoletasRecomendacao(
            jogador?.preco
          )}

        </strong>

      </div>

    </div>


    ${
      etiquetas
        ? `

          <div class="player-special-tags">
            ${etiquetas}
          </div>

        `
        : ""
    }


    <div class="player-main-metrics">

      <div class="main-metric projection">

        <span>
          Projeção
        </span>

        <strong>

          ${formatarPontosRecomendacao(
            metricas.projecao
          )}

        </strong>

      </div>


      <div class="main-metric">

        <span>
          Piso
        </span>

        <strong>

          ${formatarPontosRecomendacao(
            metricas.piso
          )}

        </strong>

      </div>


      <div class="main-metric">

        <span>
          Teto
        </span>

        <strong>

          ${formatarPontosRecomendacao(
            metricas.teto
          )}

        </strong>

      </div>

    </div>


    <div class="player-indicators">

      ${criarBarraIndicadorRecomendacao(

        "Confiança",

        confiancaNumero,

        classeConfianca

      )}


      ${criarBarraIndicadorRecomendacao(

        "Regularidade",

        regularidade,

        "regularity"

      )}

    </div>


    <div class="player-badges">

      <span
        class="
          player-badge
          ${classeConfianca}
        "
      >

        Confiança

        ${
          possuiNumeroRecomendacao(
            confiancaNumero
          )

            ? `${Math.round(
                confiancaNumero
              )}%`

            : "Não informada"
        }

      </span>


      <span
        class="
          player-badge
          ${classeRisco}
        "
      >

        Risco

        ${escaparHtmlRecomendacao(
          textoRisco
        )}

      </span>


      <span class="player-badge value">

        Custo-benefício

        ${formatarDecimalRecomendacao(
          jogador?.custoBeneficio,
          2
        )}

      </span>


      <span class="player-badge score">

        Nota

        ${formatarDecimalRecomendacao(
          notaExibida,
          0
        )}

      </span>

    </div>


    <div class="player-main-reason">

      <span class="player-main-reason-icon">
        ✓
      </span>


      <div>

        <strong>
          Principal motivo
        </strong>

        <p>

          ${escaparHtmlRecomendacao(
            motivoPrincipal
          )}

        </p>

      </div>

    </div>


    <button
      class="player-details-button"
      type="button"
      aria-expanded="false"
      aria-controls="${idDetalhes}"
      data-player-details-button="${idDetalhes}"
    >

      <span>
        Ver análise completa
      </span>

      <span class="player-details-arrow">
        +
      </span>

    </button>


    <div
      class="player-complete-analysis"
      id="${idDetalhes}"
      hidden
    >

      <div class="player-secondary-metrics">

        <div>

          <span>
            Média geral
          </span>

          <strong>

            ${formatarPontosRecomendacao(
              jogador?.mediaGeral
            )}

          </strong>

        </div>


        <div>

          <span>
            Média recente
          </span>

          <strong>

            ${formatarPontosRecomendacao(
              jogador?.mediaRecente
            )}

          </strong>

        </div>


        <div>

          <span>
            Mediana
          </span>

          <strong>

            ${formatarPontosRecomendacao(
              jogador?.mediana
            )}

          </strong>

        </div>


        <div>

          <span>
            Titularidade
          </span>

          <strong>

            ${formatarPorcentagemRecomendacao(
              jogador?.titularidade
            )}

          </strong>

        </div>

      </div>


      ${criarResumoMotorHtml(

        jogador,

        resultadoMotor

      )}


      <div class="player-analysis-box positive">

        <h4>

          <span>
            ✓
          </span>

          Por que foi recomendado

        </h4>


        <ul>

          ${criarItensListaRecomendacao(
            justificativas
          )}

        </ul>

      </div>


      <div class="player-analysis-box attention">

        <h4>

          <span>
            !
          </span>

          Pontos de atenção

        </h4>


        <ul>

          ${criarItensListaRecomendacao(
            pontosAtencao
          )}

        </ul>

      </div>


      <details class="player-details">

        <summary>
          Ver composição da nota
        </summary>


        <div class="components-list">
          ${componentes}
        </div>

      </details>

    </div>

  `;


  return card;

}


/* =========================================================
   29. BOTÕES DA ANÁLISE COMPLETA
   ========================================================= */


function configurarBotoesAnaliseJogador() {

  const botoes =
    document.querySelectorAll(
      "[data-player-details-button]"
    );


  botoes.forEach(
    botao => {

      botao.addEventListener(
        "click",
        () => {

          alternarAnaliseJogador(
            botao
          );

        }
      );

    }
  );

}


/* =========================================================
   30. ABRIR E FECHAR ANÁLISE
   ========================================================= */


function alternarAnaliseJogador(
  botao
) {

  const idDetalhes =
    botao.dataset
      .playerDetailsButton;


  const detalhes =
    document.getElementById(
      idDetalhes
    );


  if (!detalhes) {

    return;

  }


  const aberto =
    botao.getAttribute(
      "aria-expanded"
    ) ===
    "true";


  botao.setAttribute(
    "aria-expanded",
    String(
      !aberto
    )
  );


  detalhes.hidden =
    aberto;


  const texto =
    botao.querySelector(
      "span:first-child"
    );


  const seta =
    botao.querySelector(
      ".player-details-arrow"
    );


  if (texto) {

    texto.textContent =
      aberto
        ? "Ver análise completa"
        : "Ocultar análise completa";

  }


  if (seta) {

    seta.textContent =
      aberto
        ? "+"
        : "−";

  }


  botao.classList.toggle(
    "open",
    !aberto
  );

}


/* =========================================================
   31. API GLOBAL PARA FUTUROS FILTROS
   ========================================================= */


if (
  typeof window !==
    "undefined"
) {

  window.CartolaRecomendacoesCards = {

    renderizar:
      exibirJogadoresDaPosicao,

    atualizar:
      exibirJogadoresDaPosicao,

    criarCard:
      criarCardJogador,

    obterNomeCurto:
      obterNomeCurtoRecomendacao

  };

}
