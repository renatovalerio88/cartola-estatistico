/* =========================================================
   CARTOLA ESTATÍSTICO
   Análise da Rodada

   Responsabilidades:

   - descobrir a rodada atual;
   - carregar partidas da rodada;
   - aproveitar os jogadores já processados;
   - analisar força ofensiva;
   - analisar segurança defensiva / SG;
   - identificar jogo mais aberto;
   - identificar posição favorecida;
   - preencher automaticamente a aba Análise da rodada;
   - substituir o antigo placeholder.

   ========================================================= */


const AnaliseRodada = (() => {

  "use strict";


  /* =======================================================
     ESTADO
     ======================================================= */

  const estado = {

    rodada: null,

    partidas: [],

    jogadores: [],

    analises: [],

    carregado: false,

    erro: null

  };


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function numero(
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


  function limitar(
    valor,
    minimo,
    maximo
  ) {

    return Math.min(
      maximo,
      Math.max(
        minimo,
        numero(
          valor,
          minimo
        )
      )
    );

  }


  function arredondar(
    valor,
    casas = 1
  ) {

    return Number(
      numero(
        valor,
        0
      ).toFixed(
        casas
      )
    );

  }


  function texto(
    valor,
    padrao = ""
  ) {

    const resultado =
      String(
        valor ??
        ""
      ).trim();


    return resultado ||
      padrao;

  }


  function escaparHtml(
    valor
  ) {

    return String(
      valor ??
      ""
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


  function normalizarId(
    valor
  ) {

    if (
      valor === null ||
      valor === undefined
    ) {

      return "";

    }


    return String(
      valor
    );

  }


  function normalizarSigla(
    valor
  ) {

    return texto(
      valor
    )
      .toUpperCase();

  }


  /* =======================================================
     FETCH
     ======================================================= */

  async function buscarJson(
    caminho
  ) {

    try {

      const resposta =
        await fetch(
          caminho,
          {
            cache: "no-store"
          }
        );


      if (
        !resposta.ok
      ) {

        return null;

      }


      return await resposta.json();


    } catch (erro) {

      console.warn(
        `Falha ao carregar ${caminho}:`,
        erro
      );


      return null;

    }

  }


  /* =======================================================
     RODADA ATUAL
     ======================================================= */

  async function carregarRodadaAtual() {

    const status =
      await buscarJson(
        "data/api/status.json"
      );


    const rodada =
      numero(
        status?.rodada_atual ??
        status?.rodadaAtual ??
        status?.rodada,
        0
      );


    if (
      rodada > 0
    ) {

      estado.rodada =
        Math.trunc(
          rodada
        );


      return estado.rodada;

    }


    const elemento =
      document.getElementById(
        "roundNumber"
      );


    const rodadaTela =
      numero(
        elemento?.textContent,
        0
      );


    estado.rodada =
      rodadaTela > 0
        ? Math.trunc(
            rodadaTela
          )
        : null;


    return estado.rodada;

  }


  /* =======================================================
     PARTIDAS
     ======================================================= */

  async function carregarPartidas(
    rodada
  ) {

    if (!rodada) {

      return [];

    }


    const codigo =
      String(
        rodada
      ).padStart(
        2,
        "0"
      );


    const dados =
      await buscarJson(
        `data/api/rodada-${codigo}/partidas.json`
      );


    if (
      Array.isArray(
        dados
      )
    ) {

      return dados;

    }


    if (
      Array.isArray(
        dados?.partidas
      )
    ) {

      return dados.partidas;

    }


    return [];

  }


  /* =======================================================
     JOGADORES
     ======================================================= */

  function obterJogadoresProcessados() {

    const fontes = [

      () => {

        if (
          typeof window
            .obterJogadoresCarregados ===
            "function"
        ) {

          return window
            .obterJogadoresCarregados();

        }


        return [];

      },


      () => {

        if (
          window.CartolaRecomendacoes &&
          typeof window
            .CartolaRecomendacoes
            .obterJogadoresCarregados ===
            "function"
        ) {

          return window
            .CartolaRecomendacoes
            .obterJogadoresCarregados();

        }


        return [];

      },


      () => {

        if (
          typeof window
            .obterJogadores ===
            "function"
        ) {

          return window
            .obterJogadores();

        }


        return [];

      }

    ];


    for (
      const fonte of fontes
    ) {

      try {

        const jogadores =
          fonte();


        if (
          Array.isArray(
            jogadores
          ) &&
          jogadores.length > 0
        ) {

          return jogadores;

        }

      } catch (_) {

        /*
         * tenta a próxima fonte
         */

      }

    }


    return [];

  }


  /* =======================================================
     DADOS DOS CLUBES
     ======================================================= */

  function extrairClubesPartidas(
    partidas
  ) {

    const clubes =
      new Map();


    partidas.forEach(
      partida => {

        const mandanteId =
          partida?.clube_casa_id ??
          partida?.clubeCasaId ??
          partida?.mandante_id ??
          partida?.mandanteId;


        const visitanteId =
          partida?.clube_visitante_id ??
          partida?.clubeVisitanteId ??
          partida?.visitante_id ??
          partida?.visitanteId;


        if (
          mandanteId !== null &&
          mandanteId !== undefined
        ) {

          clubes.set(
            normalizarId(
              mandanteId
            ),
            {
              id:
                mandanteId,

              mando:
                "CASA",

              adversarioId:
                visitanteId,

              partida
            }
          );

        }


        if (
          visitanteId !== null &&
          visitanteId !== undefined
        ) {

          clubes.set(
            normalizarId(
              visitanteId
            ),
            {
              id:
                visitanteId,

              mando:
                "FORA",

              adversarioId:
                mandanteId,

              partida
            }
          );

        }

      }
    );


    return clubes;

  }


  /* =======================================================
     IDENTIFICAÇÃO DO CLUBE DO JOGADOR
     ======================================================= */

  function obterClubeIdJogador(
    jogador
  ) {

    return (
      jogador?.clubeId ??
      jogador?.clube_id ??
      jogador?.clube?.id ??
      null
    );

  }


  function obterNomeClubeJogador(
    jogador
  ) {

    return (
      texto(
        jogador?.siglaClube
      )
      ||
      texto(
        jogador?.clube?.abreviacao
      )
      ||
      texto(
        jogador?.clube
      )
      ||
      "TIME"
    );

  }


  /* =======================================================
     PROJEÇÃO
     ======================================================= */

  function obterProjecao(
    jogador
  ) {

    const possibilidades = [

      jogador?.projecaoViabilidade,

      jogador?.projecaoContextualizada,

      jogador?.projecaoCalibrada,

      jogador?.projecao,

      jogador?.score

    ];


    for (
      const valor of
      possibilidades
    ) {

      const convertido =
        Number(valor);


      if (
        Number.isFinite(
          convertido
        )
      ) {

        return convertido;

      }

    }


    return 0;

  }


  /* =======================================================
     CONFIANÇA
     ======================================================= */

  function obterConfianca(
    jogador
  ) {

    const valor =
      numero(
        jogador?.confiancaNumerica ??
        jogador?.confianca,
        50
      );


    return limitar(
      valor,
      0,
      100
    );

  }


  /* =======================================================
     TITULARIDADE
     ======================================================= */

  function obterTitularidade(
    jogador
  ) {

    const valor =
      numero(
        jogador?.titularidade ??
        jogador?.probabilidadeTitular ??
        jogador?.chanceTitularidade,
        50
      );


    if (
      valor >= 0 &&
      valor <= 1
    ) {

      return valor * 100;

    }


    return limitar(
      valor,
      0,
      100
    );

  }


  /* =======================================================
     ADEQUAÇÃO
     ======================================================= */

  function obterAdequacao(
    jogador
  ) {

    const valor =
      numero(
        jogador?.notaAdequacaoRodada ??
        jogador?.adequacaoRodada?.nota,
        50
      );


    return limitar(
      valor,
      0,
      100
    );

  }


  /* =======================================================
     RISCO
     ======================================================= */

  function obterRisco(
    jogador
  ) {

    return limitar(
      numero(
        jogador?.riscoEscalacao ??
        jogador?.riscoNumerico ??
        jogador?.risco,
        50
      ),
      0,
      100
    );

  }


  /* =======================================================
     AGRUPAMENTO POR CLUBE
     ======================================================= */

  function agruparJogadoresPorClube(
    jogadores
  ) {

    const mapa =
      new Map();


    jogadores.forEach(
      jogador => {

        const clubeId =
          obterClubeIdJogador(
            jogador
          );


        const chave =
          clubeId !== null &&
          clubeId !== undefined
            ? normalizarId(
                clubeId
              )
            : normalizarSigla(
                obterNomeClubeJogador(
                  jogador
                )
              );


        if (!chave) {

          return;

        }


        if (
          !mapa.has(
            chave
          )
        ) {

          mapa.set(
            chave,
            []
          );

        }


        mapa
          .get(
            chave
          )
          .push(
            jogador
          );

      }
    );


    return mapa;

  }


  /* =======================================================
     MÉDIA
     ======================================================= */

  function media(
    valores
  ) {

    const validos =
      valores
        .map(
          valor =>
            Number(valor)
        )
        .filter(
          Number.isFinite
        );


    if (
      validos.length === 0
    ) {

      return 0;

    }


    return validos.reduce(
      (
        soma,
        valor
      ) =>
        soma + valor,
      0
    ) /
    validos.length;

  }


  /* =======================================================
     TOP JOGADORES DO CLUBE
     ======================================================= */

  function obterTopJogadores(
    jogadores,
    quantidade = 5
  ) {

    return jogadores
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          obterProjecao(
            b
          ) -
          obterProjecao(
            a
          )
      )
      .slice(
        0,
        quantidade
      );

  }


  /* =======================================================
     FORÇA OFENSIVA
     ======================================================= */

  function calcularForcaOfensiva(
    jogadores
  ) {

    const ofensivos =
      jogadores.filter(
        jogador =>
          [
            "MEI",
            "ATA",
            "LAT"
          ].includes(
            texto(
              jogador?.posicao
            ).toUpperCase()
          )
      );


    const base =
      ofensivos.length > 0
        ? ofensivos
        : jogadores;


    const top =
      obterTopJogadores(
        base,
        5
      );


    if (
      top.length === 0
    ) {

      return 0;

    }


    const projecao =
      media(
        top.map(
          obterProjecao
        )
      );


    const confianca =
      media(
        top.map(
          obterConfianca
        )
      );


    const adequacao =
      media(
        top.map(
          obterAdequacao
        )
      );


    const titularidade =
      media(
        top.map(
          obterTitularidade
        )
      );


    return (
      projecao * 5.5 +
      confianca * 0.16 +
      adequacao * 0.16 +
      titularidade * 0.13
    );

  }


  /* =======================================================
     FORÇA DEFENSIVA
     ======================================================= */

  function calcularForcaDefensiva(
    jogadores
  ) {

    const defensivos =
      jogadores.filter(
        jogador =>
          [
            "GOL",
            "LAT",
            "ZAG"
          ].includes(
            texto(
              jogador?.posicao
            ).toUpperCase()
          )
      );


    if (
      defensivos.length === 0
    ) {

      return 0;

    }


    const top =
      obterTopJogadores(
        defensivos,
        5
      );


    const projecao =
      media(
        top.map(
          obterProjecao
        )
      );


    const confianca =
      media(
        top.map(
          obterConfianca
        )
      );


    const titularidade =
      media(
        top.map(
          obterTitularidade
        )
      );


    const risco =
      media(
        top.map(
          obterRisco
        )
      );


    return (
      projecao * 5 +
      confianca * 0.20 +
      titularidade * 0.16 +
      (100 - risco) * 0.14
    );

  }


  /* =======================================================
     ANÁLISE DOS CLUBES
     ======================================================= */

  function analisarClubes(
    jogadores,
    partidas
  ) {

    const grupos =
      agruparJogadoresPorClube(
        jogadores
      );


    const clubesPartidas =
      extrairClubesPartidas(
        partidas
      );


    const analises = [];


    grupos.forEach(
      (
        lista,
        chave
      ) => {

        if (
          lista.length === 0
        ) {

          return;

        }


        const primeiro =
          lista[0];


        const clubeId =
          obterClubeIdJogador(
            primeiro
          );


        const infoPartida =
          clubesPartidas.get(
            normalizarId(
              clubeId
            )
          );


        const mando =
          infoPartida?.mando ??
          texto(
            primeiro?.mando
          ).toUpperCase();


        const fatorMando =
          mando === "CASA"
            ? 1.05
            : mando === "FORA"
              ? 0.97
              : 1;


        const ofensiva =
          calcularForcaOfensiva(
            lista
          ) *
          fatorMando;


        const defensiva =
          calcularForcaDefensiva(
            lista
          ) *
          fatorMando;


        analises.push({

          chave,

          clubeId,

          clube:
            obterNomeClubeJogador(
              primeiro
            ),

          mando,

          jogadores:
            lista,

          forcaOfensiva:
            arredondar(
              ofensiva,
              1
            ),

          forcaDefensiva:
            arredondar(
              defensiva,
              1
            ),

          projecaoMedia:
            arredondar(
              media(
                lista.map(
                  obterProjecao
                )
              ),
              2
            ),

          confiancaMedia:
            arredondar(
              media(
                lista.map(
                  obterConfianca
                )
              ),
              1
            ),

          adequacaoMedia:
            arredondar(
              media(
                lista.map(
                  obterAdequacao
                )
              ),
              1
            )

        });

      }
    );


    return analises;

  }


  /* =======================================================
     MELHOR ATAQUE
     ======================================================= */

  function obterMelhorAtaque(
    analises
  ) {

    return analises
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          b.forcaOfensiva -
          a.forcaOfensiva
      )[0] ??
      null;

  }


  /* =======================================================
     MAIOR CHANCE DE SG
     ======================================================= */

  function obterMelhorDefesa(
    analises
  ) {

    return analises
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          b.forcaDefensiva -
          a.forcaDefensiva
      )[0] ??
      null;

  }


  /* =======================================================
     NOMES DOS CLUBES NAS PARTIDAS
     ======================================================= */

  function obterSiglaPartida(
    partida,
    lado
  ) {

    const casa =
      lado === "casa";


    const possibilidades =
      casa
        ? [
            partida?.clube_casa?.abreviacao,
            partida?.clubeCasa?.abreviacao,
            partida?.clube_casa?.nome,
            partida?.clubeCasa?.nome,
            partida?.mandante?.abreviacao,
            partida?.mandante?.nome
          ]
        : [
            partida?.clube_visitante?.abreviacao,
            partida?.clubeVisitante?.abreviacao,
            partida?.clube_visitante?.nome,
            partida?.clubeVisitante?.nome,
            partida?.visitante?.abreviacao,
            partida?.visitante?.nome
          ];


    for (
      const valor of
      possibilidades
    ) {

      const resultado =
        texto(
          valor
        );


      if (
        resultado
      ) {

        return resultado;

      }

    }


    return casa
      ? "Mandante"
      : "Visitante";

  }


  /* =======================================================
     JOGO MAIS ABERTO
     ======================================================= */

  function obterJogoMaisAberto(
    partidas,
    analises
  ) {

    if (
      !Array.isArray(
        partidas
      ) ||
      partidas.length === 0
    ) {

      return null;

    }


    const porId =
      new Map();


    analises.forEach(
      analise => {

        if (
          analise.clubeId !== null &&
          analise.clubeId !== undefined
        ) {

          porId.set(
            normalizarId(
              analise.clubeId
            ),
            analise
          );

        }

      }
    );


    const resultados =
      partidas.map(
        partida => {

          const casaId =
            partida?.clube_casa_id ??
            partida?.clubeCasaId ??
            partida?.mandante_id ??
            partida?.mandanteId;


          const foraId =
            partida?.clube_visitante_id ??
            partida?.clubeVisitanteId ??
            partida?.visitante_id ??
            partida?.visitanteId;


          const casa =
            porId.get(
              normalizarId(
                casaId
              )
            );


          const fora =
            porId.get(
              normalizarId(
                foraId
              )
            );


          const forcaCasa =
            numero(
              casa?.forcaOfensiva,
              0
            );


          const forcaFora =
            numero(
              fora?.forcaOfensiva,
              0
            );


          const equilibrio =
            100 -
            Math.min(
              100,
              Math.abs(
                forcaCasa -
                forcaFora
              )
            );


          const abertura =
            forcaCasa +
            forcaFora +
            equilibrio * 0.25;


          return {

            partida,

            casa,

            fora,

            abertura

          };

        }
      );


    return resultados
      .sort(
        (
          a,
          b
        ) =>
          b.abertura -
          a.abertura
      )[0] ??
      null;

  }


  /* =======================================================
     POSIÇÃO EM DESTAQUE
     ======================================================= */

  function obterPosicaoDestaque(
    jogadores
  ) {

    const posicoes = [
      "GOL",
      "LAT",
      "ZAG",
      "MEI",
      "ATA",
      "TEC"
    ];


    const resultados =
      posicoes.map(
        posicao => {

          const lista =
            jogadores
              .filter(
                jogador =>
                  texto(
                    jogador?.posicao
                  ).toUpperCase() ===
                  posicao
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  obterProjecao(
                    b
                  ) -
                  obterProjecao(
                    a
                  )
              )
              .slice(
                0,
                5
              );


          return {

            posicao,

            quantidade:
              lista.length,

            projecao:
              media(
                lista.map(
                  obterProjecao
                )
              ),

            adequacao:
              media(
                lista.map(
                  obterAdequacao
                )
              ),

            confianca:
              media(
                lista.map(
                  obterConfianca
                )
              )

          };

        }
      )
      .filter(
        item =>
          item.quantidade > 0
      )
      .map(
        item => ({

          ...item,

          nota:
            item.projecao * 5 +
            item.adequacao * 0.25 +
            item.confianca * 0.20

        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.nota -
          a.nota
      );


    return resultados[0] ??
      null;

  }


  /* =======================================================
     NOMES DAS POSIÇÕES
     ======================================================= */

  function nomePosicao(
    codigo
  ) {

    const nomes = {

      GOL:
        "Goleiros",

      LAT:
        "Laterais",

      ZAG:
        "Zagueiros",

      MEI:
        "Meias",

      ATA:
        "Atacantes",

      TEC:
        "Treinadores"

    };


    return nomes[
      codigo
    ] ??
    codigo ??
    "--";

  }


  /* =======================================================
     ATUALIZA CARD
     ======================================================= */

  function atualizarCard(
    card,
    valor,
    descricao
  ) {

    if (!card) {

      return;

    }


    const strong =
      card.querySelector(
        "strong"
      );


    const small =
      card.querySelector(
        "small"
      );


    if (
      strong
    ) {

      strong.textContent =
        valor ||
        "--";

    }


    if (
      small
    ) {

      small.textContent =
        descricao ||
        "Dados insuficientes";

    }

  }


  /* =======================================================
     CARDS PRINCIPAIS
     ======================================================= */

  function renderizarResumo(
    melhorAtaque,
    melhorDefesa,
    jogoAberto,
    posicaoDestaque
  ) {

    const container =
      document.querySelector(
        "#analise .analysis-summary"
      );


    if (!container) {

      return;

    }


    const cards =
      container.querySelectorAll(
        ".analysis-card"
      );


    atualizarCard(
      cards[0],

      melhorAtaque?.clube ??
      "--",

      melhorAtaque
        ? `Força ofensiva ${arredondar(
            melhorAtaque.forcaOfensiva,
            1
          )}`
        : "Dados insuficientes"
    );


    atualizarCard(
      cards[1],

      melhorDefesa?.clube ??
      "--",

      melhorDefesa
        ? `Índice defensivo ${arredondar(
            melhorDefesa.forcaDefensiva,
            1
          )}`
        : "Dados insuficientes"
    );


    if (
      jogoAberto
    ) {

      const casa =
        jogoAberto.casa?.clube ||
        obterSiglaPartida(
          jogoAberto.partida,
          "casa"
        );


      const fora =
        jogoAberto.fora?.clube ||
        obterSiglaPartida(
          jogoAberto.partida,
          "fora"
        );


      atualizarCard(
        cards[2],

        `${casa} x ${fora}`,

        "Maior combinação de força ofensiva e equilíbrio"
      );

    } else {

      atualizarCard(
        cards[2],
        "--",
        "Dados insuficientes"
      );

    }


    atualizarCard(
      cards[3],

      posicaoDestaque
        ? nomePosicao(
            posicaoDestaque.posicao
          )
        : "--",

      posicaoDestaque
        ? `Projeção média ${arredondar(
            posicaoDestaque.projecao,
            2
          )} pts`
        : "Dados insuficientes"
    );

  }


  /* =======================================================
     DETALHAMENTO DOS CLUBES
     ======================================================= */

  function criarHtmlClubes(
    analises
  ) {

    const ordenadas =
      analises
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            (
              b.forcaOfensiva +
              b.forcaDefensiva
            ) -
            (
              a.forcaOfensiva +
              a.forcaDefensiva
            )
        );


    if (
      ordenadas.length === 0
    ) {

      return `
        <div class="empty-state">
          <strong>
            Dados insuficientes para análise
          </strong>

          <p>
            As partidas foram carregadas, mas ainda não
            existem informações estatísticas suficientes
            dos jogadores para comparar os clubes.
          </p>
        </div>
      `;

    }


    const linhas =
      ordenadas.map(
        analise => {

          const mando =
            analise.mando === "CASA"
              ? "Casa"
              : analise.mando === "FORA"
                ? "Fora"
                : "Mando não identificado";


          return `
            <article class="analysis-card">

              <span>
                ${escaparHtml(
                  mando
                )}
              </span>

              <strong>
                ${escaparHtml(
                  analise.clube
                )}
              </strong>

              <small>
                Ataque:
                ${arredondar(
                  analise.forcaOfensiva,
                  1
                )}
                · Defesa:
                ${arredondar(
                  analise.forcaDefensiva,
                  1
                )}
                · Projeção:
                ${arredondar(
                  analise.projecaoMedia,
                  2
                )}
                pts
                · Confiança:
                ${arredondar(
                  analise.confiancaMedia,
                  0
                )}%
              </small>

            </article>
          `;

        }
      )
      .join(
        ""
      );


    return `
      <div class="section-header">
        <div>
          <p class="section-label">
            LEITURA ESTATÍSTICA
          </p>

          <h2>
            Força dos clubes na rodada
          </h2>
        </div>
      </div>

      <div class="analysis-summary">
        ${linhas}
      </div>
    `;

  }


  /* =======================================================
     DETALHAMENTO DOS CONFRONTOS
     ======================================================= */

  function criarHtmlPartidas(
    partidas,
    analises
  ) {

    if (
      !Array.isArray(
        partidas
      ) ||
      partidas.length === 0
    ) {

      return `
        <div class="empty-state">
          <strong>
            Partidas ainda não disponíveis
          </strong>

          <p>
            O arquivo de confrontos da rodada atual
            ainda não possui partidas válidas.
          </p>
        </div>
      `;

    }


    const porId =
      new Map();


    analises.forEach(
      analise => {

        if (
          analise.clubeId !== null &&
          analise.clubeId !== undefined
        ) {

          porId.set(
            normalizarId(
              analise.clubeId
            ),
            analise
          );

        }

      }
    );


    const linhas =
      partidas.map(
        partida => {

          const casaId =
            partida?.clube_casa_id ??
            partida?.clubeCasaId ??
            partida?.mandante_id ??
            partida?.mandanteId;


          const foraId =
            partida?.clube_visitante_id ??
            partida?.clubeVisitanteId ??
            partida?.visitante_id ??
            partida?.visitanteId;


          const casa =
            porId.get(
              normalizarId(
                casaId
              )
            );


          const fora =
            porId.get(
              normalizarId(
                foraId
              )
            );


          const nomeCasa =
            casa?.clube ||
            obterSiglaPartida(
              partida,
              "casa"
            );


          const nomeFora =
            fora?.clube ||
            obterSiglaPartida(
              partida,
              "fora"
            );


          const ataqueCasa =
            numero(
              casa?.forcaOfensiva,
              0
            );


          const ataqueFora =
            numero(
              fora?.forcaOfensiva,
              0
            );


          let leitura =
            "Confronto equilibrado";


          if (
            ataqueCasa >
            ataqueFora + 8
          ) {

            leitura =
              `${nomeCasa} com vantagem ofensiva`;

          }
          else if (
            ataqueFora >
            ataqueCasa + 8
          ) {

            leitura =
              `${nomeFora} com vantagem ofensiva`;

          }


          return `
            <article class="analysis-card">

              <span>
                CONFRONTO
              </span>

              <strong>
                ${escaparHtml(
                  nomeCasa
                )}
                x
                ${escaparHtml(
                  nomeFora
                )}
              </strong>

              <small>
                ${escaparHtml(
                  leitura
                )}
              </small>

            </article>
          `;

        }
      )
      .join(
        ""
      );


    return `
      <div class="section-header">
        <div>
          <p class="section-label">
            CONFRONTOS
          </p>

          <h2>
            Leitura dos jogos
          </h2>
        </div>
      </div>

      <div class="analysis-summary">
        ${linhas}
      </div>
    `;

  }


  /* =======================================================
     CONTAINER DE DETALHES
     ======================================================= */

  function obterContainerDetalhes() {

    const secao =
      document.getElementById(
        "analise"
      );


    if (!secao) {

      return null;

    }


    let container =
      secao.querySelector(
        "[data-analise-detalhes]"
      );


    if (
      container
    ) {

      return container;

    }


    /*
     * Remove apenas o placeholder antigo.
     */

    const placeholders =
      secao.querySelectorAll(
        ":scope > .empty-state"
      );


    placeholders.forEach(
      elemento => {

        elemento.remove();

      }
    );


    container =
      document.createElement(
        "div"
      );


    container.setAttribute(
      "data-analise-detalhes",
      "true"
    );


    container.className =
      "analysis-details";


    secao.appendChild(
      container
    );


    return container;

  }


  /* =======================================================
     RENDERIZA DETALHES
     ======================================================= */

  function renderizarDetalhes(
    partidas,
    analises
  ) {

    const container =
      obterContainerDetalhes();


    if (!container) {

      return;

    }


    container.innerHTML =
      criarHtmlPartidas(
        partidas,
        analises
      )
      +
      criarHtmlClubes(
        analises
      );

  }


  /* =======================================================
     ERRO
     ======================================================= */

  function renderizarErro(
    mensagem
  ) {

    const container =
      obterContainerDetalhes();


    if (
      !container
    ) {

      return;

    }


    container.innerHTML = `
      <div class="empty-state">

        <strong>
          Não foi possível montar a análise da rodada
        </strong>

        <p>
          ${escaparHtml(
            mensagem
          )}
        </p>

      </div>
    `;

  }


  /* =======================================================
     EXECUÇÃO PRINCIPAL
     ======================================================= */

  async function carregar() {

    try {

      estado.erro =
        null;


      const rodada =
        await carregarRodadaAtual();


      if (!rodada) {

        throw new Error(
          "Rodada atual não identificada."
        );

      }


      const partidas =
        await carregarPartidas(
          rodada
        );


      /*
       * Recomendações normalmente já estarão carregadas.
       *
       * Se ainda não estiverem, aguardamos alguns ciclos
       * curtos antes de concluir que não existem jogadores.
       */

      let jogadores =
        obterJogadoresProcessados();


      for (
        let tentativa = 0;
        tentativa < 10 &&
        jogadores.length === 0;
        tentativa += 1
      ) {

        await new Promise(
          resolver =>
            setTimeout(
              resolver,
              150
            )
        );


        jogadores =
          obterJogadoresProcessados();

      }


      const analises =
        analisarClubes(
          jogadores,
          partidas
        );


      estado.partidas =
        partidas;


      estado.jogadores =
        jogadores;


      estado.analises =
        analises;


      const melhorAtaque =
        obterMelhorAtaque(
          analises
        );


      const melhorDefesa =
        obterMelhorDefesa(
          analises
        );


      const jogoAberto =
        obterJogoMaisAberto(
          partidas,
          analises
        );


      const posicaoDestaque =
        obterPosicaoDestaque(
          jogadores
        );


      renderizarResumo(
        melhorAtaque,
        melhorDefesa,
        jogoAberto,
        posicaoDestaque
      );


      renderizarDetalhes(
        partidas,
        analises
      );


      estado.carregado =
        true;


      console.info(
        "Análise da rodada carregada:",
        {
          rodada,
          partidas:
            partidas.length,
          jogadores:
            jogadores.length,
          clubes:
            analises.length
        }
      );


      return obterEstado();


    } catch (erro) {

      estado.erro =
        erro?.message ||
        String(
          erro
        );


      estado.carregado =
        false;


      console.error(
        "Erro na análise da rodada:",
        erro
      );


      renderizarErro(
        estado.erro
      );


      return obterEstado();

    }

  }


  /* =======================================================
     RECALCULAR
     ======================================================= */

  async function recalcular() {

    estado.carregado =
      false;


    return carregar();

  }


  /* =======================================================
     ESTADO PÚBLICO
     ======================================================= */

  function obterEstado() {

    return {

      rodada:
        estado.rodada,

      partidas:
        estado.partidas.slice(),

      jogadores:
        estado.jogadores.slice(),

      analises:
        estado.analises.map(
          item => ({
            ...item,
            jogadores:
              item.jogadores.slice()
          })
        ),

      carregado:
        estado.carregado,

      erro:
        estado.erro

    };

  }


  /* =======================================================
     EVENTOS
     ======================================================= */

  function instalarEventos() {

    /*
     * Quando recomendações terminarem de carregar,
     * refazemos a análise com a base estatística pronta.
     */

    window.addEventListener(
      "cartola:recomendacoes-atualizadas",
      () => {

        setTimeout(
          recalcular,
          100
        );

      }
    );


    /*
     * Se os filtros manuais mudarem, a análise também
     * acompanha a nova base ativa.
     */

    window.addEventListener(
      "cartola:filtros-aplicados",
      () => {

        setTimeout(
          recalcular,
          100
        );

      }
    );


    /*
     * Ao abrir a aba, garantimos que os dados estejam
     * atualizados.
     */

    document.addEventListener(
      "click",
      evento => {

        const botao =
          evento.target.closest(
            '[data-tab="analise"]'
          );


        if (!botao) {

          return;

        }


        if (
          !estado.carregado
        ) {

          carregar();

        }

      }
    );

  }


  /* =======================================================
     API
     ======================================================= */

  return {

    carregar,

    recalcular,

    obterEstado

  };

})();


/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */

if (
  typeof window !==
  "undefined"
) {

  window.AnaliseRodada =
    AnaliseRodada;


  window.CartolaAnaliseRodada =
    AnaliseRodada;


  window.addEventListener(
    "DOMContentLoaded",
    () => {

      /*
       * Não bloqueia a inicialização principal.
       */

      setTimeout(
        () => {

          AnaliseRodada.carregar();

        },
        500
      );

    }
  );

}
