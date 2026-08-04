/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Forma
======================================================
*/

const MotorForma = (() => {

    function ultimosJogos(historico, quantidade = 5){

        if(!Array.isArray(historico))
            return [];

        return historico
            .slice(-quantidade);

    }

    function mediaRecente(historico){

        const jogos =
            ultimosJogos(historico,5);

    return MotorMetricas.media(
        jogos.map(j => j.pontuacao ?? j.pontos ?? 0)
    );

    }

    function tendencia(historico){

        const jogos =
            ultimosJogos(historico,5);

        if(jogos.length<2)
            return 0;

        const primeiro =
        jogos[0].pontuacao ?? jogos[0].pontos ?? 0;
    
        const ultimo =
            jogos[jogos.length - 1].pontuacao ?? jogos[jogos.length - 1].pontos ?? 0;

        return ultimo-primeiro;

    }

    function fase(historico){

        const media =
            mediaRecente(historico);

        if(media>=10) return "Excelente";

        if(media>=7) return "Boa";

        if(media>=5) return "Regular";

        return "Ruim";

    }

    return{

        ultimosJogos,
        mediaRecente,
        tendencia,
        fase

    };

})();
