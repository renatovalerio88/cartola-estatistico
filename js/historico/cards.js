/*
======================================================
CARTOLA ESTATÍSTICO

Histórico - Cards

Responsável por:
- montar cards históricos
- comparação dos modelos
- evolução das versões

======================================================
*/


const HistoricoCards = (() => {


    // ==================================================
    // FORMATAÇÃO
    // ==================================================

    function numero(
        valor,
        casas = 2
    ){

        valor = Number(valor);


        if(
            !Number.isFinite(valor)
        ){

            return "0";

        }


        return valor.toFixed(casas);

    }



    function nomeModelo(
        modelo
    ){

        const nomes = {

            base:
                "Modelo Base",

            explosao:
                "Base + Explosão",

            diferencial:
                "Base + Diferencial",

            completo:
                "Modelo Completo"

        };


        return nomes[modelo]
            || modelo;

    }



    function icone(
        modelo
    ){

        const icones = {

            base:
                "📊",

            explosao:
                "💥",

            diferencial:
                "⭐",

            completo:
                "🏆"

        };


        return icones[modelo]
            || "📈";

    }



    // ==================================================
    // CARD PRINCIPAL
    // ==================================================

    function renderComparacao(
        container
    ){


        if(
            !container ||
            !window.HistoricoEscalacoes
        ){

            return;

        }



        const ranking =
            HistoricoEscalacoes
                .compararModelos();



        if(
            !ranking.length
        ){

            return;

        }



        const ordenado =
            [...ranking]
            .sort(
                (a,b)=>
                    b.total -
                    a.total
            );



        let html = `


        <div class="card historico-modelos">


            <h3>
                🧪 Comparação dos Modelos
            </h3>


            <div class="lista-modelos">

        `;



        ordenado.forEach(
            (item,index)=>{


                const anterior =
                    ordenado[index+1];


                let diferenca = 0;


                if(anterior){

                    diferenca =
                        item.total -
                        anterior.total;

                }



                html += `


                <div class="modelo-item">


                    <div class="modelo-titulo">

                        <span>

                            ${icone(item.modelo)}

                            ${nomeModelo(item.modelo)}

                        </span>


                        <strong>

                            ${numero(item.total)}
                            pts

                        </strong>


                    </div>



                    <div class="modelo-info">


                        Média:

                        ${numero(item.media)}

                        |

                        Melhor:

                        ${numero(item.melhorRodada)}


                    </div>



                    ${
                        index === 0
                        ?

                        `
                        <div class="modelo-vencedor">

                            🏆 Melhor desempenho histórico

                        </div>
                        `

                        :

                        diferenca

                        ?

                        `
                        <div class="modelo-diferenca">

                            +${numero(diferenca)}
                            pts acima

                        </div>
                        `

                        :

                        ""

                    }



                </div>


                `;


            }
        );



        html += `

            </div>

        </div>

        `;



        container.innerHTML += html;


    }



    // ==================================================
    // CARD RESUMO GERAL
    // ==================================================

    function renderResumo(
        container
    ){


        if(
            !container ||
            !window.HistoricoEscalacoes
        ){

            return;

        }



        const melhor =
            HistoricoEscalacoes
                .melhorModelo();



        if(!melhor){

            return;

        }



        const html = `


        <div class="card">


            <h3>

                📈 Resultado do Laboratório

            </h3>



            <p>

            O modelo com melhor desempenho histórico foi:

            </p>



            <h2>

                ${icone(melhor.modelo)}

                ${nomeModelo(melhor.modelo)}

            </h2>



            <p>

                Total:

                <strong>

                ${numero(melhor.total)}

                pontos

                </strong>

            </p>



            <p>

                Média por rodada:

                <strong>

                ${numero(melhor.media)}

                </strong>

            </p>


        </div>


        `;



        container.innerHTML += html;


    }



    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================

    function render(
        idContainer = "historico-cards"
    ){


        const container =
            document.getElementById(
                idContainer
            );


        if(!container){

            return;

        }


        renderResumo(
            container
        );


        renderComparacao(
            container
        );


    }



    return {

        render,

        renderResumo,

        renderComparacao

    };


})();
