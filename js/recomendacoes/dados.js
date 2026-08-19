/* =========================================================
   CARTOLA ESTATÍSTICO
   Recomendações — carregamento dos dados
   ========================================================= */

const CAMINHO_STATUS = "data/api/status.json";

let CAMINHO_JOGADORES = "";

const estadoRecomendacoes = {
    jogadores: [],
    jogadoresOriginais: [],
    carregado: false,
    carregando: false,
    erro: null,
    posicaoAtiva: "GOL",
    calculadoraAplicada: false
};


/* =========================================================
   CARREGAMENTO DOS JOGADORES
   ========================================================= */

async function carregarJogadores() {

    estadoRecomendacoes.carregando = true;
    estadoRecomendacoes.carregado = false;
    estadoRecomendacoes.erro = null;

    exibirCarregamentoJogadores();


    try {

        const statusResposta =
            await fetch(
                CAMINHO_STATUS,
                {
                    cache: "no-store"
                }
            );


        if (!statusResposta.ok) {

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


        CAMINHO_JOGADORES =
            `data/api/rodada-${String(rodada).padStart(2, "0")}/jogadores.json`;


        const resposta =
            await fetch(
                CAMINHO_JOGADORES,
                {
                    cache: "no-store"
                }
            );


        if (!resposta.ok) {

            throw new Error(
                `Erro HTTP ${resposta.status}`
            );

        }


        const dados =
            await resposta.json();


        if (!Array.isArray(dados)) {

            throw new Error(
                "Lista de jogadores inválida."
            );

        }


        const jogadoresValidos =
            dados.filter(
                validarJogador
            );


        // ============================================
        // CARREGA O HISTÓRICO
        // ============================================

        const jogadoresComHistorico =
            await HistoricoJogadores.carregar(
                jogadoresValidos
            );


        // ============================================
        // CALCULA AS MÉTRICAS
        // ============================================

        const jogadoresCalculados =
            MotorCalculadora.analisarListaJogadores(
                jogadoresComHistorico
            );


        estadoRecomendacoes.jogadores =
            jogadoresCalculados;


        estadoRecomendacoes.jogadoresOriginais =
            jogadoresCalculados.map(
                copiarJogador
            );


        estadoRecomendacoes.calculadoraAplicada =
            true;


        estadoRecomendacoes.carregado =
            true;


        estadoRecomendacoes.carregando =
            false;


        iniciarRecomendacoes();


        console.log(
            "Jogadores carregados:",
            jogadoresCalculados.length
        );


        return jogadoresCalculados;


    }
    catch (erro) {


        console.error(
            erro
        );


        estadoRecomendacoes.erro =
            erro.message;


        estadoRecomendacoes.carregado =
            false;


        estadoRecomendacoes.carregando =
            false;


        exibirErroJogadores(
            erro.message
        );


        return [];


    }

}


/* =========================================================
   CÓPIA SEGURA DO JOGADOR
   ========================================================= */

function copiarJogador(jogador) {

    return {

        ...jogador,

        scouts: {
            ...(jogador.scouts || {})
        }

    };

}


/* =========================================================
   VALIDAÇÃO
   ========================================================= */

function validarJogador(jogador) {

    return (

        jogador &&
        jogador.id &&
        jogador.nome &&
        jogador.posicao

    );

}


/* =========================================================
   INICIALIZAÇÃO DAS RECOMENDAÇÕES
   ========================================================= */

function iniciarRecomendacoes() {

    if (!estadoRecomendacoes.carregado) {

        return;

    }


    criarFiltrosPosicao();

    exibirDestaquesGerais();

    exibirJogadoresDaPosicao();

}


/* =========================================================
   ACESSO AOS JOGADORES
   ========================================================= */

function obterJogadoresCarregados() {

    return estadoRecomendacoes.jogadores.map(
        copiarJogador
    );

}


/*
 * Interface compatível com o módulo de escalações.
 *
 * IMPORTANTE:
 *
 * Não recarrega jogadores.
 * Não executa novamente o motor estatístico.
 * Não recalibra projeções.
 *
 * Apenas devolve os jogadores que já foram processados
 * pelo módulo de Recomendações.
 */
function obterJogadores() {

    return obterJogadoresCarregados();

}


/*
 * Interface explícita para outros módulos da aplicação.
 *
 * Mantemos também obterJogadores() por compatibilidade.
 */
function obterJogadoresParaEscalacoes() {

    return obterJogadoresCarregados();

}


/* =========================================================
   ACESSO POR ID
   ========================================================= */

function obterJogadorPorId(id) {

    return estadoRecomendacoes.jogadores.find(

        jogador =>
            String(jogador.id) ===
            String(id)

    ) || null;

}


/* =========================================================
   POSIÇÃO ATIVA
   ========================================================= */

function obterPosicaoAtiva() {

    return estadoRecomendacoes.posicaoAtiva;

}


function definirPosicaoAtiva(posicao) {

    estadoRecomendacoes.posicaoAtiva =
        String(posicao)
            .toUpperCase();

}


/* =========================================================
   ESTADO DAS RECOMENDAÇÕES
   ========================================================= */

function recomendacoesCarregadas() {

    return estadoRecomendacoes.carregado;

}


function obterErroRecomendacoes() {

    return estadoRecomendacoes.erro;

}


function calculadoraEstatisticaAplicada() {

    return estadoRecomendacoes.calculadoraAplicada;

}


/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */

/*
 * Os scripts do projeto são carregados diretamente pelo
 * navegador. Por isso deixamos uma API explícita no window
 * para que outros módulos possam acessar os jogadores já
 * processados sem depender de variáveis internas.
 */

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


    window.CartolaRecomendacoes = {

        obterJogadores:
            obterJogadores,

        obterJogadoresCarregados:
            obterJogadoresCarregados,

        obterJogadoresParaEscalacoes:
            obterJogadoresParaEscalacoes,

        obterJogadorPorId:
            obterJogadorPorId,

        carregadas:
            recomendacoesCarregadas,

        calculadoraAplicada:
            calculadoraEstatisticaAplicada

    };

}


/* =========================================================
   ESTADO DE CARREGAMENTO
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
   ESTADO DE ERRO
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
                ${mensagem}
            </p>

        </div>

    `;


}
