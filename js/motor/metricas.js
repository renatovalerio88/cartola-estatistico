/*
======================================================
CARTOLA ESTATÍSTICO
Motor de Métricas
======================================================
*/

const MotorMetricas = (() => {

    function media(lista) {

        if (!lista.length) return 0;

        return (
            lista.reduce((a,b)=>a+b,0)
            / lista.length
        );

    }

    function mediana(lista){

        if(!lista.length) return 0;

        const v=[...lista].sort((a,b)=>a-b);

        const m=Math.floor(v.length/2);

        return v.length%2
            ? v[m]
            : (v[m-1]+v[m])/2;

    }

    function maximo(lista){
        return lista.length
            ? Math.max(...lista)
            :0;
    }

    function minimo(lista){
        return lista.length
            ? Math.min(...lista)
            :0;
    }

    function desvioPadrao(lista){

        if(lista.length<2)
            return 0;

        const m=media(lista);

        const variancia =
            media(
                lista.map(x=>
                    (x-m)**2
                )
            );

        return Math.sqrt(variancia);

    }

    return{

        media,
        mediana,
        minimo,
        maximo,
        desvioPadrao

    };

})();
