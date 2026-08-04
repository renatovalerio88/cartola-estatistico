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

async function carregarJogadores() {

    estadoRecomendacoes.carregando = true;
    estadoRecomendacoes.carregado = false;
    estadoRecomendacoes.erro = null;

    exibirCarregamentoJogadores();

    try {

        const statusResposta = await fetch(
            CAMINHO_STATUS,
            { cache: "no-store" }
        );

        if (!statusResposta.ok) {
            throw new Error("Erro ao carregar status.json");
        }

        const status = await statusResposta.json();

        const rodada = Number(status.rodada_atual);

        CAMINHO_JOGADORES =
            `data/api/rodada-${String(rodada).padStart(2, "0")}/jogadores.json`;

        const resposta = await fetch(
            CAMINHO_JOGADORES,
            { cache: "no-store" }
        );

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();

        if (!Array.isArray(dados)) {
            throw new Error("Lista de jogadores inválida.");
        }

        const jogadoresValidos =
            dados.filter(validarJogador);

        // ============================================
        // CARREGA O HISTÓRICO
        // ============================================

        await Historico.carregarIndice();

        await Historico.montarHistoricoJogadores(
            jogadoresValidos
        );

        // ============================================
        // CALCULA AS MÉTRICAS
        // ============================================

         await Historico.carregarIndice();
         
         const jogadoresComHistorico =
             await Historico.montarHistoricoJogadores(
                 jogadoresValidos
             );
         
         const jogadoresCalculados =
             CalculadoraEstatistica.analisarListaJogadores(
                 jogadoresComHistorico
             );

        estadoRecomendacoes.jogadores =
            jogadoresCalculados;

        estadoRecomendacoes.jogadoresOriginais =
            jogadoresCalculados.map(copiarJogador);

        estadoRecomendacoes.calculadoraAplicada = true;
        estadoRecomendacoes.carregado = true;
        estadoRecomendacoes.carregando = false;

        iniciarRecomendacoes();

        console.log(
            "Jogadores carregados:",
            jogadoresCalculados.length
        );

        return jogadoresCalculados;

    }
    catch (erro) {

        console.error(erro);

        estadoRecomendacoes.erro =
            erro.message;

        estadoRecomendacoes.carregado = false;
        estadoRecomendacoes.carregando = false;

        exibirErroJogadores(
            erro.message
        );

        return [];

    }

}

function copiarJogador(jogador) {

    return {

        ...jogador,

        scouts: {
            ...(jogador.scouts || {})
        }

    };

}

function validarJogador(jogador) {

    return (

        jogador &&
        jogador.id &&
        jogador.nome &&
        jogador.posicao

    );

}

function iniciarRecomendacoes() {

    if (!estadoRecomendacoes.carregado) {
        return;
    }

    criarFiltrosPosicao();

    exibirDestaquesGerais();

    exibirJogadoresDaPosicao();

}

function obterJogadoresCarregados() {

    return estadoRecomendacoes.jogadores.map(
        copiarJogador
    );

}

function obterJogadorPorId(id) {

    return estadoRecomendacoes.jogadores.find(

        j => String(j.id) === String(id)

    ) || null;

}

function obterPosicaoAtiva() {

    return estadoRecomendacoes.posicaoAtiva;

}

function definirPosicaoAtiva(posicao) {

    estadoRecomendacoes.posicaoAtiva =
        String(posicao).toUpperCase();

}

function recomendacoesCarregadas() {

    return estadoRecomendacoes.carregado;

}

function obterErroRecomendacoes() {

    return estadoRecomendacoes.erro;

}

function calculadoraEstatisticaAplicada() {

    return estadoRecomendacoes.calculadoraAplicada;

}

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
            <strong>Carregando jogadores...</strong>
        </div>
    `;

}

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
            <strong>Erro ao carregar jogadores</strong>
            <p>${mensagem}</p>
        </div>
    `;

}
