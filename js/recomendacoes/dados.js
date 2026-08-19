/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — carregamento e estado dos dados

   Responsabilidades:

   - carregar jogadores da rodada atual;
   - carregar histórico individual;
   - executar a calculadora estatística;
   - preservar a lista original;
   - controlar exclusões manuais de clubes;
   - controlar exclusões manuais de jogadores;
   - fornecer a mesma lista filtrada para:
       * Recomendações;
       * Times sugeridos;
       * Capitão;
       * Banco;
       * Reserva de Luxo.

   IMPORTANTE:

   Os filtros NÃO alteram os dados originais.
   Eles apenas retiram atletas da lista disponível
   para ranking e montagem das escalações.

   ========================================================= */


const CAMINHO_STATUS =
    "data/api/status.json";


let CAMINHO_JOGADORES =
    "";


/* =========================================================
   ESTADO GLOBAL
   ========================================================= */


const estadoRecomendacoes = {

    jogadores: [],

    jogadoresOriginais: [],

    carregado: false,

    carregando: false,

    erro: null,

    posicaoAtiva: "GOL",

    calculadoraAplicada: false,

    filtros: {

        clubesExcluidos:
            new Set(),

        jogadoresExcluidos:
            new Set()

    }

};


/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */


function normalizarChaveFiltro(
    valor
) {

    return String(
        valor ?? ""
    )
        .trim()
        .toUpperCase();

}


function obterChaveClubeJogador(
    jogador
) {

    if (!jogador) {

        return "";

    }


    const clubeId =
        jogador.clubeId ??
        jogador.clube_id;


    if (
        clubeId !== null &&
        clubeId !== undefined &&
        clubeId !== ""
    ) {

        return (
            "ID:" +
            String(
                clubeId
            )
        );

    }


    const sigla =

        jogador.siglaClube

        ||

        jogador.clube

        ||

        "";


    return (
        "NOME:" +
        normalizarChaveFiltro(
            sigla
        )
    );

}


function obterChaveJogadorFiltro(
    jogadorOuId
) {

    if (
        jogadorOuId &&
        typeof jogadorOuId ===
            "object"
    ) {

        return String(

            jogadorOuId.id

            ??

            jogadorOuId.atletaId

            ??

            jogadorOuId.atleta_id

            ??

            ""

        );

    }


    return String(
        jogadorOuId ?? ""
    );

}


/* =========================================================
   CÓPIA SEGURA
   ========================================================= */


function copiarJogador(
    jogador
) {

    return {

        ...jogador,

        scouts: {
            ...(jogador?.scouts || {})
        },

        notas: (
            jogador?.notas &&
            typeof jogador.notas ===
                "object"
        )
            ? {
                ...jogador.notas
            }
            : jogador?.notas,

        componentes: (
            jogador?.componentes &&
            typeof jogador.componentes ===
                "object"
        )
            ? {
                ...jogador.componentes
            }
            : jogador?.componentes

    };

}


/* =========================================================
   VALIDAÇÃO DO JOGADOR
   ========================================================= */


function validarJogador(
    jogador
) {

    return Boolean(

        jogador &&

        (
            jogador.id !== null &&
            jogador.id !== undefined
        ) &&

        (
            jogador.nome ||
            jogador.apelido
        ) &&

        jogador.posicao

    );

}


/* =========================================================
   FILTRO — CLUBE
   ========================================================= */


function clubeEstaExcluido(
    jogador
) {

    const chave =
        obterChaveClubeJogador(
            jogador
        );


    if (!chave) {

        return false;

    }


    return estadoRecomendacoes
        .filtros
        .clubesExcluidos
        .has(
            chave
        );

}


/* =========================================================
   FILTRO — JOGADOR
   ========================================================= */


function jogadorEstaExcluido(
    jogador
) {

    const chave =
        obterChaveJogadorFiltro(
            jogador
        );


    if (!chave) {

        return false;

    }


    return estadoRecomendacoes
        .filtros
        .jogadoresExcluidos
        .has(
            chave
        );

}


/* =========================================================
   DISPONIBILIDADE MANUAL
   ========================================================= */


function jogadorDisponivelPelosFiltros(
    jogador
) {

    if (!jogador) {

        return false;

    }


    if (
        clubeEstaExcluido(
            jogador
        )
    ) {

        return false;

    }


    if (
        jogadorEstaExcluido(
            jogador
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   LISTA FILTRADA
   ========================================================= */


function aplicarFiltrosRecomendacoes(
    jogadores
) {

    const lista =
        Array.isArray(
            jogadores
        )
            ? jogadores
            : [];


    return lista.filter(
        jogador =>
            jogadorDisponivelPelosFiltros(
                jogador
            )
    );

}


/* =========================================================
   CARREGAMENTO DOS JOGADORES
   ========================================================= */


async function carregarJogadores() {

    if (
        estadoRecomendacoes.carregando
    ) {

        return estadoRecomendacoes
            .jogadores
            .map(
                copiarJogador
            );

    }


    estadoRecomendacoes.carregando =
        true;


    estadoRecomendacoes.carregado =
        false;


    estadoRecomendacoes.erro =
        null;


    exibirCarregamentoJogadores();


    try {

        /* =============================================
           STATUS
           ============================================= */

        const statusResposta =
            await fetch(

                CAMINHO_STATUS,

                {
                    cache:
                        "no-store"
                }

            );


        if (
            !statusResposta.ok
        ) {

            throw new Error(
                "Erro ao carregar status.json"
            );

        }


        const status =
            await statusResposta.json();


        const rodada =
            Number(
                status.rodada_atual
            );


        if (
            !Number.isFinite(
                rodada
            ) ||
            rodada <= 0
        ) {

            throw new Error(
                "Rodada atual inválida."
            );

        }


        /* =============================================
           CAMINHO DA RODADA
           ============================================= */

        CAMINHO_JOGADORES =

            `data/api/rodada-${String(
                rodada
            ).padStart(
                2,
                "0"
            )}/jogadores.json`;


        /* =============================================
           JOGADORES
           ============================================= */

        const resposta =
            await fetch(

                CAMINHO_JOGADORES,

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


        const dados =
            await resposta.json();


        if (
            !Array.isArray(
                dados
            )
        ) {

            throw new Error(
                "Lista de jogadores inválida."
            );

        }


        const jogadoresValidos =
            dados.filter(
                validarJogador
            );


        /* =============================================
           HISTÓRICO
           ============================================= */

        let jogadoresComHistorico =
            jogadoresValidos;


        if (
            typeof HistoricoJogadores !==
                "undefined" &&
            HistoricoJogadores &&
            typeof HistoricoJogadores.carregar ===
                "function"
        ) {

            jogadoresComHistorico =
                await HistoricoJogadores
                    .carregar(
                        jogadoresValidos
                    );

        }


        /* =============================================
           CALCULADORA
           ============================================= */

        let jogadoresCalculados =
            jogadoresComHistorico;


        if (
            typeof MotorCalculadora !==
                "undefined" &&
            MotorCalculadora &&
            typeof MotorCalculadora
                .analisarListaJogadores ===
                "function"
        ) {

            jogadoresCalculados =
                MotorCalculadora
                    .analisarListaJogadores(
                        jogadoresComHistorico
                    );

        }


        if (
            !Array.isArray(
                jogadoresCalculados
            )
        ) {

            jogadoresCalculados =
                jogadoresComHistorico;

        }


        /* =============================================
           ESTADO
           ============================================= */

        estadoRecomendacoes.jogadores =
            jogadoresCalculados
                .filter(
                    validarJogador
                )
                .map(
                    copiarJogador
                );


        estadoRecomendacoes
            .jogadoresOriginais =
            estadoRecomendacoes
                .jogadores
                .map(
                    copiarJogador
                );


        estadoRecomendacoes
            .calculadoraAplicada =
            Boolean(

                typeof MotorCalculadora !==
                    "undefined" &&

                MotorCalculadora

            );


        estadoRecomendacoes.carregado =
            true;


        estadoRecomendacoes.carregando =
            false;


        iniciarRecomendacoes();


        console.log(

            "Jogadores carregados:",

            estadoRecomendacoes
                .jogadores
                .length

        );


        console.log(

            "Jogadores disponíveis após filtros:",

            obterJogadores()
                .length

        );


        return obterJogadores();


    }
    catch (erro) {

        console.error(
            erro
        );


        estadoRecomendacoes.erro =
            erro?.message ||
            String(
                erro
            );


        estadoRecomendacoes.carregado =
            false;


        estadoRecomendacoes.carregando =
            false;


        exibirErroJogadores(
            estadoRecomendacoes.erro
        );


        return [];

    }

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */


function iniciarRecomendacoes() {

    if (
        !estadoRecomendacoes.carregado
    ) {

        return;

    }


    if (
        typeof criarFiltrosPosicao ===
            "function"
    ) {

        criarFiltrosPosicao();

    }


    if (
        typeof criarFiltrosExclusaoRodada ===
            "function"
    ) {

        criarFiltrosExclusaoRodada();

    }


    if (
        typeof exibirDestaquesGerais ===
            "function"
    ) {

        exibirDestaquesGerais();

    }


    if (
        typeof exibirJogadoresDaPosicao ===
            "function"
    ) {

        exibirJogadoresDaPosicao();

    }

}


/* =========================================================
   TODOS OS JOGADORES PROCESSADOS
   ========================================================= */


function obterJogadoresCarregados() {

    return estadoRecomendacoes
        .jogadores
        .map(
            copiarJogador
        );

}


/* =========================================================
   JOGADORES DISPONÍVEIS APÓS FILTROS
   ========================================================= */


function obterJogadoresDisponiveisRecomendacoes() {

    return aplicarFiltrosRecomendacoes(

        estadoRecomendacoes
            .jogadores

    )
        .map(
            copiarJogador
        );

}


/* =========================================================
   INTERFACE COMPARTILHADA COM ESCALAÇÕES
   ========================================================= */


/*
 * IMPORTANTE:
 *
 * O motor de escalações consulta obterJogadores().
 *
 * Portanto, esta função deve devolver SOMENTE
 * jogadores ainda disponíveis após os filtros.
 */
function obterJogadores() {

    return obterJogadoresDisponiveisRecomendacoes();

}


function obterJogadoresParaEscalacoes() {

    return obterJogadoresDisponiveisRecomendacoes();

}


/* =========================================================
   JOGADOR POR ID
   ========================================================= */


function obterJogadorPorId(
    id
) {

    return estadoRecomendacoes
        .jogadores
        .find(

            jogador =>
                String(
                    jogador.id
                ) ===
                String(
                    id
                )

        )
        || null;

}


/* =========================================================
   POSIÇÃO ATIVA
   ========================================================= */


function obterPosicaoAtiva() {

    return estadoRecomendacoes
        .posicaoAtiva;

}


function definirPosicaoAtiva(
    posicao
) {

    estadoRecomendacoes
        .posicaoAtiva =
        String(
            posicao || "GOL"
        )
            .toUpperCase();

}


/* =========================================================
   EXCLUIR CLUBE
   ========================================================= */


function excluirClubeRecomendacoes(
    jogadorOuChave
) {

    const chave =
        typeof jogadorOuChave ===
            "object"

            ? obterChaveClubeJogador(
                jogadorOuChave
            )

            : String(
                jogadorOuChave ?? ""
            );


    if (!chave) {

        return false;

    }


    estadoRecomendacoes
        .filtros
        .clubesExcluidos
        .add(
            chave
        );


    emitirAlteracaoFiltrosRecomendacoes();


    return true;

}


/* =========================================================
   RESTAURAR CLUBE
   ========================================================= */


function restaurarClubeRecomendacoes(
    jogadorOuChave
) {

    const chave =
        typeof jogadorOuChave ===
            "object"

            ? obterChaveClubeJogador(
                jogadorOuChave
            )

            : String(
                jogadorOuChave ?? ""
            );


    const removido =
        estadoRecomendacoes
            .filtros
            .clubesExcluidos
            .delete(
                chave
            );


    if (removido) {

        emitirAlteracaoFiltrosRecomendacoes();

    }


    return removido;

}


/* =========================================================
   ALTERNAR CLUBE
   ========================================================= */


function alternarClubeRecomendacoes(
    chave,
    excluir
) {

    if (excluir) {

        return excluirClubeRecomendacoes(
            chave
        );

    }


    return restaurarClubeRecomendacoes(
        chave
    );

}


/* =========================================================
   EXCLUIR JOGADOR
   ========================================================= */


function excluirJogadorRecomendacoes(
    jogadorOuId
) {

    const chave =
        obterChaveJogadorFiltro(
            jogadorOuId
        );


    if (!chave) {

        return false;

    }


    estadoRecomendacoes
        .filtros
        .jogadoresExcluidos
        .add(
            chave
        );


    emitirAlteracaoFiltrosRecomendacoes();


    return true;

}


/* =========================================================
   RESTAURAR JOGADOR
   ========================================================= */


function restaurarJogadorRecomendacoes(
    jogadorOuId
) {

    const chave =
        obterChaveJogadorFiltro(
            jogadorOuId
        );


    const removido =
        estadoRecomendacoes
            .filtros
            .jogadoresExcluidos
            .delete(
                chave
            );


    if (removido) {

        emitirAlteracaoFiltrosRecomendacoes();

    }


    return removido;

}


/* =========================================================
   ALTERNAR JOGADOR
   ========================================================= */


function alternarJogadorRecomendacoes(
    id,
    excluir
) {

    if (excluir) {

        return excluirJogadorRecomendacoes(
            id
        );

    }


    return restaurarJogadorRecomendacoes(
        id
    );

}


/* =========================================================
   LIMPAR FILTROS
   ========================================================= */


function limparFiltrosExclusaoRecomendacoes() {

    const tinhaFiltros =

        estadoRecomendacoes
            .filtros
            .clubesExcluidos
            .size > 0

        ||

        estadoRecomendacoes
            .filtros
            .jogadoresExcluidos
            .size > 0;


    estadoRecomendacoes
        .filtros
        .clubesExcluidos
        .clear();


    estadoRecomendacoes
        .filtros
        .jogadoresExcluidos
        .clear();


    if (tinhaFiltros) {

        emitirAlteracaoFiltrosRecomendacoes();

    }

}


/* =========================================================
   ESTADO DOS FILTROS
   ========================================================= */


function obterFiltrosExclusaoRecomendacoes() {

    return {

        clubesExcluidos:
            Array.from(

                estadoRecomendacoes
                    .filtros
                    .clubesExcluidos

            ),

        jogadoresExcluidos:
            Array.from(

                estadoRecomendacoes
                    .filtros
                    .jogadoresExcluidos

            )

    };

}


/* =========================================================
   CONTAGEM
   ========================================================= */


function obterResumoFiltrosRecomendacoes() {

    const total =
        estadoRecomendacoes
            .jogadores
            .length;


    const disponiveis =
        obterJogadoresDisponiveisRecomendacoes()
            .length;


    return {

        total,

        disponiveis,

        removidos:
            Math.max(
                0,
                total -
                disponiveis
            ),

        clubesExcluidos:
            estadoRecomendacoes
                .filtros
                .clubesExcluidos
                .size,

        jogadoresExcluidos:
            estadoRecomendacoes
                .filtros
                .jogadoresExcluidos
                .size

    };

}


/* =========================================================
   EVENTO DE FILTRO
   ========================================================= */


function emitirAlteracaoFiltrosRecomendacoes() {

    if (
        typeof window ===
            "undefined"
    ) {

        return;

    }


    window.dispatchEvent(

        new CustomEvent(
            "cartola:filtros-recomendacoes-alterados",
            {
                detail:
                    obterResumoFiltrosRecomendacoes()
            }
        )

    );

}


/* =========================================================
   ESTADO
   ========================================================= */


function recomendacoesCarregadas() {

    return estadoRecomendacoes
        .carregado;

}


function obterErroRecomendacoes() {

    return estadoRecomendacoes
        .erro;

}


function calculadoraEstatisticaAplicada() {

    return estadoRecomendacoes
        .calculadoraAplicada;

}


/* =========================================================
   CARREGAMENTO VISUAL
   ========================================================= */


function exibirCarregamentoJogadores() {

    const container =
        document.getElementById(
            "playersGrid"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="empty-state">

            <strong>
                Carregando jogadores...
            </strong>

        </div>

    `;

}


/* =========================================================
   ERRO VISUAL
   ========================================================= */


function exibirErroJogadores(
    mensagem = ""
) {

    const container =
        document.getElementById(
            "playersGrid"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="empty-state">

            <strong>
                Erro ao carregar jogadores
            </strong>

            <p>
                ${String(
                    mensagem || ""
                )}
            </p>

        </div>

    `;

}


/* =========================================================
   API GLOBAL
   ========================================================= */


if (
    typeof window !==
        "undefined"
) {

    window.obterJogadores =
        obterJogadores;


    window.obterJogadoresCarregados =
        obterJogadoresCarregados;


    window.obterJogadoresParaEscalacoes =
        obterJogadoresParaEscalacoes;


    window.obterJogadoresDisponiveisRecomendacoes =
        obterJogadoresDisponiveisRecomendacoes;


    window.estadoRecomendacoes =
        estadoRecomendacoes;


    window.CartolaRecomendacoes = {

        obterJogadores,

        obterJogadoresCarregados,

        obterJogadoresParaEscalacoes,

        obterJogadoresDisponiveis:
            obterJogadoresDisponiveisRecomendacoes,

        obterJogadorPorId,

        carregadas:
            recomendacoesCarregadas,

        calculadoraAplicada:
            calculadoraEstatisticaAplicada,

        excluirClube:
            excluirClubeRecomendacoes,

        restaurarClube:
            restaurarClubeRecomendacoes,

        alternarClube:
            alternarClubeRecomendacoes,

        excluirJogador:
            excluirJogadorRecomendacoes,

        restaurarJogador:
            restaurarJogadorRecomendacoes,

        alternarJogador:
            alternarJogadorRecomendacoes,

        limparFiltros:
            limparFiltrosExclusaoRecomendacoes,

        obterFiltros:
            obterFiltrosExclusaoRecomendacoes,

        obterResumoFiltros:
            obterResumoFiltrosRecomendacoes,

        clubeEstaExcluido,

        jogadorEstaExcluido,

        jogadorDisponivelPelosFiltros

    };

}
