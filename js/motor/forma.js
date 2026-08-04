/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Forma
======================================================
*/

const MotorForma = (() => {


    /*
    ======================================================
    UTILITÁRIOS
    ======================================================
    */


    function obterPontuacao(jogo){

        if(!jogo)
            return 0;


        return Number(
            jogo.pontuacao ??
            jogo.pontos ??
            jogo.pontuacaoReal ??
            0
        );

    }



    /*
    ======================================================
    ÚLTIMOS JOGOS
    ======================================================
    */


    function ultimosJogos(
        historico,
        quantidade = 5
    ){

        if(!Array.isArray(historico))
            return [];


        return historico.slice(
            -quantidade
        );

    }



    /*
    ======================================================
    MÉDIA RECENTE
    ======================================================
    */


    function mediaRecente(
        historico
    ){

        const jogos =
            ultimosJogos(
                historico,
                5
            );


        if(
            typeof MotorMetricas !== "undefined" &&
            MotorMetricas.media
        ){

            return MotorMetricas.media(
                jogos.map(obterPontuacao)
            );

        }


        if(jogos.length === 0)
            return 0;


        return jogos.reduce(
            (total, jogo) =>
                total + obterPontuacao(jogo),
            0
        ) / jogos.length;


    }



    /*
    ======================================================
    COMPATIBILIDADE
    Alias usado pelo Score
    ======================================================
    */


    function mediaUltimas(
        historico,
        quantidade = 5
    ){

        const jogos =
            ultimosJogos(
                historico,
                quantidade
            );


        if(jogos.length === 0)
            return 0;


        return jogos.reduce(
            (total, jogo) =>
                total + obterPontuacao(jogo),
            0
        ) / jogos.length;


    }



    /*
    ======================================================
    TENDÊNCIA
    ======================================================
    */


    function tendencia(
        historico
    ){

        const jogos =
            ultimosJogos(
                historico,
                5
            );


        if(
            jogos.length < 2
        )
            return 0;



        const primeiro =
            obterPontuacao(
                jogos[0]
            );


        const ultimo =
            obterPontuacao(
                jogos[jogos.length - 1]
            );


        return ultimo - primeiro;

    }



    /*
    ======================================================
    FASE DO JOGADOR
    ======================================================
    */


    function fase(
        historico
    ){

        const media =
            mediaRecente(
                historico
            );


        if(media >= 10)
            return "Excelente";


        if(media >= 7)
            return "Boa";


        if(media >= 5)
            return "Regular";


        return "Ruim";

    }



    /*
    ======================================================
    INTERFACE PÚBLICA
    ======================================================
    */


    return {

        ultimosJogos,

        mediaRecente,

        // compatibilidade com score.js
        mediaUltimas,

        tendencia,

        fase

    };


})();
